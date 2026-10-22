// Projects — "My Deck of Work"
// The section pins and its cover thumbnails form one column. Scrolling
// moves focus down the column: the focused thumbnail grows, the rest
// shrink, and the focused project's info slides through masks into the
// bottom-left corner. Clicking a thumbnail focuses it; clicking the
// focused one opens every shot in the carousel (project-carousel.js).
const { gsap, ScrollTrigger } = window;

document.addEventListener("DOMContentLoaded", () => {
    const section = document.getElementById("projects");
    const frame = section?.querySelector(".fx");
    const items = section ? Array.from(section.querySelectorAll(".fx-item")) : [];
    if (!frame || !items.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!gsap || !ScrollTrigger || reduceMotion) return;  // the plain list stays
    gsap.registerPlugin(ScrollTrigger);

    const N = items.length;
    const thumbs = items.map((li) => li.querySelector(".fx-thumb"));
    const infos = items.map((li) => li.querySelector(".fx-info"));
    const countNow = section.querySelector(".fx-count-now");
    const titles = items.map((li) => li.querySelector(".fx-title").textContent);
    const openLabels = thumbs.map((t) => t.getAttribute("aria-label"));
    const pad = (n) => String(n + 1).padStart(2, "0");

    // wrap every info row in a mask; rows are listed top to bottom as shown
    // (the title sits last, under its details)
    const rows = infos.map((info) => {
        const els = Array.from(info.children);
        els.forEach((el) => {
            const ln = document.createElement("div");
            ln.className = "fx-ln"
                + (el.classList.contains("fx-title") ? " is-title" : "")
                + (el.classList.contains("deck-list") ? " is-list" : "");
            info.insertBefore(ln, el);
            ln.appendChild(el);
        });
        return [...els.filter((el) => !el.classList.contains("fx-title")), info.querySelector(".fx-title")];
    });

    const index = document.createElement("ol");
    index.className = "fx-index";
    index.setAttribute("aria-label", "Jump to a project");
    index.innerHTML = items.map((li, i) =>
        `<li><button type="button" data-i="${i}">${titles[i].replace("Computer Vision & ", "").replace(" Exhibition", "")}</button></li>`).join("");
    const indexBtns = Array.from(index.querySelectorAll("button"));


    // ─── Geometry ────────────────────────────────────────────
    let G = null;
    let step = 1;
    let st = null;

    const measure = () => {
        const W = frame.clientWidth;
        const H = frame.clientHeight;
        const phone = W < 700;
        // phones: the column sits right of centre, leaving the left for the index
        const x = phone ? W * 0.36 : W * 0.44;
        let bigW = phone ? W - x - 16 : W * 0.3;
        let bigH = bigW / 1.6;
        const cap = H * (phone ? 0.24 : 0.46);
        if (bigH > cap) { bigH = cap; bigW = bigH * 1.6; }
        G = {
            x,
            phone,
            focusY: phone ? H * 0.34 : H * 0.47,
            topEdge: section.querySelector(".fx-top").getBoundingClientRect().height + 24,
            bigH,
            sMin: phone ? 0.45 : 0.4,
            gap: phone ? 8 : 10
        };
        frame.style.setProperty("--fx-w", `${bigW}px`);
        frame.style.setProperty("--fx-h", `${bigH}px`);
        step = Math.round(H * 0.6);
    };

    // f runs 0 → N-1 across the pin; whole numbers are a project in focus
    const layout = (f) => {
        const s = [];
        const ys = [];
        let y = 0;
        for (let i = 0; i < N; i++) {
            const k = Math.max(0, 1 - Math.abs(i - f));
            s[i] = G.sMin + (1 - G.sMin) * k * k * (3 - 2 * k);
            ys[i] = y;
            y += G.bigH * s[i] + G.gap;
        }
        const a = Math.floor(f);
        const b = Math.min(N - 1, a + 1);
        const mid = (i) => ys[i] + (G.bigH * s[i]) / 2;
        const off = G.focusY - (mid(a) + (mid(b) - mid(a)) * (f - a));
        setActive(Math.round(f));

        // phones have no empty margins, so thumbnails fade out before they
        // reach the heading or the title instead of sliding under them
        const floor = G.phone ? infos[active].offsetTop - 16 : 0;
        thumbs.forEach((t, i) => {
            const top = ys[i] + off;
            t.style.transform = `translate(${G.x}px, ${top}px) scale(${s[i]})`;
            if (!G.phone) { t.style.opacity = ""; return; }
            const bottom = top + G.bigH * s[i];
            const fade = Math.min((top - G.topEdge + 48) / 48, (floor + 48 - bottom) / 48);
            t.style.opacity = Math.max(0, Math.min(1, fade));
        });
    };


    // ─── Focus + info swap ───────────────────────────────────
    let active = -1;

    const setActive = (i) => {
        if (i === active) return;
        const prev = active;
        const dir = prev < 0 ? 1 : Math.sign(i - prev);
        active = i;

        thumbs.forEach((t, j) => {
            t.classList.toggle("is-focus", j === i);
            t.setAttribute("aria-label", j === i ? openLabels[j] : `Show ${titles[j]}`);
        });
        indexBtns.forEach((b, j) => b.setAttribute("aria-current", String(j === i)));
        if (countNow) countNow.textContent = pad(i);

        const next = infos[i];
        gsap.killTweensOf(rows[i]);
        next.classList.add("is-on");

        if (prev < 0) {
            gsap.set(rows[i], { y: 0 });
            return;
        }

        const old = infos[prev];
        gsap.killTweensOf(rows[prev]);
        gsap.to(rows[prev], {
            y: (k, el) => -dir * (el.offsetHeight + 12),
            duration: 0.32,
            ease: "power2.in",
            stagger: 0.025,
            onComplete: () => {
                old.classList.remove("is-on");
                gsap.set(rows[prev], { y: 0 });
            }
        });
        gsap.fromTo(rows[i],
            { y: (k, el) => dir * (el.offsetHeight + 12) },
            { y: 0, duration: 0.62, ease: "power3.out", stagger: 0.055, delay: 0.16 }
        );
    };

    const go = (i) => {
        if (!st) return;
        const y = st.start + i * step;
        if (window.lenis) window.lenis.scrollTo(y, { duration: 0.9 });
        else window.scrollTo({ top: y, behavior: "smooth" });
    };

    // a thumbnail out of focus scrolls to its project instead of opening
    // the carousel (capture runs before the carousel's own listener)
    frame.addEventListener("click", (e) => {
        if (!st) return;
        const t = e.target.closest(".fx-thumb");
        if (!t || t.classList.contains("is-focus")) return;
        e.stopPropagation();
        go(thumbs.indexOf(t));
    }, true);

    // tabbing onto a thumbnail brings it into focus
    frame.addEventListener("focusin", (e) => {
        if (!st) return;
        const t = e.target.closest(".fx-thumb");
        if (t && !t.classList.contains("is-focus")) go(thumbs.indexOf(t));
    });

    indexBtns.forEach((b) => b.addEventListener("click", () => go(Number(b.dataset.i))));

    // settle on the nearest project once scrolling stops
    const settle = () => {
        if (!st || !st.isActive) return;
        const target = st.start + Math.round((window.scrollY - st.start) / step) * step;
        if (Math.abs(target - window.scrollY) > 2) go(Math.round((target - st.start) / step));
    };


    // ─── Pin (only where a full screen fits) ─────────────────
    const mm = gsap.matchMedia();

    mm.add("(min-height: 560px)", () => {
        section.classList.add("fx-on");
        frame.appendChild(index);
        measure();

        st = ScrollTrigger.create({
            trigger: section,
            start: "top top",
            end: () => `+=${(N - 1) * step}`,
            pin: true,
            invalidateOnRefresh: true,
            onRefreshInit: measure,
            onRefresh: (self) => layout(self.progress * (N - 1)),
            onUpdate: (self) => layout(self.progress * (N - 1))
        });
        layout(st.progress * (N - 1));
        ScrollTrigger.addEventListener("scrollEnd", settle);

        return () => {
            ScrollTrigger.removeEventListener("scrollEnd", settle);
            st = null;
            active = -1;
            section.classList.remove("fx-on");
            index.remove();
            gsap.killTweensOf(rows.flat());
            gsap.set(rows.flat(), { clearProps: "transform" });
            thumbs.forEach((t, i) => {
                t.style.transform = "";
                t.style.opacity = "";
                t.classList.remove("is-focus");
                t.setAttribute("aria-label", openLabels[i]);
            });
            infos.forEach((info) => info.classList.remove("is-on"));
        };
    });
});
