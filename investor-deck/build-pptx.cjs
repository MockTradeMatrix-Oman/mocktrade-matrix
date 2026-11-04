/* MockTrade Matrix — investor deck builder (pptxgenjs) */
const path = require("path");
const PptxGenJS = require(path.join(process.env.TEMP, "opencode", "pptx", "node_modules", "pptxgenjs"));

const C = {
  bg: "05070C", bg2: "070B13", panel: "0B111B", panel2: "0F1725", line: "1C2736",
  ink: "F3F6FB", ink2: "C8D1E0", muted: "8A95A9", muted2: "667186",
  green: "2FE3A0", green2: "6FF2C3", violet: "8B7BFF", violet2: "B3A8FF",
  cyan: "4CC9F0", amber: "FFC061", red: "FF5D7A",
};
const F = { body: "Segoe UI", display: "Segoe UI Semibold", mono: "Consolas" };
const W = 13.333, H = 7.5, M = 0.62;

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_16x9";
pptx.author = "Pranav Ram";
pptx.company = "MockTrade Matrix";
pptx.title = "MockTrade Matrix — Investor Deck";
pptx.subject = "The guardian-verified markets lab for the next generation of investors";
pptx.lang = "en-US";
pptx.theme = { headFontFace: F.display, bodyFontFace: F.body, lang: "en-US" };
pptx.defineLayout({ name: "DECK", width: W, height: H });
pptx.layout = "DECK";

let total = 17;
let n = 0;

function base(meta, section, opts = {}) {
  const s = pptx.addSlide();
  s.background = { color: C.bg };
  // ambient glows
  s.addShape(pptx.ShapeType.ellipse, { x: 9.4, y: -2.4, w: 6.4, h: 6.4, fill: { color: C.green, transparency: 94 }, line: { color: C.green, transparency: 100 } });
  s.addShape(pptx.ShapeType.ellipse, { x: -2.6, y: 4.6, w: 6.0, h: 6.0, fill: { color: C.violet, transparency: 94 }, line: { color: C.violet, transparency: 100 } });
  // chrome
  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 0.34, w: 0.17, h: 0.17, rectRadius: 0.04, fill: { color: C.green }, line: { color: C.green, width: 0 } });
  s.addText("MOCKTRADE MATRIX", { x: M + 0.26, y: 0.29, w: 2.2, h: 0.26, fontFace: F.display, fontSize: 9, bold: true, color: C.ink, charSpacing: 0.4, valign: "middle" });
  s.addText("INVESTOR DECK · 2026", { x: M + 1.95, y: 0.29, w: 2.0, h: 0.26, fontFace: F.mono, fontSize: 6.5, color: C.muted2, charSpacing: 1.2, valign: "middle" });
  if (section) s.addText(section.toUpperCase(), { x: 9.0, y: 0.29, w: 2.6, h: 0.26, fontFace: F.mono, fontSize: 7, color: C.muted2, charSpacing: 1.5, align: "right", valign: "middle" });
  s.addText(`${String(n).padStart(2, "0")} / ${total}`, { x: 11.9, y: 0.29, w: 0.82, h: 0.26, fontFace: F.mono, fontSize: 7, color: C.muted, align: "right", valign: "middle" });
  // footer progress
  s.addShape(pptx.ShapeType.rect, { x: M, y: 7.28, w: W - M * 2, h: 0.012, fill: { color: "16202D" }, line: { width: 0 } });
  s.addShape(pptx.ShapeType.rect, { x: M, y: 7.28, w: (W - M * 2) * (n / total), h: 0.012, fill: { color: C.green }, line: { width: 0 } });
  s.addText(String(meta), { x: M, y: 7.01, w: 5, h: 0.2, fontFace: F.mono, fontSize: 6.5, color: C.muted2, charSpacing: 1.4, valign: "middle" });
  return s;
}

function eyebrow(s, x, y, num, label, color = C.green) {
  s.addShape(pptx.ShapeType.rect, { x, y: y + 0.11, w: 0.26, h: 0.012, fill: { color }, line: { width: 0 } });
  s.addText(`${num}`, { x: x + 0.34, y, w: 0.3, h: 0.24, fontFace: F.mono, fontSize: 7.5, color: C.muted2, charSpacing: 1.2, valign: "middle" });
  s.addText(label.toUpperCase(), { x: x + 0.62, y, w: 4, h: 0.24, fontFace: F.mono, fontSize: 7.5, color, charSpacing: 2.1, valign: "middle" });
}

function title(s, lines, x, y, w, size = 30) {
  s.addText(lines, { x, y, w, h: size > 26 ? 1.55 : 1.0, fontFace: F.display, fontSize: size, bold: true, color: C.ink, charSpacing: -1.0, lineSpacingMultiple: 1.0, valign: "top" });
}

function card(s, x, y, w, h, fill = C.panel, line = C.line, radius = 0.11) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: radius, fill: { color: fill }, line: { color: line, width: 0.8 } });
}

function pill(s, x, y, label, color = C.green, w) {
  const width = w || Math.max(0.72, label.length * 0.064 + 0.3);
  s.addShape(pptx.ShapeType.roundRect, { x, y, w: width, h: 0.26, rectRadius: 0.13, fill: { color, transparency: 90 }, line: { color, width: 0.7, transparency: 55 } });
  s.addText(label, { x: x + 0.02, y, w: width - 0.04, h: 0.26, fontFace: F.mono, fontSize: 6.5, color, charSpacing: 0.8, align: "center", valign: "middle" });
  return width;
}

function label(s, text, x, y, w, color = C.muted2, size = 6.5) {
  s.addText(text.toUpperCase(), { x, y, w, h: 0.2, fontFace: F.mono, fontSize: size, color, charSpacing: 1.3, valign: "middle" });
}

function para(s, text, x, y, w, h, size = 10.5, color = C.muted, lineSpacing = 1.25) {
  s.addText(text, { x, y, w, h, fontFace: F.body, fontSize: size, color, lineSpacingMultiple: lineSpacing, valign: "top" });
}

function spark(s, x, y, w, h, color = C.green, pts) {
  const points = pts || [0.92, 0.86, 0.9, 0.74, 0.78, 0.58, 0.64, 0.44, 0.5, 0.3, 0.36, 0.16];
  for (let i = 0; i < points.length - 1; i++) {
    s.addShape(pptx.ShapeType.line, {
      x: x + (w * i) / (points.length - 1), y: y + h * points[i],
      w: w / (points.length - 1), h: h * (points[i + 1] - points[i]),
      line: { color, width: 1.6, cap: "round" },
    });
  }
}

function dots(s, x, y, active, count = 12) {
  for (let i = 0; i < count; i++) {
    s.addShape(pptx.ShapeType.ellipse, { x: x + i * 0.11, y, w: 0.03, h: 0.03, fill: { color: i === active ? C.green : "1E2A3A" }, line: { width: 0 } });
  }
}

