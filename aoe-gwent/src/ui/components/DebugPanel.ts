import { PixiContainer, PixiSprite, PixiText } from "../../plugins/engine";
import { Button } from "../components";
import {
	GameStateManager,
	GamePhase,
	ActionType,
	ServerResponse,
} from "../../shared/game/GameStateManager";
import { CardDatabase } from "../../shared/database";
import { CardType } from "../../entities/card";

/**
 * Debug panel for testing server communication and enemy actions
 */
export class DebugPanel extends PixiContainer {
	private _gameStateManager: GameStateManager;
	private _isVisible: boolean = false;

	// UI Elements
	private _background!: PixiSprite;
	private _toggleButton!: Button;
	private _enemyPlaceCardButton!: Button;
	private _enemyPassTurnButton!: Button;
	private _startGameButton!: Button;
	private _switchTurnButton!: Button;
	private _statusText!: PixiText;

	// Panel properties
	private readonly PANEL_WIDTH = 350;
	private readonly PANEL_HEIGHT = 420; // Increased to accommodate all elements

	constructor(gameStateManager: GameStateManager) {
		super();
		this._gameStateManager = gameStateManager;

		this.createToggleButton();
		this.createDebugPanel();
		this.updatePanelVisibility();
		this.setupEventListeners();
	}

	private createToggleButton(): void {
		this._toggleButton = new Button(
			"Debug Panel",
			() => this.togglePanel(),
			120,
			30
		);
		this._toggleButton.x = 10;
		this._toggleButton.y = 10;
		this.addChild(this._toggleButton);
	}

	private createDebugPanel(): void {
		// Create background
		this._background = new PixiSprite();
		this._background.width = this.PANEL_WIDTH;
		this._background.height = this.PANEL_HEIGHT;
		this._background.tint = 0x000000;
		this._background.alpha = 0.8;
		this._background.x = 10;
		this._background.y = 50;
		this.addChild(this._background);

		// Create title
		const title = new PixiText({
			text: "Debug Panel",
			style: {
				fontFamily: "Arial",
				fontSize: 18,
				fill: 0xffffff,
				fontWeight: "bold",
			},
		});
		title.x = 20;
		title.y = 60;
		this.addChild(title);

		// Create status text
		this._statusText = new PixiText({
			text: "Status: Waiting for game start",
			style: {
				fontFamily: "Arial",
				fontSize: 10, // Smaller font size
				fill: 0xffffff,
				wordWrap: true,
				wordWrapWidth: this.PANEL_WIDTH - 20,
			},
		});
		this._statusText.x = 20;
		this._statusText.y = 90;
		this.addChild(this._statusText);

		// Create buttons - moved down to avoid overlap
		this._startGameButton = new Button(
			"Start (Player)",
			() => this.simulateGameStart("player"),
			150,
			30
		);
		this._startGameButton.x = 20;
		this._startGameButton.y = 200; // Moved from 130 to 200
		this.addChild(this._startGameButton);

		const startGameEnemyButton = new Button(
			"Start (Enemy)",
			() => this.simulateGameStart("enemy"),
			150,
			30
		);
		startGameEnemyButton.x = 180;
		startGameEnemyButton.y = 200; // Moved from 130 to 200
		this.addChild(startGameEnemyButton);

		this._switchTurnButton = new Button(
			"Switch Turn",
			() => this.switchTurn(),
			150,
			30
		);
		this._switchTurnButton.x = 20;
		this._switchTurnButton.y = 240; // Moved from 170 to 240
		this.addChild(this._switchTurnButton);

		this._enemyPlaceCardButton = new Button(
			"Enemy Place Card",
			() => this.simulateEnemyPlaceCard(),
			150,
			30
		);
		this._enemyPlaceCardButton.x = 180;
		this._enemyPlaceCardButton.y = 240; // Moved from 170 to 240
		this.addChild(this._enemyPlaceCardButton);

		this._enemyPassTurnButton = new Button(
			"Enemy Pass Turn",
			() => this.simulateEnemyPassTurn(),
			150,
			30
		);
		this._enemyPassTurnButton.x = 20;
		this._enemyPassTurnButton.y = 280; // Moved from 210 to 280
		this.addChild(this._enemyPassTurnButton);

		// Create card selection buttons
		this.createCardSelectionButtons();
	}

	private createCardSelectionButtons(): void {
		const cardTypes = ["melee", "ranged", "siege"] as const;

		cardTypes.forEach((rowType, index) => {
			const button = new Button(
				`Enemy -> ${rowType.charAt(0).toUpperCase() + rowType.slice(1)}`,
				() => this.simulateEnemyPlaceSpecificCard(rowType),
				150,
				25
			);
			button.x = 20 + (index % 2) * 160;
			button.y = 320 + Math.floor(index / 2) * 35; // Moved from 250 to 320
			this.addChild(button);
		});
	}

	private setupEventListeners(): void {
		this._gameStateManager.on("gameStateChanged", (gameState) => {
			this.updateStatusText(gameState);
		});

		this._gameStateManager.on("gameStarted", (gameState) => {
			this.updateStatusText(gameState);
		});

		this._gameStateManager.on("phaseChanged", (phase) => {
			console.log("Debug Panel: Game phase changed to", phase);
		});

		// Update status text with initial state
		this.updateStatusText(this._gameStateManager.gameState);
	}

