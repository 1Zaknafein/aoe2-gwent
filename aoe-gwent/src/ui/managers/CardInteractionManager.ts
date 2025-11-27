import { Card, CardContainer, CardContainerManager } from "../../entities/card";
import { gsap } from "gsap";
import { LocalGameController } from "../../shared/game/LocalGameController";

export class CardInteractionManager {
	private _cardContainers: CardContainerManager;
	private _selectedCard: Card | null = null;
	private _cardClickInProgress: boolean = false;
	private _lastClickTime: number = 0;
	private _lastClickedCard: Card | null = null;
	private _gameController?:  LocalGameController;

	constructor(
		cardContainers: CardContainerManager,
		gameController?:  LocalGameController
	) {
		this._cardContainers = cardContainers;
		this._gameController = gameController;
	}

	public setupContainerInteractivity(): void {
		const { player, enemy } = this._cardContainers;

		const playableRows = [
			player.melee,
			player.ranged,
			player.siege,
			enemy.melee,
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
			player.discard,
			enemy.hand,
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

	/**
	 * Update card interactivity based on current action state
	 */
	public updateCardInteractivity(): void {
		const canAct = this._gameController
			? this._gameController.canPlayerAct()
			: true;

		// Update player hand cards
		const playerHand = this._cardContainers.player.hand;
		playerHand.setCardsInteractive(canAct);

		// If actions are blocked, remove hover effects from selected card
		if (!canAct && this._selectedCard) {
			this.deselectCard();
		}
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

		// Block card selection if player cannot act
		if (this._gameController && !this._gameController.canPlayerAct) {
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

	private async placeSelectedCard(
		targetContainer: CardContainer
	): Promise<void> {
		if (!this._selectedCard) return;

		// Block card placement if player cannot act
		if (this._gameController && !this._gameController.canPlayerAct) {
			return;
		}

		// Check if trying to place on enemy rows (Player 1 can only place on their own rows)
		const enemyRows = [
			this._cardContainers.enemy.melee,
			this._cardContainers.enemy.ranged,
			this._cardContainers.enemy.siege,
		];

		// Prevent placing cards on enemy rows.
		if (enemyRows.includes(targetContainer)) {
			return;
		}

		// Check if the target container can accept this card type
		if (!targetContainer.canAcceptCard(this._selectedCard)) {
			return;
		}

		const playerHand = this._cardContainers.player.hand;
		const cardIndex = playerHand.getAllCards().indexOf(this._selectedCard);

		if (cardIndex === -1) return;

		// Determine target row name
		let targetRowName: "melee" | "ranged" | "siege" | null = null;

		if (targetContainer === this._cardContainers.player.melee) {
			targetRowName = "melee";
		} else if (targetContainer === this._cardContainers.player.ranged) {
			targetRowName = "ranged";
		} else if (targetContainer === this._cardContainers.player.siege) {
			targetRowName = "siege";
		}

		if (targetRowName === null) {
			throw console.error("Invalid target container for card placement");
		}

		// Store card reference temporarily during transfer to prevent it from being cleared
		const cardToTransfer = this._selectedCard;
		const cardId = cardToTransfer.cardData.id;

		// Clear selected card immediately to prevent interference during animation
		this._selectedCard = null;

		await playerHand.transferCardTo(cardIndex, targetContainer);

		if (!this._gameController) {
			throw new Error("GameController not available");
		}

		this._gameController
			.placeCard(cardId, targetRowName)
			.catch((error: any) => {
				console.error("Failed to send player action:", error);
			});
	}

	public get selectedCard(): Card | null {
		return this._selectedCard;
	}

	public get isCardClickInProgress(): boolean {
		return this._cardClickInProgress;
	}
}
