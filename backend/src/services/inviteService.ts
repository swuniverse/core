import prisma from '../lib/prisma';
import crypto from 'crypto';

class InviteService {
  /**
   * Generate a unique invite code
   */
  private generateCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Create invite codes for a user
   */
  async createInviteCodes(userId: number, count: number = 2): Promise<string[]> {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      let code = this.generateCode();
      
      // Ensure uniqueness
      while (await prisma.inviteCode.findUnique({ where: { code } })) {
        code = this.generateCode();
      }
      
      await prisma.inviteCode.create({
        data: {
          code,
          createdById: userId,
        },
      });
      
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Validate an invite code
   */
  async validateCode(code: string): Promise<boolean> {
    const inviteCode = await prisma.inviteCode.findUnique({
      where: { code: code.toUpperCase() },
    });
    
    return inviteCode !== null && !inviteCode.isUsed;
  }

  /**
   * Mark an invite code as used
   */
  async useCode(code: string, userId: number): Promise<void> {
    await prisma.inviteCode.update({
      where: { code: code.toUpperCase() },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    // Link the used code to the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        usedInviteCodeId: (await prisma.inviteCode.findUnique({ 
          where: { code: code.toUpperCase() } 
        }))?.id,
      },
    });
  }

  /**
   * Get user's invite codes
   */
  async getUserInviteCodes(userId: number) {
    return prisma.inviteCode.findMany({
      where: { 
        createdById: userId
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get invite code statistics for a user
   */
  async getInviteStats(userId: number) {
    const codes = await this.getUserInviteCodes(userId);
    
    return {
      total: codes.length,
      used: codes.filter(c => c.isUsed).length,
      available: codes.filter(c => !c.isUsed).length,
      codes: codes.map(c => ({
        code: c.code,
        isUsed: c.isUsed,
        usedAt: c.usedAt,
        createdAt: c.createdAt,
      })),
    };
  }
}

export const inviteService = new InviteService();
