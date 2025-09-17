import {
	LobbyManager,
	Player,
	ConnectionStatus,
	LobbyMessage,
} from "../../api/LobbyAPI";

/**
 * UI controller for the lobby system
 */
export class LobbyUI {
	private lobbyManager: LobbyManager;
	private elements: { [key: string]: HTMLElement | null } = {};

	constructor(lobbyManager: LobbyManager) {
		this.lobbyManager = lobbyManager;
	}

	/**
	 * Initialize the lobby UI
	 */
	public async init(): Promise<void> {
		this.cacheElements();
		this.setupEventListeners();

		// Connect to the server
		await this.lobbyManager.init();
	}

	/**
	 * Cache DOM elements for efficient access
	 */
	private cacheElements(): void {
		// Main containers
		this.elements.lobbyContainer = document.getElementById("lobby-container");
		this.elements.roomContainer = document.getElementById("room-container");
		this.elements.loadingOverlay = document.getElementById("loading-overlay");

		// Player setup
		this.elements.playerNameInput = document.getElementById("player-name");
		this.elements.createRoomBtn = document.getElementById("create-room-btn");
		this.elements.joinRoomBtn = document.getElementById("join-room-btn");

		// Create room modal
		this.elements.createRoomModal =
			document.getElementById("create-room-modal");
		this.elements.roomNameInput = document.getElementById("room-name");
		this.elements.confirmCreateRoomBtn = document.getElementById(
			"confirm-create-room"
		);
		this.elements.cancelCreateRoomBtn =
			document.getElementById("cancel-create-room");

		// Join room modal
		this.elements.joinRoomModal = document.getElementById("join-room-modal");
		this.elements.joinRoomNameInput = document.getElementById("join-room-name");
		this.elements.confirmJoinRoomBtn =
			document.getElementById("confirm-join-room");
		this.elements.cancelJoinRoomBtn =
			document.getElementById("cancel-join-room");

		// Room view
		this.elements.roomTitle = document.getElementById("room-title");
		this.elements.leaveRoomBtn = document.getElementById("leave-room-btn");
		this.elements.playersList = document.getElementById("players-list");
		this.elements.connectionIndicator = document.getElementById(
			"connection-indicator"
		);
		this.elements.connectionText = document.getElementById("connection-text");
		this.elements.readyBtn = document.getElementById("ready-btn");
		this.elements.roomMessages = document.getElementById("room-messages");
		this.elements.loadingText = document.getElementById("loading-text");
	}

