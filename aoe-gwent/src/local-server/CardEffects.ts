import { Card, PlayingRowContainer } from "../entities/card";
import { Player } from "../entities/player/Player";

export interface BattlefieldContext {
	player: Player;
	enemy: Player;
}

/**
 * Effect metadata that includes both the function and its description.
 * Used for linking effects to their descriptions in the UI.
 */
export interface EffectMetadata<T> {
	id: string;
	fn: T;
	description: string;
}

/**
 * Effect that calculates this card's score based on battlefield conditions
 */
export type SelfEffectFunction = (
	card: Card,
	context: BattlefieldContext
) => number;

/**
 * Effect that modifies other cards (aura/passive effect)
 */
export type AuraEffectFunction = (context: BattlefieldContext) => {
	affectedRow: PlayingRowContainer;
	effectValue: number;
};

/**
 * Effect that triggers when card is played
 */
export type TriggerEffectFunction = (context: BattlefieldContext) => void;

/**
 * Self-targeting effects - cards that modify their own score
 */
export const SelfEffects = {
	/**
	 * Monaspa: Gains +1 strength for each other Monaspa or Knight in same melee row
	 */
	monaspaBonus: {
		id: "monaspa_bonus",
		description:
			"Gains +1 strength for each other Monaspa or Knight in the same row.",
		fn: (card: Card, context: BattlefieldContext): number => {
			const meleeCards = context.player.melee.cards;
			const bonusCards = meleeCards.filter(
				(c) =>
					card !== c &&
					(c.cardData.name === "Monaspa" || c.cardData.name === "Knight")
			);
			return bonusCards.length;
		},
	} as EffectMetadata<SelfEffectFunction>,

	wingedHussarBonus: {
		id: "winged_hussar_bonus",
		description: "Gains 2 strength if there are any enemy siege units.",
		fn: (_: Card, context: BattlefieldContext): number => {
			const enemySiegeCount = context.enemy.siege.cards.length;
			return enemySiegeCount > 0 ? 2 : 0;
		},
	} as EffectMetadata<SelfEffectFunction>,

	/**
	 * Skirmisher: Gains +2 strength if there are any cards in enemy ranged row
	 */
	skirmisherBonus: {
		id: "skirmisher_bonus",
		description: "Gains 2 strength if there are any enemy ranged units.",
		fn: (_: Card, context: BattlefieldContext): number => {
			const enemyRangedCount = context.enemy.ranged.cards.length;

			return enemyRangedCount > 0 ? 2 : 0;
		},
	} as EffectMetadata<SelfEffectFunction>,

	/**
	 * Pikeman: Gains +2 strength if there are any cavalry units in enemy melee row
	 */
	pikemanBonus: {
		id: "pikeman_bonus",
		description:
			"Gains 2 strength if there are any enemy cavalry units in melee row.",
		fn: (_: Card, context: BattlefieldContext): number => {
			const enemyMeleeCards = context.enemy.melee.cards;

			let bonusScore = 0;

			for (const enemyCard of enemyMeleeCards) {
				if (enemyCard.cardData.tags?.includes("cavalry")) {
					bonusScore = 2;
					break;
				}
			}

			return bonusScore;
		},
	} as EffectMetadata<SelfEffectFunction>,
};

/**
 * Aura effects - cards that affect whole rows.
 */
export const AuraEffects = {
	/**
	 * Obuch: Decreases strength of all enemy cards in melee row by 1
	 */
	obuchDebuff: {
		id: "obuch_debuff",
		description: "Decreases strength of all enemy melee units by 1.",
		fn: (context: BattlefieldContext) => {
			return {
				affectedRow: context.enemy.melee,
				effectValue: -1,
			};
		},
	} as EffectMetadata<AuraEffectFunction>,
};

/**
 * Trigger effects - one-time effects when card is played
 */
export const TriggerEffects = {
	/**
	 * Karambit Warrior: Summons all other Karambit Warriors from hand and deck
	 */
	karambitSummon: {
		id: "karambit_summon",
		description: "Summons all other Karambit Warriors from hand and deck.",
		fn: (context: BattlefieldContext): void => {
			const { hand, deck, melee, deckPosition } = context.player;

			// Add all Karambit Warriors found in hand
			hand.cards
				.filter((c) => c.cardData.name === "Karambit Warrior")
				.forEach((card) => {
					melee.transferCardTo(card, melee);
					("");
				});

			// Add all Karambit Warriors found in deck
			deck
				.filter((c) => c.name === "Karambit Warrior")
				.forEach((cardData) => {
					melee.addCardWithAnimation(cardData, deckPosition);
				});
		},
	} as EffectMetadata<TriggerEffectFunction>,

	clearEffect: {
		id: "clear_effect",
		description: "Removes all weather effects from the battlefield.",
		fn: (context: BattlefieldContext): void => {
			context.player.melee.clearWeatherEffect();
			context.player.ranged.clearWeatherEffect();
			context.player.siege.clearWeatherEffect();
			context.enemy.melee.clearWeatherEffect();
			context.enemy.ranged.clearWeatherEffect();
			context.enemy.siege.clearWeatherEffect();

			// Weather container is same for player and enemy.
			context.player.weather.removeAllCards();
		},
	},

	/**
	 * Freeze: Decreases strength of all melee units to 1
	 */
	freezeEffect: {
		id: "freeze_effect",
		description: "Reduces strength of all melee units to 1.",
		fn: (context: BattlefieldContext): void => {
			context.player.melee.applyWeatherEffect();
			context.enemy.melee.applyWeatherEffect();
		},
	},

	/**
	 * Fog: Decreases strength of all ranged units to 1
	 */
	fogEffect: {
		id: "fog_effect",
		description: "Reduces strength of all ranged units to 1.",
		fn: (context: BattlefieldContext): void => {
			context.player.ranged.applyWeatherEffect();
			context.enemy.ranged.applyWeatherEffect();
		},
	},

	/**
	 * Rain: Decreases strength of all siege units to 1
	 */
	rainEffect: {
		id: "rain_effect",
		description: "Reduces strength of all siege units to 1.",
		fn: (context: BattlefieldContext): void => {
			context.player.siege.applyWeatherEffect();
			context.enemy.siege.applyWeatherEffect();
		},
	},
};
