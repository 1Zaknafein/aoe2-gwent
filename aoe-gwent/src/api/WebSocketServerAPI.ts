import { GameWebSocketClient } from "./GameWebSocketClient";
import {
	PlayerAction,
	ServerResponse,
	GameState,
	GamePhase,
} from "../shared/game/GameFlowManager";

/**
 * WebSocket-based server API that replaces the fake ServerAPI
 * Connects to the real game server and handles multiplayer communication
 */
export class WebSocketServerAPI {
	private client: GameWebSocketClient;
	private sessionData: any = null;
	private gameState: any = null;
	private _playerNumber: 1 | 2 | null = null;
	private _isHost: boolean = false;
	private _messageListener: ((response: ServerResponse) => void) | null = null;
	private _isConnected: boolean = false;

	constructor() {
		this.client = new GameWebSocketClient();
		this.setupEventHandlers();
	}

	/**
	 * Initialize connection to server using stored session data
	 */
	public async connect(): Promise<boolean> {
		try {
			console.log("🔗 Connecting to WebSocket server...");

			// Initialize game connection (handles session recovery automatically)
			const success = await this.client.initGameConnection();
			if (success) {
				this._isConnected = true;
				console.log("✅ WebSocket server connection established");
				return true;
			} else {
				console.error("❌ Failed to connect to WebSocket server");
				return false;
			}
		} catch (error) {
			console.error("Failed to connect to server:", error);
			return false;
		}
	}

	/**
	 * Setup event handlers for WebSocket messages
	 */
	private setupEventHandlers(): void {
		// Handle game started message
		this.client.on("game:started", (data) => {
			console.log("🎮 Game started:", data);
			this.handleGameStarted(data);
		});

		// Handle game state updates
		this.client.on("game:state_update", (data) => {
			console.log("📊 Received game state update:", data);
			this.handleGameStateUpdate(data);
		});

		// Handle action results
		this.client.on("game:action_result", (data) => {
			console.log("⚡ Action result:", data);
			this.handleActionResult(data);
		});

		// Handle game over
		this.client.on("game:game_over", (data) => {
			console.log("🏁 Game over:", data);
			this.handleGameOver(data);
		});

		// Handle errors
		this.client.on("lobby:error", (data) => {
			console.error("❌ Server error:", data);
			this.handleError(data);
		});

		// Connection events
		this.client.on("connected", () => {
			console.log("🔗 WebSocket connected");
		});

		this.client.on("disconnected", () => {
			console.log("🔌 WebSocket disconnected");
			this._isConnected = false;
		});
	}

	/**
	 * Handle game state updates from server
	 */
	private handleGameStateUpdate(data: any): void {
		// Store the complete game state
		this.gameState = data.gameState;
		this.sessionData = data;
		this._playerNumber = data.playerNumber;
		this._isHost = data.isHost;

		console.log(
			`🎮 Player ${this._playerNumber} (${
				this._isHost ? "Host" : "Guest"
			}) - Turn: ${data.gameState.isMyTurn ? "Mine" : "Opponent"}`
		);

		// Convert to ServerResponse format that GameController expects
		const serverResponse: ServerResponse = {
			type: "game_state_update",
			gameState: this.convertToExpectedGameState(data),
			playerHand: data.playerHand || [],
		};

		// Notify the game controller
		if (this._messageListener) {
			this._messageListener(serverResponse);
		}
	}

	/**
	 * Handle game started message from server
	 */
	private handleGameStarted(data: any): void {
		console.log("🎮 Game started with player names:", data);

		// Store player names for display
		this.sessionData = {
			...this.sessionData,
			playerName: data.playerName,
			enemyName: data.enemyName,
			isHost: data.isHost,
		};

		// Emit player names event to GameController
		if (this._messageListener) {
			const serverResponse: ServerResponse = {
				type: "game_started",
				playerName: data.playerName,
				enemyName: data.enemyName,
				isHost: data.isHost,
			};
			this._messageListener(serverResponse);
		}
	}

