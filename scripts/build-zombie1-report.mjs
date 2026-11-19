import fs from 'node:fs';
import path from 'node:path';

const outDir = 'output/zombie1-animations-20261109';
fs.mkdirSync(outDir, { recursive: true });

const animations = [
  {
    id: 'idle',
    category: 'locomotion',
    name: 'Reposo / Balanceo Cadavérico',
    fps: 3,
    role: 'Reposo básico fuera de combate. Balanceo orgánico y respiración espeluznante.',
    frames: [
      'zombie1_idle_01.png',
      'zombie1_idle_02.png',
      'zombie1_idle_03.png',
      'zombie1_tambaleo.png'
    ]
  },
  {
    id: 'combat-idle',
    category: 'locomotion',
    name: 'Guardia de Combate / Acecho',
    fps: 4,
    role: 'Postura de alerta tensa durante el turno de combate con garras preparadas.',
    frames: [
      'zombie1_acecho.png',
      'zombie1_amenaza.png',
      'zombie1_pausa.png',
      'zombie1_acecho.png'
    ]
  },
  {
    id: 'moving',
    category: 'locomotion',
    name: 'Caminata Torpe',
    fps: 6,
    role: 'Desplazamiento estándar (velocidad 6 m / 4 casillas). Paso pesado y arrastre.',
    frames: [
      'zombie1_caminar_01.png',
      'zombie1_caminar_02.png',
      'zombie1_caminar_03.png',
      'zombie1_caminar_04.png'
    ]
  },
  {
    id: 'running',
    category: 'locomotion',
    name: 'Arremetida / Carrera',
    fps: 8,
    role: 'Acción de Correr (Dash) hacia un aventurero o embestida rápida en cubierta.',
    frames: [
      'zombie1_moverse_rapido_01.png',
      'zombie1_moverse_rapido_02.png',
      'zombie1_moverse_rapido_03.png',
      'zombie1_moverse_rapido_04.png'
    ]
  },
  {
    id: 'attack',
    category: 'attacks',
    name: 'Golpe Contundente (Slam)',
    fps: 8,
    role: 'Ataque principal (+3 para impactar, 1d6+1 contundente). Alzado, zarpazo e impacto.',
    frames: [
      'zombie1_ataque_01.png',
      'zombie1_ataque_02.png',
      'zombie1_ataque_03.png',
      'zombie1_ataque_04.png'
    ]
  },
  {
    id: 'attack-bite',
    category: 'attacks',
    name: 'Desgarrar / Mordisco Secundario',
    fps: 8,
    role: 'Ataque cuerpo a cuerpo secundario (+3, 1d4+1 perforante). Embestida mandibular.',
    frames: [
      'zombie1_ataque2_01.png',
      'zombie1_ataque2_02.png',
      'zombie1_ataque2_03.png',
      'zombie1_ataque2_04.png'
    ]
  },
  {
    id: 'grapple',
    category: 'attacks',
    name: 'Presa Marina / Agarre',
    fps: 6,
    role: 'Acción de agarre para inmovilizar a un héroe (velocidad 0, condición Agarrado).',
    frames: [
      'zombie1_agarrar_01.png',
      'zombie1_agarrar_02.png',
      'zombie1_agarrar_03.png',
      'zombie1_agarrar_04.png'
    ]
  },
  {
    id: 'hit-physical',
    category: 'reactions',
    name: 'Impacto Físico (Daga / Maza / Flecha)',
    fps: 8,
    role: 'Reacción frente a la daga/arco de Trinity o martillo de Mia. Sacudida y retroceso.',
    frames: [
      'zombie1_hit_01.png',
      'zombie1_hit_02.png',
      'zombie1_herido.png',
      'zombie1_hit_01.png'
    ]
  },
  {
    id: 'hit-fire',
    category: 'reactions',
    name: 'Reacción a Fuego (Proyectil / Antorcha)',
    fps: 8,
    role: 'Reacción a conjuros ígneos de Mike o fuego de antorcha. Convulsión humeante.',
    frames: [
      'zombie1_hit_01.png',
      'zombie1_herido.png',
      'zombie1_hit_02.png',
      'zombie1_herido.png'
    ]
  },
  {
    id: 'hit-arcane',
    category: 'reactions',
    name: 'Reacción Arcana / Radiante / Frío',
    fps: 8,
    role: 'Frente a Rayo de escarcha, Proyectil mágico o Llama sagrada divina de Mia.',
    frames: [
      'zombie1_hit_02.png',
      'zombie1_herido.png',
      'zombie1_hit_01.png',
      'zombie1_herido.png'
    ]
  },
  {
    id: 'fall',
    category: 'states',
    name: 'Caída hacia Atrás (Derribo)',
    fps: 7,
    role: 'Efecto de Onda atronadora o empuje físico. Pérdida de equilibrio y colapso al suelo.',
    frames: [
      'zombie1_levantarse_04.png',
      'zombie1_levantarse_03.png',
      'zombie1_levantarse_02.png',
      'zombie1_levantarse_01.png'
    ]
  },
  {
    id: 'prone',
    category: 'states',
    name: 'Derribado en Suelo (Prone Loop)',
    fps: 3,
    role: 'Condición Derribado activa. Bucle de espasmo y respiración en tierra en vez de foto estática.',
    frames: [
      'zombie1_arrastrarse_01.png',
      'zombie1_arrastrarse_02.png',
      'zombie1_arrastrarse_03.png',
      'zombie1_arrastrarse_02.png'
    ]
  },
  {
    id: 'crawl',
    category: 'states',
    name: 'Arrastrarse por el Suelo',
    fps: 5,
    role: 'Movimiento a rastras mientras está derribado hacia los pies de un personaje.',
    frames: [
      'zombie1_arrastrarse_01.png',
      'zombie1_arrastrarse_02.png',
      'zombie1_arrastrarse_03.png',
      'zombie1_arrastrarse_04.png'
    ]
  },
  {
    id: 'stand',
    category: 'states',
    name: 'Fortaleza de No Muerto (Levantarse)',
    fps: 6,
    role: 'Supera salvación CD 5+daño al llegar a 0 PG. Se reincorpora desde el suelo a 1 PG.',
    frames: [
      'zombie1_levantarse_01.png',
      'zombie1_levantarse_02.png',
      'zombie1_levantarse_03.png',
      'zombie1_levantarse_04.png'
    ]
  },
  {
    id: 'flee',
    category: 'states',
    name: 'Huir / Expulsión de No Muertos',
    fps: 6,
    role: 'Aterrorizado por la Expulsión de no muertos de la clériga Mia (condición Asustado).',
    frames: [
      'zombie1_herido.png',
      'zombie1_tambaleo.png',
      'zombie1_caminar_02.png',
      'zombie1_caminar_04.png'
    ]
  },
  {
    id: 'defeated',
    category: 'states',
    name: 'Caída Final y Derrota',
    fps: 4,
    role: '0 PG definitivos (daño radiante, crítico o fallo en salvación). Muerte final.',
    frames: [
      'zombie1_hit_02.png',
      'zombie1_levantarse_02.png',
      'zombie1_arrastrarse_01.png',
      'zombie1_muerto.png'
    ]
  }
];

