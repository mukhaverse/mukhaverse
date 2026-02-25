import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Lenis from "Lenis"

document.addEventListener("DOMContentLoaded", () =>{

    gsap.registerPlugin(ScrollTrigger)

    const lenis = new Lenis()
    lenis.on("scroll", ScrollTrigger.update)
    gsap.ticker.add((time) =>{
        lenis.raf(time*1000)
    })

    gsap.ticker.lagSmoothing(0)

    const smoothStep = (p) => p * p * (3 - 2 * p)

    ScrollTrigger.create({

        trigger: " .hero",
        start: " top top",
        end: "75% top",
        scrub: 1,
    onUpdate: (self) =>{
        const progress = self.progress

        const heroCardContainerOpacity = gsap.utils.interpolate(
            1,
            0.5,
            smoothStep(progress)
        )
        gsap.set(".hero-cardd", {
            opacity: heroCardContainerOpacity
        })

        ["#hero-card-1", "#hero-card-2", "#hero-card-3"].forEach(
            (cardId, index ) => {
                const delay = index * 0.9
                const cardProgress = gsap.utils.clamp(
                    0,
                    1,
                    (progress - delay * 0.1) / (1 - delay * 0.1)
                )
                
                const y = gsap.update.interpolate(
                    "0%",
                    "250%",
                    smoothStep(cardProgress)
                )

                const scale = gsap.utils.interpolate(
                    1,
                    0.75,
                    smoothStep(cardProgress)
                )

                let x = "0%"
                let rotation = 0
                if (index == 0){
                    x = gsap.utils.interpolate("0%", "90%", smoothStep(cardProgress))
                    rotation = gsap.utils.interpolate(0, -15, smoothStep(cardProgress))
                }else if(index == 2){
                    x = gsap.utils.interpolate("0%", "-90%", smoothStep(cardProgress))
                    rotation = gsap.utils.interpolate(0, 15, smoothStep(cardProgress))
                }

                gsap.set(cardId, {
                    y: y, 
                    x: x,
                    rotation: rotation,
                    scale: scale
                })

            }
        );



    }



    })



    ScrollTrigger.create({
        trigger: " .skills",
        start: "top top",
        end: `+=${window.innerHeight * 4}px`,
        pin: " .skills",
        pinSpacing: true
    })

    ScrollTrigger.create({
        trigger: " .skills",
        start: "top top",
        end: `+=${window.innerHeight * 4}px`,
        onLeave: () => {
            const skillsSection = document.querySelector(" .skills")
            const skillsRect = skillsSection.getBoundingClientRect()
            const skillsTop = window.pageYOffset + skillsRect.top

            gsap.set(" .cards", {
                position: "absolute",
                top: skillsTop,
                left: 0,
                width: "100vw",
                height: "100vh" 
            })

        },

        onEnterBack: () => {
             gsap.set(" .cards", {
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh" 
             })

        }
        

    })




    ScrollTrigger.create({
        trigger:" .skills",
        start: "top bottom",
        end: `+=${window.innerHeight * 4}px`,
        scrub: 1,
        onUpdate: (self) => {
            const progres = self.progres

            const headerProgress = gsap.utils.clamp(0, 1, progres / 0.9)
            const headerY = gsap.utils.interpolate(
                "400%",
                "0%",
                smoothStep(headerProgress)
            )
            gsap.set(".skills-header", {
                y: headerY
            })

            ["#card-1", "#card-2", "#card-3"].forEach((cardId, index) =>{

                const delay = index * 0.5
                const cardProgress = gsap.utils.clamp(
                    0,
                    1,
                    (progres - delay * 0.1) / (0.9 - delay * 0.1)
                )

                const innerCard = document.querySelector(`${cardId} .flip-card-inner`)

                let y 
                if (cardProgress < 0.4){
                    const normalizedProgress = cardProgress / 0.4
                    y = gsap.utils.interpolate(
                        "-100%",
                        "50%",
                        smoothStep(normalizedProgress)
                    )
                }else if (cardProgress < 0.6){
                    const normalizedProgress = (cardProgress - 0.4) / 0.2
                    y = gsap.utils.interpolate(
                        "50%",
                        "0%",
                        smoothStep(normalizedProgress)
                    )
                }else {
                    y = "0%"
                }


                let scale
                if (cardProgress < 0.4){
                    const normalizedProgress = cardProgress / 0.4
                    scale = gsap.utils.interpolate(
                        0.25,
                        0.75,
                        smoothStep(normalizedProgress)
                    )
                }else if (cardProgress < 0.6){
                    const normalizedProgress = (cardProgress - 0.4) / 0.2
                    scale = gsap.utils.interpolate(
                        0.75,
                        1,
                        smoothStep(normalizedProgress)
                    )
                }else {
                    scale =1
                }


                let opacity
                if (cardProgress < 0.2){
                    const normalizedProgress = cardProgress / 0.2
                    opacity = smoothStep(normalizedProgress)   
                }else {
                    opacity = 1
                }


                let x, rotate, rotationY
                if (cardProgress < 0.6){
                    x = index == 0? "100%" :  index == 1? "0%" :  "-100%" 
                    rotate = index == 0? -5 : index == 1? 0 : 5 
                    rotationY = 0 
                }else if(cardProgress < 1){
                    const normalizedProgress = (cardProgress - 0.6) / 0.4
                    x = gsap.utils.interpolate(
                        index == 0? "100%" :  index == 1? "0%" :  "-100%" ,
                        "0%",
                        smoothStep(normalizedProgress) 
                    )
                    rotate = gsap.utils.interpolate(
                        index == 0? -5 : index == 1? 0 : 5,
                        0,
                        smoothStep(normalizedProgress) 
                    )
                    rotationY = smoothStep(normalizedProgress) *180

                }else{
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