	/**
	 * Convert server data to the format expected by GameController
	 */
	private convertToExpectedGameState(data: any): GameState {
		return {
			phase: this.convertPhase(data.gameState.phase),
			currentTurn: data.gameState.isMyTurn ? "player" : "enemy",
			roundNumber: data.gameState.roundNumber,
			playerScore: data.gameState.scores[data.playerId] || 0,
			enemyScore: data.gameState.scores[data.opponentId] || 0,
			playerPassed: data.gameState.passedPlayers.includes(data.playerId),
			enemyPassed: data.gameState.passedPlayers.includes(data.opponentId),
			startingPlayer: data.isHost ? "player" : "enemy",
			playerHandSize: data.gameState.handSizes[data.playerId] || 0,
			enemyHandSize: data.gameState.handSizes[data.opponentId] || 0,
		};
	}

	/**
	 * Convert server phase to client phase
	 */
	private convertPhase(serverPhase: string): GamePhase {
		switch (serverPhase) {
			case "WAITING_FOR_GAME_START":
				return GamePhase.WAITING_FOR_GAME_START;
			case "PLAYER_TURN":
				return GamePhase.PLAYER_TURN;
			case "ROUND_END":
				return GamePhase.ROUND_END;
			case "GAME_END":
				return GamePhase.GAME_END;
			default:
				return GamePhase.PLAYER_TURN;
		}
	}

	/**
	 * Handle action results
	 */
	private handleActionResult(data: any): void {
		console.log("⚡ Action result received:", data);
		// For now, just log the result - we can handle it properly later
	}

	/**
	 * Handle game over
	 */
	private handleGameOver(data: any): void {
		console.log("🏁 Game over received:", data);
		// For now, just log the result - we can handle it properly later
	}

	/**
	 * Handle errors
	 */
	private handleError(data: any): void {
		console.error("❌ Server error received:", data);
		// For now, just log the error - we can handle it properly later
	}

	/**
	 * Send a player action to the server
	 */
	public async sendAction(action: PlayerAction): Promise<any> {
		if (!this._isConnected) {
			console.error("Not connected to server");
			return { success: false, error: "Not connected" };
		}

		if (!this.sessionData) {
			console.error("No session data available");
			return { success: false, error: "No session data" };
		}

		// Convert action to server format
		const serverAction = {
			roomId: this.sessionData.roomId,
			playerId: this.sessionData.playerId,
			action: {
				type: action.type,
				cardId: action.cardId,
				targetRow: action.targetRow,
			},
		};

		try {
			const sent = this.client.send("game:action", serverAction);
			if (sent) {
				console.log("✅ Action sent successfully:", serverAction);
				return { success: true, data: action };
			} else {
				console.error("❌ Failed to send action");
				return { success: false, error: "Failed to send action" };
			}
		} catch (error) {
			console.error("❌ Error sending action:", error);
			return { success: false, error: "Error sending action: " + error };
		}
	}

	/**
	 * Start listening for server messages
	 */
	public startListening(callback: (response: ServerResponse) => void): void {
		this._messageListener = callback;
		console.log("👂 Started listening for server messages");
	}

	/**
	 * Stop listening for server messages
	 */
	public stopListening(): void {
		this._messageListener = null;
		console.log("🔇 Stopped listening for server messages");
	}

	/**
	 * Disconnect from server
	 */
	public disconnect(): void {
		this.client.disconnect();
		this._isConnected = false;
		this._messageListener = null;
		console.log("🔌 Disconnected from WebSocket server");
	}

	/**
	 * Check if connected
	 */
	public get isConnected(): boolean {
		return this._isConnected && this.client.isConnected();
	}

	/**
	 * Get current game state
	 */
	public get currentGameState(): any {
		return this.gameState;
	}

	/**
	 * Get player number (1 or 2)
	 */
	public get playerNumber(): 1 | 2 | null {
		return this.playerNumber;
	}

	/**
	 * Check if this player is the host
	 */
	public get isHost(): boolean {
		return this.isHost;
	}

	/**
	 * Get session information
	 */
	public get sessionInfo(): any {
		return this.sessionData;
	}
}
