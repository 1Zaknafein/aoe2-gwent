import { Container, Sprite, Text } from "pixi.js";
import gsap from "gsap";
import { setFitWidth } from "../../ui/components/CommonComponents";
import { CardData, CardType } from "../../local-server/CardDatabase";
import { Card } from "./Card";

export class CardPreview extends Container {
	public card: Card;

	private readonly _title: Text;
	private readonly _border: Sprite;
	private readonly _descriptionText: Text;
	private readonly _descriptionBg: Sprite;

	private _activeTween: GSAPAnimation | null = null;

	constructor() {
		super();

		const cardData = {
			id: 1,
			name: "",
			score: 1,
			type: CardType.MELEE,
		};

		this.card = new Card(cardData);
    this.card.scale.set(2);
    this.card.hideDetails();
		this.card.y = -29

		this._border = Sprite.from("card_preview_border");
		this._border.anchor.set(0.5);
		this._border.scale.set(1, 1.1);

		this._title = new Text();
		this._title.anchor.set(0.5);
		this._title.y = 235;
		this._title.style = {
			fontFamily: "Cinzel, serif",
			fontSize: 30,
			fontWeight: "bold",
			fill: "#290e00",
		};

		setFitWidth(this._title, 250, 30);

		this._descriptionBg = Sprite.from("paper");
		this._descriptionBg.scale.set(1.15, 0.5);
		this._descriptionBg.x = -this._descriptionBg.width / 2;
		this._descriptionBg.y = 300;

		this._descriptionText = new Text();
		this._descriptionText.style = {
			fontSize: 22,
			fontWeight: "bold",
			fill: "#290e00",
			align: "center",
			wordWrap: true,
			wordWrapWidth: this._descriptionBg.width - 30,
		};

		this._descriptionText.anchor.set(0.5, 0);
		this._descriptionText.y = 310;

		this.addChild(
			this._descriptionBg,
			this._descriptionText,
			this._border,
			this.card,
			this._title,
		);

		this.visible = false;
		this.alpha = 0;
	}

	public async show(data: CardData): Promise<void> {
		this._activeTween?.kill();

		this.updateCard(data);

		this.visible = true;

		gsap.to(this, { alpha: 1, duration: 0.15 });
	}

	public hide(): GSAPAnimation {
		this._activeTween = gsap.to(this, {
			alpha: 0,
			duration: 0.15,
			onComplete: () => {
				this.visible = false;
			},
		});

		return this._activeTween;
	}

	private updateCard(cardData: CardData): void {
		this.card.updateCardData(cardData);

		this.card.width = 305;
    this.card.height = 448;

		this.updateDescription();
	}

	private updateDescription(): void {
		const cardData = this.card.cardData;

    this._title.text = cardData.name;
    this._title.style.fontSize = 30;

		setFitWidth(this._title, 250, 30);


    const cardDescription: string[] = [];

    // Need to log out card strength and type;

    if (cardData.baseScore) {
      cardDescription.push(`Strength: ${cardData.baseScore}`);
    }

    cardDescription.push(`Type: ${cardData.type}`);

		// There is only one effect per card, but we check all 3 possible effect types just in case for future extensibility.
		if (cardData.selfEffect) {
			cardDescription.push(cardData.selfEffect.description);
		}

		if (cardData.auraEffect) {
			cardDescription.push(cardData.auraEffect.description);
		}

		if (cardData.onPlayEffect) {
			cardDescription.push(cardData.onPlayEffect.description);
		}

		if (cardDescription.length === 0) {
			this._descriptionBg.visible = false;
			this._descriptionText.visible = false;
		} else {
			this._descriptionBg.visible = true;
			this._descriptionText.visible = true;
		}

		this._descriptionText.text = cardDescription.join("\n");
	}
}
