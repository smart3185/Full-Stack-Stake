// Test script to verify crash point distribution
const { getCrashPoint } = require('./utils/crashGenerator');

function testCrashDistribution(mode, rounds = 1000) {
  console.log(`\n=== Testing ${mode.toUpperCase()} Mode (${rounds} rounds) ===`);
  
  let wins = 0;
  let losses = 0;
  let totalCrashPoints = [];
  
  for (let i = 0; i < rounds; i++) {
    const crashPoint = getCrashPoint('test-seed', 'test-client', i, mode);
    totalCrashPoints.push(crashPoint);
    
    if (crashPoint >= 2.0) {
      wins++;
    } else {
      losses++;
    }
  }
  
  const winRate = (wins / rounds * 100).toFixed(1);
  const lossRate = (losses / rounds * 100).toFixed(1);
  const avgCrashPoint = (totalCrashPoints.reduce((a, b) => a + b, 0) / rounds).toFixed(2);
  
  console.log(`Win Rate: ${winRate}% (${wins} wins)`);
  console.log(`Loss Rate: ${lossRate}% (${losses} losses)`);
  console.log(`Average Crash Point: ${avgCrashPoint}x`);
  
  // Distribution analysis
  const lowWins = totalCrashPoints.filter(cp => cp >= 2.0 && cp < 5.0).length;
  const mediumWins = totalCrashPoints.filter(cp => cp >= 5.0 && cp < 15.0).length;
  const highWins = totalCrashPoints.filter(cp => cp >= 15.0).length;
  
  console.log(`Win Distribution:`);
  console.log(`  Low wins (2.0x-5.0x): ${lowWins} (${(lowWins/wins*100).toFixed(1)}% of wins)`);
  console.log(`  Medium wins (5.0x-15.0x): ${mediumWins} (${(mediumWins/wins*100).toFixed(1)}% of wins)`);
  console.log(`  High wins (15.0x+): ${highWins} (${(highWins/wins*100).toFixed(1)}% of wins)`);
  
  const earlyLosses = totalCrashPoints.filter(cp => cp >= 1.01 && cp < 1.50).length;
  const midLosses = totalCrashPoints.filter(cp => cp >= 1.50 && cp < 1.80).length;
  const nearMisses = totalCrashPoints.filter(cp => cp >= 1.80 && cp < 2.00).length;
  
  console.log(`Loss Distribution:`);
  console.log(`  Early losses (1.01x-1.50x): ${earlyLosses} (${(earlyLosses/losses*100).toFixed(1)}% of losses)`);
  console.log(`  Mid losses (1.50x-1.80x): ${midLosses} (${(midLosses/losses*100).toFixed(1)}% of losses)`);
  console.log(`  Near misses (1.80x-2.00x): ${nearMisses} (${(nearMisses/losses*100).toFixed(1)}% of losses)`);
}

// Test all modes
console.log('🎮 Testing Aviator Crash Point Distribution');
console.log('Expected win rates: Normal=60%, Mild=40%, Hard=20%');

testCrashDistribution('normal', 1000);
testCrashDistribution('mild', 1000);
testCrashDistribution('hard', 1000);

console.log('\n✅ Test completed!'); 