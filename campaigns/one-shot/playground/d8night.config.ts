export const D8NIGHT: any = {
  maps: {
    cafe: {
      label: "CAFÉ",
      spawn: [0, 0.43, 4.1],
      MAP: {
        size: [24, 16],
        floor: "stone_tavern",
        objects: [
          { asset: "wall", position: [0, -7.65], size: [24, 0.7] },
          { asset: "wall", position: [-11.65, -2.5], size: [0.7, 10] },
          { asset: "wall", position: [11.65, -2], size: [0.7, 11] },
          { asset: "bar", position: [-3.15, -5] },
          { asset: "stool", position: [-6.8, -3.7] },
          { asset: "stool", position: [-4.35, -3.7] },
          { asset: "stool", position: [-1.9, -3.7] },
          { asset: "stool", position: [0.55, -3.7] },
          { asset: "wall_shelf", position: [-5.8, -6.05], size: [3.2, 0.5] },
          { asset: "wall_shelf", position: [-1.9, -6.05], size: [3.2, 0.5] },
          { asset: "bottle_cluster", position: [1.4, -4.65], count: 6 },
          { asset: "plate_stack", position: [2.4, -4.65], count: 5 },
          { asset: "barrel_large", position: [5.15, -5.4] },
          { asset: "barrel_large", position: [7.05, -5.4] },
          { asset: "fireplace", position: [-9.8, -1.3] },
          { asset: "rug", position: [-6.05, 0.45], size: [4.3, 3.6] },
          { asset: "bench", position: [-8.0, 2.2], size: [2.4, 0.65] },
          { asset: "small_barrel", position: [-9.0, 3.8], scale: 0.9 },
          { asset: "table_round", position: [-5.3, 0.45] },
          { asset: "chair", position: [-5.3, -1], rotation: 0 },
          { asset: "chair", position: [-5.3, 1.9], rotation: Math.PI },
          { asset: "chair", position: [-6.75, 0.45], rotation: -Math.PI / 2 },
          { asset: "chair", position: [-3.85, 0.45], rotation: Math.PI / 2 },
          { asset: "candle", position: [-5.3, 0.45], intensity: 0.20, range: 2.5 },
          { asset: "plate_stack", position: [-5.75, 0.18], count: 2, scale: 0.85 },
          { asset: "bottle_cluster", position: [-4.85, 0.30], count: 2, scale: 0.75 },
          { asset: "table_round", position: [1.55, 2.25] },
          { asset: "chair", position: [1.55, 0.7], rotation: 0 },
          { asset: "chair", position: [1.55, 3.8], rotation: Math.PI },
          { asset: "chair", position: [0, 2.25], rotation: -Math.PI / 2 },
          { asset: "chair", position: [3.1, 2.25], rotation: Math.PI / 2 },
          { asset: "candle", position: [1.55, 2.25], intensity: 0.22, range: 2.7 },
          { asset: "bottle_cluster", position: [2.0, 2.05], count: 3, scale: 0.72 },
          { asset: "table_round", position: [5.05, -0.45] },
          { asset: "chair", position: [5.05, -1.9], rotation: 0 },
          { asset: "chair", position: [5.05, 1.0], rotation: Math.PI },
          { asset: "chair", position: [3.6, -0.45], rotation: -Math.PI / 2 },
          { asset: "chair", position: [6.5, -0.45], rotation: Math.PI / 2 },
          { asset: "candle", position: [5.05, -0.45], intensity: 0.20, range: 2.5 },
          { asset: "wall", position: [8.35, 1.4], size: [0.55, 8.2] },
          { asset: "wall", position: [10.1, -2.7], size: [3.8, 0.55] },
          { asset: "wall_shelf", position: [10.25, 1.15], size: [1.5, 0.5], scale: 0.9 },
          { asset: "plate_stack", position: [10.0, 0.6], count: 5, scale: 0.9 },
          { asset: "small_barrel", position: [9.4, 3.6], scale: 0.82 },
          { asset: "pool", position: [3.5, 6.25] },
          { asset: "bench", position: [7.1, 5.8], size: [2.0, 0.62], scale: 0.9 },
          { asset: "cabinet", position: [-8.4, 5.75], size: [4, 0.8] },
          { asset: "crate", position: [9.1, -6.5] },
          { asset: "crate", position: [10, -6.5], scale: 0.8 },
          { asset: "crate", position: [10.8, -6.5], scale: 0.85 }
        ]
      },
      CANON: {
        interactables: [],
        triggers: []
      },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.012, 0.01, 0.012], fog: true, fogDensity: 0.006 },
        lighting: {
          ambientIntensity: 0.22,
          shadows: {
            enabled: true,
            position: [-8, 7, -4],
            direction: [0.75, -1, 0.25],
            intensity: 0.38,
            mapSize: 1024,
            blurKernel: 12
          },
          lights: [
            { position: [-3, 2.4, -4.5], color: [1, 0.5, 0.17], intensity: 0.5, range: 7 },
            { position: [2, 2.5, 1.5], color: [1, 0.6, 0.28], intensity: 0.3, range: 6 },
            { position: [3.5, 0.7, 6.2], color: [0.04, 0.55, 0.65], intensity: 0.48, range: 4.5 }
          ]
        },
        vfx: { fireplace: true, smoke: true, embers: true, dust: true, waterRipples: true, waterMotion: true },
        interactables: [
          { id: "fireplace_ambience", position: [-9.1, -1.3], radius: 2, label: "Mirar chimenea", message: "El fuego proyecta luz cálida sobre la piedra." },
          { id: "bar_ambience", position: [-3.2, -3.6], radius: 1.8, label: "Mirar barra", message: "La barra está llena de botellas, platos y utensilios." },
          { id: "pool_ambience", position: [3.5, 4.8], radius: 1.8, label: "Mirar estanque", message: "La superficie del agua se mueve suavemente." }
        ],
        audio: { music: null, ambience: null }
      }
    },
    temple: {
      label: "TEMPLO",
      spawn: [0, 0.43, 5],
      MAP: {
        size: [24, 16], floor: "stone",
        objects: [
          { asset: "wall", position: [-11.6, 0], size: [0.6, 16] },
          { asset: "wall", position: [11.6, 0], size: [0.6, 16] },
          { asset: "wall", position: [-7, -7.6], size: [9, 0.6] },
          { asset: "wall", position: [7, -7.6], size: [9, 0.6] },
          { asset: "table_round", position: [0, 0], scale: 1.35 },
          { asset: "statue", position: [0, -5.3] }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.02, 0.015, 0.02], fog: true, fogDensity: 0.008 },
        lighting: { ambientIntensity: 0.2, lights: [] },
        vfx: { dust: true },
        audio: {}
      }
    },
    dinner: {
      label: "DINNER",
      spawn: [0, 0.43, 5],
      MAP: {
        size: [24, 16], floor: "stone",
        objects: [
          { asset: "room_floor", position: [0, -4.5], size: [14, 6], material: "wood" },
          { asset: "wall", position: [0, -7.5], size: [14, 0.5] },
          { asset: "wall", position: [-7, -4.5], size: [0.5, 6] },
          { asset: "wall", position: [7, -4.5], size: [0.5, 6] },
          { asset: "table_round", position: [0, 3] }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.015, 0.015, 0.025], fog: true, fogDensity: 0.007 },
        lighting: { ambientIntensity: 0.22, lights: [] },
        vfx: { dust: true },
        audio: {}
      }
    },
    garden: {
      label: "GARDEN",
      spawn: [-7, 0.43, 1],
      MAP: {
        size: [24, 16], floor: "snow",
        objects: [
          { asset: "path", position: [-3, 1], size: [15, 2.3] },
          { asset: "tree", position: [-2, 4.5] }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.08, 0.1, 0.14], fog: true, fogDensity: 0.012 },
        lighting: { ambientIntensity: 0.45, lights: [] },
        vfx: {},
        audio: {}
      }
    },
    market: {
      label: "MARKET",
      spawn: [0, 0.43, 5],
      MAP: {
        size: [24, 16], floor: "stone",
        objects: [
          { asset: "stall", position: [-8, -5], color: "purple" },
          { asset: "stall", position: [-1, -5], color: "yellow" },
          { asset: "stall", position: [6, -5], color: "green" },
          { asset: "stall", position: [-7, 0], color: "purple" },
          { asset: "stall", position: [7, 2], color: "green" }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.05, 0.045, 0.04], fog: false, fogDensity: 0 },
        lighting: { ambientIntensity: 0.55, lights: [] },
        vfx: { dust: true },
        audio: {}
      }
    },
    mirror: {
      label: "MIRROR",
      spawn: [8, 0.43, 5],
      MAP: {
        size: [24, 16], floor: "ice",
        objects: [
          { asset: "water_area", position: [0, 0], size: [17, 7] },
          { asset: "mirror", position: [-10, -2.5] }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.015, 0.04, 0.065], fog: true, fogDensity: 0.014 },
        lighting: {
          ambientIntensity: 0.38,
          lights: [
            { position: [-10, 2, -2.5], color: [0.2, 0.55, 1], intensity: 0.7, range: 6 }
          ]
        },
        vfx: { waterRipples: true },
        audio: {}
      }
    }
  }
};
