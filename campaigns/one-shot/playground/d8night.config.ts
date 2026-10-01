export const D8NIGHT: any = {
  maps: {
    cafe: {
      label: "CAFÉ",
      spawn: [0, 0.43, 4.1],
      camera: { radius: 23.5, beta: 0.43, alpha: -Math.PI / 2.04 },
      MAP: {
        size: [24, 16],
        floor: "stone_tavern",
        visualFloor: "cafe_stone",
        visualComposition: "cafe_reference",
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
          { asset: "barrel_cluster", position: [6.15, -5.25], count: 2, spacing: 1.9, scale: 1.08 },
          { asset: "stone_partition", position: [6.15, -3.65], size: [4.6, 0.45], height: 1.15 },
          { asset: "fireplace", position: [-9.8, -1.3] },
          { asset: "sofa_red", position: [-8.5, -4.15], size: [2.25, 1.0] },
          { asset: "sofa_red", position: [-8.85, 4.2], size: [2.20, 1.0] },
          { asset: "rug", position: [-6.05, 0.45], size: [4.3, 3.6] },
          { asset: "bench", position: [-8.0, 2.2], size: [2.4, 0.65] },
          { asset: "small_barrel", position: [-9.0, 3.8], scale: 0.9 },
          { asset: "table_round", position: [-5.3, 0.45] },
          { asset: "table_dressing", position: [-5.3, 0.45], count: 5, radius: 0.63, paper: true },
          { asset: "chair", position: [-5.3, -1], rotation: 0 },
          { asset: "chair", position: [-5.3, 1.9], rotation: Math.PI },
          { asset: "chair", position: [-6.75, 0.45], rotation: -Math.PI / 2 },
          { asset: "chair", position: [-3.85, 0.45], rotation: Math.PI / 2 },
          { asset: "candle", position: [-5.3, 0.45], intensity: 0.20, range: 2.5 },
          { asset: "plate_stack", position: [-5.75, 0.18], count: 2, scale: 0.85 },
          { asset: "bottle_cluster", position: [-4.85, 0.30], count: 2, scale: 0.75 },
          { asset: "table_round", position: [1.55, 2.25] },
          { asset: "table_dressing", position: [1.55, 2.25], count: 5, radius: 0.67, paper: true },
          { asset: "chair", position: [1.55, 0.7], rotation: 0 },
          { asset: "chair", position: [1.55, 3.8], rotation: Math.PI },
          { asset: "chair", position: [0, 2.25], rotation: -Math.PI / 2 },
          { asset: "chair", position: [3.1, 2.25], rotation: Math.PI / 2 },
          { asset: "candle", position: [1.55, 2.25], intensity: 0.22, range: 2.7 },
          { asset: "bottle_cluster", position: [2.0, 2.05], count: 3, scale: 0.72 },
          { asset: "table_round", position: [5.05, -0.45] },
          { asset: "table_dressing", position: [5.05, -0.45], count: 5, radius: 0.62 },
          { asset: "chair", position: [5.05, -1.9], rotation: 0 },
          { asset: "chair", position: [5.05, 1.0], rotation: Math.PI },
          { asset: "chair", position: [3.6, -0.45], rotation: -Math.PI / 2 },
          { asset: "chair", position: [6.5, -0.45], rotation: Math.PI / 2 },
          { asset: "candle", position: [5.05, -0.45], intensity: 0.20, range: 2.5 },
          { asset: "stone_partition", position: [8.35, 1.4], size: [0.55, 8.2], height: 1.28 },
          { asset: "stone_partition", position: [10.1, -2.7], size: [3.8, 0.55], height: 1.28 },
          { asset: "wall_shelf", position: [10.25, 1.15], size: [1.5, 0.5], scale: 0.9 },
          { asset: "plate_stack", position: [10.0, 0.6], count: 5, scale: 0.9 },
          { asset: "small_barrel", position: [9.4, 3.6], scale: 0.82 },
          { asset: "pool", position: [3.5, 6.25] },
          { asset: "bench", position: [7.1, 5.8], size: [2.0, 0.62], scale: 0.9 },
          { asset: "table_round", position: [10.0, -5.15], scale: 0.78 },
          { asset: "table_dressing", position: [10.0, -5.15], count: 3, radius: 0.46 },
          { asset: "candle", position: [10.0, -5.15], intensity: 0.16, range: 2.2 },
          { asset: "sideboard", position: [-8.4, 5.75], size: [4.2, 0.78] },
          { asset: "plate_stack", position: [-9.5, 5.55], count: 4, scale: 0.82 },
          { asset: "plate_stack", position: [-8.65, 5.55], count: 3, scale: 0.80 },
          { asset: "bottle_cluster", position: [-7.65, 5.55], count: 4, scale: 0.72 },
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
        environment: { clearColor: [0.010, 0.008, 0.008], fog: true, fogDensity: 0.004, exposure: 1.10, contrast: 1.22, toneMapping: true, vignette: true, vignetteWeight: 1.55, vignetteStretch: 0.22 },
        lighting: {
          ambientIntensity: 0.19,
          shadows: {
            enabled: true,
            position: [-8, 7, -4],
            direction: [0.75, -1, 0.25],
            intensity: 0.38,
            mapSize: 1024,
            blurKernel: 12
          },
          lights: [
            { position: [-8.8, 2.5, -1.4], color: [1, 0.28, 0.06], intensity: 0.62, range: 8 },
            { position: [-3, 2.6, -4.5], color: [1, 0.47, 0.14], intensity: 0.42, range: 7 },
            { position: [-5.3, 2.2, 0.45], color: [1, 0.55, 0.24], intensity: 0.20, range: 4.5 },
            { position: [1.55, 2.2, 2.25], color: [1, 0.52, 0.22], intensity: 0.20, range: 4.5 },
            { position: [5.05, 2.2, -0.45], color: [1, 0.52, 0.22], intensity: 0.20, range: 4.5 },
            { position: [3.5, 0.85, 6.2], color: [0.03, 0.48, 0.62], intensity: 0.42, range: 4.5 }
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
      spawn: [0, 0.43, 6.6],
      camera: { radius: 25, beta: 0.49, alpha: -Math.PI / 2.05 },
      MAP: {
        size: [28, 18],
        floor: "stone",
        visualFloor: "temple_stone",
        visualComposition: "temple_reference",
        objects: [
          { asset: "wall", position: [0, -8.65], size: [27.5, 0.55], height: 1.9 },
          { asset: "wall", position: [-13.65, -2.0], size: [0.55, 13.5], height: 1.7 },
          { asset: "wall", position: [13.65, -2.0], size: [0.55, 13.5], height: 1.7 },
          { asset: "archway", position: [0, -7.9], size: [4.2, 0.7], height: 4.2 },
          { asset: "column", position: [-8.2, -5.5], height: 3.8 },
          { asset: "column", position: [8.2, -5.5], height: 3.8 },
          { asset: "column", position: [-8.2, -1.6], height: 3.5 },
          { asset: "column", position: [8.2, -1.6], height: 3.5 },
          { asset: "column", position: [-8.2, 2.4], height: 3.1 },
          { asset: "column", position: [8.2, 2.4], height: 3.1 },
          { asset: "long_table", position: [0, 0.7], size: [6.8, 1.5] },
          { asset: "chair", position: [-2.5, -0.7], rotation: 0 },
          { asset: "chair", position: [0, -0.7], rotation: 0 },
          { asset: "chair", position: [2.5, -0.7], rotation: 0 },
          { asset: "chair", position: [-2.5, 2.1], rotation: Math.PI },
          { asset: "chair", position: [0, 2.1], rotation: Math.PI },
          { asset: "chair", position: [2.5, 2.1], rotation: Math.PI },
          { asset: "candle", position: [-2.0, 0.7], intensity: 0.24, range: 3.0 },
          { asset: "candle", position: [0, 0.7], intensity: 0.25, range: 3.2 },
          { asset: "candle", position: [2.0, 0.7], intensity: 0.24, range: 3.0 },
          { asset: "statue", position: [0, -5.7] },
          { asset: "rose_patch", position: [-9.9, 5.1], size: [3.4, 1.5], count: 14 },
          { asset: "rose_patch", position: [9.9, 5.1], size: [3.4, 1.5], count: 14 },
          { asset: "rose_patch", position: [-10.2, -4.1], size: [2.4, 1.3], count: 10 },
          { asset: "rose_patch", position: [10.2, -4.1], size: [2.4, 1.3], count: 10 }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.012, 0.010, 0.020], fog: true, fogDensity: 0.006, exposure: 1.02, contrast: 1.14, toneMapping: true, vignette: true, vignetteWeight: 1.35 },
        lighting: {
          ambientIntensity: 0.16,
          shadows: { enabled: true, position: [-8, 9, 4], direction: [0.55, -1, -0.18], intensity: 0.30, mapSize: 1024, blurKernel: 14 },
          lights: [
            { position: [0, 3.8, -5.2], color: [0.30, 0.34, 0.55], intensity: 0.36, range: 11 },
            { position: [0, 2.8, 2.0], color: [1, 0.38, 0.12], intensity: 0.20, range: 8 }
          ]
        },
        vfx: { dust: true, fireflies: true, fireflyCount: 10, roseSway: true },
        interactables: [
          { id: "temple_table_ambience", position: [0, 2.7], radius: 2.4, label: "Mirar mesa", message: "Las velas bañan la mesa y las rosas con una luz cálida." },
          { id: "temple_statue_ambience", position: [0, -4.0], radius: 2.2, label: "Mirar estatua", message: "La figura de piedra domina el extremo del salón." }
        ],
        audio: { music: null, ambience: null }
      }
    },

    dinner: {
      label: "DINNER",
      spawn: [0, 0.43, 7.0],
      camera: { radius: 25, beta: 0.50, alpha: -Math.PI / 2.08 },
      MAP: {
        size: [28, 18],
        floor: "stone",
        visualFloor: "night_cobble",
        visualComposition: "dinner_reference",
        objects: [
          { asset: "house", position: [0, -4.9], size: [12.0, 5.4], height: 2.8 },
          { asset: "path", position: [0, 3.2], size: [13.0, 3.0] },
          { asset: "table_round", position: [0, 3.2], scale: 1.15 },
          { asset: "chair", position: [0, 1.4], rotation: 0 },
          { asset: "chair", position: [0, 5.0], rotation: Math.PI },
          { asset: "chair", position: [-1.8, 3.2], rotation: -Math.PI / 2 },
          { asset: "chair", position: [1.8, 3.2], rotation: Math.PI / 2 },
          { asset: "candle", position: [0, 3.2], intensity: 0.28, range: 3.4 },
          { asset: "lantern_post", position: [-4.8, 3.2], intensity: 0.58, range: 5.5 },
          { asset: "lantern_post", position: [4.8, 3.2], intensity: 0.58, range: 5.5 },
          { asset: "market_stall", position: [8.4, -0.3], size: [3.5, 1.8], color: "clothRed", scale: 0.9 },
          { asset: "crate", position: [8.4, 2.0], scale: 0.9 },
          { asset: "small_barrel", position: [10.0, 1.8], scale: 0.9 },
          { asset: "bench", position: [-8.8, 1.8], size: [2.5, 0.68] },
          { asset: "rose_patch", position: [-8.8, -2.6], size: [3.1, 1.4], count: 12 },
          { asset: "rose_patch", position: [8.8, -4.0], size: [2.8, 1.3], count: 10 }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.018, 0.022, 0.045], fog: true, fogDensity: 0.005, exposure: 1.03, contrast: 1.16, toneMapping: true, vignette: true, vignetteWeight: 1.40 },
        lighting: {
          ambientIntensity: 0.20,
          shadows: { enabled: true, position: [-8, 8, -2], direction: [0.55, -1, 0.30], intensity: 0.32, mapSize: 1024, blurKernel: 12 },
          lights: [
            { position: [0, 2.1, -7.4], color: [1, 0.42, 0.12], intensity: 0.48, range: 8 },
            { position: [0, 5.0, 4.0], color: [0.18, 0.22, 0.42], intensity: 0.24, range: 12 }
          ]
        },
        vfx: { fireflies: true, fireflyCount: 20, roseSway: true },
        interactables: [
          { id: "dinner_table_ambience", position: [0, 4.8], radius: 2.0, label: "Mirar cena", message: "La mesa exterior está preparada bajo la luz de las linternas." },
          { id: "dinner_house_ambience", position: [0, -1.8], radius: 2.4, label: "Mirar casa", message: "Una luz cálida se filtra por las ventanas de la casa." }
        ],
        audio: { music: null, ambience: null }
      }
    },

    garden: {
      label: "GARDEN",
      spawn: [-10.5, 0.43, 6.0],
      camera: { radius: 26, beta: 0.48, alpha: -Math.PI / 2.00 },
      MAP: {
        size: [28, 20],
        floor: "snow",
        visualFloor: "snow",
        visualComposition: "garden_reference",
        objects: [
          { asset: "path", position: [-1.0, 4.8], size: [23.0, 2.2] },
          { asset: "path", position: [5.8, 0.2], size: [2.2, 11.0] },
          { asset: "round_room", position: [7.2, -3.0], radius: 3.3, segments: 20, opening: 3, height: 1.6 },
          { asset: "bed", position: [7.2, -3.6], size: [1.3, 2.25] },
          { asset: "rug", position: [7.2, -1.1], size: [3.0, 2.0] },
          { asset: "candle", position: [6.2, -1.0], intensity: 0.18, range: 2.4 },
          { asset: "candle", position: [8.1, -1.0], intensity: 0.18, range: 2.4 },
          { asset: "rose_patch", position: [-7.8, -4.9], size: [4.2, 1.7], count: 18 },
          { asset: "rose_patch", position: [-7.8, -2.1], size: [4.2, 1.7], count: 18 },
          { asset: "rose_patch", position: [-7.8, 0.8], size: [4.2, 1.7], count: 18 },
          { asset: "rose_patch", position: [-2.7, -4.7], size: [3.4, 1.6], count: 14 },
          { asset: "rose_patch", position: [-2.7, -1.8], size: [3.4, 1.6], count: 14 },
          { asset: "snow_tree", position: [-11.0, -6.5], height: 3.7 },
          { asset: "snow_tree", position: [-11.2, 2.8], height: 3.4 },
          { asset: "snow_tree", position: [0.0, -7.2], height: 3.3 },
          { asset: "snow_tree", position: [11.4, 4.6], height: 3.5 },
          { asset: "lantern_post", position: [3.7, 4.8], intensity: 0.45, range: 4.5 },
          { asset: "wall", position: [0, -9.6], size: [27.0, 0.45], height: 1.1, material: "stone2" },
          { asset: "wall", position: [-13.5, 0], size: [0.45, 19.0], height: 1.1, material: "stone2" }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.055, 0.080, 0.12], fog: true, fogDensity: 0.010, exposure: 1.05, contrast: 1.12, toneMapping: true, vignette: true, vignetteWeight: 1.20 },
        lighting: {
          ambientIntensity: 0.38,
          shadows: { enabled: true, position: [-7, 10, -7], direction: [0.40, -1, 0.38], intensity: 0.28, mapSize: 1024, blurKernel: 14 },
          lights: [
            { position: [-6, 5.5, -2], color: [0.36, 0.48, 0.70], intensity: 0.38, range: 16 },
            { position: [7.2, 2.5, -3.0], color: [1, 0.42, 0.16], intensity: 0.24, range: 6 }
          ]
        },
        vfx: { snowfall: true, snowCount: 50, snowSpeed: 0.40, roseSway: true, fireflies: true, fireflyCount: 7 },
        interactables: [
          { id: "garden_roses_ambience", position: [-6.0, -1.5], radius: 2.2, label: "Mirar rosales", message: "Los rosales destacan con fuerza sobre la nieve." },
          { id: "garden_room_ambience", position: [4.5, -3.0], radius: 2.2, label: "Mirar estancia", message: "Una pequeña estancia circular se abre entre los muros del jardín." }
        ],
        audio: { music: null, ambience: null }
      }
    },

    market: {
      label: "MARKET",
      spawn: [0, 0.43, 7.2],
      camera: { radius: 27, beta: 0.50, alpha: -Math.PI / 2.10 },
      MAP: {
        size: [30, 20],
        floor: "stone",
        visualFloor: "market_cobble",
        visualComposition: "market_reference",
        visualFloor: "market_cobble",
        objects: [
          { asset: "market_stall", position: [-10.2, -5.6], size: [3.8, 2.0], color: "purple" },
          { asset: "market_stall", position: [-4.9, -5.9], size: [3.7, 2.0], color: "yellow" },
          { asset: "market_stall", position: [0.5, -5.7], size: [3.8, 2.0], color: "green" },
          { asset: "market_stall", position: [6.0, -5.4], size: [3.7, 2.0], color: "clothRed" },
          { asset: "market_stall", position: [-10.0, 0.1], size: [3.8, 2.0], color: "clothBlue" },
          { asset: "market_stall", position: [10.2, -0.2], size: [3.8, 2.0], color: "purple" },
          { asset: "market_stall", position: [-7.2, 5.0], size: [3.6, 2.0], color: "green" },
          { asset: "market_stall", position: [7.6, 5.0], size: [3.6, 2.0], color: "yellow" },
          { asset: "trough", position: [2.4, 2.4], size: [3.0, 1.05] },
          { asset: "cow_proxy", position: [5.1, 2.4], facing: -1, scale: 1.0 },
          { asset: "lantern_post", position: [-12.2, 6.3], intensity: 0.62, range: 5.5 },
          { asset: "lantern_post", position: [12.2, 6.3], intensity: 0.62, range: 5.5 },
          { asset: "lantern_post", position: [-2.7, 0.1], intensity: 0.58, range: 5.0 },
          { asset: "lantern_post", position: [4.0, -0.2], intensity: 0.58, range: 5.0 },
          { asset: "crate", position: [-12.0, -2.8] },
          { asset: "crate", position: [-11.2, -2.8], scale: 0.82 },
          { asset: "crate", position: [12.2, -3.0], scale: 0.9 },
          { asset: "small_barrel", position: [11.4, -3.0], scale: 0.9 },
          { asset: "bench", position: [-1.0, 5.6], size: [2.4, 0.65] },
          { asset: "bench", position: [2.0, 5.6], size: [2.4, 0.65] }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.018, 0.018, 0.034], fog: true, fogDensity: 0.004, exposure: 1.06, contrast: 1.17, toneMapping: true, vignette: true, vignetteWeight: 1.35 },
        lighting: {
          ambientIntensity: 0.19,
          shadows: { enabled: true, position: [-10, 9, -5], direction: [0.5, -1, 0.3], intensity: 0.30, mapSize: 1024, blurKernel: 12 },
          lights: [
            { position: [0, 6.0, 0], color: [0.18, 0.22, 0.42], intensity: 0.28, range: 18 }
          ]
        },
        vfx: { dust: true, fireflies: true, fireflyCount: 10 },
        interactables: [
          { id: "market_trough_ambience", position: [2.4, 4.0], radius: 2.0, label: "Mirar abrevadero", message: "Una vaca permanece junto al abrevadero entre los puestos." },
          { id: "market_stalls_ambience", position: [-4.9, -3.8], radius: 2.0, label: "Mirar puestos", message: "Los puestos forman calles estrechas iluminadas por faroles." }
        ],
        audio: { music: null, ambience: null }
      }
    },

    mirror: {
      label: "MIRROR",
      spawn: [10.5, 0.43, 6.8],
      camera: { radius: 27, beta: 0.47, alpha: -Math.PI / 2.16 },
      MAP: {
        size: [30, 20],
        floor: "ice",
        visualFloor: "ice",
        visualComposition: "mirror_reference",
        objects: [
          { asset: "water_area", position: [2.0, 0.6], size: [18.0, 8.0] },
          { asset: "ice_crack", position: [2.0, 0.0], branches: 7, length: 5.2, rotation: 0.2 },
          { asset: "ice_crack", position: [-3.2, 4.0], branches: 5, length: 3.0, rotation: 1.1 },
          { asset: "ice_crack", position: [7.8, -4.6], branches: 5, length: 2.8, rotation: 0.7 },
          { asset: "magic_pedestal", position: [-9.2, -2.5], scale: 1.05, intensity: 0.85 },
          { asset: "mirror_frame", position: [-9.2, -2.5], scale: 1.05, rotation: Math.PI / 2 },
          { asset: "ice_crystal", position: [-12.0, -5.5], height: 1.6, rotation: 0.3 },
          { asset: "ice_crystal", position: [-6.3, -6.2], height: 1.2, rotation: 1.1 },
          { asset: "ice_crystal", position: [-12.2, 2.0], height: 1.4, rotation: 0.8 },
          { asset: "ice_crystal", position: [10.5, -5.8], height: 1.3, rotation: 0.5 },
          { asset: "ice_crystal", position: [12.0, 3.8], height: 1.6, rotation: 1.4 }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.010, 0.035, 0.070], fog: true, fogDensity: 0.010, exposure: 1.08, contrast: 1.18, toneMapping: true, vignette: true, vignetteWeight: 1.15 },
        lighting: {
          ambientIntensity: 0.32,
          shadows: { enabled: true, position: [7, 10, 3], direction: [-0.45, -1, -0.25], intensity: 0.22, mapSize: 1024, blurKernel: 16 },
          lights: [
            { position: [-9.2, 3.2, -2.5], color: [0.12, 0.52, 1], intensity: 0.62, range: 9 },
            { position: [4.0, 4.5, 1.0], color: [0.18, 0.36, 0.62], intensity: 0.30, range: 14 }
          ]
        },
        vfx: { waterRipples: true, magicMotes: true, magicCount: 18, snowfall: true, snowCount: 22, snowSpeed: 0.18 },
        interactables: [
          { id: "mirror_ambience", position: [-7.3, -2.5], radius: 2.2, label: "Mirar espejo", message: "El espejo se alza sobre un pedestal rodeado de luz azulada." },
          { id: "ice_ambience", position: [4.5, 2.6], radius: 2.0, label: "Mirar hielo", message: "Grietas oscuras recorren la superficie helada." }
        ],
        audio: { music: null, ambience: null }
      }
    }
  }
};
