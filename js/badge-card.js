// The badge cards, painted on a canvas. One painter feeds both the 3D
// badge (as its texture) and the flat badge (as the card itself), so the
// two never drift apart. Cards are drawn in CSS pixels on a 300px wide
// badge and scaled to whatever canvas they're given. Each role's details
// come from its .id-panel's data-* attributes (readCard below).

export const CARD_W = 300;
export const CARD_H = 441;
// the slot punched through the top, which the ring passes through
export const SLOT = { top: 13.6, bottom: 21.6, width: 44.8 };

const BAND_Y = 35.2, BAND_H = 38;
const SANS = '"SN Pro", "Segoe UI", system-ui, sans-serif';

// colours per data-theme
const THEMES = {
    // University of Jeddah: after the university app's e-card, deep navy with the
    // next card's blue-grey edge and a lime accent
    student: { bg: "#022855", ink: "#ffffff", soft: "rgba(255, 255, 255, 0.6)", label: "#9fb0c6", edge: "#77a6ba",
               lime: "#c5d86d", photo: "#e8f3fa", person: "#3c424a", invert: 0 },
    // Tuwaiq Club: the club's own card, black between purple bands
    club:    { bg: "#121212", ink: "#ffffff", soft: "rgba(255, 255, 255, 0.72)", purple: "#4a2db3", name: "#f6a33b", tag: "#9ec5ff",
               invert: 0 },
    // GDG on Campus: the committee's own member card, dark slate
    gdg:     { bg: "#1e2a34", ink: "#ffffff", soft: "rgba(255, 255, 255, 0.72)", invert: 0 },
    // EG & VR Club: light card under the club's logo, its blue-to-green gradient on the rule and the role
    egvr:    { bg: "#f6f9fb", ink: "#0f1d3a", soft: "rgba(15, 29, 58, 0.62)", titleGrad: ["#3fa9f5", "#4fd1c5", "#79d94f"],
               photo: "#e7eef5", person: "#b4c3d3", rule: "rgba(15, 29, 58, 0.18)", invert: 0.88 }
};

export const fontsReady = Promise.all(
    [400, 500, 600, 700].map((w) => document.fonts.load(`${w} 12px "SN Pro"`))
).catch(() => {});

const loadImage = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
});

// the logo for the back of the card
export const logoReady = loadImage("assets/1st-Logo-inv-gry.svg");

// the GDG committee's pattern strip, from the real card
let gdgPattern = null;
const patternReady = loadImage("assets/gdg-pattern.png").then((img) => { gdgPattern = img; });

// the University of Jeddah's own logo (from uj.edu.sa), drawn white on the student card
let ujLogo = null;
const ujReady = loadImage("assets/uj-logo.svg").then((img) => { ujLogo = img && tint(img, "#ffffff"); });

// the EG & VR club's controller mark and wordmark, cut from the club's logo
let egMark = null, egWord = null;
const egReady = Promise.all([loadImage("assets/eg-mark.png"), loadImage("assets/eg-word.png")])
    .then(([m, w]) => { egMark = m; egWord = w; });

// everything the fronts need before they're painted
export const cardReady = Promise.all([fontsReady, patternReady, ujReady, egReady]);

// one flat colour through an image's shape, kept sharp for the 3D badge's texture
function tint(img, color) {
    const cv = document.createElement("canvas");
    cv.width = img.width * 4;
    cv.height = img.height * 4;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, cv.width, cv.height);
    return cv;
}

export function readCard(panel) {
    const d = panel.dataset;
    return {
        theme: d.theme || "student",
        layout: d.layout || "standard",
        band: d.band || "",
        role: d.role || "",
        footL: d.footL || "",
        footR: d.footR || "",
        headTitle: d.headTitle || "",
        headSub: d.headSub || ""
    };
}

export const cardGround = (card) => (THEMES[card.theme] || THEMES.student).bg;


// ─── Helpers ─────────────────────────────────────────────────

