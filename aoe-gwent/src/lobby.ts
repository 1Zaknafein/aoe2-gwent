import {
	ConnectionStatus,
	GameSessionData,
	LobbyManager,
} from "./api/LobbyAPI";
import "./style.css";

import { LobbyUI } from "./ui/lobby/LobbyUI";

/**
 * Lobby application entry point
 * Handles the lobby/room system before launching the main game
 */
class LobbyApp {
	private lobbyManager: LobbyManager;
	private lobbyUI: LobbyUI;

	constructor() {
		this.lobbyManager = new LobbyManager();
		this.lobbyUI = new LobbyUI(this.lobbyManager);
	}

	/**
	 * Initialize the lobby application
	 */
	public async init(): Promise<void> {
		try {
			console.log("Initializing lobby application...");

			// Initialize UI components
			await this.lobbyUI.init();

			// Set up event listeners for lobby interactions
			this.setupEventListeners();

			console.log("Lobby application initialized successfully");
		} catch (error) {
			console.error("Failed to initialize lobby application:", error);
		}
	}

	/**
	 * Set up global event listeners
	 */
	private setupEventListeners(): void {
		// Listen for game start events from lobby manager
		this.lobbyManager.onGameStart((gameData: GameSessionData) => {
			this.startGame(gameData);
		});

		// Listen for connection status changes
		this.lobbyManager.onConnectionStatusChange((status: ConnectionStatus) => {
			this.lobbyUI.updateConnectionStatus(status);
		});

		// Handle page visibility changes (to maintain connection)
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) {
				this.lobbyManager.pauseConnection();
			} else {
				this.lobbyManager.resumeConnection();
			}
		});

		// Handle page unload (cleanup)
		window.addEventListener("beforeunload", () => {
			this.lobbyManager.disconnect();
		});
	}

	/**
	 * Start the main game application
	 */
	private startGame(gameData: any): void {
		console.log("Starting game with data:", gameData);

		// Store game data in sessionStorage for the main game to access
		sessionStorage.setItem("gameSession", JSON.stringify(gameData));

		// Navigate to the main game
		window.location.href = "/index.html";
	}
}

// Bootstrap the lobby application
const bootstrap = async () => {
	const app = new LobbyApp();
	await app.init();
};

// Start the application when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootstrap);
} else {
	bootstrap();
}
