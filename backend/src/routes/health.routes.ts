# Health check endpoint hinzufügen
import express from 'express';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Prüfe DB-Verbindung
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
