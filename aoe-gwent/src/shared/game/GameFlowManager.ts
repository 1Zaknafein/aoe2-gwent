import { EventEmitter } from "pixi.js";

/**
 * Game Flow States - represents what the game is currently doing
 */
export enum GameFlowState {
	WAITING_FOR_GAME_START = "waiting_for_game_start",
	SHOWING_MESSAGES = "showing_messages", // Blocking all actions while showing messages
	PLAYER_TURN_ACTIVE = "player_turn_active", // Player can interact
	WAITING_FOR_ENEMY = "waiting_for_enemy", // Enemy's turn, no player interaction
	SENDING_ACTION = "sending_action", // Player action sent, waiting for server response
	ROUND_END = "round_end",
	GAME_END = "game_end",
}

export enum GamePhase {
	WAITING_FOR_GAME_START = "waiting_for_game_start",
	PLAYER_TURN = "player_turn",
	ENEMY_TURN = "enemy_turn",
	ROUND_END = "round_end",
	GAME_END = "game_end",
}

export interface GameState {
	phase: GamePhase;
	currentTurn: "player" | "enemy";
	roundNumber: number;
	playerScore: number;
	enemyScore: number;
	playerPassed: boolean;
	enemyPassed: boolean;
	startingPlayer: "player" | "enemy";
	playerHandSize: number;
	enemyHandSize: number;
}

export interface ServerResponse {
	type: "game_state_update" | "enemy_action" | "deck_data";
	gameState?: GameState;
	action?: {
		type: string;
		cardId?: number;
		targetRow?: "melee" | "ranged" | "siege";
		playerId: "player" | "enemy";
	};
	playerHand?: number[];
}

/**
 * Improved GameStateManager using State Machine pattern
 *
 * This class:
 * 1. Manages the current flow state (what the game is doing right now)
 * 2. Handles server responses and determines what messages to show
 * 3. Provides clear APIs for transitioning between states
 * 4. Emits events for UI components to react to
 */
export class GameFlowManager extends EventEmitter {
	private _currentFlowState: GameFlowState =
		GameFlowState.WAITING_FOR_GAME_START;
	private _gameState: GameState;

	constructor() {
		super();

		this._gameState = {
			phase: GamePhase.WAITING_FOR_GAME_START,
			currentTurn: "player",
			roundNumber: 1,
			playerScore: 0,
			enemyScore: 0,
			playerPassed: false,
			enemyPassed: false,
			startingPlayer: "player",
			playerHandSize: 0,
			enemyHandSize: 0,
		};
	}

	public get currentFlowState(): GameFlowState {
		return this._currentFlowState;
	}

	public get gameState(): GameState {
		return { ...this._gameState };
	}

	public get canPlayerAct(): boolean {
		return this._currentFlowState === GameFlowState.PLAYER_TURN_ACTIVE;
	}

	public get isShowingMessages(): boolean {
		return this._currentFlowState === GameFlowState.SHOWING_MESSAGES;
	}

	/**
	 * Handle server response - this is the main entry point
	 */
	public async handleServerResponse(response: ServerResponse): Promise<void> {
		switch (response.type) {
			case "deck_data":
				await this.handleGameStart(response);
				break;
			case "game_state_update":
				await this.handleGameStateUpdate(response);
				break;
			case "enemy_action":
				await this.handleEnemyAction(response);
				break;
		}
	}

	/**
	 * Handle game start (deck_data received)
	 */
	private async handleGameStart(response: ServerResponse): Promise<void> {
		const deckData = {
			playerHand: response.playerHand,
			enemyHandSize: response.playerHand ? response.playerHand.length : 5,
		};
		this.emit("deckDataReceived", deckData);

		if (response.gameState) {
			const previousGameState = { ...this._gameState };
			this._gameState = response.gameState;

			const messages = this.determineMessagesForStateChange(
				previousGameState,
				this._gameState
			);

			await this.showMessagesAndTransition(messages);
		}
	}

	/**
	 * Handle game state update from server
	 */
	private async handleGameStateUpdate(response: ServerResponse): Promise<void> {
		if (!response.gameState) return;

		const previousGameState = { ...this._gameState };
		this._gameState = response.gameState;

		const messages = this.determineMessagesForStateChange(
			previousGameState,
			this._gameState
		);

		await this.showMessagesAndTransition(messages);
	}