	private updateStatusText(gameState: any): void {
		const status = `Phase: ${gameState.phase}
Turn: ${gameState.currentTurn}
Round: ${gameState.roundNumber}
Starting Player: ${gameState.startingPlayer}
Player Score: ${gameState.playerScore}
Enemy Score: ${gameState.enemyScore}
Player Passed: ${gameState.playerPassed}
Enemy Passed: ${gameState.enemyPassed}`;

		this._statusText.text = status;
	}

	private togglePanel(): void {
		this._isVisible = !this._isVisible;
		this.updatePanelVisibility();
	}

	private updatePanelVisibility(): void {
		const children = this.children.filter(
			(child) => child !== this._toggleButton
		);
		children.forEach((child) => {
			child.visible = this._isVisible;
		});
	}

	private simulateGameStart(
		startingPlayer: "player" | "enemy" = "player"
	): void {
		const currentTurn = startingPlayer;
		const phase =
			startingPlayer === "player"
				? GamePhase.PLAYER_TURN
				: GamePhase.ENEMY_TURN;

		const gameStartResponse: ServerResponse = {
			type: "game_start",
			gameState: {
				phase: phase,
				currentTurn: currentTurn,
				roundNumber: 1,
				playerScore: 0,
				enemyScore: 0,
				playerPassed: false,
				enemyPassed: false,
				startingPlayer: startingPlayer,
			},
		};

		console.log(
			`Debug Panel: Simulating game start - ${startingPlayer} goes first`
		);
		this._gameStateManager.handleServerResponse(gameStartResponse);
	}

	private switchTurn(): void {
		const currentState = this._gameStateManager.gameState;
		const newTurn = currentState.currentTurn === "player" ? "enemy" : "player";
		const newPhase =
			newTurn === "player" ? GamePhase.PLAYER_TURN : GamePhase.ENEMY_TURN;

		const updateResponse: ServerResponse = {
			type: "game_state_update",
			gameState: {
				...currentState,
				currentTurn: newTurn,
				phase: newPhase,
			},
		};

		console.log("Debug Panel: Switching turn to", newTurn);
		this._gameStateManager.handleServerResponse(updateResponse);
	}

	private simulateEnemyPlaceCard(): void {
		// Pick a random card from the database
		const randomCardId = Math.floor(Math.random() * 6) + 1; // IDs 1-6
		const cardData = CardDatabase.getCardById(randomCardId);

		if (!cardData) {
			console.error("Debug Panel: Could not find card with ID", randomCardId);
			return;
		}

		// Determine target row based on card type
		let targetRow: "melee" | "ranged" | "siege";
		switch (cardData.type) {
			case CardType.MELEE:
				targetRow = "melee";
				break;
			case CardType.RANGED:
				targetRow = "ranged";
				break;
			case CardType.SIEGE:
				targetRow = "siege";
				break;
			default:
				targetRow = "melee";
		}

		this.simulateEnemyPlaceSpecificCard(targetRow, randomCardId);
	}

	private simulateEnemyPlaceSpecificCard(
		targetRow: "melee" | "ranged" | "siege",
		cardId?: number
	): void {
		// If no cardId provided, find a card of the correct type
		if (!cardId) {
			const cardTypeMap = {
				melee: CardType.MELEE,
				ranged: CardType.RANGED,
				siege: CardType.SIEGE,
			};

			// Find a card of the correct type
			for (let id = 1; id <= 6; id++) {
				const cardData = CardDatabase.getCardById(id);
				if (cardData && cardData.type === cardTypeMap[targetRow]) {
					cardId = id;
					break;
				}
			}
		}

		if (!cardId) {
			console.error(
				"Debug Panel: Could not find suitable card for row",
				targetRow
			);
			return;
		}

		const enemyActionResponse: ServerResponse = {
			type: "enemy_action",
			action: {
				type: ActionType.PLACE_CARD,
				cardId: cardId,
				targetRow: targetRow,
				playerId: "enemy",
			},
			gameState: {
				...this._gameStateManager.gameState,
				// Don't automatically switch turns - let the Switch Turn button handle that
				// or implement proper turn logic based on game rules
			},
		};

		console.log(
			`Debug Panel: Enemy placing card ${cardId} on ${targetRow} row`
		);
		this._gameStateManager.handleServerResponse(enemyActionResponse);
	}

	private simulateEnemyPassTurn(): void {
		const enemyPassResponse: ServerResponse = {
			type: "enemy_action",
			action: {
				type: ActionType.PASS_TURN,
				playerId: "enemy",
			},
			gameState: {
				...this._gameStateManager.gameState,
				// Don't automatically switch turns - let the Switch Turn button handle that
				// or implement proper turn logic based on game rules
				enemyPassed: true,
			},
		};

		console.log("Debug Panel: Enemy passing turn");
		this._gameStateManager.handleServerResponse(enemyPassResponse);
	}

	public setPosition(x: number, y: number): void {
		this.x = x;
		this.y = y;
	}
}
