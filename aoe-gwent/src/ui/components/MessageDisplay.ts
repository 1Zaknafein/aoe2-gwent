import { PixiContainer, PixiGraphics, PixiText } from "../../plugins/engine";
import { gsap } from "gsap";
import { FillGradient } from "pixi.js";

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

	private static readonly DEFAULT_OPTIONS: Required<MessageDisplayOptions> = {
		width: 400,
		height: 200,
		padding: 20,
		backgroundColor: "#000000",
		textColor: "#ffffff",
		fontSize: 18,
		fontFamily: "Arial",
	};

	constructor(options: MessageDisplayOptions = {}) {
		super();

		this._options = { ...MessageDisplay.DEFAULT_OPTIONS, ...options };

		this.createBackground();
		this.createText();

		this.pivot.set(this._options.width / 2, this._options.height / 2);
		this.interactive = true;

		this.on("pointerdown", this.onPointerDown.bind(this));
	}

	/**
	 * Show a message with the specified text
	 */
	public showMessage(message: string): void {
		this.updateMessage(message);
		this.show();
	}

	/**
	 * Update the message displayed in the message display
	 */
	public updateMessage(message: string): void {
		this._messageText.text = message;
	}

	/**
	 * Show the message display with fade-in animation (0.3s), display for 5s, then fade out
	 */
	public show(): void {
		if (this._timeline) {
			this._timeline.kill();
		}

		this.visible = true;
		this.alpha = 0;

		this._timeline = gsap.timeline();

		this._timeline
			.to(this, {
				alpha: 1,
				duration: 0.5,
				ease: "power2.out",
			})
			.to(
				this,
				{
					alpha: 0,
					duration: 0.5,
					ease: "power2.in",
					onComplete: () => {
						this.visible = false;
					},
				},
				"+=1.5"
			);
	}

	/**
	 * Hide the message display with fade-out animation (0.3s)
	 */
	public hide(): void {
		if (this._timeline) {
			this._timeline.kill();
		}

		gsap.to(this, {
			alpha: 0,
			duration: 0.3,
			ease: "power2.in",
			onComplete: () => {
				this.visible = false;
			},
		});
	}

	/**
	 * Position the message display at the center of the given dimensions
	 */
	public centerOn(width: number, height: number): void {
		this.x = width / 2;
		this.y = height / 2;
	}

	private createBackground(): void {
		const { width, height, backgroundColor } = this._options;

		const gradient = new FillGradient(0, 0, width, 0);
		const fadeColor = backgroundColor + "00";

		gradient.addColorStop(0, fadeColor);
		gradient.addColorStop(0.1, backgroundColor);
		gradient.addColorStop(0.9, backgroundColor);
		gradient.addColorStop(1, fadeColor);

		this._background = new PixiGraphics();
		this._background.alpha = 0.8;
		this._background.rect(0, 0, width, height).fill(gradient);

		this.addChild(this._background);
	}

	private createText(): void {
		this._messageText = new PixiText({
			text: "",
			style: {
				fontFamily: this._options.fontFamily,
				fontSize: this._options.fontSize,
				fill: this._options.textColor,
				wordWrap: true,
				wordWrapWidth: this._options.width - this._options.padding * 2,
				align: "center",
			},
		});

		this._messageText.anchor.set(0.5);
		this._messageText.x = this._options.width / 2;
		this._messageText.y = this._options.height / 2;

		this.addChild(this._messageText);
	}

	private onPointerDown(event: any): void {
		event.stopPropagation();
	}
}
