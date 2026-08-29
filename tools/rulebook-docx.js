/* ============================================================
   tools/rulebook-docx.js — the rulebook as an editable Word file.

   The rulebook lives as HTML and prints to PDF, which is fine to read and
   impossible to edit. This builds the same document as a .docx: the same
   text, the same tables, and the same seven figures — the figures pulled
   straight out of the page that draws them, so they are never a version
   behind the rules they illustrate.

     node tools/rulebook-docx.js <blocks.json> <figures-dir> <out.docx> [fa|en]

   Persian is written right-to-left throughout: every paragraph carries the
   bidi flag and every run is marked RTL, because Word will otherwise lay a
   Persian sentence out left-to-right and put the full stop at the wrong end.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  PageBreak, LevelFormat, Footer, PageNumber, convertInchesToTwip,
} = require('docx');

const [, , SRC, FIGS, OUT, LANGARG] = process.argv;
const LANG = LANGARG || 'fa';
const RTL = LANG === 'fa';
const blocks = JSON.parse(fs.readFileSync(SRC, 'utf8'));

/* Persian needs a font with Arabic-script glyphs that is actually PRESENT on
   the reader's machine. Vazirmatn is the league's own face and is named
   first; Tahoma ships with every Windows and is the fallback Word reaches
   for, so a reader without Vazirmatn still sees correct Persian rather than
   boxes. */
const FONT = RTL ? 'Vazirmatn' : 'Calibri';
const MONO = 'Consolas';
const INK = '1a2230';
const MUTED = '5a6675';
const ACCENT = '20437e';
const RULE = 'd4dbe6';

const T = (fa, en) => (RTL ? fa : en);

// ---- inline runs, carrying the bold and code marks the rulebook uses ----
function mk(runs, opts) {
  const o = opts || {};
  return (runs || []).map((r) => new TextRun({
    text: r.t,
    bold: !!r.b || !!o.bold,
    font: r.c ? MONO : (o.font || FONT),
    size: o.size || 21,
    color: o.color || INK,
    rightToLeft: RTL && !r.c,      // code is latin: never mirror it
    shading: r.c ? { type: ShadingType.CLEAR, fill: 'eef2f8' } : undefined,
  }));
}

const para = (runs, o) => new Paragraph(Object.assign({
  children: mk(runs, o),
  bidirectional: RTL,
  alignment: (o && o.align) || (RTL ? AlignmentType.RIGHT : AlignmentType.LEFT),
  spacing: { after: (o && o.after) != null ? o.after : 120, line: 300 },
}, (o && o.extra) || {}));

// ---- the figures, sized to the page ----
const PAGE_W_IN = 6.3;                       // A4 minus one-inch margins
function figure(id) {
  const file = path.join(FIGS, id + '.png');
  if (!fs.existsSync(file)) return null;
  const buf = fs.readFileSync(file);
  // read the PNG header for the true pixel size, so nothing is squashed
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const outW = PAGE_W_IN * 96;
  return new Paragraph({
    children: [new ImageRun({
      type: 'png', data: buf,
      transformation: { width: Math.round(outW), height: Math.round(outW * h / w) },
    })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 60 },
  });
}

// ---- tables: dual widths, as Word insists ----
function table(rows) {
  const cols = Math.max.apply(null, rows.map((r) => r.c.length));
  const total = convertInchesToTwip(PAGE_W_IN);
  const widths = [];
  for (let i = 0; i < cols; i++) widths.push(Math.floor(total / cols));
  widths[cols - 1] = total - widths.slice(0, cols - 1).reduce((a, b) => a + b, 0);

  return new Table({
    columnWidths: widths,
    width: { size: total, type: WidthType.DXA },
    visuallyRightToLeft: RTL,
    rows: rows.map((r) => new TableRow({
      tableHeader: !!r.head,
      children: r.c.map((cell, i) => new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        shading: r.head ? { type: ShadingType.CLEAR, fill: 'eaf0fa' } : undefined,
        margins: { top: 80, bottom: 80, left: 110, right: 110 },
        children: [para(cell, {
          bold: !!r.head, size: 19, after: 0,
          align: RTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
        })],
      })),
    })),
  });
}

