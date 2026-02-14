import type { LoaderOptions } from "../../entities/loader";

export const options: LoaderOptions = {
	manifest: {
		bundles: [
			{
				name: "sprites",
				assets: {
					game_background: "./sprites/game_background.webp",
					paper: "./sprites/paper.png",
					loader: "./sprites/loader.png",
				},
			},
			{
				name: "card_assets",
				assets: {
					card_border: "./sprites/cards/card_border.png",
					card_back: "./sprites/cards/card_back.png",
					card_preview_border: "./sprites/cards/card_preview_border.png",

					crossbowman: "./sprites/cards/card_faces/crossbowman.png",
					knight: "./sprites/cards/card_faces/knight.png",
					teutonic_knight: "./sprites/cards/card_faces/teutonic_knight.png",
					archer: "./sprites/cards/card_faces/archer.png",
					light_cavalry: "./sprites/cards/card_faces/light_cavalry.png",
					mangonel: "./sprites/cards/card_faces/mangonel.png",
					militia: "./sprites/cards/card_faces/militia.png",
					pikeman: "./sprites/cards/card_faces/pikeman.png",
					berserker: "./sprites/cards/card_faces/berserker.png",
					two_handed_swordsman:
						"./sprites/cards/card_faces/two_handed_swordsman.png",
					karambit_warrior: "./sprites/cards/card_faces/karambit_warrior.png",
					obuch: "./sprites/cards/card_faces/obuch.png",
					konnik: "./sprites/cards/card_faces/konnik.png",
					dismounted_konnik: "./sprites/cards/card_faces/dismounted_konnik.png",
					cavalry_archer: "./sprites/cards/card_faces/cavalry_archer.png",
					monaspa: "./sprites/cards/card_faces/monaspa.png",
					skirmisher: "./sprites/cards/card_faces/skirmisher.png",
					elite_skirmisher: "./sprites/cards/card_faces/elite_skirmisher.png",
					winged_hussar: "./sprites/cards/card_faces/winged_hussar.png",

					icon_melee: "./sprites/cards/icon_melee.png",
					icon_ranged: "./sprites/cards/icon_ranged.png",
					icon_siege: "./sprites/cards/icon_siege.png",

					clear: "./sprites/cards/card_faces/clear.png",
					rain: "./sprites/cards/card_faces/rain.png",
					frost: "./sprites/cards/card_faces/frost.png",
					fog: "./sprites/cards/card_faces/fog.png",
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
