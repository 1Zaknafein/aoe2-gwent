import { Text, TextStyle } from "pixi.js";
import { PixiContainer, PixiGraphics } from "../../plugins/engine";
import { Manager, SceneInterface } from "../../entities/manager";
import { PlayingRowContainer, HandContainer, CardContainer, CardContainerLayoutType } from "../../entities/card";
import { CardType } from "../../shared/types/CardTypes";
import { CardData } from "../../shared/types/CardData";
import { Deck } from "../../entities/deck";
import { TestBoardInteractionManager } from "./TestBoardInteractionManager";
import { PlayerDisplayManager, PlayerDisplayManagerConfig } from "../../entities/player";

/**
 * Standalone test board scene for testing card interactions without server
 * Mimics Gwent-style board with 3 rows per player (Melee, Ranged, Siege)
 */
export class TestBoardScene extends PixiContainer implements SceneInterface {
	private _opponentMeleeRow!: PlayingRowContainer;
	private _opponentRangedRow!: PlayingRowContainer;
	private _opponentSiegeRow!: PlayingRowContainer;

	private playerMeleeRow!: PlayingRowContainer;
	private playerRangedRow!: PlayingRowContainer;
	private playerSiegeRow!: PlayingRowContainer;

	private playerHand!: HandContainer;
	private opponentHand!: HandContainer;

	private weatherRow!: CardContainer;

	private playerDiscard!: CardContainer;
	private opponentDiscard!: CardContainer;

	private playerDeck!: Deck;
	private opponentDeck!: Deck;

	// Main game board container (everything goes inside this)
	private gameBoard!: PixiContainer;
	private background!: PixiGraphics;

	private interactionManager!: TestBoardInteractionManager;
	private playerDisplayManager!: PlayerDisplayManager;

	// Layout constants (based on 16:9 aspect ratio, ~2400x1350 internal resolution)
	private readonly BOARD_WIDTH = 2400;
	private readonly BOARD_HEIGHT = 1350;
	private readonly ROW_HEIGHT = 130;
	private readonly HAND_HEIGHT = 180;
	private readonly LEFT_MARGIN = 450; // Space for player displays and weather
	private readonly RIGHT_MARGIN = 350; // Space for deck/discard

	constructor() {
		super();
		this.interactive = true;
		this.label = "test_board_scene";

		this.gameBoard = new PixiContainer();
		this.gameBoard.label = "game_board";
		this.addChild(this.gameBoard);

		this.createBackground();
		this.createBoard();
		this.createWeatherRow();
		this.createDiscardPiles();
		this.createDecks();
		this.createHands();
		this.createPlayerDisplaySystem();
		this.createTestCards();
		this.createBackButton();

		this.interactionManager = new TestBoardInteractionManager(
			this.playerHand,
			this.playerMeleeRow,
			this.playerRangedRow,
			this.playerSiegeRow
		);

		this.interactionManager.setupPlayerHandInteractions();
		this.interactionManager.setupRowInteractions();

		this.on('pointerup', () => this.interactionManager.handleGlobalClick());

		this.resizeAndCenter(Manager.width, Manager.height);

	}

	private createBackground(): void {
		this.background = new PixiGraphics();
		
		this.background.rect(0, 0, 10000, 10000);
		this.background.fill({ color: 0x1a1410 });
		
		this.gameBoard.addChild(this.background);
	}

