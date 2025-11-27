import { EventEmitter } from "pixi.js";
import { LocalGameSession } from "../../local-server/LocalGameSession";
import { BotPlayer } from "../../local-server/BotPlayer";
import { ActionType, GamePhase } from "../../local-server/GameTypes";
import { CardData } from "../types/CardData";
import { CardType } from "../types/CardTypes";
import { CardContainerManager } from "../../entities/card";
import { CardDatabase } from "../../local-server/CardDatabase";

/**
 * Manages local game with bot opponent
 */
export class LocalGameController extends EventEmitter {
	private gameSession: LocalGameSession | null = null;
	private botPlayer: BotPlayer | null = null;
	private cardContainers: CardContainerManager;
	private playerId: string;
	private playerName: string;

	constructor(cardContainers: CardContainerManager, playerId: string = "player1", playerName: string = "Player") {
		super();
		this.cardContainers = cardContainers;
		this.playerId = playerId;
		this.playerName = playerName;
	}

	/**
	 * Start a local game (replaces connectToServer)
	 */
	public async startLocalGame(): Promise<boolean> {
		try {
			// Create game session
			this.gameSession = new LocalGameSession(
				this.playerId,
				this.playerName,
				"bot",
				"Bot Opponent"
			);

			// Create bot player
			this.botPlayer = new BotPlayer("bot", this.gameSession, 1000);

			// Listen for state changes
			this.gameSession.onGameStateChange(() => {
				this.handleStateChange();
			});

			// Start the game
			this.gameSession.startGame();

			// Setup initial UI
			this.setupInitialGame();

			return true;
		} catch (error) {
			console.error("Failed to start local game:", error);
			return false;
		}
	}

	/**
	 * Setup initial game state
	 */
	private setupInitialGame(): void {
		if (!this.gameSession) return;

		const gameData = this.gameSession.getGameDataForPlayer(this.playerId);
		if (!gameData) return;

		// Setup player hand
		const playerHand = this.cardContainers.player.hand;
		playerHand.removeAllCards();

		const playerHandIds = gameData.playerHand;
		playerHandIds.forEach((cardId: number) => {
			const cardData = CardDatabase.getCardById(cardId);
			if (cardData) {
				playerHand.addCard({
					id: cardData.id,
					name: cardData.name,
					score: cardData.score,
					type: cardData.type,
				});
			}
		});

		// Setup opponent hand (card backs)
		const opponentHand = this.cardContainers.enemy.hand;
		opponentHand.removeAllCards();
		const opponentHandSize = gameData.gameState.handSizes.bot || 10;
		for (let i = 0; i < opponentHandSize; i++) {
			opponentHand.addCard({
				id: 0,
				name: "Hidden",
				score: 0,
				type: CardType.MELEE,
			});
		}

		// Emit game started
		this.emit("gameStarted", {
			opponentName: gameData.opponentName,
			isPlayerTurn: gameData.gameState.isMyTurn,
		});

		// Check if bot should take turn
		this.checkBotTurn();
	}

	/**
	 * Handle state changes from game session
	 */
	private handleStateChange(): void {
		if (!this.gameSession) return;

		const state = this.gameSession.getGameState();

		// Emit state updated
		this.emit("stateUpdated", {
			phase: this.mapPhase(state.phase),
			currentTurn: state.currentTurn,
			roundNumber: state.roundNumber,
			playerRoundWins: state.scores.get(this.playerId) || 0,
			opponentRoundWins: state.scores.get("bot") || 0,
			playerHandSize: state.handSizes.get(this.playerId) || 0,
			opponentHandSize: state.handSizes.get("bot") || 0,
			playerPassed: state.passedPlayers.has(this.playerId),
			opponentPassed: state.passedPlayers.has("bot"),
		});

		// Check turn changes
		const isPlayerTurn = state.currentTurn === this.playerId;
		this.emit("turnChanged", { isPlayerTurn });

		if (isPlayerTurn) {
			this.emit("playerTurnStarted");
		} else {
			this.emit("opponentTurnStarted");
			this.checkBotTurn();
		}

		// Check for round/game end
		if (state.phase === GamePhase.ROUND_END) {
			this.handleRoundEnd();
		} else if (state.phase === GamePhase.GAME_END) {
			this.handleGameEnd();
		}
	}

