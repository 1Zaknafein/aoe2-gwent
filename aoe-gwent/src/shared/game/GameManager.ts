import { LocalGameSession } from "../../local-server/LocalGameSession";
import { BotPlayer } from "../../local-server/BotPlayer";

/**
 * GameManager - Central game state manager
 * Tracks overall game state and provides access to game components
 */
export class GameManager {
	private gameSession: LocalGameSession | null = null;
	private botPlayer: BotPlayer | null = null;
	private playerId: string;
	private playerName: string;

	constructor(playerId: string, playerName: string) {
		this.playerId = playerId;
		this.playerName = playerName;
	}

	/**
	 * Initialize game session and bot player
	 */
	public initializeGame(botId: string = "bot", botName: string = "Bot Opponent"): void {
		this.gameSession = new LocalGameSession(
			this.playerId,
			this.playerName,
			botId,
			botName
		);

		this.botPlayer = new BotPlayer(botId, this.gameSession, 1000);
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
	public getPlayerId(): string {
		return this.playerId;
	}

	/**
	 * Get player name
	 */
	public getPlayerName(): string {
		return this.playerName;
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
