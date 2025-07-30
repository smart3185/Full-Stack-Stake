import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import CryptoJS from "crypto-js";

// API and Socket.IO base URLs
export const API_BASE: string = "https://stake-ny3s.onrender.com";
export const SOCKET_BASE: string = "https://stake-ny3s.onrender.com";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function verifyCrashPoint(serverSeed: string, clientSeed: string, nonce: number, crashPoint: number): boolean {
  // Use crypto-js for browser HMAC-SHA256
  function hmac_sha256(key: string, message: string) {
    return CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Hex);
  }
  const hash = hmac_sha256(serverSeed, `${clientSeed}:${nonce}`);
  const hex = hash.slice(0, 13);
  const number = parseInt(hex, 16);
  if (number % 33 === 0) return crashPoint === 1.0;
  let expected = Math.floor((100 * Math.pow(2, 52) - 1) / number) / 100;
  expected = Math.max(1.0, Math.min(expected, 100));
  return Math.abs(expected - crashPoint) < 0.01;
}
