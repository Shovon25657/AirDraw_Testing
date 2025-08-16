import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import HandTracking from './HandTracking';

const Game = ({ roomId, playerName }) => {
  const [players, setPlayers] = useState([]);
  const [artist, setArtist] = useState(null);
  const [wordInfo, setWordInfo] = useState(null);
  const [strokes, setStrokes] = useState([]);
  const [guess, setGuess] = useState('');
  const [messages, setMessages] = useState([]);
  const [isArtist, setIsArtist] = useState(false);
  const [score, setScore] = useState(0);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.emit('joinRoom', { roomId, playerName });

    socket.on('playerJoined', ({ players }) => {
      setPlayers(players);
    });

    socket.on('roundStarted', ({ artist, wordLength, category }) => {
      setArtist(artist);
      setIsArtist(socket.id === artist);
      setWordInfo({ wordLength, category });
      setStrokes([]);
    });

    socket.on('newStroke', (stroke) => {
      setStrokes(prev => [...prev, stroke]);
      drawStroke(stroke);
    });

    socket.on('correctGuess', ({ playerId, guess, points }) => {
      setMessages(prev => [...prev, { playerId, text: `${guess} (${points} points)` }]);
      if (playerId === socket.id) {
        setScore(prev => prev + points);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, playerName]);

  const drawStroke = (stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    stroke.pts.forEach((pt, i) => {
      if (i === 0) {
        ctx.moveTo(pt.x, pt.y);
      } else {
        ctx.lineTo(pt.x, pt.y);
      }
    });
    ctx.stroke();
  };

  const handleSubmitGuess = (e) => {
    e.preventDefault();
    if (!guess.trim()) return;
    
    socketRef.current.emit('submitGuess', { roomId, guess });
    setGuess('');
  };

  const handleStartRound = () => {
    // In a real app, this would select from word packs
    const words = ['apple', 'guitar', 'mountain', 'dolphin', 'airplane'];
    const word = words[Math.floor(Math.random() * words.length)];
    socketRef.current.emit('startRound', { roomId, word });
  };

  const handleStroke = (stroke) => {
    if (!isArtist) return;
    socketRef.current.emit('submitStroke', { roomId, stroke });
  };

  return (
    <div className="game-container">
      <div className="canvas-container">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600}
          className="bg-white rounded-lg shadow-lg"
        />
        {isArtist && <HandTracking onStroke={handleStroke} canvasRef={canvasRef} />}
      </div>
      
      <div className="game-info">
        <div className="players">
          <h3>Players</h3>
          {players.map(player => (
            <div key={player.id} className={player.id === artist ? 'artist' : ''}>
              {player.name} - {player.score}
            </div>
          ))}
        </div>
        
        {wordInfo && !isArtist && (
          <div className="word-info">
            <p>Category: {wordInfo.category}</p>
            <p>Word length: {wordInfo.wordLength}</p>
          </div>
        )}
        
        {!isArtist && (
          <form onSubmit={handleSubmitGuess} className="guess-form">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Your guess..."
            />
            <button type="submit">Submit</button>
          </form>
        )}
        
        <div className="chat">
          {messages.map((msg, i) => (
            <div key={i}>{msg.text}</div>
          ))}
        </div>
        
        {players.length > 0 && players[0].id === socketRef.current?.id && (
          <button onClick={handleStartRound}>Start Round</button>
        )}
      </div>
    </div>
  );
};

export default Game;