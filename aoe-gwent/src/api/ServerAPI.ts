import {
	PlayerAction,
	ServerResponse,
	ActionType,
} from "../shared/game/GameStateManager";

/**
 * Handles communication with the game server
 */
export class ServerAPI {
	private _baseUrl: string;
	private _sessionId: string | null = null;
	private _isConnected: boolean = false;

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
	 * - Which player goes first (determined by server)
	 * - Initial game state
	 * - Round information
	 */
	public async requestGameStart(): Promise<boolean> {
		if (!this._isConnected || !this._sessionId) {
			console.error("Not connected to server. Cannot request game start.");
			return false;
		}

		try {
			console.log("Requesting game start from server");

			// TODO: Implement actual HTTP request to server
			const payload = {
				sessionId: this._sessionId,
				action: "start_game",
				timestamp: Date.now(),
			};

			console.log("Game start request payload:", payload);

			// Simulate network delay
			await new Promise((resolve) => setTimeout(resolve, 100));

			console.log("Game start requested successfully");
			return true;
		} catch (error) {
			console.error("Failed to request game start:", error);
			return false;
		}
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

		try {
			console.log("Sending action to server:", action);

			// TODO: Implement actual HTTP request to server
			const payload = {
				sessionId: this._sessionId,
				action: action,
				timestamp: Date.now(),
			};

			console.log("Action payload:", payload);

			// Simulate network delay
			await new Promise((resolve) => setTimeout(resolve, 100));

			// For now, just log the action
			console.log("Action sent successfully");
			return true;
		} catch (error) {
			console.error("Failed to send action to server:", error);
			return false;
		}
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
	public startListening(_onMessage: (response: ServerResponse) => void): void {
		if (!this._isConnected) {
			console.error("Not connected to server. Cannot start listening.");
			return;
		}

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
}
