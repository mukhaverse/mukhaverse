// About — the identity badges, then the closing statement.
// The stage pins; each step of the scroll turns the badge to the next
// role and the copy beside it trades places. Roles come from the
// .id-panel elements, so adding one is markup only (plus a theme in
// badge-card.js if it needs new colours).
// While the stage pins, the badge is 3D (badge-3d.js): it hangs on real
// physics and can be grabbed and thrown; on phones it hangs on the right of
// the top half, the role's title beside it and the copy under both. On weak devices, and until three.js
// has loaded, it's the flat badge: the same painted card on the SVG
// lanyard, flipping edge-on between roles.
// Reduced motion and very short screens get every role listed in order
// with the flat badge beside them, switching as each role scrolls by.
// gsap / ScrollTrigger / SplitText come from the classic <script> tags.
import { readCard, paintFront, cardReady, logoReady } from "./badge-card.js";

const { gsap, ScrollTrigger, SplitText } = window;

document.addEventListener("DOMContentLoaded", () => {
    const section = document.querySelector(".about-section");
    if (!section) return;

    // ─── Timeline: where "now" sits between Sep 2023 and Jun 2027
    const start = new Date(2023, 8, 1).getTime();
    const end = new Date(2027, 5, 30).getTime();
    const progress = Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
    section.style.setProperty("--progress", `${(progress * 100).toFixed(1)}%`);

    // ─── The flat badge shows the first role even without GSAP
    const panels = Array.from(section.querySelectorAll(".id-panel"));
    const cards = panels.map(readCard);
    const flat = flatBadge(section, cards);
    flat?.paint(0);

    if (!gsap || !ScrollTrigger) return; // no GSAP: CSS lists every role

    gsap.registerPlugin(ScrollTrigger);
    if (SplitText) gsap.registerPlugin(SplitText);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ─── Identities ──────────────────────────────────────────
    setupIdentities(section, panels, cards, flat);

    // ─── Closing statement: each word lights up as the scroll reaches
    //     it. Created after the pin above it so it measures past it.
    const statement = section.querySelector(".about-statement");
    if (SplitText && statement && !reduceMotion) {
        const split = SplitText.create(statement, { type: "words", wordsClass: "word" });
        gsap.fromTo(split.words,
            { opacity: 0.14 },
            {
                opacity: 1,
                ease: "none",
                stagger: 0.1,
                scrollTrigger: { trigger: statement, start: "top 85%", end: "bottom 55%", scrub: true }
            }
        );
    }
});

// the flat badge's card is a canvas, repainted at its own size
function flatBadge(section, cards) {
    const art = section.querySelector(".id-art");
    if (!art || !cards.length) return null;
    let current = 0;
    const paint = (i) => {
        current = i;
        const w = art.offsetWidth;
        if (!w) return;
        const width = Math.round(w * Math.min(window.devicePixelRatio || 1, 2));
        if (art.width !== width) {
            art.width = width;
            art.height = Math.round(width / 0.68);
        }
        paintFront(art, cards[i]);
    };
    new ResizeObserver(() => paint(current)).observe(art);
    cardReady.then(() => paint(current));
    return { paint };
}

