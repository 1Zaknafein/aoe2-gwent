/**
 * Lobby-specific types and interfaces
 */

export interface Player {
	id: string;
	name: string;
	isReady: boolean;
	isHost: boolean;
}

export interface Room {
	id: string;
	name: string;
	players: Player[];
	maxPlayers: number;
	isGameStarted: boolean;
	createdAt: Date;
}

export interface LobbyMessage {
	type:
		| "player_joined"
		| "player_left"
		| "player_ready"
		| "game_starting"
		| "room_created"
		| "error"
		| "info";
	data: any;
	timestamp: Date;
}

export interface GameSessionData {
	roomId: string;
	playerId: string;
	playerName: string;
	opponentId: string;
	opponentName: string;
	isHost: boolean;
	serverUrl: string;
}

export type ConnectionStatus =
	| "connecting"
	| "connected"
	| "disconnected"
	| "error";

/**
 * WebSocket client for lobby communication
 */
export class LobbyWebSocketClient {
	private ws: WebSocket | null = null;
	private serverUrl: string;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectDelay: number = 1000;
	private isConnecting: boolean = false;

	// Event callbacks
	private onMessageCallback: ((message: LobbyMessage) => void) | null = null;
	private onConnectionStatusCallback:
		| ((status: ConnectionStatus) => void)
		| null = null;

	constructor(serverUrl: string = "ws://localhost:8080") {
		this.serverUrl = serverUrl;
	}

	/**
	 * Connect to the WebSocket server
	 */
	public async connect(): Promise<boolean> {
		if (
			this.isConnecting ||
			(this.ws && this.ws.readyState === WebSocket.CONNECTING)
		) {
			return false;
		}

		this.isConnecting = true;
		this.updateConnectionStatus("connecting");

		try {
			this.ws = new WebSocket(this.serverUrl);

			this.ws.onopen = () => {
				console.log("Connected to lobby server");
				this.isConnecting = false;
				this.reconnectAttempts = 0;
				this.updateConnectionStatus("connected");
			};

			this.ws.onmessage = (event) => {
				try {
					const message: LobbyMessage = JSON.parse(event.data);
					message.timestamp = new Date(message.timestamp);
					this.handleMessage(message);
				} catch (error) {
					console.error("Failed to parse message:", error);
				}
			};

			this.ws.onclose = () => {
				console.log("Disconnected from lobby server");
				this.isConnecting = false;
				this.updateConnectionStatus("disconnected");
				this.attemptReconnect();
			};

			this.ws.onerror = (error) => {
				console.error("WebSocket error:", error);
				this.isConnecting = false;
				this.updateConnectionStatus("error");
			};

			return true;
		} catch (error) {
			console.error("Failed to connect to lobby server:", error);
			this.isConnecting = false;
			this.updateConnectionStatus("error");
			return false;
		}
	}

	/**
	 * Disconnect from the WebSocket server
	 */
	public disconnect(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
	}

	/**
	 * Send a message to the server
	 */
	public send(type: string, data: any): boolean {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.warn("WebSocket is not connected, cannot send message");
			return false;
		}

