import { money, TR_MONTHS } from "./utils";
import type { LessonRow } from "./data";

function statusText(r: LessonRow) {
  return r.row_type === "planned" ? "Planlandı" : r.paid ? "Ödendi" : "Ödenmedi";
}

export function exportCSV(rows: LessonRow[], filename = "ders_raporu.csv") {
  const header = ["Tarih", "Saat", "Öğrenci", "Okul", "Ders", "Konu", "Tutar", "Durum"];
  const lines = [header.join(";")];
  for (const r of rows) {
    const vals = [r.lesson_date, r.lesson_time, r.name, r.school, r.subject, r.topic, money(r.fee), statusText(r)];
    lines.push(vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
  }
  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function monthTitle(monthText: string) {
  const [y, m] = monthText.split("-");
  const idx = parseInt(m, 10) - 1;
  return TR_MONTHS[idx] ? `${TR_MONTHS[idx]} ${y}` : monthText;
}

export async function exportPDF(rows: LessonRow[], monthText: string, studentName: string | null) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const title = studentName ? `${studentName} ${monthTitle(monthText)} Ayı Ders Raporu` : `${monthTitle(monthText)} Ayı Ders Raporu`;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 14, { align: "center" });

  autoTable(doc, {
    startY: 20,
    head: [["Tarih", "Saat", "Öğrenci", "Okul", "Ders", "Konu", "Tutar", "Durum"]],
    body: rows.map((r) => [r.lesson_date, r.lesson_time, r.name, r.school, r.subject, r.topic, money(r.fee), statusText(r)]),
    styles: { fontSize: 9, cellPadding: 2.2 },
    headStyles: { fillColor: [217, 217, 217], textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [251, 251, 251] },
  });

  const safe = (v: string) => v.replace(/[^a-zA-Z0-9ğüşöçİĞÜŞÖÇı _-]/g, "_").replace(/ /g, "_");
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const filename = `${safe(studentName || "Tum_Ogrenciler")}_${safe(monthTitle(monthText))}_Ders_Raporu_${stamp}.pdf`;
  doc.save(filename);
}
