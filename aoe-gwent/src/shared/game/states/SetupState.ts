import { GameState, StateName } from "./GameState";
import { GameManager } from "../GameManager";

/**
 * SetupState - Initializes the game before actual gameplay starts
 * - Creates game session
 * - Sets up initial game state
 * 
 * Transitions to: RoundStartState
 */
export class SetupState extends GameState {
	constructor(gameManager: GameManager) {
		super(gameManager);
	}

	public async execute(): Promise<StateName> {
		console.log("[SetupState] Initializing game...");

		// Initialize game session and bot player
		this.gameManager.initializeGame("bot", "Bot Opponent");

		// Get game session
		const gameSession = this.gameManager.getGameSession();
		if (!gameSession) {
			throw new Error("Failed to initialize game session");
		}

		// Don't start the game yet - just initialize it
		// This creates the session but doesn't deal cards
		console.log("[SetupState] Game session initialized (no cards dealt yet)");

		// Transition to round start
		return StateName.ROUND_START;
	}
}
