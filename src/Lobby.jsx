import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Lobby = () => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/game/${newRoomId}`, { state: { playerName, isHost: true } });
  };

  const handleJoinRoom = () => {
    if (!roomId.trim() || !playerName.trim()) return;
    navigate(`/game/${roomId}`, { state: { playerName, isHost: false } });
  };

  return (
    <div className="lobby">
      <h1>AirDraw Guess</h1>
      
      <div className="create-room">
        <h2>Create Room</h2>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name"
        />
        <button onClick={handleCreateRoom} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Room'}
        </button>
      </div>
      
      <div className="join-room">
        <h2>Join Room</h2>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name"
        />
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Room code"
        />
        <button onClick={handleJoinRoom}>
          Join Room
        </button>
      </div>
    </div>
  );
};

export default Lobby;