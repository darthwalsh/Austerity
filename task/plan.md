# Firebase Event Sourcing Implementation Plan

## Overview
Replace the current WebSocket-based client-server architecture with Firebase Realtime Database as a simple message bus. The game engine will run entirely locally on all browsers, with Firebase only handling real-time communication between players.

## Architecture
- **Local Game Engine**: Each browser runs the game engine locally with complex continuation-passing style execution
- **Non-Serializable State**: Game state includes call stacks, nested turns, and callback chains that cannot be serialized
- **Single Player Turn**: Only one player can be prompted for a move at a time
- **Firebase as Message Bus**: Firebase handles real-time message delivery and stores all game events
- **Event Sourcing**: All events stored for client reconnection and game state reconstruction
- **Crash Recovery**: Clients must replay events to rebuild execution context and call stack

## Firebase Setup

### 1. Use Existing Firebase Account
1. Use existing Firebase project
2. All data will be prefixed with `/austerity/` for organization
3. Enable Realtime Database if not already enabled
4. Set database rules to allow read/write for now (we'll secure later)

### 2. Database Rules (Initial - Austerity Prefix Only)
```json
{
  "rules": {
    "austerity": {
      ".read": true,
      ".write": true
    },
    "$other": {
      ".read": false,
      ".write": false
    }
  }
}
```

### 3. Add Firebase to Client
1. Add Firebase SDK to `client/index.html`:
```html
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-database.js"></script>
```

2. Initialize Firebase in `client/index.js`:
```javascript
const firebaseConfig = {
  // Your config from Firebase console
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
```

## Database Structure

### Core Schema
```yaml
/austerity/
  /lobby/
    GameABCD: true
    GameOther: true
  /games/{gameId}/
    /init: { included: ["Village", "Moat"], start: 2, debugMode: false }
    /players/{playerId}/
      /events/
        "0": [2, 5, 3, 1, 4, ...] # shuffle order
        "1": "Moat"
        "2": "Copper"
```

### Event Types
- **ChoiceMade**: Player's response to game prompts (replaces WebSocket choice messages)
- **Shuffle**: Random card order determined by one client and shared with all others (ensures consistent RNG across browsers)

### Key Points
- Events are **persisted** in Firebase for client reconnection
- Each client maintains its own copy of the game state in memory
- Game state includes complex call stacks and continuation-passing style execution context
- Firebase serves as both event delivery and event storage
- Events must be replayed to reconstruct the full execution context and call stack
- Cannot simply "save and restore" game state - must replay the entire event sequence

## Implementation Steps

### 1. Replace WebSocket with Firebase
- Remove WebSocket connection code from `client/index.js`
- Replace `ws.send()` calls with Firebase database writes
- Replace WebSocket message listeners with Firebase event listeners

### 2. Event Writing Functions
```javascript
async function initializeGame(gameId, initData) {
  const initRef = db.ref(`austerity/games/${gameId}/init`);
  try {
    await initRef.set(initData);
  } catch (error) {
    console.error('Error initializing game:', error);
    throw new Error(`FATAL: Failed to initialize game ${gameId}: ${error.message}`);
  }
}

async function makeChoice(gameId, playerId, choice) {
  const eventRef = db.ref(`austerity/games/${gameId}/players/${playerId}/events`);
  const newEventRef = eventRef.push();
  
  try {
    await newEventRef.set(choice);
  } catch (error) {
    console.error('Error writing choice:', error); // TODO from the message can you tell if the error was because the event already exists?
    throw new Error(`FATAL: Failed to write choice for player ${playerId} in game ${gameId}: ${error.message}`);
  }
}
```

### 3. Event Listening
```javascript
function listenToGameEvents(gameId, callback) {
  const gameRef = db.ref(`austerity/games/${gameId}`);
  gameRef.on('value', (snapshot) => {
    const gameData = snapshot.val();
    if (gameData) {
      callback(gameData);
    }
  });
}
```

### 4. Event Handling & State Reconstruction
```javascript
function handleGameEvent(choice, localGameState) {
  return handleChoiceMade({ choice }, localGameState);
}

// TODO probably not needed if the sync system handles existing events
async function reconstructGameContext(gameId, playerId) {
  // First get the game initialization data
  const initRef = db.ref(`austerity/games/${gameId}/init`);
  const initSnapshot = await initRef.once('value');
  const initData = initSnapshot.val();
  
  if (!initData) {
    throw new Error(`Game ${gameId} not found`);
  }
  
  const eventsRef = db.ref(`austerity/games/${gameId}/players/${playerId}/events`);
  const eventsSnapshot = await eventsRef.once('value');
  const events = eventsSnapshot.val() || {};
  
  // Must replay ALL events to rebuild the complete execution context
  // This includes call stacks, nested turns, and continuation chains
  let gameState = initializeGameState(initData);
  Object.values(events).forEach(choice => {
    gameState = handleGameEvent(choice, gameState);
    // The game engine may spawn new turns, callbacks, or nested operations
    // Each event can trigger complex state transitions that build up the call stack
  });
  
  return gameState;
}
```

### 5. Update Client UI & Handle Reconnection
- Replace `addManage()` function to write events to Firebase instead of WebSocket
- Update choice handling to write events instead of WebSocket messages
- Add Firebase event listeners to trigger UI updates
- Keep all game state in local memory variables
- Implement reconnection logic: when client connects, check if they're rejoining a game and reconstruct execution context
- **Critical**: Must replay ALL events in sequence to rebuild the complete call stack and continuation chains

## Data Flow

### 1. Game Creation
1. Lead Player creates a game
  a. Writes game name to `/austerity/lobby/{gameId}`
  b. Write player to `/austerity/games/{gameId}/players/{playerId}`
2. Other players join, adding to `/austerity/games/{gameId}/players/{playerId}`
3. Lead Player selects cards and clicks "Start"
  a. Writes game initialization data to `/austerity/games/{gameId}/init`
4. All clients receive the init data and initialize their local game engine in memory

### 2. Player Turns
1. Local engine determines it's Player X's turn
  a. If Player X needs to Shuffle, they generate a random order and write `Shuffle` event to Firebase
  b. All clients receive event and use the same random order
2. Engine prompts Player X for choice
3. Player makes choice, client writes `ChoiceMade` event to Firebase
4. All clients receive event, update their local game state in memory
5. Engine progresses to next turn

### 3. Game Completion
1. Local engine detects game end
2. Client prints final game state

## Testing Strategy

### Manual Testing
1. **Basic Game Flow**
   - Create new game with 2+ players
   - Verify each player can make choices
   - Verify game progresses correctly
   - Verify game ends properly

2. **Multi-Device Testing**
   - Open game on multiple browsers/devices
   - Verify all devices stay in sync
   - Test with different network conditions

3. **Edge Cases**
   - Player disconnects/reconnects (critical for crash recovery)
   - Browser refresh during game
   - Multiple players trying to act simultaneously
   - Client crash and rejoin with execution context reconstruction
   - **Critical**: Verify that replaying events rebuilds the exact same call stack and continuation state

### Automated E2E Tests
1. **Jasmine Test Suite** (existing `spec/` folder)
   - Add Firebase integration tests
   - Test event writing/reading
   - Test local game state updates

2. **Test Scenarios**
```javascript
describe('Firebase Event Sourcing', () => {
  it('should create game and send messages', async () => {
    // Test game creation flow
  });
  
  it('should handle player choices', async () => {
    // Test choice messages
  });
  
  it('should update local game state from messages', async () => {
    // Test local state updates
  });
  
  it('should handle multiple players', async () => {
    // Test multi-player synchronization
  });
  
  it('should reconstruct game execution context on reconnection', async () => {
    // Test crash recovery and execution context reconstruction
    // Must verify that replaying events rebuilds the exact same call stack
  });
});
```

3. **Test Database**
   - Use Firebase Emulator for testing
   - Clean database between tests
   - Verify event delivery and local state consistency

## Security Considerations (Future)
- Implement Firebase Auth for user identification
- Add database rules to restrict access to own games
- Validate event data on write
- Prevent event spoofing between players

## Migration Strategy
1. Implement Firebase alongside existing WebSocket
2. Test thoroughly with Firebase
3. Remove WebSocket code once Firebase is stable
4. Update server to remove WebSocket handling

## Success Criteria
- [x] Firebase project created and configured
- [x] Client can create games and write events
- [x] Multiple clients can join same game
- [x] Package.json cleaned up - removed server dependencies
- [x] ESLint modernized to ES modules and ES2022
- [x] Dependencies updated to modern versions
- [x] README updated to reflect client-side architecture
- [ ] Game state stays synchronized across clients via local memory
- [ ] Game can be completed end-to-end
- [ ] All existing functionality preserved
- [ ] Automated tests pass
- [ ] Manual testing on multiple devices successful

## ES Module Conversion Plan

### Overview
Convert the existing CommonJS (`require`/`module.exports`) codebase to ES modules (`import`/`export`)

### Implementation Steps

#### 1. Enable ES Modules
- Add `"type": "module"` to `package.json`
- This tells Node.js to treat `.js` files as ES modules by default
- Keep unit tests working, so probably need to keep package.json

#### 2. Convert Import Statements
Replace `const x = require("./y")` with `import x from "./y.js"`:
```javascript
// Before (CommonJS)
const cards = require("./cards");
const Player = require("./player");

// After (ES Modules)
import { cards } from "./cards.js";
import Player from "./player.js";
```

#### 3. Convert Export Statements
Replace `module.exports = X` with `export default X` or named exports:
```javascript
// Before (CommonJS)
module.exports = Player;

// After (ES Modules)
export default Player;
```

### Migration Strategy
1. Create a new branch for ES module conversion
2. Convert one file at a time, testing after each conversion
3. Update all import/export statements consistently
4. Test the entire server functionality
5. Update test files to use ES module syntax
6. Merge when all tests pass

### Success Criteria
- [ ] All server files converted to ES modules
- [ ] All tests pass with ES module syntax
- [ ] Server starts and runs correctly
- [ ] All game functionality works as expected
- [ ] No CommonJS syntax remaining in server code

## P2: Chat
search for `TODO(chat)`

## P2: Firebase Testing Options

### Option 1: Firebase Emulator Suite
- **Pros**: Full API compatibility, official Google support, runs actual security rules
- **Cons**: Requires setup, runs as separate process
- **Best for**: Integration testing, development

### Option 2: firebase-mock npm package  
- **Pros**: Lightweight, runs in same process
- **Cons**: API compatibility issues, doesn't support all Firebase features
- **Best for**: Unit testing simple operations

### Option 3: Custom Mock Implementation
- **Pros**: Full control, lightweight, no external dependencies
- **Cons**: Must maintain mock API, may miss edge cases
- **Best for**: Simple testing scenarios, learning Firebase API

## P2: Consider different sync backends

| Feature | Firebase | Supabase | RxJS + WebRTC + Lambda |
|---------|----------|----------|------------------------|
| **Hobbyist Pricing** | Free tier: 1GB storage, 10GB/month transfer, 50K reads/day, 20K writes/day | Free tier: 500MB database, 2GB bandwidth, 50MB file storage | ~$0-5/month (Lambda free tier + minimal discovery costs) |
| **Latency** | 100-500ms for Firestore operations, depends on region and connection quality | 100-300ms for database operations, depends on region and connection quality | Sub-20ms peer-to-peer, depends on player network proximity |
| **Real-time** | Built-in Firestore listeners, real-time database | Built-in real-time subscriptions | WebRTC peer-to-peer + RxJS reactive streams |
| **Database** | NoSQL (Firestore), real-time sync | PostgreSQL database | Local game state, no central database needed |
| **Authentication** | Built-in Firebase Auth | Built-in authentication | Custom implementation (could use Lambda + JWT) |
| **File Storage** | Firebase Storage | Built-in file storage | Not needed for game state |
| **Pros** | Google ecosystem integration, real-time sync, built-in auth & storage, generous free tier | Built-in real-time subscriptions, PostgreSQL, authentication, file storage | Lowest latency, minimal ongoing costs, no central server, RxJS reactive programming, scales automatically |
| **Cons** | Vendor lock-in, NoSQL limitations, potential scaling costs, higher latency | Vendor lock-in, limited free tier, potential scaling costs | NAT traversal complexity, discovery coordination needed, no persistent game state |

**Recommendation**: For real-time gaming with sub-100ms latency requirements, **RxJS + WebRTC + Lambda** offers the best performance and lowest costs. WebRTC provides ultra-low latency peer-to-peer syncing, RxJS handles reactive state management, and Lambda handles discovery coordination. Firebase offers the most features out-of-the-box but has higher latency. Supabase provides a good middle ground with PostgreSQL and lower latency than Firebase.

## P3: consider fixing the cli app
Nodejs desktop firebase cli app

## P3: Consider dropping jasmine and using built-in node testing
Didn't change anything yet: 
**Decision**: Keep Jasmine testing framework instead of migrating to Node.js built-in testing
**Rationale**: 
- Jasmine is already set up and working
- Built-in testing is less mature and has fewer features
- ES module conversion is higher priority for Firebase integration
- Can migrate testing framework later after Firebase is working## v4: Development Environment Updates
