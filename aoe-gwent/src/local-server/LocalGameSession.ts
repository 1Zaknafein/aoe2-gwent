import {
	GameSession,
	GameState,
	GamePhase,
	ActionType,
	PlayerAction,
} from "./GameTypes";
import { CardDatabase } from "./CardDatabase";
import { TurnManager } from "./TurnManager";
import { RoundManager } from "./RoundManager";
import { ScoreCalculator } from "./ScoreCalculator";
import { PlayerID } from "../shared/types";

/**
 * Manages a local game session (player vs bot)
 */
export class LocalGameSession {
	private session: GameSession;
	private turnManager: TurnManager;
	private roundManager: RoundManager;
	private scoreCalculator: ScoreCalculator;
	private onStateChange?: (state: GameState) => void;

	constructor(
		playerId: PlayerID,
		playerName: string,
		opponentId: PlayerID,
		opponentName: string
	) {
		this.turnManager = new TurnManager([playerId, opponentId], playerId);
		this.roundManager = new RoundManager([playerId, opponentId]);
		this.scoreCalculator = new ScoreCalculator();

		this.session = {
			roomId: "local-game",
			playerIds: [playerId, opponentId],
			playerNames: new Map([
				[playerId, playerName],
				[opponentId, opponentName],
			]),
			gameState: {
				phase: GamePhase.WAITING_FOR_GAME_START,
				currentTurn: playerId,
				roundNumber: 1,
				scores: new Map([
					[playerId, 0],
					[opponentId, 0],
				]),
				passedPlayers: new Set(),
				startingPlayer: playerId,
				handSizes: new Map([
					[playerId, 0],
					[opponentId, 0],
				]),
				gameStarted: false,
			},
			playerHands: new Map([
				[playerId, []],
				[opponentId, []],
			]),
			playerDecks: new Map([
				[playerId, []],
				[opponentId, []],
			]),
			playerBoards: new Map([
				[playerId, { melee: [], ranged: [], siege: [] }],
				[opponentId, { melee: [], ranged: [], siege: [] }],
			]),
			playerDiscards: new Map([
				[playerId, []],
				[opponentId, []],
			]),
			isGameStarted: false,
			createdAt: new Date(),
		};
	}

	/**
	 * Set callback for state changes
	 */
	public onGameStateChange(callback: (state: GameState) => void): void {
		this.onStateChange = callback;
	}

	/**
	 * Notify listeners of state change
	 */
	private notifyStateChange(): void {
		if (this.onStateChange) {
			this.onStateChange(this.getGameState());
		}
	}

	/**
	 * Get player number (1 or 2) for a given player ID
	 */
	public getPlayerNumber(playerId: PlayerID): 1 | 2 | null {
		const playerIndex = this.session.playerIds.indexOf(playerId);
		if (playerIndex === -1) return null;
		return (playerIndex + 1) as 1 | 2;
	}

	/**
	 * Get the opponent's player ID
	 */
	public getOpponentId(playerId: PlayerID): PlayerID | null {
		const playerIndex = this.session.playerIds.indexOf(playerId);
		if (playerIndex === -1) return null;
		const opponentIndex = playerIndex === 0 ? 1 : 0;
		return this.session.playerIds[opponentIndex];
	}

	/**
	 * Check if a player is the bot (opponent)
	 */
	public isBot(playerId: PlayerID): boolean {
		return this.session.playerIds[1] === playerId;
	}

	/**
	 * Get player board
	 */
	private getPlayerBoard(playerId: PlayerID) {
		const board = this.session.playerBoards.get(playerId);
		if (!board) {
			throw new Error(`Player board not found for ${playerId}`);
		}
		return board;
	}

	/**
	 * Get player hand
	 */
	private getPlayerHandInternal(playerId: PlayerID) {
		const hand = this.session.playerHands.get(playerId);
		if (!hand) {
			throw new Error(`Player hand not found for ${playerId}`);
		}
		return hand;
	}

	/**
	 * Start the game - initialize decks and deal initial hands
	 */
	public startGame(): void {
		if (this.session.isGameStarted) {
			throw new Error("Game already started");
		}

		// Generate random decks for both players (~50 cards each)
		for (const playerId of this.session.playerIds) {
			const fullDeck = CardDatabase.generateRandomDeck(50);
			const initialHand = fullDeck.slice(0, 10); // Deal first 10 cards
			const remainingDeck = fullDeck.slice(10); // Rest stays in deck

			this.session.playerDecks.set(playerId, remainingDeck);
			this.session.playerHands.set(playerId, initialHand);
			this.session.gameState.handSizes.set(playerId, initialHand.length);
		}

		this.session.isGameStarted = true;
		this.session.gameState.phase = GamePhase.PLAYER_TURN;
		this.session.gameState.gameStarted = true;

		this.notifyStateChange();
	}

