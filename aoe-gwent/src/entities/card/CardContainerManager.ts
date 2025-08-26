import { CardContainer } from "./CardContainer";
import { Deck } from "../deck";
import { CardType } from "./Card";

export class CardContainerManager {
	public readonly player: PlayerContainers;
	public readonly enemy: PlayerContainers;
	public readonly weather: CardContainer;

	constructor() {
		this.player = {
			hand: new CardContainer(1500, "player_hand"),
			melee: new CardContainer(1300, "player_melee", CardType.MELEE),
			ranged: new CardContainer(1300, "player_ranged", CardType.RANGED),
			siege: new CardContainer(1300, "player_siege", CardType.SIEGE),
			discard: new CardContainer(120, "player_discard"),
			deck: new Deck(),
		};

		this.enemy = {
			hand: new CardContainer(1500, "enemy_hand"),
			melee: new CardContainer(1300, "enemy_melee", CardType.MELEE),
			ranged: new CardContainer(1300, "enemy_ranged", CardType.RANGED),
			siege: new CardContainer(1300, "enemy_siege", CardType.SIEGE),
			discard: new CardContainer(120, "enemy_discard"),
			deck: new Deck(),
		};

		this.weather = new CardContainer(490, "weather");
	}

	public getAllContainers(): CardContainer[] {
		return [
			this.player.hand,
			this.player.melee,
			this.player.ranged,
			this.player.siege,
			this.player.discard,
			this.enemy.hand,
			this.enemy.melee,
			this.enemy.ranged,
			this.enemy.siege,
			this.enemy.discard,
			this.weather,
		];
	}

	public getAllDecks(): Deck[] {
		return [this.player.deck, this.enemy.deck];
	}

	public getPlayerContainers(): CardContainer[] {
		return [
			this.player.hand,
			this.player.melee,
			this.player.ranged,
			this.player.siege,
			this.player.discard,
		];
	}

	public getEnemyContainers(): CardContainer[] {
		return [
			this.enemy.hand,
			this.enemy.melee,
			this.enemy.ranged,
			this.enemy.siege,
			this.enemy.discard,
		];
	}
}

export interface PlayerContainers {
	hand: CardContainer;
	melee: CardContainer;
	ranged: CardContainer;
	siege: CardContainer;
	discard: CardContainer;
	deck: Deck;
}
