// Projects — "My Deck of Work"
// The projects scroll as a plain list. Beside them (above them, as a
// strip, on phones) a sticky panel holds Hairline's Riffle, a tray of
// eight index cards (Lucas Marques, MIT, github.com/lucasmarkes/hairline).
// As each project crosses the middle of the screen the Riffle pulls that
// project's card, the rest ripple away from it, and the number over the
// tray turns to the project's.
// The Riffle only answers its own pointer and arrow keys, so the scroll
// drives it through those keys. Here it is a picture: it takes no
// pointer, and it stays out of the tab order and the screen reader.
// A project with several shots opens them in the page (project-spread.js).
const HAIRLINE = "https://cdn.jsdelivr.net/npm/@lucasmarkes/hairline@0.5.1/+esm";

document.addEventListener("DOMContentLoaded", () => {
    const section = document.getElementById("projects");
    const items = section ? Array.from(section.querySelectorAll(".fx-item")) : [];
    if (!items.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const thumbs = items.map((li) => li.querySelector(".fx-thumb"));
    const countNow = section.querySelector(".fx-count-now");
    const host = section.querySelector(".fx-riffle");
    const pad = (n) => String(n + 1).padStart(2, "0");


    // ─── Video covers ────────────────────────────────────────
    // a cover can be a muted loop: each one loads once it is a screen away
    // (not the whole section's at once, mid-scroll through the skills),
    // and plays only while it is on screen. With reduced motion nothing
    // starts by itself, so the visitor gets the controls instead.
    const videos = thumbs.map((t) => t.querySelector("video[data-src]"));
    const visible = new Set();

    videos.forEach((v, i) => {
        if (!v) return;
        v.controls = reduceMotion;
        v.addEventListener("playing", () => thumbs[i].classList.add("is-playing"));
        v.addEventListener("pause", () => thumbs[i].classList.remove("is-playing"));
    });

    const syncVideos = () => {
        videos.forEach((v, i) => {
            if (!v || !v.src) return;
            if (!visible.has(i)) v.pause();
            else if (!reduceMotion) v.play().catch(() => {});
        });
    };

    if (videos.some(Boolean)) {
        const near = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                const v = videos[thumbs.indexOf(e.target)];
                v.src = v.dataset.src;
                v.preload = "auto";
                near.unobserve(e.target);
            });
            syncVideos();
        }, { rootMargin: "100% 0px" });
        thumbs.forEach((t, i) => { if (videos[i]) near.observe(t); });

        const seen =new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                const i = thumbs.indexOf(e.target);
                if (e.isIntersecting) visible.add(i); else visible.delete(i);
            });
            syncVideos();
        }, { threshold: 0.25 });
        thumbs.forEach((t, i) => { if (videos[i]) seen.observe(t); });
    }


    // ─── The Riffle ──────────────────────────────────────────
    let figure = null;
    let caption = "rest";   // what the Riffle says is pulled: "01" … "08", or "rest"
    const press = (key) => host.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

    // from rest the first arrow pulls card 01; Left walks towards 01, Right
    // towards 08. Escape puts the card back.
    const pull = (i) => {
        if (!figure || reduceMotion) return;
        if (i < 0) { if (caption !== "rest") press("Escape"); return; }
        for (let n = 0; n < 9 && caption !== pad(i); n++) {
            const now = /^\d+$/.test(caption) ? Number(caption) : 0;
            press(now === 0 || now > i + 1 ? "ArrowLeft" : "ArrowRight");
        }
    };

    import(HAIRLINE).then(({ riffle }) => {
        figure = riffle(host, { theme: "light", intensity: 0.7, onRead: (t) => { caption = t; } });
        pull(active);
    }).catch(() => { host.hidden = true; });


    // ─── Focus ───────────────────────────────────────────────
    // the project across the middle of the screen is the one in focus;
    // above the first one the cards go back to rest
    let active = -1;

    const setActive = (i) => {
        if (i === active) return;
        active = i;
        if (i >= 0) countNow.textContent = pad(i);
        pull(i);
    };

    const middle = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            const i = items.indexOf(e.target);
            if (e.isIntersecting) setActive(i);
            else if (i === 0 && e.boundingClientRect.top > window.innerHeight / 2) setActive(-1);
        });
    }, { rootMargin: "-45% 0px -54% 0px" });
    items.forEach((li) => middle.observe(li));
});
