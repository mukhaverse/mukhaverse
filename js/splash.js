// Drafting-sheet splash: the signature is drawn on a grid while the page loads.
// Runs at the top of <body> so it paints before the rest of the page.
// Once per tab session; a click or key skips it; static for reduced motion.
// hero.js holds its intro until "splash:done".
(function () {
    try {
        if (sessionStorage.getItem("splash-seen")) return;
        sessionStorage.setItem("splash-seen", "1");
    } catch (e) {}

    const root = document.documentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const T = reduce ? 0 : 1;           // scales every delay/duration
    const MIN = 3400, CAP = 8000;       // never leave before the ink is done, never trap anyone

    // signature traced from the scan, in its own coordinates
    const SIG = [
        { d: "M487,291 C500,306 545,302 546,268 C547,232 470,226 400,244 C330,262 296,292 318,316 C345,345 520,352 600,378 C648,394 668,420 664,448 C659,482 600,522 560,558 C522,592 498,616 528,618 C566,620 676,532 752,482 C746,520 728,572 752,588 C772,600 900,582 976,578", w: 8 },
        { d: "M932,124 L218,706", w: 7 },
        { d: "M220,704 L505,590", w: 2.5 },
        { d: "M740,296 C690,350 610,440 532,540", w: 2.5 },
        { d: "M860,540 L908,490 C916,512 932,526 958,532", w: 8 },
    ];
    const DOT = { x: 203, y: 812, r: 4.5 };
    const VB = { x: 180, y: 100, w: 820, h: 740 };

    const WINE = "#662020", INK = "#161412", ACC = "rgba(102,32,32,.38)";
    const NS = "http://www.w3.org/2000/svg";
    const el = (tag, attrs, parent) => {
        const e = document.createElementNS(NS, tag);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.append(e);
        return e;
    };
    const line = (parent, d, w = 1, stroke = WINE) => el("path", { d, fill: "none", stroke, "stroke-width": w }, parent);
    const fadeIn = (node, delay, dur = 300) =>
        node.animate([{ opacity: 0 }, { opacity: 1 }], { delay: delay * T, duration: dur * T, fill: "both" });
    const draw = (node, delay, dur, easing = "cubic-bezier(.37,0,.63,1)") => {
        node.setAttribute("pathLength", 1);
        node.style.strokeDasharray = "1 2";
        node.animate(
            [{ strokeDashoffset: 1, opacity: 0 }, { opacity: 1, offset: .001 }, { strokeDashoffset: 0, opacity: 1 }],
            { delay: delay * T, duration: dur * T, easing, fill: "both" });
    };

    const W = innerWidth, H = innerHeight;
    const splash = document.createElement("div");
    splash.id = "splash";
    splash.setAttribute("aria-hidden", "true");
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}` }, splash);
    document.body.prepend(splash);
    root.classList.add("splash-on");

    // fit the signature: bigger share of the width on portrait phones
    const frac = W < H ? .82 : .54;
    const s = Math.min(W * frac / VB.w, H * frac * 1.2 / VB.h);
    const ox = W / 2 - (VB.x + VB.w / 2) * s, oy = H * .46 - (VB.y + VB.h / 2) * s;
    const M = (x, y) => [ox + x * s, oy + y * s];

    const fs = Math.min(13, Math.max(9, W / 110));
    const m = Math.max(12, Math.min(W, H) * .035);
    const gs = Math.max(10, W / 80);
    const id = "splash" + Date.now();

    // grid
    const defs = el("defs", {}, svg);
    const minor = el("pattern", { id: id + "m", width: gs, height: gs, patternUnits: "userSpaceOnUse" }, defs);
    line(minor, `M${gs} 0L0 0 0 ${gs}`, 1, "rgba(102,32,32,.055)");
    const major = el("pattern", { id: id + "g", width: gs * 5, height: gs * 5, patternUnits: "userSpaceOnUse" }, defs);
    el("rect", { width: gs * 5, height: gs * 5, fill: `url(#${id}m)` }, major);
    line(major, `M${gs * 5} 0L0 0 0 ${gs * 5}`, 1, "rgba(102,32,32,.12)");
    const clip = el("clipPath", { id: id + "c" }, defs);
    el("rect", { x: m, y: m, width: W - 2 * m, height: H - 2 * m }, clip);
    fadeIn(el("rect", { width: W, height: H, fill: `url(#${id}g)` }, svg), 0, 500);

    // frame + one quiet label per corner
    draw(line(svg, `M${m} ${m}H${W - m}V${H - m}H${m}Z`, 1.4), 100, 700, "cubic-bezier(.6,0,.2,1)");
    const label = (x, y, str, anchor) => {
        const t = el("text", { x, y, "font-size": fs, "letter-spacing": fs * .08, "text-anchor": anchor }, svg);
        t.textContent = str;
        fadeIn(t, 450, 400);
    };
    label(m + fs, m + fs * 2, "S. ALSHARIF", "start");
    const yRule = H - m - fs * 1.4;
    label(W - m - fs, yRule, "2026", "end");

    // construction: baseline, slash axis and its angle
    const guides = el("g", { "clip-path": `url(#${id}c)` }, svg);
    const [ax, ay] = M(218, 706), [bx, by] = M(932, 124), [, yBase] = M(0, 578);
    const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len, E = W + H;
    [`M${m} ${yBase}H${W - m}`, `M${ax - ux * E} ${ay - uy * E}L${bx + ux * E} ${by + uy * E}`]
        .forEach((d, i) => draw(line(guides, d, 1, ACC), 500 + i * 110, 650, "cubic-bezier(.6,0,.2,1)"));
    const ang = Math.atan2(706 - 124, 932 - 218), AR = 110 * s;
    draw(line(guides, `M${ax + AR} ${ay}A${AR} ${AR} 0 0 0 ${ax + AR * Math.cos(ang)} ${ay - AR * Math.sin(ang)}`), 1000, 400);
    const deg = el("text", { x: ax + (AR + fs * 2.4) * Math.cos(ang / 2), y: ay - (AR + fs * 1.2) * Math.sin(ang / 2), "font-size": fs, "text-anchor": "middle" }, guides);
    deg.textContent = `${(ang * 180 / Math.PI).toFixed(1)}°`;
    fadeIn(deg, 1200);

    // hairline pass, then ink
    const measure = SIG.map(p => el("path", { d: p.d }, defs).getTotalLength());
    const total = measure.reduce((a, b) => a + b, 0) + 110 * (SIG.length - 1);
    const pass = (g, delay, dur, width) => {
        let at = 0;
        SIG.forEach((p, i) => {
            const path = el("path", { d: p.d, "stroke-width": width ? p.w : 1 / s }, g);
            draw(path, delay + at / total * dur, measure[i] / total * dur);
            at += measure[i] + 110;
        });
    };
    const transform = `translate(${ox} ${oy}) scale(${s})`;
    const hair = el("g", { transform, fill: "none", stroke: WINE, "stroke-linecap": "round" }, svg);
    pass(hair, 900, 1000, false);
    const ink = el("g", { transform, fill: "none", stroke: INK, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    pass(ink, 1900, 1300, true);
    fadeIn(el("circle", { cx: DOT.x, cy: DOT.y, r: DOT.r, fill: INK }, ink), 3250, 100);
    for (const g of [guides, hair])
        g.animate([{ opacity: 1 }, { opacity: 0 }], { delay: 3300 * T, duration: 450 * T, fill: "forwards" });

    // ruler loader along the bottom
    const x0 = m + fs * 1.2, x1 = W - m - fs * 5, step = Math.max(5, gs * .6);
    const n = Math.floor((x1 - x0) / step);
    const ticks = [];
    for (let i = 0; i <= n; i++) {
        const h = i % 10 === 0 ? fs * .9 : i % 5 === 0 ? fs * .6 : fs * .35;
        const t = line(svg, `M${x0 + i * step} ${yRule}v${-h}`, 1, ACC);
        fadeIn(t, 300 + i * 4, 150);
        ticks.push(t);
    }
    const pctText = el("text", { x: x0, y: yRule - fs * 1.5, "font-size": fs * .95, "text-anchor": "middle" }, svg);
    pctText.textContent = "000%";

    // progress creeps toward 90% until window load, then runs to 100
    let loaded = document.readyState === "complete", p = 0, lit = 0, hit = 0, last = performance.now(), done = false;
    addEventListener("load", () => { loaded = true; }, { once: true });
    const t0 = performance.now();

    const block = e => e.preventDefault();
    addEventListener("wheel", block, { passive: false });
    addEventListener("touchmove", block, { passive: false });

    function finish() {
        if (done) return;
        done = true;
        removeEventListener("wheel", block);
        removeEventListener("touchmove", block);
        root.classList.remove("splash-on");
        dispatchEvent(new Event("splash:done"));
        const out = reduce
            ? splash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" })
            : splash.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: 800, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" });
        out.finished.then(() => splash.remove());
    }
    splash.addEventListener("pointerdown", finish);
    addEventListener("keydown", finish, { once: true });

    (function tick(now) {
        if (done) return;
        const t = now - t0, dt = now - last;
        last = now;
        const target = loaded ? 1 : .9 * (1 - Math.exp(-t / 1500));
        p = Math.max(p, p + (target - p) * Math.min(1, dt / 160));
        if (loaded && p > .995) { p = 1; hit = hit || now; }

        const k = Math.round(p * n);
        for (; lit <= k && lit <= n; lit++) ticks[lit].setAttribute("stroke", WINE);
        pctText.setAttribute("x", x0 + k * step);
        pctText.textContent = String(Math.round(p * 100)).padStart(3, "0") + "%";

        if ((t >= MIN * T && hit && now - hit > 250) || t >= CAP) return finish();
        requestAnimationFrame(tick);
    })(t0);
})();
