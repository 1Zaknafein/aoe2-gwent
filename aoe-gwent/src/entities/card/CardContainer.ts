import { FederatedPointerEvent } from "pixi.js";
import { PixiContainer } from "../../plugins/engine";
import { Card, CardData, CardType } from "../card";
import { gsap } from "gsap";
import { CardAnimator } from "./CardAnimator";

export enum CardContainerLayoutType {
	SPREAD = "spread",
	STACK = "stack",
}

export class CardContainer extends PixiContainer {
	private _cards: Card[] = [];
	private _maxWidth: number;
	private _cardSpacing: number = 5;
	private _isAnimating: boolean = false;
	private _areCardsInteractive: boolean = true;
	private _containerType: CardType | null = null;
	private _layoutType: CardContainerLayoutType = CardContainerLayoutType.SPREAD;
	protected _cardScale: number = 1;
	private static cardAnimator: CardAnimator = new CardAnimator();

	/**
	 * Create a new CardContainer.
	 * @param maxWidth Maximum width of the container
	 * @param label Label for the container.
	 * @param containerType Optional type restriction for this container
	 * @param layoutType Optional layout type for card positioning behavior
	 * @param cardScale Optional scale for cards in this container (default: 1)
	 */
	constructor(
		maxWidth: number,
		containerType?: CardType,
		layoutType?: CardContainerLayoutType,
		cardScale?: number
	) {
		super();
		this._maxWidth = maxWidth;
		this._containerType = containerType || null;
		this._layoutType = layoutType || CardContainerLayoutType.SPREAD;
		this._cardScale = cardScale ?? 1;
	}

	public get cardCount(): number {
		return this._cards.length;
	}

	public get cards() {
		return this._cards;
	}

	public get cardScale(): number {
		return this._cardScale;
	}

	public get areCardsInteractive(): boolean {
		return this._areCardsInteractive;
	}

	public get maxWidth(): number {
		return this._maxWidth;
	}

	public get cardSpacing(): number {
		return this._cardSpacing;
	}

	/**
	 * Get the container type restriction.
	 */
	public get containerType(): CardType | null {
		return this._containerType;
	}

	/**
	 * Check if a card can be placed in this container based on type restrictions.
	 */
	public canAcceptCard(card: Card): boolean {
		// No type restriction means any card can be placed
		if (this._containerType === null) {
			return true;
		}

		const cardType = card.cardData.type;

		// Direct type match
		if (cardType === this._containerType) {
			return true;
		}

		// Special case: RANGED_MELEE cards can be placed in both MELEE and RANGED containers
		if (
			cardType === CardType.RANGED_MELEE &&
			(this._containerType === CardType.MELEE ||
				this._containerType === CardType.RANGED)
		) {
			return true;
		}

		return false;
	}

	public getAllCards(): Card[] {
		return this._cards;
	}

	public addCard(cardData: CardData): void {
		const card = new Card(cardData);
		this._cards.push(card);
		this.addChild(card);

		// Apply container's card scale
		card.scale.set(this._cardScale);

		// Apply current interactivity settings to the new card
		card.eventMode = this._areCardsInteractive ? "static" : "none";
		card.cursor = this._areCardsInteractive ? "pointer" : "default";

		// Emit event for new card added (useful for setting up interactions)
		this.emit("cardAdded", { card, container: this });

		this.updateCardPositions();
	}

	/**
	 * Add a card with animation from a specific global position.
	 * @param cardData Card data to add.
	 * @param fromGlobalPosition Starting position for the animation (global coordinates).
	 * @param animationDuration Duration of the animation in seconds.
	 */
	public async addCardWithAnimation(
		cardData: CardData,
		fromGlobalPosition: { x: number; y: number },
		animationDuration: number = 0.5
	): Promise<void> {
		return CardContainer.cardAnimator.addCardWithAnimation(
			this,
			cardData,
			fromGlobalPosition,
			animationDuration
		);
	}

	/**
	 * Add multiple cards to the container in a batch, updating positions only once.
	 * This has no animations, used on initial setup.
	 * @param cardData Card data to add.
	 */
	public addCardsBatch(cardData: CardData[]): void {
		cardData.forEach((cardData) => {
			const card = new Card(cardData);
			this._cards.push(card);
			this.addChild(card);

			card.scale.set(this._cardScale);
			card.eventMode = this._areCardsInteractive ? "static" : "none";
			card.cursor = this._areCardsInteractive ? "pointer" : "default";

			this.emit("cardAdded", { card, container: this });
		});

		this.updateCardPositions();
	}

