import { GameState, StateName } from "./GameState";
import { GameManager } from "../GameManager";

/**
 * RoundStartState - Prepares for a new round
 * - Clears passed player flags
 * - Determines who goes first
 * - Sets up round-specific state
 * 
 * Transitions to: PlayerActionState or EnemyActionState (based on who starts)
 */
export class RoundStartState extends GameState {
	constructor(gameManager: GameManager) {
		super(gameManager);
	}

	public async execute(): Promise<StateName> {
		console.log(`[RoundStartState] Starting round ${this.gameManager.getCurrentRound()}...`);

		// TODO: Implement round start logic
		// - Clear passed players
		// - Determine starting player
		// - Display round start message

		console.log("[RoundStartState] Round started - waiting indefinitely (no turn logic yet)");

		// Wait indefinitely - state machine will pause here
		await new Promise(() => {}); // Never resolves

		// This code will never be reached
		return StateName.PLAYER_ACTION;
	}
}
