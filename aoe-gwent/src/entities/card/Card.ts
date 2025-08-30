import { AlphaFilter, Color, FillGradient } from "pixi.js";
import {
	PixiContainer,
	PixiSprite,
	PixiText,
	PixiGraphics,
} from "../../plugins/engine";

export class Card extends PixiContainer {
	private _cardData: CardData;
	private _cardBack!: PixiSprite;
	private _cardFace!: PixiSprite;
	private _scoreText!: PixiText;
	private _typeIcon!: PixiSprite;
	private _scoreBackground!: PixiGraphics;
	private _iconBackground!: PixiGraphics;
	private _showingBack: boolean = false;
	private _aaFilter: AlphaFilter;

	constructor(cardData: CardData) {
		super();
		this._cardData = cardData;

		this._aaFilter = new AlphaFilter({
			antialias: true,
			alpha: 1,
		});

		this.createCard();
		this.interactive = true;
		this.cursor = "pointer";
	}

	private createCard(): void {
		this._cardBack = PixiSprite.from("card_back");
		this._cardBack.anchor.set(0.5);
		this._cardBack.visible = false;
		this.addChild(this._cardBack);

		this._cardFace = PixiSprite.from(this._cardData.faceTexture);
		this._cardFace.anchor.set(0.5);
		this._cardFace.visible = true;
		this._cardFace.scale.set(0.5);
		this.addChild(this._cardFace);

		this._scoreBackground = new PixiGraphics();

		const radius = 25;

		// Create radial gradient from bright yellow-orange center to darker orange edges
		const gradient = new FillGradient(0, 0, 0, radius / 2)
			.addColorStop(0, new Color("#00b6b3")) // Bright gold center
			.addColorStop(1, new Color("#0079c0")); // Orange edges

		this._scoreBackground.circle(0, 0, radius);
		this._scoreBackground.fill(gradient);

		// Add black outline
		this._scoreBackground.circle(0, 0, radius);
		this._scoreBackground.stroke({
			color: 0x000000,
			width: 3,
			alpha: 1,
		});

		this._scoreBackground.x = -this._cardBack.width / 2 + 37;
		this._scoreBackground.y = -this._cardBack.height / 2 + 37;
		this._scoreBackground.visible = true;
		this.addChild(this._scoreBackground);

		this._scoreBackground.filters = [this._aaFilter];

		this._scoreText = new PixiText({
			text: this._cardData.score.toString(),
			style: {
				fontFamily: "Arial",
				fontSize: 34,
				fontWeight: "bold",
				fill: "#ffd500",
				stroke: { color: "#000000", width: 1 },
				dropShadow: {
					distance: 2,
					angle: 1.5,
					blur: 2,
					color: "#000000",
					alpha: 1,
				},
			},
		});

		this._scoreText.anchor.set(0.5);
		this._scoreText.x = this._scoreBackground.x;
		this._scoreText.y = this._scoreBackground.y;
		this._scoreText.visible = true;
		this.addChild(this._scoreText);

		const iconTexture = `icon_${this._cardData.type}`;
		this._typeIcon = PixiSprite.from(iconTexture);
		this._typeIcon.anchor.set(0.5);
		this._typeIcon.scale.set(1.2);
		this._typeIcon.x = (this._cardFace.width - this._typeIcon.width) / 2;
		this._typeIcon.y = (this._cardFace.height - this._typeIcon.height) / 2;
		this._typeIcon.visible = true;
		this.addChild(this._typeIcon);
	}

	public get cardData(): CardData {
		return this._cardData;
	}

	public get showingBack(): boolean {
		return this._showingBack;
	}

	public setScore(newScore: number): void {
		this._cardData.score = newScore;
		this._scoreText.text = newScore.toString();
	}

	/**
	 * Show the card back (hidden state) without animation.
	 * Useful for deck cards that should always be hidden.
	 */
	public showBack(): void {
		this._showingBack = true;
		this._cardBack.visible = true;
		this._cardFace.visible = false;
		this._scoreText.visible = false;
		this._scoreBackground.visible = false;
		this._typeIcon.visible = false;
		this._iconBackground.visible = false;
	}

	/**
	 * Show the card front (revealed state) without animation.
	 * This is the default state for all cards except those in decks.
	 */
	public showFront(): void {
		this._showingBack = false;
		this._cardBack.visible = false;
		this._cardFace.visible = true;
		this._scoreText.visible = true;
		this._scoreBackground.visible = true;
		this._typeIcon.visible = true;
		this._iconBackground.visible = true;
	}
}

export enum CardType {
	MELEE = "melee",
	RANGED = "ranged",
	SIEGE = "siege",
	RANGED_MELEE = "ranged_melee", // Can be placed in either melee or ranged rows
	WEATHER = "weather",
	BOOST = "boost",
	SPECIAL = "special",
}

export interface CardData {
	name: string;
	score: number;
	faceTexture: string;
	type: CardType;
}
