import { FederatedPointerEvent } from "pixi.js";
import { PixiContainer } from "../../plugins/engine";
import { Card, CardData, CardType } from "../card";
import { gsap } from "gsap";

export enum CardContainerLayoutType {
	SPREAD = "spread",
	STACK = "stack",
}

export class CardContainer extends PixiContainer {
	private _cards: Card[] = [];
	private _maxWidth: number;
	private _cardSpacing: number = 5;
	private _isAnimating: boolean = false;
	private _activeTransfers: Set<GSAPTween> = new Set();
	private _isContainerInteractive: boolean = false;
	private _areCardsInteractive: boolean = true;
	private _containerType: CardType | null = null;
	private _layoutType: CardContainerLayoutType = CardContainerLayoutType.SPREAD;
	protected _cardScale: number = 1;

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

	public get maxWidth(): number {
		return this._maxWidth;
	}

	public get cards() {
		return this._cards;
	}

	public get isContainerInteractive(): boolean {
		return this._isContainerInteractive;
	}

	public get areCardsInteractive(): boolean {
		return this._areCardsInteractive;
	}

	/**
	 * Get the number of active transfer animations.
	 */
	public get activeTransferCount(): number {
		return this._activeTransfers.size;
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

	/**
	 * Check if this container has any active transfer animations.
	 */
	public get hasActiveTransfers(): boolean {
		return this._activeTransfers.size > 0;
	}

	/**
	 * Cancel all active transfer animations for this container.
	 * This can be useful for cleanup or when changing scenes.
	 */
	public cancelAllTransfers(): void {
		this._activeTransfers.forEach((tween) => {
			tween.kill();
		});
		this._activeTransfers.clear();
	}

	/**
	 * Pause all active transfer animations for this container.
	 */
	public pauseAllTransfers(): void {
		this._activeTransfers.forEach((tween) => {
			tween.pause();
		});
	}

	/**
	 * Resume all paused transfer animations for this container.
	 */
	public resumeAllTransfers(): void {
		this._activeTransfers.forEach((tween) => {
			tween.resume();
		});
	}

	public setMaxWidth(width: number): void {
		this._maxWidth = width;
		this.updateCardPositions();
	}

	public getCard(index: number): Card | undefined {
		return this._cards[index];
	}

	public getAllCards(): Card[] {
		return [...this._cards];
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
		const card = new Card(cardData);

		// Add card to this container first but don't position it yet
		this._cards.push(card);
		this.addChild(card);

		// Apply current interactivity settings to the new card
		card.eventMode = this._areCardsInteractive ? "static" : "none";
		card.cursor = this._areCardsInteractive ? "pointer" : "default";

		// Calculate the target position in this container's local coordinates
		// Use the same positioning logic as updateCardPositions()
		const cardCount = this._cards.length;
		let cardWidth = 100; // default
		if (this._cards.length > 1) {
			cardWidth = this._cards[0].width;
		} else {
			cardWidth = card.width;
		}

		const totalWidthNeeded =
			cardCount * cardWidth + (cardCount - 1) * this._cardSpacing;

		let actualSpacing = this._cardSpacing;
		let overlap = 0;

		// If cards exceed max width, calculate overlap (same as updateCardPositions)
		if (totalWidthNeeded > this._maxWidth) {
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

		// Convert the global start position to this container's local coordinates
		const localStartPos = this.toLocal(fromGlobalPosition);

		// Set the card to start at the deck position (in local coordinates)
		card.position.set(localStartPos.x, localStartPos.y);

		// Emit event for new card added
		this.emit("cardAdded", { card, container: this });

		// Calculate positions for ALL cards (new layout with the added card)
		const cardPositions: { card: Card; targetX: number; targetY: number }[] =
			[];

		this._cards.forEach((cardInContainer, index) => {
			let targetX: number;
			if (overlap > 0) {
				targetX = startX + index * (cardWidth - overlap);
			} else {
				targetX = startX + index * (cardWidth + actualSpacing);
			}

			cardPositions.push({
				card: cardInContainer,
				targetX: targetX,
				targetY: 0,
			});
		});

		// Animate ALL cards to their new positions
		const animationPromises: Promise<void>[] = [];

		cardPositions.forEach(({ card: cardToAnimate, targetX, targetY }) => {
			// Check if card needs to move
			const needsAnimation =
				Math.abs(cardToAnimate.x - targetX) > 1 ||
				Math.abs(cardToAnimate.y - targetY) > 1;

			if (needsAnimation) {
				const promise = new Promise<void>((resolve) => {
					const tween = gsap.to(cardToAnimate, {
						x: targetX,
						y: targetY,
						duration: animationDuration,
						ease: "power2.out",
						onComplete: () => {
							resolve();
						},
					});

					this._activeTransfers.add(tween);
					tween.then(() => {
						this._activeTransfers.delete(tween);
					});
				});
				animationPromises.push(promise);
			} else {
				// Card doesn't need animation, just set position
				cardToAnimate.position.set(targetX, targetY);
			}
		});

		// Wait for all animations to complete
		return Promise.all(animationPromises).then(() => {});
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

			// Apply container's card scale
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

	public setPosition(x: number, y: number): void {
		this.x = x;
		this.y = y;
	}

	public setContainerInteractive(interactive: boolean): void {
		this._isContainerInteractive = interactive;
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
		const cardIndex = this._cards.indexOf(card);

		if (cardIndex < 0 || cardIndex >= this._cards.length) {
			throw new Error("Card not found in this container");
		}

		const cardToTransfer = this._cards[cardIndex];

		const sourceScale = this.scale.x;
		const targetScale = targetContainer.scale.x;

		const sourceCardScale = this._cardScale;
		const targetCardScale = targetContainer._cardScale;

		// Calculate where this card will be positioned in the target container
		const targetCardIndex = targetContainer._cards.length; // This will be the new card's index
		const targetFinalPos = this.calculateCardPosition(
			targetContainer,
			targetCardIndex
		);

		const targetFinalGlobal = targetContainer.toGlobal(targetFinalPos);

		// Convert target global position to this container's local coordinates
		const targetLocalInSource = this.toLocal(targetFinalGlobal);

		// Remove card from source container's array but keep it as a child during animation
		this._cards.splice(cardIndex, 1);

		if (cardToTransfer.showingBack) {
			cardToTransfer.showFront();
		}

		// Disable card interactivity during animation to prevent hover effects
		cardToTransfer.eventMode = "none";
		cardToTransfer.cursor = "default";

		this.emit("cardRemoved", { card: cardToTransfer, container: this });

		return new Promise<void>((resolve) => {
			// Calculate target visual scale:
			// Target card scale * target container scale / source container scale
			const targetVisualScale =
				(targetCardScale * targetScale) / (sourceCardScale * sourceScale);

			const tweenDuration = 0.4;

			const positionTween = gsap.to(cardToTransfer, {
				x: targetLocalInSource.x,
				y: targetLocalInSource.y,
				duration: tweenDuration,
				ease: "power2.inOut",
			});

			const scaleTween = gsap.to(cardToTransfer.scale, {
				x: targetVisualScale * sourceCardScale,
				y: targetVisualScale * sourceCardScale,
				duration: tweenDuration,
				ease: "power2.inOut",
				onComplete: () => {
					// Only now remove from source and add to target
					this.removeChild(cardToTransfer);

					// Calculate the final position where this card should be
					const finalCardIndex = targetContainer._cards.length;
					const finalPos = this.calculateCardPosition(
						targetContainer,
						finalCardIndex
					);

					// Position the card at final position and set target container's card scale
					cardToTransfer.x = finalPos.x;
					cardToTransfer.y = finalPos.y;
					cardToTransfer.scale.set(targetCardScale);

					targetContainer._cards.push(cardToTransfer);
					targetContainer.addChild(cardToTransfer);

					// Re-enable card interactivity based on target container settings
					cardToTransfer.eventMode = targetContainer._areCardsInteractive
						? "static"
						: "none";
					cardToTransfer.cursor = targetContainer._areCardsInteractive
						? "pointer"
						: "default";

					// Emit event for card added to target container
					targetContainer.emit("cardAdded", {
						card: cardToTransfer,
						container: targetContainer,
					});

					// Remove the animations from active transfers
					this._activeTransfers.delete(positionTween);
					this._activeTransfers.delete(scaleTween);
					targetContainer._activeTransfers.delete(positionTween);
					targetContainer._activeTransfers.delete(scaleTween);

					if (this._activeTransfers.size === 0) {
						this.updateCardPositions();
					}

					if (targetContainer._activeTransfers.size === 0) {
						targetContainer.updateCardPositions();
					}

					resolve();
				},
			});

			this._activeTransfers.add(positionTween);
			this._activeTransfers.add(scaleTween);

			targetContainer._activeTransfers.add(positionTween);
			targetContainer._activeTransfers.add(scaleTween);
		});
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

	/**
	 * Calculate the position for a card in the container based on index,
	 * taking into account maxWidth and spacing/overlap.
	 * @param container Target container
	 * @param cardIndex Card index to calculate position for
	 * @returns Position {x, y} for the card
	 */
	private calculateCardPosition(
		container: CardContainer,
		cardIndex: number
	): { x: number; y: number } {
		const totalCards = container._cards.length + 1; // +1 for the card that will be added

		// Get card width from existing cards, or use a default if container is empty
		let cardWidth = 100; // default
		if (container._cards.length > 0) {
			cardWidth = container._cards[0].width;
		} else if (this._cards.length > 0) {
			// Use width from source container if target is empty
			cardWidth = this._cards[0].width;
		}

		const cardCount = totalCards;
		const totalWidthNeeded =
			cardCount * cardWidth + (cardCount - 1) * container._cardSpacing;

		let actualSpacing = container._cardSpacing;
		let overlap = 0;

		// If cards exceed max width, calculate overlap
		if (totalWidthNeeded > container._maxWidth) {
			const availableSpaceForSpacing =
				container._maxWidth - cardCount * cardWidth;

			if (availableSpaceForSpacing >= 0) {
				actualSpacing = availableSpaceForSpacing / (cardCount - 1);
			} else {
				actualSpacing = 0;
				overlap = Math.abs(availableSpaceForSpacing) / (cardCount - 1);
			}
		}

		const totalWidth =
			overlap > 0
				? container._maxWidth
				: cardCount * cardWidth + (cardCount - 1) * actualSpacing;

		const startX = -totalWidth / 2 + cardWidth / 2;

		let targetX: number;
		if (overlap > 0) {
			targetX = startX + cardIndex * (cardWidth - overlap);
		} else {
			targetX = startX + cardIndex * (cardWidth + actualSpacing);
		}

		return { x: targetX, y: 0 };
	}
}