// ---------------------------------------------------------------------------
// 01 COVER
// ---------------------------------------------------------------------------
n = 1;
{
  const s = base("MockTrade Matrix · 2026", "", { cover: true });
  s.addShape(pptx.ShapeType.roundRect, { x: M, y: 0.95, w: 2.25, h: 0.3, rectRadius: 0.15, fill: { color: C.green, transparency: 90 }, line: { color: C.green, width: 0.7, transparency: 55 } });
  s.addShape(pptx.ShapeType.ellipse, { x: M + 0.13, y: 1.08, w: 0.055, h: 0.055, fill: { color: C.green }, line: { width: 0 } });
  s.addText("LIVE PRODUCT · PRIVATE BETA", { x: M + 0.24, y: 0.95, w: 1.98, h: 0.3, fontFace: F.mono, fontSize: 6.3, color: C.green2, charSpacing: 1.1, valign: "middle" });
  title(s, [{ text: "Learn to lose.", options: { color: C.ink } }, { text: "Before it costs anything.", options: { color: C.green } }], M, 1.42, 7.4, 46);
  para(s, "The guardian-verified markets lab where students trade India and the US with real market friction — and zero real money.", M, 4.02, 6.1, 0.9, 13, C.ink2, 1.35);
  s.addText("5 asset classes    ·    31 live instruments    ·    2 markets    ·    8 modules", { x: M, y: 5.18, w: 6.7, h: 0.28, fontFace: F.mono, fontSize: 7.2, color: C.muted, charSpacing: 0.5, valign: "middle" });
  s.addText("NOT A MOCKUP. A RUNNING SYSTEM.", { x: M, y: 5.66, w: 5, h: 0.24, fontFace: F.mono, fontSize: 6.8, color: C.muted2, charSpacing: 2.0, valign: "middle" });

  // hero card
  card(s, 8.18, 1.38, 4.5, 4.22, "0A1019", C.line, 0.16);
  s.addText("SIMULATED PORTFOLIO", { x: 8.46, y: 1.6, w: 2.2, h: 0.2, fontFace: F.mono, fontSize: 6.1, color: C.muted2, charSpacing: 1.3, valign: "middle" });
  s.addText("+12.4%", { x: 11.55, y: 1.58, w: 0.86, h: 0.24, fontFace: F.mono, fontSize: 6.6, color: C.green, align: "right", valign: "middle" });
  s.addShape(pptx.ShapeType.roundRect, { x: 11.42, y: 1.55, w: 1.0, h: 0.28, rectRadius: 0.14, fill: { color: C.green, transparency: 90 }, line: { color: C.green, width: 0.6, transparency: 55 } });
  s.addText("₹1,12,400", { x: 8.44, y: 1.86, w: 3.9, h: 0.52, fontFace: F.display, fontSize: 27, bold: true, color: C.ink, charSpacing: -1.4, valign: "middle" });
  spark(s, 8.46, 2.56, 3.9, 1.06, C.green);
  // glow under line
  spark(s, 8.46, 2.58, 3.9, 1.04, "1B6B51");
  // stats
  s.addShape(pptx.ShapeType.rect, { x: 8.46, y: 3.87, w: 3.94, h: 0.008, fill: { color: C.line }, line: { width: 0 } });
  const stats = [["CASH", "₹42,150"], ["INVESTED", "₹70,250"], ["POSITIONS", "7"]];
  stats.forEach(([k, v], i) => {
    s.addText(k, { x: 8.46 + i * 1.32, y: 3.99, w: 1.2, h: 0.18, fontFace: F.mono, fontSize: 5.8, color: C.muted2, charSpacing: 1.0 });
    s.addText(v, { x: 8.46 + i * 1.32, y: 4.18, w: 1.25, h: 0.26, fontFace: F.display, fontSize: 10.5, bold: true, color: C.ink });
  });
  s.addText("▲", { x: 8.46, y: 4.64, w: 0.2, h: 0.2, fontFace: F.body, fontSize: 7, color: C.green });
  s.addText("Behaviour 82 / 100", { x: 8.7, y: 4.62, w: 2.4, h: 0.24, fontFace: F.mono, fontSize: 7, color: C.ink2, valign: "middle" });
  s.addText("Coverage 74%", { x: 11.2, y: 4.62, w: 1.25, h: 0.24, fontFace: F.mono, fontSize: 6.3, color: C.muted2, align: "right", valign: "middle" });

  // score chip
  s.addShape(pptx.ShapeType.roundRect, { x: 11.25, y: 5.14, w: 1.14, h: 0.68, rectRadius: 0.1, fill: { color: C.green, transparency: 92 }, line: { color: C.green, width: 0.8, transparency: 50 } });
  s.addText("82", { x: 11.3, y: 5.18, w: 1.04, h: 0.38, fontFace: F.display, fontSize: 22, bold: true, color: C.green2, align: "center" });
  s.addText("BEHAVIOUR", { x: 11.3, y: 5.56, w: 1.04, h: 0.16, fontFace: F.mono, fontSize: 5, color: C.muted, charSpacing: 1.0, align: "center" });

  // ticker
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 6.72, w: W, h: 0.44, fill: { color: "070B12" }, line: { color: C.line, width: 0.8 } });
  const tick = "RELIANCE  ₹2,941  +1.24%      TCS  ₹4,112  +0.62%      HDFCBANK  ₹1,684  −0.41%      INFY  ₹1,892  +0.88%      AAPL  $232.4  +1.02%      NVDA  $138.9  +2.31%      BTC  $67,240  −1.84%      GOLD  ₹71,500  +0.34%";
  s.addText(tick, { x: 0.35, y: 6.72, w: 12.6, h: 0.44, fontFace: F.mono, fontSize: 6.6, color: C.muted, charSpacing: 0.4, valign: "middle" });

  s.addText("01 — COVER", { x: M, y: 7.02, w: 3, h: 0.2, fontFace: F.mono, fontSize: 6.5, color: C.muted2, charSpacing: 1.4 });
}

// ---------------------------------------------------------------------------
// 02 PROBLEM
// ---------------------------------------------------------------------------
n = 2;
{
  const s = base("01 — Problem", "The problem");
  eyebrow(s, M, 0.92, "01", "The problem");
  title(s, [{ text: "We teach risk with slides.", options: { color: C.ink } }, { text: "Then hand them a brokerage app.", options: { color: C.ink } }], M, 1.24, 8.4, 26);
  para(s, "Financial education is theoretical at exactly the moment it becomes real.", 9.55, 1.28, 3.1, 0.7, 8, C.muted);
  para(s, "A teenager can pass a quiz on diversification and still panic-sell their first drawdown. The first real loss is the lesson — and it is expensive.", M, 2.98, 6.4, 0.8, 11, C.ink2);

  const stats = [
    ["33%", "of adults worldwide are financially literate.", "S&P GLOBAL FINLIT"],
    ["27%", "in India — one of the fastest-growing retail investor bases.", "S&P GLOBAL FINLIT"],
  ];
  stats.forEach(([big, copy, src], i) => {
    const x = M + i * 3.22;
    card(s, x, 3.98, 3.06, 1.48);
    s.addText(big, { x: x + 0.24, y: 4.12, w: 1.5, h: 0.5, fontFace: F.display, fontSize: 26, bold: true, color: C.ink, charSpacing: -1.0 });
    para(s, copy, x + 0.24, 4.62, 2.6, 0.5, 7.7, C.muted, 1.2);
    s.addText(src, { x: x + 0.24, y: 5.18, w: 2.6, h: 0.18, fontFace: F.mono, fontSize: 5.4, color: C.muted2, charSpacing: 1.0 });
  });
  card(s, M, 5.62, 6.3, 0.92, "0E0A12", "3A2230");
  s.addText("₹0 → ₹1L", { x: M + 0.24, y: 5.72, w: 1.85, h: 0.4, fontFace: F.display, fontSize: 19, bold: true, color: C.red, charSpacing: -0.6 });
  para(s, "The gap between a classroom and a funded account is where confidence, discipline and money are lost. Nobody practises the gap.", M + 2.05, 5.74, 4.05, 0.68, 7.4, C.muted, 1.25);

  // bridge diagram
  const bx = 7.35, by = 3.45;
  card(s, bx, by, 2.1, 1.7, "0A0F18", C.line);
  label(s, "Classroom", bx + 0.2, by + 0.16, 1.7, C.muted2, 5.6);
  s.addText("Theory", { x: bx + 0.2, y: by + 0.58, w: 1.7, h: 0.38, fontFace: F.display, fontSize: 17, bold: true, color: C.ink });
  s.addText("no rehearsal", { x: bx + 0.2, y: by + 1.18, w: 1.7, h: 0.2, fontFace: F.mono, fontSize: 5.8, color: C.muted2 });

  card(s, bx + 2.28, by - 0.28, 2.06, 2.26, "120D14", "4A2735");
  label(s, "The gap", bx + 2.48, by - 0.1, 1.6, C.red, 5.6);
  s.addText("First\nloss", { x: bx + 2.48, y: by + 0.34, w: 1.6, h: 0.86, fontFace: F.display, fontSize: 20, bold: true, color: C.ink, lineSpacingMultiple: 1.0 });
  s.addText("no rehearsal", { x: bx + 2.48, y: by + 1.6, w: 1.6, h: 0.2, fontFace: F.mono, fontSize: 5.8, color: C.red });

  card(s, bx + 4.52, by, 1.86, 1.7, "081310", "1F4A3B");
  label(s, "Brokerage", bx + 4.7, by + 0.16, 1.5, C.green, 5.6);
  s.addText("Real\nmoney", { x: bx + 4.7, y: by + 0.52, w: 1.55, h: 0.78, fontFace: F.display, fontSize: 16, bold: true, color: C.ink, lineSpacingMultiple: 1.0 });
  s.addText("real consequences", { x: bx + 4.7, y: by + 1.18, w: 1.55, h: 0.2, fontFace: F.mono, fontSize: 5.2, color: C.muted2 });

  s.addShape(pptx.ShapeType.line, { x: bx + 0.2, y: by + 1.94, w: 6.0, h: 0, line: { color: C.line, width: 0.8 } });
  s.addText("THE REHEARSAL GAP", { x: bx + 1.8, y: by + 1.98, w: 2.9, h: 0.2, fontFace: F.mono, fontSize: 5.8, color: C.muted2, charSpacing: 1.4, align: "center" });
}

// ---------------------------------------------------------------------------
// 03 INSIGHT
// ---------------------------------------------------------------------------
n = 3;
{
  const s = base("02 — Insight", "The insight");
  eyebrow(s, M, 0.92, "02", "The insight");
  title(s, [{ text: "Confidence is built in the muscle,", options: { color: C.ink } }, { text: "not in the margin.", options: { color: C.violet2 } }], M, 1.24, 9.2, 26);
  para(s, "People do not learn risk from a definition. They learn it from a drawdown they survive.", 9.55, 1.28, 3.1, 0.7, 8, C.muted);

  card(s, M, 2.9, 6.2, 2.05, "0A1019", C.line);
  s.addText("“", { x: M + 0.24, y: 2.82, w: 0.6, h: 0.6, fontFace: F.display, fontSize: 38, bold: true, color: C.green });
  s.addText([
    { text: "Every investor pays for experience.\n", options: { color: C.ink2 } },
    { text: "We make the first tuition cheap.", options: { color: C.green2 } },
  ], { x: M + 0.66, y: 3.12, w: 5.2, h: 1.2, fontFace: F.display, fontSize: 19, bold: true, charSpacing: -0.5, lineSpacingMultiple: 1.15, valign: "middle" });
  para(s, "The product is not a course with a chart bolted on. It is a market simulator wrapped in curriculum, identity verification and guardian consent — built for the exact moment a student presses Buy.", M + 0.66, 4.22, 4.95, 0.66, 7.6, C.muted, 1.25);

  const kpis = [["0", "REAL RUPEES AT RISK"], ["100%", "ACTIONS JOURNALED"], ["1", "REPORT PARENTS TRUST"]];
  kpis.forEach(([b, l], i) => {
    s.addText(b, { x: M + i * 2.05, y: 5.28, w: 1.6, h: 0.45, fontFace: F.display, fontSize: 22, bold: true, color: C.ink, charSpacing: -0.8 });
    s.addText(l, { x: M + i * 2.05, y: 5.74, w: 1.8, h: 0.2, fontFace: F.mono, fontSize: 5.4, color: C.muted2, charSpacing: 0.8 });
  });

  // loop
  const lx = 7.55, ly = 3.35;
  s.addShape(pptx.ShapeType.ellipse, { x: lx + 0.94, y: ly, w: 2.9, h: 2.9, fill: { color: C.panel }, line: { color: C.line, width: 0.8 } });
  s.addShape(pptx.ShapeType.ellipse, { x: lx + 1.44, y: ly + 0.5, w: 1.9, h: 1.9, fill: { color: C.green, transparency: 93 }, line: { color: C.green, width: 0.7, transparency: 60 } });
  s.addText("PRACTISE", { x: lx + 1.72, y: ly + 1.19, w: 1.35, h: 0.2, fontFace: F.mono, fontSize: 6, color: C.green2, charSpacing: 1.4, align: "center" });
  s.addText("the loop", { x: lx + 1.72, y: ly + 1.4, w: 1.35, h: 0.28, fontFace: F.display, fontSize: 11, bold: true, color: C.ink, align: "center" });

  const loop = [
    ["READ", "Markets & risk", lx + 0.82, ly - 0.28],
    ["REACT", "Trade with friction", lx + 3.66, ly + 0.98],
    ["REFLECT", "See the behaviour", lx + 0.82, ly + 2.68],
    ["REPEAT", "Without the loss", lx - 1.12, ly + 0.98],
  ];
  loop.forEach(([k, v, x, y], i) => {
    card(s, x, y, 2.0, 0.72, "0C131E", C.line);
    s.addText(k, { x: x + 0.16, y: y + 0.1, w: 1.7, h: 0.2, fontFace: F.mono, fontSize: 5.8, color: C.green2, charSpacing: 1.3 });
    s.addText(v, { x: x + 0.16, y: y + 0.34, w: 1.7, h: 0.24, fontFace: F.body, fontSize: 7.4, color: C.muted });
  });
  s.addShape(pptx.ShapeType.line, { x: lx + 2.82, y: ly + 0.62, w: 0.7, h: 0.34, line: { color: C.line, width: 0.8, transparency: 30 } });
}

