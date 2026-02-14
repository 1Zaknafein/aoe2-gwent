import { Container, Sprite, Text, Texture } from "pixi.js";
import gsap from "gsap";
import { setFitWidth } from "../../ui/components/CommonComponents";
import { CardData, CardType } from "../../local-server/CardDatabase";
import { Card } from "./Card";

export class CardPreview extends Container {
	public card: Card;

	private readonly _title: Text;
	private readonly _score: Text;
	private readonly _icon: Sprite;

	private readonly _border: Sprite;
	private readonly _descriptionText: Text;
	private readonly _descriptionBg: Sprite;

	private _activeTween: GSAPAnimation | null = null;

	private readonly _rowTypeIcons: Map<CardType, Texture>;

	constructor() {
		super();

		const cardData = {
			id: 1,
			name: "",
			score: 1,
			type: CardType.MELEE,
		};

		this._rowTypeIcons = new Map<CardType, Texture>([
			[CardType.MELEE, Texture.from("icon_melee")],
			[CardType.RANGED, Texture.from("icon_ranged")],
			[CardType.SIEGE, Texture.from("icon_siege")],
			[CardType.WEATHER, Texture.from("icon_weather")],
		]);

		this.card = new Card(cardData);
		this.card.scale.set(2);
		this.card.hideDetails();

		this._border = Sprite.from("card_preview_border");
		this._border.anchor.set(0.5);
		this._border.scale.set(1.2, 1.25);
		this._border.y = 15;

		this._title = new Text();
		this._title.anchor.set(0.5);
		this._title.y = 253;
		this._title.style = {
			fontFamily: "Cinzel, serif",
			fontSize: 30,
			fontWeight: "bold",
			fill: "#290e00",
		};

		setFitWidth(this._title, 230, 30);

		this._icon = new Sprite(this._rowTypeIcons.get(CardType.MELEE));
		this._icon.anchor.set(0.5);
		this._icon.scale.set(0.7);
		this._icon.tint = "#ffcc81";

		this._icon.x = 150;
		this._icon.y = 265;

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
		this._descriptionText.y = 330;

		this.addChild(
			this._descriptionBg,
			this._descriptionText,
			this.card,
			this._border,
			this._title,
			this._icon,
			this._score
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

		this.card.width = 309;
		this.card.height = 444;

		this.updateDescription();
	}

	private updateDescription(): void {
		const name = this.card.cardData.name;
		const texture = this._rowTypeIcons.get(this.card.cardData.type);

		this._title.text = name;
		this._title.style.fontSize = 30;
		setFitWidth(this._title, 230, 30);

		if (texture && this._icon.texture !== texture) {
			this._icon.texture = texture;
		} else if (!texture) {
			this._icon.texture = Texture.EMPTY;
		}

		if (this.card.cardData.baseScore! > 0) {
			this._score.text = this.card.cardData.baseScore!.toString();
		} else {
			this._score.text = "";
		}

		const cardData = this.card.cardData;

		// There is only one effect per card, but we check all 3 possible effect types just in case for future extensibility.
		const effectDescriptions = [];

		if (cardData.selfEffect) {
			effectDescriptions.push(cardData.selfEffect.description);
		}

		if (cardData.auraEffect) {
			effectDescriptions.push(cardData.auraEffect.description);
		}

		if (cardData.onPlayEffect) {
			effectDescriptions.push(cardData.onPlayEffect.description);
		}

		if (effectDescriptions.length === 0) {
			this._descriptionBg.visible = false;
			this._descriptionText.visible = false;
		} else {
			this._descriptionBg.visible = true;
			this._descriptionText.visible = true;
		}

		this._descriptionText.text = effectDescriptions.join("\n");
	}
}