	/**
	 * Check if bot should take a turn
	 */
	private async checkBotTurn(): Promise<void> {
		if (!this.botPlayer || !this.gameSession) return;

		const state = this.gameSession.getGameState();
		if (state.currentTurn === "bot" && !state.passedPlayers.has("bot")) {
			// Bot's turn
			await this.botPlayer.takeTurnIfNeeded();
		}
	}

	/**
	 * Handle round end
	 */
	private handleRoundEnd(): void {
		if (!this.gameSession) return;

		const boards = this.gameSession.getBoardStates();
		const playerBoard = boards.get(this.playerId);
		const botBoard = boards.get("bot");

		if (!playerBoard || !botBoard) return;

		// Calculate scores
		let playerScore = 0;
		let botScore = 0;

		for (const row of [playerBoard.melee, playerBoard.ranged, playerBoard.siege]) {
			for (const cardId of row) {
				const card = CardDatabase.getCardById(cardId);
				if (card) playerScore += card.score;
			}
		}

		for (const row of [botBoard.melee, botBoard.ranged, botBoard.siege]) {
			for (const cardId of row) {
				const card = CardDatabase.getCardById(cardId);
				if (card) botScore += card.score;
			}
		}

		const state = this.gameSession.getGameState();
		const winner = playerScore > botScore ? this.playerId : botScore > playerScore ? "bot" : "tie";

		this.emit("roundEnded", {
			winner,
			playerScore,
			opponentScore: botScore,
			playerRoundWins: state.scores.get(this.playerId) || 0,
			opponentRoundWins: state.scores.get("bot") || 0,
		});

		// Clear boards after delay
		setTimeout(() => {
			this.clearAllBoards();
		}, 3000);
	}

	/**
	 * Handle game end
	 */
	private handleGameEnd(): void {
		if (!this.gameSession) return;

		const state = this.gameSession.getGameState();
		const playerWins = state.scores.get(this.playerId) || 0;
		const botWins = state.scores.get("bot") || 0;
		const playerWon = playerWins > botWins;

		this.emit("gameEnded", {
			playerWon,
			winner: playerWon ? this.playerId : "bot",
		});
	}

	/**
	 * Place a card
	 */
	public async placeCard(cardId: number, targetRow: "melee" | "ranged" | "siege"): Promise<void> {
		if (!this.gameSession || !this.canPlayerAct()) {
			throw new Error("Cannot act right now");
		}

		try {
			const result = this.gameSession.processAction({
				type: ActionType.PLACE_CARD,
				playerId: this.playerId,
				cardId,
				targetRow,
			});

			if (!result.success) {
				throw new Error(result.error || "Failed to place card");
			}

			// Remove card from hand container
			const playerHand = this.cardContainers.player.hand;
			const cardIndex = this.findCardIndexInHand(cardId);
			if (cardIndex !== -1) {
				const card = playerHand.getCard(cardIndex);
				if (card) {
					const targetContainer = this.getPlayerRowContainer(targetRow);
					if (targetContainer) {
						playerHand.transferCardTo(cardIndex, targetContainer);
					}
				}
			}

			this.emit("playerCardPlaced", { cardId, targetRow });

			// Update opponent hand size display
			this.updateOpponentHandDisplay();

			// Check bot turn after a delay
			setTimeout(() => this.checkBotTurn(), 500);
		} catch (error) {
			console.error("Failed to place card:", error);
			throw error;
		}
	}

	/**
	 * Pass turn
	 */
	public async passTurn(): Promise<void> {
		if (!this.gameSession || !this.canPlayerAct()) {
			throw new Error("Cannot act right now");
		}

		try {
			const result = this.gameSession.processAction({
				type: ActionType.PASS_TURN,
				playerId: this.playerId,
			});

			if (!result.success) {
				throw new Error(result.error || "Failed to pass");
			}

			this.emit("playerPassed", { isPlayer: true });

			// Check bot turn
			setTimeout(() => this.checkBotTurn(), 500);
		} catch (error) {
			console.error("Failed to pass turn:", error);
			throw error;
		}
	}

