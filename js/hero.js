if (typeof gsap === "undefined") {
    document.documentElement.classList.remove("js");
    throw new Error("GSAP failed to load; showing static hero");
}

gsap.registerPlugin(ScrollTrigger);

// the hero's one ease, measured off the reference load animation: over half the distance in the
// first ~110ms, then a long soft settle. No slow start, so it reads as a decision, not a drift
const LAND = typeof CustomEase !== "undefined"
    ? (gsap.registerPlugin(CustomEase), CustomEase.create("land", ".4,.8,0,1"))
    : "power3.out";

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set(".navbar, .hero-title, .hero-divider, .hero-description, .hero-cards .card", { opacity: 1 });
    document.querySelector(".hero-description")?.classList.add("is-visible");
}


const w = window.innerWidth;
// where the title comes to rest
const titleY = () => {
    if (w < 576) return -200;
    if (w < 992) return -250;
    return -40;
};
// js/keyboard-splash.js types the name and grows it into place itself, landing it here
const nameHandoff = document.documentElement.classList.contains("splash-name");

const reduceHero = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const cards = gsap.utils.toArray(".hero-cards .card");

if (!reduceHero) {
gsap.set(".hero-title", { y: titleY() });
// first visit the splash lands the title; otherwise it starts on the middle of the screen
if (!nameHandoff) {
    const r = document.querySelector(".hero-title").getBoundingClientRect();
    gsap.set(".hero-title", { opacity: 0, scale: 0.96, y: titleY() + innerHeight / 2 - (r.top + r.height / 2) });
}
gsap.set(".navbar, .hero-divider", { opacity: 0 });
gsap.set(".hero-description", { opacity: 0, y: () => {
        if (w < 576) return 85;
        if (w < 992) return 55;
        return 0;
    } });
// the CSS transform transition would smear every frame of the deal; it comes back after
gsap.set(cards, { opacity: 0, transition: "none", force3D: true, willChange: "transform" });
}


// js/keyboard-splash.js covers the page on first visit; start the intro as it lifts
const splashOn = document.documentElement.classList.contains("splash-on");
const tl = gsap.timeline({
    defaults: { ease: LAND },
    paused: reduceHero || splashOn
});
if (splashOn && !reduceHero) window.addEventListener("splash:done", () => tl.play(), { once: true });


// one thing at a time: the title fades in where it is, holds still a beat, then makes one move up.
// "land" is the moment it starts moving, and everything else hangs off it
if (!nameHandoff) {
    const fadeAt = splashOn ? .2 : .35;
    tl.to(".hero-title", { opacity: 1, duration: 0.15, ease: "power1.out" }, fadeAt)
      .to(".hero-title", { scale: 1, duration: 0.3, ease: "power2.out" }, fadeAt)
      .addLabel("land", fadeAt + 0.47)
      .to(".hero-title", { y: titleY, duration: 0.575 }, "land");
} else {
    tl.addLabel("land", 0);
}

// the rest of the page doesn't travel, it just shows up while the title is still in flight
tl.to(".hero-divider", { opacity: 1, duration: 0.2, ease: "power1.out" }, "land+=0.05")
  .to(".navbar", { opacity: 1, duration: 0.2, ease: "power1.out" }, "land+=0.1")
  .to(".hero-description", {
      opacity: 1,
      duration: 0.2,
      ease: "power1.out",
      onStart: () => document.querySelector(".hero-description").classList.add("is-visible")
  }, "land+=0.1");

// the cards are dealt right to left: the last one rises into its slot, and each one before it
// fans out from behind its neighbour, turned on edge, and squares up as it lands
const lastBox = cards[cards.length - 1]?.getBoundingClientRect();
tl.fromTo(cards, {
    // measured on screen, so undo .hero-cards' scale to get the card's own px
    x: (i, el) => {
        const b = el.getBoundingClientRect();
        return b.width ? (lastBox.left - b.left) * el.offsetWidth / b.width : 0;
    },
    y: 60,
    rotation: 10,
    rotationY: -60,
    transformPerspective: 900,
    transformOrigin: "50% 50%"
}, {
    x: 0,
    y: 0,
    rotation: 0,
    rotationY: 0,
    duration: 0.5,
    stagger: { each: 0.08, from: "end" },
    // they're invisible until dealt; don't tilt them for reduced motion, where this never plays
    immediateRender: false,
    onComplete: () => gsap.set(cards, { clearProps: "transition,transformOrigin,willChange" })
}, "land+=0.15")
  .to(cards, { opacity: 1, duration: 0.15, ease: "power1.out", stagger: { each: 0.08, from: "end" } }, "land+=0.15");




// gsap.utils.toArray(".hero-cards .card").forEach((card, i) => {
//     gsap.to(card, {
//         y: "+=10",           // relative offset so it stacks on top of timeline's y
//         duration: 0.9,
//         ease: "sine.inOut",
//         yoyo: true,
//         repeat: -1,
//         delay: i * 0.3,
//         force3D: true
//     });
// });


// const floatAnimations = []

// gsap.utils.toArray(".hero-cards .card").forEach((card, i) => {

//     const floatAnim = gsap.to(card, {
//         y: "+=12",
//         duration: 1.4,
//         ease: "sine.inOut",
//         yoyo: true,
//         repeat: -1,
//         delay: i * 0.2,
//         force3D: true
//     })

//     floatAnimations.push(floatAnim)
// })


// ScrollTrigger.create({
//     trigger: ".hero",
//     start: "top top",

//     onUpdate: (self) => {

//         // once user starts scrolling,
//         // stop idle breathing completely
//         if (self.progress > 0.01) {

//             floatAnimations.forEach(anim => {
//                 anim.pause()
//             })

//         } else {

//             // resume breathing when back at top
//             floatAnimations.forEach(anim => {
//                 anim.resume()
//             })
//         }
//     }
// })

gsap.utils.toArray(".hero-card-float").forEach((card, i) => {

    gsap.to(card, {
        y: "+=17",
        duration: 1.3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: i * 0.2,
        force3D: true
    })

})
// the keyboard splash waits for this before it measures where the title rests
window.__heroReady = true;
window.dispatchEvent(new Event("hero:ready"));
