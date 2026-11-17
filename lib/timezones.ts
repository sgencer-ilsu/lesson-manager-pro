import { TR_DAYS } from "./utils";

/** Öğrenciye gönderilen ders programı resmi için seçilebilen saat dilimleri.
 *  Yeni ülke eklemek için bu listeye bir satır eklemek yeterli.
 *  `zone`: IANA saat dilimi adı (yaz/kış saati geçişlerini otomatik uygular).
 *  `place`: resimdeki "… saatine göredir" cümlesinde geçen yer adı. */
export type TzOption = { key: string; label: string; zone: string; place: string; locale: string };

export const TZ_OPTIONS: TzOption[] = [
  { key: "TR", label: "Türkiye (çevirme yok)", zone: "Europe/Istanbul", place: "Türkiye", locale: "en-GB" },
  { key: "UK", label: "Birleşik Krallık", zone: "Europe/London", place: "İngiltere", locale: "en-GB" },
  { key: "NL", label: "Hollanda", zone: "Europe/Amsterdam", place: "Hollanda", locale: "en-GB" },
  { key: "US-NY", label: "ABD – New York (Doğu)", zone: "America/New_York", place: "New York (ABD Doğu)", locale: "en-US" },
  { key: "US-CHI", label: "ABD – Chicago (Merkez)", zone: "America/Chicago", place: "Chicago (ABD Merkez)", locale: "en-US" },
  { key: "US-LA", label: "ABD – Los Angeles (Batı)", zone: "America/Los_Angeles", place: "Los Angeles (ABD Batı)", locale: "en-US" },
];

// Uygulamadaki tüm ders saatleri Türkiye saatiyle girilir. Türkiye 2016'dan
// beri sabit UTC+3 kullanıyor (yaz saati uygulaması yok).
const ISTANBUL_OFFSET_MIN = 180;

export type ConvertedSlot = {
  date: string; // YYYY-MM-DD (hedef saat dilimindeki tarih; gece yarısı geçilirse kayabilir)
  time: string; // HH:MM
  weekday: string; // Türkçe gün adı, hedef tarihe göre
  abbr: string; // GMT, BST, CET, EST ...
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Türkiye saatiyle verilen tarih + saati hedef saat dilimine çevirir. */
export function convertFromIstanbul(dateISO: string, time: string, opt: TzOption): ConvertedSlot {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = time.slice(0, 5).split(":").map(Number);
  const instant = new Date(Date.UTC(y, m - 1, d, hh, mm) - ISTANBUL_OFFSET_MIN * 60000);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: opt.zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const ty = get("year"), tm = get("month"), td = get("day"), th = get("hour"), tmin = get("minute");

  const abbr =
    new Intl.DateTimeFormat(opt.locale, { timeZone: opt.zone, timeZoneName: "short" })
      .formatToParts(instant)
      .find((p) => p.type === "timeZoneName")?.value || "";

  const dow = new Date(Date.UTC(ty, tm - 1, td)).getUTCDay(); // 0 = Pazar
  return {
    date: `${ty}-${pad(tm)}-${pad(td)}`,
    time: `${pad(th)}:${pad(tmin)}`,
    weekday: TR_DAYS[(dow + 6) % 7],
    abbr,
  };
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
