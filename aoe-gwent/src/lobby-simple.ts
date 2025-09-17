import "./style.css";

/**
 * Simple Lobby Application
 * Handles room creation, joining, and starting the game
 */
class SimpleLobbyApp {
	private currentPlayerName: string = "";
	private currentRoomName: string = "";
	private isInRoom: boolean = false;
	private isReady: boolean = false;
	private players: { name: string; ready: boolean }[] = [];

	// Testing flag - set to false when server is ready for 2-player requirement
	private readonly TESTING_MODE = true;

	constructor() {
		this.init();
	}

	private init(): void {
		console.log("Initializing lobby application...");
		this.setupEventListeners();
		this.hideRoomSection();
	}

	private setupEventListeners(): void {
		// Room creation
		const createRoomBtn = document.getElementById(
			"create-room-btn"
		) as HTMLButtonElement;
		const confirmCreateBtn = document.getElementById(
			"confirm-create-room"
		) as HTMLButtonElement;
		const cancelCreateBtn = document.getElementById(
			"cancel-create-room"
		) as HTMLButtonElement;

		// Room controls
		const readyBtn = document.getElementById("ready-btn") as HTMLButtonElement;
		const leaveRoomBtn = document.getElementById(
			"leave-room-btn"
		) as HTMLButtonElement;

		// Event listeners
		createRoomBtn?.addEventListener("click", () => this.showCreateRoomModal());
		confirmCreateBtn?.addEventListener("click", () => this.createRoom());
		cancelCreateBtn?.addEventListener("click", () =>
			this.hideCreateRoomModal()
		);
		readyBtn?.addEventListener("click", () => this.toggleReady());
		leaveRoomBtn?.addEventListener("click", () => this.leaveRoom());
	}

	private showCreateRoomModal(): void {
		const playerName = (
			document.getElementById("player-name") as HTMLInputElement
		).value.trim();
		if (!playerName) {
			this.showStatus("Please enter your name first!", "error");
			return;
		}

		const modal = document.getElementById("create-room-modal");
		if (modal) {
			modal.style.display = "block";
		}
	}

	private hideCreateRoomModal(): void {
		const modal = document.getElementById("create-room-modal");
		if (modal) {
			modal.style.display = "none";
		}
		// Clear room name input
		const roomNameInput = document.getElementById(
			"room-name"
		) as HTMLInputElement;
		if (roomNameInput) {
			roomNameInput.value = "";
		}
	}

	private createRoom(): void {
		const playerName = (
			document.getElementById("player-name") as HTMLInputElement
		).value.trim();
		const roomName = (
			document.getElementById("room-name") as HTMLInputElement
		).value.trim();

		if (!playerName || !roomName) {
			this.showStatus("Please fill in all fields!", "error");
			return;
		}

		this.currentPlayerName = playerName;
		this.currentRoomName = roomName;
		this.isInRoom = true;
		this.players = [{ name: playerName, ready: false }];

		this.hideCreateRoomModal();
		this.showRoomSection();
		this.updateRoomDisplay();
		this.showStatus(`Room "${roomName}" created successfully!`, "success");
	}

	private showRoomSection(): void {
		// Hide lobby sections
		const lobbySection = document.querySelector(
			".lobby-section:first-of-type"
		) as HTMLElement;
		const availableRoomsSection = document.querySelector(
			".lobby-section:last-of-type"
		) as HTMLElement;
		const createRoomModal = document.getElementById("create-room-modal");

		if (lobbySection) lobbySection.style.display = "none";
		if (availableRoomsSection) availableRoomsSection.style.display = "none";
		if (createRoomModal) createRoomModal.style.display = "none";

		// Show room section
		const roomSection = document.getElementById("current-room-section");
		if (roomSection) {
			roomSection.style.display = "block";
		}
	}

	private hideRoomSection(): void {
		// Show lobby sections
		const lobbySection = document.querySelector(
			".lobby-section:first-of-type"
		) as HTMLElement;
		const availableRoomsSection = document.querySelector(
			".lobby-section:last-of-type"
		) as HTMLElement;

		if (lobbySection) lobbySection.style.display = "block";
		if (availableRoomsSection) availableRoomsSection.style.display = "block";

		// Hide room section
		const roomSection = document.getElementById("current-room-section");
		if (roomSection) {
			roomSection.style.display = "none";
		}
	}