	/**
	 * Setup event listeners for UI interactions
	 */
	private setupEventListeners(): void {
		// Player setup buttons
		this.elements.createRoomBtn?.addEventListener("click", () =>
			this.showCreateRoomModal()
		);
		this.elements.joinRoomBtn?.addEventListener("click", () =>
			this.showJoinRoomModal()
		);

		// Create room modal
		this.elements.confirmCreateRoomBtn?.addEventListener("click", () =>
			this.handleCreateRoom()
		);
		this.elements.cancelCreateRoomBtn?.addEventListener("click", () =>
			this.hideCreateRoomModal()
		);

		// Join room modal
		this.elements.confirmJoinRoomBtn?.addEventListener("click", () =>
			this.handleJoinRoom()
		);
		this.elements.cancelJoinRoomBtn?.addEventListener("click", () =>
			this.hideJoinRoomModal()
		);

		// Room actions
		this.elements.leaveRoomBtn?.addEventListener("click", () =>
			this.handleLeaveRoom()
		);
		this.elements.readyBtn?.addEventListener("click", () =>
			this.handleToggleReady()
		);

		// Enter key handling for inputs
		this.elements.playerNameInput?.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				const createBtn = this.elements.createRoomBtn as HTMLButtonElement;
				if (createBtn && !createBtn.disabled) {
					this.showCreateRoomModal();
				}
			}
		});

		this.elements.roomNameInput?.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				this.handleCreateRoom();
			}
		});

		this.elements.joinRoomNameInput?.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				this.handleJoinRoom();
			}
		});

		// Input validation
		this.elements.playerNameInput?.addEventListener("input", () =>
			this.validateInputs()
		);
		this.elements.roomNameInput?.addEventListener("input", () =>
			this.validateRoomName()
		);
		this.elements.joinRoomNameInput?.addEventListener("input", () =>
			this.validateJoinRoomName()
		);
	}

	/**
	 * Show create room modal
	 */
	private showCreateRoomModal(): void {
		if (!this.validatePlayerName()) return;

		this.elements.createRoomModal?.classList.remove("hidden");
		(this.elements.roomNameInput as HTMLInputElement)?.focus();
	}

	/**
	 * Hide create room modal
	 */
	private hideCreateRoomModal(): void {
		this.elements.createRoomModal?.classList.add("hidden");
		(this.elements.roomNameInput as HTMLInputElement).value = "";
	}

	/**
	 * Show join room modal
	 */
	private showJoinRoomModal(): void {
		if (!this.validatePlayerName()) return;

		this.elements.joinRoomModal?.classList.remove("hidden");
		(this.elements.joinRoomNameInput as HTMLInputElement)?.focus();
	}

	/**
	 * Hide join room modal
	 */
	private hideJoinRoomModal(): void {
		this.elements.joinRoomModal?.classList.add("hidden");
		(this.elements.joinRoomNameInput as HTMLInputElement).value = "";
	}

	/**
	 * Handle create room action
	 */
	private handleCreateRoom(): void {
		const playerName = (
			this.elements.playerNameInput as HTMLInputElement
		)?.value.trim();
		const roomName = (
			this.elements.roomNameInput as HTMLInputElement
		)?.value.trim();

		if (!playerName || !roomName) {
			this.showMessage("Please enter both player name and room name", "error");
			return;
		}

		this.showLoading("Creating room...");

		if (this.lobbyManager.createRoom(playerName, roomName)) {
			this.hideCreateRoomModal();
			// Wait for server response before hiding loading
		} else {
			this.hideLoading();
			this.showMessage("Failed to create room. Please try again.", "error");
		}
	}

	/**
	 * Handle join room action
	 */
	private handleJoinRoom(): void {
		const playerName = (
			this.elements.playerNameInput as HTMLInputElement
		)?.value.trim();
		const roomName = (
			this.elements.joinRoomNameInput as HTMLInputElement
		)?.value.trim();

		if (!playerName || !roomName) {
			this.showMessage("Please enter both player name and room name", "error");
			return;
		}

		this.showLoading("Joining room...");

		if (this.lobbyManager.joinRoom(playerName, roomName)) {
			this.hideJoinRoomModal();
			// Wait for server response before hiding loading
		} else {
			this.hideLoading();
			this.showMessage("Failed to join room. Please try again.", "error");
		}
	}

	/**
	 * Handle leave room action
	 */
	private handleLeaveRoom(): void {
		if (this.lobbyManager.leaveRoom()) {
			this.showLobbyView();
		} else {
			this.showMessage("Failed to leave room", "error");
		}
	}

	/**
	 * Handle toggle ready state
	 */
	private handleToggleReady(): void {
		const currentPlayer = this.lobbyManager.getCurrentPlayer();
		if (!currentPlayer) return;

		const newReadyState = !currentPlayer.isReady;

		if (this.lobbyManager.setReady(newReadyState)) {
			// Update button text optimistically
			const readyBtn = this.elements.readyBtn as HTMLButtonElement;
			readyBtn.textContent = newReadyState ? "Not Ready" : "Ready";
			readyBtn.classList.toggle("ready", newReadyState);
		} else {
			this.showMessage("Failed to update ready status", "error");
		}
	}

	/**
	 * Validate player name input
	 */
	private validatePlayerName(): boolean {
		const playerName = (
			this.elements.playerNameInput as HTMLInputElement
		)?.value.trim();
		return playerName.length > 0;
	}

	/**
	 * Validate all inputs and enable/disable buttons
	 */
	private validateInputs(): void {
		const isValid = this.validatePlayerName();

		const createBtn = this.elements.createRoomBtn as HTMLButtonElement;
		const joinBtn = this.elements.joinRoomBtn as HTMLButtonElement;

		if (createBtn) createBtn.disabled = !isValid;
		if (joinBtn) joinBtn.disabled = !isValid;
	}

	/**
	 * Validate room name for creation
	 */
	private validateRoomName(): void {
		const roomName = (
			this.elements.roomNameInput as HTMLInputElement
		)?.value.trim();
		const confirmBtn = this.elements.confirmCreateRoomBtn as HTMLButtonElement;

		if (confirmBtn) confirmBtn.disabled = roomName.length === 0;
	}

	/**
	 * Validate room name for joining
	 */
	private validateJoinRoomName(): void {
		const roomName = (
			this.elements.joinRoomNameInput as HTMLInputElement
		)?.value.trim();
		const confirmBtn = this.elements.confirmJoinRoomBtn as HTMLButtonElement;

		if (confirmBtn) confirmBtn.disabled = roomName.length === 0;
	}

	/**
	 * Show loading overlay
	 */
	private showLoading(message: string): void {
		if (this.elements.loadingText) {
			this.elements.loadingText.textContent = message;
		}
		this.elements.loadingOverlay?.classList.remove("hidden");
	}

	/**
	 * Hide loading overlay
	 */
	private hideLoading(): void {
		this.elements.loadingOverlay?.classList.add("hidden");
	}

	/**
	 * Show lobby view (main screen)
	 */
	private showLobbyView(): void {
		this.elements.lobbyContainer?.classList.remove("hidden");
		this.elements.roomContainer?.classList.add("hidden");
		this.hideLoading();
	}

	/**
	 * Show room view
	 */
	private showRoomView(): void {
		this.elements.lobbyContainer?.classList.add("hidden");
		this.elements.roomContainer?.classList.remove("hidden");
		this.hideLoading();

		this.updateRoomDisplay();
	}

	/**
	 * Update connection status display
	 */
	public updateConnectionStatus(status: ConnectionStatus): void {
		const indicator = this.elements.connectionIndicator;
		const text = this.elements.connectionText;

		if (indicator) {
			indicator.className = `status-indicator ${status}`;
		}

		if (text) {
			switch (status) {
				case "connecting":
					text.textContent = "Connecting...";
					break;
				case "connected":
					text.textContent = "Connected";
					break;
				case "disconnected":
					text.textContent = "Disconnected";
					break;
				case "error":
					text.textContent = "Connection Error";
					break;
			}
		}

		// Enable/disable ready button based on connection
		const readyBtn = this.elements.readyBtn as HTMLButtonElement;
		if (readyBtn) {
			readyBtn.disabled = status !== "connected";
		}
	}

	/**
	 * Update room display with current room data
	 */
	private updateRoomDisplay(): void {
		const room = this.lobbyManager.getCurrentRoom();
		const currentPlayer = this.lobbyManager.getCurrentPlayer();

		if (!room || !currentPlayer) return;

		// Update room title
		if (this.elements.roomTitle) {
			this.elements.roomTitle.textContent = `Room: ${room.name}`;
		}

		// Update players list
		this.updatePlayersList(room.players);

		// Update ready button
		this.updateReadyButton(currentPlayer);
	}

	/**
	 * Update players list display
	 */
	private updatePlayersList(players: Player[]): void {
		const playersListElement = this.elements.playersList;
		if (!playersListElement) return;

		playersListElement.innerHTML = "";

		players.forEach((player) => {
			const playerElement = document.createElement("div");
			playerElement.className = "player-item";

			const nameElement = document.createElement("span");
			nameElement.className = "player-name";
			nameElement.textContent = player.name;

			const statusElement = document.createElement("span");
			statusElement.className = "player-status";

			if (player.isHost) {
				statusElement.textContent = "(Host)";
				statusElement.classList.add("host");
			}

			if (player.isReady) {
				statusElement.textContent += " Ready";
				statusElement.classList.add("ready");
			} else {
				statusElement.textContent += " Not Ready";
				statusElement.classList.add("not-ready");
			}

			playerElement.appendChild(nameElement);
			playerElement.appendChild(statusElement);
			playersListElement.appendChild(playerElement);
		});
	}

	/**
	 * Update ready button state
	 */
	private updateReadyButton(currentPlayer: Player): void {
		const readyBtn = this.elements.readyBtn as HTMLButtonElement;
		if (!readyBtn) return;

		readyBtn.textContent = currentPlayer.isReady ? "Not Ready" : "Ready";
		readyBtn.classList.toggle("ready", currentPlayer.isReady);
	}

	/**
	 * Show a message to the user
	 */
	private showMessage(
		message: string,
		type: "info" | "error" | "success" = "info"
	): void {
		const messagesContainer = this.elements.roomMessages;
		if (!messagesContainer) {
			// Fallback to alert if no message container
			alert(message);
			return;
		}

		const messageElement = document.createElement("div");
		messageElement.className = `message ${type}`;
		messageElement.textContent = `${new Date().toLocaleTimeString()}: ${message}`;

		messagesContainer.appendChild(messageElement);
		messagesContainer.scrollTop = messagesContainer.scrollHeight;

		// Auto-remove message after 5 seconds
		setTimeout(() => {
			if (messageElement.parentNode) {
				messageElement.parentNode.removeChild(messageElement);
			}
		}, 5000);
	}

	/**
	 * Handle successful room joining/creation
	 */
	public onRoomJoined(): void {
		this.showRoomView();
		this.showMessage("Successfully joined room", "success");
	}

	/**
	 * Handle room leaving
	 */
	public onRoomLeft(): void {
		this.showLobbyView();
		this.showMessage("Left the room", "info");
	}

	/**
	 * Handle lobby message for UI updates
	 */
	public handleLobbyMessage(message: LobbyMessage): void {
		switch (message.type) {
			case "room_created":
			case "player_joined":
				this.showRoomView();
				break;
			case "player_left":
				this.updateRoomDisplay();
				break;
			case "player_ready":
				this.updateRoomDisplay();
				break;
			case "error":
				this.showMessage(message.data.message || "An error occurred", "error");
				this.hideLoading();
				break;
			case "info":
				this.showMessage(message.data.message || "Info", "info");
				break;
		}
	}
}
