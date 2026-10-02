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
export const D8_VERSION = "V26";

export const D8NIGHT: any = {
  maps: {
    cafe: {
      label: "CAFÉ",
      spawn: [0, 0.43, 4.1],
      camera: { radius: 22.2, beta: 0.63, alpha: -Math.PI / 2.04 },
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
          { asset: "crate", position: [10.8, -6.5], scale: 0.85 },

          // V16 CAFE — reference match 2.5D
          { asset: "low_wall", position: [-8.3, 7.35], size: [6.0, 0.42], height: 0.58, material: "stoneDark" },
          { asset: "low_wall", position: [8.5, 7.35], size: [6.2, 0.42], height: 0.58, material: "stoneDark" },
          { asset: "wall_trim", position: [-8.3, 7.15], size: [6.0, 0.18], y: 0.65, material: "stone2" },
          { asset: "wall_trim", position: [8.5, 7.15], size: [6.2, 0.18], y: 0.65, material: "stone2" },
          { asset: "floor_scatter", position: [8.4, 4.8], size: [4.0, 3.0], count: 10, material: "stoneDark" }
        ],
        navigation: {
          bounds: [-11.55, 11.55, -7.55, 7.55],
          blockers: [],
          zones: [
            { type: "walkable", label: "sala principal", position: [0, -0.2], size: [22.8, 14.0] },
            { type: "entry", label: "entrada", position: [0, 7.0], size: [3.8, 1.2] },
            { type: "water", label: "estanque", position: [3.5, 6.25], size: [5.6, 2.25] },
            { type: "difficult", label: "zona de mobiliario", position: [-5.1, 0.6], size: [4.3, 4.0] }
          ],
          interactions: [
            { id: "cafe_entry_geom", position: [0, 6.8], radius: 1.5, label: "Examinar entrada", message: "La entrada comunica con la sala principal." },
            { id: "cafe_pool_geom", position: [3.5, 5.0], radius: 1.6, label: "Examinar estanque", message: "El estanque ocupa una parte del borde de la sala." }
          ]
        }
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
          { id: "fireplace_ambience", position: [-9.1, -1.3], radius: 2, label: "Interactuar con chimenea", message: "El fuego proyecta luz cálida sobre la piedra.", action: { type: "toggle_local", radius: 2.8, meshMatch: ["fire"], lights: true, offMessage: "Apagas la chimenea.", onMessage: "Vuelves a encender la chimenea." } },
          { id: "bar_ambience", position: [-3.2, -3.6], radius: 1.8, label: "Examinar barra", message: "La barra está llena de botellas, platos y utensilios.", action: { type: "pulse", color: [1.00, 0.56, 0.20], range: 3.6 } },
          { id: "pool_ambience", position: [3.5, 4.8], radius: 1.8, label: "Tocar el agua", message: "La superficie del agua se mueve suavemente.", action: { type: "ripple", color: [0.08, 0.64, 0.76], size: 0.9 } }
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
      spawn: [0, 0.43, 28.0],
      camera: { radius: 52.0, beta: 0.54, alpha: -Math.PI / 2.04 },
      MAP: {
        size: [50, 60],
        floor: "stone",
        visualFloor: "temple_stone",
        visualComposition: "temple_reference",
        enableVisualComposition: false,
        compositionOpacity: 0,
        objects: [
          // V14.9 TEMPLE ACCESS: enclosed interior with one southern entrance.
          { asset: "wall", position: [0, -8.65], size: [27.5, 0.65], height: 3.4 },
          // V22: lateral walls are segmented so golden-hour light can enter through real openings.
          { asset: "wall", position: [-13.65, -7.18], size: [0.55, 2.95], height: 3.6 },
          { asset: "wall", position: [-13.65, -2.55], size: [0.55, 2.90], height: 3.6 },
          { asset: "wall", position: [-13.65, 2.05], size: [0.55, 2.90], height: 3.6 },
          { asset: "wall", position: [-13.65, 6.48], size: [0.55, 2.55], height: 3.6 },
          { asset: "wall", position: [13.65, -7.18], size: [0.55, 2.95], height: 3.6 },
          { asset: "wall", position: [13.65, -2.55], size: [0.55, 2.90], height: 3.6 },
          { asset: "wall", position: [13.65, 2.05], size: [0.55, 2.90], height: 3.6 },
          { asset: "wall", position: [13.65, 6.48], size: [0.55, 2.55], height: 3.6 },
          { asset: "temple_window", position: [-13.62, -4.85], rotation: Math.PI / 2, sunlit: true, direction: [1, -0.24, 0.05], intensity: 2.35, beamLength: 6.2 },
          { asset: "temple_window", position: [-13.62, -0.25], rotation: Math.PI / 2, sunlit: true, direction: [1, -0.24, 0.05], intensity: 2.20, beamLength: 6.0 },
          { asset: "temple_window", position: [-13.62, 4.35], rotation: Math.PI / 2, sunlit: true, direction: [1, -0.24, 0.05], intensity: 2.10, beamLength: 5.8 },
          { asset: "temple_window", position: [13.62, -4.85], rotation: -Math.PI / 2, sunlit: false },
          { asset: "temple_window", position: [13.62, -0.25], rotation: -Math.PI / 2, sunlit: false },
          { asset: "temple_window", position: [13.62, 4.35], rotation: -Math.PI / 2, sunlit: false },
          { asset: "low_wall", position: [-13.65, -4.85], size: [1.70, 0.55], height: 0.62, material: "stoneDark", rotation: Math.PI / 2 },
          { asset: "low_wall", position: [-13.65, -0.25], size: [1.70, 0.55], height: 0.62, material: "stoneDark", rotation: Math.PI / 2 },
          { asset: "low_wall", position: [-13.65, 4.35], size: [1.70, 0.55], height: 0.62, material: "stoneDark", rotation: Math.PI / 2 },
          { asset: "low_wall", position: [13.65, -4.85], size: [1.70, 0.55], height: 0.62, material: "stoneDark", rotation: Math.PI / 2 },
          { asset: "low_wall", position: [13.65, -0.25], size: [1.70, 0.55], height: 0.62, material: "stoneDark", rotation: Math.PI / 2 },
          { asset: "low_wall", position: [13.65, 4.35], size: [1.70, 0.55], height: 0.62, material: "stoneDark", rotation: Math.PI / 2 },
          { asset: "wall", position: [-7.8, 7.75], size: [11.5, 0.60], height: 2.45 },
          { asset: "wall", position: [7.8, 7.75], size: [11.5, 0.60], height: 2.45 },
          { asset: "archway", position: [0, 7.45], size: [4.6, 0.8], height: 4.15 },
          { asset: "temple_buttress", position: [-14.05, -6.7], height: 3.35, width: 0.82, depth: 1.15 },
          { asset: "temple_buttress", position: [-14.05, 1.9], height: 3.25, width: 0.80, depth: 1.10 },
          { asset: "temple_buttress", position: [-14.05, 6.8], height: 3.15, width: 0.78, depth: 1.05 },
          { asset: "temple_buttress", position: [14.05, -6.7], height: 3.35, width: 0.82, depth: 1.15 },
          { asset: "temple_buttress", position: [14.05, 1.9], height: 3.25, width: 0.80, depth: 1.10 },
          { asset: "temple_buttress", position: [14.05, 6.8], height: 3.15, width: 0.78, depth: 1.05 },
          { asset: "wall_trim", position: [0, -8.65], size: [27.8, 0.78], material: "stoneLight", y: 3.46 },
          { asset: "wall_trim", position: [-13.70, -7.18], size: [2.95, 0.72], material: "stoneLight", y: 3.66, rotation: Math.PI / 2 },
          { asset: "wall_trim", position: [-13.70, -2.55], size: [2.90, 0.72], material: "stoneLight", y: 3.66, rotation: Math.PI / 2 },
          { asset: "wall_trim", position: [-13.70, 2.05], size: [2.90, 0.72], material: "stoneLight", y: 3.66, rotation: Math.PI / 2 },
          { asset: "wall_trim", position: [13.70, -7.18], size: [2.95, 0.72], material: "stoneLight", y: 3.66, rotation: Math.PI / 2 },
          { asset: "wall_trim", position: [13.70, -2.55], size: [2.90, 0.72], material: "stoneLight", y: 3.66, rotation: Math.PI / 2 },
          { asset: "wall_trim", position: [13.70, 2.05], size: [2.90, 0.72], material: "stoneLight", y: 3.66, rotation: Math.PI / 2 },

          // V26 TEMPLE EXTERIOR — deliberately large exterior before the water.
          { asset: "stairs", position: [0, 8.65], size: [3.8, 3.0], steps: 7, height: 0.82, material: "stone" },
          { asset: "path", position: [0, 10.6], size: [4.8, 4.0] },

          // Main forecourt: large enough to read as a true exterior area.
          { asset: "room_floor", position: [0, 14.25], size: [46.5, 10.8], material: "stone2" },
          { asset: "path", position: [0, 14.3], size: [5.6, 10.2] },

          // Left circular patio / resting pocket.
          { asset: "patio_round", position: [-12.8, 14.6], diameter: 7.8, material: "stone2", border: "stoneDark" },
          { asset: "bench", position: [-12.8, 15.4], size: [3.1, 0.72] },
          { asset: "bench", position: [-15.3, 13.3], size: [2.4, 0.65] },

          // Exterior vegetation and garden beds.
          { asset: "temple_garden_bed", position: [12.8, 14.8], size: [7.0, 3.0], count: 24 },
          { asset: "temple_garden_bed", position: [19.2, 11.8], size: [4.2, 2.4], count: 14 },
          { asset: "temple_garden_bed", position: [-19.4, 11.8], size: [4.2, 2.4], count: 14 },
          { asset: "temple_garden_bed", position: [19.0, 17.8], size: [4.6, 2.3], count: 14 },
          { asset: "temple_garden_bed", position: [-19.0, 17.8], size: [4.6, 2.3], count: 14 },
          { asset: "plant_cluster", position: [-20.8, 15.0], spread: 1.65, count: 13 },
          { asset: "plant_cluster", position: [20.8, 15.2], spread: 1.65, count: 13 },
          { asset: "plant_cluster", position: [-7.2, 18.0], spread: 1.10, count: 8 },
          { asset: "plant_cluster", position: [7.5, 18.0], spread: 1.10, count: 8 },

          // Stone scatter breaks the clean rectangular silhouette.
          { asset: "rock_cluster", position: [-5.8, 17.9], spread: 1.25, count: 8, material: "stoneDark" },
          { asset: "rock_cluster", position: [6.2, 17.6], spread: 1.25, count: 8, material: "stoneDark" },
          { asset: "floor_scatter", position: [-17.0, 14.2], size: [7.0, 8.0], count: 28, material: "stoneDark" },
          { asset: "floor_scatter", position: [17.0, 14.2], size: [7.0, 8.0], count: 28, material: "stoneDark" },

          // Courtyard perimeter and lights.
          { asset: "low_wall", position: [-23.4, 14.4], size: [10.2, 0.52], height: 0.95, material: "stoneDark", rotation: Math.PI / 2 },
          { asset: "low_wall", position: [23.4, 14.4], size: [10.2, 0.52], height: 0.95, material: "stoneDark", rotation: Math.PI / 2 },
          { asset: "lantern_post", position: [-18.6, 10.2], intensity: 0.32, range: 4.8, height: 2.35 },
          { asset: "lantern_post", position: [18.6, 10.2], intensity: 0.32, range: 4.8, height: 2.35 },
          { asset: "lantern_post", position: [-8.0, 18.4], intensity: 0.28, range: 4.4, height: 2.25 },
          { asset: "lantern_post", position: [8.2, 18.4], intensity: 0.28, range: 4.4, height: 2.25 },

          // Water now sits beyond the forecourt instead of touching the temple entrance.
          { asset: "water_area", position: [0, 22.4], size: [35.0, 4.6] },
          { asset: "bridge", position: [0, 22.4], size: [3.0, 5.2], planks: 16 },
          { asset: "collider_only", position: [-9.8, 22.4], size: [15.2, 4.6] },
          { asset: "collider_only", position: [9.8, 22.4], size: [15.2, 4.6] },

          // Outer arrival terrace with additional vegetation.
          { asset: "room_floor", position: [0, 27.1], size: [48.0, 5.2], material: "stone2" },
          { asset: "path", position: [0, 27.0], size: [6.0, 5.0] },
          { asset: "low_wall", position: [-15.0, 29.2], size: [17.0, 0.52], height: 0.95, material: "stoneDark" },
          { asset: "low_wall", position: [15.0, 29.2], size: [17.0, 0.52], height: 0.95, material: "stoneDark" },
          { asset: "temple_garden_bed", position: [-19.0, 27.2], size: [5.0, 2.2], count: 15 },
          { asset: "temple_garden_bed", position: [19.0, 27.2], size: [5.0, 2.2], count: 15 },
          { asset: "plant_cluster", position: [-11.0, 28.0], spread: 1.25, count: 9 },
          { asset: "plant_cluster", position: [11.2, 28.0], spread: 1.25, count: 9 },
          { asset: "column", position: [-8.2, -5.5], height: 3.8 },
          { asset: "column", position: [8.2, -5.5], height: 3.8 },
          { asset: "column", position: [-8.2, -1.6], height: 3.5 },
          { asset: "column", position: [8.2, -1.6], height: 3.5 },
          { asset: "column", position: [-8.2, 2.4], height: 3.1 },
          { asset: "column", position: [8.2, 2.4], height: 3.1 },
          { asset: "room_floor", position: [0, -0.45], size: [26.7, 16.2], material: "stone" },
          { asset: "long_table", position: [0, 0.7], size: [6.8, 1.5] },
          { asset: "chair", position: [-4.25, 0.7], rotation: -Math.PI / 2 },
          { asset: "chair", position: [4.25, 0.7], rotation: Math.PI / 2 },
          { asset: "table_candelabrum", position: [0, 0.7], arms: 5, spread: 0.68, intensity: 0.82, range: 5.8 },
          { asset: "banquet_setting", position: [0, 0.7], size: [6.2, 1.15] },
          { asset: "temple_brazier", position: [-4.4, -6.1], intensity: 1.22, range: 6.8 },
          { asset: "temple_brazier", position: [4.4, -6.1], intensity: 1.22, range: 6.8 },
          { asset: "temple_torch", position: [-12.35, -5.0], intensity: 1.32, range: 7.8 },
          { asset: "temple_torch", position: [12.35, -5.0], intensity: 1.32, range: 7.8 },
          { asset: "temple_torch", position: [-12.35, -0.4], intensity: 1.18, range: 7.2 },
          { asset: "temple_torch", position: [12.35, -0.4], intensity: 1.18, range: 7.2 },
          { asset: "temple_torch", position: [-12.35, 4.3], intensity: 1.10, range: 6.8 },
          { asset: "temple_torch", position: [12.35, 4.3], intensity: 1.10, range: 6.8 },
          { asset: "temple_altar_backdrop", position: [0, -8.18], size: [7.6, 0.5], height: 3.15, depth: 0.52 },
          { asset: "runner", position: [0, -5.9], size: [4.9, 2.4], material: "templeBurgundy", border: "stoneLight" },
          { asset: "temple_altar", position: [0, -6.0], size: [5.2, 2.0], height: 1.08 },
          { asset: "statue", position: [0, -7.35] },
          { asset: "rose_patch", position: [-9.4, 5.45], size: [3.0, 1.3], count: 12 },
          { asset: "rose_patch", position: [9.4, 5.45], size: [3.0, 1.3], count: 12 },
          { asset: "rose_patch", position: [-10.2, -4.1], size: [2.4, 1.3], count: 10 },
          { asset: "rose_patch", position: [10.2, -4.1], size: [2.4, 1.3], count: 10 },

          // V15 TEMPLE — reference-guided 2.5D art pass
          { asset: "runner", position: [0, 4.55], size: [1.9, 4.8], material: "templeBurgundy", border: "stoneLight" },
          { asset: "banner", position: [-13.25, -4.8], size: [1.05, 1.75], y: 2.55, material: "clothRed", rotation: Math.PI / 2 },
          { asset: "banner", position: [13.25, -4.8], size: [1.05, 1.75], y: 2.55, material: "clothRed", rotation: -Math.PI / 2 },
          { asset: "banner", position: [-13.25, 2.5], size: [1.05, 1.75], y: 2.45, material: "purple", rotation: Math.PI / 2 },
          { asset: "banner", position: [13.25, 2.5], size: [1.05, 1.75], y: 2.45, material: "purple", rotation: -Math.PI / 2 },
          { asset: "wall_trim", position: [0, -8.25], size: [26.5, 0.24], material: "stone2", y: 0.28 },
          { asset: "wall_trim", position: [-13.20, -0.4], size: [16.2, 0.24], material: "stone2", y: 0.28, rotation: Math.PI / 2 },
          { asset: "wall_trim", position: [13.20, -0.4], size: [16.2, 0.24], material: "stone2", y: 0.28, rotation: Math.PI / 2 },
          { asset: "floor_scatter", position: [-5.8, 9.8], size: [7.0, 2.8], count: 16, material: "stoneDark" },
          { asset: "floor_scatter", position: [5.8, 9.8], size: [7.0, 2.8], count: 16, material: "stoneDark" },

          // V16 REFERENCE MATCH — ceremonial depth and ruined temple framing
          { asset: "runner", position: [0, -1.6], size: [1.75, 10.2], material: "templeBurgundy", border: "stoneLight" },
          { asset: "arch_ruin", position: [-8.8, 6.2], size: [3.0, 0.6], height: 2.5, tilt: -0.09 },
          { asset: "arch_ruin", position: [8.8, 6.2], size: [3.0, 0.6], height: 2.5, tilt: 0.08 },
          { asset: "rock_cluster", position: [-9.2, 6.0], spread: 1.2, count: 6 },
          { asset: "rock_cluster", position: [9.2, 6.0], spread: 1.2, count: 6 },
          { asset: "floor_scatter", position: [0, -6.2], size: [8.0, 2.0], count: 18, material: "stoneDark" },
          { asset: "floor_scatter", position: [-10.8, -1.0], size: [3.0, 12.0], count: 20, material: "stoneDark" },
          { asset: "floor_scatter", position: [10.8, -1.0], size: [3.0, 12.0], count: 18, material: "stoneDark" },
          { asset: "plant_cluster", position: [-11.5, 6.1], spread: 0.85, count: 6 },
          { asset: "plant_cluster", position: [11.2, 6.3], spread: 0.80, count: 5 },

          // V16 TEMPLE — reference match 2.5D
          { asset: "low_wall", position: [-11.2, 8.9], size: [4.0, 0.40], height: 0.55, material: "stoneDark" },
          { asset: "low_wall", position: [11.2, 8.9], size: [4.0, 0.40], height: 0.55, material: "stoneDark" },
          { asset: "runner", position: [0, 6.25], size: [1.8, 2.5], material: "templeBurgundy", border: "stoneLight" }
        ],
        navigation: {
          bounds: [-24.55, 24.55, -8.95, 29.45],
          blockers: [
            { position: [-9.8, 22.4], size: [15.2, 4.6] },
            { position: [9.8, 22.4], size: [15.2, 4.6] }
          ],
          zones: [
            { type: "walkable", label: "interior del templo", position: [0, -0.5], size: [26.0, 15.5] },
            { type: "stairs", label: "escaleras", position: [0, 8.65], size: [3.8, 3.0] },
            { type: "entry", label: "acceso al templo", position: [0, 7.2], size: [4.6, 1.8] },
            { type: "walkable", label: "gran atrio exterior", position: [0, 14.25], size: [46.0, 10.5] },
            { type: "walkable", label: "patio circular", position: [-12.8, 14.6], size: [7.8, 7.5] },
            { type: "difficult", label: "vegetación exterior", position: [-20.0, 14.8], size: [6.0, 10.0] },
            { type: "difficult", label: "vegetación exterior", position: [20.0, 14.8], size: [6.0, 10.0] },
            { type: "bridge", label: "puente", position: [0, 22.4], size: [3.0, 5.2] },
            { type: "water", label: "agua", position: [-9.8, 22.4], size: [15.2, 4.6] },
            { type: "water", label: "agua", position: [9.8, 22.4], size: [15.2, 4.6] },
            { type: "walkable", label: "terraza exterior", position: [0, 27.1], size: [48.0, 5.2] }
          ],
          interactions: [
            { id: "temple_bridge_geom", position: [0, 22.4], radius: 1.9, label: "Tocar el agua junto al puente", message: "El puente cruza el agua después del gran atrio exterior.", action: { type: "ripple", color: [0.10, 0.50, 0.68], size: 1.0 } },
            { id: "temple_stairs_geom", position: [0, 8.65], radius: 1.6, label: "Examinar escaleras", message: "Las escaleras elevan la entrada sobre el gran atrio exterior." },
            { id: "temple_courtyard_geom", position: [-12.8, 14.6], radius: 2.5, label: "Examinar patio exterior", message: "El gran atrio exterior está delimitado por piedra, vegetación y zonas de descanso." }
          ]
        }
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        environment: { clearColor: [0.115, 0.070, 0.045], fog: false, fogDensity: 0, exposure: 1.14, contrast: 1.04, toneMapping: true, vignette: true, vignetteWeight: 0.18, vignetteStretch: 0.12 },
        lighting: {
          mode: "interior",
          ambientIntensity: 0.30,
          ambientColor: [0.88, 0.72, 0.56],
          globalFill: { color: [0.82, 0.66, 0.50], intensity: 0.16, hemiIntensity: 0.22, directionalIntensity: 0.08, direction: [0.88, -0.50, 0.18] },
          shadows: { enabled: true, mapSize: 2048, blurKernel: 18, intensity: 1.18, color: [1.00, 0.66, 0.38], direction: [0.88, -0.50, 0.18], position: [-22, 13, 4], darkness: 0.24 },
          lights: [
            { position: [0, 2.8, -6.2], color: [1.00, 0.50, 0.18], intensity: 0.52, range: 9.0 }
          ]
        },
        vfx: { dust: true, fireflies: true, fireflyCount: 6, roseSway: true },
        interactables: [
          { id: "temple_table_ambience", position: [0, 0.7], radius: 2.6, label: "Interactuar con el candelabro", message: "El único candelabro ilumina las rosas, los platos y los cubiertos de la mesa.", action: { type: "toggle_local", radius: 3.4, meshMatch: ["tableCandelabrumFlame"], lights: true, offMessage: "Apagas el candelabro.", onMessage: "Vuelves a encender el candelabro." } },
          { id: "temple_altar_ambience", position: [0, -5.8], radius: 2.4, label: "Examinar altar", message: "El altar de piedra marca el final del eje ceremonial del templo.", action: { type: "pulse", color: [1.00, 0.50, 0.18], range: 3.4 } },
          { id: "temple_statue_ambience", position: [0, -7.1], radius: 2.0, label: "Examinar estatua", message: "La figura de piedra se alza detrás del altar.", action: { type: "pulse", color: [0.75, 0.64, 0.48], range: 3.2 } }
        ],
        visual: {
          profile: "temple_readability_golden_hour_v26",
          glow: 0.12,
          exposure: 1.14,
          contrast: 1.04,
          fov: 0.70,
          sceneAmbient: [0.145, 0.115, 0.090],
          diffuseBoost: 1.18,
          emissiveFloor: 0.10,
          specular: 0.020,
          maxRealPointLights: 12,
          maxMaterialLights: 8,
          aoStrength: 0.40,
          aoRadius: 0.95,
          bloomWeight: 0.11,
          bloomThreshold: 0.86,
          contactShadows: [
            { position: [0, 0.7], size: [8.0, 2.4], alpha: 0.16 },
            { position: [-8.2, -1.5], size: [2.0, 8.8], alpha: 0.11 },
            { position: [8.2, -1.5], size: [2.0, 8.8], alpha: 0.11 },
            { position: [0, -6.8], size: [8.4, 3.6], alpha: 0.17 },
            { position: [-12.8, 14.6], size: [6.8, 6.3], alpha: 0.10 }
          ],
          lightPools: [
            { position: [0, 0.7], size: [8.0, 3.8], color: [1.00, 0.46, 0.12], alpha: 0.10 },
            { position: [-9.8, -4.85], size: [7.0, 2.0], color: [1.00, 0.55, 0.22], alpha: 0.15 },
            { position: [-9.8, -0.25], size: [7.0, 2.0], color: [1.00, 0.55, 0.22], alpha: 0.14 },
            { position: [-9.8, 4.35], size: [7.0, 2.0], color: [1.00, 0.55, 0.22], alpha: 0.13 },
            { position: [0, -6.0], size: [7.0, 3.8], color: [1.00, 0.30, 0.06], alpha: 0.11 },
            { position: [0, 14.2], size: [26.0, 7.4], color: [1.00, 0.58, 0.24], alpha: 0.080 },
            { position: [-12.8, 14.6], size: [7.2, 6.4], color: [1.00, 0.47, 0.16], alpha: 0.062 },
            { position: [12.8, 14.8], size: [8.0, 5.4], color: [1.00, 0.48, 0.16], alpha: 0.058 },
            { position: [0, 27.1], size: [22.0, 3.6], color: [1.00, 0.60, 0.28], alpha: 0.065 }
          ]
        },
        audio: { music: null, ambience: null }
      }
    },

    dinner: {
      label: "DINNER",
      spawn: [0, 0.43, 7.0],
      camera: { radius: 25.8, beta: 0.58, alpha: -Math.PI / 2.08 },
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
          { asset: "rose_patch", position: [8.8, -4.0], size: [2.8, 1.3], count: 10 },

          // V15 DINNER — reference-guided 2.5D art pass
          { asset: "plant_cluster", position: [-6.8, -2.5], spread: 1.3, count: 9 },
          { asset: "plant_cluster", position: [6.4, -2.5], spread: 1.2, count: 8 },
          { asset: "plant_cluster", position: [-7.4, 5.8], spread: 1.0, count: 7 },
          { asset: "market_goods", position: [8.2, 1.2], size: [3.2, 1.8], count: 10 },
          { asset: "floor_scatter", position: [-7.2, 3.8], size: [5.0, 4.0], count: 16, material: "stoneDark" },
          { asset: "floor_scatter", position: [7.0, 4.6], size: [5.5, 3.6], count: 14, material: "stoneDark" },
          { asset: "wall_trim", position: [0, -7.65], size: [12.0, 0.22], material: "woodDark", y: 0.24 },

          // V16 REFERENCE MATCH — patio, well and lived-in exterior
          { asset: "patio_ring", position: [0, 3.2], diameter: 6.4, thickness: 0.24, material: "stone2" },
          { asset: "well", position: [9.0, 5.5], diameter: 1.9, height: 0.68 },
          { asset: "fence", position: [-10.7, 5.9], length: 4.8, posts: 5, height: 0.82, rotation: 0, blocking: true },
          { asset: "fence", position: [11.0, 4.4], length: 4.4, posts: 5, height: 0.82, rotation: Math.PI / 2, blocking: true },
          { asset: "plant_cluster", position: [-10.2, -5.8], spread: 1.1, count: 7 },
          { asset: "plant_cluster", position: [10.4, -5.6], spread: 1.1, count: 7 },

          // V16 DINNER — reference match 2.5D
          { asset: "patio_round", position: [0, 3.2], diameter: 6.8, material: "stone2", border: "stoneDark" },
          { asset: "well", position: [9.4, 5.3], diameter: 2.1 },
          { asset: "low_wall", position: [-6.5, -1.7], size: [3.5, 0.38], height: 0.48, material: "stone2" },
          { asset: "low_wall", position: [6.4, -1.7], size: [3.4, 0.38], height: 0.48, material: "stone2" }
        ],
        navigation: {
          bounds: [-13.55, 13.55, -8.55, 8.55],
          blockers: [],
          zones: [
            { type: "walkable", label: "patio", position: [0, 3.2], size: [6.8, 6.4] },
            { type: "walkable", label: "camino", position: [0, 6.0], size: [13.0, 2.0] },
            { type: "entry", label: "acceso exterior", position: [0, 7.7], size: [4.0, 1.0] },
            { type: "difficult", label: "vegetación", position: [-7.0, -2.6], size: [3.8, 3.0] },
            { type: "difficult", label: "vegetación", position: [6.6, -2.6], size: [3.6, 3.0] }
          ],
          interactions: [
            { id: "dinner_patio_geom", position: [0, 3.2], radius: 1.8, label: "Examinar patio", message: "El patio concentra la zona de reunión exterior." },
            { id: "dinner_well_geom", position: [9.0, 5.5], radius: 1.4, label: "Tocar el agua del pozo", message: "El pozo ocupa el extremo del exterior.", action: { type: "ripple", color: [0.10, 0.48, 0.62], size: 0.75 } }
          ]
        }
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
          { id: "dinner_table_ambience", position: [0, 4.8], radius: 2.0, label: "Interactuar con la mesa", message: "La mesa exterior está preparada bajo la luz de las linternas.", action: { type: "pulse", color: [1.00, 0.52, 0.16], range: 3.8 } },
          { id: "dinner_house_ambience", position: [0, -1.8], radius: 2.4, label: "Interactuar con luces de la casa", message: "Una luz cálida se filtra por las ventanas de la casa.", action: { type: "toggle_local", radius: 6.0, meshMatch: ["windowGlow"], lights: true, offMessage: "Las ventanas quedan a oscuras.", onMessage: "La luz vuelve a las ventanas." } }
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
      camera: { radius: 26.6, beta: 0.58, alpha: -Math.PI / 2.00 },
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
          { asset: "wall", position: [-13.5, 0], size: [0.45, 19.0], height: 1.1, material: "stone2" },

          // V15 GARDEN — reference-guided 2.5D art pass
          { asset: "thorn_wall", position: [-7.2, -8.25], length: 9.2, count: 15, rotation: 0 },
          { asset: "thorn_wall", position: [-12.1, -3.4], length: 8.0, count: 14, rotation: Math.PI / 2 },
          { asset: "thorn_wall", position: [-7.4, 7.5], length: 9.0, count: 14, rotation: 0 },
          { asset: "plant_cluster", position: [3.7, -5.7], spread: 1.3, count: 8 },
          { asset: "plant_cluster", position: [10.5, -6.3], spread: 1.0, count: 7 },
          { asset: "rock_cluster", position: [-2.5, 4.2], spread: 1.4, count: 8 },
          { asset: "floor_scatter", position: [7.2, -3.0], size: [6.0, 6.0], count: 12, material: "stoneDark" },

          // V16 REFERENCE MATCH — rose enclosure and ruined garden threshold
          { asset: "thorn_wall", position: [-2.0, 7.7], length: 7.0, count: 13, rotation: 0 },
          { asset: "thorn_wall", position: [11.8, 1.2], length: 7.8, count: 13, rotation: Math.PI / 2 },
          { asset: "arch_ruin", position: [3.8, 4.8], size: [2.7, 0.6], height: 2.2, tilt: 0.04 },
          { asset: "plant_cluster", position: [-4.8, -6.5], spread: 1.5, count: 10 },
          { asset: "rock_cluster", position: [10.8, 5.6], spread: 1.3, count: 8 },

          // V16 GARDEN — reference match 2.5D
          { asset: "thorn_wall", position: [2.1, -8.5], length: 5.4, count: 10, rotation: 0 },
          { asset: "thorn_wall", position: [12.0, -1.2], length: 6.2, count: 11, rotation: Math.PI / 2 },
          { asset: "low_wall", position: [7.2, 0.2], size: [5.6, 0.34], height: 0.48, material: "stone2" },
          { asset: "plant_cluster", position: [-10.2, 5.8], spread: 1.2, count: 8, material: "rosePink" }
        ],
        navigation: {
          bounds: [-13.55, 13.55, -9.55, 9.55],
          blockers: [],
          zones: [
            { type: "walkable", label: "sendero", position: [-1.0, 4.8], size: [23.0, 2.2] },
            { type: "walkable", label: "sendero", position: [5.8, 0.2], size: [2.2, 11.0] },
            { type: "walkable", label: "refugio circular", position: [7.2, -3.0], size: [6.2, 6.2] },
            { type: "difficult", label: "rosales", position: [-7.8, -2.0], size: [4.6, 8.2] },
            { type: "difficult", label: "rosales", position: [-2.7, -3.2], size: [3.8, 5.8] },
            { type: "hazard", label: "espinos densos", position: [-7.2, -8.25], size: [9.4, 1.0] }
          ],
          interactions: [
            { id: "garden_room_geom", position: [7.2, -0.8], radius: 1.5, label: "Examinar refugio", message: "El refugio circular forma una zona interior dentro del jardín." },
            { id: "garden_roses_geom", position: [-6.4, -2.0], radius: 1.7, label: "Apartar los rosales", message: "Los rosales forman una masa densa junto al sendero.", action: { type: "nudge", radius: 3.0, meshMatch: ["roseHead", "thornRose"] } }
          ]
        }
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
          { id: "garden_roses_ambience", position: [-6.0, -1.5], radius: 2.2, label: "Rozar rosales", message: "Los rosales destacan con fuerza sobre la nieve.", action: { type: "nudge", radius: 3.0, meshMatch: ["roseHead", "thornRose"] } },
          { id: "garden_room_ambience", position: [4.5, -3.0], radius: 2.2, label: "Examinar estancia", message: "Una pequeña estancia circular se abre entre los muros del jardín.", action: { type: "pulse", color: [1.00, 0.62, 0.24], range: 3.2 } }
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
      camera: { radius: 27.0, beta: 0.59, alpha: -Math.PI / 2.08 },
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
          { asset: "bench", position: [2.0, 5.6], size: [2.4, 0.65] },

          // V15 MARKET — reference-guided 2.5D art pass
          { asset: "market_goods", position: [-9.5, -3.9], size: [3.6, 2.1], count: 12 },
          { asset: "market_goods", position: [-4.5, -4.0], size: [3.2, 2.0], count: 10 },
          { asset: "market_goods", position: [5.8, -3.7], size: [3.4, 2.0], count: 11 },
          { asset: "market_goods", position: [9.6, 1.6], size: [3.2, 2.0], count: 10 },
          { asset: "market_goods", position: [-7.0, 3.2], size: [3.0, 1.9], count: 9 },
          { asset: "floor_scatter", position: [0, 0.5], size: [13.0, 7.0], count: 28, material: "stoneDark" },
          { asset: "plant_cluster", position: [12.5, 4.7], spread: 0.9, count: 6 },
          { asset: "plant_cluster", position: [-12.4, 4.9], spread: 0.9, count: 6 },

          // V16 REFERENCE MATCH — denser perimeter and central market read
          { asset: "well", position: [0.0, 1.6], diameter: 2.2, height: 0.62 },
          { asset: "fence", position: [-13.2, 1.5], length: 5.4, posts: 6, height: 0.78, rotation: Math.PI / 2, blocking: true },
          { asset: "fence", position: [13.2, 1.8], length: 5.2, posts: 6, height: 0.78, rotation: Math.PI / 2, blocking: true },
          { asset: "market_goods", position: [0.2, 6.5], size: [5.5, 2.2], count: 15 },
          { asset: "market_goods", position: [-12.0, 1.6], size: [2.5, 3.2], count: 11 },
          { asset: "market_goods", position: [12.0, 1.5], size: [2.5, 3.2], count: 11 },

          // V16 MARKET — reference match 2.5D
          { asset: "market_goods", position: [0.6, -3.6], size: [3.4, 1.9], count: 10 },
          { asset: "market_goods", position: [7.2, 3.2], size: [3.0, 1.8], count: 9 },
          { asset: "market_goods", position: [-10.2, 2.2], size: [3.0, 1.8], count: 9 },
          { asset: "well", position: [-1.8, 1.8], diameter: 1.8 },
          { asset: "floor_scatter", position: [0, 6.8], size: [8.5, 2.5], count: 16, material: "stoneDark" }
        ],
        navigation: {
          bounds: [-14.55, 14.55, -9.55, 9.55],
          blockers: [],
          zones: [
            { type: "walkable", label: "plaza central", position: [0, 0.5], size: [15.5, 10.5] },
            { type: "walkable", label: "corredor norte", position: [0, 6.2], size: [14.0, 2.2] },
            { type: "difficult", label: "mercancías", position: [-9.0, -4.0], size: [5.0, 2.8] },
            { type: "difficult", label: "mercancías", position: [6.0, -3.8], size: [4.8, 2.8] },
            { type: "entry", label: "acceso a la plaza", position: [0, 8.8], size: [5.0, 1.2] }
          ],
          interactions: [
            { id: "market_center_geom", position: [0, 1.2], radius: 1.7, label: "Examinar plaza", message: "Los puestos rodean la zona central de paso." },
            { id: "market_trough_geom", position: [2.4, 2.4], radius: 1.6, label: "Agitar el agua del pilón", message: "El pilón ocupa una parte de la plaza y condiciona el paso.", action: { type: "ripple", color: [0.15, 0.60, 0.68], size: 0.85 } }
          ]
        }
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
          { id: "market_trough_ambience", position: [2.4, 4.0], radius: 2.0, label: "Tocar el agua", message: "Una vaca permanece junto al abrevadero entre los puestos.", action: { type: "ripple", color: [0.18, 0.58, 0.68], size: 0.75 } },
          { id: "market_stalls_ambience", position: [-4.9, -3.8], radius: 2.0, label: "Examinar mercancía", message: "Los puestos forman calles estrechas iluminadas por faroles.", action: { type: "nudge", radius: 2.8, meshMatch: ["marketProduce", "goodsCrate"] } }
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
      camera: { radius: 27.8, beta: 0.56, alpha: -Math.PI / 2.14 },
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
          { asset: "ice_crystal", position: [6.8, -1.8], height: 1.15, rotation: 1.25, lightColor: [0.08, 0.72, 1.00], intensity: 0.98, range: 9.5 },

          // V15 MIRROR — reference-guided 2.5D art pass
          { asset: "ice_floe", position: [-0.8, 0.8], diameter: 4.0, depthScale: 0.68, rotation: 0.25 },
          { asset: "ice_floe", position: [4.0, 1.8], diameter: 3.6, depthScale: 0.62, rotation: 0.72 },
          { asset: "ice_floe", position: [7.8, 0.0], diameter: 3.0, depthScale: 0.74, rotation: 1.1 },
          { asset: "ice_floe", position: [1.8, -3.0], diameter: 3.3, depthScale: 0.64, rotation: 0.48 },
          { asset: "rock_cluster", position: [12.0, -7.4], spread: 1.7, count: 8, material: "stoneDark" },
          { asset: "rock_cluster", position: [-12.7, 6.4], spread: 1.5, count: 7, material: "stoneDark" },
          { asset: "floor_scatter", position: [-8.8, -2.4], size: [4.5, 4.0], count: 10, material: "stoneDark" },

          // V16 REFERENCE MATCH — cave framing and layered ice silhouette
          { asset: "ice_ridge", position: [-12.0, 5.8], length: 5.5, count: 8, rotation: 0.25 },
          { asset: "ice_ridge", position: [11.8, 5.4], length: 5.2, count: 8, rotation: -0.35 },
          { asset: "ice_ridge", position: [12.0, -6.4], length: 4.6, count: 7, rotation: 0.10 },
          { asset: "rock_cluster", position: [-10.4, -7.2], spread: 1.7, count: 9, material: "stoneDark" },
          { asset: "ice_floe", position: [-5.0, 2.4], diameter: 2.7, depthScale: 0.68, rotation: 0.3 },
          { asset: "ice_floe", position: [8.6, 3.7], diameter: 2.5, depthScale: 0.66, rotation: 0.9 },

          // V16 MIRROR — reference match 2.5D
          { asset: "ice_ridge", position: [-12.8, -1.2], length: 6.0, count: 8, rotation: Math.PI / 2 },
          { asset: "ice_ridge", position: [12.6, 1.5], length: 6.2, count: 8, rotation: Math.PI / 2 },
          { asset: "ice_ridge", position: [1.0, -8.5], length: 8.0, count: 10, rotation: 0 },
          { asset: "rock_cluster", position: [-8.7, 6.8], spread: 1.2, count: 6, material: "stoneDark" }
        ],
        navigation: {
          bounds: [-14.55, 14.55, -9.55, 9.55],
          blockers: [],
          zones: [
            { type: "walkable", label: "hielo firme", position: [-9.0, -2.5], size: [6.5, 6.0] },
            { type: "hazard", label: "hielo fracturado", position: [2.0, 0.6], size: [18.0, 8.0] },
            { type: "walkable", label: "borde helado", position: [8.5, -5.5], size: [10.0, 3.0] },
            { type: "walkable", label: "borde helado", position: [7.0, 5.5], size: [12.0, 3.0] },
            { type: "entry", label: "acceso a la cueva", position: [-12.5, 7.8], size: [4.0, 1.2] }
          ],
          interactions: [
            { id: "mirror_pedestal_geom", position: [-9.2, -2.5], radius: 1.8, label: "Activar pulso del pedestal", message: "El pedestal marca el principal punto de interés de la cueva.", action: { type: "pulse", color: [0.05, 0.88, 0.92], range: 6.5 } },
            { id: "mirror_ice_geom", position: [2.0, 0.6], radius: 1.8, label: "Examinar hielo", message: "La superficie central está fracturada y debe tratarse como una zona distinta." }
          ]
        }
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
          { id: "mirror_ambience", position: [-7.3, -2.5], radius: 2.2, label: "Activar resplandor", message: "El espejo se alza sobre un pedestal rodeado de luz azulada.", action: { type: "pulse", color: [0.06, 0.86, 0.94], range: 6.0 } },
          { id: "ice_ambience", position: [4.5, 2.6], radius: 2.0, label: "Golpear suavemente el hielo", message: "Grietas oscuras recorren la superficie helada.", action: { type: "ripple", color: [0.12, 0.72, 1.00], size: 1.1 } }
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
