import { MessageDisplay } from "../../ui/components/MessageDisplay";
import { GameManager } from "./GameManager";
import { PlayerDisplayManager } from "../../entities/player";
import { GameBoardInteractionManager } from "../../ui/scenes/GameBoardInteractionManager";
import { Player } from "../../entities/player/Player";
import { BotPlayer } from "../../local-server";

/**
 * GameContext - Container for all dependencies that states may need
 */
export interface GameContext {
	gameManager: GameManager;
	messageDisplay: MessageDisplay;
	playerDisplayManager: PlayerDisplayManager;
	interactionManager: GameBoardInteractionManager;
	player: Player;
	enemy: BotPlayer;
}
