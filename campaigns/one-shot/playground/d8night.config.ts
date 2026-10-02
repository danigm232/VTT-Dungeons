// V14.7 ART DIRECTION
// Reference images define composition, palette, prop density and lighting goals only.
// They are NOT rendered as scene backgrounds. All six maps remain native Babylon 2.5D.
//
// Café -> Cafe no-me-olvides IA.png
// Templo -> temple-original.png
// Dinner -> Cena con Anteros.png
// Garden -> El jardin de la srta fritz IA.png
// Market -> El Mercado Nocturno IA.png
// Mirror -> El Espejo de plata del amor verdadero IA.png
export const D8NIGHT: any = {
  maps: {
    cafe: {
      label: "CAFÉ",
      spawn: [0, 0.43, 4.1],
      camera: { radius: 21.5, beta: 0.66, alpha: -Math.PI / 2.04 },
      MAP: {
        size: [24, 16],
        floor: "stone_tavern",
        renderMode: "clean_v12",
        visualFloor: "cafe_stone",
        visualComposition: "cafe_reference",
        enableVisualComposition: false,
        compositionOpacity: 0,
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
          { asset: "wall_torch", position: [-8.2, -6.85], intensity: 1.55, range: 9.0 },
          { asset: "wall_torch", position: [-3.2, -6.85], intensity: 1.45, range: 8.6 },
          { asset: "wall_torch", position: [1.4, -6.85], intensity: 1.45, range: 8.6 },
          { asset: "wall_torch", position: [7.4, -6.2], intensity: 1.35, range: 8.2 },
          { asset: "bottle_cluster", position: [1.4, -4.65], count: 6 },
          { asset: "plate_stack", position: [2.4, -4.65], count: 5 },
          { asset: "barrel_cluster", position: [6.15, -5.25], count: 2, spacing: 1.9, scale: 1.08 },
          { asset: "stone_partition", position: [6.15, -3.65], size: [4.6, 0.45], height: 1.15 },
          { asset: "fireplace", position: [-9.8, -1.3] },
          { asset: "sofa_red", position: [-8.5, -4.15], size: [2.25, 1.0] },
          { asset: "sofa_red", position: [-8.85, 4.2], size: [2.20, 1.0] },
          { asset: "wall_torch", position: [-10.7, 3.0], intensity: 1.30, range: 8.0 },
          { asset: "wall_torch", position: [10.7, 2.3], intensity: 1.30, range: 8.0 },
          { asset: "rug", position: [-6.05, 0.45], size: [4.3, 3.6] },
          { asset: "bench", position: [-8.0, 2.2], size: [2.4, 0.65] },
          { asset: "small_barrel", position: [-9.0, 3.8], scale: 0.9 },
          { asset: "table_round", position: [-5.3, 0.45] },
          { asset: "table_dressing", position: [-5.3, 0.45], count: 5, radius: 0.63, paper: true },
          { asset: "chair", position: [-5.3, -1], rotation: 0 },
          { asset: "chair", position: [-5.3, 1.9], rotation: Math.PI },
          { asset: "chair", position: [-6.75, 0.45], rotation: -Math.PI / 2 },
          { asset: "chair", position: [-3.85, 0.45], rotation: Math.PI / 2 },
          { asset: "candle", position: [-5.3, 0.45], intensity: 0.52, range: 4.6 },
          { asset: "plate_stack", position: [-5.75, 0.18], count: 2, scale: 0.85 },
          { asset: "bottle_cluster", position: [-4.85, 0.30], count: 2, scale: 0.75 },
          { asset: "table_round", position: [1.55, 2.25] },
          { asset: "table_dressing", position: [1.55, 2.25], count: 5, radius: 0.67, paper: true },
          { asset: "chair", position: [1.55, 0.7], rotation: 0 },
          { asset: "chair", position: [1.55, 3.8], rotation: Math.PI },
          { asset: "chair", position: [0, 2.25], rotation: -Math.PI / 2 },
          { asset: "chair", position: [3.1, 2.25], rotation: Math.PI / 2 },
          { asset: "candle", position: [1.55, 2.25], intensity: 0.55, range: 4.8 },
          { asset: "bottle_cluster", position: [2.0, 2.05], count: 3, scale: 0.72 },
          { asset: "table_round", position: [5.05, -0.45] },
          { asset: "table_dressing", position: [5.05, -0.45], count: 5, radius: 0.62 },
          { asset: "chair", position: [5.05, -1.9], rotation: 0 },
          { asset: "chair", position: [5.05, 1.0], rotation: Math.PI },
          { asset: "chair", position: [3.6, -0.45], rotation: -Math.PI / 2 },
          { asset: "chair", position: [6.5, -0.45], rotation: Math.PI / 2 },
          { asset: "candle", position: [5.05, -0.45], intensity: 0.52, range: 4.6 },
          { asset: "stone_partition", position: [8.35, 1.4], size: [0.55, 8.2], height: 1.28 },
          { asset: "stone_partition", position: [10.1, -2.7], size: [3.8, 0.55], height: 1.28 },
          { asset: "wall_shelf", position: [10.25, 1.15], size: [1.5, 0.5], scale: 0.9 },
          { asset: "plate_stack", position: [10.0, 0.6], count: 5, scale: 0.9 },
          { asset: "small_barrel", position: [9.4, 3.6], scale: 0.82 },
          { asset: "pool", position: [3.5, 6.25] },
          { asset: "bench", position: [7.1, 5.8], size: [2.0, 0.62], scale: 0.9 },
          { asset: "table_round", position: [10.0, -5.15], scale: 0.78 },
          { asset: "table_dressing", position: [10.0, -5.15], count: 3, radius: 0.46 },
          { asset: "candle", position: [10.0, -5.15], intensity: 0.48, range: 4.4 },
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
        environment: { clearColor: [0.10, 0.072, 0.045], fog: false, fogDensity: 0, exposure: 1.00, contrast: 1.03, toneMapping: false, vignette: false, glowIntensity: 0.12, sharpen: 0.62, sharpenColor: 1.04 },
        lighting: {
          mode: "interior",
          ambientIntensity: 0.78,
          ambientColor: [1.00, 0.88, 0.72],
          globalFill: {
            color: [1.00, 0.80, 0.60],
            intensity: 0.58,
            hemiIntensity: 0.52,
            directionalIntensity: 0.22,
            direction: [-0.28, -1, 0.20],
            points: [
              { position: [-6.5, 5.0, -4.0], color: [1.00, 0.74, 0.50], intensity: 0.72, range: 11.5 },
              { position: [0.0, 5.2, -1.0], color: [1.00, 0.80, 0.58], intensity: 0.66, range: 12.5 },
              { position: [6.5, 4.8, -2.5], color: [1.00, 0.72, 0.48], intensity: 0.62, range: 11.2 },
              { position: [-5.5, 4.2, 4.5], color: [1.00, 0.78, 0.54], intensity: 0.58, range: 10.5 },
              { position: [5.8, 4.0, 4.6], color: [0.64, 0.86, 0.88], intensity: 0.42, range: 8.8 }
            ]
          },
          shadows: { enabled: false },
          lights: [
            { position: [-9.2, 2.0, -1.3], color: [1.00, 0.44, 0.16], intensity: 1.05, range: 12.5 },
            { position: [3.5, 0.85, 6.2], color: [0.03, 0.54, 0.68], intensity: 0.48, range: 6.5 }
          ]
        },
        vfx: { fireplace: true, smoke: true, embers: true, dust: true, waterRipples: true, waterMotion: true },
        interactables: [
          { id: "fireplace_ambience", position: [-9.1, -1.3], radius: 2, label: "Mirar chimenea", message: "El fuego proyecta luz cálida sobre la piedra." },
          { id: "bar_ambience", position: [-3.2, -3.6], radius: 1.8, label: "Mirar barra", message: "La barra está llena de botellas, platos y utensilios." },
          { id: "pool_ambience", position: [3.5, 4.8], radius: 1.8, label: "Mirar estanque", message: "La superficie del agua se mueve suavemente." }
        ],
        visual: {
          profile: "cafe_warm_fireplace",
          glow: 0.20,
          exposure: 1.06,
          contrast: 1.08,
          fov: 0.72,
          sceneAmbient: [0.10, 0.065, 0.038],
          diffuseBoost: 1.02,
          emissiveFloor: 0.035,
          specular: 0.022,
          maxRealPointLights: 5,
          contactShadows: [
            { position: [-3.2, -5.0], size: [11.5, 2.0], alpha: 0.14 },
            { position: [-5.3, 0.45], size: [2.6, 2.2], alpha: 0.16 },
            { position: [1.55, 2.25], size: [2.6, 2.2], alpha: 0.16 },
            { position: [5.05, -0.45], size: [2.6, 2.2], alpha: 0.16 },
            { position: [5.9, -5.25], size: [3.4, 1.8], alpha: 0.15 }
          ],
          lightPools: [
            { position: [-8.9, -1.2], size: [7.0, 5.0], color: [1.00, 0.22, 0.05], alpha: 0.22 },
            { position: [-2.8, -4.6], size: [10.5, 3.6], color: [1.00, 0.48, 0.14], alpha: 0.09 },
            { position: [3.5, 6.0], size: [6.1, 4.4], color: [0.05, 0.58, 0.70], alpha: 0.12 }
          ]
        },
        audio: { music: null, ambience: null }
      }
    },
    temple: {
      label: "TEMPLO",
      spawn: [0, 0.43, 11.1],
      camera: { radius: 29.5, beta: 0.58, alpha: -Math.PI / 2.04 },
      MAP: {
        size: [28, 24],
        floor: "stone",
        visualFloor: "temple_stone",
        visualComposition: "temple_reference",
        enableVisualComposition: false,
        compositionOpacity: 0,
        objects: [
          // V14.9 TEMPLE ACCESS: enclosed interior with one southern entrance.
          { asset: "wall", position: [0, -8.65], size: [27.5, 0.55], height: 1.9 },
          { asset: "wall", position: [-13.65, -0.45], size: [0.55, 17.0], height: 1.9 },
          { asset: "wall", position: [13.65, -0.45], size: [0.55, 17.0], height: 1.9 },
          { asset: "wall", position: [-7.8, 7.75], size: [11.5, 0.55], height: 1.9 },
          { asset: "wall", position: [7.8, 7.75], size: [11.5, 0.55], height: 1.9 },
          { asset: "archway", position: [0, 7.45], size: [4.2, 0.7], height: 3.4 },

          // Exterior approach: water crossed by a narrow wooden bridge, then stone stairs.
          { asset: "water_area", position: [0, 10.15], size: [24.0, 3.7] },
          { asset: "bridge", position: [0, 10.15], size: [2.6, 4.25], planks: 13 },
          { asset: "stairs", position: [0, 7.95], size: [2.9, 2.35], steps: 5, height: 0.62, material: "stone" },
          { asset: "path", position: [0, 6.75], size: [3.0, 1.4] },

          // Water is not walkable except via the bridge.
          { asset: "collider_only", position: [-7.1, 10.15], size: [10.9, 3.7] },
          { asset: "collider_only", position: [7.1, 10.15], size: [10.9, 3.7] },
          { asset: "column", position: [-8.2, -5.5], height: 3.8 },
          { asset: "column", position: [8.2, -5.5], height: 3.8 },
          { asset: "column", position: [-8.2, -1.6], height: 3.5 },
          { asset: "column", position: [8.2, -1.6], height: 3.5 },
          { asset: "column", position: [-8.2, 2.4], height: 3.1 },
          { asset: "column", position: [8.2, 2.4], height: 3.1 },
          { asset: "long_table", position: [0, 0.7], size: [6.8, 1.5] },
          { asset: "chair", position: [0, -0.75], rotation: 0 },
          { asset: "chair", position: [0, 2.15], rotation: Math.PI },
          { asset: "candle", position: [-2.0, 0.7], intensity: 0.55, range: 4.8 },
          { asset: "candle", position: [0, 0.7], intensity: 0.58, range: 5.0 },
          { asset: "candle", position: [2.0, 0.7], intensity: 0.55, range: 4.8 },
          { asset: "candle", position: [-3.0, 0.7], intensity: 0.48, range: 4.5 },
          { asset: "candle", position: [3.0, 0.7], intensity: 0.48, range: 4.5 },
          { asset: "candle", position: [-1.0, 0.7], intensity: 0.50, range: 4.6 },
          { asset: "candle", position: [1.0, 0.7], intensity: 0.50, range: 4.6 },
          { asset: "chandelier", position: [0, -1.6], height: 3.4, radius: 1.35, count: 10, intensity: 1.90, range: 11.5 },
          { asset: "chandelier", position: [0, 3.5], height: 3.25, radius: 1.20, count: 8, intensity: 1.65, range: 10.5 },
          { asset: "brazier", position: [-5.5, -5.0], intensity: 2.35, range: 10.0 },
          { asset: "brazier", position: [5.5, -5.0], intensity: 2.35, range: 10.0 },
          { asset: "brazier", position: [-6.5, 3.6], intensity: 1.85, range: 8.8 },
          { asset: "brazier", position: [6.5, 3.6], intensity: 1.85, range: 8.8 },
          { asset: "wall_sconce", position: [-10.8, -5.2], intensity: 0.98, range: 7.2 },
          { asset: "wall_sconce", position: [10.8, -5.2], intensity: 0.98, range: 7.2 },
          { asset: "wall_sconce", position: [-10.8, -0.8], intensity: 0.90, range: 6.9 },
          { asset: "wall_sconce", position: [10.8, -0.8], intensity: 0.90, range: 6.9 },
          { asset: "wall_sconce", position: [-10.8, 4.0], intensity: 0.84, range: 6.6 },
          { asset: "wall_sconce", position: [10.8, 4.0], intensity: 0.84, range: 6.6 },
          { asset: "statue", position: [0, -5.7] },
          { asset: "rose_patch", position: [-9.4, 5.45], size: [3.0, 1.3], count: 12 },
          { asset: "rose_patch", position: [9.4, 5.45], size: [3.0, 1.3], count: 12 },
          { asset: "rose_patch", position: [-10.2, -4.1], size: [2.4, 1.3], count: 10 },
          { asset: "rose_patch", position: [10.2, -4.1], size: [2.4, 1.3], count: 10 }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.050, 0.035, 0.025], fog: false, fogDensity: 0, exposure: 1.20, contrast: 1.00, toneMapping: false, vignette: false },
        lighting: {
          mode: "interior",
          ambientIntensity: 0.82,
          ambientColor: [1.00, 0.80, 0.58],
          globalFill: { color: [1.00, 0.78, 0.56], intensity: 0.50, hemiIntensity: 0.44, directionalIntensity: 0.30, direction: [-0.24, -1, 0.18] },
          shadows: { enabled: false },
          lights: [
            { position: [0, 2.8, 0.8], color: [1.00, 0.54, 0.20], intensity: 0.55, range: 10.5 }
          ]
        },
        vfx: { dust: true, fireflies: true, fireflyCount: 10, roseSway: true },
        interactables: [
          { id: "temple_table_ambience", position: [0, 2.7], radius: 2.4, label: "Mirar mesa", message: "Las velas bañan la mesa y las rosas con una luz cálida." },
          { id: "temple_statue_ambience", position: [0, -4.0], radius: 2.2, label: "Mirar estatua", message: "La figura de piedra domina el extremo del salón." }
        ],
        visual: {
          profile: "temple_banquet",
          glow: 0.18,
          exposure: 1.10,
          contrast: 1.08,
          fov: 0.70,
          sceneAmbient: [0.085, 0.060, 0.045],
          diffuseBoost: 1.06,
          emissiveFloor: 0.025,
          specular: 0.025,
          maxRealPointLights: 5,
          contactShadows: [
            { position: [0, 0.7], size: [8.0, 2.4], alpha: 0.16 },
            { position: [-8.2, -1.5], size: [2.0, 8.8], alpha: 0.11 },
            { position: [8.2, -1.5], size: [2.0, 8.8], alpha: 0.11 }
          ],
          lightPools: [
            { position: [0, 0.7], size: [10.0, 5.4], color: [1.00, 0.50, 0.16], alpha: 0.13 },
            { position: [-5.5, -5.0], size: [5.0, 4.0], color: [1.00, 0.22, 0.04], alpha: 0.13 },
            { position: [5.5, -5.0], size: [5.0, 4.0], color: [1.00, 0.22, 0.04], alpha: 0.13 },
            { position: [0, 10.1], size: [8.0, 4.0], color: [0.08, 0.38, 0.52], alpha: 0.08 }
          ]
        },
        audio: { music: null, ambience: null }
      }
    },

    dinner: {
      label: "DINNER",
      spawn: [0, 0.43, 7.0],
      camera: { radius: 24.8, beta: 0.60, alpha: -Math.PI / 2.08 },
      MAP: {
        size: [28, 18],
        floor: "stone",
        visualFloor: "night_cobble",
        visualComposition: "dinner_reference",
        enableVisualComposition: false,
        compositionOpacity: 0,
        objects: [
          { asset: "house", position: [0, -4.9], size: [12.0, 5.4], height: 2.8, windowLightIntensity: 0.95, windowLightRange: 6.8 },
          { asset: "path", position: [0, 3.2], size: [13.0, 3.0] },
          { asset: "table_round", position: [0, 3.2], scale: 1.15 },
          { asset: "chair", position: [0, 1.4], rotation: 0 },
          { asset: "chair", position: [0, 5.0], rotation: Math.PI },
          { asset: "chair", position: [-1.8, 3.2], rotation: -Math.PI / 2 },
          { asset: "chair", position: [1.8, 3.2], rotation: Math.PI / 2 },
          { asset: "candle", position: [0, 3.2], intensity: 0.46, range: 4.5 },
          { asset: "lantern_post", position: [-4.8, 3.2], intensity: 0.92, range: 7.2 },
          { asset: "lantern_post", position: [4.8, 3.2], intensity: 0.92, range: 7.2 },
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
        environment: { clearColor: [0.028, 0.034, 0.060], fog: true, fogDensity: 0.0025, exposure: 1.02, contrast: 1.06, toneMapping: true, vignette: true, vignetteWeight: 0.76 },
        lighting: {
          mode: "exterior",
          ambientIntensity: 0.34,
          ambientColor: [0.58, 0.65, 0.84],
          natural: { position: [-8, 11, -6], direction: [0.42, -1, 0.28], color: [0.54, 0.66, 0.88], intensity: 0.46 },
          shadows: { enabled: true, mapSize: 1024, blurKernel: 12 },
          lights: []
        },
        vfx: { fireflies: true, fireflyCount: 20, roseSway: true },
        interactables: [
          { id: "dinner_table_ambience", position: [0, 4.8], radius: 2.0, label: "Mirar cena", message: "La mesa exterior está preparada bajo la luz de las linternas." },
          { id: "dinner_house_ambience", position: [0, -1.8], radius: 2.4, label: "Mirar casa", message: "Una luz cálida se filtra por las ventanas de la casa." }
        ],
        visual: {
          profile: "dinner_twilight",
          glow: 0.16,
          exposure: 1.08,
          contrast: 1.07,
          fov: 0.72,
          sceneAmbient: [0.060, 0.070, 0.105],
          diffuseBoost: 1.04,
          emissiveFloor: 0.018,
          specular: 0.024,
          maxRealPointLights: 5,
          contactShadows: [
            { position: [0, -4.9], size: [12.8, 6.0], alpha: 0.13 },
            { position: [0, 3.2], size: [3.0, 2.6], alpha: 0.16 },
            { position: [8.4, -0.3], size: [4.0, 2.5], alpha: 0.13 }
          ],
          lightPools: [
            { position: [0, -2.7], size: [12.0, 5.0], color: [1.00, 0.44, 0.14], alpha: 0.11 },
            { position: [0, 3.2], size: [6.2, 5.2], color: [1.00, 0.56, 0.20], alpha: 0.12 }
          ]
        },
        audio: { music: null, ambience: null }
      }
    },

    garden: {
      label: "GARDEN",
      spawn: [-10.5, 0.43, 6.0],
      camera: { radius: 25.8, beta: 0.58, alpha: -Math.PI / 2.00 },
      MAP: {
        size: [28, 20],
        floor: "snow",
        visualFloor: "snow",
        visualComposition: "garden_reference",
        enableVisualComposition: false,
        compositionOpacity: 0,
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
        environment: { clearColor: [0.24, 0.15, 0.095], fog: true, fogDensity: 0.0032, exposure: 1.10, contrast: 1.03, toneMapping: true, vignette: true, vignetteWeight: 0.42 },
        lighting: {
          mode: "exterior",
          ambientIntensity: 0.52,
          ambientColor: [1.00, 0.78, 0.56],
          natural: { position: [-10, 8, -10], direction: [0.62, -0.72, 0.38], color: [1.00, 0.58, 0.26], intensity: 0.82 },
          shadows: { enabled: true, mapSize: 1024, blurKernel: 14 },
          lights: []
        },
        vfx: { snowfall: true, snowCount: 50, snowSpeed: 0.40, roseSway: true, fireflies: true, fireflyCount: 7 },
        interactables: [
          { id: "garden_roses_ambience", position: [-6.0, -1.5], radius: 2.2, label: "Mirar rosales", message: "Los rosales destacan con fuerza sobre la nieve." },
          { id: "garden_room_ambience", position: [4.5, -3.0], radius: 2.2, label: "Mirar estancia", message: "Una pequeña estancia circular se abre entre los muros del jardín." }
        ],
        visual: {
          profile: "garden_golden_hour",
          glow: 0.10,
          exposure: 1.06,
          contrast: 1.06,
          fov: 0.74,
          sceneAmbient: [0.16, 0.115, 0.075],
          diffuseBoost: 1.05,
          emissiveFloor: 0.012,
          specular: 0.018,
          maxRealPointLights: 4,
          contactShadows: [
            { position: [7.2, -3.0], size: [7.0, 6.2], color: [0.08, 0.07, 0.09], alpha: 0.10 },
            { position: [-7.8, -2.0], size: [6.0, 8.0], color: [0.14, 0.05, 0.06], alpha: 0.07 }
          ],
          lightPools: [
            { position: [4.8, -1.0], size: [12.0, 8.0], color: [1.00, 0.54, 0.20], alpha: 0.08 },
            { position: [-5.0, 2.5], size: [13.0, 9.0], color: [1.00, 0.66, 0.32], alpha: 0.06 }
          ]
        },
        audio: { music: null, ambience: null }
      }
    },

    market: {
      label: "MARKET",
      spawn: [0, 0.43, 7.2],
      camera: { radius: 26.2, beta: 0.60, alpha: -Math.PI / 2.08 },
      MAP: {
        size: [30, 20],
        floor: "stone",
        visualFloor: "market_cobble",
        visualComposition: "market_reference",
        enableVisualComposition: false,
        compositionOpacity: 0,
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
        environment: { clearColor: [0.25, 0.14, 0.070], fog: true, fogDensity: 0.0016, exposure: 1.12, contrast: 1.04, toneMapping: true, vignette: true, vignetteWeight: 0.36 },
        lighting: {
          mode: "exterior",
          ambientIntensity: 0.50,
          ambientColor: [1.00, 0.74, 0.48],
          natural: { position: [-12, 8, -8], direction: [0.62, -0.72, 0.30], color: [1.00, 0.55, 0.20], intensity: 0.88 },
          shadows: { enabled: true, mapSize: 1024, blurKernel: 12 },
          lights: []
        },
        vfx: { dust: true, fireflies: true, fireflyCount: 10 },
        interactables: [
          { id: "market_trough_ambience", position: [2.4, 4.0], radius: 2.0, label: "Mirar abrevadero", message: "Una vaca permanece junto al abrevadero entre los puestos." },
          { id: "market_stalls_ambience", position: [-4.9, -3.8], radius: 2.0, label: "Mirar puestos", message: "Los puestos forman calles estrechas iluminadas por faroles." }
        ],
        visual: {
          profile: "market_golden_hour",
          glow: 0.10,
          exposure: 1.07,
          contrast: 1.08,
          fov: 0.73,
          sceneAmbient: [0.16, 0.105, 0.060],
          diffuseBoost: 1.06,
          emissiveFloor: 0.010,
          specular: 0.020,
          maxRealPointLights: 4,
          contactShadows: [
            { position: [-7.5, -5.5], size: [11.0, 3.0], alpha: 0.12 },
            { position: [4.5, -5.5], size: [12.0, 3.0], alpha: 0.12 },
            { position: [-10.0, 0.1], size: [4.2, 2.5], alpha: 0.11 },
            { position: [10.2, -0.2], size: [4.2, 2.5], alpha: 0.11 },
            { position: [2.4, 2.4], size: [5.2, 3.0], alpha: 0.10 }
          ],
          lightPools: [
            { position: [-4.5, -2.0], size: [16.0, 10.0], color: [1.00, 0.56, 0.18], alpha: 0.055 },
            { position: [7.0, 1.0], size: [12.0, 9.0], color: [1.00, 0.66, 0.28], alpha: 0.05 }
          ]
        },
        audio: { music: null, ambience: null }
      }
    },

    mirror: {
      label: "MIRROR",
      spawn: [10.5, 0.43, 6.8],
      camera: { radius: 26.5, beta: 0.56, alpha: -Math.PI / 2.14 },
      MAP: {
        size: [30, 20],
        floor: "ice",
        visualFloor: "ice",
        visualComposition: "mirror_reference",
        enableVisualComposition: false,
        compositionOpacity: 0,
        objects: [
          { asset: "water_area", position: [2.0, 0.6], size: [18.0, 8.0] },
          { asset: "ice_crack", position: [2.0, 0.0], branches: 7, length: 5.2, rotation: 0.2 },
          { asset: "ice_crack", position: [-3.2, 4.0], branches: 5, length: 3.0, rotation: 1.1 },
          { asset: "ice_crack", position: [7.8, -4.6], branches: 5, length: 2.8, rotation: 0.7 },
          { asset: "magic_pedestal", position: [-9.2, -2.5], scale: 1.05, intensity: 2.25, range: 14, lightColor: [0.08, 0.88, 0.92] },
          { asset: "mirror_frame", position: [-9.2, -2.5], scale: 1.05, rotation: Math.PI / 2 },
          { asset: "ice_crystal", position: [-12.0, -5.5], height: 1.6, rotation: 0.3, lightColor: [0.12, 0.72, 1.00], intensity: 1.18, range: 10.5 },
          { asset: "ice_crystal", position: [-6.3, -6.2], height: 1.2, rotation: 1.1, lightColor: [0.15, 1.00, 0.66], intensity: 1.05, range: 9.8 },
          { asset: "ice_crystal", position: [-12.2, 2.0], height: 1.4, rotation: 0.8, lightColor: [0.18, 0.72, 1.00], intensity: 1.08, range: 10.0 },
          { asset: "ice_crystal", position: [10.5, -5.8], height: 1.3, rotation: 0.5, lightColor: [0.18, 1.00, 0.62], intensity: 1.10, range: 10.2 },
          { asset: "ice_crystal", position: [12.0, 3.8], height: 1.6, rotation: 1.4, lightColor: [0.10, 0.66, 1.00], intensity: 1.22, range: 11.0 },
          { asset: "ice_crystal", position: [1.8, -6.8], height: 1.1, rotation: 0.2, lightColor: [0.10, 0.95, 0.72], intensity: 0.98, range: 9.5 },
          { asset: "ice_crystal", position: [3.8, 6.5], height: 1.25, rotation: 1.0, lightColor: [0.12, 0.72, 1.00], intensity: 1.05, range: 9.8 },
          { asset: "ice_crystal", position: [-2.0, 6.0], height: 1.35, rotation: 0.55, lightColor: [0.16, 1.00, 0.70], intensity: 1.02, range: 9.8 },
          { asset: "ice_crystal", position: [6.8, -1.8], height: 1.15, rotation: 1.25, lightColor: [0.08, 0.72, 1.00], intensity: 0.98, range: 9.5 }
        ]
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.035, 0.095, 0.105], fog: true, fogDensity: 0.0016, exposure: 1.18, contrast: 1.00, toneMapping: false, vignette: false },
        lighting: {
          mode: "interior",
          ambientIntensity: 0.70,
          ambientColor: [0.42, 0.96, 0.92],
          globalFill: { color: [0.32, 0.92, 0.88], intensity: 0.46, hemiIntensity: 0.36, directionalIntensity: 0.20, direction: [0.28, -1, -0.20] },
          shadows: { enabled: false },
          lights: [
            { position: [1.0, 3.8, 0.5], color: [0.12, 0.82, 1.00], intensity: 0.90, range: 18 },
            { position: [5.0, 2.8, 2.0], color: [0.18, 1.00, 0.66], intensity: 0.78, range: 16 },
            { position: [-4.0, 2.4, -1.0], color: [0.14, 0.76, 1.00], intensity: 0.72, range: 15 }
          ]
        },
        vfx: { waterRipples: true, magicMotes: true, magicCount: 18, snowfall: true, snowCount: 22, snowSpeed: 0.18 },
        interactables: [
          { id: "mirror_ambience", position: [-7.3, -2.5], radius: 2.2, label: "Mirar espejo", message: "El espejo se alza sobre un pedestal rodeado de luz azulada." },
          { id: "ice_ambience", position: [4.5, 2.6], radius: 2.0, label: "Mirar hielo", message: "Grietas oscuras recorren la superficie helada." }
        ],
        visual: {
          profile: "mirror_aurora_cave",
          glow: 0.26,
          exposure: 1.08,
          contrast: 1.08,
          fov: 0.70,
          sceneAmbient: [0.030, 0.105, 0.120],
          diffuseBoost: 1.05,
          emissiveFloor: 0.035,
          specular: 0.11,
          maxRealPointLights: 5,
          contactShadows: [
            { position: [-9.2, -2.5], size: [4.2, 3.2], color: [0.00, 0.04, 0.05], alpha: 0.16 }
          ],
          lightPools: [
            { position: [-9.2, -2.5], size: [10.0, 8.0], color: [0.04, 0.86, 0.94], alpha: 0.16 },
            { position: [2.5, 0.5], size: [17.0, 11.0], color: [0.08, 0.54, 0.86], alpha: 0.075 },
            { position: [7.0, 2.5], size: [10.0, 8.0], color: [0.10, 0.92, 0.58], alpha: 0.07 }
          ]
        },
        audio: { music: null, ambience: null }
      }
    }
  }
};
