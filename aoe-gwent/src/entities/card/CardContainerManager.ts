import { CardContainer } from "./CardContainer";

export interface PlayerContainers {
	hand: CardContainer;
	infantry: CardContainer;
	ranged: CardContainer;
	siege: CardContainer;
	discard: CardContainer;
	deck: CardContainer;
}

export class CardContainerManager {
	public readonly player: PlayerContainers;
	public readonly enemy: PlayerContainers;
	public readonly weather: CardContainer;

	constructor() {
		this.player = {
			hand: new CardContainer(600, "player_hand"),
			infantry: new CardContainer(500, "player_infantry"),
			ranged: new CardContainer(500, "player_ranged"),
			siege: new CardContainer(500, "player_siege"),
			discard: new CardContainer(120, "player_discard"),
			deck: new CardContainer(80, "player_deck"),
		};

		this.enemy = {
			hand: new CardContainer(600, "enemy_hand"),
			infantry: new CardContainer(500, "enemy_infantry"),
			ranged: new CardContainer(500, "enemy_ranged"),
			siege: new CardContainer(500, "enemy_siege"),
			discard: new CardContainer(120, "enemy_discard"),
			deck: new CardContainer(80, "enemy_deck"),
		};

		this.weather = new CardContainer(100, "weather");
	}

	public getAllContainers(): CardContainer[] {
		return [
			this.player.hand,
			this.player.infantry,
			this.player.ranged,
			this.player.siege,
			this.player.discard,
			this.player.deck,
			this.enemy.hand,
			this.enemy.infantry,
			this.enemy.ranged,
			this.enemy.siege,
			this.enemy.discard,
			this.enemy.deck,
			this.weather,
		];
	}

	public getPlayerContainers(): CardContainer[] {
		return [
			this.player.hand,
			this.player.infantry,
			this.player.ranged,
			this.player.siege,
			this.player.discard,
			this.player.deck,
		];
	}

	public getEnemyContainers(): CardContainer[] {
		return [
			this.enemy.hand,
			this.enemy.infantry,
			this.enemy.ranged,
			this.enemy.siege,
			this.enemy.discard,
			this.enemy.deck,
		];
	}
}