	private updateRoomDisplay(): void {
		// Update room name
		const roomNameSpan = document.getElementById("current-room-name");
		if (roomNameSpan) {
			roomNameSpan.textContent = this.currentRoomName;
		}

		// Update player cards
		this.players.forEach((player, index) => {
			const playerNameSpan = document.getElementById(
				`player-${index + 1}-name`
			);
			const playerStatusDiv = document.getElementById(
				`player-${index + 1}-status`
			);
			const playerCard = document.getElementById(`player-${index + 1}`);

			if (playerNameSpan) playerNameSpan.textContent = player.name;
			if (playerStatusDiv) {
				playerStatusDiv.textContent = player.ready ? "Ready ⚔" : "Not Ready";
			}
			if (playerCard) {
				if (player.ready) {
					playerCard.classList.add("player-ready");
				} else {
					playerCard.classList.remove("player-ready");
				}
			}
		});
	}

	private toggleReady(): void {
		this.isReady = !this.isReady;

		// Update current player's ready status
		const playerIndex = this.players.findIndex(
			(p) => p.name === this.currentPlayerName
		);
		if (playerIndex !== -1) {
			this.players[playerIndex].ready = this.isReady;
		}

		// Update ready button text
		const readyBtn = document.getElementById("ready-btn") as HTMLButtonElement;
		if (readyBtn) {
			readyBtn.textContent = this.isReady ? "Cancel Ready" : "Ready";
			readyBtn.classList.toggle("btn-secondary", this.isReady);
		}

		this.updateRoomDisplay();

		if (this.isReady) {
			if (this.TESTING_MODE) {
				this.showStatus("Ready! Starting game for testing...", "info");
				this.checkGameStart();
			} else {
				this.showStatus("You are ready! Waiting for other players...", "info");
				// In production mode, simulate other player getting ready after 2 seconds
				setTimeout(() => {
					if (this.players.length > 1) {
						this.players[0].ready = true; // Make other player ready
						this.updateRoomDisplay();
						this.checkGameStart();
					}
				}, 2000);
			}
		} else {
			this.showStatus("Ready status cancelled.", "info");
		}
	}

	private checkGameStart(): void {
		let canStartGame = false;

		if (this.TESTING_MODE) {
			// In testing mode, start with just 1 ready player
			canStartGame = this.players.some((p) => p.ready);
		} else {
			// In production mode, require all players to be ready with minimum 2 players
			canStartGame =
				this.players.length >= 2 && this.players.every((p) => p.ready);
		}

		if (canStartGame) {
			const message = this.TESTING_MODE
				? "Testing mode: Starting game in 3 seconds..."
				: "All players ready! Starting game in 3 seconds...";

			this.showStatus(message, "success");

			setTimeout(() => {
				this.startGame();
			}, 3000);
		}
	}

	private startGame(): void {
		this.showStatus("Starting Age of Empires Card Game...", "success");

		// Redirect to the main game
		setTimeout(() => {
			window.location.href = "/index.html?game=start";
		}, 1000);
	}

	private leaveRoom(): void {
		this.isInRoom = false;
		this.isReady = false;
		this.currentRoomName = "";
		this.players = [];

		this.hideRoomSection();
		this.showStatus("Left the room successfully.", "info");

		// Reset ready button
		const readyBtn = document.getElementById("ready-btn") as HTMLButtonElement;
		if (readyBtn) {
			readyBtn.textContent = "Ready";
			readyBtn.classList.remove("btn-secondary");
		}
	}

	private showStatus(
		message: string,
		type: "success" | "error" | "info"
	): void {
		const statusContainer = document.getElementById("status-container");
		if (!statusContainer) return;

		// Remove existing status messages
		statusContainer.innerHTML = "";

		// Create status message
		const statusDiv = document.createElement("div");
		statusDiv.className = `status-message status-${type}`;
		statusDiv.textContent = message;

		statusContainer.appendChild(statusDiv);

		// Auto-remove after 5 seconds
		setTimeout(() => {
			if (statusDiv.parentNode) {
				statusDiv.parentNode.removeChild(statusDiv);
			}
		}, 5000);
	}
}

// Initialize the lobby application when the page loads
document.addEventListener("DOMContentLoaded", () => {
	new SimpleLobbyApp();
});
