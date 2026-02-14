import { Container, Sprite, Text } from "pixi.js";
import gsap from "gsap";
import {
	CardDescriptions,
	EffectDescriptions,
} from "../../shared/database/CardDescriptions";
import { setFitWidth } from "../../ui/components/CommonComponents";
import { CardData, CardType } from "../../local-server/CardDatabase";
import { Card } from "./Card";

export class CardPreview extends Container {
	public card: Card;

	private readonly _title: Text;
	private readonly _score: Text;
	private readonly _typeIcon: Sprite;

	private readonly _border: Sprite;
	private readonly _descriptionText: Text;

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

		this._border = Sprite.from("card_preview_border");
		this._border.anchor.set(0.5);
		this._border.scale.set(1.2, 1.25);
		this._border.y = 15;

		this._title = new Text();
		this._title.text = "TEST";
		this._title.anchor.set(0.5);
		this._title.y = 253;
		this._title.style = {
			fontFamily: "Cinzel, serif",
			fontSize: 30,
			fontWeight: "bold",
			fill: "#290e00",
		};

		setFitWidth(this._title, 230, 30);

		this._typeIcon = Sprite.from("icon_melee");
		this._typeIcon.anchor.set(0.5);
		this._typeIcon.scale.set(0.75);
		this._typeIcon.tint = "#ffcc81";

		this._typeIcon.x = 150;
		this._typeIcon.y = 265;

		this._score = new Text();
		this._score.text = "19";
		this._score.style = {
			fontFamily: "Cinzel, serif",
			fontSize: 48,
			align: "center",
			fontWeight: "bold",
			fill: "#b89663",
			stroke: {
				width: 1,
				color: "black",
			},
			dropShadow: {
				distance: 4,
				blur: 4,
				color: "black",
				alpha: 0.5,
				angle: 45,
			},
		};

		this._score.anchor.set(0.5);
		this._score.y = 263;
		this._score.x = -150;

		const descriptionBg = Sprite.from("paper");
		descriptionBg.scale.set(1.15, 0.8);
		descriptionBg.x = -descriptionBg.width / 2;
		descriptionBg.y = this.card.height / 2 + 5;

		this._descriptionText = new Text();
		this._descriptionText.text = "";
		this._descriptionText.style = {
			fontFamily: "Cinzel, serif",
			fontSize: 18,
			fontWeight: "bold",
			fill: "#290e00",
			align: "center",
			wordWrap: true,
			wordWrapWidth: descriptionBg.width - 40,
		};

		this._descriptionText.anchor.set(0.5, 0);
		this._descriptionText.y = this._title.y + 110;

		this.addChild(
			descriptionBg,
			this._descriptionText,
			this.card,
			this._border,
			this._title,
			this._typeIcon,
			this._score
		);

		this.visible = true;
		this.alpha = 1;
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

		this.card.width = 309;
		this.card.height = 444;

		this.updateDescription();
	}

	private updateDescription(): void {
		const name = this.card.cardData.name;
		const effect = this.card.cardData.effect;

		this._title.text = name;
		this._title.style.fontSize = 30;
		setFitWidth(this._title, 230, 30);

		if (this.card.cardData.baseScore! > 0) {
			this._score.text = this.card.cardData.baseScore!.toString();
		} else {
			this._score.text = "";
		}

		let description = CardDescriptions[name] || "";

		// Add effect description if the card has an effect
		if (effect) {
			const effectDescription = EffectDescriptions[effect];

			if (effectDescription) {
				description += `\n\n${effectDescription}`;
			}
		}

		this._descriptionText.text = description;
	}
}
