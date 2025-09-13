import { EventEmitter } from "pixi.js";

export enum GamePhase {
	WAITING_FOR_GAME_START = "waiting_for_game_start",
	PLAYER_TURN = "player_turn",
	ENEMY_TURN = "enemy_turn",
	ROUND_END = "round_end",
	GAME_END = "game_end",
}

export enum ActionType {
	PLACE_CARD = "place_card",
	PASS_TURN = "pass_turn",
	DRAW_CARD = "draw_card",
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
		type: ActionType;
		cardId?: number;
		targetRow?: "melee" | "ranged" | "siege";
		playerId: "player" | "enemy";
	};
	playerHand?: number[];
}

export interface PlayerAction {
	type: ActionType;
	cardId?: number;
	targetRow?: "melee" | "ranged" | "siege";
	playerId: "player";
}

/**
 * Manages the game state and handles server responses
 */
export class GameStateManager extends EventEmitter {
	private _gameState: GameState;
	private _isConnected: boolean = false;
	private _showMessageCallback?: (message: string) => Promise<void>;

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

	/**
	 * Set the message display callback
	 */
	public setMessageCallback(
		callback: (message: string) => Promise<void>
	): void {
		this._showMessageCallback = callback;
	}

	/**
	 * Handle incoming server response
	 */
	public async handleServerResponse(response: ServerResponse): Promise<void> {
		console.log("\nReceived server response: ", response.type);

		console.table(response.gameState);

		switch (response.type) {
			case "game_state_update":
				await this.handleGameStateUpdate(response);
				break;
			case "enemy_action":
				await this.handleEnemyAction(response);
				break;
			case "deck_data":
				this.handleDeckData(response);
				break;
		}
	}

	/**
	 * Show turn message if needed and await its completion
	 */
	private async showTurnMessage(
		newGameState: GameState,
		previousGameState: GameState
	): Promise<void> {
		if (!this._showMessageCallback) {
			return;
		}

		const currentPhase = previousGameState.phase;
		const newPhase = newGameState.phase;

		if (newGameState.enemyPassed && !previousGameState.enemyPassed) {
			await this._showMessageCallback("Opponent passed");
		}

		if (
			newPhase === GamePhase.PLAYER_TURN &&
			currentPhase !== GamePhase.PLAYER_TURN
		) {
			await this._showMessageCallback("Your turn!");
		} else if (
			newPhase === GamePhase.ENEMY_TURN &&
			currentPhase !== GamePhase.ENEMY_TURN
		) {
			await this._showMessageCallback("Opponent's turn!");
		}
		// Show round end message
		else if (
			newPhase === GamePhase.ROUND_END &&
			currentPhase !== GamePhase.ROUND_END
		) {
			const playerScore = newGameState.playerScore || 0;
			const enemyScore = newGameState.enemyScore || 0;

			let roundEndMessage = "";
			if (playerScore > enemyScore) {
				roundEndMessage = `Round ${newGameState.roundNumber} ends! You won!`;
			} else if (enemyScore > playerScore) {
				roundEndMessage = `Round ${newGameState.roundNumber} ends! You lost!`;
			} else {
				roundEndMessage = `Round ${newGameState.roundNumber} ends! It's a tie!`;
			}

			await this._showMessageCallback(roundEndMessage);
		}
	}

	private async handleGameStateUpdate(response: ServerResponse): Promise<void> {
		if (response.gameState) {
			const previousPhase = this._gameState.phase;
			const previousGameState = { ...this._gameState };

			await this.showTurnMessage(response.gameState, previousGameState);

			this._gameState = response.gameState;

			this.emit("gameStateChanged", this._gameState);

			if (previousPhase !== this._gameState.phase) {
				this.emit("phaseChanged", this._gameState.phase);
			}
		}
	}

	private async handleEnemyAction(response: ServerResponse): Promise<void> {
		if (response.action && response.action.playerId === "enemy") {
			this.emit("enemyAction", response.action);

			if (response.gameState) {
				const previousGameState = { ...this._gameState };

				await this.showTurnMessage(response.gameState, previousGameState);

				this._gameState = response.gameState;

				this.emit("gameStateChanged", this._gameState);
			}
		}
	}

	private handleDeckData(response: ServerResponse): void {
		const enemyHandSize = response.gameState?.enemyHandSize;

		if (enemyHandSize === undefined) {
			throw new Error("Enemy hand size is missing in deck data");
		}

		this.emit("deckDataReceived", {
			playerHand: response.playerHand,
			enemyHandSize: enemyHandSize,
		});

		// Update game state if provided - this is when the actual game begins
		if (response.gameState) {
			this._gameState = response.gameState;
			this._isConnected = true;
			this.emit("gameStateChanged", this._gameState);
			this.emit(
				"gameStarted",
				"Game started - both players have received their cards"
			);
		}
	}

	/**
	 * Get current game state
	 */
	public get gameState(): GameState {
		return { ...this._gameState };
	}

	/**
	 * Check if it's currently the player's turn
	 */
	public get isPlayerTurn(): boolean {
		return (
			this._gameState.currentTurn === "player" &&
			this._gameState.phase === GamePhase.PLAYER_TURN
		);
	}

	/**
	 * Check if it's currently the enemy's turn
	 */
	public get isEnemyTurn(): boolean {
		return (
			this._gameState.currentTurn === "enemy" &&
			this._gameState.phase === GamePhase.ENEMY_TURN
		);
	}

	/**
	 * Check if the game is waiting to start
	 */
	public get isWaitingForGameStart(): boolean {
		return this._gameState.phase === GamePhase.WAITING_FOR_GAME_START;
	}

	/**
	 * Check if connected to server
	 */
	public get isConnected(): boolean {
		return this._isConnected;
	}

	/**
	 * Set connection status
	 */
	public setConnected(connected: boolean): void {
		this._isConnected = connected;
		this.emit("connectionChanged", connected);
	}

	/**
	 * Manually update game state (for testing purposes)
	 */
	public updateGameState(newState: Partial<GameState>): void {
		this._gameState = { ...this._gameState, ...newState };
		this.emit("gameStateChanged", this._gameState);
	}
}
