# Age of Empires Gwent - Game Server

A TypeScript WebSocket server for handling multiplayer lobby and game functionality.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Or build and run production:
```bash
npm run build
npm start
```

## 📡 Server Features

### 🏰 Lobby Management
- Create and join rooms
- Player ready status tracking
- Real-time room updates
- Automatic game start when all players ready

### 🎮 Game Coordination
- Session management
- Player state synchronization
- Real-time communication

### 🔧 WebSocket API

#### Client → Server Messages

```typescript
// Join lobby
{ type: 'lobby:create_room', data: { roomName: string, playerName: string } }
{ type: 'lobby:join_room', data: { roomId: string, playerName: string } }
{ type: 'lobby:leave_room', data: { roomId: string, playerId: string } }
{ type: 'lobby:player_ready', data: { roomId: string, playerId: string, ready: boolean } }
{ type: 'lobby:get_rooms', data: {} }
```

#### Server → Client Messages

```typescript
// Lobby responses
{ type: 'lobby:rooms_list', data: { rooms: Room[] } }
{ type: 'lobby:room_created', data: { room: Room, playerId: string } }
{ type: 'lobby:room_joined', data: { room: Room, playerId: string } }
{ type: 'lobby:room_updated', data: { room: Room } }
{ type: 'lobby:game_starting', data: { gameSession: GameSessionData } }
{ type: 'lobby:error', data: { message: string, code?: string } }
```

## 🌐 Connection

**Development:** `ws://localhost:3001`
**Production:** Configure via `SERVER_URL` environment variable

## 📊 Monitoring

Server logs include:
- Connection events
- Room activities  
- Player actions
- Error tracking
- Performance stats (every 30s)

## 🛠 Development

### Scripts
- `npm run dev` - Development with hot reload
- `npm run build` - Build TypeScript
- `npm start` - Run production build
- `npm run clean` - Clean build directory

### File Structure
```
src/
├── index.ts              # Main entry point
├── GameServer.ts         # WebSocket server logic
├── managers/
│   └── RoomManager.ts    # Room and player management
└── types/
    └── index.ts          # Shared type definitions
```

## 🐛 Debugging

Enable verbose logging:
```bash
DEBUG=* npm run dev
```

## 🔒 Environment Variables

```bash
PORT=3001                 # Server port
SERVER_URL=ws://host:port # Public WebSocket URL
NODE_ENV=development      # Environment
```
