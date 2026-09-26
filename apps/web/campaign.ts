import { validatePublicCampaign, type PublicCampaignDefinition } from '../../engine/shared/campaign';

let loaded: Promise<PublicCampaignDefinition> | null = null;
export function loadCampaign() {
  loaded ??= fetch('/api/campaign', { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error('No se pudo cargar la campaña.');
    return response.json();
  }).then(validatePublicCampaign);
  return loaded;
}
