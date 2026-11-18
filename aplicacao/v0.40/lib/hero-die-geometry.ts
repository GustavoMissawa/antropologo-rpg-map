/** A centered, unit-radius icosahedron, independent of the rolling dice engine. */
export type Point3 = [number,number,number];
const phi=(1+Math.sqrt(5))/2, radius=Math.hypot(1,phi);
export const HERO_VERTICES:Point3[]=[...[1,-1].flatMap(a=>[1,-1].map(b=>[0,a,b*phi] as Point3)),...[1,-1].flatMap(a=>[1,-1].map(b=>[a,b*phi,0] as Point3)),...[1,-1].flatMap(a=>[1,-1].map(b=>[b*phi,0,a] as Point3))].map(v=>v.map(c=>c/radius) as Point3);
export const HERO_EDGES:[number,number][]=[];
for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)if(Math.abs(Math.hypot(...HERO_VERTICES[i].map((c,k)=>c-HERO_VERTICES[j][k]) as Point3)-2/radius)<1e-6)HERO_EDGES.push([i,j]);
export function rotateHeroPoint([x,y,z]:Point3,[rx,ry,rz]:Point3):Point3{
 const y1=y*Math.cos(rx)-z*Math.sin(rx),z1=y*Math.sin(rx)+z*Math.cos(rx);
 const x2=x*Math.cos(ry)+z1*Math.sin(ry),z2=-x*Math.sin(ry)+z1*Math.cos(ry);
 return [x2*Math.cos(rz)-y1*Math.sin(rz),x2*Math.sin(rz)+y1*Math.cos(rz),z2];
}
export function projectHeroPoint([x, y, z]: Point3) {
  const scale = 77 / (1 - z * .13);
  return { x: 100 + x * scale, y: 100 + y * scale, z };
}

export function heroDieFrame(angles:Point3){
 const vertices=HERO_VERTICES.map(p=>rotateHeroPoint(p,angles));
 const projected=vertices.map(projectHeroPoint);
 const sorted=[...projected].sort((a,b)=>a.x-b.x||a.y-b.y);
 const cross=(a:typeof sorted[number],b:typeof sorted[number],c:typeof sorted[number])=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const half=(ps:typeof sorted)=>{const h:typeof sorted=[];for(const p of ps){while(h.length>1&&cross(h[h.length-2],h[h.length-1],p)<=0)h.pop();h.push(p);}return h.slice(0,-1);};
 return {hull:[...half(sorted),...half([...sorted].reverse())].map(p=>`${p.x},${p.y}`).join(' '),edges:HERO_EDGES.map(([i,j])=>({d:`M${projected[i].x} ${projected[i].y}L${projected[j].x} ${projected[j].y}`,opacity:(projected[i].z+projected[j].z)/2<-.12?.2:.85}))};
}

type Triangle = [number, number, number];

export function faceNormal([a, b, c]: readonly number[], vertices: Point3[]): Point3 {
  const [x, y, z] = vertices[a];
  const [bx, by, bz] = vertices[b];
  const [cx, cy, cz] = vertices[c];
  return [
    (by - y) * (cz - z) - (bz - z) * (cy - y),
    (bz - z) * (cx - x) - (bx - x) * (cz - z),
    (bx - x) * (cy - y) - (by - y) * (cx - x),
  ];
}

function dot([x, y, z]: Point3, [a, b, c]: Point3) {
  return x * a + y * b + z * c;
}

/** Every triple of adjacent vertices forms a face, wound toward the exterior. */
export const HERO_FACES: Triangle[] = [];
const edgeKeys = new Set(HERO_EDGES.map(([a, b]) => a * HERO_VERTICES.length + b));
for (const [a, b] of HERO_EDGES) {
  for (let c = b + 1; c < HERO_VERTICES.length; c++) {
    if (!edgeKeys.has(a * HERO_VERTICES.length + c) || !edgeKeys.has(b * HERO_VERTICES.length + c)) continue;
    const triangle: Triangle = [a, b, c];
    HERO_FACES.push(dot(faceNormal(triangle, HERO_VERTICES), HERO_VERTICES[a]) > 0 ? triangle : [a, c, b]);
  }
}

const orbitalLightDirection: Point3 = [-.48, -.64, .60];
export type OrbitalMesh = {
  vertices: Point3[];
  faces: number[][];
  edges: {start: number; end: number; faces: number[]}[];
};

/** Orient convex faces outward and precompute the neighbors of each edge. */
export function createOrbitalMesh(vertices: Point3[], polygons: number[][]): OrbitalMesh {
  const radius = Math.max(...vertices.map(vertex => Math.hypot(...vertex)));
  const unitVertices = Math.abs(radius - 1) < 1e-12 ? vertices :
    vertices.map(([x, y, z]): Point3 => [x / radius, y / radius, z / radius]);
  const faces = polygons.map(face => dot(faceNormal(face, unitVertices), unitVertices[face[0]]) > 0 ? face : [...face].reverse());
  const edges = new Map<string, OrbitalMesh['edges'][number]>();
  faces.forEach((face, index) => {
    face.forEach((start, i) => {
      const end = face[(i + 1) % face.length];
      const key = start < end ? start + ':' + end : end + ':' + start;
      const edge = edges.get(key);
      if (edge) edge.faces.push(index);
      else edges.set(key, {start, end, faces: [index]});
    });
  });
  return {vertices: unitVertices, faces, edges: [...edges.values()]};
}

export const HERO_MESH = createOrbitalMesh(HERO_VERTICES, HERO_FACES);

export function orbitalDieFrame(angles: Point3) {
  return projectOrbitalDie(point => rotateHeroPoint(point, angles));
}

export function projectOrbitalDie(rotate: (point: Point3) => Point3, mesh = HERO_MESH) {
  const vertices = mesh.vertices.map(rotate);
  const projected = vertices.map(projectHeroPoint);
  const faces = mesh.faces.map(polygon => {
    const points = polygon.map(index => projected[index]);
    // The projected winding includes perspective, including for four- and five-sided faces.
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      area += a.x * b.y - b.x * a.y;
    }
    const visible = area > 1e-6;
    if (!visible) return { visible, points: '', light: '0%' };
    const normal = faceNormal(polygon, vertices);
    const lambert = Math.max(0, dot(normal, orbitalLightDirection) / Math.hypot(...normal));
    return {
      visible,
      points: points.map(({x, y}) => `${x},${y}`).join(' '),
      light: `${Math.round(9 + lambert * 88)}%`,
    };
  });

  // Stroke shared edges once, using the same projected vertices as the opaque fills.
  let edges = '';
  const visibleVertices = new Set<number>();
  for (const edge of mesh.edges) {
    if (!edge.faces.some(face => faces[face].visible)) continue;
    visibleVertices.add(edge.start);
    visibleVertices.add(edge.end);
    const a = projected[edge.start];
    const b = projected[edge.end];
    edges += `M${a.x},${a.y}L${b.x},${b.y}`;
  }
  return {faces, edges, projected, visibleVertices};
}
