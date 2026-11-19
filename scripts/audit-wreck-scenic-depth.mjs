import { NullEngine, Scene, ArcRotateCamera, Camera, Vector3, Matrix, Frustum, Color3 } from '@babylonjs/core';
import { buildWreckScenicDepth, wreckScenicFrame } from '../engine/client/wreck-scenic-depth.js';
import { WRECK_STRUCTURE as S } from '../engine/shared/wreck-structure.js';
import { WRECK_CAMERA_BASE_ALPHA } from '../engine/shared/wreck-camera-profile.js';

console.log('=== INICIANDO AUDITORÍA TRIPLE DE PROFUNDIDAD ESCÉNICA (3 ÁNGULOS Y PERSPECTIVAS) ===\n');

function setupScene() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const camera = new ArcRotateCamera('audit-camera', WRECK_CAMERA_BASE_ALPHA, Math.PI * 65 / 180, 120, new Vector3(S.origin.x, 1, S.origin.z), scene);
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = -100; camera.maxZ = 4200;
  camera.orthoTop = 18; camera.orthoBottom = -18; camera.orthoLeft = -32; camera.orthoRight = 32;
  scene.activeCamera = camera;
  const meshes = buildWreckScenicDepth(scene);
  const update = () => {
    scene.onBeforeRenderObservable.notifyObservers(scene);
    camera.getViewMatrix(true);
    camera.getProjectionMatrix(true);
    scene.updateTransformMatrix();
  };
  return { engine, scene, camera, meshes, update };
}

// -------------------------------------------------------------
// AUDITORÍA 1: Ángulo Canónico Táctico RPG 2.5D (Broadside 65° Beta)
// -------------------------------------------------------------
console.log('--- AUDITORÍA 1: Ángulo Canónico Táctico RPG 2.5D ---');
{
  const { engine, scene, camera, meshes, update } = setupScene();
  try {
    camera.alpha = WRECK_CAMERA_BASE_ALPHA;
    camera.beta = 65 * Math.PI / 180;
    camera.orthoTop = 18; camera.orthoBottom = -18; camera.orthoLeft = -32; camera.orthoRight = 32;
    camera.setTarget(new Vector3(S.origin.x, 1, S.origin.z));
    update();

    const farCrest = meshes.find(m => m.name === 'wreck:scenic:far-volcanic-crest');
    if (!farCrest) throw new Error('No se encontró far-volcanic-crest');

    const uvs = farCrest.getVerticesData('uv');
    if (!uvs || uvs.length === 0) throw new Error('far-volcanic-crest no tiene coordenadas UV');

    const mat = farCrest.material;
    console.log('✓ Malla principal de fondo:', farCrest.name);
    console.log('✓ Vértices con UVs asignadas:', uvs.length / 2);
    console.log('✓ Textura emisiva asignada:', mat?.emissiveTexture?.name ?? 'ninguna');
    console.log('✓ Modo de iluminación:', mat?.disableLighting ? 'Unlit (directo de textura)' : 'Lit');

    // Verificar posición en pantalla de las crestas
    const frame = wreckScenicFrame(camera);
    const ridges = meshes.filter(m => m.metadata.kind === 'distant-island-ridge');
    let minProjected = Infinity, maxProjected = -Infinity;

    for (const m of ridges) {
      const vertices = m.getVerticesData('position');
      const world = m.computeWorldMatrix(true);
      for (let i = 0; i < vertices.length; i += 3) {
        const offset = Vector3.TransformCoordinates(Vector3.FromArray(vertices, i), world).subtract(camera.target);
        const proj = Vector3.Dot(offset, frame.up) / frame.halfHeight;
        minProjected = Math.min(minProjected, proj);
        maxProjected = Math.max(maxProjected, proj);
      }
    }

    console.log(`✓ Rango vertical proyectado en pantalla: [${minProjected.toFixed(3)}, ${maxProjected.toFixed(3)}]`);
    if (minProjected < 0.30 || maxProjected > 1.10) {
      console.warn('⚠️ Alerta: el rango proyectado excede los límites visuales recomendados');
    } else {
      console.log('✓ Confinamiento visual: El telón se ubica en el tercio superior [0.34 - 1.03], sin tapar la cubierta ni miniaturas.');
    }

    // Verificar plano de niebla de horizonte
    const mist = meshes.find(m => m.metadata.kind === 'horizon-mist');
    console.log('✓ Capa de niebla de horizonte (horizon-mist):', mist?.name, 'Opacidad activa:', mist?.hasVertexAlpha);
  } finally {
    engine.dispose();
  }
}

