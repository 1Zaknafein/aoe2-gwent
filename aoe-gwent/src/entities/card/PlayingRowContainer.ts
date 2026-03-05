import { gsap } from "gsap";
import { BloomFilter } from "pixi-filters";
import { Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import { CardEffect, CardType } from "../../local-server/CardDatabase";
import { PixiGraphics, PixiSprite } from "../../plugins/engine";
import { BorderDialog } from "../../ui/components/BorderDialog";
import { CardContainer, CardContainerLayoutType } from "./CardContainer";
import { WeatherEffect } from "./WeatherEffect";

export interface PlayingRowConfig {
	label: string;
	width: number;
	height: number;
	labelColor: number;
	containerType: CardType;
}

/**
 * Specialized container for playing rows (Melee, Ranged, Siege).
 */
export class PlayingRowContainer extends CardContainer {
	public weatherEffectApplied = false;
	public strengthBoost = 0;

	private rowBackground: Container;
	private highlightOverlay: Graphics;
	private weatherEffect: WeatherEffect;
	private typeIcon: Sprite;
	private scoreText: Text;
	private config: PlayingRowConfig;

	private bloomFilter: BloomFilter;

	private _score = 0;

	constructor(config: PlayingRowConfig) {
		super(
			config.width - 200,
			config.containerType,
			CardContainerLayoutType.SPREAD,
			0.52
		);

		this.label = config.label;
		this.config = config;

		this.bloomFilter = new BloomFilter({
			quality: 1,
			strength: 2,
		});

		this.rowBackground = new BorderDialog(config.width, config.height);
		this.rowBackground.pivot.set(
			this.rowBackground.width / 2,
			this.rowBackground.height / 2
		);

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
			this.highlightOverlay.width,
			this.highlightOverlay.height
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
			this.setChildIndex(this.weatherEffect, this.children.length - 1);
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
		const newScore = this.cards.reduce((score, card) => {
			return score + card.cardData.score;
		}, 0);

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
	public async applyWeatherEffect(): Promise<void> {
		this.weatherEffectApplied = true;
		await this.weatherEffect.show();
	}

	/**
	 * Remove weather effect overlay from the row
	 */
	public async clearWeatherEffect(): Promise<void> {
		await this.weatherEffect.hide();
		this.weatherEffectApplied = false;
	}

	public async applyStrengthBoost(boostAmount: 1 | 2 | 3): Promise<void> {
		if (this.strengthBoost >= boostAmount) {
			return;
		}

		this.strengthBoost = boostAmount;

		const extraAlpha = 0.2 * boostAmount;

		let boostColor = "";

		switch (boostAmount) {
			case 1:
				boostColor = "#ffffff";
				break;
			case 2:
				boostColor = "#ffe058";
				break;
			case 3:
				boostColor = "#fc5454";
				break;
		}

		this.typeIcon.tint = boostColor;
		this.typeIcon.alpha = 0.3 + extraAlpha;
		this.typeIcon.filters = [this.bloomFilter];
	}

	public async clearStrengthBoost(): Promise<void> {
		this.strengthBoost = 0;

		this.typeIcon.tint = 0xffffff;
		this.typeIcon.alpha = 0.3;
		this.typeIcon.filters = [];
	}

	private createHighlight(): PixiGraphics {
		const highlight = new PixiGraphics();
		const { width, height } = this.config;

		// Scale down slightly, to account for border.
		const overlayWidth = width - 19;
		const overlayHeight = height - 21;
		const bgX = -overlayWidth / 2;
		const bgY = -overlayHeight / 2;

		highlight.rect(bgX, bgY, overlayWidth, overlayHeight);
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

		const icon = Sprite.from(iconName);
		icon.scale.set(0.9);
		icon.anchor.set(0.5);
		icon.position.set(bgX + 65, 0);
		icon.alpha = 0.3;

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
