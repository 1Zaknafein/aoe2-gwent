import { State, StateName } from "./State";
import { GameContext } from "../GameContext";
import { ActionType, BotPlayer, GamePhase } from "../../../local-server";
import { GameManager } from "../GameManager";

/**
 * Processes enemy actions during enemy state.
 */
export class EnemyActionState extends State {
	private readonly _enemyPlayer: BotPlayer;
	private readonly _gameManager: GameManager;

	private _isFirstEntry = true;

	constructor(context: GameContext) {
		super(context);

		this._enemyPlayer = context.enemy;
		this._gameManager = context.gameManager;
	}

	public async execute(): Promise<StateName> {
		// Show message only on first entry
		if (this._isFirstEntry) {
			await this.messageDisplay.showMessage("Opponents turn!");
			this._isFirstEntry = false;
		}

		const action = await this._enemyPlayer.decideAction();

		await this._gameManager.handleAction(action);

		if (action.type === ActionType.PASS_TURN) {
			await this.messageDisplay.showMessage("Opponent has passed.");
		}

		const gameData = this._gameManager.gameData;

		if (gameData.phase === GamePhase.ROUND_END) {
			this._isFirstEntry = true;

			return StateName.ROUND_END;
		}

		if (gameData.currentTurn === this._enemyPlayer.id) {
			return StateName.ENEMY_ACTION;
		} else {
			this._isFirstEntry = true;

			return StateName.PLAYER_ACTION;
		}
	}
}
