import {
	PlayerAction,
	ServerResponse,
	ActionType,
	GameState,
	GamePhase,
} from "../shared/game/GameFlowManager";
import { CardDatabase } from "../shared/database";

/**
 * Fake server state for simulation
 */
interface FakeServerState {
	gameState: GameState;
	playerDeck: number[];
	enemyDeck: number[];
	enemyHand: number[];
	playerBoard: { melee: number[]; ranged: number[]; siege: number[] };
	enemyBoard: { melee: number[]; ranged: number[]; siege: number[] };
	playerDiscard: number[];
	enemyDiscard: number[];
	isGameStarted: boolean;
}

/**
 * Handles communication with the game server
 */
export class ServerAPI {
	private _baseUrl: string;
	private _sessionId: string | null = null;
	private _isConnected: boolean = false;
	private _messageListener: ((response: ServerResponse) => void) | null = null;
	private _fakeServerState: FakeServerState | null = null;

	constructor(baseUrl: string = "http://localhost:3000") {
		this._baseUrl = baseUrl;
	}

	/**
	 * Initialize connection to server
	 */
	public async connect(): Promise<boolean> {
		try {
			// TODO: Implement actual server connection
			console.log("Attempting to connect to server at:", this._baseUrl);

			// Simulate connection for now
			this._isConnected = true;
			this._sessionId = "session_" + Date.now();

			console.log("Connected to server with session ID:", this._sessionId);
			return true;
		} catch (error) {
			console.error("Failed to connect to server:", error);
			this._isConnected = false;
			return false;
		}
	}

	/**
	 * Request to start a new game
	 * The server will respond with game_start message that includes:
	 * - Which player goes first (determined by server or specified)
	 * - Initial game state
	 * - Round information
	 */
	public async requestGameStart(
		startingPlayer?: "player" | "enemy"
	): Promise<boolean> {
		if (!this._isConnected || !this._sessionId) {
			console.error("Not connected to server. Cannot request game start.");
			return false;
		}

		try {
			// TODO: Implement actual HTTP request to server
			const payload = {
				sessionId: this._sessionId,
				action: "start_game",
				startingPlayer: startingPlayer,
				timestamp: Date.now(),
			};

			console.log("Game start request payload:", payload);

			// Simulate network delay
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Initialize fake server state and start the game
			this.initializeFakeServerState(startingPlayer);
			this.startFakeGame();

			return true;
		} catch (error) {
			console.error("Failed to request game start:", error);
			return false;
		}
	}

	/**
	 * Initialize fake server state for game simulation
	 */
	private initializeFakeServerState(
		requestedStartingPlayer?: "player" | "enemy"
	): void {
		// Use requested starting player or generate random one
		const startingPlayer: "player" | "enemy" =
			requestedStartingPlayer || (Math.random() < 0.5 ? "player" : "enemy");

		// Generate random decks for both players (allow duplicates since we only have 6 unique cards)
		const allCardIds = CardDatabase.getAllCardIds(); // [1, 2, 3, 4, 5, 6]

		// Create larger decks by allowing duplicates
		const generateDeck = (size: number): number[] => {
			const deck: number[] = [];
			for (let i = 0; i < size; i++) {
				const randomCard =
					allCardIds[Math.floor(Math.random() * allCardIds.length)];
				deck.push(randomCard);
			}
			return deck;
		};

		const playerDeck = generateDeck(10);
		const enemyDeck = generateDeck(10);

		// Deal initial hands
		const enemyHand = enemyDeck.slice(0, 5); // Enemy gets first 5 cards
		const remainingEnemyDeck = enemyDeck.slice(5); // Rest stays in deck

		this._fakeServerState = {
			gameState: {
				phase: GamePhase.PLAYER_TURN,
				currentTurn: startingPlayer,
				roundNumber: 1,
				playerScore: 0,
				enemyScore: 0,
				playerPassed: false,
				enemyPassed: false,
				startingPlayer: startingPlayer,
				playerHandSize: 5,
				enemyHandSize: 5,
			},
			playerDeck: playerDeck,
			enemyDeck: remainingEnemyDeck,
			enemyHand: enemyHand,
			playerBoard: { melee: [], ranged: [], siege: [] },
			enemyBoard: { melee: [], ranged: [], siege: [] },
			playerDiscard: [],
			enemyDiscard: [],
			isGameStarted: false,
		};

		console.log(
			"Fake server initialized with starting player:",
			startingPlayer
		);
		console.log("Player deck:", playerDeck);
		console.log("Enemy deck:", enemyDeck);
	}

