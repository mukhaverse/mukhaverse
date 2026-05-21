

const FAN_ANGLE_RANGE = 55;
const FAN_Y_BASE      = 60;
const FAN_EDGE_DIP    = 24;
const FAN_X_SPREAD    = 100;
const BACK_SCALE      = 1;
const DUR_SWAP      = 0.55;
const EASE_TO_FRONT = "back.out(1.4)";
const EASE_TO_BACK  = "power3.inOut";

(function () {
    "use strict";

    const stage = document.getElementById("fanStage");
    if (!stage) return;

    const cards = Array.from(stage.querySelectorAll(".fan-card"));
    const N     = cards.length;
    if (N === 0) return;

    const FRONT_SLOT = N - 1;

    const slots    = cards.map((_, i) => N - 1 - i);
    const cardSlot = new Array(N);
    slots.forEach((cardIdx, slotIdx) => cardSlot[cardIdx] = slotIdx);


    

    function getTransform(slotIdx, isFront) {
        const t        = N === 1 ? 1 : slotIdx / (N - 1);
        const rotation = (t - 0.5) * FAN_ANGLE_RANGE;
        const x        = (t - 0.5) * FAN_X_SPREAD;
        const y        = FAN_Y_BASE + Math.abs(t - 0.5) * 2 * FAN_EDGE_DIP;
        const scale    = isFront ? 1 : BACK_SCALE;
        const zIndex   = isFront ? N + 10 : slotIdx;

        return { rotation, x, y, scale, zIndex, transformOrigin: "center bottom" };
    }


    

    function renderAll(animate) {
        cards.forEach((card, cardIdx) => {
            const slotIdx = cardSlot[cardIdx];
            const isFront = slotIdx === FRONT_SLOT;
            const tf      = getTransform(slotIdx, isFront);

            card.classList.toggle("is-front", isFront);

            if (!animate) {
                gsap.set(card, tf);
            } else {
                gsap.to(card, {
                    ...tf,
                    duration: DUR_SWAP,
                    ease: isFront ? EASE_TO_FRONT : EASE_TO_BACK,
                    overwrite: "auto",
                });
            }
        });
    }


    

    cards.forEach((card, cardIdx) => {
        
        card.addEventListener("click", (e) => {
            const isFront = cardSlot[cardIdx] === FRONT_SLOT;
            if (isFront) {
                if (cardIdx === 0) e.preventDefault(); 
                return;
            }

            e.preventDefault();
            const currentFrontIdx = slots[FRONT_SLOT];
            const clickedSlotIdx  = cardSlot[cardIdx];

            
            slots[FRONT_SLOT] = cardIdx;
            slots[clickedSlotIdx] = currentFrontIdx;
            cardSlot[cardIdx] = FRONT_SLOT;
            cardSlot[currentFrontIdx] = clickedSlotIdx;

            renderAll(true);
        });

        
        

        card.addEventListener("mouseenter", () => {
            if (cardSlot[cardIdx] !== FRONT_SLOT) {
                gsap.to(card, { y: "-=10", duration: 0.22, ease: "power2.out", overwrite: "auto" });
            }
        });

        card.addEventListener("mouseleave", () => {
            if (cardSlot[cardIdx] !== FRONT_SLOT) {
                const tf = getTransform(cardSlot[cardIdx], false);
                gsap.to(card, { y: tf.y, duration: 0.28, ease: "power2.out", overwrite: "auto" });
            }
        });
    });

    
    renderAll(false);

    

    gsap.registerPlugin(ScrollTrigger);

    const cardsBySlot = [...cards].sort((a, b) => cardSlot[cards.indexOf(a)] - cardSlot[cards.indexOf(b)]);
    gsap.from(cardsBySlot, {
        y: 160,
        opacity: 0,
        duration: 0.6,
        stagger: 0.07,
        ease: "back.out(1.3)",
        delay: .5,
        scrollTrigger: {
        trigger: stage,
        start: "top 80%",
        toggleActions: "play none none reverse"
}
    });
}());