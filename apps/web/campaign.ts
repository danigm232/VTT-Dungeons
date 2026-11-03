import { validatePublicCampaign, type PublicCampaignDefinition } from '../../engine/shared/campaign';
import { installStormwreckFacingSprites } from '../../campaigns/stormwreck-isle/public/facing-sprites';
import { installPlayerLocomotion } from '../../engine/client/player-locomotion';
import { installSilverfarbenVisuals } from '../../campaigns/one-shot/public/silverfarben-visuals';

let loaded: Promise<PublicCampaignDefinition> | null = null;
export function loadCampaign() {
  loaded ??= fetch('/api/campaign', { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error('No se pudo cargar la campaña.');
    return response.json();
  }).then(validatePublicCampaign).then(installStormwreckFacingSprites).then(installPlayerLocomotion).then(installSilverfarbenVisuals);
  return loaded;
}
