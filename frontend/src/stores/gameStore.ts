import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: number;
  userId: number;
  factionId: number;
  isAdmin?: boolean;
  faction?: {
    id: number;
    name: string;
    description: string;
  };
  planets?: any[];
}

interface User {
  id: number;
  email: string;
  username: string;
  player?: Player;
}

interface GameState {
  // Auth State
  user: User | null;
  player: Player | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Socket State
  socket: Socket | null;
  isConnected: boolean;
  
  // Auth Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; factionId: number; inviteCode: string }) => Promise<any>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  
  // Socket Actions
  initSocket: () => void;
  disconnectSocket: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial State
  user: null,
  player: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  socket: null,
  isConnected: false,
  
  // Auth Actions
  login: async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const { token, user } = await response.json();
      
      localStorage.setItem('token', token);
      set({ token, user, player: user.player, isAuthenticated: true });
      
      // Initialize socket after successful login
      get().initSocket();
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  },

  register: async (data) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const result = await response.json();
      const { token, user, inviteCodes } = result;
      
      localStorage.setItem('token', token);
      set({ token, user, player: user.player, isAuthenticated: true });
      
      // Initialize socket after successful registration
      get().initSocket();
      
      return { inviteCodes };
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    get().disconnectSocket();
    set({ 
      user: null,
      player: null,
      token: null, 
      isAuthenticated: false,
      socket: null,
      isConnected: false 
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      set({ isAuthenticated: false, user: null, player: null });
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      const user = await response.json();
      set({ user, player: user.player, isAuthenticated: true, token });
      
      // Initialize socket if authenticated
      get().initSocket();
    } catch (error) {
      localStorage.removeItem('token');
      set({ isAuthenticated: false, user: null, player: null, token: null });
    }
  },
  
  // Socket Actions
  initSocket: () => {
    const { socket: existingSocket, user } = get();
    
    // Don't create duplicate connections
    if (existingSocket?.connected) return;
    
    const socket = io('http://localhost:3000', {
      auth: {
        token: localStorage.getItem('token'),
      },
      autoConnect: true,
    });
    
    socket.on('connect', () => {
      set({ isConnected: true });
      console.log('🔌 Connected to game server');
      
      // Join player room if user exists
      if (user?.player) {
        socket.emit('join:player', user.player.id);
      }
    });
    
    socket.on('disconnect', () => {
      set({ isConnected: false });
      console.log('🔌 Disconnected from game server');
    });
    
    socket.on('tick:update', (data) => {
      console.log('⏰ Tick update:', data);
    });
    
    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
