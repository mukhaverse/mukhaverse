document.addEventListener("DOMContentLoaded", () => {
    if (typeof gsap === "undefined") return;

    const projects = gsap.utils.toArray(".project");
    if (!projects.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    projects.forEach((project) => {
        gsap.set(project, { opacity: 0, y: 40 });

        ScrollTrigger.create({
            trigger: project,
            start: "top 85%",
            once: true,
            onEnter: () => {
                gsap.to(project, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" });
            }
        });
    });
});
