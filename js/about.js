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

// spotlight on the about statement — gradient follows the cursor
const spotlightTargets = document.querySelectorAll(".about-statement, .about-emphasis");
const aboutSection = document.querySelector(".about-section");

if (spotlightTargets.length && aboutSection) {
  aboutSection.addEventListener("mousemove", (e) => {
    spotlightTargets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    });
  });
}

// entrance: sweep the spotlight across the statement instead of a plain fade,
// so it reads as a moving light rather than a static gradient
const statement = document.querySelector(".about-statement");
const emphasis = document.querySelector(".about-emphasis");

if (statement) {
  const statementObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        statementObserver.unobserve(entry.target);

        entry.target.classList.add("is-visible");

        gsap.fromTo(statement,
          { "--mx": "-15%", "--my": "35%" },
          { "--mx": "55%", "--my": "50%", duration: 1.6, ease: "power2.out", delay: 0.25 }
        );

        if (emphasis) {
          gsap.fromTo(emphasis,
            { "--mx": "115%", "--my": "60%" },
            { "--mx": "50%", "--my": "50%", duration: 1.4, ease: "power2.out", delay: 0.8 }
          );
        }
      });
    },
    { threshold: 0.15 }
  );

  statementObserver.observe(statement);
}