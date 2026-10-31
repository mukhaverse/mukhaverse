// Keyboard splash: a hairline keyboard draws itself in, a ghost cursor types the name on it,
// and on Enter the name grows straight into the hero. The typed text is the real .hero-title,
// shrunk under the board while it is typed, so nothing is swapped and nothing can jump.
// Runs at the top of <body>. hero.js parks the title on its resting y (class "splash-name"),
// says "hero:ready", and starts the rest of its intro on "splash:done".
// Once per tab session; a click or key skips the typing; no splash for reduced motion.
(function () {
    try {
        if (sessionStorage.getItem("splash-seen")) return;
        sessionStorage.setItem("splash-seen", "1");
    } catch (e) {}
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const HAIRLINE = "https://cdn.jsdelivr.net/npm/@lucasmarkes/hairline@0.5.1/dist/index.js";
    const root = document.documentElement;
    root.classList.add("splash-on", "splash-name");

    // the handoff, in ms from the moment Enter is pressed
    const T = { caret: 100, drop: 420, fly: 700, sheetAt: 100, sheet: 500, heroAt: 380 };
    const EASE = {
        io: "cubic-bezier(.65,0,.35,1)",
        fly: "cubic-bezier(.6,0,.15,1)",
        in: "cubic-bezier(.55,0,1,.45)",
        draw: "cubic-bezier(.6,0,.2,1)",
    };

    const splash = document.createElement("div");
    splash.id = "splash";
    splash.setAttribute("aria-hidden", "true");
    splash.innerHTML =
        '<div class="sheet"><div class="kb"></div>' +
        '<div class="loader"><b>000%</b><div class="track"><i></i></div></div></div>';
    document.body.prepend(splash);
    const $ = s => splash.querySelector(s);
    const sheet = $(".sheet"), kbBox = $(".kb"), num = $(".loader b"), bar = $(".track i");

    // where the name sits while it is typed: its size and its centre line under the board
    const small = innerWidth < 768;
    const CAP = small ? innerWidth * .08 : Math.min(innerWidth * .042, 54);
    const CAP_Y = small ? .74 : .8;

    // a click or key finishes the typing at once; the handoff still plays
    let fast = false;
    const skip = () => { fast = true; };
    splash.addEventListener("pointerdown", skip);
    addEventListener("keydown", skip);
    const block = e => e.preventDefault();
    addEventListener("wheel", block, { passive: false });
    addEventListener("touchmove", block, { passive: false });

    const wait = ms => fast ? Promise.resolve() : new Promise(r => setTimeout(r, ms));
    const frames = (ms, fn) => fast ? (fn(1), Promise.resolve()) : new Promise(res => {
        const t0 = performance.now();
        const step = now => {
            const k = Math.min(1, (now - t0) / ms);
            fn(k);
            k < 1 ? requestAnimationFrame(step) : res();
        };
        requestAnimationFrame(step);
    });
    const anim = (el, kf, o) => el.animate(kf, { fill: "both", ...o });

    // the loader follows the board drawing and the keystrokes, and holds short of 100 until the page has loaded
    let target = 0, shown = 0, loaded = document.readyState === "complete", running = true;
    addEventListener("load", () => { loaded = true; }, { once: true });
    (function tick() {
        if (!running) return;
        shown += (Math.min(target, loaded ? 1 : .9) - shown) * .18;
        num.textContent = String(Math.round(shown * 100)).padStart(3, "0") + "%";
        bar.style.width = shown * 100 + "%";
        requestAnimationFrame(tick);
    })();

    const domReady = new Promise(r => document.readyState === "loading" ? addEventListener("DOMContentLoaded", r, { once: true }) : r());
    const heroReady = Promise.race([
        new Promise(r => window.__heroReady ? r() : addEventListener("hero:ready", r, { once: true })),
        domReady.then(() => new Promise(r => setTimeout(r, 1500))),
    ]);
    const pageLoaded = Promise.race([
        new Promise(r => loaded ? r() : addEventListener("load", r, { once: true })),
        new Promise(r => setTimeout(r, 6000)),
    ]);

    // the ghost cursor: the same pointer events a hand would give the keyboard, in its 400×320 space
    const KEY = {
        s: [142, 123], h: [198, 151], u: [220, 148], m: [204, 168], o: [250, 163], k: [226, 165],
        a: [128, 116], l: [240, 172], space: [168, 168], shift: [93, 113], tab: [116, 96], enter: [294, 199],
    };
    let at = null;
    const point = ([x, y]) => {
        const b = kbBox.getBoundingClientRect();
        kbBox.dispatchEvent(new PointerEvent("pointermove", { clientX: b.left + x / 400 * b.width, clientY: b.top + y / 320 * b.height, pointerType: "mouse" }));
        at = [x, y];
    };
    const glide = (p, ms) => {
        const a = at ?? p;
        return frames(ms, k => { const e = 1 - Math.pow(1 - k, 3); point([a[0] + (p[0] - a[0]) * e, a[1] + (p[1] - a[1]) * e]); });
    };

    // the board's lines trace in back to front as a wireframe, then the keycaps fill
    function drawIn(svg) {
        const els = [...svg.querySelectorAll("path, polygon, ellipse, line, polyline")], n = els.length || 1;
        els.forEach((e, i) => {
            e.setAttribute("pathLength", "1");
            anim(e, [
                { strokeDasharray: "1 1", strokeDashoffset: 1, fillOpacity: 0 },
                { strokeDasharray: "1 1", strokeDashoffset: 0, fillOpacity: 0, offset: .75 },
                { strokeDasharray: "1 1", strokeDashoffset: 0, fillOpacity: 1 },
            ], { delay: i / n * 700, duration: 600, easing: EASE.draw, fill: "backwards" })
                .finished.then(() => e.removeAttribute("pathLength"), () => {});
        });
        svg.querySelectorAll("circle").forEach(c => anim(c, [{ opacity: 0 }, { opacity: 1 }], { delay: 1000, duration: 300, fill: "backwards" }));
    }

    let title, cont, chars, caret;

    // split the title into letter spans, keeping the whole name for screen readers
    function letters(text) {
        title.textContent = "";
        const sr = document.createElement("span");
        sr.className = "splash-sr";
        sr.textContent = text;
        title.append(sr);
        return [...text].map(c => {
            const s = document.createElement("span");
            s.className = "ch";
            s.textContent = c;
            s.setAttribute("aria-hidden", "true");
            title.append(s);
            return s;
        });
    }

    function leave() {
        running = false;
        removeEventListener("wheel", block);
        removeEventListener("touchmove", block);
        removeEventListener("keydown", skip);
        root.classList.remove("splash-on");
        if (cont) cont.style.zIndex = "";
        caret?.remove();
        splash.remove();
    }
    // anything goes wrong: show the hero as it is and get out of the way
    function bail() {
        if (title) {
            title.getAnimations().forEach(a => a.cancel());
            title.style.opacity = 1;
            title.style.translate = title.style.scale = "";
            chars?.forEach(c => { c.style.visibility = c.style.opacity = ""; });
        }
        dispatchEvent(new Event("splash:done"));
        leave();
    }

    // the caret sits after the last shown letter
    function placeCaret(n) {
        const ref = chars[0], last = chars[n - 1];
        caret.style.left = (last ? last.offsetLeft + last.offsetWidth : ref.offsetLeft) + "px";
        caret.style.top = ref.offsetTop + ref.offsetHeight * .17 + "px";
    }

    async function main() {
        let H;
        try {
            [H] = await Promise.all([import(HAIRLINE), domReady, document.fonts?.ready]);
        } catch (e) {
            return bail();
        }
        title = document.querySelector(".hero-title");
        cont = title?.closest(".hero-title-cont");
        if (!title || !cont) return bail();

        chars = letters(title.textContent.trim());
        chars.forEach(c => { c.style.visibility = "hidden"; });
        title.style.position = "relative";
        // the page is its own stacking context (footer.css), so the splash moves in beside the hero;
        // there the name can ride above it the whole time
        title.closest(".page-wrapper")?.prepend(splash);
        cont.style.zIndex = 1001;
        title.style.opacity = 1;
        caret = document.createElement("i");
        caret.className = "splash-caret";
        title.append(caret);

        // shrink the resting title down onto the typed line's spot under the board;
        // scale first, then measure, so hero.js's own y offset is accounted for
        await heroReady;
        title.style.scale = CAP / parseFloat(getComputedStyle(title).fontSize);
        const f = title.getBoundingClientRect();
        title.style.translate = `${innerWidth / 2 - (f.left + f.width / 2)}px ${innerHeight * CAP_Y - (f.top + f.height / 2)}px`;
        placeCaret(0);

        const kb = H.keyboard(kbBox, { theme: "light", intensity: .3 });
        drawIn(kbBox.querySelector("svg"));
        target = .12;
        await wait(950);

        // Shift+S h u m o k h ␣ Shift+A l, then a grey "sharif" that Tab accepts
        const STEPS = [
            ["shift"], ["s", 1], ["h", 1], ["u", 1], ["m", 1], ["o", 1], ["k", 1], ["h", 1], ["space", 1],
            ["shift"], ["a", 1], ["l", 1], ["suggest"], ["tab"],
        ];
        let n = 0;
        for (const [i, [key, types]] of STEPS.entries()) {
            if (key === "suggest") {
                await wait(140);
                chars.slice(n).forEach(c => { c.style.visibility = "visible"; c.style.opacity = .28; });
                await wait(260);
                continue;
            }
            await glide(KEY[key], key === "shift" ? 80 : 95);
            if (types) {
                chars[n].style.visibility = "visible";
                n++;
                placeCaret(n);
            }
            if (key === "tab") {
                chars.slice(n).forEach(c => anim(c, [{ opacity: .28 }, { opacity: 1 }], { duration: 140, easing: "ease-out" })
                    .finished.then(() => { c.style.opacity = ""; c.getAnimations().forEach(a => a.cancel()); }));
                n = chars.length;
                placeCaret(n);
            }
            target = .12 + .8 * (i + 1) / STEPS.length;
            await wait(key === "shift" ? 25 : 55);
        }
        if (fast) {
            chars.forEach(c => { c.style.visibility = "visible"; c.style.opacity = ""; });
            placeCaret(chars.length);
        }
        fast = false;
        splash.removeEventListener("pointerdown", skip);
        removeEventListener("keydown", skip);

        await wait(200);
        kb.update({ intensity: .9 });
        await glide(KEY.enter, 160);
        await pageLoaded;
        target = 1;
        await wait(240);
        kbBox.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
        splash.style.pointerEvents = "none";

        // Enter: the caret goes, the board drops, and the name makes one move to where it rests
        anim(caret, [{ opacity: 1 }, { opacity: 0 }], { duration: T.caret });
        anim(kbBox, [
            { transform: "translate(-50%, -50%)", opacity: 1 },
            { transform: "translate(-50%, -30%) scale(.94)", opacity: 0 },
        ], { duration: T.drop, easing: EASE.in });
        anim(sheet, [{ opacity: 1 }, { opacity: 0 }], { delay: T.sheetAt, duration: T.sheet, easing: "ease-out" });
        setTimeout(() => dispatchEvent(new Event("splash:done")), T.heroAt);

        await anim(title, [
            { translate: title.style.translate, scale: title.style.scale },
            { translate: "0px 0px", scale: "1" },
        ], { duration: T.fly, easing: EASE.fly, fill: "forwards" }).finished;
        title.style.translate = title.style.scale = "";
        title.getAnimations().forEach(a => a.cancel());
        leave();
    }

    main().catch(e => { console.error(e); bail(); });
})();
