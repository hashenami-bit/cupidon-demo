// Kaptar — the dove postman (mascot). Same hand-painted look as the doodles: claret ink + watercolour washes,
// wearing a little do‘ppi (Uzbek skullcap) and a satchel. kaptar(pose) returns inline SVG markup so the page CSS
// can animate its parts (.k-eye blinks, .k-flap flaps, .k-bob bobs; all off for reduced motion).
// Poses: wait (letter in beak) · shy · fly · grab (claws ready: the page puts its "No" button under them) · surprised · dance · calendar · sad (kind "maybe later").

const LINE = '#6A2B3B', IVORY = '#FFFAF3';
const R1 = '#F5C4C8', R2 = '#EBA3AE', R3 = '#DD7F90', R4 = '#C75F73';
const S1 = '#CFE0C8', S2 = '#A9C4A1';
const GOLD = '#DDA83F', GOLD_L = '#F3D78F';
const BLUE = '#B4C8DE', BLUE2 = '#86A3C4';
const CAP = '#5E2334', SEAL = '#B23A53';

export const KAPTAR_POSES = ['wait', 'shy', 'fly', 'grab', 'surprised', 'dance', 'calendar', 'sad'];

const ln = (d, w = 2.2, c = LINE, o = 0.92) => `<path d="${d}" stroke="${c}" stroke-width="${w}" opacity="${o}"/>`;
const fill = (d, c, o = 1) => `<path d="${d}" fill="${c}" opacity="${o}"/>`;
const shape = (d, c, w = 2.2) => fill(d, c) + ln(d, w);
const at = (g, x, y, a = 0, s = 1, cls = '') => `<g${cls ? ` class="${cls}"` : ''} transform="translate(${x} ${y}) rotate(${a}) scale(${s})">${g}</g>`;
const HEART = 'M0 6C-8 0-9-6-4.5-7.5C-2-8.3 0-6.5 0-5C0-6.5 2-8.3 4.5-7.5C9-6 8 0 0 6Z';
const heart = (x, y, s = 1, c = R3, cls = '') => at(cls ? `<g class="${cls}">${shape(HEART, c, 1.8 / s)}</g>` : shape(HEART, c, 1.8 / s), x, y, 0, s);   // CSS motion on an inner group, so it keeps its place
const sparkle = (x, y, s = 1) => at(shape('M0-8C1-2 2-1 8 0C2 1 1 2 0 8C-1 2-2 1-8 0C-2-1-1-2 0-8Z', GOLD_L, 1.6 / s), x, y, 0, s);

// ---- parts (bird faces right; body ~ x 50–170, y 48–168)
const SILHOUETTE = 'M52 116C54 98 78 88 104 88C106 64 122 48 142 48C160 48 171 62 170 78C169 90 163 98 160 102C170 114 168 140 152 154C136 167 100 170 78 160C60 152 50 136 52 116Z';
const tail = spread => {
  const d = spread
    ? 'M60 112C44 96 28 84 12 82C8 90 10 98 14 102C6 108 8 118 14 122C8 128 12 138 20 140C34 136 48 132 62 132Z'
    : 'M60 110C44 104 28 98 14 98C10 104 12 112 16 116C12 120 14 128 20 132C32 132 46 130 60 132Z';
  const v = spread ? 'M60 118L18 100M60 124L20 122' : 'M58 118L20 108M58 124L22 124';
  return fill(d, IVORY) + fill(d, BLUE, 0.45) + ln(d) + ln(v, 1.3, LINE, 0.55);
};
const body = () =>
  fill(SILHOUETTE, IVORY) +
  fill('M56 120C60 146 86 164 112 165C90 152 70 140 56 120Z', BLUE, 0.55) +                       // back shadow
  fill('M152 106C166 118 166 142 151 152C138 160 124 160 116 150C127 136 136 118 152 106Z', R1, 0.6) + // rosy chest
  fill('M118 58C126 52 136 50 144 52C134 54 126 58 120 64Z', '#FFFFFF', 0.9) +                       // shine
  ln(SILHOUETTE, 2.4) +
  ln('M158 104C152 106 146 106 140 104', 1.3, LINE, 0.5);                                           // throat crease

// wing in its own coords: shoulder at (0,0), tip toward -x. rotate: -25 = folded, 35..60 = raised.
const WING = 'M2-8C-20-15-48-11-67 2C-62 7-58 9-52 8C-50 15-44 17-38 14C-35 21-28 23-22 18C-17 23-8 20 2 12C6 6 6-3 2-8Z';
const wing = (back = false) =>
  fill(WING, back ? '#E9EFF5' : IVORY) + fill('M-67 2C-62 7-58 9-52 8C-50 15-44 17-38 14C-35 21-28 23-22 18C-24 10-44 4-67 2Z', back ? BLUE2 : BLUE, back ? 0.45 : 0.6) +
  ln(WING, 2.2) + ln('M-52 8C-44 4-34 3-24 5M-38 14C-32 10-24 9-16 11M-46-2C-34-6-20-6-8-3', 1.3, LINE, 0.55);
