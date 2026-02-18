import { Card, CardContainer, PlayingRowContainer } from "../../entities/card";
import { Player } from "../../entities/player/Player";
import { BattlefieldContext } from "../../local-server/CardEffects";

export class ScoreCalculator {
	private readonly _player: Player;
	private readonly _enemy: Player;

	private readonly _rowBuffMap: Map<PlayingRowContainer, number>;

	constructor(player: Player, enemy: Player) {
		this._player = player;
		this._enemy = enemy;
		this._rowBuffMap = new Map();
	}

	public calculateScore(): void {
		const playerRows = [
			this._player.melee,
			this._player.ranged,
			this._player.siege,
		];
		const enemyRows = [
			this._enemy.melee,
			this._enemy.ranged,
			this._enemy.siege,
		];

		const allRows = [...playerRows, ...enemyRows];

		// Reset scores to base values before applying any effects.
		for (const row of allRows) {
			const hasWeatherEffect =
				row instanceof PlayingRowContainer && row.weatherEffectApplied;

			for (const card of row.cards) {
				if (card.cardData.baseScore === undefined) {
					throw new Error(`Card ${card.cardData.name} is missing baseScore!`);
				}

				// We can apply weather effects here.
				if (hasWeatherEffect) {
					card.setScore(1);
				} else {
					card.setScore(card.cardData.baseScore);
				}
			}
		}

		// Calculate other aura effects.
		const effects = this.calculateAuraEffects(playerRows, enemyRows);

		this._rowBuffMap.clear();

		// Sum up buffs/debuffs from all aura effects for each row.
		effects.forEach((effect) => {
			const currentValue = this._rowBuffMap.get(effect.affectedRow) ?? 0;

			this._rowBuffMap.set(
				effect.affectedRow,
				currentValue + effect.effectValue
			);
		});

		// Apply row buffs/debuffs from aura effects to the cards.
		this._rowBuffMap.forEach((buffAmount, row) => {
			for (const card of row.cards) {
				const newScore = card.cardData.score + buffAmount;
				card.setScore(Math.max(newScore, 1));
			}
		});

		for (const row of playerRows) {
			for (const card of row.cards) {
				card.setScore(this.calculateCardScore(card, row, true));
			}
		}

		for (const row of enemyRows) {
			for (const card of row.cards) {
				card.setScore(this.calculateCardScore(card, row, false));
			}
		}

		this._player.updateScore();
		this._enemy.updateScore();
	}

	private calculateCardScore(
		card: Card,
		cardContainer: CardContainer,
		isPlayer: boolean
	): number {
		const data = card.cardData;

		const context: BattlefieldContext = {
			player: isPlayer ? this._player : this._enemy,
			enemy: isPlayer ? this._enemy : this._player,
		};

		let newScore = data.score;

		if (
			cardContainer instanceof PlayingRowContainer &&
			cardContainer.weatherEffectApplied
		) {
			newScore = 1;
		}

		if (data.selfEffect) {
			newScore += data.selfEffect.fn(card, context);
		}

		return newScore;
	}

	private calculateAuraEffects(
		playerRows: PlayingRowContainer[],
		enemyRows: PlayingRowContainer[]
	): {
		affectedRow: PlayingRowContainer;
		effectValue: number;
	}[] {
		const contextPlayer: BattlefieldContext = {
			player: this._player,
			enemy: this._enemy,
		};

		const contextEnemy: BattlefieldContext = {
			player: this._enemy,
			enemy: this._player,
		};

		let effects: {
			affectedRow: PlayingRowContainer;
			effectValue: number;
		}[] = [];

		for (const row of playerRows) {
			for (const card of row.cards) {
				const effect = card.cardData.auraEffect?.fn(contextPlayer);

				if (effect) {
					effects.push({
						affectedRow: effect.affectedRow,
						effectValue: effect.effectValue,
					});
				}
			}
		}

		for (const row of enemyRows) {
			for (const card of row.cards) {
				const effect = card.cardData.auraEffect?.fn(contextEnemy);

				if (effect) {
					effects.push({
						affectedRow: effect.affectedRow,
						effectValue: effect.effectValue,
					});
				}
			}
		}

		return effects;
	}
}
