import { Card } from "../../entities/card/Card";
import { PlayingRowContainer, HandContainer } from "../../entities/card";
import { CardType } from "../../shared/types/CardTypes";
import { LocalGameController } from "../../shared/game/LocalGameController";
import { gsap } from "gsap";

/**
 * Manages all user interactions for the TestBoardScene
 * Handles card selection, hover effects, and placement logic
 */
export class GameBoardInteractionManager {
	private selectedCard: Card | null = null;
	private cardClickInProgress: boolean = false;
	private gameController:  LocalGameController | null = null;

	// References to containers
	private playerHand: HandContainer;
	private playerMeleeRow: PlayingRowContainer;
	private playerRangedRow: PlayingRowContainer; 
	private playerSiegeRow: PlayingRowContainer;

	constructor(
		playerHand: HandContainer,
		playerMeleeRow: PlayingRowContainer,
		playerRangedRow: PlayingRowContainer,
		playerSiegeRow: PlayingRowContainer
	) {
		this.playerHand = playerHand;
		this.playerMeleeRow = playerMeleeRow;
		this.playerRangedRow = playerRangedRow;
		this.playerSiegeRow = playerSiegeRow;
	}

	/**
	 * Set the GameController for multiplayer interactions
	 */
	public setGameController(gameController: LocalGameController): void {
		this.gameController = gameController;
	}

	/**
	 * Set up card interactions for all cards in player hand
	 */
	public setupPlayerHandInteractions(): void {
		this.playerHand.getAllCards().forEach((card) => {
			this.setupCardInteractions(card);
		});
	}

	/**
	 * Set up interactions for a single card
	 */
	public setupCardInteractions(card: Card): void {
		card.on('pointerenter', () => this.onCardHover(card, true));
		card.on('pointerleave', () => this.onCardHover(card, false));
		card.on('pointerup', (event) => this.onCardClick(card, event));
	}

	/**
	 * Set up row click handlers for placing cards
	 */
	public setupRowInteractions(): void {
		const playableRows = [
			this.playerMeleeRow,
			this.playerRangedRow,
			this.playerSiegeRow,
		];

		playableRows.forEach((row) => {
			row.setContainerInteractive(true);
			row.on('containerClick', () => {
				if (this.selectedCard) {
					this.placeSelectedCard(row);
				}
			});
		});
	}

	/**
	 * Handle global click to deselect cards
	 */
	public handleGlobalClick(): void {
		if (this.cardClickInProgress) {
			return;
		}

		// Deselect when clicking anywhere else
		setTimeout(() => {
			if (!this.cardClickInProgress) {
				this.deselectCard();
			}
		}, 50);
	}

	private onCardHover(card: Card, isHovering: boolean): void {
		// Only apply hover effects to cards in player hand
		if (card.parent !== this.playerHand) return;

		// Don't apply hover effects to selected cards
		if (this.selectedCard === card) return;

		const targetY = isHovering ? -12 : 0;
		const duration = 0.2;

		gsap.to(card, {
			y: targetY,
			duration,
			ease: "power2.out",
		});
	}

	private onCardClick(card: Card, event: any): void {
		event.stopPropagation(); // Prevent global click handler

		// Only allow selection of cards in player hand
		if (card.parent !== this.playerHand) {
			return;
		}

		this.cardClickInProgress = true;

		if (this.selectedCard === card) {
			this.deselectCard();
		} else {
			this.selectCard(card);
		}

		setTimeout(() => {
			this.cardClickInProgress = false;
		}, 150);
	}

	private selectCard(card: Card): void {
		if (this.selectedCard) {
			this.deselectCard();
		}

		this.selectedCard = card;

		// Lift card up
		gsap.to(card, {
			y: -30,
			duration: 0.1,
			ease: "power2.out",
		});

		// Highlight valid placement rows
		this.highlightValidRows(card.cardData.type);

		console.log(`✅ Selected: ${card.cardData.name}`);
	}

	private deselectCard(): void {
		if (!this.selectedCard) return;

		const card = this.selectedCard;

		// Return card to normal position
		gsap.to(card, {
			y: 0,
			duration: 0.3,
			ease: "power2.out",
		});

		// Clear all row highlights
		this.clearRowHighlights();

		this.selectedCard = null;
	}

	private async placeSelectedCard(targetRow: PlayingRowContainer): Promise<void> {
		if (!this.selectedCard) return;

		if (!targetRow.canAcceptCard(this.selectedCard)) {
			return;
		}

		const cardId = this.selectedCard.cardData.id;

		let targetRowName: "melee" | "ranged" | "siege";
this
		if (targetRow === this.playerMeleeRow) {
			targetRowName = "melee";
		} else if (targetRow === this.playerRangedRow) {
			targetRowName = "ranged";
		} else if (targetRow === this.playerSiegeRow) {
			targetRowName = "siege";
		} else {
			return;
		}

		this.clearRowHighlights();

		this.selectedCard = null;

		if (this.gameController) {
			this.gameController.placeCard(cardId, targetRowName);
		} else {
			const cardIndex = this.playerHand.getAllCards().findIndex(c => c.cardData.id === cardId);
			if (cardIndex === -1) return;

			await this.playerHand.transferCardTo(cardIndex, targetRow);

			targetRow.updateScore();
		}
	}

	private highlightValidRows(cardType: CardType): void {
		let validRow: PlayingRowContainer | null = null;

		switch (cardType) {
			case CardType.MELEE:
				validRow = this.playerMeleeRow;
				break;
			case CardType.RANGED:
				validRow = this.playerRangedRow;
				break;
			case CardType.SIEGE:
				validRow = this.playerSiegeRow;
				break;
		}

		if (!validRow) return;

		validRow.showHighlight();
	}

	private clearRowHighlights(): void {
		[this.playerMeleeRow, this.playerRangedRow, this.playerSiegeRow].forEach((row) => {
			row.hideHighlight();
		});
	}
}