	/**
	 * Start the fake game and send initial deck data
	 */
	private startFakeGame(): void {
		console.log("[ServerAPI] startFakeGame called");
		console.log("[ServerAPI] _fakeServerState:", this._fakeServerState);
		console.log("[ServerAPI] _messageListener:", this._messageListener);

		if (!this._fakeServerState || !this._messageListener) {
			console.warn(
				"[ServerAPI] Missing fakeServerState or messageListener, cannot start game"
			);
			return;
		}

		// Set correct phase based on starting player
		this._fakeServerState.gameState.phase =
			this._fakeServerState.gameState.currentTurn === "player"
				? GamePhase.PLAYER_TURN
				: GamePhase.ENEMY_TURN;

		// Mark game as started BEFORE sending data
		this._fakeServerState.isGameStarted = true;

		// Send deck data with initial hands
		const playerHand = this._fakeServerState.playerDeck.slice(0, 5);
		console.log(
			"[ServerAPI] Preparing to send deck_data with playerHand:",
			playerHand
		);

		setTimeout(() => {
			if (this._messageListener && this._fakeServerState) {
				const responseData = {
					type: "deck_data" as const,
					playerHand: playerHand,
					gameState: { ...this._fakeServerState.gameState },
				};
				console.log("[ServerAPI] Sending deck_data response:", responseData);
				this._messageListener(responseData);
			} else {
				console.warn(
					"[ServerAPI] Lost messageListener or fakeServerState during timeout"
				);
			}
		}, 200);
	}

	/**
	 * Disconnect from server
	 */
	public disconnect(): void {
		this._isConnected = false;
		this._sessionId = null;
		console.log("Disconnected from server");
	}

	/**
	 * Send a player action to the server
	 */
	public async sendAction(action: PlayerAction): Promise<boolean> {
		if (!this._isConnected || !this._sessionId) {
			console.error("Not connected to server. Cannot send action.");
			return false;
		}

		if (!this._fakeServerState || !this._fakeServerState.isGameStarted) {
			console.error("Game not started. Cannot send action.");
			return false;
		}

		try {
			console.log("Sending action to server:", action);

			// Simulate network delay
			await new Promise((resolve) => setTimeout(resolve, 100));

			this.processFakeServerAction(action);

			return true;
		} catch (error) {
			console.error("Failed to send action to server:", error);
			return false;
		}
	}

	/**
	 * Process player action in fake server
	 */
	private processFakeServerAction(action: PlayerAction): void {
		if (!this._fakeServerState || !this._messageListener) return;

		switch (action.type) {
			case ActionType.PLACE_CARD:
				this.handlePlayerCardPlacement(action);
				break;
			case ActionType.PASS_TURN:
				this.handlePlayerPass();
				break;
			default:
				console.warn("Unknown action type:", action.type);
		}
	}

	/**
	 * Handle player card placement
	 */
	private handlePlayerCardPlacement(action: PlayerAction): void {
		if (!this._fakeServerState || !this._messageListener) return;
		if (!action.cardId || !action.targetRow) return;

		this._fakeServerState.playerBoard[action.targetRow].push(action.cardId);

		const cardIndex = this._fakeServerState.playerDeck.indexOf(action.cardId);

		if (cardIndex > -1) {
			this._fakeServerState.playerDeck.splice(cardIndex, 1);
		}

		console.log(
			`Fake server: Player placed card ${action.cardId} on ${action.targetRow} row`
		);

		this.updateCurrentRoundScores();

		this._fakeServerState.gameState.playerPassed = false;

		if (this._fakeServerState.gameState.enemyPassed) {
			this._messageListener({
				type: "game_state_update",
				gameState: { ...this._fakeServerState.gameState },
			});
		} else {
			this.switchTurnToEnemy();
		}
	}

