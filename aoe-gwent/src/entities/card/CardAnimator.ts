import { gsap } from "gsap";
import { CardContainer } from "./CardContainer";
import { CardData } from "../../local-server/CardDatabase";
import { Card } from "./Card";

/**
 * Handles card animations for transfers and placements
 */
export class CardAnimator {
	private activeTransfers: Map<CardContainer, Set<GSAPTween>> = new Map();

	/**
	 * Get or create the active transfers set for a container
	 */
	private getActiveTransfers(container: CardContainer): Set<GSAPTween> {
		if (!this.activeTransfers.has(container)) {
			this.activeTransfers.set(container, new Set());
		}
		return this.activeTransfers.get(container)!;
	}

	/**
	 * Add a card with animation from a specific global position.
	 * @param container Container to add card to
	 * @param cardData Card data to add
	 * @param fromGlobalPosition Starting position for the animation (global coordinates)
	 * @param animationDuration Duration of the animation in seconds
	 */
	public async addCardWithAnimation(
		container: CardContainer,
		cardData: CardData,
		fromGlobalPosition: { x: number; y: number },
		animationDuration: number = 0.5
	): Promise<void> {
		const card = new Card(cardData);

		// Add card to container first but don't position it yet
		container.cards.push(card);
		container.addChild(card);

		card.eventMode = container.areCardsInteractive ? "static" : "none";
		card.cursor = container.areCardsInteractive ? "pointer" : "default";

		const cardCount = container.cards.length;
		let cardWidth = 100;

		if (container.cards.length > 1) {
			cardWidth = container.cards[0].width;
		} else {
			cardWidth = card.width;
		}

		const totalWidthNeeded =
			cardCount * cardWidth + (cardCount - 1) * container.cardSpacing;

		let actualSpacing = container.cardSpacing;
		let overlap = 0;

		// If cards exceed max width, calculate overlap
		if (totalWidthNeeded > container.maxWidth) {
			const availableSpaceForSpacing =
				container.maxWidth - cardCount * cardWidth;

			if (availableSpaceForSpacing >= 0) {
				actualSpacing = availableSpaceForSpacing / (cardCount - 1);
			} else {
				actualSpacing = 0;
				overlap = Math.abs(availableSpaceForSpacing) / (cardCount - 1);
			}
		}

		const totalWidth =
			overlap > 0
				? container.maxWidth
				: cardCount * cardWidth + (cardCount - 1) * actualSpacing;

		const startX = -totalWidth / 2 + cardWidth / 2;

		const localStartPos = container.toLocal(fromGlobalPosition);

		// Set the card to start at the deck position
		card.position.set(localStartPos.x, localStartPos.y);

		container.emit("cardAdded", { card, container });

		const cardPositions: { card: Card; targetX: number; targetY: number }[] =
			[];

		container.cards.forEach((cardInContainer, index) => {
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

		const animationPromises: Promise<void>[] = [];

		cardPositions.forEach(({ card: cardToAnimate, targetX, targetY }) => {
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

					const transfers = this.getActiveTransfers(container);
					transfers.add(tween);
					tween.then(() => {
						transfers.delete(tween);
					});
				});
				animationPromises.push(promise);
			} else {
				cardToAnimate.position.set(targetX, targetY);
			}
		});

