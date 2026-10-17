import type {PublicCampaignDefinition} from '../../../engine/shared/campaign.js';
import {installCombatVisualFallbacks} from '../../../engine/shared/combat-animation.js';
// Crops follow measured alpha rows, not a guessed uniform grid: no clipped boots.
export const combatSpriteRoles = {
  "rogue": [
    "help",
    "influence",
    "search",
    "study",
    "ready",
    "hit-physical",
    "hit-fire",
    "hit-arcane"
  ],
  "silverfarben-hotel": [
    "help",
    "influence",
    "spell-fog",
    "spell-feather",
    "ready",
    "hit-physical",
    "hit-fire",
    "hit-arcane"
  ]
} as const;
export const combatSpriteFrames = {
  "rogue": [
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 0,
      "y": 44,
      "width": 256,
      "height": 155,
      "logicalWidth": 155.974,
      "logicalHeight": 94.437,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 256,
      "y": 44,
      "width": 256,
      "height": 155,
      "logicalWidth": 155.974,
      "logicalHeight": 94.437,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 512,
      "y": 44,
      "width": 298,
      "height": 155,
      "logicalWidth": 181.563,
      "logicalHeight": 94.437,
      "anchorX": 0.42953,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 810,
      "y": 44,
      "width": 214,
      "height": 155,
      "logicalWidth": 130.384,
      "logicalHeight": 94.437,
      "anchorX": 0.401869,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 0,
      "y": 224,
      "width": 256,
      "height": 166,
      "logicalWidth": 155.974,
      "logicalHeight": 101.139,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 256,
      "y": 224,
      "width": 256,
      "height": 166,
      "logicalWidth": 155.974,
      "logicalHeight": 101.139,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 512,
      "y": 224,
      "width": 298,
      "height": 166,
      "logicalWidth": 181.563,
      "logicalHeight": 101.139,
      "anchorX": 0.42953,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 810,
      "y": 224,
      "width": 214,
      "height": 166,
      "logicalWidth": 130.384,
      "logicalHeight": 101.139,
      "anchorX": 0.401869,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 0,
      "y": 414,
      "width": 256,
      "height": 165,
      "logicalWidth": 155.974,
      "logicalHeight": 100.53,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 256,
      "y": 414,
      "width": 256,
      "height": 165,
      "logicalWidth": 155.974,
      "logicalHeight": 100.53,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 512,
      "y": 414,
      "width": 298,
      "height": 165,
      "logicalWidth": 181.563,
      "logicalHeight": 100.53,
      "anchorX": 0.42953,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 810,
      "y": 414,
      "width": 214,
      "height": 165,
      "logicalWidth": 130.384,
      "logicalHeight": 100.53,
      "anchorX": 0.401869,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 0,
      "y": 601,
      "width": 256,
      "height": 168,
      "logicalWidth": 155.974,
      "logicalHeight": 102.358,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 256,
      "y": 601,
      "width": 256,
      "height": 168,
      "logicalWidth": 155.974,
      "logicalHeight": 102.358,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 512,
      "y": 601,
      "width": 298,
      "height": 168,
      "logicalWidth": 181.563,
      "logicalHeight": 102.358,
      "anchorX": 0.42953,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 810,
      "y": 601,
      "width": 214,
      "height": 168,
      "logicalWidth": 130.384,
      "logicalHeight": 102.358,
      "anchorX": 0.401869,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 0,
      "y": 791,
      "width": 256,
      "height": 166,
      "logicalWidth": 155.974,
      "logicalHeight": 101.139,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 256,
      "y": 791,
      "width": 256,
      "height": 166,
      "logicalWidth": 155.974,
      "logicalHeight": 101.139,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 512,
      "y": 791,
      "width": 298,
      "height": 166,
      "logicalWidth": 181.563,
      "logicalHeight": 101.139,
      "anchorX": 0.42953,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 810,
      "y": 791,
      "width": 214,
      "height": 166,
      "logicalWidth": 130.384,
      "logicalHeight": 101.139,
      "anchorX": 0.401869,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 0,
      "y": 983,
      "width": 256,
      "height": 166,
      "logicalWidth": 155.974,
      "logicalHeight": 101.139,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 256,
      "y": 983,
      "width": 256,
      "height": 166,
      "logicalWidth": 155.974,
      "logicalHeight": 101.139,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 512,
      "y": 983,
      "width": 298,
      "height": 166,
      "logicalWidth": 181.563,
      "logicalHeight": 101.139,
      "anchorX": 0.42953,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 810,
      "y": 983,
      "width": 214,
      "height": 166,
      "logicalWidth": 130.384,
      "logicalHeight": 101.139,
      "anchorX": 0.401869,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 0,
      "y": 1161,
      "width": 256,
      "height": 173,
      "logicalWidth": 155.974,
      "logicalHeight": 105.404,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 256,
      "y": 1161,
      "width": 256,
      "height": 173,
      "logicalWidth": 155.974,
      "logicalHeight": 105.404,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 512,
      "y": 1161,
      "width": 298,
      "height": 173,
      "logicalWidth": 181.563,
      "logicalHeight": 105.404,
      "anchorX": 0.42953,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 810,
      "y": 1161,
      "width": 214,
      "height": 173,
      "logicalWidth": 130.384,
      "logicalHeight": 105.404,
      "anchorX": 0.401869,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 0,
      "y": 1343,
      "width": 256,
      "height": 174,
      "logicalWidth": 155.974,
      "logicalHeight": 106.013,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 256,
      "y": 1343,
      "width": 256,
      "height": 174,
      "logicalWidth": 155.974,
      "logicalHeight": 106.013,
      "anchorX": 0.5,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 512,
      "y": 1343,
      "width": 298,
      "height": 174,
      "logicalWidth": 181.563,
      "logicalHeight": 106.013,
      "anchorX": 0.42953,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/trinity.png",
      "x": 810,
      "y": 1343,
      "width": 214,
      "height": 174,
      "logicalWidth": 130.384,
      "logicalHeight": 106.013,
      "anchorX": 0.401869,
      "anchorY": 1
    }
  ],
  "silverfarben-hotel": [
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 0,
      "y": 30,
      "width": 250,
      "height": 192,
      "logicalWidth": 122.34,
      "logicalHeight": 93.957,
      "anchorX": 0.4435,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 250,
      "y": 30,
      "width": 215,
      "height": 192,
      "logicalWidth": 105.213,
      "logicalHeight": 93.957,
      "anchorX": 0.384302,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 465,
      "y": 30,
      "width": 209,
      "height": 192,
      "logicalWidth": 102.277,
      "logicalHeight": 93.957,
      "anchorX": 0.427632,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 674,
      "y": 30,
      "width": 213,
      "height": 192,
      "logicalWidth": 104.234,
      "logicalHeight": 93.957,
      "anchorX": 0.47946,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 0,
      "y": 241,
      "width": 250,
      "height": 197,
      "logicalWidth": 122.34,
      "logicalHeight": 96.404,
      "anchorX": 0.4435,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 250,
      "y": 241,
      "width": 215,
      "height": 197,
      "logicalWidth": 105.213,
      "logicalHeight": 96.404,
      "anchorX": 0.384302,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 465,
      "y": 241,
      "width": 209,
      "height": 197,
      "logicalWidth": 102.277,
      "logicalHeight": 96.404,
      "anchorX": 0.427632,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 674,
      "y": 241,
      "width": 213,
      "height": 197,
      "logicalWidth": 104.234,
      "logicalHeight": 96.404,
      "anchorX": 0.47946,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 0,
      "y": 453,
      "width": 250,
      "height": 214,
      "logicalWidth": 122.34,
      "logicalHeight": 104.723,
      "anchorX": 0.4435,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 250,
      "y": 453,
      "width": 215,
      "height": 214,
      "logicalWidth": 105.213,
      "logicalHeight": 104.723,
      "anchorX": 0.384302,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 465,
      "y": 453,
      "width": 209,
      "height": 214,
      "logicalWidth": 102.277,
      "logicalHeight": 104.723,
      "anchorX": 0.427632,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 674,
      "y": 453,
      "width": 213,
      "height": 214,
      "logicalWidth": 104.234,
      "logicalHeight": 104.723,
      "anchorX": 0.47946,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 0,
      "y": 676,
      "width": 250,
      "height": 210,
      "logicalWidth": 122.34,
      "logicalHeight": 102.766,
      "anchorX": 0.4435,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 250,
      "y": 676,
      "width": 215,
      "height": 210,
      "logicalWidth": 105.213,
      "logicalHeight": 102.766,
      "anchorX": 0.384302,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 465,
      "y": 676,
      "width": 209,
      "height": 210,
      "logicalWidth": 102.277,
      "logicalHeight": 102.766,
      "anchorX": 0.427632,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 674,
      "y": 676,
      "width": 213,
      "height": 210,
      "logicalWidth": 104.234,
      "logicalHeight": 102.766,
      "anchorX": 0.47946,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 0,
      "y": 903,
      "width": 250,
      "height": 202,
      "logicalWidth": 122.34,
      "logicalHeight": 98.851,
      "anchorX": 0.4435,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 250,
      "y": 903,
      "width": 215,
      "height": 202,
      "logicalWidth": 105.213,
      "logicalHeight": 98.851,
      "anchorX": 0.384302,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 465,
      "y": 903,
      "width": 209,
      "height": 202,
      "logicalWidth": 102.277,
      "logicalHeight": 98.851,
      "anchorX": 0.427632,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 674,
      "y": 903,
      "width": 213,
      "height": 202,
      "logicalWidth": 104.234,
      "logicalHeight": 98.851,
      "anchorX": 0.47946,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 0,
      "y": 1119,
      "width": 250,
      "height": 209,
      "logicalWidth": 122.34,
      "logicalHeight": 102.277,
      "anchorX": 0.4435,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 250,
      "y": 1119,
      "width": 215,
      "height": 209,
      "logicalWidth": 105.213,
      "logicalHeight": 102.277,
      "anchorX": 0.384302,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 465,
      "y": 1119,
      "width": 209,
      "height": 209,
      "logicalWidth": 102.277,
      "logicalHeight": 102.277,
      "anchorX": 0.427632,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 674,
      "y": 1119,
      "width": 213,
      "height": 209,
      "logicalWidth": 104.234,
      "logicalHeight": 102.277,
      "anchorX": 0.47946,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 0,
      "y": 1338,
      "width": 250,
      "height": 211,
      "logicalWidth": 122.34,
      "logicalHeight": 103.255,
      "anchorX": 0.4435,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 250,
      "y": 1338,
      "width": 215,
      "height": 211,
      "logicalWidth": 105.213,
      "logicalHeight": 103.255,
      "anchorX": 0.384302,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 465,
      "y": 1338,
      "width": 209,
      "height": 211,
      "logicalWidth": 102.277,
      "logicalHeight": 103.255,
      "anchorX": 0.427632,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 674,
      "y": 1338,
      "width": 213,
      "height": 211,
      "logicalWidth": 104.234,
      "logicalHeight": 103.255,
      "anchorX": 0.47946,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 0,
      "y": 1562,
      "width": 250,
      "height": 204,
      "logicalWidth": 122.34,
      "logicalHeight": 99.83,
      "anchorX": 0.4435,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 250,
      "y": 1562,
      "width": 215,
      "height": 204,
      "logicalWidth": 105.213,
      "logicalHeight": 99.83,
      "anchorX": 0.384302,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 465,
      "y": 1562,
      "width": 209,
      "height": 204,
      "logicalWidth": 102.277,
      "logicalHeight": 99.83,
      "anchorX": 0.427632,
      "anchorY": 1
    },
    {
      "url": "/art/tokens/generated-combat-20261014/silverfarben.png",
      "x": 674,
      "y": 1562,
      "width": 213,
      "height": 204,
      "logicalWidth": 104.234,
      "logicalHeight": 99.83,
      "anchorX": 0.47946,
      "anchorY": 1
    }
  ]
};
export function installCombatSprites(campaign:PublicCampaignDefinition){
  for(const [tokenId,roles] of Object.entries(combatSpriteRoles)){
    const states=campaign.tokenAnimations[tokenId];if(!states)continue;
    const frames=combatSpriteFrames[tokenId as keyof typeof combatSpriteFrames];
    roles.forEach((role,row)=>{states[role]={frames:frames.slice(row*4,row*4+4),fps:role.startsWith('hit-')?7:6};});
  }
  // NPCs keep their expressive gestures; the audit reports reused clips.
  installCombatVisualFallbacks(campaign);
}
