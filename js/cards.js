// gsap + ScrollTrigger come from the classic <script> tags so every file
// shares one instance (and one set of pin measurements)
const { gsap, ScrollTrigger } = window
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.mjs"

document.addEventListener("DOMContentLoaded", () => {

    if (!gsap || !ScrollTrigger) return

    gsap.registerPlugin(ScrollTrigger)

    const lenis = new Lenis({ lerp: 0.2, smoothWheel: true })
    window.lenis = lenis
    lenis.on("scroll", ScrollTrigger.update)
    gsap.ticker.add((time) => { lenis.raf(time * 1000) })
    gsap.ticker.lagSmoothing(0)

    const smoothStep = (p) => p * p * (3 - 2 * p)
    const softEnds   = gsap.parseEase("sine.inOut")

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
    // pin. The moment the pin ends it's dropped into the page right
    // where it's showing (absolute, at the pin's end), so it scrolls
    // away with the section instead of staying behind Projects.
    //
    // Pin duration = 2× viewport height:
    //   First 70% → card animation
    //   Last  30% → silent hold so user can read flipped cards
    //
    // Phones: the pin is 1× viewport height. The animation starts 0.8×
    // viewport before the pin and ends 0.9× into it, so the column glides
    // about as fast as the finger and the cards scroll away soon after
    // SYSTEMS arrives.

    const SKILLS_SCROLL_DIST = window.innerHeight * (isMobile ? 1 : 2)
    const ANIM_DIST          = isMobile ? window.innerHeight * 1.7 : SKILLS_SCROLL_DIST * 0.70

    // top is measured from .page-wrapper, the layer's containing block
    const release = (self) => gsap.set(".cards", {
        position: "absolute",
        top: self.end - (document.querySelector(".page-wrapper").getBoundingClientRect().top + window.scrollY)
    })
    const hold = () => gsap.set(".cards", { position: "fixed", top: 0, opacity: 1 })

    ScrollTrigger.create({
        trigger: ".skills",
        start: "top top",
        end: `+=${SKILLS_SCROLL_DIST}px`,
        pin: true,
        pinSpacing: true,
        onLeave:     release,
        onEnterBack: hold,
        // a resize past the pin moves its end, so the dropped layer follows
        onRefresh:   (self) => { if (window.scrollY > self.end) release(self) },
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


    // phones: one card plus the gap, how far the column moves per card
    let mobileStep = 0
    const measureStep = () => {
        const card = document.querySelector("#card-1")
        if (!card || !card.offsetHeight) return
        const gap = parseFloat(getComputedStyle(document.querySelector(".cards-container")).rowGap) || 0
        mobileStep = card.offsetHeight + gap
    }
    if (isMobile) {
        measureStep()
        ScrollTrigger.addEventListener("refresh", measureStep)
    }


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
                // ─── MOBILE: cascade drop, then glide down the column ─────
                // The cards are too tall to fit together, so the column
                // drifts up at a steady pace, like the page scrolling on,
                // while the three flip over in one wave.
                //   0.00–0.33  all three drop in while the section scrolls up
                //              (the pin starts at 0.47)
                //   0.30–0.62  they flip, one just after another
                //   0.36–0.96  the column glides from PLAN to SYSTEMS
                const spreadY = ["-130%", "-190%", "-250%"]
                const spreadR = [-3, 0, 3]
                const delays  = [0, 0.03, 0.06]
                const dropEnd = 0.33
                const flips   = [[0.30, 0.48], [0.37, 0.55], [0.44, 0.62]]
                const glide   = [0.36, 0.96]
                const span    = (p, [a, b]) => smoothStep(gsap.utils.clamp(0, 1, (p - a) / (b - a)))

                // the column is centred on BUILD, so card i sits mid-screen at (1 - i) steps.
                // Eased only at its ends, so it starts and stops softly but
                // otherwise moves with the finger
                const g  = gsap.utils.clamp(0, 1, (progress - glide[0]) / (glide[1] - glide[0]))
                const at = 2 * (0.7 * g + 0.3 * softEnds(g))
                gsap.set(".cards-container", { y: (1 - at) * mobileStep })

                ;["#card-1", "#card-2", "#card-3"].forEach((cardId, i) => {
                    const np        = span(progress, [delays[i], dropEnd])
                    const innerCard = document.querySelector(`${cardId} .flip-card-inner`)

                    gsap.set(cardId, {
                        opacity: np < 0.4 ? smoothStep(np / 0.4) : 1,
                        y:       gsap.utils.interpolate(spreadY[i], "0%", np),
                        x:       "0%",
                        rotate:  gsap.utils.interpolate(spreadR[i], 0, np),
                        scale:   gsap.utils.interpolate(0.25, 1, np)
                    })
                    gsap.set(innerCard, { rotationY: span(progress, flips[i]) * 180 })
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

})