import { GameState, StateName } from "./GameState";
import { GameManager } from "../GameManager";

/**
 * ResolutionState - Resolves the round after both players have passed
 */
export class ResolutionState extends GameState {
	constructor(gameManager: GameManager) {
		super(gameManager);
	}

	public async execute(): Promise<StateName> {
		console.log("[ResolutionState] Resolving round...");

		// TODO: Implement resolution logic
		// - Calculate final scores for the round
		// - Determine round winner
		// - Update round scores
		// - Check if game is over (someone won 2 rounds)
		// - If game continues, prepare for next round
		// - Clear boards
		// - Display round results

		console.log("[ResolutionState] Round resolved");

		// TODO: Check if game is over and transition to GameEndState
		// For now, always go back to round start
		return StateName.ROUND_START;
	}
}
