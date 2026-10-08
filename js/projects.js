// Projects — "My Deck of Work"
// Sticky index bar that follows the active card, stacked sticky cards
// on desktop, and an inline media gallery inside every card.
const { gsap, ScrollTrigger } = window;

document.addEventListener("DOMContentLoaded", () => {
    const section = document.getElementById("projects");
    const cards = section ? Array.from(section.querySelectorAll(".deck-card")) : [];
    if (!cards.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = Boolean(gsap && ScrollTrigger) && !reduceMotion;


    // ─── Galleries ───────────────────────────────────────────
    const galleries = cards.map((card) => {
        const root = card.querySelector(".deck-gallery");
        const stage = root.querySelector(".deck-stage");
        const expand = root.querySelector(".deck-expand");
        const thumbs = Array.from(root.querySelectorAll(".deck-thumb"));
        let media = [];
        try { media = JSON.parse(root.dataset.media || "[]"); } catch (e) { media = []; }

        // the element being shown (during a crossfade the old one is still in the DOM)
        let currentEl = stage.querySelector("img, video");
        let wantsPlay = false;

        const playIfWanted = () => {
            const el = currentEl;
            if (el && el.tagName === "VIDEO") {
                if (wantsPlay && !reduceMotion) el.play().catch(() => {});
                else el.pause();
            }
        };

        const show = (index) => {
            const item = media[index];
            if (!item) return;
            const old = currentEl;

            let el;
            if (item.type === "video") {
                el = document.createElement("video");
                el.src = item.src;
                el.muted = true;
                el.loop = true;
                el.playsInline = true;
                el.setAttribute("aria-label", item.alt || "");
                if (reduceMotion) el.controls = true;
            } else {
                el = document.createElement("img");
                el.src = item.src;
                el.alt = item.alt || "";
            }

            stage.classList.toggle("is-video", item.type === "video");
            stage.insertBefore(el, expand);
            currentEl = el;
            if (old) {
                if (old.tagName === "VIDEO") old.pause();
                if (animate) {
                    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
                    gsap.to(old, { opacity: 0, duration: 0.25, onComplete: () => old.remove() });
                } else {
                    old.remove();
                }
            }

            thumbs.forEach((t, i) => t.setAttribute("aria-pressed", String(i === index)));
            if (expand) expand.dataset.start = String(index);
            playIfWanted();
        };

        thumbs.forEach((thumb) => {
            thumb.addEventListener("click", () => {
                wantsPlay = true;
                show(Number(thumb.dataset.index));
            });
        });

        // fill in video thumbnails only once the card gets close
        const thumbVideos = root.querySelectorAll(".deck-thumb video[data-src]");
        if (thumbVideos.length) {
            const io = new IntersectionObserver(([entry]) => {
                if (!entry.isIntersecting) return;
                thumbVideos.forEach((v) => { v.src = v.dataset.src; v.preload = "metadata"; });
                io.disconnect();
            }, { rootMargin: "600px 0px" });
            io.observe(root);
        }

        return {
            setPlaying(on) { wantsPlay = on; playIfWanted(); }
        };
    });


    // ─── Index bar ───────────────────────────────────────────
    const nav = section.querySelector(".deck-nav");
    const navLinks = Array.from(section.querySelectorAll(".deck-nav-link"));
    const linkBar = section.querySelector(".deck-nav-links");
    let activeIndex = -1;

    const setActive = (index) => {
        if (index === activeIndex) return;
        activeIndex = index;
        navLinks.forEach((link, i) => {
            const on = i === index;
            link.classList.toggle("is-active", on);
            if (on) {
                link.setAttribute("aria-current", "true");
                if (linkBar.scrollWidth > linkBar.clientWidth) {
                    linkBar.scrollTo({ left: link.offsetLeft - 16, behavior: reduceMotion ? "auto" : "smooth" });
                }
            } else {
                link.removeAttribute("aria-current");
            }
        });
        galleries.forEach((g, i) => g.setPlaying(i === index));
    };

    if (!gsap || !ScrollTrigger) {
        // no GSAP: plain anchors still work (scroll-margin-top handles the bar)
        galleries.forEach((g) => g.setPlaying(true));
        return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const triggers = cards.map((card, i) => ScrollTrigger.create({
        trigger: card,
        start: "top 60%",
        endTrigger: cards[i + 1] || card,
        end: cards[i + 1] ? "top 60%" : "bottom top",
        onToggle: (self) => { if (self.isActive) setActive(i); }
    }));

    ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onLeave: () => setActive(-1),
        onLeaveBack: () => setActive(-1)
    });

    navLinks.forEach((link, i) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            // the card's natural top, landed just under the sticky bar
            const naturalTop = triggers[i].start + window.innerHeight * 0.6;
            const target = naturalTop - nav.offsetHeight - 16;
            if (window.lenis) window.lenis.scrollTo(target, { duration: reduceMotion ? 0 : 1.2 });
            else window.scrollTo({ top: target, behavior: reduceMotion ? "auto" : "smooth" });
            history.replaceState(null, "", link.getAttribute("href"));
        });
    });

    if (!animate) return;

    // progress line under the index bar
    gsap.to(".deck-nav-progress-fill", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: ".deck", start: "top 70%", end: "bottom bottom", scrub: true }
    });


    // ─── Stacking ────────────────────────────────────────────
    const mm = gsap.matchMedia();

    mm.add({
        stack: "(min-width: 901px) and (min-height: 621px)",
        flat: "(max-width: 900px), (max-height: 620px)"
    }, (ctx) => {
        const { stack } = ctx.conditions;

        cards.forEach((card, i) => {
            const face = card.querySelector(".deck-card-face");
            const shade = card.querySelector(".deck-shade");

            if (!stack) {
                gsap.from(face, {
                    y: 60,
                    opacity: 0,
                    duration: 1,
                    ease: "expo.out",
                    scrollTrigger: { trigger: card, start: "top 90%", once: true }
                });
                return;
            }

            // slides up into place
            gsap.fromTo(face,
                { y: 80 },
                {
                    y: 0,
                    ease: "power2.out",
                    scrollTrigger: { trigger: card, start: "top bottom", end: "top 40%", scrub: 0.6 }
                }
            );

            // covered: sinks back as the next card lands on it
            const next = cards[i + 1];
            if (!next) return;

            gsap.timeline({
                scrollTrigger: {
                    trigger: next,
                    start: "top bottom",
                    end: () => `top ${parseFloat(getComputedStyle(next).top) || 0}px`,
                    scrub: 0.6,
                    invalidateOnRefresh: true
                }
            })
                .to(face, { scale: 0.94, ease: "none" }, 0)
                .to(shade, { opacity: 0.22, ease: "none" }, 0);
        });
    });
});
