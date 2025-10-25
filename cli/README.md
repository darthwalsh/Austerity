# CLI Firebase Client

This CLI client has been converted from WebSocket to Firebase Realtime Database for desktop Node.js usage.

## Setup

1. **Install Firebase dependencies** (already done):
   ```bash
   npm install firebase
   ```

2. **Configure Firebase**:
   - Edit `cli/lib.js` and update the `firebaseConfig` object
   - Replace the placeholder values with your actual Firebase project configuration
   - You can get these values from your Firebase Console

3. **Enable Realtime Database**:
   - Go to Firebase Console → Realtime Database
   - Create a database if you don't have one
   - Set up security rules as needed

## Usage

```bash
# Connect to a Firebase project (uses config from lib.js)
node cli/cli.js YOUR_PROJECT_ID PLAYER_NAME

# For local testing (runs server on port 8080)
node cli/cli.js host PLAYER_NAME
```

## Configuration

The Firebase configuration is hardcoded in `cli/lib.js`. To use a different Firebase project, edit the `firebaseConfig` object in that file.

## Firebase Database Structure

The client expects the following database structure:

```
/games/default/
  /players/          # List of connected players
  /choices/          # Player choices for game decisions
  /gameStart/        # Game start configuration
  /updates/          # General game updates

/players/
  /{playerId}/       # Individual player data
    - name
    - connected
    - timestamp
```

## Security Rules

Make sure your Firebase Realtime Database rules allow read/write access for authenticated users or set up appropriate rules for your use case.

## Migration from WebSocket

- The `send()` method maintains backward compatibility
- Connection handling is now managed by Firebase
- Real-time updates use Firebase listeners instead of WebSocket events
- Player management is handled through Firebase database entries
