type Brush = CanvasRenderingContext2D;
type Point = readonly [number, number];
type Art = (ctx: Brush, cue: number, seconds: number) => void;

const ink = '#0e1c20', slate = '#3c5457', moss = '#82a397', gold = '#e2bc7c', pale = '#f4e4c5';
const materialTones = new Map<string, [string, string]>();

function litMaterial(ctx: Brush, fill: string, top: number, bottom: number) {
  if (!/^#[\da-f]{6}$/i.test(fill) || bottom - top < 8) return fill;
  let tones = materialTones.get(fill);
  if (!tones) {
    const value = Number.parseInt(fill.slice(1), 16);
    const channels = [value >> 16, value >> 8 & 255, value & 255];
    const mix = (tint: number[], amount: number) => `rgb(${channels.map((channel, i) => Math.round(channel * (1 - amount) + tint[i]! * amount)).join(',')})`;
    tones = [mix([243, 196, 128], .22), mix([17, 31, 35], .38)];
    materialTones.set(fill, tones);
  }
  const light = ctx.createLinearGradient(0, top, 0, bottom);
  light.addColorStop(0, tones[0]); light.addColorStop(.37, fill); light.addColorStop(1, tones[1]);
  return light;
}

export function shape(ctx: Brush, points: readonly Point[], fill: string, stroke?: string) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  const ys = points.map(([, y]) => y);
  ctx.closePath(); ctx.fillStyle = litMaterial(ctx, fill, Math.min(...ys), Math.max(...ys)); ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function line(ctx: Brush, points: readonly Point[], color: string, width = 2) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}

export function oval(ctx: Brush, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, angle = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, 2 * Math.PI);
  ctx.fillStyle = typeof fill === 'string' ? litMaterial(ctx, fill, y - ry, y + ry) : fill;
  ctx.fill();
}

function ledge(ctx: Brush, side: number, stride = 0) {
  ctx.scale(side, 1);
  shape(ctx, [[-154, 0], [0, 0], [-12, 13], [-8, 25], [-25, 42], [-27, 57], [-156, 57]], '#293c42');
  shape(ctx, [[-154, 0], [0, 0], [-12, 13], [-80, 10], [-154, 14]], '#526963');
  line(ctx, [[-153, 0], [0, 0], [-12, 13], [-8, 25], [-25, 42], [-27, 57]], '#a0b09a');
  line(ctx, [[-129, 29], [-89, 26], [-80, 14], [-46, 13]], '#374e51', 3);
  for (const start of [-133, -91, -49]) {
    const x = start - stride * 29;
    if (x > -151) line(ctx, [[x, 4], [x + 9, 3]], '#9cac897c', 1.3);
  }
}

function crystal(ctx: Brush, cue: number, seconds: number) {
  const spin = Math.sin(seconds * 1.65), radius = 68 + cue * 17;
  const halo = ctx.createRadialGradient(0, 0, 5, 0, 0, radius);
  halo.addColorStop(0, `rgba(137,219,199,${.13 + cue * .25})`); halo.addColorStop(1, '#89dbc700');
  oval(ctx, 0, 0, radius, radius, halo);
  const mid = 9 * spin;
  shape(ctx, [[0, -37], [25, -13], [18, 22], [-3, 37], [-22, 16], [-26, -14]], '#478780', '#ade4c8');
  shape(ctx, [[0, -37], [mid + 8, -8], [mid, 26], [-3, 37], [-22, 16], [-26, -14]], '#91c5ae');
  shape(ctx, [[0, -37], [25, -13], [mid + 8, -8]], '#d0ecce');
  line(ctx, [[-26, -14], [mid + 8, -8], [25, -13]], '#d1ecce');
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3 + seconds * .46;
    const x = Math.cos(angle) * 45, y = Math.sin(angle) * 36;
    const color = cue > .35 && i === 1 ? '#fff2b0' : '#8cbfae';
    line(ctx, [[x - 4, y + 4], [x, y - 5], [x + 4, y + 4], [x - 3, y + 1]], color, cue > .35 ? 2.8 : 1.6);
  }
}

