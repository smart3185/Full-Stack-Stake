const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AccountStatement = require('./models/AccountStatement');
const { v4: uuidv4 } = require('uuid');
const DepositRequest = require('./models/DepositRequest');
const WithdrawalRequest = require('./models/WithdrawalRequest');
const MinesGame = require('./models/MinesGame');
const MinesAutoMode = require('./models/MinesAutoMode');
const multer = require('multer');
const nodemailer = require('nodemailer');
const ADMIN_USER = 'vg123';
const ADMIN_PASS = 'pass123'; // Change this to your desired password
const ADMIN_EMAIL = 'vardhanghelani@gmail.com';
const AdminDepositSettings = require('./models/AdminDepositSettings');
const AdminAviatorSettings = require('./models/AdminAviatorSettings');
const AviatorUserRound = require('./models/AviatorUserRound');
const cloudinary = require('./utils/cloudinary');
const HouseStats = require('./models/HouseStats');
const SupportMessage = require('./models/SupportMessage');

dotenv.config();

const User = require('./models/User');
const sendOTP = require('./utils/sendOTP');
const GameRound = require('./models/GameRound');
const {  hmac_sha256, hashToCrashMultiplier,verifyCrash } = require('./utils/aviatorFairness');
const { getCrashPoint } = require('./utils/crashGenerator');
const { 
  generateMinePositions,
  calculateMultiplier,
  revealTile,
  cashOut,
  generateServerSeed,
  verifyGameFairness,
  getGameStats,
  BASE_HOUSE_EDGE
} = require('./utils/minesGame');

const app = express();

app.use(cors({
  origin: [
    'https://stake-self.vercel.app',
     'https://full-stack-stake.vercel.app',
    'https://www.royal-bet.live',
    'http://localhost:8080'
  ],
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 15000, // 15 seconds
  socketTimeoutMS: 45000, // 45 seconds
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  connectTimeoutMS: 10000
})
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ DB error', err));

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ✅ Request OTP (Login/Register)
app.post('/api/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const normalizedEmail = email.toLowerCase();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  try {
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = new User({
        email: normalizedEmail,
        otp,
        otpExpiry,
        isVerified: false,
        balance: 0 // Set initial balance to 0
      });
    } else {
      user.otp = otp;
      user.otpExpiry = otpExpiry;
    }

    await user.save();

    console.log("OTP saved in DB:", user.otp);
    await sendOTP(normalizedEmail, otp);

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ success: false, message: 'Server error while sending OTP.' });
  }
});

// ✅ Verify OTP - SIMPLIFIED AND FIXED
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: "No OTP found. Please request a new one." });
    }
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }
    const storedOTP = user.otp.toString().trim();
    const enteredOTP = otp.toString().trim();
    if (storedOTP !== enteredOTP) {
      return res.status(400).json({ success: false, message: "Incorrect OTP. Please try again." });
    }
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    return res.status(200).json({ success: true, message: "OTP verified successfully", user: { email: user.email, isVerified: user.isVerified, _id: user._id } });
  } catch (err) {
    console.error("Server error in verify-otp:", err);
    return res.status(500).json({ success: false, message: "Server error during verification" });
  }
});

// 🔑 Forgot Password - Send OTP
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();
    await sendOTP(email, otp);
    res.json({ success: true, message: 'OTP sent for password reset' });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 🔐 Reset Password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;
    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    const bcrypt = require('bcrypt');
    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Protected: Get user balance
app.get('/api/user/balance', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log(`Balance fetch for user ${user.email}: ${user.balance}`);
    
    res.json({ success: true, balance: user.balance });
  } catch (err) {
    console.error('Get balance error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Protected: Update user balance (win/loss)
app.post('/api/user/balance', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== 'number') {
      return res.status(400).json({ success: false, message: 'Amount must be a number' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const oldBalance = user.balance;
    user.balance += amount;
    await user.save();
    
    console.log(`Balance update for user ${user.email}: ${oldBalance} + ${amount} = ${user.balance}`);
    
    res.json({ success: true, balance: user.balance });
  } catch (err) {
    console.error('Update balance error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Protected: Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ 
      success: true, 
      user: { 
        email: user.email, 
        _id: user._id, 
        balance: user.balance,
        isVerified: user.isVerified,
        awaitingBonus: user.awaitingBonus,
        firstDepositAmount: user.firstDepositAmount,
        totalBetsAfterFirstDeposit: user.totalBetsAfterFirstDeposit
      } 
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Signup: email + password, send OTP
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    
    const normalizedEmail = email.toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });
    
    if (user) {
      if (user.isVerified) {
        return res.status(400).json({ success: false, message: 'User already exists and is verified' });
      }
      // If not verified, allow to resend OTP
    } else {
      user = new User({ 
        email: normalizedEmail, 
        isVerified: false, 
        balance: 0 
      });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    
    await sendOTP(normalizedEmail, otp);
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});

// Verify OTP: set isVerified true
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    }
    
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    
    const storedOTP = user.otp.toString().trim();
    const enteredOTP = otp.toString().trim();
    
    if (storedOTP !== enteredOTP) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }
    
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    
    // Generate JWT token after successful verification
    const token = jwt.sign(
      { userId: user._id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    return res.status(200).json({ 
      success: true, 
      message: 'OTP verified successfully', 
      user: { 
        email: user.email, 
        isVerified: user.isVerified, 
        _id: user._id,
        balance: user.balance 
      },
      token 
    });
  } catch (err) {
    console.error('Server error in verify-otp:', err);
    return res.status(500).json({ success: false, message: 'Server error during verification' });
  }
});

// Login: email + password, only if verified
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user || !user.isVerified) {
      return res.status(400).json({ success: false, message: 'User not found or not verified' });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    res.json({ 
      success: true, 
      message: 'Login successful', 
      user: { 
        email: user.email, 
        _id: user._id, 
        balance: user.balance 
      },
      token 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// --- Aviator Game Logic ---
// --- Aviator Game Logic ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

let volatilityMode = 'normal';

async function loadVolatilityMode() {
  const settings = await AdminAviatorSettings.getSettings();
  volatilityMode = settings.volatilityMode;
  console.log(`Loaded volatility mode from DB: ${volatilityMode}`);
}

loadVolatilityMode();
let isFrozen = false;
let currentRoundNumber = 1;

// Socket.IO JWT Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    next();
  });
});

// Track online users
const onlineUsers = new Map();

// Helper: Create a new Aviator round
async function createAviatorRound() {
  if (isFrozen) return null;
  const serverSeed = require('crypto').randomBytes(32).toString('hex');
  const clientSeed = require('crypto').randomBytes(16).toString('hex');
  const nonce = Date.now();
  const crashPoint = await getCrashPoint(serverSeed, clientSeed, nonce, volatilityMode);
  const fairnessHash = hmac_sha256(serverSeed, `${clientSeed}:${nonce}`);
  const roundId = require('crypto').randomBytes(8).toString('hex');

  const round = await GameRound.create({
    roundId,
    roundNumber: currentRoundNumber,
    crashPoint,
    serverSeed,
    clientSeed,
    nonce,
    fairnessHash,
    volatilityMode,
    isFrozen
  });

  // Keep only last 100 rounds (delete older)
  const count = await GameRound.countDocuments();
  if (count > 100) {
    const oldest = await GameRound.find().sort({ createdAt: 1 }).limit(count - 100);
    await GameRound.deleteMany({ _id: { $in: oldest.map(r => r._id) } });
  }

  return round;
}

