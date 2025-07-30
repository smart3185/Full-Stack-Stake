# Mines Game Auto Mode - Testing Guide

## Overview
The Auto Mode feature allows users to automatically play Mines games with predefined settings and stop conditions.

## Features Implemented

### ✅ Backend Features
- **MinesAutoMode Model**: Complete database schema for storing auto mode settings and state
- **API Endpoints**:
  - `GET /api/mines/auto/settings` - Get current auto mode settings
  - `POST /api/mines/auto/settings` - Update auto mode settings
  - `POST /api/mines/auto/start` - Start auto mode
  - `POST /api/mines/auto/stop` - Stop auto mode
  - `GET /api/mines/auto/status` - Get current auto mode status
  - `POST /api/mines/auto/continue` - Continue to next game

### ✅ Frontend Features
- **MinesAutoModeModal**: Settings configuration modal
- **MinesAutoModeStatus**: Live status display with controls
- **Integration**: Seamless integration with main Mines game
- **UI Controls**: Toggle between Manual and Auto modes

### ✅ Auto Mode Configuration
- **Bet Amount**: Fixed bet per game
- **Mines Count**: Number of mines per game
- **Tiles to Reveal**: Number of tiles to reveal before cashing out
- **Stop Conditions**:
  - Stop after N bets
  - Stop on profit target
  - Stop on loss limit

### ✅ Auto Execution Logic
- **Random Tile Selection**: Tiles are selected randomly for each game
- **Automatic Game Flow**: Start → Reveal tiles → Cashout/Loss → Continue/Stop
- **Balance Management**: Proper balance tracking and validation
- **Account Statements**: Complete transaction tracking

### ✅ Safety Features
- **Balance Validation**: Prevents auto mode when insufficient balance
- **Stop Conditions**: Respects all configured stop conditions
- **Error Handling**: Graceful error handling and recovery
- **Manual Override**: Users can stop auto mode at any time

## Testing Scenarios

### 1. Basic Auto Mode Setup
```
1. Open Mines Game
2. Click "Auto" badge or Settings button
3. Configure settings:
   - Bet Amount: ₹100
   - Mines Count: 3
   - Tiles to Reveal: 3
4. Save settings
5. Start auto mode
6. Verify first game executes automatically
```

### 2. Stop Conditions Testing
```
1. Set stop conditions:
   - Stop after 5 bets
   - Stop on profit: ₹200
   - Stop on loss: ₹100
2. Start auto mode
3. Verify auto mode stops when conditions are met
```

### 3. Balance Management
```
1. Set bet amount higher than balance
2. Try to start auto mode
3. Verify error message about insufficient balance
```

### 4. Manual Override
```
1. Start auto mode
2. Click "Stop Now" button
3. Verify auto mode stops immediately
```

### 5. Status Updates
```
1. Start auto mode
2. Monitor status panel for:
   - Bets placed count
   - Total profit/loss
   - Current balance
   - Recent games history
```

## API Testing

### Get Settings
```bash
curl -X GET "http://localhost:3000/api/mines/auto/settings" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Settings
```bash
curl -X POST "http://localhost:3000/api/mines/auto/settings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "betAmount": 100,
    "minesCount": 3,
    "tilesToReveal": 3,
    "stopAfterBets": 10,
    "stopOnProfit": 500,
    "stopOnLoss": 200
  }'
```

### Start Auto Mode
```bash
curl -X POST "http://localhost:3000/api/mines/auto/start" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Status
```bash
curl -X GET "http://localhost:3000/api/mines/auto/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Continue Next Game
```bash
curl -X POST "http://localhost:3000/api/mines/auto/continue" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Stop Auto Mode
```bash
curl -X POST "http://localhost:3000/api/mines/auto/stop" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Expected Behavior

### ✅ Success Cases
- Auto mode starts and executes games automatically
- Settings are saved and loaded correctly
- Stop conditions are respected
- Balance is updated correctly
- Account statements are created properly
- Status updates in real-time

### ✅ Error Cases
- Insufficient balance prevents auto mode start
- Invalid settings show validation errors
- Network errors are handled gracefully
- Auto mode stops on server errors

### ✅ UI Behavior
- Manual controls are disabled when auto mode is active
- Status panel shows current auto mode state
- Settings modal allows configuration
- Visual indicators show active/inactive states

## Performance Considerations
- Auto mode polls status every 2 seconds when active
- Database queries are optimized with proper indexes
- Game execution is efficient with minimal delays
- Memory usage is controlled with proper cleanup

## Security Features
- All endpoints require authentication
- User can only access their own auto mode settings
- Input validation prevents malicious data
- Balance validation prevents exploitation

## Future Enhancements
- Auto mode scheduling (start/stop at specific times)
- Advanced tile selection strategies
- Performance analytics and statistics
- Auto mode templates/presets
- Integration with other games 