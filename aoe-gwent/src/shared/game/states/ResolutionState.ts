import { State, StateName } from "./State";
import { GameContext } from "../GameContext";

/**
 * Game resolution state. Shows final scores, winner, and handles end-of-game logic.
 */
export class ResolutionState extends State {
	constructor(context: GameContext) {
		super(context);
	}

	public async execute(): Promise<StateName> {
		await this.delay(0.5);

		await this.gameResolutionDisplay.show();

		this.gameManager.endGame();

		await this.delay(1);

		return StateName.ROUND_START;
	}
}
