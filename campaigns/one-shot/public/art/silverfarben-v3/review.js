function H(e, t, s, a) {
  const n = new Uint8Array(t * s), o = new Int32Array(t * s);
  let l = 0, i = 0;
  const d = (r, u) => {
    if (r < 0 || u < 0 || r >= t || u >= s) return;
    const c = u * t + r;
    n[c] || e[c * 4 + 3] < 32 || (n[c] = 1, o[i++] = c);
  };
  for (const [r, u] of a) d(r, u);
  for (; l < i; ) {
    const r = o[l++], u = r % t, c = Math.floor(r / t);
    d(u - 1, c), d(u + 1, c), d(u, c - 1), d(u, c + 1);
  }
  const h = new Uint8ClampedArray(e);
  for (let r = 0; r < n.length; r++) if (!n[r]) {
    const u = r % t, c = Math.floor(r / t);
    u > 0 && n[r - 1] || u + 1 < t && n[r + 1] || c > 0 && n[r - t] || c + 1 < s && n[r + t] || (h[r * 4 + 3] = 0);
  }
  return h;
}
function F(e, t, s) {
  const a = B(e, t, s);
  return { anchorY: a.bottom, heightFraction: a.bottom - a.top };
}
function B(e, t, s) {
  let a = s, n = -1, o = t, l = -1;
  const i = Math.max(2, Math.ceil(t * 2e-3));
  for (let d = 0; d < s; d++) {
    let h = 0, r = t, u = -1;
    for (let c = 0; c < t; c++) (e[(d * t + c) * 4 + 3] ?? 0) >= 32 && (h++, r = Math.min(r, c), u = c);
    h >= i && (a = Math.min(a, d), n = d, o = Math.min(o, r), l = Math.max(l, u));
  }
  return n < a ? { left: 0, top: 0, right: 1, bottom: 1 } : { left: o / t, top: a / s, right: (l + 1) / t, bottom: (n + 1) / s };
}
const G = (e) => e.replace(/-(?:n|ne|e|se|s|sw|w|nw)$/, "");
function L(e, t, s) {
  const a = `${G(e)}-${t}`;
  return s(a) ? a : e;
}
function $(e, t, s, a, n) {
  if (e < 1) return 0;
  const o = Math.floor(n === void 0 ? Math.max(0, s) * t / 1e3 : Math.max(0, Math.min(1, n)) * e);
  return a && n === void 0 ? o % e : Math.min(e - 1, o);
}
const S = Math.PI / 4, v = 8, I = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
function W(e, t) {
  const s = I.indexOf(e) * S, a = Math.sin(s), n = -Math.cos(s), o = -Math.sin(t) * a + Math.cos(t) * n, l = -Math.cos(t) * a - Math.sin(t) * n;
  return I[D(Math.round(Math.atan2(o, l) / S))];
}
function D(e) {
  return (Math.trunc(e) % v + v) % v;
}
const p = (e) => document.getElementById(e), f = p("heading"), k = p("camera"), O = p("seek"), R = p("speed"), P = p("scope"), A = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"], C = ["n", "ne", "e", "se", "s", "sw", "w", "nw"], E = ["Norte", "Noreste", "Este", "Sureste", "Sur", "Suroeste", "Oeste", "Noroeste"];
E.forEach((e, t) => f.add(new Option(e, String(t))));
f.value = "3";
E.forEach((e, t) => k.add(new Option(`${t * 45}°`, String(t))));
const T = await fetch("/art/silverfarben-v3/catalogue.json", { cache: "no-store" });
if (!T.ok) throw new Error("No se ha podido cargar el catálogo de Silverfarben.");
const { states: b, asset: m, phaseLabels: U = {} } = await T.json(), X = [["original", "Original · referencia"], ["idle", "Reposo"], ["moving", "Caminar"], ["running", "Correr"], ["jump", "Saltar"], ["attack", "Daga"], ["attack-arrow", "Arco corto"], ["attack-throw", "Lanzar daga"], ["attack-unarmed", "Golpe sin armas"], ["spell", "Conjurar"], ["use-torch", "Encender antorcha"], ["talk", "Hablar"], ["help", "Ayudar"], ["influence", "Influir"], ["search", "Buscar"], ["study", "Estudiar"], ["interact", "Interactuar"], ["ready", "Preparar"], ["dodge", "Esquivar"], ["hit", "Recibir impacto"], ["climb", "Trepar"], ["swim", "Nadar"], ["crawl", "Arrastrarse"], ["sit", "Sentarse"], ...["envenenada", "asustada", "paralizada", "restringida", "agarrada", "hechizada", "derribada", "inconsciente"].map((e) => [`condition-${e}`, e])], x = /* @__PURE__ */ new Map(), M = /* @__PURE__ */ new Map();
async function Y(e) {
  const t = JSON.stringify(e);
  if (M.has(t)) return M.get(t);
  const s = typeof e == "string" ? e : e.url;
  x.has(s) || x.set(s, new Promise((r, u) => {
    const c = new Image();
    c.onload = () => r(c), c.onerror = () => u(new Error(`No disponible: ${s}`)), c.src = s;
  }));
  const a = await x.get(s), n = document.createElement("canvas"), o = typeof e != "string" ? e : null;
  n.width = o?.width ?? a.naturalWidth, n.height = o?.height ?? a.naturalHeight;
  const l = n.getContext("2d", { willReadFrequently: !0 });
  l.drawImage(a, o?.x ?? 0, o?.y ?? 0, n.width, n.height, 0, 0, n.width, n.height);
  const i = l.getImageData(0, 0, n.width, n.height);
  o?.alphaSeeds && (i.data.set(H(i.data, n.width, n.height, o.alphaSeeds)), l.putImageData(i, 0, 0));
  const d = F(i.data, n.width, n.height), h = { canvas: n, width: o?.logicalWidth ?? m.logicalWidth, height: o?.logicalHeight ?? m.logicalHeight, ax: o?.anchorX ?? m.anchorX, ay: o?.anchorY ?? d.anchorY };
  return M.set(t, h), h;
}
const _ = /* @__PURE__ */ new Set(["original", "idle", "spell", "climb", "swim", "crawl", "condition-paralizada", "condition-restringida", "condition-agarrada", "condition-hechizada", "condition-derribada"]);
let N = [], y = 0, g = !1, w = performance.now();
async function z() {
  const e = ++y;
  N = [], p("gallery").replaceChildren(), p("status").textContent = "Preparando dibujos…";
  const t = C[A.indexOf(W(A[Number(f.value)], -Math.PI / 4 + Number(k.value) * Math.PI / 4))];
  try {
    const s = await Promise.all(X.filter(([a]) => P.value === "all" || _.has(a)).map(async ([a, n]) => {
      let o = L(a, t, (q) => !!b[q]);
      o === a && ["attack-arrow", "attack-throw"].includes(a) && ["sw", "w", "nw"].includes(t) && b[`${a}-mirrored`] && (o = `${a}-mirrored`);
      const l = a === "original" ? { frames: [m.url], fps: 1 } : b[o], i = document.createElement("article"), d = document.createElement("h2"), h = document.createElement("canvas"), r = document.createElement("p");
      i.className = "card", d.textContent = n, h.width = 400, h.height = 400, r.textContent = a === "original" ? "PNG original sin modificar" : `${l.frames.length} poses · ${l.fps} fps · ${o}${o === a && !a.startsWith("condition-") ? " · vista única" : ""}`;
      const u = document.createElement("p");
      u.className = "phase", u.setAttribute("aria-live", "off"), i.append(d, h, r, u), p("gallery").append(i);
      const c = l.loop ?? /^(idle|moving|running|climb|swim|crawl|stealth|condition-)/.test(a);
      return { canvas: h, clip: l, loop: c, phase: u, labels: U[a] ?? [], pictures: await Promise.all(l.frames.map(Y)) };
    }));
    e === y && (N = s, w = performance.now(), p("status").textContent = `Vista de cámara: ${E[C.indexOf(t)]}. La escala cambia con la postura, no con un ajuste automático por imagen.`);
  } catch (s) {
    e === y && (p("status").textContent = String(s));
  }
}
f.onchange = k.onchange = P.onchange = () => void z();
R.onchange = () => {
  w = performance.now();
};
p("pause").onclick = () => {
  g = !g, p("pause").textContent = g ? "Reproducir" : "Pausar", w = performance.now();
};
O.oninput = () => {
  g = !0, p("pause").textContent = "Reproducir";
};
function j(e) {
  for (const t of N) {
    const s = t.pictures.length * 1e3 / t.clip.fps, a = (e - w) * Number(R.value), n = t.loop ? a : a % (s + 650), o = g ? $(t.pictures.length, t.clip.fps, 0, !1, Number(O.value) / 100) : $(t.pictures.length, t.clip.fps, n, t.loop), l = t.pictures[o], i = t.canvas.getContext("2d");
    i.clearRect(0, 0, 400, 400), i.save(), i.translate(200, 355), t.phase.textContent = `${o + 1}/${t.pictures.length}${t.labels[o] ? ` · ${t.labels[o]}` : ""}`, i.strokeStyle = "#75918b", i.beginPath(), i.moveTo(-75, 0), i.lineTo(75, 0), i.stroke(), i.scale(t.clip.flipX ? -1 : 1, 1);
    const d = 250 / m.logicalHeight, h = l.width * d, r = l.height * d;
    i.drawImage(l.canvas, -h * l.ax, -r * l.ay, h, r), i.restore();
  }
  requestAnimationFrame(j);
}
z();
requestAnimationFrame(j);
