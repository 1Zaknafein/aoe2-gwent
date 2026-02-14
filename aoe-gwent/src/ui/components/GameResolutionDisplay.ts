import { gsap } from "gsap";
import {
	Container,
	Graphics,
	NineSliceSprite,
	Sprite,
	Text,
	TextStyle,
	Texture,
} from "pixi.js";
import { GameManager } from "../../shared/game/GameManager";
import { PlayerID } from "../../shared/types";
import { FontStyles } from "../../shared/FontStyles";

export class GameResolutionDisplay extends Container {
	private _gameManager: GameManager;
	private _tableContainer!: Container;
	private _playerName: string;
	private _enemyName: string;

	private _playerHeader!: Text;
	private _opponentHeader!: Text;
	private _roundLabels: Text[] = [];
	private _playerScores: Text[] = [];
	private _enemyScores: Text[] = [];
	private _separatorLine!: Graphics;
	private _totalLabel!: Text;
	private _playerTotal!: Text;
	private _enemyTotal!: Text;
	private _winnerMessage!: Text;

	constructor(gameManager: GameManager, playerName: string, enemyName: string) {
		super();

		this._gameManager = gameManager;
		this._playerName = playerName;
		this._enemyName = enemyName;

		const background = Sprite.from("resolution_dialog_fill");
		background.tint = "#dbdbdb";
		background.anchor.set(0.5);
		background.width = 500;
		background.height = 400;
		background.y = 100;
		this.addChild(background);

		const border = new NineSliceSprite({
			texture: Texture.from("golden_border"),
			leftWidth: 15,
			topHeight: 15,
			rightWidth: 15,
			bottomHeight: 15,
			width: background.width + 10,
			height: background.height + 10,
		});

		border.y = background.y;
		border.pivot.set(border.width / 2, border.height / 2);
		this.addChild(border);

		const header = Sprite.from("resolution_dialog_header");
		header.anchor.set(0.5);
		header.y = -150;
		this.addChild(header);

		this._tableContainer = new Container();
		this.addChild(this._tableContainer);

		const victoryText = new Text({
			text: "VICTORY!",
			style: new TextStyle({
				...FontStyles.scoreTextStyle,
				fontSize: 70,
				fill: "#d1c072",
			}),
			anchor: 0.5,
			y: -130,
		});

		this.addChild(victoryText);

		this.createAllTextObjects();

		this.interactive = false;
		this.eventMode = "none";

		this.alpha = 1;
		this.visible = true;
	}

	/**
	 * Show the display
	 */
	public show(): GSAPTimeline {
		this.updateTableContent();

		const timeline = gsap.timeline();

		timeline
			.add(() => {
				this.alpha = 0;
				this.visible = true;
			})
			.to(this, {
				alpha: 1,
				duration: 0.4,
				ease: "power2.out",
			})
			.to(
				this,
				{
					alpha: 0,
					duration: 0.4,
					ease: "power2.in",
				},
				"+=3"
			);

		return timeline;
	}