// ---------------------------------------------------------------------------
// 04 PRODUCT
// ---------------------------------------------------------------------------
n = 4;
{
  const s = base("03 — Product", "The product");
  eyebrow(s, M, 0.92, "03", "The product");
  title(s, [{ text: "A markets lab with real friction", options: { color: C.ink } }, { text: "and zero real money.", options: { color: C.green } }], M, 1.24, 9, 26);
  para(s, "One system: live simulation, structured learning, verified identity, institutional oversight.", 9.55, 1.28, 3.1, 0.7, 8, C.muted);

  const feats = [
    ["IN", "India + US", "Switch markets in one click. 31 instruments across stocks, ETFs, funds, crypto and insurance."],
    ["↯", "Real friction", "Spreads, fees, slippage and a live engine. Every trade has a cost — like the real thing."],
    ["◎", "Behavioural index", "Discipline, patience, risk control and diversification measured from real decisions."],
    ["⌂", "Institution console", "Classrooms, join codes, cohort analytics, competitions and an admin publishing gate."],
    ["⬡", "Verified humans", "ID document checks and guardian consent before simulated capital is committed."],
    ["◈", "Credits, not cash", "A shop where earned credits unlock trading capital. No deposits or withdrawals."],
    ["↗", "Reports that travel", "Portfolio, analysis and behavioural report as CSV, print-ready HTML or JSON."],
    ["▤", "Curriculum included", "8 modules from first principles to algorithmic thinking, with admin-only publishing."],
  ];
  feats.forEach(([ico, h, p], i) => {
    const x = M + (i % 4) * 3.05, y = 2.86 + Math.floor(i / 4) * 1.78;
    card(s, x, y, 2.88, 1.62);
    s.addShape(pptx.ShapeType.roundRect, { x: x + 0.2, y: y + 0.18, w: 0.38, h: 0.38, rectRadius: 0.06, fill: { color: C.green, transparency: 92 }, line: { color: C.green, width: 0.7, transparency: 62 } });
    s.addText(ico, { x: x + 0.2, y: y + 0.18, w: 0.38, h: 0.38, fontFace: F.mono, fontSize: 9, color: C.green2, align: "center", valign: "middle" });
    s.addText(h, { x: x + 0.2, y: y + 0.66, w: 2.5, h: 0.24, fontFace: F.display, fontSize: 10.5, bold: true, color: C.ink });
    para(s, p, x + 0.2, y + 0.92, 2.48, 0.6, 6.5, C.muted, 1.2);
  });

  card(s, M, 6.42, 12.09, 0.64, "131009", "3D2C18");
  s.addText("STARTING POINT", { x: M + 0.24, y: 6.42, w: 1.5, h: 0.64, fontFace: F.mono, fontSize: 6, color: C.amber, charSpacing: 1.2, valign: "middle" });
  s.addText("Every student begins at zero invested — ₹1,00,000 or $10,000 in simulated capital, not a fake winning portfolio.", { x: M + 1.55, y: 6.42, w: 10.2, h: 0.64, fontFace: F.body, fontSize: 8.2, color: C.ink2, valign: "middle" });
}

// ---------------------------------------------------------------------------
// 05 INTERFACE
// ---------------------------------------------------------------------------
n = 5;
{
  const s = base("04 — Interface", "Product interface");
  eyebrow(s, M, 0.92, "04", "Product interface");
  title(s, [{ text: "Built to feel like a terminal.", options: { color: C.ink } }, { text: "Designed to teach.", options: { color: C.green } }], M, 1.24, 8.4, 26);
  para(s, "The same surface for trading, learning and reporting. No mode switching, no dead ends.", 9.55, 1.28, 3.1, 0.7, 8, C.muted);

  // tape
  card(s, M, 2.72, 6.0, 3.72, "0A1019", C.line);
  label(s, "Live market · India", M + 0.24, 2.88, 2.4, C.muted2, 6);
  pill(s, 5.45, 2.86, "ENGINE ONLINE", C.green, 1.15);
  const rows = [["RELIANCE", "Energy · IN", "NSE", "₹2,941.20", false], ["TCS", "Technology · IN", "NSE", "₹4,112.55", false], ["HDFCBANK", "Financials · IN", "NSE", "₹1,684.10", false], ["AAPL", "Technology · US", "NASDAQ", "$232.40", true], ["NVDA", "Technology · US", "NASDAQ", "$138.90", true], ["BTC", "Crypto · Global", "24/7", "$67,240", false]];
  rows.forEach(([sym, sub, ex, px, us], i) => {
    const y = 3.2 + i * 0.44;
    s.addShape(pptx.ShapeType.rect, { x: M + 0.24, y, w: 5.52, h: 0.008, fill: { color: "141D2A" }, line: { width: 0 } });
    s.addText(sym, { x: M + 0.24, y: y + 0.05, w: 1.5, h: 0.19, fontFace: F.mono, fontSize: 7, bold: true, color: C.ink2 });
    s.addText(sub, { x: M + 0.24, y: y + 0.23, w: 1.8, h: 0.16, fontFace: F.mono, fontSize: 5.2, color: C.muted2 });
    s.addText(ex, { x: M + 3.45, y: y + 0.08, w: 0.8, h: 0.2, fontFace: F.mono, fontSize: 5.6, color: C.muted2 });
    s.addText(px, { x: M + 4.2, y: y + 0.08, w: 1.2, h: 0.2, fontFace: F.mono, fontSize: 7, color: C.ink, align: "right" });
    s.addText(us ? "US" : "IN", { x: M + 5.36, y: y + 0.08, w: 0.44, h: 0.2, fontFace: F.mono, fontSize: 5.2, color: us ? C.violet2 : C.green2, align: "right" });
  });
  s.addShape(pptx.ShapeType.rect, { x: M + 0.24, y: 5.82, w: 5.52, h: 0.008, fill: { color: C.line }, line: { width: 0 } });
  pill(s, M + 0.24, 5.95, "6 SHARES", C.muted, 0.9);
  pill(s, M + 1.2, 5.95, "₹17,647", C.muted, 0.95);
  s.addShape(pptx.ShapeType.roundRect, { x: M + 2.22, y: 5.95, w: 0.9, h: 0.26, rectRadius: 0.13, fill: { color: C.green }, line: { color: C.green } });
  s.addText("BUY", { x: M + 2.22, y: 5.95, w: 0.9, h: 0.26, fontFace: F.mono, fontSize: 6.4, bold: true, color: "04120C", align: "center", valign: "middle" });
  s.addText("Order ticket · market · delivery", { x: M + 3.2, y: 5.95, w: 2.5, h: 0.26, fontFace: F.mono, fontSize: 5.6, color: C.muted2, align: "right", valign: "middle" });

  // right report
  card(s, 6.95, 2.72, 5.76, 2.5, "0B111B", C.line);
  label(s, "Behavioural report · live", 7.18, 2.88, 2.4, C.muted2, 6);
  s.addText("82", { x: 7.16, y: 3.08, w: 1.1, h: 0.52, fontFace: F.display, fontSize: 30, bold: true, color: C.ink, charSpacing: -1.4 });
  s.addText("/ 100", { x: 8.0, y: 3.28, w: 0.8, h: 0.24, fontFace: F.mono, fontSize: 8, color: C.muted });
  pill(s, 11.28, 3.1, "COVERAGE 74%", C.green, 1.2);
  para(s, "Weighted across available behaviour signals, with coverage stated.", 7.18, 3.66, 4.9, 0.3, 6.8, C.muted, 1.2);
  const bars = [["Discipline", 88], ["Patience", 76], ["Risk control", 81], ["Diversification", 69]];
  bars.forEach(([k, v], i) => {
    const y = 4.06 + i * 0.26;
    s.addText(k, { x: 7.18, y: y - 0.02, w: 1.2, h: 0.18, fontFace: F.mono, fontSize: 5.8, color: C.muted, charSpacing: 0.5 });
    s.addShape(pptx.ShapeType.roundRect, { x: 8.44, y: y + 0.03, w: 2.85, h: 0.08, rectRadius: 0.04, fill: { color: "18212E" }, line: { width: 0 } });
    s.addShape(pptx.ShapeType.roundRect, { x: 8.44, y: y + 0.03, w: 2.85 * v / 100, h: 0.08, rectRadius: 0.04, fill: { color: i === 3 ? C.violet : C.green }, line: { width: 0 } });
    s.addText(String(v), { x: 11.36, y: y - 0.02, w: 0.4, h: 0.18, fontFace: F.mono, fontSize: 6.4, color: C.ink2, align: "right" });
  });

  card(s, 6.95, 5.38, 2.78, 1.06);
  label(s, "Classroom", 7.15, 5.52, 1.5, C.muted2, 5.6);
  s.addText("Class 11A", { x: 7.15, y: 5.7, w: 2.4, h: 0.3, fontFace: F.display, fontSize: 14, bold: true, color: C.ink });
  s.addText("28 students · 1 competition live", { x: 7.15, y: 6.02, w: 2.4, h: 0.2, fontFace: F.mono, fontSize: 5.4, color: C.muted2 });
  card(s, 9.93, 5.38, 2.78, 1.06);
  label(s, "Guardian", 10.13, 5.52, 1.5, C.muted2, 5.6);
  s.addText("Approved", { x: 10.13, y: 5.7, w: 2.4, h: 0.3, fontFace: F.display, fontSize: 14, bold: true, color: C.green2 });
  s.addText("Consent signed via secure link", { x: 10.13, y: 6.02, w: 2.4, h: 0.2, fontFace: F.mono, fontSize: 5.4, color: C.muted2 });
}

