import { EventEmitter } from "pixi.js";
import { GameFlowManager, GameFlowState, ActionType } from "./GameFlowManager";
import { WebSocketServerAPI } from "../../api/WebSocketServerAPI";
import { CardContainerManager, CardContainer } from "../../entities/card";
import { CardData } from "../../entities/card";

export interface EnemyCardPlacedEvent {
	cardData: CardData;
	targetRow: "melee" | "ranged" | "siege";
}

export class GameController extends EventEmitter {
	private _gameFlowManager: GameFlowManager;
	private _serverAPI: WebSocketServerAPI;
	private _cardContainers: CardContainerManager;

	constructor(cardContainers: CardContainerManager) {
		super();

		this._cardContainers = cardContainers;
		this._gameFlowManager = new GameFlowManager();
		this._serverAPI = new WebSocketServerAPI();

		this.setupEventListeners();
	}

	public get canPlayerAct(): boolean {
		return this._gameFlowManager.canPlayerAct;
	}

	public get isPlayerTurn(): boolean {
		return this._gameFlowManager.gameState.phase === "player_turn";
	}

	public get isEnemyTurn(): boolean {
		return this._gameFlowManager.gameState.phase === "enemy_turn";
	}

	public get areActionsBlocked(): boolean {
		return !this._gameFlowManager.canPlayerAct;
	}

	public get gameState() {
		return this._gameFlowManager.gameState;
	}

	public get gameFlowManager(): GameFlowManager {
		return this._gameFlowManager;
	}

	public get serverAPI(): WebSocketServerAPI {
		return this._serverAPI;
	}

	public get currentFlowState(): GameFlowState {
		return this._gameFlowManager.currentFlowState;
	}

	public get isShowingMessages(): boolean {
		return this._gameFlowManager.isShowingMessages;
	}

	public get cardContainerManager(): CardContainerManager {
		return this._cardContainers;
	}

	/**
	 * Connect to server
	 */
	public async connectToServer(): Promise<boolean> {
		const connected = await this._serverAPI.connect();

		if (connected) {
			// Set up server API message listener after successful connection
			this._serverAPI.startListening((response: any) => {
				console.log("📨 Received server response:", response);
				// Handle the response through the game flow manager
				this._gameFlowManager.handleServerResponse(response);
			});
		}

		this.emit("connectionStatusChanged", connected);
		return connected;
	}

	/**
	 * Disconnect from server
	 */
	public disconnectFromServer(): void {
		this._serverAPI.disconnect();
		this.emit("connectionStatusChanged", false);
	}

	/**
	 * Send player action to server
	 */
	public async sendPlayerAction(
		cardId: number,
		targetRow: "melee" | "ranged" | "siege"
	): Promise<void> {
		if (!this.canPlayerAct) {
			throw new Error("Player cannot act right now");
		}

		this._gameFlowManager.onPlayerActionStarted();

		try {
			const response = await this._serverAPI.sendAction({
				type: ActionType.PLACE_CARD,
				cardId,
				targetRow,
				playerId: "player",
			});
			// For now, assume success since the WebSocketServerAPI doesn't return proper success/error format
			console.log("Action sent:", response);
		} catch (error) {
			this._gameFlowManager.onPlayerActionFailed();
			throw error;
		}
	}

	/**
	 * Send pass action to server
	 */
	public async sendPassTurn(): Promise<void> {
		if (!this.canPlayerAct) {
			throw new Error("Player cannot act right now");
		}

		this._gameFlowManager.onPlayerActionStarted();

		try {
			const response = await this._serverAPI.sendAction({
				type: ActionType.PASS_TURN,
				playerId: "player",
			});
			console.log("Pass action sent:", response);
		} catch (error) {
			this._gameFlowManager.onPlayerActionFailed();
			throw error;
		}
	}

	/**
	 * Set the message display callback.
	 */
	public setMessageCallback(
		callback: (message: string) => Promise<void>
	): void {
		this._gameFlowManager.on(
			"showMessage",
			(message: string, onComplete: () => void) => {
				callback(message)
					.then(onComplete)
					.catch((error) => {
						console.error("Error in message callback:", error);
						onComplete();
					});
			}
		);
	}

