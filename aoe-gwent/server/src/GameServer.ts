import WebSocket, { WebSocketServer } from "ws";
import { RoomManager } from "./managers/RoomManager.js";
import {
	ClientMessage,
	ServerMessage,
	AllMessages,
	LobbyMessages,
	Player,
	Room,
} from "./types/index.js";

/**
 * WebSocket Game Server
 * Handles lobby functionality and game coordination
 */
export class GameServer {
	private wss: WebSocketServer;
	private roomManager: RoomManager;
	private clients: Map<WebSocket, string> = new Map(); // ws -> playerId
	private playerConnections: Map<string, WebSocket> = new Map(); // playerId -> ws

	constructor(port: number = 3001) {
		this.roomManager = new RoomManager();
		this.wss = new WebSocketServer({
			port,
			perMessageDeflate: false,
		});

		this.setupWebSocketHandlers();
		console.log(`🚀 Game server started on port ${port}`);
	}

	private setupWebSocketHandlers(): void {
		this.wss.on("connection", (ws: WebSocket, request) => {
			console.log(
				`🔗 New client connected from ${request.socket.remoteAddress}`
			);

			ws.on("message", (data: Buffer) => {
				try {
					const message = JSON.parse(data.toString()) as ClientMessage<
						keyof AllMessages
					>;
					this.handleMessage(ws, message);
				} catch (error) {
					console.error("❌ Failed to parse message:", error);
					this.sendError(ws, "Invalid message format");
				}
			});

			ws.on("close", () => {
				this.handleDisconnection(ws);
			});

			ws.on("error", (error) => {
				console.error("❌ WebSocket error:", error);
				this.handleDisconnection(ws);
			});

			// Send initial connection acknowledgment
			this.sendMessage(ws, "lobby:rooms_list", {
				rooms: this.roomManager.getAllRooms(),
			});
		});
	}

