/**
 * Game page script for handling connection and game logic
 * Simplified version without complex session recovery
 */

import { GameWebSocketClient } from "./api/GameWebSocketClient.js";

class GameClient {
	private client: GameWebSocketClient;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;

	constructor() {
		this.client = new GameWebSocketClient();
		this.setupEventHandlers();
		this.setupBeforeUnloadHandler();
	}

	/**
	 * Initialize the game connection
	 */
	public async init(): Promise<void> {
		console.log("🎮 Initializing game client...");

		// Check if we have connection data from lobby
		const connectionData = sessionStorage.getItem("playerConnection");
		if (!connectionData) {
			console.error("No connection data found - redirecting to lobby");
			this.redirectToLobby();
			return;
		}

		const { roomId, playerName } = JSON.parse(connectionData);

		console.log(`🔗 Connecting ${playerName} to room ${roomId}`);

		// Show connection status
		this.showStatus("Connecting to game session...");

		// Initialize connection with retry logic
		const success = await this.connectWithRetry();
		if (!success) {
			console.error("Failed to connect to game");
			this.showError("Failed to connect to game. Redirecting to lobby...");
			setTimeout(() => {
				this.redirectToLobby();
			}, 3000);
		}
	}

	/**
	 * Connect with retry logic and exponential backoff
	 */
	private async connectWithRetry(): Promise<boolean> {
		while (this.reconnectAttempts < this.maxReconnectAttempts) {
			try {
				this.showStatus(
					`Connecting... (attempt ${this.reconnectAttempts + 1}/${
						this.maxReconnectAttempts
					})`
				);

				const success = await this.client.initGameConnection();
				if (success) {
					this.reconnectAttempts = 0;
					console.log("✅ Connection established");
					this.showStatus("Connected to game!");
					setTimeout(() => this.hideStatus(), 2000);
					return true;
				}
			} catch (error) {
				console.error("Connection attempt failed:", error);
			}

			this.reconnectAttempts++;
			const delay = Math.min(
				1000 * Math.pow(2, this.reconnectAttempts - 1),
				10000
			);
			console.log(`Waiting ${delay}ms before next attempt...`);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}

		return false;
	}

	/**
	 * Set up WebSocket event handlers
	 */
	private setupEventHandlers(): void {
		this.client.on("connected", () => {
			console.log("🔗 Connected to server");
			this.showStatus("Connected!");
		});

		this.client.on("disconnected", () => {
			console.log("🔌 Disconnected from server");
			this.showError("Disconnected from server");
		});

		this.client.on("error", (error?: string) => {
			console.error("❌ WebSocket error:", error);
			this.showError(`Connection error: ${error || "Unknown error"}`);
		});

		// Game events
		this.client.on("game:state_update", (data) => {
			console.log("📊 Game state update:", data);
		});

		this.client.on("game:started", (data) => {
			console.log("🎮 Game started:", data);
		});

		this.client.on("game:action_result", (data) => {
			console.log("⚡ Action result:", data);
		});

		this.client.on("game:game_over", (data) => {
			console.log("🏁 Game over:", data);
			this.showStatus(`Game Over! Winner: ${data.winner}`);
		});

		// Error handling
		this.client.on("lobby:error", (data) => {
			console.error("🚨 Error:", data);
			this.showError(`Error: ${data.message}`);
		});
	}

	/**
	 * Set up beforeunload handler to clean up on page close
	 */
	private setupBeforeUnloadHandler(): void {
		window.addEventListener("beforeunload", () => {
			this.cleanup();
		});
	}

	/**
	 * Clean up resources and clear storage
	 */
	private cleanup(): void {
		if (this.client) {
			this.client.disconnect();
		}

		// Clear session data on page unload (no persistence)
		sessionStorage.removeItem("playerConnection");
		console.log("🧹 Cleaned up game session data");
	}

	/**
	 * Redirect to lobby page
	 */
	private redirectToLobby(): void {
		console.log("🔄 Redirecting to lobby...");
		this.cleanup();
		window.location.href = "lobby.html";
	}

	/**
	 * Show status message
	 */
	private showStatus(message: string): void {
		const statusEl = document.getElementById("status");
		if (statusEl) {
			statusEl.textContent = message;
			statusEl.className = "status";
			statusEl.style.display = "block";
		}
	}

	/**
	 * Show error message
	 */
	private showError(message: string): void {
		const statusEl = document.getElementById("status");
		if (statusEl) {
			statusEl.textContent = message;
			statusEl.className = "error";
			statusEl.style.display = "block";
		}
	}

	/**
	 * Hide status message
	 */
	private hideStatus(): void {
		const statusEl = document.getElementById("status");
		if (statusEl) {
			statusEl.style.display = "none";
		}
	}
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	const gameClient = new GameClient();
	gameClient.init().catch((error) => {
		console.error("Failed to initialize game client:", error);
	});
});