	/**
	 * Handle player pass
	 */
	private handlePlayerPass(): void {
		if (!this._fakeServerState || !this._messageListener) return;

		this._fakeServerState.gameState.playerPassed = true;
		console.log("Fake server: Player passed");

		// Send game state update to notify client about player pass
		this._messageListener({
			type: "game_state_update",
			gameState: { ...this._fakeServerState.gameState },
		});

		// Check if enemy has also passed
		if (this._fakeServerState.gameState.enemyPassed) {
			// Both passed, end round
			this.checkRoundEnd();
		} else {
			// Switch turn to enemy
			this.switchTurnToEnemy();
		}
	}

	/**
	 * Switch turn to enemy and schedule their action
	 */
	private switchTurnToEnemy(): void {
		if (!this._fakeServerState || !this._messageListener) return;

		this._fakeServerState.gameState.currentTurn = "enemy";
		this._fakeServerState.gameState.phase = GamePhase.ENEMY_TURN;

		// Send game state update
		this._messageListener({
			type: "game_state_update",
			gameState: { ...this._fakeServerState.gameState },
		});

		console.log("Fake server: Switched turn to enemy");
	}

	/**
	 * Execute enemy card play
	 */
	private executeEnemyCardPlay(): void {
		if (!this._fakeServerState || !this._messageListener) return;

		// Pick random card from enemy hand
		const enemyHand = this._fakeServerState.enemyHand;
		if (enemyHand.length === 0) {
			console.warn("Enemy has no cards in hand to play");
			return;
		}

		const randomCardIndex = Math.floor(Math.random() * enemyHand.length);
		const randomCard = enemyHand[randomCardIndex];
		const cardData = CardDatabase.getCardById(randomCard);

		// Pick appropriate row based on card type
		let targetRow: "melee" | "ranged" | "siege";
		if (cardData) {
			switch (cardData.type) {
				case "melee":
					targetRow = "melee";
					break;
				case "ranged":
					targetRow = "ranged";
					break;
				case "siege":
					targetRow = "siege";
					break;
				default:
					targetRow = "melee";
			}
		} else {
			targetRow = "melee";
		}

		// Add card to enemy board
		this._fakeServerState.enemyBoard[targetRow].push(randomCard);

		// Remove card from enemy hand
		this._fakeServerState.enemyHand.splice(randomCardIndex, 1);

		// Update enemy hand size in game state
		this._fakeServerState.gameState.enemyHandSize =
			this._fakeServerState.enemyHand.length;

		console.log(
			`Fake server: Enemy played card ${randomCard} on ${targetRow} row`
		);

		this.updateCurrentRoundScores();

		// Enemy placed a card, so they are no longer passed
		this._fakeServerState.gameState.enemyPassed = false;

		// Send enemy action
		this._messageListener({
			type: "enemy_action",
			action: {
				type: ActionType.PLACE_CARD,
				cardId: randomCard,
				targetRow: targetRow,
				playerId: "enemy",
			},
			gameState: { ...this._fakeServerState.gameState },
		});

		// Check if player has passed
		if (this._fakeServerState.gameState.playerPassed) {
			// Player already passed, so enemy continues (no turn switch needed)
			console.log("Fake server: Enemy continues turn (player already passed)");

			// Update the game state to reflect enemy's pass status change
			this._messageListener({
				type: "game_state_update",
				gameState: { ...this._fakeServerState.gameState },
			});
		} else {
			// Player hasn't passed yet, so switch turn to player
			this.switchTurnToPlayer();
		}
	}

	/**
	 * Execute enemy pass
	 */
	private executeEnemyPass(): void {
		if (!this._fakeServerState || !this._messageListener) return;

		this._fakeServerState.gameState.enemyPassed = true;

		// Check if player has also passed
		if (this._fakeServerState.gameState.playerPassed) {
			// Both passed, end round
			this.checkRoundEnd();
		} else {
			// Switch turn back to player
			this._fakeServerState.gameState.currentTurn = "player";
			this._fakeServerState.gameState.phase = GamePhase.PLAYER_TURN;
		}

		// Send single enemy action with updated game state
		this._messageListener({
			type: "enemy_action",
			action: {
				type: ActionType.PASS_TURN,
				playerId: "enemy",
			},
			gameState: { ...this._fakeServerState.gameState },
		});
	}

