import { TextStyle } from "pixi.js";

export namespace FontStyles {
	export const scoreTextStyle: Partial<TextStyle> = {
		fontFamily: "Cinzel, serif",
		fontSize: 48,
		align: "center",
		fontWeight: "bold",
		fill: "#d1c072",
		stroke: {
			width: 1,
			color: "black",
		},
		dropShadow: {
			distance: 4,
			blur: 4,
			color: "black",
			alpha: 0.5,
			angle: 45,
		},
	};
}
