import { State, StateName } from "./states/State";

/**
 * GameStateMachine - Manages game state transitions
 * Ensures only valid state transitions occur
 */
export class GameStateMachine {
	private currentState: State | null = null;
	private currentStateName: StateName | null = null;
	private states: Map<StateName, State>;
	private isRunning: boolean = false;

	// prettier-ignore
	private readonly transitions: Map<StateName, StateName[]> = new Map([

    [StateName.ROUND_START, [StateName.PLAYER_ACTION, StateName.ENEMY_ACTION]],
    [StateName.PLAYER_ACTION,[StateName.PLAYER_ACTION, StateName.ENEMY_ACTION, StateName.ROUND_END]],
    [StateName.ENEMY_ACTION, [StateName.ENEMY_ACTION, StateName.PLAYER_ACTION, StateName.ROUND_END]],
    [StateName.ROUND_END, [StateName.ROUND_START, StateName.RESOLUTION]],
    [StateName.RESOLUTION, [StateName.ROUND_START]],
  ]);

	constructor(states: Map<StateName, State>) {
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

		const roundStartState = this.states.get(StateName.ROUND_START);
		if (!roundStartState) {
			throw new Error("RoundStartState not found in state map");
		}

		this.isRunning = true;
		this.currentState = roundStartState;
		this.currentStateName = StateName.ROUND_START;

		await this.run();
	}

	/**
	 * Run the state machine loop
	 */
	private async run(): Promise<void> {
		while (this.isRunning && this.currentState && this.currentStateName) {
			const nextStateName = await this.currentState.execute();

			if (!this.isValidTransition(this.currentStateName, nextStateName)) {
				console.error(
					`Invalid state transition: ${this.currentStateName} -> ${nextStateName}`
				);
				this.stop();
				break;
			}

			const nextState = this.states.get(nextStateName);

			if (!nextState) {
				console.error(`State not found in map: ${nextStateName}`);
				this.stop();

				break;
			}

			this.currentState = nextState;
			this.currentStateName = nextStateName;
		}
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
	}

	/**
	 * Get current state
	 */
	public getCurrentState(): State | null {
		return this.currentState;
	}

	/**
	 * Get current state name
	 */
	public getCurrentStateName(): StateName | null {
		return this.currentStateName;
	}
}
