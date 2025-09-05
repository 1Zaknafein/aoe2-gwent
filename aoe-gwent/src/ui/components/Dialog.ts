import { PixiContainer, PixiGraphics, PixiText } from "../../plugins/engine";

export interface DialogOptions {
	width?: number;
	height?: number;
	padding?: number;
	backgroundColor?: number;
	textColor?: number;
	fontSize?: number;
	fontFamily?: string;
}

export class Dialog extends PixiContainer {
	private _background!: PixiGraphics;
	private _messageText!: PixiText;
	private _options: Required<DialogOptions>;

	private static readonly DEFAULT_OPTIONS: Required<DialogOptions> = {
		width: 400,
		height: 200,
		padding: 20,
		backgroundColor: 0x000000,
		textColor: 0xffffff,
		fontSize: 18,
		fontFamily: "Arial",
	};

	constructor(message: string, options: DialogOptions = {}) {
		super();

		this._options = { ...Dialog.DEFAULT_OPTIONS, ...options };

		this.createBackground();
		this.createText(message);
		this.centerDialog();

		// Make the dialog interactive to prevent clicks from going through
		this.interactive = true;
		this.on("pointerdown", this.onPointerDown.bind(this));
	}

	private createBackground(): void {
		this._background = new PixiGraphics();

		// Create the main dark background
		this._background
			.rect(0, 0, this._options.width, this._options.height)
			.fill(this._options.backgroundColor);

		// Create gradient overlay for fade effect on left and right
		const gradientWidth = 50;

		// Left gradient (fade from transparent to opaque)
		const leftGradient = new PixiGraphics();
		for (let i = 0; i < gradientWidth; i++) {
			const alpha = i / gradientWidth;
			leftGradient
				.rect(i, 0, 1, this._options.height)
				.fill({ color: this._options.backgroundColor, alpha: alpha });
		}

		// Right gradient (fade from opaque to transparent)
		const rightGradient = new PixiGraphics();
		for (let i = 0; i < gradientWidth; i++) {
			const alpha = 1 - i / gradientWidth;
			rightGradient
				.rect(
					this._options.width - gradientWidth + i,
					0,
					1,
					this._options.height
				)
				.fill({ color: this._options.backgroundColor, alpha: alpha });
		}

		this.addChild(this._background);
		this.addChild(leftGradient);
		this.addChild(rightGradient);
	}

	private createText(message: string): void {
		this._messageText = new PixiText({
			text: message,
			style: {
				fontFamily: this._options.fontFamily,
				fontSize: this._options.fontSize,
				fill: this._options.textColor,
				wordWrap: true,
				wordWrapWidth: this._options.width - this._options.padding * 2,
				align: "center",
			},
		});

		// Center the text within the dialog
		this._messageText.x = this._options.padding;
		this._messageText.y = (this._options.height - this._messageText.height) / 2;

		this.addChild(this._messageText);
	}

	private centerDialog(): void {
		// This will be called when added to a scene to center the dialog
		this.pivot.set(this._options.width / 2, this._options.height / 2);
	}

	private onPointerDown(event: any): void {
		// Prevent the event from bubbling up to prevent clicks going through the dialog
		event.stopPropagation();
	}

	/**
	 * Update the message displayed in the dialog
	 */
	public updateMessage(message: string): void {
		this._messageText.text = message;
		// Re-center the text vertically
		this._messageText.y = (this._options.height - this._messageText.height) / 2;
	}

	/**
	 * Show the dialog with optional fade-in animation
	 */
	public show(): void {
		this.visible = true;
		this.alpha = 0;

		// Simple fade-in animation
		const fadeIn = () => {
			this.alpha += 0.1;
			if (this.alpha < 1) {
				requestAnimationFrame(fadeIn);
			} else {
				this.alpha = 1;
			}
		};
		fadeIn();
	}

	/**
	 * Hide the dialog with optional fade-out animation
	 */
	public hide(): void {
		const fadeOut = () => {
			this.alpha -= 0.1;
			if (this.alpha > 0) {
				requestAnimationFrame(fadeOut);
			} else {
				this.alpha = 0;
				this.visible = false;
			}
		};
		fadeOut();
	}

	/**
	 * Position the dialog at the center of the given dimensions
	 */
	public centerOn(width: number, height: number): void {
		this.x = width / 2;
		this.y = height / 2;
	}
}