	/**
	 * Helper methods
	 */
	private findCardIndexInHand(cardId: number): number {
		const hand = this.cardContainers.player.hand;
		for (let i = 0; i < hand.cardCount; i++) {
			const card = hand.getCard(i);
			if (card && card.cardData.id === cardId) {
				return i;
			}
		}
		return -1;
	}

	private getPlayerRowContainer(row: "melee" | "ranged" | "siege") {
		switch (row) {
			case "melee":
				return this.cardContainers.player.melee;
			case "ranged":
				return this.cardContainers.player.ranged;
			case "siege":
				return this.cardContainers.player.siege;
		}
	}

	private updateOpponentHandDisplay(): void {
		if (!this.gameSession) return;

		const state = this.gameSession.getGameState();
		const botHandSize = state.handSizes.get("bot") || 0;
		const opponentHand = this.cardContainers.enemy.hand;

		// Adjust number of card backs
		while (opponentHand.cardCount > botHandSize) {
			opponentHand.removeCard(0);
		}
	}

	private clearAllBoards(): void {
		// Player rows
		this.cardContainers.player.melee.removeAllCards();
		this.cardContainers.player.ranged.removeAllCards();
		this.cardContainers.player.siege.removeAllCards();

		// Opponent rows
		this.cardContainers.enemy.melee.removeAllCards();
		this.cardContainers.enemy.ranged.removeAllCards();
		this.cardContainers.enemy.siege.removeAllCards();
	}

	private mapPhase(phase: GamePhase): string {
		switch (phase) {
			case GamePhase.WAITING_FOR_GAME_START:
				return "waiting";
			case GamePhase.PLAYER_TURN:
			case GamePhase.ENEMY_TURN:
				return "playing";
			case GamePhase.ROUND_END:
				return "round_end";
			case GamePhase.GAME_END:
				return "game_end";
			default:
				return "waiting";
		}
	}

	/**
	 * Public API 
	 */
	public canPlayerAct(): boolean {
		if (!this.gameSession) return false;
		const state = this.gameSession.getGameState();
		return (
			state.currentTurn === this.playerId &&
			!state.passedPlayers.has(this.playerId) &&
			state.phase === GamePhase.PLAYER_TURN
		);
	}

	public isPlayerTurn(): boolean {
		if (!this.gameSession) return false;
		return this.gameSession.getGameState().currentTurn === this.playerId;
	}

	public getGameState(): any {
		if (!this.gameSession) {
			return {
				phase: "waiting",
				currentTurn: "",
				roundNumber: 1,
				playerRoundWins: 0,
				opponentRoundWins: 0,
				playerHandSize: 0,
				opponentHandSize: 0,
				playerPassed: false,
				opponentPassed: false,
			};
		}

		const state = this.gameSession.getGameState();
		return {
			phase: this.mapPhase(state.phase),
			currentTurn: state.currentTurn,
			roundNumber: state.roundNumber,
			playerRoundWins: state.scores.get(this.playerId) || 0,
			opponentRoundWins: state.scores.get("bot") || 0,
			playerHandSize: state.handSizes.get(this.playerId) || 0,
			opponentHandSize: state.handSizes.get("bot") || 0,
			playerPassed: state.passedPlayers.has(this.playerId),
			opponentPassed: state.passedPlayers.has("bot"),
		};
	}

	public getPlayerHand(): CardData[] {
		if (!this.gameSession) return [];

		const handIds = this.gameSession.getPlayerHand(this.playerId);
		if (!handIds) return [];

		return handIds.map((cardId) => {
			const card = CardDatabase.getCardById(cardId);
			return card
				? {
						id: card.id,
						name: card.name,
						score: card.score,
						type: card.type,
				  }
				: { id: 0, name: "Unknown", score: 0, type: CardType.MELEE };
		});
	}

}
