import { GameState, StateName } from "./GameState";
import { GameManager } from "../GameManager";

/**
 * PlayerActionState - Waits for and processes player actions
 * - Player can place a card
 * - Player can pass
 * 
 * Transitions to:
 * - PlayerActionState (if player still has priority after action)
 * - EnemyActionState (if turn switches to enemy)
 * - ResolutionState (if both players have passed)
 */
export class PlayerActionState extends GameState {
	constructor(gameManager: GameManager) {
		super(gameManager);
	}

	public async execute(): Promise<StateName> {
		console.log("[PlayerActionState] Waiting for player action...");

		// TODO: Implement player action logic
		// - Enable player input
		// - Wait for player to take action (card placement or pass)
		// - Process the action
		// - Determine next state based on action result

		console.log("[PlayerActionState] Player action processed");

		// TODO: Return proper next state based on actual game logic
		// For now, placeholder logic:
		if (this.gameManager.haveBothPlayersPassed()) {
			return StateName.RESOLUTION;
		} else if (this.gameManager.isBotTurn()) {
			return StateName.ENEMY_ACTION;
		} else {
			return StateName.PLAYER_ACTION;
		}
	}
}
