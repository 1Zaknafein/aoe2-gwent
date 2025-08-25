import { ApplicationInterface } from "./interfaces/ApplicationInterface";
import { SceneInterface } from "./interfaces/SceneInterface";
import { PixiGraphics } from "../../plugins/engine";

export class ManagerImpl {
	constructor() {}
	private static _app?: ApplicationInterface = undefined;
	private static _currentScene?: SceneInterface = undefined;
	private static _blackBackground?: PixiGraphics = undefined;

	public static get width() {
		return Math.max(
			document.documentElement.clientWidth,
			window.innerWidth || 0
		);
	}

	public static get height() {
		return Math.max(
			document.documentElement.clientHeight,
			window.innerHeight || 0
		);
	}

	static init(app: ApplicationInterface): void {
		ManagerImpl._app = app;

		// Create persistent black background
		ManagerImpl._blackBackground = new PixiGraphics();
		ManagerImpl._blackBackground.label = "persistent_black_background";
		ManagerImpl._blackBackground.rect(0, 0, 1, 1).fill(0x000000);
		ManagerImpl._app?.stage?.addChild(ManagerImpl._blackBackground);

		ManagerImpl.resizeBackground();

		ManagerImpl._app.panel.resize(ManagerImpl.resize);
		ManagerImpl._app.ticker?.add(ManagerImpl.update);
	}

	static changeScene(newScene: SceneInterface): void {
		if (ManagerImpl._currentScene) {
			ManagerImpl._app?.stage?.removeChild(ManagerImpl._currentScene);
			ManagerImpl._currentScene.destroy();
		}

		// Add the new one
		ManagerImpl._currentScene = newScene;
		ManagerImpl._app?.stage?.addChild(ManagerImpl._currentScene);
	}

	private static update(framesPassed: number): void {
		if (ManagerImpl._currentScene) {
			ManagerImpl._currentScene.update(framesPassed);
		}
	}

	private static resize(): void {
		ManagerImpl.resizeBackground();

		// if we have a scene, we let it know that a resize happened!
		if (ManagerImpl._currentScene) {
			ManagerImpl._currentScene.resize(ManagerImpl.width, ManagerImpl.height);
		}
	}

	private static resizeBackground(): void {
		if (ManagerImpl._blackBackground) {
			ManagerImpl._blackBackground.width = ManagerImpl.width;
			ManagerImpl._blackBackground.height = ManagerImpl.height;
		}
	}
}
