import { Card, PlayingRowContainer } from "../../entities/card";
import { BattlefieldContext } from "../../local-server/CardEffects";

export class ScoreCalculator {
	private readonly _rowBuffMap: {
		player: Map<PlayingRowContainer, number>;
		enemy: Map<PlayingRowContainer, number>;
	} = {
		player: new Map(),
		enemy: new Map(),
	};

	private readonly _cardScoreMap: {
		player: Map<Card, number>;
		enemy: Map<Card, number>;
	} = {
		player: new Map(),
		enemy: new Map(),
	};

	public calculateScore(context: BattlefieldContext): {
		player: Map<Card, number>;
		enemy: Map<Card, number>;
	} {
		const playerRows = [
			context.player.melee,
			context.player.ranged,
			context.player.siege,
		];
		const enemyRows = [
			context.enemy.melee,
			context.enemy.ranged,
			context.enemy.siege,
		];

		this._rowBuffMap.player.clear();
		this._cardScoreMap.player.clear();

		this._rowBuffMap.enemy.clear();
		this._cardScoreMap.enemy.clear();

		// Reset scores to base values before applying any effects.
		for (const row of enemyRows) {
			for (const card of row.cards) {
				if (card.cardData.baseScore === undefined) {
					throw new Error(`Card ${card.cardData.name} is missing baseScore!`);
				}

				this._cardScoreMap.enemy.set(
					card,
					row.weatherEffectApplied ? 1 : card.cardData.baseScore
				);
			}
		}

		for (const row of playerRows) {
			for (const card of row.cards) {
				if (card.cardData.baseScore === undefined) {
					throw new Error(`Card ${card.cardData.name} is missing baseScore!`);
				}

				this._cardScoreMap.player.set(
					card,
					row.weatherEffectApplied ? 1 : card.cardData.baseScore
				);
			}
		}

		// Calculate aura effects.
		const auraEffects = this.calculateAuraEffects(context);

		auraEffects.enemy.forEach((effect) => {
			const currentValue = this._rowBuffMap.enemy.get(effect.row) ?? 0;

			this._rowBuffMap.enemy.set(effect.row, currentValue + effect.effectValue);
		});

		// Sum up buffs/debuffs from all aura effects for each row.
		auraEffects.player.forEach((effect) => {
			const currentValue = this._rowBuffMap.player.get(effect.row) ?? 0;

			this._rowBuffMap.player.set(
				effect.row,
				currentValue + effect.effectValue
			);
		});

		// Apply row buffs/debuffs from aura effects to the cards.
		this._rowBuffMap.player.forEach((buffAmount, row) => {
			for (const card of row.cards) {
				const oldScore = this._cardScoreMap.player.get(card)!;
				const newScore = oldScore + buffAmount;

				this._cardScoreMap.player.set(card, Math.max(newScore, 1));
			}
		});

		// Apply card score for player rows.
		for (const row of playerRows) {
			for (const card of row.cards) {
				this._cardScoreMap.player.set(
					card,
					this.calculateCardScore(card, context)
				);
			}
		}

		// Swap context player/enemy to calculate score for enemy cards with correct context.
		const swappedContext: BattlefieldContext = {
			player: context.enemy,
			enemy: context.player,
		};

		// Apply card score for enemy rows.
		for (const row of enemyRows) {
			for (const card of row.cards) {
				this._cardScoreMap.enemy.set(
					card,
					this.calculateCardScore(card, swappedContext)
				);
			}
		}

		return {
			player: this._cardScoreMap.player,
			enemy: this._cardScoreMap.enemy,
		};
	}

	private calculateCardScore(card: Card, context: BattlefieldContext): number {
		const data = card.cardData;

		let newScore =
			this._cardScoreMap.player.get(card) ??
			this._cardScoreMap.enemy.get(card)!;

		if (data.selfEffect) {
			newScore += data.selfEffect.fn(card, context);
		}

		return newScore;
	}

	private calculateAuraEffects(
		context: BattlefieldContext
	): AuraEffectModifier {
		let playerEffects: {
			row: PlayingRowContainer;
			effectValue: number;
		}[] = [];

		let enemyEffects: {
			row: PlayingRowContainer;
			effectValue: number;
		}[] = [];

		const playerRows = [
			context.player.melee,
			context.player.ranged,
			context.player.siege,
		];
		const enemyRows = [
			context.enemy.melee,
			context.enemy.ranged,
			context.enemy.siege,
		];

		for (const row of playerRows) {
			if (row.strengthBoost) {
				playerEffects.push({
					row: row,
					effectValue: row.strengthBoost,
				});
			}

			for (const card of row.cards) {
				const effect = card.cardData.auraEffect?.fn(context);

				if (effect) {
					playerEffects.push({
						row: effect.row,
						effectValue: effect.value,
					});
				}
			}
		}

		const swappedContext: BattlefieldContext = {
			player: context.enemy,
			enemy: context.player,
		};

		for (const row of enemyRows) {
			if (row.strengthBoost) {
				enemyEffects.push({
					row: row,
					effectValue: row.strengthBoost,
				});
			}

			for (const card of row.cards) {
				const effect = card.cardData.auraEffect?.fn(swappedContext);

				if (effect) {
					enemyEffects.push({
						row: effect.row,
						effectValue: effect.value,
					});
				}
			}
		}

		return {
			player: playerEffects,
			enemy: enemyEffects,
		};
	}
}

interface AuraEffectModifier {
	player: {
		row: PlayingRowContainer;
		effectValue: number;
	}[];

	enemy: {
		row: PlayingRowContainer;
		effectValue: number;
	}[];
}
