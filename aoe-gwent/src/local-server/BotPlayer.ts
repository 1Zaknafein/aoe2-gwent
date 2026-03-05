import {
	Card,
	CardContainer,
	CardType,
	PlayingRowContainer,
} from "../entities/card";
import { WeatherRowContainer } from "../entities/card/WeatherRowContainer";
import { Player, PlayerData } from "../entities/player/Player";
import { ScoreCalculator } from "../shared/game/ScoreCalculator";
import { ActionType, PlayerAction } from "./GameTypes";

/**
 * AI opponent for local games
 */
export class BotPlayer extends Player {
	/**
	 * 0	Any card is good enough, picks randomly
	 * 0.5	Only cards in the top half of gain range qualify
	 * 1	Only the single best card qualifies
	 */
	public aggressiveness = 0.5;

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

		const passChance = 0.1;

		const optimalCard = this.findOptimalCard();
		const targetContainer = this._containerMap.get(optimalCard.cardData.type);

		await this.delay(1000);

		let pass = false;

		if (this._otherPlayer.hasPassed && this.score > this._otherPlayer.score) {
			pass = true;
		} else if (this.score > this._otherPlayer.score * 1.5 && this.score > 10) {
			pass = true;
		} else if (Math.random() < passChance) {
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
			card: optimalCard,
			targetRow: targetContainer,
		};
	}

	/**
	 * Helper to delay execution
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private findOptimalCard(): Card {
		const cards = this.hand.cards;

		// Score each card by the gain it would produce
		const scored = cards.map((card) => {
			const { bot, enemy } = this.calculateFutureScore(card);
			const gain = bot - enemy;
			return { card, gain };
		});

		scored.sort((a, b) => b.gain - a.gain);

		const best = scored[0];
		const worst = scored[scored.length - 1];
		const gainRange = best.gain - worst.gain;
		const threshold = worst.gain + gainRange * this.aggressiveness;

		const goodEnough = scored.filter((s) => s.gain >= threshold);

		// Pick randomly among good-enough cards to avoid being predictable
		const pick = goodEnough[Math.floor(Math.random() * goodEnough.length)];

		return pick.card;
	}

	// Check what the score would be if a card is played.
	private calculateFutureScore(card: Card): {
		bot: number;
		enemy: number;
	} {
		const targetRow = this._containerMap.get(card.cardData.type);
		const cloneRow = this.getCloneRow(targetRow!, card);

		const targetMelee = (
			targetRow === this.melee ? cloneRow : this.melee
		) as PlayingRowContainer;

		const targetRanged = (
			targetRow === this.ranged ? cloneRow : this.ranged
		) as PlayingRowContainer;

		const targetSiege = (
			targetRow === this.siege ? cloneRow : this.siege
		) as PlayingRowContainer;

		const context = {
			player: {
				melee: targetMelee,
				ranged: targetRanged,
				siege: targetSiege,
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

		return {
			bot: totalBotScore,
			enemy: totalEnemyScore,
		};
	}

	private getCloneRow(row: CardContainer, card: Card): CardContainer {
		let cloneRow;

		if (row instanceof PlayingRowContainer) {
			cloneRow = new PlayingRowContainer({
				containerType: row.containerType!,
				height: 1,
				label: "_",
				labelColor: 0xffffff,
				width: 1,
			});
			cloneRow.cards = [...row.cards, card];
			cloneRow.weatherEffectApplied = row.weatherEffectApplied;
			cloneRow.strengthBoost = row.strengthBoost;
		} else if (row instanceof WeatherRowContainer) {
			cloneRow = new WeatherRowContainer({
				height: 1,
				label: "_",
				width: 1,
				containerType: CardType.WEATHER,
			});
			cloneRow.cards = [...row.cards, card];
		} else {
			throw new Error("Unknown row type for cloning");
		}

		return cloneRow;
	}
}