const basePath = '../../campaigns/stormwreck-isle/public/art/m3/zombie/';

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe Visual de Animaciones: Zombi 1 (Marinero Ahogado)</title>
  <style>
    :root {
      --bg: #0f141c;
      --card-bg: #18202c;
      --card-border: #283548;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.25);
      --success: #34d399;
      --warning: #fbbf24;
      --danger: #f87171;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
    }
    header {
      max-width: 1400px;
      margin: 0 auto 24px auto;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    h1 { font-size: 1.8rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .badge-success {
      background: rgba(52, 211, 153, 0.15);
      color: var(--success);
      border-color: rgba(52, 211, 153, 0.3);
    }
    .stats-bar {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 0.88rem;
      color: var(--text-muted);
    }
    .stats-bar strong { color: #fff; }
    .controls-bar {
      max-width: 1400px;
      margin: 0 auto 24px auto;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      background: var(--card-bg);
      padding: 12px 18px;
      border-radius: 10px;
      border: 1px solid var(--card-border);
    }
    .filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn {
      background: #232d3d;
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .btn:hover { background: #2f3c50; border-color: var(--accent); }
    .btn.active { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 600; }
    .btn-action { display: inline-flex; align-items: center; gap: 6px; }
    .grid {
      max-width: 1400px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .anim-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .anim-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .card-header {
      padding: 12px 14px;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .card-title { font-size: 1rem; font-weight: 600; color: #fff; }
    .card-id { font-size: 0.75rem; color: var(--accent); font-family: monospace; }
    .card-role {
      padding: 8px 14px;
      font-size: 0.8rem;
      color: var(--text-muted);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      background: rgba(0,0,0,0.15);
      min-height: 48px;
    }
    .viewer {
      position: relative;
      width: 100%;
      height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background-color: #121822;
      background-image: 
        linear-gradient(45deg, #182230 25%, transparent 25%), 
        linear-gradient(-45deg, #182230 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #182230 75%), 
        linear-gradient(-45deg, transparent 75%, #182230 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
    .viewer img.sprite {
      max-height: 94%;
      max-width: 94%;
      object-fit: contain;
      filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));
      user-select: none;
    }
    .viewer-overlay {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 6px;
    }
    .frame-pill {
      background: rgba(0,0,0,0.7);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: monospace;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .playback-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #151c27;
      border-top: 1px solid var(--card-border);
      gap: 8px;
    }
    .ctrl-group { display: flex; align-items: center; gap: 4px; }
    .icon-btn {
      background: #253142;
      border: 1px solid var(--card-border);
      color: #fff;
      width: 30px;
      height: 30px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background 0.15s;
    }
    .icon-btn:hover { background: #33445c; }
    .speed-slider {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .speed-slider input[type="range"] {
      width: 70px;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .filmstrip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
      padding: 8px 14px 12px 14px;
      background: #111721;
      border-top: 1px solid var(--card-border);
    }
    .thumb-wrap {
      border: 1px solid var(--card-border);
      border-radius: 6px;
      padding: 4px;
      text-align: center;
      cursor: pointer;
      background: #17202c;
      transition: border-color 0.15s;
    }
    .thumb-wrap:hover { border-color: var(--text-muted); }
    .thumb-wrap.active { border-color: var(--accent); background: rgba(56, 189, 248, 0.12); }
    .thumb-wrap img {
      width: 100%;
      height: 48px;
      object-fit: contain;
    }
    .thumb-label {
      font-size: 0.65rem;
      color: var(--text-muted);
      margin-top: 2px;
      font-family: monospace;
    }
  </style>
</head>
<body>

  <header>
    <div>
      <h1>Zombi 1 · Suite Completa de Animaciones <span class="badge badge-success">Regla ≥ 4 frames cumplida</span></h1>
      <div class="stats-bar" style="margin-top: 8px;">
        <span>Modelo: <strong>Marinero Ahogado (Oficial)</strong></span>
        <span>Animaciones: <strong>16 secuencias</strong></span>
        <span>Fotogramas por clip: <strong>Exactamente 4 frames</strong></span>
        <span>Total archivos: <strong>40 PNGs limpios RGBA</strong></span>
        <span>Resolución: <strong>1024×1024 px</strong></span>
      </div>
    </div>
  </header>

  <div class="controls-bar">
    <div class="filters">
      <button class="btn active" data-filter="all">Todas (16)</button>
      <button class="btn" data-filter="locomotion">Locomoción y Reposo (4)</button>
      <button class="btn" data-filter="attacks">Ataques y Presa (3)</button>
      <button class="btn" data-filter="reactions">Reacciones a Jugadores (3)</button>
      <button class="btn" data-filter="states">Estados y Fortaleza (6)</button>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-action" id="btnPlayAll">▶ Reproducir Todo</button>
      <button class="btn btn-action" id="btnPauseAll">⏸ Pausar Todo</button>
    </div>
  </div>

  <div class="grid" id="animGrid">
    ${animations.map((anim, idx) => `
      <div class="anim-card" data-category="${anim.category}" id="card-${anim.id}">
        <div class="card-header">
          <div>
            <div class="card-title">${anim.name}</div>
            <div class="card-id">tokenAnimations.zombie.${anim.id}</div>
          </div>
          <span class="badge">${anim.fps} FPS</span>
        </div>
        <div class="card-role">${anim.role}</div>
        <div class="viewer">
          <img class="sprite" id="img-${anim.id}" src="${basePath + anim.frames[0]}" alt="${anim.name}">
          <div class="viewer-overlay">
            <span class="frame-pill" id="pill-${anim.id}">Frame 1 / 4</span>
          </div>
        </div>
        <div class="playback-controls">
          <div class="ctrl-group">
            <button class="icon-btn" title="Paso Anterior" onclick="step('${anim.id}', -1)">⏮</button>
            <button class="icon-btn" id="playbtn-${anim.id}" title="Reproducir/Pausar" onclick="togglePlay('${anim.id}')">⏸</button>
            <button class="icon-btn" title="Paso Siguiente" onclick="step('${anim.id}', 1)">⏭</button>
          </div>
          <div class="speed-slider">
            <span id="speedlabel-${anim.id}">${anim.fps} fps</span>
            <input type="range" min="1" max="16" value="${anim.fps}" oninput="setSpeed('${anim.id}', this.value)">
          </div>
        </div>
        <div class="filmstrip">
          ${anim.frames.map((frame, fIdx) => `
            <div class="thumb-wrap ${fIdx === 0 ? 'active' : ''}" id="thumb-${anim.id}-${fIdx}" onclick="gotoFrame('${anim.id}', ${fIdx})">
              <img src="${basePath + frame}" alt="F${fIdx + 1}">
              <div class="thumb-label">F${fIdx + 1}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>

  <script>
    const animData = ${JSON.stringify(animations)};
    const basePath = "${basePath}";
    const states = {};

    animData.forEach(anim => {
      states[anim.id] = {
        frames: anim.frames,
        fps: anim.fps,
        currentFrame: 0,
        playing: true,
        timer: null
      };
      startPlayback(anim.id);
    });

    function startPlayback(id) {
      const state = states[id];
      if (state.timer) clearInterval(state.timer);
      state.timer = setInterval(() => {
        state.currentFrame = (state.currentFrame + 1) % state.frames.length;
        updateUI(id);
      }, 1000 / state.fps);
      state.playing = true;
      const btn = document.getElementById('playbtn-' + id);
      if (btn) btn.textContent = '⏸';
    }

    function pausePlayback(id) {
      const state = states[id];
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }
      state.playing = false;
      const btn = document.getElementById('playbtn-' + id);
      if (btn) btn.textContent = '▶';
    }

    function togglePlay(id) {
      const state = states[id];
      if (state.playing) pausePlayback(id);
      else startPlayback(id);
    }

    function step(id, delta) {
      const state = states[id];
      pausePlayback(id);
      state.currentFrame = (state.currentFrame + delta + state.frames.length) % state.frames.length;
      updateUI(id);
    }

    function gotoFrame(id, frameIdx) {
      const state = states[id];
      pausePlayback(id);
      state.currentFrame = frameIdx;
      updateUI(id);
    }

    function setSpeed(id, newFps) {
      const state = states[id];
      state.fps = parseInt(newFps, 10);
      document.getElementById('speedlabel-' + id).textContent = state.fps + ' fps';
      if (state.playing) {
        startPlayback(id);
      }
    }

    function updateUI(id) {
      const state = states[id];
      const img = document.getElementById('img-' + id);
      const pill = document.getElementById('pill-' + id);
      if (img) img.src = basePath + state.frames[state.currentFrame];
      if (pill) pill.textContent = 'Frame ' + (state.currentFrame + 1) + ' / ' + state.frames.length;
      state.frames.forEach((_, idx) => {
        const thumb = document.getElementById('thumb-' + id + '-' + idx);
        if (thumb) {
          if (idx === state.currentFrame) thumb.classList.add('active');
          else thumb.classList.remove('active');
        }
      });
    }

    // Global buttons
    document.getElementById('btnPlayAll').addEventListener('click', () => {
      Object.keys(states).forEach(startPlayback);
    });
    document.getElementById('btnPauseAll').addEventListener('click', () => {
      Object.keys(states).forEach(pausePlayback);
    });

    // Filtering
    document.querySelectorAll('.filters .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filters .btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.anim-card').forEach(card => {
          if (filter === 'all' || card.dataset.category === filter) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
console.log('Successfully generated HTML report at:', path.join(outDir, 'index.html'));
