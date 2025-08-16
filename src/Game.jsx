import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './index.css';

const Game = ({ roomId, playerName }) => {
  const [isArtist, setIsArtist] = useState(false);
  const [word, setWord] = useState('');
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Initialize game
  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.emit('joinRoom', { roomId, playerName });

    socket.on('roundStarted', ({ artist, word }) => {
      setIsArtist(socket.id === artist);
      setWord(word);
      clearCanvas();
    });

    return () => socket.disconnect();
  }, [roomId, playerName]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false
      });
      videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  // Add these to your Game component
const [isDrawing, setIsDrawing] = useState(false);

const startDrawing = (e) => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  ctx.beginPath();
  ctx.moveTo(x, y);
  setIsDrawing(true);
};

const draw = (e) => {
  if (!isDrawing) return;
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  ctx.lineTo(x, y);
  ctx.stroke();
};

const stopDrawing = () => {
  setIsDrawing(false);
};

// Add to canvas props:
onMouseDown={startDrawing}
onMouseMove={draw}
onMouseUp={stopDrawing}
onMouseLeave={stopDrawing}

  return (
    <div className="game-container">
      <h1>AirDraw Game - Room: {roomId}</h1>
      
      <div className="drawing-area">
        <canvas 
          ref={canvasRef}
          width={800}
          height={600}
          className="drawing-canvas"
        />
        
        {isArtist && (
          <div className="camera-controls">
            {cameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted />
            ) : (
              <button onClick={startCamera}>Enable Camera</button>
            )}
          </div>
        )}
      </div>

      <div className="game-info">
        {word && <div className="word-display">Word: {word}</div>}
        <div className="controls">
          <button onClick={clearCanvas}>Clear Canvas</button>
        </div>
      </div>
    </div>
  );
};

export default Game;