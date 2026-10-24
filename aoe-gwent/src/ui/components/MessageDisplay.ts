import { gsap } from "gsap";
import { FillGradient, Graphics } from "pixi.js";
import { PixiContainer, PixiGraphics, PixiText } from "../../plugins/engine";

export interface MessageDisplayOptions {
	width?: number;
	height?: number;
	padding?: number;
	backgroundColor?: string;
	textColor?: string;
	fontSize?: number;
	fontFamily?: string;
}

export class MessageDisplay extends PixiContainer {
	private _background!: PixiGraphics;
	private _messageText!: PixiText;
	private _options: Required<MessageDisplayOptions>;
	private _timeline?: gsap.core.Timeline;

	private readonly defaultOptions: Required<MessageDisplayOptions> = {
		width: 1200,
		height: 300,
		padding: 100,
		backgroundColor: "#000000",
		textColor: "#e8d4a0",
		fontSize: 58,
		fontFamily: "Cinzel, serif",
	};

	constructor(options: MessageDisplayOptions) {
		super();

		this._options = { ...this.defaultOptions, ...options };

		this.createBackground();
		this.createText();

		this.pivot.set(this._options.width / 2, this._options.height / 2);
		this.interactive = false;
		this.eventMode = "none";

		this.alpha = 0;
		this.visible = false;
	}

	/**
	 * Show a message with the specified text
	 */
	public async showMessage(
		message: string,
		onComplete?: () => void
	): Promise<void> {
		this._messageText.text = message;

		await this.show(onComplete);
	}

	/**
	 * Show the message display with fade-in animation (0.3s), display for 5s, then fade out
	 */
	public show(onComplete?: () => void): GSAPTimeline {
		if (this._timeline) {
			this._timeline.kill();
		}

		this.visible = true;
		this.alpha = 0;

		this._timeline = gsap.timeline();

		this._timeline
			.to(this, {
				alpha: 1,
				duration: 0.4,
				ease: "power2.out",
			})
			.to(
				this,
				{
					alpha: 0,
					duration: 0.4,
					ease: "power2.in",
				},
				"+=0.3"
			);

		if (onComplete) {
			this._timeline.add(() => onComplete());
		}

		return this._timeline;
	}

	private createBackground(): void {
		const { width, height, backgroundColor } = this._options;

		const fadeColor = backgroundColor + "00";

		const gradient = new FillGradient({
			type: "linear",
			start: { x: 0, y: 0 },
			end: { x: 1, y: 0 },
			colorStops: [
				{ offset: 0, color: fadeColor },
				{ offset: 0.15, color: backgroundColor },
				{ offset: 0.85, color: backgroundColor },
				{ offset: 1, color: fadeColor },
			],
		});

		this._background = new Graphics();
		this._background.alpha = 0.9;
		this._background.rect(0, 0, width, height).fill(gradient);

		this.addChild(this._background);
	}

	private createText(): void {
		const { fontFamily, fontSize, textColor, width, height, padding } =
			this._options;

		this._messageText = new PixiText({
			text: "",
			style: {
				fontFamily: fontFamily,
				fontSize: fontSize,
				fontWeight: "600",
				letterSpacing: 2,
				fill: textColor,
				align: "center",
				wordWrap: true,
				wordWrapWidth: width - padding * 2,
				dropShadow: {
					distance: 3,
					blur: 4,
					color: "black",
					alpha: 0.6,
					angle: 45,
				},
			},
		});

		this._messageText.anchor.set(0.5);
		this._messageText.x = width / 2;
		this._messageText.y = height / 2;

		this.addChild(this._messageText);
	}
}
