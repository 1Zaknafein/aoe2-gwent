import { GameState, StateName } from "./GameState";
import { GameManager } from "../GameManager";
import { CardDealingManager } from "../../../ui/managers/CardDealingManager";

/**
 * RoundStartState - Prepares for a new round
 * - Clears passed player flags
 * - Determines who goes first
 * - Sets up round-specific state
 */
export class RoundStartState extends GameState {
  private cardDealingManager: CardDealingManager

  constructor(gameManager: GameManager, cardDealingManager: CardDealingManager) {
    super(gameManager);
    
    this.cardDealingManager = cardDealingManager;
  }

  public async execute(): Promise<StateName> {
    console.log(
      `[RoundStartState] Starting round ${this.gameManager.getCurrentRound()}...`
    );

    const gameSession = this.gameManager.getGameSession();

    if (!gameSession) {
      throw new Error("Game session not initialized");
    }

    const gameState = gameSession.getGameState();

    if (!gameState.gameStarted) {
      console.log("[RoundStartState] Starting game - dealing cards...");
      gameSession.startGame();

      if (this.cardDealingManager) {
        const playerId = this.gameManager.getPlayerId();
        const gameData = gameSession.getGameDataForPlayer(playerId);
        
        if (gameData) {
          const opponentId = gameSession.getOpponentId(playerId);
          const opponentData = opponentId ? gameSession.getGameDataForPlayer(opponentId) : null;
          
          await this.delay(0.1);
          this.cardDealingManager.dealCards(
            gameData.playerHand,
            opponentData?.playerHand || []
          );
        }
      } else {
        console.warn("[RoundStartState] CardDealingManager not set - cards not dealt to UI");
      }
    }

    // TODO Implement round start logic
    // - Clear passed players
    // - Determine starting player
    // - Display round start message

    console.log(
      "[RoundStartState] Round started"
    );

    // Wait indefinitely for now.
    await new Promise(() => {});

    return StateName.PLAYER_ACTION;
  }
}
