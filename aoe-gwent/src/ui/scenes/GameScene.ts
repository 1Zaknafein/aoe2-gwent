import { PixiContainer } from "../../plugins/engine";
import { Manager, SceneInterface } from "../../entities/manager";
import {
	PlayingRowContainer,
	HandContainer,
	CardContainer,
	CardType,
} from "../../entities/card";
import { Deck } from "../../entities/deck";
import { GameSceneBuildHelper } from "./GameSceneBuildHelper";
import { WeatherRowContainer } from "../../entities/card/WeatherRowContainer";
import { Assets, Container, FillGradient, Graphics, Sprite } from "pixi.js";
import { CardPreview } from "../../entities/card/CardPreview";

/**
 * Game scene containing all board elements.
 * Mimics Gwent-style board with 3 rows per player (Melee, Ranged, Siege)
 */
export class GameScene extends PixiContainer implements SceneInterface {
	public readonly opponentMeleeRow: PlayingRowContainer;
	public readonly opponentRangedRow: PlayingRowContainer;
	public readonly opponentSiegeRow: PlayingRowContainer;

	public readonly playerMeleeRow: PlayingRowContainer;
	public readonly playerRangedRow: PlayingRowContainer;
	public readonly playerSiegeRow: PlayingRowContainer;

	public readonly playerHand: HandContainer;
	public readonly opponentHand: HandContainer;

	public readonly weatherRow: WeatherRowContainer;

	public readonly playerDiscard: CardContainer;
	public readonly opponentDiscard: CardContainer;

	public readonly gameBoard: Container;
	public readonly backgroundImage: Sprite;
	public readonly bgTopGradient: Graphics;
	public readonly bgBottomGradient: Graphics;
	public readonly bgLeftGradient: Graphics;
	public readonly bgRightGradient: Graphics;
	public readonly background: Graphics;

	public readonly cardPreview: CardPreview;

	public readonly boardWidth = 2400;
	public readonly boardHeight = 1350;

	public readonly playerDeck: Deck;
	public readonly opponentDeck: Deck;

	public darkOverlay: Graphics | null = null;

	private readonly rowHeight = 140;
	private readonly leftMargin = 450;
	private readonly rightMargin = 350;

	constructor() {
		super();
		this.interactive = true;
		this.label = "game_scene";

		this.gameBoard = new PixiContainer();
		this.gameBoard.label = "game_board";
		this.addChild(this.gameBoard);

		this.background = new Graphics();
		this.background.rect(0, 0, 1, 1);
		this.background.fill({ color: "#1a1410" });

		this.backgroundImage = Sprite.from(Assets.get("game_background"));
		this.backgroundImage.alpha = 0.1;

		// Gradients to cover the edges of the background image
		this.bgTopGradient = this.createEdgeGradient("vertical", false);
		this.bgBottomGradient = this.createEdgeGradient("vertical", true);
		this.bgLeftGradient = this.createEdgeGradient("horizontal", false);
		this.bgRightGradient = this.createEdgeGradient("horizontal", true);

		const centerX = this.boardWidth / 2;
		const rowWidth = this.boardWidth - this.leftMargin - this.rightMargin;

		const helper = new GameSceneBuildHelper(this.rowHeight, rowWidth);

		// Enemy rows
		this.opponentSiegeRow = helper.createPlayingRowContainer(CardType.SIEGE);
		this.opponentSiegeRow.position.set(centerX, 280);

		this.opponentRangedRow = helper.createPlayingRowContainer(CardType.RANGED);
		this.opponentRangedRow.position.set(centerX, 430);

		this.opponentMeleeRow = helper.createPlayingRowContainer(CardType.MELEE);
		this.opponentMeleeRow.position.set(centerX, 580);

		this.opponentDiscard = helper.createDiscardPile();
		this.opponentDiscard.position.set(2100, 108);

		this.opponentDeck = new Deck();
		this.opponentDeck.setPosition(this.boardWidth - 125, 115);
		this.opponentDeck.scale.set(0.75);

		// Player rows
		this.playerMeleeRow = helper.createPlayingRowContainer(CardType.MELEE);
		this.playerMeleeRow.position.set(centerX, 770);

		this.playerRangedRow = helper.createPlayingRowContainer(CardType.RANGED);
		this.playerRangedRow.position.set(centerX, 920);

		this.playerSiegeRow = helper.createPlayingRowContainer(CardType.SIEGE);
		this.playerSiegeRow.position.set(centerX, 1070);

		this.opponentHand = helper.createHandContainer(false);
		this.opponentHand.position.set(centerX, 110);

		this.playerHand = helper.createHandContainer(true);
		this.playerHand.position.set(centerX, 1240);

		this.playerDiscard = helper.createDiscardPile();
		this.playerDiscard.position.set(2100, 1242);

		this.playerDeck = new Deck();
		this.playerDeck.setPosition(this.boardWidth - 125, this.boardHeight - 105);
		this.playerDeck.scale.set(0.75);

		// Other rows
		const dividerY = (this.opponentMeleeRow.y + this.playerMeleeRow.y) / 2;
		const divider = helper.createDivider(centerX, dividerY, centerX);

		this.weatherRow = new WeatherRowContainer({
			containerType: CardType.WEATHER,
			width: 350,
			height: this.rowHeight,
		});
		this.weatherRow.position.set(200, this.boardHeight / 2);

		this.cardPreview = new CardPreview();
		this.cardPreview.position.set(
			this.boardWidth - 200,
			this.boardHeight / 2 - 150
		);

		this.gameBoard.addChild(
			this.background,
			this.backgroundImage,
			this.bgTopGradient,
			this.bgBottomGradient,
			this.bgLeftGradient,
			this.bgRightGradient,
			divider,
			this.opponentSiegeRow,
			this.opponentRangedRow,
			this.opponentMeleeRow,
			this.playerMeleeRow,
			this.playerRangedRow,
			this.playerSiegeRow,
			this.weatherRow,
			this.playerDiscard,
			this.opponentDiscard,
			this.opponentHand,
			this.playerHand,
			this.playerDeck,
			this.opponentDeck,
			this.cardPreview
		);

		this.resize(Manager.width, Manager.height);
	}

