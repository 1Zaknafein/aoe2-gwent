import {
	Card,
	CardContainer,
	CardType,
	PlayingRowContainer,
} from "../entities/card";
import { Player, PlayerData } from "../entities/player/Player";
import { ScoreCalculator } from "../shared/game/ScoreCalculator";
import { ActionType, PlayerAction } from "./GameTypes";

/**
 * AI opponent for local games
 */
export class BotPlayer extends Player {
	private readonly thinkingDelay = 200;

	private readonly _containerMap: Map<string, CardContainer> = new Map();
	private readonly _otherPlayer: Player;
	private readonly _scoreCalculator: ScoreCalculator;

	constructor(playerData: PlayerData, otherPlayer: Player) {
		super(playerData);

		this._otherPlayer = otherPlayer;
		this._scoreCalculator = new ScoreCalculator();

		this._containerMap.set(CardType.MELEE, this.melee);
		this._containerMap.set(CardType.RANGED, this.ranged);
		this._containerMap.set(CardType.SIEGE, this.siege);
		this._containerMap.set(CardType.WEATHER, this.weather);
		this._containerMap.set("hand", this.hand);
	}

	/**
	 * Take turn as bot.
	 */
	public async decideAction(): Promise<PlayerAction> {
		await this.delay(this.thinkingDelay);

		const cards = this.hand.cards;

		if (!cards || cards.length === 0) {
			return {
				type: ActionType.PASS_TURN,
				player: this,
			};
		}

		const passChance = 0.01;

		const randomCard = cards[Math.floor(Math.random() * cards.length)];
		const targetContainer = this._containerMap.get(randomCard.cardData.type);

		this.calculateFutureScore(randomCard);

		await this.delay(1000);

		let pass = false;

		if (this.score > this._otherPlayer.score && this.score > 10) {
			pass = true;
		} else if (Math.random() < passChance) {
			pass = true;
		} else if (cards.length === 0) {
			pass = true;
		}

		if (pass) {
			return {
				type: ActionType.PASS_TURN,
				player: this,
			};
		}

		return {
			type: ActionType.PLACE_CARD,
			player: this,
			card: randomCard,
			targetRow: targetContainer,
		};
	}

	/**
	 * Helper to delay execution
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// Check what the score would be if a card is played.
	private calculateFutureScore(card: Card) {
		const fakeRow = new PlayingRowContainer({
			containerType: card.cardData.type,
			height: 1,
			label: "Fake Row",
			labelColor: 0xffffff,
			width: 1,
		});

		// See which row to replace:

		const targetRow = this._containerMap.get(card.cardData.type);

		switch (targetRow) {
			case this.melee:
				fakeRow.cards = [...this.melee.cards, card];
				break;
			case this.ranged:
				fakeRow.cards = [...this.ranged.cards, card];
				break;
			case this.siege:
				fakeRow.cards = [...this.siege.cards, card];
				break;
		}

		const context = {
			player: {
				melee: targetRow === this.melee ? fakeRow : this.melee,
				ranged: targetRow === this.ranged ? fakeRow : this.ranged,
				siege: targetRow === this.siege ? fakeRow : this.siege,
				weather: this.weather,
				hand: this.hand,
				deck: this.deck,
				deckPosition: this.deckPosition,
			},
			enemy: {
				melee: this._otherPlayer.melee,
				ranged: this._otherPlayer.ranged,
				siege: this._otherPlayer.siege,
				weather: this._otherPlayer.weather,
				hand: this._otherPlayer.hand,
				deck: this._otherPlayer.deck,
				deckPosition: this._otherPlayer.deckPosition,
			},
		};

		const { player, enemy } = this._scoreCalculator.calculateScore(context);

		const totalBotScore = Array.from(player.values()).reduce(
			(sum, score) => sum + score,
			0
		);

		const totalEnemyScore = Array.from(enemy.values()).reduce(
			(sum, score) => sum + score,
			0
		);

		console.log(
			`If bot plays ${card.cardData.name}, future score would be: ${totalBotScore} vs ${totalEnemyScore}`
		);
	}
}
