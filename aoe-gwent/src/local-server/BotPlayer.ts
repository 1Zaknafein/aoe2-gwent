import { LocalGameSession } from "./LocalGameSession";
import { ActionType, PlayerAction } from "./GameTypes";
import { CardDatabase } from "./CardDatabase";
import { CardType } from "../shared/types/CardTypes";

/**
 * BotPlayer - AI opponent for local games
 * Implements simple decision-making logic:
 * - Plays cards based on type (melee/ranged/siege)
 * - Decides when to pass
 * - Responds to game state changes
 */
export class BotPlayer {
	private botId: string;
	private gameSession: LocalGameSession;
	private thinkingDelay: number;

	constructor(
		botId: string,
		gameSession: LocalGameSession,
		thinkingDelay: number = 1000
	) {
		this.botId = botId;
		this.gameSession = gameSession;
		this.thinkingDelay = thinkingDelay;
	}

	/**
	 * Check if it's the bot's turn and make a move
	 */
	public async takeTurnIfNeeded(): Promise<void> {
		const gameState = this.gameSession.getGameState();

		// Check if it's bot's turn
		if (gameState.currentTurn !== this.botId) {
			return;
		}

		// Check if bot has already passed
		if (gameState.passedPlayers.has(this.botId)) {
			return;
		}

		// Wait a bit to simulate "thinking"
		await this.delay(this.thinkingDelay);

		// Make a decision
		const action = this.decideAction();

		if (action) {
			console.log(`🤖 Bot action:`, action);
			this.gameSession.processAction(action);
		}
	}

	/**
	 * Decide what action to take
	 */
	private decideAction(): PlayerAction | null {
		const hand = this.gameSession.getPlayerHand(this.botId);

		if (!hand || hand.length === 0) {
			// No cards left, must pass
			return {
				type: ActionType.PASS_TURN,
				playerId: this.botId,
			};
		}

		// Get current scores
		const boards = this.gameSession.getBoardStates();
		const playerBoard = boards.get(this.gameSession.getPlayerIds()[0]);
		const botBoard = boards.get(this.botId);

		if (!playerBoard || !botBoard) {
			return null;
		}

		// Calculate current scores (simple sum)
		const playerScore = this.calculateBoardScore(playerBoard);
		const botScore = this.calculateBoardScore(botBoard);

		// Simple strategy:
		// 1. If bot is winning by 10+ points and has played at least 3 cards, pass
		// 2. Otherwise, play a card

		const botCardsPlayed =
			botBoard.melee.length + botBoard.ranged.length + botBoard.siege.length;

		if (botScore > playerScore + 10 && botCardsPlayed >= 3) {
			// Bot is winning, pass to conserve cards
			console.log(
				`🤖 Bot passing (winning by ${botScore - playerScore}, ${botCardsPlayed} cards played)`
			);
			return {
				type: ActionType.PASS_TURN,
				playerId: this.botId,
			};
		}

		// Play a random card
		return this.playRandomCard(hand);
	}

	/**
	 * Play a random card from hand
	 */
	private playRandomCard(hand: number[]): PlayerAction | null {
		if (hand.length === 0) {
			return null;
		}

		// Pick a random card
		const randomIndex = Math.floor(Math.random() * hand.length);
		const cardId = hand[randomIndex];

		// Get card data to determine which row to play it on
		const cardData = CardDatabase.getCardById(cardId);

		if (!cardData) {
			console.error(`🤖 Bot: Card ${cardId} not found in database`);
			return null;
		}

		// Determine target row based on card type
		let targetRow: "melee" | "ranged" | "siege";
		switch (cardData.type) {
			case CardType.MELEE:
				targetRow = "melee";
				break;
			case CardType.RANGED:
				targetRow = "ranged";
				break;
			case CardType.SIEGE:
				targetRow = "siege";
				break;
			default:
				targetRow = "melee";
		}

		console.log(
			`🤖 Bot playing card ${cardData.name} (${cardData.score}) on ${targetRow}`
		);

		return {
			type: ActionType.PLACE_CARD,
			playerId: this.botId,
			cardId: cardId,
			targetRow: targetRow,
		};
	}

	/**
	 * Calculate simple board score
	 */
	private calculateBoardScore(board: {
		melee: number[];
		ranged: number[];
		siege: number[];
	}): number {
		let total = 0;

		for (const row of [board.melee, board.ranged, board.siege]) {
			for (const cardId of row) {
				const cardData = CardDatabase.getCardById(cardId);
				if (cardData) {
					total += cardData.score;
				}
			}
		}

		return total;
	}

	/**
	 * Helper to delay execution
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Set thinking delay
	 */
	public setThinkingDelay(ms: number): void {
		this.thinkingDelay = ms;
	}
}
