import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js"
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js"
import SplitText from "https://cdn.skypack.dev/gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const para = document.querySelector(".about-text p");

//fade in for now untill I think of somethin better

if (para) {
  const split = new SplitText(para, { type: "words" });

  gsap.from(split.words, {
    scrollTrigger: { trigger: ".about", start: "top 70%" },
    filter: "blur(12px)",
    opacity: 0,
    duration: 1.4,
    ease: "power2.out",
    stagger: 0.05
  });
}

// spotlight on the about statement — position is fully autonomous (a slow
// drift that never stops, so there's nothing for mouse tracking to fight
// over); the cursor's only role is to make it flare bigger when it's near
// wherever the light currently is
const spotlightTargets = document.querySelectorAll(".about-statement, .about-emphasis");
const aboutSection = document.querySelector(".about-section");

if (spotlightTargets.length && aboutSection) {
  let mouseX = null;
  let mouseY = null;

  const state = new Map();
  spotlightTargets.forEach((el) => state.set(el, { x: 50, y: 50, boost: 0 }));

  const drift = { t: 0 };

  aboutSection.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  aboutSection.addEventListener("mouseleave", () => {
    mouseX = null;
    mouseY = null;
  });

  gsap.ticker.add((_time, deltaMs) => {
    const dt = deltaMs / 1000;
    drift.t += 0.55 * dt;
    const dx = 50 + Math.sin(drift.t) * 42;
    const dy = 50 + Math.cos(drift.t * 0.5) * 44;

    state.forEach((s, el) => {
      s.x += (dx - s.x) * 0.02;
      s.y += (dy - s.y) * 0.02;

      let targetBoost = 0;
      if (mouseX !== null) {
        const rect = el.getBoundingClientRect();
        const spotX = rect.left + (s.x / 100) * rect.width;
        const spotY = rect.top + (s.y / 100) * rect.height;
        const dist = Math.hypot(mouseX - spotX, mouseY - spotY);
        targetBoost = Math.max(0, 1 - dist / 260);
      }
      s.boost += (targetBoost - s.boost) * 0.08;

      el.style.setProperty("--mx", `${s.x}%`);
      el.style.setProperty("--my", `${s.y}%`);
      el.style.setProperty("--spot-boost", s.boost.toFixed(3));
    });
  });
}

// entrance: fade the statement in (the spotlight itself is already drifting
// continuously, so no separate sweep-in animation is needed here)
const statement = document.querySelector(".about-statement");

if (statement) {
  const statementObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        statementObserver.unobserve(entry.target);
        entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.15 }
  );

  statementObserver.observe(statement);
}