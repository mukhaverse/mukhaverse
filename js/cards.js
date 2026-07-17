import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js"
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js"
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.mjs"

document.addEventListener("DOMContentLoaded", () => {

    gsap.registerPlugin(ScrollTrigger)

    const lenis = new Lenis({ lerp: 0.2, smoothWheel: true })
    lenis.on("scroll", ScrollTrigger.update)
    gsap.ticker.add((time) => { lenis.raf(time * 1000) })
    gsap.ticker.lagSmoothing(0)

    const smoothStep = (p) => p * p * (3 - 2 * p)

    const isMobile = window.matchMedia("(max-width: 768px)").matches

    // ─── INITIAL STATES ───────────────────────────────────────────
    if (isMobile) {
        gsap.set("#card-1", { opacity: 0, x: "0%", y: "-130%", rotate: -3, scale: 0.25 })
        gsap.set("#card-2", { opacity: 0, x: "0%", y: "-190%", rotate: 0,  scale: 0.25 })
        gsap.set("#card-3", { opacity: 0, x: "0%", y: "-250%", rotate: 3,  scale: 0.25 })
    } else {
        gsap.set("#card-1", { opacity: 0, x: "100%",  y: "-120%", rotate: -5, scale: 0.25 })
        gsap.set("#card-2", { opacity: 0, x: "0%",    y: "-120%", rotate: 0,  scale: 0.25 })
        gsap.set("#card-3", { opacity: 0, x: "-100%", y: "-120%", rotate: 5,  scale: 0.25 })
    }
    gsap.set(".cards",  { opacity: 0 })


    // ─── GHOST ICONS SETUP ───────────────────────────────────────
    const iconDefs = [
        // top — spread left → right, y zigzags so they're not on one line
        { icon: 'devicon-figma-plain',       x: '14%', y: '10%', size: '3.2rem', alpha: 0.08 },
        { icon: 'devicon-javascript-plain',  x: '48%', y: '5%',  size: '3.4rem', alpha: 0.10 },
        { icon: 'devicon-threejs-original',  x: '80%', y: '13%', size: '3.0rem', alpha: 0.07 },

        // bottom — spread left → right, y zigzags
        { icon: 'devicon-nodejs-plain',      x: '16%', y: '88%', size: '3.2rem', alpha: 0.09 },
        { icon: 'devicon-mongodb-plain',     x: '50%', y: '93%', size: '3.0rem', alpha: 0.11 },
        { icon: 'devicon-mysql-plain',       x: '78%', y: '86%', size: '3.1rem', alpha: 0.08 },

        // left — go top → bottom, x zigzags so they're not on one line
        { icon: 'devicon-opencv-plain',      x: '4%',  y: '28%', size: '3.1rem', alpha: 0.10 },
        { icon: 'devicon-postman-plain',     x: '8%',  y: '52%', size: '3.3rem', alpha: 0.09 },
        { icon: 'devicon-vitest-plain',      x: '3%',  y: '72%', size: '3.0rem', alpha: 0.07 },

        // right — go top → bottom, x zigzags
        { icon: 'devicon-python-plain',      x: '90%', y: '24%', size: '3.1rem', alpha: 0.08 },
        { icon: 'devicon-express-original',  x: '93%', y: '48%', size: '3.2rem', alpha: 0.06 },
        { icon: 'devicon-socketio-original', x: '88%', y: '68%', size: '3.3rem', alpha: 0.07 },
    ]

    const ghostWrap = document.createElement('div')
    ghostWrap.className = 'skills-ghost-icons'
    document.querySelector('.cards').appendChild(ghostWrap)

    iconDefs.forEach(({ icon, x, y, size }) => {
        const el = document.createElement('i')
        el.className = `${icon} skills-ghost-icon`
        el.style.left = x
        el.style.top = y
        el.style.fontSize = size
        ghostWrap.appendChild(el)
    })

    const ghostEls = Array.from(ghostWrap.querySelectorAll('.skills-ghost-icon'))
    gsap.set(ghostEls, { opacity: 0, scale: 0 })

    const ghostFwd = new Array(ghostEls.length).fill(false)
    const ghostBwd = new Array(ghostEls.length).fill(false)


   // ─── HERO CARDS: collapse downward into stack ─────────────────
//
// Cards:
// - slightly converge inward
// - drop downward
// - shrink
// - fade out
//
// Motion mirrors the skills entrance animation.

ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: 1,

    onUpdate: (self) => {

        const progress = self.progress

        // Fade entire container gradually
        gsap.set(".hero-cards", {
            opacity: gsap.utils.interpolate(
                1,
                0,
                smoothStep(
                    gsap.utils.clamp(
                        0,
                        1,
                        (progress - 0.45) / 0.35
                    )
                )
            )
        })

        // Softer target positions
        const targetX = ["0%", "0%", "0%"]
        const targetR = [-0.5, 0, 0.5]

        // Slight stagger
        const delays = [0, 0.08, 0.16]

        ;["#hero-card-1", "#hero-card-2", "#hero-card-3"].forEach((cardId, i) => {

            const delay = delays[i]

            const cardP = gsap.utils.clamp(
                0,
                1,
                (progress - delay) / (0.75 - delay)
            )

            const p = smoothStep(cardP)

            gsap.set(cardId, {

                // MAIN MOTION: DOWNWARD
                y: gsap.utils.interpolate(
                    "0px",
                    "900px",
                    p
                ),

                // slight inward convergence
                x: gsap.utils.interpolate(
                    "0%",
                    targetX[i],
                    p
                ),

                // subtle tilt
                rotate: gsap.utils.interpolate(
                    0,
                    targetR[i],
                    p
                ),

                // shrink into stack
                scale: gsap.utils.interpolate(
                    1,
                    0.25,
                    p
                ),

                // fade
                opacity: gsap.utils.interpolate(
                    1,
                    0,
                    smoothStep(
                        gsap.utils.clamp(
                            0,
                            1,
                            cardP * 0.85
                        )
                    )
                ),

                force3D: true
            })
        })
    }
})


    // ─── SKILLS SECTION: pin ──────────────────────────────────────
    //
    // .cards is position:fixed so it covers the viewport during the
    // pin. The moment the pin ends we hide it with display:none —
    // this is the only reliable way to stop a fixed element from
    // floating over subsequent sections.
    //
    // Pin duration = 4.5× viewport height:
    //   First 70% → card animation
    //   Last  30% → silent hold so user can read flipped cards

    const SKILLS_SCROLL_DIST = window.innerHeight * 4.5
    const ANIM_DIST          = SKILLS_SCROLL_DIST * 0.70

    ScrollTrigger.create({
        trigger: ".skills",
        start: "top top",
        end: `+=${SKILLS_SCROLL_DIST}px`,
        pin: true,
        pinSpacing: true,
        onLeave:     () => gsap.set(".cards", { display: "none"  }),
        onEnterBack: () => gsap.set(".cards", { display: "flex", opacity: 1 }),
    })

    // Fade .cards in as .skills scrolls into view
    ScrollTrigger.create({
        trigger: ".skills",
        start: "top bottom",
        end: "top top",
        scrub: 1,
        onUpdate: (self) => {
            gsap.set(".cards", { opacity: smoothStep(self.progress) })
        }
    })


    // ─── SKILLS CARDS ANIMATION ───────────────────────────────────
    //
    // Runs for the first 70% of the pin.
    //
    // Per-card (0 → 1):
    //   0.00–0.50  Drop in from -120%, scale 0.25→1, fade in.
    //              X and rotate held at spread values.
    //   0.50–1.00  Slide to center (x→0%), de-tilt, flip (rotationY→180).

    ScrollTrigger.create({
        trigger: ".skills",
        start: "top 80%",
        end: `+=${ANIM_DIST}px`,
        scrub: 1,
        onUpdate: (self) => {
            const progress = self.progress

            const headerP = gsap.utils.clamp(0, 1, progress / 0.9)
            gsap.set(".skills-header", {
                y: gsap.utils.interpolate("400%", "0%", smoothStep(headerP))
            })

            if (isMobile) {
                // ─── MOBILE: cascade drop from above, then flip ───────────
                const spreadY = ["-130%", "-190%", "-250%"]
                const spreadR = [-3, 0, 3]
                const delays  = [0, 0.06, 0.12]

                ;["#card-1", "#card-2", "#card-3"].forEach((cardId, i) => {
                    const delay     = delays[i]
                    const cardP     = gsap.utils.clamp(0, 1, (progress - delay) / (1 - delay))
                    const innerCard = document.querySelector(`${cardId} .flip-card-inner`)

                    let y, scale, opacity, x, rotate, rotationY

                    if (cardP < 0.50) {
                        const np  = cardP / 0.50
                        y         = gsap.utils.interpolate(spreadY[i], "0%", smoothStep(np))
                        scale     = gsap.utils.interpolate(0.25, 1, smoothStep(np))
                        opacity   = np < 0.4 ? smoothStep(np / 0.4) : 1
                        x         = "0%"
                        rotate    = gsap.utils.interpolate(spreadR[i], 0, smoothStep(np))
                        rotationY = 0
                    } else {
                        const np  = (cardP - 0.50) / 0.50
                        y         = "0%"
                        scale     = 1
                        opacity   = 1
                        x         = "0%"
                        rotate    = 0
                        rotationY = smoothStep(np) * 180
                    }

                    gsap.set(cardId,    { opacity, y, x, rotate, scale })
                    gsap.set(innerCard, { rotationY })
                })

            } else {
                // ─── DESKTOP: original animation (untouched) ─────────────
                const spreadX = ["100%", "0%", "-100%"]
                const spreadR = [-5, 0, 5]
                const delays  = [0, 0.06, 0.12]

                ;["#card-1", "#card-2", "#card-3"].forEach((cardId, i) => {
                    const delay     = delays[i]
                    const cardP     = gsap.utils.clamp(0, 1, (progress - delay) / (1 - delay))
                    const innerCard = document.querySelector(`${cardId} .flip-card-inner`)

                    let y, scale, opacity, x, rotate, rotationY

                    if (cardP < 0.50) {
                        const np  = cardP / 0.50
                        y         = gsap.utils.interpolate("-120%", "0%", smoothStep(np))
                        scale     = gsap.utils.interpolate(0.25, 1, smoothStep(np))
                        opacity   = np < 0.4 ? smoothStep(np / 0.4) : 1
                        x         = spreadX[i]
                        rotate    = spreadR[i]
                        rotationY = 0
                    } else {
                        const np  = (cardP - 0.50) / 0.50
                        y         = "0%"
                        scale     = 1
                        opacity   = 1
                        x         = gsap.utils.interpolate(spreadX[i], "0%", smoothStep(np))
                        rotate    = gsap.utils.interpolate(spreadR[i], 0,    smoothStep(np))
                        rotationY = smoothStep(np) * 180
                    }

                    gsap.set(cardId,    { opacity, y, x, rotate, scale })
                    gsap.set(innerCard, { rotationY })
                })
            }
        }
    })


    // ─── GHOST ICONS ANIMATION ───────────────────────────────────
    //
    // Icons pop in one-by-one during the second half of the skills
    // animation (progress 0.25 → 0.90), each with a bouncy back.out
    // ease for the "pop" feel. Stagger is purely threshold-based so
    // reversing the scroll fades them back out in reverse order.

    ScrollTrigger.create({
        trigger: ".skills",
        start: "top 80%",
        end: `+=${ANIM_DIST}px`,
        scrub: 1,
        onUpdate: (self) => {
            const progress = self.progress
            ghostEls.forEach((el, i) => {
                const t     = 0.25 + (i / (ghostEls.length - 1)) * 0.65
                const alpha = iconDefs[i].alpha

                if (progress >= t && !ghostFwd[i]) {
                    ghostFwd[i] = true
                    ghostBwd[i] = false
                    gsap.killTweensOf(el)
                    gsap.to(el, { opacity: alpha, scale: 1, duration: 0.5, ease: 'back.out(2.5)' })
                } else if (progress < t - 0.02 && !ghostBwd[i]) {
                    ghostBwd[i] = true
                    ghostFwd[i] = false
                    gsap.killTweensOf(el)
                    gsap.to(el, { opacity: 0, scale: 0, duration: 0.3, ease: 'power2.in' })
                }
            })
        }
    })

})