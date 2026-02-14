import { Container, Graphics, Sprite } from "pixi.js";
import { PixiGraphics } from "../../plugins/engine";
import { CardContainer, CardContainerLayoutType } from "./CardContainer";
import { gsap } from "gsap";
import { PlayingRowConfig } from "./PlayingRowContainer";
import { BorderDialog } from "../../ui/components/BorderDialog";

type WeatherRowConfig = Omit<PlayingRowConfig, "labelColor">;

/**
 * Specialized container for playing rows (Melee, Ranged, Siege) with decorative graphics,
 * highlighting support, labels, and score displays.
 */
export class WeatherRowContainer extends CardContainer {
	private rowBackground: Container;
	private highlightOverlay: Graphics;
	private config: WeatherRowConfig;

	constructor(config: WeatherRowConfig) {
		super(
			config.width,
			config.containerType,
			CardContainerLayoutType.SPREAD,
			0.5
		);

		this.config = config;

		this.rowBackground = new BorderDialog(config.width, config.height);
		this.rowBackground.pivot.set(
			this.rowBackground.width / 2,
			this.rowBackground.height / 2
		);

		this.highlightOverlay = this.createHighlight();

		const typeIcon = Sprite.from("icon_weather");
		typeIcon.anchor.set(0.5);
		typeIcon.x = -config.width / 2 + 60;
		typeIcon.alpha = 0.3;

		this.addChild(this.rowBackground, typeIcon, this.highlightOverlay);

		this.setCardsInteractive(false);
	}

	/**
	 * Show the highlight overlay
	 */
	public showHighlight(): void {
		gsap.killTweensOf(this.highlightOverlay);

		this.highlightOverlay.visible = true;
		this.highlightOverlay.alpha = 0.3;
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
