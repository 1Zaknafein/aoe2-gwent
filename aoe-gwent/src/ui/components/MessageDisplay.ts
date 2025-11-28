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
    width: 1200,
    height: 300,
    padding: 100,
    backgroundColor: "#000000",
    textColor: "#ffffff",
    fontSize: 58,
    fontFamily: "Arial",
  };

  constructor(options: MessageDisplayOptions = {}) {
    super();

    this._options = { ...MessageDisplay.DEFAULT_OPTIONS, ...options };

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
        duration: 0.5,
        ease: "power2.out",
      })
      .to(
        this,
        {
          alpha: 0,
          duration: 0.3,
          ease: "power2.in",
        },
        "+=1.5"
      );

    if (onComplete) {
      this._timeline.add(() => onComplete());
    }

    return this._timeline;
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
    const { fontFamily, fontSize, textColor, width, height, padding } =
      this._options;

    this._messageText = new PixiText({
      text: "",
      style: {
        fontFamily: fontFamily,
        fontSize: fontSize,
        fill: textColor,
        wordWrap: true,
        wordWrapWidth: width - padding * 2,
        align: "center",
      },
    });

    this._messageText.anchor.set(0.5);
    this._messageText.x = width / 2;
    this._messageText.y = height / 2;

    this.addChild(this._messageText);
  }
}
