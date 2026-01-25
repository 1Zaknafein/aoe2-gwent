import { MessageDisplay } from "../../ui/components/MessageDisplay";
import { GameResolutionDisplay } from "../../ui/components/GameResolutionDisplay";
import { GameManager } from "./GameManager";
import { PlayerDisplayManager } from "../../entities/player";
import { GameBoardInteractionManager } from "../../ui/scenes/GameBoardInteractionManager";
import { Player } from "../../entities/player/Player";
import { BotPlayer } from "../../local-server";
import { GameScene } from "../../ui/scenes/GameScene";

/**
 * GameContext - Container for all dependencies that states may need
 */
export interface GameContext {
	gameManager: GameManager;
	messageDisplay: MessageDisplay;
	gameResolutionDisplay: GameResolutionDisplay;
	gameScene: GameScene;
	playerDisplayManager: PlayerDisplayManager;
	interactionManager: GameBoardInteractionManager;
	player: Player;
	enemy: BotPlayer;
}
