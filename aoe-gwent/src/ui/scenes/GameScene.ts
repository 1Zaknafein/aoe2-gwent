import { PixiContainer, PixiSprite } from "../../plugins/engine";
import { Manager, SceneInterface } from "../../entities/manager";
import { CardContainerManager } from "../../entities/card";
import { Button, ScoreDisplay, DebugPanel } from "../components";
import { CardInteractionManager } from "../managers";
import { CardDatabase } from "../../shared/database";
import {
	PlayerDisplayManager,
	PlayerDisplayManagerConfig,
} from "../../entities/player";
import { Sprite } from "pixi.js";
import { GameController } from "../../shared/game";
import type { GameState, EnemyCardPlacedEvent } from "../../shared/game";

export class GameScene extends PixiContainer implements SceneInterface {
	private _gameBoard: Sprite;
	private _originalBoardWidth: number;
	private _originalBoardHeight: number;

	private _cardContainers: CardContainerManager;
	private _cardInteractionManager: CardInteractionManager;
	private _gameController: GameController;

	private _multiTransferButton!: Button;
	private _drawPlayerCardButton!: Button;
	private _drawEnemyCardButton!: Button;

	private _playerDeckIds: number[] = [];
	private _enemyDeckIds: number[] = [];

	private _scoreDisplay!: ScoreDisplay;
	private _playerDisplayManager!: PlayerDisplayManager;
	private _debugPanel!: DebugPanel;

	constructor() {
		super();
		this.interactive = true;

		this._gameBoard = PixiSprite.from("background");

		this._gameBoard.label = "game_board";

		this._originalBoardWidth = this._gameBoard.width;
		this._originalBoardHeight = this._gameBoard.height;

		this.addChild(this._gameBoard);

		this._cardContainers = new CardContainerManager();

		// Initialize game controller
		this._gameController = new GameController(this._cardContainers);

		this._cardInteractionManager = new CardInteractionManager(
			this._cardContainers,
			this._gameController
		);

		this.setupGameControllerEvents();

		this.createCardContainers();
		this.createScoreDisplaySystem();
		this.createPlayerDisplaySystem();
		this.createTestUI();
		this.createDebugPanel();

		this.resizeAndCenter(Manager.width, Manager.height);
	}

	private createCardContainers(): void {
		const boardWidth = this._gameBoard.width;
		const boardHeight = this._gameBoard.height;
		const gameAreaCenterX = boardWidth / 2 + 110;

		const { player, enemy, weather } = this._cardContainers;

		[
			player.melee,
			player.ranged,
			player.siege,
			enemy.melee,
			enemy.ranged,
			enemy.siege,
		].forEach((row) => row.scale.set(0.7));

		[player.deck, enemy.deck].forEach((deck) => deck.scale.set(0.95));

		[weather, player.hand, enemy.hand, player.discard, enemy.discard].forEach(
			(hand) => hand.scale.set(0.8)
		);

		player.hand.setPosition(gameAreaCenterX, boardHeight - 235);
		player.melee.setPosition(gameAreaCenterX, 660);
		player.ranged.setPosition(gameAreaCenterX, 835);
		player.siege.setPosition(gameAreaCenterX, 1015);
		player.deck.setPosition(boardWidth - 105, boardHeight - 265);

		player.discard.setPosition(2132, 1200);

		enemy.hand.setPosition(gameAreaCenterX, -110);
		enemy.melee.setPosition(gameAreaCenterX, 458);
		enemy.ranged.setPosition(gameAreaCenterX, 275);
		enemy.siege.setPosition(gameAreaCenterX, 99);
		enemy.discard.setPosition(2129, 196);
		enemy.deck.setPosition(boardWidth - 105, 155);

		weather.setPosition(315, boardHeight / 2 - 5);

		this._gameBoard.addChild(
			player.melee,
			player.ranged,
			player.siege,
			player.hand,
			player.discard,
			player.deck,
			enemy.melee,
			enemy.ranged,
			enemy.siege,
			enemy.hand,
			enemy.discard,
			enemy.deck,
			weather
		);

		this._cardInteractionManager.setupContainerInteractivity();
		this.addSampleCards();
		this._cardInteractionManager.setupPlayerHandInteractions();

		this.on("pointerup", () =>
			this._cardInteractionManager.handleGlobalClick()
		);
	}

