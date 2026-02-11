import { Text, TextStyle } from "pixi.js";
import { PixiGraphics, PixiSprite } from "../../plugins/engine";
import { CardContainer, CardContainerLayoutType } from "./CardContainer";
import { WeatherEffect } from "./WeatherEffect";
import { gsap } from "gsap";
import { CardEffect, CardType } from "../../local-server/CardDatabase";

export interface PlayingRowConfig {
	width: number;
	height: number;
	labelColor: number;
	containerType: CardType;
}

/**
 * Specialized container for playing rows (Melee, Ranged, Siege).
 */
export class PlayingRowContainer extends CardContainer {
	private rowBackground: PixiGraphics;
	private highlightOverlay: PixiGraphics;
	private weatherEffect: WeatherEffect;
	private typeIcon: PixiSprite;
	private scoreText: Text;
	private config: PlayingRowConfig;
	private _score = 0;
	private _weatherEffectApplied = false;

	constructor(config: PlayingRowConfig) {
		super(
			config.width - 200, // Card area width (leaving space for label and score)
			config.containerType,
			CardContainerLayoutType.SPREAD,
			0.5 // Cards in playing rows are scaled to 0.5
		);

		this.config = config;

		this.rowBackground = this.createBackground();
		this.highlightOverlay = this.createHighlight();

		// Determine weather effect based on container type
		let weatherEffect: CardEffect;
		switch (config.containerType) {
			case CardType.MELEE:
				weatherEffect = CardEffect.FREEZE;
				break;
			case CardType.RANGED:
				weatherEffect = CardEffect.FOG;
				break;
			case CardType.SIEGE:
				weatherEffect = CardEffect.RAIN;
				break;
			default:
				weatherEffect = CardEffect.FREEZE;
		}

		this.weatherEffect = new WeatherEffect(
			weatherEffect,
			config.width,
			config.height
		);

		this.typeIcon = this.createTypeIcon();
		this.scoreText = this.createScoreText();

		this.addChildAt(this.rowBackground, 0);
		this.addChild(this.highlightOverlay);
		this.addChild(this.typeIcon);
		this.addChild(this.scoreText);
		this.addChild(this.weatherEffect); // Add weather effect last so it's on top

		this.setCardsInteractive(false);

		this.on("cardAdded", () => {
			this.updateScore();
			this.setChildIndex(this.weatherEffect, this.children.length - 1);
		});

		this.on("cardRemoved", () => {
			this.updateScore();
		});
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
			},
		});
	}

	/**
	 * Update the score display based on cards in the row
	 */
	public updateScore(): void {
		let newScore = 0;

		this.getAllCards().forEach((card) => {
			let cardScore = card.cardData.baseScore || card.cardData.score;

			// Weather causes all unit cards to have score 1.
			if (this._weatherEffectApplied) {
				cardScore = 1;
			}

			card.setScore(cardScore);
			newScore += cardScore;
		});

		this.scoreText.text = newScore.toString();
		this._score = newScore;

		this.emit("scoreUpdated", { container: this, score: newScore });
	}

	/**
	 * Get the current score
	 */
	public get score(): number {
		return this._score;
	}

	/**
	 * Apply weather effect overlay to the row
	 */
	public applyWeatherEffect(): void {
		this.weatherEffect.show();
		this._weatherEffectApplied = true;

		this.updateScore();
	}

	/**
	 * Remove weather effect overlay from the row
	 */
	public clearWeatherEffect(): void {
		this.weatherEffect.hide();
		this._weatherEffectApplied = false;

		this.updateScore();
	}

	private createBackground(): PixiGraphics {
		const bg = new PixiGraphics();
		const { width, height } = this.config;
		const bgX = -width / 2;
		const bgY = -height / 2;

		// Main background
		bg.rect(bgX, bgY, width, height);
		bg.fill({ color: 0x654321, alpha: 0.3 });

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
		bg.lineTo(
			bgX + width - cornerInset - cornerSize,
			bgY + height - cornerInset
		);
		bg.moveTo(bgX + width - cornerInset, bgY + height - cornerInset);
		bg.lineTo(
			bgX + width - cornerInset,
			bgY + height - cornerInset - cornerSize
		);

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
		highlight.eventMode = "none"; // Don't block pointer events

		return highlight;
	}

	private createTypeIcon(): PixiSprite {
		const { width, containerType } = this.config;
		const bgX = -width / 2;

		// Map card type to icon sprite name
		let iconName: string;
		switch (containerType) {
			case CardType.MELEE:
				iconName = "icon_melee";
				break;
			case CardType.RANGED:
				iconName = "icon_ranged";
				break;
			case CardType.SIEGE:
				iconName = "icon_siege";
				break;
			default:
				iconName = "icon_melee";
		}

		const icon = PixiSprite.from(iconName);
		icon.anchor.set(0, 0.5);
		icon.position.set(bgX + 20, 0);
		icon.scale.set(1.5); // Scale up the icon
		icon.alpha = 0.3; // Low opacity as requested

		return icon;
	}

	private createScoreText(): Text {
		const { width, labelColor } = this.config;
		const bgX = -width / 2;

		const scoreStyle = new TextStyle({
			fontFamily: "Cinzel, serif",
			fontSize: 48,
			fill: labelColor,
			fontWeight: "bold",
		});

		const score = new Text({ text: "0", style: scoreStyle });
		score.position.set(bgX + width - 60, 0);
		score.anchor.set(0.5);

		return score;
	}
}
