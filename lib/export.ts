import { money, TR_MONTHS } from "./utils";
import type { LessonRow } from "./data";

const TUTOR_NAME = "Serdar Gençer";
const TUTOR_TITLE = "Math-Stat Öğretmeni";
const TUTOR_PHONE = "0 505 811 93 27";

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

async function fetchFontBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

/** Veliye gönderilecek sade PDF raporu: okul ve ödeme durumu sütunları yok,
 *  dikey (A4) sayfa, üstte öğretmen bilgisi, Türkçe karakterleri doğru
 *  gösteren gömülü bir yazı tipi kullanır. */
export async function exportPDF(rows: LessonRow[], monthText: string, studentName: string | null) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const [regularBase64, boldBase64] = await Promise.all([
    fetchFontBase64("/fonts/Roboto-Regular.ttf"),
    fetchFontBase64("/fonts/Roboto-Bold.ttf"),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.addFileToVFS("Roboto-Regular.ttf", regularBase64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", boldBase64);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");

  const pageWidth = doc.internal.pageSize.getWidth();
  const rightMargin = 14;
  const leftMargin = 14;

  // Sağ üst: öğretmen bilgisi
  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(TUTOR_NAME, pageWidth - rightMargin, 14, { align: "right" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(TUTOR_TITLE, pageWidth - rightMargin, 19, { align: "right" });
  doc.text(TUTOR_PHONE, pageWidth - rightMargin, 24, { align: "right" });

  const titleMonth = monthTitle(monthText);
  const title = studentName ? `${studentName} ${titleMonth} Ayı Ders Raporu` : `${titleMonth} Ayı Ders Raporu`;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(title, pageWidth / 2, 34, { align: "center" });

  const headers = ["Tarih", "Saat", "Öğrenci", "Ders", "Konu", "Tutar"];
  const body = rows.map((r) => [r.lesson_date, r.lesson_time, r.name, r.subject, r.topic, money(r.fee)]);

  const usableWidth = pageWidth - leftMargin - rightMargin;
  const colWidths = [24, 18, 38, 34, 0, 28]; // 0 = kalanı Konu'ya ver
  colWidths[4] = usableWidth - (colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[5]);

  autoTable(doc, {
    startY: 42,
    head: [headers],
    body,
    styles: { font: "Roboto", fontSize: 10, cellPadding: 2.6, textColor: [20, 20, 20] },
    headStyles: { font: "Roboto", fontStyle: "bold", fillColor: [232, 232, 232], textColor: [20, 20, 20] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: colWidths[0] },
      1: { cellWidth: colWidths[1] },
      2: { cellWidth: colWidths[2] },
      3: { cellWidth: colWidths[3] },
      4: { cellWidth: colWidths[4] },
      5: { cellWidth: colWidths[5], halign: "right" },
    },
    margin: { left: leftMargin, right: rightMargin },
  });

  const safe = (v: string) => v.replace(/[^a-zA-Z0-9ğüşöçİĞÜŞÖÇı _-]/g, "_").replace(/ /g, "_");
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const filename = `${safe(studentName || "Tum_Ogrenciler")}_${safe(titleMonth)}_Ders_Raporu_${stamp}.pdf`;
  doc.save(filename);
}
