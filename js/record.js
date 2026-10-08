// Beyond the Deck — the lanyard.
// One badge lowers in from the top the first time the section is reached,
// swings a little, settles, and then stays still. As you move through the
// entries the same badge restyles itself (colours tween, text fades), and
// any photos or certificates for the entry grow in under the details as a
// small collage. Add photos to an entry with data-photos="a.jpg, b.jpg".
// Desktop: the section pins and a 3D timeline wheel spins with the scroll.
// Phones, tablets and reduced motion: stepped with buttons or a swipe.
const { gsap, ScrollTrigger } = window;

document.addEventListener("DOMContentLoaded", () => {
    if (!gsap || !ScrollTrigger) return; // no GSAP: CSS shows the timeline as a list
    gsap.registerPlugin(ScrollTrigger);

    // Last module on the page: every trigger now exists, so refresh them
    // in page order (the skills pin and the About pin change everything
    // below them).
    const settleTriggers = () => {
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
    };
    if (document.readyState === "complete") settleTriggers();
    else window.addEventListener("load", settleTriggers, { once: true });

    const section = document.getElementById("record");
    if (!section || section.hidden) return; // hidden for now: the badge lives in About

    const pin = section.querySelector(".record-pin");
    const lanyard = section.querySelector(".lanyard");
    const rig = section.querySelector(".lanyard-rig");
    const badge = section.querySelector(".badge");
    const media = section.querySelector(".detail-media");
    const drum = section.querySelector(".wheel-drum");
    const wheelItems = Array.from(section.querySelectorAll(".wheel-item"));
    const entries = wheelItems.map((item) => item.querySelector(".wheel-btn").dataset);
    const field = (name) => badge.querySelector(`[data-field="${name}"]`);
    const elIndex = section.querySelector(".detail-index");
    const elMeta = section.querySelector(".detail-meta");
    const elTitle = section.querySelector(".detail-title");
    const elNote = section.querySelector(".detail-note");
    const prevBtn = section.querySelector(".detail-prev");
    const nextBtn = section.querySelector(".detail-next");
    const N = entries.length;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.classList.add("is-live");


    // ─── Badge themes ────────────────────────────────────────
    const THEMES = {
        leadership: {
            "--b-bg": "#161412", "--b-ink": "#f4efe6", "--b-soft": "rgba(244, 239, 230, 0.62)",
            "--b-band": "#662020", "--b-band-ink": "#f4efe6", "--b-photo": "rgba(244, 239, 230, 0.08)",
            "--b-rule": "rgba(244, 239, 230, 0.16)", "--b-invert": 0
        },
        hackathon: {
            "--b-bg": "#ffffff", "--b-ink": "#161412", "--b-soft": "rgba(91, 83, 77, 1)",
            "--b-band": "#161412", "--b-band-ink": "#f4efe6", "--b-photo": "rgba(22, 20, 18, 0.06)",
            "--b-rule": "rgba(22, 20, 18, 0.14)", "--b-invert": 0.88
        },
        // Shumokh's own badge: what the card returns to for awards and certificates
        default: {
            "--b-bg": "#ece4d6", "--b-ink": "#161412", "--b-soft": "rgba(91, 83, 77, 1)",
            "--b-band": "#662020", "--b-band-ink": "#f4efe6", "--b-photo": "rgba(102, 32, 32, 0.08)",
            "--b-rule": "rgba(22, 20, 18, 0.14)", "--b-invert": 0.88
        }
    };

    const contentFor = (d) => {
        if (d.kind === "leadership") return { theme: "leadership", band: "Leadership", big: d.title, sub: d.org, footL: "Term", footR: d.year };
        if (d.kind === "hackathon") return { theme: "hackathon", band: "Hackathon", big: d.title, sub: d.role || "", footL: d.org, footR: d.year };
        return { theme: "default", band: "Student", big: "Shumokh Alsharif", sub: "Software Engineering, University of Jeddah", footL: "B.Sc. Software Eng.", footR: "2023–27" };
    };

    // every image for an entry: its own photos first, then its certificate
    const imagesFor = (d) => [
        ...(d.photos || "").split(",").map((s) => s.trim()).filter(Boolean),
        ...(d.certSrc ? [d.certSrc] : [])
    ];


    // ─── Lightbox ────────────────────────────────────────────
    const lightbox = document.getElementById("certLightbox");
    const lightboxImg = lightbox?.querySelector(".cert-lightbox-img");
    const lightboxName = lightbox?.querySelector(".cert-lightbox-name");
    const lightboxMeta = lightbox?.querySelector(".cert-lightbox-meta");
    const lightboxClose = lightbox?.querySelector(".cert-lightbox-close");
    let lastTrigger = null;

    const openLightbox = ({ src, alt, name, meta }, from) => {
        if (!lightbox || !lightboxImg) return;
        lastTrigger = from;
        lightboxImg.src = src;
        lightboxImg.alt = alt || "";
        if (lightboxName) lightboxName.textContent = name || "";
        if (lightboxMeta) lightboxMeta.textContent = meta || "";
        lightbox.hidden = false;
        document.body.classList.add("cert-lightbox-open");
        window.lenis?.stop();
        requestAnimationFrame(() => lightbox.classList.add("is-open"));
        lightboxClose?.focus();
    };

    const closeLightbox = () => {
        if (!lightbox || lightbox.hidden) return;
        lightbox.classList.remove("is-open");
        document.body.classList.remove("cert-lightbox-open");
        window.lenis?.start();
        const finish = () => { lightbox.hidden = true; };
        if (reduceMotion) finish();
        else lightbox.addEventListener("transitionend", finish, { once: true });
        if (lastTrigger?.isConnected) lastTrigger.focus();
        lastTrigger = null;
    };

    lightbox?.querySelectorAll("[data-cert-close]").forEach((el) => el.addEventListener("click", closeLightbox));
    document.addEventListener("keydown", (e) => {
        if (!lightbox || lightbox.hidden) return;
        if (e.key === "Escape") closeLightbox();
        else if (e.key === "Tab") { e.preventDefault(); lightboxClose?.focus(); }
    });


    // ─── Photo collage: tiles grow out of small rounded squares
    const SEED = 56; // px: the little square each tile starts as
    const seedClip = (el) => {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const s = Math.min(SEED, w, h);
        return `inset(${(h - s) / 2}px ${(w - s) / 2}px ${(h - s) / 2}px ${(w - s) / 2}px round ${s * 0.32}px)`;
    };
    const FULL = "inset(0px 0px 0px 0px round 18px)";
    let mediaKey = "";
    let mediaRun = 0;

    const buildTiles = (d, list) => {
        media.innerHTML = "";
        const shown = list.slice(0, 4);
        media.dataset.count = String(shown.length);

        shown.forEach((src, i) => {
            const isDoc = src === d.certSrc;
            const tile = document.createElement("button");
            tile.type = "button";
            tile.className = "media-tile" + (isDoc ? " is-doc" : "");
            if (shown.length === 3) tile.style.gridArea = ["a", "b", "c"][i];
            const label = isDoc ? `View certificate: ${d.certName}` : `View photo ${i + 1} of ${list.length}: ${d.title}`;
            tile.setAttribute("aria-label", label);

            const img = document.createElement("img");
            img.src = src;
            img.alt = "";
            img.decoding = "async";
            tile.appendChild(img);

            if (i === 3 && list.length > 4) {
                const more = document.createElement("span");
                more.className = "media-more";
                more.textContent = `+${list.length - 4}`;
                tile.appendChild(more);
            }

            tile.addEventListener("click", () => openLightbox(isDoc
                ? { src, alt: d.certAlt, name: d.certName, meta: d.certMeta }
                : { src, alt: `${d.title} photo ${i + 1}`, name: d.title, meta: [d.org, d.year].filter(Boolean).join(" · ") }, tile));
            media.appendChild(tile);
        });
    };

    const setMedia = (d, instant) => {
        const list = imagesFor(d);
        const key = list.join("|");
        if (key === mediaKey) return;
        mediaKey = key;
        const run = ++mediaRun;
        const old = Array.from(media.children);
        gsap.killTweensOf(old);

        const grow = () => {
            if (run !== mediaRun) return; // a newer entry took over mid-animation
            buildTiles(d, list);
            if (instant || reduceMotion || !list.length) return;
            const tiles = Array.from(media.children);
            gsap.fromTo(tiles,
                { clipPath: (i, el) => seedClip(el), opacity: 0 },
                { clipPath: FULL, opacity: 1, duration: 0.9, ease: "expo.out", stagger: 0.1, clearProps: "clipPath" });
        };

        if (old.length && !instant && !reduceMotion) {
            gsap.set(old, { clipPath: FULL });
            gsap.to(old, {
                clipPath: (i, el) => seedClip(el),
                opacity: 0,
                duration: 0.3,
                ease: "power2.in",
                stagger: 0.03,
                onComplete: grow
            });
        } else {
            grow();
        }
    };


    // ─── Restyle the badge for an entry ──────────────────────
    let active = -1;

    const render = (index, instant) => {
        active = index;
        const d = entries[index];
        const c = contentFor(d);

        if (instant || reduceMotion) gsap.set(badge, THEMES[c.theme]);
        else gsap.to(badge, { ...THEMES[c.theme], duration: 0.6, ease: "power2.inOut", overwrite: "auto" });

        ["band", "big", "sub", "footL", "footR"].forEach((name) => {
            const el = field(name);
            if (el.textContent === c[name]) return;
            if (instant || reduceMotion) { el.textContent = c[name]; return; }
            gsap.timeline()
                .to(el, { opacity: 0, duration: 0.18, ease: "power1.in", overwrite: true })
                .call(() => { el.textContent = c[name]; })
                .to(el, { opacity: 1, duration: 0.35, ease: "power1.out" });
        });

        setMedia(d, instant);

        elIndex.textContent = String(index + 1).padStart(2, "0");
        elMeta.textContent = [d.label, d.org, d.year].filter(Boolean).join(" · ");
        elTitle.textContent = d.title;
        elNote.textContent = d.note;
        wheelItems.forEach((item, i) => {
            item.classList.toggle("is-active", i === index);
            item.querySelector("button").setAttribute("aria-current", i === index ? "true" : "false");
        });
        if (!instant && !reduceMotion) {
            gsap.fromTo([elMeta, elTitle, elNote], { opacity: 0, y: 8 },
                { opacity: 1, y: 0, duration: 0.5, ease: "expo.out", stagger: 0.04, overwrite: true });
        }
    };

    const go = (index) => {
        index = gsap.utils.clamp(0, N - 1, index);
        if (index !== active) render(index, false);
    };

    render(0, true);


    // ─── Timeline wheel (a 3D drum) ──────────────────────────
    // raw transforms: the drum needs rotate-then-push-out, the opposite
    // of GSAP's translate-then-rotate order
    const THETA = 22;
    let radius = 0;
    const placeWheel = () => {
        radius = wheelItems[0].offsetHeight / (2 * Math.tan((THETA * Math.PI) / 360));
        wheelItems.forEach((item, i) => {
            item.style.transform = `rotateX(${-i * THETA}deg) translateZ(${radius}px)`;
        });
    };
    const spinWheel = (f) => {
        drum.style.transform = `translateZ(${-radius}px) rotateX(${f * THETA}deg)`;
        wheelItems.forEach((item, i) => {
            const dist = Math.abs(i - f);
            item.style.opacity = gsap.utils.clamp(0, 1, 1 - dist * 0.28);
            item.style.visibility = dist > 3.6 ? "hidden" : "visible";
        });
    };


    // ─── Entrance: lowers in once, swings a little, settles ──
    if (!reduceMotion) {
        gsap.set(rig, { y: -(rig.offsetHeight + 40) });
        ScrollTrigger.create({
            trigger: section,
            start: "top 62%",
            once: true,
            onEnter: () => {
                gsap.timeline()
                    .to(rig, { y: 0, duration: 1.5, ease: "power3.out" })
                    .to(rig, {
                        keyframes: { rotation: [0, 4, -2.4, 1.1, -0.4, 0], easeEach: "sine.inOut" },
                        duration: 2.4
                    }, 0.55);
            }
        });
    }


    // ─── Modes ───────────────────────────────────────────────
    const mm = gsap.matchMedia();

    mm.add({
        pinned: "(min-width: 901px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)",
        stepped: "(max-width: 900px), (max-height: 599px), (prefers-reduced-motion: reduce)"
    }, (ctx) => {
        if (ctx.conditions.pinned) {
            section.classList.remove("is-stepped");
            placeWheel();
            spinWheel(Math.max(active, 0));

            const st = ScrollTrigger.create({
                trigger: pin,
                pin: true,
                start: "top top",
                end: () => `+=${(N - 1) * window.innerHeight * 0.55}`,
                invalidateOnRefresh: true,
                onRefresh: placeWheel,
                onUpdate: (self) => {
                    const f = self.progress * (N - 1);
                    spinWheel(f);
                    go(Math.round(f));
                }
            });

            const onWheelClick = (e) => {
                const btn = e.target.closest(".wheel-btn");
                if (!btn) return;
                const y = st.start + (Number(btn.dataset.index) / (N - 1)) * (st.end - st.start);
                if (window.lenis) window.lenis.scrollTo(y, { duration: 1 });
                else window.scrollTo({ top: y, behavior: "smooth" });
            };
            drum.addEventListener("click", onWheelClick);
            return () => drum.removeEventListener("click", onWheelClick);
        }

        // stepped: buttons and swipes on the badge
        section.classList.add("is-stepped");
        const onPrev = () => go(active - 1);
        const onNext = () => go(active + 1);
        prevBtn.addEventListener("click", onPrev);
        nextBtn.addEventListener("click", onNext);

        let startX = null;
        const down = (e) => { startX = e.clientX; };
        const up = (e) => {
            if (startX === null) return;
            const dx = e.clientX - startX;
            startX = null;
            if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1));
        };
        lanyard.addEventListener("pointerdown", down);
        lanyard.addEventListener("pointerup", up);

        return () => {
            prevBtn.removeEventListener("click", onPrev);
            nextBtn.removeEventListener("click", onNext);
            lanyard.removeEventListener("pointerdown", down);
            lanyard.removeEventListener("pointerup", up);
        };
    });

});