// ---- walk the blocks, in the order the rulebook has them ----
const kids = [];
for (const b of blocks) {
  switch (b.k) {
    case 'title':
      kids.push(new Paragraph({
        children: mk(b.r, { size: 52, bold: true, color: ACCENT, font: 'Calibri' }),
        alignment: AlignmentType.CENTER, spacing: { before: 900, after: 80 },
      }));
      break;
    case 'subtitle':
      kids.push(new Paragraph({
        children: mk(b.r, { size: 26, color: MUTED }),
        alignment: AlignmentType.CENTER, bidirectional: RTL, spacing: { after: 60 },
      }));
      break;
    case 'author':
      kids.push(new Paragraph({
        children: mk(b.r, { size: 20, color: MUTED, font: 'Calibri' }),
        alignment: AlignmentType.CENTER, spacing: { after: 500 },
      }));
      break;
    case 'h1':
      kids.push(new Paragraph({
        children: mk(b.r, { size: 30, bold: true, color: ACCENT }),
        heading: HeadingLevel.HEADING_1, bidirectional: RTL,
        alignment: RTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 380, after: 130 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 6 } },
      }));
      break;
    case 'h2':
      kids.push(new Paragraph({
        children: mk(b.r, { size: 24, bold: true }),
        heading: HeadingLevel.HEADING_2, bidirectional: RTL,
        alignment: RTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 260, after: 90 },
      }));
      break;
    case 'p':
      kids.push(para(b.r));
      break;
    case 'note':
    case 'formula':
      kids.push(new Paragraph({
        children: mk(b.r, b.k === 'formula'
          ? { font: MONO, size: 19, color: ACCENT } : { size: 20, color: MUTED }),
        bidirectional: RTL && b.k !== 'formula',
        alignment: b.k === 'formula' ? AlignmentType.CENTER
          : (RTL ? AlignmentType.RIGHT : AlignmentType.LEFT),
        spacing: { before: 100, after: 140 },
        shading: { type: ShadingType.CLEAR, fill: 'f4f7fc' },
        border: {
          left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 8 },
          top: { style: BorderStyle.SINGLE, size: 2, color: RULE, space: 6 },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: RULE, space: 6 },
          right: { style: BorderStyle.SINGLE, size: 2, color: RULE, space: 6 },
        },
      }));
      break;
    case 'caption':
      kids.push(new Paragraph({
        children: mk(b.r, { size: 18, color: MUTED }),
        alignment: AlignmentType.CENTER, bidirectional: RTL,
        spacing: { after: 240 },
      }));
      break;
    case 'figure': {
      const f = figure(b.id);
      if (f) kids.push(f);
      break;
    }
    case 'list':
      b.items.forEach((it) => {
        kids.push(new Paragraph({
          children: mk(it),
          bidirectional: RTL,
          alignment: RTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
          numbering: { reference: b.ordered ? 'rb-num' : 'rb-bul', level: 0 },
          spacing: { after: 70, line: 290 },
        }));
      });
      break;
    case 'table':
      kids.push(table(b.rows));
      kids.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      break;
    default:
      break;
  }
}

const doc = new Document({
  creator: 'Smart Home League',
  title: T('کتابچه‌ی رسمی قوانین — لیگ خانه‌ی هوشمند', 'Official Rulebook — Smart Home League'),
  description: T('متن کامل قوانین به‌همراه تصویرها', 'The complete rules, with the figures'),
  styles: {
    default: {
      document: { run: { font: FONT, size: 21, color: INK } },
    },
  },
  numbering: {
    config: [
      {
        reference: 'rb-bul',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: RTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 400, hanging: 220 } } },
        }],
      },
      {
        reference: 'rb-num',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: RTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 400, hanging: 220 } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: { margin: { top: 1100, bottom: 1100, left: 1100, right: 1100 } },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            children: ['Smart Home League  ·  ', PageNumber.CURRENT],
            size: 17, color: MUTED, font: 'Calibri',
          })],
        })],
      }),
    },
    children: kids,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log('wrote ' + OUT + '  (' + buf.length + ' bytes, ' + kids.length + ' blocks)');
});