// ---------------------------------------------------------------------------
// 06 JOURNEY
// ---------------------------------------------------------------------------
n = 6;
{
  const s = base("05 — Journey", "The journey");
  eyebrow(s, M, 0.92, "05", "The journey");
  title(s, [{ text: "From sign-up to a report", options: { color: C.ink } }, { text: "a parent can read.", options: { color: C.green } }], M, 1.24, 8.4, 26);
  para(s, "Verification is required only when a student commits capital. Opening the app stays frictionless.", 9.55, 1.28, 3.1, 0.7, 8, C.muted);

  const steps = [
    ["01", "Sign in", "Email, password or Google. Session only — every visit starts with a real sign-in.", "NO SILENT AUTO-LOGIN"],
    ["02", "Verify", "Name and address must match a readable document. The image is deleted after checking.", "ONLY BEFORE CAPITAL"],
    ["03", "Start clean", "Zero invested. ₹1,00,000 or $10,000 simulated. Every position must be earned.", "NO FAKE PORTFOLIO"],
    ["04", "Trade & learn", "Buy across five asset classes, complete modules, join classroom competitions.", "LIVE ENGINE"],
    ["05", "Reflect", "Export the behavioural index, portfolio analysis and decision history.", "CSV · HTML · JSON"],
  ];
  s.addShape(pptx.ShapeType.line, { x: M + 0.35, y: 3.16, w: 11.3, h: 0, line: { color: C.line, width: 0.9 } });
  steps.forEach(([num, h, p, tag], i) => {
    const x = M + i * 2.42;
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.14, y: 2.97, w: 0.38, h: 0.38, fill: { color: "08120F" }, line: { color: C.green, width: 0.9 } });
    s.addText(num, { x: x + 0.14, y: 2.97, w: 0.38, h: 0.38, fontFace: F.mono, fontSize: 7, color: C.green2, align: "center", valign: "middle" });
    s.addText(h, { x, y: 3.54, w: 2.2, h: 0.28, fontFace: F.display, fontSize: 12, bold: true, color: C.ink });
    para(s, p, x, 3.88, 2.12, 0.94, 7.4, C.muted, 1.3);
    s.addText(tag, { x, y: 4.95, w: 2.1, h: 0.2, fontFace: F.mono, fontSize: 5.2, color: C.muted2, charSpacing: 0.8 });
  });

  card(s, M, 5.5, 5.95, 0.82, "131009", "3D2C18");
  s.addText("GUARDIAN GATE", { x: M + 0.22, y: 5.5, w: 1.4, h: 0.82, fontFace: F.mono, fontSize: 5.9, color: C.amber, charSpacing: 1.1, valign: "middle" });
  s.addText("A shareable consent link lets a guardian approve asynchronously — a logged decision, not a checkbox.", { x: M + 1.55, y: 5.5, w: 4.2, h: 0.82, fontFace: F.body, fontSize: 7.4, color: C.ink2, valign: "middle" });

  card(s, 6.76, 5.5, 5.95, 0.82, "0F0C19", "30284A");
  s.addText("ADMIN GATE", { x: 6.98, y: 5.5, w: 1.4, h: 0.82, fontFace: F.mono, fontSize: 5.9, color: C.violet2, charSpacing: 1.1, valign: "middle" });
  s.addText("Video lessons and quizzes are published by the administrator only — students see what has been approved.", { x: 8.2, y: 5.5, w: 4.3, h: 0.82, fontFace: F.body, fontSize: 7.4, color: C.ink2, valign: "middle" });
}

// ---------------------------------------------------------------------------
// 07 TRUST
// ---------------------------------------------------------------------------
n = 7;
{
  const s = base("06 — Trust", "Trust layer");
  eyebrow(s, M, 0.92, "06", "Trust layer");
  title(s, [{ text: "Built for the person", options: { color: C.ink } }, { text: "who has to say yes.", options: { color: C.green } }], M, 1.24, 8.4, 26);
  para(s, "The parent, the teacher, the principal. Trust is the product moat — not a compliance page.", 9.55, 1.28, 3.1, 0.7, 8, C.muted);

  const items = [
    ["◉", "Real identity", "OCR reads the document. Name and address must match the account, with a document-number pattern and confidence threshold.", ["Image deleted after verification", "Hash, confidence and checks stored", "Reviewed reasons, never raw pixels"], "DOCUMENT VERIFICATION"],
    ["◇", "Guardian consent", "A secure, shareable link lets a guardian approve or decline. The student cannot self-approve, and a second decision is rejected.", ["Asynchronous approval", "Every decision logged", "Notifications on change"], "CONSENT INFRASTRUCTURE"],
    ["▣", "Institutional control", "Admin-granted access by email. Classroom data is scoped to its owner. Publishing is a deliberate admin action.", ["Role-checked APIs", "IDOR-guarded classroom views", "Admin-only content publishing"], "ACCESS & GOVERNANCE"],
  ];
  items.forEach(([ico, h, p, bullets, foot], i) => {
    const x = M + i * 4.08;
    card(s, x, 2.72, 3.88, 3.44);
    s.addShape(pptx.ShapeType.roundRect, { x: x + 0.26, y: 2.94, w: 0.5, h: 0.5, rectRadius: 0.09, fill: { color: C.green, transparency: 92 }, line: { color: C.green, width: 0.7, transparency: 60 } });
    s.addText(ico, { x: x + 0.26, y: 2.94, w: 0.5, h: 0.5, fontFace: F.mono, fontSize: 13, color: C.green2, align: "center", valign: "middle" });
    s.addText(h, { x: x + 0.26, y: 3.6, w: 3.3, h: 0.3, fontFace: F.display, fontSize: 14.5, bold: true, color: C.ink });
    para(s, p, x + 0.26, 3.96, 3.32, 0.9, 7.6, C.muted, 1.3);
    bullets.forEach((b, j) => {
      const y = 4.9 + j * 0.28;
      s.addText("✓", { x: x + 0.26, y, w: 0.16, h: 0.2, fontFace: F.body, fontSize: 7.5, color: C.green });
      s.addText(b, { x: x + 0.46, y, w: 3.1, h: 0.2, fontFace: F.mono, fontSize: 6.4, color: C.ink2 });
    });
    s.addShape(pptx.ShapeType.rect, { x: x + 0.26, y: 5.78, w: 3.36, h: 0.008, fill: { color: C.line }, line: { width: 0 } });
    s.addText(foot, { x: x + 0.26, y: 5.86, w: 3.3, h: 0.2, fontFace: F.mono, fontSize: 5.4, color: C.muted2, charSpacing: 1.2 });
  });

  card(s, M, 6.34, 12.09, 0.66, "131009", "3D2C18");
  s.addText("NO REAL MONEY", { x: M + 0.24, y: 6.34, w: 1.5, h: 0.66, fontFace: F.mono, fontSize: 6, color: C.amber, charSpacing: 1.2, valign: "middle" });
  s.addText("No deposits. No withdrawals. No brokerage integration. Credits buy simulated capital inside a closed loop.", { x: M + 1.55, y: 6.34, w: 10.2, h: 0.66, fontFace: F.body, fontSize: 8, color: C.ink2, valign: "middle" });
}

