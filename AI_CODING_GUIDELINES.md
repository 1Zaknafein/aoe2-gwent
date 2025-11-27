# AI Coding Guidelines for AoE2 Gwent Project

## Project Overview
This is a Gwent-style card game themed around Age of Empires 2, built with PixiJS and TypeScript. The architecture follows a clean separation of concerns with a state machine pattern for game flow.

## Core Architecture Principles

### 1. Separation of Concerns
- **GameScene**: Container for UI components only. Should NOT contain game logic.
- **Managers**: Handle specific responsibilities (CardDealingManager, CardInteractionManager, etc.)
- **State Machine**: Only manages state transitions, NOT dependencies
- **States**: Game logic for specific phases (SetupState, RoundStartState, etc.)

### 2. Dependency Injection
- **Create all state instances in `main.ts`** with their dependencies
- Pass configured states to GameStateMachine via Map
- Never create dependencies inside the state machine
- Make dependencies explicit in constructors

**Good:**
```typescript
// In main.ts
const states = new Map([
  [StateName.ROUND_START, new RoundStartState(gameManager, cardDealingManager)],
]);
const stateMachine = new GameStateMachine(states);
```

**Bad:**
```typescript
// Inside GameStateMachine
public createState(name: StateName) {
  return new RoundStartState(this.gameManager); // Don't create states here!
}
```

### 3. State Machine Pattern
- States implement `GameState` abstract class
- `execute()` method returns `Promise<StateName>` for next state
- No `getName()` or `getNextState()` methods - use enum returns
- States are self-contained and reusable

## Code Style Guidelines

### TypeScript Best Practices

#### 1. Avoid `require()` - Use ES6 Imports
**Bad:**
```typescript
const { CardDatabase } = require("../../local-server/CardDatabase");
```

**Good:**
```typescript
import { CardDatabase } from "../../local-server/CardDatabase";
```

#### 2. Type Safety
- Use proper type annotations
- Prefer type predicates for filters:
```typescript
.filter((card): card is NonNullable<typeof card> => card !== null)
```

#### 3. Async/Await
- Use `async/await` over promises where readable
- Handle errors appropriately
- Document when promises intentionally never resolve:
```typescript
await new Promise(() => {}); // Never resolves - intentional pause
```

### Component Design

#### 1. Manager Classes
- Single responsibility
- Accept dependencies via constructor
- Provide clear public API
- Keep implementation details private

**Example:**
```typescript
export class CardDealingManager {
  constructor(
    private playerHand: HandContainer,
    private opponentHand: HandContainer
  ) {}
  
  public dealCards(playerIds: number[], opponentIds: number[]): void {
    // Implementation
  }
}
```

#### 2. Scene Classes
- Should only contain UI layout and component positioning
- Delegate logic to managers
- Provide getter methods for components:
```typescript
public getPlayerHand(): HandContainer {
  return this.playerHand;
}
```

#### 3. State Classes
- Accept all dependencies in constructor
- Implement `execute(): Promise<StateName>`
- No side effects in constructor
- Clear documentation of transitions

## Project-Specific Patterns

### 1. Card Data Flow
```
CardDatabase (source of truth)
  ↓
LocalGameSession (stores card IDs in playerHands Map)
  ↓
CardDealingManager (converts IDs to CardData, updates UI)
  ↓
HandContainer (displays cards)
```

### 2. State Machine Flow
```
main.ts
  ↓ creates states with dependencies
GameStateMachine
  ↓ manages transitions
States (SetupState → RoundStartState → PlayerActionState...)
  ↓ execute game logic
Update game session & UI
```

### 3. Event System
- Use EventEmitter for loose coupling
- Emit events for state changes
- Components subscribe to relevant events
```typescript
this.playerHand.on("cardAdded", updateHandCounts);
```

## What to Avoid

### Don't Do This

1. **Don't mix UI and logic in GameScene**
```typescript
// Bad - logic in GameScene
public dealCards(ids: number[]) {
  const cards = ids.map(id => CardDatabase.getById(id));
  this.playerHand.addCardsBatch(cards);
}
```

2. **Don't create dependencies inside managers**
```typescript
// Bad - creating dependencies internally
class GameStateMachine {
  createState(name: StateName) {
    const manager = new CardDealingManager(...); // Don't do this!
  }
}
```

3. **Don't use string-based state names**
```typescript
// Bad
if (stateName === "RoundStartState") { }

// Good
if (stateName === StateName.ROUND_START) { }
```

4. **Don't use `require()` in TypeScript**
```typescript
// Bad
const { CardDatabase } = require("./CardDatabase");

// Good
import { CardDatabase } from "./CardDatabase";
```

5. **Don't store business logic in UI components**
```typescript
// Bad - game logic in HandContainer
class HandContainer {
  public calculateScore() { } // Should be in a manager/service
}

// Good - UI only
class HandContainer {
  public addCard(card: CardData) { } // UI operation only
}
```

## Naming Conventions

- **Classes**: PascalCase (`GameManager`, `CardDealingManager`)
- **Interfaces**: PascalCase with 'I' prefix optional (`PlayerContainers`)
- **Enums**: PascalCase (`StateName`, `CardType`)
- **Enum Values**: UPPER_SNAKE_CASE (`ROUND_START`, `PLAYER_ACTION`)
- **Methods**: camelCase (`dealCards`, `getPlayerHand`)
- **Private members**: camelCase with underscore prefix (`_playerHand`)
- **Constants**: UPPER_SNAKE_CASE (`BOARD_WIDTH`, `MAX_CARDS`)

## File Organization

```
src/
├── main.ts                    # Application entry, dependency setup
├── entities/                  # Core game entities (Card, Deck, etc.)
├── ui/
│   ├── scenes/               # UI layout only (GameScene, LoaderScene)
│   ├── managers/             # UI logic (CardDealingManager, CardInteractionManager)
│   └── components/           # Reusable UI elements
├── shared/
│   ├── game/                 # Game state machine, managers
│   │   └── states/           # Game state implementations
│   └── types/                # Type definitions
└── local-server/             # Local game session logic
```

## Testing Considerations

- States should be testable in isolation
- Mock dependencies in constructor
- Verify state transitions
- Test error handling

## Comments and Documentation

- Use JSDoc for public APIs
- Do not document state transitions in state classes.
- Explain non-obvious logic.
- Never use emotes in comments.
- Do not add comments that explain obvious things like //do X while funciton is named doX(). 

**Good example:**
```typescript
/**
 * RoundStartState - Prepares for a new round
 */
```

## Performance Considerations

- Avoid creating objects in tight loops
- Use object pooling for frequently created/destroyed objects (future optimization)
- Minimize DOM/PixiJS scene graph manipulations

## When in Doubt

1. **Ask where the responsibility belongs** - UI component, manager, or state?
2. **Follow the dependency flow** - Create in main.ts, inject via constructor
3. **Keep it simple** - Don't over-engineer, but maintain separation of concerns
4. **Be explicit** - Clear dependencies, clear transitions, clear responsibilities