// a woman's silhouette (bob, shoulders) until there's a real photo, in a 100×125 box
const PERSON = new Path2D("M50 16C31 16 22 30 22 48C22 58 24 66 21 75C28 79 36 80 42 78L42 84C24 87 10 96 8 125L92 125C90 96 76 87 58 84L58 78C64 80 72 79 79 75C76 66 78 58 78 48C78 30 69 16 50 16Z");

function begin(cv) {
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const s = cv.width / CARD_W;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, CARD_W, CARD_H, 16);
    ctx.clip();
    return ctx;
}

// the slot is a real hole, so the ring can pass through it; cut last
function finish(ctx) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.roundRect((CARD_W - SLOT.width) / 2, SLOT.top, SLOT.width, SLOT.bottom - SLOT.top, 4);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
}

function drawPerson(ctx, x, bottom, width, color, alpha = 1) {
    const s = width / 100;
    ctx.save();
    ctx.translate(x, bottom - 125 * s);
    ctx.scale(s, s);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill(PERSON);
    ctx.restore();
}

// one line if it fits, otherwise two lines as even as the words allow
function balance(ctx, text, max) {
    if (ctx.measureText(text).width <= max) return [text];
    const words = text.split(" ");
    let best = [text], widest = Infinity;
    for (let k = 1; k < words.length; k++) {
        const pair = [words.slice(0, k).join(" "), words.slice(k).join(" ")];
        const w = Math.max(...pair.map((s) => ctx.measureText(s).width));
        if (w < widest) { widest = w; best = pair; }
    }
    return best;
}


// ─── Layouts ─────────────────────────────────────────────────

// the default: band, centred photo, name and role, one-line foot
function paintStandard(ctx, t, card) {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    if (t.bandGrad) {
        const g = ctx.createLinearGradient(0, 0, CARD_W, 0);
        t.bandGrad.forEach((c, k) => g.addColorStop(k / (t.bandGrad.length - 1), c));
        ctx.fillStyle = g;
    } else {
        ctx.fillStyle = t.band;
    }
    ctx.fillRect(0, BAND_Y, CARD_W, BAND_H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "1.9px";
    ctx.font = `600 13.6px ${SANS}`;
    ctx.fillStyle = t.bandInk;
    ctx.fillText(card.band.toUpperCase(), CARD_W / 2 + 0.95, BAND_Y + BAND_H / 2 + 0.5);
    ctx.letterSpacing = "0px";
    ctx.textBaseline = "alphabetic";

    paintBody(ctx, t, card, BAND_Y + BAND_H + 16, 144, 180);
}

const gradient = (ctx, colors, x0, x1) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    colors.forEach((c, k) => g.addColorStop(k / (colors.length - 1), c));
    return g;
};

// EG & VR: the club's mark and wordmark, a gradient rule, then the usual body
function paintEgLogo(ctx, t, card) {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    if (egMark) ctx.drawImage(egMark, (CARD_W - 150) / 2, 32, 150, 150 * egMark.height / egMark.width);
    if (egWord) ctx.drawImage(egWord, (CARD_W - 104) / 2, 118, 104, 104 * egWord.height / egWord.width);
    ctx.fillStyle = gradient(ctx, t.titleGrad, 0, CARD_W);
    ctx.fillRect(0, 152, CARD_W, 4);
    paintBody(ctx, t, card, 168, 110, 132);
}