	/**
	 * Setup event listeners for the flow manager
	 */
	private setupEventListeners(): void {
		this._gameFlowManager.on("flowStateChanged", (data) => {
			const { newState, gameState } = data;

			this.emit("flowStateChanged", data);
			this.emit("gameStateChanged", gameState);

			switch (newState) {
				case GameFlowState.PLAYER_TURN_ACTIVE:
					this.emit("playerTurnStarted", gameState);
					this.emit("actionsUnblocked");
					break;
				case GameFlowState.WAITING_FOR_ENEMY:
					this.emit("enemyTurnStarted", gameState);
					this.emit("actionsBlocked");
					break;
				case GameFlowState.SHOWING_MESSAGES:
					this.emit("messagesStarted");
					this.emit("actionsBlocked");
					break;
				case GameFlowState.SENDING_ACTION:
					this.emit("actionsBlocked");
					break;
				case GameFlowState.ROUND_END:
					this.emit("roundEnded", gameState);
					this.emit("actionsBlocked");
					break;
			}
		});

		// Listen for deck data to set up initial game state
		this._gameFlowManager.on("deckDataReceived", (data) => {
			this.emit("deckDataReceived", data);
		});

		// Listen for enemy actions to handle animations
		this._gameFlowManager.on("enemyAction", (action) => {
			this.handleEnemyAction(action);
		});

		// Listen for player names to update displays
		this._gameFlowManager.on("playerNamesReceived", (data) => {
			this.emit("playerNamesReceived", data);
		});
	}

	/**
	 * Handle enemy actions (animations, etc.)
	 */
	private async handleEnemyAction(action: any): Promise<void> {
		switch (action.type) {
			case "place_card":
				await this.handleEnemyPlaceCard(action);
				break;
			case "pass_turn":
				// Pass action is handled by messages, no additional animation needed
				// TODO UPDATE PLAYER DISPLAY TO SHOW PASS
				break;
		}
	}

	/**
	 * Handle enemy placing a card
	 */
	private async handleEnemyPlaceCard(action: any): Promise<void> {
		const { cardId, targetRow } = action;

		if (!cardId || !targetRow) {
			console.error(
				"Invalid enemy place card action - missing cardId or targetRow"
			);
			return;
		}

		// TODO: Server should send complete CardData for enemy actions instead of just cardId
		// For now, skip card data lookup until server is updated to send complete card data
		// const cardData = CardDatabase.getCardById(cardId);
		// if (!cardData) {
		// 	console.error("Could not find card data for ID:", cardId);
		// 	return;
		// }

		console.warn(
			"TODO: Server should send complete CardData for enemy card actions"
		);
		console.log("Enemy played card ID:", cardId, "on row:", targetRow);

		// Skip actual card placement for now until server sends complete card data
		return;

		// TODO: Uncomment this code when server sends complete CardData
		/*
		// Get target container
		const targetContainer = this.getEnemyRowContainer(targetRow);
		if (!targetContainer) {
			console.error("Could not find target container for row:", targetRow);
			return;
		}

		// Get enemy hand
		const enemyHand = this._cardContainers.enemy.hand;
		if (enemyHand.cardCount === 0) {
			console.warn("Enemy has no cards in hand to play");
			return;
		}

		// Take the first dummy card from enemy hand
		const dummyCard = enemyHand.getCard(0);
		if (!dummyCard) {
			console.error("Could not get dummy card from enemy hand");
			return;
		}

		// Reveal the card with flip animation
		await dummyCard.revealCard(cardData);

		// Transfer the card from enemy hand to target row
		enemyHand.transferCardTo(0, targetContainer);

		this.emit("enemyCardPlaced", {
			cardData,
			targetRow,
			container: targetContainer,
		});
		*/
	}

	/**
	 * Get enemy row container by name
	 */
	private getEnemyRowContainer(
		row: "melee" | "ranged" | "siege"
	): CardContainer | null {
		switch (row) {
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
}
