import { GameState, StateName } from "./GameState";
import { GameContext } from "../GameContext";

/**
 * GameStartState - Starts a new game
 */
export class GameStartState extends GameState {
	constructor(context: GameContext) {
		super(context);
	}

	public async execute(): Promise<StateName> {
		console.log("[GameStartState] Starting new game...");

		const gameSession = this.gameManager.getGameSession();

		if (!gameSession) {
			throw new Error("Game session not initialized");
		}

		gameSession.startGame();

		const playerId = this.gameManager.getPlayerId();
		const gameData = gameSession.getGameDataForPlayer(playerId);

		if (!gameData) {
			throw new Error("Game data for player not found");
		}

		const opponentId = gameSession.getOpponentId(playerId);
		const opponentData = opponentId
			? gameSession.getGameDataForPlayer(opponentId)
			: null;

		this.cardDealingManager.dealCards(
			gameData.playerHand,
			opponentData?.playerHand || []
		);

		// Disable player input initially - will be enabled in PlayerActionState
		const playerHand = this.cardDealingManager.getPlayerHand();
		playerHand.setCardsInteractive(false);

		console.log("[GameStartState] Game started successfully");

		return StateName.ROUND_START;
	}
}