// ---------------------------------------------------------------------------
// 08 BEHAVIOURAL INDEX
// ---------------------------------------------------------------------------
n = 8;
{
  const s = base("07 — Behaviour", "Behavioural index");
  eyebrow(s, M, 0.92, "07", "The moat");
  title(s, [{ text: "We don't just track returns.", options: { color: C.ink } }, { text: "We track the investor.", options: { color: C.green } }], M, 1.24, 8.4, 26);
  para(s, "Returns can be luck. Behaviour is a signal — and it compounds across every decision a student makes.", 9.55, 1.28, 3.1, 0.7, 8, C.muted);

  s.addChart(pptx.ChartType.doughnut, [{ name: "Score", labels: ["Score", "Remaining"], values: [82, 18] }], {
    x: M + 0.1, y: 2.62, w: 3.85, h: 3.6,
    holeSize: 72,
    chartColors: [C.green, "131C28"],
    showLegend: false, showValue: false, showTitle: false,
    dataBorder: { pt: 0, color: C.bg },
    plotArea: { fill: { color: "000000", transparency: 100 } },
    chartArea: { fill: { color: "000000", transparency: 100 } },
  });
  s.addText("82", { x: M + 1.08, y: 3.76, w: 1.9, h: 0.68, fontFace: F.display, fontSize: 40, bold: true, color: C.green2, align: "center", charSpacing: -1.8 });
  s.addText("BEHAVIOURAL INDEX", { x: M + 1.0, y: 4.5, w: 2.05, h: 0.2, fontFace: F.mono, fontSize: 5.8, color: C.muted, charSpacing: 1.3, align: "center" });

  const bars = [["Discipline", 88], ["Patience", 76], ["Risk control", 81], ["Diversification", 69], ["Learning", 90]];
  bars.forEach(([k, v], i) => {
    const y = 2.86 + i * 0.55;
    s.addText(k, { x: 5.15, y: y + 0.02, w: 1.5, h: 0.2, fontFace: F.mono, fontSize: 7, color: C.muted, charSpacing: 0.6 });
    s.addShape(pptx.ShapeType.roundRect, { x: 6.8, y: y + 0.07, w: 4.55, h: 0.11, rectRadius: 0.05, fill: { color: "18212E" }, line: { width: 0 } });
    s.addShape(pptx.ShapeType.roundRect, { x: 6.8, y: y + 0.07, w: 4.55 * v / 100, h: 0.11, rectRadius: 0.05, fill: { color: i === 4 ? C.violet : C.green }, line: { width: 0 } });
    s.addText(String(v), { x: 11.46, y: y + 0.02, w: 0.55, h: 0.2, fontFace: F.mono, fontSize: 7.4, color: C.ink2, align: "right" });
  });
  para(s, "The overall score is a weighted average over only the components the student has actually exercised. Coverage is shown, never hidden. No activity, no score.", 5.15, 5.72, 6.85, 0.6, 8, C.muted, 1.25);
  let px = 5.15;
  ["CSV", "PRINT-READY HTML", "JSON", "PER-SYMBOL FOCUS"].forEach((t, i) => {
    const w = pill(s, px, 6.37, t, i === 1 ? C.muted : i === 2 ? C.violet : C.green, t.length * 0.07 + 0.34);
    px += w + 0.12;
  });
}

// ---------------------------------------------------------------------------
// 09 INSTITUTION
// ---------------------------------------------------------------------------
n = 9;
{
  const s = base("08 — Institution", "Institution console");
  eyebrow(s, M, 0.92, "08", "The institution");
  title(s, [{ text: "One console for the classroom,", options: { color: C.ink } }, { text: "the cohort and the competition.", options: { color: C.green } }], M, 1.24, 9, 26);
  para(s, "Access is granted per account by the administrator. Students join with a code. Teachers see real activity, not estimates.", 9.55, 1.28, 3.1, 0.8, 8, C.muted);

  card(s, M, 2.7, 5.95, 2.22);
  label(s, "Cohort analytics", M + 0.24, 2.86, 2.0, C.muted2, 6);
  pill(s, 5.4, 2.84, "LIVE", C.green, 0.7);
  const ks = [["28", "STUDENTS"], ["74%", "ACTIVE THIS WEEK"], ["81", "AVG. BEHAVIOUR"]];
  ks.forEach(([v, k], i) => {
    s.addText(v, { x: M + 0.24 + i * 1.85, y: 3.12, w: 1.5, h: 0.42, fontFace: F.display, fontSize: 20, bold: true, color: i === 2 ? C.green2 : C.ink, charSpacing: -0.8 });
    s.addText(k, { x: M + 0.24 + i * 1.85, y: 3.54, w: 1.65, h: 0.18, fontFace: F.mono, fontSize: 5.2, color: C.muted2, charSpacing: 0.8 });
  });
  const cbars = [["Discipline", 84, C.green], ["Diversification", 62, C.violet], ["Learning", 91, C.green]];
  cbars.forEach(([k, v, col], i) => {
    const y = 3.9 + i * 0.31;
    s.addText(k, { x: M + 0.24, y, w: 1.35, h: 0.2, fontFace: F.mono, fontSize: 5.8, color: C.muted });
    s.addShape(pptx.ShapeType.roundRect, { x: M + 1.65, y: y + 0.06, w: 3.55, h: 0.09, rectRadius: 0.04, fill: { color: "18212E" }, line: { width: 0 } });
    s.addShape(pptx.ShapeType.roundRect, { x: M + 1.65, y: y + 0.06, w: 3.55 * v / 100, h: 0.09, rectRadius: 0.04, fill: { color: col }, line: { width: 0 } });
    s.addText(String(v), { x: M + 5.25, y, w: 0.4, h: 0.2, fontFace: F.mono, fontSize: 6.4, color: C.ink2, align: "right" });
  });

  card(s, M, 5.08, 5.95, 0.8);
  label(s, "Classroom · join code", M + 0.24, 5.16, 2.2, C.muted2, 5.6);
  s.addText("WHHKE2", { x: M + 0.24, y: 5.36, w: 2.4, h: 0.36, fontFace: F.mono, fontSize: 19, bold: true, color: C.green2, charSpacing: 3.2 });
  s.addText("Class 11A · 28 seats", { x: M + 3.6, y: 5.36, w: 2.1, h: 0.36, fontFace: F.mono, fontSize: 6.6, color: C.muted, align: "right", valign: "middle" });

  card(s, M, 6.02, 5.95, 0.82, "081310", "1F4A3B");
  s.addText("PRICING", { x: M + 0.22, y: 6.02, w: 1.0, h: 0.82, fontFace: F.mono, fontSize: 5.9, color: C.green, charSpacing: 1.2, valign: "middle" });
  s.addText("₹2,499 / month per institution  ·  ₹599 / month per educator. All console features included.", { x: M + 1.15, y: 6.02, w: 4.6, h: 0.82, fontFace: F.body, fontSize: 7.2, color: C.ink2, valign: "middle" });

  // console table card
  card(s, 6.85, 2.7, 5.86, 3.72);
  label(s, "Classroom console", 7.09, 2.86, 2.2, C.muted2, 6);
  pill(s, 11.42, 2.84, "ADMIN GRANTED", C.violet, 1.12);
  const heads = ["STUDENT", "INDEX", "STATUS"];
  const hx = [7.09, 9.62, 10.82];
  heads.forEach((h, i) => s.addText(h, { x: hx[i], y: 3.18, w: i === 0 ? 2.4 : 1.1, h: 0.18, fontFace: F.mono, fontSize: 5.2, color: C.muted2, charSpacing: 1.1, align: i === 2 ? "right" : "left" }));
  s.addShape(pptx.ShapeType.rect, { x: 7.09, y: 3.42, w: 5.38, h: 0.008, fill: { color: C.line }, line: { width: 0 } });
  const studs = [["Aarav S.", "86", "Active"], ["Diya M.", "81", "Active"], ["Kabir R.", "77", "Active"], ["Meera T.", "73", "Review"], ["Rohan V.", "69", "New"]];
  studs.forEach(([name, score, st], i) => {
    const y = 3.56 + i * 0.42;
    s.addText(name, { x: 7.09, y, w: 2.3, h: 0.2, fontFace: F.body, fontSize: 8.2, color: C.ink2 });
    s.addText("Class 11A", { x: 7.09, y: y + 0.17, w: 1.6, h: 0.16, fontFace: F.mono, fontSize: 5, color: C.muted2 });
    s.addText(score, { x: 9.62, y, w: 0.7, h: 0.2, fontFace: F.mono, fontSize: 7.4, color: C.ink });
    s.addText(st.toUpperCase(), { x: 10.82, y, w: 1.65, h: 0.2, fontFace: F.mono, fontSize: 5.6, color: st === "Active" ? C.green : C.muted2, align: "right" });
    s.addShape(pptx.ShapeType.rect, { x: 7.09, y: y + 0.34, w: 5.38, h: 0.006, fill: { color: "141D2A" }, line: { width: 0 } });
  });
  let qx = 7.09;
  ["CREATE CLASSROOM", "ADD STUDENT", "START COMPETITION", "EXPORT COHORT"].forEach((t, i) => {
    const w = pill(s, qx, 5.9, t, i === 3 ? C.green : C.muted, t.length * 0.052 + 0.28);
    qx += w + 0.1;
  });
  card(s, 6.85, 6.56, 2.86, 0.5);
  s.addText("Competitions · snapshotted, no overlap", { x: 7.02, y: 6.56, w: 2.55, h: 0.5, fontFace: F.mono, fontSize: 5.3, color: C.muted, valign: "middle" });
  card(s, 9.85, 6.56, 2.86, 0.5);
  s.addText("Support inbox · routed to admin", { x: 10.02, y: 6.56, w: 2.55, h: 0.5, fontFace: F.mono, fontSize: 5.3, color: C.muted, valign: "middle" });
}

