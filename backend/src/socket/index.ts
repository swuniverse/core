import { Server, Socket } from 'socket.io';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle player joining their game room
    socket.on('join:player', (playerId: number) => {
      socket.join(`player:${playerId}`);
      console.log(`Player ${playerId} joined their room`);
    });

    // Handle galaxy map updates
    socket.on('join:galaxy', (galaxyId: number) => {
      socket.join(`galaxy:${galaxyId}`);
    });

    socket.on('disconnect', () => {
      logger.socket(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

// Helper function to emit to specific player
export const emitToPlayer = (io: Server, playerId: number, event: string, data: any) => {
  io.to(`player:${playerId}`).emit(event, data);
};

// Helper function to emit to galaxy
export const emitToGalaxy = (io: Server, galaxyId: number, event: string, data: any) => {
  io.to(`galaxy:${galaxyId}`).emit(event, data);
};