export function supportingActor(ctx: Brush, kind: 'merchant' | 'guard' | 'bandit' | 'traveler' | 'patient', cue: number, time: number) {
  const coat = { merchant: '#987352', guard: '#637b85', bandit: '#80534c', traveler: '#72795c', patient: '#69806c' }[kind];
  const sit = kind === 'patient', top = sit ? -76 : -106;
  const flee = kind === 'bandit' && cue > .5 ? Math.sin(time * 21) * 18 : 0;
  oval(ctx, 0, 0, 24, 4, '#090f13a0');
  if (sit) {
    line(ctx, [[16, -31], [16, -4]], '#5b483a', 6);
    line(ctx, [[-11, -32], [24, -32]], '#896749', 6);
    line(ctx, [[6, -34], [-18, -29], [-22, -3], [-30, -2]], '#233238', 10);
    line(ctx, [[-7, -35], [-26, -26], [-29, -3], [-37, -2]], ink, 10);
  } else {
    line(ctx, [[-7, -46], [-10 + flee * .3, -21], [-12 + flee, -4], [-19 + flee, -2]], ink, 10);
    line(ctx, [[6, -46], [10 - flee * .35, -22], [12 - flee, -4], [19 - flee, -2]], '#233238', 10);
  }
  shape(ctx, [[-17, top + 24], [9, top + 22], [18, top + 44], [14, -31], [-19, -31], [-13, top + 56]], coat, '#182b30');
  line(ctx, [[-17, top + 25], [-5, top + 27], [0, top + 43]], '#dcc59b75', 1.8);
  line(ctx, [[-5, top + 34], [-2, -47], [2, -37]], '#2d332e70', 2.2);
  line(ctx, [[-15, -43], [15, -43]], '#443a32', 5);
  shape(ctx, [[-2, -46], [5, -46], [5, -40], [-2, -40]], '#b19664', '#63533a');
  const nod = Math.sin(time * 1.65) * 1.7 + (cue > 0 ? Math.sin(time * 6) * cue * 3 : 0);
  ctx.save(); ctx.translate(0, top + nod);
  oval(ctx, -4, 5, 12, 15, '#c69470');
  shape(ctx, [[-12, -4], [-20, 2], [-12, 7], [-6, 3], [-3, -4]], '#c69470');
  const hat = kind === 'guard' ? '#7a9096' : kind === 'merchant' ? '#827053' : '#3c4946';
  shape(ctx, [[-20, -2], [-13, -15], [4, -17], [12, -4], [20, 0], [-22, 1]], hat, ink);
  line(ctx, [[-15, -9], [-10, -14], [3, -16]], '#d9b7809c', 1.45);
  line(ctx, [[-18, -1], [3, -3], [13, -2]], '#1f2c2e96', 2.4);
  oval(ctx, -12, 4, 1.4, kind === 'guard' && cue < 0 ? .5 : 1.6, ink);
  line(ctx, [[-14, 12], [-11, 13 + (cue > 0 ? 1 : 0)], [-8, cue > 0 ? 11 : 13]], '#644839', 1.5);
  ctx.restore();
  const extension = Math.max(0, cue), cross = kind === 'guard' ? 0 : Math.max(0, -cue);
  const handX = -14 - 39 * extension + 24 * cross;
  const handY = -50 - 9 * extension - 12 * cross + (kind === 'traveler' && cue <= 0 ? Math.sin(time * 5) * 4 : 0);
  line(ctx, [[10, top + 29], [16, -58], [cross ? -12 : 14, cross ? -59 : -46]], coat, 10);
  line(ctx, [[-12, top + 31], [-21 - 9 * extension, -57], [handX, handY]], coat, 10);
  oval(ctx, handX, handY, 4.8, 4, '#c69470');
}

