import {
	Player,
	Room,
	GameSessionData,
	ConnectionStatus,
	ServerMessage,
	ClientMessage,
	AllMessages,
} from "./types";

// Re-export types from our types file for client use
export type { Player, Room, GameSessionData, ConnectionStatus };

// Connection event types
type ConnectionEvent = "connected" | "disconnected" | "error";

/**
 * Real WebSocket client for connecting to our game server
 */
export class GameWebSocketClient {
	private ws: WebSocket | null = null;
	private serverUrl: string;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectDelay: number = 1000;
	private isConnecting: boolean = false;
	private connectionStatus: ConnectionStatus = "disconnected";

	// Connection event handlers
	private connectionHandlers: Map<
		ConnectionEvent,
		((error?: string) => void)[]
	> = new Map([
		["connected", []],
		["disconnected", []],
		["error", []],
	]);

	// Message event handlers
	private messageHandlers: Map<keyof AllMessages, ((data: any) => void)[]> =
		new Map();

	constructor(serverUrl: string = "ws://localhost:3001") {
		this.serverUrl = serverUrl;
	}

	/**
	 * Add event listener for connection events or message types
	 */
	public on<T extends keyof AllMessages>(
		event: T,
		handler: (data: AllMessages[T]) => void
	): void;
	public on(event: ConnectionEvent, handler: (error?: string) => void): void;
	public on(event: string, handler: (data?: any) => void): void {
		if (["connected", "disconnected", "error"].includes(event)) {
			const connectionHandlers =
				this.connectionHandlers.get(event as ConnectionEvent) || [];
			connectionHandlers.push(handler);
			this.connectionHandlers.set(event as ConnectionEvent, connectionHandlers);
		} else {
			const messageHandlers =
				this.messageHandlers.get(event as keyof AllMessages) || [];
			messageHandlers.push(handler);
			this.messageHandlers.set(event as keyof AllMessages, messageHandlers);
		}
	}

	/**
	 * Remove event listener
	 */
	public off<T extends keyof AllMessages>(
		event: T,
		handler: (data: AllMessages[T]) => void
	): void;
	public off(event: ConnectionEvent, handler: (error?: string) => void): void;
	public off(event: string, handler: (data?: any) => void): void {
		if (["connected", "disconnected", "error"].includes(event)) {
			const handlers =
				this.connectionHandlers.get(event as ConnectionEvent) || [];
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		} else {
			const handlers =
				this.messageHandlers.get(event as keyof AllMessages) || [];
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		}
	}

	/**
	 * Emit connection events
	 */
	private emitConnectionEvent(event: ConnectionEvent, error?: string): void {
		const handlers = this.connectionHandlers.get(event) || [];
		handlers.forEach((handler) => handler(error));
	}

	/**
	 * Emit message events
	 */
	private emitMessageEvent<T extends keyof AllMessages>(
		event: T,
		data: AllMessages[T]
	): void {
		const handlers = this.messageHandlers.get(event) || [];
		handlers.forEach((handler) => handler(data));
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
				console.log("🔗 Connected to game server");
				this.isConnecting = false;
				this.reconnectAttempts = 0;
				this.updateConnectionStatus("connected");
				this.emitConnectionEvent("connected");
			};

			this.ws.onmessage = (event) => {
				try {
					const message: ServerMessage<keyof AllMessages> = JSON.parse(
						event.data
					);
					message.timestamp = new Date(message.timestamp);
					this.handleMessage(message);
				} catch (error) {
					console.error("❌ Failed to parse message:", error);
				}
			};

			this.ws.onclose = () => {
				console.log("🔌 Disconnected from game server");
				this.isConnecting = false;
				this.updateConnectionStatus("disconnected");
				this.emitConnectionEvent("disconnected");
				this.attemptReconnect();
			};

			this.ws.onerror = (error) => {
				console.error("❌ WebSocket error:", error);
				this.isConnecting = false;
				this.updateConnectionStatus("error");
				this.emitConnectionEvent("error", "WebSocket error");
			};

			return true;
		} catch (error) {
			console.error("❌ Failed to connect to game server:", error);
			this.isConnecting = false;
			this.updateConnectionStatus("error");
			this.emitConnectionEvent("error", "Connection failed");
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
	public send<T extends keyof AllMessages>(
		type: T,
		data: AllMessages[T]
	): boolean {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.error("❌ Cannot send message: WebSocket not connected");
			return false;
		}

		try {
			const message: ClientMessage<T> = {
				type,
				data,
			};

			this.ws.send(JSON.stringify(message));
			console.log(`📤 Sent ${type}:`, data);
			return true;
		} catch (error) {
			console.error("❌ Failed to send message:", error);
			return false;
		}
	}

	/**
	 * Get current connection status
	 */
	public getConnectionStatus(): ConnectionStatus {
		return this.connectionStatus;
	}

	/**
	 * Check if connected
	 */
	public isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	/**
	 * Handle incoming messages from server
	 */
	private handleMessage(message: ServerMessage<keyof AllMessages>): void {
		console.log(`📥 Received ${message.type}:`, message.data);

		// Emit the message event
		this.emitMessageEvent(message.type, message.data);
	}

	/**
	 * Update connection status and notify callbacks
	 */
	private updateConnectionStatus(status: ConnectionStatus): void {
		this.connectionStatus = status;
		console.log(`🔗 Connection status: ${status}`);
	}

	/**
	 * Attempt to reconnect with exponential backoff
	 */
	private attemptReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.log("❌ Max reconnection attempts reached");
			return;
		}

		this.reconnectAttempts++;
		const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

		console.log(
			`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
		);

		setTimeout(() => {
			this.connect();
		}, delay);
	}

	// Convenience methods for common operations

	/**
	 * Create a new room
	 */
	public createRoom(roomName: string, playerName: string): boolean {
		return this.send("lobby:create_room", { roomName, playerName });
	}

	/**
	 * Join an existing room
	 */
	public joinRoom(roomId: string, playerName: string): boolean {
		return this.send("lobby:join_room", { roomId, playerName });
	}

	/**
	 * Leave current room
	 */
	public leaveRoom(roomId: string, playerId: string): boolean {
		return this.send("lobby:leave_room", { roomId, playerId });
	}

	/**
	 * Set player ready status
	 */
	public setPlayerReady(
		roomId: string,
		playerId: string,
		ready: boolean
	): boolean {
		return this.send("lobby:player_ready", { roomId, playerId, ready });
	}

	/**
	 * Request list of available rooms
	 */
	public getRooms(): boolean {
		return this.send("lobby:get_rooms", {});
	}
}
