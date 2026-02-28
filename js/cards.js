import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js"
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js"
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.mjs"

document.addEventListener("DOMContentLoaded", () => {

    gsap.registerPlugin(ScrollTrigger)

    const lenis = new Lenis()
    lenis.on("scroll", ScrollTrigger.update)
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000)
    })

    gsap.ticker.lagSmoothing(0)

    const smoothStep = (p) => p * p * (3 - 2 * p)

    // Set initial states immediately 
    // This prevents the flash/wrong-position on first load
    gsap.set("#card-1", { opacity: 0, x: "100%",  y: "-100%", rotate: -5, scale: 0.25 })
    gsap.set("#card-2", { opacity: 0, x: "0%",    y: "-100%", rotate: 0,  scale: 0.25 })
    gsap.set("#card-3", { opacity: 0, x: "-100%", y: "-100%", rotate: 5,  scale: 0.25 })
    gsap.set(".cards",  { opacity: 0, zIndex: -1 })

    // ─── HERO CARDS ───────────────────────────────────────────────
    // Cards fade, scale down, converge into the same stacked pile
    // layout as the skills cards (card1 on top, slight offsets), then drop

    // Mirror of the skills card final stacked positions (before they spread):
    // index 0: x "100%", rotate -5  → converges to these, then drops
    // index 1: x "0%",   rotate  0
    // index 2: x "-100%", rotate 5
    // But since hero cards start spread OUT in a row, we animate from
    // their natural flex positions toward the stacked pile center.

    ScrollTrigger.create({
        trigger: ".hero",
        start: "top top",
        end: "75% top",
        scrub: 1,
        onUpdate: (self) => {
            const progress = self.progress

            // Fade the whole hero-cards container
            const heroCardContainerOpacity = gsap.utils.interpolate(
                1,
                0,
                smoothStep(progress)
            )
            gsap.set(".hero-cards", {
                opacity: heroCardContainerOpacity
            });

            ["#hero-card-1", "#hero-card-2", "#hero-card-3"].forEach(
                (cardId, index) => {
                    const delay = index * 0.15
                    const cardProgress = gsap.utils.clamp(
                        0,
                        1,
                        (progress - delay) / (1 - delay)
                    )

                    // Phase 1 (0 → 0.6): converge into stacked pile + scale down
                    // Phase 2 (0.6 → 1): drop down together
                    let stackProgress, dropProgress
                    if (cardProgress < 0.6) {
                        stackProgress = cardProgress / 0.6
                        dropProgress = 0
                    } else {
                        stackProgress = 1
                        dropProgress = (cardProgress - 0.6) / 0.4
                    }

                    // Target x/rotation mirrors skills cards initial stacked positions
                    const targetX = index === 0 ? "100%" : index === 1 ? "0%" : "-100%"
                    const targetRotate = index === 0 ? -5 : index === 1 ? 0 : 5

                    const x = gsap.utils.interpolate("0%", targetX, smoothStep(stackProgress))
                    const rotation = gsap.utils.interpolate(0, targetRotate, smoothStep(stackProgress))

                    const scale = gsap.utils.interpolate(1, 0.25, smoothStep(stackProgress))

                    const y = gsap.utils.interpolate("0%", "300%", smoothStep(dropProgress))

                    gsap.set(cardId, { y, x, rotation, scale })
                }
            )
        }
    })


    // ─── SKILLS SECTION: pin ──────────────────────────────────────

    ScrollTrigger.create({
        trigger: ".skills",
        start: "top top",
        end: `+=${window.innerHeight * 4}px`,
        pin: ".skills",
        pinSpacing: true
    })

    // Smoothly fade .cards in as skills scrolls into view, and back out going up
    ScrollTrigger.create({
        trigger: ".skills",
        start: "top bottom",
        end: "top top",
        scrub: 1,
        onEnter: () => gsap.set(".cards", { zIndex: 1 }),
        onLeaveBack: () => gsap.set(".cards", { zIndex: -1 }),
        onUpdate: (self) => {
            gsap.set(".cards", { opacity: smoothStep(self.progress) })
        }
    })

    ScrollTrigger.create({
        trigger: ".skills",
        start: "top top",
        end: `+=${window.innerHeight * 4}px`,
        onLeave: () => {
            const skillsSection = document.querySelector(".skills")
            const skillsRect = skillsSection.getBoundingClientRect()
            const skillsTop = window.pageYOffset + skillsRect.top

            gsap.set(".cards", {
                position: "absolute",
                top: skillsTop,
                left: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 1
            })
        },
        onEnterBack: () => {
            gsap.set(".cards", {
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 1
            })
        }
    })


    // ─── SKILLS CARDS: come down, fade in, scale up, align, flip ──

    ScrollTrigger.create({
        trigger: ".skills",
        start: "top top",
        end: `+=${window.innerHeight * 4}px`,
        scrub: 1,
        onUpdate: (self) => {
            const progress = self.progress

            // Skills header slides up from below
            const headerProgress = gsap.utils.clamp(0, 1, progress / 0.9)
            const headerY = gsap.utils.interpolate(
                "400%",
                "0%",
                smoothStep(headerProgress)
            )
            gsap.set(".skills-header", {
                y: headerY
            });

            ["#card-1", "#card-2", "#card-3"].forEach((cardId, index) => {

                const delay = index * 0.5
                const cardProgress = gsap.utils.clamp(
                    0,
                    1,
                    (progress - delay * 0.1) / (0.9 - delay * 0.1)
                )

                const innerCard = document.querySelector(`${cardId} .flip-card-inner`)

                // ── Y: drop in from above, settle to center ──
                let y
                if (cardProgress < 0.4) {
                    const np = cardProgress / 0.4
                    y = gsap.utils.interpolate("-100%", "50%", smoothStep(np))
                } else if (cardProgress < 0.6) {
                    const np = (cardProgress - 0.4) / 0.2
                    y = gsap.utils.interpolate("50%", "0%", smoothStep(np))
                } else {
                    y = "0%"
                }

                // ── Scale: small → full ──
                let scale
                if (cardProgress < 0.4) {
                    const np = cardProgress / 0.4
                    scale = gsap.utils.interpolate(0.25, 0.75, smoothStep(np))
                } else if (cardProgress < 0.6) {
                    const np = (cardProgress - 0.4) / 0.2
                    scale = gsap.utils.interpolate(0.75, 1, smoothStep(np))
                } else {
                    scale = 1
                }

                // ── Opacity: fade in ──
                let opacity
                if (cardProgress < 0.2) {
                    const np = cardProgress / 0.2
                    opacity = smoothStep(np)
                } else {
                    opacity = 1
                }

                // ── X / rotate: spread out then align, then flip ──
                let x, rotate, rotationY
                if (cardProgress < 0.6) {
                    x = index == 0 ? "100%" : index == 1 ? "0%" : "-100%"
                    rotate = index == 0 ? -5 : index == 1 ? 0 : 5
                    rotationY = 0
                } else if (cardProgress < 1) {
                    const np = (cardProgress - 0.6) / 0.4
                    x = gsap.utils.interpolate(
                        index == 0 ? "100%" : index == 1 ? "0%" : "-100%",
                        "0%",
                        smoothStep(np)
                    )
                    rotate = gsap.utils.interpolate(
                        index == 0 ? -5 : index == 1 ? 0 : 5,
                        0,
                        smoothStep(np)
                    )
                    rotationY = smoothStep(np) * 180
                } else {
                    x = "0%"
                    rotate = 0
                    rotationY = 180
                }

                gsap.set(cardId, {
                    opacity: opacity,
                    y: y,
                    x: x,
                    rotate: rotate,
                    scale: scale
                })

                gsap.set(innerCard, {
                    rotationY: rotationY
                })
            })
        }
    })

})