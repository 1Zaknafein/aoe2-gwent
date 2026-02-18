import {
	CardContainer,
	CardData,
	HandContainer,
	PlayingRowContainer,
} from "../card";
import { PlayerID } from "../../shared/types";
import { WeatherRowContainer } from "../card/WeatherRowContainer";

export class Player {
	public readonly id: PlayerID;
	public readonly hand: HandContainer;
	public readonly melee: PlayingRowContainer;
	public readonly ranged: PlayingRowContainer;
	public readonly siege: PlayingRowContainer;
	public readonly discarded: CardContainer;
	public readonly weather: WeatherRowContainer;
	public readonly deck: CardData[];
	public readonly deckPosition: { x: number; y: number };

	public score = 0;
	public hasPassed = false;

	constructor(data: PlayerData) {
		const { id, hand, melee, ranged, siege, discarded, weather, deckPosition } =
			data;

		this.id = id;
		this.deck = [];

		this.hand = hand;
		this.melee = melee;
		this.ranged = ranged;
		this.siege = siege;
		this.discarded = discarded;
		this.weather = weather;
		this.deckPosition = deckPosition;
	}

	public updateScore(): void {
		this.melee.updateScore();
		this.ranged.updateScore();
		this.siege.updateScore();

		this.score = this.melee.score + this.ranged.score + this.siege.score;
	}

	public reset(): void {
		this.score = 0;
		this.hasPassed = false;

		this.hand.removeAllCards();
		this.melee.removeAllCards();
		this.ranged.removeAllCards();
		this.siege.removeAllCards();
		this.discarded.removeAllCards();
		this.weather.removeAllCards();
		this.deck.splice(0, this.deck.length);
	}
}

export type PlayerData = {
	id: PlayerID;
	hand: HandContainer;
	melee: PlayingRowContainer;
	ranged: PlayingRowContainer;
	siege: PlayingRowContainer;
	discarded: CardContainer;
	weather: WeatherRowContainer;
	deckPosition: { x: number; y: number };
};
