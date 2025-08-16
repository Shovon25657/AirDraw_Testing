import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Word Packs with Difficulty
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

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('createRoom', ({ roomId, settings }) => {
    rooms.set(roomId, {
      players: new Map([[socket.id, { id: socket.id, isArtist: false, score: 0 }]]),
      settings,
      currentRound: null,
      strokes: []
    });
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    room.players.set(socket.id, { id: socket.id, name: playerName, isArtist: false, score: 0 });
    socket.join(roomId);
    io.to(roomId).emit('playerJoined', { players: Array.from(room.players.values()) });
  });

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

  socket.on('submitStroke', ({ roomId, stroke }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.strokes.push(stroke);
    socket.to(roomId).emit('newStroke', stroke);
  });

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
    
    const artist = room.players.get(room.currentRound.artist);
    artist.score = Math.max(0, artist.score - hintCost);
  });

  socket.on('submitGuess', ({ roomId, guess }) => {
    const room = rooms.get(roomId);
    if (!room || !room.currentRound) return;

    const isCorrect = guess.toLowerCase() === room.currentRound.word.toLowerCase();
    if (isCorrect) {
      const guessTime = Date.now() - room.currentRound.startTime;
      const points = calculatePoints(guessTime, room.settings.roundTime, room.currentRound.difficulty);
      
      socket.emit('guessResult', { correct: true, points });
      io.to(roomId).emit('correctGuess', { playerId: socket.id, guess, points });
    } else {
      socket.emit('guessResult', { correct: false });
    }
  });

  socket.on('sendMessage', ({ roomId, text }) => {
    // Basic message filtering without bad-words
    const cleanText = text.replace(/[^\w\s]/gi, ''); // Simple character filter
    io.to(roomId).emit('newMessage', {
      userId: socket.id,
      text: cleanText,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

function calculatePoints(guessTime, roundDuration, difficulty, streak = 0) {
  const base = 200;
  const difficultyMultipliers = { easy: 0.8, medium: 1.0, hard: 1.3 };
  const timeRatio = 1 - (guessTime / (roundDuration * 1000));
  const streakBonus = 1 + (Math.min(streak, 3) * 0.1);
  
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