import "./style.css";
import "@pixi/gif";
import { App } from "./app";
import { Manager } from "./entities/manager";
import { IPixiApplicationOptions } from "./plugins/engine";
import { Loader, PixiAssets } from "./entities/loader";
import { options } from "./shared/config/manifest";
import { LoaderScene } from "./ui/scenes/LoaderScene";
import { GameScene } from "./ui/scenes/GameScene";
import { GameManager } from "./shared/game/GameManager";
import { GameStateMachine } from "./shared/game/GameStateMachine";
import { GameContext } from "./shared/game/GameContext";
import { StateName } from "./shared/game/states/State";
import { RoundStartState } from "./shared/game/states/RoundStartState";
import { PlayerActionState } from "./shared/game/states/PlayerActionState";
import { EnemyActionState } from "./shared/game/states/EnemyActionState";
import { RoundEndState } from "./shared/game/states/RoundEndState";
import { ResolutionState } from "./shared/game/states/ResolutionState";
import { PlayerID } from "./shared/types";
import { Player } from "./entities/player/Player";
import { MessageDisplay, GameResolutionDisplay } from "./ui/components";
import { GameBoardInteractionManager } from "./ui/scenes/GameBoardInteractionManager";
import { BotPlayer } from "./local-server";
import {
	PlayerDisplayManager,
	PlayerDisplayManagerConfig,
} from "./entities/player";
import { Graphics } from "pixi.js";

const boostsrap = async () => {
	const appOptions: Partial<IPixiApplicationOptions> = {
		antialias: true,
		resizeTo: window,
		autoDensity: true,
		backgroundColor: 0x1a1410,
		resolution: window.devicePixelRatio || 1,
		canvas: document.getElementById("pixi-screen") as HTMLCanvasElement,
	};

	const application = new App();
	await application.init(appOptions);

	Manager.init(application);
	const pixiAssets = new PixiAssets();
	const loader = new Loader(pixiAssets);
	const loaderScene = new LoaderScene();
	Manager.changeScene(loaderScene);

	loader
		.download(options, loaderScene.progressCallback.bind(loaderScene))
		.then(async () => {
			const gameScene = new GameScene();

			const player = new Player({
				id: PlayerID.PLAYER,
				hand: gameScene.playerHand,
				melee: gameScene.playerMeleeRow,
				ranged: gameScene.playerRangedRow,
				siege: gameScene.playerSiegeRow,
				discarded: gameScene.playerDiscard,
				weather: gameScene.weatherRow,
				deckPosition: gameScene.playerDeck.getTopCardGlobalPosition(),
			});

			const enemy = new BotPlayer(
				{
					id: PlayerID.OPPONENT,
					hand: gameScene.opponentHand,
					melee: gameScene.opponentMeleeRow,
					ranged: gameScene.opponentRangedRow,
					siege: gameScene.opponentSiegeRow,
					discarded: gameScene.opponentDiscard,
					weather: gameScene.weatherRow,
					deckPosition: gameScene.opponentDeck.getTopCardGlobalPosition(),
				},
				player
			);

			const config: PlayerDisplayManagerConfig = {
				playerName: "PLAYER",
				enemyName: "OPPONENT",
				playerPosition: { x: 16, y: 950 },
				enemyPosition: { x: 16, y: 200 },
			};

			const playerDisplayManager = new PlayerDisplayManager(
				config,
				player,
				enemy
			);
			gameScene.gameBoard.addChild(playerDisplayManager);

			const interactionManager = new GameBoardInteractionManager(
				player.hand,
				player.melee,
				player.ranged,
				player.siege,
				gameScene.weatherRow
			);

			gameScene.on("pointerup", () => interactionManager.handleGlobalClick());

			const darkOverlay = new Graphics();
			darkOverlay.label = "darkOverlay";
			darkOverlay.rect(0, 0, 1, 1);
			darkOverlay.fill({ color: "black", alpha: 1 });
			darkOverlay.eventMode = "none";
			darkOverlay.visible = false;
			darkOverlay.alpha = 0;

			darkOverlay.width = gameScene.background.width;
			darkOverlay.height = gameScene.background.height;
			darkOverlay.x = gameScene.background.x;
			darkOverlay.y = gameScene.background.y;

			gameScene.gameBoard.addChild(darkOverlay);

			const gameManager = new GameManager(player, enemy, playerDisplayManager);

			const messageDisplay = new MessageDisplay({});
			messageDisplay.x = gameScene.boardWidth / 2;
			messageDisplay.y = gameScene.boardHeight / 2;
			gameScene.gameBoard.addChild(messageDisplay);

			const gameResolutionDisplay = new GameResolutionDisplay(
				gameManager,
				config.playerName,
				config.enemyName
			);
			gameResolutionDisplay.x = gameScene.boardWidth / 2;
			gameResolutionDisplay.y = gameScene.boardHeight / 2;
			gameScene.gameBoard.addChild(gameResolutionDisplay);

			// Need to have a hook for screen resizes.
			gameScene.darkOverlay = darkOverlay;

			const context: GameContext = {
				gameManager,
				gameScene,
				messageDisplay,
				gameResolutionDisplay,
				playerDisplayManager,
				interactionManager,
				player,
				enemy,
				darkOverlay,
			};

			// prettier-ignore
			const states = new Map([
        		[StateName.ROUND_START, new RoundStartState(context)],
        		[StateName.PLAYER_ACTION, new PlayerActionState(context)],
        		[StateName.ENEMY_ACTION, new EnemyActionState(context)],
        		[StateName.ROUND_END, new RoundEndState(context)],
        		[StateName.RESOLUTION, new ResolutionState(context)],
      		]);

			Manager.changeScene(gameScene);

			const stateMachine = new GameStateMachine(states);
			await stateMachine.start();
		});
};

boostsrap();
