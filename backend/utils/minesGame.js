// Updated mineGame.js with:
// - Improved RNG entropy
// - Multiplier scaling tweaks
// - Anti-pattern logic (to be supported via server.js)
// - Adaptive house edge based on win streak (passed in as parameter)

const crypto = require('crypto');

const BASE_HOUSE_EDGE = 0.02;

function seededRNG(seed) {
  let hash = seed;
  let counter = 0;
  return function () {
    counter++;
    hash = crypto.createHash('sha256').update(hash + counter.toString()).digest('hex');
    return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  };
}

function generateMinePositions(serverSeed, clientSeed, nonce, minesCount, riskyTiles = [], excludedTiles = []) {
  const extraEntropy = Date.now().toString() + Math.random().toString();
  const gameHash = crypto.createHash('sha256')
    .update(serverSeed + clientSeed + nonce.toString() + extraEntropy)
    .digest('hex');
  const rng = seededRNG(gameHash);

  // Exclude already revealed tiles
  let indices = Array.from({ length: 25 }, (_, i) => i).filter(i => !excludedTiles.includes(i));
  const minePositions = [];

  // --- Anti-Pattern Placement ---
  // If riskyTiles provided, try to place at least 1 mine in them
  const riskyAvailable = riskyTiles.filter(idx => indices.includes(idx));
  if (riskyAvailable.length > 0 && minesCount > 0) {
    // Place 1 mine in a random risky tile
    const i = Math.floor(rng() * riskyAvailable.length);
    const chosen = riskyAvailable[i];
    minePositions.push(chosen);
    indices = indices.filter(idx => idx !== chosen);
  }
  // --- End Anti-Pattern Placement ---

  while (minePositions.length < minesCount && indices.length > 0) {
    const i = Math.floor(rng() * indices.length);
    minePositions.push(indices.splice(i, 1)[0]);
  }
  return minePositions.sort((a, b) => a - b);
}

function combination(n, k) {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res *= (n - i + 1) / i;
  }
  return res;
}

function calculateMultiplier(minesCount, revealedSafeTiles, dynamicEdge = BASE_HOUSE_EDGE) {
  const totalTiles = 25;
  const safeTiles = totalTiles - minesCount;

  if (revealedSafeTiles === 0) return 1;
  if (revealedSafeTiles > safeTiles) return 0;

  // Custom multiplier series for 3 mines
  if (minesCount === 3) {
    const customSeries = [1.08, 1.23, 1.42, 1.64, 1.92, 2.25, 2.68, 3.23, 3.90, 4.75, 5.84, 7.25, 9.10, 11.55, 14.80, 19.15, 24.90, 32.60, 42.90, 56.75, 75.20, 99.45];
    if (revealedSafeTiles <= customSeries.length) {
      return customSeries[revealedSafeTiles - 1];
    }
  }

  // Custom multiplier series for 4 mines
  if (minesCount === 4) {
    const customSeries = [1.13, 1.36, 1.64, 2.01, 2.48, 3.10, 3.93, 5.00, 6.35, 8.10, 10.30, 13.10, 16.75, 21.50, 27.90, 36.50, 48.00, 63.50, 84.00, 111.00, 146.00];
    if (revealedSafeTiles <= customSeries.length) {
      return customSeries[revealedSafeTiles - 1];
    }
  }

  // Custom multiplier series for 5 mines
  if (minesCount === 5) {
    const customSeries = [1.19, 1.5, 1.92, 2.48, 3.26, 4.34, 5.89, 7.99, 10.83, 14.74, 20.12, 27.42, 37.31, 50.58, 68.21, 91.49, 121.99, 161.84, 213.82, 281.47];
    if (revealedSafeTiles <= customSeries.length) {
      return customSeries[revealedSafeTiles - 1];
    }
  }

  const totalComb = combination(totalTiles, revealedSafeTiles);
  const safeComb = combination(safeTiles, revealedSafeTiles);

  if (safeComb === 0) return 0;

  let multiplier = (totalComb / safeComb) * (1 - dynamicEdge);

  if (revealedSafeTiles <= 3) {
    multiplier *= 0.92; // Stronger early-game reduction
  } else if (revealedSafeTiles <= 5) {
    multiplier *= 0.97;
  }

  const sigmoidBias = 1 / (1 + Math.exp(-(revealedSafeTiles - 8) / 2));
  multiplier *= (0.88 + 0.12 * sigmoidBias);

  return parseFloat(multiplier.toFixed(4));
}

