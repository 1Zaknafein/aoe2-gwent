# Server-Client Communication Protocol

This document describes the WebSocket-based communication protocol between the AoE2 Gwent game server and clients.

## Server Architecture

The game server (`GameServer.ts`) handles two main areas:
- **Lobby Management**: Room creation, player joining, readiness states
- **Game Session Management**: Active gameplay, card actions, game state synchronization

## Connection Flow

1. **Initial Connection**: Client connects to WebSocket server
2. **Automatic Room List**: Server immediately sends available rooms
3. **Lobby Interactions**: Create/join rooms, set ready status
4. **Game Transition**: When all players ready, server creates game session
5. **Game Play**: Real-time game actions and state updates
6. **Disconnection Handling**: Grace periods for reconnection during game transitions

## Message Format

All WebSocket messages follow this structure:

```typescript
interface ServerMessage<T> {
  type: T;                    // Message type identifier
  data: AllMessages[T];       // Type-specific payload
  timestamp: Date;            // Server timestamp
}

interface ClientMessage<T> {
  type: T;                    // Message type identifier  
  data: AllMessages[T];       // Type-specific payload
}
```

---

## Lobby Messages

### Client → Server

#### `lobby:create_room`
Create a new game room.
```typescript
{
  type: "lobby:create_room",
  data: {
    roomName: string;      // Display name for the room
    playerName: string;    // Creator's player name
  }
}
```

#### `lobby:join_room`
Join an existing room.
```typescript
{
  type: "lobby:join_room",
  data: {
    roomId: string;        // Target room ID
    playerName: string;    // Joining player's name
  }
}
```

#### `lobby:leave_room`
Leave current room.
```typescript
{
  type: "lobby:leave_room",
  data: {
    roomId: string;        // Current room ID
    playerId: string;      // Leaving player's ID
  }
}
```

#### `lobby:player_ready`
Set player ready/not ready status.
```typescript
{
  type: "lobby:player_ready",
  data: {
    roomId: string;        // Current room ID
    playerId: string;      // Player setting ready status
    ready: boolean;        // True = ready, false = not ready
  }
}
```

#### `lobby:get_rooms`
Request current room list (rarely needed - auto-sent on connection).
```typescript
{
  type: "lobby:get_rooms",
  data: {}
}
```

### Server → Client

#### `lobby:rooms_list`
Complete list of available rooms (sent on connect and room changes).
```typescript
{
  type: "lobby:rooms_list",
  data: {
    rooms: Room[];         // Array of room objects
  }
}
```

#### `lobby:room_created`
Confirmation that room was created successfully.
```typescript
{
  type: "lobby:room_created",
  data: {
    room: Room;           // Complete room object
    playerId: string;     // Creator's assigned player ID
  }
}
```

#### `lobby:room_joined`
Confirmation that player joined room successfully.
```typescript
{
  type: "lobby:room_joined",
  data: {
    room: Room;           // Complete room object
    playerId: string;     // Joiner's assigned player ID
  }
}
```

#### `lobby:room_updated`
Room state changed (player joined/left, ready status, etc.).
```typescript
{
  type: "lobby:room_updated",
  data: {
    room: Room;           // Updated room object
  }
}
```

#### `lobby:player_ready_changed`
A player's ready status changed.
```typescript
{
  type: "lobby:player_ready_changed",
  data: {
    room: Room;           // Updated room object
    playerId: string;     // Player who changed status
    ready: boolean;       // New ready state
  }
}
```

#### `lobby:game_starting`
Game is about to begin - contains session data for game page.
```typescript
{
  type: "lobby:game_starting",
  data: {
    gameSession: {
      roomId: string;
      playerId: string;
      playerName: string;
      opponentId: string;
      opponentName: string;
      isHost: boolean;
      serverUrl: string;
    }
  }
}
```

#### `lobby:error`
Lobby operation failed.
```typescript
{
  type: "lobby:error",
  data: {
    message: string;      // Human-readable error message
    code?: string;        // Optional error code for programmatic handling
  }
}
```

---

## Game Messages

### Client → Server

#### `game:reconnect`
Reconnect to an active game session (used when transitioning from lobby to game page).
```typescript
{
  type: "game:reconnect",
  data: {
    roomId: string;       // Game session room ID
    playerId: string;     // Player's ID
    sessionToken?: string; // Optional session token (future use)
  }
}
```

#### `game:action`
Perform a game action (place card, pass turn, etc.).
```typescript
{
  type: "game:action",
  data: {
    roomId: string;       // Game session room ID
    playerId: string;     // Acting player's ID
    action: {
      type: "place_card" | "pass_turn" | "draw_card";
      cardId?: number;    // Required for place_card
      targetRow?: "melee" | "ranged" | "siege"; // Required for place_card
    }
  }
}
```