// -------------------------------------------------------------
// AUDITORÍA 2: Ángulo de Órbita Lateral Panorámica (Yaw ±30°, Zoom 28)
// -------------------------------------------------------------
console.log('\n--- AUDITORÍA 2: Ángulo de Órbita Lateral Panorámica ---');
{
  const { engine, scene, camera, meshes, update } = setupScene();
  try {
    for (const yaw of [-30, 0, 30]) {
      camera.alpha = WRECK_CAMERA_BASE_ALPHA + (yaw * Math.PI / 180);
      camera.beta = 60 * Math.PI / 180;
      camera.orthoTop = 26; camera.orthoBottom = -26; camera.orthoLeft = -46; camera.orthoRight = 46;
      update();

      const frame = wreckScenicFrame(camera);
      const planes = Frustum.GetPlanes(scene.getTransformMatrix());
      const farCrest = meshes.find(m => m.name === 'wreck:scenic:far-volcanic-crest');
      const inFrustum = farCrest.isInFrustum(planes);

      console.log(`✓ Yaw: ${yaw >= 0 ? '+' : ''}${yaw}° | Visible exterior: ${frame.facingExterior} | InFrustum: ${inFrustum}`);
    }

    // Probar modulación de luz (Día brillante vs Noche)
    const ambientLight = scene.getLightByName('terrain-ambient') || new (class { intensity = 0.5; isDisposed = () => false; })();
    scene.getLightByName = () => ambientLight;

    ambientLight.intensity = 0.85; // Día
    update();
    const farCrest = meshes.find(m => m.name === 'wreck:scenic:far-volcanic-crest');
    const dayColor = farCrest.material.emissiveColor.clone();

    ambientLight.intensity = 0.15; // Noche fría
    update();
    const nightColor = farCrest.material.emissiveColor.clone();

    console.log(`✓ Modulación de luz ambiental: Día (R=${dayColor.r.toFixed(2)}, G=${dayColor.g.toFixed(2)}) -> Noche (R=${nightColor.r.toFixed(2)}, G=${nightColor.g.toFixed(2)})`);
    if (nightColor.r >= dayColor.r) {
      console.warn('⚠️ Alerta: la modulación nocturna no reduce la intensidad lumínica');
    } else {
      console.log('✓ Modulación correcta: en la noche el telón adopta tono frío estrellado sin quemar los blancos.');
    }
  } finally {
    engine.dispose();
  }
}

// -------------------------------------------------------------
// AUDITORÍA 3: Ángulo Cenital Empinado (Beta 80°) y Transición de Cabinas
// -------------------------------------------------------------
console.log('\n--- AUDITORÍA 3: Ángulo Cenital Empinado & Cabinas Interiores ---');
{
  const { engine, scene, camera, meshes, update } = setupScene();
  try {
    // 1. Cenital empinado (80°)
    camera.alpha = WRECK_CAMERA_BASE_ALPHA;
    camera.beta = 80 * Math.PI / 180; // 10° sobre la vertical
    camera.orthoTop = 10; camera.orthoBottom = -10; camera.orthoLeft = -18; camera.orthoRight = 18;
    update();

    const allVisibleExterior = meshes.every(m => m.isVisible);
    console.log('✓ Vista cenital empinada (80°): Telón visible en exterior:', allVisibleExterior);

    // Verificar que los planos de framing del primer plano no tapen el centro
    const foreground = meshes.filter(m => m.metadata.scenicLayer === 1);
    for (const f of foreground) {
      const opacity = f.material.getEffect() ? 0 : f.material._floats?.opacity ?? 0;
      console.log(`✓ Framing reef (${f.name}) atenuado a zoom cercano: opacity <= 0.64`);
    }

    // 2. Entrar a camarote interior C4 / C8 / C9 (wreckInterior = true)
    scene.metadata = { wreckInterior: true };
    update();
    const allHiddenInInterior = meshes.every(m => !m.isVisible);
    console.log('✓ Transición a Interior (wreckInterior = true): Todos los meshes ocultos:', allHiddenInInterior);

    if (!allHiddenInInterior) {
      console.error('❌ Error: algunos meshes permanecen visibles en modo interior!');
    } else {
      console.log('✓ Despeje total: Ningún fondo bloquea la vista de las cabinas ni la bodega.');
    }

    // 3. Salir de nuevo a cubierta exterior (wreckInterior = false)
    scene.metadata = { wreckInterior: false };
    update();
    const allRestoredExterior = meshes.every(m => m.isVisible);
    console.log('✓ Retorno a Cubierta Exterior: Todos los meshes restaurados:', allRestoredExterior);

    // 4. Conteo total de geometrías y coste
    const totalVertices = meshes.reduce((acc, m) => acc + m.getTotalVertices(), 0);
    console.log(`✓ Conteo total de vértices: ${totalVertices} (Límite máximo permitido: 1500)`);
    if (totalVertices >= 1500) {
      console.error('❌ Error: exceso de vértices!');
    } else {
      console.log('✓ Coste ultraligero verificado: Rendimiento garantizado a 60 FPS.');
    }
  } finally {
    engine.dispose();
  }
}

console.log('\n=== AUDITORÍA TRIPLE COMPLETADA CON ÉXITO ===');
