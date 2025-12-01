import { GameState, StateName } from "./GameState";
import { GameContext } from "../GameContext";

/**
 * SetupState - Initializes the game session
 */
export class SetupState extends GameState {
	constructor(context: GameContext) {
		super(context);
	}
	public async execute(): Promise<StateName> {
		this.gameManager.initializeGame();

		const gameSession = this.gameManager.getGameSession();

		if (!gameSession) {
			throw new Error("Failed to initialize game session");
		}

		// Set game session on interaction manager for turn management
		this.interactionManager.setGameSession(
			gameSession,
			this.gameManager.getPlayerId()
		);

		return StateName.GAME_START;
	}
}