const wingAt = (a, flap = false, back = false, x = 116, y = 102) => at(flap ? `<g class="k-flap">${wing(back)}</g>` : wing(back), x, y, a);

const feet = mode => {
  if (mode === 'tuck') return ln('M98 160L92 168M112 161L108 170', 2.6, R4, 0.95);
  const foot = (x, y, a = 0) => at(ln('M0-6L0 6M0 6L-7 9M0 6L0 11M0 6L7 9', 2.6, R4, 0.95), x, y, a);
  if (mode === 'hop') return foot(100, 168) + foot(124, 160, 28);
  return foot(100, 168) + foot(120, 167);
};

const satchel = () =>
  ln('M161 101C152 113 145 124 139 134', 3.4, '#8C6B3A', 0.9) +
  shape('M118 136L152 133L154 156C145 160 128 160 120 158Z', S2, 2) +
  shape('M117 136L153 133L150 147C143 150 128 150 121 148Z', S1, 2) +
  shape('M132 144h8v7h-8Z', GOLD, 1.4) +
  ln('M121 140L149 137.5', 1, LINE, 0.4);

// do‘ppi: claret cap with ivory almond (bodom) motifs and a gold band. lift/tilt for the surprised pose.
const BODOM = fill('M0 7C-6 3-5-5 1-6C5-6 6-2 3 1C1 3 1 5 0 7Z', IVORY, 0.95) + ln('M1-6C4-10 8-9 8-5', 1.3, IVORY, 0.95);
const doppi = (lift = 0, tilt = 0) => at(
  shape('M-23 8C-24 1-23-5-21-12C-8-10 8-10 21-12C23-5 24 1 23 8C8 12-8 12-23 8Z', CAP, 2.2) +
  fill('M-23 8C-8 12 8 12 23 8L23 3C8 7-8 7-23 3Z', GOLD) + ln('M-23 3C-8 7 8 7 23 3', 1.1, LINE, 0.6) +
  ln('M0-10.5V9.5', 1, IVORY, 0.5) +
  at(BODOM, -11, -3, -25, 0.95) + at(BODOM, 11, -3, 25, 0.95) +
  [-18, -12, -6, 0, 6, 12, 18].map(x => `<circle cx="${x}" cy="${(7.5 - Math.abs(x) * 0.06).toFixed(1)}" r=".9" fill="${CAP}"/>`).join(''),
  141, 47 - lift, -6 + tilt);

const eye = kind => {
  const X = 151, Y = 72;
  switch (kind) {
    case 'happy': return ln(`M${X - 6} ${Y + 2}Q${X} ${Y - 6} ${X + 6} ${Y + 2}`, 2.8, LINE, 1);
    case 'shy': return ln(`M${X - 6} ${Y - 1}Q${X} ${Y + 5} ${X + 6} ${Y - 1}`, 2.6, LINE, 1) + ln(`M${X + 4} ${Y + 4}l3 3`, 1.6, LINE, 0.8);
    case 'wide': return `<g class="k-eye"><circle cx="${X}" cy="${Y}" r="7" fill="${LINE}"/><circle cx="${X + 2.4}" cy="${Y - 2.6}" r="2.4" fill="#fff"/><circle cx="${X - 2.4}" cy="${Y + 2.6}" r="1.1" fill="#fff"/></g>` + ln(`M${X - 7} ${Y - 12}Q${X} ${Y - 17} ${X + 7} ${Y - 12}`, 2, LINE, 0.9);
    case 'sad': return `<g class="k-eye"><ellipse cx="${X}" cy="${Y + 1.5}" rx="4.2" ry="4.8" fill="${LINE}"/><circle cx="${X + 1.4}" cy="${Y}" r="1.4" fill="#fff"/></g>` + ln(`M${X - 7} ${Y - 7}L${X + 6} ${Y - 12}`, 2.8, LINE, 1);
    case 'sly': return `<g class="k-eye"><ellipse cx="${X}" cy="${Y}" rx="4.4" ry="5" fill="${LINE}"/><circle cx="${X + 1.6}" cy="${Y - 1.8}" r="1.5" fill="#fff"/></g>` + ln(`M${X - 7} ${Y - 12}L${X + 7} ${Y - 7}`, 2.8, LINE, 1);
    default: return `<g class="k-eye"><ellipse cx="${X}" cy="${Y}" rx="4.4" ry="5.2" fill="${LINE}"/><circle cx="${X + 1.6}" cy="${Y - 2}" r="1.6" fill="#fff"/></g>`;
  }
};
const cheek = (big = false) => `<ellipse cx="157" cy="87" rx="${big ? 9 : 7}" ry="${big ? 5 : 4}" fill="${big ? R3 : R2}" opacity="${big ? 0.6 : 0.65}"/>`;
const beak = open => open
  ? shape('M167 72C174 70 181 70 186 72C181 76 173 78 167 78Z', GOLD_L, 2) + shape('M167 81C173 83 179 86 182 90C176 90 170 88 166 85Z', GOLD_L, 2) + fill('M167 78L180 80L167 82Z', LINE, 0.8)
  : shape('M167 74C174 74 181 77 185 81C180 84 173 85 167 84Z', GOLD_L, 2) + ln('M169 80L182 81', 1.2, LINE, 0.7) + fill('M166 74C168 72 171 72 172 75C170 76 168 76 166 75Z', IVORY);

