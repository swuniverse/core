import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './socket';
import { errorHandler } from './middleware/errorHandler';
import { TickSystem } from './services/tickSystem';
import { buildingCompletionService } from './services/buildingCompletionService';
import { shipBuildService, setShipBuildIO } from './services/shipBuildService';

// Routes
import authRoutes from './routes/auth.routes';
import playerRoutes from './routes/player.routes';
import planetRoutes from './routes/planet.routes';
import galaxyRoutes from './routes/galaxy.routes';
import researchRoutes from './routes/research.routes';
import fleetRoutes from './routes/fleet.routes';
import factionRoutes from './routes/faction.routes';
import shipyardRoutes from './routes/shipyard.routes';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/planet', planetRoutes);
app.use('/api/galaxy', galaxyRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/factions', factionRoutes);
app.use('/api/shipyard', shipyardRoutes);

// Error handling
app.use(errorHandler);

// Socket.IO setup
setupSocketHandlers(io);

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Server accessible on all network interfaces (0.0.0.0:${PORT})`);
  console.log(`📡 WebSocket server ready`);
  
  // Initialize and start tick system (for resources, energy)
  const tickSystem = new TickSystem();
  tickSystem.start();
  console.log(`🎮 Tick system started (resources & energy)`);
  
  // Start building completion service (real-time)
  buildingCompletionService.start();
  
  // Start ship build completion service
  setShipBuildIO(io);
  shipBuildService.startCompletionChecker();
});

export { io };