function book(ctx: Brush, cue: number) {
  shape(ctx, [[-26, -10], [-5, -12], [0, -7], [21, -13], [29, 4], [2, 10], [-24, 6]], '#774f45', gold);
  shape(ctx, [[-24, -10], [-5, -10], [0, -5], [22, -12], [27, 2], [2, 7], [-23, 4]], '#e3cc9b');
  line(ctx, [[0, -5], [2, 7]], '#8d714f', 1.5);
  line(ctx, [[-20, -6], [-7, -5]], '#9d815d', 1.2);
  line(ctx, [[-19, -1], [-8, 0]], '#9d815d', 1.2);
  line(ctx, [[6, -4], [21, -7]], '#9d815d', 1.2);
  if (cue > .1) shape(ctx, [[0, -5], [15 * cue, -14], [19 * cue, 0], [2, 7]], pale, '#b79b70');
}

function heraldry(ctx: Brush, cue: number) {
  line(ctx, [[-3, 22], [-3, 53]], '#6c5644', 5);
  shape(ctx, [[-36, -41], [36, -41], [33, 9], [0, 35], [-32, 9]], '#784d51', cue > .3 ? '#ffe2a0' : '#cfa985');
  shape(ctx, [[0, -36], [30, -36], [27, 5], [0, 28]], '#466866');
  shape(ctx, [[0, -27], [8, -9], [25, -6], [11, 5], [14, 20], [0, 10], [-14, 20], [-11, 5], [-25, -6], [-8, -9]], '#dfb980');
}

function mechanism(ctx: Brush, cue: number) {
  shape(ctx, [[-42, -49], [42, -49], [42, 0], [-42, 0]], '#3f5356', '#a1aca0');
  shape(ctx, [[-38, -39], [38, -39], [38, -8], [-38, -8]], '#1c2c30');
  for (const [x, y, size] of [[-16, -23, 10], [8, -19, 7]] as const) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(cue * 2);
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); line(ctx, [[0, -size], [0, -size - 4]], '#b88c56', 4); }
    oval(ctx, 0, 0, size, size, '#b88c56'); oval(ctx, 0, 0, size * .53, size * .53, '#314447'); ctx.restore();
  }
  ctx.save(); ctx.translate(0, -49); ctx.rotate(Math.max(0, cue) * .65);
  line(ctx, [[-42, 0], [42, 0]], '#809e94', 7); ctx.restore();
  for (const [index, color] of [[0, gold], [1, '#d9836d']] as const) {
    const x = 4 + index * 25, bend = (index === 0 ? Math.max(0, cue) : Math.max(0, -cue)) * 13;
    line(ctx, [[x, -52], [x - 7 + bend, -72]], '#9d9b84', 4);
    oval(ctx, x - 7 + bend, -73, 4.7, 4.7, color);
  }
}

function plant(ctx: Brush, broad: boolean, cue: number, time: number) {
  ctx.rotate(Math.sin(time * 2.2) * .035);
  line(ctx, [[0, 0], [-3, -21], [3, -46]], broad ? '#92ae74' : '#719d8b', 3);
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1;
    const y = -11 - i * 9;
    oval(ctx, side * 10, y - 4, broad ? 14 : 11, broad ? 5 : 3.3,
      cue > .3 ? '#d8de9e' : i % 2 ? '#8bab72' : '#6e9d83', side * -.48);
  }
  if (broad) oval(ctx, 3, -45, 5, 5, '#c5a97a');
}

function owl(ctx: Brush, cue: number, time: number) {
  const flap = cue * Math.sin(time * 16) * 16;
  shape(ctx, [[-9, -5], [-26, -8 + flap], [-21, 9 + flap], [-5, 16], [5, 16], [21, 9 + flap], [26, -8 + flap], [9, -5]], '#817b69', '#bbac89');
  oval(ctx, 0, 1, 12, 17, '#b9a88b'); oval(ctx, -6, -7, 5, 6, pale); oval(ctx, 6, -7, 5, 6, pale);
  oval(ctx, -6, -6, 2, 2, ink); oval(ctx, 6, -6, 2, 2, ink);
  shape(ctx, [[-3, -3], [3, -3], [0, 1]], '#be884b');
}

