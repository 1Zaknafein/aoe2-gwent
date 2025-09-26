/**
 * Shared types between client and server
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

// Game Messages
export interface GameMessages {
	// Client to Server
	"game:action": {
		roomId: string;
		playerId: string;
		action: {
			type: "place_card" | "pass_turn" | "draw_card";
			cardId?: number;
			targetRow?: "melee" | "ranged" | "siege";
		};
	};
	"game:ready": { roomId: string; playerId: string };
	"game:reconnect": { roomId: string; playerId: string; sessionToken?: string };

	// Server to Client
	"game:state_update": {
		roomId: string;
		gameState: {
			phase:
				| "waiting_for_game_start"
				| "player_turn"
				| "enemy_turn"
				| "round_end"
				| "game_end";
			currentTurn: string;
			roundNumber: number;
			scores: Record<string, number>;
			passedPlayers: string[];
			startingPlayer: string;
			handSizes: Record<string, number>;
		};
		boards?: Record<
			string,
			{ melee: number[]; ranged: number[]; siege: number[] }
		>;
	};
	"game:action_result": {
		roomId: string;
		success: boolean;
		error?: string;
		action?: {
			playerId: string;
			type: string;
			cardId?: number;
			targetRow?: string;
		};
	};
	"game:hand_update": {
		roomId: string;
		playerId: string;
		hand: number[];
	};
	"game:round_ended": {
		roomId: string;
		roundNumber: number;
		scores: Record<string, number>;
		roundWinner?: string;
	};
	"game:game_ended": {
		roomId: string;
		winner: string;
		finalScores: Record<string, number>;
	};
	"game:started": {
		roomId: string;
		playerName: string;
		enemyName: string;
		isHost: boolean;
		startingPlayer: string;
	};
	"game:error": { roomId: string; message: string; code?: string };
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
