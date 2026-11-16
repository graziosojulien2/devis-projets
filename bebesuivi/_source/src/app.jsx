/* ============================================================
   BÉBÉ 3D — rendu par raymarching (WebGL1), style écho 3D « HDlive »
   Proportions calculées depuis BIP, PC, PA, LF (mm)
   ============================================================ */
const BABY_REF = [ // moyennes approximatives par SA : [SA, BIP, PC, PA, LF] en mm
  [14, 27, 98, 80, 14], [16, 34, 124, 103, 20], [18, 41, 150, 126, 26], [20, 47, 174, 148, 32], [22, 54, 197, 171, 38], [24, 60, 220, 194, 43],
  [26, 65, 238, 214, 48], [28, 71, 257, 235, 52], [30, 76, 274, 256, 57], [32, 81, 290, 276, 61], [34, 85, 305, 296, 65], [36, 89, 317, 314, 69], [38, 92, 328, 330, 72], [40, 94, 336, 345, 75],
];
function babyRefAt(sa) {
  sa = sa || 26;
  if (sa < 14) { const r = babyRefAt(14), k = Math.max(0.35, sa / 14), kh = Math.pow(k, 0.85), kb = Math.pow(k, 1.25); return { bip: r.bip * kh, pc: r.pc * kh, pa: r.pa * kb, lf: r.lf * kb }; }
  if (sa > 40) { const r = babyRefAt(40), k = 1 + (Math.min(42, sa) - 40) * 0.012; return { bip: r.bip * k, pc: r.pc * k, pa: r.pa * k * 1.02, lf: r.lf * k }; }
  for (let i = 0; i < BABY_REF.length - 1; i++) {
    const a = BABY_REF[i], b = BABY_REF[i + 1];
    if (sa >= a[0] && sa <= b[0]) { const t = (sa - a[0]) / (b[0] - a[0]); return { bip: a[1] + t * (b[1] - a[1]), pc: a[2] + t * (b[2] - a[2]), pa: a[3] + t * (b[3] - a[3]), lf: a[4] + t * (b[4] - a[4]) }; }
  }
  const l = BABY_REF[BABY_REF.length - 1]; return { bip: l[1], pc: l[2], pa: l[3], lf: l[4] };
}

const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
function rotXY(pitch, yaw, roll) { // retourne R (colonnes) = Ry(yaw)·Rx(pitch)·Rz(roll)
  const cx = Math.cos(pitch), sx = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw), cz = Math.cos(roll), sz = Math.sin(roll);
  const Rx = [[1, 0, 0], [0, cx, sx], [0, -sx, cx]]; // colonnes
  const Ry = [[cy, 0, -sy], [0, 1, 0], [sy, 0, cy]];
  const Rz = [[cz, sz, 0], [-sz, cz, 0], [0, 0, 1]];
  const mulM = (A, B) => B.map(col => [0, 1, 2].map(r => A[0][r] * col[0] + A[1][r] * col[1] + A[2][r] * col[2]));
  return mulM(Ry, mulM(Rx, Rz));
}
const apply = (R, v) => [R[0][0] * v[0] + R[1][0] * v[1] + R[2][0] * v[2], R[0][1] * v[0] + R[1][1] * v[1] + R[2][1] * v[2], R[0][2] * v[0] + R[1][2] * v[1] + R[2][2] * v[2]];

function fetusGeometry(m) {
  const bip = m.bip / 10, pc = m.pc / 10, pa = m.pa / 10, lf = m.lf / 10;
  const saG = m.sa || 26, anim = m.t || 0;
  const plump = Math.max(0, Math.min(1, (saG - 18) / 20)); // le bébé « se remplit » au 3e trimestre
  const lk = 0.82 + 0.32 * plump; // épaisseur des membres
  const wig = (f, ph) => Math.sin(anim * f + ph);
  const dof = Math.max(bip * 1.12, 2 * pc / Math.PI - bip);
  const rx = (bip + 0.4) / 2, rz = (dof + 0.4) / 2, ry = rz * 0.8;
  const ra = pa / Math.PI / 2 + 0.2; // rayon abdominal avec peau
  const T = ra * 3.0;
  const HC = [0, 0, 0];
  const HR = rotXY(0.3, 0.3, -0.1); // tête fléchie, tournée vers la main
  const H = v => V.add(HC, apply(HR, [v[0] * rx, v[1] * ry, v[2] * rz]));
  const N = [0, -ry * 0.92, -rz * 0.42];
  const P0 = N, P1 = V.add(N, [0, -0.34 * T, -0.1 * T]), P2 = V.add(N, [0, -0.68 * T, -0.06 * T]), P3 = V.add(N, [0, -0.93 * T, 0.12 * T]);
  const spineR = [0.66 * ra, 0.92 * ra, 0.98 * ra, 0.78 * ra];
  const belly = [...V.add(P2, [0, 0.02 * T, 0.32 * ra]), (0.78 + 0.12 * plump) * ra];
  const limbs = []; // [a, b, r1, r2]
  limbs.push([H([0, -0.5, -0.3]), V.add(N, [0, -0.05 * T, 0]), 0.55 * ra, 0.62 * ra]); // cou
  const Lu = lf * 0.98, Lf = lf * 0.85, hl = lf * 0.66;
  const Sh = s => V.add(P0, [s * 0.86 * ra, -0.12 * T, 0.08 * ra]);
  // bras droit : main vers la bouche
  const E1 = V.add(Sh(1), V.mul(V.norm([0.35 + 0.05 * wig(0.9, 0), -0.8, 0.55 + 0.05 * wig(0.7, 1)]), Lu));
  const W1 = V.add(E1, V.mul(V.norm(V.sub(H([0.78, -0.72, 0.42]), E1)), Lf));
  // bras gauche : main devant la poitrine
  const E2 = V.add(Sh(-1), V.mul(V.norm([-0.3 + 0.08 * wig(0.8, 2), -0.85, 0.45 + 0.06 * wig(1.1, 0.5)]), Lu));
  const W2 = V.add(E2, V.mul(V.norm([0.45 + 0.1 * wig(1.3, 1.5), 0.35 + 0.08 * wig(0.9, 3), 0.85]), Lf));
  limbs.push([Sh(1), E1, 0.24 * ra * lk, 0.17 * ra * lk], [E1, W1, 0.17 * ra * lk, 0.12 * ra * lk], [Sh(-1), E2, 0.24 * ra * lk, 0.17 * ra * lk], [E2, W2, 0.17 * ra * lk, 0.12 * ra * lk]);
  // jambes repliées, chevilles croisées
  const Hip = s => V.add(P3, [s * 0.56 * ra, 0.12 * T, 0.2 * ra]);
  const Lt = lf * 1.12, Ls = lf * 0.95, fl = lf * 0.78;
  const K = s => V.add(Hip(s), V.mul(V.norm([s * 0.28 + 0.05 * wig(0.6, s), 0.5 + 0.06 * wig(0.5, s * 2), 0.82]), Lt));
  const A = s => V.add(K(s), V.mul(V.norm([-s * 0.3, -0.9, -0.12 + 0.12 * wig(0.75, s + 1)]), Ls));
  const Toe = s => V.add(A(s), V.mul(V.norm([-s * 0.12, 0.3, 0.95]), fl));
  [1, -1].forEach(s => limbs.push([Hip(s), K(s), 0.4 * ra * lk, 0.24 * ra * lk], [K(s), A(s), 0.24 * ra * lk, 0.14 * ra * lk], [V.add(A(s), [0, -0.05 * ra, -0.08 * ra]), Toe(s), 0.17 * ra, 0.21 * ra]));
  // cordon ombilical
  const Cb = V.add(P2, [0.05 * ra, -0.12 * T, 0.95 * ra]);
  let c = Cb; const cordPts = [c];
  [[0.25, -0.55, 0.55], [0.85, -0.35, 0.15], [0.65, 0.05, -0.75], [0.25, 0.35, -1.1]].forEach(dv => { c = V.add(c, V.mul(dv, ra)); cordPts.push(c); });
  for (let i = 0; i < 4; i++) limbs.push([cordPts[i], cordPts[i + 1], 0.17 * ra, 0.16 * ra]);
  // mains : paume (2) + pouce (2) + 4 doigts × 2
  function hand(W, dir, target, curl1, curl2, thumbSide) {
    const d = V.norm(dir);
    let u = V.sub(target, W); u = V.norm(V.sub(u, V.mul(d, V.dot(u, d)))); // vers la paume
    const s = V.norm(V.cross(d, u));
    const caps = [];
    const pw = hl * 0.17, pr = hl * 0.16;
    const pEnd = V.add(W, V.mul(d, hl * 0.48));
    caps.push([V.add(W, V.mul(s, pw * 0.4)), V.add(pEnd, V.mul(s, pw)), pr * 0.95, pr * 0.8]);
    caps.push([V.add(W, V.mul(s, -pw * 0.4)), V.add(pEnd, V.mul(s, -pw)), pr * 0.95, pr * 0.8]);
    const tb = V.add(V.add(W, V.mul(d, hl * 0.14)), V.mul(s, thumbSide * pw * 1.3));
    const td = V.norm(V.add(V.add(V.mul(d, 0.65), V.mul(s, thumbSide * 0.55)), V.mul(u, 0.35)));
    const t1 = V.add(tb, V.mul(td, hl * 0.24));
    const td2 = V.norm(V.add(td, V.mul(u, 0.45)));
    caps.push([tb, t1, hl * 0.1, hl * 0.085], [t1, V.add(t1, V.mul(td2, hl * 0.2)), hl * 0.085, hl * 0.07]);
    for (let k = 0; k < 4; k++) {
      const off = (k - 1.5) * hl * 0.115;
      const b = V.add(pEnd, V.mul(s, off));
      const len = hl * (k === 0 || k === 3 ? 0.21 : 0.25) * (k === 3 ? 0.85 : 1);
      const d1 = V.norm(V.add(V.mul(d, Math.cos(curl1)), V.mul(u, Math.sin(curl1))));
      const m1 = V.add(b, V.mul(d1, len));
      const d2 = V.norm(V.add(V.mul(d, Math.cos(curl1 + curl2)), V.mul(u, Math.sin(curl1 + curl2))));
      const r = hl * (k === 3 ? 0.06 : 0.07);
      caps.push([b, m1, r, r * 0.92], [m1, V.add(m1, V.mul(d2, len * 0.85)), r * 0.92, r * 0.8]);
    }
    const ctr = V.add(W, V.mul(d, hl * 0.6));
    return { caps, bound: [...ctr, hl * 1.15] };
  }
  const h1 = hand(W1, V.add(V.norm(V.sub(H([0.5, -0.15, 0.9]), W1)), V.mul(V.norm(V.sub(W1, E1)), 0.3)), H([0, -0.2, 0.3]), 0.35, 0.5, -1);
  const h2 = hand(W2, V.norm(V.add(V.sub(W2, E2), [0, 0.6, 0.2])), V.add(P1, [0, 0, 0]), 0.75, 0.9, 1);
  // boîte englobante
  const pts = [HC, P0, P1, P2, P3, E1, E2, W1, W2, K(1), K(-1), A(1), A(-1), Toe(1), Toe(-1), ...cordPts.slice(0, 3)];
  const ctr = V.mul(pts.reduce((a, p) => V.add(a, p), [0, 0, 0]), 1 / pts.length);
  const R = Math.max(...pts.map(p => V.len(V.sub(p, ctr)))) + ra * 0.9;
  const frameCtr = V.mul(V.add(V.add(V.mul(HC, 2), P2), K(1)), 1 / 4);
  // utérus : la poche paraît grande au début, le bébé y est à l'étroit à terme
  const uk = 3.1 - 1.75 * Math.max(0, Math.min(1, (saG - 12) / 28));
  const uterus = [...ctr, R * uk];
  const plDir = V.norm([-0.35, 0.55, -0.75]);
  const plP = V.add(ctr, V.mul(plDir, R * uk * 0.97));
  const cordEnd = cordPts[4];
  const cordMid = V.add(V.mul(V.add(cordEnd, plP), 0.5), V.mul(V.norm(V.cross(V.sub(plP, cordEnd), [0, 1, 0.2])), R * 0.35));
  return {
    uterus, plDir, plP, cordEnd, cordMid, cordR: 0.16 * ra, sa: saG,
    ra, hl, HC, HRinv: [[HR[0][0], HR[1][0], HR[2][0]], [HR[0][1], HR[1][1], HR[2][1]], [HR[0][2], HR[1][2], HR[2][2]]], Hr: [rx, ry, rz],
    spine: [P0, P1, P2, P3], spineR, belly, limbs, hands: [...h1.caps, ...h2.caps], handB: [h1.bound, h2.bound],
    bound: [...ctr, R], frameCtr, frameR: R * 0.8,
    faceDir: apply(HR, [0, 0, 1]), faceUp: apply(HR, [0, 1, 0]), faceCtr: H([0.05, -0.3, 0.35]), faceR: rz * 1.35,
  };
}

const BABY_VS = 'attribute vec2 aP; void main(){ gl_Position = vec4(aP,0.0,1.0); }';
const BABY_FS = `
precision highp float;
uniform vec2 uRes; uniform vec3 uCamPos; uniform mat3 uCam; uniform float uFl;
uniform vec3 uHC; uniform mat3 uHR; uniform vec3 uHr;
uniform vec3 uSp[4]; uniform vec4 uSr; uniform vec4 uBelly;
uniform vec3 uLa[15]; uniform vec3 uLb[15]; uniform vec2 uLr[15];
uniform vec3 uFa[24]; uniform vec3 uFb[24]; uniform vec2 uFr[24];
uniform vec4 uHB0; uniform vec4 uHB1; uniform vec4 uBound; uniform float uS; uniform float uHl;
uniform vec3 uL; uniform vec3 uLb2; uniform float uMode; uniform float uTime;
uniform vec4 uUt; uniform vec3 uPlD; uniform vec3 uPlP; uniform vec3 uCe; uniform vec3 uCm; uniform float uCr;
float matId;
float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.0)/k; return min(a,b)-h*h*k*0.25; }
float smax(float a,float b,float k){ return -smin(-a,-b,k); }
float sdEll(vec3 p, vec3 r){ float k0=length(p/r); float k1=length(p/(r*r)); return k0*(k0-1.0)/max(k1,1e-6); }
float sdRC(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba=b-a; float l2=dot(ba,ba); float rr=r1-r2; float a2=l2-rr*rr; float il2=1.0/l2;
  vec3 pa=p-a; float y=dot(pa,ba); float z=y-l2; vec3 xv=pa*l2-ba*y; float x2=dot(xv,xv); float y2=y*y*l2; float z2=z*z*l2;
  float k=sign(rr)*rr*rr*x2;
  if(sign(z)*a2*z2>k) return sqrt(x2+z2)*il2-r2;
  if(sign(y)*a2*y2<k) return sqrt(x2+y2)*il2-r1;
  return (sqrt(x2*a2*il2)+y*rr)*il2-r1;
}
float hash(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*noise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
float E(vec3 q, vec3 c, vec3 s){ return sdEll(q-c*uHr, s*uHr); }
// entaille fine : bornée par une sphère pour éviter les artefacts loin du trait
float Ec(vec3 q, vec3 c, vec3 s){ vec3 r=s*uHr; return max(sdEll(q-c*uHr, r), length(q-c*uHr)-max(r.x,max(r.y,r.z))); }
float headSDF(vec3 q){ float k=uHr.z; vec3 qs=vec3(abs(q.x),q.y,q.z);
  // volumes de base : crâne, front bombé, massif facial, joues pleines, mâchoire
  float d=E(q,vec3(0.0,0.12,-0.08),vec3(1.0,1.0,0.97));
  d=smin(d,E(q,vec3(0.0,0.32,0.38),vec3(0.78,0.6,0.55)),0.35*k);
  d=smin(d,E(q,vec3(0.0,-0.3,0.45),vec3(0.56,0.42,0.48)),0.35*k);
  d=smin(d,E(qs,vec3(0.39,-0.4,0.52),vec3(0.36,0.33,0.38)),0.3*k);
  d=smin(d,E(q,vec3(0.0,-0.62,0.4),vec3(0.36,0.25,0.4)),0.25*k);
  // orbites, racine du nez, arcades
  d=smax(d,-E(qs,vec3(0.3,0.02,1.0),vec3(0.17,0.12,0.085)),0.09*k);
  d=smax(d,-E(q,vec3(0.0,0.02,1.045),vec3(0.1,0.11,0.07)),0.06*k);
  d=smin(d,E(qs,vec3(0.28,0.16,0.91),vec3(0.2,0.07,0.06)),0.09*k);
  // paupières closes, un peu gonflées
  d=smin(d,E(qs,vec3(0.3,0.0,0.87),vec3(0.15,0.1,0.088)),0.05*k);
  d=smax(d,-Ec(qs,vec3(0.3,-0.024,0.948),vec3(0.12,0.009,0.032)),0.009*k);
  d=smin(d,E(qs,vec3(0.3,-0.1,0.89),vec3(0.13,0.05,0.06)),0.06*k);
  // nez : arête basse, pointe ronde, ailes, narines
  d=smin(d,E(q,vec3(0.0,-0.13,1.0),vec3(0.06,0.13,0.05)),0.06*k);
  d=smin(d,E(q,vec3(0.0,-0.27,1.04),vec3(0.1,0.095,0.085)),0.05*k);
  d=smin(d,E(qs,vec3(0.1,-0.31,1.0),vec3(0.075,0.06,0.065)),0.035*k);
  d=smax(d,-Ec(qs,vec3(0.062,-0.355,1.025),vec3(0.02,0.013,0.022)),0.016*k);
  // philtrum, lèvres (arc de Cupidon), bouche, commissures, menton
  d=smax(d,-Ec(q,vec3(0.0,-0.405,0.985),vec3(0.028,0.045,0.025)),0.03*k);
  d=smin(d,E(qs,vec3(0.065,-0.47,0.94),vec3(0.1,0.045,0.05)),0.03*k);
  d=smin(d,E(q,vec3(0.0,-0.482,0.958),vec3(0.045,0.035,0.04)),0.02*k);
  d=smin(d,E(q,vec3(0.0,-0.56,0.925),vec3(0.13,0.05,0.055)),0.035*k);
  d=smax(d,-Ec(q,vec3(0.0,-0.515,0.98),vec3(0.155,0.009,0.07)),0.008*k);
  d=smax(d,-Ec(qs,vec3(0.16,-0.52,0.935),vec3(0.018,0.016,0.022)),0.02*k);
  d=smax(d,-Ec(q,vec3(0.0,-0.65,0.935),vec3(0.12,0.03,0.045)),0.03*k);
  d=smin(d,E(q,vec3(0.0,-0.76,0.8),vec3(0.17,0.12,0.12)),0.08*k);
  // oreilles : pavillon, conque, lobe
  vec3 ea=qs-vec3(0.98,-0.15,-0.12)*uHr;
  d=smin(d,sdEll(ea,vec3(0.12,0.26,0.17)*uHr),0.04*k);
  d=smax(d,-sdEll(ea-vec3(0.08,-0.02,0.02)*uHr,vec3(0.065,0.16,0.1)*uHr),0.02*k);
  d=smin(d,E(qs,vec3(1.0,-0.38,-0.08),vec3(0.07,0.08,0.065)),0.03*k);
  return d; }
float map(vec3 p){
  float bd=length(p-uBound.xyz)-uBound.w; if(bd>0.5*uS){ matId=0.0; return bd; }
  vec3 pq=vec3(p.x*0.86,p.y,p.z);
  float d=sdRC(pq,uSp[0],uSp[1],uSr.x,uSr.y);
  d=smin(d,sdRC(pq,uSp[1],uSp[2],uSr.y,uSr.z),0.35*uS);
  d=smin(d,sdRC(pq,uSp[2],uSp[3],uSr.z,uSr.w),0.35*uS);
  d*=0.86;
  d=smin(d, sdEll(p-uBelly.xyz, vec3(uBelly.w*1.05,uBelly.w,uBelly.w)), 0.4*uS);
  vec3 q=uHR*(p-uHC); float hm=max(uHr.x,max(uHr.y,uHr.z));
  float dh=length(q)-hm*1.25; if(dh<0.36*uS) dh=headSDF(q);
  d=smin(d,dh,0.3*uS);
  for(int i=0;i<11;i++){ d=smin(d, sdRC(p,uLa[i],uLb[i],uLr[i].x,uLr[i].y), (i==0?0.32:(i<5?0.16:0.2))*uS); }
  float hd=1e5;
  if(length(p-uHB0.xyz)<uHB0.w+0.14*uS){ for(int i=0;i<12;i++){ hd=smin(hd, sdRC(p,uFa[i],uFb[i],uFr[i].x,uFr[i].y), (i<2?0.12:0.035)*uHl); } }
  else hd=length(p-uHB0.xyz)-uHB0.w;
  float hd2=1e5;
  if(length(p-uHB1.xyz)<uHB1.w+0.14*uS){ for(int i=0;i<12;i++){ hd2=smin(hd2, sdRC(p,uFa[i+12],uFb[i+12],uFr[i+12].x,uFr[i+12].y), (i<2?0.12:0.035)*uHl); } }
  else hd2=length(p-uHB1.xyz)-uHB1.w;
  d=smin(d,hd,0.12*uS); d=smin(d,hd2,0.12*uS);
  float dc=1e5; for(int i=11;i<15;i++){ dc=smin(dc, sdRC(p,uLa[i],uLb[i],uLr[i].x,uLr[i].y), 0.12*uS); }
  dc+=0.02*uS*sin(atan(p.y-uLa[11].y,p.x-uLa[11].x)*3.0+length(p-uLa[11])*6.0/uS);
  matId = dc<d ? 1.0 : 0.0;
  return smin(d,dc,0.05*uS);
}
float mapD(vec3 p){ float d=map(p); return d + uS*0.0015*noise(p*7.0/uS); }
vec3 calcN(vec3 p){ vec2 e=vec2(1.0,-1.0)*0.0025*uS;
  return normalize(e.xyy*mapD(p+e.xyy)+e.yyx*mapD(p+e.yyx)+e.yxy*mapD(p+e.yxy)+e.xxx*mapD(p+e.xxx)); }
float calcAO(vec3 p, vec3 n){ float o=0.0, s=1.0; for(int i=0;i<6;i++){ float h=0.01*uS+0.2*uS*float(i*i)/25.0; o+=(h-map(p+n*h))*s; s*=0.8; } return clamp(1.0-3.0*o/uS,0.0,1.0); }
float shadow(vec3 ro, vec3 rd){ float o=0.0, w=0.0; for(int i=1;i<=9;i++){ float h=0.03*uS+0.018*uS*float(i*i); float wi=1.0/float(i); o+=wi*(1.0-smoothstep(0.0,1.0,3.0*map(ro+rd*h)/h)); w+=wi; } float r=1.0-clamp(2.6*o/w,0.0,1.0); return r*r*(3.0-2.0*r); }
float thick(vec3 p, vec3 n){ float t=0.0; for(int i=1;i<=4;i++){ float h=0.12*uS*float(i); t+=clamp(-map(p-n*h)/h,0.0,1.0); } return t/4.0; }
void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-uRes)/uRes.y;
  vec3 rd=normalize(uCam*vec3(uv,-uFl)); vec3 ro=uCamPos;
  bool amber = uMode<0.5;
  // fond
  float vig = 1.0-0.35*dot(uv*0.6,uv*0.6);
  // paroi utérine vue de l'intérieur (la paroi côté caméra est « découpée », comme en écho 3D)
  vec3 bg;
  vec3 uo=ro-uUt.xyz; float ub=dot(uo,rd); float uc=dot(uo,uo)-uUt.w*uUt.w; float ud=ub*ub-uc;
  float tw = ud>0.0 ? -ub+sqrt(ud) : 1e4;
  vec3 pw=ro+rd*tw; vec3 nw=normalize(uUt.xyz-pw);
  vec3 wq=pw/uS;
  float pl=smoothstep(0.72,0.86,dot(-nw,uPlD));
  float lob=fbm(wq*0.55); float ves=1.0-smoothstep(0.0,0.06,abs(fbm(wq*0.35+vec3(3.0))-0.5));
  float folds=fbm(wq*1.4+vec3(uTime*0.02));
  float wl=clamp(dot(nw,uL)*0.5+0.5,0.0,1.0);
  float wdist=clamp(tw/(uUt.w*2.6),0.0,1.0);
  if(amber){
    vec3 wc=mix(vec3(0.20,0.075,0.022),vec3(0.36,0.14,0.04),folds);
    wc=mix(wc,vec3(0.11,0.035,0.01),ves*0.55);
    wc=mix(wc,mix(vec3(0.30,0.11,0.035),vec3(0.52,0.22,0.07),lob)*(0.75+0.5*smoothstep(0.35,0.65,lob)),pl);
    bg=wc*(0.18+0.9*wl*wl)*(1.0-0.55*wdist);
  } else {
    vec3 wc=mix(vec3(0.42,0.12,0.12),vec3(0.62,0.26,0.24),folds);
    wc=mix(wc,vec3(0.32,0.06,0.09),ves*0.6);
    wc=mix(wc,mix(vec3(0.45,0.1,0.14),vec3(0.66,0.2,0.22),lob)*(0.8+0.4*smoothstep(0.35,0.65,lob)),pl);
    bg=wc*(0.25+0.85*wl)*(1.0-0.45*wdist);
  }
  // cordon jusqu'au placenta
  float tc=0.0; bool chit=false; float tcm=min(tw,uUt.w*4.0);
  for(int i=0;i<48;i++){ vec3 pc=ro+rd*tc; float dcd=min(sdRC(pc,uCe,uCm,uCr,uCr*1.05),sdRC(pc,uCm,uPlP,uCr*1.05,uCr*1.4)); dcd+=0.02*uS*sin(length(pc-uCe)*7.0/uS); if(dcd<0.002*tc){chit=true;break;} tc+=dcd*0.9; if(tc>tcm) break; }
  if(chit){ vec3 pc=ro+rd*tc; vec2 e2=vec2(0.003*uS,0.0);
    float c0=min(sdRC(pc,uCe,uCm,uCr,uCr*1.05),sdRC(pc,uCm,uPlP,uCr*1.05,uCr*1.4));
    vec3 cn=normalize(vec3(min(sdRC(pc+e2.xyy,uCe,uCm,uCr,uCr*1.05),sdRC(pc+e2.xyy,uCm,uPlP,uCr*1.05,uCr*1.4))-c0,
      min(sdRC(pc+e2.yxy,uCe,uCm,uCr,uCr*1.05),sdRC(pc+e2.yxy,uCm,uPlP,uCr*1.05,uCr*1.4))-c0,
      min(sdRC(pc+e2.yyx,uCe,uCm,uCr,uCr*1.05),sdRC(pc+e2.yyx,uCm,uPlP,uCr*1.05,uCr*1.4))-c0));
    float cl=clamp(dot(cn,uL)*0.6+0.4,0.0,1.0);
    vec3 cc=amber?vec3(1.0,0.6,0.32):vec3(0.9,0.6,0.62);
    float rim=pow(1.0-clamp(dot(cn,-rd),0.0,1.0),2.0);
    bg=mix(bg, cc*(0.32+0.8*cl)*(1.0-0.35*clamp(tc/(uUt.w*2.6),0.0,1.0))+cc*rim*0.25, 0.95); }
  // particules en suspension dans le liquide amniotique
  for(int k=0;k<3;k++){ float fk=float(k);
    vec2 g=uv*(5.0+fk*4.0)+vec2(uTime*(0.02+fk*0.01),uTime*0.013*(fk+1.0)); vec2 id=floor(g); vec2 fg=fract(g)-0.5;
    float rh=hash(vec3(id,fk*7.0)); vec2 off=vec2(hash(vec3(id,fk+3.0)),hash(vec3(id,fk+5.0)))-0.5;
    float dd=length(fg-off*0.7); float sz=0.04+0.05*rh;
    bg+= (amber?vec3(0.9,0.55,0.3):vec3(1.0,0.85,0.85))*step(0.82,rh)*smoothstep(sz,0.0,dd)*(0.10-fk*0.025); }
  bg*=vig;
  vec3 oc=ro-uBound.xyz; float b=dot(oc,rd); float c=dot(oc,oc)-uBound.w*uBound.w; float hdisc=b*b-c;
  vec3 col=bg;
  if(hdisc>0.0){
    float t=max(0.0,-b-sqrt(hdisc)); float tmax=-b+sqrt(hdisc); bool hit=false;
    for(int i=0;i<180;i++){ vec3 p=ro+rd*t; float h=map(p); if(h<0.00035*t){ hit=true; break; } t+=h*0.8; if(t>tmax) break; }
    if(hit){
      vec3 p=ro+rd*t; map(p); float mid=matId; vec3 n=calcN(p);
      float ao=calcAO(p,n); float sh=shadow(p+n*0.035*uS,uL); float th=thick(p,n);
      float ndl=dot(n,uL);
      // diffusion « enveloppante » par canal : le rouge passe plus loin dans l'ombre (peau translucide)
      vec3 w=vec3(0.6,0.38,0.28);
      vec3 dif=clamp((vec3(ndl)+w)/(1.0+w),0.0,1.0); dif=dif*dif;
      vec3 shc=mix(vec3(sh), pow(vec3(sh),vec3(0.45,0.9,1.3)), 0.8);
      dif*=mix(vec3(0.1),vec3(1.0),shc);
      float nv=clamp(dot(n,-rd),0.0,1.0);
      float fre=pow(1.0-nv,4.0);
      vec3 hv=normalize(uL-rd); float nh=clamp(dot(n,hv),0.0,1.0);
      float a2=0.12; float dd=nh*nh*(a2-1.0)+1.0; float ggx=a2/(3.1416*dd*dd);
      float spe=ggx*clamp(ndl,0.0,1.0)*sh*(0.04+0.96*pow(1.0-clamp(dot(hv,-rd),0.0,1.0),5.0));
      float sheen=pow(nh,10.0)*sh;
      float back=clamp(dot(-n,uLb2)*0.5+0.5,0.0,1.0);
      vec3 alb, sss, amb, lc;
      if(amber){ alb=vec3(0.96,0.56,0.29); sss=vec3(1.0,0.28,0.06); amb=vec3(0.16,0.065,0.02); lc=vec3(1.45,1.02,0.68); }
      else { alb=vec3(0.93,0.66,0.56); sss=vec3(0.95,0.25,0.16); amb=vec3(0.36,0.28,0.30); lc=vec3(1.2,1.06,0.96); }
      if(mid>0.5){ alb=amber?vec3(0.95,0.78,0.6):vec3(0.86,0.78,0.8); sss*=0.7; }
      float tr=pow(1.0-th,1.8);
      col = alb*(dif*lc*1.1 + amb*ao*0.45);
      col += sss*alb*(tr*0.9*(0.35+0.65*back))*ao;
      col += sss*0.12*ao*(1.0-dif.g);
      col += lc*(spe*0.35 + sheen*0.06) + (amber?vec3(1.0,0.6,0.35):vec3(1.0,0.85,0.8))*fre*0.22*ao;
      col *= mix(0.45,1.0,ao);
      float fog = smoothstep(uBound.w*0.2, uBound.w*1.6, t - (length(oc) - uBound.w));
      col = mix(col, bg, fog*0.25);
    }
  }
  col = 1.0-exp(-col*(amber?1.05:1.15)); col = col*col*(3.0-2.0*col)*0.35 + col*0.65;
  col = pow(col, vec3(0.92,0.95,1.0));
  col = pow(col, vec3(1.0/2.2));
  gl_FragColor=vec4(col,1.0);
}`;

