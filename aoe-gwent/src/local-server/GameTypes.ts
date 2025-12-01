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
	currentTurn: string;
	roundNumber: number;
	scores: Map<string, number>;
	passedPlayers: Set<string>;
	startingPlayer: string;
	handSizes: Map<string, number>;
	gameStarted: boolean;
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
