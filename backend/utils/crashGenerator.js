// crashGenerator.js
const GameRound = require('../models/GameRound');
const { hmac_sha256, hashToCrashMultiplier } = require('./aviatorFairness');

/**
 * Get the last N crash rounds from DB to detect patterns.
 * @param {number} limit
 * @returns {Promise<Array>} last crash rounds
 */
async function getLastRounds(limit = 15) {
  return await GameRound.find().sort({ createdAt: -1 }).limit(limit);
}

/**
 * Bias generator to lean results towards house or risk.
 * @param {number} min
 * @param {number} max
 * @param {number} bias (0.0–1.0, lower = more aggressive bias toward min)
 */
function biasedRandom(min, max, bias = 0.5) {
  const rnd = Math.pow(Math.random(), bias < 0.5 ? 1 - bias : 1 + bias);
  return min + (max - min) * rnd;
}

/**
 * Main crash point generator with specific winning probabilities
 * @param {string} serverSeed
 * @param {string} clientSeed
 * @param {number} nonce
 * @param {'normal'|'mild'|'hard'} mode
 * @returns {Promise<number>} Crash multiplier (capped 100)
 */
function getCrashPoint(serverSeed, clientSeed, nonce, mode = 'normal') {
  const r = Math.random();
  let crash;

  // Define win probabilities for each mode
  const winChances = {
    normal: 0.6,  // user wins 60% of the time
    mild: 0.4,    // user wins 40% of the time
    hard: 0.1     // user wins 10% of the time (was 0.2)
  };

  const isWinRound = r < (winChances[mode] || 0.6);

  if (mode === 'mild') {
    // --- Custom Mild Mode Probability Distribution (Updated) ---
    const bucketRoll = Math.random();
    if (bucketRoll < 0.10) {
      // 10%: exactly 1.00x
      crash = 1.00;
    } else if (bucketRoll < 0.30) {
      // 20%: 1.01x–1.50x
      crash = 1.01 + Math.random() * 0.49;
    } else if (bucketRoll < 0.50) {
      // 20%: 1.51x–1.99x
      crash = 1.51 + Math.random() * 0.48;
    } else if (bucketRoll < 0.80) {
      // 30%: 2.00x–2.99x
      crash = 2.00 + Math.random() * 0.99;
    } else if (bucketRoll < 0.90) {
      // 10%: 3.00x–3.99x
      crash = 3.00 + Math.random() * 0.99;
    } else if (bucketRoll < 0.95) {
      // 5%: 4.00x–9.99x
      crash = 4.00 + Math.random() * 5.99;
    } else {
      // 5%: 10.00x–100.00x
      crash = 10.00 + Math.random() * 90.00;
    }
    // Optionally add a little noise to avoid visible spikes, except for exactly 1.00x
    if (crash !== 1.00) {
      crash += (Math.random() - 0.5) * 0.02;
    }
    return Math.max(1.00, Math.min(Number(crash.toFixed(2)), 100));
    // --- End Custom Mild Mode ---
  }

  if (isWinRound) {
    // Hard mode: wins are much smaller and rarer
    if (mode === 'hard') {
      const roll = Math.random();
      if (roll < 0.7) {
        // 70% of wins: 2.0x–3.0x
        crash = 2.0 + Math.random() * 1.0;
      } else if (roll < 0.95) {
        // 25% of wins: 3.0x–6.0x
        crash = 3.0 + Math.random() * 3.0;
      } else {
        // 5% of wins: 6.0x–20.0x
        crash = 6.0 + Math.random() * 14.0;
      }
    } else {
      // Normal as before
      const roll = Math.random();
      if (roll < 0.5) {
        crash = 2.0 + Math.random() * 3.0;
      } else if (roll < 0.85) {
        crash = 5.0 + Math.random() * 10.0;
      } else {
        crash = 15.0 + Math.random() * 85.0;
      }
    }
  } else {
    // Loss round: crash early, even more so in hard mode
    const lossRoll = Math.random();
    if (mode === 'hard') {
      if (lossRoll < 0.85) {
        // 85%: 1.01x–1.30x
        crash = 1.01 + Math.random() * 0.29;
      } else if (lossRoll < 0.97) {
        // 12%: 1.30x–1.60x
        crash = 1.30 + Math.random() * 0.30;
      } else {
        // 3%: 1.60x–1.99x
        crash = 1.60 + Math.random() * 0.39;
      }
    } else {
      if (lossRoll < 0.7) {
        crash = 1.01 + Math.random() * 0.49;
      } else if (lossRoll < 0.9) {
        crash = 1.50 + Math.random() * 0.30;
      } else {
        crash = 1.80 + Math.random() * 0.19;
      }
    }
  }

  return Math.max(1.00, Math.min(Number(crash.toFixed(2)), 100));
}

module.exports = {
  getCrashPoint
};
