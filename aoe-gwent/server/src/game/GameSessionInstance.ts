import {
	GameSession,
	GameState,
	GamePhase,
	ActionType,
	PlayerAction,
} from "./GameTypes.js";
import { CardDatabase } from "../database/CardDatabase.js";

/**
 * Manages an individual game session between two players
 * Handles game logic, turn management, scoring, etc.
 * Extracted and adapted from ServerAPI's fake server logic
 */
export class GameSessionInstance {
	private session: GameSession;

	constructor(
		roomId: string,
		player1Id: string,
		player1Name: string,
		player2Id: string,
		player2Name: string
	) {
		// Player 1 is always the host (who created the room)
		// Player 2 is the one who joined
		console.log(
			`🎮 Creating game session: Player 1 (Host): ${player1Name}, Player 2: ${player2Name}`
		);

		// Initialize the game session
		this.session = {
			roomId,
			playerIds: [player1Id, player2Id],
			playerNames: new Map([
				[player1Id, player1Name],
				[player2Id, player2Name],
			]),
			gameState: {
				phase: GamePhase.WAITING_FOR_GAME_START,
				currentTurn: player1Id, // Player 1 (host) always starts first
				roundNumber: 1,
				scores: new Map([
					[player1Id, 0],
					[player2Id, 0],
				]),
				passedPlayers: new Set(),
				startingPlayer: player1Id, // Host is starting player
				handSizes: new Map([
					[player1Id, 0],
					[player2Id, 0],
				]),
			},
			playerHands: new Map([
				[player1Id, []],
				[player2Id, []],
			]),
			playerDecks: new Map([
				[player1Id, []],
				[player2Id, []],
			]),
			playerBoards: new Map([
				[player1Id, { melee: [], ranged: [], siege: [] }],
				[player2Id, { melee: [], ranged: [], siege: [] }],
			]),
			playerDiscards: new Map([
				[player1Id, []],
				[player2Id, []],
			]),
			isGameStarted: false,
			createdAt: new Date(),
		};
	}

	/**
	 * Get player number (1 or 2) for a given player ID
	 * Player 1 is always the host, Player 2 joined the room
	 */
	public getPlayerNumber(playerId: string): 1 | 2 | null {
		const playerIndex = this.session.playerIds.indexOf(playerId);
		if (playerIndex === -1) return null;
		return (playerIndex + 1) as 1 | 2;
	}

	/**
	 * Get the opponent's player ID
	 */
	public getOpponentId(playerId: string): string | null {
		const playerIndex = this.session.playerIds.indexOf(playerId);
		if (playerIndex === -1) return null;
		const opponentIndex = playerIndex === 0 ? 1 : 0;
		return this.session.playerIds[opponentIndex];
	}

	/**
	 * Check if a player is the host (Player 1)
	 */
	public isHost(playerId: string): boolean {
		return this.session.playerIds[0] === playerId;
	}

