/**
 * Shared types between client and server
 * (Copied from server/src/types/index.ts)
 */

// Lobby Types
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

// WebSocket Message Types
export interface WSMessage {
	type: string;
	data: any;
	timestamp: Date;
}

// Lobby Messages
export interface LobbyMessages {
	// Client to Server
	"lobby:join": { playerName: string };
	"lobby:create_room": { roomName: string; playerName: string };
	"lobby:join_room": { roomId: string; playerName: string };
	"lobby:leave_room": { roomId: string; playerId: string };
	"lobby:player_ready": { roomId: string; playerId: string; ready: boolean };
	"lobby:get_rooms": {};

	// Server to Client
	"lobby:rooms_list": { rooms: Room[] };
	"lobby:room_created": { room: Room; playerId: string };
	"lobby:room_joined": { room: Room; playerId: string };
	"lobby:room_updated": { room: Room };
	"lobby:player_joined": { room: Room; player: Player };
	"lobby:player_left": { room: Room; playerId: string };
	"lobby:player_ready_changed": {
		room: Room;
		playerId: string;
		ready: boolean;
	};
	"lobby:game_starting": { gameSession: GameSessionData };
	"lobby:error": { message: string; code?: string };
}

// Game Messages (for later implementation)
export interface GameMessages {
	// Client to Server
	"game:action": { roomId: string; playerId: string; action: any };
	"game:ready": { playerId: string };
	"game:reconnect": { roomId: string; playerId: string };

	// Server to Client
	"game:started": {
		roomId: string;
		playerName: string;
		enemyName: string;
		isHost: boolean;
		startingPlayer: string;
	};
	"game:state_update": { gameState: any };
	"game:action_result": { success: boolean; error?: string };
	"game:game_over": { winner: string; reason: string };
}

// Combined message types
export type AllMessages = LobbyMessages & GameMessages;

// WebSocket message wrapper
export interface ServerMessage<T extends keyof AllMessages> {
	type: T;
	data: AllMessages[T];
	timestamp: Date;
}

export interface ClientMessage<T extends keyof AllMessages> {
	type: T;
	data: AllMessages[T];
}
