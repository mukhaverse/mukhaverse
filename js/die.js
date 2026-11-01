// The die in the bottom-right corner (st.css): it shows which section is on
// screen, one pip for the hero up to six once the footer is showing. On each
// change the pips shrink away one by one, then the new face grows in.
(function () {
    "use strict";

    const die = document.querySelector(".corner-die");
    if (!die) return;

    const pips = Array.from(die.children);

    // pip positions on the face's 3 × 3 grid, as [column, row]
    const FACES = [
        [[1, 1]],
        [[0, 0], [2, 2]],
        [[0, 0], [1, 1], [2, 2]],
        [[0, 0], [2, 0], [0, 2], [2, 2]],
        [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
        [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
    ];

    const SHRINK = 210, GROW = 390, STAGGER = 40;
    const EASE_IN = "cubic-bezier(.55, 0, 1, .45)";
    const SPRING = "cubic-bezier(.3, 1.35, .5, 1)";

    const sections = ["#hero", "#about", "#skills", "#projects", "#contact"]
        .map(s => document.querySelector(s));
    const phone = matchMedia("(max-width: 760px)");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    // put the pips on face n; t = 0 jumps there. move: false keeps them
    // where they are (to shrink the face that's showing)
    const set = (n, { t = 0, ease = SPRING, show = true, move = true } = {}) => {
        die.style.setProperty("--t", t + "ms");
        die.style.setProperty("--ease", ease);
        pips.forEach((pip, i) => {
            const f = FACES[n][i];
            pip.style.setProperty("--delay", (t ? i * STAGGER : 0) + "ms");
            if (move) {
                pip.style.setProperty("--c", f ? f[0] : 1);
                pip.style.setProperty("--r", f ? f[1] : 1);
            }
            pip.style.setProperty("--s", f && show ? 1 : 0);
        });
        if (!t) void die.offsetWidth;
    };

    // shown: the face on the die; wanted: the section on screen. A change
    // that arrives mid-pop waits, and only the latest one plays after it
    let shown = -1, wanted = -1, busy = false;

    const pop = async () => {
        busy = true;
        while (shown !== wanted) {
            const n = wanted;
            if (shown >= 0 && !reduce.matches) {
                set(shown, { t: SHRINK, ease: EASE_IN, show: false, move: false });
                await wait(SHRINK + STAGGER * 5);
                set(n, { show: false });
                set(n, { t: GROW });
                await wait(GROW + STAGGER * 5);
            } else {
                set(n);
            }
            shown = n;
        }
        busy = false;
    };

    let queued = false;
    const update = () => {
        queued = false;
        const mid = innerHeight / 2;
        let n = sections.findIndex(s => {
            if (!s) return false;
            const r = s.getBoundingClientRect();
            return r.top <= mid && r.bottom > mid;
        });
        // the footer shows from under the page once it runs out
        if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) n = 5;
        if (n < 0) return;

        // phones: About's role steps run along the bottom edge, so the die steps aside
        die.classList.toggle("is-off", phone.matches && n === 1);

        if (n === wanted) return;
        wanted = n;
        if (!busy) pop();
    };

    const queue = () => {
        if (!queued) { queued = true; requestAnimationFrame(update); }
    };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    addEventListener("load", update);
    update();
})();
