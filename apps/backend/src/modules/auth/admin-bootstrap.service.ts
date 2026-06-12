import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    const configuredAdmins = process.env.BOOTSTRAP_ADMIN_USERNAME;
    if (!configuredAdmins) {
      return;
    }

    const usernames = configuredAdmins.split(',').map((u) => u.trim()).filter(Boolean);

    for (const username of usernames) {
      const user = await this.userRepo.findOne({ where: { username } });

      if (!user) {
        this.logger.warn(
          `BOOTSTRAP_ADMIN_USERNAME: user not found: ${username}`,
        );
        continue;
      }

      if (user.isAdmin) {
        continue;
      }

      user.isAdmin = true;
      await this.userRepo.save(user);
      this.logger.log(`Granted admin rights to ${username}`);
    }
  }
}
