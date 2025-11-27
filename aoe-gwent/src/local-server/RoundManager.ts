/**
 * RoundManager - Manages the 3-round game lifecycle
 * Responsibilities:
 * - Track round number (1-3)
 * - Track round wins per player (best of 3)
 * - Determine round winners
 * - Detect game end
 * - Coordinate round transitions
 */
export class RoundManager {
	private roundNumber: number;
	private roundWins: Map<string, number>;
	private readonly playerIds: [string, string];
	private readonly MAX_ROUNDS = 3;
	private readonly ROUNDS_TO_WIN = 2;

	constructor(playerIds: [string, string]) {
		this.playerIds = playerIds;
		this.roundNumber = 1;
		this.roundWins = new Map([
			[playerIds[0], 0],
			[playerIds[1], 0],
		]);
	}

	/**
	 * Get current round number
	 */
	public getCurrentRound(): number {
		return this.roundNumber;
	}

	/**
	 * Get round wins for a player
	 */
	public getRoundWins(playerId: string): number {
		return this.roundWins.get(playerId) || 0;
	}

	/**
	 * Get all round wins
	 */
	public getAllRoundWins(): { player1: number; player2: number } {
		return {
			player1: this.roundWins.get(this.playerIds[0]) || 0,
			player2: this.roundWins.get(this.playerIds[1]) || 0,
		};
	}

	/**
	 * Record a round winner
	 * Returns true if the game has ended (someone won 2 rounds)
	 */
	public recordRoundWinner(winnerId: string | "tie"): {
		gameEnded: boolean;
		gameWinner: string | "tie" | null;
	} {
		if (winnerId !== "tie") {
			const currentWins = this.roundWins.get(winnerId) || 0;
			this.roundWins.set(winnerId, currentWins + 1);
		} else {
			// In a tie, both players get a win point (Gwent rules)
			// Or neither gets a point? Let's stick to Gwent rules: both get a point
			// Actually, let's keep it simple: both get a point
			this.playerIds.forEach((pid) => {
				const wins = this.roundWins.get(pid) || 0;
				this.roundWins.set(pid, wins + 1);
			});
		}

		this.roundNumber++;

		return this.checkGameEnd();
	}

	/**
	 * Check if the game has ended
	 */
	private checkGameEnd(): {
		gameEnded: boolean;
		gameWinner: string | "tie" | null;
	} {
		const p1Wins = this.roundWins.get(this.playerIds[0]) || 0;
		const p2Wins = this.roundWins.get(this.playerIds[1]) || 0;

		// Check if someone reached winning condition
		if (p1Wins >= this.ROUNDS_TO_WIN && p2Wins >= this.ROUNDS_TO_WIN) {
			return { gameEnded: true, gameWinner: "tie" };
		} else if (p1Wins >= this.ROUNDS_TO_WIN) {
			return { gameEnded: true, gameWinner: this.playerIds[0] };
		} else if (p2Wins >= this.ROUNDS_TO_WIN) {
			return { gameEnded: true, gameWinner: this.playerIds[1] };
		}

		// Check if max rounds reached (should be covered above usually, but for safety)
		if (this.roundNumber > this.MAX_ROUNDS) {
			if (p1Wins > p2Wins) {
				return { gameEnded: true, gameWinner: this.playerIds[0] };
			} else if (p2Wins > p1Wins) {
				return { gameEnded: true, gameWinner: this.playerIds[1] };
			} else {
				return { gameEnded: true, gameWinner: "tie" };
			}
		}

		return { gameEnded: false, gameWinner: null };
	}
}
