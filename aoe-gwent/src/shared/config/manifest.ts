import type { LoaderOptions } from "../../entities/loader";

export const options: LoaderOptions = {
	manifest: {
		bundles: [
			{
				name: "sprites",
				assets: {
					background: "./sprites/background.webp",
				},
			},
			{
				name: "card_assets",
				assets: {
					card_border: "./cards/card_border.png",
					card_back: "./cards/card_back.png",
					archer: "./cards/card_faces/archer.png",
					knight: "./cards/card_faces/knight.png",
					mangonel: "./cards/card_faces/mangonel.png",
					icon_melee: "./cards/icon_melee.png",
					icon_ranged: "./cards/icon_ranged.png",
					icon_ranged_melee: "./cards/icon_ranged_melee.png",
					icon_siege: "./cards/icon_siege.png",
				},
			},
		],
	},
};
