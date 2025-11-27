import { Text, TextStyle } from "pixi.js";
import { PixiGraphics } from "../../plugins/engine";
import { CardContainer, CardContainerLayoutType } from "./CardContainer";

export interface HandContainerConfig {
	width: number;
	height: number;
	labelText: string;
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
	private labelText: Text;
	private config: HandContainerConfig;
	private static readonly ASSUMED_CARD_HEIGHT = 250; // Typical card sprite height
	private static readonly CARD_PADDING = 0; // Padding from container edges

	constructor(config: HandContainerConfig) {
		// Calculate card scale to fit within the container height
		// Leave some padding so cards don't touch the edges
		const availableHeight = config.height - HandContainer.CARD_PADDING * 2;
		const calculatedCardScale = availableHeight / HandContainer.ASSUMED_CARD_HEIGHT;
		
		super(
			config.width - 40, // Card area width
			config.labelText,
			undefined, // No type restriction for hands
			CardContainerLayoutType.SPREAD,
			calculatedCardScale // Scale cards to fit the container height
		);

		this.config = config;

		// Create visual components
		this.background = this.createBackground();
		this.labelText = this.createLabel();

		// Add to container in correct order
		this.addChildAt(this.background, 0);
		this.addChild(this.labelText);

		// Set interactivity based on config (typically false for opponent, true for player)
		this.setCardsInteractive(config.isInteractive ?? true);
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

	private createLabel(): Text {
		const { width, height, labelText, labelColor } = this.config;
		const bgX = -width / 2;
		const bgY = -height / 2;

		const labelStyle = new TextStyle({
			fontFamily: 'Cinzel, serif',
			fontSize: 12,
			fill: labelColor,
			fontWeight: 'bold'
		});

		const label = new Text({ text: labelText.toUpperCase(), style: labelStyle });
		label.position.set(bgX + 10, bgY + 5);
		label.alpha = 0.7;

		return label;
	}

	/**
	 * Get the card count for display purposes
	 */
	public getCardCount(): number {
		return this.cardCount;
	}
}
