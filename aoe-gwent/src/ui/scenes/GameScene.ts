import { PixiContainer, PixiSprite } from "../../plugins/engine";
import { Manager, SceneInterface } from "../../entities/manager";
import { CardContainerManager } from "../../entities/card";
import { CardType } from "../../shared/types/CardTypes";
import { ScoreDisplay, MessageDisplay } from "../components";
// DebugPanel commented out - only needed for fake server testing
// import { DebugPanel } from "../components";
import { CardInteractionManager } from "../managers";
import {
	PlayerDisplayManager,
	PlayerDisplayManagerConfig,
} from "../../entities/player";
import { Sprite } from "pixi.js";
import { GameController } from "../../shared/game";
// Remove unused import
// import type { EnemyCardPlacedEvent } from "../../shared/game";
import { GamePhase, GameState } from "../../shared/game/GameFlowManager";

export class GameScene extends PixiContainer implements SceneInterface {
	private _gameBoard: Sprite;
	private _originalBoardWidth: number;
	private _originalBoardHeight: number;

	private _cardContainers: CardContainerManager;
	private _cardInteractionManager: CardInteractionManager;
	private _gameController: GameController;

	private _scoreDisplay!: ScoreDisplay;
	private _playerDisplayManager!: PlayerDisplayManager;
	// Debug panel disabled for WebSocket server
	// private _debugPanel!: DebugPanel;
	private _messageDisplay!: MessageDisplay;

	constructor() {
		super();
		this.interactive = true;

		this._gameBoard = PixiSprite.from("background");
		this._gameBoard.label = "game_board";

		this._originalBoardWidth = this._gameBoard.width;
		this._originalBoardHeight = this._gameBoard.height;

		this.addChild(this._gameBoard);

		this._cardContainers = new CardContainerManager();

		this._gameController = new GameController(this._cardContainers);

		this._cardInteractionManager = new CardInteractionManager(
			this._cardContainers,
			this._gameController
		);

		this.setupGameControllerEvents();

		this.createCardContainers();
		this.createScoreDisplaySystem();
		this.createPlayerDisplaySystem();
		this.createDebugPanel();
		this.createMessageDisplay();

		this._gameController.setMessageCallback(this.showMessageAsync.bind(this));

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

		this._cardInteractionManager.setupPlayerHandInteractions();

		this.on("pointerup", () =>
			this._cardInteractionManager.handleGlobalClick()
		);
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
			gameController: this._gameController,
		};

		this._playerDisplayManager = new PlayerDisplayManager(config);
		this._gameBoard.addChild(this._playerDisplayManager);

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

	private setupGameControllerEvents(): void {
		this._gameController.on("flowStateChanged", (data) => {
			const { gameState } = data;

			this._cardInteractionManager.updateCardInteractivity();

			this.handleGameStateChange(gameState);
		});

		// Listen for deck data (game start)
		this._gameController.on("deckDataReceived", (data) => {
			this.setupInitialCards(data);
		});

		// Listen for connection status
		this._gameController.on("connectionStatusChanged", (connected) => {
			if (connected) {
				console.log("Connected to server");
			} else {
				console.log("Running in debug mode");
				this.showMessage("Running in debug mode");
			}
		});

		// Listen for game state updates (for score updates)
		this._gameController.on("gameStateUpdated", (gameState) => {
			this.updateScoresFromGameState(gameState);
		});

		this._gameController.on("roundEnded", () => {
			this.discardAllPlayingCards().catch((error) => {
				console.error("Error during card discard animation:", error);
			});
		});

		// Try to connect to server
		this._gameController.connectToServer().then((connected) => {
			if (connected) {
				console.log("Connected to game server");
			} else {
				console.log("Could not connect to server - using debug mode");
			}
		});

		// Listen for player names to update displays
		this._gameController.on("playerNamesReceived", (data) => {
			console.log("🎮 Received player names:", data);
			this.updatePlayerNames(data.playerName, data.enemyName);
		});
	}

	private handleGameStateChange(gameState: GameState): void {
		// Update card interactivity based on new game state
		this._cardInteractionManager.updateCardInteractivity();

		if (gameState.phase === GamePhase.ROUND_END) {
			this.handleRoundEnd(gameState);
		}
	}

	private handleRoundEnd(_gameState: GameState): void {
		//TODO Handle any UI-specific round end logic here if needed
	}

	private createDebugPanel(): void {
		// DebugPanel is only for fake ServerAPI testing
		// Since we're using WebSocket server, debug panel is disabled
		// this._debugPanel = new DebugPanel(this._gameController);
		// this.addChild(this._debugPanel);
		console.log("Debug panel disabled - using WebSocket server");
	}

	private createMessageDisplay(): void {
		this._messageDisplay = new MessageDisplay({
			width: 500,
			height: 100,
			fontSize: 20,
			backgroundColor: "#000000",
			textColor: "#ffffff",
		});

		this._messageDisplay.centerOn(Manager.width, Manager.height);

		this._messageDisplay.visible = false;
		this._messageDisplay.alpha = 0;

		this.addChild(this._messageDisplay);
	}