	public removeCard(index?: number): void {
		if (this._cards.length === 0) return;

		const cardIndex = index !== undefined ? index : this._cards.length - 1;

		if (cardIndex < 0 || cardIndex >= this._cards.length) return;

		const cardToRemove = this._cards[cardIndex];
		this._cards.splice(cardIndex, 1);
		this.removeChild(cardToRemove);

		this.emit("cardRemoved", { card: cardToRemove, container: this });

		this.updateCardPositions();
	}

	public removeAllCards(): void {
		while (this._cards.length > 0) {
			this.removeCard();
		}
	}

	public setContainerInteractive(interactive: boolean): void {
		this.eventMode = interactive ? "static" : "auto";
		this.cursor = interactive ? "pointer" : "default";

		if (interactive) {
			this.on("pointerdown", this.onContainerClick);
		} else {
			this.off("pointerdown", this.onContainerClick);
		}
	}

	public setCardsInteractive(interactive: boolean): void {
		this._areCardsInteractive = interactive;
		this._cards.forEach((card) => {
			card.eventMode = interactive ? "static" : "none";
			card.cursor = interactive ? "pointer" : "default";
		});
	}

	private onContainerClick = (event: FederatedPointerEvent): void => {
		this.emit("containerClick", {
			container: this,
			position: event.getLocalPosition(this),
		});
	};

	public async transferCardTo(
		card: Card,
		targetContainer: CardContainer
	): Promise<void> {
		return CardContainer.cardAnimator.transferCard(card, this, targetContainer);
	}

	/**
	 * Transfer all cards from this container to a target container with staggered animations
	 */
	public async transferAllCardsTo(
		targetContainer: CardContainer
	): Promise<void> {
		if (this._cards.length === 0) return;

		// Transfer each card with a small delay for staggered effect
		const transferPromises = this._cards.map((card, index) => {
			return new Promise<void>((resolve) => {
				setTimeout(async () => {
					await this.transferCardTo(card, targetContainer);
					resolve();
				}, index * 50);
			});
		});

		await Promise.all(transferPromises);
	}

	/**
	 * Update card positions within the container.
	 * Cards will be spaced evenly, and if they exceed maxWidth, they will overlap.
	 */
	private updateCardPositions(): void {
		if (this._cards.length === 0) return;
		if (this._isAnimating) return;

		if (this._layoutType === CardContainerLayoutType.STACK) {
			this._cards.forEach((card) => {
				card.x = 0;
				card.y = 0;
			});
			return;
		}

		this._isAnimating = true;

		const cardCount = this._cards.length;
		const cardWidth = this._cards[0].width;

		const totalWidthNeeded =
			cardCount * cardWidth + (cardCount - 1) * this._cardSpacing;

		let actualSpacing = this._cardSpacing;
		let overlap = 0;

		// If cards exceed max width, calculate overlap
		if (totalWidthNeeded > this._maxWidth) {
			// Calculate how much space we have for spacing
			const availableSpaceForSpacing = this._maxWidth - cardCount * cardWidth;

			if (availableSpaceForSpacing >= 0) {
				actualSpacing = availableSpaceForSpacing / (cardCount - 1);
			} else {
				actualSpacing = 0;
				overlap = Math.abs(availableSpaceForSpacing) / (cardCount - 1);
			}
		}

		const totalWidth =
			overlap > 0
				? this._maxWidth
				: cardCount * cardWidth + (cardCount - 1) * actualSpacing;

		const startX = -totalWidth / 2 + cardWidth / 2;

		const animationPromises: Promise<void>[] = [];

		this._cards.forEach((card, index) => {
			let targetX: number;

			if (overlap > 0) {
				targetX = startX + index * (cardWidth - overlap);
			} else {
				targetX = startX + index * (cardWidth + actualSpacing);
			}

			// Check if card is already very close to target position (within 1 pixel)
			const isAlreadyInPosition =
				Math.abs(card.x - targetX) < 1 && Math.abs(card.y - 0) < 1;

			const promise = new Promise<void>((resolve) => {
				if (isAlreadyInPosition) {
					// Card is already in correct position, no need to animate
					card.x = targetX;
					card.y = 0;
					resolve();
				} else {
					gsap.to(card, {
						x: targetX,
						y: 0,
						duration: 0.3,
						ease: "power2.out",
						onComplete: () => resolve(),
					});
				}
			});

			animationPromises.push(promise);
		});

		Promise.all(animationPromises).then(() => {
			this._isAnimating = false;
		});
	}
}
