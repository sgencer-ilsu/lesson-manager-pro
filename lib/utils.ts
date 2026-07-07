Utils · TS
export const APP_NAME = "S.GENCER DERS TAKİP";
export const APP_VERSION = "Web 1.0";
export const DURATION_MIN = 90;
export const COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#ea580c",
  "#dc2626", "#0891b2", "#a21caf", "#ca8a04",
];
 
export const TR_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
export const TR_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
 
export function money(x: number | null | undefined): string {
  const n = Math.round(Number(x) || 0);
  return n.toLocaleString("tr-TR") + " TL";
}
 
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
 
export function monthKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
 
// Pazartesi = 0 ... Pazar = 6 (Python weekday() ile aynı mantık)
export function isoWeekday(d: Date): number {
  const day = d.getDay(); // Sun=0..Sat=6
  return (day + 6) % 7;
}
 
export function mondayOf(d: Date): Date {
  const wd = isoWeekday(d);
  const res = new Date(d);
  res.setDate(res.getDate() - wd);
  res.setHours(0, 0, 0, 0);
  return res;
}
 
export function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}
 
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
 
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
 
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
 
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
 
export function addMinutesToTime(t: string, minutes: number): string {
  return minutesToTime(timeToMinutes(t) + minutes);
}
 
export function formatMoneyInputValue(n: number): string {
  if (!n) return "";
  return Number.isInteger(n) ? String(n) : String(n);
}
 
/** "2026-07" -> ["2026-07-01", "2026-08-01") aralığı. `date` tipi sütunlarda
 *  LIKE kullanılamadığı için ay filtrelemesi bu aralıkla yapılır. */
export function monthRange(monthText: string): { start: string; end: string } {
  const [y, m] = monthText.split("-").map(Number);
  const start = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const end = `${String(nextY).padStart(4, "0")}-${String(nextM).padStart(2, "0")}-01`;
  return { start, end };
}
 
