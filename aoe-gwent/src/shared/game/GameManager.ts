import { LocalGameSession } from "../../local-server/LocalGameSession";
import { BotPlayer } from "../../local-server/BotPlayer";
import { PlayerID } from "../types";

/**
 * GameManager - Central game state manager
 * Tracks overall game state and provides access to game components
 */
export class GameManager {
	private gameSession: LocalGameSession | null = null;
	private botPlayer: BotPlayer | null = null;
	private playerId: PlayerID;

	constructor(playerId: PlayerID) {
		this.playerId = playerId;
	}

	/**
	 * Initialize game session and bot player
	 */
	public initializeGame(): void {
		this.gameSession = new LocalGameSession(
			this.playerId,
			"Player",
			PlayerID.OPPONENT,
			"Opponent"
		);

		this.botPlayer = new BotPlayer(PlayerID.OPPONENT, this.gameSession, 1000);
	}

	/**
	 * Get the game session
	 */
	public getGameSession(): LocalGameSession | null {
		return this.gameSession;
	}

	/**
	 * Get the bot player
	 */
	public getBotPlayer(): BotPlayer | null {
		return this.botPlayer;
	}

	/**
	 * Get player ID
	 */
	public getPlayerId(): PlayerID {
		return this.playerId;
	}

	/**
	 * Get player name
	 */
	public getPlayerName(): string {
		return "Player";
	}

	/**
	 * Check if it's the player's turn
	 */
	public isPlayerTurn(): boolean {
		if (!this.gameSession) return false;
		const state = this.gameSession.getGameState();
		return state.currentTurn === this.playerId;
	}

	/**
	 * Check if it's the bot's turn
	 */
	public isBotTurn(): boolean {
		if (!this.gameSession) return false;
		const state = this.gameSession.getGameState();
		return state.currentTurn !== this.playerId;
	}

	/**
	 * Get current round number
	 */
	public getCurrentRound(): number {
		if (!this.gameSession) return 1;
		return this.gameSession.getGameState().roundNumber;
	}

	/**
	 * Check if both players have passed
	 */
	public haveBothPlayersPassed(): boolean {
		if (!this.gameSession) return false;
		const state = this.gameSession.getGameState();
		return state.passedPlayers.size === 2;
	}

	/**
	 * Get current game phase
	 */
	public getCurrentPhase(): string {
		if (!this.gameSession) return "waiting";
		return this.gameSession.getGameState().phase;
	}
}
