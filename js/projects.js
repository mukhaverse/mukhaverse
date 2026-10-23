// Projects — "My Deck of Work"
// The section pins and every cover sits in the same large frame (the right
// side on desktop, under the heading on phones). Scrolling crossfades to
// the next project's cover, and its info slides through masks into the
// bottom-left corner.
// Clicking the cover opens every shot, with the full write-up, in the
// carousel (project-carousel.js).
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


    // ─── Video covers ────────────────────────────────────────
    // a cover can be a muted loop: it loads once the section is close,
    // and only the focused one plays while the section is on screen
    const videos = thumbs.map((t) => t.querySelector("video[data-src]"));
    const carousel = document.getElementById("projectCarousel");
    let onScreen = false;

    videos.forEach((v, i) => {
        if (!v) return;
        v.addEventListener("playing", () => thumbs[i].classList.add("is-playing"));
        v.addEventListener("pause", () => thumbs[i].classList.remove("is-playing"));
    });

    const syncVideos = () => {
        videos.forEach((v, i) => {
            if (!v || !v.src) return;
            if (i === active && onScreen && (!carousel || carousel.hidden)) v.play().catch(() => {});
            else v.pause();
        });
    };

    if (videos.some(Boolean)) {
        new IntersectionObserver(([entry], io) => {
            if (!entry.isIntersecting) return;
            videos.forEach((v) => { if (v) { v.src = v.dataset.src; v.preload = "auto"; } });
            io.disconnect();
            syncVideos();
        }, { rootMargin: "100% 0px" }).observe(section);

        new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            syncVideos();
        }).observe(frame);

        // resume once the carousel closes
        if (carousel) new MutationObserver(syncVideos).observe(carousel, { attributes: true, attributeFilter: ["hidden"] });
    }

    // phones show a short description; "Read more" opens the carousel,
    // which carries the full write-up
    infos.forEach((info, i) => {
        const read = document.createElement("button");
        read.type = "button";
        read.className = "fx-read";
        read.textContent = "Read more";
        read.addEventListener("click", () => thumbs[i].click());
        info.querySelector(".fx-actions").prepend(read);
    });

    // wrap every info row in a mask; rows are listed top to bottom as shown
    // (the title, and its tagline if any, sit last, under the details)
    const rows = infos.map((info) => {
        const els = Array.from(info.children);
        els.forEach((el) => {
            const ln = document.createElement("div");
            ln.className = "fx-ln"
                + (el.classList.contains("fx-title") ? " is-title" : "")
                + (el.classList.contains("fx-tag") ? " is-tag" : "")
                + (el.classList.contains("deck-list") ? " is-list" : "");
            info.insertBefore(ln, el);
            ln.appendChild(el);
        });
        const last = [info.querySelector(".fx-title"), info.querySelector(".fx-tag")].filter(Boolean);
        return [...els.filter((el) => !last.includes(el)), ...last];
    });

    const index = document.createElement("ol");
    index.className = "fx-index";
    index.setAttribute("aria-label", "Jump to a project");
    index.innerHTML = items.map((li, i) =>
        `<li><button type="button" data-i="${i}">${titles[i].replace(" Exhibition", "")}</button></li>`).join("");
    const indexBtns = Array.from(index.querySelectorAll("button"));


    // ─── Geometry ────────────────────────────────────────────
    let G = null;
    let step = 1;
    let st = null;

    const measure = () => {
        const W = frame.clientWidth;
        const H = frame.clientHeight;
        const top = section.querySelector(".fx-top");
        const topEdge = top.offsetTop + top.offsetHeight + 16;

        if (W < 700) {
            // phones: the cover spans the width, centred in the space
            // between the heading and the tallest info
            const infoTop = Math.min(...infos.map((info) => info.offsetTop)) - 20;
            let bigW = W - 32;
            let bigH = bigW / 1.6;
            const cap = infoTop - topEdge;
            if (bigH > cap) { bigH = cap; bigW = bigH * 1.6; }
            const y = topEdge + Math.max(0, (infoTop - topEdge - bigH) / 2);
            G = { x: (W - bigW) / 2, y, bigW, bigH };
        } else {
            // desktop: the cover fills the right side, from just past the
            // info column to the gutter, between the heading and the index
            const gutter = top.offsetLeft;
            const bottomEdge = index.offsetTop - 24;
            let bigW = W * 0.58 - gutter;
            let bigH = bigW / 1.6;
            const cap = bottomEdge - topEdge;
            if (bigH > cap) { bigH = cap; bigW = bigH * 1.6; }
            const y = topEdge + Math.max(0, (bottomEdge - topEdge - bigH) / 2);
            G = { x: W - gutter - bigW, y, bigW, bigH };
        }
        frame.style.setProperty("--fx-w", `${G.bigW}px`);
        frame.style.setProperty("--fx-h", `${G.bigH}px`);
        thumbs.forEach((t) => { t.style.transform = `translate(${G.x}px, ${G.y}px)`; });
    };

    // the frame matches the visible height; the scroll length per project
    // (step) only changes on a full refresh, so the pin never jumps
    const setHeight = () => frame.style.setProperty("--fx-vh", `${window.innerHeight}px`);
    const refreshInit = () => {
        setHeight();
        measure();
        step = Math.round(frame.clientHeight * 0.6);
    };

    // phone browser bars sliding in and out resize the viewport without a
    // ScrollTrigger refresh: re-fit the frame and the strip in place
    let lastH = window.innerHeight;
    const onResize = () => {
        if (!st || window.innerHeight === lastH) return;
        lastH = window.innerHeight;
        setHeight();
        measure();
        layout(st.progress * (N - 1));
    };

    // f runs 0 → N-1 across the pin; whole numbers are a project in focus,
    // and the cover crossfades once f passes the halfway mark
    const layout = (f) => setActive(Math.round(f));


    // ─── Focus ───────────────────────────────────────────────
    let active = -1;      // thumbnail in focus
    let shown = -1;       // info on screen (lags behind during a jump)
    let jumpTo = null;    // set while a click scrolls several projects at once

    const setActive = (i) => {
        if (i === active) return;
        active = i;
        thumbs.forEach((t, j) => t.setAttribute("aria-label", j === i ? openLabels[j] : `Show ${titles[j]}`));
        indexBtns.forEach((b, j) => b.setAttribute("aria-current", String(j === i)));
        if (countNow) countNow.textContent = pad(i);
        syncVideos();

        // mid-jump, skip the projects being passed and swap once on arrival
        if (jumpTo === null || jumpTo === i) show(i);
    };

    // the incoming cover fades in on top; the outgoing one fades out under it
    const show = (i) => {
        thumbs.forEach((t, j) => t.classList.toggle("is-focus", j === i));
        showInfo(i);
    };


    // ─── Info swap ───────────────────────────────────────────
    const showInfo = (i) => {
        if (i === shown) return;
        const prev = shown;
        const dir = prev < 0 ? 1 : Math.sign(i - prev);
        shown = i;

        gsap.killTweensOf(rows[i]);
        infos[i].classList.add("is-on");

        if (prev < 0) {
            gsap.set(rows[i], { y: 0 });
            return;
        }

        gsap.killTweensOf(rows[prev]);
        gsap.to(rows[prev], {
            y: (k, el) => -dir * (el.offsetHeight + 12),
            duration: 0.32,
            ease: "power2.in",
            stagger: 0.025,
            onComplete: () => {
                infos[prev].classList.remove("is-on");
                gsap.set(rows[prev], { y: 0 });
            }
        });
        gsap.fromTo(rows[i],
            { y: (k, el) => dir * (el.offsetHeight + 12) },
            { y: 0, duration: 0.62, ease: "power3.out", stagger: 0.055, delay: 0.16, onComplete: ensure }
        );
    };

    // whatever happened in between, the focused project's info ends up on screen
    const ensure = () => {
        if (!st || jumpTo !== null) return;
        if (shown !== active) { show(active); return; }
        if (rows.some((r) => r.some((el) => gsap.isTweening(el)))) return;
        infos.forEach((info, j) => info.classList.toggle("is-on", j === shown));
        gsap.set(rows[shown], { y: 0 });
    };


    // ─── Navigation ──────────────────────────────────────────
    let jumpTimer = 0;

    const go = (i) => {
        if (!st) return;
        const y = st.start + i * step;
        const arrive = () => {
            clearTimeout(jumpTimer);
            jumpTo = null;
            ensure();
        };
        if (Math.abs(i - active) > 1) {
            jumpTo = i;
            clearTimeout(jumpTimer);
            jumpTimer = setTimeout(arrive, 1600);  // in case the scroll gets interrupted
        }
        if (window.lenis) window.lenis.scrollTo(y, { duration: 0.9, onComplete: arrive });
        else { window.scrollTo({ top: y, behavior: "smooth" }); }
    };

    // tabbing onto a hidden cover brings it into focus
    frame.addEventListener("focusin", (e) => {
        if (!st || e.target.matches(":not(:focus-visible)")) return;
        const t = e.target.closest(".fx-thumb");
        if (t && !t.classList.contains("is-focus")) go(thumbs.indexOf(t));
    });

    indexBtns.forEach((b) => b.addEventListener("click", () => go(Number(b.dataset.i))));

    // settle on the nearest project once scrolling stops
    const settle = () => {
        if (!st) return;
        jumpTo = null;
        if (st.isActive) {
            const target = Math.round((window.scrollY - st.start) / step);
            if (Math.abs(st.start + target * step - window.scrollY) > 2) { go(target); return; }
        }
        ensure();
    };


    // ─── Pin (only where a full screen fits) ─────────────────
    const mm = gsap.matchMedia();

    mm.add("(min-height: 560px)", () => {
        section.classList.add("fx-on");
        frame.appendChild(index);
        refreshInit();

        st = ScrollTrigger.create({
            trigger: section,
            start: "top top",
            end: () => `+=${(N - 1) * step}`,
            pin: true,
            invalidateOnRefresh: true,
            onRefreshInit: refreshInit,
            onRefresh: (self) => layout(self.progress * (N - 1)),
            onUpdate: (self) => layout(self.progress * (N - 1))
        });
        layout(st.progress * (N - 1));
        ScrollTrigger.addEventListener("scrollEnd", settle);
        window.addEventListener("resize", onResize);

        return () => {
            ScrollTrigger.removeEventListener("scrollEnd", settle);
            window.removeEventListener("resize", onResize);
            frame.style.removeProperty("--fx-vh");
            clearTimeout(jumpTimer);
            st = null;
            active = -1;
            shown = -1;
            jumpTo = null;
            section.classList.remove("fx-on");
            index.remove();
            gsap.killTweensOf(rows.flat());
            gsap.set(rows.flat(), { clearProps: "transform" });
            thumbs.forEach((t, i) => {
                t.style.transform = "";
                t.classList.remove("is-focus");
                t.setAttribute("aria-label", openLabels[i]);
            });
            infos.forEach((info) => info.classList.remove("is-on"));
        };
    });
});
