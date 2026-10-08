---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Surface brief: index.html (portfolio home)

Mode: Experience (portfolio). Audience: internship recruiters skimming 30–90s.
Scope of this round: redesign About, Projects, Certifications→merged "Beyond the Deck" (leadership, clubs, hackathons, awards, certificates). Hero, skills flip-cards, contact fan and footer are kept (incumbent world extended, not replaced). Leadership/hackathon entries are placeholders until the user supplies them.

## Direction contract

THESIS: The hero and contact carry the playing-card identity; the middle sections are clean and professional, each with its own familiar-but-improved interaction, and the cards appear only as a light nod. Refuses suit-coding every section, repeating one hover pattern, alternating image/text project rows and a certificate carousel.

OWN-WORLD: Incumbent world: cream #F9F4EB ground, white card stock with 20px radius and soft offset shadow, black #000 about field, deep red #662020 footer, Odibee Sans display / SN Pro body, red/black op-art ace artwork, corner indices (rank + suit) as the recurring component.

STORY: About: she builds things that feel as good as they work; four focus areas, each an ace, each tied to proof. Projects: five dealt cards, A–5, each with stack, story, code and demo. Beyond the Deck: leadership, hackathons, awards, certificates in one filterable ledger with the real certificate sliding out on hover. Visitor ends at Deal Me In.

FIRST VIEWPORT: Unchanged hero (name, three aces, tagline). About opens on a black field with a full-width statement at display scale, words lighting up with scroll; the four-suit index sits below it.

FORM: Revised 2026-10-09 after user feedback (too suit-coded, then too colourful, sticky sidebar repeated the projects bar, About read as a skills list). Palette: cream, warm off-black #161412, one accent wine #662020 used only for rules/underlines. About = editorial: statement word-reveal, personal bio set into the right columns (lines rise from masks), four-fact colophon whose rules draw in. Projects = sticky index bar + stacked white cards with inline media gallery. About bottom half adds a full-bleed velocity marquee (scroll speeds/reverses it), scrubbed underlines on key bio phrases, hover-reactive facts and a pulsing 'now' dot. Beyond the Deck = one lanyard badge, calm (revised 2026-10-09 per user: previous sway/cord felt laggy): the badge lowers in once, swings, settles and then stays still (no idle sway, no scroll/pointer reactions). The section pins; scrolling restyles the badge per entry (colour variables tween, text fades): leadership dark/wine band, hackathon white/ink band, awards+certificates = Shumokh's default cream badge. Right column: details, then a photo collage under the text: tiles grow from small rounded squares (clip-path) and stagger; 1/2/3/4+ layouts with +N; certificates shown whole on paper; any entry takes data-photos="a.jpg, b.jpg". 3D drum timeline wheel spins with scroll. Phones/tablets/reduced motion: stepped with Prev/Next and swipe, collage under the details.

REVISION 2026-10-09 (user): Beyond the Deck is hidden (markup kept, `hidden` attribute). The lanyard badge moved into About: statement word-reveal, then a pinned stage where each scroll step flips the badge edge-on to the next identity (Student cream/wine, Track Lead wine/cream band, GDG on Campus white/ink band); copy beside it swaps with a blur-rise; one progress segment per role, clickable. Marquee and four-fact colophon removed; the 2023–2027 timeline lives in the Student panel. Phones: badge hangs top-right and the title wraps around it (float). Reduced motion / under 520px tall: roles listed, sticky badge switches as each scrolls by. Club name, GDG title and years are visible [placeholders].
REVISION 2026-10-09 (user, 2): the statement moved to the end of About as a smaller closing line under the copy column (word reveal kept); the stage now opens the section and clips the badge so it never shows above the stage before it drops in.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
