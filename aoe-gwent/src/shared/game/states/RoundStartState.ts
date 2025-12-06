import { Player } from "../../../entities/player/Player";
import { GameContext } from "../GameContext";
import { State, StateName } from "./State";

/**
 * State for starting a new round.
 */
export class RoundStartState extends State {
	private _player: Player;

	constructor(context: GameContext) {
		super(context);
		this._player = context.player;
	}

	public async execute(): Promise<StateName> {
		if (this.gameManager.gameData.roundNumber === 0) {
			this.gameManager.startGame();
		}

		this.gameManager.startRound();

		await this.messageDisplay.showMessage(
			"Round " + this.gameManager.gameData.roundNumber + " starts!"
		);

		this._player.hand.setCardsInteractive(false);

		const startingPlayerId = this.gameManager.gameData.currentTurn;

		if (startingPlayerId === this._player.id) {
			return StateName.PLAYER_ACTION;
		}

		return StateName.ENEMY_ACTION;
	}
}
