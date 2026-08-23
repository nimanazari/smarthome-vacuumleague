/* ============================================================
   mapmaker.js — the Map Maker (editor for custom match maps).
   Data lives in `map`; the 2D canvas is the editing surface and
   a real Engine + Renderer3D pair give a live 3D preview, so
   what you see is exactly what the match will use.
   ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);

/* ---------- theme (dark / light) ---------- */
let theme = new URLSearchParams(location.search).get('theme') || localStorage.getItem('shl_mm_theme') || 'dark';
if (theme !== 'light' && theme !== 'dark') theme = 'dark';
const THEMES = {
  dark:  { floor: '#141920', grid: '#1b212c', grid4: '#242c3a', border: '#8891a3', wall: '#9aa5b8', win: '#7fbef0', label: 'rgba(255,255,255,.75)' },
  light: { floor: '#f4f6fa', grid: '#dde3ec', grid4: '#c9d2df', border: '#55617a', wall: '#7b8698', win: '#3f8fd2', label: 'rgba(30,40,55,.85)' },
};
const T = () => THEMES[theme];

/* ---------- icons: inline SVG (FontAwesome-style strokes — no CDN needed,
   the Iran server has no outbound internet so emoji/CDN fonts are out) ---------- */
const ICONS = {
  cursor:    '<path d="M5.5 3.5 19 10.8l-6.3 1.5L9.3 19z"/>',
  wall:      '<rect x="3" y="5.5" width="18" height="13" rx="1"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="5.5" x2="9" y2="12"/><line x1="15" y1="12" x2="15" y2="18.5"/>',
  sofa:      '<path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11"/><path d="M5 13a2 2 0 1 0-4 0v3a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2v-3a2 2 0 1 0-4 0v1H5z"/><path d="M6 18v1.5M18 18v1.5"/>',
  pouf:      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.1"/><path d="M12 4v2.6M12 17.4V20M4 12h2.6M17.4 12H20"/>',
  table:     '<path d="M3 13.5h18M5 13.5V19M19 13.5V19"/><path d="M10.7 7h2.6l.6 4h-3.8z"/><path d="M12 4.8V7"/>',
  dining:    '<circle cx="13" cy="13" r="4.6"/><path d="M4 3.5v5M6.5 3.5v5M5.2 8.5V20"/><path d="M20.5 3.5c-1.3 1.3-1.7 3-1.7 5V20"/>',
  bookshelf: '<rect x="4" y="3" width="16" height="18" rx="1"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="9.5" y1="3" x2="9.5" y2="9"/><line x1="14.5" y1="9" x2="14.5" y2="15"/><line x1="11" y1="15" x2="11" y2="21"/>',
  fireplace: '<path d="M4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/><path d="M2.5 20.5h19"/><path d="M12 17.5c-1.9 0-3.2-1.4-3.2-3.1 0-1.6 1.2-2.5 1.9-3.7.4.8.9 1.2 1.3 1.8.7-.6.9-1.5.9-2.6 1.5 1.3 2.3 2.7 2.3 4.4 0 1.8-1.3 3.2-3.2 3.2z"/>',
  piano:     '<rect x="3" y="7" width="18" height="10" rx="1.2"/><path d="M8 7v10M13 7v10M18 7v10"/><path d="M6.2 7v4.8M11.2 7v4.8M16.2 7v4.8" stroke-width="2.4"/>',
  aquarium:  '<path d="M4.5 12c2.2-3 5.2-4.5 8.5-3.2 1.8.7 3 2 3.8 3.2-.8 1.2-2 2.5-3.8 3.2-3.3 1.3-6.3-.2-8.5-3.2z"/><path d="M16.8 12l3.7-2.6v5.2z"/><circle cx="8.3" cy="11.2" r=".5" fill="currentColor" stroke="none"/><path d="M19.5 5v.01M17.5 3.2v.01"/>',
  lamp:      '<path d="M9 3.5h6l2.6 6H6.4z"/><line x1="12" y1="9.5" x2="12" y2="18.5"/><path d="M8.5 20.5h7M10 18.5h4"/>',
  rug:       '<rect x="5" y="4" width="14" height="16" rx="1"/><rect x="8" y="7.5" width="8" height="9" rx="1"/><path d="M8 4V2.3M12 4V2.3M16 4V2.3M8 20v1.7M12 20v1.7M16 20v1.7"/>',
  window:    '<rect x="4" y="4" width="16" height="16" rx="1.2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/>',
  paw:       '<ellipse cx="12" cy="15.5" rx="3.4" ry="2.8"/><circle cx="6.8" cy="11" r="1.5"/><circle cx="10.3" cy="8.6" r="1.5"/><circle cx="13.7" cy="8.6" r="1.5"/><circle cx="17.2" cy="11" r="1.5"/>',
  bone:      '<path d="M9.2 9.2l5.6 5.6"/><path d="M9.2 9.2a2.2 2.2 0 1 0-3.1-3.1 2.2 2.2 0 1 0 3.1 3.1zM14.8 14.8a2.2 2.2 0 1 0 3.1 3.1 2.2 2.2 0 1 0-3.1-3.1z"/>',
  robot:     '<rect x="5" y="8" width="14" height="10" rx="2"/><path d="M12 8V5.5"/><circle cx="12" cy="4.5" r="1"/><circle cx="9.5" cy="12.5" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="12.5" r="1" fill="currentColor" stroke="none"/><path d="M9 15.5h6"/>',
  tools:     '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.8V21h3.2l6.4-6.3a4 4 0 0 0 5.1-5.4l-2.9 2.9-2.3-2.3z"/>',
  save:      '<path d="M4 5a2 2 0 0 1 2-2h10l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 3v5h8V4.2"/><rect x="8" y="13" width="8" height="7"/>',
  folder:    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  download:  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload:    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 8 12 3 17 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  plus:      '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  copy:      '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>',
  pencil:    '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 6.5l3 3"/>',
  play:      '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  moon:      '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  sun:       '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cube:      '<path d="M21 16V8l-9-5-9 5v8l9 5z"/><path d="M3.3 7.5 12 12l8.7-4.5M12 12v9.5"/>',
  mapview:   '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  topview:   '<rect x="4" y="4" width="16" height="16" rx="1.5"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/>',
  trash:     '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13.5h9l1-13.5"/><path d="M10 11v6M14 11v6"/>',
  cloud:     '<path d="M7 18a4.5 4.5 0 1 1 .6-8.96 6 6 0 0 1 11.3 1.76A3.6 3.6 0 0 1 18.4 18H7z"/><path d="M12 20v-6M9.5 16 12 13.5 14.5 16"/>',
  armchair:  '<path d="M6.5 11V8.5A3 3 0 0 1 9.5 5.5h5a3 3 0 0 1 3 3V11"/><path d="M6.5 11a2 2 0 1 0-2 2.4V17a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-3.6a2 2 0 1 0-2-2.4v2h-11z"/><path d="M7.5 18v1.5M16.5 18v1.5"/>',
  chair:     '<path d="M7.5 3.5v7M16.5 3.5v7M7.5 6.5h9"/><rect x="6" y="10.5" width="12" height="3" rx=".8"/><path d="M7.5 13.5V21M16.5 13.5V21"/>',
  tvset:     '<rect x="3" y="4.5" width="18" height="11.5" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
  plant:     '<path d="M12 21v-6.5"/><path d="M8.5 21h7"/><path d="M12 14.5C8 14.5 6 12 6 8.5c3.5 0 6 2.5 6 6zM12 14.5c4 0 6-2.5 6-6-3.5 0-6 2.5-6 6z"/>',
  cactus:    '<path d="M12 21V5"/><path d="M7.5 7v2.5a3 3 0 0 0 3 3H12M16.5 9v2.5a3 3 0 0 1-3 3H12"/><path d="M8.5 21h7"/>',
  palm2:     '<path d="M13 21c-.6-5.5-.1-9.5 1.5-12.6"/><path d="M14.5 8.4C13 5.9 10.5 4.9 7.5 5.4c1.5 2 3.5 3 7 3zM14.5 8.4c.5-3 2-4.5 5-5-.5 2.5-2 4.5-5 5zM14.5 8.4c2.5-1 5-.5 7 1.5-2.5 1-5 .5-7-1.5z"/><path d="M9.5 21h7"/>',
  carton:    '<path d="M3 8l9-4.5L21 8l-9 4.5z"/><path d="M3 8v8l9 4.5 9-4.5V8"/><path d="M12 12.5v8"/>',
  bench:     '<path d="M3 13h18"/><path d="M5 13v7M19 13v7"/><path d="M4 8.5h16M5.5 13V8.5M18.5 13V8.5"/>',
  doghouse:  '<path d="M4 10.5 12 3.5l8 7V20H4z"/><path d="M9.5 20v-4.5a2.5 2.5 0 0 1 5 0V20"/>',
  cattree:   '<path d="M4 21h16"/><path d="M12 21V4.5"/><path d="M7 9.5h10M8.5 15h7"/><circle cx="17.5" cy="4.8" r="1.6"/>',
  petbowl:   '<path d="M3.5 17.5h17"/><path d="M5.5 17.5a3.6 3.6 0 0 1-1.2-2.7h6.4a3.6 3.6 0 0 1-1.2 2.7zM14.5 17.5a3.6 3.6 0 0 1-1.2-2.7h6.4a3.6 3.6 0 0 1-1.2 2.7z"/><circle cx="8" cy="9" r="1"/><circle cx="12" cy="7.2" r="1"/><circle cx="16" cy="9" r="1"/>',
  wet:       '<path d="M12 3.5c3.5 4.2 6 7.3 6 10.2a6 6 0 0 1-12 0c0-2.9 2.5-6 6-10.2z"/>',
  column:    '<rect x="8.5" y="4.5" width="7" height="15"/><path d="M6 4.5h12M6 19.5h12M6 2.8h12M6 21.2h12"/>',
  columnR:   '<ellipse cx="12" cy="4.5" rx="5" ry="1.8"/><path d="M7 4.5v15M17 4.5v15"/><path d="M7 19.5a5 1.8 0 0 0 10 0"/>',
  fridge:    '<rect x="6" y="2.5" width="12" height="19" rx="1.5"/><line x1="6" y1="9.5" x2="18" y2="9.5"/><line x1="15.5" y1="4.8" x2="15.5" y2="7.5"/><line x1="15.5" y1="11.8" x2="15.5" y2="16"/>',
  kitchen:   '<rect x="3" y="10.5" width="18" height="9.5" rx="1"/><rect x="7.5" y="13" width="6" height="3.5" rx=".8"/><path d="M10.5 10.5V7.2c0-1.6 1.2-2.7 2.8-2.7 1.5 0 2.7 1.1 2.7 2.6"/><path d="M16 7.1v1.7"/>',
  stove:     '<rect x="4" y="9" width="16" height="11" rx="1"/><circle cx="9" cy="12.5" r="1.7"/><circle cx="15" cy="12.5" r="1.7"/><rect x="7" y="16" width="10" height="2.2"/><path d="M7 3.5h10l1.5 3.2h-13z"/>',
  washer:    '<rect x="4" y="3.5" width="16" height="17.5" rx="2"/><circle cx="12" cy="13.5" r="5"/><circle cx="12" cy="13.5" r="2.6"/><circle cx="7.2" cy="6.2" r=".8" fill="currentColor" stroke="none"/><circle cx="10.2" cy="6.2" r=".8" fill="currentColor" stroke="none"/>',
  bathtub:   '<path d="M3 11h18v2.5a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M6 11V6a2 2 0 0 1 4 0"/><path d="M6.5 18.5 5.5 21M17.5 18.5l1 2.5"/>',
  toilet:    '<rect x="7.5" y="3" width="9" height="5.5" rx="1"/><ellipse cx="12" cy="14" rx="6" ry="4.8"/><path d="M10 18.4V21h4v-2.6"/>',
  bed:       '<path d="M3 18v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8"/><path d="M3 15h18"/><path d="M6 8V6.2h5V8"/><path d="M3 18v1.6M21 18v1.6"/>',
  wardrobe:  '<rect x="5" y="3" width="14" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="10" y1="10" x2="10" y2="13"/><line x1="14" y1="10" x2="14" y2="13"/>',
  dresser:   '<rect x="4" y="6" width="16" height="13" rx="1"/><line x1="4" y1="12.5" x2="20" y2="12.5"/><line x1="10.5" y1="9.2" x2="13.5" y2="9.2"/><line x1="10.5" y1="15.7" x2="13.5" y2="15.7"/><path d="M5.5 19v1.8M18.5 19v1.8"/>',
  desk:      '<rect x="8.5" y="2.5" width="7" height="4.6" rx=".6"/><path d="M12 7.1v1.4"/><path d="M3 8.5h18M4.5 8.5V19M19.5 8.5V19"/><path d="M15.5 8.5V14h4"/>',
  treadmill: '<rect x="4" y="15.5" width="16" height="3.6" rx="1.8"/><path d="M6.5 15.5V8M17.5 15.5V8"/><rect x="5" y="5.2" width="14" height="2.6" rx="1"/>',
};
function iconSvg(key, size = 22, color = 'currentColor') {
  // xmlns is required when the markup is loaded as a standalone Image for canvas drawImage
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[key] || ''}</svg>`;
}
const _iconImgs = {};
function iconImg(key) {
  if (_iconImgs[key]) return _iconImgs[key];
  const img = new Image();
  img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(iconSvg(key, 48, '#ffffff'));
  img.onload = () => draw();
  _iconImgs[key] = img;
  return img;
}
function applyTheme() {
  document.body.classList.toggle('light', theme === 'light');
  const tb = $('themeBtn');
  if (tb) tb.innerHTML = `<span>${iconSvg(theme === 'dark' ? 'sun' : 'moon', 17)}</span>`;
  localStorage.setItem('shl_mm_theme', theme);
}

/* ---------- object catalog (this batch: living room) ---------- */
const CATALOG = {
  /* نشیمن */
  sofa:      { fa: 'مبل سه‌نفره',   icon: 'sofa',      grp: 'living', w: 3.0,  d: 0.95, min: [1.6, 0.75], max: [4.5, 1.4],  color: '#4f5c70' },
  armchair:  { fa: 'مبل تک‌نفره',   icon: 'armchair',  grp: 'living', w: 1.1,  d: 0.95, min: [0.8, 0.7],  max: [1.6, 1.3],  color: '#4f5c70' },
  chair:     { fa: 'صندلی',         icon: 'chair',     grp: 'living', w: 0.5,  d: 0.55, min: [0.4, 0.45], max: [0.8, 0.85], color: '#7a5230' },
  tv:        { fa: 'تلویزیون + میز', icon: 'tvset',    grp: 'living', w: 2.6,  d: 0.75, min: [1.4, 0.55], max: [3.6, 1.0],  color: '#2f261d' },
  pouf:      { fa: 'پاف / عسلی',    icon: 'pouf',      grp: 'living', w: 0.8,  d: 0.8,  min: [0.5, 0.5],  max: [1.4, 1.4],  color: '#b3573f' },
  table:     { fa: 'میز + گلدون',   icon: 'table',     grp: 'living', w: 1.4,  d: 1.0,  min: [0.8, 0.6],  max: [2.2, 1.5],  color: '#6b4f38' },
  dining:    { fa: 'میز ناهارخوری', icon: 'dining',    grp: 'living', w: 1.8,  d: 1.1,  min: [1.0, 0.8],  max: [3.0, 1.7],  color: '#7a5230' },
  bookshelf: { fa: 'کتابخونه',      icon: 'bookshelf', grp: 'living', w: 1.8,  d: 0.45, min: [0.9, 0.35], max: [3.5, 0.65], color: '#5a4028' },
  fireplace: { fa: 'شومینه',        icon: 'fireplace', grp: 'living', w: 1.6,  d: 0.55, min: [1.1, 0.45], max: [2.6, 0.85], color: '#8a8078' },
  piano:     { fa: 'پیانو',         icon: 'piano',     grp: 'living', w: 1.5,  d: 0.65, min: [1.2, 0.55], max: [2.2, 0.85], color: '#241f26' },
  aquarium:  { fa: 'آکواریوم',      icon: 'aquarium',  grp: 'living', w: 1.4,  d: 0.55, min: [0.8, 0.45], max: [2.4, 0.85], color: '#3a3f4a' },
  lamp:      { fa: 'آباژور',        icon: 'lamp',      grp: 'living', w: 0.55, d: 0.55, min: [0.4, 0.4],  max: [0.85, 0.85], color: '#caa25a' },
  /* آشپزخونه و سرویس */
  fridge:    { fa: 'یخچال',         icon: 'fridge',    grp: 'kitchen', w: 0.85, d: 0.75, min: [0.65, 0.6],  max: [1.3, 1.0],  color: '#c9ced6' },
  kitchen:   { fa: 'کابینت + سینک', icon: 'kitchen',   grp: 'kitchen', w: 2.4,  d: 0.65, min: [1.2, 0.55],  max: [4.5, 0.85], color: '#8b6a48' },
  stove:     { fa: 'اجاق + هود',    icon: 'stove',     grp: 'kitchen', w: 0.9,  d: 0.65, min: [0.7, 0.55],  max: [1.4, 0.85], color: '#3a3f46' },
  washer:    { fa: 'لباسشویی',      icon: 'washer',    grp: 'kitchen', w: 0.7,  d: 0.7,  min: [0.55, 0.55], max: [1.0, 0.9],  color: '#dfe3e8' },
  bathtub:   { fa: 'وان حمام',      icon: 'bathtub',   grp: 'kitchen', w: 1.7,  d: 0.8,  min: [1.2, 0.65],  max: [2.4, 1.1],  color: '#eef1f3' },
  toilet:    { fa: 'توالت فرنگی',   icon: 'toilet',    grp: 'kitchen', w: 0.55, d: 0.75, min: [0.45, 0.6],  max: [0.8, 1.0],  color: '#f0f2f4' },
  /* اتاق خواب و کار */
  bed:       { fa: 'تخت‌خواب',      icon: 'bed',       grp: 'bedroom', w: 1.6,  d: 2.1,  min: [0.95, 1.7],  max: [2.2, 2.5],  color: '#5b7d9c' },
  shelf:     { fa: 'کمد لباس',      icon: 'wardrobe',  grp: 'bedroom', w: 2.4,  d: 0.7,  min: [0.9, 0.5],   max: [3.5, 0.9],  color: '#54402d' },
  dresser:   { fa: 'دراور / پاتختی', icon: 'dresser',  grp: 'bedroom', w: 1.1,  d: 0.5,  min: [0.45, 0.35], max: [1.8, 0.65], color: '#6b533a' },
  desk:      { fa: 'میز کامپیوتر',  icon: 'desk',      grp: 'bedroom', w: 1.5,  d: 1.4,  min: [1.1, 1.0],   max: [2.2, 1.8],  color: '#5f4a36' },
  treadmill: { fa: 'تردمیل',        icon: 'treadmill', grp: 'bedroom', w: 0.8,  d: 1.7,  min: [0.65, 1.3],  max: [1.1, 2.2],  color: '#2e3238' },
  /* متفرقه و حیوانات */
  plant:     { fa: 'گلدون',          icon: 'plant',    grp: 'misc', w: 0.6,  d: 0.6,  min: [0.4, 0.4],  max: [1.0, 1.0],  color: '#3f8f4f' },
  cactus:    { fa: 'کاکتوس',         icon: 'cactus',   grp: 'misc', w: 0.5,  d: 0.5,  min: [0.35, 0.35], max: [0.8, 0.8], color: '#3f8f4f' },
  palm:      { fa: 'پالم بلند',      icon: 'palm2',    grp: 'misc', w: 0.75, d: 0.75, min: [0.5, 0.5],  max: [1.1, 1.1],  color: '#3f9e5f' },
  trash:     { fa: 'سطل زباله',      icon: 'trash',    grp: 'misc', w: 0.45, d: 0.45, min: [0.35, 0.35], max: [0.7, 0.7], color: '#5b6675' },
  /* لیگ جاروبرقی: داک شارژ (با چرخش، دهانه‌اش می‌چرخد) و مخزن تخلیه (+۵ در U19) */
  dock:      { fa: 'داک شارژ ربات',  icon: 'washer',   grp: 'misc', w: 1.1,  d: 1.1,  min: [1.1, 1.1],   max: [1.1, 1.1], color: '#2fd08a' },
  dump:      { fa: 'ایستگاه تخلیه', icon: 'trash',   grp: 'misc', w: 0.5,  d: 0.5,  min: [0.5, 0.5],   max: [0.5, 0.5], color: '#f4f7fb' },
  box:       { fa: 'کارتن',          icon: 'carton',   grp: 'misc', w: 0.6,  d: 0.6,  min: [0.4, 0.4],  max: [1.1, 1.1],  color: '#b08d57' },
  bench:     { fa: 'نیمکت',          icon: 'bench',    grp: 'misc', w: 1.5,  d: 0.55, min: [1.0, 0.45], max: [2.4, 0.8],  color: '#8a5a2e' },
  doghouse:  { fa: 'لونه‌ی سگ',      icon: 'doghouse', grp: 'misc', w: 0.95, d: 1.05, min: [0.7, 0.8],  max: [1.4, 1.5],  color: '#8a5a2e' },
  cattree:   { fa: 'درخت گربه',      icon: 'cattree',  grp: 'misc', w: 0.7,  d: 0.7,  min: [0.5, 0.5],  max: [1.1, 1.1],  color: '#b9a58e' },
  petbowl:   { fa: 'ظرف غذای حیوونا', icon: 'petbowl', grp: 'misc', w: 0.55, d: 0.35, min: [0.4, 0.28], max: [0.9, 0.6],  color: '#4f5c70' },
  /* سازه */
  door:      { fa: 'در (هل بدی باز می‌شه)', icon: 'wall', grp: 'structure', w: 1.25, d: 0.16, min: [0.8, 0.12], max: [2.0, 0.3], color: '#7a5230' },
  sconce:    { fa: 'چراغ دیواری (دکور)', icon: 'lamp', grp: 'structure', w: 0.3, d: 0.18, min: [0.2, 0.12], max: [0.6, 0.3], color: '#3a4356' },
  column:    { fa: 'ستون چهارگوش',  icon: 'column',    grp: 'structure', w: 0.5, d: 0.5, min: [0.3, 0.3],  max: [0.9, 0.9],  color: '#9aa3b0' },
  columnR:   { fa: 'ستون گرد',      icon: 'columnR',   grp: 'structure', w: 0.5, d: 0.5, min: [0.3, 0.3],  max: [0.9, 0.9],  color: '#9aa3b0', round: true },
  window:    { fa: 'پنجره',         icon: 'window',    grp: 'structure', w: 1.25, d: 0.22, min: [0.6, 0.22], max: [3.2, 0.22], color: '#dfe8f2', win: true },
};
const RUGS = {
  rug: { fa: 'فرش (نیم‌سرعت)', icon: 'rug', grp: 'floor', w: 3.1,  d: 1.9,  min: [0.6, 0.6], max: [10, 8], color: '#2f7d4a', kind: 'green' },
  // the marker family: no points, full speed — but the colour sensor tells
  // them apart, so every doorway can wear a DIFFERENT colour
  purple: { fa: 'فرش نشانه — بنفش', icon: 'rug', grp: 'floor', w: 0.625, d: 0.625, min: [0.6, 0.6], max: [3.2, 3.2], color: '#8a4fd8', kind: 'purple' },
  orange: { fa: 'فرش نشانه — نارنجی', icon: 'rug', grp: 'floor', w: 0.625, d: 0.625, min: [0.6, 0.6], max: [3.2, 3.2], color: '#e08a1e', kind: 'orange' },
  cyan: { fa: 'فرش نشانه — فیروزه‌ای', icon: 'rug', grp: 'floor', w: 0.625, d: 0.625, min: [0.6, 0.6], max: [3.2, 3.2], color: '#22b8d4', kind: 'cyan' },
  wet: { fa: 'چاله‌ی آب (پنالتی)', icon: 'wet', grp: 'floor', w: 1.25, d: 1.0, min: [0.6, 0.6], max: [3.2, 3.2], color: '#2f7fc4', kind: 'wet' },
};
const GROUPS = [
  ['living', 'نشیمن'], ['kitchen', 'آشپزخونه و سرویس'], ['bedroom', 'اتاق خواب و کار'],
  ['misc', 'متفرقه و حیوانات'], ['structure', 'سازه و پنجره'], ['floor', 'کف‌پوش — با رنگ دلخواه'],
];
const WALL_T = 0.16;

/* ---------- map state ---------- */
function starterMap() {
  return {
    v: 1, name: '', cols: 16, rows: 16, tileSize: 0.625,
    objects: [], walls: [], rugs: [],
    spawns: {
      red: { x: 1.8, y: 1.8, rot: 0 }, blue: { x: 8.2, y: 8.2, rot: 2 },
      cat: { x: 5.0, y: 4.0, on: true }, dog: { x: 3.2, y: 5.6, on: true },
    },
  };
}
let map = loadDraft() || starterMap();
let sel = null;              // { kind:'obj'|'rug'|'wall'|'spawn', ref }
let tool = 'select';         // 'select' | 'wall' | 'place'
let placeType = null;        // catalog key while placing
let ghost = null;            // {x,y} ghost position while placing
let wallDraw = null;         // {x0,y0,x1,y1} while dragging a wall
let drag = null;             // {ref, dx, dy, kind}

const W = () => map.cols * map.tileSize;
const H = () => map.rows * map.tileSize;
const snap = (v) => Math.round(v / (map.tileSize / 4)) * (map.tileSize / 4);
const snapHalf = (v) => Math.round(v / (map.tileSize / 2)) * (map.tileSize / 2);
const clampN = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ---------- storage ---------- */
function loadDraft() { try { return JSON.parse(localStorage.getItem('shl_mm_draft') || 'null'); } catch (e) { return null; } }
let draftT;
function touch() {
  clearTimeout(draftT);
  draftT = setTimeout(() => {
    localStorage.setItem('shl_mm_draft', JSON.stringify(map));
    // A SAVED map keeps saving itself on every edit, under the name it was
    // saved with — never under whatever is half-typed in the name box, which
    // used to litter the shelf with "م", "مپ", "مپ ۲"… Renaming is the Save
    // button's job. The game's map list reads the same shelf, so an edit to a
    // saved map is already live in the game.
    if (savedAs) storeMap(savedAs);
    mapState();
  }, 250);
  clearTimeout(histT);
  histT = setTimeout(snapshotNow, 450);      // one history entry per gesture
  draw(); refresh3D(); warns();
  if (typeof boardMeters === 'function') boardMeters();
}

/* ---------- undo / redo (Ctrl+Z / Ctrl+Y) ---------- */
let hist = [], histPos = -1, histT;
function snapshotNow() {
  const s = JSON.stringify(map);
  if (hist[histPos] === s) return;
  hist = hist.slice(0, histPos + 1);
  hist.push(s);
  if (hist.length > 300) { hist.shift(); }
  histPos = hist.length - 1;
}
function applyHist(dir) {
  clearTimeout(histT);
  snapshotNow();                             // capture any pending edits first
  const np = histPos + dir;
  if (np < 0 || np >= hist.length) return;
  histPos = np;
  map = JSON.parse(hist[histPos]);
  sel = null; ghost = null; wallDraw = null; drag = null;
  afterMapSwap();
}
function savedMaps() { try { return JSON.parse(localStorage.getItem('shl_maps') || '{}'); } catch (e) { return {}; } }
function setSavedMaps(o) { try { localStorage.setItem('shl_maps', JSON.stringify(o)); } catch (e) { alert('حافظه‌ی مرورگر پر است — نقشه ذخیره نشد.'); } }

/* ---------- "my maps": every map you build, kept for good ----------
   A map lives on the shelf under its own name ('shl_maps'), which is the very
   shelf the game's map list reads — save it here and it is playable at once,
   and it is still there the next time this browser opens. `savedAs` is the
   name the open map is stored under: while it is set, every edit writes
   itself back. Before the first save the map is only a draft. */
const SAVED_AS_KEY = 'shl_mm_savedas';
let savedAs = null;
try { savedAs = localStorage.getItem(SAVED_AS_KEY) || null; } catch (e) { /* private mode */ }
if (savedAs && !savedMaps()[savedAs]) savedAs = null;    // it was deleted meanwhile
// the draft can carry a name that was typed into the box but never saved —
// the shelf is the authority on what an already-saved map is called
if (savedAs && (map.name || '') !== savedAs) map.name = savedAs;
function setSavedAs(n) {
  savedAs = n || null;
  try { if (savedAs) localStorage.setItem(SAVED_AS_KEY, savedAs); else localStorage.removeItem(SAVED_AS_KEY); } catch (e) { /* private mode */ }
}
// write the open map onto the shelf under `name`
function storeMap(name) {
  const all = savedMaps();
  const copy = JSON.parse(JSON.stringify(map));
  copy.name = name;
  copy.savedAt = Date.now();
  all[name] = copy;
  setSavedMaps(all);
}

/* ---------- launched from the game (?edit=…&league=…) ---------- */
// The game's setup page opens the editor ON the map you are about to play.
// `edit` slots use the same encoding as the game's map list; `league` tags
// the map so each league only lists its own maps.
const BOOT = new URLSearchParams(location.search);

// the official house, as an editable COPY — the built-in one never changes
function officialMap() {
  const O = (t, x1, y1, x2, y2) => ({ t, x: +((x1 + x2) / 2).toFixed(3), y: +((y1 + y2) / 2).toFixed(3), w: +(x2 - x1).toFixed(3), d: +(y2 - y1).toFixed(3), rot: 0 });
  return Object.assign(starterMap(), {
    name: 'خانه‌ی رسمی (کپی)',
    objects: [
      O('sofa', 4.00, 0.20, 7.50, 1.15), O('table', 5.00, 2.00, 6.40, 3.00),
      O('tv', 2.50, 8.90, 5.60, 9.80), O('bed', 0.20, 7.20, 2.20, 9.80),
      O('shelf', 8.85, 3.00, 9.80, 6.00), O('shelf', 0.20, 3.20, 0.95, 5.80),
      O('plant', 2.50, 0.30, 3.10, 0.90), O('plant', 0.35, 6.10, 0.95, 6.70), O('plant', 6.90, 9.20, 7.50, 9.80),
      O('pouf', 8.10, 7.70, 8.90, 8.50), O('dining', 1.30, 1.60, 2.70, 2.60),
      O('lamp', 9.15, 8.95, 9.65, 9.45), O('trash', 0.30, 2.20, 0.75, 2.65), O('petbowl', 6.35, 9.35, 6.75, 9.75),
    ],
    rugs: [
      { x: 4.0625, y: 7.8125, w: 3.125, d: 1.875, kind: 'green', color: '#2f7d4a' },
      { x: 9.375, y: 0.625, w: 1.25, d: 1.25, kind: 'purple', color: '#8a4fd8' },
    ],
  });
}

const MM_LEAGUES = [
  ['vacuum', '🧹', 'جاروبرقی هوشمند'],
  ['', '🏠', 'عمومی — همه‌ی لیگ‌ها'],
];
const leagueLabel = (id) => { for (const [k, ic, fa] of MM_LEAGUES) if (k === (id || '')) return ic + ' ' + fa; return '🏠 عمومی'; };

(function bootFromGame() {
  const slot = BOOT.get('edit');
  if (slot) {
    // a copy of the official house, or the loose draft, is NOT yet one of "my
    // maps" — it becomes one the moment you give it a name and press Save
    if (slot === '::current') {
      // the game serialised the very map its setup page is showing — the
      // division's official house included. Edit a copy; Save names it.
      const d = (() => { try { return JSON.parse(localStorage.getItem('shl_mm_edit') || 'null'); } catch (e) { return null; } })();
      if (d) { map = Object.assign(starterMap(), d); setSavedAs(null); }
    }
    else if (slot === 'official') { map = officialMap(); setSavedAs(null); }
    else if (slot === '::draft') { const d = (() => { try { return JSON.parse(localStorage.getItem('shl_play_map') || 'null'); } catch (e) { return null; } })(); if (d) { map = Object.assign(starterMap(), d); setSavedAs(null); } }
    else if (slot.indexOf('name:') === 0) { const n = slot.slice(5), all = savedMaps(), m = all[n]; if (m) { map = Object.assign(starterMap(), JSON.parse(JSON.stringify(m))); map.name = n; setSavedAs(n); } }
    else if (slot.indexOf('srv:') === 0) {
      // a map admins put on the site: fetch it, edit a local copy of it
      const n = slot.slice(4);
      setSavedAs(null);
      fetch('/api/maps', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
        const it = (j.maps || []).find((x) => x && x.name === n);
        if (it && it.map) { map = Object.assign(starterMap(), JSON.parse(JSON.stringify(it.map))); map.name = map.name || n; afterMapSwap(); }
      }).catch(() => {});
    }
  }
  if (BOOT.get('league') != null) map.league = BOOT.get('league') || '';
  // This editor lives inside leagues/vacuum/ and belongs to that league
  // alone, so a map made here is tagged for it unless the game says
  // otherwise. Nothing else in the folder needs to know the name.
  const OWNER_LEAGUE = 'vacuum';
  if (!map.league) map.league = OWNER_LEAGUE;
})();

/* ---------- which league is this map for? ---------- */
// The game asked for league-first building: a fresh editor session starts by
// choosing the league; the tag rides inside the map JSON and the game's map
// list filters by it. The chip in the header changes it any time.
function leaguePick(force) {
  if (!force && (map.league != null || BOOT.get('league') != null)) { leagueChip(); return; }
  const ov = document.createElement('div');
  ov.id = 'lgOverlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,14,.86);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;direction:rtl;backdrop-filter:blur(3px)';
  ov.innerHTML = '<div style="font:800 22px Vazirmatn,Tahoma,sans-serif;color:#fff">این مپ برای کدوم لیگه؟</div>' +
    '<div style="font:13px Vazirmatn,Tahoma,sans-serif;color:#9aa3af">مپ فقط در لیست همون لیگ نشون داده می‌شه — «عمومی» یعنی همه‌جا.</div>';
  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;justify-content:center;max-width:640px';
  for (const [id, ic, fa] of MM_LEAGUES) {
    const b = document.createElement('button');
    b.style.cssText = 'font:700 15px Vazirmatn,Tahoma,sans-serif;padding:16px 22px;border-radius:14px;border:1px solid #333c4d;background:#171b24;color:#e8eaed;cursor:pointer;min-width:150px';
    b.innerHTML = '<div style="font-size:30px;margin-bottom:8px">' + ic + '</div>' + fa;
    b.onmouseenter = () => { b.style.borderColor = '#4d8bff'; };
    b.onmouseleave = () => { b.style.borderColor = '#333c4d'; };
    b.onclick = () => { map.league = id; ov.remove(); leagueChip(); touch(); };
    grid.appendChild(b);
  }
  ov.appendChild(grid);
  document.body.appendChild(ov);
}
function leagueChip() {
  let chip = document.getElementById('lgChip');
  if (!chip) {
    chip = document.createElement('button');
    chip.id = 'lgChip'; chip.type = 'button';
    chip.title = 'این مپ برای این لیگ است — کلیک برای عوض کردن';
    chip.style.cssText = 'font:700 12px Vazirmatn,Tahoma,sans-serif;padding:6px 10px;border-radius:9px;border:1px solid #333c4d;background:#171b24;color:#cfd6df;cursor:pointer;white-space:nowrap';
    chip.onclick = () => leaguePick(true);
    const host = $('mapName');
    if (host && host.parentNode) host.parentNode.insertBefore(chip, host.nextSibling);
    else document.body.appendChild(chip);
  }
  chip.textContent = leagueLabel(map.league);
}

/* ---------- palette UI ---------- */
const palEl = $('palette');
const ALL_DEFS = Object.assign({}, CATALOG, RUGS);
for (const [gk, gfa] of GROUPS) {
  const head = document.createElement('div');
  head.className = 'palhead'; head.textContent = gfa;
  palEl.appendChild(head);
  for (const [key, def] of Object.entries(ALL_DEFS)) {
    if (def.grp !== gk) continue;
    const b = document.createElement('button');
    b.className = 'pal'; b.dataset.key = key;
    b.innerHTML = `<span class="i">${iconSvg(def.icon, 26)}</span><span class="n">${def.fa}</span>`;
    b.onclick = () => {
      document.querySelectorAll('.pal.on').forEach((x) => x.classList.remove('on'));
      if (placeType === key) { placeType = null; setTool('select'); return; }
      placeType = key; b.classList.add('on'); setTool('place');
    };
    palEl.appendChild(b);
  }
}
function setTool(t) {
  tool = t;
  if (t !== 'place') { placeType = null; ghost = null; document.querySelectorAll('.pal.on').forEach((x) => x.classList.remove('on')); }
  $('toolSelect').classList.toggle('on', t === 'select');
  $('toolWall').classList.toggle('on', t === 'wall');
  $('cvHint').textContent =
    t === 'wall' ? 'برای کشیدن دیوار روی نقشه درگ کن (افقی یا عمودی)' :
    t === 'place' ? 'روی نقشه کلیک کن تا شیء گذاشته بشه — Esc برای انصراف' :
    'کلیک = انتخاب · درگ = جابه‌جایی · R چرخش · Delete حذف';
  draw();
}
$('toolSelect').onclick = () => setTool('select');
$('toolWall').onclick = () => setTool('wall');

/* ---------- board controls ---------- */
$('bCols').value = map.cols; $('bRows').value = map.rows; $('bTile').value = String(map.tileSize);
$('bCols').onchange = () => { map.cols = clampN(+$('bCols').value | 0, 8, 30); $('bCols').value = map.cols; clampAll(); boardMeters(); touch(); };
$('bRows').onchange = () => { map.rows = clampN(+$('bRows').value | 0, 8, 30); $('bRows').value = map.rows; clampAll(); boardMeters(); touch(); };
$('bTile').onchange = () => {
  const old = map.tileSize, nt = parseFloat($('bTile').value);
  const f = nt / old;
  map.tileSize = nt;
  // keep everything at the same RELATIVE spot on the board
  const sc = (o) => { o.x *= f; o.y *= f; };
  map.objects.forEach(sc); map.walls.forEach((w) => { sc(w); w.w *= f; w.d *= f; });
  map.rugs.forEach((r) => { sc(r); r.w *= f; r.d *= f; });
  for (const k of ['red', 'blue', 'cat', 'dog']) sc(map.spawns[k]);
  if (map.rooms) map.rooms.forEach((r) => { r.x1 *= f; r.y1 *= f; r.x2 *= f; r.y2 *= f; });
  clampAll(); touch();
};
// the ground AROUND the house: dark void, grass, or stone paving —
// stored on the map itself; the 3D game paints its base to match
function surroundRow() {
  const host = $('bP16') && $('bP16').parentElement;
  if (!host || $('bSurround')) return;
  const row = document.createElement('div');
  row.className = 'irow';
  row.style.cssText = 'gap:5px;flex-wrap:wrap';
  row.innerHTML = '<label>دور و بر</label>';
  const sel = document.createElement('select');
  sel.id = 'bSurround';
  sel.style.cssText = 'flex:1;background:var(--card,#171b24);color:inherit;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:5px';
  for (const [v, fa] of [['dark', 'تاریک (پیش‌فرض)'], ['grass', 'چمن 🌿'], ['stone', 'سنگ‌فرش 🪨']]) {
    const o = document.createElement('option');
    o.value = v; o.textContent = fa;
    sel.appendChild(o);
  }
  sel.value = map.surround || 'dark';
  sel.onchange = () => { map.surround = sel.value; touch(); };
  row.appendChild(sel);
  host.parentElement.insertBefore(row, host.nextSibling);
}
surroundRow();

// quick board presets + a live size readout in metres
function boardMeters() {
  const el = $('bMeters');
  if (el) el.textContent = map.cols + '×' + map.rows + ' کاشی = ' + (map.cols * map.tileSize).toFixed(2) + ' × ' + (map.rows * map.tileSize).toFixed(2) + ' متر';
}
if ($('bP16')) $('bP16').onclick = () => { map.cols = 16; map.rows = 16; $('bCols').value = 16; $('bRows').value = 16; clampAll(); boardMeters(); touch(); };
if ($('bP22')) $('bP22').onclick = () => { map.cols = 22; map.rows = 22; $('bCols').value = 22; $('bRows').value = 22; clampAll(); boardMeters(); touch(); };
boardMeters();
const _bm = touch;

$('catOn').checked = map.spawns.cat.on !== false;
$('dogOn').checked = map.spawns.dog.on !== false;
$('catOn').onchange = () => { map.spawns.cat.on = $('catOn').checked; touch(); };
$('dogOn').onchange = () => { map.spawns.dog.on = $('dogOn').checked; touch(); };

// windows live ON an outer wall: snap the centre to the closest wall line
function snapToWall(p, len) {
  const cands = [
    { d: Math.abs(p.y), x: clampN(snapHalf(p.x), len / 2, W() - len / 2), y: 0, rot: 0 },
    { d: Math.abs(H() - p.y), x: clampN(snapHalf(p.x), len / 2, W() - len / 2), y: H(), rot: 0 },
    { d: Math.abs(p.x), x: 0, y: clampN(snapHalf(p.y), len / 2, H() - len / 2), rot: 1 },
    { d: Math.abs(W() - p.x), x: W(), y: clampN(snapHalf(p.y), len / 2, H() - len / 2), rot: 1 },
  ];
  cands.sort((a, b) => a.d - b.d);
  return { x: cands[0].x, y: cands[0].y, rot: cands[0].rot };
}

/* ---------- furniture may stand SIDE BY SIDE but never ON TOP of each other ---------- */
// world footprint of a placed object (its rotation is already accounted for)
function footRect(o, x, y) {
  const w = (o.rot || 0) % 2 ? o.d : o.w, d = (o.rot || 0) % 2 ? o.w : o.d;
  const cx = x != null ? x : o.x, cy = y != null ? y : o.y;
  return { x1: cx - w / 2, y1: cy - d / 2, x2: cx + w / 2, y2: cy + d / 2 };
}
// touching edges is fine, real overlap is not — hence the small epsilon
function rectsOverlap(a, b) {
  const E = 1e-4;
  return a.x1 < b.x2 - E && a.x2 > b.x1 + E && a.y1 < b.y2 - E && a.y2 > b.y1 + E;
}
// Would this object sit on top of something if it moved to (x, y)?
// Rugs are floor coverings, so furniture standing ON a rug is perfectly normal.
function wouldOverlap(item, x, y) {
  if (item.t === 'window') return false;             // windows live in the wall
  if (item.t === 'door' || item.t === 'sconce') return false;   // doorway / wall decor
  const a = footRect(item, x, y);
  for (const o of map.objects) {
    if (o === item || o.t === 'window') continue;
    if (rectsOverlap(a, footRect(o))) return true;
  }
  for (const wl of map.walls) {
    if (rectsOverlap(a, { x1: wl.x - wl.w / 2, y1: wl.y - wl.d / 2, x2: wl.x + wl.w / 2, y2: wl.y + wl.d / 2 })) return true;
  }
  return false;
}

// the closest free position to (x, y) on the quarter-tile grid, or null
function freeSpotNear(item, x, y) {
  const step = map.tileSize / 4, bw = W(), bh = H();
  const w = (item.rot || 0) % 2 ? item.d : item.w, d = (item.rot || 0) % 2 ? item.w : item.d;
  for (let ring = 0; ring <= 12; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (ring && Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;   // ring edge only
        const nx = clampN(x + dx * step, w / 2, bw - w / 2);
        const ny = clampN(y + dy * step, d / 2, bh - d / 2);
        if (!wouldOverlap(item, nx, ny)) return { x: nx, y: ny };
      }
    }
  }
  return null;
}

// Move a dragged item, refusing any position where it would end up ON TOP of
// another piece of furniture. Each axis is tried on its own too, so a piece
// slides along its neighbour instead of sticking the moment they touch.
function moveTo(drag, nx, ny) {
  const it = drag.ref;
  if (drag.kind !== 'obj') {
    it.x = nx; it.y = ny;
    if (drag.kind === 'wall') snapWallTo(it);   // walls are magnetic
    return;
  }
  if (!wouldOverlap(it, nx, ny)) { it.x = nx; it.y = ny; return; }
  if (!wouldOverlap(it, nx, it.y)) { it.x = nx; return; }
  if (!wouldOverlap(it, it.x, ny)) { it.y = ny; return; }
}

let hintT;
function flashHint(msg) {
  const el = $('cvHint');
  if (!el) return;
  clearTimeout(hintT);
  const old = el.textContent;
  el.textContent = msg;
  el.style.color = '#ffb08a';
  hintT = setTimeout(() => { el.textContent = old; el.style.color = ''; }, 2200);
}

function clampAll() {
  const bw = W(), bh = H();
  for (const o of map.objects) {
    if (o.t === 'window') {
      o.w = clampN(o.w, 0.6, Math.min(3.2, Math.max(bw, bh))); o.d = 0.22;
      Object.assign(o, snapToWall({ x: o.x, y: o.y }, o.w));
      continue;
    }
    const def = CATALOG[o.t] || { max: [4, 4] };
    o.w = clampN(o.w, 0.3, Math.min(def.max[0], bw)); o.d = clampN(o.d, 0.3, Math.min(def.max[1], bh));
    if (o.t === 'columnR') o.d = o.w;          // round columns stay circular
    const w = o.rot % 2 ? o.d : o.w, d = o.rot % 2 ? o.w : o.d;
    o.x = clampN(o.x, w / 2, bw - w / 2); o.y = clampN(o.y, d / 2, bh - d / 2);
  }
  // A rug marks whole tiles as un-cleanable, so its edges have to sit ON tile
  // boundaries — otherwise the tinted tiles and the rug you see disagree.
  for (const r of map.rugs) {
    const t = map.tileSize;
    r.w = clampN(r.w, t, bw); r.d = clampN(r.d, t, bh);
    let x1 = Math.round((r.x - r.w / 2) / t) * t, x2 = Math.round((r.x + r.w / 2) / t) * t;
    let y1 = Math.round((r.y - r.d / 2) / t) * t, y2 = Math.round((r.y + r.d / 2) / t) * t;
    if (x2 - x1 < t) x2 = x1 + t;
    if (y2 - y1 < t) y2 = y1 + t;
    x1 = clampN(x1, 0, bw - (x2 - x1)); y1 = clampN(y1, 0, bh - (y2 - y1));
    r.w = x2 - x1; r.d = y2 - y1;
    r.x = x1 + r.w / 2; r.y = y1 + r.d / 2;
  }
  for (const wl of map.walls) {
    wl.w = clampN(wl.w, WALL_T, bw + WALL_T); wl.d = clampN(wl.d, WALL_T, bh + WALL_T);
    // walls may overshoot the border by half a thickness so they sit flush
    // inside the outer wall instead of leaving a corner gap
    wl.x = clampN(wl.x, wl.w / 2 - WALL_T, bw - wl.w / 2 + WALL_T);
    wl.y = clampN(wl.y, wl.d / 2 - WALL_T, bh - wl.d / 2 + WALL_T);
  }
  for (const k of ['red', 'blue', 'cat', 'dog']) {
    map.spawns[k].x = clampN(map.spawns[k].x, 0.5, bw - 0.5);
    map.spawns[k].y = clampN(map.spawns[k].y, 0.5, bh - 0.5);
  }
  if (map.spawns.red.rot == null) map.spawns.red.rot = 0;    // starting facing
  if (map.spawns.blue.rot == null) map.spawns.blue.rot = 2;
}

/* ---------- validation warnings ---------- */
function rectsOfSolids() {
  const out = [];
  for (const o of map.objects) {
    if (o.t === 'window') continue;                    // windows are decor, no physics
    const w = o.rot % 2 ? o.d : o.w, d = o.rot % 2 ? o.w : o.d;
    out.push({ x1: o.x - w / 2, y1: o.y - d / 2, x2: o.x + w / 2, y2: o.y + d / 2 });
  }
  for (const wl of map.walls) out.push({ x1: wl.x - wl.w / 2, y1: wl.y - wl.d / 2, x2: wl.x + wl.w / 2, y2: wl.y + wl.d / 2 });
  return out;
}
function spotBlocked(x, y, r) {
  for (const s of rectsOfSolids()) {
    const cx = clampN(x, s.x1, s.x2), cy = clampN(y, s.y1, s.y2);
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
  }
  return false;
}
function warns() {
  const w = [];
  if (spotBlocked(map.spawns.red.x, map.spawns.red.y, 0.36)) w.push('⚠️ نقطه‌ی شروع ربات قرمز روی مانع است!');
  if (spotBlocked(map.spawns.blue.x, map.spawns.blue.y, 0.36)) w.push('⚠️ نقطه‌ی شروع ربات آبی روی مانع است!');
  if (map.spawns.cat.on !== false && spotBlocked(map.spawns.cat.x, map.spawns.cat.y, 0.3)) w.push('⚠️ گربه روی مانع اسپان می‌شود.');
  if (map.spawns.dog.on !== false && spotBlocked(map.spawns.dog.x, map.spawns.dog.y, 0.35)) w.push('⚠️ سگ روی مانع اسپان می‌شود.');
  $('warns').innerHTML = w.join('<br>');
}

/* ---------- 2D canvas ---------- */
const cv = $('cv'), ctx = cv.getContext('2d');
let view = { s: 40, px: 0, py: 0 };   // px per meter + top-left padding

function fitView() {
  const r = cv.parentElement.getBoundingClientRect();
  cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio;
  cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  const pad = 26;
  view.s = Math.min((r.width - pad * 2) / W(), (r.height - pad * 2) / H());
  view.px = (r.width - W() * view.s) / 2;
  view.py = (r.height - H() * view.s) / 2;
}
const mx = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - view.px) / view.s, y: (e.clientY - r.top - view.py) / view.s }; };
const X = (x) => view.px + x * view.s, Y = (y) => view.py + y * view.s;

let rotHandlePx = null;   // canvas-px position of the ⟳ handle next to the selection
function draw() {
  fitView();
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  const r = cv.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);
  const s = view.s, t = map.tileSize, th = T();
  rotHandlePx = null;

  // floor + grid
  ctx.fillStyle = th.floor;
  ctx.fillRect(X(0), Y(0), W() * s, H() * s);
  ctx.lineWidth = 1;
  for (let i = 0; i <= map.cols; i++) {
    ctx.strokeStyle = i % 4 === 0 ? th.grid4 : th.grid;
    ctx.beginPath(); ctx.moveTo(X(i * t), Y(0)); ctx.lineTo(X(i * t), Y(H())); ctx.stroke();
  }
  for (let j = 0; j <= map.rows; j++) {
    ctx.strokeStyle = j % 4 === 0 ? th.grid4 : th.grid;
    ctx.beginPath(); ctx.moveTo(X(0), Y(j * t)); ctx.lineTo(X(W()), Y(j * t)); ctx.stroke();
  }

  // rugs
  for (const rg of map.rugs) {
    const col = rg.color || (rg.kind === 'purple' ? '#8a4fd8' : rg.kind === 'orange' ? '#e08a1e' : rg.kind === 'cyan' ? '#22b8d4' : rg.kind === 'wet' ? '#2f7fc4' : '#2f7d4a');
    if (rg.round) {
      // rounded corners, matching the 3D rug
      const rx = X(rg.x - rg.w / 2), ry = Y(rg.y - rg.d / 2), rw = rg.w * view.s, rd = rg.d * view.s;
      const rr = Math.min(rw, rd) / 2 * Math.min(1, rg.round);
      ctx.fillStyle = col;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rd, rr); else ctx.rect(rx, ry, rw, rd);
      ctx.fill();
      continue;
    }
    ctx.fillStyle = col + 'cc';
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    rrect(X(rg.x - rg.w / 2), Y(rg.y - rg.d / 2), rg.w * s, rg.d * s, 6, true, true);
    if (sel && sel.ref === rg) selOutline(rg.x - rg.w / 2, rg.y - rg.d / 2, rg.w, rg.d);
  }

  // the NO-SPAWN margin: a faint red ring around every solid piece — the
  // robot's radius. The referee never teleports into it, and a spawn point
  // dragged inside it will start the robot wedged. Purely informative.
  {
    const RM = 0.30 * view.s;
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 63, 94, .20)';
    ctx.lineWidth = RM;
    for (const o of map.objects) {
      const def = ALL_DEFS[o.t] || {};
      if (o.t === 'dock' || o.t === 'dump' || o.t === 'window') continue;
      const rot = (o.rot || 0) % 2;
      const w = rot ? o.d : o.w, d = rot ? o.w : o.d;
      ctx.strokeRect(X(o.x - w / 2) - RM / 2, Y(o.y - d / 2) - RM / 2, w * view.s + RM, d * view.s + RM);
    }
    for (const wl of map.walls) {
      ctx.strokeRect(X(wl.x - wl.w / 2) - RM / 2, Y(wl.y - wl.d / 2) - RM / 2, wl.w * view.s + RM, wl.d * view.s + RM);
    }
    ctx.restore();
  }
  // room rectangles (from maps that declare them): dashed outlines + names.
  // They ride along with the map — visible here, edited in the map's JSON.
  if (map.rooms) {
    for (const rm of map.rooms) {
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = 'rgba(52, 211, 153, .55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(X(rm.x1), Y(rm.y1), (rm.x2 - rm.x1) * view.s, (rm.y2 - rm.y1) * view.s);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(52, 211, 153, .8)';
      ctx.font = '700 11px Vazirmatn, Tahoma, sans-serif';
      ctx.fillText('room ' + rm.id + ' — ' + (rm.name || ''), X(rm.x1) + 5, Y(rm.y1) + 14);
      ctx.restore();
    }
  }
  // walls
  for (const wl of map.walls) {
    ctx.fillStyle = th.wall;
    ctx.fillRect(X(wl.x - wl.w / 2), Y(wl.y - wl.d / 2), wl.w * s, wl.d * s);
    if (sel && sel.ref === wl) selOutline(wl.x - wl.w / 2, wl.y - wl.d / 2, wl.w, wl.d);
  }
  // wall being drawn
  if (wallDraw) {
    const rct = wallRect(wallDraw);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = th.wall;
    ctx.fillRect(X(rct.x - rct.w / 2), Y(rct.y - rct.d / 2), rct.w * s, rct.d * s);
    ctx.globalAlpha = 1;
  }

  // outer border (before windows, so windows sit ON it)
  ctx.strokeStyle = th.border; ctx.lineWidth = 3;
  ctx.strokeRect(X(0), Y(0), W() * s, H() * s);

  // objects
  for (const o of map.objects) {
    const def = CATALOG[o.t];
    const w = o.rot % 2 ? o.d : o.w, d = o.rot % 2 ? o.w : o.d;

    if (o.t === 'window') {
      // a bright pane straddling the outer wall
      const ww = Math.max(w * s, 6), dd = Math.max(d * s, 6);
      ctx.fillStyle = th.win;
      ctx.fillRect(X(o.x - w / 2), Y(o.y - d / 2), ww, dd);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.strokeRect(X(o.x - w / 2), Y(o.y - d / 2), ww, dd);
      // mullion ticks
      ctx.beginPath();
      if (o.rot % 2) { ctx.moveTo(X(o.x - w / 2), Y(o.y)); ctx.lineTo(X(o.x + w / 2), Y(o.y)); }
      else { ctx.moveTo(X(o.x), Y(o.y - d / 2)); ctx.lineTo(X(o.x), Y(o.y + d / 2)); }
      ctx.stroke();
      if (sel && sel.ref === o) selOutline(o.x - w / 2, o.y - d / 2, w, d);
      continue;
    }

    const col = o.color || def.color;
    ctx.fillStyle = col + 'd9'; ctx.strokeStyle = shadeCss(col, 1.35); ctx.lineWidth = 2;
    rrect(X(o.x - w / 2), Y(o.y - d / 2), w * s, d * s, 7, true, true);
    // facing arrow (front of the model)
    const dir = [[0, -1], [1, 0], [0, 1], [-1, 0]][o.rot || 0];
    ctx.strokeStyle = th.label; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(o.x), Y(o.y));
    ctx.lineTo(X(o.x + dir[0] * Math.min(w, d) * 0.34), Y(o.y + dir[1] * Math.min(w, d) * 0.34));
    ctx.stroke();
    // crisp SVG icon (white, over the coloured footprint)
    const img = iconImg(def.icon);
    if (img.complete) {
      const sz = clampN(Math.min(w, d) * s * 0.52, 14, 44);
      ctx.globalAlpha = 0.92;
      ctx.drawImage(img, X(o.x) - sz / 2, Y(o.y) - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
    }
    if (sel && sel.ref === o) selOutline(o.x - w / 2, o.y - d / 2, w, d);
  }

  // placing ghost
  if (tool === 'place' && placeType && ghost) {
    const def = CATALOG[placeType] || RUGS[placeType];
    const gw = def.win && ghost.rot % 2 ? def.d : def.w;
    const gd = def.win && ghost.rot % 2 ? def.w : def.d;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = def.win ? th.win : def.color;
    rrect(X(ghost.x - gw / 2), Y(ghost.y - gd / 2), gw * view.s, gd * view.s, 6, true, false);
    ctx.globalAlpha = 1;
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#4d8bff'; ctx.lineWidth = 2;
    rrect(X(ghost.x - gw / 2), Y(ghost.y - gd / 2), gw * view.s, gd * view.s, 6, false, true);
    ctx.setLineDash([]);
  }

  // spawn markers
  marker(map.spawns.red, '#ff4d4d', 'R', null);
  marker(map.spawns.blue, '#3b78ff', 'B', null);
  if (map.spawns.cat.on !== false) marker(map.spawns.cat, map.spawns.cat.color || '#d08a3e', null, 'paw');
  if (map.spawns.dog.on !== false) marker(map.spawns.dog, map.spawns.dog.color || '#8a6a3e', null, 'bone');

  // ⟳ handle beside anything rotatable: objects, walls, robot spawns
  if (canRotate()) {
    let hx, hy;
    if (sel.kind === 'spawn') {
      hx = X(sel.ref.x + 0.34) + 13; hy = Y(sel.ref.y - 0.34) - 13;
    } else {
      const fw = sel.kind === 'wall' ? sel.ref.w : ((sel.ref.rot || 0) % 2 ? sel.ref.d : sel.ref.w);
      const fd = sel.kind === 'wall' ? sel.ref.d : ((sel.ref.rot || 0) % 2 ? sel.ref.w : sel.ref.d);
      hx = X(sel.ref.x + fw / 2) + 15; hy = Y(sel.ref.y - fd / 2) - 15;
    }
    rotHandlePx = { x: hx, y: hy, r: 12 };
    ctx.beginPath(); ctx.arc(hx, hy, 11, 0, Math.PI * 2);
    ctx.fillStyle = theme === 'dark' ? 'rgba(23,27,34,.95)' : 'rgba(255,255,255,.95)';
    ctx.fill();
    ctx.lineWidth = 1.8; ctx.strokeStyle = '#4d8bff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy, 5.2, -2.3, 2.1);
    ctx.lineWidth = 1.9; ctx.stroke();
    const aA = 2.1, ax = hx + 5.2 * Math.cos(aA), ay = hy + 5.2 * Math.sin(aA);
    ctx.beginPath();
    ctx.moveTo(ax + 3.2, ay - 1.6); ctx.lineTo(ax - 1.4, ay - 2.6); ctx.lineTo(ax + 1.4, ay + 2.6);
    ctx.closePath(); ctx.fillStyle = '#4d8bff'; ctx.fill();
  }
}
function marker(sp, col, label, ic) {
  const s = view.s;
  ctx.beginPath(); ctx.arc(X(sp.x), Y(sp.y), 0.3 * s, 0, Math.PI * 2);
  ctx.fillStyle = col + '55'; ctx.fill();
  ctx.lineWidth = sel && sel.kind === 'spawn' && sel.ref === sp ? 3.5 : 2;
  ctx.strokeStyle = col; ctx.stroke();
  if (ic) {
    const img = iconImg(ic);
    if (img.complete) { const sz = 0.4 * s; ctx.drawImage(img, X(sp.x) - sz / 2, Y(sp.y) - sz / 2, sz, sz); }
  } else {
    ctx.font = `bold ${0.3 * s}px Vazirmatn, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(label, X(sp.x), Y(sp.y) + 1);
  }
  // robots show which way they will FACE at the start
  if (sp.rot != null) {
    const dv = [[1, 0], [0, 1], [-1, 0], [0, -1]][sp.rot % 4];
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(X(sp.x + dv[0] * 0.32), Y(sp.y + dv[1] * 0.32));
    ctx.lineTo(X(sp.x + dv[0] * 0.5), Y(sp.y + dv[1] * 0.5));
    ctx.stroke();
    const tx2 = X(sp.x + dv[0] * 0.6), ty2 = Y(sp.y + dv[1] * 0.6);
    const bx2 = X(sp.x + dv[0] * 0.48), by2 = Y(sp.y + dv[1] * 0.48);
    ctx.beginPath();
    ctx.moveTo(tx2, ty2);
    ctx.lineTo(bx2 + -dv[1] * 4, by2 + dv[0] * 4);
    ctx.lineTo(bx2 - -dv[1] * 4, by2 - dv[0] * 4);
    ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
  }
}
function selOutline(x, y, w, d) {
  ctx.setLineDash([6, 4]); ctx.strokeStyle = '#4d8bff'; ctx.lineWidth = 2.5;
  ctx.strokeRect(X(x) - 3, Y(y) - 3, w * view.s + 6, d * view.s + 6);
  ctx.setLineDash([]);
}
function rrect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  if (fill) ctx.fill(); if (stroke) ctx.stroke();
}
function shadeCss(hex, mul) {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v) => Math.min(255, Math.round(v * mul));
  return '#' + ((f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0');
}
// interesting x / y lines to lock onto while drawing a wall: the ENDS and
// centrelines of every existing wall + the outer walls. This is what makes
// L / T corners close perfectly and lets you continue a wall from its tip.
function wallSnapCoords() {
  const xs = [0, W()], ys = [0, H()];
  for (const wl of map.walls) {
    if (wl.w >= wl.d) {                      // horizontal wall
      xs.push(wl.x - wl.w / 2 + WALL_T / 2, wl.x + wl.w / 2 - WALL_T / 2);
      ys.push(wl.y);
    } else {                                 // vertical wall
      xs.push(wl.x);
      ys.push(wl.y - wl.d / 2 + WALL_T / 2, wl.y + wl.d / 2 - WALL_T / 2);
    }
  }
  return { xs, ys };
}
function snapWallC(v, cands) {
  let best = null, bd = 0.3;
  for (const c of cands) { const dd = Math.abs(v - c); if (dd < bd) { bd = dd; best = c; } }
  return best != null ? best : snapHalf(v);
}
/* ---- MAGNETIC WALLS ----
   Dragging or drawing a wall near another one CLICKS it on:
     · same direction  → the shared axis aligns, and end butts to end
     · perpendicular   → my end lands exactly on the other's centreline
   so corners and T-joints come out clean without pixel-hunting. */
function snapWallTo(it) {
  const TOL = 0.42;
  const vert = (w) => w.d > w.w;
  const iv = vert(it);
  for (const o of map.walls) {
    if (o === it) continue;
    if (vert(o) === iv) {
      if (iv) {
        if (Math.abs(o.x - it.x) < TOL) it.x = o.x;                    // co-align
        if (Math.abs(o.x - it.x) < TOL / 2) {
          const oTop = o.y + o.d / 2, oBot = o.y - o.d / 2;
          if (Math.abs(oTop - (it.y - it.d / 2)) < TOL) it.y = oTop + it.d / 2;   // butt above
          else if (Math.abs((it.y + it.d / 2) - oBot) < TOL) it.y = oBot - it.d / 2; // butt below
        }
      } else {
        if (Math.abs(o.y - it.y) < TOL) it.y = o.y;
        if (Math.abs(o.y - it.y) < TOL / 2) {
          const oR = o.x + o.w / 2, oL = o.x - o.w / 2;
          if (Math.abs(oR - (it.x - it.w / 2)) < TOL) it.x = oR + it.w / 2;
          else if (Math.abs((it.x + it.w / 2) - oL) < TOL) it.x = oL - it.w / 2;
        }
      }
    } else if (iv) {
      // my vertical END clicks onto the horizontal wall's centreline...
      let met = false;
      if (Math.abs((it.y + it.d / 2) - o.y) < TOL) { it.y = o.y - it.d / 2 + o.d / 2; met = true; }
      else if (Math.abs((it.y - it.d / 2) - o.y) < TOL) { it.y = o.y + it.d / 2 - o.d / 2; met = true; }
      // ...and near the other wall's END, my line slides onto it: an L-corner
      if (met) {
        const oL = o.x - o.w / 2, oR = o.x + o.w / 2;
        if (Math.abs(it.x - oL) < TOL) it.x = oL + it.w / 2;
        else if (Math.abs(it.x - oR) < TOL) it.x = oR - it.w / 2;
      }
    } else {
      let met = false;
      if (Math.abs((it.x + it.w / 2) - o.x) < TOL) { it.x = o.x - it.w / 2 + o.w / 2; met = true; }
      else if (Math.abs((it.x - it.w / 2) - o.x) < TOL) { it.x = o.x + it.w / 2 - o.w / 2; met = true; }
      if (met) {
        const oB = o.y - o.d / 2, oT = o.y + o.d / 2;
        if (Math.abs(it.y - oB) < TOL) it.y = oB + it.d / 2;
        else if (Math.abs(it.y - oT) < TOL) it.y = oT - it.d / 2;
      }
    }
  }
}

function wallRect(wd) {
  const sc = wallSnapCoords();
  const dx = Math.abs(wd.x1 - wd.x0), dy = Math.abs(wd.y1 - wd.y0);
  // ends grow by half the thickness so corners overlap into a clean joint
  if (dx >= dy) {
    let x0 = snapWallC(Math.min(wd.x0, wd.x1), sc.xs), x1 = snapWallC(Math.max(wd.x0, wd.x1), sc.xs);
    if (x1 - x0 < map.tileSize) x1 = x0 + map.tileSize;
    const y = snapWallC(wd.y0, sc.ys);
    return { x: (x0 + x1) / 2, y, w: (x1 - x0) + WALL_T, d: WALL_T };
  }
  let y0 = snapWallC(Math.min(wd.y0, wd.y1), sc.ys), y1 = snapWallC(Math.max(wd.y0, wd.y1), sc.ys);
  if (y1 - y0 < map.tileSize) y1 = y0 + map.tileSize;
  const x = snapWallC(wd.x0, sc.xs);
  return { x, y: (y0 + y1) / 2, w: WALL_T, d: (y1 - y0) + WALL_T };
}

/* ---------- hit testing + pointer events ---------- */
function hitSpawn(p) {
  const order = [['dog', map.spawns.dog], ['cat', map.spawns.cat], ['blue', map.spawns.blue], ['red', map.spawns.red]];
  for (const [k, sp] of order) {
    if ((k === 'cat' && map.spawns.cat.on === false) || (k === 'dog' && map.spawns.dog.on === false)) continue;
    if (Math.hypot(p.x - sp.x, p.y - sp.y) < 0.34) return { kind: 'spawn', key: k, ref: sp };
  }
  return null;
}
function hitItem(p) {
  for (let i = map.objects.length - 1; i >= 0; i--) {
    const o = map.objects[i];
    const w = o.rot % 2 ? o.d : o.w, d = o.rot % 2 ? o.w : o.d;
    if (p.x > o.x - w / 2 && p.x < o.x + w / 2 && p.y > o.y - d / 2 && p.y < o.y + d / 2) return { kind: 'obj', ref: o };
  }
  for (let i = map.walls.length - 1; i >= 0; i--) {
    const wl = map.walls[i];
    if (p.x > wl.x - wl.w / 2 - 0.06 && p.x < wl.x + wl.w / 2 + 0.06 && p.y > wl.y - wl.d / 2 - 0.06 && p.y < wl.y + wl.d / 2 + 0.06) return { kind: 'wall', ref: wl };
  }
  for (let i = map.rugs.length - 1; i >= 0; i--) {
    const rg = map.rugs[i];
    if (p.x > rg.x - rg.w / 2 && p.x < rg.x + rg.w / 2 && p.y > rg.y - rg.d / 2 && p.y < rg.y + rg.d / 2) return { kind: 'rug', ref: rg };
  }
  return null;
}

cv.addEventListener('pointerdown', (e) => {
  cv.setPointerCapture(e.pointerId);
  const p = mx(e);
  // the ⟳ handle next to the selection: one click = one quarter turn
  if (rotHandlePx && canRotate()) {
    const rct = cv.getBoundingClientRect();
    const cxp = e.clientX - rct.left, cyp = e.clientY - rct.top;
    if (Math.hypot(cxp - rotHandlePx.x, cyp - rotHandlePx.y) <= rotHandlePx.r + 2) {
      rotateSel();
      return;
    }
  }
  if (tool === 'place' && placeType) { placeAt(p); return; }
  if (tool === 'wall') { wallDraw = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; draw(); return; }

  const spawnHit = hitSpawn(p);
  if (spawnHit) {
    select({ kind: 'spawn', key: spawnHit.key, ref: spawnHit.ref });
    drag = { kind: 'spawn', ref: spawnHit.ref, dx: spawnHit.ref.x - p.x, dy: spawnHit.ref.y - p.y };
    return;
  }
  const h = hitItem(p);
  if (h) { select(h); drag = { kind: h.kind, ref: h.ref, dx: h.ref.x - p.x, dy: h.ref.y - p.y }; }
  else select(null);
});
cv.addEventListener('pointermove', (e) => {
  const p = mx(e);
  if (tool === 'place' && placeType) {
    const def = CATALOG[placeType] || RUGS[placeType];
    ghost = def.win ? snapToWall(p, def.w) : { x: snap(p.x), y: snap(p.y) };
    draw(); return;
  }
  if (wallDraw) { wallDraw.x1 = p.x; wallDraw.y1 = p.y; draw(); return; }
  if (drag) {
    if (drag.ref.t === 'window') {
      Object.assign(drag.ref, snapToWall({ x: p.x + drag.dx, y: p.y + drag.dy }, drag.ref.w));
    } else {
      moveTo(drag, snap(p.x + drag.dx), snap(p.y + drag.dy));
    }
    clampAll(); touch();
  }
});
cv.addEventListener('pointerup', () => {
  if (wallDraw) {
    const r = wallRect(wallDraw);
    if (r.w > WALL_T || r.d > WALL_T) { snapWallTo(r); map.walls.push(r); select({ kind: 'wall', ref: r }); }
    wallDraw = null; touch();
  }
  // a dragged wall gets ONE final, decisive click into place on release
  if (drag && drag.kind === 'wall') { snapWallTo(drag.ref); touch(); }
  drag = null;
});
window.addEventListener('keydown', (e) => {
  // undo/redo FIRST — even when a slider or name box still holds the
  // focus, Ctrl+Z means "undo the MAP", not the text field
  if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.target.blur) e.target.blur(); applyHist(e.shiftKey ? 1 : -1); return; }
  if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); if (e.target.blur) e.target.blur(); applyHist(1); return; }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'Escape') setTool('select');
  if (!sel) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { delSel(); }
  if (e.key === 'r' || e.key === 'R') rotateSel();
  if ((e.key === 'd' || e.key === 'D') && e.ctrlKey) { e.preventDefault(); dupSel(); }
  // nudge with the arrow keys (Shift = a whole tile)
  const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
  if (dir) {
    e.preventDefault();
    const step = (e.shiftKey ? map.tileSize : map.tileSize / 4);
    sel.ref.x += dir[0] * step; sel.ref.y += dir[1] * step;
    if (sel.ref.t === 'window') Object.assign(sel.ref, snapToWall({ x: sel.ref.x, y: sel.ref.y }, sel.ref.w));
    clampAll(); touch(); update3DSel();
  }
});