	/**
	 * Process a player action
	 */
	public processAction(action: PlayerAction): {
		success: boolean;
		error?: string;
		gameStateChanged: boolean;
		roundEnded?: boolean;
		gameEnded?: boolean;
	} {
		if (!this.session.isGameStarted) {
			return {
				success: false,
				error: "Game not started",
				gameStateChanged: false,
			};
		}

		if (!this.session.playerIds.includes(action.playerId)) {
			return {
				success: false,
				error: "Invalid player",
				gameStateChanged: false,
			};
		}

		// Check if player can act (their turn and not passed)
		if (!this.turnManager.canPlayerAct(action.playerId)) {
			return {
				success: false,
				error: "Not your turn or you have already passed",
				gameStateChanged: false,
			};
		}

		switch (action.type) {
			case ActionType.PLACE_CARD:
				return this.handleCardPlacement(action);

			case ActionType.PASS_TURN:
				return this.handlePass(action);

			default:
				return {
					success: false,
					error: "Unknown action type",
					gameStateChanged: false,
				};
		}
	}

	/**
	 * Handle card placement action
	 */
	private handleCardPlacement(action: PlayerAction): {
		success: boolean;
		error?: string;
		gameStateChanged: boolean;
		roundEnded?: boolean;
		gameEnded?: boolean;
	} {
		if (!action.cardId || !action.targetRow) {
			return {
				success: false,
				error: "Missing card ID or target row",
				gameStateChanged: false,
			};
		}

		const playerHand = this.getPlayerHandInternal(action.playerId);
		const playerBoard = this.getPlayerBoard(action.playerId);

		// Check if player has the card
		const cardIndex = playerHand.indexOf(action.cardId);
		if (cardIndex === -1) {
			return {
				success: false,
				error: "Card not in hand",
				gameStateChanged: false,
			};
		}

		// Remove card from hand and place on board
		playerHand.splice(cardIndex, 1);
		playerBoard[action.targetRow].push(action.cardId);

		// Update hand size
		this.session.gameState.handSizes.set(action.playerId, playerHand.length);

		console.log(
			`Player ${action.playerId} placed card ${action.cardId} on ${action.targetRow}`
		);

		// Auto-pass if player has no cards left
		const autoPassTriggered = this.turnManager.autoPass(
			action.playerId,
			playerHand.length
		);
		if (autoPassTriggered) {
			this.session.gameState.passedPlayers.add(action.playerId);
			console.log(`Player ${action.playerId} auto-passed (no cards left)`);
		}

		// Check if both players have passed -> end round
		if (this.turnManager.haveBothPlayersPassed()) {
			const result = this.endRound();
			this.notifyStateChange();
			return result;
		}

		// Switch turn (placing card automatically ends turn)
		this.turnManager.switchTurn();
		this.session.gameState.currentTurn = this.turnManager.getCurrentTurn();

		this.notifyStateChange();
		return { success: true, gameStateChanged: true, roundEnded: false };
	}

	/**
	 * Handle pass action
	 */
	private handlePass(action: PlayerAction): {
		success: boolean;
		gameStateChanged: boolean;
		roundEnded?: boolean;
		gameEnded?: boolean;
	} {
		// Mark player as passed in TurnManager
		this.turnManager.markPlayerPassed(action.playerId);

		// Sync with session state
		this.session.gameState.passedPlayers.add(action.playerId);

		console.log(`Player ${action.playerId} passed`);

		// Check if both players have passed
		if (this.turnManager.haveBothPlayersPassed()) {
			const result = this.endRound();
			this.notifyStateChange();
			return result;
		} else {
			// Switch turn to opponent
			this.turnManager.switchTurn();
			this.session.gameState.currentTurn = this.turnManager.getCurrentTurn();
			this.notifyStateChange();
			return { success: true, gameStateChanged: true, roundEnded: false };
		}
	}

	/**
	 * End the current round
	 */
	private endRound(): {
		success: boolean;
		gameStateChanged: boolean;
		roundEnded: boolean;
		gameEnded?: boolean;
	} {
		// Calculate scores using ScoreCalculator
		const scores = this.scoreCalculator.calculateScores(
			this.session.playerBoards
		);

		const [player1Id, player2Id] = this.session.playerIds;
		const player1Score = scores.get(player1Id) || 0;
		const player2Score = scores.get(player2Id) || 0;

		console.log(
			`Round ${this.roundManager.getCurrentRound()}: Player=${player1Score}, Bot=${player2Score}`
		);

		// Determine winner and record round result
		const winnerId = this.scoreCalculator.determineWinner(scores);
		const roundResult = this.roundManager.recordRoundWinner(winnerId);

		// Update session state with new round wins
		const roundWins = this.roundManager.getAllRoundWins();
		this.session.gameState.scores.set(player1Id, roundWins.player1);
		this.session.gameState.scores.set(player2Id, roundWins.player2);

		// Set round end phase
		this.session.gameState.phase = GamePhase.ROUND_END;

		// Check if game is over
		if (roundResult.gameEnded) {
			this.session.gameState.phase = GamePhase.GAME_END;
			console.log(`Game ended! Winner: ${roundResult.gameWinner}`);
			return {
				success: true,
				gameStateChanged: true,
				roundEnded: true,
				gameEnded: true,
			};
		}

		// Prepare for next round
		setTimeout(() => {
			this.startNextRound();
		}, 2000);

		return { success: true, gameStateChanged: true, roundEnded: true };
	}