	/**
	 * Switch turn back to player
	 */
	private switchTurnToPlayer(): void {
		if (!this._fakeServerState || !this._messageListener) return;

		this._fakeServerState.gameState.currentTurn = "player";
		this._fakeServerState.gameState.phase = GamePhase.PLAYER_TURN;

		// Send game state update
		this._messageListener({
			type: "game_state_update",
			gameState: { ...this._fakeServerState.gameState },
		});

		console.log("Fake server: Switched turn back to player");
	}

	/**
	 * Check if round should end and calculate winner
	 */
	private checkRoundEnd(): void {
		if (!this._fakeServerState || !this._messageListener) return;

		console.log("Fake server: Both players passed, calculating round winner");

		// Calculate scores for this round
		const playerScore = this.calculateBoardScore(
			this._fakeServerState.playerBoard
		);
		const enemyScore = this.calculateBoardScore(
			this._fakeServerState.enemyBoard
		);

		console.log(`Round scores - Player: ${playerScore}, Enemy: ${enemyScore}`);

		// Determine round winner and update overall score
		if (playerScore > enemyScore) {
			this._fakeServerState.gameState.playerScore++;
			console.log("Player wins the round!");
		} else if (enemyScore > playerScore) {
			this._fakeServerState.gameState.enemyScore++;
			console.log("Enemy wins the round!");
		} else {
			console.log("Round is a tie!");
		}

		// Set round end phase
		this._fakeServerState.gameState.phase = GamePhase.ROUND_END;

		// Send round end update
		this._messageListener({
			type: "game_state_update",
			gameState: { ...this._fakeServerState.gameState },
		});

		// Clear the playing boards after the round ends
		setTimeout(() => {
			this.clearPlayingBoards();
		}, 100);

		// TODO: Check if game should end (best of 3 rounds)
		// For now, just log the current score
		console.log(
			`Current game score - Player: ${this._fakeServerState.gameState.playerScore}, Enemy: ${this._fakeServerState.gameState.enemyScore}`
		);
	}

	/**
	 * Calculate total score for a board
	 */
	private calculateBoardScore(board: {
		melee: number[];
		ranged: number[];
		siege: number[];
	}): number {
		let totalScore = 0;

		// Add up scores from all rows
		[...board.melee, ...board.ranged, ...board.siege].forEach((cardId) => {
			const cardData = CardDatabase.getCardById(cardId);
			if (cardData) {
				totalScore += cardData.score;
			}
		});

		return totalScore;
	}

	/**
	 * Send card placement action
	 */
	public async sendCardPlacement(
		cardId: number,
		targetRow: "melee" | "ranged" | "siege"
	): Promise<boolean> {
		const action: PlayerAction = {
			type: ActionType.PLACE_CARD,
			cardId: cardId,
			targetRow: targetRow,
			playerId: "player",
		};

		return this.sendAction(action);
	}

	/**
	 * Send pass turn action
	 */
	public async sendPassTurn(): Promise<boolean> {
		const action: PlayerAction = {
			type: ActionType.PASS_TURN,
			playerId: "player",
		};

		return this.sendAction(action);
	}

	/**
	 * Send draw card action
	 */
	public async sendDrawCard(): Promise<boolean> {
		const action: PlayerAction = {
			type: ActionType.DRAW_CARD,
			playerId: "player",
		};

		return this.sendAction(action);
	}

	/**
	 * Start listening for server events (WebSocket or polling)
	 */
	public startListening(onMessage: (response: ServerResponse) => void): void {
		if (!this._isConnected) {
			console.error("Not connected to server. Cannot start listening.");
			return;
		}

		// Store the message listener for fake server communication
		this._messageListener = onMessage;

		console.log("Started listening for server messages");

		// TODO: Implement actual WebSocket connection or polling
		// For now, this is just a placeholder

		// Example of how server responses would be handled:
		// this.websocket.onmessage = (event) => {
		//     const response: ServerResponse = JSON.parse(event.data);
		//     onMessage(response);
		// };
	}