function createBabyRenderer(canvas, measures, opts) {
  opts = opts || {};
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw new Error('WebGL indisponible');
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, BABY_VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, BABY_FS));
  gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aP'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const st = { yaw: opts.yaw != null ? opts.yaw : 0.55, pitch: opts.pitch != null ? opts.pitch : 0.12, zoom: 1, mode: opts.mode || 0, auto: opts.auto !== false, geo: null, scale: 1, dirty: true, raf: 0, t0: performance.now(), interacting: 0, q: 0.6, focus: opts.focus ? 1 : 0 };
  const flat = arr => new Float32Array(arr.flat());
  function setMeasures(m) {
    const g = fetusGeometry(m); st.geo = g;
    gl.uniform3fv(U('uHC'), g.HC); gl.uniformMatrix3fv(U('uHR'), false, flat(g.HRinv)); gl.uniform3fv(U('uHr'), g.Hr);
    gl.uniform3fv(U('uSp'), flat(g.spine)); gl.uniform4fv(U('uSr'), g.spineR); gl.uniform4fv(U('uBelly'), g.belly);
    gl.uniform3fv(U('uLa'), flat(g.limbs.map(l => l[0]))); gl.uniform3fv(U('uLb'), flat(g.limbs.map(l => l[1]))); gl.uniform2fv(U('uLr'), flat(g.limbs.map(l => [l[2], l[3]])));
    gl.uniform3fv(U('uFa'), flat(g.hands.map(l => l[0]))); gl.uniform3fv(U('uFb'), flat(g.hands.map(l => l[1]))); gl.uniform2fv(U('uFr'), flat(g.hands.map(l => [l[2], l[3]])));
    gl.uniform4fv(U('uHB0'), g.handB[0]); gl.uniform4fv(U('uHB1'), g.handB[1]); gl.uniform4fv(U('uBound'), g.bound);
    gl.uniform1f(U('uS'), g.ra); gl.uniform1f(U('uHl'), g.hl);
    gl.uniform4fv(U('uUt'), g.uterus); gl.uniform3fv(U('uPlD'), g.plDir); gl.uniform3fv(U('uPlP'), g.plP);
    gl.uniform3fv(U('uCe'), g.cordEnd); gl.uniform3fv(U('uCm'), g.cordMid); gl.uniform1f(U('uCr'), g.cordR);
    st.dirty = true;
  }
  let baseM = measures;
  function setMeasuresPublic(m) { baseM = m; setMeasures({ ...m, t: st.anim || 0 }); if (!st.frame) st.frame = { ctr: st.geo.frameCtr, R: st.geo.frameR, face: st.geo.faceCtr, fR: st.geo.faceR, fd: st.geo.faceDir }; else st.frame = { ctr: st.geo.frameCtr, R: st.geo.frameR, face: st.geo.faceCtr, fR: st.geo.faceR, fd: st.geo.faceDir }; }
  function render() {
    const g = st.geo; if (!g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * (st.interacting ? 0.55 : (st.auto ? 0.8 : 1)) * st.q;
    const w = Math.max(64, Math.round(canvas.clientWidth * dpr)), h = Math.max(64, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    const fov = 0.62, fl = 1 / Math.tan(fov / 2);
    const f = st.focus;
    const fr = st.frame || { ctr: g.frameCtr, R: g.frameR, face: g.faceCtr, fR: g.faceR, fd: g.faceDir };
    const fd = fr.fd, baseYaw = f ? Math.atan2(fd[0], fd[2]) : 0, basePitch = f ? Math.asin(Math.max(-0.9, Math.min(0.9, fd[1]))) * 0.7 : 0;
    const yaw = baseYaw + st.yaw, pitch = Math.max(-1.3, Math.min(1.3, basePitch + st.pitch));
    const dist = (f ? fr.fR : fr.R) * fl * 1.05 / st.zoom;
    const cy = Math.cos(pitch);
    const back = [Math.sin(yaw) * cy, Math.sin(pitch), Math.cos(yaw) * cy];
    const pos = V.add(f ? fr.face : fr.ctr, V.mul(back, dist));
    // bascule tête en bas entre 28 et 34 SA (présentation céphalique), en vue corps entier
    const turn = f ? 0 : Math.PI * Math.max(0, Math.min(1, ((g.sa || 26) - 28) / 6));
    const r0 = V.norm(V.cross([0, 1, 0], back)), u0 = V.cross(back, r0);
    const right = V.add(V.mul(r0, Math.cos(turn)), V.mul(u0, Math.sin(turn))), up = V.cross(back, right);
    gl.uniform2f(U('uRes'), w, h); gl.uniform3fv(U('uCamPos'), pos); gl.uniformMatrix3fv(U('uCam'), false, new Float32Array([...right, ...up, ...back])); gl.uniform1f(U('uFl'), fl);
    const L = V.norm(V.add(V.add(V.mul(right, -0.8), V.mul(up, 0.55)), V.mul(back, 0.35)));
    const Lb = V.norm(V.add(V.add(V.mul(right, 0.4), V.mul(up, 0.3)), V.mul(back, -0.85)));
    gl.uniform3fv(U('uL'), L); gl.uniform3fv(U('uLb2'), Lb); gl.uniform1f(U('uMode'), st.mode); gl.uniform1f(U('uTime'), (performance.now() - st.t0) / 1000);
    const t0 = performance.now();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (st.auto || st.interacting) {
      gl.finish(); const dt = performance.now() - t0;
      if (dt > 250) { if (st.q <= 0.35) { st.auto = false; st.slow = true; } st.q = 0.3; }
      else if (dt > 45) st.q = Math.max(0.3, st.q * 0.8); else if (dt < 16) st.q = Math.min(1, st.q * 1.08);
    }
  }
  let last = 0;
  function loop(ts) {
    st.raf = requestAnimationFrame(loop);
    if (document.hidden || st.visible === false) return;
    if (st.auto && !st.interacting) { if (ts - last < 40) return; const k = Math.min(3, (ts - last) / 33); if (st.focus) { st.sway = (st.sway || 0) + 0.018 * k; st.yaw = 0.15 + 0.42 * Math.sin(st.sway); st.pitch = 0.04 + 0.06 * Math.sin(st.sway * 0.7); } else st.yaw += 0.008 * k; st.anim = (st.anim || 0) + 0.035 * k; setMeasures({ ...baseM, t: st.anim }); st.dirty = true; }
    last = ts;
    if (st.dirty) { st.dirty = false; render(); }
  }
  // interactions
  let drag = null, idleT = 0;
  const onDown = e => { drag = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; st.interacting = 1; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); };
  const onMove = e => { if (!drag) return; st.yaw = drag.yaw - (e.clientX - drag.x) * 0.008; st.pitch = Math.max(-1.2, Math.min(1.2, drag.pitch + (e.clientY - drag.y) * 0.006)); st.dirty = true; };
  const onUp = () => { drag = null; clearTimeout(idleT); idleT = setTimeout(() => { st.interacting = 0; st.dirty = true; }, 120); };
  const onWheel = e => { e.preventDefault(); st.zoom = Math.max(0.6, Math.min(2.6, st.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); st.interacting = 1; st.dirty = true; clearTimeout(idleT); idleT = setTimeout(() => { st.interacting = 0; st.dirty = true; }, 200); };
  canvas.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  const ro = new ResizeObserver(() => { st.dirty = true; }); ro.observe(canvas);
  setMeasuresPublic(measures);
  st.raf = requestAnimationFrame(loop);
  return {
    setMeasures: setMeasuresPublic, renderNow: () => { st.interacting = 0; render(); },
    setMode: m => { st.mode = m; st.dirty = true; }, setAuto: a => { st.auto = a; st.dirty = true; },
    setFocus: f => { st.focus = f ? 1 : 0; st.yaw = f ? 0.38 : 0.55; st.pitch = f ? 0.04 : 0.12; st.zoom = 1; st.dirty = true; },
    setView: (yaw, pitch, zoom) => { st.yaw = yaw; st.pitch = pitch; if (zoom) st.zoom = zoom; st.dirty = true; },
    zoomBy: f => { st.zoom = Math.max(0.6, Math.min(2.6, st.zoom * f)); st.dirty = true; },
    snapshot: () => { const a = st.auto, i = st.interacting; st.auto = false; st.interacting = 0; render(); const u = canvas.toDataURL('image/png'); st.auto = a; st.interacting = i; return u; },
    destroy: () => { cancelAnimationFrame(st.raf); ro.disconnect(); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); const ext = gl.getExtension('WEBGL_lose_context'); ext && ext.loseContext(); },
    state: st,
  };
}
const { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } = React;

/* ============================================================
   STOCKAGE — IndexedDB (plus de limite de 5 Mo)
   ============================================================ */
const DB_NAME = 'bebesuivi', DB_VER = 1;
let _dbp = null;
function openDB() {
  if (!_dbp) _dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if (!d.objectStoreNames.contains('files')) d.createObjectStore('files');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return _dbp;
}
async function idbReq(store, mode, fn) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, mode);
    let out;
    const r = fn(tx.objectStore(store));
    if (r) r.onsuccess = () => { out = r.result; };
    tx.oncomplete = () => res(out);
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error || new Error('Transaction annulée'));
  });
}
const idbGet = (s, k) => idbReq(s, 'readonly', st => st.get(k));
const idbPut = (s, k, v) => idbReq(s, 'readwrite', st => st.put(v, k));
const idbDel = (s, k) => idbReq(s, 'readwrite', st => st.delete(k));

const fileCache = new Map();
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

/* ============================================================
   GOOGLE DRIVE — l'appli en ligne range tout dans le dossier « BébéSuivi »
   du Drive de Julien, partagé avec Alexandra. IndexedDB sert de cache local.
   ============================================================ */
const CLOUD = {
  on: typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]local\b/.test(location.search),
  CLIENT_ID: '1069704452468-mh97qnfbt0n6l2jvdgl65g2g218g4uf7.apps.googleusercontent.com',
  OWNER: 'grazioso.julien@gmail.com',
  PARTNER: 'bentoumi.alex0208_27@icloud.com',
  SCOPE: 'https://www.googleapis.com/auth/drive openid email',
  FOLDER: 'BébéSuivi', FILES: 'Fichiers', DATA: 'bebesuivi-donnees.json',
};
CLOUD.ALLOWED = [CLOUD.OWNER];
CLOUD.SCRIPT = (function () { // service « accès Alexandra » (Apps Script), transmis par le lien d'invitation
  try {
    const m = /[#&]acces=([^&]+)/.exec(location.hash);
    if (m) { const u = decodeURIComponent(m[1]); if (/^https:\/\/script\.google(usercontent)?\.com\//.test(u)) localStorage.setItem('bebesuivi.script', u); history.replaceState(null, '', location.pathname + location.search); }
    return localStorage.getItem('bebesuivi.script') || '';
  } catch (e) { return ''; }
})();
CLOUD.ACCES = 'bebesuivi-acces.json';
const VK = 'bebesuivi.vue';
async function viewerCall(params) {
  if (!CLOUD.SCRIPT) throw new Error('Ouvre le lien d\'invitation envoyé par Julien une première fois sur cet appareil.');
  const res = await fetch(CLOUD.SCRIPT, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...params, pw: G.vpw }), redirect: 'follow' });
  if (!res.ok) throw new Error('Service indisponible (' + res.status + ')');
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'Erreur');
  return j;
}
async function viewerLogin(pw, remember) {
  G.vpw = pw; G.viewer = true;
  try { const j = await viewerCall({ a: 'data' }); G.remoteMod = j.mod;
    try { (remember ? localStorage : sessionStorage).setItem(VK, pw); } catch (e) {}
    return j.data;
  } catch (e) { G.viewer = false; G.vpw = ''; try { localStorage.removeItem(VK); sessionStorage.removeItem(VK); } catch (x) {} throw e; }
}
function viewerSaved() { try { return localStorage.getItem(VK) || sessionStorage.getItem(VK) || ''; } catch (e) { return ''; } }
function viewerSignOut() { G.viewer = false; G.vpw = ''; try { localStorage.removeItem(VK); sessionStorage.removeItem(VK); } catch (e) {} }
async function sha256b64(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return btoa(String.fromCharCode(...new Uint8Array(b))); }
async function cloudSetViewerPassword(pw) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(12)), x => x.toString(16).padStart(2, '0')).join('');
  const body = new Blob([JSON.stringify({ salt, hash: await sha256b64(salt + '|' + pw), at: new Date().toISOString() })], { type: 'application/json' });
  const ex = await dList(`name='${qesc(CLOUD.ACCES)}' and '${G.rootId}' in parents and trashed=false`);
  if (ex.length) await dUpdate(ex[0].id, body); else await dCreate(CLOUD.ACCES, G.rootId, body);
}
async function cloudViewerEnabled() { const ex = await dList(`name='${qesc(CLOUD.ACCES)}' and '${G.rootId}' in parents and trashed=false`); return ex.length > 0; }
async function cloudDisableViewer() { const ex = await dList(`name='${qesc(CLOUD.ACCES)}' and '${G.rootId}' in parents and trashed=false`); for (const x of ex) await gfetch(`${DAPI}/${x.id}`, { method: 'DELETE' }); }
const G = { viewer: false, vpw: '', token: null, exp: 0, client: null, pend: null, email: '', rootId: '', filesId: '', dataId: '', remoteMod: '', isOwner: false };
const TOKK = 'bebesuivi.tok', CONSK = 'bebesuivi.consent';
const DAPI = 'https://www.googleapis.com/drive/v3/files', UAPI = 'https://www.googleapis.com/upload/drive/v3/files';
let driveMap = {};                    // fileId interne → id du fichier dans Drive
const uploadQ = []; let uploading = 0; let onUploadsChange = () => {}; let onUploaded = () => {};

function gisReady() { return new Promise((res, rej) => { let n = 0; const t = setInterval(() => { if (window.google && google.accounts && google.accounts.oauth2) { clearInterval(t); res(); } else if (++n > 150) { clearInterval(t); rej(new Error('le service de connexion Google ne répond pas')); } }, 100); }); }
async function initClient() { if (G.client) return; await gisReady(); G.client = google.accounts.oauth2.initTokenClient({ client_id: CLOUD.CLIENT_ID, scope: CLOUD.SCOPE, callback: () => {} }); }
function requestToken(prompt, hint) {
  return new Promise(async (res, rej) => {
    try { await initClient(); } catch (e) { return rej(e); }
    G.client.callback = r => {
      if (!r || r.error) return rej(new Error(r && (r.error_description || r.error) || 'connexion refusée'));
      G.token = r.access_token; G.exp = Date.now() + (Number(r.expires_in || 3600) - 120) * 1000;
      try { sessionStorage.setItem(TOKK, JSON.stringify({ token: G.token, exp: G.exp })); } catch (e) {}
      res(G.token);
    };
    G.client.error_callback = e => rej(new Error(e && e.type === 'popup_closed' ? 'fenêtre de connexion fermée' : e && e.type === 'popup_failed_to_open' ? 'fenêtre de connexion bloquée par le navigateur' : (e && e.type) || 'erreur'));
    const o = { prompt: prompt == null ? '' : prompt }; if (hint) o.login_hint = hint;
    G.client.requestAccessToken(o);
  });
}
async function ensureToken() {
  if (G.token && Date.now() < G.exp) return G.token;
  if (!G.pend) G.pend = requestToken('', G.email).finally(() => { G.pend = null; });
  await G.pend;
  if (G.token && Date.now() < G.exp) return G.token;
  throw new Error('session Google expirée');
}
function keepAlive() { if (CLOUD.on && G.token && !G.pend && G.exp - Date.now() < 10 * 60e3) G.pend = requestToken('', G.email).catch(() => {}).finally(() => { G.pend = null; }); }
async function gfetch(url, opt = {}, retry = true) {
  const tok = await ensureToken();
  const r = await fetch(url, { ...opt, headers: { ...(opt.headers || {}), Authorization: 'Bearer ' + tok } });
  if (r.status === 401 && retry) { G.token = null; G.exp = 0; return gfetch(url, opt, false); }
  if (!r.ok) { let m = 'erreur ' + r.status; try { const j = await r.json(); m = (j.error && j.error.message) || m; } catch (e) {} throw new Error(m); }
  return r;
}
const qesc = v => String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
async function dList(q, fields = 'files(id,name,modifiedTime,owners(emailAddress))') {
  const r = await gfetch(`${DAPI}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime%20desc&pageSize=10&spaces=drive&supportsAllDrives=true&includeItemsFromAllDrives=true`);
  return (await r.json()).files || [];
}
async function dCreateFolder(name, parent) {
  const r = await gfetch(DAPI + '?fields=id', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parent ? { parents: [parent] } : {}) }) });
  return (await r.json()).id;
}
async function dCreate(name, parent, blob) {
  const fd = new FormData();
  fd.append('metadata', new Blob([JSON.stringify({ name, parents: [parent] })], { type: 'application/json' }));
  fd.append('file', blob);
  return (await gfetch(UAPI + '?uploadType=multipart&fields=id,modifiedTime', { method: 'POST', body: fd })).json();
}
async function dUpdate(id, blob) { return (await gfetch(`${UAPI}/${id}?uploadType=media&fields=id,modifiedTime`, { method: 'PATCH', headers: { 'content-type': blob.type || 'application/octet-stream' }, body: blob })).json(); }
async function dMeta(id) { return (await gfetch(`${DAPI}/${id}?fields=id,modifiedTime,trashed`)).json(); }
function dataURLtoBlob(dataURL) {
  const [meta, b64] = dataURL.split(','); const mime = meta.split(':')[1].split(';')[0];
  const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function blobToDataURL(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); }); }

