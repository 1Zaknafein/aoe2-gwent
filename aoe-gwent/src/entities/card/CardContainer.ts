import { FederatedPointerEvent, Graphics } from "pixi.js";
import { PixiContainer } from "../../plugins/engine";
import { Card, CardData } from "../card";
import { gsap } from "gsap";

export class CardContainer extends PixiContainer {
	private _cards: Card[] = [];
	private _maxWidth: number;
	private _cardSpacing: number = 5;
	private _isAnimating: boolean = false;
	private _activeTransfers: Set<GSAPTween> = new Set();
	private _debugRect: Graphics | null = null;
	private _isContainerInteractive: boolean = false;
	private _areCardsInteractive: boolean = true;

	/**
	 * Create a new CardContainer.
	 * @param maxWidth Maximum width of the container
	 * @param label Label for the container.
	 */
	constructor(maxWidth: number, label: string) {
		super();
		this._maxWidth = maxWidth;
		this.label = label;

		this.createDebugRect();
	}

	public get cardCount(): number {
		return this._cards.length;
	}

	public get maxWidth(): number {
		return this._maxWidth;
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

		// Apply current interactivity settings to the new card
		card.eventMode = this._areCardsInteractive ? "static" : "none";
		card.cursor = this._areCardsInteractive ? "pointer" : "default";

		// Emit event for new card added (useful for setting up interactions)
		this.emit("cardAdded", { card, container: this });

		this.updateCardPositions();
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
		this.updateDebugRect();
	}

	private createDebugRect(): void {
		this._debugRect = new Graphics();
		this._debugRect.alpha = 0.2;
		this.addChild(this._debugRect);
		this.updateDebugRect();
	}

	private updateDebugRect(): void {
		if (!this._debugRect) return;

		this._debugRect.clear();
		this._debugRect.rect(-this._maxWidth / 2, -110, this._maxWidth, 230);

		// Use different colors based on interactivity
		const color = this._isContainerInteractive ? 0x00ff00 : 0x666666;
		this._debugRect.fill({ color });
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

		this.updateDebugRect();
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
		cardIndex: number,
		targetContainer: CardContainer
	): Promise<void> {
		if (cardIndex < 0 || cardIndex >= this._cards.length) return;

		const cardToTransfer = this._cards[cardIndex];

		const sourceScale = this.scale.x;
		const targetScale = targetContainer.scale.x;

		const baseCardScale = 0.5;
		const visualSourceScale = baseCardScale * sourceScale;
		const sceneScale = visualSourceScale;

		const cardLocalPos = { x: cardToTransfer.x, y: cardToTransfer.y };
		const cardGlobalPos = this.toGlobal(cardLocalPos);

		// Calculate where this card will be positioned in the target container
		const targetCardIndex = targetContainer._cards.length; // This will be the new card's index
		const targetFinalPos = this.calculateCardPosition(
			targetContainer,
			targetCardIndex
		);

		const targetFinalGlobal = targetContainer.toGlobal(targetFinalPos);

		this._cards.splice(cardIndex, 1);
		this.removeChild(cardToTransfer);

		const scene = this.parent!;
		scene.addChild(cardToTransfer);

		const startPosInScene = scene.toLocal(cardGlobalPos);
		const endPosInScene = scene.toLocal(targetFinalGlobal);

		cardToTransfer.x = startPosInScene.x;
		cardToTransfer.y = startPosInScene.y;

		cardToTransfer.scale.set(sceneScale);

		return new Promise<void>((resolve) => {
			const positionTween = gsap.to(cardToTransfer, {
				x: endPosInScene.x,
				y: endPosInScene.y,
				duration: 0.4,
				ease: "power2.inOut",
			});

			const targetVisualScale = baseCardScale * targetScale;

			const scaleTween = gsap.to(cardToTransfer.scale, {
				x: targetVisualScale,
				y: targetVisualScale,
				duration: 0.4,
				ease: "power2.inOut",
				onComplete: () => {
					scene.removeChild(cardToTransfer);

					// Calculate the final position where this card should be
					const finalCardIndex = targetContainer._cards.length;
					const finalPos = this.calculateCardPosition(
						targetContainer,
						finalCardIndex
					);

					// Position the card at final position and restore base scale
					cardToTransfer.x = finalPos.x;
					cardToTransfer.y = finalPos.y;
					cardToTransfer.scale.set(baseCardScale);

					targetContainer._cards.push(cardToTransfer);
					targetContainer.addChild(cardToTransfer);

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
	 * Update card positions within the container.
	 * Cards will be spaced evenly, and if they exceed maxWidth, they will overlap.
	 */
	private updateCardPositions(): void {
		if (this._cards.length === 0) return;
		if (this._isAnimating) return;

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
					// Animate to target position
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
