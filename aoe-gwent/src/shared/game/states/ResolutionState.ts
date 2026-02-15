import gsap from "gsap";
import { State, StateName } from "./State";

/**
 * Game resolution state. Shows final scores, winner, and handles end-of-game logic.
 */
export class ResolutionState extends State {
	public async execute(): Promise<StateName> {
		await this.delay(0.5);

		this.darkOverlay.visible = true;

		gsap.to(this.darkOverlay, {
			alpha: 0.3,
			duration: 0.5,
		});

		await this.gameResolutionDisplay.show();
		await this.gameResolutionDisplay.continueButton.waitForClick();

		gsap.to(this.darkOverlay, {
			alpha: 0,
			duration: 0.3,
			onComplete: () => {
				this.darkOverlay.visible = false;
			},
		});

		await this.delay(0.3);

		this.gameManager.endGame();

		await this.delay(1);

		return StateName.ROUND_START;
	}
}