/* ---------- placement (shared by the 2D plan and the 3D view) ---------- */
function placeAt(p) {
  const inRugs = !!RUGS[placeType];
  const def = inRugs ? RUGS[placeType] : CATALOG[placeType];
  let item;
  if (def.win) {
    const sp = snapToWall(p, def.w);
    item = { t: 'window', x: sp.x, y: sp.y, w: def.w, d: 0.22, rot: sp.rot, color: def.color };
  } else if (inRugs) {
    item = { x: snap(p.x), y: snap(p.y), w: def.w, d: def.d, kind: def.kind, color: def.color };
  } else {
    item = { t: placeType, x: snap(p.x), y: snap(p.y), w: def.w, d: def.d, rot: 0, color: def.color };
    // nothing may be dropped on top of something else — nudge it to the nearest
    // free spot instead, and only refuse if the whole area around is taken
    const spot = freeSpotNear(item, item.x, item.y);
    if (!spot) { flashHint('این‌جا جا نیست — وسایل روی هم قرار نمی‌گیرند'); return; }
    item.x = spot.x; item.y = spot.y;
  }
  (inRugs ? map.rugs : map.objects).push(item);
  clampAll();
  select(inRugs ? { kind: 'rug', ref: item } : { kind: 'obj', ref: item });
  setTool('select');
  touch();
}

