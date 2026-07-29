"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStudents, addStudent, updateStudentField, getStudentsForMonth, setMonthlyFee } from "@/lib/data";
import type { Student } from "@/lib/types";
import { monthKey as currentMonthKey } from "@/lib/utils";
import MonthPicker from "@/components/MonthPicker";

const EMPTY = { name: "", school: "", subject: "", fee: "", parent_name: "", phone: "", email: "" };

type StudentWithMonthFee = Student & { monthFee: number };

export default function StudentsPage() {
  const sb = createClient();
  const [month, setMonth] = useState(currentMonthKey());
  const [students, setStudents] = useState<StudentWithMonthFee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load(m: string) {
    setStudents(await getStudentsForMonth(sb, m));
  }

  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addStudent(sb, {
        name: form.name.trim(),
        school: form.school,
        subject: form.subject,
        fee: parseFloat(form.fee || "0") || 0,
        parent_name: form.parent_name,
        phone: form.phone,
        email: form.email,
        active: formActive,
      });
      setForm(EMPTY);
      setFormActive(true);
      setShowModal(false);
      await load(month);
    } finally {
      setSaving(false);
    }
  }

  async function saveField(student: Student, field: "name" | "school" | "subject" | "parent_name" | "phone", value: string) {
    if (value === (student[field] as string)) return;
    setStudents((rows) => rows.map((r) => (r.id === student.id ? { ...r, [field]: value } : r)));
    await updateStudentField(sb, student.id, { [field]: value });
  }

  async function saveMonthFee(student: StudentWithMonthFee, raw: string) {
    const fee = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
    if (fee === student.monthFee) return;
    setStudents((rows) => rows.map((r) => (r.id === student.id ? { ...r, monthFee: fee } : r)));
    await setMonthlyFee(sb, student.id, month, fee);
  }

  async function toggleActive(student: StudentWithMonthFee) {
    const next = !student.active;
    setStudents((rows) => rows.map((r) => (r.id === student.id ? { ...r, active: next } : r)));
    await updateStudentField(sb, student.id, { active: next });
  }

  // Aktifler önce, pasifler sonda
  const sorted = [...students].sort((a, b) => {
    if (a.active === b.active) return a.name.localeCompare(b.name, "tr");
    return a.active ? -1 : 1;
  });

  const activeCount = students.filter((s) => s.active).length;

  return (
    <div className="max-w-[1100px] space-y-4">
      {/* Başlık + Ekle butonu */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Öğrenciler</h1>
        <button className="btn-primary" onClick={() => { setForm(EMPTY); setFormActive(true); setShowModal(true); }}>
          + Yeni Öğrenci
        </button>
      </div>

      {/* Ay seçici */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-muted">Ay</label>
        <MonthPicker value={month} onChange={setMonth} />
        <span className="text-xs text-muted hidden sm:inline">
          Ücret sütunu bu aya ait — değiştirmezseniz bir önceki aydan devam eder.
        </span>
      </div>

      {/* Tablo */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Öğrenci</th>
              <th className="hidden sm:table-cell">Okul</th>
              <th className="hidden md:table-cell">Ders</th>
              <th>Ücret</th>
              <th className="hidden lg:table-cell">Veli</th>
              <th className="hidden lg:table-cell">Telefon</th>
              <th>Aktif</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, idx) => (
              <tr key={s.id} className={!s.active ? "opacity-40" : ""}>
                <td className="text-muted text-xs">{idx + 1}</td>
                <td>
                  <EditableCell value={s.name} onSave={(v) => saveField(s, "name", v)} />
                </td>
                <td className="hidden sm:table-cell">
                  <EditableCell value={s.school} onSave={(v) => saveField(s, "school", v)} />
                </td>
                <td className="hidden md:table-cell">
                  <EditableCell value={s.subject} onSave={(v) => saveField(s, "subject", v)} />
                </td>
                <td>
                  <EditableCell
                    key={`${s.id}-${month}-${s.monthFee}`}
                    value={String(s.monthFee ?? "")}
                    onSave={(v) => saveMonthFee(s, v)}
                    suffix=" TL"
                  />
                </td>
                <td className="hidden lg:table-cell">
                  <EditableCell value={s.parent_name} onSave={(v) => saveField(s, "parent_name", v)} />
                </td>
                <td className="hidden lg:table-cell">
                  <EditableCell value={s.phone} onSave={(v) => saveField(s, "phone", v)} />
                </td>
                <td>
                  <button
                    onClick={() => toggleActive(s)}
                    className={`text-xs font-semibold px-2 py-1 rounded-full transition-colors ${
                      s.active
                        ? "bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60"
                        : "bg-[#1d2c4a] text-[#8b98b3] hover:bg-[#263450]"
                    }`}
                  >
                    {s.active ? "Aktif" : "Pasif"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="text-sm text-muted p-5">Henüz öğrenci yok.</p>}

        {/* Alt özet */}
        {students.length > 0 && (
          <div className="px-4 py-3 border-t border-[#1a2337] text-xs text-muted">
            {month} ayında <span className="text-white font-semibold">{activeCount} aktif öğrenci</span> ile çalışıyorsunuz
            {students.length > activeCount && (
              <span className="ml-1">({students.length - activeCount} pasif)</span>
            )}.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-5">Yeni Öğrenci</h3>
            <div className="space-y-3">
              <ModalField label="Öğrenci Adı *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} autoFocus />
              <ModalField label="Okul" value={form.school} onChange={(v) => setForm({ ...form, school: v })} />
              <ModalField label="Ders" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} />
              <ModalField label="90 dk Ücreti (TL)" value={form.fee} onChange={(v) => setForm({ ...form, fee: v })} inputMode="numeric" />
              <ModalField label="Veli Adı" value={form.parent_name} onChange={(v) => setForm({ ...form, parent_name: v })} />
              <ModalField label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
              <ModalField label="E-posta" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
              <label className="flex items-center gap-2 text-sm text-muted pt-1">
                <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
                Aktif öğrenci
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                className="btn-primary flex-1"
                onClick={save}
                disabled={saving || !form.name.trim()}
              >
                {saving ? "Kaydediliyor…" : "Ekle"}
              </button>
              <button className="btn" onClick={() => setShowModal(false)}>
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableCell({ value, onSave, suffix }: { value: string; onSave: (v: string) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-1">
      <input
        className="bg-transparent border-b border-transparent hover:border-[#2a3d63] focus:border-accent outline-none w-full py-0.5 min-w-0"
        defaultValue={value}
        placeholder="—"
        onBlur={(e) => onSave(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      {suffix && <span className="text-muted shrink-0">{suffix}</span>}
    </div>
  );
}

function ModalField({
  label, value, onChange, type = "text", inputMode, autoFocus,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      <input
        className="input"
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
      />
    </div>
  );
}
