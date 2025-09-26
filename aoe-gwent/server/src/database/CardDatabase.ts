import { CardType } from "../shared/types/CardTypes";

export interface ServerCardData {
	id: number;
	name: string;
	score: number;
	type: CardType;
}

/**
 * Server-side card database that stores card definitions.
 * Does not include client-specific rendering data like faceTexture.
 */
export class CardDatabase {
	private static readonly cards: ServerCardData[] = [
		{
			id: 1,
			name: "Knight",
			score: 5,
			type: CardType.MELEE,
		},
		{
			id: 2,
			name: "Crossbowman",
			score: 3,
			type: CardType.RANGED,
		},
		{
			id: 3,
			name: "Mangonel",
			score: 8,
			type: CardType.SIEGE,
		},
		{
			id: 4,
			name: "Light Cavalry",
			score: 3,
			type: CardType.MELEE,
		},
		{
			id: 5,
			name: "Teutonic Knight",
			score: 10,
			type: CardType.MELEE,
		},
		{
			id: 6,
			name: "Archer",
			score: 2,
			type: CardType.RANGED,
		},
	];

	/**
	 * Generate card data from a list of card IDs.
	 * @param cardIds Array of card IDs to fetch
	 * @returns Array of ServerCardData corresponding to the IDs
	 */
	public static generateCardsFromIds(cardIds: number[]): ServerCardData[] {
		const cardDataList: ServerCardData[] = [];

		for (const id of cardIds) {
			const cardData = this.cards.find((card) => card.id === id);

			if (cardData) {
				// Return a copy to avoid reference issues
				const cardCopy: ServerCardData = {
					id: cardData.id,
					name: cardData.name,
					score: cardData.score,
					type: cardData.type,
				};

				cardDataList.push(cardCopy);
			} else {
				console.warn(`Card ID ${id} not found in database`);
			}
		}

		return cardDataList;
	}

	/**
	 * Get a single card by ID.
	 * @param id Card ID to fetch
	 * @returns ServerCardData if found, undefined otherwise
	 */
	public static getCardById(id: number): ServerCardData | undefined {
		const cardData = this.cards.find((card) => card.id === id);

		if (cardData) {
			// Return a copy to avoid reference issues
			return {
				id: cardData.id,
				name: cardData.name,
				score: cardData.score,
				type: cardData.type,
			};
		}

		return undefined;
	}

	/**
	 * Get all available card IDs.
	 * @returns Array of all card IDs in the database
	 */
	public static getAllCardIds(): number[] {
		return this.cards.map((card) => card.id);
	}

	/**
	 * Check if a card ID exists in the database.
	 * @param id Card ID to check
	 * @returns True if the ID exists, false otherwise
	 */
	public static hasCard(id: number): boolean {
		return this.cards.some((card) => card.id === id);
	}

	/**
	 * Generate a random deck of card IDs.
	 * @param deckSize Number of cards to include in the deck
	 * @returns Array of random card IDs
	 */
	public static generateRandomDeck(deckSize: number = 20): number[] {
		const availableIds = this.getAllCardIds();
		const deck: number[] = [];

		for (let i = 0; i < deckSize; i++) {
			const randomId =
				availableIds[Math.floor(Math.random() * availableIds.length)];
			deck.push(randomId);
		}

		return deck;
	}
}
