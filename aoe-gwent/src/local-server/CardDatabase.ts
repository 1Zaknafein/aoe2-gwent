import { CardType } from "../shared/types/CardTypes";

export interface ServerCardData {
	id: number;
	name: string;
	score: number;
	type: CardType;
}

/**
 * Local card database that stores card definitions.
 * Ported from server/src/database/CardDatabase.ts
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
		{
			id: 7,
			name: "Skirmisher",
			score: 2,
			type: CardType.RANGED,
		},
		{
			id: 8,
			name: "Trebuchet",
			score: 10,
			type: CardType.SIEGE,
		},
		{
			id: 9,
			name: "Bombard Cannon",
			score: 6,
			type: CardType.SIEGE,
		},
		{
			id: 10,
			name: "Pikeman",
			score: 4,
			type: CardType.MELEE,
		},
	];

	public static getCardById(id: number): ServerCardData | undefined {
		return this.cards.find((card) => card.id === id);
	}

	public static getAllCards(): ServerCardData[] {
		return [...this.cards];
	}

	public static generateRandomDeck(size: number): number[] {
		const deck: number[] = [];
		for (let i = 0; i < size; i++) {
			const randomCard =
				this.cards[Math.floor(Math.random() * this.cards.length)];
			deck.push(randomCard.id);
		}
		return deck;
	}
}