/* ---------- selection + inspector ---------- */
function select(h) { sel = h; syncInsp(); draw(); if (typeof update3DSel === 'function') update3DSel(); }
// walls swap orientation; objects turn a quarter; robot spawns turn their facing
function canRotate() {
  if (!sel) return false;
  if (sel.kind === 'obj') return sel.ref.t !== 'window' && sel.ref.t !== 'columnR';
  if (sel.kind === 'wall') return true;
  if (sel.kind === 'spawn') return sel.key === 'red' || sel.key === 'blue';
  return false;
}
function rotateSel() {
  if (!canRotate()) return;
  if (sel.kind === 'wall') { const t = sel.ref.w; sel.ref.w = sel.ref.d; sel.ref.d = t; }
  else {
    const was = sel.ref.rot || 0;
    sel.ref.rot = (was + 1) % 4;
    // turning sideways can make a piece reach into its neighbour — slide it to
    // the nearest free spot, or turn it back if there is nowhere to go
    if (sel.kind === 'obj' && wouldOverlap(sel.ref, sel.ref.x, sel.ref.y)) {
      const spot = freeSpotNear(sel.ref, sel.ref.x, sel.ref.y);
      if (spot) { sel.ref.x = spot.x; sel.ref.y = spot.y; }
      else { sel.ref.rot = was; flashHint('برای چرخاندن جا نیست'); }
    }
  }
  clampAll(); touch(); syncInsp(); update3DSel();
}
function delSel() {
  if (!sel) return;
  if (sel.kind === 'spawn') {
    // the cat and the dog can be removed from the map right here
    if (sel.key === 'cat') { map.spawns.cat.on = false; $('catOn').checked = false; }
    else if (sel.key === 'dog') { map.spawns.dog.on = false; $('dogOn').checked = false; }
    select(null); touch();
    return;
  }
  const arr = sel.kind === 'obj' ? map.objects : sel.kind === 'rug' ? map.rugs : sel.kind === 'wall' ? map.walls : null;
  if (arr) { const i = arr.indexOf(sel.ref); if (i >= 0) arr.splice(i, 1); }
  select(null); touch();
}
function dupSel() {
  if (!sel || sel.kind === 'wall' || sel.kind === 'spawn') return;
  const cp = JSON.parse(JSON.stringify(sel.ref));
  cp.x = clampN(cp.x + map.tileSize, 0, W()); cp.y = clampN(cp.y + map.tileSize, 0, H());
  (sel.kind === 'obj' ? map.objects : map.rugs).push(cp);
  select({ kind: sel.kind, ref: cp }); touch();
}
$('iDel').onclick = delSel;
$('iDup').onclick = dupSel;
$('iRot').onclick = rotateSel;
// the rug ROUNDNESS row (built once, shown only for rugs)
(function roundRow() {
  const host = $('iRowW') && $('iRowW').parentElement;
  if (!host) return;
  const row = document.createElement('div');
  row.className = 'irow';
  row.id = 'iRowRound';
  row.innerHTML = '<label>گردی</label><input type="range" id="iRound" min="0" max="1" step="0.05"><span class="val" id="iRoundv"></span>';
  host.insertBefore(row, $('iColorRow'));
  $('iRound').oninput = () => {
    if (!sel || sel.kind !== 'rug') return;
    sel.ref.round = +$('iRound').value;
    $('iRoundv').textContent = sel.ref.round.toFixed(2);
    touch();
  };
})();