	private createBoard(): void {
		const centerX = this.BOARD_WIDTH / 2;
		const playAreaWidth = this.BOARD_WIDTH - this.LEFT_MARGIN - this.RIGHT_MARGIN;
		
		this._opponentSiegeRow = new PlayingRowContainer({
			width: playAreaWidth,
			height: this.ROW_HEIGHT,
			labelText: "Opponent Siege",
			labelColor: 0xff6b6b,
			containerType: CardType.SIEGE,
		});
		this._opponentSiegeRow.position.set(centerX, 280);
		this.gameBoard.addChild(this._opponentSiegeRow);

		this._opponentRangedRow = new PlayingRowContainer({
			width: playAreaWidth,
			height: this.ROW_HEIGHT,
			labelText: "Opponent Ranged",
			labelColor: 0xff6b6b,
			containerType: CardType.RANGED,
		});
		this._opponentRangedRow.position.set(centerX, 420);
		this.gameBoard.addChild(this._opponentRangedRow);

		this._opponentMeleeRow = new PlayingRowContainer({
			width: playAreaWidth,
			height: this.ROW_HEIGHT,
			labelText: "Opponent Melee",
			labelColor: 0xff6b6b,
			containerType: CardType.MELEE,
		});
		this._opponentMeleeRow.position.set(centerX, 560);
		this.gameBoard.addChild(this._opponentMeleeRow);

		// Divider - positioned exactly between opponent melee and player melee
		const opponentMeleeY = 560;
		const playerMeleeY = 790;
		const dividerY = (opponentMeleeY + playerMeleeY) / 2; // 675
		this.createDividerWithFade(centerX, dividerY, playAreaWidth);

		// Player rows (bottom - starting right after divider with proper spacing)
		this.playerMeleeRow = new PlayingRowContainer({
			width: playAreaWidth,
			height: this.ROW_HEIGHT,
			labelText: "Your Melee",
			labelColor: 0x66cc66,
			containerType: CardType.MELEE,
		});
		this.playerMeleeRow.position.set(centerX, 790);
		this.gameBoard.addChild(this.playerMeleeRow);

		this.playerRangedRow = new PlayingRowContainer({
			width: playAreaWidth,
			height: this.ROW_HEIGHT,
			labelText: "Your Ranged",
			labelColor: 0x66cc66,
			containerType: CardType.RANGED,
		});
		this.playerRangedRow.position.set(centerX, 930);
		this.gameBoard.addChild(this.playerRangedRow);

		this.playerSiegeRow = new PlayingRowContainer({
			width: playAreaWidth,
			height: this.ROW_HEIGHT,
			labelText: "Your Siege",
			labelColor: 0x66cc66,
			containerType: CardType.SIEGE,
		});
		this.playerSiegeRow.position.set(centerX, 1070);
		this.gameBoard.addChild(this.playerSiegeRow);
	}

	private createDividerWithFade(centerX: number, y: number, width: number): void {
		const divider = new PixiGraphics();
		const fadeWidth = 150;
		const lineStart = centerX - width / 2;
		const lineEnd = centerX + width / 2;
		
		// Main solid line in the center
		divider.moveTo(lineStart + fadeWidth, y);
		divider.lineTo(lineEnd - fadeWidth, y);
		divider.stroke({ color: 0xffd700, width: 3, alpha: 1.0 });
		
		// Left fade - draw segments with increasing alpha
		for (let i = 0; i < fadeWidth; i += 5) {
			const alpha = i / fadeWidth;
			divider.moveTo(lineStart + i, y);
			divider.lineTo(lineStart + i + 5, y);
			divider.stroke({ color: 0xffd700, width: 3, alpha: alpha });
		}
		
		// Right fade - draw segments with decreasing alpha
		for (let i = 0; i < fadeWidth; i += 5) {
			const alpha = i / fadeWidth;
			divider.moveTo(lineEnd - i - 5, y);
			divider.lineTo(lineEnd - i, y);
			divider.stroke({ color: 0xffd700, width: 3, alpha: alpha });
		}
		
		this.gameBoard.addChild(divider);
	}

	private createHands(): void {
		const centerX = this.BOARD_WIDTH / 2;
		const handWidth = this.BOARD_WIDTH - this.LEFT_MARGIN - this.RIGHT_MARGIN;

		const opponentHandY = 110;
		this.opponentHand = new HandContainer({
			width: handWidth,
			height: this.HAND_HEIGHT,
			labelText: "Opponent Hand",
			labelColor: 0xd4af37,
			backgroundColor: 0x2a2013,
			borderColor: 0x8b6914,
			isInteractive: false,
		});
		this.opponentHand.position.set(centerX, opponentHandY);
		this.opponentHand.scale.set(1.0);
		this.gameBoard.addChild(this.opponentHand);

		const playerHandY = 1240;
		this.playerHand = new HandContainer({
			width: handWidth,
			height: this.HAND_HEIGHT,
			labelText: "Your Hand",
			labelColor: 0xd4af37,
			backgroundColor: 0x2a2013,
			borderColor: 0x8b6914,
			isInteractive: true,
		});
		this.playerHand.position.set(centerX, playerHandY);
		this.playerHand.scale.set(1.0);
		this.gameBoard.addChild(this.playerHand);
	}

