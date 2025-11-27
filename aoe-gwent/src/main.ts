import './style.css';
import '@pixi/gif';
import { App } from './app';
import { Manager } from './entities/manager';
import { IPixiApplicationOptions } from './plugins/engine';
import { Loader, PixiAssets } from './entities/loader';
import { options } from './shared/config/manifest';
import { LoaderScene } from './ui/scenes/LoaderScene';
import { GameScene } from './ui/scenes/GameScene';
import { GameManager } from './shared/game/GameManager';
import { GameStateMachine } from './shared/game/GameStateMachine';

const boostsrap = async () => {
    const canvas = document.getElementById("pixi-screen") as HTMLCanvasElement;
    const resizeTo = window;
    const resolution = window.devicePixelRatio || 1;
    const autoDensity = true;
    const backgroundColor = 0x1a1410;
    const appOptions: Partial<IPixiApplicationOptions> = {
        canvas,
        resizeTo,
        resolution,
        autoDensity,
        backgroundColor
    }

    const application = new App();
    await application.init(appOptions);

    Manager.init(application);
    const pixiAssets = new PixiAssets();
    const loader = new Loader(pixiAssets);
    const loaderScene = new LoaderScene();
    Manager.changeScene(loaderScene);

    loader.download(options, loaderScene.progressCallback.bind(loaderScene)).then(async () => {

        // Create GameScene
        const gameScene = new GameScene();
        Manager.changeScene(gameScene);
        
        // Create GameManager and StateMachine
        const gameManager = new GameManager('player1', 'Player');
        const stateMachine = new GameStateMachine(gameManager);
        
        // Start the state machine (will run SetupState -> RoundStartState)
        await stateMachine.start();
        
    });
}

boostsrap();
