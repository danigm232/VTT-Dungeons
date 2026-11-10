import type { PublicCampaignDefinition } from '../../../engine/shared/campaign.js';

type Animations = PublicCampaignDefinition['tokenAnimations'][string];
type Pose = readonly [left: number, top: number, right: number, bottom: number, seedX: number, seedY: number];
const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
const references: Record<string, string> = {
  wizard: '/art/tokens/wizard.png', cleric: '/art/tokens/cleric.png',
  zombie: '/art/m3/zombie/zombie1_base.png', harpy: '/art/m3/harpy/harpia_base.png', ghoul: '/art/m3/ghoul/ghoul_base.png'
};
// Alpha-connected pose bounds, not equal cells: clothing can cross cell edges.
// Source atlases are retained intact. Seeds discard disconnected neighbours.
const poses: Record<string, readonly Pose[]> = {
  wizard: [
    [35,84,314,587,160,84], [355,86,611,590,477,86], [657,84,888,599,780,84], [940,84,1226,599,1070,84],
    [29,661,316,1174,164,661], [352,663,621,1178,477,663], [670,662,894,1179,748,662], [941,659,1215,1168,1053,659]
  ],
  cleric: [
    [7,209,346,585,155,209], [347,208,652,591,495,208], [680,208,890,595,787,208], [917,208,1249,600,1097,208],
    [7,714,325,1085,160,714], [321,714,625,1105,463,714], [650,714,884,1100,751,714], [946,714,1249,1094,1057,714]
  ],
  zombie: [
    [23,13,327,606,197,13], [380,12,654,611,556,12], [668,13,901,613,851,13], [933,9,1240,612,1114,9],
    [5,619,313,1226,159,619], [330,617,627,1227,415,617], [654,622,906,1224,704,622], [926,627,1241,1223,1006,627]
  ],
  harpy: [
    [5,93,295,612,161,93], [325,84,641,609,435,84], [651,83,904,617,746,83], [917,87,1252,618,1066,87],
    [12,664,318,1174,141,664], [324,663,627,1177,461,663], [688,662,903,1184,781,662], [910,662,1243,1173,1099,662]
  ],
  ghoul: [
    [9,7,361,598,192,7], [372,8,683,593,508,8], [700,11,911,605,815,11], [931,13,1246,611,1113,13],
    [4,624,340,1223,170,624], [351,620,647,1232,450,620], [661,617,882,1221,741,617], [908,617,1250,1202,1093,617]
  ]
};

/** Dedicated resting views. Existing south walks/actions remain unchanged. */
export function stormwreckFacingSprites(tokenId: string, existing: Animations = {}): Animations {
  const bounds = poses[tokenId];
  if (!bounds) return {};
  return Object.fromEntries(bounds.flatMap(([left, top, right, bottom, sx, sy], index) => {
    const x = Math.max(0, left - 2), y = Math.max(0, top - 2);
    const width = Math.min(1254, right + 2) - x, height = Math.min(1254, bottom + 2) - y;
    const clip: Animations[string] = { frames: [{
      url: `/art/m3/facing-20261012/${tokenId}-rest-v1.png`, x, y, width, height,
      logicalWidth: 92 * width / height, logicalHeight: 92, anchorX: .5, anchorY: 1,
      alphaSeeds: [[sx - x, sy - y]]
    }], fps: 1, flipX: false };
    const direction = directions[index]!;
    return [
      [`idle-${direction}`, clip], [`idle-standing-${direction}`, clip], [`combat-idle-${direction}`, clip],
      [`direction-${direction}`, existing[`direction-${direction}`] ?? (direction === 's' ? existing.moving : undefined) ?? clip],
      [`torch-walk-${direction}`, clip],
      [`torch-run-${direction}`, { ...clip, fps: 2 }],
      [`torch-idle-${direction}`, clip],
      ['torch-draw', clip], ['extraer-antorcha', clip],
      ['torch-stow', clip], ['guardar-antorcha', clip],
      ['use-torch', clip]
    ];
  }));
}

/** The live API may come from a server started before this art was shipped. */
export function installStormwreckFacingSprites(campaign: PublicCampaignDefinition) {
  if (campaign.campaignId !== 'stormwreck-isle') return campaign;
  for (const tokenId of Object.keys(poses)) {
    if (campaign.tokens[tokenId]?.url !== references[tokenId]) continue;
    const existing = campaign.tokenAnimations[tokenId] ?? {};
    if (directions.every(direction => existing[`idle-${direction}`] && existing[`combat-idle-${direction}`] && existing[`direction-${direction}`])) continue;
    // Explicit server-authored rest views win; fill only absent views.
    campaign.tokenAnimations[tokenId] = { ...stormwreckFacingSprites(tokenId, existing), ...existing };
  }
  return campaign;
}
