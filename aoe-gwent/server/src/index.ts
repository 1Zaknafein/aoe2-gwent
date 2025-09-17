import { GameServer } from "./GameServer.js";

/**
 * Main server entry point
 */
function main() {
	const port = parseInt(process.env.PORT || "3001", 10);

	console.log("🎮 Starting Age of Empires Gwent Server...");
	console.log(`📡 Server will run on port ${port}`);

	const server = new GameServer(port);

	// Graceful shutdown
	process.on("SIGINT", () => {
		console.log("\n🛑 Shutting down server...");
		server.close();
		process.exit(0);
	});

	process.on("SIGTERM", () => {
		console.log("\n🛑 Shutting down server...");
		server.close();
		process.exit(0);
	});

	// Log server stats every 30 seconds
	setInterval(() => {
		const stats = server.getStats();
		console.log(
			`📊 Server stats - Players: ${stats.players}, Rooms: ${stats.rooms}`
		);
	}, 30000);

	console.log("✅ Server started successfully!");
	console.log("🔗 Clients can connect via WebSocket");
	console.log(`📍 ws://localhost:${port}`);
}

// Start the server
main();
