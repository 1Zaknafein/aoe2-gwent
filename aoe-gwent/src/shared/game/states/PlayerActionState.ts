import { GameState, StateName } from "./GameState";
import { GameContext } from "../GameContext";
import { HandContainer } from "../../../entities/card";

/**
 * PlayerActionState - Waits for and processes player actions
 */
export class PlayerActionState extends GameState {
  private _playerHandContainer: HandContainer;

  constructor(context: GameContext) {
    super(context);

    this._playerHandContainer = this.cardDealingManager.getPlayerHand();
  }

  public async execute(): Promise<StateName> {
    await this.messageDisplay.showMessage("Your turn!");

    this._playerHandContainer.setCardsInteractive(true);

    // TODO: Implement player action logic
    // - Wait for player to take action (card placement or pass)
    // - Process the action
    // - Determine next state based on action result

    await new Promise(() => {});

    this._playerHandContainer.setCardsInteractive(false);

    // TODO: Return proper next state based on actual game logic
    // For now, placeholder logic:
    if (this.gameManager.haveBothPlayersPassed()) {
      return StateName.RESOLUTION;
    } else if (this.gameManager.isBotTurn()) {
      return StateName.ENEMY_ACTION;
    } else {
      return StateName.PLAYER_ACTION;
    }
  }
}