	private createPlayerDisplaySystem(): void {
		const config: PlayerDisplayManagerConfig = {
			playerName: "PLAYER",
			enemyName: "OPPONENT",
			playerPosition: { x: -20, y: 950 },
			enemyPosition: { x: -20, y: 200 },
		};

		this.playerDisplayManager = new PlayerDisplayManager(config);
		this.gameBoard.addChild(this.playerDisplayManager);

		const playerContainers = [
			this.playerMeleeRow,
			this.playerRangedRow,
			this.playerSiegeRow,
		];
		const opponentContainers = [
			this._opponentMeleeRow,
			this._opponentRangedRow,
			this._opponentSiegeRow,
		];

		this.playerDisplayManager.setupScoreTracking(
			playerContainers,
			opponentContainers
		);

		this.setupHandCountTracking();
		this.updatePlayerDisplayHandCounts();

		this.playerDisplayManager.positionDisplayElements();
	}

	private setupHandCountTracking(): void {
		const updateHandCounts = () => this.updatePlayerDisplayHandCounts();

		this.playerHand.on("cardAdded", updateHandCounts);
		this.playerHand.on("cardRemoved", updateHandCounts);
		this.opponentHand.on("cardAdded", updateHandCounts);
		this.opponentHand.on("cardRemoved", updateHandCounts);
	}

	private updatePlayerDisplayHandCounts(): void {
		if (this.playerDisplayManager) {
			const playerHandCount = this.playerHand.cardCount;
			const opponentHandCount = this.opponentHand.cardCount;
			this.playerDisplayManager.updateHandCounts(
				playerHandCount,
				opponentHandCount
			);
		}
	}

	private createWeatherRow(): void {
		const weatherX = 200; 
		const weatherY = this.BOARD_HEIGHT / 2;
		const weatherWidth = 350; 
		const weatherHeight = this.ROW_HEIGHT; 

		this.weatherRow = new CardContainer(
			weatherWidth - 40, // Subtract padding for card area
			"weather",
			undefined,
			CardContainerLayoutType.STACK
		);
		
		// Create visual background for weather row
		const weatherBg = new PixiGraphics();
		const bgX = -weatherWidth / 2;
		const bgY = -weatherHeight / 2;
		
		weatherBg.rect(bgX, bgY, weatherWidth, weatherHeight);
		weatherBg.fill({ color: 0x2a2013, alpha: 0.3 });
		
		// Border
		weatherBg.stroke({ color: 0x8b6914, width: 3, alpha: 0.6 });
		weatherBg.rect(bgX + 3, bgY + 3, weatherWidth - 6, weatherHeight - 6);
		weatherBg.stroke({ color: 0xd4af37, width: 2, alpha: 0.4 });
		
		// Add label
		const labelStyle = new TextStyle({
			fontFamily: 'Cinzel, serif',
			fontSize: 12,
			fill: 0xd4af37,
			fontWeight: 'bold'
		});
		const label = new Text({ text: 'WEATHER', style: labelStyle });
		label.position.set(bgX + 10, 0);
		label.anchor.set(0, 0.5);
		label.alpha = 0.7;
		
		this.weatherRow.addChildAt(weatherBg, 0);
		this.weatherRow.addChild(label);
		
		this.weatherRow.position.set(weatherX, weatherY);
		this.weatherRow.scale.set(1.0); 
		this.weatherRow.setCardsInteractive(false);
		
		this.gameBoard.addChild(this.weatherRow);
	}

	private createDiscardPiles(): void {
		const discardWidth = 130; 
		const discardHeight = 175; 

		this.playerDiscard = new CardContainer(
			discardWidth,
			"player_discard",
			undefined,
			CardContainerLayoutType.STACK
		);
		
		const playerDiscardBg = this.createDiscardBackground(discardWidth, discardHeight);
		this.playerDiscard.addChildAt(playerDiscardBg, 0);
		this.playerDiscard.position.set(2100, 1242);
		this.playerDiscard.setCardsInteractive(false);
		this.gameBoard.addChild(this.playerDiscard);

		this.opponentDiscard = new CardContainer(
			discardWidth,
			"opponent_discard",
			undefined,
			CardContainerLayoutType.STACK
		);
		
		const opponentDiscardBg = this.createDiscardBackground(discardWidth, discardHeight);
		this.opponentDiscard.addChildAt(opponentDiscardBg, 0);
		this.opponentDiscard.position.set(2100, 108);
		this.opponentDiscard.setCardsInteractive(false);
		this.gameBoard.addChild(this.opponentDiscard);
	}

