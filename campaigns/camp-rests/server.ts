import type { CampaignServerBundle } from '../../engine/server/campaign.js';
import { privateCharacterSeeds } from '../stormwreck-isle/private/seed.js';
import { campRestsPublicCampaign } from './public/pack.js';

/** Focused fixture for camp-rest tests. Production adds these public scenes to
 * Stormwreck so they share that campaign's save slot and DM map selector. */
export const campRestsBundle: CampaignServerBundle = {
  public: campRestsPublicCampaign,
  campaignStateVersion: 1,
  characters: Object.fromEntries(Object.entries(privateCharacterSeeds).map(([id, seed]) => [id, {
    maxHp: seed.maxHp, inventory: [...seed.inventory],
    sheet: { ...seed.sheet, features: [...seed.sheet.features], attacks: [...seed.sheet.attacks], spells: [...seed.sheet.spells] }
  }]))
};