// ---------------------------------------------------------------------------
// 10 MARKET
// ---------------------------------------------------------------------------
n = 10;
{
  const s = base("09 — Market", "Why now");
  eyebrow(s, M, 0.92, "09", "Why now");
  title(s, [{ text: "Financial literacy is becoming", options: { color: C.ink } }, { text: "a required subject.", options: { color: C.green } }], M, 1.24, 8.6, 26);
  para(s, "Curriculum mandates create budget. Budget creates a buyer. The buyer needs evidence.", 9.55, 1.28, 3.1, 0.7, 8, C.muted);

  para(s, "India's NEP 2020 pushed financial literacy into the school conversation. In the US, a growing majority of states now require a standalone personal finance course before graduation.", M, 2.86, 5.8, 0.98, 10, C.ink2, 1.4);

  const st = [["250M", "K-12 students in India"], ["25", "US states with a personal finance requirement"], ["2", "markets, one account — India & US"]];
  st.forEach(([v, k], i) => {
    const x = M + i * 2.02;
    card(s, x, 4.02, 1.9, 1.34);
    s.addText(v, { x: x + 0.18, y: 4.14, w: 1.55, h: 0.44, fontFace: F.display, fontSize: 19, bold: true, color: i === 0 ? C.ink : i === 1 ? C.green2 : C.ink, charSpacing: -0.8 });
    para(s, k, x + 0.18, 4.62, 1.55, 0.6, 6.4, C.muted, 1.2);
  });
  s.addText("Sources: S&P Global FinLit Survey; NEP 2020; Next Gen Personal Finance policy tracking, 2024. Counts directional, not forecasts.", { x: M, y: 5.54, w: 5.9, h: 0.34, fontFace: F.mono, fontSize: 5.4, color: C.muted2, lineSpacingMultiple: 1.2 });

  // right bars
  const bx = 6.85;
  label(s, "Bottom-up revenue illustration · annualised", bx, 2.78, 4.8, C.muted2, 6);
  const hb = [
    ["500 institutions · ₹2,499/mo", "₹1.50 Cr", 42, C.green],
    ["5,000 educators · ₹599/mo", "₹3.59 Cr", 100, C.violet],
    ["Illustrative blended ARR", "₹5.09 Cr", 100, C.cyan],
  ];
  hb.forEach(([k, v, pct, col], i) => {
    const y = 3.06 + i * 0.72;
    s.addText(k, { x: bx, y, w: 3.5, h: 0.18, fontFace: F.mono, fontSize: 6.2, color: C.muted });
    s.addText(v, { x: bx + 3.9, y: y - 0.03, w: 2.0, h: 0.22, fontFace: F.display, fontSize: 10, bold: true, color: C.ink, align: "right" });
    s.addShape(pptx.ShapeType.rect, { x: bx, y: y + 0.24, w: 5.88, h: 0.2, fill: { color: "0D1520" }, line: { color: C.line, width: 0.6 } });
    s.addShape(pptx.ShapeType.rect, { x: bx, y: y + 0.24, w: Math.max(0.5, 5.88 * pct / 100), h: 0.2, fill: { color: col, transparency: 45 }, line: { color: col, width: 0.6, transparency: 45 } });
  });

  card(s, bx, 5.42, 5.88, 1.08);
  label(s, "The wedge", bx + 0.22, 5.54, 1.5, C.muted2, 5.6);
  para(s, "Start with one teacher and one classroom. Prove engagement and behaviour change. Expand to the department, then the school, then the district — without changing the product.", bx + 0.22, 5.74, 5.4, 0.66, 7.3, C.ink2, 1.3);
}

// ---------------------------------------------------------------------------
// 11 BUSINESS MODEL
// ---------------------------------------------------------------------------
n = 11;
{
  const s = base("10 — Model", "Business model");
  eyebrow(s, M, 0.92, "10", "Business model");
  title(s, [{ text: "Simple pricing.", options: { color: C.ink } }, { text: "Recurring revenue.", options: { color: C.green } }], M, 1.24, 8.4, 26);
  para(s, "Sold to institutions, not to students. The learner never pays to practise.", 9.55, 1.28, 3.1, 0.7, 8, C.muted);

  const plans = [
    ["INSTITUTION", "₹2,499", "/ month", "For schools, colleges and coaching cohorts. Every console feature included.", ["Unlimited classrooms and join codes", "Cohort analytics and behavioural index", "Competitions with snapshotted starts", "Guardian consent tracking", "Admin-granted educator seats"], true],
    ["EDUCATOR", "₹599", "/ month", "For one teacher running one or more classes without a school-wide rollout.", ["One educator account", "Classroom creation and student joins", "Assign modules and track progress", "Export reports for parents", "Upgrade path to institution"], false],
  ];
  plans.forEach(([tag, amt, per, copy, feats, hot], i) => {
    const x = M + i * 6.15;
    card(s, x, 2.66, 5.94, 3.42, hot ? "0B1714" : C.panel, hot ? "275B49" : C.line);
    pill(s, x + 0.26, 2.84, tag, hot ? C.green : C.violet, 1.25);
    if (hot) s.addText("MOST POPULAR", { x: x + 4.15, y: 2.84, w: 1.5, h: 0.26, fontFace: F.mono, fontSize: 5.4, color: C.muted2, charSpacing: 1.1, align: "right" });
    s.addText(amt, { x: x + 0.24, y: 3.16, w: 2.2, h: 0.62, fontFace: F.display, fontSize: 32, bold: true, color: C.ink, charSpacing: -1.5 });
    s.addText(per, { x: x + 2.05, y: 3.44, w: 1.0, h: 0.24, fontFace: F.body, fontSize: 8.5, color: C.muted });
    para(s, copy, x + 0.26, 3.88, 5.3, 0.5, 7.6, C.muted, 1.25);
    feats.forEach((f, j) => {
      const y = 4.5 + j * 0.29;
      s.addText("→", { x: x + 0.26, y, w: 0.18, h: 0.2, fontFace: F.mono, fontSize: 6.6, color: C.green });
      s.addText(f, { x: x + 0.5, y, w: 5.0, h: 0.2, fontFace: F.body, fontSize: 7.4, color: C.ink2 });
    });
  });

  const econ = [["MONTHLY", "No annual lock-in"], ["SEAT EXPANSION", "Revenue grows with adoption"], ["ZERO REAL MONEY", "No deposits or payouts"]];
  econ.forEach(([b, k], i) => {
    const x = M + i * 4.08;
    card(s, x, 6.22, 3.88, 0.62);
    s.addText(b, { x: x + 0.18, y: 6.22, w: 1.8, h: 0.62, fontFace: F.mono, fontSize: 5.8, color: C.green2, charSpacing: 0.8, valign: "middle" });
    s.addText(k, { x: x + 1.55, y: 6.22, w: 2.15, h: 0.62, fontFace: F.body, fontSize: 6.8, color: C.muted, valign: "middle" });
  });
  s.addText("Target unit economics, to be validated in pilot: CAC ₹8,000–₹12,000 per institution; payback under 5 months at ₹2,499/month. Credit packs are in-app currency, not revenue.", { x: M, y: 7.0, w: 12.0, h: 0.22, fontFace: F.mono, fontSize: 5.3, color: C.muted2 });
}

// ---------------------------------------------------------------------------
// 12 GO-TO-MARKET
// ---------------------------------------------------------------------------
n = 12;
{
  const s = base("11 — GTM", "Go-to-market");
  eyebrow(s, M, 0.92, "11", "Go-to-market");
  title(s, [{ text: "Land with a teacher.", options: { color: C.ink } }, { text: "Expand with evidence.", options: { color: C.green } }], M, 1.24, 8.4, 26);
  para(s, "Education sells slowly at the top and quickly at the bottom. We start where the pain is visible.", 9.55, 1.28, 3.1, 0.7, 8, C.muted);

  const phases = [
    ["01 · LAND", "Teacher-led pilot", "A 30-day classroom pilot with a join code, real student activity and a parent-ready report. No procurement required.", ["Teacher communities & subject groups", "Direct outreach to senior-secondary schools", "Free competition as the demo"], C.green],
    ["02 · EXPAND", "Department to district", "One teacher becomes the internal champion. Cohort analytics make the case to the head of department and then the principal.", ["Educator to institution upgrade", "Cross-class competitions", "District-level reporting"], C.violet],
    ["03 · COMPOUND", "Trust as distribution", "Guardian reports and verified identity make the product referable inside a school network — a channel competitors cannot copy quickly.", ["Parent word-of-mouth", "School network referrals", "Certification & showcase events"], C.amber],
  ];
  phases.forEach(([tag, h, p, items, col], i) => {
    const x = M + i * 4.08;
    card(s, x, 2.78, 3.88, 3.32);
    pill(s, x + 0.26, 2.96, tag, col, 1.35);
    s.addText(h, { x: x + 0.26, y: 3.4, w: 3.3, h: 0.32, fontFace: F.display, fontSize: 14, bold: true, color: C.ink });
    para(s, p, x + 0.26, 3.8, 3.3, 0.94, 7.6, C.muted, 1.3);
    items.forEach((t, j) => {
      const y = 4.9 + j * 0.32;
      s.addText("→", { x: x + 0.26, y, w: 0.18, h: 0.2, fontFace: F.mono, fontSize: 6.4, color: col });
      s.addText(t, { x: x + 0.5, y, w: 3.1, h: 0.2, fontFace: F.body, fontSize: 7.2, color: C.ink2 });
    });
  });
  card(s, M, 6.32, 12.09, 0.7, "081310", "1F4A3B");
  s.addText("DISTRIBUTION INSIGHT", { x: M + 0.24, y: 6.32, w: 1.9, h: 0.7, fontFace: F.mono, fontSize: 5.8, color: C.green, charSpacing: 1.1, valign: "middle" });
  s.addText("The buyer is an institution, but the champion is a teacher. Product-led pilots convert faster than top-down sales cycles.", { x: M + 2.1, y: 6.32, w: 9.6, h: 0.7, fontFace: F.body, fontSize: 8, color: C.ink2, valign: "middle" });
}

