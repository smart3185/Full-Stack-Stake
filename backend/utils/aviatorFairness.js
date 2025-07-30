// fairness.js
const crypto = require('crypto');

/**
 * Generate HMAC-SHA256 hash
 * @param {string} key - Server seed
 * @param {string} message - Client seed + nonce
 * @returns {string} - Hex HMAC hash
 */
function hmac_sha256(key, message) {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

/**
 * Converts a hex HMAC hash into a provably fair crash multiplier.
 * @param {string} hash - The HMAC SHA256 hex string
 * @returns {number} - Crash multiplier (min 1.00x)
 */
function hashToCrashMultiplier(hash) {
  const hex = hash.slice(0, 13); // Get first few hex chars
  const intVal = parseInt(hex, 16);
  if (intVal === 0) return 1.00;

  const e = Math.pow(2, 52);
  const result = Math.floor((100 * e - intVal) / (e - intVal)) / 100;

  return Math.max(1.00, Math.min(Number(result.toFixed(2)), 100));
}

/**
 * Verifies the crash multiplier using seeds and nonce.
 * Can be used for front-end or public verification.
 * @param {string} serverSeed
 * @param {string} clientSeed
 * @param {number} nonce
 * @returns {{ hash: string, multiplier: number }}
 */
function verifyCrash(serverSeed, clientSeed, nonce) {
  const message = `${clientSeed}:${nonce}`;
  const hash = hmac_sha256(serverSeed, message);
  const multiplier = hashToCrashMultiplier(hash);
  return { hash, multiplier };
}

module.exports = {
  hmac_sha256,
  hashToCrashMultiplier,
  verifyCrash
};
