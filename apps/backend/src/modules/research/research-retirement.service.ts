import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ResearchService } from './research.service';

/**
 * Frigates are not finished yet: nobody may build them. Their research (and the
 * Fregattenwerft) is hidden, and anyone who already holds it loses it again. The
 * Jägerwerft is obsolete too: fighters are built in the hangar of an airfield.
 * Includes the earlier hidden frigate ids that no longer exist in the tech tree.
 */
export const RETIRED_FRIGATE_RESEARCH_IDS: readonly number[] = [
  275101, 275103, 275201, 275203, 432201, 451101, 451111, 421101, 421111, 422101, 422111,
  421103, 421113, 422103, 422113,
];

@Injectable()
export class ResearchRetirementService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ResearchRetirementService.name);

  constructor(private readonly research: ResearchService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const retired = await this.research.retireResearch([
        ...RETIRED_FRIGATE_RESEARCH_IDS,
      ]);
      if (retired > 0) {
        this.logger.log(`Retired ${retired} frigate research entries`);
      }
    } catch (error) {
      this.logger.error(
        `Research retirement failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
