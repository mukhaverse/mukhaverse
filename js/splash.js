// Drafting-sheet splash: the signature is drawn while the page loads, then the
// sheet hands off to the hero: the drafting marks fade, the corner labels slide
// into the navbar, and the signature gives way to the name rising in its place.
// Runs at the top of <body> so it paints before the rest of the page.
// Once per tab session; a click or key skips it; static for reduced motion.
// hero.js starts its intro on "splash:done", fired as the handoff begins.
(function () {
    try {
        if (sessionStorage.getItem("splash-seen")) return;
        sessionStorage.setItem("splash-seen", "1");
    } catch (e) {}

    const root = document.documentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const T = reduce ? 0 : 1;           // scales every delay/duration
    const MIN = 3400, CAP = 8000;       // never leave before the ink is done, never trap anyone
    const HANDOFF = 650;                // the exit crossfades into the hero in this long

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

    // the page's palette (base.css): --dark, --mid, --suit-red, and a hairline
    const INK = "#161412", MID = "#3a3532", RED = "#EB1C24", LINE = "rgba(22,20,18,.18)";
    const NS = "http://www.w3.org/2000/svg";
    const el = (tag, attrs, parent) => {
        const e = document.createElementNS(NS, tag);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.append(e);
        return e;
    };
    const line = (parent, d, w = 1, stroke = MID) => el("path", { d, fill: "none", stroke, "stroke-width": w }, parent);
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

    const defs = el("defs", {}, svg);
    const clip = el("clipPath", { id: id + "c" }, defs);
    el("rect", { x: m, y: m, width: W - 2 * m, height: H - 2 * m }, clip);

    // everything that is only drafting (frame, guides, ruler) fades as one on exit
    const sheet = el("g", {}, svg);

    // frame + a label in each top corner, where the navbar's SA and 2026 sit
    draw(line(sheet, `M${m} ${m}H${W - m}V${H - m}H${m}Z`), 100, 700, "cubic-bezier(.6,0,.2,1)");
    const label = (x, y, str, anchor) => {
        const t = el("text", { x, y, "font-size": fs, "letter-spacing": fs * .14, "text-anchor": anchor }, svg);
        t.textContent = str;
        fadeIn(t, 450, 400);
        return t;
    };
    const labels = [
        [label(m + fs, m + fs * 2, "S. ALSHARIF", "start"), ".navbar .nav-logo", "left"],
        [label(W - m - fs, m + fs * 2, "2026", "end"), ".navbar .year", "right"],
    ];

    // construction: baseline, slash axis and its angle
    const guides = el("g", { "clip-path": `url(#${id}c)` }, sheet);
    const [ax, ay] = M(218, 706), [bx, by] = M(932, 124), [, yBase] = M(0, 578);
    const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len, E = W + H;
    [`M${m} ${yBase}H${W - m}`, `M${ax - ux * E} ${ay - uy * E}L${bx + ux * E} ${by + uy * E}`]
        .forEach((d, i) => draw(line(guides, d, 1, LINE), 500 + i * 110, 650, "cubic-bezier(.6,0,.2,1)"));
    const ang = Math.atan2(706 - 124, 932 - 218), AR = 110 * s;
    draw(line(guides, `M${ax + AR} ${ay}A${AR} ${AR} 0 0 0 ${ax + AR * Math.cos(ang)} ${ay - AR * Math.sin(ang)}`), 1000, 400);
    const deg = el("text", { class: "num", x: ax + (AR + fs * 2.4) * Math.cos(ang / 2), y: ay - (AR + fs * 1.2) * Math.sin(ang / 2), "font-size": fs * 1.5, "text-anchor": "middle" }, guides);
    deg.textContent = `${(ang * 180 / Math.PI).toFixed(1)}°`;
    fadeIn(deg, 1200);

    // a few guide points marked out first, then the ink
    const measure = SIG.map(p => el("path", { d: p.d }, defs).getTotalLength());
    const total = measure.reduce((a, b) => a + b, 0) + 110 * (SIG.length - 1);
    const transform = `translate(${ox} ${oy}) scale(${s})`;
    const hair = el("g", { transform, fill: "none", stroke: LINE }, sheet);
    [[487, 291], [932, 124], [560, 558], [218, 706], [976, 578]].forEach(([x, y], i) => {
        const pt = el("g", {}, hair);
        el("circle", { cx: x, cy: y, r: 1.6 / s, fill: MID, stroke: "none" }, pt);
        el("circle", { cx: x, cy: y, r: 5 / s, "stroke-width": .8 / s }, pt);
        pt.style.transformBox = "fill-box";
        pt.style.transformOrigin = "center";
        pt.animate([{ opacity: 0, transform: "scale(2.2)" }, { opacity: .8, transform: "scale(1)" }],
            { delay: (900 + i * 180) * T, duration: 320 * T, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" });
    });
    // the ink sits in its own wrapper so the exit can scale it without touching its placement
    const inkWrap = el("g", {}, svg);
    const ink = el("g", { transform, fill: "none", stroke: INK, "stroke-linecap": "round", "stroke-linejoin": "round" }, inkWrap);
    let at = 0;
    SIG.forEach((p, i) => {
        draw(el("path", { d: p.d, "stroke-width": p.w }, ink), 1900 + at / total * 1300, measure[i] / total * 1300);
        at += measure[i] + 110;
    });
    // the full stop takes the cards' red
    fadeIn(el("circle", { cx: DOT.x, cy: DOT.y, r: DOT.r * 1.3, fill: RED, stroke: "none" }, ink), 3250, 100);
    for (const g of [guides, hair])
        g.animate([{ opacity: 1 }, { opacity: 0 }], { delay: 3300 * T, duration: 450 * T, fill: "forwards" });

    // ruler loader along the bottom; progress lights it in the cards' red
    const yRule = H - m - fs * 1.4;
    const x0 = m + fs * 1.2, x1 = W - m - fs * 1.2, step = Math.max(5, gs * .6);
    const n = Math.floor((x1 - x0) / step);
    const ticks = [];
    for (let i = 0; i <= n; i++) {
        const h = i % 10 === 0 ? fs * .9 : i % 5 === 0 ? fs * .6 : fs * .35;
        const t = line(sheet, `M${x0 + i * step} ${yRule}v${-h}`, 1, LINE);
        fadeIn(t, 300 + i * 4, 150);
        ticks.push(t);
    }
    const pctText = el("text", { class: "num", x: x0, y: yRule - fs * 1.4, "font-size": fs * 1.5, "text-anchor": "middle" }, sheet);
    pctText.textContent = "000%";
    let lit = 0;
    const setRuler = v => {
        const k = Math.round(v * n);
        for (; lit <= k && lit <= n; lit++) ticks[lit].setAttribute("stroke", RED);
        pctText.setAttribute("x", Math.min(x0 + k * step, x1 - fs * 2));
        pctText.textContent = String(Math.round(v * 100)).padStart(3, "0") + "%";
    };

    // progress creeps toward 90% until window load, then runs to 100
    let loaded = document.readyState === "complete", p = 0, hit = 0, last = performance.now(), done = false;
    addEventListener("load", () => { loaded = true; }, { once: true });
    const t0 = performance.now();

    const block = e => e.preventDefault();
    addEventListener("wheel", block, { passive: false });
    addEventListener("touchmove", block, { passive: false });

    // exit: hand the sheet over to the hero instead of wiping it
    function finish() {
        if (done) return;
        done = true;
        dispatchEvent(new Event("splash:done"));
        if (reduce) return leave();

        splash.style.pointerEvents = "none";
        const ease = "cubic-bezier(.65,0,.35,1)";
        sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-out", fill: "forwards" });

        // corner labels travel to the navbar items fading in underneath them;
        // phones hide the navbar, so there they just fade where they are
        for (const [t, sel, edge] of labels) {
            const b = document.querySelector(sel)?.getBoundingClientRect();
            const a = t.getBoundingClientRect();
            const dx = b?.width ? b[edge] - a[edge] : 0;
            const dy = b?.width ? (b.top + b.height / 2) - (a.top + a.height / 2) : 0;
            t.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 }],
                { duration: b?.width ? HANDOFF : 300, easing: ease, fill: "forwards" });
        }

        // the signature recedes as the name scales in over the same spot
        inkWrap.style.transformBox = "fill-box";
        inkWrap.style.transformOrigin = "center";
        inkWrap.animate([{ transform: "none", opacity: 1 }, { transform: "scale(.9)", opacity: 0 }],
            { duration: 450, easing: ease, fill: "forwards" });
        splash.animate([{ backgroundColor: "rgba(249,244,235,1)" }, { backgroundColor: "rgba(249,244,235,0)" }],
            { delay: 100, duration: HANDOFF - 100, easing: "ease-out", fill: "forwards" });
        setTimeout(leave, HANDOFF);
    }
    function leave() {
        removeEventListener("wheel", block);
        removeEventListener("touchmove", block);
        root.classList.remove("splash-on");
        if (!reduce) return splash.remove();
        splash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, easing: "ease-out", fill: "forwards" })
            .finished.then(() => splash.remove());
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

        setRuler(p);

        if ((t >= MIN * T && hit && now - hit > 250) || t >= CAP) return finish();
        requestAnimationFrame(tick);
    })(t0);
})();