	/**
	 * Debug function for adding sample cards to player and enemy hands.
	 * TODO REMOVE ONCE GAME LOGIC IS IN PLACE.
	 */
	private addSampleCards(): void {
		// Generate random decks for both players
		this._playerDeckIds = CardDatabase.generateRandomDeck(15);
		this._enemyDeckIds = CardDatabase.generateRandomDeck(15);

		console.log("Player deck card IDs:", this._playerDeckIds);
		console.log("Enemy deck card IDs:", this._enemyDeckIds);

		// Add initial cards to player hand from their deck
		const initialPlayerHandIds = this._playerDeckIds.splice(0, 5); // Remove first 5 cards from deck
		const playerHandCards =
			CardDatabase.generateCardsFromIds(initialPlayerHandIds);
		this._cardContainers.player.hand.addCardsBatch(playerHandCards);

		// Add initial cards to enemy hand from their deck
		const initialEnemyHandIds = this._enemyDeckIds.splice(0, 5); // Remove first 5 cards from deck
		const enemyHandCards =
			CardDatabase.generateCardsFromIds(initialEnemyHandIds);
		this._cardContainers.enemy.hand.addCardsBatch(enemyHandCards);
	}

	private createScoreDisplaySystem(): void {
		this._scoreDisplay = new ScoreDisplay();
		this._gameBoard.addChild(this._scoreDisplay);

		// Set up automatic score updates
		const { player, enemy } = this._cardContainers;
		this._scoreDisplay.setupScoreEventListeners(player, enemy);
	}

	private createPlayerDisplaySystem(): void {
		const config: PlayerDisplayManagerConfig = {
			playerName: "PLAYER",
			enemyName: "ENEMY",
			playerPosition: { x: 180, y: 1050 },
			enemyPosition: { x: 180, y: 40 },
		};

		this._playerDisplayManager = new PlayerDisplayManager(config);
		this._gameBoard.addChild(this._playerDisplayManager);

		// Set up automatic score tracking
		const { player, enemy } = this._cardContainers;
		const playerContainers = [player.melee, player.ranged, player.siege];
		const enemyContainers = [enemy.melee, enemy.ranged, enemy.siege];

		this._playerDisplayManager.setupScoreTracking(
			playerContainers,
			enemyContainers
		);

		this.setupHandCountTracking();
		this.updatePlayerDisplayHandCounts();

		// Position all display elements
		this._playerDisplayManager.positionDisplayElements();
	}

	private setupHandCountTracking(): void {
		const { player, enemy } = this._cardContainers;

		// Listen for card additions and removals from hand containers
		const updateHandCounts = () => this.updatePlayerDisplayHandCounts();

		player.hand.on("cardAdded", updateHandCounts);
		player.hand.on("cardRemoved", updateHandCounts);
		enemy.hand.on("cardAdded", updateHandCounts);
		enemy.hand.on("cardRemoved", updateHandCounts);
	}

	private updatePlayerDisplayHandCounts(): void {
		if (this._playerDisplayManager) {
			const playerHandCount = this._cardContainers.player.hand.cardCount;
			const enemyHandCount = this._cardContainers.enemy.hand.cardCount;
			this._playerDisplayManager.updateHandCounts(
				playerHandCount,
				enemyHandCount
			);
		}
	}

