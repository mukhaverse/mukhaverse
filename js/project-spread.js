// A project with several shots keeps them in the page. Clicking the cover opens
// a sheet of every shot under it, pushing the write-up down, and the shot you
// pick takes over the cover. Everything is built from the cover's data-media;
// without JS the cover just stays on its first shot.
document.addEventListener("DOMContentLoaded", () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SHEET_MS = 500;   // the sheet's transition in projects.css


    // ─── The pins below ──────────────────────────────────────
    // the page has changed height, so everything measured further down
    // measures again, once the sheet has landed and any glide has stopped
    // (only "smooth": Lenis stays on "native" after a refresh until the next scroll)
    let settling = 0;
    const settle = () => {
        clearTimeout(settling);
        let tries = 12;
        const refresh = () => {
            if (window.lenis?.isScrolling === "smooth" && tries-- > 0) { settling = setTimeout(refresh, 120); return; }
            window.ScrollTrigger?.refresh();
        };
        settling = setTimeout(refresh, reduceMotion ? 0 : SHEET_MS + 40);
    };

    // an opened sheet may land below the fold: bring it up, but never push
    // the cover out of sight (on phones, under the strip stuck to the top)
    const bringIntoView = (cover, row, sheetHeight) => {
        const strip = window.matchMedia("(max-width: 760px)").matches ? document.querySelector(".fx-deck") : null;
        const top = (strip ? strip.getBoundingClientRect().bottom : 0) + 24;
        const short = row.getBoundingClientRect().bottom + sheetHeight + 24 - window.innerHeight;
        const by = Math.min(short, cover.getBoundingClientRect().top - top);
        if (by <= 0) return;
        const y = window.scrollY + by;
        if (window.lenis) window.lenis.scrollTo(y, { duration: 0.6, immediate: reduceMotion });
        else window.scrollTo(0, y);
    };


    // ─── One project ─────────────────────────────────────────
    document.querySelectorAll(".fx-thumb[data-spread]").forEach((cover, n) => {
        const media = JSON.parse(cover.dataset.media);
        const title = cover.dataset.projectTitle;

        const lead = cover.querySelector("img");
        lead.classList.add("fx-shot", "fx-shot-lead", "is-on");
        const layers = [lead];

        const sheet = document.createElement("div");
        sheet.className = "fx-sheet";
        sheet.id = `fx-sheet-${n}`;
        const inner = document.createElement("div");
        const grid = document.createElement("div");
        grid.className = "fx-sheet-grid";
        grid.inert = true;
        inner.append(grid);
        sheet.append(inner);

        const row = document.createElement("div");
        row.className = "fx-shots-row";
        const count = document.createElement("p");
        count.className = "fx-shots-count";
        count.setAttribute("aria-live", "polite");
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "fx-more";
        toggle.setAttribute("aria-controls", sheet.id);
        row.append(count, toggle);

        const shots = document.createElement("div");
        shots.className = "fx-shots";
        shots.append(sheet, row);
        cover.after(shots);
        cover.setAttribute("aria-controls", sheet.id);


        // ─── Shots ───────────────────────────────────────────
        // a clip loads the first time it's picked, and plays only on screen
        let onScreen = false;
        let now = 0;

        const syncVideo = () => {
            layers.forEach((layer, i) => {
                if (!(layer instanceof HTMLVideoElement)) return;
                if (i === now && onScreen) layer.play().catch(() => {});
                else layer.pause();
            });
        };

        const layerFor = (i) => {
            if (layers[i]) return layers[i];
            const item = media[i];
            const layer = document.createElement(item.type === "video" ? "video" : "img");
            layer.className = "fx-shot";
            layer.src = item.src;
            if (item.type === "video") {
                layer.muted = true;
                layer.loop = true;
                layer.playsInline = true;
                if (item.poster) layer.poster = item.poster;
            } else {
                layer.alt = "";
            }
            cover.append(layer);
            layers[i] = layer;
            return layer;
        };

        const picks = media.map((item, i) => {
            const pick = document.createElement("button");
            pick.type = "button";
            pick.className = "fx-sheet-shot";
            pick.classList.toggle("is-clip", item.type === "video");
            pick.setAttribute("aria-label", `Show ${item.alt}`);
            const thumb = document.createElement("img");
            thumb.src = item.poster || item.src;
            thumb.alt = "";
            thumb.loading = "lazy";
            pick.append(thumb);
            pick.addEventListener("click", () => show(i));
            grid.append(pick);
            return pick;
        });

        const show = (i) => {
            now = i;
            const shown = layerFor(i);
            // the new shot comes up on the next frame, so a fresh layer fades too
            requestAnimationFrame(() => layers.forEach((layer) => layer?.classList.toggle("is-on", layer === shown)));
            picks.forEach((pick, k) => {
                if (k === i) pick.setAttribute("aria-current", "true");
                else pick.removeAttribute("aria-current");
            });
            count.textContent = `Shot ${i + 1} of ${media.length}`;
            syncVideo();
        };

        new IntersectionObserver(([e]) => {
            onScreen = e.isIntersecting;
            syncVideo();
        }, { threshold: 0.25 }).observe(cover);


        // ─── Open and shut ───────────────────────────────────
        const setOpen = (open) => {
            sheet.classList.toggle("is-open", open);
            grid.inert = !open;
            toggle.textContent = open ? "Hide shots" : `Show all ${media.length}`;
            toggle.setAttribute("aria-expanded", open);
            cover.setAttribute("aria-expanded", open);
            cover.setAttribute("aria-label", open ? `Hide the ${title} shots` : `Show all ${media.length} ${title} shots`);
        };

        const flip = () => {
            const open = !sheet.classList.contains("is-open");
            setOpen(open);
            if (open) bringIntoView(cover, row, grid.offsetHeight);
            settle();
        };

        cover.addEventListener("click", flip);
        toggle.addEventListener("click", flip);

        setOpen(false);
        show(0);
    });
});
