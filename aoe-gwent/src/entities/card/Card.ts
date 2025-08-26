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
	private _cardBorder!: PixiSprite;
	private _scoreText!: PixiText;
	private _typeIcon!: PixiSprite;
	private _scoreBackground!: PixiGraphics;
	private _iconBackground!: PixiGraphics;
	private _showingBack: boolean = false;

	constructor(cardData: CardData) {
		super();
		this._cardData = cardData;

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
		this.addChild(this._cardFace);

		this._cardBorder = PixiSprite.from("card_border");
		this._cardBorder.anchor.set(0.5);
		this.addChild(this._cardBorder);

		this._scoreBackground = new PixiGraphics();
		this._scoreBackground.moveTo(0, 0);
		this._scoreBackground.arc(0, 0, 50, 0, Math.PI / 2);
		this._scoreBackground.lineTo(0, 0);
		this._scoreBackground.fill({ color: "#6b0f18", alpha: 1.0 });

		this._scoreBackground.x = -this._cardBack.width / 2 + 8;
		this._scoreBackground.y = -this._cardBack.height / 2 + 8;
		this._scoreBackground.visible = true;
		this.addChild(this._scoreBackground);

		this._scoreText = new PixiText({
			text: this._cardData.score.toString(),
			style: {
				fontFamily: "Arial",
				fontSize: 30,
				fontWeight: "bold",
				fill: 0xffffff,
				stroke: { color: 0x000000, width: 6 },
				padding: 2,
			},
		});

		this._scoreText.anchor.set(0.5);
		this._scoreText.x = -this._cardBack.width / 2 + 30;
		this._scoreText.y = -this._cardBack.height / 2 + 30;
		this._scoreText.visible = true;
		this.addChild(this._scoreText);

		this._iconBackground = new PixiGraphics();

		this._iconBackground.moveTo(0, 0);
		this._iconBackground.arc(0, 0, 50, Math.PI, Math.PI * 1.5);
		this._iconBackground.lineTo(0, 0);
		this._iconBackground.fill({ color: "#6b0f18" });

		this._iconBackground.x = this._cardBack.width / 2 - 8;
		this._iconBackground.y = this._cardBack.height / 2 - 8;
		this._iconBackground.visible = true;
		this.addChild(this._iconBackground);

		const iconTexture = `icon_${this._cardData.type}`;
		this._typeIcon = PixiSprite.from(iconTexture);
		this._typeIcon.anchor.set(0.5, 0.5);
		this._typeIcon.scale.set(1.0);
		this._typeIcon.x = this._cardBack.width / 2 - 28;
		this._typeIcon.y = this._cardBack.height / 2 - 30;
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
}

export interface CardData {
	name: string;
	score: number;
	faceTexture: string;
	type: CardType;
}
