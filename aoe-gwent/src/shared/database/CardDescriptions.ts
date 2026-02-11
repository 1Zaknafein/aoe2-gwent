import { CardEffect } from "../../local-server/CardDatabase";

/**
 * Card descriptions database using card names as keys
 */
export const CardDescriptions: Record<string, string> = {
	// Weather Cards
	Frost:
		"A biting cold freezes the battlefield, severely hampering melee combat.",
	Fog: "Dense fog rolls in, making it nearly impossible for archers to see their targets.",
	Rain: "Heavy rain renders siege weapons ineffective, as powder and mechanisms become waterlogged.",
	Clear:
		"The skies clear and the weather returns to normal, removing all weather effects from the battlefield.",
};

/**
 * Effect descriptions for card abilities
 */
export const EffectDescriptions: Record<CardEffect, string> = {
	[CardEffect.FREEZE]: "Reduces the strength of all Melee units to 1.",
	[CardEffect.FOG]: "Reduces the strength of all Ranged units to 1.",
	[CardEffect.RAIN]: "Reduces the strength of all Siege units to 1.",
	[CardEffect.CLEAR]: "Removes all weather effects from the battlefield.",
	[CardEffect.BOOST]: "Increases the strength of all units in the same row.",
};
