const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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

  socket.on('startRound', ({ roomId, word }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Select random artist
    const players = Array.from(room.players.values());
    const artistIndex = Math.floor(Math.random() * players.length);
    const artist = players[artistIndex];
    artist.isArtist = true;

    room.currentRound = {
      artist: artist.id,
      word,
      startTime: Date.now(),
      guesses: [],
      hintsUsed: 0
    };

    io.to(roomId).emit('roundStarted', {
      artist: artist.id,
      wordLength: word.length,
      category: 'General' // Would come from word pack
    });
  });

  socket.on('submitStroke', ({ roomId, stroke }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.strokes.push(stroke);
    socket.to(roomId).emit('newStroke', stroke);
  });

  socket.on('submitGuess', ({ roomId, guess }) => {
    const room = rooms.get(roomId);
    if (!room || !room.currentRound) return;

    const isCorrect = guess.toLowerCase() === room.currentRound.word.toLowerCase();
    if (isCorrect) {
      const guessTime = Date.now() - room.currentRound.startTime;
      const points = calculatePoints(guessTime, room.settings.roundTime);
      
      socket.emit('guessResult', { correct: true, points });
      io.to(roomId).emit('correctGuess', { playerId: socket.id, guess, points });
    } else {
      socket.emit('guessResult', { correct: false });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up room if empty
  });
});

function calculatePoints(guessTime, roundDuration) {
  const base = 200;
  const timeRatio = 1 - (guessTime / (roundDuration * 1000));
  return Math.ceil(base * timeRatio);
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});