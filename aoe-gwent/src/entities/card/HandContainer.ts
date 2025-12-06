import { PixiGraphics } from "../../plugins/engine";
import { CardContainer, CardContainerLayoutType } from "./CardContainer";

export interface HandContainerConfig {
	width: number;
	height: number;
	labelColor: number;
	backgroundColor: number;
	borderColor: number;
	isInteractive?: boolean;
}

/**
 * Specialized container for player/opponent hands with simpler styling
 */
export class HandContainer extends CardContainer {
	private background: PixiGraphics;
	private config: HandContainerConfig;
	private static readonly ASSUMED_CARD_HEIGHT = 250;

	constructor(config: HandContainerConfig) {
		const availableHeight = config.height;
		const calculatedCardScale =
			availableHeight / HandContainer.ASSUMED_CARD_HEIGHT;

		super(
			config.width - 40,
			undefined, // No type restriction for hands
			CardContainerLayoutType.SPREAD,
			calculatedCardScale
		);

		this.config = config;

		this.background = this.createBackground();

		this.addChildAt(this.background, 0);

		this.setCardsInteractive(config.isInteractive ?? true);
	}

	/**
	 * Hide all cards, so only card backs are visible.
	 */
	public hideCards(): void {
		this.cards.forEach((card) => {
			card.showBack();
		});
	}

	private createBackground(): PixiGraphics {
		const bg = new PixiGraphics();
		const { width, height } = this.config;
		const bgX = -width / 2;
		const bgY = -height / 2;

		// Base dark background
		bg.rect(bgX, bgY, width, height);
		bg.fill({ color: 0x2a2013, alpha: 0.3 });

		// Double border (similar to playing rows)
		bg.rect(bgX, bgY, width, height);
		bg.stroke({ color: 0x8b6914, width: 3, alpha: 0.8 });

		bg.rect(bgX + 3, bgY + 3, width - 6, height - 6);
		bg.stroke({ color: 0xd4af37, width: 2, alpha: 0.6 });

		return bg;
	}
}
