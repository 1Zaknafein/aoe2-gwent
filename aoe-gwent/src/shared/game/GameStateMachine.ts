import { GameState, StateName } from "./states/GameState";

/**
 * GameStateMachine - Manages game state transitions
 * Ensures only valid state transitions occur
 */
export class GameStateMachine {
	private currentState: GameState | null = null;
	private currentStateName: StateName | null = null;
	private states: Map<StateName, GameState>;
	private isRunning: boolean = false;

	// Valid state transitions
	private readonly transitions: Map<StateName, StateName[]> = new Map([
		[StateName.SETUP, [StateName.ROUND_START]],
		[StateName.ROUND_START, [StateName.PLAYER_ACTION, StateName.ENEMY_ACTION]],
		[StateName.PLAYER_ACTION, [StateName.PLAYER_ACTION, StateName.ENEMY_ACTION, StateName.RESOLUTION]],
		[StateName.ENEMY_ACTION, [StateName.ENEMY_ACTION, StateName.PLAYER_ACTION, StateName.RESOLUTION]],
		[StateName.RESOLUTION, [StateName.ROUND_START]],
	]);

	constructor(states: Map<StateName, GameState>) {
		this.states = states;
	}

	/**
	 * Start the state machine with SetupState
	 */
	public async start(): Promise<void> {
		if (this.isRunning) {
			console.warn("State machine is already running");
			return;
		}

		const setupState = this.states.get(StateName.SETUP);
		if (!setupState) {
			throw new Error("SetupState not found in state map");
		}

		console.log("Starting game state machine...");
		this.isRunning = true;
		this.currentState = setupState;
		this.currentStateName = StateName.SETUP;
		await this.run();
	}

	/**
	 * Run the state machine loop
	 */
	private async run(): Promise<void> {
		while (this.isRunning && this.currentState && this.currentStateName) {
			console.log(`\nCurrent State: ${this.currentStateName}`);

			const nextStateName = await this.currentState.execute();

			if (!this.isValidTransition(this.currentStateName, nextStateName)) {
				console.error(
					`Invalid state transition: ${this.currentStateName} -> ${nextStateName}`
				);
				this.stop();
				break;
			}

			console.log(`Transitioning: ${this.currentStateName} -> ${nextStateName}`);
			
			const nextState = this.states.get(nextStateName);

			if (!nextState) {
				console.error(`State not found in map: ${nextStateName}`);
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
		console.log("State machine stopped");
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
	 * Resume the state machine from current state
	 */
	public async resume(): Promise<void> {
		if (this.isRunning) {
			console.warn("State machine is already running");
			return;
		}

		if (!this.currentState) {
			console.error("Cannot resume: no current state");
			return;
		}

		console.log(`Resuming state machine from ${this.getCurrentStateName()}...`);
		this.isRunning = true;
		await this.run();
	}
}