const letter = () => at(
  shape('M0 0h34v23h-34Z', IVORY, 2) + ln('M0 0L17 12L34 0', 1.6) + ln('M0 23L13 11M34 23L21 11', 1.1, LINE, 0.5) +
  `<circle cx="17" cy="12" r="5" fill="${SEAL}" stroke="${LINE}" stroke-width="1.4"/>` + at(fill(HEART, IVORY, 0.9), 17, 12.4, 0, 0.32),
  175, 76, 14);
const calendar = () => at(
  shape('M0 0h46v40h-46Z', IVORY, 2) + shape('M0 0h46v11h-46Z', R3, 2) +
  `<circle cx="12" cy="1" r="2.4" fill="${IVORY}" stroke="${LINE}" stroke-width="1.4"/><circle cx="34" cy="1" r="2.4" fill="${IVORY}" stroke="${LINE}" stroke-width="1.4"/>` +
  [0, 1, 2, 3].map(c => [0, 1, 2].map(r => (c === 2 && r === 1 ? '' : `<circle cx="${8 + c * 10}" cy="${18 + r * 8}" r="1.6" fill="${LINE}" opacity=".45"/>`)).join('')).join('') +
  at(fill(HEART, SEAL), 28, 26.5, 0, 0.55),
  118, 108, 6);
const swoosh = () => ln('M40 70C26 66 14 70 4 78M46 86C34 84 24 88 16 94', 2, LINE, 0.35);

// ---- poses
function pose(p) {
  const cap = p === 'surprised' ? doppi(9, -10) : p === 'sad' ? doppi(0, 4) : doppi();
  const head = cap + eye({ shy: 'shy', surprised: 'wide', dance: 'happy', sad: 'sad', grab: 'sly', calendar: 'happy' }[p]) +
    cheek(p === 'shy') + (p === 'shy' ? cheek(true) : '');
  switch (p) {
    case 'fly': return swoosh() + `<g transform="rotate(-12 110 120)">${wingAt(52, true, true, 112, 98)}${tail(true)}${body()}${feet('tuck')}${satchel()}${head}${letter()}${beak()}${wingAt(30, true)}</g>`;
    case 'grab': return `<g transform="rotate(-8 110 120)">${wingAt(58, true, true, 112, 98)}${tail(true)}${body()}${ln('M100 164L102 178M118 162L114 178', 2.6, R4, 0.95)}${satchel()}${head}${beak()}${wingAt(34, true)}</g>` + ln('M96 178L93 185M101 178L101 185M112 178L110 185M117 178L119 185', 2.4, R4, 0.95);   // the page puts the real button under his feet
    case 'surprised': return wingAt(70, false, true, 112, 98) + tail(true) + body() + feet() + satchel() + head + beak(true) + wingAt(48) + sparkle(178, 34, 0.8) + sparkle(194, 52, 0.55) + ln('M108 30L102 20M120 22L118 12', 2, LINE, 0.6);
    case 'dance': return `<g class="k-dance">${tail()}${body()}${feet('hop')}${satchel()}${head}${beak()}${wingAt(62, true)}</g>` + heart(186, 46, 1.1, R3, 'k-float') + heart(196, 76, 0.75, R2, 'k-float k-float-2') + heart(30, 70, 0.8, R2, 'k-float k-float-3');
    case 'calendar': return tail() + body() + feet() + satchel() + calendar() + head + beak() + wingAt(-8, false, false, 118, 104);
    case 'sad': return `<g transform="rotate(4 110 160)">${tail()}${body()}${feet()}${satchel()}${head}${heart(186, 86, 0.9, R3)}${beak()}${wingAt(-30)}</g>`;
    case 'shy': return `<g transform="rotate(7 110 160)">${tail()}${body()}${feet('hop')}${satchel()}${head}${letter()}${beak()}${wingAt(-18)}</g>` + heart(184, 40, 0.8, R2, 'k-float');
    default: return tail() + body() + feet() + satchel() + head + letter() + beak() + wingAt(-25);   // wait
  }
}