	private handleMessage(
		ws: WebSocket,
		message: ClientMessage<keyof AllMessages>
	): void {
		console.log(`📨 Received message: ${message.type}`, message.data);

		try {
			switch (message.type) {
				case "lobby:create_room":
					this.handleCreateRoom(
						ws,
						message.data as LobbyMessages["lobby:create_room"]
					);
					break;

				case "lobby:join_room":
					this.handleJoinRoom(
						ws,
						message.data as LobbyMessages["lobby:join_room"]
					);
					break;

				case "lobby:leave_room":
					this.handleLeaveRoom(
						ws,
						message.data as LobbyMessages["lobby:leave_room"]
					);
					break;

				case "lobby:player_ready":
					this.handlePlayerReady(
						ws,
						message.data as LobbyMessages["lobby:player_ready"]
					);
					break;

				case "lobby:get_rooms":
					this.handleGetRooms(ws);
					break;

				default:
					console.warn(`⚠️ Unknown message type: ${message.type}`);
					this.sendError(ws, `Unknown message type: ${message.type}`);
			}
		} catch (error) {
			console.error(`❌ Error handling message ${message.type}:`, error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			this.sendError(ws, `Failed to process ${message.type}: ${errorMessage}`);
		}
	}

	private handleCreateRoom(
		ws: WebSocket,
		data: LobbyMessages["lobby:create_room"]
	): void {
		const { roomName, playerName } = data;

		if (!roomName || !playerName) {
			this.sendError(ws, "Room name and player name are required");
			return;
		}

		const { room, playerId } = this.roomManager.createRoom(
			roomName,
			playerName
		);

		// Associate this connection with the player
		this.clients.set(ws, playerId);
		this.playerConnections.set(playerId, ws);

		// Send room created confirmation to the creator
		this.sendMessage(ws, "lobby:room_created", { room, playerId });

		// Broadcast updated room list to all clients
		this.broadcastRoomsList();

		console.log(`✅ Room "${roomName}" created by ${playerName}`);
	}

	private handleJoinRoom(
		ws: WebSocket,
		data: LobbyMessages["lobby:join_room"]
	): void {
		const { roomId, playerName } = data;

		if (!roomId || !playerName) {
			this.sendError(ws, "Room ID and player name are required");
			return;
		}

		try {
			const result = this.roomManager.joinRoom(roomId, playerName);
			if (!result) {
				this.sendError(ws, "Room not found");
				return;
			}

			const { room, playerId } = result;

			// Associate this connection with the player
			this.clients.set(ws, playerId);
			this.playerConnections.set(playerId, ws);

			// Send join confirmation to the new player
			this.sendMessage(ws, "lobby:room_joined", { room, playerId });

			// Notify all players in the room about the new player
			this.broadcastToRoom(roomId, "lobby:room_updated", { room });

			// Broadcast updated room list
			this.broadcastRoomsList();

			console.log(`✅ Player ${playerName} joined room "${room.name}"`);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to join room";
			this.sendError(ws, errorMessage);
		}
	}

	private handleLeaveRoom(
		ws: WebSocket,
		data: LobbyMessages["lobby:leave_room"]
	): void {
		const { roomId, playerId } = data;
		const result = this.roomManager.leaveRoom(playerId);

		if (result.room) {
			// Notify remaining players
			this.broadcastToRoom(roomId, "lobby:room_updated", { room: result.room });
		}

		// Remove client associations
		this.clients.delete(ws);
		this.playerConnections.delete(playerId);

		// Broadcast updated room list
		this.broadcastRoomsList();

		console.log(`✅ Player left room`);
	}

	private handlePlayerReady(
		ws: WebSocket,
		data: LobbyMessages["lobby:player_ready"]
	): void {
		const { roomId, playerId, ready } = data;

		const room = this.roomManager.setPlayerReady(playerId, ready);
		if (!room) {
			this.sendError(ws, "Room or player not found");
			return;
		}

		// Notify all players in room about ready status change
		this.broadcastToRoom(roomId, "lobby:player_ready_changed", {
			room,
			playerId,
			ready,
		});

		// Check if all players are ready and can start game
		if (this.roomManager.areAllPlayersReady(roomId)) {
			const gameSessions = this.roomManager.startGame(roomId);
			if (gameSessions) {
				// Send game start message to each player with their specific session data
				gameSessions.forEach((session, index) => {
					const playerWs = this.playerConnections.get(session.playerId);
					if (playerWs) {
						this.sendMessage(playerWs, "lobby:game_starting", {
							gameSession: session,
						});
					}
				});

				console.log(`🎮 Game starting in room "${room.name}"`);
			}
		}
	}

	private handleGetRooms(ws: WebSocket): void {
		const rooms = this.roomManager.getAllRooms();
		this.sendMessage(ws, "lobby:rooms_list", { rooms });
	}

	private handleDisconnection(ws: WebSocket): void {
		const playerId = this.clients.get(ws);
		if (playerId) {
			console.log(`🔌 Player ${playerId} disconnected`);

			const result = this.roomManager.leaveRoom(playerId);
			if (result.room) {
				// Notify remaining players
				this.broadcastToRoom(result.room.id, "lobby:room_updated", {
					room: result.room,
				});
			}

			// Clean up connections
			this.clients.delete(ws);
			this.playerConnections.delete(playerId);

			// Broadcast updated room list
			this.broadcastRoomsList();
		}
	}

	private sendMessage<T extends keyof AllMessages>(
		ws: WebSocket,
		type: T,
		data: AllMessages[T]
	): void {
		const message: ServerMessage<T> = {
			type,
			data,
			timestamp: new Date(),
		};

		try {
			ws.send(JSON.stringify(message));
		} catch (error) {
			console.error("❌ Failed to send message:", error);
		}
	}

	private sendError(ws: WebSocket, message: string, code?: string): void {
		this.sendMessage(ws, "lobby:error", { message, code });
	}

	private broadcastToRoom<T extends keyof AllMessages>(
		roomId: string,
		type: T,
		data: AllMessages[T]
	): void {
		const room = this.roomManager.getRoom(roomId);
		if (!room) return;

		room.players.forEach((player) => {
			const ws = this.playerConnections.get(player.id);
			if (ws && ws.readyState === WebSocket.OPEN) {
				this.sendMessage(ws, type, data);
			}
		});
	}

	private broadcastRoomsList(): void {
		const rooms = this.roomManager.getAllRooms();
		const message: ServerMessage<"lobby:rooms_list"> = {
			type: "lobby:rooms_list",
			data: { rooms },
			timestamp: new Date(),
		};

		this.wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}

	public getStats(): { players: number; rooms: number } {
		return {
			players: this.roomManager.getTotalPlayers(),
			rooms: this.roomManager.getTotalRooms(),
		};
	}

	public close(): void {
		this.wss.close();
		console.log("🛑 Game server stopped");
	}
}
