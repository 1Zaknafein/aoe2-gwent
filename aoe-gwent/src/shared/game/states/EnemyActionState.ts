import { GameState, StateName } from "./GameState";
import { GameContext } from "../GameContext";

/**
 * EnemyActionState - Processes enemy (bot) actions
 */
export class EnemyActionState extends GameState {
  constructor(context: GameContext) {
    super(context);
  }

  public async execute(): Promise<StateName> {
    console.log("[EnemyActionState] Bot is thinking...");

    this.disablePlayerInput();

    // TODO: Implement enemy action logic
    // - Trigger bot to take action
    // - Wait for bot action to complete
    // - Determine next state based on action result

    console.log("[EnemyActionState] Bot action processed");

    // TODO: Return proper next state based on actual game logic
    // For now, placeholder logic:
    if (this.gameManager.haveBothPlayersPassed()) {
      return StateName.RESOLUTION;
    } else if (this.gameManager.isPlayerTurn()) {
      return StateName.PLAYER_ACTION;
    } else {
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
