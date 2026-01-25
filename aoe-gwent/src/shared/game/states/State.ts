import { GameManager } from "../GameManager";
import { GameContext } from "../GameContext";
import { MessageDisplay } from "../../../ui/components/MessageDisplay";
import { GameResolutionDisplay } from "../../../ui/components/GameResolutionDisplay";
import { PlayerDisplayManager } from "../../../entities/player";
import { GameBoardInteractionManager } from "../../../ui/scenes/GameBoardInteractionManager";

/**
 * Enum for all possible game states
 */
export enum StateName {
	ROUND_START = "ROUND_START",
	PLAYER_ACTION = "PLAYER_ACTION",
	ENEMY_ACTION = "ENEMY_ACTION",
	ROUND_END = "ROUND_END",
	RESOLUTION = "RESOLUTION",
}

/**
 * Base class for all game states
 */
export abstract class State {
	protected gameManager: GameManager;
	protected messageDisplay: MessageDisplay;
	protected gameResolutionDisplay: GameResolutionDisplay;
	protected playerDisplayManager: PlayerDisplayManager;
	protected interactionManager: GameBoardInteractionManager;

	constructor(context: GameContext) {
		this.gameManager = context.gameManager;
		this.messageDisplay = context.messageDisplay;
		this.gameResolutionDisplay = context.gameResolutionDisplay;
		this.playerDisplayManager = context.playerDisplayManager;
		this.interactionManager = context.interactionManager;
	}

	/**
	 * Execute this state's logic
	 * Returns the name of the next state to transition to
	 */
	abstract execute(): Promise<StateName>;

	/**
	 * Utility to delay execution for a given number of seconds
	 * @param seconds Number of seconds to delay
	 * @returns Promise that resolves after the delay
	 */
	protected async delay(seconds: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
	}
}
