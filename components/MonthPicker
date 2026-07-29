"use client";

import { useEffect, useRef, useState } from "react";
import { TR_MONTHS, TR_MONTHS_SHORT, monthKey as currentMonthKey } from "@/lib/utils";

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => Number(value.split("-")[0]));
  const ref = useRef<HTMLDivElement>(null);

  const [y, m] = value.split("-").map(Number);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function openPicker() {
    setPickerYear(y);
    setOpen((o) => !o);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className="btn px-2.5" onClick={() => onChange(shiftMonth(value, -1))} title="Önceki ay">
        ‹
      </button>

      <div className="relative" ref={ref}>
        <button type="button" className="btn min-w-[150px] flex items-center justify-between gap-2" onClick={openPicker}>
          <span>
            {TR_MONTHS[m - 1]} {y}
          </span>
          <span className="text-muted text-[10px]">▾</span>
        </button>

        {open && (
          <div className="absolute z-30 mt-1.5 card p-3 w-[240px] shadow-2xl">
            <div className="flex items-center justify-between mb-2.5">
              <button type="button" className="btn px-2 py-1" onClick={() => setPickerYear((yy) => yy - 1)}>
                ‹
              </button>
              <span className="text-sm font-bold text-white">{pickerYear}</span>
              <button type="button" className="btn px-2 py-1" onClick={() => setPickerYear((yy) => yy + 1)}>
                ›
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {TR_MONTHS_SHORT.map((label, i) => {
                const isSelected = pickerYear === y && i + 1 === m;
                return (
                  <button
                    type="button"
                    key={label}
                    className={`text-xs py-2 rounded-lg font-semibold transition-colors ${
                      isSelected ? "bg-accent text-white" : "text-muted hover:bg-[#16213a] hover:text-white"
                    }`}
                    onClick={() => {
                      onChange(`${pickerYear}-${String(i + 1).padStart(2, "0")}`);
                      setOpen(false);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <button type="button" className="btn px-2.5" onClick={() => onChange(shiftMonth(value, 1))} title="Sonraki ay">
        ›
      </button>

      <button type="button" className="btn" onClick={() => onChange(currentMonthKey())}>
        Bu Ay
      </button>
    </div>
  );
}