	private createAllTextObjects(): void {
		const bgWidth = 1400;
		const tableY = 100;
		const columnWidth = 280;
		const labelWidth = 180;
		const rowHeight = 60;
		const headerFontSize = 36;
		const rowFontSize = 30;
		const totalFontSize = 36;
		const messageFontSize = 48;

		const totalTableWidth = labelWidth + columnWidth * 2;
		const startX = (bgWidth - totalTableWidth) / 2;
		const labelX = startX;

		const columnsWidth = columnWidth * 2;
		const columnsStartX = (bgWidth - columnsWidth) / 2;
		const playerHeaderX = columnsStartX + columnWidth / 2;
		const opponentHeaderX = columnsStartX + columnWidth + columnWidth / 2;

		this._playerHeader = this.createText(
			this._playerName,
			playerHeaderX,
			tableY,
			headerFontSize,
			"#FFD700"
		);
		this._playerHeader.anchor.set(0.5, 0);

		this._opponentHeader = this.createText(
			this._enemyName,
			opponentHeaderX,
			tableY,
			headerFontSize,
			"#FFD700"
		);
		this._opponentHeader.anchor.set(0.5, 0);

		for (let i = 0; i < 3; i++) {
			const yPos = tableY + rowHeight * (i + 1);

			const labelText = this.createText(
				`Round ${i + 1}:`,
				labelX,
				yPos,
				rowFontSize,
				"#AAAAAA"
			);
			labelText.anchor.set(0, 0);
			labelText.visible = false;
			this._roundLabels.push(labelText);

			const playerText = this.createText(
				"0",
				playerHeaderX,
				yPos,
				rowFontSize,
				"#FFFFFF"
			);
			playerText.anchor.set(0.5, 0);
			playerText.visible = false;
			this._playerScores.push(playerText);

			const enemyText = this.createText(
				"0",
				opponentHeaderX,
				yPos,
				rowFontSize,
				"#FFFFFF"
			);
			enemyText.anchor.set(0.5, 0);
			enemyText.visible = false;
			this._enemyScores.push(enemyText);
		}

		const separatorY = tableY + rowHeight * 4 + 10;
		this._separatorLine = new Graphics();
		this._separatorLine.moveTo(labelX, separatorY);
		this._separatorLine.lineTo(startX + totalTableWidth, separatorY);
		this._separatorLine.stroke({ width: 2, color: "#FFD700" });
		this._tableContainer.addChild(this._separatorLine);

		const totalY = separatorY + 40;
		this._totalLabel = this.createText(
			"Total:",
			labelX,
			totalY,
			totalFontSize,
			"#FFD700"
		);
		this._totalLabel.anchor.set(0, 0);

		this._playerTotal = this.createText(
			"0",
			playerHeaderX,
			totalY,
			totalFontSize,
			"#FFD700"
		);
		this._playerTotal.anchor.set(0.5, 0);

		this._enemyTotal = this.createText(
			"0",
			opponentHeaderX,
			totalY,
			totalFontSize,
			"#FFD700"
		);
		this._enemyTotal.anchor.set(0.5, 0);

		const messageY = totalY + 80;
		this._winnerMessage = this.createText(
			"",
			bgWidth / 2,
			messageY,
			messageFontSize,
			"#FFD700"
		);
		this._winnerMessage.anchor.set(0.5, 0);
	}

	private updateTableContent(): void {
		const roundScores = this._gameManager.roundScores;
		const gameWinner = this._gameManager.gameData.gameWinner;

		const bgWidth = 1400;
		const tableY = 100;
		const columnWidth = 280;
		const labelWidth = 180;
		const rowHeight = 60;

		const totalTableWidth = labelWidth + columnWidth * 2;
		const startX = (bgWidth - totalTableWidth) / 2;
		const labelX = startX;

		let playerTotal = 0;
		let enemyTotal = 0;

		roundScores.forEach((scores, index) => {
			if (index < 3) {
				this._roundLabels[index].visible = true;
				this._playerScores[index].text = scores.playerScore.toString();
				this._playerScores[index].visible = true;
				this._enemyScores[index].text = scores.enemyScore.toString();
				this._enemyScores[index].visible = true;

				playerTotal += scores.playerScore;
				enemyTotal += scores.enemyScore;
			}
		});

		for (let i = roundScores.length; i < 3; i++) {
			this._roundLabels[i].visible = false;
			this._playerScores[i].visible = false;
			this._enemyScores[i].visible = false;
		}

		const separatorY = tableY + rowHeight * (roundScores.length + 1) + 10;
		this._separatorLine.clear();
		this._separatorLine.moveTo(labelX, separatorY);
		this._separatorLine.lineTo(startX + totalTableWidth, separatorY);
		this._separatorLine.stroke({ width: 2, color: "#FFD700" });

		const totalY = separatorY + 40;
		this._totalLabel.y = totalY;
		this._playerTotal.text = playerTotal.toString();
		this._playerTotal.y = totalY;
		this._enemyTotal.text = enemyTotal.toString();
		this._enemyTotal.y = totalY;

		const messageY = totalY + 80;
		this._winnerMessage.y = messageY;

		if (gameWinner === null) {
			this._winnerMessage.text = "It's a Draw!";
		} else {
			this._winnerMessage.text =
				gameWinner === PlayerID.PLAYER ? "You Win!" : "You Lose!";
		}
	}

	private createText(
		text: string,
		x: number,
		y: number,
		fontSize: number,
		color: string
	): Text {
		const textObj = new Text({
			text: text,
			style: {
				fontFamily: "Arial",
				fontSize: fontSize,
				fill: color,
				fontWeight: "bold",
			},
		});

		textObj.x = x;
		textObj.y = y;

		this._tableContainer.addChild(textObj);

		return textObj;
	}
}
