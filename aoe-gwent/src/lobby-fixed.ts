/**
 * Lobby system that works with the actual HTML structure
 * Supports session persistence and user ID tracking
 */

import "./style.css";
import { GameWebSocketClient, Player, Room } from "./api/GameWebSocketClient";

// Configuration
const TESTING_MODE = true;
const SERVER_URL = "ws://localhost:3001";
const SESSION_KEY = "aoe2-gwent-session";

// Generate a unique client ID that persists across sessions
function generateClientId(): string {
	let clientId = localStorage.getItem("aoe2-client-id");
	if (!clientId) {
		clientId =
			"client_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
		localStorage.setItem("aoe2-client-id", clientId);
		console.log("🆔 Generated new client ID:", clientId);
	} else {
		console.log("🆔 Using existing client ID:", clientId);
	}
	return clientId;
}

const CLIENT_ID = generateClientId();

// Helper function to check if a player name is already taken
function isPlayerNameTaken(playerName: string): boolean {
	// Check all players in all available rooms
	for (const room of availableRoomsList) {
		for (const player of room.players) {
			if (player.name.toLowerCase() === playerName.toLowerCase()) {
				return true;
			}
		}
	}
	return false;
}

// Session data interface
interface SessionData {
	clientId: string;
	playerId?: string;
	playerName?: string;
	roomId?: string;
	lastConnected: number;
}

// DOM Elements (matching actual HTML)
const createRoomBtn = document.getElementById(
	"create-room-btn"
) as HTMLButtonElement;
const confirmCreateRoomBtn = document.getElementById(
	"confirm-create-room"
) as HTMLButtonElement;
const cancelCreateRoomBtn = document.getElementById(
	"cancel-create-room"
) as HTMLButtonElement;
const createRoomModal = document.getElementById(
	"create-room-modal"
) as HTMLElement;
const roomNameInput = document.getElementById("room-name") as HTMLInputElement;
const playerNameInput = document.getElementById(
	"player-name"
) as HTMLInputElement;
const readyBtn = document.getElementById("ready-btn") as HTMLButtonElement;
const leaveRoomBtn = document.getElementById(
	"leave-room-btn"
) as HTMLButtonElement;

const currentRoomSection = document.getElementById(
	"current-room-section"
) as HTMLElement;
const availableRooms = document.getElementById(
	"available-rooms"
) as HTMLElement;
const currentRoomName = document.getElementById(
	"current-room-name"
) as HTMLElement;
const player1Card = document.getElementById("player-1") as HTMLElement;
const player2Card = document.getElementById("player-2") as HTMLElement;
const statusContainer = document.getElementById(
	"status-container"
) as HTMLElement;

// State
let gameClient: GameWebSocketClient | null = null;
let currentRoom: Room | null = null;
let currentPlayer: Player | null = null;
let availableRoomsList: Room[] = [];
let isConnected = false;
let sessionData: SessionData = loadSessionData();

// Session management
function loadSessionData(): SessionData {
	try {
		const stored = localStorage.getItem(SESSION_KEY);
		if (stored) {
			const data = JSON.parse(stored) as SessionData;
			if (Date.now() - data.lastConnected < 60 * 60 * 1000) {
				console.log("🔄 Restored session:", data);
				return { ...data, clientId: CLIENT_ID };
			}
		}
	} catch (error) {
		console.warn("Failed to load session data:", error);
	}
	return { clientId: CLIENT_ID, lastConnected: Date.now() };
}

function saveSessionData(): void {
	try {
		sessionData.lastConnected = Date.now();
		sessionData.clientId = CLIENT_ID;
		if (currentPlayer) {
			sessionData.playerId = currentPlayer.id;
			sessionData.playerName = currentPlayer.name;
		}
		if (currentRoom) {
			sessionData.roomId = currentRoom.id;
		}
		localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
		console.log("💾 Saved session:", sessionData);
	} catch (error) {
		console.warn("Failed to save session data:", error);
	}
}

function clearSessionData(): void {
	try {
		localStorage.removeItem(SESSION_KEY);
		sessionData = { clientId: CLIENT_ID, lastConnected: Date.now() };
		console.log("🗑️ Cleared session data");
	} catch (error) {
		console.warn("Failed to clear session data:", error);
	}
}