// ---------------------------------------------------------------------------
// 13 COMPETITION
// ---------------------------------------------------------------------------
n = 13;
{
  const s = base("12 — Competition", "Competition");
  eyebrow(s, M, 0.92, "12", "Competition");
  title(s, [{ text: "Everyone owns a slice.", options: { color: C.ink } }, { text: "Nobody owns the loop.", options: { color: C.green } }], M, 1.24, 8.4, 26);
  para(s, "Paper trading lacks pedagogy. Curriculum lacks a live market. Consumer fintech requires real money.", 9.55, 1.28, 3.1, 0.8, 8, C.muted);

  const header = ["CAPABILITY", "PAPER TRADING", "CONSUMER FINTECH", "CURRICULUM VENDORS", "MOCKTRADE MATRIX"];
  const data = [
    ["Live prices & order friction", "Yes", "Yes", "No", "Yes"],
    ["Structured curriculum", "No", "No", "Yes", "Yes"],
    ["Guardian consent & identity", "No", "Partial", "No", "Yes"],
    ["Behavioural analytics", "No", "No", "No", "Yes"],
    ["Classroom operations", "No", "No", "Yes", "Yes"],
    ["India + US in one account", "No", "No", "No", "Yes"],
    ["No real money at risk", "Yes", "No", "Yes", "Yes"],
  ];
  const rows = [header.map((h, i) => ({ text: h, options: { fill: { color: i === 4 ? "0C231B" : "0A1019" }, color: i === 4 ? C.green : C.muted2, bold: true, fontFace: F.mono, fontSize: 6, charSpacing: 0.8, align: i === 0 ? "left" : "center" } }))];
  data.forEach((r, ri) => {
    rows.push(r.map((cell, ci) => ({
      text: cell,
      options: {
        fill: { color: ci === 4 ? "0A1A15" : ri % 2 ? "080D15" : "0B111B" },
        color: ci === 0 ? C.ink2 : ci === 4 ? C.green2 : cell === "Yes" ? C.green : cell === "No" ? "3A4554" : C.amber,
        fontFace: ci === 0 ? F.body : F.mono,
        fontSize: ci === 0 ? 7.8 : 6.8,
        align: ci === 0 ? "left" : "center",
        valign: "middle",
        bold: ci === 4,
      },
    })));
  });
  s.addTable(rows, {
    x: M, y: 2.6, w: 12.09, colW: [4.19, 1.9, 2.0, 2.0, 2.0],
    rowH: 0.34, border: { type: "solid", color: "18212E", pt: 0.6 },
    margin: 0.07, autoPage: false,
  });
  card(s, M, 5.94, 3.88, 0.62); s.addText("vs. paper trading — a terminal without a teacher, a guardian or a report.", { x: M + 0.18, y: 5.94, w: 3.55, h: 0.62, fontFace: F.body, fontSize: 6.6, color: C.muted, valign: "middle" });
  card(s, M + 4.1, 5.94, 3.88, 0.62); s.addText("vs. consumer fintech — real money is the product. We remove it entirely.", { x: M + 4.28, y: 5.94, w: 3.55, h: 0.62, fontFace: F.body, fontSize: 6.6, color: C.muted, valign: "middle" });
  card(s, M + 8.2, 5.94, 3.88, 0.62); s.addText("vs. curriculum — theory without a market is a PDF with better branding.", { x: M + 8.38, y: 5.94, w: 3.55, h: 0.62, fontFace: F.body, fontSize: 6.6, color: C.muted, valign: "middle" });
}

// ---------------------------------------------------------------------------
// 14 TRACTION
// ---------------------------------------------------------------------------
n = 14;
{
  const s = base("13 — Traction", "Traction");
  eyebrow(s, M, 0.92, "13", "Traction");
  title(s, [{ text: "Shipped.", options: { color: C.ink } }, { text: "Not slideware.", options: { color: C.green } }], M, 1.24, 8.4, 26);
  para(s, "This deck describes a running product. Every claim below is a route, a table or a test — not a roadmap item.", 9.55, 1.28, 3.1, 0.8, 8, C.muted);

  const k = [["31", "LIVE INSTRUMENTS"], ["14", "PRODUCT ROUTES"], ["36", "QA CHECKS PASSED"]];
  k.forEach(([v, l], i) => {
    s.addText(v, { x: M + i * 1.85, y: 2.76, w: 1.6, h: 0.52, fontFace: F.display, fontSize: 28, bold: true, color: C.ink, charSpacing: -1.2 });
    s.addText(l, { x: M + i * 1.85, y: 3.28, w: 1.75, h: 0.2, fontFace: F.mono, fontSize: 5.4, color: C.muted2, charSpacing: 0.8 });
  });
  card(s, M, 3.72, 5.6, 0.9, "081310", "1F4A3B");
  s.addText("36/36", { x: M + 0.22, y: 3.72, w: 1.2, h: 0.9, fontFace: F.display, fontSize: 22, bold: true, color: C.green2, charSpacing: -0.8, valign: "middle" });
  s.addText("Institutional QA checks passed across grant/revoke, permissions, classroom flows, competitions, support and responsive layouts.", { x: M + 1.42, y: 3.72, w: 3.98, h: 0.9, fontFace: F.body, fontSize: 6.6, color: C.ink2, valign: "middle", lineSpacingMultiple: 1.25 });
  card(s, M, 4.8, 5.6, 0.86, "131009", "3D2C18");
  s.addText("LIVE", { x: M + 0.22, y: 4.8, w: 0.62, h: 0.86, fontFace: F.mono, fontSize: 6, color: C.amber, charSpacing: 1.1, valign: "middle" });
  s.addText("Running on a production build with a live market engine, Socket.IO updates and a persistent SQLite store.", { x: M + 0.92, y: 4.8, w: 4.5, h: 0.86, fontFace: F.body, fontSize: 6.8, color: C.ink2, valign: "middle", lineSpacingMultiple: 1.25 });
  s.addText("PRIVATE BETA · DESIGN PARTNERS", { x: M, y: 5.94, w: 5, h: 0.24, fontFace: F.mono, fontSize: 6, color: C.muted2, charSpacing: 1.6 });

  const checks = [
    "Email, password & Google sign-in", "Session-only login", "Real ID document verification", "Guardian consent links",
    "Live India + US engine", "Five asset classes", "Order fees, spreads & slippage", "Credits shop",
    "Portfolio & behaviour reports", "CSV / HTML / JSON export", "Institution console", "Classroom competitions",
    "Admin content publishing", "Admin grant / revoke by email", "Role-checked APIs (403)", "Docker + persistent volume",
  ];
  checks.forEach((c, i) => {
    const col = i < 8 ? 0 : 1, row = i % 8;
    const x = 6.62 + col * 3.02, y = 2.82 + row * 0.5;
    s.addText("✓", { x, y, w: 0.18, h: 0.2, fontFace: F.body, fontSize: 7.5, color: C.green });
    s.addText(c, { x: x + 0.22, y, w: 2.75, h: 0.2, fontFace: F.mono, fontSize: 6.3, color: C.ink2 });
  });
  s.addShape(pptx.ShapeType.rect, { x: 6.62, y: 6.86, w: 6.0, h: 0.01, fill: { color: C.line }, line: { width: 0 } });
}

// ---------------------------------------------------------------------------
// 15 ROADMAP
// ---------------------------------------------------------------------------
n = 15;
{
  const s = base("14 — Roadmap", "Roadmap");
  eyebrow(s, M, 0.92, "14", "Roadmap");
  title(s, [{ text: "From private beta", options: { color: C.ink } }, { text: "to standard issue.", options: { color: C.green } }], M, 1.24, 8.4, 26);
  para(s, "Sequenced around one metric: classrooms that renew because students actually use the product.", 9.55, 1.28, 3.1, 0.8, 8, C.muted);

  const phases = [
    ["NOW · Q1", "Private beta", "Convert design partners into paying pilots.", ["10 pilot classrooms", "Parent report feedback", "Teacher onboarding"], C.green],
    ["6 MONTHS", "Product depth", "Make the classroom indispensable.", ["Mobile PWA", "Teacher content tools", "3 Indian languages"], C.cyan],
    ["12 MONTHS", "Institutional scale", "Move from classrooms to networks.", ["District dashboards", "Certification pathway", "US school pilot"], C.violet],
    ["24 MONTHS", "Distribution", "Become infrastructure for others.", ["Partner API", "Curriculum marketplace", "Assessment licensing"], C.amber],
  ];
  s.addShape(pptx.ShapeType.line, { x: M, y: 3.12, w: 12.0, h: 0, line: { color: C.line, width: 1 } });
  phases.forEach(([when, h, p, items, col], i) => {
    const x = M + i * 3.04;
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.02, y: 3.03, w: 0.16, h: 0.16, fill: { color: C.bg }, line: { color: col, width: 1.2 } });
    s.addText(when, { x, y: 3.4, w: 2.7, h: 0.2, fontFace: F.mono, fontSize: 5.8, color: col, charSpacing: 1.3 });
    s.addText(h, { x, y: 3.68, w: 2.75, h: 0.28, fontFace: F.display, fontSize: 12.5, bold: true, color: C.ink });
    para(s, p, x, 4.0, 2.72, 0.5, 7.2, C.muted, 1.25);
    items.forEach((t, j) => {
      const y = 4.58 + j * 0.28;
      s.addText("›", { x, y, w: 0.14, h: 0.2, fontFace: F.mono, fontSize: 7.5, color: col });
      s.addText(t, { x: x + 0.16, y, w: 2.55, h: 0.2, fontFace: F.mono, fontSize: 6.2, color: C.ink2 });
    });
  });

  const cards = [["NORTH-STAR METRIC", "Weekly active classrooms", "A classroom counts only when students trade, learn and return."], ["EXPANSION SIGNAL", "Seats per institution", "Growth inside an account is cheaper than winning a new one."], ["RETENTION PROOF", "Renewal at month 6", "The only honest measure of whether the pilot worked."]];
  cards.forEach(([k, h, p], i) => {
    const x = M + i * 4.08;
    card(s, x, 5.62, 3.88, 1.06);
    label(s, k, x + 0.22, 5.72, 3.3, C.muted2, 5.4);
    s.addText(h, { x: x + 0.22, y: 5.94, w: 3.4, h: 0.24, fontFace: F.display, fontSize: 10.5, bold: true, color: C.ink });
    para(s, p, x + 0.22, 6.2, 3.45, 0.36, 6.2, C.muted, 1.2);
  });
}