	/**
	 * Stop listening for server events
	 */
	public stopListening(): void {
		this._messageListener = null;
		console.log("Stopped listening for server messages");
		// TODO: Close WebSocket or stop polling
	}

	/**
	 * Get connection status
	 */
	public get isConnected(): boolean {
		return this._isConnected;
	}

	/**
	 * Get current session ID
	 */
	public get sessionId(): string | null {
		return this._sessionId;
	}

	/**
	 * Debug method: Force enemy action (for debug panel)
	 */
	public debugForceEnemyAction(): void {
		if (!this._fakeServerState || !this._fakeServerState.isGameStarted) {
			console.warn("Debug: Cannot force enemy action - game not started");
			return;
		}

		if (this._fakeServerState.gameState.currentTurn !== "enemy") {
			console.warn("Debug: Cannot force enemy action - not enemy's turn");
			return;
		}

		this.executeEnemyCardPlay();
	}

	/**
	 * Debug method: Force enemy pass (for debug panel)
	 */
	public debugForceEnemyPass(): void {
		if (!this._fakeServerState || !this._fakeServerState.isGameStarted) {
			console.warn("Debug: Cannot force enemy pass - game not started");
			return;
		}

		if (this._fakeServerState.gameState.currentTurn !== "enemy") {
			console.warn("Debug: Cannot force enemy pass - not enemy's turn");
			return;
		}

		this.executeEnemyPass();
	}

	/**
	 * Debug method: Get fake server state (for debug panel)
	 */
	public get debugServerState(): FakeServerState | null {
		return this._fakeServerState;
	}

	/**
	 * Update current round scores based on cards on the board
	 */
	private updateCurrentRoundScores(): void {
		if (!this._fakeServerState) return;

		const playerScore = this.calculateBoardScore(
			this._fakeServerState.playerBoard
		);

		const enemyScore = this.calculateBoardScore(
			this._fakeServerState.enemyBoard
		);

		this._fakeServerState.gameState.playerScore = playerScore;
		this._fakeServerState.gameState.enemyScore = enemyScore;

		console.log(
			`[ServerAPI] Updated scores - Player: ${playerScore}, Enemy: ${enemyScore}`
		);
	}

	/**
	 * Move all cards from playing boards to discard piles
	 */
	private clearPlayingBoards(): void {
		if (!this._fakeServerState) return;

		console.log(
			"[ServerAPI] Moving playing board cards to discard after round end"
		);

		// Move player board cards to player discard
		const playerCards = [
			...this._fakeServerState.playerBoard.melee,
			...this._fakeServerState.playerBoard.ranged,
			...this._fakeServerState.playerBoard.siege,
		];
		this._fakeServerState.playerDiscard.push(...playerCards);

		// Move enemy board cards to enemy discard
		const enemyCards = [
			...this._fakeServerState.enemyBoard.melee,
			...this._fakeServerState.enemyBoard.ranged,
			...this._fakeServerState.enemyBoard.siege,
		];
		this._fakeServerState.enemyDiscard.push(...enemyCards);

		// Clear the playing boards
		this._fakeServerState.playerBoard.melee = [];
		this._fakeServerState.playerBoard.ranged = [];
		this._fakeServerState.playerBoard.siege = [];

		this._fakeServerState.enemyBoard.melee = [];
		this._fakeServerState.enemyBoard.ranged = [];
		this._fakeServerState.enemyBoard.siege = [];

		console.log(
			`[ServerAPI] Cards moved to discard - Player: ${playerCards.length}, Enemy: ${enemyCards.length}`
		);
		console.log(
			`[ServerAPI] Total discard piles - Player: ${this._fakeServerState.playerDiscard.length}, Enemy: ${this._fakeServerState.enemyDiscard.length}`
		);
	}
}
