// The dealer: a card shoe on a felt table for the contact section. The visitor picks where to reach
// me, the shoe deals that card face up, and the dealt card is the link.
// While the section is pinned (ScrollTrigger, like the other pinned sections), the camera moves around
// the table on the way to its resting view.
// Every clickable part is a real button or link laid over the drawing, cut to its shape.
(function () {
    "use strict";

    /* ---------- choose the dealer's setup here ---------- */

    const DEALER = {
        pick: "chips",      // how visitors pick:   "spots" four printed spots, every card stays on the table
                           //                      "chips" four chip stacks, one card on the table at a time
                           //                      "tray"  a tray with a button for each card, its logo on the face,
                           //                              one card on the table at a time
        move: "above",     // the camera move while the section is pinned:
                           //                      "above" a flat plan from overhead tips into the angled view
                           //                      "eye"   from table height up to the angled view
                           //                      "orbit" the table swings round most of a quarter turn
                           //                      "tour"  close on the shoe, along the table, then pull back
        length: "short",   // how long the section stays pinned: "short" (under a screen) or "long" (about two)
        sweep: "flick",    // chips and tray, what the last card does when another one is picked:
                           //                      "flick"   spins off the table
                           //                      "discard" flips face down onto a pile
    };
    const PIN_SCREENS = { short: .8, long: 1.8 };
    // the end of the pin where the table sits at rest before the footer comes up, longer on phones
    const PIN_HOLD = { phone: .45, wide: .2 };

    const root = document.getElementById("dealer");
    if (!root) return;
    const PICK = DEALER.pick, MOVE = DEALER.move, SWEEP = DEALER.sweep;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const NS = "http://www.w3.org/2000/svg";
    const VH = 256;                       // the drawing is 400 × 256, the table's own shape

    const section = root.closest(".contact-section");

    const tokens = getComputedStyle(document.documentElement);
    const tok = (name, fallback) => tokens.getPropertyValue(name).trim() || fallback;
    const RED = tok("--suit-red", "#EB1C24");
    const SLOT = "#2a2522";
    const INK = tok("--dark", "#161412");
    // the links come from the plain list in the markup, so they live in one place
    const SUITS = { email: ["E", "✉︎", "--accent-1", "write to me"], linkedin: ["in", "◈", "--accent-2", "open my profile"], github: ["GH", "◆", "--accent-3", "see my code"], x: ["X", "♠", "--accent-4", "follow along"] };
    const CARDS = [...root.querySelectorAll(".dealer-links a")].map(a => {
        const [v, s, accent, verb] = SUITS[a.dataset.key];
        return { key: a.dataset.key, v, s, fill: tok(accent, "#eee"), label: a.dataset.label, handle: a.dataset.handle, href: a.href, external: a.target === "_blank", verb };
    });
    root.classList.add("dealer-on");

    /* ---------- maths ---------- */

    const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const onPlane = (O, U, V) => ([a, b]) => add(O, add(mul(U, a), mul(V, b)));
    const X = [1, 0, 0], Y = [0, 1, 0];

    // an orthographic camera: azimuth θ around the table, elevation e above it.
    // θ = 45°, e = 35.26° is the isometric view the table rests in.
    const ISO = Math.atan(1 / Math.SQRT2), K = Math.sqrt(1.5);
    const cam = { theta: Math.PI / 4, elev: ISO, zoom: 1, fx: 114, fy: 99, fz: 0, dx: 0, dy: 0 };
    let ct = 0, st = 0, ce = 0, se = 0, TOW = [0, 0, 1];
    function aim() {
        ct = Math.cos(cam.theta); st = Math.sin(cam.theta); ce = Math.cos(cam.elev); se = Math.sin(cam.elev);
        TOW = [st * ce, ct * ce, se];                        // the direction towards the camera
    }
    aim();
    const P = p => {
        const xr = p[0] * ct - p[1] * st, yr = p[0] * st + p[1] * ct;
        return [K * xr, K * (yr * se - p[2] * ce)];
    };
    const facing = n => dot(n, TOW) > 0;
    const depth = p => dot(p, TOW);

    function rrect(w, h, r, n = 3) {
        const pts = [];
        for (const [cx, cy, a0] of [[w - r, r, -Math.PI / 2], [w - r, h - r, 0], [r, h - r, Math.PI / 2], [r, r, Math.PI]])
            for (let i = 0; i <= n; i++) {
                const a = a0 + i / n * Math.PI / 2;
                pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
            }
        return pts;
    }
    const ring = (c, U, V, r, n = 24) => Array.from({ length: n }, (_, i) => {
        const a = i / n * Math.PI * 2;
        return add(c, add(mul(U, Math.cos(a) * r), mul(V, Math.sin(a) * r)));
    });
    function clipB(pts, b0) {
        const out = [];
        pts.forEach((p, k) => {
            const q = pts[(k + 1) % pts.length], pin = p[1] >= b0, qin = q[1] >= b0;
            if (pin) out.push(p);
            if (pin !== qin) out.push([p[0] + (q[0] - p[0]) * (b0 - p[1]) / (q[1] - p[1]), b0]);
        });
        return out;
    }
    function hull(pts) {
        const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lo = [], hi = [];
        for (const q of p) { while (lo.length > 1 && turn(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
        for (const q of p.reverse()) { while (hi.length > 1 && turn(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
        return lo.slice(0, -1).concat(hi.slice(0, -1));
    }

    const spring = (v, k = 120, c = 18) => ({
        v, t: v, vel: 0,
        step(dt) { this.vel += (k * (this.t - this.v) - c * this.vel) * dt; this.v += this.vel * dt; },
    });
    const E = {
        io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        out: t => 1 - Math.pow(1 - t, 3),
        in: t => t * t * t,
        smooth: t => t * t * (3 - 2 * t),
    };
    const animate = (obj, to, ms, ease = E.io) => new Promise(r => {
        const from = {};
        for (const k in to) from[k] = obj[k];
        if (reduce) { Object.assign(obj, to); return r(); }
        const t0 = performance.now();
        (function f(now) {
            const k = Math.min(1, (now - t0) / ms), e = ease(k);
            for (const p in to) obj[p] = lerp(from[p], to[p], e);
            k < 1 ? requestAnimationFrame(f) : r();
        })(t0);
    });

    /* ---------- the drawing ---------- */

    const figEl = root.querySelector(".dealer-fig");
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 400 ${VH}`);
    svg.setAttribute("aria-hidden", "true");
    figEl.append(svg);
    const hitLayer = document.createElement("div");
    hitLayer.className = "dealer-hits";
    figEl.append(hitLayer);
    const g = document.createElementNS(NS, "g");
    svg.append(g);

    const items = [];
    let n = 0, base = 1, s = 1, tx = 0, ty = 0;
    const take = tag => {
        let e = items[n];
        if (!e || e.localName !== tag) {
            const m = document.createElementNS(NS, tag);
            e ? e.replaceWith(m) : g.append(m);
            e = items[n] = m;
        }
        n++;
        e.removeAttribute("display");
        return e;
    };
    const paint = (e, cls, o) => {
        e.setAttribute("class", cls);
        o.fill ? e.style.fill = o.fill : e.style.removeProperty("fill");
        o.alpha != null && o.alpha < 1 ? e.style.opacity = Math.max(0, o.alpha) : e.style.removeProperty("opacity");
    };
    const cv = {
        // the camera's focus point lands at the middle of the drawing, shifted by dx, dy
        frame() {
            aim();
            s = base * cam.zoom;
            const f = P([cam.fx, cam.fy, cam.fz]);
            tx = 200 + cam.dx - f[0] * s;
            ty = VH / 2 + cam.dy - f[1] * s;
            g.setAttribute("transform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})`);
        },
        view: p => { const q = P(p); return [q[0] * s + tx, q[1] * s + ty]; },
        path(pts, cls = "", o = {}) {
            const e = take("path");
            e.setAttribute("d", "M" + pts.map(P).map(p => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L") + (o.closed === false ? "" : "Z"));
            paint(e, cls, o);
        },
        text(str, O, U, V, size, cls = "", o = {}) {
            const e = take("text"), p = P(O), u = P(U), v = P(V);
            e.setAttribute("transform", `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${p[0]} ${p[1]})`);
            e.setAttribute("font-size", size);
            e.setAttribute("text-anchor", "middle");
            e.setAttribute("dominant-baseline", "central");
            paint(e, cls, o);
            if (e.textContent !== str) e.textContent = str;
        },
    };

    // a playing card on the plane O + aU + bV; `flip` puts the face on the other side
    function drawCard(O, U, V, info, o = {}) {
        const w = o.w, h = o.h;
        if (o.flip) { O = add(O, mul(U, w)); U = mul(U, -1); }
        const at = onPlane(O, U, V);
        const band = pts => o.b0 != null ? clipB(pts, o.b0) : pts;
        const outline = band(rrect(w, h, w * .09));
        if (outline.length < 3) return;
        const alpha = o.alpha ?? 1, face = info && facing(cross(U, V));
        cv.path(outline.map(at), o.hi ? "hi" : "", { fill: face ? info.fill : undefined, alpha });
        if (face) {
            const ink = { alpha };
            cv.text(info.v, at([w * .16, h * .11]), U, V, w * .17, "", ink);
            cv.text(info.s, at([w * .16, h * .21]), U, V, w * .11, "", ink);
            cv.text(info.v, at([w / 2, h * .44]), U, V, w * .38, "", ink);
            cv.text(info.label.toUpperCase(), at([w / 2, h * .72]), U, V, w * .1, "card-label", ink);
            cv.text(info.handle, at([w / 2, h * .84]), U, V, w * (info.handle.length > 18 ? .06 : .085), "card-handle", ink);
        } else {
            const inner = band(rrect(w - 8, h - 8, 2).map(([a, b]) => [a + 4, b + 4]));
            if (inner.length > 2) cv.path(inner.map(at), "nf lo", { alpha });
            const [shapes, red] = PIPS[o.back] || PIPS.diamond;
            for (const pts of shapes) {
                const d = band(pts.map(([a, b]) => [w / 2 + a, h / 2 + b]));
                if (d.length > 2 && (o.b0 == null || h / 2 >= o.b0)) cv.path(d.map(at), "fo", { fill: red ? RED : INK, alpha });
            }
        }
    }

    /* ---------- the table ---------- */

    const W = 46, L = 64, FRONT = 78;
    const SPOTS = [32, 94, 156, 218].map(x => [x, 166]);
    const SINGLE = [150, 160];
    const DISCARD = [44, 168];
    const CHIPS = [[100, 14], [136, 14], [100, 50], [136, 50]];
    const spots = PICK === "spots", tray = PICK === "tray";
    const TRAY_H = 3.5, BTN = 20;         // the tray's height, and its buttons' size (they sit where the chips do)
    const BTN_RISE = 1.2, TRAY_PAD = 5;   // how far a button stands up out of the tray, and the tray's margin round them

    // each card's logo on its button, in a square from -1 to 1 (y towards the front of the table)
    const circle = r => Array.from({ length: 28 }, (_, i) => [Math.cos(i / 28 * Math.PI * 2) * r, Math.sin(i / 28 * Math.PI * 2) * r]);
    const LOGOS = {
        email: [                                          // an envelope
            { pts: [[-1, -.7], [1, -.7], [1, .7], [-1, .7]], fill: true },
            { pts: [[-1, -.7], [0, .15], [1, -.7]], open: true },
        ],
        linkedin: [                                       // "in" on a rounded square
            { pts: rrect(1.8, 1.8, .35).map(([a, b]) => [a - .9, b - .9]), fill: true },
            { text: "in", at: [0, .05], size: 1.25 },
        ],
        github: [                                         // the cat's head in a disc
            { pts: circle(1), fill: true },
            { pts: [[0, .62], [-.42, .5], [-.6, .12], [-.56, -.22], [-.6, -.62], [-.28, -.46], [0, -.5], [.28, -.46], [.6, -.62], [.56, -.22], [.6, .12], [.42, .5]] },
        ],
        x: [                                              // a thin stroke under a thick one
            { pts: [[.78, -.85], [-.78, .85]], open: true },
            { pts: [[-.9, -.85], [-.4, -.85], [.9, .85], [.4, .85]], fill: true },
        ],
    };

    // the suit in the middle of a card's back, as shapes around the centre, and whether it's red
    const heart = (k, up) => Array.from({ length: 24 }, (_, i) => {
        const t = i / 24 * Math.PI * 2;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 2.6;
        return [16 * Math.sin(t) ** 3 * k, y * k * (up ? -1 : 1)];
    });
    const shift = (pts, dx, dy) => pts.map(([a, b]) => [a + dx, b + dy]);
    const PIPS = {
        heart: [[heart(.36)], true],
        diamond: [[[[0, -7], [5, 0], [0, 7], [-5, 0]]], true],
        spade: [[shift(heart(.32, true), 0, -1.2), [[0, 1], [2.4, 6.5], [-2.4, 6.5]]], false],
        club: [[shift(circle(2.7), 0, -3.2), shift(circle(2.7), -3, 1.2), shift(circle(2.7), 3, 1.2), [[0, 0], [2.2, 6.5], [-2.2, 6.5]]], false],
    };
    // each card out of the shoe gets the next suit on its back
    const BACKS = ["spade", "heart", "club", "diamond"];
    let backs = 0;

    // the shoe as a solid: its corners, and each face with its outward direction
    const SV = [[0, 0, 0], [56, 0, 0], [56, FRONT, 0], [0, FRONT, 0], [0, 0, 46], [56, 0, 46], [56, FRONT, 24], [0, FRONT, 24]];
    const SHOE = [
        { k: "top", i: [4, 5, 6, 7], n: [0, 22 / FRONT, 1] },
        { k: "front", i: [3, 2, 6, 7], n: [0, 1, 0] },
        { k: "back", i: [0, 4, 5, 1], n: [0, -1, 0] },
        { k: "right", i: [1, 5, 6, 2], n: [1, 0, 0] },
        { k: "left", i: [0, 3, 7, 4], n: [-1, 0, 0] },
    ];
    const top = (x, y, dz = 0) => [x, y, 46 - 22 * y / FRONT + dz];

    const fresh = () => ({ back: BACKS[backs++ % BACKS.length], info: null, cx: 28, cy: FRONT - L / 2, cz: 6, yaw: 0, flip: 0, alpha: 1, inShoe: true, hover: spring(0, 220, 18), link: null });
    let cur = fresh(), dealt = [], pile = [], busy = false, picked = false, hover = null, now = 0;
    const peek = spring(0, 140, 18);
    const chipLift = CARDS.map(() => spring(0, 260, 16));
    const pose = c => {
        const U0 = [Math.cos(c.yaw), Math.sin(c.yaw), 0], V0 = [-Math.sin(c.yaw), Math.cos(c.yaw), 0];
        const U = add(mul(U0, Math.cos(c.flip)), [0, 0, Math.sin(c.flip)]);
        const centre = [c.cx, c.cy, c.cz + Math.abs(Math.sin(c.flip)) * W / 2 + c.hover.v * 3];
        return [add(centre, add(mul(U, -W / 2), mul(V0, -L / 2))), U, V0];
    };
    const corners = c => { const [O, U, V] = pose(c); return [[0, 0], [W, 0], [W, L], [0, L]].map(onPlane(O, U, V)); };
    const drawOne = (c, inShoe) => {
        const [O, U, V] = pose(c);
        drawCard(O, U, V, c.info, { w: W, h: L, flip: true, back: c.back, alpha: c.alpha, hi: c.hover.v > .3, b0: inShoe ? FRONT - O[1] : undefined });
    };

    // the resting view: the whole table fitted to the drawing, in the isometric angle
    function fitRest() {
        const pts = [[-28, -20, 0], [256, -20, 0], [256, 218, 0], [-28, 218, 0], [0, 0, 50], [56, 0, 50]].map(P);
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        base = Math.min(392 / (x1 - x0), (VH - 8) / (y1 - y0));
        const f = P([cam.fx, cam.fy, cam.fz]);
        REST.dx = (f[0] - (x0 + x1) / 2) * base;
        REST.dy = (f[1] - (y0 + y1) / 2) * base;
    }

    function drawShoe() {
        const front = facing(SHOE[1].n);
        if (!front) drawOne(cur, true);
        for (const f of SHOE) {
            if (!facing(f.n)) continue;
            cv.path(f.i.map(k => SV[k]));
            if (f.k === "top") {
                cv.path([top(5, 5), top(51, 5), top(51, FRONT - 5), top(5, FRONT - 5)], "nf mid");
                for (let k = 1; k < 6; k++) {
                    const y = 5 + k * (FRONT - 10) / 6;
                    cv.path([top(8, y, -2), top(48, y, -2)], "nf lo", { closed: false });
                }
            }
            if (f.k === "front") {
                cv.path([[7, FRONT + .05, 2], [49, FRONT + .05, 2], [49, FRONT + .05, 10], [7, FRONT + .05, 10]], "", { fill: SLOT });
                const notch = [];
                for (let k = 0; k <= 10; k++) { const a = Math.PI * k / 10; notch.push([28 + Math.cos(a) * 8, FRONT + .05, 10 + Math.sin(a) * 7]); }
                cv.path(notch, "nf mid", { closed: false });
            }
        }
        if (front) drawOne(cur, true);
    }

    function drawChips(i) {
        const info = CARDS[i], c = CHIPS[i], r = 14;
        const on = hover === "chip" + i;
        const bob = !picked && !reduce ? Math.max(0, Math.sin(now * 2.4 - i * .8)) * 1.6 : 0;
        const mid = Math.atan2(TOW[1], TOW[0]);              // the side of the rim facing the camera
        let face;
        for (let k = 0; k < 3; k++) {
            const at = [c[0], c[1], k * 3.6 + (k === 2 ? chipLift[i].v * 6 + bob : 0)];
            const side = [];
            for (let j = 0; j <= 12; j++) { const a = mid - Math.PI / 2 + j / 12 * Math.PI; side.push([at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r, at[2] + 3.4]); }
            for (let j = 12; j >= 0; j--) { const a = mid - Math.PI / 2 + j / 12 * Math.PI; side.push([at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r, at[2]]); }
            cv.path(side, on ? "hi" : "", { fill: info.fill });
            face = add(at, [0, 0, 3.4]);
            cv.path(ring(face, X, Y, r), on ? "hi" : "", { fill: info.fill });
            cv.path(ring(face, X, Y, r * .7), "nf chip-line");
        }
        cv.text(info.v, face, X, Y, 10.5);
    }

    // a box standing on the table: the sides facing the camera, then the top
    function box(x0, y0, x1, y1, z0, z1, cls = "") {
        for (const [[a0, a1], [b0, b1], nrm] of [[[x0, y0], [x1, y0], [0, -1, 0]], [[x1, y0], [x1, y1], [1, 0, 0]], [[x1, y1], [x0, y1], [0, 1, 0]], [[x0, y1], [x0, y0], [-1, 0, 0]]])
            if (facing(nrm)) cv.path([[a0, a1, z0], [b0, b1, z0], [b0, b1, z1], [a0, a1, z1]], cls);
        cv.path([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], cls);
    }

    // a button pressed in by hovering or clicking, and in turn while nothing has been picked yet
    const press = i => clamp(chipLift[i].v + (!picked && !reduce ? .35 * Math.max(0, Math.sin(now * 2.4 - i * .8)) : 0), 0, 1);
    const capZ = i => TRAY_H + .3 + BTN_RISE * (1 - press(i));
    const capCorners = i => {
        const [x, y] = CHIPS[i], h = BTN / 2;
        return [TRAY_H, capZ(i)].flatMap(z => [[x - h, y - h, z], [x + h, y - h, z], [x + h, y + h, z], [x - h, y + h, z]]);
    };

    // the logo in outline, filled with the card's colour only while its button is under the pointer
    function drawMark(info, c, r, on) {
        const at = ([a, b]) => [c[0] + a * r, c[1] + b * r, c[2] + .05];
        const marks = LOGOS[info.key];
        if (!marks) return cv.text(info.v, c, X, Y, r * 1.2);
        for (const m of marks) {
            if (m.text) cv.text(m.text, at(m.at), X, Y, m.size * r);
            else cv.path(m.pts.map(at), m.open ? "nf" : "", { fill: m.fill && on ? info.fill : undefined, closed: !m.open });
        }
    }

    // the tray: a low block on the felt with each card's button set into a groove in its top
    function drawTray() {
        const h = BTN / 2, pad = TRAY_PAD;
        box(CHIPS[0][0] - h - pad, CHIPS[0][1] - h - pad, CHIPS[3][0] + h + pad, CHIPS[3][1] + h + pad, 0, TRAY_H);
        CARDS.map((_, i) => i).sort((a, b) => depth([...CHIPS[a], 0]) - depth([...CHIPS[b], 0])).forEach(i => {
            const [x, y] = CHIPS[i], z = capZ(i), on = hover === "btn" + i;
            cv.path(rrect(BTN + 2.4, BTN + 2.4, 2.5).map(([a, b]) => [x - h - 1.2 + a, y - h - 1.2 + b, TRAY_H]), "nf lo");
            box(x - h, y - h, x + h, y + h, TRAY_H, z, on ? "hi" : "mid");
            drawMark(CARDS[i], [x, y, z], h * .5, on);
        });
    }

    function draw() {
        n = 0;
        cv.frame();
        cv.path(rrect(284, 238, 20).map(([a, b]) => [a - 28, b - 20, 0]), "nf lo");
        cv.path(rrect(272, 226, 16).map(([a, b]) => [a - 22, b - 14, 0]), "nf lo", { alpha: .6 });
        cv.text("DEAL ME IN", [-12, 112, 0], [0, -1, 0], X, 12, "faint");

        if (spots) SPOTS.forEach(([x, y], i) => {
            const on = hover === "spot" + i && !dealt[i];
            const pulse = !picked && !reduce ? .55 + .45 * Math.max(0, Math.sin(now * 2.6 - i * .9)) : 1;
            cv.path(rrect(54, 72, 5).map(([a, b]) => [x - 27 + a, y - 36 + b, 0]), on ? "nf hi" : "nf mid", { alpha: on ? 1 : pulse });
            cv.text(CARDS[i].label.toUpperCase(), [x, y, 0], X, Y, 7.5, on ? "spot-on" : "faint", { alpha: pulse });
        });
        else {
            cv.path(rrect(58, 76, 5).map(([a, b]) => [SINGLE[0] - 29 + a, SINGLE[1] - 38 + b, 0]), "nf lo");
            if (SWEEP === "discard") {
                cv.path(rrect(54, 72, 5).map(([a, b]) => [DISCARD[0] - 27 + a, DISCARD[1] - 36 + b, 0]), "nf lo", { alpha: .7 });
                if (!pile.length) cv.text("DISCARD", [DISCARD[0], DISCARD[1], 0], X, Y, 7, "faint");
            }
        }

        // everything standing on the felt, back to front for wherever the camera is
        const stand = [{ d: depth([28, 39, 15]), f: drawShoe }];
        if (tray) stand.push({ d: depth([118, 32, 4]), f: drawTray });
        else if (!spots) CHIPS.forEach((c, i) => stand.push({ d: depth([c[0], c[1], 5]), f: () => drawChips(i) }));
        for (const c of [...pile.slice(-8), ...dealt]) if (c) stand.push({ d: depth([c.cx, c.cy, 0]) + c.cz * 5, f: () => drawOne(c) });
        stand.sort((a, b) => a.d - b.d).forEach(x => x.f());

        for (let k = n; k < items.length; k++) items[k].setAttribute("display", "none");
    }

    /* ---------- hit areas: real buttons and links over the drawing ---------- */

    const hits = [];
    function hit(tag, label, key, poly, onPick) {
        const el = document.createElement(tag);
        el.className = "dealer-hit";
        el.setAttribute("aria-label", label);
        if (tag === "button") el.type = "button";
        el.addEventListener("pointerenter", () => { hover = key; });
        el.addEventListener("pointerleave", () => { if (hover === key) hover = null; });
        el.addEventListener("focus", () => { hover = key; });
        el.addEventListener("blur", () => { if (hover === key) hover = null; });
        if (onPick) el.addEventListener("click", onPick);
        hitLayer.append(el);
        const h = { el, poly, key };
        hits.push(h);
        return h;
    }
    function placeHits() {
        const k = figEl.clientWidth / 400;
        for (const h of hits) {
            const pts = h.poly().map(p => [p[0] * k, p[1] * k]);
            const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
            const x0 = Math.min(...xs), y0 = Math.min(...ys);
            Object.assign(h.el.style, {
                left: x0 + "px", top: y0 + "px",
                width: Math.max(...xs) - x0 + "px", height: Math.max(...ys) - y0 + "px",
                clipPath: `polygon(${pts.map(p => `${(p[0] - x0).toFixed(1)}px ${(p[1] - y0).toFixed(1)}px`).join(",")})`,
            });
        }
    }
    const unhit = h => { h.el.remove(); hits.splice(hits.indexOf(h), 1); if (hover === h.key) hover = null; };

    const hint = root.querySelector(".dealer-hint");
    const say = t => { hint.textContent = t; };

    // a dealt card becomes the link itself
    function linkCard(c) {
        const info = c.info;
        const h = hit("a", `${info.label}: ${info.handle}${info.external ? ", opens in a new tab" : ""}`, "card-" + info.key, () => corners(c).map(cv.view));
        h.el.href = info.href;
        if (info.external) { h.el.target = "_blank"; h.el.rel = "noopener noreferrer"; }
        h.el.addEventListener("pointerenter", () => { c.hover.t = 1; });
        h.el.addEventListener("pointerleave", () => { c.hover.t = 0; });
        h.el.addEventListener("focus", () => { c.hover.t = 1; });
        h.el.addEventListener("blur", () => { c.hover.t = 0; });
        c.link = h;
    }

    // the card already on the table makes way for the new one
    function retire(c) {
        if (c.link) unhit(c.link);
        c.hover.t = 0;
        dealt = dealt.filter(d => d !== c);
        pile.push(c);
        if (SWEEP === "flick") {
            // flicked off the far edge of the table with a spin
            return animate(c, { cx: c.cx + 230, cy: c.cy - 150, cz: 14, yaw: c.yaw + 2.6 }, 420, E.in)
                .then(() => { pile = pile.filter(p => p !== c); });
        }
        // turned face down and slid onto the discard pile
        const k = pile.length - 1;
        return animate(c, { cx: DISCARD[0] + (Math.random() - .5) * 4, cy: DISCARD[1] + (Math.random() - .5) * 4, cz: .6 + Math.min(k, 7) * .7, yaw: (Math.random() - .5) * .5, flip: Math.PI * 2 }, 460, E.io);
    }

    async function deal(i, at, yaw, index) {
        if (busy) return;
        busy = true;
        picked = true;
        const info = CARDS[i];
        say(`Dealing ${info.label}…`);
        if (!spots) dealt.slice().forEach(retire);
        const c = cur;
        c.info = info;
        await animate(c, { cy: FRONT + L / 2 + 4 }, 240, E.in);
        c.inShoe = false;
        if (spots) dealt[index] = c; else dealt.push(c);
        cur = fresh();
        cur.alpha = 0;
        peek.v = 0;
        await animate(c, { cx: at[0], cy: at[1], cz: .6, yaw }, 460, E.out);
        await animate(c, { flip: Math.PI }, 400);
        linkCard(c);
        animate(cur, { alpha: 1 }, 250);
        say(`${info.label} · click the card to ${info.verb}`);
        busy = false;
    }

    if (!spots) CARDS.forEach((info, i) => {
        const [x, y] = CHIPS[i];
        // chips lift as they're picked, buttons press in
        const h = hit("button", `Deal the ${info.label} card`, (tray ? "btn" : "chip") + i, tray ? () => hull(capCorners(i).map(cv.view)) : () => {
            const pts = [];
            for (const z of [0, 7.2 + 3.4 + chipLift[i].v * 6]) for (const p of ring([x, y, z], X, Y, 14, 16)) pts.push(cv.view(p));
            return hull(pts);
        }, async () => {
            chipLift[i].t = 1;
            setTimeout(() => { chipLift[i].t = 0; }, 260);
            await deal(i, SINGLE, -.32);
        });
        h.el.addEventListener("pointerenter", () => { chipLift[i].t = tray ? .3 : .5; });
        h.el.addEventListener("pointerleave", () => { chipLift[i].t = 0; });
    });
    else CARDS.forEach((info, i) => {
        const [x, y] = SPOTS[i];
        const h = hit("button", `Deal the ${info.label} card`, "spot" + i,
            () => [[x - 27, y - 36, 0], [x + 27, y - 36, 0], [x + 27, y + 36, 0], [x - 27, y + 36, 0]].map(cv.view),
            async () => {
                if (dealt[i]) return;
                await deal(i, SPOTS[i], (i - 1.5) * .04, i);
                h.el.hidden = true;
            });
    });

    say(spots ? "Pick a spot on the table." : tray ? "Press a button and I'll deal you a card." : "Pick a chip and I'll deal you a card.");

    /* ---------- the camera move while the section is pinned ---------- */

    const deg = d => d * Math.PI / 180;
    const REST = { theta: deg(45), elev: ISO, zoom: 1, fx: 114, fy: 99, fz: 0, dx: 0, dy: 0 };
    fitRest();
    // keyframes along the pinned scroll; each one only overrides what changes, the rest stays at rest
    const MOVES = {
        // the table turns most of a quarter turn under you, rising slightly to the angled view
        orbit: [
            [0, { theta: deg(125), elev: deg(28), zoom: .92 }],
            [.5, { theta: deg(80), elev: deg(32), zoom: .98 }],
            [1, {}],
        ],
        // a flat, square plan view from straight above that tips and turns into the angled one
        above: [
            [0, { theta: 0, elev: deg(86), zoom: .78 }],
            [.45, { theta: deg(20), elev: deg(62), zoom: .86 }],
            [1, {}],
        ],
        // close on the shoe's mouth, along to the chips (or spots), down to where cards land, then back out
        tour: spots ? [
            [0, { zoom: 2.4, fx: 28, fy: 84, fz: 8, dx: 0, dy: 10 }],
            [.3, { zoom: 2.1, fx: 60, fy: 166, fz: 0, dx: 0, dy: 0 }],
            [.62, { zoom: 2.1, fx: 190, fy: 166, fz: 0, dx: 0, dy: 0 }],
            [1, {}],
        ] : [
            [0, { zoom: 2.4, fx: 28, fy: 84, fz: 8, dx: 0, dy: 10 }],
            [.3, { zoom: 2.3, fx: 118, fy: 32, fz: 6, dx: 0, dy: 0 }],
            [.62, { zoom: 2.1, fx: 150, fy: 160, fz: 0, dx: 0, dy: 0 }],
            [1, {}],
        ],
        // from down at table height, where the shoe looms, up to the angled view
        eye: [
            [0, { elev: deg(6), zoom: 1.5, fx: 60, fy: 60, fz: 20, theta: deg(35) }],
            [.5, { elev: deg(18), zoom: 1.2, theta: deg(40) }],
            [1, {}],
        ],
    };
    const KEYS = Object.keys(REST);
    const track = (MOVES[MOVE] || MOVES.orbit).map(([t, o]) => [t, { ...REST, ...o }]);
    function moveTo(p) {
        let i = 0;
        while (i < track.length - 2 && p > track[i + 1][0]) i++;
        const [t0, a] = track[i], [t1, b] = track[i + 1];
        const k = E.smooth(clamp((p - t0) / (t1 - t0 || 1), 0, 1));
        for (const key of KEYS) cam[key] = lerp(a[key] ?? REST[key], b[key] ?? REST[key], k);
    }

    // 0 until the section pins, running to 1 by the end of the pin; with no pin the table just rests
    let target = 1;
    if (!reduce && section && window.gsap && window.ScrollTrigger) {
        target = 0;
        gsap.registerPlugin(ScrollTrigger);
        const phone = matchMedia("(max-width: 768px)");
        const hold = () => phone.matches ? PIN_HOLD.phone : PIN_HOLD.wide;
        ScrollTrigger.create({
            trigger: section,
            // a section taller than the screen pins once its bottom is in view, so nothing is cut off
            start: () => section.offsetHeight > innerHeight ? "bottom bottom" : "top top",
            // the move keeps its length and the hold is added after it
            end: () => "+=" + innerHeight * (PIN_SCREENS[DEALER.length] || PIN_SCREENS.short) / (1 - hold()),
            pin: true,
            refreshPriority: -1,           // the last section on the page: measure it after the pins above
            onUpdate: self => { target = Math.min(1, self.progress / (1 - hold())); },
        });
    }
    let sp = target;

    /* ---------- loop ---------- */

    let last = 0, visible = false;
    figEl.addEventListener("pointermove", e => {
        const r = figEl.getBoundingClientRect();
        figEl._ptr = [(e.clientX - r.left) / r.width * 400, (e.clientY - r.top) / r.height * VH];
    });
    figEl.addEventListener("pointerleave", () => { figEl._ptr = null; });

    function frame(t) {
        const dt = Math.min(1 / 30, (t - last) / 1000 || 0);
        last = t;
        now += dt;
        sp += (target - sp) * Math.min(1, dt * 8);            // follow the scroll, smoothed
        moveTo(sp);
        const p = figEl._ptr, m = cv.view([28, FRONT, 6]);
        const near = p ? clamp(1 - Math.hypot(p[0] - m[0], p[1] - m[1]) / 120, 0, 1) : 0;
        if (!busy) peek.t = near * 18;
        peek.step(dt);
        if (cur.inShoe && !busy) cur.cy = FRONT - L / 2 + peek.v;
        for (const c of chipLift) c.step(dt);
        for (const c of [cur, ...dealt, ...pile]) if (c) c.hover.step(dt);
        draw();
        placeHits();
        if (visible) requestAnimationFrame(frame);
    }

    new IntersectionObserver(([e]) => {
        const was = visible;
        visible = e.isIntersecting;
        if (!visible || was) return;
        last = performance.now();
        frame(last);
    }, { rootMargin: "20% 0px" }).observe(figEl);
    addEventListener("resize", placeHits);
})();
