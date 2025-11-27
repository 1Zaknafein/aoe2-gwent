import { GameState, StateName } from "./states/GameState";
import { SetupState } from "./states/SetupState";
import { RoundStartState } from "./states/RoundStartState";
import { PlayerActionState } from "./states/PlayerActionState";
import { EnemyActionState } from "./states/EnemyActionState";
import { ResolutionState } from "./states/ResolutionState";
import { GameManager } from "./GameManager";

/**
 * GameStateMachine - Manages game state transitions
 * Ensures only valid state transitions occur
 */
export class GameStateMachine {
	private currentState: GameState | null = null;
	private currentStateName: StateName | null = null;
	private gameManager: GameManager;
	private isRunning: boolean = false;

	// Valid state transitions
	private readonly transitions: Map<StateName, StateName[]> = new Map([
		[StateName.SETUP, [StateName.ROUND_START]],
		[StateName.ROUND_START, [StateName.PLAYER_ACTION, StateName.ENEMY_ACTION]],
		[StateName.PLAYER_ACTION, [StateName.PLAYER_ACTION, StateName.ENEMY_ACTION, StateName.RESOLUTION]],
		[StateName.ENEMY_ACTION, [StateName.ENEMY_ACTION, StateName.PLAYER_ACTION, StateName.RESOLUTION]],
		[StateName.RESOLUTION, [StateName.ROUND_START]],
	]);

	constructor(gameManager: GameManager) {
		this.gameManager = gameManager;
	}

	/**
	 * Start the state machine with SetupState
	 */
	public async start(): Promise<void> {
		if (this.isRunning) {
			console.warn("⚠️ State machine is already running");
			return;
		}

		console.log("🎮 Starting game state machine...");
		this.isRunning = true;
		this.currentState = new SetupState(this.gameManager);
		this.currentStateName = StateName.SETUP;
		await this.run();
	}

	/**
	 * Run the state machine loop
	 */
	private async run(): Promise<void> {
		while (this.isRunning && this.currentState && this.currentStateName) {
			console.log(`\n📍 Current State: ${this.currentStateName}`);

			// Execute current state and get next state name
			const nextStateName = await this.currentState.execute();

			// Validate transition
			if (!this.isValidTransition(this.currentStateName, nextStateName)) {
				console.error(
					`❌ Invalid state transition: ${this.currentStateName} -> ${nextStateName}`
				);
				this.stop();
				break;
			}

			console.log(`➡️ Transitioning: ${this.currentStateName} -> ${nextStateName}`);
			
			// Create and transition to next state
			const nextState = this.createState(nextStateName);
			if (!nextState) {
				console.error(`❌ Failed to create state: ${nextStateName}`);
				this.stop();
				break;
			}

			this.currentState = nextState;
			this.currentStateName = nextStateName;
		}

		console.log("🏁 State machine stopped");
	}

	/**
	 * Check if a state transition is valid
	 */
	private isValidTransition(fromState: StateName, toState: StateName): boolean {
		const allowedTransitions = this.transitions.get(fromState);
		if (!allowedTransitions) {
			return false;
		}
		return allowedTransitions.includes(toState);
	}

	/**
	 * Stop the state machine
	 */
	public stop(): void {
		this.isRunning = false;
		console.log("🛑 State machine stopped");
	}

	/**
	 * Get current state
	 */
	public getCurrentState(): GameState | null {
		return this.currentState;
	}

	/**
	 * Get current state name
	 */
	public getCurrentStateName(): StateName | null {
		return this.currentStateName;
	}

	/**
	 * Manually transition to a specific state (for debugging/testing)
	 * Validates the transition before executing
	 */
	public async transitionTo(stateName: StateName): Promise<boolean> {
		if (!this.currentStateName) {
			console.error("❌ Cannot transition: no current state");
			return false;
		}

		if (!this.isValidTransition(this.currentStateName, stateName)) {
			console.error(`❌ Invalid transition: ${this.currentStateName} -> ${stateName}`);
			return false;
		}

		console.log(`➡️ Manual transition: ${this.currentStateName} -> ${stateName}`);
		
		const newState = this.createState(stateName);
		if (!newState) {
			console.error(`❌ Failed to create state: ${stateName}`);
			return false;
		}

		this.currentState = newState;
		this.currentStateName = stateName;
		await this.currentState.execute();
		return true;
	}

	/**
	 * Create a state instance by name (factory method)
	 */
	public createState(stateName: StateName): GameState | null {
		switch (stateName) {
			case StateName.SETUP:
				return new SetupState(this.gameManager);
			case StateName.ROUND_START:
				return new RoundStartState(this.gameManager);
			case StateName.PLAYER_ACTION:
				return new PlayerActionState(this.gameManager);
			case StateName.ENEMY_ACTION:
				return new EnemyActionState(this.gameManager);
			case StateName.RESOLUTION:
				return new ResolutionState(this.gameManager);
			default:
				console.error(`❌ Unknown state: ${stateName}`);
				return null;
		}
	}

	/**
	 * Resume the state machine from current state
	 */
	public async resume(): Promise<void> {
		if (this.isRunning) {
			console.warn("⚠️ State machine is already running");
			return;
		}

		if (!this.currentState) {
			console.error("❌ Cannot resume: no current state");
			return;
		}

		console.log(`🎮 Resuming state machine from ${this.getCurrentStateName()}...`);
		this.isRunning = true;
		await this.run();
	}
}