// Initialize WebSocket connection
function initializeConnection() {
	gameClient = new GameWebSocketClient(SERVER_URL);

	gameClient.on("connected", () => {
		isConnected = true;
		showStatus("Connected to server", "success");
		console.log("🔗 Connected with client ID:", CLIENT_ID);

		gameClient?.send("lobby:get_rooms", {});

		// Try to restore session
		if (sessionData.roomId && sessionData.playerName) {
			console.log("🔄 Attempting to rejoin room:", sessionData.roomId);
			gameClient?.send("lobby:join_room", {
				roomId: sessionData.roomId,
				playerName: sessionData.playerName,
			});
		}
	});

	gameClient.on("disconnected", () => {
		isConnected = false;
		showStatus("Disconnected from server", "error");
		resetLobbyState();
	});

	gameClient.on("error", (error) => {
		showStatus(`Connection error: ${error}`, "error");
	});

	// Lobby event handlers
	gameClient.on("lobby:rooms_list", (data) => {
		availableRoomsList = data.rooms;
		updateAvailableRooms();
	});

	gameClient.on("lobby:room_created", (data) => {
		currentRoom = data.room;
		currentPlayer =
			data.room.players.find((p) => p.id === data.playerId) || null;
		saveSessionData();
		showCurrentRoom();
		hideCreateRoomModal();
		showStatus(`Room "${data.room.name}" created successfully!`, "success");
	});

	gameClient.on("lobby:room_joined", (data) => {
		currentRoom = data.room;
		currentPlayer =
			data.room.players.find((p) => p.id === data.playerId) || null;
		saveSessionData();
		showCurrentRoom();
		showStatus(`Joined room "${data.room.name}"!`, "success");
	});

	gameClient.on("lobby:room_updated", (data) => {
		currentRoom = data.room;
		updateCurrentRoom();
	});

	gameClient.on("lobby:player_joined", (data) => {
		currentRoom = data.room;
		updateCurrentRoom();
		showStatus(`${data.player.name} joined the room`, "info");
	});

	gameClient.on("lobby:player_left", (data) => {
		currentRoom = data.room;
		updateCurrentRoom();
		showStatus("A player left the room", "info");
	});

	gameClient.on("lobby:player_ready_changed", (data) => {
		currentRoom = data.room;

		// Update currentPlayer if this is the current player's ready state change
		if (currentPlayer && data.playerId === currentPlayer.id) {
			currentPlayer.isReady = data.ready;
		}

		updateCurrentRoom();
		const player = data.room.players.find((p) => p.id === data.playerId);
		if (player) {
			showStatus(
				`${player.name} is ${data.ready ? "ready" : "not ready"}`,
				"info"
			);
		}

		// Re-enable the ready button now that server has responded
		if (readyBtn && currentPlayer && data.playerId === currentPlayer.id) {
			readyBtn.disabled = false;
		}
	});

	gameClient.on("lobby:game_starting", (data) => {
		showStatus("Game starting! Redirecting...", "success");
		sessionStorage.setItem("gameSession", JSON.stringify(data.gameSession));
		clearSessionData();
		setTimeout(() => {
			window.location.href = "game.html";
		}, 2000);
	});

	gameClient.on("lobby:error", (data) => {
		showStatus(`Error: ${data.message}`, "error");
		if (
			data.message.includes("Room not found") ||
			data.message.includes("not exist")
		) {
			clearSessionData();
		}
	});

	gameClient.connect();
}

// Modal functions
function showCreateRoomModal() {
	if (createRoomModal) {
		createRoomModal.style.display = "block";
	}
}

function hideCreateRoomModal() {
	if (createRoomModal) {
		createRoomModal.style.display = "none";
	}
}

// Event handlers
function handleCreateRoomClick() {
	console.log("🏰 Create room button clicked");
	showCreateRoomModal();
}

function handleConfirmCreateRoom() {
	const roomName = roomNameInput?.value.trim();
	const playerName = playerNameInput?.value.trim();

	console.log("🏰 Confirm create room:", { roomName, playerName, isConnected });

	if (!roomName || !playerName) {
		showStatus("Please enter both room name and player name", "error");
		return;
	}

	if (!isConnected || !gameClient) {
		showStatus("Not connected to server", "error");
		return;
	}

	// Check if player is already in a room
	if (currentRoom) {
		// Auto-leave current room when creating a new one
		if (currentPlayer) {
			console.log("🔄 Auto-leaving current room to create new one");
			gameClient.send("lobby:leave_room", {
				roomId: currentRoom.id,
				playerId: currentPlayer.id,
			});

			// Clear current room state
			currentRoom = null;
			currentPlayer = null;
			hideCurrentRoom();
		}
	}

	showStatus("Creating room...", "info");
	gameClient.send("lobby:create_room", { roomName, playerName });
}

function handleCancelCreateRoom() {
	hideCreateRoomModal();
}