$('iW').oninput = () => { if (!sel) return; sel.ref.w = +$('iW').value; $('iWv').textContent = sel.ref.w.toFixed(2); clampAll(); touch(); };
$('iD').oninput = () => { if (!sel) return; sel.ref.d = +$('iD').value; $('iDv').textContent = sel.ref.d.toFixed(2); clampAll(); touch(); };
$('iColor').oninput = () => { if (sel) { sel.ref.color = $('iColor').value; touch(); } };
$('iColorReset').onclick = () => {
  if (!sel) return;
  let c;
  if (sel.kind === 'spawn') c = sel.key === 'cat' ? '#b5661e' : '#a06a2e';
  else if (sel.kind === 'rug') c = RUGS[sel.ref.kind === 'wet' ? 'wet' : 'rug'].color;
  else c = CATALOG[sel.ref.t].color;
  sel.ref.color = c; $('iColor').value = c; touch();
};
function syncInsp() {
  const el = $('insp');
  if (!sel) { el.style.display = 'none'; return; }
  el.style.display = 'flex';

  if (sel.kind === 'spawn') {
    const names = { red: 'شروع ربات قرمز', blue: 'شروع ربات آبی', cat: 'گربه', dog: 'سگ' };
    const ics = { red: 'robot', blue: 'robot', cat: 'paw', dog: 'bone' };
    $('iIcon').innerHTML = iconSvg(ics[sel.key], 21); $('iName').textContent = names[sel.key];
    $('iRowW').style.display = 'none'; $('iRowD').style.display = 'none';
    const pet = sel.key === 'cat' || sel.key === 'dog';
    $('iColorRow').style.display = pet ? 'flex' : 'none';   // the pets take any fur colour
    $('iSwRow').style.display = pet ? 'flex' : 'none';
    if (pet) $('iColor').value = sel.ref.color || (sel.key === 'cat' ? '#b5661e' : '#a06a2e');
    $('iRot').style.display = (sel.key === 'red' || sel.key === 'blue') ? '' : 'none';
    $('iDup').style.display = 'none';
    $('iDel').style.display = pet ? '' : 'none';
    return;
  }

  let def, icon, name;
  if (sel.kind === 'obj') { def = CATALOG[sel.ref.t]; icon = def.icon; name = def.fa; }
  else if (sel.kind === 'rug') {
    def = RUGS[sel.ref.kind] || RUGS.rug;
    // any rug resizes generously — select it and pull the sliders
    def = Object.assign({}, def, { min: [0.6, 0.6], max: [10, 8] });
    icon = def.icon; name = def.fa;
  }
  if ($('iRowRound')) {
    $('iRowRound').style.display = sel.kind === 'rug' ? '' : 'none';
    if (sel.kind === 'rug') { $('iRound').value = sel.ref.round || 0; $('iRoundv').textContent = (+(sel.ref.round || 0)).toFixed(2); }
  }
  else { def = { min: [WALL_T, WALL_T], max: [W(), H()] }; icon = 'wall'; name = 'دیوار'; }
  $('iIcon').innerHTML = iconSvg(icon, 21); $('iName').textContent = name;
  const isWall = sel.kind === 'wall';
  const isWin = sel.kind === 'obj' && sel.ref.t === 'window';
  const isRound = sel.kind === 'obj' && sel.ref.t === 'columnR';
  $('iRowW').style.display = ''; $('iRowD').style.display = (isWin || isRound) ? 'none' : '';
  $('iDel').style.display = '';
  $('iW').min = isWall ? WALL_T : def.min[0]; $('iW').max = isWall ? W() : def.max[0];
  $('iD').min = isWall ? WALL_T : def.min[1]; $('iD').max = isWall ? H() : def.max[1];
  $('iW').step = isWall ? map.tileSize / 2 : 0.05; $('iD').step = isWall ? map.tileSize / 2 : 0.05;
  $('iW').value = sel.ref.w; $('iD').value = sel.ref.d;
  $('iWv').textContent = (+sel.ref.w).toFixed(2); $('iDv').textContent = (+sel.ref.d).toFixed(2);
  $('iColorRow').style.display = isWall ? 'none' : 'flex';
  $('iSwRow').style.display = isWall ? 'none' : 'flex';
  $('iRot').style.display = (sel.kind === 'obj' && !isWin && !isRound) ? '' : 'none';
  $('iDup').style.display = isWall ? 'none' : '';
  if (!isWall) $('iColor').value = sel.ref.color || def.color;
}

