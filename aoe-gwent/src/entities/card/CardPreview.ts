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
	private readonly _description: Text;

	private readonly _maxTextWidth: number;

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

		const descriptionBg = Sprite.from("paper");
		descriptionBg.scale.x = 1.15;
		descriptionBg.scale.y = 0.8;
		descriptionBg.position.set(
			-descriptionBg.width / 2,
			this.card.height / 2 + 5
		);

		this._maxTextWidth = descriptionBg.width - 20;

		this._title = new Text();
		this._title.text = "";
		this._title.style = {
			fontFamily: "Cinzel, serif",
			fontSize: 30,
			fontWeight: "bold",
			fill: "#290e00",
		};

		setFitWidth(this._title, this._maxTextWidth, 30);

		this._title.anchor.set(0.5);
		this._title.y = descriptionBg.y + 40;

		this._description = new Text();
		this._description.text = "";
		this._description.style = {
			fontFamily: "Cinzel, serif",
			fontSize: 18,
			fontWeight: "bold",
			fill: "#290e00",
			align: "center",
			wordWrap: true,
			wordWrapWidth: this._maxTextWidth,
		};

		this._description.anchor.set(0.5, 0);
		this._description.y = this._title.y + 30;

		this.addChild(descriptionBg, this._description, this._title, this.card);

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

		this.card.width = 309;
		this.card.height = 444;

		this.updateDescription();
	}

	private updateDescription(): void {
		const name = this.card.cardData.name;
		const effect = this.card.cardData.effect;

		this._title.text = name;

		setFitWidth(this._title, this._maxTextWidth, 30);

		let description = CardDescriptions[name] || "";

		// Add effect description if the card has an effect
		if (effect) {
			const effectDescription = EffectDescriptions[effect];

			if (effectDescription) {
				description += `\n\n${effectDescription}`;
			}
		}

		this._description.text = description;
	}
}
