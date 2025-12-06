import { State, StateName } from "./State";
import { GameContext } from "../GameContext";
import { PlayerID } from "../../types";
import { GamePhase } from "../../../local-server";

/**
 * RoundEndState - Handles end of round
 */
export class RoundEndState extends State {
	constructor(context: GameContext) {
		super(context);
	}

	public async execute(): Promise<StateName> {
		this.gameManager.handleRoundEnd();

		const gameData = this.gameManager.gameData;
		const round = gameData.roundNumber;
		const roundWinnerId = gameData.roundWinner;

		let roundResultMessage: string;

		if (roundWinnerId != null) {
			const winner =
				roundWinnerId === PlayerID.PLAYER ? "You win" : "Opponent wins";
			roundResultMessage = `${winner} Round ${round}!`;
		} else {
			roundResultMessage = `Round ${round} ends in a tie!`;
		}

		await this.messageDisplay.showMessage(roundResultMessage);

		return this.getNextStateName();
	}

	private getNextStateName(): StateName {
		const gameData = this.gameManager.gameData;

		if (gameData.phase === GamePhase.WAITING_FOR_ROUND_START) {
			return StateName.ROUND_START;
		}

		return StateName.RESOLUTION;
	}
}