/* ============================================================
   3D editor — the main view. Place, grab and drag objects right
   on the house, Sims-style. The same Engine+Renderer3D pair as
   the real match, so it is always WYSIWYG.
   ============================================================ */
let pre = null, preT;
let mode = localStorage.getItem('shl_mm_view') || '3d';
let editGrp = null, selLine = null, ghostMesh = null;
let drag3 = null;   // {kind, key?, ref, dx, dy, live: THREE.Group|null}

function ensurePre() {
  if (pre) return;
  pre = new Renderer3D($('pv3'));
  editGrp = new THREE.Group(); pre.scene.add(editGrp);
  const selGeo = new THREE.BufferGeometry();
  selGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(15), 3));
  selLine = new THREE.Line(selGeo, new THREE.LineBasicMaterial({ color: 0x4d8bff }));
  selLine.visible = false; editGrp.add(selLine);
  ghostMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.14, 1),
    new THREE.MeshBasicMaterial({ color: 0x4d8bff, transparent: true, opacity: 0.35, depthWrite: false }));
  ghostMesh.visible = false; editGrp.add(ghostMesh);
  wire3D();
}
function refresh3D() {
  clearTimeout(preT);
  preT = setTimeout(() => {
    // never rebuild mid-drag: it would swap out the very model being moved
    if (drag3) { refresh3D(); return; }
    try {
      ensurePre();
      const eng = new Engine({ map: JSON.parse(JSON.stringify(map)) });
      pre.buildScene(eng);
      pre.sync(eng);
      update3DSel();
    } catch (err) { console.error('preview:', err); }
  }, 200);
}
(function pvLoop() { if (pre) { pre.render(); place3DRotBtn(); } requestAnimationFrame(pvLoop); })();

