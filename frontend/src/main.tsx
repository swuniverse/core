import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { useGameStore } from './stores/gameStore';

function Root() {
  const checkAuth = useGameStore((state) => state.checkAuth);

  useEffect(() => {
    // Check if user is already authenticated on app load
    checkAuth();
  }, [checkAuth]);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
);
