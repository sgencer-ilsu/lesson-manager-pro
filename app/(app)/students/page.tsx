"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStudents, addStudent } from "@/lib/data";
import type { Student } from "@/lib/types";
import { money } from "@/lib/utils";

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
              <th>ID</th>
              <th>Öğrenci</th>
              <th>Okul</th>
              <th>Ders</th>
              <th>Ücret</th>
              <th>Veli</th>
              <th>Telefon</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className={!s.active ? "opacity-50" : ""}>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>{s.school}</td>
                <td>{s.subject}</td>
                <td>{money(s.fee)}</td>
                <td>{s.parent_name}</td>
                <td>{s.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="text-sm text-muted p-5">Henüz öğrenci yok.</p>}
      </div>
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