// the floating ⟳ button that follows the 3-D selection (click = 90° turn)
function place3DRotBtn() {
  const btn = $('rot3d'); if (!btn) return;
  if (mode !== '3d' || !canRotate() || drag3) {
    btn.style.display = 'none'; return;
  }
  const f = sel.kind === 'spawn' ? { w: 0.72, d: 0.72 } : footprintOf(sel.ref, sel.kind);
  const v = new THREE.Vector3(-W() / 2 + sel.ref.x + f.w / 2 + 0.15, 0.95, -H() / 2 + sel.ref.y - f.d / 2 - 0.15);
  v.project(pre.camera);
  if (v.z > 1 || v.z < -1) { btn.style.display = 'none'; return; }
  const r = pre.renderer.domElement.getBoundingClientRect();
  const midR = $('mid').getBoundingClientRect();
  btn.style.display = 'flex';
  btn.style.left = ((v.x * 0.5 + 0.5) * r.width + (r.left - midR.left) - 18) + 'px';
  btn.style.top = ((-v.y * 0.5 + 0.5) * r.height + (r.top - midR.top) - 18) + 'px';
}

const _raycaster = new THREE.Raycaster();
const _floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.055);
const _hit3 = new THREE.Vector3();
function _ndcFromEvent(e) {
  const el = pre.renderer.domElement, r = el.getBoundingClientRect();
  const cx = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
  const cy = e.touches && e.touches.length ? e.touches[0].clientY : e.clientY;
  return { x: ((cx - r.left) / r.width) * 2 - 1, y: -((cy - r.top) / r.height) * 2 + 1 };
}
function simFromEvent(e) {
  if (!pre) return null;
  _raycaster.setFromCamera(_ndcFromEvent(e), pre.camera);
  if (!_raycaster.ray.intersectPlane(_floor, _hit3)) return null;
  const p = { x: _hit3.x + W() / 2, y: _hit3.z + H() / 2 };
  if (p.x < -0.6 || p.y < -0.6 || p.x > W() + 0.6 || p.y > H() + 0.6) return null;
  return p;
}
// pick against the REAL 3-D meshes, so clicking a wall's face or a tall
// fridge's top selects it — not whatever sits on the floor behind it
function pickPoint(e) {
  if (!pre || !pre.dyn) return simFromEvent(e);
  _raycaster.setFromCamera(_ndcFromEvent(e), pre.camera);
  const hits = _raycaster.intersectObjects(pre.dyn.children, true);
  if (hits.length) {
    const p = { x: hits[0].point.x + W() / 2, y: hits[0].point.z + H() / 2 };
    if (p.x >= -0.6 && p.y >= -0.6 && p.x <= W() + 0.6 && p.y <= H() + 0.6) return p;
  }
  return simFromEvent(e);
}
function footprintOf(it, kind) {
  if (kind === 'rug' || kind === 'wall') return { w: it.w, d: it.d };
  const w = it.rot % 2 ? it.d : it.w, d = it.rot % 2 ? it.w : it.d;
  return { w, d };
}
function update3DSel() {
  if (!pre || !selLine) return;
  if (!sel || mode !== '3d') { selLine.visible = false; return; }
  let cx, cy, w, d;
  if (sel.kind === 'spawn') { cx = sel.ref.x; cy = sel.ref.y; w = d = 0.74; }
  else { const f = footprintOf(sel.ref, sel.kind); cx = sel.ref.x; cy = sel.ref.y; w = f.w + 0.12; d = f.d + 0.12; }
  const ox = -W() / 2, oz = -H() / 2, y = 0.095;
  const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [-w / 2, -d / 2]];
  const arr = selLine.geometry.attributes.position.array;
  for (let i = 0; i < 5; i++) { arr[i * 3] = ox + cx + pts[i][0]; arr[i * 3 + 1] = y; arr[i * 3 + 2] = oz + cy + pts[i][1]; }
  selLine.geometry.attributes.position.needsUpdate = true;
  selLine.visible = true;
}
function update3DGhost(g) {
  if (!ghostMesh) return;
  if (!g || tool !== 'place' || !placeType || mode !== '3d') { ghostMesh.visible = false; return; }
  const def = CATALOG[placeType] || RUGS[placeType];
  const gw = def.win && g.rot % 2 ? def.d : def.w;
  const gd = def.win && g.rot % 2 ? def.w : def.d;
  ghostMesh.scale.set(gw, 1, gd);
  ghostMesh.position.set(-W() / 2 + g.x, 0.12, -H() / 2 + g.y);
  ghostMesh.visible = true;
}
function ghostWall3D() {
  const r = wallRect(wallDraw);
  ghostMesh.scale.set(r.w, 1, r.d);
  ghostMesh.position.set(-W() / 2 + r.x, 0.12, -H() / 2 + r.y);
  ghostMesh.visible = true;
}
// Find the live 3D model of a furniture item so it can be dragged for real.
// The engine stamps every model with the index of the map object it came from,
// so this matches exactly one model — counting by hand used to drift whenever
// the engine filtered a type out (windows, round columns) and then the WRONG
// object moved with the drag.
function furnitureGroupFor(item) {
  if (!pre || !pre.dyn) return null;
  const idx = map.objects.indexOf(item);
  if (idx < 0) return null;
  for (const ch of pre.dyn.children) if (ch.userData && ch.userData.srcIndex === idx) return ch;
  return null;
}
function liveMove3D() {
  if (!drag3 || !pre) return;
  const ox = -W() / 2, oz = -H() / 2;
  if (drag3.kind === 'spawn') {
    const m = drag3.key === 'red' ? pre.robotMeshes.red : drag3.key === 'blue' ? pre.robotMeshes.blue
      : drag3.key === 'cat' ? pre.catMesh : pre.dogMesh;
    if (m) { m.position.x = ox + drag3.ref.x; m.position.z = oz + drag3.ref.y; }
    return;
  }
  if (drag3.live) { drag3.live.position.x = ox + drag3.ref.x; drag3.live.position.z = oz + drag3.ref.y; return; }
  // rugs / walls / windows drag as a glowing footprint; the model lands on release
  const f = footprintOf(drag3.ref, drag3.kind);
  ghostMesh.scale.set(f.w, 1, f.d);
  ghostMesh.position.set(ox + drag3.ref.x, 0.12, oz + drag3.ref.y);
  ghostMesh.visible = true;
}
function wire3D() {
  const cont = $('pv3');
  const down = (e) => {
    if (mode !== '3d') return;
    const pFloor = simFromEvent(e);
    if (tool === 'place' && placeType) {
      if (!pFloor) return;
      e.stopPropagation(); e.preventDefault();
      placeAt(pFloor); update3DGhost(null);
      return;
    }
    if (tool === 'wall') {
      if (!pFloor) return;
      e.stopPropagation(); e.preventDefault();
      wallDraw = { x0: pFloor.x, y0: pFloor.y, x1: pFloor.x, y1: pFloor.y };
      ghostWall3D();
      return;
    }
    // selection: pick against the 3-D models themselves (walls, tall furniture…)
    const pPick = pickPoint(e);
    if (!pPick) return;                      // truly outside the board → camera orbit
    const pOff = pFloor || pPick;            // offset base, so dragging follows the mouse 1:1
    const spawnHit = hitSpawn(pPick);
    if (spawnHit) {
      e.stopPropagation(); e.preventDefault();
      select({ kind: 'spawn', key: spawnHit.key, ref: spawnHit.ref });
      drag3 = { kind: 'spawn', key: spawnHit.key, ref: spawnHit.ref, dx: spawnHit.ref.x - pOff.x, dy: spawnHit.ref.y - pOff.y, live: null };
      return;
    }
    const h = hitItem(pPick);
    if (h) {
      e.stopPropagation(); e.preventDefault();
      select(h);
      drag3 = {
        kind: h.kind, ref: h.ref, dx: h.ref.x - pOff.x, dy: h.ref.y - pOff.y,
        live: h.kind === 'obj' && h.ref.t !== 'window' ? furnitureGroupFor(h.ref) : null,
      };
      return;
    }
    select(null);                            // empty floor → let the camera orbit
  };
  cont.addEventListener('mousedown', down, true);
  cont.addEventListener('touchstart', down, { capture: true, passive: false });

  const move = (e) => {
    if (mode !== '3d') return;
    if (tool === 'place' && placeType && !drag3 && !wallDraw) {
      const p = simFromEvent(e); if (!p) { update3DGhost(null); return; }
      const def = CATALOG[placeType] || RUGS[placeType];
      update3DGhost(def.win ? snapToWall(p, def.w) : { x: snap(p.x), y: snap(p.y) });
      return;
    }
    if (wallDraw) { const p = simFromEvent(e); if (p) { wallDraw.x1 = p.x; wallDraw.y1 = p.y; ghostWall3D(); } return; }
    if (!drag3) return;
    const p = simFromEvent(e); if (!p) return;
    e.preventDefault();
    if (drag3.ref.t === 'window') Object.assign(drag3.ref, snapToWall({ x: p.x + drag3.dx, y: p.y + drag3.dy }, drag3.ref.w));
    else { moveTo(drag3, snap(p.x + drag3.dx), snap(p.y + drag3.dy)); }
    clampAll();
    liveMove3D();
    update3DSel();
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, { passive: false });

  const up = () => {
    if (mode !== '3d') return;
    if (wallDraw) {
      const r = wallRect(wallDraw);
      if (r.w > WALL_T || r.d > WALL_T) { map.walls.push(r); select({ kind: 'wall', ref: r }); }
      wallDraw = null;
    } else if (!drag3) return;
    if (ghostMesh) ghostMesh.visible = false;
    drag3 = null;
    touch();
  };
  window.addEventListener('mouseup', up);
  window.addEventListener('touchend', up);
}
let cam3 = 'free';   // '3d' camera preset: free orbit or straight top-down
function syncViewBtns() {
  $('sw3').classList.toggle('on', mode === '3d' && cam3 === 'free');
  $('swTop').classList.toggle('on', mode === '3d' && cam3 === 'top');
  $('sw2').classList.toggle('on', mode !== '3d');
}
// bird's-eye view: straight down, oriented like the 2-D plan — perfect for placing
function goTopView() {
  setMode('3d');
  cam3 = 'top'; syncViewBtns();
  if (!pre) return;
  const span = Math.max(W(), H());
  pre.tAz = Math.PI / 2; pre.tPol = 0.09;
  pre.tRad = Math.max(14, span * 1.75); pre.tFov = 36;
  pre.anim = true;
}
function goFreeView() {
  setMode('3d');
  cam3 = 'free'; syncViewBtns();
  if (!pre) return;
  const span = Math.max(1, Math.max(W(), H()) / 10);
  pre.tAz = Math.PI * 0.75; pre.tPol = 0.60;
  pre.tRad = 32 * span; pre.tFov = 22;
  pre.anim = true;
}
function setMode(m2) {
  mode = m2; localStorage.setItem('shl_mm_view', mode);
  syncViewBtns();
  $('cv').style.display = mode === '3d' ? 'none' : 'block';
  $('pv3').style.display = mode === '3d' ? 'block' : 'none';
  if (mode === '3d') { if (pre) pre._resize(); update3DSel(); }
  else draw();
  $('cvHint').textContent = mode === '3d'
    ? 'روی هرچی (حتی دیوار) کلیک کن: بکش = جابه‌جایی · Delete = حذف · R = چرخش · فلش‌ها = جابه‌جایی ریز · زمین خالی + درگ = دوربین'
    : 'کلیک = انتخاب · درگ = جابه‌جایی · R چرخش · Delete حذف · فلش‌ها = جابه‌جایی ریز';
}