// Connexion : vérifie le compte et retrouve le dossier partagé
async function cloudConnect() {
  const u = await (await gfetch('https://www.googleapis.com/oauth2/v3/userinfo')).json();
  const email = (u.email || '').toLowerCase();
  if (!CLOUD.ALLOWED.includes(email)) { cloudSignOut(); throw new Error(`Le compte ${u.email || 'inconnu'} n'a pas accès à BébéSuivi.`); }
  G.email = email; G.isOwner = email === CLOUD.OWNER;
  const folders = (await dList(`name='${qesc(CLOUD.FOLDER)}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${CLOUD.OWNER}' in owners`));
  if (folders.length) G.rootId = folders[0].id;
  else if (G.isOwner) G.rootId = await dCreateFolder(CLOUD.FOLDER);
  else throw new Error('Le dossier BébéSuivi n\'est pas encore partagé avec ce compte. Julien doit cliquer sur « Partager avec Alexandra » dans les Réglages.');
  const fs = await dList(`name='${qesc(CLOUD.FILES)}' and '${G.rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  G.filesId = fs.length ? fs[0].id : await dCreateFolder(CLOUD.FILES, G.rootId);
  const df = await dList(`name='${qesc(CLOUD.DATA)}' and '${G.rootId}' in parents and trashed=false`);
  if (!df.length) return null;
  G.dataId = df[0].id; G.remoteMod = df[0].modifiedTime;
  return (await gfetch(`${DAPI}/${G.dataId}?alt=media`)).json();
}
async function cloudLogin() {
  let consent = false; try { consent = localStorage.getItem(CONSK) === '1'; } catch (e) {}
  await requestToken(consent ? '' : 'consent');
  try { localStorage.setItem(CONSK, '1'); } catch (e) {}
}
function cloudResume() { try { const t = JSON.parse(sessionStorage.getItem(TOKK) || 'null'); if (t && t.exp > Date.now()) { G.token = t.token; G.exp = t.exp; return true; } } catch (e) {} return false; }
function cloudSignOut() {
  try { sessionStorage.removeItem(TOKK); } catch (e) {}
  if (G.token && window.google && google.accounts && google.accounts.oauth2) google.accounts.oauth2.revoke(G.token, () => {});
  Object.assign(G, { token: null, exp: 0, email: '', rootId: '', filesId: '', dataId: '', remoteMod: '', isOwner: false });
}
async function cloudSave(doc) {
  const blob = new Blob([JSON.stringify({ ...doc, apiKey: '' })], { type: 'application/json' });
  if (!G.dataId) { const r = await dCreate(CLOUD.DATA, G.rootId, blob); G.dataId = r.id; G.remoteMod = r.modifiedTime; return {}; }
  let changed = false, merged = null;
  try { const m = await dMeta(G.dataId); changed = !!(G.remoteMod && m.modifiedTime > G.remoteMod); } catch (e) {}
  if (changed) {
    try {
      const remote = await (await gfetch(`${DAPI}/${G.dataId}?alt=media`)).json();
      const q = { ...(doc.quotidien || {}) }; let n = 0;
      Object.entries(remote.quotidien || {}).forEach(([d, v]) => { const l = q[d] || {}; if (v.humeurAt && (!l.humeurAt || v.humeurAt > l.humeurAt)) { q[d] = { ...l, humeur: v.humeur, humeurAt: v.humeurAt, humeurPar: v.humeurPar }; n++; } });
      if (n) { merged = { ...doc, quotidien: q }; doc = merged; }
      const r = await dUpdate(G.dataId, new Blob([JSON.stringify({ ...doc, apiKey: '' })], { type: 'application/json' })); G.remoteMod = r.modifiedTime;
      return { merged };
    } catch (e) {}
  }
  const r = await dUpdate(G.dataId, blob); G.remoteMod = r.modifiedTime;
  return { changed };
}
async function cloudFetchIfChanged() {
  if (!G.dataId || !(G.token && Date.now() < G.exp)) return null;
  const m = await dMeta(G.dataId);
  if (m.modifiedTime <= G.remoteMod) return null;
  const doc = await (await gfetch(`${DAPI}/${G.dataId}?alt=media`)).json();
  G.remoteMod = m.modifiedTime; return doc;
}
async function cloudShareWithPartner() {
  await gfetch(`${DAPI}/${G.rootId}/permissions?sendNotificationEmail=true&emailMessage=${encodeURIComponent('Julien partage avec toi le suivi de grossesse BébéSuivi.')}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: CLOUD.PARTNER }),
  });
}
const folderURL = () => G.rootId ? `https://drive.google.com/drive/folders/${G.rootId}` : 'https://drive.google.com/';

// File d'envoi des fichiers (PDF, images) vers Drive, avec reprise
function queueUpload(id) { if (!CLOUD.on || driveMap[id] || uploadQ.includes(id)) return; uploadQ.push(id); onUploadsChange(uploadQ.length + uploading); pumpUploads(); }
async function pumpUploads() {
  while (uploading < 3 && uploadQ.length && G.filesId) {
    const id = uploadQ.shift(); uploading++;
    (async () => {
      try {
        const url = fileCache.get(id) || await idbGet('files', id);
        if (url) { const r = await dCreate(id, G.filesId, dataURLtoBlob(url)); driveMap[id] = r.id; onUploaded(id, r.id); }
      } catch (e) { setTimeout(() => { uploadQ.push(id); pumpUploads(); }, 15000); }
      finally { uploading--; onUploadsChange(uploadQ.length + uploading); pumpUploads(); }
    })();
  }
  onUploadsChange(uploadQ.length + uploading);
}

async function putFile(dataURL, id) {
  id = id || ('f_' + newId());
  await idbPut('files', id, dataURL);
  fileCache.set(id, dataURL);
  queueUpload(id);
  return id;
}
async function getFile(id) {
  if (!id) return null;
  if (fileCache.has(id)) return fileCache.get(id);
  let v = await idbGet('files', id);
  if (!v && G.viewer) { try { v = (await viewerCall({ a: 'file', id })).url; await idbPut('files', id, v); } catch (e) { v = null; } }
  if (!v && CLOUD.on && !G.viewer && driveMap[id]) {
    try { v = await blobToDataURL(await (await gfetch(`${DAPI}/${driveMap[id]}?alt=media`)).blob()); await idbPut('files', id, v); } catch (e) { v = null; }
  }
  if (v) fileCache.set(id, v);
  return v || null;
}
async function delFile(id) {
  if (!id) return; fileCache.delete(id); try { await idbDel('files', id); } catch (e) {}
  const did = driveMap[id];
  if (CLOUD.on && did) { delete driveMap[id]; gfetch(`${DAPI}/${did}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ trashed: true }) }).catch(() => {}); }
}
function useFile(id) {
  const [u, setU] = useState(() => fileCache.get(id) || null);
  useEffect(() => {
    let on = true;
    if (id && !fileCache.has(id)) getFile(id).then(v => on && setU(v));
    else setU(fileCache.get(id) || null);
    return () => { on = false; };
  }, [id]);
  return u;
}
function dataURLtoBlobURL(dataURL) {
  const [meta, b64] = dataURL.split(',');
  const mime = meta.split(':')[1].split(';')[0];
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: mime }));
}
function readAsDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file); });
}
async function compressImage(file, maxDim = 2200, quality = 0.86) {
  const url = await readAsDataURL(file);
  if (file.size < 1.5 * 1024 * 1024) return url;
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => res(url);
    img.src = url;
  });
}

/* ============================================================
   MODÈLE DE DONNÉES
   ============================================================ */
const INITIAL_DATA = {
  version: 3,
  profil: { nom: '', prenom: '', ddr: '', dg: '', parite: '0', enfantsCharge: '', groupage: '', facteurs: '', maternite: '', sageFemme: '', gyneco: '' },
  documents: [], echographies: [], seances: {}, evenements: [], mesures: [], rdv: [], ordonnances: [],
  bilan: null, coverId: null, faits: {}, valise: null, contractions: [], mouvements: [], demarches: {},
  apiKey: '', modelDoc: 'claude-sonnet-4-6', modelFast: 'claude-haiku-4-5-20251001',
};

function legacyDocStatus(doc) {
  if (doc.status) return doc.status;
  if (doc.synthese && !/^Erreur/.test(String(doc.synthese))) return 'ok';
  return 'none';
}
async function migrateData(d) {
  const files = d.__files || {};
  for (const [id, url] of Object.entries(files)) await putFile(url, id);
  const out = { ...INITIAL_DATA, ...d };
  delete out.__files;
  out.profil = { ...INITIAL_DATA.profil, ...(d.profil || {}) };
  out.seances = d.seances || {};
  const echos = [];
  for (const e of (d.echographies || [])) {
    const { image, ...rest } = e;
    let fileId = e.fileId;
    if (image && !fileId) fileId = await putFile(image);
    echos.push({ ...rest, fileId, seance: e.seance || e.date || 'sans-date' });
  }
  out.echographies = echos;
  const ordos = [];
  for (const o of (d.ordonnances || [])) {
    const { fichier, ...rest } = o;
    let fileId = o.fileId;
    if (fichier && !fileId) fileId = await putFile(fichier);
    ordos.push({ ...rest, fileId, status: o.status || 'none' });
  }
  out.ordonnances = ordos;
  out.documents = (d.documents || []).map(doc => ({ ...doc, status: legacyDocStatus(doc), legacy: doc.legacy || (!doc.fileId) }));
  out.version = 3;
  return out;
}

/* ============================================================
   CALCULS GROSSESSE (pratique française)
   ============================================================ */
const DAY = 86400000;
function parseD(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
function toISO(d) { if (!d) return ''; const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function todayISO() { return toISO(new Date()); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function daysBetween(a, b) { return Math.round((b - a) / DAY); }
function fmtDate(s, opts) { const d = typeof s === 'string' ? parseD(s) : s; return d ? d.toLocaleDateString('fr-FR', opts || { day: 'numeric', month: 'long', year: 'numeric' }) : ''; }
function fmtShort(s) { return fmtDate(s, { day: '2-digit', month: '2-digit', year: '2-digit' }); }
/** DDR effective : si la date de début de grossesse (écho de datation) est connue, DDR = DG − 14 j */
function ddrEff(profil) {
  if (profil.dg) { const d = parseD(profil.dg); if (d) return addDays(d, -14); }
  return parseD(profil.ddr);
}
function saAt(profil, dateStr) {
  const ddr = ddrEff(profil); if (!ddr) return null;
  const d = dateStr ? parseD(dateStr) : (() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); })();
  if (!d) return null;
  const days = daysBetween(ddr, d);
  if (days < 0) return null;
  return { sa: Math.floor(days / 7), j: days % 7, days, dec: days / 7 };
}
function fmtSA(o) { if (!o) return '—'; return o.j ? `${o.sa} SA + ${o.j} j` : `${o.sa} SA`; }
function termeDate(profil) { const ddr = ddrEff(profil); return ddr ? addDays(ddr, 287) : null; } // 41 SA
function dateForSA(profil, sa) { const ddr = ddrEff(profil); return ddr ? addDays(ddr, Math.round(sa * 7)) : null; }
function trimestreOf(sa) { if (sa == null) return null; return sa < 15 ? 1 : sa < 29 ? 2 : 3; }
function itemSA(profil, item) { const o = item && item.date ? saAt(profil, item.date) : null; if (o) return o; if (item && item.sa && !isNaN(Number(item.sa))) return { sa: Number(item.sa), j: 0, dec: Number(item.sa) }; return null; }

/* ============================================================
   RÉFÉRENTIELS
   ============================================================ */
const EXAMENS = [
  { id: 'bio1', sa: 10, de: 6, a: 15, label: 'Bilan sanguin du 1er trimestre', obligatoire: true, desc: 'Groupe, rhésus, RAI, sérologies (toxo, rubéole, syphilis, VIH proposé, hépatite B)', match: ['bilan'] },
  { id: 'echo1', sa: 12, de: 11, a: 14, label: 'Échographie T1 (datation)', obligatoire: true, desc: 'Datation, clarté nucale, dépistage combiné T21', match: ['echo'] },
  { id: 'epp', sa: 16, de: 8, a: 24, label: 'Entretien prénatal précoce', obligatoire: true, desc: 'Avec la sage-femme ou le médecin, à partir du 4e mois', match: [] },
  { id: 'echo2', sa: 22, de: 20, a: 25, label: 'Échographie morphologique T2', obligatoire: true, desc: 'Morphologie fœtale complète, placenta, croissance', match: ['echo'] },
  { id: 'coq', sa: 24, de: 20, a: 36, label: 'Vaccin coqueluche', obligatoire: false, desc: 'Recommandé à chaque grossesse, à partir de 20 SA', match: [] },
  { id: 'hgpo', sa: 26, de: 24, a: 28, label: 'Dépistage diabète gestationnel (HGPO)', obligatoire: false, desc: 'Si facteurs de risque — à confirmer avec la sage-femme', match: ['bilan'] },
  { id: 'rai6', sa: 28, de: 26, a: 30, label: 'RAI 6e mois (+ anti-D si rhésus négatif)', obligatoire: false, desc: 'Selon groupe sanguin — à vérifier avec la sage-femme', match: ['bilan'] },
  { id: 'echo3', sa: 32, de: 30, a: 35, label: 'Échographie T3', obligatoire: true, desc: 'Croissance, position du bébé, placenta', match: ['echo'] },
  { id: 'vrs', sa: 34, de: 32, a: 36, label: 'Protection VRS (bronchiolite)', obligatoire: false, desc: 'Vaccin maternel 32–36 SA en saison, ou anticorps pour bébé — à discuter', match: [] },
  { id: 'anesth', sa: 34, de: 32, a: 37, label: 'Consultation pré-anesthésique', obligatoire: true, desc: 'Au 8e mois, à la maternité', match: [] },
  { id: 'strepb', sa: 36, de: 34, a: 38, label: 'Prélèvement streptocoque B', obligatoire: true, desc: 'Écouvillon vaginal', match: ['bilan'] },
  { id: 'terme', sa: 41, de: 41, a: 42, label: 'Surveillance du terme', obligatoire: false, desc: 'Monitoring rapproché à partir de 41 SA', match: [] },
];

const TAILLE_REF = [
  [4, 'graine de pavot', 0.2], [5, 'graine de sésame', 0.4], [6, 'lentille', 0.6], [7, 'myrtille', 1], [8, 'framboise', 1.6], [9, 'cerise', 2.3], [10, 'fraise', 3.1], [11, 'figue', 4],
  [12, 'citron vert', 5.4], [13, 'gousse de petits pois', 7], [14, 'citron', 8.7], [15, 'orange', 10.1], [16, 'avocat', 11.6], [17, 'poire', 13], [18, 'poivron', 14.2], [19, 'mangue', 15.3],
  [20, 'banane', 25], [22, 'papaye', 27.8], [24, 'épi de maïs', 30], [26, 'laitue', 35.6], [28, 'aubergine', 37.6], [30, 'concombre', 39.9], [32, 'noix de coco', 42.4],
  [34, 'melon', 45], [36, 'laitue romaine', 47.4], [38, 'poireau', 49.8], [40, 'pastèque', 51.2], [42, 'citrouille', 52],
];
function getTaille(sa) { if (!sa) return null; let best = TAILLE_REF[0]; for (const t of TAILLE_REF) { if (t[0] <= sa) best = t; else break; } return best; }
const FAITS_SA = {
  4: 'Le cœur commence à battre.', 6: 'Le cerveau se développe rapidement.', 8: 'Tous les organes principaux sont en place.', 10: 'Il bouge déjà, même si on ne le sent pas encore.',
  12: 'Il mesure environ 5 cm et ses empreintes digitales se dessinent.', 14: 'Il fait ses premières grimaces.', 16: 'Il peut sucer son pouce.', 18: 'Les premiers mouvements peuvent se faire sentir.',
  20: 'Mi-parcours ! Il entend les bruits du corps de sa maman.', 22: 'Il reconnaît déjà les voix familières.', 24: 'Ses paupières vont bientôt s\'ouvrir.', 26: 'Il a des cycles de sommeil, et rêve peut-être.',
  28: 'Son cerveau se plisse et grandit vite.', 30: 'Il commence souvent à se placer tête en bas.', 32: 'Ses poumons se préparent à respirer.', 34: 'Il prend environ 200 g par semaine.',
  36: 'Il fait des réserves pour la naissance.', 38: 'Il est prêt à naître à tout moment.', 40: 'Le grand jour approche.', 41: 'Terme : surveillance rapprochée.',
};

const VALISE_DEFAUT = [
  ['Maman', 'Dossier médical, carte Vitale, mutuelle, pièce d\'identité'], ['Maman', 'Livret de famille'], ['Maman', '2-3 chemises de nuit ou grands t-shirts (ouverture si allaitement)'],
  ['Maman', 'Robe de chambre, chaussons, chaussettes'], ['Maman', 'Culottes jetables ou filet + serviettes maternité'], ['Maman', 'Soutiens-gorge d\'allaitement + coussinets'],
  ['Maman', 'Trousse de toilette, serviettes, élastiques à cheveux'], ['Maman', 'Brumisateur, baume à lèvres, encas, bouteille d\'eau'], ['Maman', 'Chargeur de téléphone (câble long)'],
  ['Maman', 'Tenue confortable pour la sortie'], ['Bébé', '6 bodies (taille naissance et 1 mois)'], ['Bébé', '6 pyjamas'], ['Bébé', '2 bonnets, chaussettes, brassières / gilets'],
  ['Bébé', 'Gigoteuse ou turbulette'], ['Bébé', 'Langes en coton (3-4)'], ['Bébé', 'Tenue de sortie + couverture'], ['Bébé', 'Siège auto installé dans la voiture (cosy)'],
  ['Papa', 'Change, trousse de toilette, encas, monnaie pour parking/distributeurs'], ['Papa', 'Liste des personnes à prévenir'], ['Maison', 'Organisation pour Noah, Nina et Quentin pendant le séjour'],
];
function defaultValise() { return VALISE_DEFAUT.map(([cat, label], i) => ({ id: 'v' + i, cat, label, done: false })); }

/** Démarches et congés — dates calculées à partir du terme */
function buildDemarches(profil) {
  const T = termeDate(profil); if (!T) return [];
  const sa = n => dateForSA(profil, n);
  const nbCharge = profil.enfantsCharge !== '' && profil.enfantsCharge != null ? Number(profil.enfantsCharge) : Number(profil.parite || 0);
  const troisieme = nbCharge >= 2;
  const preW = troisieme ? 8 : 6, postW = troisieme ? 18 : 10;
  return [
    { id: 'decl', label: 'Déclarer la grossesse (CPAM + CAF)', due: sa(14), desc: 'Avant la fin du 3e mois, via le médecin ou la sage-femme.' },
    { id: 'mater', label: 'Inscription à la maternité', due: sa(16), desc: 'Le plus tôt possible, certaines maternités sont vite complètes.' },
    { id: 'prime', label: 'Demander la prime à la naissance (CAF)', due: sa(26), desc: 'Demande en ligne une fois la grossesse déclarée ; versée après le 6e mois de grossesse.' },
    { id: 'prep', label: 'Préparation à la naissance (8 séances remboursées)', due: sa(28), desc: 'À organiser avec la sage-femme.' },
    { id: 'reco', label: 'Reconnaissance anticipée en mairie (si non mariés)', due: sa(30), desc: 'Inutile si vous êtes mariés : la filiation paternelle est alors automatique. Sinon, à faire dans n\'importe quelle mairie avant la naissance, avec pièces d\'identité et justificatif de domicile.' },
    { id: 'garde', label: 'Mode de garde (crèche, assistante maternelle)', due: sa(28), desc: 'Les places en crèche se demandent souvent pendant la grossesse.' },
    { id: 'matemp', label: `Congé maternité d'Alexandra : prévenir l'employeur`, due: addDays(T, -preW * 7 - 14), desc: `Prénatal à partir du ${fmtDate(addDays(T, -preW * 7))} (${preW} sem.), postnatal jusqu'au ${fmtDate(addDays(T, postW * 7))} (${postW} sem.). Dates indicatives, recalculées selon le terme.` },
    { id: 'pat', label: 'Congé paternité de Julien : prévenir l\'employeur', due: addDays(T, -30), desc: '25 jours (dont 4 obligatoires juste après les 3 jours du congé de naissance). Prévenir au moins 1 mois avant la date prévue d\'accouchement.' },
    { id: 'csn', label: 'Congé supplémentaire de naissance (nouveau 2026)', due: addDays(T, 0), desc: '1 ou 2 mois par parent, à prendre après le congé maternité/paternité, dans les 9 mois après la naissance. Prévenir 1 mois avant (15 jours s\'il suit directement le congé paternité).' },
    { id: 'pedia', label: 'Choisir un pédiatre ou médecin traitant pour bébé', due: sa(36), desc: '' },
    { id: 'mutuelle', label: 'Ajouter bébé à la mutuelle', due: addDays(T, 14), desc: 'Dès la naissance, avec l\'acte de naissance.' },
    { id: 'naiss', label: 'Déclaration de naissance en mairie', due: addDays(T, 5), desc: 'Dans les 5 jours suivant la naissance (souvent faite depuis la maternité).' },
  ].map(x => ({ ...x, dueISO: toISO(x.due) }));
}

/* ============================================================
   CLAUDE API
   ============================================================ */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function claude({ apiKey, model, system, content, max_tokens = 2000 }) {
  if (!apiKey) throw new Error('Clé API manquante');
  for (let attempt = 0; attempt < 4; attempt++) {
    let res;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model, max_tokens, system, messages: [{ role: 'user', content }] }),
      });
    } catch (e) { if (attempt < 3) { await sleep(3000 * (attempt + 1)); continue; } throw new Error('Réseau indisponible'); }
    if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < 3) { await sleep(6000 * (attempt + 1)); continue; }
    if (!res.ok) {
      let msg = 'HTTP ' + res.status;
      try { const j = await res.json(); msg += ' — ' + (j.error && j.error.message || ''); } catch (e) {}
      throw new Error(msg);
    }
    const j = await res.json();
    return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  }
}
function parseJSON(raw) {
  const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('Réponse IA illisible');
  return JSON.parse(raw.slice(s, e + 1));
}
function validISO(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && parseD(s) ? s : ''; }
function num(v) { if (v == null || v === '') return null; const n = Number(String(v).replace(',', '.').replace(/[^\d.\-]/g, '')); return isNaN(n) ? null : n; }

