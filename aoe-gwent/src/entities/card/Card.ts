import { Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import { CardFaceTextures } from "../../shared/database/CardFaceTextures.js";
import gsap from "gsap";
import { createRedButton } from "../../ui/components/CommonComponents.js";

export class Card extends Container {
	private _cardData: CardData;
	private _cardBack!: Sprite;
	private _cardFace!: Sprite;
	private _typeIcon!: Sprite;
	private _scoreBackground?: Graphics;
	private _showingBack: boolean = false;
	private _scoreText?: Text;

	private static SCORE_TEXT_STYLE: Partial<TextStyle> = {
		fontFamily: "Arial",
		fontSize: 32,
		fontWeight: "bold",
		fill: "#ffe1c8ff",
	};

	constructor(cardData: CardData) {
		super();
		this._cardData = cardData;

		if (cardData.baseScore === undefined) {
			this._cardData.baseScore = cardData.score;
		}

		this.createCard();
		this.interactive = true;
		this.cursor = "pointer";
	}

	public get cardData(): CardData {
		return this._cardData;
	}

	private createCard(): void {
		this._cardBack = Sprite.from("card_back");
		this._cardBack.anchor.set(0.5);
		this._cardBack.visible = false;
		this.addChild(this._cardBack);

		const faceTexture = CardFaceTextures.getTexture(this._cardData.id);
		this._cardFace = Sprite.from(faceTexture);
		this._cardFace.anchor.set(0.5);
		this._cardFace.visible = true;
		this._cardFace.scale.set(0.5);
		this.addChild(this._cardFace);

		const iconTexture = `icon_${this._cardData.type}`;
		this._typeIcon = Sprite.from(iconTexture);
		this._typeIcon.anchor.set(0.5);
		this._typeIcon.scale.set(1.2);
		this._typeIcon.x = (this._cardFace.width - this._typeIcon.width) / 2;
		this._typeIcon.y = (this._cardFace.height - this._typeIcon.height) / 2;
		this.addChild(this._typeIcon);

		this._scoreBackground = createRedButton(40, 40);
		this._scoreBackground.x = -this._cardBack.width / 2 + 10;
		this._scoreBackground.y = -this._cardBack.height / 2 + 10;

		this.addChild(this._scoreBackground);

		this._scoreText = new Text({
			text: this._cardData.score.toString(),
			style: Card.SCORE_TEXT_STYLE,
		});

		this._scoreText.anchor.set(0.5);
		this._scoreText.x = this._scoreBackground.x + 20;
		this._scoreText.y = this._scoreBackground.y + 20;

		if (this._cardData.score === 0) {
			this._typeIcon.visible = false;
			this._scoreBackground.visible = false;
			this._scoreText.visible = false;
		}

		this.addChild(this._scoreText);
	}

	public get showingBack(): boolean {
		return this._showingBack;
	}

	public setScore(newScore: number): void {
		this._cardData.score = newScore;

		if (this._scoreText) {
			this._scoreText.text = newScore.toString();
		}
	}

	/**
	 * Update the card's data and refresh the visual elements
	 * Used when revealing enemy cards
	 */
	public updateCardData(newCardData: CardData): void {
		this._cardData = newCardData;

		const faceTexture = CardFaceTextures.getTexture(newCardData.id);
		this._cardFace.texture = Sprite.from(faceTexture).texture;

		if (this._scoreText) {
			this._scoreText.text = newCardData.score.toString();
		}

		const iconTexture = `icon_${newCardData.type}`;
		this._typeIcon.texture = Sprite.from(iconTexture).texture;

		this.updateShowingScore();
	}

	public updateShowingScore(): void {
		console.log("score:", this._cardData.score);

		const showScore = this._cardData.score > 0;

		this._scoreText!.visible = showScore;
		this._scoreBackground!.visible = showScore;
		this._typeIcon.visible = showScore;
	}

	/**
	 * Reveal card with flip animation
	 * Updates the card data and animates from back to front
	 */
	public async revealCard(newCardData: CardData): Promise<void> {
		return new Promise((resolve) => {
			// First update the card data while it's still showing back
			this.updateCardData(newCardData);

			gsap.to(this.scale, {
				x: 0,
				duration: 0.15,
				ease: "power2.in",
				onComplete: () => {
					this.showFront();

					gsap.to(this.scale, {
						x: 1,
						duration: 0.15,
						ease: "power2.out",
						onComplete: () => {
							resolve();
						},
					});
				},
			});
		});
	}

	/**
	 * Show the card back (hidden state) without animation.
	 * Useful for deck cards that should always be hidden.
	 */
	public showBack(): void {
		this._showingBack = true;
		this._cardBack.visible = true;
		this._cardFace.visible = false;
		this._typeIcon.visible = false;
		this._scoreText!.visible = false;
		this._scoreBackground!.visible = false;
	}

	/**
	 * Show the card front (revealed state) without animation.
	 * This is the default state for all cards except those in decks.
	 */
	public showFront(): void {
		this._showingBack = false;
		this._cardBack.visible = false;
		this._cardFace.visible = true;
		this._typeIcon.visible = true;

		this.updateShowingScore();
	}
}

export enum CardType {
	MELEE = "melee",
	RANGED = "ranged",
	SIEGE = "siege",
	RANGED_MELEE = "ranged_melee", // Can be placed in either melee or ranged rows
	WEATHER = "weather",

	SPECIAL = "special",
}

export interface CardData {
	id: number;
	name: string;
	score: number;
	type: CardType;
	effect?: CardEffect;
	baseScore?: number;
}

export const enum CardEffect {
	FREEZE = "freeze",
	FOG = "fog",
	RAIN = "rain",
	CLEAR = "clear",
	BOOST = "boost",
}
