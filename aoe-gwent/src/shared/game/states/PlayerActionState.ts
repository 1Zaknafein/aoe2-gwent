import { GameState, StateName } from "./GameState";
import { GameContext } from "../GameContext";
import { ActionType } from "../../../local-server/GameTypes";

/**
 * PlayerActionState - Waits for and processes player actions
 */
export class PlayerActionState extends GameState {
	private isFirstEntry: boolean = true;

	constructor(context: GameContext) {
		super(context);
	}

	public async execute(): Promise<StateName> {
		const playerHand = this.cardDealingManager.getPlayerHand();
		const passButton = this.playerDisplayManager.playerDisplay.passButton;
		const gameSession = this.gameManager.getGameSession();
		const playerId = this.gameManager.getPlayerId();

		if (!passButton) {
			throw new Error("Pass button not found on player display");
		}

		if (!gameSession) {
			throw new Error("Game session not initialized");
		}

		// Auto-pass if player has no cards
		if (playerHand.cardCount === 0) {
			const result = gameSession.processAction({
				type: ActionType.PASS_TURN,
				playerId,
			});

			if (!result.success) {
				console.error("Auto-pass failed:", result.error);
			}

			if (this.gameManager.haveBothPlayersPassed()) {
				return StateName.ROUND_END;
			} else {
				return StateName.ENEMY_ACTION;
			}
		}

		// Only show message on first entry or when returning from another state
		if (this.isFirstEntry) {
			await this.messageDisplay.showMessage("Your turn!");
			this.isFirstEntry = false;
		}

		playerHand.setCardsInteractive(true);

		passButton.setEnabled(true);

		const action = await this.waitForPlayerAction();

		playerHand.setCardsInteractive(false);

		passButton.setEnabled(false);

		if (action === "passed") {
			const result = gameSession.processAction({
				type: ActionType.PASS_TURN,
				playerId,
			});

			if (!result.success) {
				console.error("Pass turn failed:", result.error);
			}
		}

		if (this.gameManager.haveBothPlayersPassed()) {
			return StateName.ROUND_END;
		} else if (this.gameManager.isBotTurn()) {
			this.isFirstEntry = true;
			return StateName.ENEMY_ACTION;
		} else {
			// Player's turn continues
			return StateName.PLAYER_ACTION;
		}
	}

	/**
	 * Wait for the player to either place a card or press the pass button
	 * Returns the action that occurred
	 */
	private async waitForPlayerAction(): Promise<"cardPlaced" | "passed"> {
		return new Promise<"cardPlaced" | "passed">((resolve) => {
			const playerHand = this.cardDealingManager.getPlayerHand();
			const playerDisplay = this.playerDisplayManager.playerDisplay;
			const passButton = playerDisplay.passButton;

			if (!passButton) {
				throw new Error("Pass button not found on player display");
			}

			// Listen for card placement completing (after game session is updated)
			const onCardPlaced = () => {
				cleanup();
				resolve("cardPlaced");
			};

			// Listen for pass button click
			const onPassClicked = () => {
				cleanup();
				resolve("passed");
			};

			playerHand.once("cardPlacementComplete", onCardPlaced);
			passButton.once("click", onPassClicked);

			const cleanup = () => {
				playerHand.off("cardPlacementComplete", onCardPlaced);
				passButton.off("click", onPassClicked);
			};
		});
	}
}