	/**
	 * Handle enemy action
	 */
	private async handleEnemyAction(response: ServerResponse): Promise<void> {
		if (response.action) {
			this.emit("enemyAction", response.action);
		}

		if (response.gameState) {
			const previousGameState = { ...this._gameState };
			this._gameState = response.gameState;

			const messages = this.determineMessagesForStateChange(
				previousGameState,
				this._gameState
			);

			await this.showMessagesAndTransition(messages);
		}
	}

	/**
	 * Determine what messages need to be shown based on state change
	 */
	private determineMessagesForStateChange(
		previousState: GameState,
		newState: GameState
	): string[] {
		const messages: string[] = [];

		// Check for game start
		if (
			previousState.phase === GamePhase.WAITING_FOR_GAME_START &&
			newState.phase !== GamePhase.WAITING_FOR_GAME_START
		) {
			messages.push(`Round ${newState.roundNumber} is starting`);
		}

		// Check for enemy pass
		if (newState.enemyPassed && !previousState.enemyPassed) {
			messages.push("Opponent passed");
		}

		// Check for player pass
		if (newState.playerPassed && !previousState.playerPassed) {
			messages.push("You passed");
		}

		// Check for turn changes
		if (
			newState.phase === GamePhase.PLAYER_TURN &&
			previousState.phase !== GamePhase.PLAYER_TURN
		) {
			messages.push("Your turn!");
		} else if (
			newState.phase === GamePhase.ENEMY_TURN &&
			previousState.phase !== GamePhase.ENEMY_TURN
		) {
			messages.push("Opponent's turn!");
		}

		// Check for round end
		if (
			newState.phase === GamePhase.ROUND_END &&
			previousState.phase !== GamePhase.ROUND_END
		) {
			const playerScore = newState.playerScore || 0;
			const enemyScore = newState.enemyScore || 0;

			if (playerScore > enemyScore) {
				messages.push(`Round ${newState.roundNumber} ends! You won!`);
			} else if (enemyScore > playerScore) {
				messages.push(`Round ${newState.roundNumber} ends! You lost!`);
			} else {
				messages.push(`Round ${newState.roundNumber} ends! It's a tie!`);
			}
		}

		return messages;
	}

	/**
	 * Show messages sequentially and then transition to the appropriate state
	 */
	private async showMessagesAndTransition(messages: string[]): Promise<void> {
		if (messages.length > 0) {
			this.transitionToState(GameFlowState.SHOWING_MESSAGES);

			for (const message of messages) {
				await this.showMessage(message);
			}
		}

		this.transitionToAppropriateState();
	}

	/**
	 * Show a single message and wait for it to complete
	 */
	private async showMessage(message: string): Promise<void> {
		return new Promise((resolve) => {
			this.emit("showMessage", message, resolve);
		});
	}

	/**
	 * Transition to the appropriate state based on current game state
	 */
	private transitionToAppropriateState(): void {
		switch (this._gameState.phase) {
			case GamePhase.PLAYER_TURN:
				this.transitionToState(GameFlowState.PLAYER_TURN_ACTIVE);
				break;
			case GamePhase.ENEMY_TURN:
				this.transitionToState(GameFlowState.WAITING_FOR_ENEMY);
				break;
			case GamePhase.ROUND_END:
				this.transitionToState(GameFlowState.ROUND_END);
				break;
			case GamePhase.GAME_END:
				this.transitionToState(GameFlowState.GAME_END);
				break;
			default:
				this.transitionToState(GameFlowState.WAITING_FOR_GAME_START);
		}
	}

	/**
	 * Transition to a new flow state
	 */
	private transitionToState(newState: GameFlowState): void {
		const previousState = this._currentFlowState;
		this._currentFlowState = newState;

		this.emit("flowStateChanged", {
			previousState,
			newState,
			gameState: this._gameState,
		});
	}

	/**
	 * Called when player performs an action (like placing a card)
	 */
	public onPlayerActionStarted(): void {
		if (this._currentFlowState === GameFlowState.PLAYER_TURN_ACTIVE) {
			this.transitionToState(GameFlowState.SENDING_ACTION);
		}
	}

	/**
	 * Called when player action fails and we need to return to player turn
	 */
	public onPlayerActionFailed(): void {
		if (this._currentFlowState === GameFlowState.SENDING_ACTION) {
			this.transitionToState(GameFlowState.PLAYER_TURN_ACTIVE);
		}
	}
}
