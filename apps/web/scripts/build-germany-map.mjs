/**
 * Generates the homepage coverage map: `public/images/home/germany-map.svg`
 * and `app/components/home/germany-map.ts` (the projection and the city
 * positions the pins are placed at).
 *
 * Both come out of one run so the pins cannot drift from the drawing: the SVG
 * and the pin table are projected with the same constants, computed here.
 *
 * Data — Natural Earth, public domain (https://www.naturalearthdata.com/about/terms-of-use/):
 *   - country shapes: Natural Earth 1:10m Admin 0, as TopoJSON from the
 *     `world-atlas` package (ISC; the data itself is Natural Earth's);
 *   - state borders: Natural Earth 1:10m Admin 1 boundary lines.
 * City coordinates are plain facts (city-centre lat/lon), not copied data.
 *
 * Run with `node apps/web/scripts/build-germany-map.mjs` only when the map
 * or the city table changes; the output is committed. Downloads (~25 MB) are
 * cached in the OS temp directory. No dependencies: the TopoJSON decoding,
 * projection, clipping and simplification are the few lines below.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const SOURCES = {
  countries: "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-10m.json",
  stateLines:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces_lines.geojson",
};

/** The frame's map image, 532x572 inside the 580x620 card's 24px padding. */
const W = 532;
const H = 572;
const MARGIN = 34;
/** Douglas–Peucker tolerance in output pixels. */
const TOLERANCE = 0.6;

/**
 * City centres (lat, lon). Keys are the names the CMS list uses; `aliases`
 * catch other spellings an editor might type; `label` is the shorter name the
 * frame prints on the map.
 */
const CITIES = [
  { name: "Berlin", lat: 52.52, lon: 13.405 },
  { name: "München", lat: 48.1374, lon: 11.5755, aliases: ["Munich", "Muenchen", "Münih"] },
  { name: "Hamburg", lat: 53.5511, lon: 9.9937 },
  { name: "Köln", lat: 50.9375, lon: 6.9603, aliases: ["Cologne", "Koeln", "Kolonya"] },
  { name: "Frankfurt am Main", lat: 50.1109, lon: 8.6821, label: "Frankfurt", aliases: ["Frankfurt"] },
  { name: "Stuttgart", lat: 48.7758, lon: 9.1829 },
  { name: "Düsseldorf", lat: 51.2277, lon: 6.7735, aliases: ["Duesseldorf", "Dusseldorf"] },
  { name: "Dortmund", lat: 51.5136, lon: 7.4653 },
  { name: "Leipzig", lat: 51.3397, lon: 12.3731 },
  { name: "Essen", lat: 51.4556, lon: 7.0116 },
  { name: "Bremen", lat: 53.0793, lon: 8.8017 },
  { name: "Dresden", lat: 51.0504, lon: 13.7373 },
  { name: "Hannover", lat: 52.3759, lon: 9.732, aliases: ["Hanover"] },
  { name: "Nürnberg", lat: 49.4521, lon: 11.0767, aliases: ["Nuremberg", "Nuernberg"] },
  { name: "Duisburg", lat: 51.4344, lon: 6.7623 },
];

async function load(url) {
  const dir = join(tmpdir(), "mon-germany-map");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, url.split("/").pop());
  if (!existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

const topo = await load(SOURCES.countries);
const lines = await load(SOURCES.stateLines);

/* ── TopoJSON → rings of [lon, lat] ── */
const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
const arcs = topo.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]);
});
const arcPoints = (i) => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
const ring = (ids) => ids.flatMap((id, n) => (n ? arcPoints(id).slice(1) : arcPoints(id)));
const polygons = (geom) =>
  geom.type === "Polygon" ? [geom.arcs.map(ring)] : geom.type === "MultiPolygon" ? geom.arcs.map((p) => p.map(ring)) : [];

const countries = topo.objects.countries.geometries.map((g) => ({ id: g.id, polys: polygons(g) }));
const germany = countries.find((c) => c.id === "276");

/* ── Projection: equirectangular, x scaled by cos(φ0) — true shape at Germany's latitude ── */
const outer = germany.polys.flatMap((p) => p[0]);
const lonMin = Math.min(...outer.map((p) => p[0]));
const lonMax = Math.max(...outer.map((p) => p[0]));
const latMin = Math.min(...outer.map((p) => p[1]));
const latMax = Math.max(...outer.map((p) => p[1]));
const lat0 = (latMin + latMax) / 2;
const lon0 = (lonMin + lonMax) / 2;
const cos0 = Math.cos((lat0 * Math.PI) / 180);
const k = Math.min((W - 2 * MARGIN) / ((lonMax - lonMin) * cos0), (H - 2 * MARGIN) / (latMax - latMin));
const project = ([lon, lat]) => [W / 2 + (lon - lon0) * cos0 * k, H / 2 - (lat - lat0) * k];

/* ── Geometry helpers ── */
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  // A closed ring starts and ends on one point, which leaves no chord to
  // measure against; split it at the point farthest from the start.
  const [x0, y0] = pts[0];
  const [xn, yn] = pts[pts.length - 1];
  if (x0 === xn && y0 === yn) {
    let far = 1;
    for (let i = 1; i < pts.length - 1; i++) {
      if (Math.hypot(pts[i][0] - x0, pts[i][1] - y0) > Math.hypot(pts[far][0] - x0, pts[far][1] - y0)) far = i;
    }
    return [...simplify(pts.slice(0, far + 1), tol), ...simplify(pts.slice(far), tol).slice(1)];
  }
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let max = 0;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > max) (max = d), (at = i);
    }
    if (max > tol) (keep[at] = 1), stack.push([a, at], [at, b]);
  }
  return pts.filter((_, i) => keep[i]);
}

