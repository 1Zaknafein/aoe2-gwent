# Server Communication System Documentation

This document explains the server communication system and debug panel that has been implemented for the Gwent-like card game.

## Overview

The system consists of several components that work together to manage game state, communicate with the server, and provide debugging capabilities:

1. **GameStateManager** - Manages the game state and handles server responses
2. **ServerAPI** - Handles communication with the game server
3. **GameController** - Central controller that coordinates between UI and server
4. **DebugPanel** - Testing interface for simulating server responses

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GameScene     │    │ CardInteraction │    │   DebugPanel    │
│                 │    │    Manager      │    │                 │
│ - UI Components │    │ - Player Actions│    │ - Test Controls │
│ - Visual Updates│    │ - Card Placement│    │ - Enemy Actions │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │              ┌───────▼───────┐              │
          └──────────────►│ GameController│◄─────────────┘
                         │               │
                         │ - Coordinates │
                         │ - Event Hub   │
                         └───────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
          ┌─────────▼───────┐    │  ┌─────────▼───────┐
          │GameStateManager │    │  │    ServerAPI    │
          │                 │    │  │                 │
          │ - Game State    │    │  │ - HTTP Requests │
          │ - Turn Logic    │    │  │ - Server Comm   │
          │ - Phase Mgmt    │    │  │ - Action Sending│
          └─────────────────┘    │  └─────────────────┘
                                 │
                         ┌───────▼───────┐
                         │   Server      │
                         │  (Not Yet     │
                         │ Implemented)  │
                         └───────────────┘
```

## Components

### GameStateManager

**Location:** `src/shared/game/GameStateManager.ts`

Manages the overall game state including:
- Current game phase (waiting, player turn, enemy turn, etc.)
- Turn management
- Score tracking
- Player pass states

**Key Methods:**
- `handleServerResponse(response)` - Processes incoming server messages
- `updateGameState(newState)` - Updates game state manually (for testing)
- `isPlayerTurn` / `isEnemyTurn` - Check current turn

### ServerAPI

**Location:** `src/api/ServerAPI.ts`

Handles all communication with the game server:
- Sending player actions (card placement, pass turn, draw card)
- Managing connection state
- Listening for server responses (placeholder for WebSocket/polling)

**Key Methods:**
- `connect()` - Establish server connection
- `sendCardPlacement(cardId, targetRow)` - Send card placement action
- `sendPassTurn()` - Send pass turn action
- `startListening(callback)` - Begin listening for server messages

### GameController

**Location:** `src/shared/game/GameController.ts`

Central coordinator that:
- Connects UI events to server actions
- Handles enemy actions from server
- Manages game state updates
- Coordinates between all components

**Key Methods:**
- `handleEnemyAction(action)` - Processes enemy actions from server
- `sendPlayerAction(cardId, targetRow)` - Sends player actions to server
- `connectToServer()` - Initialize server connection

### DebugPanel

**Location:** `src/ui/components/DebugPanel.ts`

Testing interface that allows developers to:
- Simulate game start
- Switch turns manually
- Trigger enemy card placements
- Test enemy pass turn
- Monitor game state in real-time

## Game State Types

```typescript
enum GamePhase {
  WAITING_FOR_GAME_START = "waiting_for_game_start",
  PLAYER_TURN = "player_turn",
  ENEMY_TURN = "enemy_turn",
  ROUND_END = "round_end",
  GAME_END = "game_end"
}

interface GameState {
  phase: GamePhase;
  currentTurn: "player" | "enemy";
  roundNumber: number;
  playerScore: number;
  enemyScore: number;
  playerPassed: boolean;
  enemyPassed: boolean;
}
```

## Action Types

```typescript
enum ActionType {
  PLACE_CARD = "place_card",
  PASS_TURN = "pass_turn",
  DRAW_CARD = "draw_card"
}

interface PlayerAction {
  type: ActionType;
  cardId?: number;
  targetRow?: "melee" | "ranged" | "siege";
  playerId: "player";
}
```

## Usage

### Player Actions

When a player places a card:
1. `CardInteractionManager` detects the card placement
2. Calls `GameController.sendPlayerAction(cardId, targetRow)`
3. `ServerAPI` sends the action to the server
4. Card is moved on the board immediately (optimistic update)

### Enemy Actions

When the server sends an enemy action:
1. `ServerAPI` receives the response
2. `GameStateManager.handleServerResponse()` processes it
3. `GameController.handleEnemyAction()` executes the action
4. Enemy card is moved from hand to the appropriate row
5. Game state is updated

### Debug Testing

1. Click "Debug Panel" button to open the test interface
2. Use "Start Game" to initialize the game state
3. Use "Enemy Place Card" to simulate enemy actions
4. Use row-specific buttons to place enemy cards on specific rows
5. Monitor the status display for real-time game state

## Integration Points

### Adding New Actions

1. Add action type to `ActionType` enum
2. Extend `PlayerAction` interface if needed
3. Add method to `ServerAPI` for sending action
4. Add handler in `GameController.handleEnemyAction()`
5. Add UI controls in `DebugPanel` if needed

### Server Integration

When the actual server is ready:
1. Update `ServerAPI.connect()` with real endpoint
2. Implement WebSocket or polling in `startListening()`
3. Update HTTP request methods with actual endpoints
4. Add authentication/session management as needed

## Current Limitations

- No real server - actions are logged but not sent
- Enemy cards are generated on-demand rather than from actual hand
- Card IDs are inferred from card names (simplified approach)
- No network error handling or retry logic

## Testing

The debug panel provides comprehensive testing capabilities:
- All enemy action types can be simulated
- Game state changes are immediately visible
- Server communication flow can be tested without actual server
- Turn-based logic can be verified

## Future Enhancements

1. **Real Server Integration** - Replace mock server calls with actual HTTP/WebSocket
2. **Card ID Management** - Implement proper card ID tracking
3. **Network Error Handling** - Add retry logic and error states
4. **Authentication** - Add user authentication and session management
5. **Reconnection Logic** - Handle disconnections and reconnections
6. **Action Validation** - Add client-side action validation
7. **Animation Coordination** - Sync animations with server responses
