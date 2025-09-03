import { EventEmitter } from "pixi.js";
import { GameStateManager, ActionType } from "./GameStateManager";
import { ServerAPI } from "../../api/ServerAPI";
import { CardContainerManager } from "../../entities/card";
import { CardDatabase } from "../../shared/database";
import { CardData } from "../../entities/card";

// Event type definitions for GameController
export interface EnemyCardPlacedEvent {
	cardData: CardData;
	targetRow: "melee" | "ranged" | "siege";
	container: any; // CardContainer type
}

/**
 * Central game controller that handles game logic and coordinates between
 * UI components, server communication, and game state
 */
export class GameController extends EventEmitter {
	private _gameStateManager: GameStateManager;
	private _serverAPI: ServerAPI;
	private _cardContainers: CardContainerManager;

	constructor(cardContainers: CardContainerManager) {
		super();

		this._cardContainers = cardContainers;
		this._gameStateManager = new GameStateManager();
		this._serverAPI = new ServerAPI();

		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		// Listen for enemy actions from the game state manager
		this._gameStateManager.on("enemyAction", (action) => {
			this.handleEnemyAction(action);
		});

		// Listen for game state changes
		this._gameStateManager.on("gameStateChanged", (gameState) => {
			console.log("Game state changed:", gameState);
			this.emit("gameStateChanged", gameState);
		});

		// Listen for game start
		this._gameStateManager.on("gameStarted", (gameState) => {
			console.log("Game started:", gameState);
			this.emit("gameStarted", gameState);
		});
	}

	/**
	 * Handle enemy actions received from the server
	 */
	private async handleEnemyAction(action: any): Promise<void> {
		console.log("GameController: Handling enemy action", action);

		switch (action.type) {
			case ActionType.PLACE_CARD:
				await this.handleEnemyPlaceCard(action);
				break;
			case ActionType.PASS_TURN:
				this.handleEnemyPassTurn(action);
				break;
			case ActionType.DRAW_CARD:
				await this.handleEnemyDrawCard(action);
				break;
			default:
				console.warn("Unknown enemy action type:", action.type);
		}
	}

	/**
	 * Handle enemy placing a card on the board
	 */
	private async handleEnemyPlaceCard(action: any): Promise<void> {
		const { cardId, targetRow } = action;

		if (!cardId || !targetRow) {
			console.error(
				"Invalid enemy place card action - missing cardId or targetRow"
			);
			return;
		}

		// Get card data
		const cardData = CardDatabase.getCardById(cardId);
		if (!cardData) {
			console.error("Could not find card data for ID:", cardId);
			return;
		}

		// Get target container
		const targetContainer = this.getEnemyRowContainer(targetRow);
		if (!targetContainer) {
			console.error("Could not find target container for row:", targetRow);
			return;
		}

		// Check if enemy has cards in hand to play
		const enemyHand = this._cardContainers.enemy.hand;
		if (enemyHand.cardCount === 0) {
			console.warn("Enemy has no cards in hand - adding card to hand first");
			// Add the card to enemy hand first
			await enemyHand.addCardWithAnimation(cardData, { x: -100, y: -100 }, 0.3);
		}

		// Find the card in enemy hand or add it if not found
		let cardToMove = enemyHand
			.getAllCards()
			.find((card) => card.cardData.name === cardData.name);

		if (!cardToMove) {
			// If card not found in hand, add it temporarily
			console.log("Card not found in enemy hand, adding it temporarily");
			await enemyHand.addCardWithAnimation(cardData, { x: -100, y: -100 }, 0.1);
			cardToMove = enemyHand
				.getAllCards()
				.find((card) => card.cardData.name === cardData.name);
		}

		if (cardToMove) {
			// Get the index of the card to transfer
			const cardIndex = enemyHand.getAllCards().indexOf(cardToMove);
			if (cardIndex !== -1) {
				console.log(`Enemy placing ${cardData.name} on ${targetRow} row`);

				// Transfer the card from enemy hand to target row
				enemyHand.transferCardTo(cardIndex, targetContainer);

				// Emit event for UI updates
				this.emit("enemyCardPlaced", {
					cardData,
					targetRow,
					container: targetContainer,
				});
			}
		} else {
			console.error("Could not find or create card to move");
		}
	}

	/**
	 * Handle enemy passing their turn
	 */
	private handleEnemyPassTurn(_action: any): void {
		console.log("Enemy passed their turn");
		this.emit("enemyPassedTurn");
	}

	/**
	 * Handle enemy drawing a card
	 */
	private async handleEnemyDrawCard(_action: any): Promise<void> {
		// This would typically be handled by deck management
		// For now, just log it
		console.log("Enemy drew a card");
		this.emit("enemyDrewCard");
	}

	/**
	 * Get the enemy row container based on row name
	 */
	private getEnemyRowContainer(rowName: string) {
		switch (rowName) {
			case "melee":
				return this._cardContainers.enemy.melee;
			case "ranged":
				return this._cardContainers.enemy.ranged;
			case "siege":
				return this._cardContainers.enemy.siege;
			default:
				return null;
		}
	}

	/**
	 * Send player action to server
	 */
	public async sendPlayerAction(
		cardId: number,
		targetRow: "melee" | "ranged" | "siege"
	): Promise<void> {
		const success = await this._serverAPI.sendCardPlacement(cardId, targetRow);
		if (success) {
			console.log("Player action sent successfully");
		} else {
			console.error("Failed to send player action");
		}
	}

	/**
	 * Send pass turn action to server
	 */
	public async sendPassTurn(): Promise<void> {
		const success = await this._serverAPI.sendPassTurn();
		if (success) {
			console.log("Pass turn sent successfully");
		} else {
			console.error("Failed to send pass turn");
		}
	}

	/**
	 * Initialize connection to server
	 */
	public async connectToServer(): Promise<boolean> {
		const connected = await this._serverAPI.connect();
		this._gameStateManager.setConnected(connected);

		if (connected) {
			// Start listening for server messages
			this._serverAPI.startListening((response) => {
				this._gameStateManager.handleServerResponse(response);
			});
		}

		return connected;
	}

	/**
	 * Disconnect from server
	 */
	public disconnectFromServer(): void {
		this._serverAPI.disconnect();
		this._serverAPI.stopListening();
		this._gameStateManager.setConnected(false);
	}

	/**
	 * Get game state manager (for debug panel)
	 */
	public get gameStateManager(): GameStateManager {
		return this._gameStateManager;
	}

	/**
	 * Get server API (for debug purposes)
	 */
	public get serverAPI(): ServerAPI {
		return this._serverAPI;
	}

	/**
	 * Check if it's currently player's turn
	 */
	public get isPlayerTurn(): boolean {
		return this._gameStateManager.isPlayerTurn;
	}

	/**
	 * Check if it's currently enemy's turn
	 */
	public get isEnemyTurn(): boolean {
		return this._gameStateManager.isEnemyTurn;
	}

	/**
	 * Get current game state
	 */
	public get gameState() {
		return this._gameStateManager.gameState;
	}
}
