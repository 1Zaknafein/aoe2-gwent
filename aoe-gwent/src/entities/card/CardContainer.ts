import { PixiContainer } from "../../plugins/engine";
import { Card, CardData } from "../card";
import { gsap } from "gsap";

export class CardContainer extends PixiContainer {
	private _cards: Card[] = [];
	private _maxWidth: number;
	private _cardSpacing: number = 20;
	private _isAnimating: boolean = false;
	private _activeTransfers: Set<string> = new Set();

	constructor(maxWidth: number = 500, label: string) {
		super();
		this._maxWidth = maxWidth;
		this.label = label;
	}

	public addCard(cardData: CardData): void {
		const card = new Card(cardData);
		this._cards.push(card);
		this.addChild(card);

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
	}

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

			const promise = new Promise<void>((resolve) => {
				gsap.to(card, {
					x: targetX,
					y: 0,
					duration: 0.3,
					ease: "power2.out",
					onComplete: () => resolve(),
				});
			});

			animationPromises.push(promise);
		});

		Promise.all(animationPromises).then(() => {
			this._isAnimating = false;
		});
	}

	public get cardCount(): number {
		return this._cards.length;
	}

	public get maxWidth(): number {
		return this._maxWidth;
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

	public async transferCardTo(
		cardIndex: number,
		targetContainer: CardContainer
	): Promise<void> {
		if (cardIndex < 0 || cardIndex >= this._cards.length) return;

		const cardToTransfer = this._cards[cardIndex];
		const transferId = `${Date.now()}_${Math.random()}`;

		this._activeTransfers.add(transferId);
		targetContainer._activeTransfers.add(transferId);

		const globalPos = cardToTransfer.toGlobal(cardToTransfer.position);

		this._cards.splice(cardIndex, 1);
		this.removeChild(cardToTransfer);

		const scene = this.parent!;
		scene.addChild(cardToTransfer);

		const localPos = scene.toLocal(globalPos);
		cardToTransfer.x = localPos.x;
		cardToTransfer.y = localPos.y;

		const targetGlobalPos = targetContainer.toGlobal({ x: 0, y: 0 });
		const targetLocalPos = scene.toLocal(targetGlobalPos);

		// Animate the card to the target container
		return new Promise<void>((resolve) => {
			gsap.to(cardToTransfer, {
				x: targetLocalPos.x,
				y: targetLocalPos.y,
				duration: 0.4,
				ease: "power2.inOut",
				onComplete: () => {
					scene.removeChild(cardToTransfer);

					cardToTransfer.x = 0;
					cardToTransfer.y = 0;

					targetContainer._cards.push(cardToTransfer);
					targetContainer.addChild(cardToTransfer);

					this._activeTransfers.delete(transferId);

					targetContainer._activeTransfers.delete(transferId);

					if (this._activeTransfers.size === 0) {
						this.updateCardPositions();
					}

					if (targetContainer._activeTransfers.size === 0) {
						targetContainer.updateCardPositions();
					}

					resolve();
				},
			});
		});
	}
}
