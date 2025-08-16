import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import HandTracking from './HandTracking';
import HintButton from './HintButton';
import PeerVideo from './PeerVideo';

const Game = ({ roomId, playerName }) => {
  const [players, setPlayers] = useState([]);
  const [artist, setArtist] = useState(null);
  const [wordInfo, setWordInfo] = useState(null);
  const [strokes, setStrokes] = useState([]);
  const [guess, setGuess] = useState('');
  const [messages, setMessages] = useState([]);
  const [isArtist, setIsArtist] = useState(false);
  const [score, setScore] = useState(0);
  const [showWordOptions, setShowWordOptions] = useState(false);
  const [wordOptions, setWordOptions] = useState(null);
  const [hints, setHints] = useState([]);
  const [peers, setPeers] = useState([]);
  
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const userVideoRef = useRef(null);
  const peersRef = useRef([]);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.emit('joinRoom', { roomId, playerName });

    socket.on('playerJoined', ({ players }) => {
      setPlayers(players);
    });

    socket.on('wordOptions', (options) => {
      setShowWordOptions(true);
      setWordOptions(options);
    });

    socket.on('roundStarted', ({ artist, wordLength, difficulty, category }) => {
      setArtist(artist);
      setIsArtist(socket.id === artist);
      setWordInfo({ wordLength, difficulty, category });
      setStrokes([]);
      setShowWordOptions(false);
      setHints([]);
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

    socket.on('hintUsed', ({ hintType }) => {
      setHints(prev => [...prev, hintType]);
    });

    socket.on('cheatWarning', ({ violations }) => {
      alert(`Warning: No text allowed! Violations: ${violations}/3`);
    });

    // ===== NEW: WebRTC Setup =====
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        userVideoRef.current.srcObject = stream;
        socket.emit('join-room', roomId);
        
        socket.on('user-connected', userId => {
          const peer = new Peer({
            initiator: true,
            trickle: false,
            stream
          });
          
          peer.on('signal', signal => {
            socket.emit('relay-signal', { signal, userId });
          });
          
          peersRef.current.push({ peer, userId });
          setPeers([...peersRef.current]);
        });
      });

    return () => {
      socket.disconnect();
      userVideoRef.current?.srcObject?.getTracks().forEach(track => track.stop());
    };
  }, [roomId, playerName]);

  const drawStroke = (stroke) => {
    // ... (existing drawStroke implementation)
  };

  const handleStartRound = () => {
    socketRef.current.emit('startRound', { roomId, packName: 'basic' });
  };

  const handleSelectWord = (word, difficulty) => {
    socketRef.current.emit('selectWord', { roomId, word, difficulty });
  };

  const handleUseHint = (hintType, cost) => {
    socketRef.current.emit('useHint', { roomId, hintType });
  };

  const handleSubmitGuess = (e) => {
    e.preventDefault();
    if (!guess.trim()) return;
    socketRef.current.emit('submitGuess', { roomId, guess });
    setGuess('');
  };

  const handleSendMessage = (text) => {
    socketRef.current.emit('sendMessage', { roomId, text });
  };

  const handleReportUser = (userId, reason) => {
    socketRef.current.emit('reportUser', { roomId, userId, reason });
  };

  return (
    <div className="game-container">
      {/* ===== NEW: Artist Camera Feed ===== */}
      {isArtist && (
        <div className="artist-camera">
          <video muted ref={userVideoRef} autoPlay playsInline />
          {peers.map(peer => (
            <PeerVideo key={peer.userId} peer={peer.peer} />
          ))}
        </div>
      )}

      <div className="canvas-container">
        <canvas ref={canvasRef} width={800} height={600} />
        {isArtist && <HandTracking onStroke={handleStroke} canvasRef={canvasRef} />}
      </div>

      <div className="game-info">
        {/* ===== NEW: Word Selection Modal ===== */}
        {showWordOptions && (
          <div className="word-selection-modal">
            <h3>Choose a word:</h3>
            <div className="word-options">
              <button onClick={() => handleSelectWord(wordOptions.easy, 'easy')}>
                Easy: {wordOptions.easy}
              </button>
              <button onClick={() => handleSelectWord(wordOptions.medium, 'medium')}>
                Medium: {wordOptions.medium}
              </button>
              <button onClick={() => handleSelectWord(wordOptions.hard, 'hard')}>
                Hard: {wordOptions.hard}
              </button>
            </div>
          </div>
        )}

        {/* ===== NEW: Hint Button ===== */}
        {isArtist && wordInfo && (
          <HintButton 
            round={wordInfo} 
            onUseHint={handleUseHint} 
            usedHints={hints}
          />
        )}

        {/* ... (rest of existing UI remains similar) */}
      </div>
    </div>
  );
};

export default Game;