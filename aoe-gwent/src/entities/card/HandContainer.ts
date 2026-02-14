import { Container } from "pixi.js";
import { PixiGraphics } from "../../plugins/engine";
import { CardContainer, CardContainerLayoutType } from "./CardContainer";
import { BorderDialog } from "../../ui/components/BorderDialog";

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
	private background: Container;
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

		this.background = new BorderDialog(config.width, config.height);
		this.background.pivot.set(
			this.background.width / 2,
			this.background.height / 2
		);

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
}