		try {
			const message = {
				type,
				data,
				timestamp: new Date(),
			};
			this.ws.send(JSON.stringify(message));
			return true;
		} catch (error) {
			console.error("Failed to send message:", error);
			return false;
		}
	}

	/**
	 * Set callback for incoming messages
	 */
	public onMessage(callback: (message: LobbyMessage) => void): void {
		this.onMessageCallback = callback;
	}

	/**
	 * Set callback for connection status changes
	 */
	public onConnectionStatus(
		callback: (status: ConnectionStatus) => void
	): void {
		this.onConnectionStatusCallback = callback;
	}

	/**
	 * Handle incoming messages
	 */
	private handleMessage(message: LobbyMessage): void {
		if (this.onMessageCallback) {
			this.onMessageCallback(message);
		}
	}

	/**
	 * Update connection status and notify listeners
	 */
	private updateConnectionStatus(status: ConnectionStatus): void {
		if (this.onConnectionStatusCallback) {
			this.onConnectionStatusCallback(status);
		}
	}

	/**
	 * Attempt to reconnect to the server
	 */
	private attemptReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.log("Max reconnection attempts reached");
			return;
		}

		this.reconnectAttempts++;
		console.log(
			`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
		);

		setTimeout(() => {
			this.connect();
		}, this.reconnectDelay * this.reconnectAttempts);
	}
}

/**
 * High-level lobby manager
 */
export class LobbyManager {
	private client: LobbyWebSocketClient;
	private currentPlayer: Player | null = null;
	private currentRoom: Room | null = null;
	private gameStartCallback: ((gameData: GameSessionData) => void) | null =
		null;
	private connectionStatusCallback:
		| ((status: ConnectionStatus) => void)
		| null = null;

	constructor(serverUrl?: string) {
		this.client = new LobbyWebSocketClient(serverUrl);
		this.setupClientHandlers();
	}

	/**
	 * Initialize the lobby manager
	 */
	public async init(): Promise<boolean> {
		return await this.client.connect();
	}

	/**
	 * Create a new room
	 */
	public createRoom(playerName: string, roomName: string): boolean {
		if (!playerName.trim() || !roomName.trim()) {
			return false;
		}

		return this.client.send("create_room", {
			playerName: playerName.trim(),
			roomName: roomName.trim(),
		});
	}

	/**
	 * Join an existing room
	 */
	public joinRoom(playerName: string, roomName: string): boolean {
		if (!playerName.trim() || !roomName.trim()) {
			return false;
		}

		return this.client.send("join_room", {
			playerName: playerName.trim(),
			roomName: roomName.trim(),
		});
	}

	/**
	 * Leave the current room
	 */
	public leaveRoom(): boolean {
		if (!this.currentRoom || !this.currentPlayer) {
			return false;
		}

		return this.client.send("leave_room", {
			roomId: this.currentRoom.id,
			playerId: this.currentPlayer.id,
		});
	}

	/**
	 * Set player ready status
	 */
	public setReady(isReady: boolean): boolean {
		if (!this.currentRoom || !this.currentPlayer) {
			return false;
		}

		return this.client.send("set_ready", {
			roomId: this.currentRoom.id,
			playerId: this.currentPlayer.id,
			isReady,
		});
	}

	/**
	 * Disconnect from the server
	 */
	public disconnect(): void {
		this.client.disconnect();
	}

	/**
	 * Pause connection (for page visibility changes)
	 */
	public pauseConnection(): void {
		// Implementation could include heartbeat pausing
	}

	/**
	 * Resume connection
	 */
	public resumeConnection(): void {
		// Implementation could include heartbeat resuming
	}

	/**
	 * Set callback for game start events
	 */
	public onGameStart(callback: (gameData: GameSessionData) => void): void {
		this.gameStartCallback = callback;
	}

	/**
	 * Set callback for connection status changes
	 */
	public onConnectionStatusChange(
		callback: (status: ConnectionStatus) => void
	): void {
		this.connectionStatusCallback = callback;
	}

	/**
	 * Get current player
	 */
	public getCurrentPlayer(): Player | null {
		return this.currentPlayer;
	}

	/**
	 * Get current room
	 */
	public getCurrentRoom(): Room | null {
		return this.currentRoom;
	}

	/**
	 * Setup WebSocket client event handlers
	 */
	private setupClientHandlers(): void {
		this.client.onMessage((message) => {
			this.handleLobbyMessage(message);
		});

		this.client.onConnectionStatus((status) => {
			if (this.connectionStatusCallback) {
				this.connectionStatusCallback(status);
			}
		});
	}

	/**
	 * Handle incoming lobby messages
	 */
	private handleLobbyMessage(message: LobbyMessage): void {
		console.log("Received lobby message:", message);

		switch (message.type) {
			case "room_created":
				this.handleRoomCreated(message.data);
				break;
			case "player_joined":
				this.handlePlayerJoined(message.data);
				break;
			case "player_left":
				this.handlePlayerLeft(message.data);
				break;
			case "player_ready":
				this.handlePlayerReady(message.data);
				break;
			case "game_starting":
				this.handleGameStarting(message.data);
				break;
			case "error":
				this.handleError(message.data);
				break;
			default:
				console.log("Unhandled message type:", message.type);
		}
	}

	private handleRoomCreated(data: any): void {
		this.currentRoom = data.room;
		this.currentPlayer = data.player;
	}

	private handlePlayerJoined(data: any): void {
		if (this.currentRoom) {
			this.currentRoom.players = data.players;
		}
	}

	private handlePlayerLeft(data: any): void {
		if (this.currentRoom) {
			this.currentRoom.players = data.players;
		}
	}

	private handlePlayerReady(data: any): void {
		if (this.currentRoom) {
			this.currentRoom.players = data.players;
		}
	}

	private handleGameStarting(data: any): void {
		if (this.gameStartCallback) {
			const gameData: GameSessionData = {
				roomId: data.roomId,
				playerId: data.playerId,
				playerName: data.playerName,
				opponentId: data.opponentId,
				opponentName: data.opponentName,
				isHost: data.isHost,
				serverUrl: data.serverUrl,
			};
			this.gameStartCallback(gameData);
		}
	}

	private handleError(data: any): void {
		console.error("Lobby error:", data.message);
		// Could trigger UI notification here
	}
}
