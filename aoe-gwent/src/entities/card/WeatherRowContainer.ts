import { Graphics } from "pixi.js";
import { PixiGraphics } from "../../plugins/engine";
import { CardContainer } from "./CardContainer";
import { gsap } from "gsap";
import { PlayingRowConfig } from "./PlayingRowContainer";

type WeatherRowConfig = Omit<PlayingRowConfig, "labelColor">;

/**
 * Specialized container for playing rows (Melee, Ranged, Siege) with decorative graphics,
 * highlighting support, labels, and score displays.
 */
export class WeatherRowContainer extends CardContainer {
	private rowBackground: PixiGraphics;
	private highlightOverlay: PixiGraphics;
	private config: WeatherRowConfig;

	constructor(config: WeatherRowConfig) {
		super(config.width - 200, config.containerType);

		this.config = config;

		this.rowBackground = this.createBackground();
		this.highlightOverlay = this.createHighlight();

		this.addChild(this.rowBackground, this.highlightOverlay);

		this.setCardsInteractive(false);
	}

	/**
	 * Show the highlight overlay
	 */
	public showHighlight(): void {
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
			},
		});
	}

	private createBackground(): Graphics {
		const weatherWidth = 350;
		const weatherHeight = 130;

		const bg = new Graphics();
		const bgX = -weatherWidth / 2;
		const bgY = -weatherHeight / 2;

		bg.rect(bgX, bgY, weatherWidth, weatherHeight);
		bg.fill({ color: 0x2a2013, alpha: 0.3 });

		bg.stroke({ color: 0x8b6914, width: 3, alpha: 0.6 });
		bg.rect(bgX + 3, bgY + 3, weatherWidth - 6, weatherHeight - 6);
		bg.stroke({ color: 0xd4af37, width: 2, alpha: 0.4 });

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
		highlight.eventMode = "none"; // Don't block pointer events

		return highlight;
	}
}
