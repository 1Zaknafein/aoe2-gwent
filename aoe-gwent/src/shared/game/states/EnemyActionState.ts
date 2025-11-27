import { GameState, StateName } from "./GameState";
import { GameManager } from "../GameManager";

/**
 * EnemyActionState - Processes enemy (bot) actions
 * - Bot evaluates board state
 * - Bot decides to place card or pass
 * 
 * Transitions to:
 * - EnemyActionState (if bot still has priority after action)
 * - PlayerActionState (if turn switches to player)
 * - ResolutionState (if both players have passed)
 */
export class EnemyActionState extends GameState {
	constructor(gameManager: GameManager) {
		super(gameManager);
	}

	public async execute(): Promise<StateName> {
		console.log("[EnemyActionState] Bot is thinking...");

		// TODO: Implement enemy action logic
		// - Disable player input
		// - Trigger bot to take action
		// - Wait for bot action to complete
		// - Determine next state based on action result

		console.log("[EnemyActionState] Bot action processed");

		// TODO: Return proper next state based on actual game logic
		// For now, placeholder logic:
		if (this.gameManager.haveBothPlayersPassed()) {
			return StateName.RESOLUTION;
		} else if (this.gameManager.isPlayerTurn()) {
			return StateName.PLAYER_ACTION;
		} else {
			return StateName.ENEMY_ACTION;
		}
	}
}
