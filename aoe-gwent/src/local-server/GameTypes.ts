/**
 * Game state and types for individual game sessions
 * Ported from server/src/game/GameTypes.ts
 */

export enum GamePhase {
	WAITING_FOR_GAME_START = "waiting_for_game_start",
	PLAYER_TURN = "player_turn",
	ENEMY_TURN = "enemy_turn", // Note: In multiplayer this becomes "opponent_turn"
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
	currentTurn: string; // playerId of current player
	roundNumber: number;
	scores: Map<string, number>; // playerId -> score
	passedPlayers: Set<string>; // playerIds who have passed
	startingPlayer: string; // playerId who started the game
	handSizes: Map<string, number>; // playerId -> hand size
	gameStarted: boolean; // flag to prevent duplicate game:start messages
}

export interface PlayerAction {
	type: ActionType;
	playerId: string;
	cardId?: number;
	targetRow?: "melee" | "ranged" | "siege";
}

export interface GameSession {
	readonly roomId: string;
	readonly playerIds: [string, string];
	readonly playerNames: Map<string, string>;
	gameState: GameState;
	playerHands: Map<string, number[]>;
	playerDecks: Map<string, number[]>;
	playerBoards: Map<
		string,
		{ melee: number[]; ranged: number[]; siege: number[] }
	>;
	playerDiscards: Map<string, number[]>;
	isGameStarted: boolean;
	createdAt: Date;
}
