import { Graphics } from "pixi.js";
import {
	CardContainer,
	CardContainerLayoutType,
	CardType,
	HandContainer,
	PlayingRowContainer,
} from "../../entities/card";
import { BorderDialog } from "../components/BorderDialog";

export class GameSceneBuildHelper {
	private readonly _rowHeight: number;
	private readonly _rowWidth: number;
	private readonly _labelColor = 0xfbda7e;

	public constructor(rowHeight: number, rowWidth: number) {
		this._rowHeight = rowHeight;
		this._rowWidth = rowWidth;
	}

	public createPlayingRowContainer(
		containerType: CardType,
		label: string
	): PlayingRowContainer {
		return new PlayingRowContainer({
			width: this._rowWidth,
			height: this._rowHeight,
			labelColor: this._labelColor,
			containerType,
			label,
		});
	}

	public createHandContainer(isPlayer: boolean): HandContainer {
		return new HandContainer({
			width: this._rowWidth,
			height: 180,
			labelColor: 0xd4af37,
			borderColor: 0x8b6914,
			backgroundColor: 0x2a2013,
			isInteractive: isPlayer,
		});
	}

	public createWeatherRowContainer(): CardContainer {
		return new CardContainer(260, CardType.WEATHER);
	}

	public createDivider(centerX: number, y: number, width: number): Graphics {
		const divider = new Graphics();
		const fadeWidth = 150;
		const lineStart = centerX - width / 2;
		const lineEnd = centerX + width / 2;

		// Main solid line in the center
		divider.moveTo(lineStart + fadeWidth, y);
		divider.lineTo(lineEnd - fadeWidth, y);
		divider.stroke({ color: 0xffd700, width: 3, alpha: 1.0 });

		// TODO Draw this properly/replace with asset.

		// Left fade - draw segments with increasing alpha
		for (let i = 0; i < fadeWidth; i += 5) {
			const alpha = i / fadeWidth;
			divider.moveTo(lineStart + i, y);
			divider.lineTo(lineStart + i + 5, y);
			divider.stroke({ color: 0xffd700, width: 3, alpha: alpha });
		}

		// Right fade - draw segments with decreasing alpha
		for (let i = 0; i < fadeWidth; i += 5) {
			const alpha = i / fadeWidth;
			divider.moveTo(lineEnd - i - 5, y);
			divider.lineTo(lineEnd - i, y);
			divider.stroke({ color: 0xffd700, width: 3, alpha: alpha });
		}

		return divider;
	}

	public createDiscardPile(): CardContainer {
		const width = 130;
		const height = 175;

		const bg = new BorderDialog(width, height);
		bg.pivot.set(bg.width / 2, bg.height / 2);

		const discardPile = new CardContainer(
			width,
			undefined,
			CardContainerLayoutType.STACK,
			0.6
		);
		discardPile.addChild(bg);
		discardPile.setCardsInteractive(false);

		return discardPile;
	}
}
