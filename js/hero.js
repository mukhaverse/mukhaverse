if (typeof gsap === "undefined") {
    document.documentElement.classList.remove("js");
    throw new Error("GSAP failed to load; showing static hero");
}

gsap.registerPlugin(ScrollTrigger);

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

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
if (nameHandoff) gsap.set(".hero-title", { y: titleY() });
else gsap.set(".hero-title", { opacity: 0, y: 150, scale:1.5});
gsap.set(".hero-divider", { opacity: 0, y: -20 });
// after the splash the navbar must already sit in place: its corner labels slide onto it
gsap.set(".navbar", { opacity: 0, y: document.documentElement.classList.contains("splash-on") ? 0 : -20 });
// gsap.set(".hero-cards .card", { x: 70, opacity: 0 });
gsap.set(".hero-description", { opacity: 0, x: -20,  y: () => {    
        if (w < 576) return 85;
        if (w < 992) return 55;
        return 0;
    } });
gsap.set(".hero-cards .card", { y: 10, opacity: 0,force3D: true,
    willChange: "transform"});
}


const reduceHero = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// js/keyboard-splash.js covers the page on first visit; start the intro as it lifts
const splashOn = document.documentElement.classList.contains("splash-on");
const tl = gsap.timeline({
    defaults: { ease: "power2.out" },
    paused: reduceHero || splashOn
});
if (splashOn && !reduceHero) window.addEventListener("splash:done", () => tl.play(), { once: true });


if (!nameHandoff) {
tl.to(".hero-title", {
    scale: 1,
    opacity: 1,
    duration: 0.5,
    ease: "power4.out",
    delay: splashOn ? .2 : .35
});




tl.to(".hero-title", {
   y: titleY,
    duration: 0.45,
    ease: "power3.out"
}, "-=0.1");
}




tl.to(".hero-divider", {
    opacity: 1,
    y: 0,
    duration: 0.6
}, nameHandoff ? 0 : "-=0.2");

tl.to(".navbar", {
    opacity: 1,
    y: 0,
    duration: 0.6
}, splashOn ? 0 : "-=0.5");




tl.to(".hero-description", {
    opacity: 1,
    x: 0,
    duration: 0.6,
    onStart: () => document.querySelector(".hero-description").classList.add("is-visible")
}, "-=0.3");




tl.to(".hero-cards .card", {

    opacity: 1,
    scale: 1,
    stagger: 0.09,
    duration: 0.35,
    ease: "back.out(2)"
}, nameHandoff ? 0.1 : "-=1.2");




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
