import {
	Text,
	TextStyle,
	Graphics,
} from "pixi.js";
import { PixiContainer } from "../../plugins/engine";
import { CardContainer } from "../card";
import { PassButton } from "../../ui/components";
import { LocalGameController } from "../../shared/game/LocalGameController";

export class PlayerDisplay extends PixiContainer {
	public playerNameText!: Text;
	public totalScoreText!: Text;
	public handCountText!: Text;
	public scoreLabel!: Text;
	public handLabel!: Text;
	public roundWin1!: Graphics;
	public roundWin2!: Graphics;
	public displayBackground!: Graphics;
	public passButton?: PassButton;

	private _isEnemy: boolean;
	private _currentHandCount = 0;
	private _currentTotalScore = 0;
	private _watchedContainers: CardContainer[] = [];
	private _gameController?: LocalGameController;

	constructor(data: PlayerDisplayData) {
		super();

		this._isEnemy = data.isEnemy || false;
		this._gameController = data.gameController;

		this.position.set(data.position.x, data.position.y);

		this.createDisplayBackground();
		this.createTextStyles();
		this.createTextElements(data.playerName);
		this.createRoundWinIndicators();

		if (!this._isEnemy && this._gameController) {
			this.createPassButton();
		}

		this.positionElements();
	}

	public get handCount(): number {
		return this._currentHandCount;
	}

	public get totalScore(): number {
		return this._currentTotalScore;
	}

	public get isEnemy(): boolean {
		return this._isEnemy;
	}

	public setPlayerName(name: string): void {
		this.playerNameText.text = name;
	}

	public setHandCount(count: number): void {
		this._currentHandCount = count;
		this.handCountText.text = count.toString();
	}

	public setTotalScore(score: number): void {
		this._currentTotalScore = score;
		this.totalScoreText.text = score.toString();
	}

	public setRoundWins(roundsWon: number): void {
		// Update visual state of gems based on rounds won (0, 1, or 2)
		this.roundWin1.clear();
		this.roundWin2.clear();

		const gem1Won = roundsWon >= 1;
		const gem2Won = roundsWon >= 2;

		this.drawRoundGem(this.roundWin1, gem1Won);
		this.drawRoundGem(this.roundWin2, gem2Won);
	}

	public positionElements(): void {
		const padding = 20;
		const bgWidth = 400;
		const bgHeight = 180;

		this.playerNameText.position.set(bgWidth / 2, padding + 15);

		this.roundWin1.position.set(45, 70);
		this.roundWin2.position.set(105, 70);

		this.scoreLabel.position.set(bgWidth / 2, 65);
		this.totalScoreText.position.set(bgWidth / 2, 105);

		this.handLabel.position.set(bgWidth - 60, 65);
		this.handCountText.position.set(bgWidth - 60, 100);

		if (this.passButton) {
			this.passButton.position.set(bgWidth / 2, bgHeight - 35);
		}
	}

	public watchContainers(containers: CardContainer[]): void {
		this.unwatchContainers();

		this._watchedContainers = containers;

		containers.forEach((container) => {
			const updateScore = () => this.updateTotalScore();
			container.on("cardAdded", updateScore);
			container.on("cardRemoved", updateScore);
		});

		this.updateTotalScore();
	}

	/**
	 * Remove listeners from watched containers.
	 */
	public unwatchContainers(): void {
		this._watchedContainers.forEach((container) => {
			container.off("cardAdded", this.updateTotalScore);
			container.off("cardRemoved", this.updateTotalScore);
		});
		this._watchedContainers = [];
	}

	/**
	 * Cleanup method to remove all event listeners.
	 */
	public destroy(): void {
		this.unwatchContainers();
		super.destroy();
	}

