import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Lobby from './Lobby';
import Game from './Game';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Lobby />,
  },
  {
    path: '/game/:roomId',
    element: <Game />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);