	private createDiscardBackground(width: number, height: number): PixiGraphics {
		const bg = new PixiGraphics();
		const bgX = -width / 2;
		const bgY = -height / 2;
		
		bg.rect(bgX, bgY, width, height);
		bg.fill({ color: 0x2a2013, alpha: 0.3 });
		
		bg.stroke({ color: 0x8b6914, width: 3, alpha: 0.6 });
		bg.rect(bgX + 3, bgY + 3, width - 6, height - 6);
		bg.stroke({ color: 0xd4af37, width: 2, alpha: 0.4 });
		
		return bg;
	}

	private createDecks(): void {
		const boardWidth = this.BOARD_WIDTH;

		this.playerDeck = new Deck();
		this.playerDeck.setPosition(boardWidth - 125, this.BOARD_HEIGHT - 105);
		this.playerDeck.scale.set(0.75);
		this.gameBoard.addChild(this.playerDeck);

		this.opponentDeck = new Deck();
		this.opponentDeck.setPosition(boardWidth - 125, 115);
		this.opponentDeck.scale.set(0.75);
		this.gameBoard.addChild(this.opponentDeck);
	}

	private createTestCards(): void {
		const testPlayerCards: CardData[] = [
			{ id: 1, name: "Knight", score: 8, type: CardType.MELEE },
			{ id: 2, name: "Crossbowman", score: 6, type: CardType.RANGED },
			{ id: 3, name: "Mangonel", score: 10, type: CardType.SIEGE },
			{ id: 1, name: "Knight", score: 6, type: CardType.MELEE },
			{ id: 6, name: "Archer", score: 4, type: CardType.RANGED },
		];

		for (let i = 0; i < 12; i++) {
			testPlayerCards.push({
				id: 1,
				name: `Knight`,
				score: Math.floor(Math.random() * 10) + 1,
				type: CardType.MELEE
			});
		}

		const testOpponentCards: CardData[] = [
			{ id: 1, name: "Knight", score: 7, type: CardType.MELEE },
			{ id: 6, name: "Archer", score: 6, type: CardType.RANGED },
		];

		this.playerHand.addCardsBatch(testPlayerCards);

		this.opponentHand.addCardsBatch(testOpponentCards);
	}

	private createBackButton(): void {
		const buttonBg = new PixiGraphics();
		buttonBg.rect(0, 0, 200, 40);
		buttonBg.fill({ color: 0x8b4513, alpha: 0.8 });
		buttonBg.stroke({ color: 0xd4af37, width: 2 });
		
		const buttonStyle = new TextStyle({
			fontFamily: 'Cinzel, serif',
			fontSize: 20,
			fill: 0xf4e4c1,
			fontWeight: 'bold'
		});
		const buttonText = new Text({ text: '← Back to Lobby', style: buttonStyle });
		buttonText.anchor.set(0.5);
		buttonText.position.set(100, 20);

		const button = new PixiContainer();
		button.addChild(buttonBg, buttonText);
		button.position.set(20, 20);
		button.interactive = true;
		button.cursor = 'pointer';

		button.on('pointerover', () => {
			buttonBg.tint = 0xcccccc;
		});

		button.on('pointerout', () => {
			buttonBg.tint = 0xffffff;
		});

		button.on('pointerdown', () => {
			console.log("🏠 Returning to lobby");
			window.location.href = '/lobby.html';
		});

		this.addChild(button);
	}

	update(_framesPassed: number): void {
	}

	resize(screenWidth: number, screenHeight: number): void {
		this.resizeAndCenter(screenWidth, screenHeight);
	}

	private resizeAndCenter(screenWidth: number, screenHeight: number): void {
		const scaleX = screenWidth / this.BOARD_WIDTH;
		const scaleY = screenHeight / this.BOARD_HEIGHT;
		const scale = Math.min(scaleX, scaleY);

		const offsetX = (screenWidth - this.BOARD_WIDTH * scale) / 2;
		const offsetY = (screenHeight - this.BOARD_HEIGHT * scale) / 2;

		this.background.clear();
		this.background.rect(
			-offsetX / scale,
			-offsetY / scale,
			screenWidth / scale,
			screenHeight / scale
		);
		this.background.fill({ color: 0x1a1410 });

		this.gameBoard.scale.set(scale);

		this.gameBoard.x = offsetX;
		this.gameBoard.y = offsetY;

		console.log(`📐 Resized to ${screenWidth}x${screenHeight}, scale: ${scale.toFixed(2)}`);
	}
}
