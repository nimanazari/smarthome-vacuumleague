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
6. کف خیس فقط U14/U19 (FS در `fs/rules.js` خشک می‌شود)، جفتِ آینه‌ای و
   کاشی‌چین. *Wet pair mirrored + tile-aligned; FS auto-dried.*
7. `rooms:` برای هر اتاق شماره داشته باشد: ۰ هال · ۱ آشپزخانه ·
   ۲/۳/۴ خواب‌ها · ۵ سرویس.
8. بعد از ساخت: `node tools/validate-map.js <NAME>` — همه‌ی اتاق‌ها باید
   ۱۰۰٪ قابل‌دسترس باشند (درِ بسته «عبوری» حساب می‌شود چون با هل باز
   می‌شود).

نقشه‌ی مرجعِ همین استاندارد: [`standard.js`](standard.js)
(«خانه‌ی استاندارد» در منوی نقشه‌ها).
