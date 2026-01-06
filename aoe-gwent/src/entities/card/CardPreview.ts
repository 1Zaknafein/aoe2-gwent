import { Container, Graphics, Text } from "pixi.js";
import { Card, CardData, CardType } from "./Card";
import gsap from "gsap";
import {
	CardDescriptions,
	EffectDescriptions,
} from "../../shared/database/CardDescriptions";

export class CardPreview extends Container {
	public card: Card;

	private readonly _cardTitle: Text;
	private readonly _cardDescription: Text;

	private _activeTween: GSAPAnimation | null = null;

	constructor() {
		super();

		const cardData = {
			id: 1,
			name: "",
			score: 0,
			type: CardType.MELEE,
		};

		this.card = new Card(cardData);
		this.card.scale.set(2);

		const midPos = this.card.width / 2;

		const bg = new Graphics();
		bg.fillStyle = { color: "#ebd098ff", alpha: 1 };
		bg.rect(0, 0, this.card.width, 300);
		bg.fill();
		bg.pivot.set(midPos, -this.card.height / 2);

		this._cardTitle = new Text();
		this._cardTitle.text = "";
		this._cardTitle.style = {
			fontFamily: "Arial",
			fontSize: 30,
			fontWeight: "bold",
			fill: "#000000",
		};
		this._cardTitle.anchor.set(0.5);
		this._cardTitle.position.set(midPos, 40);

		this._cardDescription = new Text();
		this._cardDescription.text = "";
		this._cardDescription.style = {
			fontFamily: "Arial",
			fontSize: 20,
			fill: "#000000",
			align: "center",
			wordWrap: true,
			wordWrapWidth: this.card.width - 20,
		};
		this._cardDescription.position.set(20, this._cardTitle.y + 40);

		bg.addChild(this._cardDescription, this._cardTitle);

		this.addChild(bg, this.card);

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
		this.removeChild(this.card);

		this.card = new Card(cardData);
		this.card.scale.set(2);

		this.addChild(this.card);

		this.updateDescription();
	}

	private updateDescription(): void {
		const name = this.card.cardData.name;
		const effect = this.card.cardData.effect;

		this._cardTitle.text = name;

		console.log(name);

		let description = CardDescriptions[name] || "";

		// Add effect description if the card has an effect
		if (effect) {
			const effectDescription = EffectDescriptions[effect];

			if (effectDescription) {
				description += `\n\n${effectDescription}`;
			}
		}

		this._cardDescription.text = description;
	}
}