function contextProfil(data) {
  const p = data.profil;
  const ddr = ddrEff(p);
  return `Contexte : DDR ${ddr ? toISO(ddr) : 'inconnue'}${p.dg ? ` (déduite de la date de début de grossesse ${p.dg})` : ''}, parité ${p.parite || 0}, groupe ${p.groupage || 'inconnu'}${p.facteurs ? `, antécédents : ${p.facteurs}` : ''}.`;
}
const SYS_DOC = `Tu es une sage-femme expérimentée qui aide un couple à tenir le dossier de suivi de grossesse d'Alexandra. Tu lis intégralement les documents médicaux (comptes rendus, bilans de laboratoire, échographies, ordonnances, courriers), tu extrais toutes les données utiles avec exactitude et tu les expliques simplement. Tu n'inventes jamais une valeur absente du document. Tu réponds uniquement en JSON valide, sans markdown.`;
function docPrompt(data) {
  return `${contextProfil(data)}

Analyse ce document en entier (toutes les pages). Réponds UNIQUEMENT par un objet JSON de cette forme :
{
  "type": "Échographie | Bilan sanguin | Analyse d'urine | Consultation | Compte rendu | Ordonnance | Courrier | Autre",
  "titre": "titre court et explicite, ex. « Bilan sanguin T1 — Cerballiance »",
  "date_examen": "AAAA-MM-JJ : date de l'examen, du prélèvement ou de la consultation (pas la date d'édition)",
  "praticien": "nom du praticien si présent",
  "etablissement": "laboratoire, cabinet ou maternité",
  "synthese": "4 à 6 phrases claires et bienveillantes : ce qui a été fait, ce qui est normal, ce qui mérite attention",
  "resultats": [ { "nom": "nom standard de l'analyse (ex. Hémoglobine, Toxoplasmose IgG, Glycémie à jeun, TSH, Ferritine)", "valeur": "valeur telle qu'écrite", "unite": "", "reference": "intervalle de référence du labo", "statut": "normal | bas | haut | anormal | positif | negatif | immunise | non_immunise | info", "categorie": "Hématologie | Immuno-hématologie | Sérologie | Biochimie | Hormonologie | Urines | Dépistage | Autre", "commentaire": "" } ],
  "biometrie": { "bip": null, "pc": null, "pa": null, "lf": null, "pfe": null, "percentile": "", "presentation": "", "placenta": "", "liquide_amniotique": "", "activite_cardiaque": "", "longueur_col": "", "lcc": null, "clarte_nucale": null },
  "maternel": { "poids": null, "tension": "", "hauteur_uterine": null, "col": "", "bandelette_urinaire": "" },
  "medicaments": [ { "nom": "", "posologie": "", "duree": "" } ],
  "alertes": [ "points de vigilance réels uniquement (valeur hors norme, non-immunité, recommandation du médecin…)" ],
  "rdv_detectes": [ { "date": "AAAA-MM-JJ ou vide", "objet": "examen ou rendez-vous prévu" } ],
  "questions": [ "2 à 4 questions utiles à poser au prochain rendez-vous" ]
}
Règles : liste TOUS les résultats de laboratoire présents, un objet par analyse. Biométrie en millimètres (bip, pc, pa, lf, lcc, clarte_nucale) et pfe en grammes, en nombres. Mets null ou "" quand l'information n'existe pas. Ne mentionne pas le sexe du bébé.`;
}
async function analyseDocument(item, data) {
  const content = [];
  if (item.fileId) {
    const url = await getFile(item.fileId);
    if (!url) throw new Error('Fichier introuvable — réimportez-le');
    const [meta, b64] = url.split(',');
    const mt = meta.split(':')[1].split(';')[0];
    if (mt === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } });
    else if (/^image\/(jpeg|png|webp|gif)$/.test(mt)) content.push({ type: 'image', source: { type: 'base64', media_type: mt, data: b64 } });
    else throw new Error('Format non pris en charge');
  } else if (item.texte && item.texte.length > 30) {
    content.push({ type: 'text', text: 'Texte extrait du document (partiel) :\n' + item.texte });
  } else throw new Error('PDF non conservé — réimportez le fichier pour l\'analyser');
  content.push({ type: 'text', text: docPrompt(data) });
  const raw = await claude({ apiKey: data.apiKey, model: data.modelDoc || INITIAL_DATA.modelDoc, system: SYS_DOC, content, max_tokens: 8000 });
  const p = parseJSON(raw);
  const bio = p.biometrie || {};
  ['bip', 'pc', 'pa', 'lf', 'pfe', 'lcc', 'clarte_nucale'].forEach(k => { bio[k] = num(bio[k]); });
  const mat = p.maternel || {};
  mat.poids = num(mat.poids); mat.hauteur_uterine = num(mat.hauteur_uterine);
  return {
    type: p.type || 'Autre', titre: p.titre || item.nom, date: validISO(p.date_examen) || item.date,
    praticien: p.praticien || '', etablissement: p.etablissement || '', synthese: p.synthese || '',
    resultats: Array.isArray(p.resultats) ? p.resultats.filter(r => r && r.nom) : [],
    biometrie: bio, maternel: mat,
    medicaments: Array.isArray(p.medicaments) ? p.medicaments.filter(m => m && m.nom) : [],
    alertes: Array.isArray(p.alertes) ? p.alertes.filter(Boolean) : [],
    rdv_detectes: Array.isArray(p.rdv_detectes) ? p.rdv_detectes.map(r => typeof r === 'string' ? { date: '', objet: r } : r).filter(r => r && r.objet) : [],
    questions: Array.isArray(p.questions) ? p.questions : (p.questions ? [p.questions] : []),
    status: 'ok', erreur: '', analyzedAt: new Date().toISOString(), legacy: item.fileId ? false : item.legacy,
  };
}

function sampleEvenly(arr, n) { if (arr.length <= n) return arr; const out = []; for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * arr.length / n)]); return out; }
async function analyseSeance(key, data) {
  const imgs = (data.echographies || []).filter(e => e.seance === key && e.fileId);
  if (!imgs.length) throw new Error('Aucune image dans cette séance');
  const chosen = sampleEvenly(imgs, 16);
  const content = [];
  for (const e of chosen) {
    const url = await getFile(e.fileId); if (!url) continue;
    const [meta, b64] = url.split(','); const mt = meta.split(':')[1].split(';')[0];
    if (!/^image\/(jpeg|png|webp|gif)$/.test(mt)) continue;
    content.push({ type: 'image', source: { type: 'base64', media_type: mt, data: b64 } });
  }
  const o = saAt(data.profil, key);
  content.push({ type: 'text', text: `${contextProfil(data)}
Voici ${content.length} images d'une même séance d'échographie du ${fmtDate(key)}${o ? ` (${fmtSA(o)})` : ''}. Lis attentivement les textes et mesures incrustés à l'écran (BIP, PC, PA, LF, EFW/PFE, LCC, CN, FCF, percentiles…). Réponds UNIQUEMENT en JSON :
{
  "synthese": "3 à 5 phrases bienveillantes décrivant la séance pour les futurs parents",
  "biometrie": { "bip": null, "pc": null, "pa": null, "lf": null, "pfe": null, "lcc": null, "clarte_nucale": null, "fcf": null, "percentile": "" },
  "position": "présentation du bébé si identifiable, sinon chaîne vide",
  "observations": ["2 à 5 observations factuelles visibles"],
  "lisibilite": "bonne | partielle | faible"
}
Mesures en millimètres (pfe en grammes, fcf en bpm). Ne recopie une mesure que si elle est lisible à l'écran. Ne mentionne pas le sexe du bébé.` });
  const raw = await claude({ apiKey: data.apiKey, model: data.modelDoc || INITIAL_DATA.modelDoc, system: 'Tu es une sage-femme échographiste. Tu lis les mesures incrustées sur les images avec exactitude et n\'inventes rien. JSON valide uniquement.', content, max_tokens: 3000 });
  const p = parseJSON(raw);
  const bio = p.biometrie || {};
  ['bip', 'pc', 'pa', 'lf', 'pfe', 'lcc', 'clarte_nucale', 'fcf'].forEach(k => { bio[k] = num(bio[k]); });
  return { status: 'ok', erreur: '', synthese: p.synthese || '', biometrie: bio, position: p.position || '', observations: p.observations || [], lisibilite: p.lisibilite || '', nbImages: content.length - 1, analyzedAt: new Date().toISOString() };
}

function anomalies(doc) { return (doc.resultats || []).filter(r => ['bas', 'haut', 'anormal', 'positif', 'non_immunise'].includes(r.statut)); }
async function analyseBilan(data) {
  const p = data.profil;
  const docs = [...data.documents, ...data.ordonnances].filter(d => d.status === 'ok').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const lines = docs.map(d => {
    const o = itemSA(p, d);
    const an = anomalies(d).map(r => `${r.nom} ${r.valeur}${r.unite ? ' ' + r.unite : ''} (${r.statut}${r.reference ? ', réf ' + r.reference : ''})`).join('; ');
    const meds = (d.medicaments || []).map(m => m.nom + (m.posologie ? ' ' + m.posologie : '')).join(', ');
    return `- ${d.date || '?'} (${fmtSA(o)}) [${d.type}] ${d.titre || d.nom} : ${d.synthese || ''}${an ? ' | Hors norme : ' + an : ''}${(d.alertes || []).length ? ' | Vigilance : ' + d.alertes.join('; ') : ''}${meds ? ' | Traitements : ' + meds : ''}`;
  }).join('\n');
  const sea = Object.entries(data.seances || {}).filter(([, s]) => s.status === 'ok').map(([k, s]) => `- Écho ${k} (${fmtSA(saAt(p, k))}) : ${s.synthese} ${JSON.stringify(s.biometrie || {})}`).join('\n');
  const rdv = (data.rdv || []).filter(r => r.statut === 'À venir').map(r => `- ${r.date} ${r.titre}`).join('\n');
  const prompt = `${contextProfil(data)} Aujourd'hui : ${todayISO()}, ${fmtSA(saAt(p))}. Terme prévu (41 SA) : ${toISO(termeDate(p))}.

Documents analysés :
${lines || '(aucun)'}

Séances d'échographie :
${sea || '(aucune)'}

Rendez-vous prévus :
${rdv || '(aucun)'}

Fais le bilan complet du suivi. Réponds UNIQUEMENT en JSON :
{
  "resume": "5 à 7 phrases : où en est la grossesse, comment évoluent les examens et la croissance",
  "points_positifs": ["..."],
  "vigilance": ["points à surveiller, avec la donnée qui le justifie"],
  "a_venir": ["examens ou démarches attendus dans les prochaines semaines selon le calendrier français de suivi"],
  "questions": ["questions à poser à la sage-femme ou au gynécologue"]
}`;
  const raw = await claude({ apiKey: data.apiKey, model: data.modelDoc || INITIAL_DATA.modelDoc, system: SYS_DOC, content: [{ type: 'text', text: prompt }], max_tokens: 3000 });
  return { ...parseJSON(raw), date: new Date().toISOString(), nbDocs: docs.length };
}

/* ============================================================
   AGRÉGATIONS
   ============================================================ */
const BIO_KEYS = [['bip', 'BIP', '#4E6349'], ['pc', 'PC', '#4F6575'], ['pa', 'PA', '#9A5A40'], ['lf', 'LF', '#B08D57']];
function collectBiometrie(data) {
  const p = data.profil; const pts = []; // {key, x, date, y, src, prio}
  const push = (date, saFallback, bio, src, prio) => {
    if (!bio) return;
    const o = date ? saAt(p, date) : null; const x = o ? o.dec : (saFallback ? Number(saFallback) : null);
    if (x == null || isNaN(x)) return;
    Object.entries(bio).forEach(([k, v]) => { const n = num(v); if (n != null && n > 0) pts.push({ key: k, x, date, y: n, src, prio }); });
  };
  data.documents.forEach(d => {
    if (d.status === 'ok' && d.biometrie) push(d.date, d.sa, d.biometrie, '📄 ' + (d.titre || d.nom), 3);
    else if (d.mesures) { const m = d.mesures; push(d.date, d.sa, { bip: m.bip, pc: m.pc, pa: m.pa, lf: m.lf, pfe: m.poids_foetal }, '📄 ' + d.nom, 1); }
  });
  Object.entries(data.seances || {}).forEach(([k, s]) => { if (s.status === 'ok') push(k, null, s.biometrie, '🔬 Écho du ' + fmtShort(k), 2); });
  data.mesures.forEach(m => push(m.date, m.sa, { bip: m.bip, pc: m.pc, pa: m.pa, lf: m.lf, pfe: m.poids_foetal }, '✏ Saisie', 4));
  // dédoublonnage : même mesure, même semaine (±3 j) → source la plus fiable
  const best = {};
  pts.forEach(pt => { const k = pt.key + '_' + Math.round(pt.x * 7 / 3); if (!best[k] || best[k].prio < pt.prio) best[k] = pt; });
  return Object.values(best).sort((a, b) => a.x - b.x);
}
function collectPoidsMaternel(data) {
  const pts = [];
  data.mesures.forEach(m => { const n = num(m.poids_maternel); if (n) { const o = m.date ? saAt(data.profil, m.date) : null; pts.push({ x: o ? o.dec : Number(m.sa), y: n }); } });
  data.documents.forEach(d => { const n = d.maternel && num(d.maternel.poids); if (n) { const o = itemSA(data.profil, d); if (o) pts.push({ x: o.dec, y: n }); } });
  return pts.filter(p => !isNaN(p.x)).sort((a, b) => a.x - b.x);
}
function normName(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function collectResultats(data) {
  const groups = {};
  [...data.documents, ...data.ordonnances].filter(d => d.status === 'ok').forEach(d => {
    (d.resultats || []).forEach(r => {
      const k = normName(r.nom); if (!k) return;
      if (!groups[k]) groups[k] = { key: k, nom: r.nom, categorie: r.categorie || 'Autre', items: [] };
      groups[k].items.push({ ...r, date: d.date, docId: d.id, docTitre: d.titre || d.nom });
    });
  });
  Object.values(groups).forEach(g => g.items.sort((a, b) => (a.date || '').localeCompare(b.date || '')));
  return Object.values(groups).sort((a, b) => a.categorie.localeCompare(b.categorie) || a.nom.localeCompare(b.nom));
}
function examStatus(data, ex) {
  const p = data.profil; const cur = saAt(p);
  const inWin = (date, sa0) => { const o = date ? saAt(p, date) : (sa0 ? { dec: Number(sa0) } : null); return o && o.dec >= ex.de - 0.5 && o.dec <= ex.a + 1; };
  let found = null;
  if (ex.match.includes('echo')) {
    const s = Object.keys(data.seances || {}).concat([...new Set((data.echographies || []).map(e => e.seance))]).find(k => inWin(k));
    if (s) found = 'Écho du ' + fmtShort(s);
    if (!found) { const d = data.documents.find(d => /cho/i.test(d.type || '') && inWin(d.date, d.sa)); if (d) found = d.titre || d.nom; }
  }
  if (!found && ex.match.includes('bilan')) { const d = data.documents.find(d => /(bilan|analyse|sanguin|urine)/i.test(d.type || '') && inWin(d.date, d.sa)); if (d) found = d.titre || d.nom; }
  if (!found) { const r = (data.rdv || []).find(r => r.statut === 'Fait' && r.date && inWin(r.date)); if (r && normName(r.titre).split(' ').some(w => w.length > 4 && normName(ex.label).includes(w))) found = r.titre; }
  const manual = (data.demarches || {})['ex_' + ex.id];
  const due = dateForSA(p, ex.sa);
  let state = 'avenir';
  if (found || manual) state = 'fait';
  else if (cur && cur.dec > ex.a + 1) state = 'manquant';
  else if (cur && cur.dec >= ex.de) state = 'maintenant';
  return { state, found, due, manual };
}

/* ============================================================
   UI COMMUNE
   ============================================================ */
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

function Modal({ onClose, children, width }) {
  useEffect(() => { const h = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={width ? { width: `min(${width}px, 95vw)` } : null}>{children}</div>
    </div>
  );
}
function StatusBadge({ status, erreur }) {
  if (status === 'ok') return <span className="st st-ok">✓ Analysé</span>;
  if (status === 'pending') return <span className="st st-pending">⏳ Analyse…</span>;
  if (status === 'error') return <span className="st st-error" title={erreur}>⚠ Erreur</span>;
  return <span className="st st-none">Non analysé</span>;
}
function ChartXY({ series, yLabel, height = 260 }) {
  const ref = useRef(null), chart = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (chart.current) chart.current.destroy();
    chart.current = new Chart(ref.current, {
      type: 'line',
      data: { datasets: series.map(s => ({ label: s.label, data: s.points, borderColor: s.color, backgroundColor: s.color + '22', borderWidth: s.ref ? 1.5 : 2.2, borderDash: s.ref ? [5, 5] : [], pointRadius: s.ref ? 0 : 4, pointBackgroundColor: s.color, tension: 0.3, spanGaps: true })) },
      options: {
        responsive: true, maintainAspectRatio: false, parsing: false,
        plugins: {
          legend: { labels: { font: { family: 'Jost', size: 12 }, color: '#6E6257', boxWidth: 12 } },
          tooltip: { callbacks: { title: it => { const x = it[0].parsed.x; const sa = Math.floor(x), j = Math.round((x - sa) * 7); return `${sa} SA${j ? ' + ' + j + ' j' : ''}`; } }, backgroundColor: '#FFFDF9', titleColor: '#3A3029', bodyColor: '#5C5148', borderColor: '#E2CFB4', borderWidth: 1 },
        },
        scales: {
          x: { type: 'linear', title: { display: true, text: 'SA', color: '#6E6257' }, ticks: { color: '#6E6257', stepSize: 2 }, grid: { color: '#F0E8DB' } },
          y: { title: { display: !!yLabel, text: yLabel, color: '#6E6257' }, ticks: { color: '#6E6257' }, grid: { color: '#F0E8DB' } },
        },
      },
    });
    return () => chart.current && chart.current.destroy();
  }, [JSON.stringify(series)]);
  return <div style={{ height }}><canvas ref={ref} /></div>;
}

function genFetusSVG(sa) {
  if (!sa || sa < 4) return '';
  const scale = Math.min(1, 0.15 + sa / 42), headR = 28 * scale, bodyH = 50 * scale, bodyW = 22 * scale, cx = 80, cy = 100;
  const op = Math.min(1, sa / 10), limb = 30 * scale, c1 = '#9FE1CB', c2 = '#85B7EB', yH = cy - bodyH / 2 - headR;
  return `<svg width="160" height="200" viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg"><defs>
  <radialGradient id="hg" cx="40%" cy="35%"><stop offset="0%" stop-color="${c1}" stop-opacity="0.9"/><stop offset="100%" stop-color="${c2}" stop-opacity="0.7"/></radialGradient>
  <radialGradient id="bg" cx="50%" cy="30%"><stop offset="0%" stop-color="${c1}" stop-opacity="0.7"/><stop offset="100%" stop-color="${c2}" stop-opacity="0.5"/></radialGradient></defs>
  <ellipse cx="${cx}" cy="${yH}" rx="${headR}" ry="${headR * 1.1}" fill="url(#hg)" stroke="#1D9E75" stroke-width="1.2" opacity="${op}"/>
  ${sa >= 10 ? `<ellipse cx="${cx - headR * .3}" cy="${yH - 2}" rx="${headR * .1}" ry="${headR * .06}" fill="#0F6E56" opacity=".6"/><ellipse cx="${cx + headR * .3}" cy="${yH - 2}" rx="${headR * .1}" ry="${headR * .06}" fill="#0F6E56" opacity=".6"/><path d="M ${cx - headR * .18} ${yH + headR * .3} Q ${cx} ${yH + headR * .45} ${cx + headR * .18} ${yH + headR * .3}" stroke="#0F6E56" stroke-width="1" fill="none" opacity=".5"/>` : ''}
  <ellipse cx="${cx}" cy="${cy + bodyH * .1}" rx="${bodyW}" ry="${bodyH / 2}" fill="url(#bg)" stroke="#1D9E75" stroke-width="1" opacity="${op * .85}"/>
  ${sa >= 8 && scale > .4 ? [[-1, c2, 'arm'], [1, c2, 'arm'], [-1, c1, 'leg'], [1, c1, 'leg']].map(([s, c, t]) => t === 'arm'
    ? `<path d="M ${cx + s * bodyW} ${cy - bodyH * .1} Q ${cx + s * (bodyW + limb * .7)} ${cy + 5} ${cx + s * (bodyW + limb * .6)} ${cy + limb * .5}" stroke="${c}" stroke-width="${3 * scale}" fill="none" stroke-linecap="round" opacity="${op * .9}"/>`
    : `<path d="M ${cx + s * bodyW * .5} ${cy + bodyH * .45} Q ${cx + s * bodyW * .3} ${cy + bodyH * .55 + limb * .6} ${cx + s * bodyW * .2} ${cy + bodyH * .5 + limb * .8}" stroke="${c}" stroke-width="${3 * scale}" fill="none" stroke-linecap="round" opacity="${op * .9}"/>`).join('') : ''}
  </svg>`;
}

/* ============================================================
   RÉGLAGES / PROFIL
   ============================================================ */
function ProfilModal({ onClose }) {
  const { data, save } = useApp();
  const [f, setF] = useState({ ...INITIAL_DATA.profil, ...data.profil });
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const T = termeDate(f);
  return (
    <Modal onClose={onClose}>
      <h2 className="h3" style={{ fontSize: '1.5rem' }}>Profil grossesse</h2>
      <div className="grid-2 mb-2">
        <div><label>Prénom de la maman</label><input type="text" value={f.prenom} onChange={e => set('prenom', e.target.value)} /></div>
        <div><label>Nom</label><input type="text" value={f.nom} onChange={e => set('nom', e.target.value)} /></div>
      </div>
      <div className="mb-2"><label>Prénom de bébé (facultatif)</label><input type="text" value={f.prenomBebe || ''} onChange={e => set('prenomBebe', e.target.value)} /></div>
      <div className="grid-2 mb-1">
        <div><label>Date des dernières règles (DDR)</label><input type="date" value={f.ddr} onChange={e => set('ddr', e.target.value)} /></div>
        <div><label>Début de grossesse (écho de datation)</label><input type="date" value={f.dg} onChange={e => set('dg', e.target.value)} /></div>
      </div>
      <p className="small muted mb-2">Si l'écho du 1er trimestre a recalé la date, renseignez le « début de grossesse » : il prime sur la DDR. {T && <>Terme calculé (41 SA) : <b>{fmtDate(T)}</b>.</>}</p>
      <div className="grid-2 mb-2">
        <div><label>Parité (accouchements précédents)</label><input type="number" min="0" value={f.parite} onChange={e => set('parite', e.target.value)} /></div>
        <div><label>Enfants déjà à charge au foyer</label><input type="number" min="0" value={f.enfantsCharge} onChange={e => set('enfantsCharge', e.target.value)} placeholder="sert au calcul du congé maternité" /></div>
      </div>
      <div className="grid-2 mb-2">
        <div><label>Groupe sanguin</label><select value={f.groupage} onChange={e => set('groupage', e.target.value)}><option value="">—</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g}>{g}</option>)}</select></div>
        <div><label>Maternité</label><input type="text" value={f.maternite} onChange={e => set('maternite', e.target.value)} /></div>
      </div>
      <div className="grid-2 mb-2">
        <div><label>Sage-femme</label><input type="text" value={f.sageFemme} onChange={e => set('sageFemme', e.target.value)} /></div>
        <div><label>Gynécologue / obstétricien</label><input type="text" value={f.gyneco} onChange={e => set('gyneco', e.target.value)} /></div>
      </div>
      <div className="mb-3"><label>Antécédents / facteurs de risque</label><textarea rows="3" value={f.facteurs} onChange={e => set('facteurs', e.target.value)} style={{ resize: 'vertical' }} /></div>
      <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-outline btn-sm" onClick={onClose}>Annuler</button>
        <button className="btn btn-sm" onClick={() => { save(d => ({ ...d, profil: f })); onClose(); }}>Enregistrer</button>
      </div>
    </Modal>
  );
}

/* ============================================================
   ACCUEIL
   ============================================================ */
/* ============================================================
   DOCUMENTS & ORDONNANCES
   ============================================================ */
