import { Container, Sprite, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import { CardDatabase, CardData } from "../../local-server/CardDatabase.js";

export class Card extends Container {
	private _cardData: CardData;
	private _cardBack!: Sprite;
	private _cardFace!: Sprite;
	private _cardBorder!: Sprite;
	private _showingBack: boolean = false;
	private _scoreText?: Text;

	private static SCORE_TEXT_STYLE: Partial<TextStyle> = {
		fontFamily: "Cinzel, serif",
		fontSize: 40,
		fontWeight: "bold",
		fill: "#290e00",
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

		const faceTexture = CardDatabase.getTexture(this._cardData.id);

		this._cardFace = new Sprite({
			texture: faceTexture,
		});

		this._cardFace.anchor.set(0.5);
		this._cardFace.visible = true;
		this._cardFace.scale.set(0.5);
		this.addChild(this._cardFace);

		this._cardBorder = Sprite.from("card_border");
		this._cardBorder.anchor.set(0.5);
		this._cardBorder.y = -3;
		this.addChild(this._cardBorder);

		this._scoreText = new Text({
			text: this._cardData.score.toString(),
			style: Card.SCORE_TEXT_STYLE,
			anchor: 0.5,
			x: -this._cardFace.width / 2 + 23,
			y: -this._cardFace.height / 2 + 13,
		});

		if (this._cardData.score === 0) {
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

	public hideDetails(): void {
		this._scoreText!.visible = false;
		this._cardBorder.visible = false;
	}

	/**
	 * Update the card's data and refresh the visual elements
	 * Used when revealing enemy cards
	 */
	public updateCardData(newCardData: CardData): void {
		this._cardData = newCardData;

		const faceTexture = CardDatabase.getTexture(newCardData.id);
		this._cardFace.texture = faceTexture;

		if (this._scoreText) {
			this._scoreText.text = newCardData.score.toString();
		}
	}

	public updateShowingScore(): void {
		const showScore = this._cardData.score > 0;

		this._scoreText!.visible = showScore;
	}

	/**
	 * Reveal card with flip animation
	 * Updates the card data and animates from back to front
	 */
	public async revealCard(newCardData: CardData): Promise<void> {
		return new Promise((resolve) => {
			// First update the card data while it's still showing back
			this.updateCardData(newCardData);
			this.updateShowingScore();

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
		this._scoreText!.visible = false;
		this._cardBorder.visible = false;
	}

	/**
	 * Show the card front (revealed state) without animation.
	 * This is the default state for all cards except those in decks.
	 */
	public showFront(): void {
		this._showingBack = false;
		this._cardBack.visible = false;
		this._cardFace.visible = true;
		this._cardBorder.visible = true;

		this.updateShowingScore();
	}
}
