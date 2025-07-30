const mongoose = require('mongoose');
const User = require('./models/User');

async function migrateBonusFields() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stake');
  const users = await User.find({ balance: { $gt: 0 }, firstDepositAmount: 0 });
  let updated = 0;
  for (const user of users) {
    user.firstDepositAmount = user.balance;
    user.awaitingBonus = Math.round(user.balance * 0.1);
    user.totalBetsAfterFirstDeposit = 0;
    await user.save();
    updated++;
    console.log(`Updated user ${user.email}: firstDepositAmount=${user.firstDepositAmount}, awaitingBonus=${user.awaitingBonus}`);
  }
  console.log(`Migration complete. Updated ${updated} users.`);
  await mongoose.disconnect();
}

migrateBonusFields().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 