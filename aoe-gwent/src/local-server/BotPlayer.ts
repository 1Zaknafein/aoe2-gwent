import { ActionType, PlayerAction } from "./GameTypes";
import { Player, PlayerData } from "../entities/player/Player";
import { CardContainer } from "../entities/card";

/**
 * AI opponent for local games
 */
export class BotPlayer extends Player {
	private readonly thinkingDelay = 1000;

	private readonly _containerMap: Map<string, CardContainer> = new Map();
	private readonly _otherPlayer: Player;

	constructor(playerData: PlayerData, otherPlayer: Player) {
		super(playerData);

		this._otherPlayer = otherPlayer;

		this._containerMap.set("melee", this.melee);
		this._containerMap.set("ranged", this.ranged);
		this._containerMap.set("siege", this.siege);
		this._containerMap.set("hand", this.hand);
	}

	/**
	 * Take turn as bot.
	 */
	public async decideAction(): Promise<PlayerAction> {
		await this.delay(this.thinkingDelay);

		const cards = this.hand.cards;
		const passChance = 0.2;

		let pass = false;

		if (this.score > this._otherPlayer.score) {
			pass = true;
		} else if (Math.random() < passChance) {
			pass = true;
		} else if (cards.length === 0) {
			pass = true;
		}

		if (pass) {
			return {
				type: ActionType.PASS_TURN,
				player: this,
			};
		}

		const randomCard = cards[Math.floor(Math.random() * cards.length)];
		const targetContainer = this._containerMap.get(randomCard.cardData.type);

		return {
			type: ActionType.PLACE_CARD,
			player: this,
			card: randomCard,
			targetRow: targetContainer,
		};
	}

	/**
	 * Helper to delay execution
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
