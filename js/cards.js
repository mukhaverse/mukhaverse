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

    // ─── HERO CARDS ───────────────────────────────────────────────
    // Cards fade, scale down, converge toward center, then drop down

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
                0.5,
                smoothStep(progress)
            )
            gsap.set(".hero-cards", {
                opacity: heroCardContainerOpacity
            });

            ["#hero-card-1", "#hero-card-2", "#hero-card-3"].forEach(
                (cardId, index) => {
                    const delay = index * 0.9
                    const cardProgress = gsap.utils.clamp(
                        0,
                        1,
                        (progress - delay * 0.1) / (1 - delay * 0.1)
                    )

                    // Phase 1 (0 → 0.5): converge inward + scale down
                    // Phase 2 (0.5 → 1): drop down
                    let xProgress, yProgress
                    if (cardProgress < 0.5) {
                        xProgress = cardProgress / 0.5
                        yProgress = 0
                    } else {
                        xProgress = 1
                        yProgress = (cardProgress - 0.5) / 0.5
                    }

                    const y = gsap.utils.interpolate(
                        "0%",
                        "300%",
                        smoothStep(yProgress)
                    )

                    const scale = gsap.utils.interpolate(
                        1,
                        0.6,
                        smoothStep(cardProgress)
                    )

                    let x = "0%"
                    let rotation = 0

                    if (index === 0) {
                        // Left card moves right toward center
                        x = gsap.utils.interpolate("0%", "55%", smoothStep(xProgress))
                        rotation = gsap.utils.interpolate(0, 5, smoothStep(xProgress))
                    } else if (index === 2) {
                        // Right card moves left toward center
                        x = gsap.utils.interpolate("0%", "-55%", smoothStep(xProgress))
                        rotation = gsap.utils.interpolate(0, -5, smoothStep(xProgress))
                    }

                    gsap.set(cardId, {
                        y: y,
                        x: x,
                        rotation: rotation,
                        scale: scale
                    })
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

    // Make .cards visible when skills enters viewport, hide it before
    ScrollTrigger.create({
        trigger: ".skills",
        start: "top bottom",
        onEnter: () => gsap.set(".cards", { zIndex: 1 }),
        onLeaveBack: () => gsap.set(".cards", { zIndex: -1 })
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