/** Sutherland–Hodgman against the (slightly padded) viewBox, for the neighbours. */
function clip(pts, pad = 4) {
  const edges = [
    [(p) => p[0] >= -pad, (a, b) => at(a, b, 0, -pad)],
    [(p) => p[0] <= W + pad, (a, b) => at(a, b, 0, W + pad)],
    [(p) => p[1] >= -pad, (a, b) => at(a, b, 1, -pad)],
    [(p) => p[1] <= H + pad, (a, b) => at(a, b, 1, H + pad)],
  ];
  function at(a, b, axis, v) {
    const t = (v - a[axis]) / (b[axis] - a[axis]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  let out = pts;
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cross(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(cross(prev, cur));
    }
    if (!out.length) break;
  }
  return out;
}

const f = (n) => Math.round(n * 10) / 10;
function pathData(rings, closed) {
  return rings
    .filter((r) => r.length >= (closed ? 3 : 2))
    .map((r) => {
      let d = `M${f(r[0][0])} ${f(r[0][1])}`;
      let [px, py] = [f(r[0][0]), f(r[0][1])];
      for (const p of r.slice(1)) {
        const [x, y] = [f(p[0]), f(p[1])];
        if (x === px && y === py) continue;
        d += `l${f(x - px)} ${f(y - py)}`;
        [px, py] = [x, y];
      }
      return closed ? d + "z" : d;
    })
    .join("")
    .replace(/ -/g, "-")
    .replace(/(^|[^\d])0\./g, "$1.");
}
const area = (r) => Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0) / 2);

/* ── Neighbours: every country touching the view, clipped to it ── */
const neighbourRings = [];
for (const c of countries) {
  if (c.id === "276") continue;
  for (const poly of c.polys) {
    for (const r of poly) {
      const clipped = clip(r.map(project));
      if (clipped.length >= 3 && area(clipped) > 4) neighbourRings.push(simplify(clipped, TOLERANCE * 2));
    }
  }
}

/* ── Germany: drop the specks (tiny islets) that would only add bytes ── */
const germanyRings = germany.polys
  .flatMap((p) => p)
  .map((r) => simplify(r.map(project), TOLERANCE))
  .filter((r) => area(r) > 1.5);

/* ── Bundesländer borders ── */
const stateRings = lines.features
  .filter((ft) => ft.properties.ADM0_A3 === "DEU")
  .flatMap((ft) => (ft.geometry.type === "LineString" ? [ft.geometry.coordinates] : ft.geometry.coordinates))
  .map((l) => simplify(l.map(project), TOLERANCE));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<!-- Germany, Natural Earth 1:10m (public domain), naturalearthdata.com. Generated by apps/web/scripts/build-germany-map.mjs -->
<rect width="${W}" height="${H}" fill="#e8eef1"/>
<path fill="#f1f2ee" stroke="#d9dcd6" stroke-width=".8" stroke-linejoin="round" d="${pathData(neighbourRings, true)}"/>
<path fill="#dcebd3" d="${pathData(germanyRings, true)}"/>
<path fill="none" stroke="#a9c49f" stroke-width=".7" stroke-linejoin="round" stroke-linecap="round" d="${pathData(stateRings, false)}"/>
<path fill="none" stroke="#7fa577" stroke-width="1.2" stroke-linejoin="round" d="${pathData(germanyRings, true)}"/>
</svg>
`;
const svgFile = join(root, "public/images/home/germany-map.svg");
writeFileSync(svgFile, svg);

/* ── Pin table ── */
const pins = CITIES.map((c) => {
  const [x, y] = project([c.lon, c.lat]);
  return {
    name: c.name,
    ...(c.label ? { label: c.label } : {}),
    ...(c.aliases ? { aliases: c.aliases } : {}),
    x: Math.round((x / W) * 1000) / 10,
    y: Math.round((y / H) * 1000) / 10,
  };
});

/** One city per line, as a TS object literal. */
const literal = (p) =>
  `{ ${Object.entries(p)
    .map(([key, v]) => `${key}: ${Array.isArray(v) ? `[${v.map((s) => JSON.stringify(s)).join(", ")}]` : JSON.stringify(v)}`)
    .join(", ")} }`;

const ts = `/**
 * GENERATED by apps/web/scripts/build-germany-map.mjs — edit the script, not
 * this file, and rerun it so the pins stay projected like the drawing.
 *
 * Where each city sits on /images/home/germany-map.svg, as the pin's centre
 * in percent of the map's width and height (equirectangular, x scaled by
 * cos ${lat0.toFixed(2)}°, fitted to ${W}x${H}).
 */
export type MapCity = {
  name: string;
  /** Shorter name printed on the map, where the frame uses one. */
  label?: string;
  aliases?: readonly string[];
  x: number;
  y: number;
};

export const GERMANY_MAP = { src: "/images/home/germany-map.svg", width: ${W}, height: ${H} } as const;

export const MAP_CITIES: readonly MapCity[] = [
${pins.map((p) => `  ${literal(p)},`).join("\n")}
];
`;
writeFileSync(join(root, "app/components/home/germany-map.ts"), ts);

console.log(`germany-map.svg: ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`);
