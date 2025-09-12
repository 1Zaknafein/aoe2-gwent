import { PixiGraphics, PixiText } from "../../plugins/engine";
import { Button } from "./Button";

export class DebugButton extends Button {
	private _background: PixiGraphics;
	private _label: PixiText;

	constructor(
		text: string,
		onClick: () => void,
		width: number = 150,
		height: number = 40
	) {
		super(onClick, width, height);

		this._background = new PixiGraphics();
		this._background.rect(0, 0, width, height).fill(0x4a90e2);
		this.addChild(this._background);

		this._label = new PixiText({
			text: text,
			style: {
				fontFamily: "Arial",
				fontSize: 16,
				fontWeight: "bold",
				fill: 0xffffff,
			},
		});

		this._label.x = (width - this._label.width) / 2;
		this._label.y = (height - this._label.height) / 2;
		this.addChild(this._label);

		// Override interaction handlers for visual feedback
		this.on("pointerdown", this.onDebugPointerDown.bind(this));
		this.on("pointerup", this.onDebugPointerUp.bind(this));
		this.on("pointerover", this.onDebugPointerOver.bind(this));
		this.on("pointerout", this.onDebugPointerOut.bind(this));
	}

	private onDebugPointerDown(): void {
		this._background.tint = 0xcccccc;
		this.alpha = 1.0; // Override parent alpha change
	}

	private onDebugPointerUp(): void {
		this._background.tint = 0xffffff;
		this.alpha = 1.0; // Override parent alpha change
		// onClick is already called by parent
	}

	private onDebugPointerOver(): void {
		this._background.tint = 0xdddddd;
	}

	private onDebugPointerOut(): void {
		this._background.tint = 0xffffff;
	}
}
