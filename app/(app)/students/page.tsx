"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStudents, addStudent, updateStudentField, syncFutureLessonFees } from "@/lib/data";
import type { Student } from "@/lib/types";
import { toISODate } from "@/lib/utils";

const EMPTY = { name: "", school: "", subject: "", fee: "", parent_name: "", phone: "", email: "" };

export default function StudentsPage() {
  const sb = createClient();
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setStudents(await getStudents(sb));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        active,
      });
      setForm(EMPTY);
      setActive(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function saveField(student: Student, field: "name" | "school" | "subject" | "parent_name" | "phone", value: string) {
    if (value === (student[field] as string)) return;
    setStudents((rows) => rows.map((r) => (r.id === student.id ? { ...r, [field]: value } : r)));
    await updateStudentField(sb, student.id, { [field]: value });
  }

  async function saveFee(student: Student, raw: string) {
    const fee = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
    if (fee === student.fee) return;
    setStudents((rows) => rows.map((r) => (r.id === student.id ? { ...r, fee } : r)));
    await updateStudentField(sb, student.id, { fee });
    await syncFutureLessonFees(sb, student.id, fee, toISODate(new Date()));
  }

  return (
    <div className="max-w-[1100px] space-y-6">
      <h1 className="text-2xl font-bold text-white">Öğrenciler</h1>

      <div className="card p-5">
        <div className="grid grid-cols-4 gap-4 mb-3">
          <Field label="Öğrenci Adı" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Okul" value={form.school} onChange={(v) => setForm({ ...form, school: v })} />
          <Field label="Ders" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} />
          <Field label="90 dk Ücreti" value={form.fee} onChange={(v) => setForm({ ...form, fee: v })} />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-4 items-end">
          <Field label="Veli Adı" value={form.parent_name} onChange={(v) => setForm({ ...form, parent_name: v })} />
          <Field label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="E-posta" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <label className="flex items-center gap-2 text-sm text-muted pb-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Aktif
          </label>
        </div>
        <button className="btn-primary" onClick={save} disabled={saving || !form.name.trim()}>
          {saving ? "Kaydediliyor…" : "Yeni Öğrenci Kaydet"}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Öğrenci</th>
              <th>Okul</th>
              <th>Ders</th>
              <th>Ücret</th>
              <th>Veli</th>
              <th>Telefon</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => (
              <tr key={s.id} className={!s.active ? "opacity-50" : ""}>
                <td className="text-muted">{idx + 1}</td>
                <td>
                  <EditableCell value={s.name} onSave={(v) => saveField(s, "name", v)} />
                </td>
                <td>
                  <EditableCell value={s.school} onSave={(v) => saveField(s, "school", v)} />
                </td>
                <td>
                  <EditableCell value={s.subject} onSave={(v) => saveField(s, "subject", v)} />
                </td>
                <td>
                  <EditableCell value={String(s.fee ?? "")} onSave={(v) => saveFee(s, v)} suffix=" TL" />
                </td>
                <td>
                  <EditableCell value={s.parent_name} onSave={(v) => saveField(s, "parent_name", v)} />
                </td>
                <td>
                  <EditableCell value={s.phone} onSave={(v) => saveField(s, "phone", v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="text-sm text-muted p-5">Henüz öğrenci yok.</p>}
      </div>
    </div>
  );
}

function EditableCell({ value, onSave, suffix }: { value: string; onSave: (v: string) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-1">
      <input
        className="bg-transparent border-b border-transparent hover:border-[#2a3d63] focus:border-accent outline-none w-full py-0.5"
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
