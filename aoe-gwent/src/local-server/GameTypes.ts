import { PlayerID } from "../shared/types";

/**
 * Game state and types for individual game sessions
 */

export enum GamePhase {
	WAITING_FOR_GAME_START = "waiting_for_game_start",
	PLAYER_TURN = "player_turn",
	ENEMY_TURN = "enemy_turn",
	ROUND_END = "round_end",
	GAME_END = "game_end",
}

export enum ActionType {
	PLACE_CARD = "place_card",
	PASS_TURN = "pass_turn",
	DRAW_CARD = "draw_card",
}

export interface GameState {
	phase: GamePhase;
	currentTurn: PlayerID;
	roundNumber: number;
	scores: Map<PlayerID, number>;
	passedPlayers: Set<PlayerID>;
	startingPlayer: PlayerID;
	handSizes: Map<PlayerID, number>;
	gameStarted: boolean;
}

export interface PlayerAction {
	type: ActionType;
	playerId: PlayerID;
	cardId?: number;
	targetRow?: "melee" | "ranged" | "siege";
}

export interface GameSession {
	readonly roomId: string;
	readonly playerIds: [PlayerID, PlayerID];
	readonly playerNames: Map<PlayerID, string>;
	gameState: GameState;
	playerHands: Map<PlayerID, number[]>;
	playerDecks: Map<PlayerID, number[]>;
	playerBoards: Map<
		PlayerID,
		{ melee: number[]; ranged: number[]; siege: number[] }
	>;
	playerDiscards: Map<PlayerID, number[]>;
	isGameStarted: boolean;
	createdAt: Date;
}
