import { PixiContainer, PixiSprite, PixiText } from "../../plugins/engine";
import { DebugButton } from "../components";
import { GameController } from "../../shared/game";
import { Sprite, Texture } from "pixi.js";

/**
 * Debug Panel for testing game functionality with fake server
 */
export class DebugPanel extends PixiContainer {
	private _gameController: GameController;
	private _isVisible: boolean = false;

	// UI Elements
	private _background!: PixiSprite;
	private _toggleButton!: DebugButton;
	private _enemyPlaceCardButton!: DebugButton;
	private _enemyPassTurnButton!: DebugButton;
	private _startGameButton!: DebugButton;
	private _statusText!: PixiText;

	// Panel properties
	private readonly PANEL_WIDTH = 350;

	constructor(gameController: GameController) {
		super();
		this._gameController = gameController;

		this.createToggleButton();
		this.createDebugPanel();
		this.updatePanelVisibility();
		this.setupEventListeners();
	}

	private createToggleButton(): void {
		this._toggleButton = new DebugButton("Debug", () => {
			this.toggleVisibility();
		});
		this._toggleButton.position.set(10, 10);
		this.addChild(this._toggleButton);
	}

	private createDebugPanel(): void {
		this._background = new Sprite();
		this._background.texture = Texture.WHITE;
		this._background.tint = "#000000";
		this._background.alpha = 0.5;
		this._background.width = this.PANEL_WIDTH - 50;
		this._background.height = 320;
		this._background.position.set(10, 50);
		this.addChild(this._background);

		this._statusText = new PixiText("Status: Initializing...", {
			fontFamily: "Arial",
			fontSize: 14,
			fill: 0xffffff,
			wordWrap: true,
			wordWrapWidth: this.PANEL_WIDTH - 20,
		});
		this._statusText.position.set(20, 60);
		this.addChild(this._statusText);

		this._startGameButton = new DebugButton("Start Game", () => {
			this.startGameWithRandomPlayer();
		});
		this._startGameButton.position.set(20, 220);
		this.addChild(this._startGameButton);

		this._enemyPlaceCardButton = new DebugButton("Enemy Place Card", () => {
			this.simulateEnemyPlaceCard();
		});
		this._enemyPlaceCardButton.position.set(20, 270);
		this.addChild(this._enemyPlaceCardButton);

		this._enemyPassTurnButton = new DebugButton("Enemy Pass Turn", () => {
			this.simulateEnemyPassTurn();
		});
		this._enemyPassTurnButton.position.set(20, 320);
		this.addChild(this._enemyPassTurnButton);
	}

	private setupEventListeners(): void {
		this._gameController.on("flowStateChanged", () => {
			this.updateStatusText();
		});

		this._gameController.on("gameStarted", () => {
			this.updateStatusText();
		});

		this._gameController.on("deckDataReceived", () => {
			this.updateStatusText();
		});

		this.updateStatusText();
	}

	private updateStatusText(): void {
		const isConnected = this._gameController?.serverAPI?.isConnected || false;
		const flowState = this._gameController.currentFlowState;
		const gameState = this._gameController.gameState;

		const statusText = `Status: ${isConnected ? "Connected" : "Disconnected"}
Flow State: ${flowState}
Turn: ${gameState.currentTurn}
Phase: ${gameState.phase}
Round: ${gameState.roundNumber}
Player Score: ${gameState.playerScore}
Enemy Score: ${gameState.enemyScore}
Can Player Act: ${this._gameController.canPlayerAct}`;

		this._statusText.text = statusText;
	}

	private updatePanelVisibility(): void {
		this._background.visible = this._isVisible;
		this._statusText.visible = this._isVisible;
		this._startGameButton.visible = this._isVisible;
		this._enemyPlaceCardButton.visible = this._isVisible;
		this._enemyPassTurnButton.visible = this._isVisible;
	}

	private toggleVisibility(): void {
		this._isVisible = !this._isVisible;
		this.updatePanelVisibility();
	}

	private async startGameWithRandomPlayer(): Promise<void> {
		const serverAPI = this._gameController.serverAPI;

		try {
			await serverAPI.connect();
			// These methods only exist in the fake ServerAPI, not WebSocketServerAPI
			// await serverAPI.requestGameStart(startingPlayer);
			console.log(
				"DebugPanel: Game start requested (WebSocket server doesn't need this)"
			);
		} catch (error) {
			console.error("Failed to start game:", error);
		}
	}

	private simulateEnemyPlaceCard(): void {
		console.log(
			"Debug: Enemy actions are handled by the actual opponent player"
		);
		// In multiplayer, we don't simulate enemy actions - they come from real players
	}

	private simulateEnemyPassTurn(): void {
		console.log("Debug: Enemy pass is handled by the actual opponent player");
		// In multiplayer, we don't simulate enemy pass - they come from real players
	}
}
