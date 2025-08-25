import { Card, CardContainerManager } from "../../entities/card";
import { gsap } from "gsap";

export class CardInteractionManager {
	private _cardContainers: CardContainerManager;
	private _selectedCard: Card | null = null;
	private _cardClickInProgress: boolean = false;
	private _lastClickTime: number = 0;
	private _lastClickedCard: Card | null = null;

	constructor(cardContainers: CardContainerManager) {
		this._cardContainers = cardContainers;
	}

	public setupContainerInteractivity(): void {
		const { player, enemy } = this._cardContainers;

		const playableRows = [
			player.infantry,
			player.ranged,
			player.siege,
			enemy.infantry,
			enemy.ranged,
			enemy.siege,
		];

		playableRows.forEach((container) => {
			container.setContainerInteractive(true);
			container.setCardsInteractive(true);

			container.on("containerClick", () => {
				if (this._selectedCard) {
					this.placeSelectedCard(container);
				}
			});
		});

		player.hand.setContainerInteractive(false);
		player.hand.setCardsInteractive(true);

		this.setupPlayerHandInteractions();

		// Keep other containers non-interactive for container clicks
		const nonPlayableContainers = [
			player.deck,
			player.discard,
			enemy.hand,
			enemy.deck,
			enemy.discard,
			this._cardContainers.weather,
		];

		nonPlayableContainers.forEach((container) => {
			container.setContainerInteractive(false);
			container.setCardsInteractive(true);
		});
	}

	public setupPlayerHandInteractions(): void {
		const playerHand = this._cardContainers.player.hand;

		// Set up interactions for existing cards
		playerHand.getAllCards().forEach((card) => {
			this.setupCardInteractions(card);
		});

		playerHand.on("cardAdded", (data) => {
			if (data.container === playerHand) {
				this.setupCardInteractions(data.card);
			}
		});
	}

	public setupCardInteractions(card: Card): void {
		card.on("pointerenter", () => this.onCardHover(card, true));
		card.on("pointerleave", () => this.onCardHover(card, false));
		card.on("pointerup", (event) => this.onCardClick(card, event));
	}

	private onCardHover(card: Card, isHovering: boolean): void {
		// Only apply hover effects to cards in player hand
		if (card.parent !== this._cardContainers.player.hand) return;

		// Don't apply hover effects to selected cards
		if (this._selectedCard === card) return;

		const targetY = isHovering ? -12 : 0;
		const duration = 0.2;

		gsap.to(card, {
			y: targetY,
			duration,
			ease: "power2.out",
		});
	}

	private onCardClick(card: Card, event: any): void {
		const currentTime = Date.now();

		// Prevent duplicate clicks within 100ms
		if (
			this._lastClickedCard === card &&
			currentTime - this._lastClickTime < 100
		) {
			return;
		}

		this._lastClickTime = currentTime;
		this._lastClickedCard = card;
		this._cardClickInProgress = true;

		event.stopPropagation(); // Prevent global click handler

		// Only allow selection of cards in player hand
		if (card.parent !== this._cardContainers.player.hand) {
			this._cardClickInProgress = false;
			return;
		}

		if (this._selectedCard === card) {
			this.deselectCard();
		} else {
			this.selectCard(card);
		}

		setTimeout(() => {
			this._cardClickInProgress = false;
		}, 150);
	}

	private selectCard(card: Card): void {
		if (this._selectedCard) {
			this.deselectCard();
		}

		this._selectedCard = card;

		gsap.to(card, {
			y: -30,
			duration: 0.1,
			ease: "power2.out",
		});
	}

	private deselectCard(): void {
		if (!this._selectedCard) return;

		// Return card to normal position
		gsap.to(this._selectedCard, {
			y: 0,
			duration: 0.3,
			ease: "power2.out",
		});

		this._selectedCard = null;
	}

	public handleGlobalClick(): void {
		if (this._cardClickInProgress) {
			return;
		}

		// Add a small delay to ensure card clicks are processed first
		setTimeout(() => {
			if (!this._cardClickInProgress) {
				this.deselectCard();
			}
		}, 50);
	}

	private placeSelectedCard(targetContainer: any): void {
		if (!this._selectedCard) return;

		const playerHand = this._cardContainers.player.hand;
		const cardIndex = playerHand.getAllCards().indexOf(this._selectedCard);

		if (cardIndex === -1) return;

		playerHand.transferCardTo(cardIndex, targetContainer);

		this._selectedCard = null;
	}

	public get selectedCard(): Card | null {
		return this._selectedCard;
	}

	public get isCardClickInProgress(): boolean {
		return this._cardClickInProgress;
	}
}