// Each SVG gets its own ids: with one shared id every copy would point at the first one, often on a hidden screen.
let idN = 0;
const inkFilter = id => `<defs><filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;

// label = text for screen readers; without it the dove is decoration (hidden from them).
export function kaptar(p = 'wait', label = '') {
  const name = KAPTAR_POSES.includes(p) ? p : 'wait';
  const a11y = label ? `role="img" aria-label="${String(label).replace(/[&<>"]/g, '')}"` : 'aria-hidden="true"';
  const ink = 'kp-ink-' + ++idN;
  return `<svg class="kaptar-svg" viewBox="0 0 220 200" ${a11y} fill="none" stroke-linecap="round" stroke-linejoin="round">${inkFilter(ink)}<g filter="url(#${ink})" class="k-${name}"><g class="k-bob">${pose(name)}</g></g></svg>`;
}

// A painted hand that counts down 5 → 1 by folding fingers (.is-down, pinky first) and then presses "Yes".
// Each finger is a .k-finger group; CSS folds it from its base.
const SKIN = '#F7DCC8', SKIN_D = '#EDBFA6';
// Fingers fan out a little (outer group), the inner .k-finger group is what CSS folds.
const finger = (cls, x, top, a, w = 14) => `<g transform="rotate(${a} ${x + w / 2} 72)"><g class="k-finger ${cls}">${shape(`M${x} 72V${top + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V72Z`, SKIN, 2.2)}${ln(`M${x + 3.5} ${top + 7}h${w - 7}`, 1.3, SKIN_D, 0.9)}</g></g>`;
export function hand() {
  const body =
    finger('f-index', 23, 14, -7) + finger('f-middle', 39, 6, -2) + finger('f-ring', 55, 11, 4) + finger('f-pinky', 70, 25, 10, 12) +
    `<g class="k-finger f-thumb">${shape('M32 98C21 94 10 84 5 71C3 63 11 58 18 64C25 72 29 79 38 83Z', SKIN, 2.2)}</g>` +
    shape('M22 68C22 62 26 58 32 58H74C80 58 84 62 84 68V94C84 108 72 116 56 116H48C34 116 22 108 22 94Z', SKIN, 2.4) +
    fill('M28 100C36 110 60 113 76 105C71 112 62 115 54 115H48C38 115 31 109 28 100Z', SKIN_D, 0.7) +
    heart(53, 88, 1.05, R2) +
    shape('M32 113H74V130H32Z', R3, 2.2) + ln('M32 118.5H74', 1.2, '#fff', 0.6);
  const ink = 'kp-ink-' + ++idN;
  return `<svg class="hand-svg" viewBox="0 0 100 132" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${inkFilter(ink)}<g filter="url(#${ink})">${body}</g></svg>`;
}

// A silk bow in atlas (Uzbek ikat) colours for the "untie the ribbon" opening.
export function bow() {
  const ink = 'kp-ink-' + ++idN, silkId = 'kp-ikat-' + idN;
  const ikat = `<defs><pattern id="${silkId}" width="16" height="14" patternUnits="userSpaceOnUse">
    <rect width="16" height="14" fill="${R4}"/><path d="M0 0h4v14H0z" fill="${GOLD}"/><path d="M8 0h3v14H8z" fill="${BLUE2}"/>
    <path d="M-2 7L3 2L8 7L13 2L18 7M-2 12L3 7L8 12L13 7L18 12" stroke="${IVORY}" stroke-width="1.6" fill="none" opacity=".85"/></pattern></defs>`;
  const loopL = 'M60 40C42 14 10 12 10 34C10 54 40 54 60 40Z', loopR = 'M60 40C78 14 110 12 110 34C110 54 80 54 60 40Z';
  const tailL = 'M56 44C50 58 42 68 32 76L45 80C52 70 57 58 60 46Z', tailR = 'M64 44C70 58 78 68 88 76L75 80C68 70 63 58 60 46Z';
  const silk = d => fill(d, `url(#${silkId})`) + ln(d, 2.2);
  return `<svg class="bow-svg" viewBox="0 0 120 84" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${ikat}${inkFilter(ink)}<g filter="url(#${ink})">
    <g class="bow-tails">${silk(tailL)}${silk(tailR)}</g>
    <g class="bow-loops">${silk(loopL)}${silk(loopR)}${ln('M24 30C32 26 44 30 52 38M96 30C88 26 76 30 68 38', 1.4, '#fff', 0.5)}</g>
    ${shape('M51 32C51 29 53 28 56 28H64C67 28 69 29 69 32V48C69 51 67 52 64 52H56C53 52 51 51 51 48Z', R4, 2.2)}${ln('M54 34L66 34M54 46L66 46', 1.2, GOLD_L, 0.9)}</g></svg>`;
}
