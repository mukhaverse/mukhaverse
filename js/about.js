import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js"
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js"
import SplitText from "https://cdn.skypack.dev/gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const para = document.querySelector(".about-text p");

//fade in for now untill I think of somethin better 

const split = new SplitText(para, { type: "words" });

gsap.from(split.words, {
  scrollTrigger: { trigger: ".about", start: "top 70%" },
  filter: "blur(12px)",
  opacity: 0,
  duration: 1.4,
  ease: "power2.out",
  stagger: 0.05
});