	/**
	 * Start the game - initialize decks and deal initial hands
	 */
	public startGame(): void {
		if (this.session.isGameStarted) {
			throw new Error("Game already started");
		}

		// Generate random decks for both players (simplified - using card IDs 1-6)
		const allCardIds = [1, 2, 3, 4, 5, 6];

		for (const playerId of this.session.playerIds) {
			// Create deck with duplicates allowed
			const deck: number[] = [];
			for (let i = 0; i < 10; i++) {
				const randomCard =
					allCardIds[Math.floor(Math.random() * allCardIds.length)];
				deck.push(randomCard);
			}

			// Deal initial hand (first 5 cards)
			const hand = deck.slice(0, 5);
			const remainingDeck = deck.slice(5);

			this.session.playerDecks.set(playerId, remainingDeck);
			this.session.playerHands.set(playerId, hand);
			this.session.gameState.handSizes.set(playerId, hand.length);
		}

		this.session.isGameStarted = true;
		this.session.gameState.phase = GamePhase.PLAYER_TURN;

		console.log(`Game session started for room ${this.session.roomId}`);
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

		if (this.session.gameState.currentTurn !== action.playerId) {
			return {
				success: false,
				error: "Not your turn",
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
	} {
		if (!action.cardId || !action.targetRow) {
			return {
				success: false,
				error: "Missing card ID or target row",
				gameStateChanged: false,
			};
		}

		const playerHand = this.session.playerHands.get(action.playerId);
		const playerBoard = this.session.playerBoards.get(action.playerId);

		if (!playerHand || !playerBoard) {
			return {
				success: false,
				error: "Player data not found",
				gameStateChanged: false,
			};
		}

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

		// Player is no longer passed (if they were)
		this.session.gameState.passedPlayers.delete(action.playerId);

		console.log(
			`Player ${action.playerId} placed card ${action.cardId} on ${action.targetRow}`
		);

		// Check if opponent has passed
		const opponentId = this.getOpponent(action.playerId);
		const opponentPassed = this.session.gameState.passedPlayers.has(opponentId);

		if (opponentPassed) {
			// Opponent already passed, check if round should end
			return { success: true, gameStateChanged: true, roundEnded: false };
		} else {
			// Switch turn to opponent
			this.switchTurn();
			return { success: true, gameStateChanged: true, roundEnded: false };
		}
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
		// Mark player as passed
		this.session.gameState.passedPlayers.add(action.playerId);

		console.log(`Player ${action.playerId} passed`);

		// Check if both players have passed
		if (this.session.gameState.passedPlayers.size === 2) {
			// Round ends
			return this.endRound();
		} else {
			// Switch turn to opponent
			this.switchTurn();
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
		// Calculate scores for each player
		const roundScores = new Map<string, number>();

		for (const playerId of this.session.playerIds) {
			const board = this.session.playerBoards.get(playerId)!;
			const score = this.calculateBoardScore(board);
			roundScores.set(playerId, score);
		}

		// Determine round winner
		const [player1Id, player2Id] = this.session.playerIds;
		const player1Score = roundScores.get(player1Id)!;
		const player2Score = roundScores.get(player2Id)!;

		if (player1Score > player2Score) {
			const currentScore = this.session.gameState.scores.get(player1Id)! + 1;
			this.session.gameState.scores.set(player1Id, currentScore);
			console.log(
				`Round ${this.session.gameState.roundNumber}: ${player1Id} wins`
			);
		} else if (player2Score > player1Score) {
			const currentScore = this.session.gameState.scores.get(player2Id)! + 1;
			this.session.gameState.scores.set(player2Id, currentScore);
			console.log(
				`Round ${this.session.gameState.roundNumber}: ${player2Id} wins`
			);
		} else {
			console.log(`Round ${this.session.gameState.roundNumber}: Tie`);
		}

		// Set round end phase
		this.session.gameState.phase = GamePhase.ROUND_END;

		// Check if game should end (best of 3)
		const maxScore = Math.max(...this.session.gameState.scores.values());
		if (maxScore >= 2) {
			this.session.gameState.phase = GamePhase.GAME_END;
			console.log("Game ended!");
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
			const board = this.session.playerBoards.get(playerId)!;
			const discard = this.session.playerDiscards.get(playerId)!;

			// Move all cards from board to discard
			discard.push(...board.melee, ...board.ranged, ...board.siege);

			// Clear board
			board.melee = [];
			board.ranged = [];
			board.siege = [];
		}

		// Reset passed players
		this.session.gameState.passedPlayers.clear();

		// Increment round number
		this.session.gameState.roundNumber++;

		// Switch starting player for next round
		const currentStarter = this.session.gameState.startingPlayer;
		const newStarter = this.getOpponent(currentStarter);
		this.session.gameState.startingPlayer = newStarter;
		this.session.gameState.currentTurn = newStarter;

		// Set phase to new round
		this.session.gameState.phase = GamePhase.PLAYER_TURN;

		console.log(
			`Starting round ${this.session.gameState.roundNumber}, ${newStarter} goes first`
		);
	}

	/**
	 * Calculate total score for a player's board
	 */
	private calculateBoardScore(board: {
		melee: number[];
		ranged: number[];
		siege: number[];
	}): number {
		// Simple scoring - each card has base value equal to its ID
		// In real implementation, you'd look up card stats from database
		let totalScore = 0;

		[...board.melee, ...board.ranged, ...board.siege].forEach((cardId) => {
			totalScore += cardId; // Simplified: card ID = card score
		});

		return totalScore;
	}

	/**
	 * Switch turn to the other player
	 */
	private switchTurn(): void {
		const currentPlayerId = this.session.gameState.currentTurn;
		const opponentId = this.getOpponent(currentPlayerId);
		this.session.gameState.currentTurn = opponentId;
	}

	/**
	 * Get the opponent of a given player
	 */
	private getOpponent(playerId: string): string {
		const [player1Id, player2Id] = this.session.playerIds;
		return playerId === player1Id ? player2Id : player1Id;
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
	public getPlayerHand(playerId: string): number[] | null {
		return this.session.playerHands.get(playerId) || null;
	}

	/**
	 * Get all board states (visible to all players)
	 */
	public getBoardStates(): Map<
		string,
		{ melee: number[]; ranged: number[]; siege: number[] }
	> {
		return new Map(this.session.playerBoards);
	}

	/**
	 * Get player names
	 */
	public getPlayerNames(): Map<string, string> {
		return new Map(this.session.playerNames);
	}

	/**
	 * Check if game is started
	 */
	public isStarted(): boolean {
		return this.session.isGameStarted;
	}

	/**
	 * Get room ID
	 */
	public getRoomId(): string {
		return this.session.roomId;
	}

	/**
	 * Get player IDs
	 */
	public getPlayerIds(): [string, string] {
		return [...this.session.playerIds];
	}

	/**
	 * Get complete game state for a specific player
	 * Includes player number, role, and all relevant game data
	 */
	public getGameStateForPlayer(playerId: string) {
		const playerNumber = this.getPlayerNumber(playerId);
		const opponentId = this.getOpponentId(playerId);
		const isHost = this.isHost(playerId);

		if (!playerNumber || !opponentId) {
			return null;
		}

		// Convert card IDs to complete card data
		const playerHandIds = this.session.playerHands.get(playerId) || [];
		const playerHandData = CardDatabase.generateCardsFromIds(playerHandIds);

		return {
			// Player identity
			playerId,
			playerNumber,
			isHost,
			playerName: this.session.playerNames.get(playerId),

			// Opponent identity
			opponentId,
			opponentName: this.session.playerNames.get(opponentId),

			// Game state
			gameState: {
				phase: this.session.gameState.phase,
				currentTurn: this.session.gameState.currentTurn,
				isMyTurn: this.session.gameState.currentTurn === playerId,
				roundNumber: this.session.gameState.roundNumber,
				scores: Object.fromEntries(this.session.gameState.scores),
				passedPlayers: Array.from(this.session.gameState.passedPlayers),
				handSizes: Object.fromEntries(this.session.gameState.handSizes),
			},

			// Player's private data
			playerHand: playerHandData,

			// Public board data (visible to all)
			boards: {
				[playerId]: this.session.playerBoards.get(playerId),
				[opponentId]: this.session.playerBoards.get(opponentId),
			},

			// Metadata
			roomId: this.session.roomId,
			isGameStarted: this.session.isGameStarted,
			timestamp: new Date().toISOString(),
		};
	}
}