// ---------------------------------------------------------------------------
// 16 ASK
// ---------------------------------------------------------------------------
n = 16;
{
  const s = base("15 — Ask", "Team & ask");
  eyebrow(s, M, 0.92, "15", "The ask");
  title(s, [{ text: "Fund the first", options: { color: C.ink } }, { text: "500 classrooms.", options: { color: C.green } }], M, 1.24, 8.4, 26);
  para(s, "A focused pre-seed to prove retention, not to build more surface area.", 9.55, 1.28, 3.1, 0.7, 8, C.muted);

  card(s, M, 2.72, 5.62, 2.52);
  label(s, "Founder", M + 0.26, 2.9, 2.0, C.muted2, 6);
  s.addShape(pptx.ShapeType.roundRect, { x: M + 0.26, y: 3.18, w: 0.78, h: 0.78, rectRadius: 0.14, fill: { color: "13241E" }, line: { color: "2A5C4A", width: 0.8 } });
  s.addText("PR", { x: M + 0.26, y: 3.18, w: 0.78, h: 0.78, fontFace: F.display, fontSize: 18, bold: true, color: C.green2, align: "center", valign: "middle" });
  s.addText("Pranav Ram", { x: M + 1.2, y: 3.22, w: 3.2, h: 0.28, fontFace: F.display, fontSize: 15, bold: true, color: C.ink });
  s.addText("FOUNDER & ENGINEER", { x: M + 1.2, y: 3.52, w: 3.4, h: 0.2, fontFace: F.mono, fontSize: 5.8, color: C.muted2, charSpacing: 1.1 });
  para(s, "Designed and built the full system end-to-end: market engine, identity verification, guardian consent, institutional console, reporting and deployment. The next hire is go-to-market, not another engineer.", M + 1.2, 3.78, 4.05, 0.92, 7.2, C.muted, 1.3);
  let px = M + 0.26;
  ["FULL-STACK", "PRODUCT", "DESIGN", "INFRA"].forEach((t, i) => {
    const w = pill(s, px, 4.82, t, i === 2 ? C.violet : C.green, t.length * 0.07 + 0.3);
    px += w + 0.1;
  });

  card(s, M, 5.44, 5.62, 0.86);
  label(s, "Hiring plan", M + 0.24, 5.54, 1.5, C.muted2, 5.4);
  s.addText("Curriculum lead (part-time) · institutional sales (full-time) · contract designer.", { x: M + 0.24, y: 5.76, w: 5.1, h: 0.42, fontFace: F.body, fontSize: 7.2, color: C.ink2, lineSpacingMultiple: 1.2 });

  // ask box
  card(s, 6.62, 2.62, 6.09, 3.68, "0A1713", "2A5C4A");
  label(s, "Pre-seed · 18-month runway", 6.9, 2.84, 3.2, C.muted2, 6);
  s.addText("₹3.5 Cr", { x: 6.88, y: 3.06, w: 2.9, h: 0.62, fontFace: F.display, fontSize: 32, bold: true, color: C.ink, charSpacing: -1.6 });
  s.addText("≈ $420K", { x: 9.55, y: 3.3, w: 1.3, h: 0.24, fontFace: F.mono, fontSize: 8, color: C.muted });
  para(s, "Priced round or safe. Milestones: 100 paying institutions, 25,000 activated students, ₹1.5 Cr ARR trajectory.", 6.9, 3.74, 5.5, 0.5, 7.8, C.ink2, 1.3);

  const alloc = [[40, C.green, 0], [35, C.violet, 3.88], [15, C.cyan, 7.3], [10, C.amber, 9.18]];
  let ax = 6.9;
  alloc.forEach(([pct, col]) => {
    const w = 5.52 * pct / 100;
    s.addShape(pptx.ShapeType.rect, { x: ax, y: 4.38, w, h: 0.12, fill: { color: col }, line: { width: 0 } });
    ax += w;
  });
  const leg = [["40%", "Engineering & product", C.green], ["35%", "Sales & marketing", C.violet], ["15%", "Curriculum & content", C.cyan], ["10%", "Operations & compliance", C.amber]];
  leg.forEach(([p, t, col], i) => {
    const x = 6.9 + (i % 2) * 2.78, y = 4.66 + Math.floor(i / 2) * 0.32;
    s.addShape(pptx.ShapeType.rect, { x, y: y + 0.07, w: 0.08, h: 0.08, fill: { color: col }, line: { width: 0 } });
    s.addText(p, { x: x + 0.15, y, w: 0.4, h: 0.2, fontFace: F.mono, fontSize: 6.4, color: C.ink2 });
    s.addText(t, { x: x + 0.55, y, w: 2.2, h: 0.2, fontFace: F.mono, fontSize: 6.0, color: C.muted });
  });

  s.addShape(pptx.ShapeType.rect, { x: 6.9, y: 5.36, w: 5.52, h: 0.008, fill: { color: C.line }, line: { width: 0 } });
  label(s, "What ₹3.5 Cr buys", 6.9, 5.48, 2.4, C.muted2, 5.4);
  s.addText("100 institutions · 25k students · 18 months", { x: 6.9, y: 5.7, w: 5.4, h: 0.26, fontFace: F.mono, fontSize: 7.2, color: C.green2, charSpacing: 0.6 });
  s.addText("The plan is deliberately boring: sell the pilots, keep the classrooms, expand the seats.", { x: 6.9, y: 5.98, w: 5.3, h: 0.24, fontFace: F.body, fontSize: 6.6, color: C.muted });
}

// ---------------------------------------------------------------------------
// 17 CLOSE
// ---------------------------------------------------------------------------
n = 17;
{
  const s = base("MockTrade Matrix · 2026", "", { cover: true });
  s.addShape(pptx.ShapeType.ellipse, { x: 4.0, y: 0.9, w: 5.3, h: 5.3, fill: { color: C.green, transparency: 96 }, line: { color: C.line, width: 0.8 } });
  s.addShape(pptx.ShapeType.ellipse, { x: 4.6, y: 1.5, w: 4.1, h: 4.1, fill: { color: "000000", transparency: 100 }, line: { color: "17202D", width: 0.8 } });
  s.addShape(pptx.ShapeType.roundRect, { x: 5.42, y: 1.62, w: 2.5, h: 0.3, rectRadius: 0.15, fill: { color: C.green, transparency: 90 }, line: { color: C.green, width: 0.7, transparency: 55 } });
  s.addText("LIVE DEMO AVAILABLE", { x: 5.52, y: 1.62, w: 2.3, h: 0.3, fontFace: F.mono, fontSize: 6.2, color: C.green2, charSpacing: 1.3, align: "center", valign: "middle" });

  s.addText([{ text: "Every investor loses\n", options: { color: C.ink } }, { text: "money once.", options: { color: C.green } }], { x: 1.3, y: 2.12, w: 10.7, h: 1.62, fontFace: F.display, fontSize: 40, bold: true, align: "center", charSpacing: -1.4, lineSpacingMultiple: 1.05 });
  s.addText("We make sure it happens at seventeen, in a simulation, with a teacher and a guardian in the room — not at twenty-five, with a real salary.", { x: 3.0, y: 4.0, w: 7.33, h: 0.72, fontFace: F.body, fontSize: 10.5, color: C.ink2, align: "center", lineSpacingMultiple: 1.35 });
  let cx = 4.0;
  ["ADMIN@MOCKTRADE.APP", "MOCKTRADE.APP", "PRANAV RAM · FOUNDER"].forEach((t, i) => {
    const w = t.length * 0.072 + 0.4;
    s.addShape(pptx.ShapeType.roundRect, { x: cx, y: 4.96, w, h: 0.32, rectRadius: 0.16, fill: { color: i === 0 ? C.green : i === 2 ? C.violet : C.panel, transparency: i === 1 ? 0 : 90 }, line: { color: i === 0 ? C.green : i === 2 ? C.violet : C.line, width: 0.7, transparency: i === 1 ? 0 : 50 } });
    s.addText(t, { x: cx, y: 4.96, w, h: 0.32, fontFace: F.mono, fontSize: 6.2, color: i === 0 ? C.green2 : i === 2 ? C.violet2 : C.ink2, charSpacing: 0.7, align: "center", valign: "middle" });
    cx += w + 0.14;
  });
  s.addText("LEARN TO LOSE. BEFORE IT COSTS ANYTHING.", { x: 2.0, y: 5.85, w: 9.33, h: 0.24, fontFace: F.mono, fontSize: 7.2, color: C.muted2, charSpacing: 3.0, align: "center" });
  s.addText("MOCKTRADE MATRIX · 2026", { x: 4.5, y: 6.5, w: 4.33, h: 0.2, fontFace: F.mono, fontSize: 6, color: "3E4858", charSpacing: 2.0, align: "center" });
}

const out = path.resolve(__dirname, "MockTrade-Matrix-Investor-Deck.pptx");
pptx.writeFile({ fileName: out }).then(() => console.log("WROTE", out)).catch((e) => { console.error(e); process.exit(1); });
