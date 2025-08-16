const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Tesseract = require('tesseract.js');
const Filter = require('bad-words');
const filter = new Filter();

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ===== NEW: Word Packs with Difficulty =====
const WORD_PACKS = {
  basic: {
    easy: ["apple", "house", "tree", "dog", "sun"],
    medium: ["guitar", "mountain", "airplane", "dolphin", "bicycle"],
    hard: ["skyscraper", "xylophone", "quintessential", "kaleidoscope", "jigsaw"]
  },
  animals: {
    easy: ["cat", "bird", "fish"],
    medium: ["elephant", "giraffe", "kangaroo"],
    hard: ["platypus", "chameleon", "rhinoceros"]
  }
};

// ===== NEW: Anti-Cheating OCR =====
async function checkForText(stroke) {
  try {
    const { data: { text } } = await Tesseract.recognize(
      stroke.canvasData,
      'eng',
      { logger: () => {} }
    );
    return text.trim().length > 2;
  } catch (error) {
    console.error("OCR Error:", error);
    return false;
  }
}

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // ... (existing room creation/joining code remains same)

  // ===== UPDATED: Start Round with Word Selection =====
  socket.on('startRound', ({ roomId, packName }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const pack = WORD_PACKS[packName] || WORD_PACKS.basic;
    const wordOptions = {
      easy: pack.easy[Math.floor(Math.random() * pack.easy.length)],
      medium: pack.medium[Math.floor(Math.random() * pack.medium.length)],
      hard: pack.hard[Math.floor(Math.random() * pack.hard.length)]
    };
    
    io.to(socket.id).emit('wordOptions', wordOptions);
  });

  socket.on('selectWord', ({ roomId, word, difficulty }) => {
    const room = rooms.get(roomId);
    const players = Array.from(room.players.values());
    const artistIndex = Math.floor(Math.random() * players.length);
    const artist = players[artistIndex];
    
    room.currentRound = {
      artist: artist.id,
      word,
      difficulty,
      startTime: Date.now(),
      hintsUsed: 0,
      violations: 0
    };
    
    io.to(roomId).emit('roundStarted', {
      artist: artist.id,
      wordLength: word.length,
      difficulty,
      category: 'General'
    });
  });

  // ===== UPDATED: Stroke Submission with OCR Check =====
  socket.on('submitStroke', async ({ roomId, stroke }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const hasText = await checkForText(stroke);
    if (hasText) {
      room.currentRound.violations++;
      socket.emit('cheatWarning', { violations: room.currentRound.violations });
      if (room.currentRound.violations > 2) {
        socket.emit('cheatPenalty');
      }
      return;
    }

    room.strokes.push(stroke);
    socket.to(roomId).emit('newStroke', stroke);
  });

  // ===== NEW: Hint System =====
  socket.on('useHint', ({ roomId, hintType }) => {
    const room = rooms.get(roomId);
    if (!room || !room.currentRound) return;

    const hintCost = { 
      firstLetter: 20, 
      category: 30, 
      silhouette: 50 
    }[hintType] || 0;

    room.currentRound.hintsUsed++;
    io.to(roomId).emit('hintUsed', { 
      hintType,
      remainingHints: 3 - room.currentRound.hintsUsed
    });
    
    // Deduct points from artist
    const artist = room.players.get(room.currentRound.artist);
    artist.score = Math.max(0, artist.score - hintCost);
  });

  // ===== NEW: Moderation System =====
  socket.on('sendMessage', ({ roomId, text }) => {
    if (filter.isProfane(text)) {
      socket.emit('messageBlocked');
      return;
    }
    
    io.to(roomId).emit('newMessage', {
      userId: socket.id,
      text: filter.clean(text),
      timestamp: Date.now()
    });
  });

  socket.on('reportUser', ({ roomId, userId, reason }) => {
    const room = rooms.get(roomId);
    room.reports = room.reports || [];
    room.reports.push({ userId, reporter: socket.id, reason });
    
    if (room.reports.filter(r => r.userId === userId).length > 2) {
      io.to(userId).emit('muted', { duration: 300000 }); // 5 minute mute
    }
  });

  // ... (rest of existing code remains same)
});

// ===== UPDATED: Scoring with Streaks =====
function calculatePoints(guessTime, roundDuration, difficulty, streak = 0) {
  const base = 200;
  const difficultyMultipliers = { easy: 0.8, medium: 1.0, hard: 1.3 };
  const timeRatio = 1 - (guessTime / (roundDuration * 1000));
  const streakBonus = 1 + (Math.min(streak, 3) * 0.1); // Max 30% bonus
  
  return Math.ceil(
    base * 
    difficultyMultipliers[difficulty] * 
    Math.pow(timeRatio, 1.2) * 
    streakBonus
  );
}

httpServer.listen(3001, () => {
  console.log('Server running on port 3001');
});