	// Private Methods
	private createTextStyles(): void {
		const nameStyle = new TextStyle({
			fontFamily: "Arial",
			fontSize: 26,
			fontWeight: "bold",
			fill: 0xf4e4c1,
			stroke: { color: 0x000000, width: 3 },
		});

		const scoreStyle = new TextStyle({
			fontFamily: "Arial",
			fontSize: 60,
			fontWeight: "bold",
			fill: "#ffd700",
			stroke: { color: "#000000", width: 3 },
			dropShadow: {
				distance: 2,
				angle: 1.5,
				blur: 2,
				color: "#000000",
				alpha: 0.8,
			},
		});

		const handCountStyle = new TextStyle({
			fontFamily: "Arial",
			fontSize: 40,
			fontWeight: "bold",
			fill: "#d4af37",
			stroke: { color: "#000000", width: 3 },
		});

		const labelStyle = new TextStyle({
			fontFamily: "Arial",
			fontSize: 16,
			fontWeight: "bold",
			fill: 0xb8a27a,
			stroke: { color: 0x000000, width: 2 },
		});

		this.playerNameText = new Text({
			text: "",
			style: nameStyle,
			anchor: 0.5,
		});

		this.totalScoreText = new Text({
			text: "0",
			style: scoreStyle,
			anchor: 0.5,
		});

		this.handCountText = new Text({
			text: "0",
			style: handCountStyle,
			anchor: 0.5,
		});

		this.scoreLabel = new Text({
			text: "SCORE",
			style: labelStyle,
			anchor: 0.5,
		});

		this.handLabel = new Text({
			text: "CARDS",
			style: labelStyle,
			anchor: 0.5,
		});
	}

	private createTextElements(playerName: string): void {
		this.playerNameText.text = playerName;

		this.addChild(this.playerNameText);
		this.addChild(this.scoreLabel);
		this.addChild(this.totalScoreText);
		this.addChild(this.handLabel);
		this.addChild(this.handCountText);
	}

	private createDisplayBackground(): void {
		const width = 400;
		const height = 180;
		
		this.displayBackground = new Graphics();

		this.displayBackground.rect(0, 0, width, height);
		this.displayBackground.fill({ color: 0x3d2817, alpha: 0.9 });

		this.displayBackground.stroke({ color: 0x8b6914, width: 4, alpha: 0.8 });
		this.displayBackground.rect(4, 4, width - 8, height - 8);
		this.displayBackground.stroke({ color: 0xd4af37, width: 2, alpha: 0.6 });

		const innerBorder = 12;
		this.displayBackground.rect(innerBorder, innerBorder, width - innerBorder * 2, height - innerBorder * 2);
		this.displayBackground.stroke({ color: 0x5a3d1f, width: 1, alpha: 0.5 });

		this.addChild(this.displayBackground);
	}

	private createRoundWinIndicators(): void {
		this.roundWin1 = new Graphics();
		this.roundWin2 = new Graphics();

		this.addChild(this.roundWin1);
		this.addChild(this.roundWin2);

		// Set initial state - 1 round won for testing
		this.setRoundWins(1);
	}

	private drawRoundGem(gem: Graphics, isWon: boolean): void {
		const size = 18;

		gem.circle(0, 0, size);
		if (isWon) {
			gem.fill({ color: 0xffd700, alpha: 1 });
			gem.stroke({ color: 0xd4af37, width: 3, alpha: 1 });
		} else {
			gem.fill({ color: 0x2a2013, alpha: 0.5 });
			gem.stroke({ color: 0x5a3d1f, width: 2, alpha: 0.6 });
		}
	}

	private createPassButton(): void {
		this.passButton = new PassButton(() => this.onPassButtonClick());
		this.addChild(this.passButton);
	}

	private async onPassButtonClick(): Promise<void> {
		if (this._gameController) {
			if (!this._gameController.canPlayerAct()) {
				console.log("Cannot pass - not your turn or already passed");
				return;
			}
			try {
				await this._gameController.passTurn();
			} catch (error) {
				console.error("Failed to pass turn:", error);
			}
		}
	}

	private updateTotalScore(): void {
		const totalScore = this._watchedContainers.reduce((sum, container) => {
			const cards = container.getAllCards();
			const containerScore = cards.reduce(
				(cardSum, card) => cardSum + card.cardData.score,
				0
			);
			return sum + containerScore;
		}, 0);

		this.setTotalScore(totalScore);
	}
}

export interface PlayerDisplayData {
	playerName: string;
	isEnemy?: boolean;
	position: { x: number; y: number };
	gameController?: LocalGameController; // Optional - only needed for player (not enemy)
}