function horse(ctx: Brush, cue: number, time: number) {
  const hide = '#99765b', shade = '#674f42', mane = '#332e2d';
  oval(ctx, 0, -1, 80, 5, '#080e125f');
  line(ctx, [[58, -64], [78, -49], [79 + Math.sin(time * 3) * 7, -21]], mane, 9);
  line(ctx, [[-22, -48], [-19, -21], [-25, -3]], shade, 9);
  line(ctx, [[41, -47], [46, -24], [41, -3]], shade, 9);
  line(ctx, [[-34, -47], [-36, -25], [-36, -2]], hide, 10);
  line(ctx, [[49, -47], [53, -22], [52, -2]], hide, 10);
  oval(ctx, 13, -54, 51, 26, hide);
  shape(ctx, [[-44, -37], [-53, -63], [-64, -98], [-47, -113], [-22, -83], [-11, -60], [-21, -41]], hide, shade);
  line(ctx, [[-46, -111], [-31, -88], [-18, -78]], mane, 6);
  ctx.save(); ctx.translate(-50, -93); ctx.rotate(Math.sin(time * 2.4) * .055 - cue * .22);
  shape(ctx, [[7, -5], [-4, -16], [-17, -10], [-40, 9], [-40, 18], [-30, 22], [-13, 13], [4, 5]], hide, shade);
  shape(ctx, [[-13, -12], [-16 + Math.sin(time * 3) * 4, -28], [-6, -19], [-4, -11]], hide, shade);
  shape(ctx, [[-6, -13], [0, -28], [4, -19], [2, -12]], hide, shade);
  oval(ctx, -34, 15, 6, 4, '#59463f'); oval(ctx, -18, -2, 2.6, 2.1, ink);
  line(ctx, [[-37, 18], [-29, 17]], '#6d5148', 1.4); ctx.restore();
}

