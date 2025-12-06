import { Card, CardContainer } from "../entities/card";
import { Player } from "../entities/player/Player";
import { PlayerID } from "../shared/types";

/**
 * Game state and types for individual game sessions
 */

export enum GamePhase {
	WAITING_FOR_ROUND_START = "waiting_for_game_start",
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

export interface GameData {
	phase: GamePhase;
	currentTurn: PlayerID;
	roundNumber: number;
	roundWinner: PlayerID | null;
}

export interface PlayerAction {
	player: Player;
	type: ActionType;
	card?: Card;
	// TODO: Replace targetRow with specific card container type, which may include more than one CardType.
	// For now there are no multi-row cards.
	targetRow?: CardContainer;
}

export interface GameSession {
	readonly playerIds: [PlayerID, PlayerID];
	gameState: GameData;
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
