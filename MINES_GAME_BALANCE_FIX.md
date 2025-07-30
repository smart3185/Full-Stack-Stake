# Mines Game Balance Fix Documentation

## Problem Identified
The mines game had a **double balance deduction issue** where:
1. Balance was deducted when starting the game (`/api/mines/start`)
2. Balance was potentially deducted again during loss scenarios

## Root Cause Analysis
1. **Primary Issue**: The main mines game logic was actually correct, but there were duplicate stateless endpoints that could cause confusion
2. **Secondary Issue**: Inconsistent credit calculation in the cashout logic
3. **Logging Issue**: Poor logging made it difficult to track balance changes

## Fixes Applied

### 1. Removed Duplicate Stateless Endpoints
**Removed these conflicting endpoints:**
- `POST /api/mines/bet` (duplicate of `/api/mines/start`)
- `POST /api/mines/cashout` (conflicting with main cashout logic)
- `POST /api/mines/loss` (unnecessary duplicate)

These endpoints were causing confusion and potential double deductions.

### 2. Fixed Cashout Credit Calculation
**Before:**
```javascript
credit: result.payout, // This was crediting the full payout
```

**After:**
```javascript
credit: result.payout - game.bet, // Net gain (payout - original bet)
```

This ensures the account statement shows the correct net gain/loss.

### 3. Enhanced Logging
**Added comprehensive logging:**
```javascript
console.log(`[MINES START] userId=${user._id} balance_before=${balanceBefore} balance_after=${user.balance} bet=${bet} gameId=${game._id}`);
console.log(`[MINES CASHOUT] WIN userId=${user._id} gameId=${game._id} bet=${game.bet} payout=${result.payout} netGain=${result.payout - game.bet}`);
```

### 4. Improved Error Handling
- Added proper error logging in all mines game endpoints
- Better error messages for debugging
- Enhanced input validation with specific error messages

### 5. Added Balance Validation System
**New validation function:**
```javascript
async function validateMinesGameBalance(userId, gameId, expectedBalance) {
  // Validates balance consistency across user, game, and account statement
  // Logs any discrepancies for debugging
}
```

### 6. Enhanced Input Validation
**Improved validation in start endpoint:**
- Type checking for all parameters
- Specific error messages for each validation failure
- Better balance and game state validation

## Current Mines Game Flow (Fixed)

### 1. Start Game (`/api/mines/start`)
- ✅ Deduct bet amount from balance **ONCE**
- ✅ Create game record in database
- ✅ Create account statement with `result: 'active'` and `credit: -bet`
- ✅ Validate balance consistency
- ✅ Return game data and updated balance

### 2. Reveal Tile (`/api/mines/reveal`)
- ✅ If safe tile: Continue game, no balance change
- ✅ If mine hit: Update account statement to `result: 'loss'`, **NO additional balance deduction**
- ✅ Validate balance consistency after loss

### 3. Cashout (`/api/mines/cashout`)
- ✅ Validate at least one tile is revealed
- ✅ Credit payout to balance
- ✅ Update account statement with `result: 'win'`, `payout: amount`, `credit: net_gain`
- ✅ Validate balance consistency after win

## Balance Flow Example

**Starting Balance: 1000**

### Scenario 1: Player Loses
1. Start game with 100 bet: `1000 - 100 = 900`
2. Hit mine: Balance remains `900` (no additional deduction)
3. Final balance: `900`

### Scenario 2: Player Wins
1. Start game with 100 bet: `1000 - 100 = 900`
2. Cashout at 2x multiplier: `900 + 200 = 1100`
3. Final balance: `1100` (net gain: +100)

## Account Statement Tracking

### Bet Placement
```javascript
{
  transaction: 'Mines Game Bet',
  result: 'active',
  credit: -100,  // Bet amount deducted
  closeBalance: 900
}
```

### Win Scenario
```javascript
{
  transaction: 'Mines Game Bet',
  result: 'win',
  payout: 200,   // Total payout
  credit: 100,   // Net gain (200 - 100)
  closeBalance: 1100
}
```

### Loss Scenario
```javascript
{
  transaction: 'Mines Game Bet',
  result: 'loss',
  payout: 0,
  credit: -100,  // Original bet (already deducted)
  closeBalance: 900
}
```

## New API Endpoints

### User Statistics
- `GET /api/mines/stats` - Get personal game statistics
  - Total games, wins, losses, win rate
  - Total bet, total payout, net profit
  - Average bet and payout amounts

### Enhanced Error Handling
All endpoints now include:
- Comprehensive input validation
- Specific error messages
- Proper HTTP status codes
- Detailed logging for debugging

## Balance Validation System

The new validation system checks:
1. **Balance Consistency**: User balance matches expected value
2. **Account Statement Accuracy**: Credit amounts reflect actual balance changes
3. **Game State Validation**: Game results match account statement records
4. **Automatic Logging**: Any discrepancies are logged for investigation

## Testing Recommendations

1. **Test Balance Consistency**: Verify balance is only deducted once per game
2. **Test Account Statements**: Ensure credit amounts reflect actual balance changes
3. **Test Edge Cases**: Multiple games, rapid play, network interruptions
4. **Monitor Logs**: Use the enhanced logging to track any issues
5. **Validate Statistics**: Check that game statistics are accurate

## Files Modified
- `backend/server.js` - Main fixes applied
- `MINES_GAME_BALANCE_FIX.md` - This documentation

## Key Improvements Made

### 1. Enhanced Input Validation
```javascript
// Before
if (!bet || !minesCount || !clientSeed) return res.status(400).json({ success: false, message: 'Missing parameters' });

// After
if (!bet || !minesCount || !clientSeed) {
  return res.status(400).json({ success: false, message: 'Missing parameters: bet, minesCount, and clientSeed are required' });
}

if (typeof bet !== 'number' || bet <= 0) {
  return res.status(400).json({ success: false, message: 'Bet amount must be a positive number' });
}
```

### 2. Better Error Messages
```javascript
// Before
return res.status(400).json({ success: false, message: 'Game error' });

// After
return res.status(400).json({ success: false, message: 'Game not found or not active' });
```

### 3. Balance Validation
```javascript
// Added after each major operation
await validateMinesGameBalance(user._id, game._id, user.balance);
```

### 4. Cashout Validation
```javascript
// Validate that user has revealed at least one tile
if (game.revealedTiles.length === 0) {
  return res.status(400).json({ success: false, message: 'Must reveal at least one tile before cashing out' });
}
```

The mines game now works consistently with other games (Dice, Slots, Aviator) where balance is deducted once at the start and only credited on wins. The enhanced validation and logging systems ensure that any balance inconsistencies are immediately detected and logged for investigation.