import { validatePublicCampaign, type PublicCampaignDefinition } from './campaign.js';

/** DTO de arranque. Las escenas autorizadas se entregan una a una por socket. */
export function anonymousCampaignView(campaign: PublicCampaignDefinition) {
  const scenes = campaign.scenes.filter(scene => scene.access !== 'authorized');
  if (!scenes.length) throw new Error('PUBLIC_SCENE_REQUIRED');
  const sceneIds = new Set(scenes.map(scene => scene.id));
  const publicActorTokens = new Set([
    ...campaign.roster.map(actor => actor.tokenId),
    ...scenes.flatMap(scene => (scene.stageActors ?? []).map(actor => actor.tokenId))
  ]);
  const tokens = Object.fromEntries(Object.entries(campaign.tokens).filter(([tokenId]) => publicActorTokens.has(tokenId)));
  const tokenAnimations = Object.fromEntries(Object.entries(campaign.tokenAnimations).filter(([tokenId]) => publicActorTokens.has(tokenId)));
  const sceneProfiles = Object.fromEntries(Object.entries(campaign.audio.sceneProfiles ?? {}).filter(([sceneId]) => sceneIds.has(sceneId)));
  return validatePublicCampaign({ ...structuredClone(campaign), initialSceneId: sceneIds.has(campaign.initialSceneId) ? campaign.initialSceneId : scenes[0]!.id,
    scenes, tokens, tokenAnimations, audio: { ...structuredClone(campaign.audio), ...(campaign.audio.sceneProfiles ? { sceneProfiles } : {}) } });
}