function setupIdentities(section, panels, cards, flat) {
    const stage = section.querySelector(".about-stage");
    const stageInner = section.querySelector(".about-stage-inner");
    const lanyard = section.querySelector(".id-lanyard");
    const rig = section.querySelector(".id-rig");
    const badge = section.querySelector(".id-badge");
    const nav = section.querySelector(".id-progress");
    const N = panels.length;
    if (!stage || !stageInner || !lanyard || !rig || !badge || !nav || !N || !flat) return;

    section.classList.add("is-live");

    // one progress step per role
    const steps = panels.map((panel, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "id-step";
        btn.dataset.index = String(i);
        btn.innerHTML = '<span class="id-step-bar"><span class="id-step-fill"></span></span><span class="id-step-label"></span>';
        btn.querySelector(".id-step-label").textContent = panel.dataset.step || panel.dataset.band || "";
        nav.appendChild(btn);
        return btn;
    });
    const fills = steps.map((btn) => btn.querySelector(".id-step-fill"));
    const markStep = (i) => steps.forEach((btn, k) => btn.setAttribute("aria-current", k === i ? "true" : "false"));

    const underline = (i, delay = 0) => {
        const hls = panels[i].querySelectorAll(".hl");
        if (!hls.length) return;
        gsap.fromTo(hls, { "--hl": "0%" },
            { "--hl": "100%", duration: 0.9, ease: "power2.inOut", stagger: 0.3, delay, overwrite: true });
    };

    // 3D needs a device with some headroom
    const capable = (navigator.hardwareConcurrency || 4) > 2 && (navigator.deviceMemory || 4) >= 2;

    const mm = gsap.matchMedia();

    mm.add({
        pinned: "(prefers-reduced-motion: no-preference) and (min-height: 520px)",
        listed: "(prefers-reduced-motion: reduce), (max-height: 519px)",
        phone: "(max-width: 760px)"
    }, (ctx) => {
        flat.paint(0);
        markStep(0);

        if (ctx.conditions.listed) {
            section.classList.remove("is-pinned");
            gsap.set(section.querySelectorAll(".hl"), { "--hl": "100%" });
            panels.forEach((panel, i) => {
                ScrollTrigger.create({
                    trigger: panel,
                    start: "top 60%",
                    end: "bottom 60%",
                    onToggle: (self) => { if (self.isActive) flat.paint(i); }
                });
            });
            return;
        }

        section.classList.add("is-pinned");

        const parts = panels.map((p) => p.querySelectorAll(".id-title, .id-meta, .about-bio, .about-timeline"));
        gsap.set(panels.slice(1), { autoAlpha: 0 });
        gsap.set(fills, { scaleX: 0 });
        let active = 0;
        let flip = null;
        let entered = false;
        let engine = null;      // the 3D badge, once it's loaded
        let reverted = false;

        // flat: the badge turns edge-on, changes, and turns back to face you;
        // the rig gives one small swing from the push
        const turnBadge = (to, dir) => {
            if (engine) {
                engine.setRole(to, dir);
                flat.paint(to);
                return;
            }
            flip?.kill();
            flip = gsap.timeline()
                .to(badge, { rotationY: dir * 90, duration: 0.24, ease: "power2.in" })
                .call(() => flat.paint(to))
                .fromTo(badge, { rotationY: -dir * 90 }, { rotationY: 0, duration: 0.8, ease: "back.out(1.5)" })
                .fromTo(badge, { "--sheen": dir > 0 ? "130%" : "-30%" },
                    { "--sheen": dir > 0 ? "-30%" : "130%", duration: 0.9, ease: "power2.out" }, "<");
            gsap.to(rig, {
                keyframes: { rotation: [0, dir * 2.2, -dir * 1, dir * 0.35, 0], easeEach: "sine.inOut" },
                duration: 1.3,
                overwrite: "auto"
            });
        };

        // the same swap as the projects' info: each line slides out through
        // its own mask and the next role's lines slide in after it
        // (--my is in line heights, see about.css)
        const slideIn = (els, dir, delay) => gsap.fromTo(els, { "--my": dir },
            { "--my": 0, duration: 0.62, ease: "power3.out", stagger: 0.055, delay });

        const swapCopy = (from, to, dir) => {
            gsap.killTweensOf([...parts[from], ...parts[to]]);
            gsap.to(parts[from], {
                "--my": -dir, duration: 0.32, ease: "power2.in", stagger: 0.025,
                onComplete: () => gsap.set(panels[from], { autoAlpha: 0 })
            });
            gsap.set(panels[to], { autoAlpha: 1 });
            slideIn(parts[to], dir, 0.16);
            underline(to, 0.55);
        };

        const go = (i) => {
            if (i === active) return;
            const dir = i > active ? 1 : -1;
            swapCopy(active, i, dir);
            turnBadge(i, dir);
            active = i;
            markStep(i);
        };

        // 3D: fetched once the stage is a screen away; until it's ready the
        // flat badge does the job, and it stays if three.js or WebGL fails
        if (capable) {
            ScrollTrigger.create({
                trigger: stage,
                start: "top bottom+=100%",
                once: true,
                onEnter: async () => {
                    const [{ createBadge3D }, logo] = await Promise.all([import("./badge-3d.js"), logoReady, cardReady]);
                    if (reverted) return;
                    const phone = ctx.conditions.phone;
                    const made = await createBadge3D(stageInner, lanyard, cards, logo,
                        phone ? { parked: !entered, fit: 0.7, fitW: 0.92, light: true } : { parked: !entered });
                    if (!made) return;
                    if (reverted) { made.destroy(); return; }
                    engine = made;
                    if (entered) engine.show(active);
                    section.classList.add("has-3d");
                }
            });
        }

        // Entrance: the badge lowers in once and the first copy rises
        gsap.set(rig, { y: -(rig.offsetHeight + 60) });
        gsap.set(parts[0], { "--my": 1 });
        ScrollTrigger.create({
            trigger: stage,
            start: "top 65%",
            once: true,
            onEnter: () => {
                entered = true;
                if (engine) {
                    engine.drop(active);
                    gsap.set(rig, { y: 0 });
                } else {
                    gsap.timeline()
                        .to(rig, { y: 0, duration: 1.4, ease: "power3.out" })
                        .to(rig, {
                            keyframes: { rotation: [0, 3.5, -2, 0.9, -0.3, 0], easeEach: "sine.inOut" },
                            duration: 2.2
                        }, 0.5);
                }
                if (active === 0) {
                    slideIn(parts[0], 1, 0.15);
                    underline(0, 0.9);
                } else {
                    gsap.set(parts[0], { "--my": 0 });
                }
                gsap.from(".about-track-fill", { scaleX: 0, duration: 1.4, ease: "expo.out", delay: 0.6 });
                gsap.from(".about-now", { scale: 0, duration: 0.5, ease: "back.out(2)", delay: 1.3 });
            }
        });

        // The pin: each role gets the same stretch of scroll
        const st = ScrollTrigger.create({
            trigger: stage,
            pin: true,
            start: "top top",
            end: () => `+=${window.innerHeight * 0.75 * N}`,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
                const f = self.progress * N;
                fills.forEach((el, k) => gsap.set(el, { scaleX: gsap.utils.clamp(0, 1, f - k) }));
                go(Math.min(N - 1, Math.floor(f)));
            }
        });

        // Steps jump to the start of their role
        const onStep = (e) => {
            const btn = e.target.closest(".id-step");
            if (!btn) return;
            const y = st.start + ((Number(btn.dataset.index) + 0.08) / N) * (st.end - st.start);
            if (window.lenis) window.lenis.scrollTo(y, { duration: 1.1 });
            else window.scrollTo({ top: y, behavior: "smooth" });
        };
        nav.addEventListener("click", onStep);

        return () => {
            reverted = true;
            engine?.destroy();
            engine = null;
            section.classList.remove("has-3d");
            nav.removeEventListener("click", onStep);
            flip?.kill();
            section.classList.remove("is-pinned");
        };
    });
}
