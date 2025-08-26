import { PixiContainer, PixiSprite } from "../../plugins/engine";

export class Deck extends PixiContainer {
	private _cardSprites: PixiSprite[] = [];
	private _maxVisibleCards: number = 5;

	/**
	 * Create a new Deck visual component.
	 */
	constructor() {
		super();
		this.createDeckCards();
	}

	/**
	 * Create the card back sprites for the deck.
	 * Stacks 5 card backs with slight offsets for a depth effect.
	 */
	private createDeckCards(): void {
		for (let i = 0; i < this._maxVisibleCards; i++) {
			const cardSprite = PixiSprite.from("card_back");
			cardSprite.anchor.set(0.5);
			cardSprite.x = i * -6;
			cardSprite.y = i * -2;

			this._cardSprites.push(cardSprite);
			this.addChild(cardSprite);
		}
	}

	/**
	 * Get the number of visible cards in the deck.
	 */
	public get cardCount(): number {
		return this._cardSprites.length;
	}

	/**
	 * Set the position of the deck.
	 */
	public setPosition(x: number, y: number): void {
		this.x = x;
		this.y = y;
	}

	/**
	 * Get the global position of the top card for animation purposes.
	 */
	public getTopCardGlobalPosition(): { x: number; y: number } {
		const topCard = this._cardSprites[this._cardSprites.length - 1];
		const globalPos = this.toGlobal({ x: topCard.x, y: topCard.y });
		return { x: globalPos.x, y: globalPos.y };
	}
}
