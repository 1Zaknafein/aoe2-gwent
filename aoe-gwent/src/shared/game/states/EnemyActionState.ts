import { GameState, StateName } from "./GameState";
import { GameContext } from "../GameContext";
import { ActionType } from "../../../local-server/GameTypes";

/**
 * EnemyActionState - Processes enemy (bot) actions
 */
export class EnemyActionState extends GameState {
	constructor(context: GameContext) {
		super(context);
	}

	public async execute(): Promise<StateName> {
		const gameSession = this.gameManager.getGameSession();
		const botPlayer = this.gameManager.getBotPlayer();

		if (!gameSession) {
			throw new Error("Game session not initialized");
		}

		if (!botPlayer) {
			throw new Error("Bot player not initialized");
		}

		await this.messageDisplay.showMessage("Opponent's turn");

		this.disablePlayerInput();
		console.log("Bot turn");

		const botId = gameSession
			.getPlayerIds()
			.find((id) => gameSession.isBot(id));

		if (!botId) {
			throw new Error("Bot player ID not found");
		}

		// Check if bot has no cards - auto-pass
		const botHand = gameSession.getPlayerHand(botId);

		if (botHand && botHand.length === 0) {
			console.log("[EnemyActionState] Bot has no cards - auto-passing");

			const result = gameSession.processAction({
				type: ActionType.PASS_TURN,
				playerId: botId,
			});

			if (!result.success) {
				console.error("Bot auto-pass failed:", result.error);
			}

			// Check next state after auto-pass
			if (this.gameManager.haveBothPlayersPassed()) {
				return StateName.ROUND_END;
			} else {
				return StateName.PLAYER_ACTION;
			}
		}

		// Bot takes its turn
		await botPlayer.takeTurn();

		// Determine next state
		if (this.gameManager.haveBothPlayersPassed()) {
			return StateName.ROUND_END;
		} else if (this.gameManager.isPlayerTurn()) {
			return StateName.PLAYER_ACTION;
		} else {
			// Bot's turn continues (player passed)
			return StateName.ENEMY_ACTION;
		}
	}

	/**
	 * Disable player input by making hand cards non-interactive
	 */
	private disablePlayerInput(): void {
		const playerHand = this.cardDealingManager.getPlayerHand();
		playerHand.setCardsInteractive(false);
	}
}