/* ---------- "نقشه‌های من": build one, name it, keep it for good ---------- */
const nameBox = () => ($('mapName').value || '').trim();
const mapExists = (n) => Object.prototype.hasOwnProperty.call(savedMaps(), n);
// never silently write over someone else's map
const okOverwrite = (n) => !mapExists(n) || confirm(`یه نقشه به اسم «${n}» از قبل هست — روش نوشته بشه؟`);
// a name nobody is using yet: «خونه‌ی من», «خونه‌ی من ۲», …
function freeName(base) {
  let n = base, i = 2;
  while (mapExists(n)) n = base + ' ' + (i++);
  return n;
}
// the one line that tells you where your work stands
function mapState() {
  const st = $('mmState'), cn = $('curMapName'), cs = $('curMapState');
  if (!st) return;
  const typed = nameBox();
  if (!savedAs) {
    st.className = 'mmstate dirty';
    st.textContent = 'هنوز ذخیره نشده — یه اسم بذار و «ذخیره» رو بزن.';
    cn.textContent = typed || 'نقشه‌ی بی‌نام';
    cs.className = 'st dirty'; cs.textContent = '● ذخیره نشده';
  } else if (typed && typed !== savedAs) {
    st.className = 'mmstate dirty';
    st.textContent = `فعلاً به اسم «${savedAs}» ذخیره می‌شه — برای ثبت اسم تازه «ذخیره» رو بزن.`;
    cn.textContent = savedAs;
    cs.className = 'st dirty'; cs.textContent = '✎ اسم تازه ثبت نشده';
  } else {
    st.className = 'mmstate ok';
    st.textContent = `«${savedAs}» ذخیره‌ست — هر تغییری خودش ذخیره می‌شه.`;
    cn.textContent = savedAs;
    cs.className = 'st ok'; cs.textContent = '✓ ذخیره شد';
  }
}
function flashSaved(btn, label) {
  const was = btn.innerHTML;
  btn.innerHTML = '✅ ' + label;
  setTimeout(() => { btn.innerHTML = was; }, 1300);
}
$('mapName').value = map.name || '';
$('mapName').oninput = () => { map.name = nameBox(); mapState(); };
$('mapName').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); $('saveBtn').click(); } };