function handleReadyToggle() {
	if (!currentRoom || !currentPlayer || !gameClient) {
		showStatus("Not in a room", "error");
		return;
	}

	// Prevent button spam by disabling during request
	if (readyBtn) {
		readyBtn.disabled = true;
		readyBtn.textContent = "Processing...";
	}

	const newReadyState = !currentPlayer.isReady;

	gameClient.send("lobby:player_ready", {
		roomId: currentRoom.id,
		playerId: currentPlayer.id,
		ready: newReadyState,
	});

	// Note: Button will be re-enabled when server responds with lobby:player_ready_changed
}

function handleLeaveRoom() {
	if (currentRoom && currentPlayer && gameClient) {
		gameClient.send("lobby:leave_room", {
			roomId: currentRoom.id,
			playerId: currentPlayer.id,
		});
	}

	clearSessionData();
	resetLobbyState();
	showStatus("Left the room", "info");
}

// Event listeners
createRoomBtn?.addEventListener("click", handleCreateRoomClick);
confirmCreateRoomBtn?.addEventListener("click", handleConfirmCreateRoom);
cancelCreateRoomBtn?.addEventListener("click", handleCancelCreateRoom);
readyBtn?.addEventListener("click", handleReadyToggle);
leaveRoomBtn?.addEventListener("click", handleLeaveRoom);

// UI functions
function showCurrentRoom() {
	if (currentRoomSection) {
		currentRoomSection.style.display = "block";
	}
	// Hide available rooms section if it exists
	const availableRoomsSection = document.querySelector(
		".lobby-section"
	) as HTMLElement;
	if (availableRoomsSection && availableRoomsSection !== currentRoomSection) {
		availableRoomsSection.style.display = "none";
	}
	updateCurrentRoom();
}

function hideCurrentRoom() {
	if (currentRoomSection) {
		currentRoomSection.style.display = "none";
	}
	// Show available rooms section
	const availableRoomsSection = document.querySelector(
		".lobby-section"
	) as HTMLElement;
	if (availableRoomsSection && availableRoomsSection !== currentRoomSection) {
		availableRoomsSection.style.display = "block";
	}
}

function updateCurrentRoom() {
	if (!currentRoom) return;

	// Update room name
	if (currentRoomName) {
		currentRoomName.textContent = currentRoom.name;
	}

	// Update player cards
	const players = currentRoom.players;

	// Player 1
	if (player1Card) {
		if (players[0]) {
			const p = players[0];
			const player1Name = player1Card.querySelector(
				"#player-1-name"
			) as HTMLElement;
			const player1Status = player1Card.querySelector(
				"#player-1-status"
			) as HTMLElement;

			if (player1Name) player1Name.textContent = p.name;
			if (player1Status) {
				player1Status.textContent = p.isReady ? "Ready" : "Not Ready";
				player1Status.className = p.isReady ? "ready" : "not-ready";
			}

			// Apply proper ready styling to the card
			player1Card.className = `player-card ${p.isReady ? "player-ready" : ""}`;

			// Add host badge if applicable
			if (p.isHost) {
				const hostBadge =
					player1Card.querySelector(".host-badge") ||
					document.createElement("div");
				if (!player1Card.querySelector(".host-badge")) {
					hostBadge.className = "host-badge";
					hostBadge.textContent = "HOST";
					player1Card.appendChild(hostBadge);
				}
			}
		} else {
			const player1Name = player1Card.querySelector(
				"#player-1-name"
			) as HTMLElement;
			const player1Status = player1Card.querySelector(
				"#player-1-status"
			) as HTMLElement;

			if (player1Name) player1Name.textContent = "Waiting...";
			if (player1Status) player1Status.textContent = "Not Ready";
			player1Card.className = "player-card empty";
		}
	}

	// Player 2
	if (player2Card) {
		if (players[1]) {
			const p = players[1];
			const player2Name = player2Card.querySelector(
				"#player-2-name"
			) as HTMLElement;
			const player2Status = player2Card.querySelector(
				"#player-2-status"
			) as HTMLElement;

			if (player2Name) player2Name.textContent = p.name;
			if (player2Status) {
				player2Status.textContent = p.isReady ? "Ready" : "Not Ready";
				player2Status.className = p.isReady ? "ready" : "not-ready";
			}

			// Apply proper ready styling to the card
			player2Card.className = `player-card ${p.isReady ? "player-ready" : ""}`;

			// Add host badge if applicable
			if (p.isHost) {
				const hostBadge =
					player2Card.querySelector(".host-badge") ||
					document.createElement("div");
				if (!player2Card.querySelector(".host-badge")) {
					hostBadge.className = "host-badge";
					hostBadge.textContent = "HOST";
					player2Card.appendChild(hostBadge);
				}
			}
		} else {
			const player2Name = player2Card.querySelector(
				"#player-2-name"
			) as HTMLElement;
			const player2Status = player2Card.querySelector(
				"#player-2-status"
			) as HTMLElement;

			if (player2Name) player2Name.textContent = "Waiting...";
			if (player2Status) player2Status.textContent = "Not Ready";
			player2Card.className = "player-card empty";
		}
	}

	// Update ready button
	if (currentPlayer && readyBtn) {
		readyBtn.textContent = currentPlayer.isReady ? "Cancel Ready" : "Ready";
		readyBtn.className = `btn ${
			currentPlayer.isReady ? "btn-secondary" : "btn-primary"
		}`;

		// Ensure button is enabled
		readyBtn.disabled = false;
	}
}

