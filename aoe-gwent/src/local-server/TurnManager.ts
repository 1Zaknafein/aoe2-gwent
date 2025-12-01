import { PlayerID } from "../shared/types";

/**
 * Handles turn-based logic for the game
 */
export class TurnManager {
	private currentTurn: PlayerID;
	private passedPlayers: Set<PlayerID>;
	private readonly playerIds: [PlayerID, PlayerID];

	constructor(playerIds: [PlayerID, PlayerID], startingPlayer: PlayerID) {
		this.playerIds = playerIds;
		this.currentTurn = startingPlayer;
		this.passedPlayers = new Set();
	}

	/**
	 * Get the current turn player ID
	 */
	public getCurrentTurn(): PlayerID {
		return this.currentTurn;
	}

	/**
	 * Get the opponent of a given player
	 */
	public getOpponentId(playerId: PlayerID): PlayerID {
		const index = this.playerIds.indexOf(playerId);
		if (index === -1) {
			throw new Error(`Invalid player ID: ${playerId}`);
		}
		return this.playerIds[index === 0 ? 1 : 0];
	}

	/**
	 * Check if a player can currently act
	 */
	public canPlayerAct(playerId: PlayerID): boolean {
		// Player cannot act if they've already passed
		if (this.passedPlayers.has(playerId)) {
			return false;
		}

		// Player can only act on their turn
		return this.currentTurn === playerId;
	}

	/**
	 * Switch turn to the other player
	 * If the other player has passed, turn stays with current player
	 */
	public switchTurn(): void {
		const opponentId = this.getOpponentId(this.currentTurn);

		// If opponent has passed, turn stays with current player
		if (this.passedPlayers.has(opponentId)) {
			return;
		}

		// Otherwise switch turn
		this.currentTurn = opponentId;
	}

	/**
	 * Handle a player passing their turn
	 */
	public passTurn(playerId: PlayerID): void {
		if (!this.canPlayerAct(playerId)) {
			throw new Error("Player cannot pass turn");
		}

		this.passedPlayers.add(playerId);
		this.switchTurn();
	}

	/**
	 * Mark a player as passed (without switching turn)
	 */
	public markPlayerPassed(playerId: PlayerID): void {
		this.passedPlayers.add(playerId);
	}

	/**
	 * Check if both players have passed
	 */
	public haveBothPlayersPassed(): boolean {
		return this.passedPlayers.size === this.playerIds.length;
	}

	/**
	 * Reset for new round
	 */
	public resetRound(startingPlayer: PlayerID): void {
		this.passedPlayers.clear();
		this.currentTurn = startingPlayer;
	}

	/**
	 * Auto-pass if player has no cards left
	 * Returns true if player was auto-passed
	 */
	public autoPass(playerId: PlayerID, handSize: number): boolean {
		if (handSize === 0 && !this.passedPlayers.has(playerId)) {
			this.passedPlayers.add(playerId);
			return true;
		}
		return false;
	}
}
