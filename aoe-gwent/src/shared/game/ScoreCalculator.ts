import { Card, PlayingRowContainer } from "../../entities/card";
import { BattlefieldContext } from "../../local-server/CardEffects";

export class ScoreCalculator {
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
		const swappedContext: BattlefieldContext = {
			player: context.enemy,
			enemy: context.player,
		};

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

		this._cardScoreMap.player.clear();
		this._cardScoreMap.enemy.clear();

		this.initBaseScores(playerRows, this._cardScoreMap.player);
		this.initBaseScores(enemyRows, this._cardScoreMap.enemy);

		this.applyAuraEffects(playerRows, context);
		this.applyAuraEffects(enemyRows, swappedContext);

		this.applySelfEffects(playerRows, context, this._cardScoreMap.player);
		this.applySelfEffects(enemyRows, swappedContext, this._cardScoreMap.enemy);

		return {
			player: this._cardScoreMap.player,
			enemy: this._cardScoreMap.enemy,
		};
	}

	private initBaseScores(
		rows: PlayingRowContainer[],
		scoreMap: Map<Card, number>
	): void {
		for (const row of rows) {
			for (const card of row.cards) {
				if (card.cardData.baseScore === undefined) {
					throw new Error(`Card ${card.cardData.name} is missing baseScore!`);
				}

				scoreMap.set(
					card,
					row.weatherEffectApplied ? 1 : card.cardData.baseScore
				);
			}
		}
	}

	private applyAuraEffects(
		rows: PlayingRowContainer[],
		context: BattlefieldContext
	): void {
		const rowBuffMap = new Map<PlayingRowContainer, number>();

		for (const row of rows) {
			if (row.strengthBoost) {
				rowBuffMap.set(row, (rowBuffMap.get(row) ?? 0) + row.strengthBoost);
			}

			for (const card of row.cards) {
				const effect = card.cardData.auraEffect?.fn(context);

				if (effect) {
					rowBuffMap.set(
						effect.row,
						(rowBuffMap.get(effect.row) ?? 0) + effect.value
					);
				}
			}
		}

		// Apply accumulated buffs/debuffs. Look up the card in both maps since aura
		// effects can target the opposite side's rows.
		rowBuffMap.forEach((buffAmount, row) => {
			for (const card of row.cards) {
				const scoreMap = this._cardScoreMap.player.has(card)
					? this._cardScoreMap.player
					: this._cardScoreMap.enemy;

				const oldScore = scoreMap.get(card)!;
				scoreMap.set(card, Math.max(oldScore + buffAmount, 1));
			}
		});
	}

	private applySelfEffects(
		rows: PlayingRowContainer[],
		context: BattlefieldContext,
		scoreMap: Map<Card, number>
	): void {
		for (const row of rows) {
			for (const card of row.cards) {
				const bonus = card.cardData.selfEffect?.fn(card, context) ?? 0;
				scoreMap.set(card, scoreMap.get(card)! + bonus);
			}
		}
	}
}