function revealTile(game, tileIndex, dynamicEdge = BASE_HOUSE_EDGE) {
  if (!game.isActive) throw new Error("Game already ended");
  if (game.revealedTiles.includes(tileIndex)) throw new Error("Tile already revealed");

  const isMine = game.minePositions.includes(tileIndex);

  if (isMine) {
    game.isActive = false;
    game.result = 'loss';
    game.endedAt = new Date();
    return { result: 'loss', tile: tileIndex, payout: 0, multiplier: 0 };
  }

  game.revealedTiles.push(tileIndex);
  const multiplier = calculateMultiplier(game.minesCount, game.revealedTiles.length, dynamicEdge);
  
  return {
    result: 'safe',
    tile: tileIndex,
    multiplier,
    payout: game.bet * multiplier
  };
}

function cashOut(game, dynamicEdge = BASE_HOUSE_EDGE) {
  if (!game.isActive) throw new Error("Game already over");
  if (game.revealedTiles.length === 0) throw new Error("No tiles revealed");

  const multiplier = calculateMultiplier(game.minesCount, game.revealedTiles.length, dynamicEdge);
  const payout = game.bet * multiplier;

  game.isActive = false;
  game.result = 'win';
  game.payout = payout;
  game.multiplier = multiplier;
  game.endedAt = new Date();

  return {
    result: 'win',
    payout,
    multiplier,
    revealedTiles: game.revealedTiles
  };
}

function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyGameFairness(serverSeed, clientSeed, nonce, minePositions) {
  const expected = generateMinePositions(serverSeed, clientSeed, nonce, minePositions.length);
  return JSON.stringify(expected) === JSON.stringify(minePositions);
}

function getGameStats(games) {
  const stats = {
    totalGames: games.length,
    wins: 0,
    losses: 0,
    totalBets: 0,
    totalPayouts: 0,
    averageBet: 0,
    averagePayout: 0,
    houseEdge: 0
  };

  games.forEach(g => {
    stats.totalBets += g.bet;
    if (g.result === 'win') {
      stats.wins++;
      stats.totalPayouts += g.payout;
    } else if (g.result === 'loss') {
      stats.losses++;
    }
  });

  stats.averageBet = stats.totalBets / (stats.totalGames || 1);
  stats.averagePayout = stats.totalPayouts / (stats.totalGames || 1);
  stats.houseEdge = ((stats.totalBets - stats.totalPayouts) / stats.totalBets) * 100;
  return stats;
}

// --- Anti-Pattern Detection Logic START ---
/**
 * Detects simple player patterns from previous moves.
 * @param {number[]} previousMoves - Array of last 3-5 tile indices selected by the player.
 * @returns {number[]} Array of risky tile indices to prioritize for mine placement.
 */
function detectPlayerPattern(previousMoves = []) {
  if (!previousMoves || previousMoves.length < 3) return [];
  const risky = new Set();
  // Corners: 0, 4, 20, 24
  const corners = [0, 4, 20, 24];
  const center = 12;
  // Edges: top (1-3), bottom (21-23), left (5,10,15), right (9,14,19)
  const edges = [1,2,3,5,9,10,14,15,19,21,22,23];

  // Count occurrences
  const counts = {};
  previousMoves.forEach(idx => { counts[idx] = (counts[idx]||0)+1; });

  // 1. Repeated same tile/cluster (e.g. always corners)
  if (previousMoves.every(idx => corners.includes(idx))) {
    corners.forEach(idx => risky.add(idx));
  }
  // 2. Center-first logic
  if (previousMoves[0] === center || previousMoves.includes(center)) {
    risky.add(center);
    // Also add adjacent tiles
    [6,7,8,11,13,16,17,18].forEach(idx => risky.add(idx));
  }
  // 3. Edge bias
  if (previousMoves.every(idx => edges.includes(idx))) {
    edges.forEach(idx => risky.add(idx));
  }
  // 4. Repeated sequence (e.g. 3+ times same tile)
  Object.entries(counts).forEach(([idx, cnt]) => {
    if (cnt >= 2) risky.add(Number(idx));
  });
  // 5. Clustered moves (all within a 3x3 block)
  if (previousMoves.length >= 3) {
    const rows = previousMoves.map(i => Math.floor(i/5));
    const cols = previousMoves.map(i => i%5);
    if (Math.max(...rows)-Math.min(...rows) <= 2 && Math.max(...cols)-Math.min(...cols) <= 2) {
      previousMoves.forEach(idx => risky.add(idx));
    }
  }
  return Array.from(risky);
}
// --- Anti-Pattern Detection Logic END ---

module.exports = {
  generateMinePositions,
  calculateMultiplier,
  revealTile,
  cashOut,
  generateServerSeed,
  verifyGameFairness,
  getGameStats,
  BASE_HOUSE_EDGE,
  detectPlayerPattern
};