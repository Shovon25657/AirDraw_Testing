import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Lobby from './Lobby';
import Game from './Game';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/game/:roomId" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;