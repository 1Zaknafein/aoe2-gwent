import { Text, TextStyle } from "pixi.js";
import { PixiGraphics, PixiSprite } from "../../plugins/engine";
import { CardContainer, CardContainerLayoutType } from "./CardContainer";
import { CardType } from "../../shared/types/CardTypes";
import { gsap } from "gsap";

export interface PlayingRowConfig {
	width: number;
	height: number;
	labelText: string;
	labelColor: number;
	containerType: CardType;
}

/**
 * Specialized container for playing rows (Melee, Ranged, Siege) with decorative graphics,
 * highlighting support, labels, and score displays.
 */
export class PlayingRowContainer extends CardContainer {
	private rowBackground: PixiGraphics;
	private highlightOverlay: PixiGraphics;
	private typeIcon: PixiSprite;
	private scoreText: Text;
	private config: PlayingRowConfig;

	constructor(config: PlayingRowConfig) {
		super(
			config.width - 200, // Card area width (leaving space for label and score)
			config.labelText,
			config.containerType,
			CardContainerLayoutType.SPREAD,
			0.5 // Cards in playing rows are scaled to 0.5
		);

		this.config = config;

		// Create all visual components
		this.rowBackground = this.createBackground();
		this.highlightOverlay = this.createHighlight();
		this.typeIcon = this.createTypeIcon();
		this.scoreText = this.createScore();

		// Add to container in correct order (background first, then cards, then overlays)
		this.addChildAt(this.rowBackground, 0);
		this.addChild(this.highlightOverlay);
		this.addChild(this.typeIcon);
		this.addChild(this.scoreText);

		// Cards are not interactive by default in playing rows
		this.setCardsInteractive(false);
	}

		/**
	 * Show the highlight overlay
	 */
	public showHighlight(): void {
		// Kill any existing animations first to prevent conflicts
		gsap.killTweensOf(this.highlightOverlay);
		
		this.highlightOverlay.visible = true;
		this.highlightOverlay.alpha = 0.4;
	}

	/**
	 * Hide the highlight overlay
	 */
	public hideHighlight(): void {
		gsap.killTweensOf(this.highlightOverlay);

		gsap.to(this.highlightOverlay, {
			alpha: 0,
			duration: 0.2,
			ease: "power2.out",
			onComplete: () => {
				this.highlightOverlay.visible = false;
			}
		});
	}

	/**
	 * Update the score display based on cards in the row
	 */
	public updateScore(): void {
		let newScore = 0;

		this.getAllCards().forEach(card => {
			newScore += card.cardData.score;
		});

		
		this.scoreText.text = newScore.toString();
	}

	/**
	 * Get the current score
	 */
	public getScore(): number {
		let totalScore = 0;
		this.getAllCards().forEach(card => {
			totalScore += card.cardData.score;
		});
		return totalScore;
	}

	private createBackground(): PixiGraphics {
		const bg = new PixiGraphics();
		const { width, height } = this.config;
		const bgX = -width / 2;
		const bgY = -height / 2;

		// Main background
		bg.rect(bgX, bgY, width, height);
		bg.fill({ color: 0x654321, alpha: 0.2 });

		// Decorative double border
		bg.stroke({ color: 0x8b6914, width: 3, alpha: 0.6 });
		bg.rect(bgX + 3, bgY + 3, width - 6, height - 6);
		bg.stroke({ color: 0xd4af37, width: 2, alpha: 0.4 });

		// Corner decorations
		const cornerSize = 15;
		const cornerInset = 10;

		// Top-left corner
		bg.moveTo(bgX + cornerInset, bgY + cornerInset);
		bg.lineTo(bgX + cornerInset + cornerSize, bgY + cornerInset);
		bg.moveTo(bgX + cornerInset, bgY + cornerInset);
		bg.lineTo(bgX + cornerInset, bgY + cornerInset + cornerSize);

		// Top-right corner
		bg.moveTo(bgX + width - cornerInset, bgY + cornerInset);
		bg.lineTo(bgX + width - cornerInset - cornerSize, bgY + cornerInset);
		bg.moveTo(bgX + width - cornerInset, bgY + cornerInset);
		bg.lineTo(bgX + width - cornerInset, bgY + cornerInset + cornerSize);

		// Bottom-left corner
		bg.moveTo(bgX + cornerInset, bgY + height - cornerInset);
		bg.lineTo(bgX + cornerInset + cornerSize, bgY + height - cornerInset);
		bg.moveTo(bgX + cornerInset, bgY + height - cornerInset);
		bg.lineTo(bgX + cornerInset, bgY + height - cornerInset - cornerSize);

		// Bottom-right corner
		bg.moveTo(bgX + width - cornerInset, bgY + height - cornerInset);
		bg.lineTo(bgX + width - cornerInset - cornerSize, bgY + height - cornerInset);
		bg.moveTo(bgX + width - cornerInset, bgY + height - cornerInset);
		bg.lineTo(bgX + width - cornerInset, bgY + height - cornerInset - cornerSize);

		bg.stroke({ color: 0xffd700, width: 2, alpha: 0.5 });

		return bg;
	}

	private createHighlight(): PixiGraphics {
		const highlight = new PixiGraphics();
		const { width, height } = this.config;
		const bgX = -width / 2;
		const bgY = -height / 2;

		highlight.rect(bgX, bgY, width, height);
		highlight.fill({ color: 0x00ff00, alpha: 0.15 });
		highlight.stroke({ color: 0x00ff00, width: 3, alpha: 0.6 });
		highlight.visible = false;
		highlight.eventMode = 'none'; // Don't block pointer events

		return highlight;
	}

	private createTypeIcon(): PixiSprite {
		const { width, containerType } = this.config;
		const bgX = -width / 2;

		// Map card type to icon sprite name
		let iconName: string;
		switch (containerType) {
			case CardType.MELEE:
				iconName = 'icon_melee';
				break;
			case CardType.RANGED:
				iconName = 'icon_ranged';
				break;
			case CardType.SIEGE:
				iconName = 'icon_siege';
				break;
			default:
				iconName = 'icon_melee';
		}

		const icon = PixiSprite.from(iconName);
		icon.anchor.set(0, 0.5);
		icon.position.set(bgX + 20, 0);
		icon.scale.set(1.5); // Scale up the icon
		icon.alpha = 0.3; // Low opacity as requested

		return icon;
	}

	private createScore(): Text {
		const { width, labelColor } = this.config;
		const bgX = -width / 2;

		const scoreStyle = new TextStyle({
			fontFamily: 'Cinzel, serif',
			fontSize: 48,
			fill: labelColor,
			fontWeight: 'bold'
		});

		const score = new Text({ text: '0', style: scoreStyle });
		score.position.set(bgX + width - 60, 0);
		score.anchor.set(0.5);

		return score;
	}


}
