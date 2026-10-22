// The 3D badge: three.js draws it, a small Verlet solver swings it.
// about.js only imports this on wide screens with motion allowed, and only
// as About comes close, so three.js (~167 KB gzipped) never slows the first
// load. The loop sleeps whenever the badge is off screen or has come to
// rest, and wakes when it's touched or the role changes.
import { CARD_W, CARD_H, SLOT, paintFront, paintBack, cardGround } from "./badge-card.js";

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// host: the whole stage; the canvas covers it (so a thrown card isn't cut
// off at the column's edge) but lets clicks through to the copy, and only a
// press that lands on the card grabs it. column: where the card hangs.
// cards: one per role (readCard). parked: wait above the stage until drop().
// Resolves to null when three.js can't load or WebGL is off, so the flat
// badge stays.
export async function createBadge3D(host, column, cards, logo, { parked = false } = {}) {
    let THREE;
    try {
        THREE = await import(THREE_URL);
    } catch {
        return null;
    }

    const canvas = document.createElement("canvas");
    canvas.className = "id-gl";
    canvas.setAttribute("aria-hidden", "true");
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
        return null;
    }
    host.appendChild(canvas);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3532, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(2.5, 4, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
    scene.add(sun);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.45 }));
    wall.position.z = -1.4;
    wall.receiveShadow = true;
    scene.add(wall);

    // ─── The card: two painted faces, an edge, the clip and ring ─
    // the faces' canvas is also their emissive map, so the colours stay true
    const TEX_W = 1024, TEX_H = Math.round(TEX_W / 0.68);
    const makeFace = () => {
        const cv = Object.assign(document.createElement("canvas"), { width: TEX_W, height: TEX_H });
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const mat = new THREE.MeshStandardMaterial({
            map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.45,
            roughness: 0.42, metalness: 0, alphaTest: 0.5
        });
        return { cv, tex, mat };
    };
    const front = makeFace(), back = makeFace();

    const CW = 1.8, CH = CW / 0.68, CLIP = 0.42, CY = -0.2;
    const card = new THREE.Group();
    card.matrixAutoUpdate = false;
    scene.add(card);
    const faceGeo = new THREE.PlaneGeometry(CW, CH);
    const frontMesh = new THREE.Mesh(faceGeo, front.mat);
    frontMesh.position.z = 0.006;
    const backMesh = new THREE.Mesh(faceGeo, back.mat);
    backMesh.rotation.y = Math.PI;
    backMesh.position.z = -0.006;
    for (const [m, f] of [[frontMesh, front], [backMesh, back]]) {
        m.castShadow = true;
        m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: f.tex, alphaTest: 0.5 });
    }
    // the slot, in card units below the top edge
    const slotTop = (SLOT.top / CARD_W) * CW, slotBottom = (SLOT.bottom / CARD_W) * CW;
    // the edge fills the gap between the faces, stopping short of the slot
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xece4d6, roughness: 0.6 });
    const edgeTop = CH / 2 - slotBottom - 0.03, edgeBottom = -CH / 2 + 0.06;
    const edge = new THREE.Mesh(new THREE.BoxGeometry(CW - 0.12, edgeTop - edgeBottom, 0.011), edgeMat);
    edge.position.y = (edgeTop + edgeBottom) / 2;
    // the ring crosses the card's plane only at its top (above the card) and its
    // bottom (inside the slot); turned 0.6 rad so it reads as a loop, not a line
    const metal = new THREE.MeshStandardMaterial({ color: 0xbdb6ad, metalness: 0.55, roughness: 0.32 });
    const RING_R = 0.12;
    const ringY = CH / 2 - (slotTop + slotBottom) / 2 + RING_R;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.014, 12, 40), metal);
    ring.rotation.y = 0.6;
    ring.position.y = ringY;
    // the clip hangs off the top of the ring on a short stem
    const clipBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.07), metal);
    clipBody.position.y = CH / 2 + CLIP - 0.08;
    const stemBottom = ringY + RING_R - 0.01, stemTop = CH / 2 + CLIP - 0.16;
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, stemTop - stemBottom, 10), metal);
    hook.position.y = (stemTop + stemBottom) / 2;
    for (const m of [clipBody, hook, ring]) m.castShadow = true;
    card.add(frontMesh, backMesh, edge, clipBody, hook, ring);

    // ─── Straps: camera-facing ribbons with the stitched wine texture ─
    const strapCv = Object.assign(document.createElement("canvas"), { width: 64, height: 128 });
    {
        const g = strapCv.getContext("2d");
        g.fillStyle = "#662020";
        g.fillRect(0, 0, 64, 128);
        g.fillStyle = "rgba(244, 239, 230, 0.32)";
        for (let y = 0; y < 128; y += 16) { g.fillRect(8, y, 2, 8); g.fillRect(54, y, 2, 8); }
    }
    const strapTex = new THREE.CanvasTexture(strapCv);
    strapTex.colorSpace = THREE.SRGBColorSpace;
    strapTex.wrapT = THREE.RepeatWrapping;
    const strapMat = new THREE.MeshStandardMaterial({ map: strapTex, roughness: 0.85, side: THREE.DoubleSide });
    const STRAP_HALF = 0.08, SAMPLES = 56;
    const makeStrap = (length) => {
        const pos = new Float32Array(SAMPLES * 6), uv = new Float32Array(SAMPLES * 4), idx = [];
        const rep = length / (STRAP_HALF * 4);
        for (let i = 0; i < SAMPLES; i++) {
            const v = (i / (SAMPLES - 1)) * rep;
            uv.set([0, v, 1, v], i * 4);
            if (i < SAMPLES - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        geo.setIndex(idx);
        const mesh = new THREE.Mesh(geo, strapMat);
        mesh.castShadow = true;
        mesh.frustumCulled = false;
        scene.add(mesh);
        return { geo, pos };
    };
    const Z = new THREE.Vector3(0, 0, 1), tan = new THREE.Vector3(), side = new THREE.Vector3();
    const updateStrap = (strap, rope) => {
        const curve = new THREE.CatmullRomCurve3(rope.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
        const pts = curve.getPoints(SAMPLES - 1);
        for (let i = 0; i < SAMPLES; i++) {
            tan.subVectors(pts[Math.min(SAMPLES - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
            side.crossVectors(tan, Z);
            if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
            side.normalize().multiplyScalar(STRAP_HALF);
            const p = pts[i];
            strap.pos.set([p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z], i * 6);
        }
        strap.geo.attributes.position.needsUpdate = true;
        strap.geo.computeVertexNormals();
    };

    // ─── Physics: the card is seven points held rigid, each strap a chain ─
    const P = [], L = [], ropes = [], straps = [];
    const pt = (x, y, z, w) => { const p = { x, y, z, px: x, py: y, pz: z, w, w0: w, rx: x, ry: y, rz: z }; P.push(p); return p; };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    const K = pt(0, CY + CH / 2 + CLIP, 0, 0.5);
    const TL = pt(-CW / 2, CY + CH / 2, 0, 0.2), TR = pt(CW / 2, CY + CH / 2, 0, 0.2);
    const BL = pt(-CW / 2, CY - CH / 2, 0, 0.2), BR = pt(CW / 2, CY - CH / 2, 0, 0.2);
    const C = pt(0, CY, 0, 0.2), N = pt(0, CY, 0.35, 0.2);
    const body = [K, TL, TR, BL, BR, C, N];
    for (let i = 0; i < body.length; i++)
        for (let j = i + 1; j < body.length; j++) L.push({ a: body[i], b: body[j], r: dist(body[i], body[j]), slack: false });
    for (const s of [-1, 1]) {
        const A = pt(s * 0.75, 7, 0, 0);
        const n = 16, seg = dist(A, K) / (n + 1), rope = [A];
        let prev = A;
        for (let i = 1; i <= n; i++) {
            const t = i / (n + 1);
            const p = pt(A.x + (K.x - A.x) * t, A.y + (K.y - A.y) * t, 0, 1);
            L.push({ a: prev, b: p, r: seg, slack: true });
            rope.push(p);
            prev = p;
        }
        L.push({ a: prev, b: K, r: seg, slack: true });
        rope.push(K);
        ropes.push(rope);
        straps.push(makeStrap(dist(A, K)));
    }

    // tuned offline so a role change or the entrance settles, and the loop
    // sleeps, about five seconds later
    const DT = 1 / 120, G = 16, DAMP = 0.994, CALM_DAMP = 0.97, SPIN_DAMP = 0.008, ITER = 12, FACE_PULL = 14, ROLE_SPIN = 16;
    let grab = null, calm = false;

    // one substep; returns how far the card moved, to tell when it has settled
    const step = () => {
        const damp = calm ? CALM_DAMP : DAMP;
        for (const p of P) {
            if (!p.w) continue;
            const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp, vz = (p.z - p.pz) * damp;
            p.px = p.x; p.py = p.y; p.pz = p.z;
            p.x += vx; p.y += vy - G * DT * DT; p.z += vz;
        }
        // a little drag on the card's turning, so it settles instead of rocking
        const cvx = C.x - C.px, cvy = C.y - C.py, cvz = C.z - C.pz;
        for (const p of body) {
            if (p === C || !p.w) continue;
            p.px += (p.x - p.px - cvx) * SPIN_DAMP;
            p.py += (p.y - p.py - cvy) * SPIN_DAMP;
            p.pz += (p.z - p.pz - cvz) * SPIN_DAMP;
        }
        // a gentle twist that turns the face back toward you, even from fully round
        const yaw = Math.atan2(N.x - C.x, N.z - C.z);
        const push = clamp(yaw, -1, 1) * FACE_PULL * DT * DT;
        const tx = -Math.cos(yaw) * push, tz = Math.sin(yaw) * push;
        N.x += tx; N.z += tz;
        if (C.w) { C.x -= tx; C.z -= tz; }
        if (grab) {
            C.px = C.x; C.py = C.y; C.pz = C.z;
            C.x += (grab.tx - C.x) * 0.4;
            C.y += (grab.ty - C.y) * 0.4;
            C.z += (grab.tz - C.z) * 0.4;
        }
        for (let k = 0; k < ITER; k++) {
            for (const c of L) {
                const a = c.a, b = c.b;
                const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
                const d = Math.hypot(dx, dy, dz) || 1e-6;
                if (c.slack && d <= c.r) continue;
                const ws = a.w + b.w;
                if (!ws) continue;
                const f = (d - c.r) / (d * ws);
                a.x += dx * f * a.w; a.y += dy * f * a.w; a.z += dz * f * a.w;
                b.x -= dx * f * b.w; b.y -= dy * f * b.w; b.z -= dz * f * b.w;
            }
        }
        let moved = 0;
        for (const p of body) moved += Math.abs(p.x - p.px) + Math.abs(p.y - p.py) + Math.abs(p.z - p.pz);
        return moved;
    };

    const ax = new THREE.Vector3(), ay = new THREE.Vector3(), az = new THREE.Vector3();
    const pose = () => {
        ax.set(TR.x - TL.x, TR.y - TL.y, TR.z - TL.z).normalize();
        ay.set(TL.x - BL.x, TL.y - BL.y, TL.z - BL.z);
        az.crossVectors(ax, ay).normalize();
        ay.crossVectors(az, ax);
        card.matrix.makeBasis(ax, ay, az).setPosition(C.x, C.y, C.z);
        card.matrixWorldNeedsUpdate = true;
        return az.z;
    };

    // spin the card about its upright axis
    const spin = (s) => {
        for (const p of body) {
            if (!p.w) continue;
            p.px -= s * (p.z - C.z) * DT;
            p.pz += s * (p.x - C.x) * DT;
        }
    };

    // back to hanging at rest, or lifted out of sight above the stage
    const place = (lift) => {
        for (const p of P) {
            if (!p.w) continue;
            p.x = p.px = p.rx;
            p.y = p.py = p.ry + lift;
            p.z = p.pz = p.rz;
        }
    };

    let shown = -1, swapTo = null, swapAt = 0;
    const dress = (i, faces) => {
        const c = cards[i];
        if (faces !== "back") { paintFront(front.cv, c); front.tex.needsUpdate = true; shown = i; }
        if (faces !== "front") { paintBack(back.cv, c, logo); back.tex.needsUpdate = true; edgeMat.color.set(cardGround(c)); }
    };

    const draw = () => {
        pose();
        straps.forEach((s, i) => updateStrap(s, ropes[i]));
        renderer.render(scene, camera);
    };

    // ─── Loop: runs only while visible and moving ─────────────
    let raf = 0, last = 0, acc = 0, still = 0, visible = false;
    const rest = { cx: 0, cy: 0, nx: 0, nz: 0 };   // where the card was when it last moved

    const frame = (now) => {
        raf = 0;
        acc += Math.min(0.05, (now - last) / 1000 || 0);
        last = now;
        let n = 0, moved = 0;
        while (acc >= DT && n < 8) { moved += step(); acc -= DT; n++; }
        const facing = pose();
        if (swapTo !== null && (facing < -0.2 || now - swapAt > 900)) { dress(swapTo, "front"); swapTo = null; }
        straps.forEach((s, i) => updateStrap(s, ropes[i]));
        renderer.render(scene, camera);
        // once only a gentle drift is left, damp it harder so it eases to a
        // stop in about a second instead of swaying for ten
        calm = !grab && swapTo === null && moved / Math.max(n, 1) < 0.01;
        // asleep once the card hasn't really moved (under about half a pixel,
        // ignoring the solver's jitter) for half a second, facing you; it can
        // pause for a moment balanced side- or back-on before turning round
        const shift = Math.abs(C.x - rest.cx) + Math.abs(C.y - rest.cy) + Math.abs(N.x - rest.nx) + Math.abs(N.z - rest.nz);
        if (grab || swapTo !== null || facing < 0.95 || shift > 0.004) {
            still = 0;
            rest.cx = C.x; rest.cy = C.y; rest.nx = N.x; rest.nz = N.z;
        } else {
            still++;
        }
        if (visible && still < 30) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
        still = 0;
        calm = false;
        if (parked || !visible || raf) return;
        last = performance.now();
        acc = 0;
        raf = requestAnimationFrame(frame);
    };

    const sleep = () => {
        cancelAnimationFrame(raf);
        raf = 0;
    };

    // sizing: the card is sized to the column (backing off when it's narrow)
    // and the camera slides sideways so it hangs in the column's middle
    let halfH = 2.4, halfW = 2;
    const resize = () => {
        const w = host.clientWidth, h = host.clientHeight;
        const box = host.getBoundingClientRect(), col = column.getBoundingClientRect();
        if (!w || !h || !col.width) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const z = 9 * Math.max(1, 0.6 / (col.width / h));
        halfH = z * Math.tan(THREE.MathUtils.degToRad(15));
        halfW = halfH * camera.aspect;
        const shift = (col.left + col.width / 2) - (box.left + w / 2);
        camera.position.set((-shift * 2 * halfH) / h, 0, z);
        camera.updateProjectionMatrix();
        if (!raf) draw();
    };
    const sizer = new ResizeObserver(resize);
    sizer.observe(host);

    const seen = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
        else sleep();
    });
    seen.observe(host);

    // ─── Dragging: grab the card where you touch it ───────────
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hitPt = new THREE.Vector3();
    const targets = [frontMesh, backMesh];
    const aim = (e) => {
        const r = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
    };
    const hit = (e) => { aim(e); return ray.intersectObjects(targets, false)[0]; };
    const onPlane = (z) => {
        const o = ray.ray.origin, d = ray.ray.direction;
        return hitPt.copy(d).multiplyScalar((z - o.z) / d.z).add(o);
    };

    const onDown = (e) => {
        if (parked || e.button > 0) return;
        const h = hit(e);
        if (!h) return;
        e.preventDefault();
        grab = { id: e.pointerId, z: h.point.z, dx: C.x - h.point.x, dy: C.y - h.point.y, tx: C.x, ty: C.y, tz: C.z };
        C.w = 0;
        host.style.cursor = "grabbing";
        wake();
        try { host.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    };
    const onMove = (e) => {
        if (grab && e.pointerId === grab.id) {
            aim(e);
            const p = onPlane(grab.z);
            const cx = camera.position.x;
            grab.tx = clamp(p.x + grab.dx, cx - halfW + 0.5, cx + halfW - 0.5);
            grab.ty = clamp(p.y + grab.dy, -halfH + 0.7, halfH - 0.2);
        } else if (!grab && e.pointerType === "mouse") {
            host.style.cursor = !parked && hit(e) ? "grab" : "";
        }
    };
    const onUp = (e) => {
        if (!grab || e.pointerId !== grab.id) return;
        grab = null;
        C.w = C.w0;
        const vx = C.x - C.px, vy = C.y - C.py, m = Math.hypot(vx, vy), cap = 0.16;
        if (m > cap) { C.px = C.x - (vx * cap) / m; C.py = C.y - (vy * cap) / m; }
        host.style.cursor = "";
    };
    // a touch that lands on the card holds it instead of scrolling the page;
    // anywhere else the page scrolls as usual
    const onTouch = (e) => {
        const t = e.touches[0];
        if (!parked && t && hit(t)) e.preventDefault();
    };
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.addEventListener("touchstart", onTouch, { passive: false });

    resize();
    if (parked) place(6);

    return {
        // hang the card at rest showing role i, no entrance
        show(i) {
            parked = false;
            place(0);
            dress(i);
            swapTo = null;
            draw();
            wake();
        },
        // the entrance: drops in from above with a slow twist
        drop(i) {
            parked = false;
            if (shown !== i) dress(i);
            place(2.6);
            spin(3.5);
            wake();
        },
        // turn round to role i; the face changes while it's turned away
        setRole(i, dir) {
            if (parked) { dress(i); return; }
            dress(i, "back");
            swapTo = i;
            swapAt = performance.now();
            spin(dir * ROLE_SPIN);
            wake();
        },
        destroy() {
            sleep();
            sizer.disconnect();
            seen.disconnect();
            host.removeEventListener("pointerdown", onDown);
            host.removeEventListener("pointermove", onMove);
            host.removeEventListener("pointerup", onUp);
            host.removeEventListener("pointercancel", onUp);
            host.removeEventListener("touchstart", onTouch);
            host.style.cursor = "";
            renderer.dispose();
            canvas.remove();
        }
    };
}
