import { GameManager } from "../GameManager";

/**
 * Enum for all possible game states
 */
export enum StateName {
	SETUP = 'SETUP',
	ROUND_START = 'ROUND_START',
	PLAYER_ACTION = 'PLAYER_ACTION',
	ENEMY_ACTION = 'ENEMY_ACTION',
	RESOLUTION = 'RESOLUTION',
}

/**
 * Base class for all game states
 */
export abstract class GameState {
	protected gameManager: GameManager;

	constructor(gameManager: GameManager) {
		this.gameManager = gameManager;
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