	/**
	 * Start the next round
	 */
	private startNextRound(): void {
		// Clear boards to discard piles
		for (const playerId of this.session.playerIds) {
			const board = this.getPlayerBoard(playerId);
			const discard = this.session.playerDiscards.get(playerId)!;

			// Move all cards from board to discard
			discard.push(...board.melee, ...board.ranged, ...board.siege);

			// Clear board
			board.melee = [];
			board.ranged = [];
			board.siege = [];
		}

		// Determine who starts next round (loser of previous round)
		const roundWins = this.roundManager.getAllRoundWins();
		const [player1Id, player2Id] = this.session.playerIds;
		const startingPlayer =
			roundWins.player1 < roundWins.player2 ? player1Id : player2Id;

		// Reset turn manager for new round
		this.turnManager.resetRound(startingPlayer);

		// Update session state
		this.session.gameState.roundNumber = this.roundManager.getCurrentRound();
		this.session.gameState.startingPlayer = startingPlayer;
		this.session.gameState.currentTurn = this.turnManager.getCurrentTurn();
		this.session.gameState.passedPlayers.clear();
		this.session.gameState.phase = GamePhase.PLAYER_TURN;

		console.log(
			`Starting round ${this.session.gameState.roundNumber}, ${startingPlayer} goes first`
		);

		this.notifyStateChange();
	}

	/**
	 * Get current game state for client
	 */
	public getGameState(): GameState {
		return { ...this.session.gameState };
	}

	/**
	 * Get player hand (only for that specific player)
	 */
	public getPlayerHand(playerId: PlayerID): number[] | null {
		return this.session.playerHands.get(playerId) || null;
	}

	/**
	 * Get all board states (visible to all players)
	 */
	public getBoardStates(): Map<
		PlayerID,
		{ melee: number[]; ranged: number[]; siege: number[] }
	> {
		return new Map(this.session.playerBoards);
	}

	/**
	 * Get player names
	 */
	public getPlayerNames(): Map<PlayerID, string> {
		return new Map(this.session.playerNames);
	}

	/**
	 * Check if game is started
	 */
	public isStarted(): boolean {
		return this.session.isGameStarted;
	}

	/**
	 * Get player IDs
	 */
	public getPlayerIds(): [PlayerID, PlayerID] {
		return [...this.session.playerIds] as [PlayerID, PlayerID];
	}

	/**
	 * Get complete game data for the human player
	 */
	public getGameDataForPlayer(playerId: PlayerID): PlayerGameData {
		const playerNumber = this.getPlayerNumber(playerId);
		const opponentId = this.getOpponentId(playerId);

		if (!playerNumber || opponentId === null) {
			throw new Error("Invalid player ID");
		}

		const playerHandIds = this.session.playerHands.get(playerId) || [];

		const playerBoard = this.getPlayerBoard(playerId);
		const enemyBoard = this.getPlayerBoard(opponentId);

		return {
			playerId,
			playerNumber,
			playerName: this.session.playerNames.get(playerId),

			opponentId,
			opponentName: this.session.playerNames.get(opponentId),

			gameState: {
				phase: this.session.gameState.phase,
				currentTurn: this.session.gameState.currentTurn,
				isMyTurn: this.session.gameState.currentTurn === playerId,
				roundNumber: this.session.gameState.roundNumber,
				scores: Object.fromEntries(this.session.gameState.scores),
				passedPlayers: Array.from(this.session.gameState.passedPlayers),
				handSizes: Object.fromEntries(this.session.gameState.handSizes),
			},

			playerHand: playerHandIds,

			boards: {
				player: playerBoard,
				enemy: enemyBoard,
			},

			isGameStarted: this.session.isGameStarted,
		};
	}
}

export type PlayerGameData = {
	playerId: PlayerID;
	playerNumber: 1 | 2;
	playerName?: string;

	opponentId: PlayerID;
	opponentName?: string;

	gameState: {
		phase: GamePhase;
		currentTurn: PlayerID;
		isMyTurn: boolean;
		roundNumber: number;
		scores: Record<number, number>;
		passedPlayers: PlayerID[];
		handSizes: Record<number, number>;
	};

	playerHand: number[];

	boards: {
		player: { melee: number[]; ranged: number[]; siege: number[] };
		enemy: { melee: number[]; ranged: number[]; siege: number[] };
	};

	isGameStarted: boolean;
};
