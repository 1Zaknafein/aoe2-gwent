import { PixiContainer, PixiSprite } from "../../plugins/engine";
import { Manager, SceneInterface } from "../../entities/manager";
import { CardContainerManager } from "../../entities/card";
import { ScoreDisplay, DebugPanel, MessageDisplay } from "../components";
import { CardInteractionManager } from "../managers";
import {
	PlayerDisplayManager,
	PlayerDisplayManagerConfig,
} from "../../entities/player";
import { Sprite } from "pixi.js";
import { GameController } from "../../shared/game";
import type { EnemyCardPlacedEvent } from "../../shared/game";
import { GamePhase, GameState } from "../../shared/game/GameStateManager";

export class GameScene extends PixiContainer implements SceneInterface {
	private _gameBoard: Sprite;
	private _originalBoardWidth: number;
	private _originalBoardHeight: number;

	private _cardContainers: CardContainerManager;
	private _cardInteractionManager: CardInteractionManager;
	private _gameController: GameController;

	private _scoreDisplay!: ScoreDisplay;
	private _playerDisplayManager!: PlayerDisplayManager;
	private _debugPanel!: DebugPanel;
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
		this.createDebugPanel();
		this.createMessageDisplay();

		// Set up message callback for GameController
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
		this._gameController.on("enemyCardPlaced", (data: EnemyCardPlacedEvent) => {
			console.log("Enemy placed card:", data);
		});

		this._gameController.on("enemyPassedTurn", () => {
			console.log("Enemy passed turn");
			this.showMessage("Opponent passed");
		});

		// Listen for game started event
		this._gameController.on("gameStarted", () => {
			const gameState = this._gameController.gameState;
			this.showMessage(`Round ${gameState.roundNumber} is starting...`);

			// Show initial turn message
			const turnMessage =
				gameState.currentTurn === "player" ? "Your turn!" : "Opponent's turn!";
			this.showDelayedMessage(turnMessage, 2500);
		});

		// Listen for action blocking/unblocking events
		this._gameController.on("actionsBlocked", () => {
			this._cardInteractionManager.updateCardInteractivity();
		});

		this._gameController.on("actionsUnblocked", () => {
			this._cardInteractionManager.updateCardInteractivity();
		});

		// Listen for game state changes to detect turn switches and round end
		this._gameController.on("gameStateChanged", (gameState) => {
			this.handleGameStateChange(gameState);
		});

		// Try to connect to server (will fail gracefully for now)
		this._gameController.connectToServer().then((connected) => {
			if (connected) {
				console.log("Connected to game server");
			} else {
				console.log("Could not connect to server - using debug mode");
				this.showMessage("Running in debug mode");
			}
		});
	}

	private handleGameStateChange(gameState: GameState): void {
		// Messages are now handled in GameStateManager before this is called
		// Just handle any UI updates that don't involve messages

		// Update card interactivity based on new game state
		this._cardInteractionManager.updateCardInteractivity();

		if (gameState.phase === GamePhase.ROUND_END) {
			this.handleRoundEnd(gameState);
		}
	}

	private handleRoundEnd(gameState: GameState): void {
		// Round end message is now handled in GameStateManager
		// Just handle any UI-specific round end logic here if needed
		console.log(
			"Round ended, final scores:",
			gameState.playerScore,
			"vs",
			gameState.enemyScore
		);
	}

	private createDebugPanel(): void {
		this._debugPanel = new DebugPanel(this._gameController);
		this.addChild(this._debugPanel);
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

		// Add to the scene (on top of everything else)
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
				// Block actions while showing message
				if (this._gameController) {
					this._gameController.manuallyBlockActions();
				}

				this._messageDisplay.showMessage(message);
				// MessageDisplay shows for 2.5s total (0.5s fade in + 1.5s display + 0.5s fade out)
				setTimeout(() => {
					// Unblock actions when message is done
					if (this._gameController) {
						this._gameController.manuallyUnblockActions();
					}

					resolve();
				}, 2500);
			} else {
				// No message display available, resolve immediately
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

	update(_framesPassed: number): void {}

	resize(width: number, height: number): void {
		this.resizeAndCenter(width, height);

		if (this._messageDisplay) {
			this._messageDisplay.centerOn(width, height);
		}
	}
}