// University of Jeddah, after the app's e-card: white logo, faint sails behind,
// round photo, name and role, label rows, the university's name over a lime rule
const EDGE_W = 30;
const ECARD_ROWS = [["Major", "Software Engineering"], ["College", "Computer Science & Eng."], ["Years", "2023 – 2027"]];
function paintEcard(ctx, t, card) {
    const mid = (CARD_W - EDGE_W) / 2;
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.fillStyle = t.edge;
    ctx.fillRect(CARD_W - EDGE_W, 0, EDGE_W, CARD_H);

    if (ujLogo) {
        // the sails alone (the top 134 of the logo's 194 units), very faint
        const sh = ujLogo.height * 134 / 194.229;
        ctx.globalAlpha = 0.07;
        ctx.drawImage(ujLogo, 0, 0, ujLogo.width, sh, -40, 150, 340, 340 * sh / ujLogo.width);
        ctx.globalAlpha = 1;
        ctx.drawImage(ujLogo, 20, 26, 50 * ujLogo.width / ujLogo.height, 50);
    }

    const cy = 83, r = 43;
    ctx.beginPath();
    ctx.arc(mid, cy, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(mid, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = t.photo;
    ctx.fill();
    ctx.clip();
    drawPerson(ctx, mid - r * 0.76, cy + r * 1.08, r * 1.52, t.person);
    ctx.restore();

    ctx.textAlign = "center";
    ctx.fillStyle = t.ink;
    ctx.font = `600 20px ${SANS}`;
    ctx.fillText("Shumokh Alsharif", mid, 158);
    ctx.fillStyle = t.soft;
    ctx.font = `400 12.5px ${SANS}`;
    ctx.fillText(card.role, mid, 178);

    ECARD_ROWS.forEach(([label, value], k) => {
        const y = 222 + k * 26;
        ctx.font = `400 13.5px ${SANS}`;
        ctx.fillStyle = t.label;
        ctx.textAlign = "left";
        ctx.fillText(label, 26, y);
        ctx.font = `500 13.5px ${SANS}`;
        ctx.fillStyle = t.ink;
        ctx.textAlign = "right";
        ctx.fillText(value, CARD_W - EDGE_W - 20, y);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = t.ink;
    ctx.font = `600 18px ${SANS}`;
    ctx.fillText("University of Jeddah", mid, 348);
    ctx.fillStyle = t.lime;
    ctx.fillRect(mid - 22, 360, 44, 2);
    ctx.fillStyle = t.soft;
    ctx.font = `500 11.5px ${SANS}`;
    ctx.fillText("shumokh.dev", mid, 412);
}

// photo, name and role, foot
function paintBody(ctx, t, card, py, pw, ph) {
    const px = (CARD_W - pw) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.clip();
    ctx.fillStyle = t.photo;
    ctx.fillRect(px, py, pw, ph);
    // a theme with its own stand-in colour gets a solid one; the others stay a soft tint
    drawPerson(ctx, px + pw * 0.1, py + ph, pw * 0.8, t.person || t.ink, t.person ? 1 : 0.22);
    ctx.restore();

    const footY = CARD_H - 43;
    ctx.strokeStyle = t.rule;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, footY + 0.5);
    ctx.lineTo(CARD_W, footY + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `400 11.5px ${SANS}`;
    ctx.fillStyle = t.soft;
    ctx.textAlign = "center";
    ctx.fillText(`${card.footL} · ${card.footR}`, CARD_W / 2, footY + 25);

    // name and role sit centred between the photo and the foot
    ctx.font = `600 21px ${SANS}`;
    const lines = balance(ctx, card.role, CARD_W - 32);
    const lh = 24.5;
    const blockH = 16 + 27 + (lines.length - 1) * lh + 5;   // name cap height to the last descender
    const nameBase = py + ph + (footY - (py + ph) - blockH) / 2 + 16;
    lines.forEach((line, k) => {
        const w = ctx.measureText(line).width;
        ctx.fillStyle = t.titleGrad ? gradient(ctx, t.titleGrad, (CARD_W - w) / 2, (CARD_W + w) / 2) : t.title;
        ctx.fillText(line, CARD_W / 2, nameBase + 27 + k * lh);
    });
    ctx.font = `700 22px ${SANS}`;
    ctx.fillStyle = t.ink;
    ctx.fillText("Shumokh Alsharif", CARD_W / 2, nameBase);
}

const PAT_W = 89;
const GDG_MARK = new Path2D("M14 3 4 10l10 7M20 3l10 7-10 7");

// GDG on Campus: role and committee, photo against the pattern, name, chapter mark
function paintGdg(ctx, t, card) {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.textAlign = "center";
    ctx.fillStyle = t.ink;
    // the committee line breaks into two even lines when it's long
    ctx.font = `400 15px ${SANS}`;
    const sub = balance(ctx, card.headSub, CARD_W - 50);
    const subBase = sub.length > 1 ? 93 : 104;
    sub.forEach((line, k) => ctx.fillText(line, CARD_W / 2, subBase + k * 18));
    ctx.font = `700 30px ${SANS}`;
    ctx.fillText(card.headTitle, CARD_W / 2, subBase - 24);

    // the pattern strip tucked behind the photo, cropped to fill like the card
    const top = 126, pw = 118, ph = 160, px = 61;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(CARD_W / 2, top, PAT_W, ph, 10);
    ctx.clip();
    ctx.fillStyle = "#f1f3f4";
    ctx.fillRect(CARD_W / 2, top, PAT_W, ph);
    if (gdgPattern) {
        const s = Math.max(PAT_W / gdgPattern.width, ph / gdgPattern.height);
        const w = gdgPattern.width * s, h = gdgPattern.height * s;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(gdgPattern, CARD_W / 2 + (PAT_W - w) / 2, top + (ph - h) / 2, w, h);
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, top, pw, ph, 12);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.clip();
    drawPerson(ctx, px + pw * 0.1, top + ph - 18, pw * 0.8, t.bg);
    ctx.restore();
    ctx.strokeStyle = "#5f6368";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, top, pw, ph, 12);
    ctx.stroke();

    ctx.fillStyle = t.ink;
    ctx.font = `700 21px ${SANS}`;
    ctx.fillText("Shumokh Alsharif", CARD_W / 2, 330);

    const line1 = "Google Developer Group on Campus", line2 = "University of Jeddah";
    ctx.font = `400 10.5px ${SANS}`;
    const w1 = ctx.measureText(line1).width;
    ctx.font = `400 8.5px ${SANS}`;
    const w2 = ctx.measureText(line2).width;
    const x0 = (CARD_W - (34 + 8 + Math.max(w1, w2))) / 2;
    ctx.save();
    ctx.translate(x0, 391);
    ctx.strokeStyle = t.ink;
    ctx.lineWidth = 5.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(GDG_MARK);
    ctx.restore();
    ctx.textAlign = "left";
    ctx.font = `400 10.5px ${SANS}`;
    ctx.fillText(line1, x0 + 42, 400);
    ctx.font = `400 8.5px ${SANS}`;
    ctx.fillText(line2, x0 + 42, 412);
}

// "CLUB" in the club's blocky letters, then its three squares
const CLUB_GLYPHS = {
    C: ["####", "#...", "#...", "#...", "####"],
    L: ["#...", "#...", "#...", "#...", "####"],
    U: ["#..#", "#..#", "#..#", "#..#", "####"],
    B: ["###.", "#..#", "###.", "#..#", "###."]
};
function drawClub(ctx, cx, top, u, ink) {
    let x = cx - (22.85 * u) / 2;
    ctx.fillStyle = ink;
    for (const ch of "CLUB") {
        CLUB_GLYPHS[ch].forEach((row, r) => Array.from(row).forEach((c, k) => {
            if (c === "#") ctx.fillRect(x + k * u, top + r * u, u * 0.86, u * 0.86);
        }));
        x += 5 * u;
    }
    x += 0.4 * u;
    const s = u * 1.15;
    [["#4cc4e6", 0, 0.2], ["#f7931e", 1.3, 1.95], ["#9468f2", 0, 3.7]].forEach(([c, dx, dy]) => {
        ctx.fillStyle = c;
        ctx.fillRect(x + dx * u, top + dy * u, s, s);
    });
}

// Tuwaiq Club: partner marks on a purple band, the club logo on black,
// the photo in a purple circle, name and role on a purple panel
function paintTuwaiq(ctx, t, card) {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.fillStyle = t.purple;
    ctx.fillRect(0, 0, CARD_W, 108);

    ctx.textAlign = "center";
    ctx.fillStyle = t.ink;
    ctx.font = `500 9px ${SANS}`;
    ctx.fillText("أكاديمية طويق", 58, 70);
    ctx.fillText("جامعة جدة", 244, 70);
    ctx.font = `500 8.5px ${SANS}`;
    ctx.fillText("Tuwaiq Academy", 58, 82);
    ctx.fillText("University of Jeddah", 244, 82);
    ctx.font = `700 13px ${SANS}`;
    ctx.fillText("Tuwaiq", CARD_W / 2, 70);
    drawClub(ctx, CARD_W / 2, 74, 1.9, t.ink);

    ctx.fillStyle = t.ink;
    ctx.font = `700 40px ${SANS}`;
    ctx.fillText("Tuwaiq", CARD_W / 2, 162);
    drawClub(ctx, CARD_W / 2, 171, 5.6, t.ink);

    // photo: the purple circle with the stand-in, and the pixel confetti around it
    const cx = CARD_W / 2, cy = 272, r = 64;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = t.purple;
    ctx.fill();
    ctx.clip();
    drawPerson(ctx, cx - 50, 330, 100, "#ffffff", 0.94);
    ctx.restore();
    [["#9468f2", 63, 252, 10], ["#ffffff", 103, 251, 5], ["#4cc4e6", 90, 230, 3.5], ["#f7931e", 82, 279, 6],
     ["#9468f2", 204, 254, 6], ["#9468f2", 216, 254, 6], ["#9468f2", 210, 260, 6], ["#9468f2", 222, 260, 6]]
        .forEach(([c, x, y, s]) => { ctx.fillStyle = c; ctx.fillRect(x, y, s, s); });

    ctx.fillStyle = t.purple;
    ctx.beginPath();
    ctx.roundRect(5, 324, CARD_W - 10, 140, [16, 16, 0, 0]);
    ctx.fill();
    ctx.fillStyle = t.name;
    ctx.font = `700 24px ${SANS}`;
    ctx.fillText("Shumokh Alsharif", CARD_W / 2, 362);
    ctx.fillStyle = t.ink;
    ctx.font = `600 17px ${SANS}`;
    ctx.fillText(card.role, CARD_W / 2, 390);
    ctx.fillStyle = t.tag;
    ctx.font = `500 8.5px ${SANS}`;
    ctx.textAlign = "left";
    ctx.fillText(card.footL, 30, 424);
    ctx.textAlign = "right";
    ctx.fillText(card.footR, CARD_W - 30, 424);

    ctx.fillStyle = "#4cc4e6";
    ctx.fillRect(278, 8, 10, 6);
    ctx.fillRect(12, 428, 10, 6);
}

const LAYOUTS = { standard: paintStandard, gdg: paintGdg, tuwaiq: paintTuwaiq, ecard: paintEcard, eglogo: paintEgLogo };


// ─── Faces ───────────────────────────────────────────────────

export function paintFront(cv, card) {
    const ctx = begin(cv);
    (LAYOUTS[card.layout] || paintStandard)(ctx, THEMES[card.theme] || THEMES.student, card);
    finish(ctx);
}

// the back: the role's ground with the logo and the site address
const logoCache = new Map();
function logoFor(img, amt) {
    if (!img) return null;
    if (logoCache.has(amt)) return logoCache.get(amt);
    const cv = document.createElement("canvas");
    cv.width = 536;
    cv.height = 372;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    if (amt) {
        const data = ctx.getImageData(0, 0, cv.width, cv.height);
        const d = data.data;
        for (let k = 0; k < d.length; k += 4) {
            d[k] += (255 - 2 * d[k]) * amt;
            d[k + 1] += (255 - 2 * d[k + 1]) * amt;
            d[k + 2] += (255 - 2 * d[k + 2]) * amt;
        }
        ctx.putImageData(data, 0, 0);
    }
    logoCache.set(amt, cv);
    return cv;
}

export function paintBack(cv, card, logo) {
    const t = THEMES[card.theme] || THEMES.student;
    const ctx = begin(cv);
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    const mark = logoFor(logo, t.invert);
    if (mark) {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(mark, (CARD_W - 150) / 2, 170, 150, 104);
        ctx.globalAlpha = 1;
    }
    ctx.font = `500 11px ${SANS}`;
    ctx.letterSpacing = "2.2px";
    ctx.fillStyle = t.soft;
    ctx.textAlign = "center";
    ctx.fillText("SHUMOKH.DEV", CARD_W / 2 + 1.1, CARD_H - 30);
    ctx.letterSpacing = "0px";
    finish(ctx);
}
