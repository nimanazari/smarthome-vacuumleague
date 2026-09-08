# استاندارد ساخت نقشه · The Map-Building Standard

هر نقشه‌ی رسمی این لیگ با این چک‌لیست ساخته و با
`node tools/validate-map.js <NAME>` تأیید می‌شود.
Every official map follows this checklist and passes the validator.

## چک‌لیست · the checklist

1. **مبلمان به دیوار** — تخت، کمد، دراور، کابینت: پشتشان به دیوار بچسبد،
   پشت‌خالی ممنوع. *Furniture backs against walls — no floating beds.*
2. **ترکیب اتاق‌ها**: ۳ اتاق خواب + آشپزخانه + پذیرایی + سرویس بهداشتی.
   پذیرایی حتماً **تلویزیون + مبل روبه‌رویش**. *3 bedrooms + kitchen +
   living room (TV **with** a sofa facing it) + bathroom.*
3. **فقط یک اتاق در دارد** (آبجکت `door` — هل بدهی باز می‌شود) و
   room-number آن اتاق باید در راهنما/اسم اتاق معلوم باشد تا برنامه‌ی
   ربات هدف بگیرد. بقیه‌ی اتاق‌ها **بی‌در، با ورودی بزرگ** (≥ ۳ کاشی).
   *Exactly ONE room has the push-open door; every other doorway is wide
   open (≥ 3 tiles).*
4. **فرش‌های نشانه جلوی ورودی‌ها همه یک رنگ** (purple) و فقط در نقشه‌ی
   FS و U14 حضور دارند — **U19 بدون فرش نشانه** بازی می‌کند (فیلتر در
   `u19/rules.js`؛ با GPS می‌رود). *Marker rugs: one colour, FS/U14 only;
   U19 plays them filtered out.*
5. **فرش وسط پذیرایی رنگ متفاوت + کندکننده** (`kind: 'green'`).
   *The living-room rug is a different colour and slows the robot.*
6. کف خیس دیگر در هیچ رده‌ای نیست — هر سه رده لکه‌ها را از نقشه‌ی خود فیلتر می‌کنند، و
   کاشی‌چین. *Wet pair mirrored + tile-aligned; FS auto-dried.*
7. `rooms:` برای هر اتاق شماره داشته باشد: ۰ هال · ۱ آشپزخانه ·
   ۲/۳/۴ خواب‌ها · ۵ سرویس.
8. بعد از ساخت: `node tools/validate-map.js <NAME>` — همه‌ی اتاق‌ها باید
   ۱۰۰٪ قابل‌دسترس باشند (درِ بسته «عبوری» حساب می‌شود چون با هل باز
   می‌شود).

نقشه‌ی مرجعِ همین استاندارد: [`standard.js`](standard.js)
(«خانه‌ی استاندارد» در منوی نقشه‌ها).

پنج خانه‌ی دیگر به همین استاندارد ولی با پلان کاملاً متفاوت — تا برنامه‌ای که
فقط یک خانه را حفظ کرده لو برود (در همه‌شان اتاقِ دردار `room == 2` است):
*Five more houses to the same standard, each with its own floor plan; the
doored room is `room == 2` in all of them.* این نقشه‌ها فقط در کیت برگزارکننده‌اند
(`organizer-only/maps/`, راهنما همان‌جا) و با `node tools/validate-map.js map1` چک می‌شوند.

| نقشه · map | فایل | پلان |
|---|---|---|
| خانه‌ی راهرودار · Corridor (درها باز) | `organizer-only/maps/map1/map.json` | پذیرایی راهرویی وسط، سه خواب کنار هم در شمال، آشپزخانه/سرویس در جنوب |
| خانه‌ی ویلایی · Villa | `organizer-only/maps/map2/map.json` | پذیرایی L شکل جنوب‌غرب + راهروی شرقی، سه خواب روی هم کنار دیوار شرقی |
| خانه‌ی حیاط‌مرکزی · Courtyard | `organizer-only/maps/map3/map.json` | پذیرایی مربعی وسط، اتاق‌ها دورش، فویه‌ی جنوب‌شرقی |
| خانه‌ی باغی · Garden (ورودی ۴ کاشی) | `organizer-only/maps/map4/map.json` | پذیرایی بزرگ شمال‌شرق، دو خواب در غرب، سرویس/فویه/آشپزخانه/خواب در جنوب |
| خانه‌ی پهن · Wide (ورودی ۴–۵ کاشی) | `organizer-only/maps/map5/map.json` | نوار پذیرایی وسط، سرویس/خواب/آشپزخانه در شمال، دو خواب در گوشه‌های جنوب |