function folderDate(path) {
  const segs = String(path || '').split(/[\\/]/);
  for (const s of segs.reverse()) {
    let m = s.match(/^(\d{2})(\d{2})(\d{4})$/); if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    m = s.match(/(20\d{2})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return '';
}
const isPDF = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
const isImg = f => /^image\/(jpeg|png|webp|gif)$/.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name);

const TYPE_COLORS = { 'Échographie': 'badge-blue', 'Bilan sanguin': 'badge-teal', "Analyse d'urine": 'badge-teal', 'Consultation': 'badge-green', 'Compte rendu': 'badge-green', 'Ordonnance': 'badge-amber', 'Courrier': 'badge-gray' };

function DropZone({ onFiles, accept, icon, title, sub, folder }) {
  const [over, setOver] = useState(false);
  const fRef = useRef(), dRef = useRef();
  useEffect(() => { if (dRef.current) { dRef.current.setAttribute('webkitdirectory', ''); dRef.current.setAttribute('directory', ''); } }, []);
  return (
    <div className={`drop-zone mb-3${over ? ' drag-over' : ''}`} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}>
      <input type="file" multiple accept={accept} ref={fRef} style={{ display: 'none' }} onChange={e => { onFiles([...e.target.files]); e.target.value = ''; }} />
      <input type="file" multiple ref={dRef} style={{ display: 'none' }} onChange={e => { onFiles([...e.target.files]); e.target.value = ''; }} />
      <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>{icon}</div>
      <p style={{ color: 'var(--accent-dark)', fontWeight: 500 }}>{title}</p>
      <p className="small muted" style={{ marginTop: 4 }}>{sub}</p>
      <div className="drop-actions">
        <button className="btn btn-sm" onClick={() => fRef.current.click()}>Choisir des fichiers</button>
        {folder && <button className="btn btn-outline btn-sm" onClick={() => dRef.current.click()}>Importer un dossier entier</button>}
      </div>
    </div>
  );
}

