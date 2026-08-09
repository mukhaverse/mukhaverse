document.addEventListener("DOMContentLoaded", () => {
    const track = document.getElementById("certTrack");
    if (!track) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ─── Dot pagination ──────────────────────────────────────────
    const dotsContainer = document.getElementById("certDots");
    const tiles = Array.from(track.querySelectorAll(".cert-tile"));

    if (dotsContainer && tiles.length) {
        const dots = tiles.map((tile, i) => {
            const tileBtn = tile.querySelector(".cert-tile-btn");
            const label = (tileBtn && tileBtn.dataset.certName) || `certificate ${i + 1}`;

            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "cert-dot";
            dot.setAttribute("role", "tab");
            dot.setAttribute("aria-label", `Jump to ${label}`);

            dot.addEventListener("click", () => {
                const target = tile.offsetLeft - (track.clientWidth - tile.offsetWidth) / 2;
                const max = track.scrollWidth - track.clientWidth;
                track.scrollTo({
                    left: Math.max(0, Math.min(target, max)),
                    behavior: reduceMotion ? "auto" : "smooth"
                });
            });

            dotsContainer.appendChild(dot);
            return dot;
        });

        const updateActiveDot = () => {
            const center = track.scrollLeft + track.clientWidth / 2;
            let closest = 0;
            let closestDist = Infinity;

            tiles.forEach((tile, i) => {
                const tileCenter = tile.offsetLeft + tile.offsetWidth / 2;
                const dist = Math.abs(tileCenter - center);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = i;
                }
            });

            dots.forEach((dot, i) => {
                const active = i === closest;
                dot.classList.toggle("is-active", active);
                dot.setAttribute("aria-selected", String(active));
            });
        };

        track.addEventListener("scroll", () => {
            window.requestAnimationFrame(updateActiveDot);
        }, { passive: true });

        window.addEventListener("resize", updateActiveDot);
        updateActiveDot();
    }

    // ─── Lightbox ──────────────────────────────────────────────
    const lightbox = document.getElementById("certLightbox");
    const lightboxImg = lightbox ? lightbox.querySelector(".cert-lightbox-img") : null;
    const lightboxName = lightbox ? lightbox.querySelector(".cert-lightbox-name") : null;
    const lightboxMeta = lightbox ? lightbox.querySelector(".cert-lightbox-meta") : null;
    const lightboxCloseBtn = lightbox ? lightbox.querySelector(".cert-lightbox-close") : null;
    let lastTrigger = null;

    const openLightbox = (btn) => {
        if (!lightbox || !lightboxImg) return;
        const img = btn.querySelector("img");
        if (!img) return;

        lastTrigger = btn;
        lightboxImg.src = img.currentSrc || img.src;
        lightboxImg.alt = img.alt;
        if (lightboxName) lightboxName.textContent = btn.dataset.certName || "";
        if (lightboxMeta) lightboxMeta.textContent = btn.dataset.certMeta || "";

        lightbox.hidden = false;
        document.body.classList.add("cert-lightbox-open");

        requestAnimationFrame(() => lightbox.classList.add("is-open"));

        if (lightboxCloseBtn) lightboxCloseBtn.focus();
    };

    const closeLightbox = () => {
        if (!lightbox || lightbox.hidden) return;
        lightbox.classList.remove("is-open");
        document.body.classList.remove("cert-lightbox-open");

        const finish = () => { lightbox.hidden = true; };

        if (reduceMotion) {
            finish();
        } else {
            lightbox.addEventListener("transitionend", finish, { once: true });
        }

        if (lastTrigger) {
            lastTrigger.focus();
            lastTrigger = null;
        }
    };

    document.querySelectorAll(".cert-tile-btn").forEach((btn) => {
        btn.addEventListener("click", () => openLightbox(btn));
    });

    if (lightbox) {
        lightbox.querySelectorAll("[data-cert-close]").forEach((el) => {
            el.addEventListener("click", closeLightbox);
        });

        document.addEventListener("keydown", (e) => {
            if (lightbox.hidden) return;
            if (e.key === "Escape") {
                closeLightbox();
            } else if (e.key === "Tab") {
                // the panel holds a single focusable control, so keep focus pinned to it
                e.preventDefault();
                if (lightboxCloseBtn) lightboxCloseBtn.focus();
            }
        });
    }

    // ─── Scroll-in reveal ────────────────────────────────────────
    if (typeof gsap === "undefined" || reduceMotion) return;
    if (!tiles.length) return;

    gsap.registerPlugin(ScrollTrigger);

    gsap.set(tiles, { opacity: 0, y: 30 });

    ScrollTrigger.create({
        trigger: ".cert-strip",
        start: "top 88%",
        once: true,
        onEnter: () => {
            gsap.to(tiles, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power2.out",
                stagger: 0.08
            });
        }
    });
});
