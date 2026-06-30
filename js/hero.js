gsap.registerPlugin(ScrollTrigger);


gsap.set(".hero-title", { opacity: 0, y: 150, scale:1.5});
gsap.set(".hero-divider", { opacity: 0, y: -20 });
gsap.set(".navbar", { opacity: 0, y: -20 });
const w = window.innerWidth;
// gsap.set(".hero-cards .card", { x: 70, opacity: 0 });
gsap.set(".hero-description", { opacity: 0, x: -20,  y: () => {    
        if (w < 576) return 85;
        if (w < 992) return 55;
        return 0;
    } });
gsap.set(".hero-cards .card", { y: 10, opacity: 0,force3D: true,
    willChange: "transform"});


const tl = gsap.timeline({
    defaults: { ease: "power2.out" }
});


tl.to(".hero-title", {
    scale: 1,
    opacity: 1,
    duration: 0.7,
    ease: "power4.out",
    delay:.7
});




tl.to(".hero-title", {
   y: () => {

        if (w < 576) return -200;    
        if (w < 992) return -250;    
        return -40;                  
    },
    duration: 0.6
});




tl.to(".hero-divider", {
    opacity: 1,
    y: 0,
    duration: 0.6
}, "-=0.2");

tl.to(".navbar", {
    opacity: 1,
    y: 0,
    duration: 0.6
}, "-=0.5");




tl.to(".hero-description", {
    opacity: 1,
    x: 0,
    duration: 0.6
}, "-=0.3");




tl.to(".hero-cards .card", {

    opacity: 1,
    scale: 1,
    stagger: 0.15,
    duration: 0.6,
    ease: "back.out(2)"
}, "-=1.2");




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