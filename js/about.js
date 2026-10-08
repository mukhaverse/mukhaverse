// About — the identity badges, then the closing statement.
// The stage pins; each step of the scroll flips the badge over (edge-on,
// the colours and text change, it turns back to face you) and the copy
// beside it trades places. Roles come from the .id-panel elements, so
// adding one is markup only (plus a THEME below if it needs new colours).
// Reduced motion and very short screens get every role listed in order
// with the badge beside them, switching as each role scrolls by.
// gsap / ScrollTrigger / SplitText come from the classic <script> tags.
const { gsap, ScrollTrigger, SplitText } = window;

document.addEventListener("DOMContentLoaded", () => {
    const section = document.querySelector(".about-section");
    if (!section) return;

    // ─── Timeline: where "now" sits between Sep 2023 and Jun 2027
    const start = new Date(2023, 8, 1).getTime();
    const end = new Date(2027, 5, 30).getTime();
    const progress = Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
    section.style.setProperty("--progress", `${(progress * 100).toFixed(1)}%`);

    if (!gsap || !ScrollTrigger) return; // no GSAP: CSS lists every role

    gsap.registerPlugin(ScrollTrigger);
    if (SplitText) gsap.registerPlugin(SplitText);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ─── Identities ──────────────────────────────────────────
    setupIdentities(section, reduceMotion);

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

function setupIdentities(section, reduceMotion) {
    const stage = section.querySelector(".about-stage");
    const rig = section.querySelector(".id-rig");
    const badge = section.querySelector(".id-badge");
    const nav = section.querySelector(".id-progress");
    const panels = Array.from(section.querySelectorAll(".id-panel"));
    const N = panels.length;
    if (!stage || !rig || !badge || !nav || !N) return;

    section.classList.add("is-live");

    const THEMES = {
        // Shumokh's own card: cream with a wine band
        student: {
            "--b-bg": "#ece4d6", "--b-ink": "#161412", "--b-soft": "rgba(22, 20, 18, 0.66)",
            "--b-band": "#662020", "--b-band-ink": "#f4efe6", "--b-photo": "rgba(102, 32, 32, 0.08)",
            "--b-rule": "rgba(22, 20, 18, 0.16)", "--b-invert": 0.88
        },
        // club role: the wine card, band flipped to cream
        club: {
            "--b-bg": "#662020", "--b-ink": "#f4efe6", "--b-soft": "rgba(244, 239, 230, 0.74)",
            "--b-band": "#f4efe6", "--b-band-ink": "#662020", "--b-photo": "rgba(244, 239, 230, 0.1)",
            "--b-rule": "rgba(244, 239, 230, 0.22)", "--b-invert": 0
        },
        // GDG on Campus: white card, ink band
        gdg: {
            "--b-bg": "#ffffff", "--b-ink": "#161412", "--b-soft": "rgba(22, 20, 18, 0.66)",
            "--b-band": "#161412", "--b-band-ink": "#f4efe6", "--b-photo": "rgba(22, 20, 18, 0.06)",
            "--b-rule": "rgba(22, 20, 18, 0.14)", "--b-invert": 0.88
        }
    };

    const field = (name) => badge.querySelector(`[data-field="${name}"]`);

    // write role i onto the badge, no animation
    const dress = (i) => {
        const d = panels[i].dataset;
        gsap.set(badge, THEMES[d.theme] || THEMES.student);
        field("band").textContent = d.band || "";
        field("org").textContent = d.org || "";
        field("footL").textContent = d.footL || "";
        field("footR").textContent = d.footR || "";
    };

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

    const mm = gsap.matchMedia();

    mm.add({
        pinned: "(prefers-reduced-motion: no-preference) and (min-height: 520px)",
        listed: "(prefers-reduced-motion: reduce), (max-height: 519px)"
    }, (ctx) => {
        dress(0);
        markStep(0);

        if (ctx.conditions.listed) {
            section.classList.remove("is-pinned");
            gsap.set(section.querySelectorAll(".hl"), { "--hl": "100%" });
            panels.forEach((panel, i) => {
                ScrollTrigger.create({
                    trigger: panel,
                    start: "top 60%",
                    end: "bottom 60%",
                    onToggle: (self) => { if (self.isActive) dress(i); }
                });
            });
            return;
        }

        section.classList.add("is-pinned");

        const parts = panels.map((p) => p.querySelectorAll(".id-title, .id-meta, .id-copy, .about-timeline"));
        gsap.set(panels.slice(1), { autoAlpha: 0 });
        gsap.set(fills, { scaleX: 0 });
        let active = 0;
        let flip = null;

        // the badge turns edge-on, changes, and turns back to face you;
        // the rig gives one small swing from the push
        const turnBadge = (to, dir) => {
            flip?.kill();
            flip = gsap.timeline()
                .to(badge, { rotationY: dir * 90, duration: 0.24, ease: "power2.in" })
                .call(() => dress(to))
                .fromTo(badge, { rotationY: -dir * 90 }, { rotationY: 0, duration: 0.8, ease: "back.out(1.5)" })
                .fromTo(badge, { "--sheen": dir > 0 ? "130%" : "-30%" },
                    { "--sheen": dir > 0 ? "-30%" : "130%", duration: 0.9, ease: "power2.out" }, "<");
            gsap.to(rig, {
                keyframes: { rotation: [0, dir * 2.2, -dir * 1, dir * 0.35, 0], easeEach: "sine.inOut" },
                duration: 1.3,
                overwrite: "auto"
            });
        };

        // the old copy lifts away, the new copy rises in out of a blur
        const swapCopy = (from, to, dir) => {
            gsap.killTweensOf([...parts[from], ...parts[to]]);
            gsap.to(parts[from], {
                opacity: 0, y: -dir * 22, filter: "blur(6px)",
                duration: 0.3, ease: "power2.in", stagger: 0.03,
                onComplete: () => gsap.set(panels[from], { autoAlpha: 0 })
            });
            gsap.set(panels[to], { autoAlpha: 1 });
            gsap.fromTo(parts[to],
                { opacity: 0, y: dir * 26, filter: "blur(8px)" },
                { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8, ease: "expo.out", stagger: 0.06, delay: 0.18, clearProps: "filter" });
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

        // Entrance: the badge lowers in once and the first copy rises
        gsap.set(rig, { y: -(rig.offsetHeight + 60) });
        gsap.set(parts[0], { opacity: 0, y: 26 });
        ScrollTrigger.create({
            trigger: stage,
            start: "top 65%",
            once: true,
            onEnter: () => {
                gsap.timeline()
                    .to(rig, { y: 0, duration: 1.4, ease: "power3.out" })
                    .to(rig, {
                        keyframes: { rotation: [0, 3.5, -2, 0.9, -0.3, 0], easeEach: "sine.inOut" },
                        duration: 2.2
                    }, 0.5);
                if (active === 0) {
                    gsap.to(parts[0], { opacity: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.08, delay: 0.15 });
                    underline(0, 0.9);
                } else {
                    gsap.set(parts[0], { opacity: 1, y: 0 });
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
            nav.removeEventListener("click", onStep);
            flip?.kill();
            section.classList.remove("is-pinned");
        };
    });
}
