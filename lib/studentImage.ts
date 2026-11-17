import { DURATION_MIN, TR_MONTHS } from "./utils";
import { TUTOR_NAME, TUTOR_TITLE, TUTOR_PHONE, monthTitle } from "./export";
import { TZ_OPTIONS, addMinutes, convertFromIstanbul, type TzOption } from "./timezones";
import type { LessonRow } from "./data";

// Öğrenciye WhatsApp'tan gönderilecek ders programı resmi. Veli PDF'inin
// öğrenci sürümüdür: ÜCRET YOK, saatler öğrencinin ülkesinin saatine çevrilir.

const W = 720; // mantıksal genişlik (px); çıktı SCALE ile büyütülür
const SCALE = 2;
const MARGIN = 36;
const FONT = "RobotoImg";

let fontsReady: Promise<void> | null = null;
function loadFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = (async () => {
      const faces = [
        new FontFace(FONT, "url(/fonts/Roboto-Regular.ttf)", { weight: "400" }),
        new FontFace(FONT, "url(/fonts/Roboto-Bold.ttf)", { weight: "700" }),
      ];
      await Promise.all(faces.map((f) => f.load()));
      faces.forEach((f) => document.fonts.add(f));
    })().catch((e) => {
      fontsReady = null; // bir dahaki denemede tekrar yüklensin
      throw e;
    });
  }
  return fontsReady;
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}



export async function renderStudentImage(rows: LessonRow[], monthText: string, studentName: string, tz: TzOption): Promise<Blob> {
  await loadFonts();

  const slots = rows.map((r) => {
    const start = convertFromIstanbul(r.lesson_date, r.lesson_time, tz);
    const [, mo, da] = start.date.split("-").map(Number);
    return {
      dateLabel: `${da} ${TR_MONTHS[mo - 1]}`,
      weekday: start.weekday,
      timeLabel: `${start.time} – ${addMinutes(start.time, DURATION_MIN)}`,
      subject: r.subject || "",
      abbr: start.abbr,
    };
  });
  // Ay içinde yaz/kış saati geçişi varsa kısaltma değişebilir (örn. BST / GMT)
  const abbrs = Array.from(new Set(slots.map((s) => s.abbr).filter(Boolean)));

  const HEADER_H = 46;
  const ROW_H = 56;
  const TOP_BLOCK_H = 190;
  const NOTE_H = 46;
  const FOOT_H = 84;
  const tableH = HEADER_H + slots.length * ROW_H;
  const H = TOP_BLOCK_H + NOTE_H + 24 + tableH + FOOT_H;

  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";

  // Arka plan
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Sağ üst: öğretmen bilgisi (PDF ile aynı)
  ctx.textAlign = "right";
  ctx.fillStyle = "#141414";
  ctx.font = `700 17px ${FONT}`;
  ctx.fillText(TUTOR_NAME, W - MARGIN, 46);
  ctx.fillStyle = "#5a5a5a";
  ctx.font = `400 14px ${FONT}`;
  ctx.fillText(TUTOR_TITLE, W - MARGIN, 68);
  ctx.fillText(TUTOR_PHONE, W - MARGIN, 88);

  // Başlık
  ctx.textAlign = "center";
  ctx.fillStyle = "#141414";
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText(fit(ctx, studentName, W - 2 * MARGIN), W / 2, 146);
  ctx.fillStyle = "#2f4fb8";
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(`${monthTitle(monthText)} Ders Programı`, W / 2, 180);

  // Saat dilimi notu
  const noteY = TOP_BLOCK_H;
  ctx.fillStyle = "#eef3ff";
  roundRect(ctx, MARGIN, noteY, W - 2 * MARGIN, NOTE_H, 12);
  ctx.fill();
  ctx.fillStyle = "#1f3a8a";
  ctx.font = `700 17px ${FONT}`;
  const abbrText = abbrs.length ? ` (${abbrs.join(" / ")})` : "";
  ctx.fillText(`Saatler ${tz.place} saatine göredir${abbrText}`, W / 2, noteY + 29);

  // Tablo
  const tableX = MARGIN;
  const tableW = W - 2 * MARGIN;
  const tableY = noteY + NOTE_H + 24;
  const cols = [
    { title: "Tarih", w: 150 },
    { title: "Gün", w: 150 },
    { title: "Saat", w: 190 },
    { title: "Ders", w: tableW - 150 - 150 - 190 },
  ];
  const colX: number[] = [];
  cols.reduce((x, c) => (colX.push(x), x + c.w), tableX);
  const PAD = 16;

  ctx.fillStyle = "#e8e8e8";
  roundRect(ctx, tableX, tableY, tableW, HEADER_H, 10);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.fillStyle = "#141414";
  ctx.font = `700 18px ${FONT}`;
  cols.forEach((c, i) => ctx.fillText(c.title, colX[i] + PAD, tableY + 30));

  slots.forEach((s, idx) => {
    const y = tableY + HEADER_H + idx * ROW_H;
    if (idx % 2 === 1) {
      ctx.fillStyle = "#f7f7f7";
      ctx.fillRect(tableX, y, tableW, ROW_H);
    }
    const base = y + 35;
    ctx.fillStyle = "#141414";
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(s.dateLabel, colX[0] + PAD, base);
    ctx.font = `400 22px ${FONT}`;
    ctx.fillText(s.weekday, colX[1] + PAD, base);
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(s.timeLabel, colX[2] + PAD, base);
    ctx.font = `400 20px ${FONT}`;
    ctx.fillStyle = "#3d3d3d";
    ctx.fillText(fit(ctx, s.subject, cols[3].w - PAD * 2), colX[3] + PAD, base);
  });

  // Alt not
  ctx.textAlign = "center";
  ctx.fillStyle = "#5a5a5a";
  ctx.font = `400 16px ${FONT}`;
  ctx.fillText("Bu gün ve saatler size uygun mu? Uymayan bir ders varsa lütfen yazın.", W / 2, H - 36);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Resim oluşturulamadı"))), "image/png")
  );
}

/** Resmi üretir, indirir ve (tarayıcı izin verirse) panoya da kopyalar:
 *  WhatsApp Web / Masaüstü'nde sohbete doğrudan Ctrl+V ile yapıştırılabilir. */
export async function exportStudentImage(
  rows: LessonRow[],
  monthText: string,
  studentName: string,
  tzKey: string
): Promise<{ copied: boolean }> {
  const tz = TZ_OPTIONS.find((o) => o.key === tzKey) || TZ_OPTIONS[0];
  const blob = await renderStudentImage(rows, monthText, studentName, tz);

  const safe = (v: string) => v.replace(/[^a-zA-Z0-9ğüşöçİĞÜŞÖÇı _-]/g, "_").replace(/ /g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe(studentName)}_${monthText}_Ders_Programi_${tz.key}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  let copied = false;
  try {
    if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      copied = true;
    }
  } catch {
    copied = false;
  }
  return { copied };
}
