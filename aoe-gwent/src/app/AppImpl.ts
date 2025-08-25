import { PixiApplication, IPixiApplicationOptions } from "../plugins/engine";
import {
	ApplicationInterface,
	StageInterface,
	PanelInterface,
	TickerInterface,
} from "../entities/manager";

export class App implements ApplicationInterface {
	private _app: PixiApplication;
	ticker?: TickerInterface;
	stage?: StageInterface;
	panel: PanelInterface;

	constructor() {
		this._app = new PixiApplication();

		const pixiPanel: PanelInterface = {
			resize: (fn: () => void) => {
				window.addEventListener("resize", fn);
			},
		};
		this.panel = pixiPanel;

		// @ts-ignore
		globalThis.__PIXI_APP__ = this._app;
	}

	public async init<T = Partial<IPixiApplicationOptions>>(
		options: T
	): Promise<void> {
		await this._app.init(options!);

		this.ticker = this._app.ticker;
		this.stage = this._app.stage;
	}
}
