import { CardData } from "../entities/card";
import { CardType } from "../shared/types/CardTypes";

/**
 * Local card database that stores card definitions.
 */
export class CardDatabase {
	public static generateRandomDeck(size: number): CardData[] {
		const deck = [];

		for (let i = 0; i < size; i++) {
			const randomCard =
				this.cards[Math.floor(Math.random() * this.cards.length)];

			deck.push(randomCard);
		}

		return deck;
	}

	private static readonly cards: CardData[] = [
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
	] as const;
}