function updateAvailableRooms() {
	if (!availableRooms) return;

	const joinableRooms = availableRoomsList.filter(
		(room) => !room.isGameStarted && room.players.length < room.maxPlayers
	);

	if (joinableRooms.length === 0) {
		availableRooms.innerHTML = '<div class="no-rooms">No available rooms</div>';
		return;
	}

	availableRooms.innerHTML = joinableRooms
		.map((room) => {
			const isCurrentRoom = currentRoom && currentRoom.id === room.id;

			return `
        <div class="room-card ${isCurrentRoom ? "current-player-room" : ""}">
            <div class="room-name">${room.name}${
				isCurrentRoom ? " (You are here)" : ""
			}</div>
            <div class="room-info">
                Players: ${room.players.length}/${room.maxPlayers}
            </div>
            <div class="room-players">
                ${room.players
									.map(
										(p) => `
                    <span class="player-name ${p.isReady ? "ready" : ""} ${
											currentPlayer && p.id === currentPlayer.id
												? "current-player"
												: ""
										}">${p.name}</span>
                `
									)
									.join("")}
            </div>
            ${
							!isCurrentRoom
								? `<button class="join-room-btn" onclick="joinRoomById('${room.id}')">Join</button>`
								: ""
						}
        </div>
    `;
		})
		.join("");
}

// Global function for join buttons
(window as any).joinRoomById = function (roomId: string) {
	const playerName = playerNameInput?.value.trim();

	if (!playerName) {
		showStatus("Please enter your player name first", "error");
		return;
	}

	if (!isConnected || !gameClient) {
		showStatus("Not connected to server", "error");
		return;
	}

	// Check if player is already in a room
	if (currentRoom) {
		if (currentRoom.id === roomId) {
			showStatus("You are already in this room!", "info");
			return;
		}

		// Auto-leave current room when joining another
		if (currentPlayer) {
			console.log("🔄 Auto-leaving current room to join new one");
			gameClient.send("lobby:leave_room", {
				roomId: currentRoom.id,
				playerId: currentPlayer.id,
			});

			// Clear current room state
			currentRoom = null;
			currentPlayer = null;
			hideCurrentRoom();
		}
	}

	showStatus("Joining room...", "info");
	gameClient.send("lobby:join_room", { roomId, playerName });
};

function showStatus(
	message: string,
	type: "success" | "error" | "info" = "info"
) {
	console.log(`📢 Status [${type}]:`, message);

	if (!statusContainer) return;

	// Create or update status message
	let statusMessage = statusContainer.querySelector(
		".status-message"
	) as HTMLElement;
	if (!statusMessage) {
		statusMessage = document.createElement("div");
		statusMessage.className = "status-message";
		statusContainer.appendChild(statusMessage);
	}

	statusMessage.textContent = message;
	statusMessage.className = `status-message ${type}`;
	statusMessage.style.display = "block";

	// Auto-hide after 5 seconds for success/info messages
	if (type !== "error") {
		setTimeout(() => {
			statusMessage.style.display = "none";
		}, 5000);
	}
}

function resetLobbyState() {
	currentRoom = null;
	currentPlayer = null;
	availableRoomsList = [];
	hideCurrentRoom();
	updateAvailableRooms();
}

// Initialize
function init() {
	console.log("🎮 Age of Empires 2: Gwent - Lobby System");
	console.log(`🆔 Client ID: ${CLIENT_ID}`);
	console.log(`⚡ Testing Mode: ${TESTING_MODE ? "ON" : "OFF"}`);

	// Restore session data
	if (sessionData.playerName && playerNameInput) {
		playerNameInput.value = sessionData.playerName;
		console.log("👤 Restored player name:", sessionData.playerName);
	}

	// Set default values
	if (roomNameInput && !roomNameInput.value) {
		roomNameInput.value = "My AoE2 Room";
	}
	if (playerNameInput && !playerNameInput.value) {
		playerNameInput.value = sessionData.playerName || "Player";
	}

	if (TESTING_MODE) {
		showStatus("Testing Mode: Game can start with 1 ready player", "info");
	}

	initializeConnection();
}

// Start the application
init();
