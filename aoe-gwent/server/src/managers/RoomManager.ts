import { v4 as uuidv4 } from "uuid";
import { Room, Player, GameSessionData } from "../types/index.js";

/**
 * Manages game rooms and players
 */
export class RoomManager {
	private rooms: Map<string, Room> = new Map();
	private playerRooms: Map<string, string> = new Map(); // playerId -> roomId

	/**
	 * Create a new room
	 */
	public createRoom(
		roomName: string,
		hostPlayerName: string
	): { room: Room; playerId: string } {
		const roomId = uuidv4();
		const playerId = uuidv4();

		const hostPlayer: Player = {
			id: playerId,
			name: hostPlayerName,
			isReady: false,
			isHost: true,
		};

		const room: Room = {
			id: roomId,
			name: roomName,
			players: [hostPlayer],
			maxPlayers: 2,
			isGameStarted: false,
			createdAt: new Date(),
		};

		this.rooms.set(roomId, room);
		this.playerRooms.set(playerId, roomId);

		console.log(`Room created: ${roomName} (${roomId}) by ${hostPlayerName}`);
		return { room, playerId };
	}

	/**
	 * Join an existing room
	 */
	public joinRoom(
		roomId: string,
		playerName: string
	): { room: Room; playerId: string } | null {
		const room = this.rooms.get(roomId);
		if (!room) {
			return null;
		}

		if (room.players.length >= room.maxPlayers) {
			throw new Error("Room is full");
		}

		if (room.isGameStarted) {
			throw new Error("Game has already started");
		}

		const playerId = uuidv4();
		const player: Player = {
			id: playerId,
			name: playerName,
			isReady: false,
			isHost: false,
		};

		room.players.push(player);
		this.playerRooms.set(playerId, roomId);

		console.log(`Player ${playerName} joined room ${room.name}`);
		return { room, playerId };
	}

	/**
	 * Remove player from room
	 */
	public leaveRoom(playerId: string): { room: Room | null; wasHost: boolean } {
		const roomId = this.playerRooms.get(playerId);
		if (!roomId) {
			return { room: null, wasHost: false };
		}

		const room = this.rooms.get(roomId);
		if (!room) {
			return { room: null, wasHost: false };
		}

		const playerIndex = room.players.findIndex((p) => p.id === playerId);
		if (playerIndex === -1) {
			return { room: null, wasHost: false };
		}

		const player = room.players[playerIndex];
		const wasHost = player.isHost;

		// Remove player
		room.players.splice(playerIndex, 1);
		this.playerRooms.delete(playerId);

		console.log(`Player ${player.name} left room ${room.name}`);

		// If room is empty, delete it
		if (room.players.length === 0) {
			this.rooms.delete(roomId);
			console.log(`Room ${room.name} deleted (empty)`);
			return { room: null, wasHost };
		}

		// If host left, make first remaining player the host
		if (wasHost && room.players.length > 0) {
			room.players[0].isHost = true;
			console.log(`${room.players[0].name} is now host of ${room.name}`);
		}

		return { room, wasHost };
	}

	/**
	 * Set player ready status
	 */
	public setPlayerReady(playerId: string, ready: boolean): Room | null {
		const roomId = this.playerRooms.get(playerId);
		if (!roomId) {
			return null;
		}

		const room = this.rooms.get(roomId);
		if (!room) {
			return null;
		}

		const player = room.players.find((p) => p.id === playerId);
		if (!player) {
			return null;
		}

		player.isReady = ready;
		console.log(
			`Player ${player.name} is ${ready ? "ready" : "not ready"} in room ${
				room.name
			}`
		);

		return room;
	}

	/**
	 * Check if all players in room are ready
	 */
	public areAllPlayersReady(roomId: string): boolean {
		const room = this.rooms.get(roomId);
		if (!room || room.players.length < 2) {
			return false;
		}

		return room.players.every((player) => player.isReady);
	}

	/**
	 * Start game in room
	 */
	public startGame(roomId: string): GameSessionData[] | null {
		const room = this.rooms.get(roomId);
		if (!room || room.players.length !== 2) {
			return null;
		}

		if (!this.areAllPlayersReady(roomId)) {
			return null;
		}

		room.isGameStarted = true;

		// Create game session data for both players
		const [player1, player2] = room.players;

		const gameSession1: GameSessionData = {
			roomId: roomId,
			playerId: player1.id,
			playerName: player1.name,
			opponentId: player2.id,
			opponentName: player2.name,
			isHost: player1.isHost,
			serverUrl: process.env.SERVER_URL || "ws://localhost:3001",
		};

		const gameSession2: GameSessionData = {
			roomId: roomId,
			playerId: player2.id,
			playerName: player2.name,
			opponentId: player1.id,
			opponentName: player1.name,
			isHost: player2.isHost,
			serverUrl: process.env.SERVER_URL || "ws://localhost:3001",
		};

		console.log(`Game started in room ${room.name}`);
		return [gameSession1, gameSession2];
	}

	/**
	 * Get all available rooms
	 */
	public getAllRooms(): Room[] {
		return Array.from(this.rooms.values()).filter(
			(room) => !room.isGameStarted
		);
	}

	/**
	 * Get room by ID
	 */
	public getRoom(roomId: string): Room | null {
		return this.rooms.get(roomId) || null;
	}

	/**
	 * Get room by player ID
	 */
	public getRoomByPlayerId(playerId: string): Room | null {
		const roomId = this.playerRooms.get(playerId);
		return roomId ? this.rooms.get(roomId) || null : null;
	}

	/**
	 * Get player count
	 */
	public getTotalPlayers(): number {
		return this.playerRooms.size;
	}

	/**
	 * Get room count
	 */
	public getTotalRooms(): number {
		return this.rooms.size;
	}
}
