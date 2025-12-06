import { Graphics } from "pixi.js";
import {
	CardContainer,
	CardType,
	HandContainer,
	PlayingRowContainer,
} from "../../entities/card";

export class GameSceneBuildHelper {
	private readonly _rowHeight: number;
	private readonly _rowWidth: number;
	private readonly _labelColor = 0xff6b6b;

	public constructor(rowHeight: number, rowWidth: number) {
		this._rowHeight = rowHeight;
		this._rowWidth = rowWidth;
	}

	public createPlayingRowContainer(
		containerType: CardType
	): PlayingRowContainer {
		return new PlayingRowContainer({
			width: this._rowWidth,
			height: this._rowHeight,
			labelColor: this._labelColor,
			containerType,
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

		const bg = new Graphics();
		const bgX = -width / 2;
		const bgY = -height / 2;

		bg.rect(bgX, bgY, width, height);
		bg.fill({ color: 0x2a2013, alpha: 0.3 });

		bg.stroke({ color: 0x8b6914, width: 3, alpha: 0.6 });
		bg.rect(bgX + 3, bgY + 3, width - 6, height - 6);
		bg.stroke({ color: 0xd4af37, width: 2, alpha: 0.4 });

		const discardPile = new CardContainer(width);
		discardPile.addChild(bg);
		discardPile.setCardsInteractive(false);

		return discardPile;
	}
}
