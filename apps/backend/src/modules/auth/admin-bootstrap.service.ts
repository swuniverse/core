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
    const configuredAdmin = process.env.BOOTSTRAP_ADMIN_USERNAME;
    if (!configuredAdmin) {
      return;
    }

    const user = await this.userRepo.findOne({
      where: { username: configuredAdmin },
    });

    if (!user) {
      this.logger.warn(
        `BOOTSTRAP_ADMIN_USERNAME configured but user not found: ${configuredAdmin}`,
      );
      return;
    }

    if (user.isAdmin) {
      return;
    }

    user.isAdmin = true;
    await this.userRepo.save(user);
    this.logger.log(`Granted admin rights to ${configuredAdmin}`);
  }
}
