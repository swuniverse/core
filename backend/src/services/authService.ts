import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { inviteService } from './inviteService';

const SALT_ROUNDS = 10;

// Validation Schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  factionId: z.number().int().positive(),
  inviteCode: z.string().min(8, 'Invite code is required').max(8),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export class AuthService {
  async register(data: RegisterInput) {
    // Validate input
    const validated = registerSchema.parse(data);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validated.email },
          { username: validated.username },
        ],
      },
    });

    if (existingUser) {
      throw new Error('Benutzer mit dieser E-Mail oder diesem Benutzernamen existiert bereits');
    }

    // Check if faction exists
    const faction = await prisma.faction.findUnique({
      where: { id: validated.factionId },
    });

    if (!faction) {
      throw new Error('Ungültige Fraktion ausgewählt');
    }

    // Validate invite code
    const isValidInvite = await inviteService.validateCode(validated.inviteCode);
    if (!isValidInvite) {
      throw new Error('Ungültiger oder bereits verwendeter Invite-Code');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, SALT_ROUNDS);

    // Create user and player in transaction
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        username: validated.username,
        password: hashedPassword,
        player: {
          create: {
            factionId: validated.factionId,
            isAdmin: validated.inviteCode === 'ADMIN001', // Set admin flag for ADMIN001 code
            // Resources are now per-planet, not per-player
          },
        },
      },
      include: {
        player: {
          include: {
            faction: true,
          },
        },
      },
    });

    // Mark invite code as used
    await inviteService.useCode(validated.inviteCode, user.id);

    // Create 2 new invite codes for the new user
    const newInviteCodes = await inviteService.createInviteCodes(user.id, 2);

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        player: user.player,
      },
      inviteCodes: newInviteCodes,
    };
  }

  async login(data: LoginInput) {
    // Validate input
    const validated = loginSchema.parse(data);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: {
        player: {
          include: {
            faction: true,
            planets: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Ungültige E-Mail oder Passwort');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validated.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Ungültige E-Mail oder Passwort');
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        player: user.player,
      },
    };
  }

  async getUserById(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        player: {
          include: {
            faction: true,
            planets: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Benutzer nicht gefunden');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      player: user.player,
    };
  }

  async getUserByUsername(username: string) {
    return await prisma.user.findUnique({
      where: { username },
    });
  }

  async updateUsername(userId: number, username: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { username },
    });
  }

  async updatePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    return await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  private generateToken(userId: number): string {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'default-secret-key',
      { expiresIn: '7d' }
    );
  }

  verifyToken(token: string): { userId: number } {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key') as { userId: number };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

export const authService = new AuthService();