	/**
	 * Show a message to the user
	 */
	public showMessage(message: string): void {
		if (this._messageDisplay) {
			this._messageDisplay.showMessage(message);
		}
	}

	/**
	 * Show a message and return a Promise that resolves when the message is done
	 */
	public showMessageAsync(message: string): Promise<void> {
		return new Promise((resolve) => {
			if (this._messageDisplay) {
				this._messageDisplay.showMessage(message);

				// MessageDisplay shows for 2.5s total (0.5s fade in + 1.5s display + 0.5s fade out)
				setTimeout(() => {
					resolve();
				}, 2500);
			} else {
				resolve();
			}
		});
	}

	/**
	 * Show a delayed message (useful for server responses)
	 */
	public showDelayedMessage(message: string, delay: number = 1000): void {
		setTimeout(() => {
			this.showMessage(message);
		}, delay);
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

	/**
	 * Set up initial cards when game starts
	 */
	private setupInitialCards(data: any): void {
		if (data.playerHand && Array.isArray(data.playerHand)) {
			const playerHand = this._cardContainers.player.hand;

			playerHand.removeAllCards();

			// data.playerHand should already be CardData[] from server
			const cardDataArray = data.playerHand;

			playerHand.addCardsBatch(cardDataArray);
		} else {
			console.warn(
				"[GameScene] No playerHand data found or data is not an array:",
				data.playerHand
			);
		}
		if (data.enemyHandSize) {
			const enemyHand = this._cardContainers.enemy.hand;

			enemyHand.removeAllCards();

			// Create dummy cards (card backs) for enemy
			const dummyCards = [];
			for (let i = 0; i < data.enemyHandSize; i++) {
				// Use a dummy card data - enemy cards are shown as card backs
				const dummyCardData = {
					id: 1000 + i, // Use high IDs for dummy cards
					name: "Enemy Card",
					faceTexture: "archer",
					score: 1,
					type: CardType.MELEE,
				};
				dummyCards.push(dummyCardData);
			}

			enemyHand.addCardsBatch(dummyCards);

			enemyHand.getAllCards().forEach((card) => {
				card.showBack();
			});
		}
	}

	/**
	 * Validate client scores against server scores
	 */
	private updateScoresFromGameState(gameState: GameState): void {
		// Get current client-calculated scores
		const clientPlayerScore = this._scoreDisplay.getCurrentPlayerScore();
		const clientEnemyScore = this._scoreDisplay.getCurrentEnemyScore();

		// Get server-authoritative scores
		const serverPlayerScore = gameState.playerScore || 0;
		const serverEnemyScore = gameState.enemyScore || 0;

		// Validate scores match
		if (clientPlayerScore !== serverPlayerScore) {
			throw new Error(
				`Score mismatch for player! Client: ${clientPlayerScore}, Server: ${serverPlayerScore}`
			);
		}

		if (clientEnemyScore !== serverEnemyScore) {
			throw new Error(
				`Score mismatch for enemy! Client: ${clientEnemyScore}, Server: ${serverEnemyScore}`
			);
		}

		console.log(
			`[GameScene] Score validation passed - Player: ${serverPlayerScore}, Enemy: ${serverEnemyScore}`
		);
	}

	/**
	 * Update player names in the display
	 */
	private updatePlayerNames(playerName: string, enemyName: string): void {
		console.log(
			`🎮 Updating player names: Player="${playerName}", Enemy="${enemyName}"`
		);
		if (this._playerDisplayManager) {
			this._playerDisplayManager.updatePlayerNames(playerName, enemyName);
		}
	}

	/**
	 * Animate all cards from playing rows (melee, ranged, siege) to their respective discard containers
	 */
	private async discardAllPlayingCards(): Promise<void> {
		const { player, enemy } = this._cardContainers;

		const discardPromises: Promise<void>[] = [];

		// Player cards: batch transfer from all playing containers to player discard
		const playerPlayingContainers = [player.melee, player.ranged, player.siege];
		for (const container of playerPlayingContainers) {
			if (container.cardCount > 0) {
				discardPromises.push(container.transferAllCardsTo(player.discard));
			}
		}

		// Enemy cards: batch transfer from all playing containers to enemy discard
		const enemyPlayingContainers = [enemy.melee, enemy.ranged, enemy.siege];
		for (const container of enemyPlayingContainers) {
			if (container.cardCount > 0) {
				discardPromises.push(container.transferAllCardsTo(enemy.discard));
			}
		}

		// Wait for all animations to complete
		await Promise.all(discardPromises);
	}

	update(_framesPassed: number): void {}

	resize(width: number, height: number): void {
		this.resizeAndCenter(width, height);

		if (this._messageDisplay) {
			this._messageDisplay.centerOn(width, height);
		}
	}
}
