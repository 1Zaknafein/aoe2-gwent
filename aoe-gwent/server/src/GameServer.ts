import WebSocket, { WebSocketServer } from "ws";
import { LobbyManager } from "./managers/LobbyManager.js";
import { GameSessionManager } from "./managers/GameSessionManager.js";
import {
	ClientMessage,
	ServerMessage,
	AllMessages,
	LobbyMessages,
	GameMessages,
	Player,
	Room,
} from "./types/index.js";
import { PlayerAction, ActionType } from "./game/GameTypes.js";

/**
 * WebSocket Game Server
 * Handles lobby functionality and game coordination
 * Refactored to use LobbyManager and GameSessionManager
 */
export class GameServer {
	private wss: WebSocketServer;
	private lobbyManager: LobbyManager;
	private gameSessionManager: GameSessionManager;
	private clients: Map<WebSocket, string> = new Map(); // ws -> playerId
	private playerConnections: Map<string, WebSocket> = new Map(); // playerId -> ws

	constructor(port: number = 3001) {
		this.lobbyManager = new LobbyManager();
		this.gameSessionManager = new GameSessionManager();
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
				rooms: this.lobbyManager.getAllRooms(),
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

				// Game Messages
				case "game:action":
					this.handleGameAction(
						ws,
						message.data as GameMessages["game:action"]
					);
					break;

				case "game:ready":
					this.handleGameReady(ws, message.data as GameMessages["game:ready"]);
					break;

				case "game:reconnect":
					this.handleGameReconnect(
						ws,
						message.data as GameMessages["game:reconnect"]
					);
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

	/**
	 * Handle game actions
	 */
	private handleGameAction(
		ws: WebSocket,
		data: GameMessages["game:action"]
	): void {
		const { roomId, playerId, action } = data;

		// Verify the player is connected
		const connectedPlayerId = this.clients.get(ws);
		if (connectedPlayerId !== playerId) {
			this.sendMessage(ws, "game:error", {
				roomId,
				message: "Invalid player authentication",
				code: "AUTH_ERROR",
			});
			return;
		}

		// Create PlayerAction object
		const playerAction: PlayerAction = {
			type: action.type as ActionType,
			playerId,
			cardId: action.cardId,
			targetRow: action.targetRow,
		};

		// Process the action
		const result = this.gameSessionManager.processPlayerAction(playerAction);

		if (result.success) {
			// Send action result to the acting player
			this.sendMessage(ws, "game:action_result", {
				roomId: result.roomId!,
				success: true,
				action: {
					playerId,
					type: action.type,
					cardId: action.cardId,
					targetRow: action.targetRow,
				},
			});

			// Broadcast updated game state to all players in the room
			if (
				result.gameStateChanged &&
				result.gameState &&
				result.affectedPlayers
			) {
				result.affectedPlayers.forEach((affectedPlayerId) => {
					const playerWs = this.playerConnections.get(affectedPlayerId);
					if (playerWs) {
						// Send game state update
						this.sendMessage(playerWs, "game:state_update", {
							roomId: result.roomId!,
							gameState: {
								phase: result.gameState!.phase,
								currentTurn: result.gameState!.currentTurn,
								roundNumber: result.gameState!.roundNumber,
								scores: Object.fromEntries(result.gameState!.scores),
								passedPlayers: Array.from(result.gameState!.passedPlayers),
								startingPlayer: result.gameState!.startingPlayer,
								handSizes: Object.fromEntries(result.gameState!.handSizes),
							},
							boards: Object.fromEntries(
								this.gameSessionManager.getBoardStates(result.roomId!) || []
							),
						});

						// Send updated hand to the specific player
						const playerHand =
							this.gameSessionManager.getPlayerHand(affectedPlayerId);
						if (playerHand) {
							this.sendMessage(playerWs, "game:hand_update", {
								roomId: result.roomId!,
								playerId: affectedPlayerId,
								hand: playerHand,
							});
						}
					}
				});
			}

			// Handle round end
			if (result.roundEnded) {
				const gameState = this.gameSessionManager.getGameState(result.roomId!);
				if (gameState && result.affectedPlayers) {
					result.affectedPlayers.forEach((affectedPlayerId) => {
						const playerWs = this.playerConnections.get(affectedPlayerId);
						if (playerWs) {
							this.sendMessage(playerWs, "game:round_ended", {
								roomId: result.roomId!,
								roundNumber: gameState.roundNumber - 1, // Previous round that just ended
								scores: Object.fromEntries(gameState.scores),
							});
						}
					});
				}
			}

			// Handle game end
			if (result.gameEnded) {
				const gameState = this.gameSessionManager.getGameState(result.roomId!);
				if (gameState && result.affectedPlayers) {
					// Determine winner
					const scores = Array.from(gameState.scores.entries());
					const winner = scores.reduce((prev, curr) =>
						curr[1] > prev[1] ? curr : prev
					)[0];

					result.affectedPlayers.forEach((affectedPlayerId) => {
						const playerWs = this.playerConnections.get(affectedPlayerId);
						if (playerWs) {
							this.sendMessage(playerWs, "game:game_ended", {
								roomId: result.roomId!,
								winner,
								finalScores: Object.fromEntries(gameState.scores),
							});
						}
					});

					// Clean up the game session
					this.gameSessionManager.removeSession(result.roomId!);
				}
			}
		} else {
			// Send error to the acting player
			this.sendMessage(ws, "game:action_result", {
				roomId,
				success: false,
				error: result.error,
			});
		}
	}

	/**
	 * Handle game ready messages (placeholder for future use)
	 */
	private handleGameReady(
		ws: WebSocket,
		data: GameMessages["game:ready"]
	): void {
		const { roomId, playerId } = data;

		// For now, this is just a placeholder
		// In the future, this could be used for synchronization or readiness checks
		console.log(`Player ${playerId} is ready in game session ${roomId}`);

		this.sendMessage(ws, "game:action_result", {
			roomId,
			success: true,
		});
	}

	/**
	 * Handle game reconnection from players transitioning from lobby to game page
	 */
	private handleGameReconnect(
		ws: WebSocket,
		data: GameMessages["game:reconnect"]
	): void {
		const { roomId, playerId } = data;

		console.log(
			`🔄 Player ${playerId} attempting to reconnect to game session ${roomId}`
		);

		// Check if the game session exists
		const gameState = this.gameSessionManager.getGameState(roomId);
		if (!gameState) {
			this.sendMessage(ws, "game:error", {
				roomId,
				message: "Game session not found",
				code: "SESSION_NOT_FOUND",
			});
			return;
		}

		// Check if the player is part of this game session
		if (!this.gameSessionManager.isPlayerInGame(playerId)) {
			this.sendMessage(ws, "game:error", {
				roomId,
				message: "Player not part of this game session",
				code: "INVALID_PLAYER",
			});
			return;
		}

		// Re-establish the connection
		this.clients.set(ws, playerId);
		this.playerConnections.set(playerId, ws);

		console.log(`✅ Player ${playerId} reconnected to game session ${roomId}`);

		// Send comprehensive game state for this specific player
		const playerGameState =
			this.gameSessionManager.getGameStateForPlayer(playerId);
		if (playerGameState) {
			this.sendMessage(ws, "game:state_update", {
				roomId,
				...playerGameState, // This includes everything the player needs
			});

			console.log(
				`📊 Sent complete game state to player ${playerId} (Player ${playerGameState.playerNumber})`
			);
		} else {
			console.error(`Failed to get game state for player ${playerId}`);
			this.sendMessage(ws, "game:error", {
				roomId,
				message: "Failed to retrieve game state",
				code: "STATE_ERROR",
			});
		}

		// Send game started confirmation
		const allPlayerNames = Object.fromEntries(
			this.gameSessionManager.getPlayerNames(roomId) || []
		);
		const allPlayerIds = Object.keys(allPlayerNames);
		const opponentId = allPlayerIds.find((id) => id !== playerId);

		this.sendMessage(ws, "game:started", {
			roomId,
			playerName: allPlayerNames[playerId] || "Player",
			enemyName: opponentId
				? allPlayerNames[opponentId] || "Opponent"
				: "Opponent",
			isHost: playerId === gameState.startingPlayer,
			startingPlayer: gameState.startingPlayer,
		});
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

		const { room, playerId } = this.lobbyManager.createRoom(
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
			const result = this.lobbyManager.joinRoom(roomId, playerName);
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
		const result = this.lobbyManager.leaveRoom(playerId);

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

		const room = this.lobbyManager.setPlayerReady(playerId, ready);
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
		if (this.lobbyManager.areAllPlayersReady(roomId)) {
			const gameSessions = this.lobbyManager.startGame(roomId);
			if (gameSessions) {
				// Create game session in the game manager
				const [session1, session2] = gameSessions;
				const success = this.gameSessionManager.createSession(
					roomId,
					session1.playerId,
					session1.playerName,
					session2.playerId,
					session2.playerName
				);

				if (success) {
					// Start the game session
					this.gameSessionManager.startSession(roomId);

					// Send game start message to each player with their specific session data
					gameSessions.forEach((session: any) => {
						const playerWs = this.playerConnections.get(session.playerId);
						if (playerWs) {
							this.sendMessage(playerWs, "lobby:game_starting", {
								gameSession: session,
							});

							// Send initial game state and hand
							const gameState = this.gameSessionManager.getGameState(roomId);
							const playerHand = this.gameSessionManager.getPlayerHand(
								session.playerId
							);

							if (gameState) {
								// Get all player names for this room
								const allPlayerNames = Object.fromEntries(
									this.gameSessionManager.getPlayerNames(roomId) || []
								);

								// Find the other player (opponent)
								const allPlayerIds = Object.keys(allPlayerNames);
								const opponentId = allPlayerIds.find(
									(id) => id !== session.playerId
								);

								// Send player names from this player's perspective
								// For host: player = host name, enemy = guest name
								// For guest: player = guest name, enemy = host name
								console.log(
									`🎮 Sending game:started to ${session.playerId}: player="${
										allPlayerNames[session.playerId]
									}", enemy="${
										opponentId ? allPlayerNames[opponentId] : "Opponent"
									}"`
								);
								this.sendMessage(playerWs, "game:started", {
									roomId,
									playerName: allPlayerNames[session.playerId] || "Player",
									enemyName: opponentId
										? allPlayerNames[opponentId] || "Opponent"
										: "Opponent",
									isHost: session.playerId === gameState.startingPlayer,
									startingPlayer: gameState.startingPlayer,
								});

								this.sendMessage(playerWs, "game:state_update", {
									roomId,
									gameState: {
										phase: gameState.phase,
										currentTurn: gameState.currentTurn,
										roundNumber: gameState.roundNumber,
										scores: Object.fromEntries(gameState.scores),
										passedPlayers: Array.from(gameState.passedPlayers),
										startingPlayer: gameState.startingPlayer,
										handSizes: Object.fromEntries(gameState.handSizes),
									},
									boards: Object.fromEntries(
										this.gameSessionManager.getBoardStates(roomId) || []
									),
								});

								if (playerHand) {
									this.sendMessage(playerWs, "game:hand_update", {
										roomId,
										playerId: session.playerId,
										hand: playerHand,
									});
								}
							}
						}
					});

					console.log(`🎮 Game starting in room "${room.name}"`);
				} else {
					console.error(`Failed to create game session for room ${roomId}`);
				}
			}
		}
	}

	private handleGetRooms(ws: WebSocket): void {
		const rooms = this.lobbyManager.getAllRooms();
		this.sendMessage(ws, "lobby:rooms_list", { rooms });
	}

	private handleDisconnection(ws: WebSocket): void {
		const playerId = this.clients.get(ws);
		if (playerId) {
			console.log(`🔌 Player ${playerId} disconnected`);

			// Check if player is in an active game session
			const isInGame = this.gameSessionManager.isPlayerInGame(playerId);

			if (isInGame) {
				console.log(
					`🎮 Player ${playerId} was in active game - giving 30s grace period for reconnection`
				);

				// Instead of immediately removing, give a grace period for reconnection
				// This handles the case where players are transitioning from lobby.html to game.html
				setTimeout(() => {
					// Check if player reconnected during grace period
					const currentWs = this.playerConnections.get(playerId);
					if (!currentWs || currentWs.readyState !== WebSocket.OPEN) {
						console.log(
							`⏰ Player ${playerId} did not reconnect - removing from game session`
						);
						// Player didn't reconnect, remove from game session
						const gameDisconnectionResult =
							this.gameSessionManager.handlePlayerDisconnection(playerId);
						if (gameDisconnectionResult.sessionRemoved) {
							console.log(
								`🎮 Game session ${gameDisconnectionResult.roomId} ended due to disconnection`
							);
							// Notify remaining players that game session ended due to disconnection
							gameDisconnectionResult.affectedPlayers.forEach(
								(affectedPlayerId) => {
									const affectedWs =
										this.playerConnections.get(affectedPlayerId);
									if (affectedWs && affectedWs.readyState === WebSocket.OPEN) {
										this.sendMessage(affectedWs, "game:error", {
											roomId: gameDisconnectionResult.roomId!,
											message: "Game ended due to player disconnection",
											code: "PLAYER_DISCONNECTED",
										});
									}
								}
							);
						}
					} else {
						console.log(
							`✅ Player ${playerId} successfully reconnected during grace period`
						);
					}
				}, 30000); // 30 second grace period
			} else {
				// Player not in game, handle lobby disconnection normally
				const result = this.lobbyManager.leaveRoom(playerId);
				if (result.room) {
					console.log(`👥 Player removed from lobby room: ${result.room.name}`);
					// Notify remaining players
					this.broadcastToRoom(result.room.id, "lobby:room_updated", {
						room: result.room,
					});
					// Broadcast updated room list
					this.broadcastRoomsList();
				}
			}

			// Clean up current connection mapping
			this.clients.delete(ws);
			// Don't remove playerConnections for game players immediately - they might reconnect
			if (!isInGame) {
				this.playerConnections.delete(playerId);
			}
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
		const room = this.lobbyManager.getRoom(roomId);
		if (!room) return;

		room.players.forEach((player: Player) => {
			const ws = this.playerConnections.get(player.id);
			if (ws && ws.readyState === WebSocket.OPEN) {
				this.sendMessage(ws, type, data);
			}
		});
	}

	private broadcastRoomsList(): void {
		const rooms = this.lobbyManager.getAllRooms();
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

	public getStats(): {
		players: number;
		rooms: number;
		activeSessions: number;
	} {
		return {
			players: this.lobbyManager.getTotalPlayers(),
			rooms: this.lobbyManager.getTotalRooms(),
			activeSessions: this.gameSessionManager.getStats().activeSessions,
		};
	}

	public close(): void {
		this.wss.close();
		console.log("🛑 Game server stopped");
	}
}
