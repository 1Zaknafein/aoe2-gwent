import { CardDatabase } from "./CardDatabase";

/**
 * ScoreCalculator - Handles all scoring logic
 * Responsibilities:
 * - Calculate total score for a player's board
 * - Compare scores between players
 * - Validate client-reported scores
 */
export class ScoreCalculator {
	/**
	 * Calculate total score for a player's board
	 */
	public calculateBoardScore(board: {
		melee: number[];
		ranged: number[];
		siege: number[];
	}): number {
		let totalScore = 0;

		// Sum all cards in all rows
		for (const row of [board.melee, board.ranged, board.siege]) {
			for (const cardId of row) {
				const cardData = CardDatabase.getCardById(cardId);
				if (cardData) {
					totalScore += cardData.score;
				} else {
					console.warn(`⚠️ Card ${cardId} not found in database`);
				}
			}
		}

		return totalScore;
	}

	/**
	 * Calculate scores for both players
	 */
	public calculateScores(boards: Map<string, { melee: number[]; ranged: number[]; siege: number[] }>): Map<string, number> {
		const scores = new Map<string, number>();

		for (const [playerId, board] of boards) {
			scores.set(playerId, this.calculateBoardScore(board));
		}

		return scores;
	}

	/**
	 * Compare scores and determine winner
	 */
	public determineWinner(scores: Map<string, number>): string | "tie" {
		let maxScore = -1;
		let winner = "tie";

		for (const [playerId, score] of scores) {
			if (score > maxScore) {
				maxScore = score;
				winner = playerId;
			} else if (score === maxScore) {
				winner = "tie";
			}
		}

		return winner;
	}
}