function DocModal({ listKey, id, onClose }) {
  const { data, save, enqueue } = useApp();
  const doc = data[listKey].find(d => d.id === id);
  const file = useFile(doc && doc.fileId);
  const [blobURL, setBlobURL] = useState(null);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(null);
  useEffect(() => { if (file && file.startsWith('data:application/pdf')) { const u = dataURLtoBlobURL(file); setBlobURL(u); return () => URL.revokeObjectURL(u); } }, [file]);
  if (!doc) return null;
  const o = itemSA(data.profil, doc);
  const upd = patch => save(d => ({ ...d, [listKey]: d[listKey].map(x => x.id === id ? { ...x, ...patch } : x) }));
  const bio = doc.biometrie || {};
  const bioEntries = [['BIP', bio.bip, 'mm'], ['PC', bio.pc, 'mm'], ['PA', bio.pa, 'mm'], ['LF', bio.lf, 'mm'], ['PFE', bio.pfe, 'g'], ['LCC', bio.lcc, 'mm'], ['Clarté nucale', bio.clarte_nucale, 'mm']].filter(x => x[1]);
  const bioTxt = [['Percentile', bio.percentile], ['Présentation', bio.presentation], ['Placenta', bio.placenta], ['Liquide amniotique', bio.liquide_amniotique], ['Activité cardiaque', bio.activite_cardiaque], ['Col', bio.longueur_col]].filter(x => x[1]);
  const mat = doc.maternel || {};
  const matTxt = [['Poids', mat.poids && mat.poids + ' kg'], ['Tension', mat.tension], ['Hauteur utérine', mat.hauteur_uterine && mat.hauteur_uterine + ' cm'], ['Col', mat.col], ['Bandelette urinaire', mat.bandelette_urinaire]].filter(x => x[1]);
  const existingRdv = r => data.rdv.some(x => x.date === r.date && normName(x.titre) === normName(r.objet));
  return (
    <Modal onClose={onClose} width={760}>
      <div className="row-between mb-2" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {!edit ? <>
            <h2 className="h3" style={{ fontSize: '1.4rem', marginBottom: 6 }}>{doc.titre || doc.nom}</h2>
            <div className="flex gap-1" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`badge ${TYPE_COLORS[doc.type] || 'badge-gray'}`}>{doc.type || 'Inconnu'}</span>
              {o && <span className="badge badge-gray">{fmtSA(o)}</span>}
              <span className="small muted">{fmtDate(doc.date)}</span>
              <StatusBadge status={doc.status} erreur={doc.erreur} />
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>{[doc.praticien, doc.etablissement].filter(Boolean).join(' · ')} {doc.nom && doc.titre !== doc.nom ? `— ${doc.nom}` : ''}</div>
          </> : <div className="grid-2">
            <div><label>Titre</label><input type="text" value={f.titre} onChange={e => setF({ ...f, titre: e.target.value })} /></div>
            <div><label>Date de l'examen</label><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></div>
            <div><label>Type</label><select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{['Échographie', 'Bilan sanguin', "Analyse d'urine", 'Consultation', 'Compte rendu', 'Ordonnance', 'Courrier', 'Autre', 'Inconnu'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label>Notes</label><input type="text" value={f.notes || ''} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
          </div>}
        </div>
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          {!edit && <button className="btn btn-outline btn-sm" onClick={() => { setF({ titre: doc.titre || doc.nom, date: doc.date || '', type: doc.type || 'Inconnu', notes: doc.notes || '' }); setEdit(true); }}>✎</button>}
          {edit && <button className="btn btn-sm" onClick={() => { upd(f); setEdit(false); }}>OK</button>}
          {data.apiKey && doc.status !== 'pending' && <button className="btn btn-outline btn-sm" onClick={() => enqueue([{ kind: listKey, id }])}>↻ Analyser</button>}
          {file && <a className="btn btn-outline btn-sm ro-ok" href={blobURL || file} download={doc.nom}>⬇</a>}
          <button className="btn btn-sm btn-danger" onClick={() => { if (confirm('Supprimer ce document ?')) { delFile(doc.fileId); save(d => ({ ...d, [listKey]: d[listKey].filter(x => x.id !== id) })); onClose(); } }}>Supprimer</button>
          <button className="btn btn-outline btn-sm ro-ok" onClick={onClose}>✕</button>
        </div>
      </div>
      {doc.status === 'error' && <div className="alert-bar alert-warn">⚠ {doc.erreur}</div>}
      {!doc.fileId && <div className="alert-bar alert-info">Ce document date de l'ancienne version : seul un extrait du texte a été gardé. Réimportez le PDF (même nom) pour l'ajouter et l'analyser en entier.</div>}
      {doc.notes && <p className="small mb-2">📝 {doc.notes}</p>}
      {doc.synthese && <div className="ai-bubble mb-2"><div className="ai-tag">Synthèse</div><p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>{doc.synthese}</p></div>}
      {(doc.alertes || []).length > 0 && <div className="mb-2">{doc.alertes.map((a, i) => <div key={i} className="alert-bar alert-warn">⚠ {a}</div>)}</div>}
      {(doc.resultats || []).length > 0 && (
        <div className="mb-2"><div className="h3" style={{ fontSize: '1rem' }}>Résultats ({doc.resultats.length})</div>
          <div style={{ overflowX: 'auto' }}><table className="res-table"><thead><tr><th>Analyse</th><th>Valeur</th><th>Référence</th><th>Statut</th></tr></thead><tbody>
            {doc.resultats.map((r, i) => <tr key={i}><td className="name">{r.nom}{r.commentaire ? <div className="small muted" style={{ fontWeight: 400 }}>{r.commentaire}</div> : null}</td><td>{r.valeur} {r.unite}</td><td className="muted">{r.reference}</td><td><span className={`rv rv-${r.statut}`}>{(r.statut || '').replace('_', ' ')}</span></td></tr>)}
          </tbody></table></div></div>
      )}
      {(bioEntries.length > 0 || bioTxt.length > 0) && (
        <div className="mb-2"><div className="h3" style={{ fontSize: '1rem' }}>Biométrie</div>
          <div className="grid-4 mb-1">{bioEntries.map(([k, v, u]) => <div key={k} className="stat-card card-sm"><div className="stat-label">{k}</div><div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-dark)' }}>{v} {u}</div></div>)}</div>
          {bioTxt.map(([k, v]) => <div key={k} className="kv"><span>{k}</span><span>{v}</span></div>)}
        </div>
      )}
      {matTxt.length > 0 && <div className="mb-2"><div className="h3" style={{ fontSize: '1rem' }}>Suivi maternel</div>{matTxt.map(([k, v]) => <div key={k} className="kv"><span>{k}</span><span>{v}</span></div>)}</div>}
      {(doc.medicaments || []).length > 0 && <div className="mb-2"><div className="h3" style={{ fontSize: '1rem' }}>Traitements</div>{doc.medicaments.map((m, i) => <div key={i} className="kv"><span>💊 {m.nom}</span><span>{[m.posologie, m.duree].filter(Boolean).join(' · ')}</span></div>)}</div>}
      {(doc.rdv_detectes || []).length > 0 && (
        <div className="mb-2"><div className="h3" style={{ fontSize: '1rem' }}>Rendez-vous / examens mentionnés</div>
          {doc.rdv_detectes.map((r, i) => (
            <div key={i} className="alert-bar alert-info row-between"><span>📅 {r.date ? fmtDate(r.date) + ' — ' : ''}{r.objet}</span>
              {existingRdv(r) ? <span className="small">✓ dans l'agenda</span> : <button className="btn btn-outline btn-sm" onClick={() => save(d => ({ ...d, rdv: [...d.rdv, { id: newId(), date: r.date || '', titre: r.objet, type: 'Autre', statut: 'À venir', notes: 'Détecté dans : ' + (doc.titre || doc.nom) }] }))}>+ Agenda</button>}
            </div>))}
        </div>
      )}
      {(doc.questions || []).length > 0 && <div className="mb-2"><div className="h3" style={{ fontSize: '1rem' }}>Questions pour le prochain RDV</div><ul className="list-plain">{doc.questions.map((q, i) => <li key={i}>{q}</li>)}</ul></div>}
      {file && file.startsWith('data:image') && <img src={file} style={{ width: '100%', borderRadius: 12, background: 'var(--gray-50)' }} />}
      {blobURL && <iframe src={blobURL} style={{ width: '100%', height: 520, border: '1px solid var(--border)', borderRadius: 12 }} title="document" />}
      {doc.status === 'ok' && <p className="disclaimer">Lecture automatique du document — en cas de doute, la valeur du document original fait foi.</p>}
    </Modal>
  );
}

function DocsTab({ listKey }) {
  const { data, importDocs, enqueue } = useApp();
  const isOrdo = listKey === 'ordonnances';
  const [sel, setSel] = useState(null);
  const [filtre, setFiltre] = useState('Tous');
  const list = data[listKey];
  const types = ['Tous', ...new Set(list.map(d => d.type || 'Inconnu'))];
  const shown = list.filter(d => filtre === 'Tous' || (d.type || 'Inconnu') === filtre).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const todo = list.filter(d => d.status !== 'ok' && d.status !== 'pending' && (d.fileId || (d.texte && d.texte.length > 30)));
  return (
    <div>
      <div className="row-between mb-2">
        <h2 className="section-title" style={{ margin: 0 }}>{isOrdo ? <>Ordonnances <span>& prescriptions</span></> : <>Documents <span>médicaux</span></>}</h2>
        {data.apiKey && todo.length > 0 && <button className="btn btn-sm" onClick={() => enqueue(todo.map(d => ({ kind: listKey, id: d.id })))}>✦ Analyser {todo.length} document{todo.length > 1 ? 's' : ''}</button>}
      </div>
      <DropZone onFiles={files => importDocs(files, listKey)} accept=".pdf,image/jpeg,image/png,image/webp" icon={isOrdo ? '💊' : '📄'} folder
        title="Glissez-déposez un ou plusieurs fichiers" sub={isOrdo ? 'PDF ou photos d\'ordonnances — les traitements sont extraits automatiquement' : 'PDF (même scannés) ou photos — comptes rendus, bilans, échographies… Chaque document est lu en entier.'} />
      {types.length > 2 && <div className="subnav">{types.map(t => <button key={t} className={`pill${filtre === t ? ' active' : ''}`} onClick={() => setFiltre(t)}>{t} {t !== 'Tous' ? `(${list.filter(d => (d.type || 'Inconnu') === t).length})` : ''}</button>)}</div>}
      {list.length === 0 && <p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>Aucun document pour le moment.</p>}
      <div className="flex-col gap-1">
        {shown.map(doc => {
          const o = itemSA(data.profil, doc);
          const an = anomalies(doc);
          return (
            <div key={doc.id} className="doc-card" style={{ cursor: 'pointer' }} onClick={() => setSel(doc.id)}>
              <div className="flex gap-1" style={{ alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <span className={`badge ${TYPE_COLORS[doc.type] || 'badge-gray'}`}>{doc.type || 'Inconnu'}</span>
                {o && <span className="badge badge-gray">{fmtSA(o)}</span>}
                <span className="small muted">{fmtDate(doc.date)}</span>
                <StatusBadge status={doc.status} erreur={doc.erreur} />
                {!doc.fileId && <span className="st st-none">PDF à réimporter</span>}
                {an.length > 0 && <span className="st st-pending">{an.length} hors norme</span>}
              </div>
              <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{doc.titre || doc.nom}</p>
              {doc.status === 'error' && <p className="small" style={{ color: 'var(--red-600)' }}>{doc.erreur}</p>}
              {doc.synthese && doc.status !== 'error' && <p className="small muted" style={{ lineHeight: 1.5, marginTop: 2 }}>{doc.synthese.slice(0, 180)}{doc.synthese.length > 180 ? '…' : ''}</p>}
              {isOrdo && (doc.medicaments || []).length > 0 && <p className="small" style={{ marginTop: 4 }}>💊 {doc.medicaments.map(m => m.nom).join(', ')}</p>}
            </div>
          );
        })}
      </div>
      {sel && <DocModal listKey={listKey} id={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

/* ============================================================
   ÉCHOGRAPHIES — séances
   ============================================================ */
function Thumb({ echo, onClick }) {
  const url = useFile(echo.fileId);
  return <div className="thumb" onClick={onClick}>{url ? <img src={url} loading="lazy" alt="" /> : null}</div>;
}
function Lightbox({ list, index, onClose, onDelete }) {
  const { data: appData, save: appSave } = useApp();
  const coverId = appData.coverId;
  const setCover = id => appSave(d => ({ ...d, coverId: id }));
  const [i, setI] = useState(index);
  const e = list[i];
  const url = useFile(e && e.fileId);
  useEffect(() => {
    const h = ev => { if (ev.key === 'Escape') onClose(); if (ev.key === 'ArrowRight') setI(x => Math.min(list.length - 1, x + 1)); if (ev.key === 'ArrowLeft') setI(x => Math.max(0, x - 1)); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [list.length]);
  if (!e) return null;
  return (
    <div className="lightbox" onClick={onClose}>
      <div onClick={ev => ev.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%' }}>
        {url ? <img src={url} alt="" /> : <div className="spinner" />}
        <div className="lb-bar">
          <button className="lb-btn" disabled={i === 0} onClick={() => setI(i - 1)}>←</button>
          <span>{i + 1} / {list.length}{e.notes ? ' · ' + e.notes : ''}</span>
          <button className="lb-btn" disabled={i === list.length - 1} onClick={() => setI(i + 1)}>→</button>
          {url && <a className="lb-btn" href={url} download={e.nom || (e.titre + '.jpg')} style={{ textDecoration: 'none' }}>⬇</a>}
          <button className="lb-btn lb-edit" onClick={() => setCover(e.id === coverId ? null : e.id)}>{e.id === coverId ? '★ À la une' : '⭐ À la une'}</button>
          <button className="lb-btn lb-edit" onClick={() => { if (confirm('Supprimer cette image ?')) { onDelete(e); if (list.length <= 1) onClose(); else setI(Math.max(0, i - 1)); } }}>🗑</button>
          <button className="lb-btn" onClick={onClose}>✕</button>
        </div>
      </div>
    </div>
  );
}
function SeanceCard({ k, imgs }) {
  const { data, save, enqueue } = useApp();
  const s = (data.seances || {})[k] || {};
  const o = k !== 'sans-date' ? saAt(data.profil, k) : null;
  const [lb, setLb] = useState(null);
  const [editDate, setEditDate] = useState(false);
  const [nd, setNd] = useState(k);
  const [open, setOpen] = useState(imgs.length <= 12);
  const linkedDocs = data.documents.filter(d => d.date === k && /cho/i.test(d.type || ''));
  const bio = s.biometrie || {};
  const bioList = [['BIP', bio.bip, 'mm'], ['PC', bio.pc, 'mm'], ['PA', bio.pa, 'mm'], ['LF', bio.lf, 'mm'], ['PFE', bio.pfe, 'g'], ['LCC', bio.lcc, 'mm'], ['CN', bio.clarte_nucale, 'mm'], ['FCF', bio.fcf, 'bpm']].filter(x => x[1]);
  function renameSeance() {
    if (!nd || nd === k) { setEditDate(false); return; }
    save(d => {
      const se = { ...(d.seances || {}) };
      if (se[k]) { se[nd] = se[k]; delete se[k]; }
      return { ...d, seances: se, echographies: d.echographies.map(e => e.seance === k ? { ...e, seance: nd, date: nd } : e) };
    });
    setEditDate(false);
  }
  const delImg = e => { delFile(e.fileId); save(d => ({ ...d, echographies: d.echographies.filter(x => x.id !== e.id) })); };
  return (
    <div className="card seance">
      <div className="seance-head">
        <div>
          {!editDate ? <h3 className="h3" style={{ margin: 0 }}>{k === 'sans-date' ? 'Images sans date' : `Écho du ${fmtDate(k)}`}</h3>
            : <div className="flex gap-1"><input type="date" value={nd} onChange={e => setNd(e.target.value)} style={{ width: 180 }} /><button className="btn btn-sm" onClick={renameSeance}>OK</button></div>}
          <div className="flex gap-1" style={{ marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {o && <span className="badge badge-teal">{fmtSA(o)}</span>}
            {o && <span className="badge badge-blue">T{trimestreOf(o.sa)}</span>}
            <span className="small muted">{imgs.length} image{imgs.length > 1 ? 's' : ''}</span>
            <StatusBadge status={s.status} erreur={s.erreur} />
          </div>
        </div>
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => { setNd(k === 'sans-date' ? '' : k); setEditDate(true); }}>✎ Date</button>
          {data.apiKey && s.status !== 'pending' && <button className="btn btn-outline btn-sm" onClick={() => enqueue([{ kind: 'seance', id: k }])}>{s.status === 'ok' ? '↻ Réanalyser' : '✦ Analyser la séance'}</button>}
          <button className="btn btn-sm btn-danger" onClick={() => { if (confirm(`Supprimer les ${imgs.length} images de cette séance ?`)) { imgs.forEach(e => delFile(e.fileId)); save(d => { const se = { ...(d.seances || {}) }; delete se[k]; return { ...d, seances: se, echographies: d.echographies.filter(e => e.seance !== k) }; }); } }}>🗑</button>
        </div>
      </div>
      {s.status === 'error' && <div className="alert-bar alert-warn">⚠ {s.erreur}</div>}
      {s.synthese && <div className="ai-bubble mb-2"><div className="ai-tag">Analyse de la séance ({s.nbImages} images lues{s.lisibilite ? ', lisibilité ' + s.lisibilite : ''})</div><p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>{s.synthese}</p>
        {bioList.length > 0 && <div className="flex gap-1" style={{ flexWrap: 'wrap', marginTop: 10 }}>{bioList.map(([a, v, u]) => <span key={a} className="badge badge-teal">{a} {v} {u}</span>)}{bio.percentile && <span className="badge badge-blue">{bio.percentile}</span>}</div>}
        {s.position && <p className="small" style={{ marginTop: 8 }}>🔄 {s.position}</p>}
        {(s.observations || []).length > 0 && <ul className="list-plain small" style={{ marginTop: 6 }}>{s.observations.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      </div>}
      {linkedDocs.length > 0 && <p className="small mb-2">📄 Compte rendu associé : {linkedDocs.map(d => d.titre || d.nom).join(', ')}</p>}
      {open ? <div className="thumbs">{imgs.map((e, i) => <Thumb key={e.id} echo={e} onClick={() => setLb(i)} />)}</div>
        : <div className="thumbs">{imgs.slice(0, 8).map((e, i) => <Thumb key={e.id} echo={e} onClick={() => setLb(i)} />)}<div className="thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--accent-dark)' }} onClick={() => setOpen(true)}>+ {imgs.length - 8}</div></div>}
      {lb != null && <Lightbox list={imgs} index={lb} onClose={() => setLb(null)} onDelete={delImg} />}
    </div>
  );
}
function EchoImportModal({ groups, onClose, onConfirm }) {
  const [g, setG] = useState(groups);
  return (
    <Modal onClose={onClose}>
      <h2 className="h3" style={{ fontSize: '1.4rem' }}>Importer des échographies</h2>
      <p className="small muted mb-2">Les images sont regroupées par séance. Vérifiez la date de chaque séance (lue dans le nom du dossier quand c'est possible).</p>
      {g.map((x, i) => (
        <div key={i} className="card card-sm mb-1">
          <div className="row-between">
            <div><b>{x.images.length} image{x.images.length > 1 ? 's' : ''}</b>{x.pdfs.length ? ` + ${x.pdfs.length} PDF` : ''} <span className="small muted">{x.label}</span></div>
            <input type="date" value={x.date} onChange={e => setG(g.map((y, j) => j === i ? { ...y, date: e.target.value } : y))} style={{ width: 170 }} />
          </div>
        </div>
      ))}
      <div className="flex gap-1 mt-2" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-outline btn-sm" onClick={onClose}>Annuler</button>
        <button className="btn btn-sm" disabled={g.some(x => !x.date)} onClick={() => onConfirm(g)}>Importer</button>
      </div>
    </Modal>
  );
}
function EchosTab() {
  const { data, save, importDocs, enqueue, toast } = useApp();
  const [groups, setGroups] = useState(null);
  const [busy, setBusy] = useState('');
  const bySeance = {};
  data.echographies.forEach(e => { (bySeance[e.seance || 'sans-date'] = bySeance[e.seance || 'sans-date'] || []).push(e); });
  const keys = Object.keys(bySeance).sort((a, b) => b.localeCompare(a));
  const todo = keys.filter(k => k !== 'sans-date' && !['ok', 'pending'].includes((data.seances[k] || {}).status));

  function onFiles(files) {
    const imgs = files.filter(isImg), pdfs = files.filter(isPDF);
    if (!imgs.length && !pdfs.length) return toast('Aucune image ou PDF reconnu', 'err');
    const map = {};
    [...imgs, ...pdfs].forEach(f => {
      const fd = folderDate(f.webkitRelativePath || '') || folderDate(f.name);
      const key = fd || 'x';
      if (!map[key]) map[key] = { date: fd || todayISO(), label: fd ? (f.webkitRelativePath ? 'dossier ' + f.webkitRelativePath.split('/').slice(-2, -1)[0] : '') : 'date à vérifier', images: [], pdfs: [] };
      (isPDF(f) ? map[key].pdfs : map[key].images).push(f);
    });
    setGroups(Object.values(map).sort((a, b) => a.date.localeCompare(b.date)));
  }
  async function doImport(gs) {
    setGroups(null);
    let added = 0, fixed = 0, skipped = 0;
    const total = gs.reduce((s, g) => s + g.images.length, 0);
    const newEchos = [], fixes = {};
    const existing = data.echographies;
    for (const g of gs) {
      for (const f of g.images) {
        setBusy(`Import des images… ${added + fixed + skipped + 1}/${total}`);
        const base = f.name.replace(/\.[^.]+$/, '');
        let match = existing.find(e => e.nom === f.name && e.size === f.size && e.seance === g.date);
        if (!match) {
          // anciennes images (sans taille enregistrée) : on compare le contenu encodé
          const expected = 4 * Math.ceil(f.size / 3);
          for (const e of existing.filter(e => !e.size && (e.titre === base || e.nom === f.name))) {
            const u = await getFile(e.fileId);
            if (u && u.length - u.indexOf(',') - 1 === expected) { match = e; break; }
          }
        }
        if (!match) match = existing.find(e => e.nom === f.name && e.size === f.size);
        if (match) { if (match.seance !== g.date) { fixes[match.id] = g.date; fixed++; } else skipped++; continue; }
        if (newEchos.some(e => e.nom === f.name && e.seance === g.date)) { skipped++; continue; }
        const url = await compressImage(f);
        const fileId = await putFile(url);
        newEchos.push({ id: newId(), nom: f.name, titre: base, date: g.date, seance: g.date, fileId, notes: '', size: f.size });
        added++;
      }
    }
    save(d => ({ ...d, echographies: [...d.echographies.map(e => fixes[e.id] ? { ...e, seance: fixes[e.id], date: fixes[e.id] } : e), ...newEchos] }));
    for (const g of gs) if (g.pdfs.length) await importDocs(g.pdfs, 'documents', g.date, true);
    setBusy('');
    toast(`${added} image${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''}${fixed ? `, ${fixed} recalée${fixed > 1 ? 's' : ''} sur la bonne date` : ''}${skipped ? `, ${skipped} déjà présente${skipped > 1 ? 's' : ''}` : ''}.`);
    const seKeys = [...new Set(gs.map(g => g.date))];
    if (data.apiKey && added) setTimeout(() => enqueue(seKeys.map(k => ({ kind: 'seance', id: k }))), 400);
  }

  return (
    <div>
      <div className="row-between mb-2">
        <h2 className="section-title" style={{ margin: 0 }}>Échographies <span>par séance</span></h2>
        {data.apiKey && todo.length > 0 && <button className="btn btn-sm" onClick={() => enqueue(todo.map(k => ({ kind: 'seance', id: k })))}>✦ Analyser {todo.length} séance{todo.length > 1 ? 's' : ''}</button>}
      </div>
      <DropZone onFiles={onFiles} accept="image/jpeg,image/png,image/webp,.pdf" icon="🔬" folder
        title="Glissez-déposez les images d'une séance, ou importez le dossier « echographie » entier"
        sub="Les sous-dossiers nommés par date (ex. 15092026) deviennent automatiquement des séances. Les PDF de compte rendu vont dans Documents." />
      {busy && <div className="alert-bar alert-info"><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />{busy}</div>}
      {keys.length === 0 && <div className="muted" style={{ textAlign: 'center', padding: '3rem' }}><div style={{ fontSize: '3rem' }}>🌿</div>Importez vos premières images d'échographie.</div>}
      {keys.map(k => <SeanceCard key={k} k={k} imgs={bySeance[k]} />)}
      {groups && <EchoImportModal groups={groups} onClose={() => setGroups(null)} onConfirm={doImport} />}
    </div>
  );
}

/* ============================================================
   BÉBÉ 3D + PHOTO À LA UNE (accueil)
   ============================================================ */
function latestBiometrie(data) {
  const pts = collectBiometrie(data);
  const out = {}; let lastDate = '', lastX = null;
  ['bip', 'pc', 'pa', 'lf'].forEach(k => {
    const l = pts.filter(p => p.key === k && p.y > 5).sort((a, b) => b.x - a.x)[0];
    if (l) { out[k] = l.y; if (lastX == null || l.x > lastX) { lastX = l.x; lastDate = l.date; } }
  });
  const pfe = pts.filter(p => (p.key === 'pfe' || p.key === 'poids_foetal')).sort((a, b) => b.x - a.x)[0];
  return { m: out, x: lastX, date: lastDate, pfe: pfe ? pfe.y : null, complete: ['bip', 'pc', 'pa', 'lf'].every(k => out[k]) };
}
function Baby3DCanvas({ measures, mode, auto, focus, height, rendererRef }) {
  const ref = useRef(null), r = useRef(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    try { r.current = createBabyRenderer(ref.current, measures, { mode, auto, focus }); r.current.setFocus(focus); if (rendererRef) rendererRef.current = r.current; }
    catch (e) { setErr(e.message); }
    let io;
    try { io = new IntersectionObserver(es => { if (r.current) { r.current.state.visible = es[0].isIntersecting; r.current.state.dirty = true; } }); io.observe(ref.current); } catch (e) {}
    return () => { io && io.disconnect(); r.current && r.current.destroy(); r.current = null; };
  }, []);
  useEffect(() => { r.current && r.current.setMeasures(measures); }, [JSON.stringify(measures)]);
  useEffect(() => { r.current && r.current.setMode(mode); }, [mode]);
  useEffect(() => { r.current && r.current.setAuto(auto); }, [auto]);
  useEffect(() => { r.current && r.current.setFocus(focus); }, [focus]);
  if (err) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem' }} className="small muted">La 3D n'est pas disponible sur ce navigateur (WebGL).<br />{err.slice(0, 120)}</div>;
  return <canvas ref={ref} style={{ width: '100%', height, display: 'block', borderRadius: 14, cursor: 'grab', touchAction: 'none', background: '#120804' }} />;
}
function Baby3DCard() {
  const { data } = useApp();
  const p = data.profil; const cur = saAt(p);
  const lb = latestBiometrie(data);
  const [when, setWhen] = useState('echo');
  const [mode, setMode] = useState(0);
  const [auto, setAuto] = useState(true);
  const [focus, setFocus] = useState(true);
  const [big, setBig] = useState(false);
  const rr = useRef(null), rrBig = useRef(null);
  const echoSA = lb.x != null ? lb.x : (cur ? cur.dec : 26);
  const refEcho = babyRefAt(echoSA);
  const base = { bip: lb.m.bip || refEcho.bip, pc: lb.m.pc || refEcho.pc, pa: lb.m.pa || refEcho.pa, lf: lb.m.lf || refEcho.lf };
  let measures = base;
  if (when === 'today' && cur) { const rt = babyRefAt(cur.dec); measures = { bip: base.bip * rt.bip / refEcho.bip, pc: base.pc * rt.pc / refEcho.pc, pa: base.pa * rt.pa / refEcho.pa, lf: base.lf * rt.lf / refEcho.lf }; }
  const r1 = v => Math.round(v);
  function save(ref) { const r = ref.current; if (!r) return; const a = document.createElement('a'); a.href = r.snapshot(); a.download = `bebe_3D_${todayISO()}.png`; document.body.appendChild(a); a.click(); a.remove(); }
  const controls = ref => (
    <div className="flex gap-1" style={{ flexWrap: 'wrap', marginTop: 10 }}>
      <button className={`pill${mode === 0 ? ' active' : ''}`} onClick={() => setMode(0)}>Écho 3D</button>
      <button className={`pill${mode === 1 ? ' active' : ''}`} onClick={() => setMode(1)}>Peau</button>
      <button className="pill" onClick={() => setAuto(a => !a)}>{auto ? '⏸ Mouvement' : '▶ Mouvement'}</button>
      <button className="pill" onClick={() => ref.current && ref.current.zoomBy(1.15)}>＋</button>
      <button className="pill" onClick={() => ref.current && ref.current.zoomBy(0.87)}>－</button>
      <button className={`pill${focus ? ' active' : ''}`} onClick={() => { setFocus(true); ref.current && ref.current.setFocus(true); }}>Visage</button>
      <button className={`pill${!focus ? ' active' : ''}`} onClick={() => { setFocus(false); ref.current && ref.current.setFocus(false); }}>Corps entier</button>
      <button className="pill" onClick={() => save(ref)}>📷 Image</button>
    </div>
  );
  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div className="row-between mb-1" style={{ padding: '0 0.25rem' }}>
        <h3 className="h3" style={{ margin: 0 }}>Bébé en 3D</h3>
        <div className="flex gap-1">
          {lb.x != null && cur && Math.abs(cur.dec - lb.x) > 0.5 && <>
            <button className={`pill${when === 'echo' ? ' active' : ''}`} onClick={() => setWhen('echo')}>Écho {lb.date ? fmtShort(lb.date) : ''}</button>
            <button className={`pill${when === 'today' ? ' active' : ''}`} onClick={() => setWhen('today')}>Aujourd'hui</button>
          </>}
          <button className="pill" onClick={() => setBig(true)} title="Agrandir">⛶</button>
        </div>
      </div>
      {!big && <Baby3DCanvas measures={measures} mode={mode} auto={auto} focus={focus} height={380} rendererRef={rr} />}
      {big && <div style={{ height: 380, borderRadius: 14, background: '#120804' }} />}
      {controls(rr)}
      <p className="small muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
        {lb.complete ? <>Proportions calculées d'après l'écho du <b>{fmtDate(lb.date)}</b> ({fmtSA({ sa: Math.floor(lb.x), j: Math.round((lb.x % 1) * 7) })}) : BIP {r1(lb.m.bip)} mm, PC {r1(lb.m.pc)} mm, PA {r1(lb.m.pa)} mm, fémur {r1(lb.m.lf)} mm{lb.pfe ? `, ≈ ${r1(lb.pfe)} g` : ''}.</>
          : <>Proportions moyennes pour {fmtSA(cur)} — elles deviendront celles de bébé dès qu'une écho avec biométrie sera analysée.</>}
        {when === 'today' && ' Vue « aujourd\'hui » : croissance moyenne projetée depuis cette écho.'}
        {' '}Glissez pour tourner, molette pour zoomer.
      </p>
      <p className="disclaimer" style={{ marginTop: 4 }}>Illustration reconstituée à partir des mesures : la silhouette et les proportions suivent la biométrie, mais le visage et la posture sont imaginés — ce n'est pas une image réelle du bébé.</p>
      {big && <div className="lightbox" onClick={() => setBig(false)}>
        <div onClick={e => e.stopPropagation()} style={{ width: 'min(92vw, 92vh)', maxWidth: 900 }}>
          <Baby3DCanvas measures={measures} mode={mode} auto={auto} focus={focus} height={'min(78vh, 86vw)'} rendererRef={rrBig} />
          <div className="flex gap-1" style={{ justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 }}>
            <button className="lb-btn" onClick={() => setMode(m => 1 - m)}>{mode === 0 ? 'Style peau' : 'Style écho 3D'}</button>
            <button className="lb-btn" onClick={() => setFocus(f => !f)}>{focus ? 'Corps entier' : 'Visage'}</button>
            <button className="lb-btn" onClick={() => setAuto(a => !a)}>{auto ? '⏸ Mouvement' : '▶ Mouvement'}</button>
            <button className="lb-btn" onClick={() => rrBig.current && rrBig.current.zoomBy(1.15)}>＋</button>
            <button className="lb-btn" onClick={() => rrBig.current && rrBig.current.zoomBy(0.87)}>－</button>
            <button className="lb-btn" onClick={() => save(rrBig)}>📷 Enregistrer</button>
            <button className="lb-btn" onClick={() => setBig(false)}>✕</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
function CoverCard({ go }) {
  const { data, save } = useApp();
  const cover = data.echographies.find(e => e.id === data.coverId);
  const url = useFile(cover && cover.fileId);
  const [lb, setLb] = useState(false);
  const o = cover ? saAt(data.profil, cover.seance) : null;
  return (
    <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
      <div className="row-between mb-1" style={{ padding: '0 0.25rem' }}>
        <h3 className="h3" style={{ margin: 0 }}>Photo à la une</h3>
        <button className="pill" onClick={() => go('echos')}>{cover ? 'Changer' : 'Choisir'}</button>
      </div>
      {cover && url ? <>
        <div style={{ height: 380, borderRadius: 14, background: '#000', overflow: 'hidden', cursor: 'zoom-in' }} onClick={() => setLb(true)}><img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
        <p className="small muted" style={{ marginTop: 10 }}>{cover.seance && cover.seance !== 'sans-date' ? `Écho du ${fmtDate(cover.seance)}` : ''}{o ? ` · ${fmtSA(o)}` : ''}{cover.notes ? ' · ' + cover.notes : ''}</p>
        <div className="flex gap-1" style={{ marginTop: 8 }}><button className="pill" onClick={() => save(d => ({ ...d, coverId: null }))}>Retirer</button></div>
      </> : <div style={{ height: 380, borderRadius: 14, background: 'var(--teal-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem' }}>
        <div style={{ fontSize: '2.5rem' }}>⭐</div>
        <p className="small muted" style={{ marginTop: 8, lineHeight: 1.6 }}>Dans l'onglet Échographies, ouvrez une image et cliquez sur <b>« ⭐ À la une »</b>.<br />Quand vous aurez des vues 3D de l'échographiste, c'est ici qu'elles s'afficheront.</p>
        <button className="btn btn-sm mt-2" onClick={() => go('echos')}>Choisir une image</button>
      </div>}
      {lb && url && <div className="lightbox" onClick={() => setLb(false)}><img src={url} alt="" /></div>}
    </div>
  );
}

/* ============================================================
   RÉSULTATS BIOLOGIQUES
   ============================================================ */
function ResultatsTab() {
  const { data } = useApp();
  const [cat, setCat] = useState('Toutes');
  const [anoOnly, setAnoOnly] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [view, setView] = useState('date');
  const groups = collectResultats(data);
  const cats = ['Toutes', ...new Set(groups.map(g => g.categorie))];
  const isAno = it => ['bas', 'haut', 'anormal', 'positif', 'non_immunise'].includes(it.statut);
  const shown = groups.filter(g => (cat === 'Toutes' || g.categorie === cat) && (!anoOnly || g.items.some(isAno)) && (!q || normName(g.nom).includes(normName(q))));
  const nbAno = groups.filter(g => isAno(g.items[g.items.length - 1])).length;
  const nbDocsBio = [...data.documents, ...data.ordonnances].filter(d => d.status === 'ok' && (d.resultats || []).length).length;
  const nonAnalyses = data.documents.filter(d => d.status !== 'ok' && /(bilan|analyse|cerballiance|resultat)/i.test((d.type || '') + d.nom)).length;
  return (
    <div>
      <h1 className="section-title">Analyses</h1>
      <div className="grid-3 mb-3">
        <div className="stat-card"><div className="stat-label">Analyses suivies</div><div className="stat-value">{groups.length}</div><div className="stat-sub">issues de {nbDocsBio} document{nbDocsBio > 1 ? 's' : ''}</div></div>
        <div className="stat-card"><div className="stat-label">Dernière valeur hors norme</div><div className="stat-value" style={{ color: nbAno ? 'var(--amber-600)' : undefined }}>{nbAno}</div><div className="stat-sub">analyse{nbAno > 1 ? 's' : ''}</div></div>
        <div className="stat-card"><div className="stat-label">Documents à analyser</div><div className="stat-value">{nonAnalyses}</div><div className="stat-sub">bilans probables pas encore lus</div></div>
      </div>
      {groups.length === 0 && <div className="card muted" style={{ textAlign: 'center', padding: '3rem' }}>Les résultats apparaîtront ici dès que les bilans (Cerballiance, etc.) seront analysés dans l'onglet Documents.</div>}
      {groups.length > 0 && <>
        <div className="row-between mb-2">
          <div className="subnav" style={{ margin: 0 }}>{cats.map(c => <button key={c} className={`pill${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
          <div className="flex gap-1" style={{ alignItems: 'center' }}>
            <input type="text" placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} style={{ width: 160 }} />
            <label className="flex gap-1" style={{ margin: 0, alignItems: 'center', whiteSpace: 'nowrap' }}><input type="checkbox" checked={anoOnly} onChange={e => setAnoOnly(e.target.checked)} /> Hors norme</label>
          </div>
        </div>
        <div className="subnav"><button className={`pill${view === 'date' ? ' active' : ''}`} onClick={() => setView('date')}>Par date</button><button className={`pill${view === 'liste' ? ' active' : ''}`} onClick={() => setView('liste')}>Par analyse</button></div>
        {view === 'date' && <AnalysesMatrix groups={shown} />}
        {view === 'liste' && <div className="card" style={{ padding: '0.5rem 0.75rem', overflowX: 'auto' }}>
          <table className="res-table"><thead><tr><th>Analyse</th><th>Dernière valeur</th><th>Historique</th><th>Référence</th></tr></thead><tbody>
            {shown.map(g => {
              const last = g.items[g.items.length - 1];
              const numeric = g.items.map(it => ({ it, n: num(it.valeur) })).filter(x => x.n != null && x.it.date);
              return (
                <React.Fragment key={g.key}>
                  <tr className="clickable" onClick={() => setOpen(open === g.key ? null : g.key)}>
                    <td className="name">{g.nom}<div className="small muted" style={{ fontWeight: 400 }}>{g.categorie}</div></td>
                    <td><span className={`rv rv-${last.statut}`}>{last.valeur} {last.unite}</span><div className="small muted">{fmtShort(last.date)}</div></td>
                    <td>{g.items.length > 1 ? g.items.slice(0, -1).slice(-4).map((it, i) => <span key={i} className={`rv rv-${it.statut}`} style={{ marginRight: 4, opacity: 0.8 }} title={fmtDate(it.date)}>{it.valeur}</span>) : <span className="muted small">—</span>}</td>
                    <td className="muted">{last.reference}</td>
                  </tr>
                  {open === g.key && <tr><td colSpan="4" style={{ background: 'var(--bg)' }}>
                    {numeric.length >= 2 && <ChartXY height={200} yLabel={last.unite} series={[{ label: g.nom, color: '#4E6349', points: numeric.map(x => ({ x: (saAt(data.profil, x.it.date) || { dec: 0 }).dec, y: x.n })) }]} />}
                    {g.items.map((it, i) => <div key={i} className="kv"><span>{fmtDate(it.date)} · {it.docTitre}</span><span><span className={`rv rv-${it.statut}`}>{it.valeur} {it.unite}</span>{it.commentaire ? <span className="small muted"> — {it.commentaire}</span> : null}</span></div>)}
                  </td></tr>}
                </React.Fragment>
              );
            })}
          </tbody></table>
        </div>}
        <p className="disclaimer">Valeurs lues automatiquement dans les comptes rendus de laboratoire. Les normes de grossesse peuvent différer des normes générales du laboratoire : interprétation par la sage-femme ou le médecin.</p>
      </>}
    </div>
  );
}

/* ============================================================
   MESURES & COURBES
   ============================================================ */
function MesuresTab() {
  const { data, save } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const empty = { date: todayISO(), bip: '', pc: '', pa: '', lf: '', poids_foetal: '', poids_maternel: '', tension: '', glycemie: '', hb: '' };
  const [f, setF] = useState(empty);
  const pts = collectBiometrie(data);
  const [refOn, setRefOn] = useState(true);
  const series = BIO_KEYS.map(([k, label, color]) => ({ k, label: label + ' (mm)', color, points: pts.filter(p => p.key === k).map(p => ({ x: p.x, y: p.y })) })).filter(s => s.points.length);
  const refIdx = { bip: 1, pc: 2, pa: 3, lf: 4 };
  const withRef = refOn ? [...series, ...series.map(s => ({ label: s.label.replace(' (mm)', '') + ' moyenne', color: s.color, ref: true, points: BABY_REF.map(r => ({ x: r[0], y: r[refIdx[s.k]] })) }))] : series;
  const pfeRef = [[20, 300], [22, 430], [24, 600], [26, 760], [28, 1000], [30, 1300], [32, 1700], [34, 2150], [36, 2600], [38, 3080], [40, 3400]].map(([x, y]) => ({ x, y }));
  const pfe = pts.filter(p => p.key === 'pfe' || p.key === 'poids_foetal').map(p => ({ x: p.x, y: p.y }));
  const poidsM = collectPoidsMaternel(data);
  const rows = [...pts].sort((a, b) => b.x - a.x);
  const byDate = {};
  rows.forEach(r => { const k = r.date || ('sa' + r.x); (byDate[k] = byDate[k] || { date: r.date, x: r.x, src: r.src, v: {} }).v[r.key] = r.y; });
  return (
    <div>
      <div className="row-between mb-3">
        <h1 className="section-title" style={{ margin: 0 }}>Courbes de croissance</h1>
        <button className="btn btn-sm" onClick={() => setShowAdd(true)}>+ Saisie manuelle</button>
      </div>
      <p className="small muted mb-3">Les courbes se remplissent automatiquement avec les comptes rendus d'échographie analysés, les mesures lues sur les images de chaque séance et vos saisies. La SA est calculée à la date de chaque examen.</p>
      {series.length === 0 && pfe.length === 0 && poidsM.length === 0 && <div className="card muted" style={{ textAlign: 'center', padding: '3rem' }}>📊 Aucune mesure pour l'instant — analysez les documents et séances d'écho.</div>}
      {series.length > 0 && <div className="card mb-3"><div className="row-between"><h3 className="h3">Biométrie fœtale</h3><label className="flex gap-1" style={{ alignItems: 'center', margin: 0 }}><input type="checkbox" checked={refOn} onChange={e => setRefOn(e.target.checked)} /> Moyennes de référence</label></div><ChartXY series={withRef} yLabel="mm" height={320} /><p className="small muted mt-1">Traits pleins : mesures de bébé. Pointillés : moyennes indicatives par semaine.</p></div>}
      <div className="grid-2 mb-3">
        {pfe.length > 0 && <div className="card"><h3 className="h3">Poids fœtal estimé</h3><ChartXY series={[{ label: 'Poids estimé (g)', color: '#4E6349', points: pfe }, ...(refOn ? [{ label: 'Moyenne', color: '#4E6349', ref: true, points: pfeRef }] : [])]} yLabel="g" height={220} /></div>}
        {poidsM.length > 0 && <div className="card"><h3 className="h3">Poids d'Alexandra</h3><ChartXY series={[{ label: 'Poids (kg)', color: '#9A5A40', points: poidsM }]} yLabel="kg" height={220} />
          {poidsM.length >= 2 && <p className="small muted mt-2">Prise de poids depuis la première mesure : <b>{(poidsM[poidsM.length - 1].y - poidsM[0].y).toFixed(1)} kg</b></p>}</div>}
      </div>
      {Object.keys(byDate).length > 0 && <div className="card mb-3" style={{ overflowX: 'auto' }}>
        <h3 className="h3">Toutes les mesures fœtales</h3>
        <table className="res-table"><thead><tr><th>Date</th><th>SA</th><th>Source</th>{['BIP', 'PC', 'PA', 'LF', 'PFE (g)'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
          {Object.values(byDate).map((r, i) => <tr key={i}><td>{fmtShort(r.date)}</td><td><b>{Math.floor(r.x)}{Math.round((r.x % 1) * 7) ? '+' + Math.round((r.x % 1) * 7) : ''}</b></td><td className="small">{r.src}</td>{['bip', 'pc', 'pa', 'lf'].map(k => <td key={k}>{r.v[k] || '—'}</td>)}<td>{r.v.pfe || r.v.poids_foetal || '—'}</td></tr>)}
        </tbody></table>
      </div>}
      {data.mesures.length > 0 && <div className="card mb-3"><h3 className="h3">Saisies manuelles</h3>
        {[...data.mesures].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(m => (
          <div key={m.id} className="kv"><span>{fmtShort(m.date) || (m.sa + ' SA')}</span><span>{Object.entries(m).filter(([k, v]) => !['id', 'date', 'sa'].includes(k) && v !== '' && v != null).map(([k, v]) => `${k.replace('_', ' ')} ${v}`).join(' · ')} <button style={{ border: 'none', background: 'none', color: 'var(--red-400)', cursor: 'pointer' }} onClick={() => save(d => ({ ...d, mesures: d.mesures.filter(x => x.id !== m.id) }))}>✕</button></span></div>
        ))}
      </div>}
      {showAdd && <Modal onClose={() => setShowAdd(false)}>
        <h2 className="h3" style={{ fontSize: '1.4rem' }}>Nouvelle mesure</h2>
        <div className="mb-2"><label>Date</label><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /><span className="small muted">{fmtSA(saAt(data.profil, f.date))}</span></div>
        <p className="small muted mb-1" style={{ fontWeight: 600 }}>MAMAN</p>
        <div className="grid-2 mb-2">
          <div><label>Poids (kg)</label><input type="number" step="0.1" value={f.poids_maternel} onChange={e => setF({ ...f, poids_maternel: e.target.value })} /></div>
          <div><label>Tension (ex. 12/7)</label><input type="text" value={f.tension} onChange={e => setF({ ...f, tension: e.target.value })} /></div>
        </div>
        <p className="small muted mb-1" style={{ fontWeight: 600 }}>BÉBÉ (mm)</p>
        <div className="grid-4 mb-2">{['bip', 'pc', 'pa', 'lf'].map(k => <div key={k}><label>{k.toUpperCase()}</label><input type="number" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>)}</div>
        <div className="grid-2 mb-3">
          <div><label>Poids fœtal estimé (g)</label><input type="number" value={f.poids_foetal} onChange={e => setF({ ...f, poids_foetal: e.target.value })} /></div>
          <div><label>Glycémie (g/L)</label><input type="number" step="0.01" value={f.glycemie} onChange={e => setF({ ...f, glycemie: e.target.value })} /></div>
        </div>
        <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setShowAdd(false)}>Annuler</button>
          <button className="btn btn-sm" onClick={() => { if (!f.date) return; const m = { id: newId() }; Object.entries(f).forEach(([k, v]) => { if (v !== '') m[k] = k === 'date' || k === 'tension' ? v : Number(v); }); const o = saAt(data.profil, f.date); if (o) m.sa = o.sa; save(d => ({ ...d, mesures: [...d.mesures, m] })); setShowAdd(false); setF(empty); }}>Enregistrer</button>
        </div>
      </Modal>}
    </div>
  );
}

/* ============================================================
   JOURNAL
   ============================================================ */
function JournalTab() {
  const { data, save } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const empty = { date: todayISO(), type: 'Événement personnel', titre: '', note: '' };
  const [f, setF] = useState(empty);
  const EMO = { 'Consultation': '🩺', 'Échographie': '🔬', 'Bilan': '🧪', 'Événement personnel': '💛', 'Symptôme': '🌡️', 'Premier coup de pied': '👣', 'Autre': '📌' };
  const all = [
    ...[...data.documents, ...data.ordonnances].map(d => ({ id: 'd' + d.id, date: d.date, titre: d.titre || d.nom, note: d.synthese, emoji: /cho/i.test(d.type || '') ? '🔬' : d.type === 'Ordonnance' ? '💊' : '📄', auto: true })),
    ...Object.keys([...new Set(data.echographies.map(e => e.seance))].reduce((a, k) => (a[k] = 1, a), {})).filter(k => k !== 'sans-date').map(k => ({ id: 's' + k, date: k, titre: 'Séance d\'échographie', note: (data.seances[k] || {}).synthese || `${data.echographies.filter(e => e.seance === k).length} images`, emoji: '🖼️', auto: true })),
    ...data.evenements.map(e => ({ ...e, emoji: EMO[e.type] || '📌' })),
  ].filter(x => x.date).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div>
      <div className="row-between mb-3"><h1 className="section-title" style={{ margin: 0 }}>Journal</h1><button className="btn btn-sm" onClick={() => setShowAdd(true)}>+ Ajouter</button></div>
      <div className="card">
        {all.length === 0 && <p className="muted">Aucun événement.</p>}
        {all.map(ev => {
          const o = saAt(data.profil, ev.date);
          return (
            <div key={ev.id} className="timeline-item">
              <div className="timeline-dot" style={{ background: 'var(--teal-50)', fontSize: '1.1rem' }}>{ev.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex gap-1" style={{ alignItems: 'center', flexWrap: 'wrap' }}><span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{ev.titre}</span>{o && <span className="badge badge-teal" style={{ fontSize: '0.7rem' }}>{fmtSA(o)}</span>}</div>
                <div className="small muted mb-1">{fmtDate(ev.date)}</div>
                {ev.note && <p className="small muted" style={{ lineHeight: 1.5 }}>{String(ev.note).slice(0, 220)}{String(ev.note).length > 220 ? '…' : ''}</p>}
              </div>
              {!ev.auto && <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => save(d => ({ ...d, evenements: d.evenements.filter(e => e.id !== ev.id) }))}>✕</button>}
            </div>
          );
        })}
      </div>
      {showAdd && <Modal onClose={() => setShowAdd(false)}>
        <h2 className="h3" style={{ fontSize: '1.4rem' }}>Nouvel événement</h2>
        <div className="grid-2 mb-2"><div><label>Date</label><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></div><div><label>Type</label><select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{Object.keys(EMO).map(t => <option key={t}>{t}</option>)}</select></div></div>
        <div className="mb-2"><label>Titre</label><input type="text" value={f.titre} onChange={e => setF({ ...f, titre: e.target.value })} placeholder="Ex. Premiers coups de pied ressentis" /></div>
        <div className="mb-3"><label>Notes</label><textarea rows="3" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></div>
        <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}><button className="btn btn-outline btn-sm" onClick={() => setShowAdd(false)}>Annuler</button><button className="btn btn-sm" onClick={() => { if (!f.titre || !f.date) return; save(d => ({ ...d, evenements: [...d.evenements, { ...f, id: newId() }] })); setShowAdd(false); setF(empty); }}>Ajouter</button></div>
      </Modal>}
    </div>
  );
}

/* ============================================================
   AGENDA
   ============================================================ */
function AgendaTab() {
  const { data, save } = useApp();
  const [form, setForm] = useState(null);
  const [prep, setPrep] = useState(null);
  const STATUTS = { 'À venir': 'badge-blue', 'Fait': 'badge-green', 'Annulé': 'badge-gray', 'À reprogrammer': 'badge-amber' };
  const today = todayISO();
  const rdv = [...data.rdv].sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  const avenir = rdv.filter(r => !r.date || r.date >= today), passes = rdv.filter(r => r.date && r.date < today).reverse();
  const suggestions = [];
  [...data.documents, ...data.ordonnances].forEach(d => (d.rdv_detectes || []).forEach(r => { if (r.date && r.date >= today && !data.rdv.some(x => x.date === r.date && normName(x.titre) === normName(r.objet)) && !(data.demarches || {})['ign_' + r.date + normName(r.objet)]) suggestions.push({ ...r, src: d.titre || d.nom }); }));
  const empty = { date: today, heure: '', titre: '', type: 'Consultation', statut: 'À venir', lieu: '', notes: '' };
  const Row = ({ r }) => (
    <div className="agenda-item" style={{ marginBottom: 8 }}>
      <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}><div style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', color: 'var(--accent-dark)', lineHeight: 1 }}>{r.date ? parseD(r.date).getDate() : '?'}</div><div className="small muted">{r.date ? fmtDate(r.date, { month: 'short' }) : ''}</div></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex gap-1" style={{ alignItems: 'center', flexWrap: 'wrap' }}><span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{r.titre}</span><span className={`badge ${STATUTS[r.statut] || 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>{r.statut}</span></div>
        <div className="small muted">{r.date ? fmtDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' }) : ''}{r.heure ? ' · ' + r.heure : ''}{r.date && saAt(data.profil, r.date) ? ' · ' + fmtSA(saAt(data.profil, r.date)) : ''}{r.lieu ? ' · ' + r.lieu : ''}</div>
        {r.notes && <div className="small muted">{r.notes}</div>}
        {r.crResume && <div className="small" style={{ marginTop: 4, color: 'var(--euca-d)' }}>Compte rendu disponible</div>}
      </div>
      <div className="flex gap-1">
        <button className="btn btn-outline btn-sm ro-ok" onClick={() => setPrep(r)}>{r.date && r.date < today ? 'Compte rendu' : `Questions${(r.questions || []).length ? ' (' + r.questions.length + ')' : ''}`}</button>
        {r.statut === 'À venir' && <button className="btn btn-outline btn-sm" title="Marquer fait" onClick={() => save(d => ({ ...d, rdv: d.rdv.map(x => x.id === r.id ? { ...x, statut: 'Fait' } : x) }))}>✓</button>}
        <button className="btn btn-outline btn-sm" onClick={() => setForm({ ...empty, ...r })}>✎</button>
        <button className="btn btn-outline btn-sm" onClick={() => save(d => ({ ...d, rdv: d.rdv.filter(x => x.id !== r.id) }))}>✕</button>
      </div>
    </div>
  );
  return (
    <div>
      <div className="row-between mb-3"><h1 className="section-title" style={{ margin: 0 }}>Rendez-vous</h1><button className="btn btn-sm" onClick={() => setForm(empty)}>+ RDV</button></div>
      {suggestions.length > 0 && <div className="card mb-3" style={{ borderColor: 'var(--blue-100)' }}>
        <h3 className="h3">Rendez-vous repérés dans les documents</h3>
        {suggestions.map((s, i) => <div key={i} className="alert-bar alert-info row-between"><span>📅 {fmtDate(s.date)} — {s.objet} <span className="small">({s.src})</span></span><span className="flex gap-1">
          <button className="btn btn-sm" onClick={() => save(d => ({ ...d, rdv: [...d.rdv, { ...empty, id: newId(), date: s.date, titre: s.objet, notes: 'Repéré dans : ' + s.src }] }))}>Ajouter</button>
          <button className="btn btn-outline btn-sm" onClick={() => save(d => ({ ...d, demarches: { ...(d.demarches || {}), ['ign_' + s.date + normName(s.objet)]: true } }))}>Ignorer</button></span></div>)}
      </div>}
      <div className="grid-2 mb-3" style={{ alignItems: 'start' }}>
        <div className="card"><h3 className="h3">À venir</h3>{avenir.length === 0 && <p className="small muted">Aucun RDV à venir.</p>}{avenir.map(r => <Row key={r.id} r={r} />)}
          {passes.length > 0 && <details style={{ marginTop: 12 }}><summary className="small muted" style={{ cursor: 'pointer' }}>Rendez-vous passés ({passes.length})</summary><div style={{ marginTop: 8 }}>{passes.map(r => <Row key={r.id} r={r} />)}</div></details>}
        </div>
        <div className="card"><h3 className="h3">Calendrier de suivi (France)</h3>
          {EXAMENS.map(ex => {
            const st = examStatus(data, ex);
            const color = { fait: 'var(--green-600)', manquant: 'var(--amber-600)', maintenant: 'var(--blue-600)', avenir: 'var(--accent)' }[st.state];
            const lbl = { fait: '✓ Fait', manquant: '⚠ Non trouvé', maintenant: '● C\'est le moment', avenir: 'À venir' }[st.state];
            return (
              <div key={ex.id} className="kv" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text)', flex: 1 }}><b style={{ fontWeight: 500 }}>{ex.label}</b>{!ex.obligatoire && <span className="small muted"> (selon situation)</span>}<div className="small muted">{ex.de}–{ex.a} SA · {st.due ? 'vers le ' + fmtDate(st.due, { day: 'numeric', month: 'short' }) : ''} · {ex.desc}{st.found ? ' · ' + st.found : ''}</div></span>
                <span style={{ color, fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>{lbl}
                  {!st.found && <label className="small" style={{ margin: 0, fontWeight: 400, display: 'flex', gap: 4, alignItems: 'center' }}><input type="checkbox" checked={!!st.manual} onChange={e => save(d => ({ ...d, demarches: { ...(d.demarches || {}), ['ex_' + ex.id]: e.target.checked } }))} />fait</label>}
                </span>
              </div>
            );
          })}
          <p className="disclaimer">Repères du suivi standard en France, à adapter selon les consignes de votre sage-femme.</p>
        </div>
      </div>
      {prep && <RdvPrepModal rdv={prep} onClose={() => setPrep(null)} />}
      {form && <Modal onClose={() => setForm(null)}>
        <h2 className="h3" style={{ fontSize: '1.4rem' }}>{form.id ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h2>
        <div className="grid-2 mb-2"><div><label>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div><div><label>Heure</label><input type="text" value={form.heure} onChange={e => setForm({ ...form, heure: e.target.value })} placeholder="14h30" /></div></div>
        <div className="mb-2"><label>Titre</label><input type="text" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Consultation sage-femme, Écho T3…" /></div>
        <div className="grid-2 mb-2"><div><label>Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{['Consultation', 'Échographie', 'Bilan', 'Anesthésie', 'Maternité', 'Préparation', 'Autre'].map(t => <option key={t}>{t}</option>)}</select></div><div><label>Statut</label><select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>{Object.keys(STATUTS).map(t => <option key={t}>{t}</option>)}</select></div></div>
        <div className="mb-2"><label>Lieu</label><input type="text" value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })} /></div>
        <div className="mb-3"><label>Notes</label><textarea rows="2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}><button className="btn btn-outline btn-sm" onClick={() => setForm(null)}>Annuler</button><button className="btn btn-sm" onClick={() => { if (!form.titre) return; save(d => ({ ...d, rdv: form.id ? d.rdv.map(x => x.id === form.id ? form : x) : [...d.rdv, { ...form, id: newId() }] })); setForm(null); }}>Enregistrer</button></div>
      </Modal>}
    </div>
  );
}

/* ============================================================
   PRÉPARATION (3e trimestre)
   ============================================================ */
function fmtDur(ms) { const s = Math.round(ms / 1000); return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0'); }
function useTick(on) { const [, set] = useState(0); useEffect(() => { if (!on) return; const t = setInterval(() => set(x => x + 1), 1000); return () => clearInterval(t); }, [on]); }

function Contractions() {
  const { data, save } = useApp();
  const list = data.contractions || [];
  const cur = list.length && !list[list.length - 1].end ? list[list.length - 1] : null;
  useTick(!!cur || list.length > 0);
  const now = Date.now();
  const done = list.filter(c => c.end);
  const lastHour = done.filter(c => now - c.start < 3600000);
  const intervals = lastHour.slice(1).map((c, i) => c.start - lastHour[i].start);
  const avgInt = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null;
  const avgDur = lastHour.length ? lastHour.reduce((a, c) => a + (c.end - c.start), 0) / lastHour.length : null;
  const toggle = () => save(d => { const l = [...(d.contractions || [])]; if (l.length && !l[l.length - 1].end) l[l.length - 1] = { ...l[l.length - 1], end: Date.now() }; else l.push({ start: Date.now() }); return { ...d, contractions: l.slice(-200) }; });
  const recent = [...list].reverse().slice(0, 15);
  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <button className={`big-btn${cur ? ' on' : ''}`} onClick={toggle}>{cur ? `Fin de la contraction · ${fmtDur(now - cur.start)}` : 'Début d\'une contraction'}</button>
        <div className="grid-3 mt-2">
          <div className="stat-card card-sm"><div className="stat-label">Dernière heure</div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{lastHour.length}</div></div>
          <div className="stat-card card-sm"><div className="stat-label">Intervalle moyen</div><div className="stat-value" style={{ fontSize: '1.1rem' }}>{avgInt ? fmtDur(avgInt) : '—'}</div></div>
          <div className="stat-card card-sm"><div className="stat-label">Durée moyenne</div><div className="stat-value" style={{ fontSize: '1.1rem' }}>{avgDur ? fmtDur(avgDur) : '—'}</div></div>
        </div>
        <p className="disclaimer">Suivez les consignes données par votre maternité pour savoir quand partir. En cas de perte des eaux, de saignement, de fièvre ou de baisse des mouvements du bébé : appelez la maternité sans attendre.</p>
      </div>
      <div className="card">
        <div className="row-between mb-2"><h3 className="h3" style={{ margin: 0 }}>Historique</h3>{list.length > 0 && <button className="btn btn-outline btn-sm" onClick={() => confirm('Effacer l\'historique des contractions ?') && save(d => ({ ...d, contractions: [] }))}>Effacer</button>}</div>
        {recent.length === 0 && <p className="small muted">Aucune contraction enregistrée.</p>}
        {recent.map((c, i) => { const prev = list[list.length - 2 - i]; return (
          <div key={c.start} className="kv"><span>{new Date(c.start).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span><span>{c.end ? fmtDur(c.end - c.start) : 'en cours…'}{prev ? <span className="muted small"> · {fmtDur(c.start - prev.start)} après la précédente</span> : null}</span></div>); })}
      </div>
    </div>
  );
}
function Mouvements() {
  const { data, save } = useApp();
  const [sess, setSess] = useState(null);
  useTick(!!sess);
  const hist = [...(data.mouvements || [])].reverse().slice(0, 20);
  const finish = () => { save(d => ({ ...d, mouvements: [...(d.mouvements || []), { id: newId(), start: sess.start, end: Date.now(), count: sess.count }] })); setSess(null); };
  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        {!sess ? <button className="big-btn" onClick={() => setSess({ start: Date.now(), count: 0 })}>Commencer une séance</button> : <>
          <div className="stat-value" style={{ fontSize: '4rem' }}>{sess.count}</div>
          <div className="muted mb-2">mouvements · {fmtDur(Date.now() - sess.start)}</div>
          <button className="big-btn" onClick={() => setSess(s => ({ ...s, count: s.count + 1 }))}>👣 +1</button>
          <div className="flex gap-1 mt-2" style={{ justifyContent: 'center' }}><button className="btn btn-outline btn-sm" onClick={() => setSess(s => ({ ...s, count: Math.max(0, s.count - 1) }))}>−1</button><button className="btn btn-sm" onClick={finish}>Terminer</button><button className="btn btn-outline btn-sm" onClick={() => setSess(null)}>Annuler</button></div>
          {sess.count >= 10 && <div className="alert-bar alert-info mt-2" style={{ justifyContent: 'center' }}>✓ 10 mouvements en {fmtDur(Date.now() - sess.start)}</div>}
        </>}
        <p className="disclaimer">Repère courant : ressentir le bébé bouger régulièrement chaque jour. Si vous le sentez moins bouger que d'habitude, contactez la maternité.</p>
      </div>
      <div className="card"><h3 className="h3">Séances précédentes</h3>{hist.length === 0 && <p className="small muted">Aucune séance.</p>}
        {hist.map(m => <div key={m.id} className="kv"><span>{new Date(m.start).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><span>{m.count} mvts en {fmtDur(m.end - m.start)} <button style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => save(d => ({ ...d, mouvements: d.mouvements.filter(x => x.id !== m.id) }))}>✕</button></span></div>)}
      </div>
    </div>
  );
}
function Valise() {
  const { data, save } = useApp();
  const items = data.valise || defaultValise();
  const [nv, setNv] = useState({ cat: 'Maman', label: '' });
  const set = l => save(d => ({ ...d, valise: l }));
  const cats = [...new Set(items.map(i => i.cat))];
  const n = items.filter(i => i.done).length;
  return (
    <div>
      <div className="card mb-3"><div className="row-between"><span><b>{n}</b> / {items.length} prêts</span><div className="progress-bar" style={{ flex: 1, maxWidth: 400 }}><div className="progress-fill" style={{ width: (items.length ? n / items.length * 100 : 0) + '%' }} /></div></div></div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {cats.map(c => <div key={c} className="card"><h3 className="h3">{c}</h3>
          {items.filter(i => i.cat === c).map(i => <div key={i.id} className={`check-row${i.done ? ' done' : ''}`}>
            <input type="checkbox" checked={i.done} onChange={() => set(items.map(x => x.id === i.id ? { ...x, done: !x.done } : x))} /><span className="lbl" style={{ flex: 1 }}>{i.label}</span>
            <button style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => set(items.filter(x => x.id !== i.id))}>✕</button></div>)}
        </div>)}
        <div className="card"><h3 className="h3">Ajouter</h3>
          <div className="mb-2"><select value={nv.cat} onChange={e => setNv({ ...nv, cat: e.target.value })}>{[...new Set([...cats, 'Maman', 'Bébé', 'Papa', 'Maison'])].map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="flex gap-1"><input type="text" value={nv.label} onChange={e => setNv({ ...nv, label: e.target.value })} placeholder="Élément…" onKeyDown={e => e.key === 'Enter' && nv.label && (set([...items, { id: newId(), cat: nv.cat, label: nv.label, done: false }]), setNv({ ...nv, label: '' }))} />
            <button className="btn btn-sm" onClick={() => { if (nv.label) { set([...items, { id: newId(), cat: nv.cat, label: nv.label, done: false }]); setNv({ ...nv, label: '' }); } }}>+</button></div>
        </div>
      </div>
    </div>
  );
}
function Demarches() {
  const { data, save } = useApp();
  const list = buildDemarches(data.profil).sort((a, b) => a.dueISO.localeCompare(b.dueISO));
  const done = data.demarches || {};
  const T = termeDate(data.profil);
  if (!T) return <p className="muted">Renseignez la DDR dans le profil.</p>;
  return (
    <div className="card">
      {list.map(x => {
        const d = daysBetween(new Date(), x.due);
        return (
          <div key={x.id} className={`check-row${done[x.id] ? ' done' : ''}`} style={{ alignItems: 'flex-start' }}>
            <input type="checkbox" checked={!!done[x.id]} onChange={e => save(dd => ({ ...dd, demarches: { ...(dd.demarches || {}), [x.id]: e.target.checked } }))} style={{ marginTop: 3 }} />
            <div style={{ flex: 1 }}><span className="lbl" style={{ fontWeight: 500 }}>{x.label}</span>{x.desc && <div className="small muted" style={{ lineHeight: 1.5 }}>{x.desc}</div>}</div>
            <span className="small" style={{ whiteSpace: 'nowrap', color: !done[x.id] && d < 0 ? 'var(--amber-600)' : 'var(--text-muted)' }}>{fmtDate(x.due, { day: 'numeric', month: 'short', year: '2-digit' })}</span>
          </div>
        );
      })}
      <p className="disclaimer">Dates indicatives calculées à partir du terme. Durées de congé selon les règles en vigueur en 2026 : vérifiez votre situation sur ameli.fr, caf.fr et service-public.fr.</p>
    </div>
  );
}
function PrepaTab() {
  const [sub, setSub] = useState('demarches');
  const SUBS = [['demarches', '📋 Démarches & congés'], ['valise', '🧳 Valise maternité'], ['contractions', '⏱️ Contractions'], ['mouvements', '👣 Mouvements']];
  return (
    <div>
      <h2 className="section-title">Préparer <span>l'arrivée</span></h2>
      <div className="subnav">{SUBS.map(([k, l]) => <button key={k} className={`pill${sub === k ? ' active' : ''}`} onClick={() => setSub(k)}>{l}</button>)}</div>
      {sub === 'demarches' && <Demarches />}
      {sub === 'valise' && <Valise />}
      {sub === 'contractions' && <Contractions />}
      {sub === 'mouvements' && <Mouvements />}
    </div>
  );
}

/* ============================================================
   APPLICATION
   ============================================================ */
const TABS = [
  ['home', '🏠 Accueil'], ['docs', '📄 Documents'], ['echos', '🔬 Échographies'], ['resultats', '🧪 Résultats'], ['mesures', '📈 Mesures'],
  ['agenda', '🗓️ Agenda'], ['journal', '📅 Journal'], ['ordonnances', '💊 Ordonnances'], ['prepa', '🧳 Préparation'],
];

function Gate({ msg, onLogin, onViewer }) {
  const [mode, setMode] = useState('');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(true);
  return (
    <div className="gate">
      <div className="gate-card">
        <Pampa size={64} />
        <h1 className="gate-title">BébéSuivi</h1>
        <p className="muted">Le suivi de grossesse d'Alexandra.</p>
        {mode !== 'alex' && <>
          <button className="btn gate-btn" onClick={onLogin}>Julien : se connecter avec Google</button>
          <button className="btn btn-outline gate-btn" style={{ marginTop: 0 }} onClick={() => setMode('alex')}>Accès Alexandra</button>
        </>}
        {mode === 'alex' && <form style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={e => { e.preventDefault(); pw && onViewer(pw, remember); }}>
          <label htmlFor="vpw" style={{ textAlign: 'left' }}>Mot de passe</label>
          <input id="vpw" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} autoFocus />
          <label className="flex gap-1" style={{ alignItems: 'center', fontWeight: 400 }}><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Rester connectée sur cet appareil</label>
          <button className="btn gate-btn" type="submit" disabled={!pw}>Ouvrir le suivi</button>
          <button type="button" className="side-link" style={{ textAlign: 'center' }} onClick={() => setMode('')}>Retour</button>
        </form>}
        {msg && <p className="gate-err" role="alert">{msg}</p>}
        <p className="small muted">{mode === 'alex' ? 'Tu peux tout consulter et noter ton humeur du jour.' : 'Accès réservé à Julien et Alexandra.'}</p>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [phase, setPhase] = useState(CLOUD.on ? 'boot' : 'ready');
  const [gateMsg, setGateMsg] = useState('');
  const [sync, setSync] = useState('ok');
  const [uploadsLeft, setUploadsLeft] = useState(0);
  const dirty = useRef(false), cloudTimer = useRef(null), cloudSaving = useRef(false);
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('bebe_tab') || 'home'; } catch (e) { return 'home'; } });
  const [toasts, setToasts] = useState([]);
  const [job, setJob] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [more, setMore] = useState(false);
  const latest = useRef(null), timer = useRef(null), queue = useRef([]), running = useRef(false);

  const toast = useCallback((msg, kind) => { const id = newId(); setToasts(t => [...t, { id, msg, kind }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), kind === 'err' ? 9000 : 4500); }, []);
  const cloudPush = useCallback(async () => {
    clearTimeout(cloudTimer.current);
    if (!CLOUD.on || !G.rootId || !latest.current) return;
    if (cloudSaving.current) { cloudTimer.current = setTimeout(cloudPush, 500); return; }
    cloudSaving.current = true; dirty.current = false;
    try {
      const r = await cloudSave(latest.current);
      if (r.merged) { latest.current = { ...latest.current, quotidien: r.merged.quotidien }; setData(latest.current); }
      if (r.changed) toast('Les données avaient été modifiées sur un autre appareil : la version de cet écran les remplace.', 'err');
      if (dirty.current) cloudTimer.current = setTimeout(cloudPush, 500); else setSync('ok');
    } catch (e) { dirty.current = true; setSync('error'); cloudTimer.current = setTimeout(cloudPush, 15000); }
    finally { cloudSaving.current = false; }
  }, []);
  const persist = useCallback(() => {
    if (!latest.current || G.viewer) return;
    idbPut('kv', 'state', latest.current).catch(e => toast('⚠ Échec de l\'enregistrement local : ' + e.message, 'err'));
    if (CLOUD.on && G.rootId) { dirty.current = true; setSync('pending'); clearTimeout(cloudTimer.current); cloudTimer.current = setTimeout(cloudPush, 900); }
  }, []);
  const save = useCallback(upd => {
    if (G.viewer) return viewerSave(upd);
    setData(prev => {
      const next = typeof upd === 'function' ? upd(prev) : upd;
      latest.current = next;
      try { if (next && next.apiKey != null) localStorage.setItem('bebesuivi.apikey', next.apiKey); } catch (e) {}
      if (next && next.driveFiles) driveMap = { ...next.driveFiles, ...driveMap };
      clearTimeout(timer.current); timer.current = setTimeout(persist, 300);
      return next;
    });
  }, []);
  function viewerSave(upd) {
    const prev = latest.current; const next = typeof upd === 'function' ? upd(prev) : upd;
    const t = todayISO();
    const strip = d => { const q = { ...(d.quotidien || {}) }; if (q[t]) { const { humeur, humeurAt, humeurPar, ...rest } = q[t]; q[t] = rest; } return JSON.stringify({ ...d, quotidien: q, faits: null }); };
    const hPrev = ((prev.quotidien || {})[t] || {}).humeur || '', hNext = ((next.quotidien || {})[t] || {}).humeur || '';
    if (strip(prev) !== strip(next) || hPrev === hNext) { if (strip(prev) !== strip(next)) toast('Consultation seulement : seul Julien peut modifier le suivi.'); return; }
    const q = { ...(prev.quotidien || {}), [t]: { ...((prev.quotidien || {})[t] || {}), humeur: hNext, humeurAt: new Date().toISOString(), humeurPar: 'Alexandra' } };
    latest.current = { ...prev, quotidien: q }; setData(latest.current); setSync('pending');
    viewerCall({ a: 'humeur', humeur: hNext }).then(() => { setSync('ok'); toast(hNext ? 'Humeur enregistrée : ' + hNext.toLowerCase() : 'Humeur effacée'); }).catch(e => { setSync('error'); toast('Humeur non enregistrée : ' + e.message, 'err'); });
  }
  async function viewerStart(pw, remember) {
    setGateMsg(''); setPhase('loading');
    try { const d = await viewerLogin(pw, remember); const s = normalize(d); s.apiKey = ''; latest.current = s; setData(s); setPhase('ready'); }
    catch (e) { setGateMsg(e.message); setPhase('gate'); }
  }
  useEffect(() => {
    onUploadsChange = n => setUploadsLeft(n);
    onUploaded = (id, did) => save(d => ({ ...d, driveFiles: { ...(d.driveFiles || {}), [id]: did } }));
  }, []);
  const normalize = s => {
    let k = ''; try { k = localStorage.getItem('bebesuivi.apikey') || ''; } catch (e) {}
    s = { ...INITIAL_DATA, ...s, profil: { ...INITIAL_DATA.profil, ...(s.profil || {}) } };
    s.apiKey = k || (latest.current && latest.current.apiKey) || '';
    s.documents = (s.documents || []).map(d => d.status === 'pending' ? { ...d, status: 'none' } : d);
    s.ordonnances = (s.ordonnances || []).map(d => d.status === 'pending' ? { ...d, status: 'none' } : d);
    s.seances = s.seances || {};
    Object.keys(s.seances).forEach(k => { if (s.seances[k].status === 'pending') s.seances[k] = { ...s.seances[k], status: 'none' }; });
    return s;
  };
  async function bootCloud() {
    setPhase('loading');
    try {
      const doc = await cloudConnect();
      let s;
      if (doc) s = normalize(doc);
      else { s = normalize({ ...INITIAL_DATA, firstRun: true }); }
      driveMap = { ...(s.driveFiles || {}) };
      latest.current = s; setData(s); setPhase('ready');
      if (!doc) { dirty.current = true; cloudPush(); }
      // fichiers locaux pas encore envoyés (ex. import interrompu)
      const ids = [...s.echographies.map(e => e.fileId), ...s.documents.map(x => x.fileId), ...s.ordonnances.map(x => x.fileId), ...((s.ventre || []).map(v => v.fileId)), s.rdvProof].filter(Boolean);
      for (const id of ids) if (!driveMap[id] && (await idbGet('files', id))) queueUpload(id);
      pumpUploads();
    } catch (e) { setGateMsg(e.message); setPhase('gate'); }
  }
  async function login() {
    setGateMsg(''); setPhase('loading');
    try { await cloudLogin(); await bootCloud(); } catch (e) { setGateMsg(e.message); setPhase('gate'); }
  }
  function logout() {
    if (G.viewer) { viewerSignOut(); setData(null); latest.current = null; setPhase('gate'); setShowSettings(false); return; }
    if ((dirty.current || uploadsLeft) && !confirm('Des modifications ou des fichiers sont encore en cours d\'envoi. Se déconnecter quand même ?')) return;
    cloudSignOut(); setData(null); latest.current = null; setPhase('gate'); setShowSettings(false);
  }
  useEffect(() => {
    if (!CLOUD.on) return;
    const vpw = viewerSaved();
    if (vpw) viewerStart(vpw, !!(function () { try { return localStorage.getItem(VK); } catch (e) { return null; } })());
    else if (cloudResume()) bootCloud(); else setPhase('gate');
    const onVis = async () => {
      if (document.hidden) return;
      if (G.viewer) { try { const j = await viewerCall({ a: 'data' }); if (j.mod !== G.remoteMod) { G.remoteMod = j.mod; const s = normalize(j.data); s.apiKey = ''; latest.current = s; setData(s); } } catch (e) {} return; }
      if (dirty.current || cloudSaving.current) return;
      try { const doc = await cloudFetchIfChanged(); if (doc) { const s = normalize(doc); driveMap = { ...driveMap, ...(s.driveFiles || {}) }; latest.current = s; setData(s); toast('Données mises à jour depuis l\'autre appareil'); } } catch (e) {}
    };
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('click', keepAlive, true);
    const onUnload = e => { if (G.viewer) return; if (dirty.current || cloudSaving.current || uploadQ.length || uploading) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onUnload);
    return () => { document.removeEventListener('visibilitychange', onVis); document.removeEventListener('click', keepAlive, true); window.removeEventListener('beforeunload', onUnload); };
  }, []);

  useEffect(() => { if (CLOUD.on) return; (async () => {
    try {
      let s = await idbGet('kv', 'state');
      if (!s) {
        let ls = null; try { ls = localStorage.getItem('bebe_suivi_v2'); } catch (e) {}
        if (ls) { s = await migrateData(JSON.parse(ls)); await idbPut('kv', 'state', s); setTimeout(() => toast('✓ Vos données ont été transférées vers le nouveau stockage (sans limite de taille).'), 500); }
        else s = { ...INITIAL_DATA };
      }
      s = { ...INITIAL_DATA, ...s, profil: { ...INITIAL_DATA.profil, ...(s.profil || {}) } };
      // un élément resté "en cours" lors d'une fermeture repasse à analyser
      s.documents = s.documents.map(d => d.status === 'pending' ? { ...d, status: 'none' } : d);
      s.ordonnances = s.ordonnances.map(d => d.status === 'pending' ? { ...d, status: 'none' } : d);
      Object.keys(s.seances || {}).forEach(k => { if (s.seances[k].status === 'pending') s.seances[k] = { ...s.seances[k], status: 'none' }; });
      latest.current = s; setData(s);
      try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
    } catch (e) { toast('Erreur de chargement : ' + e.message, 'err'); setData({ ...INITIAL_DATA }); }
  })(); }, []);
  useEffect(() => { const h = () => { clearTimeout(timer.current); persist(); }; window.addEventListener('beforeunload', h); window.addEventListener('pagehide', h); return () => { window.removeEventListener('beforeunload', h); window.removeEventListener('pagehide', h); }; }, []);
  useEffect(() => { try { localStorage.setItem('bebe_tab', tab); } catch (e) {} window.scrollTo(0, 0); }, [tab]);

  const setStatus = (it, status, extra) => save(d => {
    if (it.kind === 'seance') return { ...d, seances: { ...(d.seances || {}), [it.id]: { ...((d.seances || {})[it.id] || {}), status, ...(extra || {}) } } };
    return { ...d, [it.kind]: d[it.kind].map(x => x.id === it.id ? { ...x, status, ...(extra || {}) } : x) };
  });
  async function worker() {
    running.current = true;
    while (queue.current.length) {
      const it = queue.current[0];
      const d = latest.current;
      const label = it.kind === 'seance' ? 'Écho du ' + fmtShort(it.id) : ((d[it.kind].find(x => x.id === it.id) || {}).titre || (d[it.kind].find(x => x.id === it.id) || {}).nom || '');
      setJob(j => ({ ...(j || { total: 1, done: 0 }), label }));
      try {
        if (it.kind === 'seance') { const r = await analyseSeance(it.id, latest.current); setStatus(it, 'ok', r); }
        else { const item = latest.current[it.kind].find(x => x.id === it.id); if (item) { const r = await analyseDocument(item, latest.current); setStatus(it, 'ok', r); } }
      } catch (e) { setStatus(it, 'error', { erreur: e.message }); if (/401|invalid x-api-key|authentication/i.test(e.message)) { toast('Clé API refusée : vérifiez-la dans les réglages', 'err'); queue.current.forEach(q => setStatus(q, 'none')); queue.current = []; break; } }
      queue.current.shift();
      setJob(j => j ? { ...j, done: j.done + 1 } : j);
    }
    running.current = false;
    setJob(j => { if (j && j.total > 1) toast(`✓ Analyse terminée (${j.total} éléments). Pensez à actualiser le bilan sur l'accueil.`); return null; });
  }
  const enqueue = useCallback(items => {
    if (G.viewer) return toast('Consultation seulement : les analyses sont lancées par Julien.');
    if (!latest.current.apiKey) { toast('Ajoutez votre clé API dans les réglages ⚙', 'err'); setShowSettings(true); return; }
    const fresh = items.filter(it => !queue.current.some(q => q.kind === it.kind && q.id === it.id));
    if (!fresh.length) return;
    fresh.forEach(it => setStatus(it, 'pending'));
    queue.current.push(...fresh);
    setJob(j => ({ total: (j ? j.total : 0) + fresh.length, done: j ? j.done : 0, label: j ? j.label : '' }));
    if (!running.current) setTimeout(worker, 50);
  }, []);
  const pendingList = () => {
    const d = latest.current || data;
    const out = [];
    ['documents', 'ordonnances'].forEach(k => d[k].forEach(x => { if (!['ok', 'pending'].includes(x.status) && (x.fileId || (x.texte && x.texte.length > 30))) out.push({ kind: k, id: x.id }); }));
    [...new Set(d.echographies.map(e => e.seance))].forEach(k => { if (k !== 'sans-date' && !['ok', 'pending'].includes((d.seances[k] || {}).status)) out.push({ kind: 'seance', id: k }); });
    return out;
  };

  const importDocs = useCallback(async (files, listKey, forcedDate, silent) => {
    const ok = files.filter(f => isPDF(f) || isImg(f));
    if (!ok.length) { toast('Formats acceptés : PDF, JPG, PNG, WebP', 'err'); return; }
    const toAnalyse = []; let added = 0, attached = 0, skipped = 0;
    const cur = latest.current[listKey];
    const newItems = [], attach = {};
    for (const f of ok) {
      const ex = cur.find(x => x.nom === f.name);
      if (ex && ex.fileId && (!ex.size || ex.size === f.size)) { skipped++; continue; }
      const url = isPDF(f) ? await readAsDataURL(f) : await compressImage(f);
      const fileId = await putFile(url);
      if (ex && !ex.fileId) { attach[ex.id] = { fileId, size: f.size, status: 'none', legacy: false }; toAnalyse.push({ kind: listKey, id: ex.id }); attached++; continue; }
      const id = newId();
      const fd = forcedDate || folderDate(f.webkitRelativePath || '');
      newItems.push({ id, nom: f.name, size: f.size, titre: f.name.replace(/\.[^.]+$/, ''), date: fd || toISO(new Date(f.lastModified || Date.now())), dateImport: todayISO(), type: listKey === 'ordonnances' ? 'Ordonnance' : 'Inconnu', fileId, status: 'none', resultats: [], alertes: [] });
      toAnalyse.push({ kind: listKey, id }); added++;
    }
    save(d => ({ ...d, [listKey]: [...d[listKey].map(x => attach[x.id] ? { ...x, ...attach[x.id] } : x), ...newItems] }));
    if (!silent || added + attached) toast(`${added} document${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''}${attached ? `, ${attached} ancien${attached > 1 ? 's' : ''} complété${attached > 1 ? 's' : ''} avec le PDF` : ''}${skipped ? `, ${skipped} déjà présent${skipped > 1 ? 's' : ''}` : ''}.`);
    if (latest.current.apiKey && toAnalyse.length) setTimeout(() => enqueue(toAnalyse), 300);
  }, []);

  async function exportJSON() {
    try {
      toast('Préparation de la sauvegarde…');
      const d = latest.current; const files = {};
      const ids = [...d.echographies.map(e => e.fileId), ...d.documents.map(x => x.fileId), ...d.ordonnances.map(x => x.fileId), ...(d.ventre || []).map(x => x.fileId)].filter(Boolean);
      for (const id of ids) { const u = await getFile(id); if (u) files[id] = u; }
      const parts = [JSON.stringify({ ...d, apiKey: '' }).slice(0, -1), ',"__files":{'];
      Object.entries(files).forEach(([k, v], i) => parts.push((i ? ',' : '') + JSON.stringify(k) + ':' + JSON.stringify(v)));
      parts.push('}}');
      const blob = new Blob(parts, { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bebe_suivi_sauvegarde_${todayISO()}.json`;
      document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 500);
    } catch (e) { toast('Erreur export : ' + e.message, 'err'); }
  }
  async function importJSON(file) {
    if (!confirm('Restaurer cette sauvegarde ? Les données actuelles seront remplacées.')) return;
    try {
      toast('Restauration en cours…');
      const parsed = JSON.parse(await file.text());
      const m = await migrateData(parsed);
      m.apiKey = latest.current.apiKey || parsed.apiKey || '';
      m.modelDoc = latest.current.modelDoc; m.modelFast = latest.current.modelFast;
      m.driveFiles = { ...(latest.current.driveFiles || {}), ...(m.driveFiles || {}) };
      save(m); setShowSettings(false);
      if (CLOUD.on) { const ids = [...m.echographies.map(e => e.fileId), ...m.documents.map(x => x.fileId), ...m.ordonnances.map(x => x.fileId), ...(m.ventre || []).map(x => x.fileId)].filter(Boolean); ids.forEach(queueUpload); pumpUploads(); toast(`Sauvegarde restaurée. ${ids.filter(id => !driveMap[id]).length} fichiers partent vers Google Drive en arrière-plan : laissez la page ouverte.`); }
      else toast('Sauvegarde restaurée');
    } catch (e) { toast('Fichier invalide : ' + e.message, 'err'); }
  }
  function exportPDF() {
    const d = latest.current, p = d.profil; const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const clean = s => String(s || '').replace(/[’‘]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x00-\xFF]/g, '');
    let y = 20;
    const need = h => { if (y + h > 280) { doc.addPage(); y = 20; } };
    const H = t => { need(14); y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(15, 110, 86); doc.text(clean(t), 20, y); y += 7; doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(50, 50, 50); };
    const P = (t, bold) => { const lines = doc.splitTextToSize(clean(t), 170); need(lines.length * 4.4); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.text(lines, 20, y); y += lines.length * 4.4 + 1.5; };
    doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(15, 110, 86); doc.text('Dossier de grossesse', 20, y); y += 9;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    P(`${[p.prenom, p.nom].filter(Boolean).join(' ')}  |  DDR ${fmtShort(toISO(ddrEff(p)))}  |  ${fmtSA(saAt(p))} le ${fmtDate(todayISO())}  |  Terme (41 SA) ${fmtDate(termeDate(p))}  |  Groupe ${p.groupage || '-'}`);
    if (d.bilan) { H('Bilan du suivi'); P(d.bilan.resume); (d.bilan.vigilance || []).forEach(v => P('- A surveiller : ' + v)); }
    H('Documents');
    [...d.documents, ...d.ordonnances].sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(x => { P(`${fmtShort(x.date)}  (${fmtSA(itemSA(p, x))})  ${x.type || ''} - ${x.titre || x.nom}`, true); if (x.synthese) P(x.synthese); const an = anomalies(x); if (an.length) P('Hors norme : ' + an.map(r => `${r.nom} ${r.valeur} ${r.unite || ''}`).join(' ; ')); });
    const pts = collectBiometrie(d);
    if (pts.length) { H('Biométrie fœtale'); const by = {}; pts.forEach(r => { (by[r.date || r.x] = by[r.date || r.x] || { date: r.date, x: r.x, v: {} }).v[r.key] = r.y; }); Object.values(by).sort((a, b) => a.x - b.x).forEach(r => P(`${fmtShort(r.date)} (${Math.floor(r.x)} SA) : ${Object.entries(r.v).map(([k, v]) => k.toUpperCase() + ' ' + v).join('  ')}`)); }
    H('Rendez-vous'); [...d.rdv].sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(r => P(`${fmtShort(r.date)} - ${r.titre} [${r.statut}]`));
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(150);
    doc.text(clean(`Généré le ${fmtDate(todayISO())} par BébéSuivi - synthèse automatique, les documents originaux font foi.`), 20, 290);
    doc.save(`dossier_grossesse_${(saAt(p) || { sa: 0 }).sa}SA.pdf`);
  }

  if (phase === 'gate') return <Gate msg={gateMsg} onLogin={login} onViewer={viewerStart} />;
  if (!data || phase !== 'ready') return <div className="loading-screen"><div className="spinner" />{phase === 'loading' ? 'Ouverture du dossier dans Google Drive…' : 'Chargement du dossier…'}</div>;
  const ctx = { viewer: G.viewer, data, save, enqueue, job, toast, importDocs, pendingList, sync, uploadsLeft, cloud: CLOUD.on, email: G.email, isOwner: G.isOwner, logout, importJSON, openSettings: () => setShowSettings(true) };
  const cur = saAt(data.profil);
  return (
    <Ctx.Provider value={ctx}>
      <div className={`app-shell${G.viewer ? ' ro' : ''}`}>
        <aside className="side">
          <button className="brand" onClick={() => setTab('home')}><Pampa size={46} /><span className="brand-name">BébéSuivi</span><span className="brand-sub">{data.profil.prenom || 'Alexandra'}{cur ? ' · ' + fmtSA(cur) : ''}</span></button>
          <nav className="nav" aria-label="Sections">{NAV.map(([id, l]) => <button key={id} className={`nav-btn${tab === id ? ' active' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Ico name={id} />{l}</button>)}</nav>
          <div className="side-foot">
            {G.viewer && <div className="small">Consultation (Alexandra)</div>}{CLOUD.on && <div className={`sync ${uploadsLeft ? 'pending' : sync}`}><i />{sync === 'error' ? 'Drive : nouvel essai bientôt' : uploadsLeft ? `Envoi de ${uploadsLeft} fichier${uploadsLeft > 1 ? 's' : ''}…` : sync === 'pending' ? 'Enregistrement…' : 'Enregistré dans Drive'}</div>}
            <button className="side-link" onClick={exportPDF}>Exporter le dossier en PDF</button>
            {G.viewer ? <button className="side-link" onClick={logout}>Se déconnecter</button> : <button className="side-link" onClick={() => setShowSettings(true)}>Réglages{data.apiKey ? '' : ' · ajouter la clé IA'}</button>}
          </div>
        </aside>
        <div className="main">
        <div className="mobile-top">
          <button className="brand" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onClick={() => setTab('home')}><Pampa size={30} /><span className="brand-name">BébéSuivi</span></button>
          <div className="flex gap-1" style={{ alignItems: 'center' }}>{CLOUD.on && <span className={`sync ${uploadsLeft ? 'pending' : sync}`} title="État de l'enregistrement"><i /></span>}{G.viewer ? <button className="api-btn" onClick={logout}>Quitter</button> : <button className="api-btn" onClick={() => setShowSettings(true)}>Réglages</button>}</div>
        </div>
        {job && <div className="job-bar" role="status"><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /><span>Analyse {Math.min(job.done + 1, job.total)}/{job.total} · {job.label}</span><div className="progress-bar"><div className="progress-fill" style={{ width: (job.done / job.total * 100) + '%' }} /></div></div>}
        <div className="content">
          {tab === 'home' && <HomeTab go={setTab} />}
          {tab === 'docs' && <DocsTab listKey="documents" />}
          {tab === 'ordonnances' && <DocsTab listKey="ordonnances" />}
          {tab === 'echos' && <EchosTab />}
          {tab === 'resultats' && <ResultatsTab />}
          {tab === 'mesures' && <MesuresTab />}
          {tab === 'journal' && <JournalTab />}
          {tab === 'agenda' && <AgendaTab />}
          {tab === 'prepa' && <NaissanceTab />}
          {tab === 'naissance' && <NaissanceTab />}
          {tab === 'quotidien' && <QuotidienTab />}
        </div>
        </div>
        <nav className="bottom-nav" aria-label="Sections principales">
          {BOTTOM.map(id => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Ico name={id} />{(NAV.find(n => n[0] === id) || [])[1]}</button>)}
          <button className={!BOTTOM.includes(tab) ? 'active' : ''} onClick={() => setMore(true)}><Ico name="plus" />Plus</button>
        </nav>
        {more && <Modal onClose={() => setMore(false)}><h2 className="h3">Toutes les sections</h2><div className="more-sheet">{NAV.filter(n => !BOTTOM.includes(n[0])).map(([id, l]) => <button key={id} onClick={() => { setTab(id); setMore(false); }}><Ico name={id} />{l}</button>)}<button onClick={() => { exportPDF(); setMore(false); }}><Ico name="docs" />Dossier PDF</button></div></Modal>}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onExport={exportJSON} onImport={importJSON} />}
        <div className="toast-wrap">{toasts.map(t => <div key={t.id} className={`toast${t.kind === 'err' ? ' err' : ''}`}>{t.msg}</div>)}</div>
      </div>
    </Ctx.Provider>
  );
}