		// Wait for all animations to complete
		return Promise.all(animationPromises).then(() => {});
	}

	/**
	 * Transfer a card from source to target container with animation
	 * @param card Card to transfer
	 * @param sourceContainer Source container
	 * @param targetContainer Target container
	 */
	public async transferCard(
		card: Card,
		sourceContainer: CardContainer,
		targetContainer: CardContainer
	): Promise<void> {
		const cardIndex = sourceContainer.cards.indexOf(card);

		if (cardIndex < 0 || cardIndex >= sourceContainer.cards.length) {
			throw new Error("Card not found in this container");
		}

		const cardToTransfer = sourceContainer.cards[cardIndex];
		const sourceScale = sourceContainer.scale.x;
		const targetScale = targetContainer.scale.x;

		const sourceCardScale = sourceContainer.cardScale;
		const targetCardScale = targetContainer.cardScale;

		const targetCardIndex = targetContainer.cards.length;
		const targetFinalPos = this.calculateCardPosition(
			sourceContainer,
			targetContainer,
			targetCardIndex
		);

		const targetFinalGlobal = targetContainer.toGlobal(targetFinalPos);

		const targetLocalInSource = sourceContainer.toLocal(targetFinalGlobal);

		sourceContainer.cards.splice(cardIndex, 1);

		if (cardToTransfer.showingBack) {
			cardToTransfer.showFront();
		}

		cardToTransfer.eventMode = "none";
		cardToTransfer.cursor = "default";

		sourceContainer.emit("cardRemoved", {
			card: cardToTransfer,
			container: sourceContainer,
		});

		return new Promise<void>((resolve) => {
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
					sourceContainer.removeChild(cardToTransfer);

					const finalCardIndex = targetContainer.cards.length;
					const finalPos = this.calculateCardPosition(
						sourceContainer,
						targetContainer,
						finalCardIndex
					);

					cardToTransfer.x = finalPos.x;
					cardToTransfer.y = finalPos.y;
					cardToTransfer.scale.set(targetCardScale);

					targetContainer.cards.push(cardToTransfer);
					targetContainer.addChild(cardToTransfer);

					cardToTransfer.eventMode = targetContainer.areCardsInteractive
						? "static"
						: "none";
					cardToTransfer.cursor = targetContainer.areCardsInteractive
						? "pointer"
						: "default";

					targetContainer.emit("cardAdded", {
						card: cardToTransfer,
						container: targetContainer,
					});

					const sourceTransfers = this.getActiveTransfers(sourceContainer);
					const targetTransfers = this.getActiveTransfers(targetContainer);

					sourceTransfers.delete(positionTween);
					sourceTransfers.delete(scaleTween);
					targetTransfers.delete(positionTween);
					targetTransfers.delete(scaleTween);

					if (sourceTransfers.size === 0) {
						sourceContainer["updateCardPositions"]();
					}

					if (targetTransfers.size === 0) {
						targetContainer["updateCardPositions"]();
					}
					resolve();
				},
			});

			const sourceTransfers = this.getActiveTransfers(sourceContainer);
			const targetTransfers = this.getActiveTransfers(targetContainer);

			sourceTransfers.add(positionTween);
			sourceTransfers.add(scaleTween);

			targetTransfers.add(positionTween);
			targetTransfers.add(scaleTween);
		});
	}

	/**
	 * Calculate the position for a card in the container based on index,
	 * taking into account maxWidth and spacing/overlap.
	 * @param sourceContainer Source container (for getting card width if target is empty)
	 * @param targetContainer Target container
	 * @param cardIndex Card index to calculate position for
	 * @returns Position {x, y} for the card
	 */
	private calculateCardPosition(
		sourceContainer: CardContainer,
		targetContainer: CardContainer,
		cardIndex: number
	): { x: number; y: number } {
		const totalCards = targetContainer.cards.length + 1; // +1 for the card that will be added

		let cardWidth = 100;

		if (targetContainer.cards.length > 0) {
			cardWidth = targetContainer.cards[0].width;
		} else if (sourceContainer.cards.length > 0) {
			cardWidth = sourceContainer.cards[0].width;
		}

		const cardCount = totalCards;
		const totalWidthNeeded =
			cardCount * cardWidth + (cardCount - 1) * targetContainer.cardSpacing;

		let actualSpacing = targetContainer.cardSpacing;
		let overlap = 0;

		// If cards exceed max width, calculate overlap
		if (totalWidthNeeded > targetContainer.maxWidth) {
			const availableSpaceForSpacing =
				targetContainer.maxWidth - cardCount * cardWidth;

			if (availableSpaceForSpacing >= 0) {
				actualSpacing = availableSpaceForSpacing / (cardCount - 1);
			} else {
				actualSpacing = 0;
				overlap = Math.abs(availableSpaceForSpacing) / (cardCount - 1);
			}
		}

		const totalWidth =
			overlap > 0
				? targetContainer.maxWidth
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