	private createEdgeGradient(
		direction: "vertical" | "horizontal",
		reversed: boolean
	): Graphics {
		const size = 100;
		const gradient =
			direction === "vertical"
				? new FillGradient(0, 0, 1, size)
				: new FillGradient(0, 0, size, 1);

		const solidColor = "#1a1410";
		const transparentColor = "#1a141000";

		if (reversed) {
			gradient.addColorStop(0, transparentColor);
			gradient.addColorStop(1, solidColor);
		} else {
			gradient.addColorStop(0, solidColor);
			gradient.addColorStop(1, transparentColor);
		}

		const graphics = new Graphics();
		const width = direction === "vertical" ? 1 : size;
		const height = direction === "vertical" ? size : 1;
		graphics.rect(0, 0, width, height).fill(gradient);

		return graphics;
	}

	resize(screenWidth: number, screenHeight: number): void {
		const scaleX = screenWidth / this.boardWidth;
		const scaleY = screenHeight / this.boardHeight;
		const scale = Math.min(scaleX, scaleY);

		const offsetX = (screenWidth - this.boardWidth * scale) / 2;
		const offsetY = (screenHeight - this.boardHeight * scale) / 2;

		this.background.width = screenWidth / scale;
		this.background.height = screenHeight / scale;

		this.background.x = -offsetX / scale;
		this.background.y = -offsetY / scale;

		if (this.darkOverlay) {
			this.darkOverlay.width = this.background.width;
			this.darkOverlay.height = this.background.height;
			this.darkOverlay.x = this.background.x;
			this.darkOverlay.y = this.background.y;
		}

		this.backgroundImage.width = this.boardWidth;
		this.backgroundImage.height = this.boardHeight;

		this.bgTopGradient.width = this.boardWidth;
		this.bgTopGradient.height = 100;
		this.bgTopGradient.position.set(0, 0);

		this.bgBottomGradient.width = this.boardWidth;
		this.bgBottomGradient.height = 100;
		this.bgBottomGradient.position.set(0, this.boardHeight - 100);

		this.bgLeftGradient.width = 100;
		this.bgLeftGradient.height = this.boardHeight;
		this.bgLeftGradient.position.set(0, 0);

		this.bgRightGradient.width = 100;
		this.bgRightGradient.height = this.boardHeight;
		this.bgRightGradient.position.set(this.boardWidth - 100, 0);

		this.gameBoard.scale.set(scale);

		this.gameBoard.x = offsetX;
		this.gameBoard.y = offsetY;
	}
}
