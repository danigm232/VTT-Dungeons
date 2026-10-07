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
export const D8_VERSION = "V49";

export const D8NIGHT: any = {
  maps: {
    cafe: {
      label: "TABERNA",
      spawn: [0, 0.43, 10.0],
      camera: { radius: 27.0, beta: 0.76, alpha: Math.PI / 2.18, targetOffset: [0, 0, -3.0] },
      MAP: {
        size: [28, 24],
        floor: "stone_tavern",
        renderMode: "tavern_v34",
        visualFloor: "tavern_stone",
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
          { asset: "bench", position: [7.1, 5.8], size: [2.0, 0.62], scale: 0.9 },
          { asset: "horse_trough", position: [5.6, 10.0], size: [4.8, 1.55] },
          { asset: "hitching_post", position: [-5.4, 10.0], size: [5.2, 0.5] },
          { asset: "hay_bale", position: [9.2, 9.8], scale: 1.0 },
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
          bounds: [-13.55, 13.55, -7.55, 11.55],
          blockers: [],
          zones: [
            { type: "walkable", label: "sala principal de la taberna", position: [0, -0.2], size: [22.8, 14.0] },
            { type: "entry", label: "entrada de la taberna", position: [0, 7.0], size: [3.8, 1.2] },
            { type: "walkable", label: "patio exterior", position: [0, 9.7], size: [23.4, 4.8] },
            { type: "water", label: "abrevadero", position: [5.6, 10.0], size: [4.8, 1.55] },
            { type: "difficult", label: "zona de mobiliario", position: [-5.1, 0.6], size: [4.3, 4.0] }
          ],
          interactions: [
            { id: "cafe_entry_geom", position: [0, 6.8], radius: 1.5, label: "Examinar entrada", message: "La entrada comunica el patio exterior con la sala principal de la taberna." },
            { id: "tavern_trough_geom", position: [5.6, 10.0], radius: 2.0, label: "Examinar abrevadero", message: "Un abrevadero de madera con agua limpia espera junto a la entrada para las monturas.", action: { type: "ripple", color: [0.08, 0.52, 0.64], size: 0.8 } },
            { id: "tavern_hitch_geom", position: [-5.4, 10.0], radius: 2.0, label: "Examinar poste de amarre", message: "El poste de madera permite dejar una montura atada junto a la taberna." }
          ]
        }
      },
      CANON: {
        interactables: [],
        triggers: []
      },
      VTT_AMBIENCE: {
        horizon: { style: "village", zenith: "#24253a", horizon: "#9c7a7d", ground: "#58473e", far: "#454252", near: "#5c5058", warmWindows: true },
        environment: { clearColor: [0.10, 0.072, 0.045], fog: false, fogDensity: 0, exposure: 1.00, contrast: 1.03, toneMapping: false, vignette: false, glowIntensity: 0.12, sharpen: 0.62, sharpenColor: 1.04 },
        lighting: {
          mode: "interior",
          ambientIntensity: 0.42,
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
          shadows: { enabled: true, mapSize: 1024, blurKernel: 10, intensity: 0.48, darkness: 0.42, position: [8, 9, -5], direction: [-0.42, -1, 0.28], color: [1.00, 0.83, 0.64] },
          lights: [
            { position: [-9.2, 2.0, -1.3], color: [1.00, 0.44, 0.16], intensity: 1.05, range: 12.5 },
            { position: [5.6, 0.80, 10.0], color: [0.08, 0.42, 0.50], intensity: 0.22, range: 5.2 }
          ]
        },
        vfx: { fireplace: true, smoke: true, embers: true, dust: true, waterRipples: true, waterMotion: true },
        interactables: [
          { id: "fireplace_ambience", position: [-9.1, -1.3], radius: 2, label: "Interactuar con chimenea", message: "El fuego proyecta luz cálida sobre la piedra.", action: { type: "toggle_local", radius: 2.8, meshMatch: ["fire"], lights: true, offMessage: "Apagas la chimenea.", onMessage: "Vuelves a encender la chimenea." } },
          { id: "bar_ambience", position: [-3.2, -3.6], radius: 1.8, label: "Examinar barra", message: "La barra está llena de botellas, platos y utensilios.", action: { type: "pulse", color: [1.00, 0.56, 0.20], range: 3.6 } },
          { id: "trough_ambience", position: [5.6, 10.0], radius: 2.0, label: "Tocar el agua del abrevadero", message: "El agua del abrevadero se agita suavemente.", action: { type: "ripple", color: [0.08, 0.60, 0.70], size: 0.8 } }
        ],
        visual: {
          profile: "tavern_warm_v34",
          glow: 0.20,
          exposure: 1.06,
          contrast: 1.08,
          fov: 0.72,
          sceneAmbient: [0.10, 0.065, 0.038],
          diffuseBoost: 1.02,
          emissiveFloor: 0.035,
          specular: 0.022,
          maxRealPointLights: 13,
          maxMaterialLights: 8,
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
            { position: [0, 8.7], size: [9.0, 3.6], color: [1.00, 0.48, 0.18], alpha: 0.055 }
          ]
        },
        audio: { music: null, ambience: null }
      }
    },
    temple: {
      label: "TEMPLO",
      spawn: [0, 0.43, 29.0],
      camera: { radius: 46.0, beta: 0.86, alpha: Math.PI / 2.25, targetOffset: [0, 0.65, -13.6] },
      MAP: {
        size: [52, 68],
        floor: "grass",
        visualFloor: "grass",
        visualComposition: "temple_reference",
        enableVisualComposition: false,
        compositionOpacity: 0,
        objects: [
          // V34 TEMPLE MASTER PLAN
          // Bridge -> stairs -> monumental gate -> walled processional court -> nave -> altar.

          // --- NAVE / SANCTUARY ---
          { asset: "temple_floor", position: [0, -0.45], size: [27.3, 17.0], material: "stone", tileSize: 2.35, border: false, joints: false },
          { asset: "temple_wall", position: [0, -9.0], size: [28.2, 0.92], height: 5.60, pilasters: true },
          { asset: "temple_wall", position: [-8.55,8.1], size: [10.25,.92], height: 5.6, pilasters: true },
          { asset: "temple_wall", position: [8.55,8.1], size: [10.25,.92], height: 5.6, pilasters: true },

          // Segmented side walls leave true window openings.
          { asset: "temple_wall", position: [-14.0, -7.30], size: [0.92, 3.05], height: 4.85, pilasters: true },
          { asset: "temple_wall", position: [-14.0, -2.55], size: [0.92, 3.00], height: 4.65, pilasters: true },
          { asset: "temple_wall", position: [-14.0, 2.20], size: [0.92, 3.00], height: 4.45, pilasters: true },
          { asset: "temple_wall", position: [-14.0, 6.85], size: [0.92, 2.70], height: 4.10, pilasters: true },
          { asset: "temple_wall", position: [14.0, -7.30], size: [0.92, 3.05], height: 4.85, pilasters: true },
          { asset: "temple_wall", position: [14.0, -2.55], size: [0.92, 3.00], height: 4.65, pilasters: true },
          { asset: "temple_wall", position: [14.0, 2.20], size: [0.92, 3.00], height: 4.45, pilasters: true },
          { asset: "temple_wall", position: [14.0, 6.85], size: [0.92, 2.70], height: 4.10, pilasters: true },

          { asset: "temple_window", width: 1.85, height: 3.35, y: 2.45, position: [-13.97, -4.88], rotation: Math.PI / 2, sunlit: true, direction: [1, -0.23, 0.04], intensity: 1.30, beamLength: 7.0 },
          { asset: "temple_window", width: 1.85, height: 3.35, y: 2.45, position: [-13.97, -0.12], rotation: Math.PI / 2, sunlit: true, direction: [1, -0.23, 0.04], intensity: 1.15, beamLength: 6.7 },
          { asset: "temple_window", width: 1.85, height: 3.35, y: 2.45, position: [-13.97, 4.58], rotation: Math.PI / 2, sunlit: true, direction: [1, -0.23, 0.04], intensity: 1.05, beamLength: 6.4 },
          { asset: "temple_window", width: 1.85, height: 3.35, y: 2.45, position: [13.97, -4.88], rotation: -Math.PI / 2, sunlit: false },
          { asset: "temple_window", width: 1.85, height: 3.35, y: 2.45, position: [13.97, -0.12], rotation: -Math.PI / 2, sunlit: false },
          { asset: "temple_window", width: 1.85, height: 3.35, y: 2.45, position: [13.97, 4.58], rotation: -Math.PI / 2, sunlit: false },

          { asset: "temple_buttress", position: [-14.40, -7.5], height: 4.0, width: 0.92, depth: 1.25 },
          { asset: "temple_buttress", position: [-14.40, 0.0], height: 3.8, width: 0.88, depth: 1.20 },
          { asset: "temple_buttress", position: [-14.40, 7.6], height: 3.6, width: 0.84, depth: 1.15 },
          { asset: "temple_buttress", position: [14.40, -7.5], height: 4.0, width: 0.92, depth: 1.25 },
          { asset: "temple_buttress", position: [14.40, 0.0], height: 3.8, width: 0.88, depth: 1.20 },
          { asset: "temple_buttress", position: [14.40, 7.6], height: 3.6, width: 0.84, depth: 1.15 },

          // --- PROCESSIONAL COURT: walls now continue all the way to the bridge stairs ---
          { asset: "temple_floor", position: [0, 13.05], size: [27.3, 10.15], material: "stone", tileSize: 2.55, border: false, joints: false },
          { asset: "temple_wall", position: [-14.0, 13.05], size: [0.92, 10.20], height: 2.70, pilasters: true },
          { asset: "temple_wall", position: [14.0, 13.05], size: [0.92, 10.20], height: 2.70, pilasters: true },
          { asset: "temple_wall", position: [-8.55, 18.15], size: [10.25, 0.92], height: 2.55, pilasters: true },
          { asset: "temple_wall", position: [8.55, 18.15], size: [10.25, 0.92], height: 2.55, pilasters: true },
          { asset: "temple_gate", position: [0, 18.15], width: 7.0, height: 4.35, depth: 1.00, pediment: true },

          // Continuous ceremonial axis.
          { asset: "runner", position: [0, -2.0], size: [2.65, 11.8], material: "templeBurgundy", border: "stoneLight" },
          { asset: "runner", position: [0, 12.8], size: [2.65, 9.2], material: "templeBurgundy", border: "stoneLight" },
          { asset: "runner", position: [0, 0.8], size: [9.3, 4.8], material: "templeBurgundy", border: "gold" },

          // Bridge ends at the stairs. There is no loose dirt gap anymore.
          { asset: "stairs", position: [0, 19.85], size: [6.2, 3.4], steps: 9, baseHeight: 0.23, height: 0.95, ascending: "north", material: "stone" },
          { asset: "temple_floor", position: [0, 17.9], size: [6.2, 0.5], y: 1.04, joints: false },
          { asset: "stairs", position: [0, 16.65], size: [6.2, 2.0], steps: 6, baseHeight: 0.28, height: 0.9, ascending: "south", material: "stone" },
          { asset: "water_area", position: [0, 23.45], size: [40.0, 5.8], rippleCount: 12, shimmer: 0.18, flow: 0.24 },
          { asset: "bridge", position: [0, 23.45], size: [3.5, 5.9], planks: 18 },
          { asset: "collider_only", position: [-10.9, 23.45], size: [18.3, 5.8] },
          { asset: "collider_only", position: [10.9, 23.45], size: [18.3, 5.8] },

          // V34 naturalized water banks: stone, reeds and vegetation with a bridge gap.
          { asset: "water_bank", position: [0, 20.45], length: 40.0, depth: 1.0, gap: 5.0, count: 40, side: -1 },
          { asset: "water_bank", position: [0, 26.45], length: 40.0, depth: 1.0, gap: 5.0, count: 40, side: 1 },
          { asset: "water_bank", position: [-20.0, 23.45], length: 5.8, depth: 0.9, count: 9, rotation: Math.PI / 2 },
          { asset: "water_bank", position: [20.0, 23.45], length: 5.8, depth: 0.9, count: 9, rotation: Math.PI / 2 },

          // Clipped hedges make garden rooms without becoming gameplay walls.
          { asset: "temple_hedge", position: [-18.4, 7.0], length: 8.5, rotation: Math.PI / 2, height: 0.95, blocking: false },
          { asset: "temple_hedge", position: [18.4, 7.0], length: 8.5, rotation: Math.PI / 2, height: 0.95, blocking: false },
          { asset: "temple_hedge", position: [-18.3, 24.0], length: 5.0, rotation: 0, height: 0.90, blocking: false },
          { asset: "temple_hedge", position: [18.3, 24.0], length: 5.0, rotation: 0, height: 0.90, blocking: false },

          // Arrival path over the lawn.
          { asset: "path", position: [0, 28.55], size: [5.4, 4.4] },
          { asset: "patio_round", position: [0, 30.05], diameter: 6.6, material: "stone2", border: "stoneDark" },

          // --- INTERIOR FURNISHING ---
          { asset: "column", position: [-8.5, -5.6], height: 4.0 },
          { asset: "column", position: [8.5, -5.6], height: 4.0 },
          { asset: "column", position: [-8.5, -1.5], height: 3.7 },
          { asset: "column", position: [8.5, -1.5], height: 3.7 },
          { asset: "column", position: [-8.5, 2.7], height: 3.4 },
          { asset: "column", position: [8.5, 2.7], height: 3.4 },

          { asset: "long_table", position: [0, 0.8], size: [6.9, 1.55] },
          { asset: "chair", position: [-4.35, 0.8], rotation: -Math.PI / 2 },
          { asset: "chair", position: [4.35, 0.8], rotation: Math.PI / 2 },
          { asset: "table_candelabrum", position: [0, 0.8], arms: 5, spread: 0.70, intensity: 0.92, range: 6.2 },
          { asset: "banquet_setting", position: [0, 0.8], size: [6.3, 1.16] },

          { asset: "temple_altar_backdrop", position: [0, -8.45], size: [8.0, 0.52], height: 5.40, depth: 0.55 },
          { asset: "temple_sanctuary_details", position: [0, 0] },
          // Rear woodland is outside the playable bounds; it frames the hall.
          ...Array.from({ length: 14 }, (_, i) => ({ asset: "temple_tree", position: [-23 + (i % 7) * 7.4, -14.5 - Math.floor(i / 7) * 7.2], height: 5.2 + (i % 3) * 0.55, crown: 4.4 + (i % 2) * 0.45 })),
          { asset: "temple_window", position: [-10.0, -8.46], width: 2.1, height: 4.2, y: 3.0, rotation: 0, sunlit: false },
          { asset: "temple_window", position: [10.0, -8.46], width: 2.1, height: 4.2, y: 3.0, rotation: 0, sunlit: false },
          { asset: "runner", position: [0, -6.1], size: [5.1, 2.6], material: "templeBurgundy", border: "stoneLight" },
          { asset: "temple_altar", position: [0, -6.2], size: [5.4, 2.1], height: 1.10 },
          { asset: "statue", position: [0, -7.65] },

          // V34 ritual furniture: enrich side aisles while keeping the central axis clear.
          { asset: "temple_pew", position: [-9.8, -2.9], length: 3.5, rotation: Math.PI / 2 },
          { asset: "temple_pew", position: [9.8, -2.9], length: 3.5, rotation: -Math.PI / 2 },
          { asset: "temple_pew", position: [-9.8, 1.9], length: 3.5, rotation: Math.PI / 2 },
          { asset: "temple_pew", position: [9.8, 1.9], length: 3.5, rotation: -Math.PI / 2 },
          { asset: "temple_lectern", position: [-2.9, -4.0], rotation: 0 },
          { asset: "temple_pedestal", position: [-10.8, -6.0], bowl: true },
          { asset: "temple_pedestal", position: [10.8, -6.0], bowl: true },
          { asset: "temple_amphora_cluster", position: [-11.0, 5.5], count: 3 },
          { asset: "temple_amphora_cluster", position: [11.0, 5.5], count: 3 },
          { asset: "temple_floor_candelabrum", position: [-6.6, 4.7], arms: 3 },
          { asset: "temple_floor_candelabrum", position: [6.6, 4.7], arms: 3 },
          { asset: "temple_offering_table", position: [7.2, -4.2], size: [2.4, 0.9] },

          { asset: "temple_brazier", position: [-4.7, -6.35], intensity: 1.38, range: 7.4 },
          { asset: "temple_brazier", position: [4.7, -6.35], intensity: 1.38, range: 7.4 },
          { asset: "temple_torch", position: [-12.55, -5.0], intensity: 1.35, range: 7.9 },
          { asset: "temple_torch", position: [12.55, -5.0], intensity: 1.35, range: 7.9 },
          { asset: "temple_torch", position: [-12.55, -0.2], intensity: 1.20, range: 7.3 },
          { asset: "temple_torch", position: [12.55, -0.2], intensity: 1.20, range: 7.3 },
          { asset: "temple_torch", position: [-12.55, 4.6], intensity: 1.12, range: 6.9 },
          { asset: "temple_torch", position: [12.55, 4.6], intensity: 1.12, range: 6.9 },

          { asset: "banner", position: [-13.30, -2.55], size: [1.30, 2.15], y: 3.70, material: "clothRed", rotation: Math.PI / 2 },
          { asset: "banner", position: [13.30, -2.55], size: [1.30, 2.15], y: 3.70, material: "clothRed", rotation: -Math.PI / 2 },
          { asset: "banner", position: [-13.30, 6.5], size: [1.30, 2.15], y: 3.45, material: "purple", rotation: Math.PI / 2 },
          { asset: "banner", position: [13.30, 6.5], size: [1.30, 2.15], y: 3.45, material: "purple", rotation: -Math.PI / 2 },
          { asset: "banner", position: [-5.1, -8.43], size: [1.35, 2.65], y: 4.45, material: "clothRed", rotation: 0 },
          { asset: "banner", position: [5.1, -8.43], size: [1.35, 2.65], y: 4.45, material: "clothRed", rotation: 0 },

          { asset: "rose_patch", position: [-9.7, 5.7], size: [3.2, 1.4], count: 13 },
          { asset: "rose_patch", position: [9.7, 5.7], size: [3.2, 1.4], count: 13 },

          // --- COURTYARD LIGHTS / CEREMONIAL DETAILS ---
          { asset: "temple_brazier", position: [-10.6, 15.7], intensity: 0.92, range: 5.4, scale: 0.9 },
          { asset: "temple_brazier", position: [10.6, 15.7], intensity: 0.92, range: 5.4, scale: 0.9 },
          { asset: "lantern_post", position: [-11.0, 10.2], intensity: 0.42, range: 5.2, height: 2.45 },
          { asset: "lantern_post", position: [11.0, 10.2], intensity: 0.42, range: 5.2, height: 2.45 },
          { asset: "lantern_post", position: [-5.7, 19.5], intensity: 0.44, range: 5.0, height: 2.40 },
          { asset: "lantern_post", position: [5.7, 19.5], intensity: 0.44, range: 5.0, height: 2.40 },

          // --- GARDENS OUTSIDE THE WALLS ---
          { asset: "temple_tree", position: [-20.7, -5.2], height: 4.5, crown: 3.2 },
          { asset: "temple_tree", position: [20.8, -4.2], height: 4.2, crown: 3.0 },
          { asset: "temple_tree", position: [-21.5, 5.6], height: 4.0, crown: 2.9 },
          { asset: "temple_tree", position: [21.2, 6.5], height: 4.4, crown: 3.2 },
          { asset: "temple_tree", position: [-20.8, 16.3], height: 4.1, crown: 3.0 },
          { asset: "temple_tree", position: [20.8, 16.0], height: 4.3, crown: 3.1 },
          { asset: "temple_tree", position: [-21.0, 28.4], height: 3.9, crown: 2.8 },
          { asset: "temple_tree", position: [21.0, 28.1], height: 4.1, crown: 2.9 },
          { asset: "temple_tree", position: [-23.0, -12.0], height: 5.0, crown: 3.6 },
          { asset: "temple_tree", position: [23.0, -12.0], height: 5.0, crown: 3.6 },

          { asset: "temple_garden_bed", position: [-19.0, -0.2], size: [6.0, 2.5], count: 19 },
          { asset: "temple_garden_bed", position: [19.0, 0.2], size: [6.0, 2.5], count: 19 },
          { asset: "temple_garden_bed", position: [-19.1, 10.9], size: [6.2, 2.7], count: 20 },
          { asset: "temple_garden_bed", position: [19.1, 10.9], size: [6.2, 2.7], count: 20 },
          { asset: "temple_garden_bed", position: [-18.9, 18.2], size: [5.6, 2.4], count: 18 },
          { asset: "temple_garden_bed", position: [18.9, 18.2], size: [5.6, 2.4], count: 18 },
          { asset: "temple_garden_bed", position: [-15.5, 29.2], size: [5.2, 2.2], count: 16 },
          { asset: "temple_garden_bed", position: [15.5, 29.2], size: [5.2, 2.2], count: 16 },

          { asset: "grass_tufts", position: [-20.0, -10.5], spread: 4.2, count: 20 },
          { asset: "grass_tufts", position: [20.0, -10.0], spread: 4.2, count: 20 },
          { asset: "grass_tufts", position: [-20.0, 4.0], spread: 4.4, count: 20 },
          { asset: "grass_tufts", position: [20.0, 4.2], spread: 4.4, count: 20 },
          { asset: "grass_tufts", position: [-20.0, 22.0], spread: 3.8, count: 18 },
          { asset: "grass_tufts", position: [20.0, 22.0], spread: 3.8, count: 18 },
          { asset: "grass_tufts", position: [-9.0, 29.0], spread: 2.5, count: 12 },
          { asset: "grass_tufts", position: [9.0, 29.0], spread: 2.5, count: 12 },

          // Water-bank vegetation.
          { asset: "plant_cluster", position: [-18.0, 20.2], spread: 1.5, count: 12 },
          { asset: "plant_cluster", position: [18.0, 20.2], spread: 1.5, count: 12 },
          { asset: "plant_cluster", position: [-17.0, 26.4], spread: 1.4, count: 10 },
          { asset: "plant_cluster", position: [17.0, 26.4], spread: 1.4, count: 10 },
          { asset: "rock_cluster", position: [-15.8, 20.1], spread: 1.2, count: 6 },
          { asset: "rock_cluster", position: [15.8, 20.1], spread: 1.2, count: 6 },
          { asset: "rock_cluster", position: [-15.4, 26.5], spread: 1.1, count: 5 },
          { asset: "rock_cluster", position: [15.4, 26.5], spread: 1.1, count: 5 },

          // Rest areas on the lawn.
          { asset: "patio_round", position: [-19.0, 13.8], diameter: 6.4, material: "stone2", border: "stoneDark" },
          { asset: "bench", position: [-19.0, 14.5], size: [2.8, 0.68] },
          { asset: "patio_round", position: [19.0, 13.8], diameter: 6.4, material: "stone2", border: "stoneDark" },
          { asset: "bench", position: [19.0, 14.5], size: [2.8, 0.68] },
          { asset: "stone_lantern", position: [-16.0, 17.0], intensity: 0.30, range: 4.2 },
          { asset: "stone_lantern", position: [16.0, 17.0], intensity: 0.30, range: 4.2 },
          { asset: "stone_lantern", position: [-8.0, 29.2], intensity: 0.24, range: 3.8 },
          { asset: "stone_lantern", position: [8.0, 29.2], intensity: 0.24, range: 3.8 },

          // Low perimeter accents frame the garden without boxing the camera in.
          { asset: "low_wall", position: [-25.0, 9.0], size: [15.0, 0.48], height: 0.72, material: "stoneDark", rotation: Math.PI / 2 },
          { asset: "low_wall", position: [25.0, 9.0], size: [15.0, 0.48], height: 0.72, material: "stoneDark", rotation: Math.PI / 2 },
          { asset: "low_wall", position: [-18.5, 31.1], size: [12.0, 0.48], height: 0.72, material: "stoneDark" },
          { asset: "low_wall", position: [18.5, 31.1], size: [12.0, 0.48], height: 0.72, material: "stoneDark" }
        ],
        navigation: {
          bounds: [-25.55, 25.55, -9.45, 33.45],
          blockers: [
            { position: [-10.9, 23.45], size: [18.3, 5.8] },
            { position: [10.9, 23.45], size: [18.3, 5.8] }
          ],
          zones: [
            { type: "walkable", label: "nave del templo", position: [0, -0.5], size: [27.0, 16.6] },
            { type: "walkable", label: "patio procesional", position: [0, 13.0], size: [27.0, 9.8] },
            { type: "entry", label: "puerta monumental", position: [0, 18.15], size: [6.7, 1.9] },
            { type: "stairs", label: "escaleras del templo", position: [0, 19.85], size: [5.4, 3.2] },
            { type: "bridge", label: "puente", position: [0, 23.45], size: [3.5, 5.9] },
            { type: "water", label: "agua", position: [-10.9, 23.45], size: [18.3, 5.8] },
            { type: "water", label: "agua", position: [10.9, 23.45], size: [18.3, 5.8] },
            { type: "walkable", label: "sendero de llegada", position: [0, 28.6], size: [5.8, 5.8] },
            { type: "difficult", label: "jardines del templo", position: [-20.0, 7.0], size: [10.0, 30.0] },
            { type: "difficult", label: "jardines del templo", position: [20.0, 7.0], size: [10.0, 30.0] },
            { type: "difficult", label: "jardines de llegada", position: [-16.0, 29.0], size: [12.0, 5.0] },
            { type: "difficult", label: "jardines de llegada", position: [16.0, 29.0], size: [12.0, 5.0] }
          ],
          interactions: [
            { id: "temple_bridge_geom", position: [0, 23.45], radius: 1.9, label: "Tocar el agua junto al puente", message: "El puente cruza el canal frente a la entrada del templo.", action: { type: "ripple", color: [0.10, 0.50, 0.68], size: 1.0 } },
            { id: "temple_stairs_geom", position: [0, 19.85], radius: 1.8, label: "Examinar escaleras", message: "Las escaleras ascienden directamente desde el extremo del puente hasta la puerta monumental." },
            { id: "temple_gate_geom", position: [0, 18.15], radius: 2.2, label: "Examinar entrada", message: "La puerta monumental marca el inicio del patio procesional amurallado." },
            { id: "temple_garden_left", position: [-19.0, 13.8], radius: 2.4, label: "Examinar jardín", message: "Césped, rosales, árboles y un pequeño lugar de descanso ocupan este lateral del templo." }
          ]
        }
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        horizon: { style: "coast", zenith: "#273247", horizon: "#b59ba0", ground: "#4e655b", far: "#596976", near: "#77717a", water: "#376b78", warmWindows: false },
        environment: { clearColor: [0.024, 0.035, 0.062], fog: false, fogDensity: 0, exposure: 1.18, contrast: 1.10, toneMapping: true, vignette: true, vignetteWeight: 0.16, vignetteStretch: 0.08 },
        lighting: {
          mode: "exterior",
          ambientIntensity: 0.40,
          ambientColor: [0.54, 0.65, 0.88],
          natural: { color: [0.60, 0.72, 1.00], intensity: 0.92, direction: [0.55, -0.85, -0.32], position: [-22, 28, 12] },
          globalFill: { color: [0.52, 0.61, 0.86], intensity: 0.10, hemiIntensity: 0.14, directionalIntensity: 0.08, direction: [0.55, -0.85, -0.32] },
          shadows: { enabled: true, mapSize: 2048, blurKernel: 12, intensity: 0.92, color: [0.60, 0.72, 1.00], direction: [0.55, -0.85, -0.32], position: [-22, 28, 12], darkness: 0.38 },
          lights: [
            { position: [0, 3.8, -6.4], color: [1.00, 0.58, 0.27], intensity: 2.10, range: 9.5 },
            { position: [0, 2.3, 0.8], color: [1.00, 0.67, 0.34], intensity: 2.15, range: 7.5 },
            { position: [0, 2.4, 16.7], color: [1.00, 0.50, 0.20], intensity: 0.34, range: 8.0 }
          ]
        },
        vfx: { dust: true, fireflies: true, fireflyCount: 4, roseSway: true, waterRipples: true, waterMotion: true, gardenMotes: true, gardenMoteCount: 18 },
        interactables: [
          { id: "temple_table_ambience", position: [0, 0.8], radius: 2.6, label: "Interactuar con el candelabro", message: "El único candelabro ilumina las rosas, los platos y los cubiertos de la mesa.", action: { type: "toggle_local", radius: 3.4, meshMatch: ["tableCandelabrumFlame"], lights: true, offMessage: "Apagas el candelabro.", onMessage: "Vuelves a encender el candelabro." } },
          { id: "temple_altar_ambience", position: [0, -6.0], radius: 2.4, label: "Examinar altar", message: "El altar de piedra marca el final del eje ceremonial del templo.", action: { type: "pulse", color: [1.00, 0.50, 0.18], range: 3.4 } },
          { id: "temple_statue_ambience", position: [0, -7.5], radius: 2.0, label: "Examinar estatua", message: "La figura de piedra se alza detrás del altar.", action: { type: "pulse", color: [0.75, 0.64, 0.48], range: 3.2 } }
        ],
        visual: {
          profile: "temple_twilight_sanctuary",
          glow: 0.18,
          exposure: 1.18,
          contrast: 1.10,
          fov: 0.72,
          sceneAmbient: [0.10, 0.13, 0.21],
          diffuseBoost: 1.05,
          emissiveFloor: 0.025,
          specular: 0.020,
          maxRealPointLights: 14,
          maxMaterialLights: 8,
          aoStrength: 0.65,
          aoRadius: 0.72,
          bloomWeight: 0.16,
          bloomThreshold: 0.84,
          contactShadows: [
            { position: [0, 0.7], size: [8.2, 2.5], alpha: 0.17 },
            { position: [-8.5, -1.5], size: [2.1, 9.0], alpha: 0.12 },
            { position: [8.5, -1.5], size: [2.1, 9.0], alpha: 0.12 },
            { position: [0, -6.8], size: [8.8, 3.8], alpha: 0.18 },
            { position: [0, 13.0], size: [25.0, 9.0], alpha: 0.08 },
            { position: [0, 19.0], size: [8.0, 3.0], alpha: 0.12 }
          ],
          lightPools: [
            { position: [0, 0.8], size: [9.0, 5.8], color: [1.00, 0.58, 0.24], alpha: 0.22 },
            { position: [-9.8, -4.88], size: [7.2, 2.1], color: [1.00, 0.55, 0.22], alpha: 0.15 },
            { position: [-9.8, -0.12], size: [7.2, 2.1], color: [1.00, 0.55, 0.22], alpha: 0.14 },
            { position: [-9.8, 4.58], size: [7.2, 2.1], color: [1.00, 0.55, 0.22], alpha: 0.13 },
            { position: [0, -6.2], size: [8.2, 4.5], color: [1.00, 0.54, 0.20], alpha: 0.25 },
            { position: [0, 16.0], size: [25.0, 6.5], color: [1.00, 0.58, 0.24], alpha: 0.055 },
            { position: [0, 28.5], size: [12.0, 4.0], color: [1.00, 0.60, 0.28], alpha: 0.050 }
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
          { asset: "house", position: [0, -4.9], size: [12.0, 5.4], height: 2.8, cutaway: true, windowLightIntensity: 0.95, windowLightRange: 6.8 },
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
          { asset: "table_dressing", position: [0, 3.2], count: 4, radius: 0.68, paper: true },
          { asset: "plant_cluster", position: [-5.8, -7.6], spread: 0.75, count: 5 },
          { asset: "plant_cluster", position: [5.8, -7.6], spread: 0.75, count: 5 },
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
        horizon: { style: "estate", zenith: "#252437", horizon: "#a17b7c", ground: "#505d54", far: "#4d5552", near: "#66595c", warmWindows: true },
        environment: { clearColor: [0.014, 0.024, 0.052], fog: true, fogDensity: 0.0015, exposure: 1.11, contrast: 1.07, toneMapping: true, vignette: true, vignetteWeight: 0.24 },
        lighting: {
          mode: "exterior",
          ambientIntensity: 0.64,
          ambientColor: [0.72, 0.78, 0.96],
          natural: { position: [-8, 11, -6], direction: [0.42, -1, 0.28], color: [0.70, 0.78, 1.00], intensity: 0.68 },
          shadows: { enabled: true, mapSize: 1024, blurKernel: 14, darkness: 0.52 },
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
          sceneAmbient: [0.16, 0.18, 0.25],
          diffuseBoost: 1.12,
          emissiveFloor: 0.025,
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
      camera: { radius: 26.6, beta: 0.68, alpha: Math.PI / 2.12 },
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
          { asset: "house", position: [7.2, -3.0], size: [6.6,6.6], height: 2.6, cutaway: true, playable: true, material: 'wood', doorX: 6 },
          { asset: "plant_cluster", position: [3.2, -3.9], spread: 1.3, count: 12 },
          { asset: "plant_cluster", position: [11.3, -2.0], spread: 1.4, count: 14 },
          { asset: "grass_tufts", position: [8.8, -7.55], spread: 2.1, count: 18 },
          { asset: "stone_lantern", position: [4.0, 4.8], height: 1.4, intensity: 0.42, range: 5 },
          { asset: "stone_lantern", position: [8.0, 1.0], height: 1.4, intensity: 0.38, range: 4.8 },
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
          { asset: "plant_cluster", position: [3.0, -5.7], spread: 1.3, count: 8 },
          { asset: "plant_cluster", position: [11.2, -6.8], spread: 1.0, count: 7 },
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
          { asset: "low_wall", position: [4.45, 0.2], size: [1.1, 0.34], height: .48, material: "wood" },
          { asset: "low_wall", position: [8.75, 0.2], size: [3.5, 0.34], height: .48, material: "wood" },
          { asset: "plant_cluster", position: [-10.2, 5.8], spread: 1.2, count: 8, material: "rosePink" }
        ],
        navigation: {
          bounds: [-13.55, 13.55, -9.55, 9.55],
          blockers: [],
          zones: [
            { type: "walkable", label: "sendero", position: [-1.0, 4.8], size: [23.0, 2.2] },
            { type: "walkable", label: "sendero", position: [5.8, 0.2], size: [2.2, 11.0] },
            { type: "walkable", label: "cabaña de madera", position: [7.2, -3.0], size: [6.2, 6.2] },
            { type: "difficult", label: "rosales", position: [-7.8, -2.0], size: [4.6, 8.2] },
            { type: "difficult", label: "rosales", position: [-2.7, -3.2], size: [3.8, 5.8] },
            { type: "hazard", label: "espinos densos", position: [-7.2, -8.25], size: [9.4, 1.0] }
          ],
          interactions: [
            { id: "garden_room_geom", position: [7.2, -0.8], radius: 1.5, label: "Examinar refugio", message: "La cabaña de madera ofrece una estancia cerrada dentro del jardín." },
            { id: "garden_roses_geom", position: [-6.4, -2.0], radius: 1.7, label: "Apartar los rosales", message: "Los rosales forman una masa densa junto al sendero.", action: { type: "nudge", radius: 3.0, meshMatch: ["roseHead", "thornRose"] } }
          ]
        }
      },
      CANON: { interactables: [], triggers: [] },
      VTT_AMBIENCE: {
        horizon: { style: "snowForest", zenith: "#304659", horizon: "#d0d5d8", ground: "#a8b8be", far: "#718894", near: "#788992", snow: "#d6e1e5", warmWindows: false },
        environment: { clearColor: [0.026, 0.060, 0.086], fog: true, fogDensity: 0.00115, exposure: 1.12, contrast: 1.07, toneMapping: true, vignette: true, vignetteWeight: 0.24 },
        lighting: {
          mode: "exterior",
          ambientIntensity: 0.50,
          ambientColor: [0.65, 0.77, 0.91],
          natural: { position: [-10, 8, -10], direction: [0.62, -0.72, 0.38], color: [0.54, 0.70, 0.95], intensity: 0.62 },
          shadows: { enabled: true, mapSize: 1024, blurKernel: 16, darkness: 0.48 },
          lights: []
        },
        vfx: { snowfall: true, snowCount: 56, snowSpeed: 0.32, roseSway: true, fireflies: true, fireflyCount: 12 },
        interactables: [
          { id: "garden_roses_ambience", position: [-6.0, -1.5], radius: 2.2, label: "Rozar rosales", message: "Los rosales destacan con fuerza sobre la nieve.", action: { type: "nudge", radius: 3.0, meshMatch: ["roseHead", "thornRose"] } },
          { id: "garden_room_ambience", position: [4.5, -3.0], radius: 2.2, label: "Examinar estancia", message: "Una pequeña cabaña de madera se cobija entre los rosales del jardín.", action: { type: "pulse", color: [1.00, 0.62, 0.24], range: 3.2 } }
        ],
        visual: {
          profile: "garden_moonlit_snow",
          aoStrength: 0.28,
          glow: 0.10,
          exposure: 1.02,
          contrast: 1.12,
          fov: 0.74,
          sceneAmbient: [0.075, 0.12, 0.18],
          diffuseBoost: 1.05,
          emissiveFloor: 0.012,
          specular: 0.018,
          maxRealPointLights: 8,
          maxMaterialLights: 8,
          contactShadows: [
            { position: [7.2, -3.0], size: [7.0, 6.2], color: [0.08, 0.07, 0.09], alpha: 0.10 },
            { position: [-7.8, -2.0], size: [6.0, 8.0], color: [0.14, 0.05, 0.06], alpha: 0.07 }
          ],
          lightPools: [
            { position: [7.2, -2.8], size: [7.0, 6.0], color: [1.00, 0.54, 0.20], alpha: 0.12 },
            { position: [2.0, 4.6], size: [6.0, 5.0], color: [1.00, 0.66, 0.32], alpha: 0.07 }
          ]
        },
        audio: { music: null, ambience: null }
      }
    },

    market: {
      label: "MARKET",
      spawn: [0, 0.43, 7.2],
      camera: { radius: 27.0, beta: 0.69, alpha: Math.PI / 2.22 },
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
        horizon: { style: "nightMarket", zenith: "#2b2440", horizon: "#b1758b", ground: "#71677a", far: "#49435d", near: "#6b5868", warmWindows: true },
        environment: { clearColor: [0.025, 0.040, 0.075], fog: true, fogDensity: 0.00105, exposure: 1.13, contrast: 1.08, toneMapping: true, vignette: true, vignetteWeight: 0.22 },
        lighting: {
          mode: "exterior",
          ambientIntensity: 0.61,
          ambientColor: [0.69, 0.76, 0.94],
          natural: { position: [-12, 8, -8], direction: [0.62, -0.72, 0.30], color: [0.58, 0.70, 0.96], intensity: 0.42 },
          shadows: { enabled: true, mapSize: 1024, blurKernel: 16, darkness: 0.46 },
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
          sceneAmbient: [0.13, 0.16, 0.24],
          diffuseBoost: 1.06,
          emissiveFloor: 0.010,
          specular: 0.020,
          maxRealPointLights: 12,
          maxMaterialLights: 8,
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
      camera: { radius: 27.8, beta: 0.68, alpha: Math.PI / 2.24 },
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
          { asset: "mirror_frame", position: [-9.2, -2.5], scale: 1.05, rotation: 0.18 },
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
        horizon: { style: "cavern", zenith: "#101c27", horizon: "#3e7e88", ground: "#284c54", far: "#254750", near: "#37616a", crystal: "#49a0ad", warmWindows: false },
        environment: { clearColor: [0.010, 0.038, 0.058], fog: true, fogDensity: 0.0009, exposure: 1.05, contrast: 1.08, toneMapping: false, vignette: false },
        lighting: {
          mode: "interior",
          ambientIntensity: 0.36,
          ambientColor: [0.50, 0.72, 0.86],
          globalFill: { color: [0.25, 0.48, 0.62], intensity: 0.15, hemiIntensity: 0.14, directionalIntensity: 0.10, direction: [0.28, -1, -0.20] },
          shadows: { enabled: true, mapSize: 1024, blurKernel: 16, intensity: 0.38, darkness: 0.52, position: [-8, 11, -10], direction: [0.38, -1, 0.52], color: [0.42, 0.70, 1.00] },
          lights: [
            { position: [1.0, 3.8, 0.5], color: [0.12, 0.72, 0.86], intensity: 0.58, range: 18 },
            { position: [5.0, 2.8, 2.0], color: [0.18, 0.78, 0.58], intensity: 0.48, range: 16 },
            { position: [-4.0, 2.4, -1.0], color: [0.14, 0.64, 0.82], intensity: 0.45, range: 15 }
          ]
        },
        vfx: { waterRipples: true, magicMotes: true, magicCount: 18, snowfall: true, snowCount: 22, snowSpeed: 0.18 },
        interactables: [
          { id: "mirror_ambience", position: [-7.3, -2.5], radius: 2.2, label: "Activar resplandor", message: "El espejo se alza sobre un pedestal rodeado de luz azulada.", action: { type: "pulse", color: [0.06, 0.86, 0.94], range: 6.0 } },
          { id: "ice_ambience", position: [4.5, 2.6], radius: 2.0, label: "Golpear suavemente el hielo", message: "Grietas oscuras recorren la superficie helada.", action: { type: "ripple", color: [0.12, 0.72, 1.00], size: 1.1 } }
        ],
        visual: {
          profile: "mirror_aurora_cave",
          glow: 0.16,
          exposure: 1.02,
          contrast: 1.08,
          fov: 0.70,
          sceneAmbient: [0.025, 0.050, 0.070],
          diffuseBoost: 1.05,
          emissiveFloor: 0.022,
          specular: 0.11,
          maxRealPointLights: 8,
          maxMaterialLights: 8,
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

// Physical authoring shared by the VTT and the Playground. Roofs, tree crowns
// and awnings are deliberately NOT inferred as floor obstacles.
function physicalBoxes(objects: any[]) {
  const boxes: any[] = [];
  for (const [index, o] of objects.entries()) {
    const [x, z] = o.position, s = o.scale ?? 1, a = o.rotation ?? 0;
    const add = (px: number, pz: number, w: number, d: number, effects = false) => boxes.push({
      id: `solid-${index}-${boxes.length}`, position: [px, pz], size: [w, d], effects
    });
    const rotated = (w: number, d: number, effects = false) => add(x, z,
      Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * d,
      Math.abs(Math.sin(a)) * w + Math.abs(Math.cos(a)) * d, effects);
    if (['wall', 'temple_wall', 'stone_partition', 'collider_only', 'cabinet'].includes(o.asset)) add(x, z, o.size[0], o.size[1], o.asset !== 'cabinet' && o.asset !== 'collider_only');
    else if (o.asset === 'low_wall') rotated((o.size?.[0] ?? 4) * s, (o.size?.[1] ?? .42) * s);
    else if (o.asset === 'temple_gate') for (const side of [-1, 1]) add(x + side * (o.width ?? 6.4) * s / 2, z, .92 * s, (o.depth ?? .9) * s, true);
    else if (['archway', 'arch_ruin'].includes(o.asset)) for (const side of [-1, 1]) add(x + side * (o.size?.[0] ?? 3.4) * s * .42, z, .46 * s, .60 * s, true);
    else if (o.asset === 'round_room') {
      const radius = (o.radius ?? 3) * s, segments = o.segments ?? 20, opening = o.opening ?? 3;
      for (let i = opening; i < segments; i++) {
        const angle = i / segments * Math.PI * 2 + (o.openingAngle ?? 0), w = Math.PI * 2 * radius / segments * 1.06, d = .42;
        add(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius,
          Math.abs(Math.sin(angle)) * w + Math.abs(Math.cos(angle)) * d,
          Math.abs(Math.cos(angle)) * w + Math.abs(Math.sin(angle)) * d, true);
      }
    }
    else if (o.asset === 'column') add(x, z, (o.diameter ?? .75) * s, (o.diameter ?? .75) * s, true);
    else if (o.asset === 'tree') add(x, z, .8, .8);
    else if (o.asset === 'snow_tree') add(x, z, .78 * s, .78 * s);
    else if (o.asset === 'temple_tree') add(x, z, .75 * s, .75 * s);
    else if (o.asset === 'temple_pew') rotated((o.length ?? 3.4) * s, .75);
    else if (o.asset === 'stall') add(x, z, 4, 1.4);
    else if (o.asset === 'table_round') add(x, z, 1.35 * s, 1.35 * s);
    else if (o.asset === 'crate') add(x, z, .8 * s, .8 * s);
    else if (o.asset === 'barrel_large') add(x, z, 1.3, 1.3);
    else if (o.asset === 'small_barrel') add(x, z, .615 * s, .615 * s);
    else if (o.asset === 'barrel_cluster') for (let i = 0; i < (o.count ?? 4); i++) add(x + (i - ((o.count ?? 4) - 1) / 2) * (o.spacing ?? 1.25) * s, z, 1.05 * s, 1.05 * s);
    else if (['sofa_red', 'sideboard', 'trough'].includes(o.asset) && o.size) add(x, z, o.size[0] * s, o.size[1] * s);
    else if (o.asset === 'bed') add(x,z,(o.size?.[0]??1.25)*s,(o.size?.[1]??2.25)*s);
    else if (o.asset === 'long_table') add(x,z,(o.size?.[0]??5.2)*s*.88,(o.size?.[1]??1.35)*s*.88);
    else if (o.asset === 'temple_altar') add(x,z,(o.size?.[0]??5.2)*s*1.05,(o.size?.[1]??2)*s*1.10);
    else if (o.asset === 'temple_offering_table') add(x,z,(o.size?.[0]??2.4)*s*.92,(o.size?.[1]??.9)*s*.92);
    else if (o.asset === 'temple_lectern') add(x,z,1,.8);
    else if (o.asset === 'temple_pedestal') add(x,z,.95,.95);
    else if (o.asset === 'temple_font') add(x,z,.75,.75);
    else if (o.asset === 'brazier') add(x,z,.95*s,.95*s);
    else if (o.asset === 'temple_brazier') add(x,z,.72*s,.72*s);
    else if (o.asset === 'stone_lantern') add(x,z,.65*s,.65*s);
    else if (o.asset === 'lantern_post') add(x,z,.32*s,.32*s);
    else if (o.asset === 'market_stall') add(x,z,(o.size?.[0]??4.4)*s*.92,(o.size?.[1]??2)*s*.72);
    else if (o.asset === 'house') {
      const w=(o.size?.[0]??8)*s,d=(o.size?.[1]??5)*s;
      if(o.playable){
        add(x,z-d/2,w,.3,true);add(x-w/2,z,.3,d,true);add(x+w/2,z,.3,d,true);
        const doorX=o.doorX??x-w*.28,edge=.98;
        add((x-w/2+doorX-edge)/2,z+d/2,doorX-edge-(x-w/2),.3,true);
        add((doorX+edge+x+w/2)/2,z+d/2,x+w/2-doorX-edge,.3,true);
        if(!o.material){add(x,z,2.2,1.15);add(x-w*.32,z+d*.26,w*.2,.8);add(x+w*.32,z+d*.24,1.6,.85);}
      }else add(x,z,w,d,true);
    }
    else if (o.asset === 'statue') add(x, z, 2, 1.4);
    else if (o.asset === 'well') add(x, z, (o.diameter ?? 2) * s, (o.diameter ?? 2) * s);
    else if (o.asset === 'thorn_wall') add(x,z,Math.abs(Math.cos(a))*(o.length??5)*s+.45,Math.abs(Math.sin(a))*(o.length??5)*s+.45);
    else if (o.asset === 'fence' && o.blocking !== false) rotated((o.length ?? 5) * s, .18);
  }
  return boxes;
}

// Exception documented in WORKFLOW.md: this matches buildTavernV34, not the
// obsolete design partitions still present in MAP.objects.
const tavernPhysical = [
  [0,-7.65,24,.65,1],[-11.65,0,.65,15.3,1],[11.65,0,.65,15.3,1],
  [-6.15,7.55,11.7,.52,1],[6.975,7.55,10.05,.52,1],
  [-3.15,-5,10.8,1.05,0],[-9.65,-1.3,2.7,1.75,1],
  [-8.5,-4.15,2.25,1,0],[-8.85,4.2,2.25,1,0],
  [-5.3,.45,1.35,1.35,0],[1.55,2.25,1.35,1.35,0],[5.05,-.45,1.35,1.35,0],
  [8.35,1.4,.48,8.2,1],[10.1,-2.7,3.8,.48,1],[-8.4,5.75,4.2,.84,0],
  [6.9,5.9,3.2,.68,0],[9.8,5.9,.78,.78,0],
  [5.25,-5.25,1.2,1.2,0],[7.05,-5.25,1.2,1.2,0],
  [5.6,10,4.8,1.55,0]
].map(([x,z,w,d,e], i) => ({ id: `tavern-${i}`, position: [x,z], size: [w,d], effects: Boolean(e) }));

for (const [id, c] of Object.entries<any>(D8NIGHT.maps)) {
  // Preserve grid counts/save coordinates, while making every square 1.5m.
  c.MAP.size = c.MAP.size.map((n: number) => Math.round(n / 1.5) * 1.5);
  const nav = c.MAP.navigation;
  c.MAP.doors = id==='cafe' ? [{id:'cafe-entry-door',label:'Puerta del Café No-Me-Olvides',x:.75,z:7.55,width:1.8,height:2.5,rotation:0}]
    : id==='garden' ? [{id:'fritz-entry-door',label:'Puerta de la cabaña de Fritz',x:6,z:.2,width:1.8,height:2.5,rotation:0}]
    : id==='dinner' ? [{id:'dinner-entry-door',label:'Puerta de la casa de Anteros',x:-3.36,z:-2.2,width:1.8,height:2.3,rotation:0}]
    : id==='temple' ? [{id:'temple-entry-door',label:'Puerta del templo',x:0,z:18.15,width:5.6,height:3.8,rotation:0},{id:'temple-nave-door',label:'Puerta de la nave del templo',x:0,z:8.1,width:5.6,height:4.3,rotation:0}] : [];
  if(id==='dinner')for(const house of c.MAP.objects.filter((o:any)=>o.asset==='house'&&Math.abs(o.position[0])<1))house.playable=true;
  if(id==='cafe')for(const chair of c.MAP.objects.filter((o:any)=>o.asset==='chair'))if(Math.abs(chair.rotation??0)===Math.PI/2)chair.rotation=-chair.rotation;
  if(['temple','cafe','market'].includes(id)){
    nav.bounds[3]+=9;
    const paths: [number,number,number,number][]=id==='temple'?[[-1.5,31.5,-4,40.5],[1.5,31.5,4,40.5]]:id==='cafe'?[[-9,10.5,-12,19.5],[9,10.5,12,19.5]]:[[-2,8.5,-10,17.5],[2,8.5,10,17.5]];
    for(const [i,[ax,az,bx,bz]] of paths.entries()){
      const dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz),nx=-dz/len*1.8,nz=dx/len*1.8;
      nav.zones.push({type:'walkable',label:`camino transitable ${i+1}`,position:[0,0],size:[100,100],outline:[[ax+nx,az+nz],[bx+nx,bz+nz],[bx-nx,bz-nz],[ax-nx,az-nz]]});
    }
  }
  if(id==='dinner')nav.zones.push({type:'walkable',label:'patio y calles de la finca',position:[0,0],size:[27,17]});
  nav.obstacles = id === 'cafe' ? tavernPhysical : physicalBoxes(c.MAP.objects);
  nav.obstacles.push(...(nav.blockers ?? []));
  nav.supports = c.MAP.objects.flatMap((o: any) => o.asset === 'temple_floor'
    ? [{ position: o.position, size: o.size, height: (o.y ?? .14) + .14, kind: 'floor' }]
    : o.asset === 'room_floor' ? [{ position: o.position, size: o.size, height: .12, kind: 'floor' }]
    : o.asset === 'house' && o.playable ? [{ position: o.position, size: o.size.map((n:number)=>n-.44), height: .14, kind: 'floor' }]
    : o.asset === 'patio_round' ? [
      { position: o.position, size: [(o.diameter ?? 6) * (o.scale ?? 1), (o.diameter ?? 6) * (o.scale ?? 1)], radius: (o.diameter ?? 6) * (o.scale ?? 1) * .5, height: (o.height ?? .10) * (o.scale ?? 1) * 1.025, kind: 'floor' },
      { position: o.position, size: [(o.diameter ?? 6) * (o.scale ?? 1), (o.diameter ?? 6) * (o.scale ?? 1)], radius: (o.diameter ?? 6) * (o.scale ?? 1) * .46, height: (o.height ?? .10) * (o.scale ?? 1) * 1.62, kind: 'floor' }
    ]
    : o.asset === 'bridge' ? [{ position: o.position, size: o.size, height: .23, kind: 'bridge' }]
    : o.asset === 'stairs' ? [{ ...o, kind: 'stair', ascending: o.ascending ?? 'south' }] : []);
  if (id === 'garden' || id === 'mirror') nav.zones.unshift({ type: 'walkable', label: id === 'garden' ? 'suelo nevado firme' : 'perímetro de hielo firme', position: [0,0], size: c.MAP.size });
  if (id === 'market') nav.zones.push({ type: 'walkable', label: 'todo el mercado y sus pasillos', position: [0,0], size: [29,20] });
  if(id==='mirror'){
    const pool=c.MAP.objects.find((o:any)=>o.asset==='water_area');
    const seeded=(n:number)=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
    pool.outline=Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2,r=.92+seeded(i*8.7+13)*.16;return[Math.cos(a)*pool.size[0]*.5*r,Math.sin(a)*pool.size[1]*.5*r];});
    const hazard=nav.zones.find((z:any)=>z.type==='hazard');hazard.outline=pool.outline;
    for(const floe of c.MAP.objects.filter((o:any)=>o.asset==='ice_floe')){
      const d=floe.diameter,rot=floe.rotation??0,ds=floe.depthScale??.72;
      const outline=Array.from({length:floe.tessellation??7},(_,i)=>{const a=i/(floe.tessellation??7)*Math.PI*2,x=Math.cos(a)*d*.5,z=Math.sin(a)*d*.5*ds;return[x*Math.cos(rot)+z*Math.sin(rot),-x*Math.sin(rot)+z*Math.cos(rot)];});
      nav.zones.push({type:'hazard',label:'placa de hielo azul fino',position:floe.position,size:[d,d],outline});
    }
  }
}
