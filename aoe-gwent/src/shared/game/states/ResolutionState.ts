import { State, StateName } from "./State";
import { GameContext } from "../GameContext";
import { PlayerID } from "../../types";

/**
 * Game resolution state. Shows final scores, winner, and handles end-of-game logic.
 */
export class ResolutionState extends State {
	constructor(context: GameContext) {
		super(context);
	}

	public async execute(): Promise<StateName> {
		await this.delay(0.5);

		const winner = this.gameManager.gameData.gameWinner;

		if (winner === null) {
			this.messageDisplay.showMessage("The game ends in a tie!");
		} else if (winner === PlayerID.PLAYER) {
			await this.messageDisplay.showMessage("You won!");
		} else {
			await this.messageDisplay.showMessage("You lost!");
		}

		this.gameManager.endGame();

		await this.delay(2);

		return StateName.ROUND_START;
	}
}