	private createTestUI(): void {
		this._multiTransferButton = new Button(
			"Transfer 3",
			() => {
				this.transferMultipleCards();
			},
			100,
			35
		);
		this._multiTransferButton.x = 350;
		this._multiTransferButton.y = 550;
		this.addChild(this._multiTransferButton);

		this._drawPlayerCardButton = new Button(
			"Draw Player Card",
			() => {
				this.drawPlayerCard();
			},
			140,
			35
		);
		this._drawPlayerCardButton.x = 50;
		this._drawPlayerCardButton.y = 550;
		this.addChild(this._drawPlayerCardButton);

		this._drawEnemyCardButton = new Button(
			"Draw Enemy Card",
			() => {
				this.drawEnemyCard();
			},
			140,
			35
		);
		this._drawEnemyCardButton.x = 200;
		this._drawEnemyCardButton.y = 550;
		this.addChild(this._drawEnemyCardButton);
	}

	private setupGameControllerEvents(): void {
		// Listen for enemy actions
		this._gameController.on("enemyCardPlaced", (data: EnemyCardPlacedEvent) => {
			console.log("Enemy placed card:", data);
		});

		this._gameController.on("enemyPassedTurn", () => {
			console.log("Enemy passed turn");
		});

		this._gameController.on("gameStateChanged", (gameState: GameState) => {
			console.log("Game state changed in scene:", gameState);
		});

		// Try to connect to server (will fail gracefully for now)
		this._gameController.connectToServer().then((connected) => {
			if (connected) {
				console.log("Connected to game server");
			} else {
				console.log("Could not connect to server - using debug mode");
			}
		});
	}

	private createDebugPanel(): void {
		this._debugPanel = new DebugPanel(this._gameController.gameStateManager);
		this.addChild(this._debugPanel);
	}

	private async drawPlayerCard(): Promise<void> {
		if (this._playerDeckIds.length === 0) {
			return;
		}

		const cardId = this._playerDeckIds.shift();

		if (cardId !== undefined) {
			const cardData = CardDatabase.getCardById(cardId);
			if (cardData) {
				const deckPosition =
					this._cardContainers.player.deck.getTopCardGlobalPosition();

				await this._cardContainers.player.hand.addCardWithAnimation(
					cardData,
					deckPosition,
					0.6
				);
			}
		}
	}

	private async drawEnemyCard(): Promise<void> {
		if (this._enemyDeckIds.length === 0) {
			return;
		}

		const cardId = this._enemyDeckIds.shift();

		if (cardId !== undefined) {
			const cardData = CardDatabase.getCardById(cardId);
			if (cardData) {
				const deckPosition =
					this._cardContainers.enemy.deck.getTopCardGlobalPosition();

				await this._cardContainers.enemy.hand.addCardWithAnimation(
					cardData,
					deckPosition,
					0.6
				);
			}
		}
	}

	private async transferMultipleCards(): Promise<void> {
		const cardsToTransfer = Math.min(
			3,
			this._cardContainers.player.hand.cardCount
		);

		for (let i = 0; i < cardsToTransfer; i++) {
			// Add slight delay between each transfer (50ms)
			if (i > 0) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			if (this._cardContainers.player.hand.cardCount > 0) {
				this._cardContainers.player.hand.transferCardTo(
					0,
					this._cardContainers.player.ranged
				);
			}
		}
	}

	private resizeAndCenter(screenWidth: number, screenHeight: number): void {
		const scaleX = screenWidth / this._originalBoardWidth;
		const scaleY = screenHeight / this._originalBoardHeight;
		const scale = Math.min(scaleX, scaleY);

		this._gameBoard.width = this._originalBoardWidth * scale;
		this._gameBoard.height = this._originalBoardHeight * scale;

		this._gameBoard.x = (screenWidth - this._gameBoard.width) / 2;
		this._gameBoard.y = (screenHeight - this._gameBoard.height) / 2;
	}

	update(_framesPassed: number): void {}

	resize(width: number, height: number): void {
		this.resizeAndCenter(width, height);
	}
}