const art: Record<string, Art> = {
  'ledge-left': (ctx, cue, time) => ledge(ctx, 1, cue * (time * 2 % 1)), 'ledge-right': ctx => ledge(ctx, -1),
  dust: ctx => {
    line(ctx, [[-20, 0], [15, 0]], '#acac8c', 1.5);
    oval(ctx, -9, -6, 3, 2, '#b0a284'); oval(ctx, -25, -1, 2, 1.4, '#b0a284');
  },
  crystal,
  smoke: ctx => {
    oval(ctx, -12, 2, 20, 12, '#a192bca2'); oval(ctx, 8, -9, 22, 14, '#b9a5caa2');
    oval(ctx, 24, 2, 16, 11, '#8a80b4a2');
  },
  merchant: (ctx, cue, time) => supportingActor(ctx, 'merchant', cue, time),
  guard: (ctx, cue, time) => supportingActor(ctx, 'guard', cue, time),
  bandit: (ctx, cue, time) => supportingActor(ctx, 'bandit', cue, time),
  traveler: (ctx, cue, time) => supportingActor(ctx, 'traveler', cue, time),
  patient: (ctx, cue, time) => supportingActor(ctx, 'patient', cue, time),
  table: ctx => {
    line(ctx, [[-33, -51], [-37, -2]], '#745a45', 6); line(ctx, [[32, -52], [35, -2]], '#745a45', 6);
    shape(ctx, [[-45, -58], [39, -58], [47, -52], [-42, -52]], '#a17f5c', '#42382f');
    line(ctx, [[-42, -51], [47, -51]], '#684e3c', 5);
  },
  rope: (ctx, cue) => {
    const sag = 6 + Math.max(0, -cue) * 12;
    for (const x of [-137, 137]) {
      line(ctx, [[x, -8], [x, 33]], '#8c6749', 9);
      line(ctx, [[x - 2, -8], [x - 2, 31]], '#c29b64', 1.8);
    }
    line(ctx, [[-137, 0], [-68, sag * .65], [0, sag], [68, sag * .65], [137, 0]], '#543e30', 4.5);
    line(ctx, [[-137, 0], [-68, sag * .65], [0, sag], [68, sag * .65], [137, 0]], '#dfba80', 2.6);
    for (const x of [-137, 137]) line(ctx, [[x - 4, -5], [x + 4, 2], [x - 4, 4]], gold, 2.4);
  },
  disguise: ctx => shape(ctx, [[-14, -2], [-6, 1], [0, -4], [5, 1], [14, -2], [12, 4], [5, 7], [0, 4], [-5, 7], [-12, 4]], '#c6a56e', '#594b3c'),
  heraldry,
  scroll: ctx => {
    shape(ctx, [[-19, -10], [22, -8], [18, 9], [-21, 7]], '#dbc395', '#8b7053');
    line(ctx, [[-19, -12], [-22, 8]], '#bca06e', 4); line(ctx, [[22, -10], [19, 9]], '#bca06e', 4);
    line(ctx, [[-13, -4], [13, -2]], '#8b7053', 1.3); line(ctx, [[-13, 1], [7, 3]], '#8b7053', 1.3);
  },
  lute: (ctx, cue, time) => {
    ctx.rotate(-.28 + Math.sin(time * 6) * (.03 + Math.max(0, cue) * .045));
    oval(ctx, -9, 0, 17, 12, '#bd9158');
    line(ctx, [[0, -1], [28, -1], [33, -5]], '#b08350', 6);
    oval(ctx, -3, 0, 4, 4, '#584035'); line(ctx, [[-15, 0], [29, -1]], '#efd29b', 1);
  },
  notes: (ctx, cue, time) => {
    const count = cue > .35 ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const x = 20 * i, y = -8 * i + Math.sin(time * 4 + i) * 4;
      oval(ctx, x, y, 4, 3, gold, -.25);
      line(ctx, [[x + 3, y], [x + 3, y - 13], [x + 9, y - 8]], cue < 0 ? '#e6957d' : gold, 2);
    }
  },
  applause: ctx => {
    for (const side of [-1, 1]) {
      line(ctx, [[side * 15, -4], [side * 28, -12]], pale, 2);
      line(ctx, [[side * 18, 7], [side * 32, 8]], gold, 2);
    }
    oval(ctx, -4, 1, 6, 13, '#bd906d', -.3); oval(ctx, 5, 1, 6, 13, '#e0b691', .3);
  },
  mechanism,
  spring: ctx => line(ctx, [[-18, 0], [-14, -5], [-9, 5], [-4, -5], [1, 5], [6, -5], [11, 5], [17, 0]], '#e1c994', 3),
  coin: (ctx, cue, time) => {
    const width = cue > .3 ? 7 : 2 + 5 * Math.abs(Math.sin(time * 7));
    oval(ctx, 0, 0, width, 7, '#dda64f'); oval(ctx, 0, 0, width * .68, 4.8, '#f1ce7d');
    line(ctx, [[0, -3], [0, 3]], '#a67a43', 1.3);
  },
  bandage: (ctx, cue) => {
    if (cue > .3) {
      for (const y of [-6, 0, 6]) line(ctx, [[-10, y - 4], [10, y + 3]], '#eee1bf', 4);
    } else {
      oval(ctx, 0, 0, 11, 8, '#eee1bf'); oval(ctx, -5, 0, 4, 5, '#b79a78');
      line(ctx, [[3, 6], [14, 10], [20, 7]], '#eee1bf', 4);
    }
  },
  tangle: ctx => {
    for (const angle of [-.6, .2, .55]) {
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 13, angle, 0, Math.PI * 2); ctx.strokeStyle = '#efe1c0'; ctx.lineWidth = 3; ctx.stroke();
    }
  },
  'plant-broad': (ctx, cue, time) => plant(ctx, true, cue, time),
  'plant-narrow': (ctx, cue, time) => plant(ctx, false, cue, time),
  spores: (ctx, _cue, time) => {
    for (let i = 0; i < 9; i++) oval(ctx, Math.sin(i * 2 + time) * (i + 4) * 2, -i * 3, 1.8 + i % 3, 2.4, '#daba65a0');
  },
  bush: (ctx, cue, time) => {
    ctx.rotate(Math.sin(time * 2.5) * (.045 + cue * .11));
    oval(ctx, -24, -16, 27, 15, '#496c59'); oval(ctx, 19, -17, 28, 16, '#496c59'); oval(ctx, 0, -26, 28, 25, '#587a61');
    line(ctx, [[-27, -10], [-16, -24], [-8, -17]], '#92ac7d'); line(ctx, [[14, -15], [22, -27], [28, -20]], '#81a678');
  },
  owl,
  altar: (ctx, cue) => {
    shape(ctx, [[-41, -4], [41, -4], [48, 2], [-48, 2]], '#75847f');
    shape(ctx, [[-28, -57], [28, -57], [34, -3], [-34, -3]], '#465c5a', '#7c8d82');
    shape(ctx, [[-43, -58], [-32, -66], [33, -66], [43, -58], [41, -53], [-41, -53]], '#91a09a', '#53665e');
    line(ctx, [[0, -65], [0, -122]], gold, 3);
    shape(ctx, [[0, -126], [18, -108], [0, -90], [-18, -108]], '#77684d', cue > .3 ? pale : gold);
    line(ctx, [[-9, -106], [0, -115], [9, -106], [0, -101], [-9, -106]], '#f1d4a0', 2);
  },
  book,
  pebble: ctx => shape(ctx, [[-8, 0], [-5, -7], [3, -9], [9, -4], [8, 1]], '#86958b', '#c0b69b'),
  sound: (ctx, _cue, time) => {
    for (let i = 1; i <= 3; i++) line(ctx, [[i * 7, -i * 9], [i * 10 + Math.sin(time * 9) * 2, -i * 6], [i * 7, -i * 3]], gold, 2);
  },
  'tracks-boot': (ctx, cue) => {
    for (let i = 0; i < 5; i++) {
      const x = i * 17, y = i % 2 ? 4 - i * 2 : -i * 2;
      oval(ctx, x, y, 5.5, 2.8, cue > .3 ? gold : '#9b9276', -.24);
      oval(ctx, x - 6, y + 1, 2.7, 2, cue > .3 ? gold : '#9b9276');
    }
  },
  'tracks-paw': (ctx, cue) => {
    for (let i = 0; i < 5; i++) {
      const x = i * 18, y = i % 2 ? 3 + i * 2 : i * 2;
      oval(ctx, x, y, 4, 2.8, cue > .3 ? gold : '#7d9b89');
      oval(ctx, x + 4, y - 2, 1.8, 1.5, '#9cb79f'); oval(ctx, x + 4, y + 2, 1.8, 1.5, '#9cb79f');
    }
  },
  sign: (ctx, cue) => {
    line(ctx, [[0, 0], [0, -48]], '#81684d', 5);
    shape(ctx, [[-19, -49], [14, -49], [25, -41], [15, -33], [-19, -33]], cue > .3 ? '#caa66f' : '#957951', '#c3a477');
  },
  horse
};

export function drawProp(ctx: Brush, id: string, cue: number, seconds: number) {
  art[id]?.(ctx, cue, seconds);
}

export function drawFallbackActor(ctx: Brush) {
  oval(ctx, 0, -61, 22, 26, slate);
  shape(ctx, [[-23, -60], [15, -57], [28, -10], [-27, -10]], '#425d5a', moss);
  shape(ctx, [[-21, -64], [-11, -89], [10, -92], [24, -72], [15, -51], [-18, -49]], '#425d5a', moss);
  line(ctx, [[2, -71], [13, -73]], pale, 2); line(ctx, [[-19, -10], [-19, -2]], gold, 5);
  line(ctx, [[12, -10], [17, -2]], gold, 5);
}
