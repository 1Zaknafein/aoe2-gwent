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
import { CardDealingManager } from "./ui/managers/CardDealingManager";
import { StateName } from "./shared/game/states/GameState";
import { SetupState } from "./shared/game/states/SetupState";
import { GameStartState } from "./shared/game/states/GameStartState";
import { RoundStartState } from "./shared/game/states/RoundStartState";
import { PlayerActionState } from "./shared/game/states/PlayerActionState";
import { EnemyActionState } from "./shared/game/states/EnemyActionState";
import { RoundEndState } from "./shared/game/states/RoundEndState";
import { ResolutionState } from "./shared/game/states/ResolutionState";

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
      Manager.changeScene(gameScene);

      const gameManager = new GameManager("player1", "Player");

      const cardDealingManager = new CardDealingManager(
        gameScene.getPlayerHand(),
        gameScene.getOpponentHand()
      );

      // prettier-ignore
      const states = new Map([
        [StateName.SETUP, new SetupState(gameManager)],
        [StateName.GAME_START, new GameStartState(gameManager, cardDealingManager)],
        [StateName.ROUND_START, new RoundStartState(gameManager)],
        [StateName.PLAYER_ACTION, new PlayerActionState(gameManager)],
        [StateName.ENEMY_ACTION, new EnemyActionState(gameManager)],
        [StateName.ROUND_END, new RoundEndState(gameManager)],
        [StateName.RESOLUTION, new ResolutionState(gameManager)],
      ]);

      const stateMachine = new GameStateMachine(states);

      await stateMachine.start();
    });
};

boostsrap();
