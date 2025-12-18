import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { inviteService } from '../services/inviteService';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      error: error.message || 'Registration failed' 
    });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({ 
      error: error.message || 'Login failed' 
    });
  }
});

// Get current user (protected route)
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.getUserById(req.userId!);
    // Energy is now calculated per-planet by tickSystem
    res.json(user);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Update username
router.patch('/update-username', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body;
    
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
    }

    // Check if username is already taken
    const existingUser = await authService.getUserByUsername(username);
    if (existingUser && existingUser.id !== req.userId) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    await authService.updateUsername(req.userId!, username);
    res.json({ message: 'Username updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update password
router.patch('/update-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    await authService.updatePassword(req.userId!, currentPassword, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Validate invite code (public endpoint for registration)
router.post('/validate-invite', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ valid: false, error: 'Invite-Code erforderlich' });
    }

    const isValid = await inviteService.validateCode(code);
    res.json({ valid: isValid });
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error.message });
  }
});

export default router;
