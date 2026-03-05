import {
	Card,
	CardData,
	HandContainer,
	PlayingRowContainer,
} from "../entities/card";
import { WeatherRowContainer } from "../entities/card/WeatherRowContainer";

export interface BattlefieldContext {
	player: {
		melee: PlayingRowContainer;
		ranged: PlayingRowContainer;
		siege: PlayingRowContainer;
		weather: WeatherRowContainer;
		hand: HandContainer;
		deck: CardData[];
		deckPosition: { x: number; y: number };
	};

	enemy: {
		melee: PlayingRowContainer;
		ranged: PlayingRowContainer;
		siege: PlayingRowContainer;
		hand: HandContainer;
		deck: CardData[];
		weather: WeatherRowContainer;
		deckPosition: { x: number; y: number };
	};
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
	row: PlayingRowContainer;
	value: number;
};

/**
 * Effect that triggers when card is played
 */
export type TriggerEffectFunction = (
	context: BattlefieldContext
) => Promise<void>;

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
				row: context.enemy.melee,
				value: -1,
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
		fn: async (context: BattlefieldContext): Promise<void> => {
			const { hand, deck, melee, deckPosition } = context.player;

			const animations: Promise<void>[] = [];

			// Add all Karambit Warriors found in hand
			hand.cards
				.filter((c) => c.cardData.name === "Karambit Warrior")
				.forEach((card) => {
					animations.push(hand.transferCardTo(card, melee));
				});

			// Add all Karambit Warriors found in deck
			const tempDeckData = deck.filter((c) => c.name === "Karambit Warrior");

			tempDeckData.forEach((cardData) => {
				animations.push(melee.addCardWithAnimation(cardData, deckPosition));

				// Make sure to remove the card data from the deck!
				deck.splice(deck.indexOf(cardData), 1);
			});

			await Promise.all(animations);

			// Need to manually trigger card position update after adding cards with animation.
			// If animating from both hand and deck, position is sometimes updated incorrectly.
			melee.updateCardPositions();
		},
	} as EffectMetadata<TriggerEffectFunction>,

	clearEffect: {
		id: "clear_effect",
		description: "Removes all weather effects from the battlefield.",
		fn: async (context: BattlefieldContext): Promise<void> => {
			await Promise.all([
				context.player.melee.clearWeatherEffect(),
				context.player.ranged.clearWeatherEffect(),
				context.player.siege.clearWeatherEffect(),
				context.enemy.melee.clearWeatherEffect(),
				context.enemy.ranged.clearWeatherEffect(),
				context.enemy.siege.clearWeatherEffect(),
			]);

			// Weather container is same for player and enemy.
			context.player.weather.removeAllCards();
		},
	},

	freezeEffect: {
		id: "freeze_effect",
		description: "Reduces strength of all melee units to 1.",
		fn: async (context: BattlefieldContext): Promise<void> => {
			await Promise.all([
				context.player.melee.applyWeatherEffect(),
				context.enemy.melee.applyWeatherEffect(),
			]);
		},
	},

	fogEffect: {
		id: "fog_effect",
		description: "Reduces strength of all ranged units to 1.",
		fn: async (context: BattlefieldContext): Promise<void> => {
			await Promise.all([
				context.player.ranged.applyWeatherEffect(),
				context.enemy.ranged.applyWeatherEffect(),
			]);
		},
	},

	rainEffect: {
		id: "rain_effect",
		description: "Reduces strength of all siege units to 1.",
		fn: async (context: BattlefieldContext): Promise<void> => {
			await Promise.all([
				context.player.siege.applyWeatherEffect(),
				context.enemy.siege.applyWeatherEffect(),
			]);
		},
	},

	forgingEffect: {
		id: "forging_effect",
		description: "Increases strength of melee units by 1.",
		fn: async (context: BattlefieldContext): Promise<void> => {
			context.player.melee.applyStrengthBoost(1);
		},
	},

	ironCastingEffect: {
		id: "iron_casting_effect",
		description: "Increases strength of melee units by 2.",
		fn: async (context: BattlefieldContext): Promise<void> => {
			context.player.melee.applyStrengthBoost(2);
		},
	},

	blastFurnaceEffect: {
		id: "blast_furnace_effect",
		description: "Increases strength of melee units by 3.",
		fn: async (context: BattlefieldContext): Promise<void> => {
			context.player.melee.applyStrengthBoost(3);
		},
	},

	fletchingEffect: {
		id: "fletching_effect",
		description: "Increases strength of ranged units by 1.",
		fn: async (context: BattlefieldContext): Promise<void> => {
			context.player.ranged.applyStrengthBoost(1);
		},
	},

	bodkinArrowEffect: {
		id: "bodkin_arrow_effect",
		description: "Increases strength of ranged units by 2.",
		fn: async (context: BattlefieldContext): Promise<void> => {
			context.player.ranged.applyStrengthBoost(2);
		},
	},

	bracerEffect: {
		id: "bracer_effect",
		description: "Increases strength of ranged units by 3.",
		fn: async (context: BattlefieldContext): Promise<void> => {
			context.player.ranged.applyStrengthBoost(3);
		},
	},
};
