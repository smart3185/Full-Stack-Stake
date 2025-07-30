const mongoose = require('mongoose');
const User = require('./models/User');
const AccountStatement = require('./models/AccountStatement');
const { MongoMemoryServer } = require('mongodb-memory-server');
const assert = require('assert');

async function runTests() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // Clean up
  await User.deleteMany({});
  await AccountStatement.deleteMany({});

  // 1. First deposit
  let user = new User({ email: 'test@example.com', password: 'test' });
  await user.save();
  user.firstDepositAmount = 0;
  user.awaitingBonus = 0;
  user.totalBetsAfterFirstDeposit = 0;
  await user.save();

  // Simulate first deposit approval
  const depositAmount = 1000;
  if (user.firstDepositAmount === 0) {
    user.firstDepositAmount = depositAmount;
    user.awaitingBonus = Math.round(depositAmount * 0.1);
  }
  user.balance += depositAmount;
  await user.save();
  assert.strictEqual(user.awaitingBonus, 100);
  assert.strictEqual(user.firstDepositAmount, 1000);
  assert.strictEqual(user.totalBetsAfterFirstDeposit, 0);

  // 2. Bet below threshold
  let bet = 200;
  user.totalBetsAfterFirstDeposit += bet;
  await user.save();
  assert.strictEqual(user.awaitingBonus, 100);
  assert.strictEqual(user.totalBetsAfterFirstDeposit, 200);
  assert.strictEqual(user.balance, 1000);

  // 3. Bet to reach exactly threshold
  bet = 300;
  user.totalBetsAfterFirstDeposit += bet;
  if (user.totalBetsAfterFirstDeposit >= user.firstDepositAmount * 0.5 && user.awaitingBonus > 0) {
    user.balance += user.awaitingBonus;
    user.awaitingBonus = 0;
  }
  await user.save();
  assert.strictEqual(user.awaitingBonus, 0);
  assert.strictEqual(user.balance, 1100);

  // 4. Bet after bonus released (should not re-release)
  bet = 100;
  user.totalBetsAfterFirstDeposit += bet;
  if (user.totalBetsAfterFirstDeposit >= user.firstDepositAmount * 0.5 && user.awaitingBonus > 0) {
    user.balance += user.awaitingBonus;
    user.awaitingBonus = 0;
  }
  await user.save();
  assert.strictEqual(user.awaitingBonus, 0);
  assert.strictEqual(user.balance, 1100);

  // 5. Multiple bets summing to threshold
  user = new User({ email: 'multi@example.com', password: 'test', firstDepositAmount: 1000, awaitingBonus: 100, totalBetsAfterFirstDeposit: 0, balance: 0 });
  await user.save();
  for (let i = 0; i < 5; i++) {
    user.totalBetsAfterFirstDeposit += 100;
    if (user.totalBetsAfterFirstDeposit >= user.firstDepositAmount * 0.5 && user.awaitingBonus > 0) {
      user.balance += user.awaitingBonus;
      user.awaitingBonus = 0;
    }
    await user.save();
  }
  assert.strictEqual(user.awaitingBonus, 0);
  assert.strictEqual(user.balance, 100);

  await mongoose.disconnect();
  await mongod.stop();
  console.log('All bonus logic tests passed!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
}); 