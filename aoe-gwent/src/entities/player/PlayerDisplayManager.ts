import { PixiContainer } from "../../plugins/engine";
import { PlayerDisplay, PlayerDisplayData } from "./PlayerDisplay";
import { CardContainer } from "../card";
import { LocalGameController } from "../../shared/game/LocalGameController";

export interface PlayerDisplayManagerConfig {
	playerName: string;
	enemyName: string;
	playerPosition: { x: number; y: number };
	enemyPosition: { x: number; y: number };
	gameController?: LocalGameController;
}

export class PlayerDisplayManager extends PixiContainer {
	private _playerDisplay: PlayerDisplay;
	private _enemyDisplay: PlayerDisplay;

	constructor(config: PlayerDisplayManagerConfig) {
		super();

		const playerData: PlayerDisplayData = {
			playerName: config.playerName,
			isEnemy: false,
			position: config.playerPosition,
			gameController: config.gameController,
		};
		this._playerDisplay = new PlayerDisplay(playerData);
		this.addChild(this._playerDisplay);

		const enemyData: PlayerDisplayData = {
			playerName: config.enemyName,
			isEnemy: true,
			position: config.enemyPosition,
		};
		this._enemyDisplay = new PlayerDisplay(enemyData);
		this.addChild(this._enemyDisplay);
	}

	/**
	 * Get the player display instance.
	 */
	public get playerDisplay(): PlayerDisplay {
		return this._playerDisplay;
	}

	/**
	 * Get the enemy display instance.
	 */
	public get enemyDisplay(): PlayerDisplay {
		return this._enemyDisplay;
	}

	/**
	 * Set up score tracking for both players.
	 * @param playerContainers Array of CardContainer instances for the player
	 * @param enemyContainers Array of CardContainer instances for the enemy
	 */
	public setupScoreTracking(
		playerContainers: CardContainer[],
		enemyContainers: CardContainer[]
	): void {
		this._playerDisplay.watchContainers(playerContainers);
		this._enemyDisplay.watchContainers(enemyContainers);
	}

	/**
	 * Update player hand counts.
	 */
	public updateHandCounts(
		playerHandCount: number,
		enemyHandCount: number
	): void {
		this._playerDisplay.setHandCount(playerHandCount);
		this._enemyDisplay.setHandCount(enemyHandCount);
	}

	/**
	 * Update player names.
	 */
	public updatePlayerNames(playerName: string, enemyName: string): void {
		this._playerDisplay.setPlayerName(playerName);
		this._enemyDisplay.setPlayerName(enemyName);
	}

	/**
	 * Position all display elements for both player and enemy displays.
	 */
	public positionDisplayElements(): void {
		this._playerDisplay.positionElements();
		this._enemyDisplay.positionElements();
	}

	/**
	 * Get total scores for both players.
	 */
	public getScores(): { player: number; enemy: number } {
		return {
			player: this._playerDisplay.totalScore,
			enemy: this._enemyDisplay.totalScore,
		};
	}

	/**
	 * Cleanup method to remove all event listeners.
	 */
	public destroy(): void {
		this._playerDisplay.destroy();
		this._enemyDisplay.destroy();
		super.destroy();
	}
}
