import type { LoaderOptions } from "../../entities/loader";

export const options: LoaderOptions = {
	manifest: {
		bundles: [
			{
				name: "sprites",
				assets: {
					game_background: "./sprites/game_background.webp",
					loader: "./sprites/loader.png",
				},
			},
			{
				name: "card_assets",
				assets: {
					card_border: "./sprites/cards/card_border.png",
					card_back: "./sprites/cards/card_back.png",
					crossbowman: "./sprites/cards/card_faces/crossbowman.png",
					knight: "./sprites/cards/card_faces/knight.png",
					teutonic_knight: "./sprites/cards/card_faces/teutonic_knight.png",
					archer: "./sprites/cards/card_faces/archer.png",
					light_cavalry: "./sprites/cards/card_faces/light_cavalry.png",
					mangonel: "./sprites/cards/card_faces/mangonel.png",
					icon_melee: "./sprites/cards/icon_melee.png",
					icon_ranged: "./sprites/cards/icon_ranged.png",
					icon_ranged_melee: "./sprites/cards/icon_ranged_melee.png",
					icon_siege: "./sprites/cards/icon_siege.png",
				},
			},
			{
				name: "player_display",
				assets: {
					divider: "./sprites/player_display/divider.png",
					health_gold: "./sprites/player_display/health_gold.png",
					health_silver: "./sprites/player_display/health_silver.png",
				},
			},
		],
	},
};
