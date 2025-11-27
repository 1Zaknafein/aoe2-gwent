import { HandContainer } from "../../entities/card";
import { CardDatabase } from "../../local-server/CardDatabase";
import { CardType } from "../../shared/types/CardTypes";

/**
 * CardDealingManager - Handles dealing cards to player hands
 * Separates card dealing logic from GameScene
 */
export class CardDealingManager {
	private playerHand: HandContainer;
	private opponentHand: HandContainer;

	constructor(playerHand: HandContainer, opponentHand: HandContainer) {
		this.playerHand = playerHand;
		this.opponentHand = opponentHand;
	}

	/**
	 * Deal cards to both players from card IDs
	 * @param playerHandIds Array of card IDs for the player's hand
	 * @param opponentHandIds Array of card IDs for the opponent's hand
	 */
	public dealCards(playerHandIds: number[], opponentHandIds: number[]): void {
		this.playerHand.removeAllCards();
		this.opponentHand.removeAllCards();

		this.dealPlayerCards(playerHandIds);

		this.dealOpponentCards(opponentHandIds);

		console.log(
			`[CardDealingManager] Dealt ${playerHandIds.length} cards to player, ${opponentHandIds.length} to opponent`
		);
	}

	/**
	 * Deal cards to the player (visible)
	 */
	private dealPlayerCards(cardIds: number[]): void {
		const playerCardData = cardIds
			.map((cardId) => CardDatabase.getCardById(cardId))
			.filter((card): card is NonNullable<typeof card> => card !== null);

		this.playerHand.addCardsBatch(playerCardData);
	}

	/**
	 * Deal cards to the opponent (hidden - shown as card backs)
	 */
	private dealOpponentCards(cardIds: number[]): void {
		// Create dummy card data for opponent cards (they'll be shown as backs)
		const opponentCardData = cardIds.map((cardId) => ({
			id: cardId,
			name: "Hidden Card",
			score: 0,
			type: CardType.MELEE,
		}));

		this.opponentHand.addCardsBatch(opponentCardData);

		// Show all opponent cards as card backs
		this.opponentHand.getAllCards().forEach((card) => {
			card.showBack();
		});
	}

	/**
	 * Clear all cards from both hands
	 */
	public clearHands(): void {
		this.playerHand.removeAllCards();
		this.opponentHand.removeAllCards();
	}
}