#### `game:ready`
Signal readiness for game events (currently placeholder).
```typescript
{
  type: "game:ready",
  data: {
    roomId: string;       // Game session room ID
    playerId: string;     // Ready player's ID
  }
}
```

### Server → Client

#### `game:started`
Game session has begun - includes player names from this player's perspective.
```typescript
{
  type: "game:started",
  data: {
    roomId: string;       // Game session room ID
    playerName: string;   // This player's name
    enemyName: string;    // Opponent's name
    isHost: boolean;      // True if this player is the host
    startingPlayer: string; // ID of player who goes first
  }
}
```

#### `game:state_update`
Complete game state synchronization.
```typescript
{
  type: "game:state_update",
  data: {
    roomId: string;
    gameState: {
      phase: "waiting_for_game_start" | "player_turn" | "enemy_turn" | "round_end" | "game_end";
      currentTurn: string;    // Current player's ID
      roundNumber: number;    // Current round (1-3)
      scores: Record<string, number>; // Player ID → score
      passedPlayers: string[]; // IDs of players who passed
      startingPlayer: string;  // ID of starting player
      handSizes: Record<string, number>; // Player ID → cards in hand
    };
    boards?: Record<string, {  // Player ID → board state
      melee: number[];    // Card IDs in melee row
      ranged: number[];   // Card IDs in ranged row  
      siege: number[];    // Card IDs in siege row
    }>;
  }
}
```

#### `game:hand_update`
Player's hand has changed (private message to specific player).
```typescript
{
  type: "game:hand_update",
  data: {
    roomId: string;       // Game session room ID
    playerId: string;     // Player whose hand updated
    hand: number[];       // Array of card IDs in hand
  }
}
```

#### `game:action_result`
Result of a player's action attempt.
```typescript
{
  type: "game:action_result",
  data: {
    roomId: string;       // Game session room ID
    success: boolean;     // True if action succeeded
    error?: string;       // Error message if failed
    action?: {            // Echo of successful action
      playerId: string;
      type: string;
      cardId?: number;
      targetRow?: string;
    }
  }
}
```

#### `game:round_ended`
A round has concluded.
```typescript
{
  type: "game:round_ended",
  data: {
    roomId: string;       // Game session room ID
    roundNumber: number;  // Round that just ended
    scores: Record<string, number>; // Updated scores
    roundWinner?: string; // ID of round winner
  }
}
```

#### `game:game_ended`
Game session has concluded.
```typescript
{
  type: "game:game_ended",
  data: {
    roomId: string;       // Game session room ID  
    winner: string;       // ID of game winner
    finalScores: Record<string, number>; // Final scores
  }
}
```

#### `game:error`
Game operation failed or game-level error occurred.
```typescript
{
  type: "game:error",
  data: {
    roomId: string;       // Game session room ID
    message: string;      // Human-readable error message
    code?: string;        // Error codes: "SESSION_NOT_FOUND", "INVALID_PLAYER", "AUTH_ERROR", "PLAYER_DISCONNECTED", etc.
  }
}
```

---

## Connection Management

### Reconnection Grace Period
- When a player disconnects during an active game, server waits **30 seconds** for reconnection
- This handles transitions from lobby.html to game.html  
- If player doesn't reconnect within grace period, game session may be terminated

### Session Storage Integration
- `lobby:game_starting` message triggers client to store session data in `sessionStorage`
- Game page reads this data to reconnect via `game:reconnect`
- Session data is cleared when tab closes (simplified approach - no localStorage persistence)

### Error Handling Codes
- **AUTH_ERROR**: Player authentication failed
- **SESSION_NOT_FOUND**: Game session doesn't exist
- **INVALID_PLAYER**: Player not part of this session
- **PLAYER_DISCONNECTED**: Game ended due to disconnection
- **STATE_ERROR**: Failed to retrieve/update game state

---

## Implementation Notes

### Player Names System
- Server sends player names from each player's perspective in `game:started`
- Host sees: `playerName` = host name, `enemyName` = guest name
- Guest sees: `playerName` = guest name, `enemyName` = host name
- This ensures proper UI display without revealing server-side player ordering

### Message Broadcasting
- Lobby messages broadcast to all clients (room lists) or room participants (room updates)
- Game messages are targeted to specific players or all players in the game session
- Private data (like hand cards) only sent to the owning player

### State Synchronization
- `game:state_update` provides complete game state for joining/reconnecting players
- Incremental updates sent via `game:action_result` and specific event messages
- Each player receives personalized game state view (their hand, opponent's hand size, etc.)
