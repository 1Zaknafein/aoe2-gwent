import { Card } from "../../entities/card/Card";
import {
	PlayingRowContainer,
	HandContainer,
	CardType,
} from "../../entities/card";
import { gsap } from "gsap";
import { WeatherRowContainer } from "../../entities/card/WeatherRowContainer";
import { EventEmitter } from "pixi.js";

/**
 * Manages user interactions with the game board.
 * Handles card selection, hover effects, and placement logic
 */
export class GameBoardInteractionManager extends EventEmitter {
	private selectedCard: Card | null = null;
	private cardClickInProgress = false;

	private playerHand: HandContainer;
	private playerMeleeRow: PlayingRowContainer;
	private playerRangedRow: PlayingRowContainer;
	private playerSiegeRow: PlayingRowContainer;
	private weatherRow: WeatherRowContainer;

	private allRows: (PlayingRowContainer | WeatherRowContainer)[] = [];

	constructor(
		playerHand: HandContainer,
		playerMeleeRow: PlayingRowContainer,
		playerRangedRow: PlayingRowContainer,
		playerSiegeRow: PlayingRowContainer,
		weatherRow: WeatherRowContainer
	) {
		super();

		this.playerHand = playerHand;
		this.playerMeleeRow = playerMeleeRow;
		this.playerRangedRow = playerRangedRow;
		this.playerSiegeRow = playerSiegeRow;
		this.weatherRow = weatherRow;

		this.allRows = [
			this.playerMeleeRow,
			this.playerRangedRow,
			this.playerSiegeRow,
			this.weatherRow,
		];

		this.setupPlayerHandInteractions();
		this.setupRowInteractions();
	}

	/**
	 * Set up card interactions for all cards in player hand
	 */
	public setupPlayerHandInteractions(): void {
		this.playerHand.getAllCards().forEach((card) => {
			this.setupCardInteractions(card);
		});

		this.playerHand.on("cardAdded", (data) => {
			if (data.card && data.container === this.playerHand) {
				this.setupCardInteractions(data.card);
			}
		});
	}

	/**
	 * Set up interactions for a single card
	 */
	public setupCardInteractions(card: Card): void {
		card.on("pointerenter", () => this.onCardHover(card, true));
		card.on("pointerleave", () => this.onCardHover(card, false));
		card.on("pointerup", (event) => this.onCardClick(card, event));
	}

	/**
	 * Set up row click handlers for placing cards
	 */
	public setupRowInteractions(): void {
		for (const row of this.allRows) {
			row.setContainerInteractive(true);
			row.on("containerClick", () => {
				if (this.selectedCard) {
					this.notifyCardAction(row);
				}
			});
		}
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
		if (card.parent !== this.playerHand) return;

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
		event.stopPropagation();

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

		this.emit("cardSelected", card);

		this.selectedCard = card;

		// Lift card up
		gsap.to(card, {
			y: -30,
			duration: 0.1,
			ease: "power2.out",
		});

		this.highlightValidRows(card.cardData.type);
	}

	private deselectCard(): void {
		if (!this.selectedCard) return;

		const card = this.selectedCard;

		this.emit("cardDeselected");

		gsap.to(card, {
			y: 0,
			duration: 0.3,
			ease: "power2.out",
		});

		this.clearRowHighlights();

		this.selectedCard = null;
	}

	private async notifyCardAction(
		targetRow: PlayingRowContainer | WeatherRowContainer
	): Promise<void> {
		if (!this.selectedCard) return;

		if (!targetRow.canAcceptCard(this.selectedCard)) {
			return;
		}

		this.clearRowHighlights();

		// Card placement is done GameManager, here we just notify where card should be placed.
		this.playerHand.emit("playerCardPlacement", this.selectedCard, targetRow);

		this.selectedCard = null;
	}

	private highlightValidRows(cardType: CardType): void {
		let validRow: PlayingRowContainer | WeatherRowContainer | null = null;

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
			case CardType.WEATHER:
				validRow = this.weatherRow;
		}

		if (!validRow) return;

		validRow.showHighlight();
	}

	private clearRowHighlights(): void {
		for (const row of this.allRows) {
			row.hideHighlight();
		}
	}
}