// SAVE — writes the open map onto the shelf under the name in the box. If the
// map was already saved and the name changed, that is a RENAME, not a copy.
$('saveBtn').onclick = () => {
  let name = nameBox();
  if (!name) {
    name = (prompt('اسم این نقشه چی باشه؟', freeName('خونه‌ی من')) || '').trim();
    if (!name) return;
  }
  if (savedAs && savedAs !== name) {
    if (!okOverwrite(name)) return;
    const all = savedMaps(); delete all[savedAs]; setSavedMaps(all);   // rename: the old name goes
  } else if (!savedAs && !okOverwrite(name)) return;
  map.name = name; $('mapName').value = name;
  setSavedAs(name); storeMap(name);
  touch();                                  // keep the draft's name in step
  flashSaved($('saveBtn'), 'ذخیره شد');
  renderSaved(); mapState();
};

// SAVE A COPY — keeps the original untouched and carries on editing the copy
$('saveAsBtn').onclick = () => {
  const sug = freeName(nameBox() || savedAs || 'خونه‌ی من');
  const name = (prompt('اسم نسخه‌ی تازه:', sug) || '').trim();
  if (!name || !okOverwrite(name)) return;
  map.name = name; $('mapName').value = name;
  setSavedAs(name); storeMap(name);
  touch();
  flashSaved($('saveAsBtn'), 'کپی شد');
  renderSaved(); mapState();
};

// NEW — an empty house that is on the shelf from its very first second, so
// nothing you build afterwards can be lost
$('newBtn').onclick = () => {
  const name = (prompt('اسم نقشه‌ی نو:', freeName('خونه‌ی من')) || '').trim();
  if (!name || !okOverwrite(name)) return;
  const lg = map.league;
  map = starterMap();
  map.league = lg; map.name = name;
  setSavedAs(name); storeMap(name);
  afterMapSwap(); leagueChip();
  renderSaved(); mapState();
};

function openSaved(n) {
  const all = savedMaps();
  if (!all[n]) return;
  map = Object.assign(starterMap(), JSON.parse(JSON.stringify(all[n])));
  map.name = n;
  setSavedAs(n);
  afterMapSwap();
  renderSaved(); mapState();
}
function renameSaved(n) {
  const to = (prompt(`اسم تازه برای «${n}»:`, n) || '').trim();
  if (!to || to === n || !okOverwrite(to)) return;
  const all = savedMaps();
  const m = all[n]; delete all[n];
  m.name = to; all[to] = m; setSavedMaps(all);
  if (savedAs === n) { setSavedAs(to); map.name = to; $('mapName').value = to; touch(); }
  renderSaved(); mapState();
}
function deleteSaved(n) {
  if (!confirm(`«${n}» برای همیشه حذف بشه؟`)) return;
  const all = savedMaps(); delete all[n]; setSavedMaps(all);
  if (savedAs === n) setSavedAs(null);      // the map stays open, just unsaved
  renderSaved(); mapState();
}
function renderSaved() {
  const all = savedMaps(), el = $('savedList');
  if (!el) return;
  el.innerHTML = '';
  const names = Object.keys(all).sort((a, b) => (all[b].savedAt || 0) - (all[a].savedAt || 0) || a.localeCompare(b, 'fa'));
  if ($('mmCount')) $('mmCount').textContent = names.length ? names.length + ' تا' : '';
  if (!names.length) {
    el.innerHTML = '<div class="empty">هنوز نقشه‌ای ذخیره نکردی — یه اسم بذار و «ذخیره» رو بزن</div>';
    return;
  }
  for (const n of names) {
    const row = document.createElement('div');
    row.className = 'mrow' + (n === savedAs ? ' cur' : '');
    const load = document.createElement('button');
    load.className = 'mload'; load.type = 'button';
    load.textContent = (n === savedAs ? '● ' : '🗺 ') + n;
    load.title = n === savedAs ? 'همینه که بازه' : `بازکردن «${n}»`;
    load.onclick = () => { if (n !== savedAs) openSaved(n); };
    const ren = document.createElement('button');
    ren.className = 'mic'; ren.type = 'button'; ren.title = 'تغییر اسم';
    ren.innerHTML = iconSvg('pencil', 14);
    ren.onclick = (e) => { e.stopPropagation(); renameSaved(n); };
    const del = document.createElement('button');
    del.className = 'mic del'; del.type = 'button'; del.title = 'حذف';
    del.innerHTML = iconSvg('trash', 14);
    del.onclick = (e) => { e.stopPropagation(); deleteSaved(n); };
    row.appendChild(load); row.appendChild(ren); row.appendChild(del);
    el.appendChild(row);
  }
}
$('clearBtn').onclick = () => {
  if (!confirm('همه‌ی وسایل، دیوارها و فرش‌ها پاک بشن؟ (سایز زمین و نقطه‌های شروع می‌مانند — با Ctrl+Z برمی‌گردد)')) return;
  snapshotNow();
  map.objects = []; map.walls = []; map.rugs = [];
  select(null); touch();
};
// ★ MAKE DEFAULT — stamp the open map as a division's official floor.
// Stored per browser (shl_defmap_<id>); the game lays it over the division
// at load. For the WHOLE PROJECT, export the JSON and paste it into the
// division's file under leagues/vacuum/maps/.
$('defaultBtn').onclick = () => {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,14,.85);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;direction:rtl';
  ov.innerHTML = '<div style="font:800 19px Vazirmatn,Tahoma,sans-serif;color:#fff">این نقشه دیفالتِ کدام رده شود؟</div>' +
    '<div style="font:12.5px Vazirmatn,Tahoma,sans-serif;color:#9aa3af;max-width:460px;text-align:center;line-height:1.9">' +
    'در این مرورگر برای همیشه جای نقشه‌ی رسمی آن رده می‌نشیند.<br>' +
    'برای دائمی‌شدن در خودِ پروژه: «خروجی JSON» بگیر و محتوایش را در فایل آن نقشه زیر <b>leagues/vacuum/maps/</b> بگذار.</div>';
  const rowEl = document.createElement('div');
  rowEl.style.cssText = 'display:flex;gap:10px';
  for (const [id, fa] of [['fs', 'FS فرست استپ'], ['u14', 'U14'], ['u19', 'U19'], ['', 'هیچ‌کدام — بازگرداندن دیفالت‌ها']]) {
    const b = document.createElement('button');
    b.style.cssText = 'font:700 14px Vazirmatn,Tahoma,sans-serif;padding:12px 18px;border-radius:12px;border:1px solid #333c4d;background:#171b24;color:#e8eaed;cursor:pointer';
    b.textContent = fa;
    b.onclick = () => {
      try {
        if (!id) { ['fs', 'u14', 'u19'].forEach((k) => localStorage.removeItem('shl_defmap_' + k)); }
        else localStorage.setItem('shl_defmap_' + id, JSON.stringify(map));
      } catch (e) { alert('حافظه‌ی مرورگر جا نداشت'); }
      ov.remove();
      mapState && mapState();
    };
    rowEl.appendChild(b);
  }
  ov.appendChild(rowEl);
  const x = document.createElement('button');
  x.textContent = 'انصراف';
  x.style.cssText = 'font:700 13px Vazirmatn,Tahoma,sans-serif;padding:8px 16px;border-radius:10px;border:0;background:none;color:#9aa3af;cursor:pointer';
  x.onclick = () => ov.remove();
  ov.appendChild(x);
  document.body.appendChild(ov);
};

$('exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify(map, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (map.name || 'map') + '.json';
  // the link must LIVE in the page and the URL must outlive the click —
  // revoking immediately is what made downloads flaky
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
$('importBtn').onclick = () => $('importFile').click();
$('importFile').onchange = () => {
  const f = $('importFile').files[0]; if (!f) return;
  f.text().then((txt) => {
    try {
      const m = JSON.parse(txt);
      if (!m || !m.cols || !m.rows) throw new Error('bad');
      map = Object.assign(starterMap(), m);
      setSavedAs(null);            // an imported file is a new map until you save it
      afterMapSwap();
    } catch (err) { alert('فایل JSON معتبر نیست'); }
    $('importFile').value = '';
  });
};
$('playBtn').onclick = () => {
  localStorage.setItem('shl_play_map', JSON.stringify(map));
  // land in the map's OWN league and select this exact map for the match —
  // never the default house
  window.open('index.html?playmap=1' + (map.league ? '&league=' + encodeURIComponent(map.league) : ''), '_blank');
};
// upload the map to the site so EVERYONE sees it in the game's map list.
// The server only accepts this from a logged-in admin (shl_session cookie).
$('uploadBtn').onclick = async () => {
  const name = (map.name || '').trim() || prompt('اسم نقشه برای آپلود:');
  if (!name) return;
  map.name = name; $('mapName').value = name;
  try {
    const r = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, map }),
    });
    if (r.status === 401) { alert('آپلود فقط برای ادمین‌هاست!\nاول از صفحه‌ی /admin وارد شو، بعد دوباره امتحان کن.'); return; }
    if (!r.ok) { const j = await r.json().catch(() => ({})); alert('آپلود نشد: ' + (j.error || r.status)); return; }
    alert('✅ نقشه‌ی «' + name + '» آپلود شد — الان توی لیست نقشه‌های بازی برای همه نمایش داده می‌شه.');
  } catch (err) { alert('خطا در ارتباط با سرور'); }
};
function afterMapSwap() {
  sel = null; ghost = null; wallDraw = null;
  leagueChip();
  $('mapName').value = map.name || '';
  $('bCols').value = map.cols; $('bRows').value = map.rows; $('bTile').value = String(map.tileSize);
  $('catOn').checked = map.spawns.cat.on !== false; $('dogOn').checked = map.spawns.dog.on !== false;
  clampAll(); syncInsp(); touch();
  mapState();
}

/* ---------- boot ---------- */
// quick colour swatches — one click recolours the selected object, Sims-style
const SWATCHES = ['#c0392b', '#e07b39', '#d4a017', '#2f7d4a', '#2980b9', '#8a4fd8', '#8e5a3a', '#5b6675', '#eef1f3', '#241f26'];
for (const c of SWATCHES) {
  const b = document.createElement('button');
  b.style.background = c; b.title = c;
  b.onclick = () => {
    if (!sel || sel.kind === 'wall') return;
    if (sel.kind === 'spawn' && sel.key !== 'cat' && sel.key !== 'dog') return;   // robots keep team colours
    sel.ref.color = c; $('iColor').value = c; touch();
  };
  $('iSwatches').appendChild(b);
}
document.querySelectorAll('[data-ic]').forEach((el) => { el.innerHTML = iconSvg(el.dataset.ic, el.closest('.logo') ? 20 : 15); });
$('themeBtn').onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(); draw(); };
$('sw3').onclick = goFreeView;
$('swTop').onclick = goTopView;
$('sw2').onclick = () => setMode('2d');
if (new URLSearchParams(location.search).get('view') === 'top') setTimeout(goTopView, 450);
$('rot3d').onclick = (e) => { e.stopPropagation(); rotateSel(); };
applyTheme();
window.addEventListener('resize', draw);
clampAll(); snapshotNow(); draw(); refresh3D(); warns(); setMode(mode);
leagueChip(); leaguePick();                 // league-first: a fresh map picks its league before building
renderSaved(); mapState();                  // the shelf of saved maps, and where this one stands
