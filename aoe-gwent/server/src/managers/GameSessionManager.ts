import { GameSessionInstance } from "../game/GameSessionInstance.js";
import { PlayerAction, GameState } from "../game/GameTypes.js";
import { CardDatabase, ServerCardData } from "../database/CardDatabase.js";

/**
 * Manages multiple active game sessions
 * Routes game actions to the appropriate session
 */
export class GameSessionManager {
	private activeSessions: Map<string, GameSessionInstance> = new Map(); // roomId -> GameSession
	private playerToRoom: Map<string, string> = new Map(); // playerId -> roomId

	/**
	 * Create a new game session for a room
	 */
	public createSession(
		roomId: string,
		player1Id: string,
		player1Name: string,
		player2Id: string,
		player2Name: string
	): boolean {
		if (this.activeSessions.has(roomId)) {
			console.warn(`Game session already exists for room ${roomId}`);
			return false;
		}

		const session = new GameSessionInstance(
			roomId,
			player1Id,
			player1Name,
			player2Id,
			player2Name
		);

		this.activeSessions.set(roomId, session);
		this.playerToRoom.set(player1Id, roomId);
		this.playerToRoom.set(player2Id, roomId);

		console.log(
			`Created game session for room ${roomId}: ${player1Name} vs ${player2Name}`
		);
		return true;
	}

	/**
	 * Start a game session
	 */
	public startSession(roomId: string): boolean {
		const session = this.activeSessions.get(roomId);
		if (!session) {
			console.error(`No game session found for room ${roomId}`);
			return false;
		}

		try {
			session.startGame();
			console.log(`Started game session for room ${roomId}`);
			return true;
		} catch (error) {
			console.error(`Failed to start game session for room ${roomId}:`, error);
			return false;
		}
	}

	/**
	 * Process a player action
	 */
	public processPlayerAction(action: PlayerAction): {
		success: boolean;
		error?: string;
		roomId?: string;
		gameState?: GameState;
		affectedPlayers?: string[];
		gameStateChanged: boolean;
		roundEnded?: boolean;
		gameEnded?: boolean;
	} {
		const roomId = this.playerToRoom.get(action.playerId);
		if (!roomId) {
			return {
				success: false,
				error: "Player not in any active game",
				gameStateChanged: false,
			};
		}

		const session = this.activeSessions.get(roomId);
		if (!session) {
			return {
				success: false,
				error: "Game session not found",
				gameStateChanged: false,
			};
		}

		const result = session.processAction(action);

		if (result.success) {
			return {
				...result,
				roomId,
				gameState: session.getGameState(),
				affectedPlayers: session.getPlayerIds(),
			};
		}

		return {
			...result,
			roomId,
		};
	}

	/**
	 * Get game state for a room
	 */
	public getGameState(roomId: string): GameState | null {
		const session = this.activeSessions.get(roomId);
		return session ? session.getGameState() : null;
	}

	/**
	 * Get player hand for a specific player with complete card data
	 */
	public getPlayerHand(playerId: string): ServerCardData[] | null {
		const roomId = this.playerToRoom.get(playerId);
		if (!roomId) return null;

		const session = this.activeSessions.get(roomId);
		if (!session) return null;

		const handIds = session.getPlayerHand(playerId);
		if (!handIds) return null;

		return CardDatabase.generateCardsFromIds(handIds);
	}

	/**
	 * Get board states for a room
	 */
	public getBoardStates(
		roomId: string
	): Map<
		string,
		{ melee: number[]; ranged: number[]; siege: number[] }
	> | null {
		const session = this.activeSessions.get(roomId);
		return session ? session.getBoardStates() : null;
	}

	/**
	 * Get player names for a room
	 */
	public getPlayerNames(roomId: string): Map<string, string> | null {
		const session = this.activeSessions.get(roomId);
		return session ? session.getPlayerNames() : null;
	}

	/**
	 * Check if a player is in an active game
	 */
	public isPlayerInGame(playerId: string): boolean {
		return this.playerToRoom.has(playerId);
	}

	/**
	 * Get room ID for a player
	 */
	public getPlayerRoom(playerId: string): string | null {
		return this.playerToRoom.get(playerId) || null;
	}

	/**
	 * Remove a game session (when game ends or players disconnect)
	 */
	public removeSession(roomId: string): boolean {
		const session = this.activeSessions.get(roomId);
		if (!session) {
			return false;
		}

		// Remove player mappings
		const playerIds = session.getPlayerIds();
		for (const playerId of playerIds) {
			this.playerToRoom.delete(playerId);
		}

		// Remove session
		this.activeSessions.delete(roomId);

		console.log(`Removed game session for room ${roomId}`);
		return true;
	}

	/**
	 * Handle player disconnection
	 */
	public handlePlayerDisconnection(playerId: string): {
		roomId: string | null;
		sessionRemoved: boolean;
		affectedPlayers: string[];
	} {
		const roomId = this.playerToRoom.get(playerId);
		if (!roomId) {
			return { roomId: null, sessionRemoved: false, affectedPlayers: [] };
		}

		const session = this.activeSessions.get(roomId);
		if (!session) {
			return { roomId, sessionRemoved: false, affectedPlayers: [] };
		}

		const allPlayers = session.getPlayerIds();
		const remainingPlayers = allPlayers.filter((id: string) => id !== playerId);

		// For now, end the game if any player disconnects
		// In the future, you might want to pause the game or allow reconnection
		this.removeSession(roomId);

		console.log(`Player ${playerId} disconnected from game session ${roomId}`);

		return {
			roomId,
			sessionRemoved: true,
			affectedPlayers: remainingPlayers,
		};
	}

	/**
	 * Get statistics about active sessions
	 */
	public getStats(): {
		activeSessions: number;
		totalPlayers: number;
	} {
		return {
			activeSessions: this.activeSessions.size,
			totalPlayers: this.playerToRoom.size,
		};
	}

	/**
	 * Get all active room IDs
	 */
	public getActiveRoomIds(): string[] {
		return Array.from(this.activeSessions.keys());
	}

	/**
	 * Get complete game state for a specific player
	 */
	public getGameStateForPlayer(playerId: string): any | null {
		const roomId = this.playerToRoom.get(playerId);
		if (!roomId) return null;

		const session = this.activeSessions.get(roomId);
		return session ? session.getGameStateForPlayer(playerId) : null;
	}
}