// API: Verify crash fairness
app.get('/api/aviator/verify/:roundId', async (req, res) => {
  try {
    const round = await GameRound.findOne({ roundId: req.params.roundId });
    if (!round) {
      return res.status(404).json({ success: false, message: 'Round not found' });
    }
    const isValid = verifyCrash(round.serverSeed, round.clientSeed, round.nonce, round.crashPoint);
    res.json({
      success: true,
      verified: isValid,
      expectedMultiplier: hashToCrashMultiplier(hmac_sha256(round.serverSeed, `${round.clientSeed}:${round.nonce}`)),
      recordedMultiplier: round.crashPoint
    });
  } catch (err) {
    console.error('Crash verification error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Get last 1000 Aviator rounds
app.get('/api/aviator/history', async (req, res) => {
  try {
    const rounds = await GameRound.find().sort({ createdAt: -1 }).limit(1000);
    res.json({ success: true, rounds });
  } catch (err) {
    console.error('Get aviator history error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Admin - set volatility mode
app.post('/api/admin/volatility-mode', adminAuth, async (req, res) => {
  try {
    const { mode } = req.body;
    if (!['normal', 'mild', 'hard'].includes(mode)) {
      return res.status(400).json({ success: false, message: 'Invalid mode' });
    }

    volatilityMode = mode;
    const settings = await AdminAviatorSettings.getSettings();
    settings.volatilityMode = mode;
    settings.updatedAt = new Date();
    await settings.save();

    res.json({ success: true, mode });
  } catch (err) {
    console.error('Error setting volatility mode:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Get current volatility mode (admin)
app.get('/api/admin/volatility-mode', adminAuth, async (req, res) => {
  try {
    const settings = await AdminAviatorSettings.getSettings();
    res.json({ success: true, mode: settings.volatilityMode });
  } catch (err) {
    console.error('Error fetching volatility mode:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Public endpoint to get current volatility mode
app.get('/api/aviator/volatility-mode', async (req, res) => {
  try {
    const settings = await AdminAviatorSettings.getSettings();
    res.json({ success: true, mode: settings.volatilityMode });
  } catch (err) {
    console.error('Error fetching volatility mode:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: Admin - freeze/unfreeze game
app.post('/api/aviator/admin/freeze', async (req, res) => {
  const { freeze } = req.body;
  isFrozen = !!freeze;
  res.json({ success: true, isFrozen });
});

// --- Aviator Game Loop (Socket.IO) ---
let currentRound = null;
let roundTimer = null;

async function startAviatorLoop() {
  while (true) {
    if (isFrozen) {
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    // 1. Create new round
    currentRound = await createAviatorRound();
    if (!currentRound) continue;

    io.emit('aviator:roundStart', {
      roundId: currentRound.roundId,
      roundNumber: currentRoundNumber,
      fairnessHash: currentRound.fairnessHash,
      volatilityMode,
      createdAt: currentRound.createdAt
    });

    // 2. Betting phase (10s)
    await new Promise(r => setTimeout(r, 10000));

    // 3. Flight phase (time-based exponential multiplier)
    const k = 0.07; // tweak for desired growth speed
    const tickInterval = 30; // ms
    let crashed = false;
    let startTime = Date.now();
    const crash = currentRound.crashPoint;
    let multiplier = 1.0;
    while (!crashed) {
      const elapsed = (Date.now() - startTime) / 1000;
      multiplier = Math.exp(k * elapsed);
      if (multiplier >= crash) {
        multiplier = crash;
        crashed = true;
      }
      io.emit('aviator:multiplier', {
        roundId: currentRound.roundId,
        multiplier: Number(multiplier.toFixed(2))
      });
      if (crashed) break;
      await new Promise(r => setTimeout(r, tickInterval));
    }

    io.emit('aviator:crash', {
      roundId: currentRound.roundId,
      crashPoint: crash
    });

    // 4. Wait 3s before next round
    await new Promise(r => setTimeout(r, 3000));
    // Increment round number
    currentRoundNumber++;
  }
}

startAviatorLoop();

// --- Socket.IO: Handle bets/cashouts (with authentication) ---
io.on('connection', (socket) => {
  console.log(`User ${socket.userEmail} connected with ID: ${socket.userId}`);
  
  // Add user to online users
  onlineUsers.set(socket.userId, {
    email: socket.userEmail,
    connectedAt: new Date(),
    socketId: socket.id,
    username: socket.userName || '',
    currentGame: '',
    ip: socket.handshake.address,
    lastActive: Date.now()
  });
  
  // Emit online users count to all connected clients
  io.emit('onlineUsers:update', { count: onlineUsers.size });
  
  socket.on('aviator:placeBet', async (data) => {
    let balanceDeducted = false;
    let originalBalance = 0;
    let timeoutId;
    try {
      console.log('[Aviator] Bet placement attempt:', { data, userId: socket.userId });
      // Set up timeout to prevent hanging
      const responsePromise = new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Bet placement timeout'));
        }, 10000); // 10 second timeout
      });
      const { amount, roundId } = data || {};
      // Validate input
      if (!amount || !roundId) {
        console.error('[Aviator] Missing amount or roundId', { data });
        clearTimeout(timeoutId);
        return socket.emit('aviator:betPlaced', { success: false, message: 'Amount and roundId are required' });
      }
      if (typeof amount !== 'number' || amount <= 0) {
        console.error('[Aviator] Invalid amount:', amount);
        clearTimeout(timeoutId);
        return socket.emit('aviator:betPlaced', { success: false, message: 'Invalid bet amount' });
      }
      // Get user with timeout protection
      let user;
      try {
        user = await Promise.race([
          User.findById(socket.userId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 5000))
        ]);
      } catch (userErr) {
        clearTimeout(timeoutId);
        console.error('[Aviator] User fetch error:', userErr);
        return socket.emit('aviator:betPlaced', { success: false, message: 'User not found or database timeout' });
      }
      if (!user) {
        clearTimeout(timeoutId);
        console.error('[Aviator] User not found for bet placement:', socket.userId);
        return socket.emit('aviator:betPlaced', { success: false, message: 'User not found' });
      }
      originalBalance = user.balance;
      if (user.balance < amount) {
        clearTimeout(timeoutId);
        console.error('[Aviator] Insufficient balance for bet:', { userId: user._id, balance: user.balance, amount });
        return socket.emit('aviator:betPlaced', { success: false, message: 'Insufficient balance' });
      }
      // Check if user already has a bet for this round
      let existingBet;
      try {
        existingBet = await AviatorUserRound.findOne({ userId: user._id, roundId });
      } catch (findErr) {
        clearTimeout(timeoutId);
        console.error('[Aviator] Error checking existing bet:', findErr);
        return socket.emit('aviator:betPlaced', { success: false, message: 'Server error. Please try again.' });
      }
      if (existingBet) {
        clearTimeout(timeoutId);
        console.error('[Aviator] User already has bet for this round:', { userId: user._id, roundId });
        return socket.emit('aviator:betPlaced', { success: false, message: 'Bet already placed for this round' });
      }
      // Perform all database operations in a single atomic operation
      let betPlacementResult;
      try {
        betPlacementResult = await Promise.race([
          (async () => {
            try {
              // Deduct balance
              user.balance -= amount;
              balanceDeducted = true;
              console.log('[Aviator] Balance deducted:', { userId: user._id, oldBalance: originalBalance, newBalance: user.balance });
              await Promise.all([
                user.save(),
                AviatorUserRound.create({ userId: user._id, roundId, bet: amount }),
                AccountStatement.create({
                  userId: user._id,
                  transaction: 'Casino Bet Placement',
                  event: 'Aviator X',
                  marketType: 'Casino',
                  gameType: 'Aviator',
                  betAmount: amount,
                  payout: 0,
                  credit: -amount,
                  closeBalance: user.balance,
                  transactionId: uuidv4(),
                  result: 'bet',
                })
              ]);
              console.log('[Aviator] All bet operations completed successfully');
              // Bonus logic
              const bonusReleased = await handleBonusProgress(user, amount);
              return { success: true, balance: user.balance, betAmount: amount, bonusReleased };
            } catch (betErr) {
              throw betErr;
            }
          })(),
          responsePromise
        ]);
      } catch (betPlacementErr) {
        clearTimeout(timeoutId);
        console.error('[Aviator] Error in bet placement promise:', betPlacementErr);
        // Restore balance if it was deducted but operation failed
        if (balanceDeducted && originalBalance > 0) {
          try {
            user.balance = originalBalance;
            await user.save();
            console.log('[Aviator] Balance restored after error:', { userId: user._id, restoredBalance: originalBalance });
          } catch (restoreErr) {
            console.error('[Aviator] Failed to restore balance after error:', restoreErr);
          }
        }
        const errorMessage = betPlacementErr.message === 'Bet placement timeout'
          ? 'Request timeout. Please try again.'
          : betPlacementErr.message || 'Server error. Please try again.';
        return socket.emit('aviator:betPlaced', { success: false, message: errorMessage });
      }
      clearTimeout(timeoutId);
      socket.emit('aviator:betPlaced', betPlacementResult);
      console.log('[Aviator] Bet placed successfully:', { userId: user._id, amount, newBalance: user.balance });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[Aviator] Error in aviator:placeBet:', err);
      // Restore balance if it was deducted but operation failed
      if (balanceDeducted && originalBalance > 0) {
        try {
          const user = await Promise.race([
            User.findById(socket.userId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Restore timeout')), 3000))
          ]);
          if (user) {
            user.balance = originalBalance;
            await user.save();
            console.log('[Aviator] Balance restored after error:', { userId: user._id, restoredBalance: originalBalance });
          }
        } catch (restoreErr) {
          console.error('[Aviator] Failed to restore balance after error:', restoreErr);
        }
      }
      const errorMessage = err.message === 'Bet placement timeout'
        ? 'Request timeout. Please try again.'
        : err.message || 'Server error. Please try again.';
      socket.emit('aviator:betPlaced', { success: false, message: errorMessage });
    }
  });
  
  socket.on('aviator:cashout', async (data) => {
    try {
      const { roundId, multiplier, bet } = data;
      const user = await User.findById(socket.userId);
      if (!user) return socket.emit('aviator:cashedOut', { success: false, message: 'User not found' });
      const userRound = await AviatorUserRound.findOneAndUpdate(
        { userId: user._id, roundId, cashedOut: false },
        { $set: { cashedOut: true, cashedOutAt: new Date(), payout: bet * multiplier, multiplier } },
        { new: true }
      );
      if (!userRound) return socket.emit('aviator:cashedOut', { success: false, message: 'Already cashed out or no bet for this round' });
      const payout = bet * multiplier;
      user.balance += payout;
      await user.save();
      await AccountStatement.create({
        userId: user._id,
        transaction: 'Casino Bet Settlement',
        event: 'Aviator X',
        marketType: 'Casino',
        gameType: 'Aviator',
        betAmount: bet,
        payout: payout,
        credit: payout,
        closeBalance: user.balance,
        transactionId: uuidv4(),
        result: payout > 0 ? 'win' : 'loss',
      });
      socket.emit('aviator:cashedOut', { success: true, balance: user.balance, payout, multiplier });
    } catch (err) {
      socket.emit('aviator:cashedOut', { success: false, message: 'Server error' });
    }
  });

  socket.on('aviator:crashLoss', async (data) => {
    try {
      const { roundId, bet } = data;
      const user = await User.findById(socket.userId);
      if (!user) return socket.emit('aviator:crashLossProcessed', { success: false, message: 'User not found' });
      await AccountStatement.create({
        userId: user._id,
        transaction: 'Casino Bet Settlement',
        event: 'Aviator X',
        marketType: 'Casino',
        gameType: 'Aviator',
        betAmount: bet,
        payout: 0,
        credit: 0,
        closeBalance: user.balance,
        transactionId: uuidv4(),
        result: 'loss',
      });
      socket.emit('aviator:crashLossProcessed', { success: true, balance: user.balance, lostAmount: bet });
    } catch (err) {
      socket.emit('aviator:crashLossProcessed', { success: false, message: 'Server error' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.userEmail} disconnected`);
    
    // Remove user from online users
    onlineUsers.delete(socket.userId);
    
    // Emit updated online users count to all connected clients
    io.emit('onlineUsers:update', { count: onlineUsers.size });
  });

  // Listen for game change events from client
  socket.on('user:gameChange', (data) => {
    const info = onlineUsers.get(socket.userId);
    if (info) {
      info.currentGame = data.gameName;
      info.lastActive = Date.now();
      onlineUsers.set(socket.userId, info);
    }
  });

  // Update lastActive on any event
  socket.onAny(() => {
    const info = onlineUsers.get(socket.userId);
    if (info) {
      info.lastActive = Date.now();
      onlineUsers.set(socket.userId, info);
    }
  });
});

// API endpoint to fetch account statement for the logged-in user
app.get('/api/account-statement', authenticateToken, async (req, res) => {
  const { from, to, type } = req.query;
  const filter = { userId: req.user.userId };
  if (from && to) {
    filter.date = { $gte: new Date(from), $lte: new Date(to) };
  }
  if (type && type !== 'All') {
    filter.transaction = type;
  }
  const statements = await AccountStatement.find(filter).sort({ date: -1 });
  res.json({ success: true, statements });
});

// --- Dice Game Endpoint ---
app.post('/api/dice/play', authenticateToken, async (req, res) => {
  try {
    const { betAmount, rollOver, clientSeed } = req.body;
    if (!betAmount || betAmount <= 0) return res.status(400).json({ success: false, message: 'Invalid bet amount' });
    if (typeof rollOver !== 'number' || rollOver < 0 || rollOver >= 100) return res.status(400).json({ success: false, message: 'Invalid rollOver value' });
    if (!clientSeed || typeof clientSeed !== 'string') return res.status(400).json({ success: false, message: 'Invalid clientSeed' });

    const user = await User.findById(req.user.userId);
    if (!user || user.balance < betAmount) return res.status(400).json({ success: false, message: 'Insufficient balance' });

    // Provably fair: get or generate serverSeed and nonce
    const crypto = require('crypto');
    if (!user.diceServerSeed) {
      user.diceServerSeed = crypto.randomBytes(32).toString('hex');
      user.diceNonce = 0;
    }
    const serverSeed = user.diceServerSeed;
    const nonce = user.diceNonce;

    // Provably fair roll generation
    const hash = crypto.createHash('sha256').update(serverSeed + clientSeed + nonce).digest('hex');
    let roll = (parseInt(hash.slice(0, 8), 16) % 10000) / 100;
    const originalRoll = roll;

    // --- Bankroll Management System ---
    const houseStats = await getOrCreateTodayHouseStats();
    // Biasing logic (if roll is a near-win)
    const isNearWin = roll > rollOver && roll < rollOver + 10;
    if (Math.random() < houseStats.dynamicBias && isNearWin) {
      roll = rollOver - 0.01; // Turn near win into a loss
    }
    // --- End Bankroll Management ---

    // Game logic
    const winChance = 100 - rollOver;
    const multiplier = +(99 / winChance).toFixed(4);
    const payout = roll > rollOver ? +(betAmount * multiplier).toFixed(2) : 0;
    const netGain = payout - betAmount;
    const win = roll > rollOver;

    // Update user balance and nonce
    user.balance += netGain;
    user.diceNonce += 1;
    await user.save(); // Only await user save for fairness

    // Synchronously log the account statement
    await AccountStatement.create({
      userId: user._id,
      transaction: 'Casino Bet Settlement',
      gameType: 'Dice',
      betAmount,
      payout,
      result: win ? 'win' : 'loss',
      credit: netGain,
      closeBalance: user.balance,
      transactionId: crypto.randomUUID(),
      details: {
        rollOver,
        winChance,
        multiplier,
        roll,
        serverSeed,
        clientSeed,
        nonce,
        hash,
        netGain
      }
    });

    // Bonus logic
    const bonusReleased = await handleBonusProgress(user, betAmount);

    // Save house stats (if needed)
    await houseStats.save();

    // Now respond to the user
    res.json({
      success: true,
      result: win ? 'win' : 'loss',
      payout,
      netGain,
      roll,
      rollOver,
      winChance,
      multiplier,
      balance: user.balance,
      serverSeed,
      clientSeed,
      nonce,
      hash,
      date: new Date(),
      bonusReleased
    });
  } catch (err) {
    console.error('Dice error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- Dice Game Roll Verification Endpoint ---
app.post('/api/verify-roll', async (req, res) => {
  try {
    const { serverSeed, clientSeed, nonce } = req.body;
    if (!serverSeed || !clientSeed || typeof nonce !== 'number') {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(serverSeed + clientSeed + nonce).digest('hex');
    const roll = (parseInt(hash.slice(0, 8), 16) % 10000) / 100;
    res.json({
      success: true,
      roll,
      hash
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- Slots Game Endpoint ---
app.post('/api/slots/play', authenticateToken, async (req, res) => {
  try {
    const { bet } = req.body;
    if (!bet || bet <= 0) return res.status(400).json({ success: false, message: 'Invalid bet' });
    if (bet > 1000000) return res.status(400).json({ success: false, message: 'Bet too high' });
    
    const user = await User.findById(req.user.userId);
    if (!user || user.balance < bet) return res.status(400).json({ success: false, message: 'Insufficient balance' });

    // Slot machine configuration
    const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣', '🐯'];
    // Make house-friendlier: more chance for low symbols, less for high
    const weights = [0.32, 0.32, 0.18, 0.10, 0.05, 0.03]; // More likely to get 🍒 or 🍋, less likely for 💎, 7️⃣, 🐯
    const payouts = {
      '7️⃣7️⃣7️⃣': 20,  // Jackpot
      '💎💎💎': 10,   // Big Win
      '🔔🔔🔔': 5,    // Win
      '🍒🍒🍒': 3,    // Win
      '🍋🍋🍋': 3,    // Win
      '🐯🐯🐯': 3,    // Win
      '2x': 1.5       // Two of a kind
    };

    function weightedRandomSymbol() {
      const rand = Math.random();
      let acc = 0;
      for (let i = 0; i < weights.length; i++) {
        acc += weights[i];
        if (rand < acc) return symbols[i];
      }
      return symbols[symbols.length - 1];
    }

    function spinReels() {
      // House bias: 60% of the time, force a loss (no two of a kind)
      if (Math.random() < 0.6) {
        // Pick three different symbols
        let a = weightedRandomSymbol();
        let b = a;
        while (b === a) b = weightedRandomSymbol();
        let c = a;
        while (c === a || c === b) c = weightedRandomSymbol();
        return [a, b, c];
      }
      // Otherwise, spin normally
      return [weightedRandomSymbol(), weightedRandomSymbol(), weightedRandomSymbol()];
    }

    function calculatePayout(reels, bet) {
      const [a, b, c] = reels;
      
      // Check for three of a kind
      if (a === b && b === c) {
        const key = `${a}${a}${a}`;
        const multiplier = payouts[key];
        if (multiplier) {
          const payout = Math.round(bet * multiplier);
          let result = 'win';
          if (a === '7️⃣') result = 'jackpot';
          else if (a === '💎') result = 'big win';
          
          return { 
            payout, 
            result, 
            multiplier: multiplier + 'x',
            winType: 'three_of_a_kind'
          };
        }
      }
      
      // Check for two of a kind
      if (a === b || b === c || a === c) {
        const payout = Math.round(bet * payouts['2x']);
        return { 
          payout, 
          result: 'partial win', 
          multiplier: payouts['2x'] + 'x',
          winType: 'two_of_a_kind'
        };
      }
      
      // No win
      return { 
        payout: 0, 
        result: 'loss', 
        multiplier: '0x',
        winType: 'no_win'
      };
    }

    // Spin the reels
    const reels = spinReels();
    const { payout, result, multiplier, winType } = calculatePayout(reels, bet);
    const net = payout - bet;
    
    // Update user balance
    user.balance += net;
    await user.save();

    // Log the transaction synchronously
    await AccountStatement.create({
      userId: user._id,
      transaction: 'Casino Bet Settlement',
      gameType: 'Slots',
      result: result === 'loss' ? 'loss' : 'win',
      credit: net,
      closeBalance: user.balance,
      transactionId: uuidv4(),
      details: {
        reels,
        result,
        multiplier,
        winType,
        payout,
        bet,
        net
      }
    });

    // Bonus logic
    const bonusReleased = await handleBonusProgress(user, bet);

    res.json({
      success: true,
      reels,
      result,
      payout,
      multiplier,
      winType,
      net,
      balance: user.balance,
      date: new Date(),
      bonusReleased
    });
  } catch (err) {
    console.error('Slots error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- CoinFlip Game Endpoint ---


// --- Admin Login ---
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ success: true, token });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
});

function adminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Admin token required' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded.admin) return res.status(403).json({ success: false, message: 'Invalid admin token' });
    next();
  });
}

// --- User Deposit Request ---
app.post('/api/deposit', authenticateToken, multer({ dest: 'backend/uploads/' }).single('proof'), async (req, res) => {
  try {
    const { amount, method, utr } = req.body;
    let proof;
    if (req.file) {
      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(req.file.path, { folder: 'stake/deposit-proofs' }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
      proof = result.secure_url;
    }
    
    if (!amount || !method || !utr) {
      return res.status(400).json({ success: false, message: 'Amount, method, and UTR required' });
    }
    
    // Convert and round to 2 decimal places to ensure precision
    const depositAmount = Math.round(parseFloat(amount) * 100) / 100;
    
    if (isNaN(depositAmount) || depositAmount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum deposit amount is ₹100' });
    }
    
    if (depositAmount > 10000) {
      return res.status(400).json({ success: false, message: 'Maximum deposit amount is ₹10,000' });
    }
    
    const deposit = await DepositRequest.create({
      user: req.user.userId,
      amount: depositAmount,
      method,
      proof,
      utr
    });
    // Send email to admin
    const user = await User.findById(req.user.userId);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS }
    });
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: ADMIN_EMAIL,
      subject: 'New Deposit Request',
      html: `<b>New deposit request from ${user.email}</b><br>Amount: ₹${depositAmount.toFixed(2)}<br>Method: ${method}<br>${proof ? `Proof: <a href='${proof}'>View</a>` : ''}`
    });
    console.log('Deposit request amount received:', depositAmount);
    res.json({ success: true, deposit });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- User Withdrawal Request ---
app.post('/api/withdraw', authenticateToken, async (req, res) => {
  try {
    const { accountIndex, amount, withdrawPassword } = req.body;
    console.log('--- WITHDRAW REQUEST ---');
    console.log('Payload:', req.body);
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log('User balance:', user.balance);
    console.log('User withdrawalAccounts:', user.withdrawalAccounts);
    if (typeof accountIndex !== 'number' || typeof amount !== 'number' || amount < 200) {
      console.log('Invalid input');
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹200' });
    }
    if (!user.withdrawalAccounts[accountIndex]) {
      console.log('Invalid account selected');
      return res.status(400).json({ success: false, message: 'Invalid account selected' });
    }
    if (user.balance < amount) {
      console.log('Insufficient balance');
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }
    // Optional: check withdrawPassword
    if (user.withdrawalAccounts[accountIndex].withdrawPassword && user.withdrawalAccounts[accountIndex].withdrawPassword !== withdrawPassword) {
      console.log('Incorrect withdraw password');
      return res.status(400).json({ success: false, message: 'Incorrect withdraw password' });
    }
    // Debit balance and create request
    user.balance -= amount;
    await user.save();
    const account = user.withdrawalAccounts[accountIndex];
    const withdrawal = new WithdrawalRequest({
      user: user._id,
      amount,
      account: {
        name: account.name,
        accountNumber: account.accountNumber,
        ifsc: account.ifsc,
        mobile: account.mobile
      },
      status: 'pending'
    });
    await withdrawal.save();
    // Log in account statement
    await AccountStatement.create({
      userId: user._id,
      transaction: 'Withdrawal Request',
      event: 'Withdrawal',
      marketType: 'Wallet',
      gameType: 'Withdrawal',
      betAmount: amount,
      payout: 0,
      result: 'pending',
      credit: -amount,
      closeBalance: user.balance,
      transactionId: withdrawal._id.toString()
    });
    res.json({ success: true, message: 'Withdrawal request submitted', withdrawal });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- User: View own deposit/withdrawal requests ---
app.get('/api/deposit', authenticateToken, async (req, res) => {
  const deposits = await DepositRequest.find({ user: req.user.userId }).sort({ createdAt: -1 });
  res.json({ success: true, deposits });
});
app.get('/api/withdraw', authenticateToken, async (req, res) => {
  const withdrawals = await WithdrawalRequest.find({ user: req.user.userId }).sort({ createdAt: -1 });
  res.json({ success: true, withdrawals });
});

// --- Admin: View all deposit/withdrawal requests ---
app.get('/api/admin/deposits', adminAuth, async (req, res) => {
  const deposits = await DepositRequest.find().populate('user').sort({ createdAt: -1 });
  res.json({ success: true, deposits });
});
app.get('/api/admin/withdrawals', adminAuth, async (req, res) => {
  const withdrawals = await WithdrawalRequest.find().populate('user').sort({ createdAt: -1 });
  res.json({ success: true, withdrawals });
});

// --- Admin: Approve/Reject Deposit ---
app.post('/api/admin/deposit/:id/approve', adminAuth, async (req, res) => {
  const deposit = await DepositRequest.findById(req.params.id);
  if (!deposit || deposit.status !== 'pending') return res.status(404).json({ success: false, message: 'Deposit not found or already processed' });
  deposit.status = 'approved';
  deposit.updatedAt = new Date();
  await deposit.save();
  // Credit user balance
  const user = await User.findById(deposit.user);
  let bonus = 0;
  if (user.firstDepositAmount === 0) {
    user.firstDepositAmount = Number(deposit.amount);
    bonus = Math.round(Number(deposit.amount) * 0.1);
    user.awaitingBonus = bonus;
    user.totalBetsAfterFirstDeposit = 0;
  }
  user.balance += Number(deposit.amount);
  await user.save();
  await AccountStatement.create({
    userId: user._id,
    transaction: bonus > 0 ? 'Deposit Approved (First Deposit Bonus Pending)' : 'Deposit Approved',
    event: 'Deposit',
    marketType: 'Wallet',
    gameType: 'Deposit',
    betAmount: deposit.amount,
    payout: 0,
    result: 'credit',
    credit: Number(deposit.amount),
    closeBalance: user.balance,
    transactionId: deposit._id.toString()
  });
  res.json({ success: true });
});
app.post('/api/admin/deposit/:id/reject', adminAuth, async (req, res) => {
  const deposit = await DepositRequest.findById(req.params.id);
  if (!deposit || deposit.status !== 'pending') return res.status(404).json({ success: false, message: 'Deposit not found or already processed' });
  deposit.status = 'rejected';
  deposit.updatedAt = new Date();
  await deposit.save();
  res.json({ success: true });
});

// --- Admin: Mark Withdrawal as Processed/Rejected ---
app.post('/api/admin/withdraw/:id/process', adminAuth, async (req, res) => {
  const withdrawal = await WithdrawalRequest.findById(req.params.id);
  if (!withdrawal || withdrawal.status !== 'pending') return res.status(404).json({ success: false, message: 'Withdrawal not found or already processed' });
  withdrawal.status = 'processed';
  withdrawal.updatedAt = new Date();
  await withdrawal.save();
  res.json({ success: true });
});
app.post('/api/admin/withdraw/:id/reject', adminAuth, async (req, res) => {
  const withdrawal = await WithdrawalRequest.findById(req.params.id);
  if (!withdrawal || withdrawal.status !== 'pending') return res.status(404).json({ success: false, message: 'Withdrawal not found or already processed' });
  withdrawal.status = 'rejected';
  withdrawal.updatedAt = new Date();
  await withdrawal.save();
  res.json({ success: true });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// 1. Serve uploads directory as static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. Multer setup for admin QR upload
const uploadQR = multer({ storage: multer.memoryStorage() });

// 3. Admin: Upload QR and UTR
app.post('/api/admin/deposit-settings', adminAuth, uploadQR.single('qrImage'), async (req, res) => {
  try {
    const { utr } = req.body;
    let qrImageUrl;
    if (req.file) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'stake/qr-codes' },
        async (error, result) => {
          if (error) {
            return res.status(500).json({ success: false, message: 'Cloudinary upload error' });
          }
          let settings = await AdminDepositSettings.findOne();
          if (!settings) settings = new AdminDepositSettings();
          if (utr) settings.utr = utr;
          settings.qrImage = result.secure_url;
          settings.updatedAt = new Date();
          await settings.save();
          res.json({ success: true, settings });
        }
      );
      result.end(req.file.buffer);
      return;
    } else {
      let settings = await AdminDepositSettings.findOne();
      if (!settings) settings = new AdminDepositSettings();
      if (utr) settings.utr = utr;
      settings.updatedAt = new Date();
      await settings.save();
      res.json({ success: true, settings });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 4. User: Fetch current admin QR and UTR
app.get('/api/deposit-settings', async (req, res) => {
  try {
    const settings = await AdminDepositSettings.findOne();
    if (!settings) return res.json({ success: true, settings: null });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 5. Admin: View all deposit requests
app.get('/api/admin/deposit-requests', adminAuth, async (req, res) => {
  try {
    const deposits = await DepositRequest.find().populate('user').sort({ createdAt: -1 });
    res.json({ success: true, deposits });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 6. Admin: Approve/Reject deposit request
app.patch('/api/admin/deposit-request/:id', adminAuth, async (req, res) => {
  try {
    const { status, adminReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const deposit = await DepositRequest.findById(req.params.id);
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit request not found' });

    // Only credit if moving from pending to approved
    if (status === 'approved' && deposit.status === 'pending') {
      const user = await User.findById(deposit.user);
      if (user) {
        // Set bonus fields if this is the user's first deposit
        let bonus = 0;
        if (user.firstDepositAmount === 0) {
          // Ensure precise number handling for first deposit amount
          const preciseDepositAmount = Math.round(deposit.amount * 100) / 100;
          user.firstDepositAmount = preciseDepositAmount;
          bonus = Math.round(preciseDepositAmount * 10) / 100; // Calculate 10% bonus with precision
          user.awaitingBonus = bonus;
          user.totalBetsAfterFirstDeposit = 0;
        }
        
        // Add deposit amount with precision
        const preciseAmount = Math.round(deposit.amount * 100) / 100;
        user.balance = Math.round((user.balance + preciseAmount) * 100) / 100;
        
        await user.save();
        // Log account statement for deposit
        await AccountStatement.create({
          userId: user._id,
          transaction: bonus > 0 ? 'Deposit Approved (First Deposit Bonus Pending)' : 'Deposit Approved',
          event: 'Deposit',
          marketType: 'Wallet',
          gameType: 'Deposit',
          betAmount: preciseAmount,
          payout: 0,
          result: 'credit',
          credit: preciseAmount,
          closeBalance: user.balance,
          transactionId: deposit._id.toString()
        });
      }
    }

    deposit.status = status;
    if (adminReason) deposit.adminReason = adminReason;
    await deposit.save();
    res.json({ success: true, deposit });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// 7. User: Get own deposit requests
app.get('/api/deposit-requests', authenticateToken, async (req, res) => {
  try {
    const deposits = await DepositRequest.find({ user: req.user.userId });
    res.json({ success: true, deposits });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ================= Withdrawal Accounts =================
// Add a withdrawal account (max 3)
app.post('/api/accounts', authenticateToken, async (req, res) => {
  try {
    const { name, accountNumber, ifsc, mobile, withdrawPassword } = req.body;
    if (!name || !accountNumber || !ifsc || !mobile) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.withdrawalAccounts.length >= 3) {
      return res.status(400).json({ success: false, message: 'Maximum 3 accounts allowed' });
    }
    user.withdrawalAccounts.push({ name, accountNumber, ifsc, mobile, withdrawPassword });
    await user.save();
    res.json({ success: true, accounts: user.withdrawalAccounts });
  } catch (err) {
    console.error('Add account error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// List withdrawal accounts
app.get('/api/accounts', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, accounts: user.withdrawalAccounts });
  } catch (err) {
    console.error('List accounts error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete withdrawal account
app.delete('/api/accounts/:index', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (isNaN(index) || index < 0 || index >= user.withdrawalAccounts.length) {
      return res.status(400).json({ success: false, message: 'Invalid account index' });
    }
    user.withdrawalAccounts.splice(index, 1);
    await user.save();
    res.json({ success: true, accounts: user.withdrawalAccounts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Edit withdrawal account
app.put('/api/accounts/:index', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const { name, accountNumber, ifsc, mobile, withdrawPassword } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (isNaN(index) || index < 0 || index >= user.withdrawalAccounts.length) {
      return res.status(400).json({ success: false, message: 'Invalid account index' });
    }
    if (!name || !accountNumber || !ifsc || !mobile) {
      return res.status(400).json({ success: false, message: 'All fields except password are required' });
    }
    user.withdrawalAccounts[index] = { name, accountNumber, ifsc, mobile, withdrawPassword };
    await user.save();
    res.json({ success: true, accounts: user.withdrawalAccounts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ================= Withdrawals =================
// Create withdrawal request
app.post('/api/withdraw', authenticateToken, async (req, res) => {
  try {
    const { accountIndex, amount, withdrawPassword } = req.body;
    console.log('--- WITHDRAW REQUEST ---');
    console.log('Payload:', req.body);
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log('User balance:', user.balance);
    console.log('User withdrawalAccounts:', user.withdrawalAccounts);
    if (typeof accountIndex !== 'number' || typeof amount !== 'number' || amount < 200) {
      console.log('Invalid input');
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹200' });
    }
    if (!user.withdrawalAccounts[accountIndex]) {
      console.log('Invalid account selected');
      return res.status(400).json({ success: false, message: 'Invalid account selected' });
    }
    if (user.balance < amount) {
      console.log('Insufficient balance');
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }
    // Optional: check withdrawPassword
    if (user.withdrawalAccounts[accountIndex].withdrawPassword && user.withdrawalAccounts[accountIndex].withdrawPassword !== withdrawPassword) {
      console.log('Incorrect withdraw password');
      return res.status(400).json({ success: false, message: 'Incorrect withdraw password' });
    }
    // Debit balance and create request
    user.balance -= amount;
    await user.save();
    const account = user.withdrawalAccounts[accountIndex];
    const withdrawal = new WithdrawalRequest({
      user: user._id,
      amount,
      account: {
        name: account.name,
        accountNumber: account.accountNumber,
        ifsc: account.ifsc,
        mobile: account.mobile
      },
      status: 'pending'
    });
    await withdrawal.save();
    // Log in account statement
    await AccountStatement.create({
      userId: user._id,
      transaction: 'Withdrawal Request',
      event: 'Withdrawal',
      marketType: 'Wallet',
      gameType: 'Withdrawal',
      betAmount: amount,
      payout: 0,
      result: 'pending',
      credit: -amount,
      closeBalance: user.balance,
      transactionId: withdrawal._id.toString()
    });
    res.json({ success: true, message: 'Withdrawal request submitted', withdrawal });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ================= Account Statement =================
app.get('/api/account-statement', authenticateToken, async (req, res) => {
  try {
    const statements = await AccountStatement.find({ userId: req.user.userId }).sort({ date: -1 });
    res.json({ success: true, statements });
  } catch (err) {
    console.error('Account statement error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ================= Admin: Withdrawal Requests =================
// List all withdrawal requests
app.get('/api/admin/withdrawals', adminAuth, async (req, res) => {
  try {
    const withdrawals = await WithdrawalRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, withdrawals });
  } catch (err) {
    console.error('Admin list withdrawals error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Approve withdrawal
app.post('/api/admin/withdrawals/:id/approve', adminAuth, async (req, res) => {
  try {
    const withdrawal = await WithdrawalRequest.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Request not found' });
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }
    withdrawal.status = 'approved';
    withdrawal.updatedAt = new Date();
    await withdrawal.save();
    // Update account statement
    await AccountStatement.updateOne(
      { transactionId: withdrawal._id.toString() },
      { $set: { result: 'approved' } }
    );
    // Emit real-time event for user and admin
    io.emit('withdrawal:update', withdrawal);
    res.json({ success: true, message: 'Withdrawal approved' });
  } catch (err) {
    console.error('Admin approve withdrawal error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reject withdrawal
app.post('/api/admin/withdrawals/:id/reject', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const withdrawal = await WithdrawalRequest.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Request not found' });
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }
    withdrawal.status = 'rejected';
    withdrawal.rejectionReason = reason || '';
    withdrawal.updatedAt = new Date();
    await withdrawal.save();
    // Refund user
    const user = await User.findById(withdrawal.user);
    if (user) {
      user.balance += withdrawal.amount;
      await user.save();
      // Log refund in account statement
      await AccountStatement.create({
        userId: user._id,
        transaction: 'Withdrawal Refund',
        event: 'Withdrawal',
        marketType: 'Wallet',
        gameType: 'Withdrawal',
        betAmount: 0,
        payout: withdrawal.amount,
        result: 'rejected',
        credit: withdrawal.amount,
        closeBalance: user.balance,
        transactionId: withdrawal._id.toString()
      });
    }
    // Update original statement
    await AccountStatement.updateOne(
      { transactionId: withdrawal._id.toString() },
      { $set: { result: 'rejected' } }
    );
    // Emit real-time event for user and admin
    io.emit('withdrawal:update', withdrawal);
    res.json({ success: true, message: 'Withdrawal rejected and refunded' });
  } catch (err) {
    console.error('Admin reject withdrawal error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ================= Mines Game =================
// Start a new mines game
async function getRecentWinRate(userId, limit = 20) {
  const games = await MinesGame.find({ userId, isActive: false }).sort({ createdAt: -1 }).limit(limit);
  const wins = games.filter(g => g.result === 'win').length;
  return games.length > 0 ? wins / games.length : 0;
}

// Helper: Detect anti-pattern (repeating last N tile clicks)
async function detectAntiPattern(userId, newReveals, threshold = 3) {
  const pastGames = await MinesGame.find({ userId }).sort({ createdAt: -1 }).limit(10);
  const pastTiles = pastGames.flatMap(g => g.revealedTiles);
  const repeated = newReveals.filter(t => pastTiles.includes(t));
  return repeated.length >= threshold;
}

// Helper: Validate mines game balance consistency
async function validateMinesGameBalance(userId, gameId, expectedBalance) {
  try {
    const user = await User.findById(userId);
    const game = await MinesGame.findById(gameId);
    const statement = await AccountStatement.findOne({ 
      userId, 
      transactionId: gameId.toString() 
    });
    
    if (!user || !game || !statement) {
      console.error(`[BALANCE VALIDATION] Missing data for userId=${userId} gameId=${gameId}`);
      return false;
    }
    
    // Check if balance matches expected value
    if (Math.abs(user.balance - expectedBalance) > 0.01) {
      console.error(`[BALANCE VALIDATION] Balance mismatch for userId=${userId} gameId=${gameId}`);
      console.error(`Expected: ${expectedBalance}, Actual: ${user.balance}`);
      return false;
    }
    
    // Check if account statement credit matches game bet/payout
    if (game.result === 'win') {
      const expectedCredit = game.payout - game.bet;
      if (Math.abs(statement.credit - expectedCredit) > 0.01) {
        console.error(`[BALANCE VALIDATION] Credit mismatch for win game userId=${userId} gameId=${gameId}`);
        console.error(`Expected credit: ${expectedCredit}, Actual: ${statement.credit}`);
        return false;
      }
    } else if (game.result === 'loss') {
      if (Math.abs(statement.credit - (-game.bet)) > 0.01) {
        console.error(`[BALANCE VALIDATION] Credit mismatch for loss game userId=${userId} gameId=${gameId}`);
        console.error(`Expected credit: ${-game.bet}, Actual: ${statement.credit}`);
        return false;
      }
    }
    
    console.log(`[BALANCE VALIDATION] ✅ Valid for userId=${userId} gameId=${gameId}`);
    return true;
  } catch (err) {
    console.error(`[BALANCE VALIDATION] Error validating balance:`, err);
    return false;
  }
}

// --- Mines Game: Start ---
app.post('/api/mines/start', authenticateToken, async (req, res) => {
  try {
    const { bet, minesCount, clientSeed } = req.body;
    // Validate input
    if (!bet || !minesCount || !clientSeed) {
      return res.status(400).json({ success: false, message: 'Missing parameters: bet, minesCount, and clientSeed are required' });
    }
    if (typeof bet !== 'number' || bet <= 0) {
      return res.status(400).json({ success: false, message: 'Bet amount must be a positive number' });
    }
    if (typeof minesCount !== 'number' || minesCount < 1 || minesCount > 24) {
      return res.status(400).json({ success: false, message: 'Mines count must be between 1 and 24' });
    }
    if (typeof clientSeed !== 'string' || clientSeed.length < 1) {
      return res.status(400).json({ success: false, message: 'Client seed must be a non-empty string' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.balance < bet) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }
    const balanceBefore = user.balance;
    // Deduct bet ONCE
    user.balance -= bet;
    await user.save();
    const serverSeed = generateServerSeed();
    const nonce = Date.now();
    const gameHash = crypto.createHash('sha256').update(serverSeed + clientSeed + nonce.toString()).digest('hex');
    // --- Anti-Pattern Detection & Mine Placement ---
    let minePositions;
    const winRate = await getRecentWinRate(user._id);
    const dynamicEdge = Math.min(0.05, 0.02 + (winRate * 0.03));
    let riskyTiles = [];
    if (winRate > 0.55) {
      const pastGames = await MinesGame.find({ userId: user._id, isActive: false }).sort({ createdAt: -1 }).limit(5);
      const previousMoves = pastGames.flatMap(g => g.revealedTiles).slice(-5);
      riskyTiles = require('./utils/minesGame').detectPlayerPattern(previousMoves);
      minePositions = generateMinePositions(serverSeed, clientSeed, nonce, minesCount, riskyTiles);
    } else {
      minePositions = generateMinePositions(serverSeed, clientSeed, nonce, minesCount);
    }
    // --- End Anti-Pattern Section ---
    const game = new MinesGame({
      userId: user._id,
      bet,
      minesCount,
      minePositions,
      serverSeed,
      clientSeed,
      nonce,
      gameHash,
      dynamicEdge
    });
    await game.save();
    // Create account statement for bet (result: 'active')
    await AccountStatement.create({
      userId: user._id,
      transaction: 'Mines Game Bet',
      event: 'Mines',
      marketType: 'Casino',
      gameType: 'Mines',
      betAmount: bet,
      payout: 0,
      result: 'active',
      credit: -bet,
      closeBalance: user.balance,
      transactionId: game._id.toString()
    });
    // Log for debugging
    console.log(`[MINES START] userId=${user._id} balance_before=${balanceBefore} balance_after=${user.balance} bet=${bet} gameId=${game._id}`);
    res.json({
      success: true,
      game: {
        id: game._id,
        bet: game.bet,
        minesCount: game.minesCount,
        isActive: game.isActive,
        gameHash: game.gameHash,
        clientSeed: game.clientSeed
      },
      balance: user.balance,
      nextMultipliers: Array.from({ length: 25 }, (_, i) => calculateMultiplier(game.minesCount, i + 1, dynamicEdge)),
      mineRiskPercent: (game.minesCount / 25) * 100,
      gemsLeft: 25 - game.minesCount
    });
  } catch (err) {
    console.error('Mines start error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- Mines Game: Reveal (Loss) ---
app.post('/api/mines/reveal', authenticateToken, async (req, res) => {
  try {
    const { gameId, tileIndex } = req.body;
    if (!gameId || tileIndex === undefined || tileIndex < 0 || tileIndex > 24) {
      return res.status(400).json({ success: false, message: 'Invalid tile index' });
    }
    const game = await MinesGame.findById(gameId);
    if (!game || game.userId.toString() !== req.user.userId || !game.isActive) {
      return res.status(400).json({ success: false, message: 'Game not found or not active' });
    }
    if (game.revealedTiles.includes(tileIndex)) {
      return res.status(400).json({ success: false, message: 'Tile already revealed' });
    }
    const result = revealTile(game, tileIndex, game.dynamicEdge);
    await game.save();
    let bonusReleased = false;
    if (result.result === 'loss') {
      game.isActive = false;
      await game.save();
      // Call handleBonusProgress for finalized loss
      const user = await User.findById(game.userId);
      if (user) {
        bonusReleased = await handleBonusProgress(user, game.bet);
      }
      // Do NOT update or create any account statement on loss
      console.log(`[MINES REVEAL] LOSS userId=${game.userId} gameId=${game._id} (no statement update)`);
    }
    const gemsLeft = 25 - game.minesCount - game.revealedTiles.length;
    const mineRiskPercent = game.minesCount / (25 - game.revealedTiles.length) * 100;
    const response = {
      success: true,
      result: result.result,
      tile: tileIndex,
      multiplier: result.multiplier,
      potentialPayout: result.payout,
      gemsLeft: gemsLeft,
      mineRiskPercent: mineRiskPercent,
      game: {
        id: game._id,
        isActive: game.isActive,
        revealedTiles: game.revealedTiles
      },
      bonusReleased
    };
    if (result.result === 'loss') {
      response.game.minePositions = game.minePositions;
      response.game.serverSeed = game.serverSeed;
    }
    res.json(response);
  } catch (err) {
    console.error('Mines reveal error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- Mines Game: Cashout (Win) ---
app.post('/api/mines/cashout', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.body;
    if (!gameId) {
      const user = await User.findById(req.user.userId);
      return res.status(400).json({ success: false, message: 'Game ID is required', balance: user ? user.balance : 0 });
    }
    const game = await MinesGame.findById(gameId);
    if (!game) {
      const user = await User.findById(req.user.userId);
      return res.status(400).json({ success: false, message: 'Game not found', balance: user ? user.balance : 0 });
    }
    if (game.userId.toString() !== req.user.userId) {
      const user = await User.findById(req.user.userId);
      return res.status(403).json({ success: false, message: 'You do not own this game', balance: user ? user.balance : 0 });
    }
    if (!game.isActive) {
      const user = await User.findById(req.user.userId);
      return res.status(400).json({ success: false, message: 'Game is not active', balance: user ? user.balance : 0 });
    }
    if (game.revealedTiles.length === 0) {
      const user = await User.findById(req.user.userId);
      return res.status(400).json({ success: false, message: 'Must reveal at least one tile before cashing out', balance: user ? user.balance : 0 });
    }
    let result;
    try {
      result = cashOut(game, game.dynamicEdge);
    } catch (err) {
      const user = await User.findById(req.user.userId);
      console.error('Mines cashout error (cashOut threw):', err, 'gameId:', gameId, 'userId:', req.user.userId);
      return res.status(400).json({ success: false, message: err.message || 'Failed to cashout', balance: user ? user.balance : 0 });
    }
    await game.save();
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', balance: 0 });
    }
    // Credit payout to user.balance
    user.balance += result.payout;
    await user.save();
    // Update the original account statement (from game start) to reflect win
    await AccountStatement.updateOne({ transactionId: game._id.toString() }, {
      $set: {
        result: 'win',
        payout: result.payout,
        credit: result.payout - game.bet, // Net gain (payout - original bet)
        closeBalance: user.balance,
        event: 'Mines',
        marketType: 'Casino',
        gameType: 'Mines'
      }
    });
    // Call handleBonusProgress for finalized win
    const bonusReleased = await handleBonusProgress(user, game.bet);
    // Log for debugging
    console.log(`[MINES CASHOUT] WIN userId=${user._id} gameId=${game._id} bet=${game.bet} payout=${result.payout} netGain=${result.payout - game.bet}`);
    res.json({
      success: true,
      result: 'win',
      payout: result.payout,
      multiplier: result.multiplier,
      balance: user.balance,
      game: {
        id: game._id,
        isActive: false,
        revealedTiles: game.revealedTiles
      },
      bonusReleased
    });
  } catch (err) {
    const user = await User.findById((req.user && req.user.userId) ? req.user.userId : null);
    console.error('Mines cashout error (outer catch):', err, 'body:', req.body, 'userId:', req.user ? req.user.userId : null);
    res.status(500).json({ success: false, message: 'Server error', balance: user ? user.balance : 0 });
  }
});

// Get user's active games
app.get('/api/mines/active', authenticateToken, async (req, res) => {
  try {
    const games = await MinesGame.find({
      userId: req.user.userId,
      isActive: true
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      games: games.map(game => ({
        id: game._id,
        bet: game.bet,
        minesCount: game.minesCount,
        revealedTiles: game.revealedTiles,
        multiplier: calculateMultiplier(game.minesCount, game.revealedTiles.length),
        createdAt: game.createdAt
      }))
    });
    
  } catch (err) {
    console.error('Mines active games error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's game history
app.get('/api/mines/history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const games = await MinesGame.find({
      userId: req.user.userId,
      isActive: false
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    const total = await MinesGame.countDocuments({
      userId: req.user.userId,
      isActive: false
    });
    
    res.json({
      success: true,
      games: games.map(game => ({
        id: game._id,
        bet: game.bet,
        minesCount: game.minesCount,
        result: game.result,
        payout: game.payout,
        multiplier: game.multiplier,
        revealedTiles: game.revealedTiles,
        minePositions: game.minePositions,
        serverSeed: game.serverSeed,
        clientSeed: game.clientSeed,
        nonce: game.nonce,
        gameHash: game.gameHash,
        createdAt: game.createdAt,
        endedAt: game.endedAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (err) {
    console.error('Mines history error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Verify game fairness
app.post('/api/mines/verify', async (req, res) => {
  try {
    const { serverSeed, clientSeed, nonce, minePositions } = req.body;
    
    if (!serverSeed || !clientSeed || nonce === undefined || !minePositions) {
      return res.status(400).json({ success: false, message: 'All parameters are required' });
    }
    
    const isValid = verifyGameFairness(serverSeed, clientSeed, nonce, minePositions);
    
    res.json({
      success: true,
      isValid,
      expectedMinePositions: generateMinePositions(serverSeed, clientSeed, nonce, minePositions.length)
    });
    
  } catch (err) {
    console.error('Mines verify error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Get mines game statistics
app.get('/api/admin/mines/stats', adminAuth, async (req, res) => {
  try {
    const games = await MinesGame.find({ isActive: false });
    const stats = getGameStats(games);
    
    res.json({
      success: true,
      stats
    });
    
  } catch (err) {
    console.error('Admin mines stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// User: Get personal mines game statistics
app.get('/api/mines/stats', authenticateToken, async (req, res) => {
  try {
    const games = await MinesGame.find({ 
      userId: req.user.userId, 
      isActive: false 
    }).sort({ createdAt: -1 });
    
    const totalGames = games.length;
    const wins = games.filter(g => g.result === 'win').length;
    const losses = games.filter(g => g.result === 'loss').length;
    const winRate = totalGames > 0 ? (wins / totalGames * 100).toFixed(2) : 0;
    
    const totalBet = games.reduce((sum, g) => sum + g.bet, 0);
    const totalPayout = games.filter(g => g.result === 'win').reduce((sum, g) => sum + g.payout, 0);
    const netProfit = totalPayout - totalBet;
    
    const avgBet = totalGames > 0 ? (totalBet / totalGames).toFixed(2) : 0;
    const avgPayout = wins > 0 ? (totalPayout / wins).toFixed(2) : 0;
    
    res.json({
      success: true,
      stats: {
        totalGames,
        wins,
        losses,
        winRate: parseFloat(winRate),
        totalBet,
        totalPayout,
        netProfit,
        avgBet: parseFloat(avgBet),
        avgPayout: parseFloat(avgPayout)
      }
    });
    
  } catch (err) {
    console.error('User mines stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ================= MINES AUTO MODE ENDPOINTS =================

// --- Mines Auto Mode: Get Settings ---
app.get('/api/mines/auto/settings', authenticateToken, async (req, res) => {
  try {
    let autoMode = await MinesAutoMode.findOne({ userId: req.user.userId });
    
    if (!autoMode) {
      // Create default settings if none exist
      autoMode = new MinesAutoMode({
        userId: req.user.userId,
        betAmount: 100,
        minesCount: 3,
        tilesToReveal: 3,
        stopAfterBets: null,
        stopOnProfit: null,
        stopOnLoss: null
      });
      await autoMode.save();
    }
    
    res.json({
      success: true,
      settings: {
        isActive: autoMode.isActive,
        betAmount: autoMode.betAmount,
        minesCount: autoMode.minesCount,
        tilesToReveal: autoMode.tilesToReveal,
        stopAfterBets: autoMode.stopAfterBets,
        stopOnProfit: autoMode.stopOnProfit,
        stopOnLoss: autoMode.stopOnLoss,
        selectedTiles: autoMode.selectedTiles || [],
        status: autoMode.status,
        stopReason: autoMode.stopReason,
        betsPlaced: autoMode.betsPlaced,
        totalProfit: autoMode.totalProfit,
        startingBalance: autoMode.startingBalance,
        currentBalance: autoMode.currentBalance,
        startedAt: autoMode.startedAt,
        stoppedAt: autoMode.stoppedAt
      }
    });
  } catch (err) {
    console.error('Mines auto mode settings error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- Mines Auto Mode: Update Settings ---
app.post('/api/mines/auto/settings', authenticateToken, async (req, res) => {
  try {
    const {
      betAmount,
      minesCount,
      tilesToReveal,
      stopAfterBets,
      stopOnProfit,
      stopOnLoss,
      selectedTiles
    } = req.body;
    
    // Validate input
    if (!betAmount || !minesCount || !tilesToReveal) {
      return res.status(400).json({ success: false, message: 'betAmount, minesCount, and tilesToReveal are required' });
    }
    
    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({ success: false, message: 'betAmount must be a positive number' });
    }
    
    if (typeof minesCount !== 'number' || minesCount < 1 || minesCount > 24) {
      return res.status(400).json({ success: false, message: 'minesCount must be between 1 and 24' });
    }
    
    if (typeof tilesToReveal !== 'number' || tilesToReveal < 1 || tilesToReveal > 25) {
      return res.status(400).json({ success: false, message: 'tilesToReveal must be between 1 and 25' });
    }
    
    if (tilesToReveal + minesCount > 25) {
      return res.status(400).json({ success: false, message: 'tilesToReveal + minesCount cannot exceed 25' });
    }
    
    // Validate stop conditions
    if (stopAfterBets !== null && (typeof stopAfterBets !== 'number' || stopAfterBets < 1)) {
      return res.status(400).json({ success: false, message: 'stopAfterBets must be null or a positive number' });
    }
    
    if (stopOnProfit !== null && (typeof stopOnProfit !== 'number' || stopOnProfit < 0)) {
      return res.status(400).json({ success: false, message: 'stopOnProfit must be null or a non-negative number' });
    }
    
    if (stopOnLoss !== null && (typeof stopOnLoss !== 'number' || stopOnLoss < 0)) {
      return res.status(400).json({ success: false, message: 'stopOnLoss must be null or a non-negative number' });
    }
    
    let autoMode = await MinesAutoMode.findOne({ userId: req.user.userId });
    
    if (!autoMode) {
      autoMode = new MinesAutoMode({ userId: req.user.userId });
    }
    
    // Update settings
    autoMode.betAmount = betAmount;
    autoMode.minesCount = minesCount;
    autoMode.tilesToReveal = tilesToReveal;
    autoMode.stopAfterBets = stopAfterBets;
    autoMode.stopOnProfit = stopOnProfit;
    autoMode.stopOnLoss = stopOnLoss;
    autoMode.selectedTiles = selectedTiles || [];
    
    await autoMode.save();
    
    res.json({
      success: true,
      message: 'Auto mode settings updated successfully'
    });
  } catch (err) {
    console.error('Mines auto mode settings update error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- Mines Auto Mode: Start ---
app.post('/api/mines/auto/start', authenticateToken, async (req, res) => {
  try {
    console.log('[AUTO START] Request received:', { userId: req.user.userId, body: req.body });
    
    const { betAmount, minesCount, selectedTiles, tilesToReveal } = req.body;
    
    // Validate all required fields
    if (!betAmount || typeof betAmount !== 'number' || betAmount <= 0) {
      console.log('[AUTO START] Invalid betAmount:', betAmount);
      return res.status(400).json({ success: false, message: 'Invalid bet amount' });
    }
    
    if (!minesCount || typeof minesCount !== 'number' || minesCount < 1 || minesCount > 24) {
      console.log('[AUTO START] Invalid minesCount:', minesCount);
      return res.status(400).json({ success: false, message: 'Invalid mines count' });
    }
    
    if (!Array.isArray(selectedTiles) || selectedTiles.length === 0) {
      console.log('[AUTO START] Invalid selectedTiles:', selectedTiles);
      return res.status(400).json({ success: false, message: 'Selected tiles must be a non-empty array' });
    }
    
    if (!tilesToReveal || typeof tilesToReveal !== 'number' || tilesToReveal < 1 || tilesToReveal > (25 - minesCount)) {
      console.log('[AUTO START] Invalid tilesToReveal:', tilesToReveal);
      return res.status(400).json({ success: false, message: 'Invalid tiles to reveal' });
    }
    
    // Validate selected tiles
    if (selectedTiles.some(tile => tile < 0 || tile > 24)) {
      console.log('[AUTO START] Invalid tile selection:', selectedTiles);
      return res.status(400).json({ success: false, message: 'Invalid tile selection' });
    }
    
    // Get user
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.log('[AUTO START] User not found:', req.user.userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check balance
    if (user.balance < betAmount) {
      console.log('[AUTO START] Insufficient balance:', { balance: user.balance, betAmount });
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }
    
    // Check if auto mode is already running
    let autoMode = await MinesAutoMode.findOne({ userId: req.user.userId });
    if (autoMode && autoMode.isActive) {
      console.log('[AUTO START] Auto mode already running for user:', req.user.userId);
      return res.status(400).json({ success: false, message: 'Auto mode is already running' });
    }
    
    // Create or update auto mode settings
    if (!autoMode) {
      autoMode = new MinesAutoMode({
        userId: req.user.userId,
        betAmount,
        minesCount,
        tilesToReveal,
        selectedTiles,
        isActive: true,
        status: 'running',
        betsPlaced: 0,
        totalProfit: 0,
        startingBalance: user.balance,
        currentBalance: user.balance,
        startedAt: new Date(),
        gamesPlayed: []
      });
    } else {
      autoMode.betAmount = betAmount;
      autoMode.minesCount = minesCount;
      autoMode.tilesToReveal = tilesToReveal;
      autoMode.selectedTiles = selectedTiles;
      autoMode.isActive = true;
      autoMode.status = 'running';
      autoMode.betsPlaced = 0;
      autoMode.totalProfit = 0;
      autoMode.startingBalance = user.balance;
      autoMode.currentBalance = user.balance;
      autoMode.startedAt = new Date();
      autoMode.stoppedAt = null;
      autoMode.stopReason = null;
      autoMode.gamesPlayed = [];
      autoMode.lastGameId = null;
    }
    
    await autoMode.save();
    console.log('[AUTO START] Auto mode started successfully for user:', req.user.userId);
    
    res.json({
      success: true,
      message: 'Auto mode started successfully',
      settings: {
        isActive: autoMode.isActive,
        status: autoMode.status,
        betAmount: autoMode.betAmount,
        minesCount: autoMode.minesCount,
        tilesToReveal: autoMode.tilesToReveal,
        selectedTiles: autoMode.selectedTiles
      }
    });
    
  } catch (err) {
    console.error('[AUTO START ERROR]', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// --- Mines Auto Mode: Continue ---
app.post('/api/mines/auto/continue', authenticateToken, async (req, res) => {
  try {
    console.log('[AUTO CONTINUE] Request received for user:', req.user.userId);
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const autoMode = await MinesAutoMode.findOne({ userId: req.user.userId });
    if (!autoMode || !autoMode.isActive) {
      return res.status(400).json({ success: false, message: 'Auto mode is not running' });
    }
    
    // Check stop conditions
    const shouldContinue = await checkAutoModeConditions(autoMode, user);
    if (!shouldContinue.continue) {
      // Stop auto mode
      autoMode.isActive = false;
      autoMode.status = 'stopped';
      autoMode.stoppedAt = new Date();
      autoMode.stopReason = shouldContinue.reason;
      await autoMode.save();
      
      console.log('[AUTO CONTINUE] Auto mode stopped:', shouldContinue.reason);
      return res.json({
        success: true,
        message: `Auto mode stopped: ${shouldContinue.reason}`,
        stopped: true,
        reason: shouldContinue.reason
      });
    }
    
    // Execute next game
    const gameResult = await executeAutoModeGame(autoMode, user);
    
    res.json({
      success: true,
      gameResult,
      settings: {
        isActive: autoMode.isActive,
        status: autoMode.status,
        betsPlaced: autoMode.betsPlaced,
        totalProfit: autoMode.totalProfit,
        startingBalance: autoMode.startingBalance,
        currentBalance: autoMode.currentBalance
      }
    });
    
  } catch (err) {
    console.error('[AUTO CONTINUE ERROR]', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// --- Mines Auto Mode: Stop ---
app.post('/api/mines/auto/stop', authenticateToken, async (req, res) => {
  try {
    console.log('[AUTO STOP] Request received for user:', req.user.userId);
    
    const autoMode = await MinesAutoMode.findOne({ userId: req.user.userId });
    if (!autoMode) {
      return res.status(404).json({ success: false, message: 'Auto mode not found' });
    }
    
    autoMode.isActive = false;
    autoMode.status = 'stopped';
    autoMode.stoppedAt = new Date();
    autoMode.stopReason = 'manual';
    await autoMode.save();
    
    console.log('[AUTO STOP] Auto mode stopped for user:', req.user.userId);
    
    res.json({
      success: true,
      message: 'Auto mode stopped successfully',
      settings: {
        isActive: autoMode.isActive,
        status: autoMode.status,
        betsPlaced: autoMode.betsPlaced,
        totalProfit: autoMode.totalProfit,
        startingBalance: autoMode.startingBalance,
        currentBalance: autoMode.currentBalance,
        stopReason: autoMode.stopReason
      }
    });
    
  } catch (err) {
    console.error('[AUTO STOP ERROR]', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// --- Mines Auto Mode: Get Settings ---
app.get('/api/mines/auto/settings', authenticateToken, async (req, res) => {
  try {
    const autoMode = await MinesAutoMode.findOne({ userId: req.user.userId });
    if (!autoMode) {
      return res.json({
        success: true,
        settings: {
          isActive: false,
          status: 'stopped',
          betAmount: 100,
          minesCount: 3,
          tilesToReveal: 3,
          selectedTiles: [],
          betsPlaced: 0,
          totalProfit: 0,
          startingBalance: 0,
          currentBalance: 0
        }
      });
    }
    
    res.json({
      success: true,
      settings: {
        isActive: autoMode.isActive,
        status: autoMode.status,
        betAmount: autoMode.betAmount,
        minesCount: autoMode.minesCount,
        tilesToReveal: autoMode.tilesToReveal,
        selectedTiles: autoMode.selectedTiles || [],
        betsPlaced: autoMode.betsPlaced,
        totalProfit: autoMode.totalProfit,
        startingBalance: autoMode.startingBalance,
        currentBalance: autoMode.currentBalance,
        stopReason: autoMode.stopReason,
        startedAt: autoMode.startedAt,
        stoppedAt: autoMode.stoppedAt
      }
    });
    
  } catch (err) {
    console.error('[AUTO SETTINGS ERROR]', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// --- Mines Auto Mode: Get Status ---
app.get('/api/mines/auto/status', authenticateToken, async (req, res) => {
  try {
    const autoMode = await MinesAutoMode.findOne({ userId: req.user.userId });
    if (!autoMode) {
      return res.json({
        success: true,
        settings: {
          isActive: false,
          status: 'stopped',
          betsPlaced: 0,
          totalProfit: 0,
          startingBalance: 0,
          currentBalance: 0,
          gamesPlayed: []
        }
      });
    }
    
    res.json({
      success: true,
      settings: {
        isActive: autoMode.isActive,
        status: autoMode.status,
        betsPlaced: autoMode.betsPlaced,
        totalProfit: autoMode.totalProfit,
        startingBalance: autoMode.startingBalance,
        currentBalance: autoMode.currentBalance,
        stopReason: autoMode.stopReason,
        startedAt: autoMode.startedAt,
        stoppedAt: autoMode.stoppedAt,
        gamesPlayed: autoMode.gamesPlayed || []
      }
    });
    
  } catch (err) {
    console.error('[AUTO STATUS ERROR]', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Helper function to execute a single auto mode game
async function executeAutoModeGame(autoMode, user) {
  try {
    console.log('[AUTO GAME] Starting game for user:', user._id);
    
    // Generate client seed for this game
    const clientSeed = Math.random().toString(36).substring(2, 15);
    
    // Start the game
    const balanceBefore = user.balance;
    user.balance -= autoMode.betAmount;
    await user.save();
    
    const serverSeed = generateServerSeed();
    const nonce = Date.now();
    const gameHash = crypto.createHash('sha256').update(serverSeed + clientSeed + nonce.toString()).digest('hex');
    
    // Generate mine positions
    const winRate = await getRecentWinRate(user._id);
    const dynamicEdge = Math.min(0.05, 0.02 + (winRate * 0.03));
    const minePositions = generateMinePositions(serverSeed, clientSeed, nonce, autoMode.minesCount);
    
    // Create game
    const game = new MinesGame({
      userId: user._id,
      bet: autoMode.betAmount,
      minesCount: autoMode.minesCount,
      minePositions,
      serverSeed,
      clientSeed,
      nonce,
      gameHash,
      dynamicEdge
    });
    await game.save();
    
    // Create account statement
    await AccountStatement.create({
      userId: user._id,
      transaction: 'Mines Auto Mode Bet',
      event: 'Mines',
      marketType: 'Casino',
      gameType: 'Mines',
      betAmount: autoMode.betAmount,
      payout: 0,
      result: 'active',
      credit: -autoMode.betAmount,
      closeBalance: user.balance,
      transactionId: game._id.toString()
    });
    
    // Reveal tiles automatically using selected tiles
    const tilesToReveal = Math.min(autoMode.tilesToReveal, 25 - autoMode.minesCount);
    const selectedTiles = autoMode.selectedTiles.slice(0, tilesToReveal);
    
    for (let i = 0; i < selectedTiles.length; i++) {
      const tileIndex = selectedTiles[i];
      
      // Reveal tile
      const result = revealTile(game, tileIndex, dynamicEdge);
      if (result.result === 'loss') {
        // Hit a mine - game over
        game.isActive = false;
        await game.save();
        
        // Update account statement
        await AccountStatement.updateOne(
          { transactionId: game._id.toString() },
          { $set: { result: 'loss', payout: 0, credit: -autoMode.betAmount, closeBalance: user.balance } }
        );
        
        // Update auto mode stats
        autoMode.betsPlaced++;
        autoMode.totalProfit -= autoMode.betAmount;
        autoMode.currentBalance = user.balance;
        autoMode.gamesPlayed.push({
          gameId: game._id,
          bet: autoMode.betAmount,
          result: 'loss',
          payout: 0,
          multiplier: 0,
          tilesRevealed: i + 1
        });
        autoMode.lastGameId = game._id;
        await autoMode.save();
        
        // Handle bonus progress
        await handleBonusProgress(user, autoMode.betAmount);
        
        console.log('[AUTO GAME] Game lost - mine hit at tile:', tileIndex);
        return {
          result: 'loss',
          gameId: game._id,
          bet: autoMode.betAmount,
          payout: 0,
          multiplier: 0,
          tilesRevealed: i + 1
        };
      }
    }
    
    // All tiles revealed successfully - cashout
    const cashoutResult = cashOut(game, dynamicEdge);
    user.balance += cashoutResult.payout;
    await user.save();
    
    // Update account statement
    await AccountStatement.updateOne(
      { transactionId: game._id.toString() },
      {
        $set: {
          result: 'win',
          payout: cashoutResult.payout,
          credit: cashoutResult.payout - autoMode.betAmount,
          closeBalance: user.balance
        }
      }
    );
    
    // Update auto mode stats
    autoMode.betsPlaced++;
    autoMode.totalProfit += (cashoutResult.payout - autoMode.betAmount);
    autoMode.currentBalance = user.balance;
    autoMode.gamesPlayed.push({
      gameId: game._id,
      bet: autoMode.betAmount,
      result: 'win',
      payout: cashoutResult.payout,
      multiplier: cashoutResult.multiplier,
      tilesRevealed: selectedTiles.length
    });
    autoMode.lastGameId = game._id;
    await autoMode.save();
    
    // Handle bonus progress
    await handleBonusProgress(user, autoMode.betAmount);
    
    console.log('[AUTO GAME] Game won - payout:', cashoutResult.payout);
    return {
      result: 'win',
      gameId: game._id,
      bet: autoMode.betAmount,
      payout: cashoutResult.payout,
      multiplier: cashoutResult.multiplier,
      tilesRevealed: selectedTiles.length
    };
    
  } catch (err) {
    console.error('[AUTO GAME ERROR]', err);
    throw err;
  }
}

// Helper function to check auto mode stop conditions
async function checkAutoModeConditions(autoMode, user) {
  // Check if user has enough balance
  if (user.balance < autoMode.betAmount) {
    return { continue: false, reason: 'insufficient_balance' };
  }
  
  // Check stop after bets
  if (autoMode.stopAfterBets && autoMode.betsPlaced >= autoMode.stopAfterBets) {
    return { continue: false, reason: 'stop_after_bets' };
  }
  
  // Check upper balance boundary
  if (autoMode.stopOnProfit && user.balance >= autoMode.stopOnProfit) {
    return { continue: false, reason: 'stop_on_profit' };
  }
  
  // Check lower balance boundary
  if (autoMode.stopOnLoss && user.balance <= autoMode.stopOnLoss) {
    return { continue: false, reason: 'stop_on_loss' };
  }
  
  return { continue: true };
}

// Admin: Get online users count and list
app.get('/api/admin/online-users', adminAuth, async (req, res) => {
  try {
    const onlineUsersList = Array.from(onlineUsers.values()).map(user => ({
      email: user.email,
      connectedAt: user.connectedAt
    }));
    
    res.json({
      success: true,
      count: onlineUsers.size,
      users: onlineUsersList
    });
    
  } catch (err) {
    console.error('Admin online users error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Database migration: Ensure all users have hasFirstDeposit field
async function migrateUserSchema() {
  try {
    const usersWithoutField = await User.find({ hasFirstDeposit: { $exists: false } });
    if (usersWithoutField.length > 0) {
      console.log(`Migrating ${usersWithoutField.length} users to add hasFirstDeposit field...`);
      await User.updateMany(
        { hasFirstDeposit: { $exists: false } },
        { $set: { hasFirstDeposit: false } }
      );
      console.log('✅ User schema migration completed');
    }
  } catch (err) {
    console.error('❌ User schema migration failed:', err);
  }
}

// Run migration on startup
migrateUserSchema();

async function getOrCreateTodayHouseStats() {
  const today = new Date().toISOString().slice(0, 10);
  let stats = await HouseStats.findOne({ date: today });
  if (!stats) {
    stats = await HouseStats.create({ date: today });
  }
  return stats;
}

// --- Health Check Endpoint ---
app.get('/api/health', async (req, res) => {
  try {
    // Check DB connection
    await mongoose.connection.db.admin().ping();
    res.json({ success: true, status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ success: false, status: 'error', db: 'disconnected', error: err.message });
  }
});

// --- Admin: Today's Profit & Loss Summary ---
app.get('/api/admin/today-profit-loss-summary', adminAuth, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const now = new Date();
    // Aggregate AccountStatement for today, group by user
    const summary = await AccountStatement.aggregate([
      { $match: { date: { $gte: startOfDay, $lt: now } } },
      { $group: {
        _id: '$userId',
        totalBets: { $sum: { $cond: [ { $gt: ['$betAmount', 0] }, '$betAmount', 0 ] } },
        totalWins: { $sum: { $cond: [ { $gt: ['$payout', 0] }, '$payout', 0 ] } },
        netResult: { $sum: { $subtract: [ { $cond: [ { $gt: ['$payout', 0] }, '$payout', 0 ] }, { $cond: [ { $gt: ['$betAmount', 0] }, '$betAmount', 0 ] } ] } },
        gamesPlayed: { $sum: 1 },
      }},
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      }},
      { $unwind: '$user' },
      { $project: {
        username: '$user.username',
        email: '$user.email',
        totalBets: 1,
        totalWins: 1,
        netResult: 1,
        status: { $cond: [ { $gte: ['$netResult', 0] }, 'Profit', 'Loss' ] },
        gamesPlayed: 1,
      }},
      { $sort: { netResult: -1 } }
    ]);
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// --- Admin: User's Today Statement ---
app.get('/api/admin/user-today-statement/:userId', adminAuth, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const now = new Date();
    const userId = req.params.userId;
    const statements = await AccountStatement.find({
      userId,
      date: { $gte: startOfDay, $lt: now }
    }).sort({ date: 1 });
    res.json({ success: true, statements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// --- Admin: Online Users with Game Info ---
app.get('/api/admin/online-users', adminAuth, async (req, res) => {
  try {
    // Only users active in last 2 minutes
    const now = Date.now();
    const activeUsers = Array.from(onlineUsers.entries())
      .filter(([_, info]) => info.lastActive && (now - info.lastActive < 2 * 60 * 1000))
      .map(([userId, info]) => ({
        userId,
        username: info.username || '',
        email: info.email,
        currentGame: info.currentGame || '',
        loginTime: info.connectedAt,
        ip: info.ip || '',
        lastActive: info.lastActive
      }));
    res.json({ success: true, users: activeUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// User: Submit support message
app.post('/api/support-message', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    const supportMessage = new SupportMessage({ name, email, message });
    await supportMessage.save();
    res.json({ success: true, message: 'Support message sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Admin: List all support messages
app.get('/api/admin/support-messages', adminAuth, async (req, res) => {
  try {
    const messages = await SupportMessage.find().sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Admin: Update support message status
app.patch('/api/admin/support-messages/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const message = await SupportMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Middleware to check site maintenance mode
// const AdminAviatorSettings = require('./models/AdminAviatorSettings');

async function maintenanceMiddleware(req, res, next) {
  // Allow admin login and admin routes
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/admin/login')) {
    return next();
  }
  // Allow static files and favicon
  if (req.path.startsWith('/favicon.ico') || req.path.startsWith('/static')) {
    return next();
  }
  // Check maintenance mode
  const settings = await AdminAviatorSettings.findOne();
  if (settings && settings.siteMaintenance) {
    return res.status(503).json({ success: false, message: 'Site is under maintenance.' });
  }
  next();
}

app.use(maintenanceMiddleware);

// Endpoint to get maintenance mode (admin only)
app.get('/api/admin/site-maintenance', async (req, res) => {
  const settings = await AdminAviatorSettings.findOne();
  res.json({ success: true, siteMaintenance: settings?.siteMaintenance || false });
});

// Endpoint to set maintenance mode (admin only)
app.post('/api/admin/site-maintenance', adminAuth, async (req, res) => {
  const { siteMaintenance } = req.body;
  let settings = await AdminAviatorSettings.findOne();
  if (!settings) settings = new AdminAviatorSettings();
  settings.siteMaintenance = !!siteMaintenance;
  await settings.save();
  res.json({ success: true, siteMaintenance: settings.siteMaintenance });
});

// Helper: Handle bonus progress and release
async function handleBonusProgress(user, betAmount) {
  let bonusReleased = false;
  if (user.firstDepositAmount > 0 && user.awaitingBonus > 0) {
    user.totalBetsAfterFirstDeposit += betAmount;
    if (user.totalBetsAfterFirstDeposit >= user.firstDepositAmount * 0.5 && user.awaitingBonus > 0) {
      user.balance += user.awaitingBonus;
      await AccountStatement.create({
        userId: user._id,
        transaction: 'First Deposit Bonus Released',
        event: 'Bonus',
        marketType: 'Wallet',
        gameType: 'Bonus',
        betAmount: 0,
        payout: user.awaitingBonus,
        result: 'profit',
        credit: user.awaitingBonus,
        closeBalance: user.balance,
        transactionId: `BONUS-${user._id}-${Date.now()}`
      });
      user.awaitingBonus = 0;
      bonusReleased = true;
    }
    await user.save();
  } else if (user.firstDepositAmount > 0) {
    user.totalBetsAfterFirstDeposit += betAmount;
    await user.save();
  }
  return bonusReleased;
}

// --- Mines Auto Mode: Last Round Reveal ---
app.get('/api/mines/auto/last-round', authenticateToken, async (req, res) => {
  try {
    const autoMode = await MinesAutoMode.findOne({ userId: req.user.userId });
    if (!autoMode || !autoMode.lastGameId) {
      return res.json({ lastRoundTiles: [] });
    }
    const game = await MinesGame.findById(autoMode.lastGameId);
    if (!game) {
      return res.json({ lastRoundTiles: [] });
    }
    // Get the revealed tiles for this game
    const revealedTiles = game.revealedTiles || [];
    const minePositions = game.minePositions || [];
    const lastRoundTiles = revealedTiles.map(tile => ({
      tile,
      isMine: minePositions.includes(tile)
    }));
    res.json({ lastRoundTiles });
  } catch (err) {
    res.json({ lastRoundTiles: [] });
  }
});
