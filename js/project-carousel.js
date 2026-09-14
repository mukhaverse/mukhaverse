document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("projectCarousel");
    if (!modal) return;

    const slidesEl = document.getElementById("projectCarouselSlides");
    const thumbsEl = document.getElementById("projectCarouselThumbs");
    const titleEl = document.getElementById("projectCarouselTitle");
    const closeBtn = modal.querySelector(".project-carousel-close");
    const prevBtn = modal.querySelector(".project-carousel-prev");
    const nextBtn = modal.querySelector(".project-carousel-next");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let slides = [];
    let activeIndex = 0;
    let lastTrigger = null;

    const setActive = (index) => {
        if (!slides.length) return;
        activeIndex = (index + slides.length) % slides.length;

        slidesEl.querySelectorAll(".carousel-slide").forEach((el, i) => {
            const active = i === activeIndex;
            el.classList.toggle("is-active", active);
            const video = el.querySelector("video");
            if (!video) return;
            if (active) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });

        thumbsEl.querySelectorAll(".carousel-thumb").forEach((el, i) => {
            el.classList.toggle("is-active", i === activeIndex);
        });
    };

    const buildStage = (mediaList, title) => {
        slidesEl.innerHTML = "";
        thumbsEl.innerHTML = "";
        slides = mediaList;

        mediaList.forEach((item, i) => {
            const slide = document.createElement("div");
            slide.className = "carousel-slide";

            let mediaEl;
            if (item.type === "video") {
                mediaEl = document.createElement("video");
                mediaEl.src = item.src;
                if (item.poster) mediaEl.poster = item.poster;
                mediaEl.controls = true;
                mediaEl.muted = true;
                mediaEl.loop = true;
                mediaEl.playsInline = true;
            } else {
                mediaEl = document.createElement("img");
                mediaEl.src = item.src;
                mediaEl.alt = item.alt || title || "";
            }
            slide.appendChild(mediaEl);
            slidesEl.appendChild(slide);

            if (mediaList.length > 1) {
                const thumb = document.createElement("button");
                thumb.type = "button";
                thumb.className = "carousel-thumb";
                thumb.setAttribute("aria-label", item.alt || `Slide ${i + 1}`);

                const thumbSrc = item.poster || (item.type === "image" ? item.src : "");
                if (thumbSrc) {
                    const thumbImg = document.createElement("img");
                    thumbImg.src = thumbSrc;
                    thumbImg.alt = "";
                    thumb.appendChild(thumbImg);
                }

                if (item.type === "video") {
                    const playIcon = document.createElement("span");
                    playIcon.className = "carousel-thumb-play";
                    playIcon.textContent = "▶";
                    thumb.appendChild(playIcon);
                }

                thumb.addEventListener("click", () => setActive(i));
                thumbsEl.appendChild(thumb);
            }
        });

        const multi = mediaList.length > 1;
        thumbsEl.hidden = !multi;
        prevBtn.hidden = !multi;
        nextBtn.hidden = !multi;
    };

    const openCarousel = (btn) => {
        let media;
        try {
            media = JSON.parse(btn.dataset.media || "[]");
        } catch (e) {
            media = [];
        }
        if (!media.length) return;

        lastTrigger = btn;
        buildStage(media, btn.dataset.projectTitle);
        if (titleEl) titleEl.textContent = btn.dataset.projectTitle || "";

        modal.hidden = false;
        document.body.classList.add("project-carousel-open");

        requestAnimationFrame(() => {
            modal.classList.add("is-open");
            setActive(0);
        });

        if (closeBtn) closeBtn.focus();
    };

    const closeCarousel = () => {
        if (modal.hidden) return;
        slidesEl.querySelectorAll("video").forEach((v) => v.pause());
        modal.classList.remove("is-open");
        document.body.classList.remove("project-carousel-open");

        const finish = () => {
            modal.hidden = true;
            slidesEl.innerHTML = "";
            thumbsEl.innerHTML = "";
            slides = [];
        };

        if (reduceMotion) {
            finish();
        } else {
            modal.addEventListener("transitionend", finish, { once: true });
        }

        if (lastTrigger) {
            lastTrigger.focus();
            lastTrigger = null;
        }
    };

    document.querySelectorAll(".project-browse-btn").forEach((btn) => {
        btn.addEventListener("click", () => openCarousel(btn));
    });

    modal.querySelectorAll("[data-carousel-close]").forEach((el) => {
        el.addEventListener("click", closeCarousel);
    });

    if (prevBtn) prevBtn.addEventListener("click", () => setActive(activeIndex - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => setActive(activeIndex + 1));

    document.addEventListener("keydown", (e) => {
        if (modal.hidden) return;
        if (e.key === "Escape") {
            closeCarousel();
        } else if (e.key === "ArrowLeft") {
            setActive(activeIndex - 1);
        } else if (e.key === "ArrowRight") {
            setActive(activeIndex + 1);
        }
    });
});
