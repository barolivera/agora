'use client';

import { useState } from 'react';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function toDateStr(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function Calendar({
  eventDates,
  selectedDate,
  onDaySelect,
}: {
  eventDates: string[];
  selectedDate: string | null;
  onDaySelect: (date: string | null) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const eventDateSet = new Set(eventDates);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  // Monday-first grid
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const startOffset = (firstWeekday + 6) % 7; // 0=Mon … 6=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="border border-warm-gray/20 p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-6 h-6 flex items-center justify-center text-ink/40 hover:text-ink transition-colors text-lg leading-none"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink/50 font-[family-name:var(--font-kode-mono)]">
          {MESES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="w-6 h-6 flex items-center justify-center text-ink/40 hover:text-ink transition-colors text-lg leading-none"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_CORTOS.map((d) => (
          <div
            key={d}
            className="text-center text-[9px] font-bold uppercase tracking-wider text-ink/25 py-0.5"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`e-${idx}`} className="aspect-square" />;
          }

          const dateStr = toDateStr(viewYear, viewMonth, day);
          const isToday = dateStr === todayStr;
          const hasEvent = eventDateSet.has(dateStr);
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              onClick={() => hasEvent && onDaySelect(isSelected ? null : dateStr)}
              disabled={!hasEvent}
              className={[
                'relative aspect-square flex flex-col items-center justify-center text-[11px] leading-none rounded transition-colors',
                isToday
                  ? 'bg-orange text-cream font-bold'
                  : isSelected
                  ? 'bg-cobalt text-cream font-semibold'
                  : hasEvent
                  ? 'text-ink hover:bg-cobalt/10 cursor-pointer'
                  : 'text-ink/25 cursor-default',
              ].join(' ')}
              aria-label={dateStr}
              aria-pressed={isSelected}
            >
              {day}
              {/* Cobalt dot for event days — hidden when bg is already colored */}
              {hasEvent && !isToday && !isSelected && (
                <span className="absolute bottom-[3px] w-1 h-1 rounded-full bg-cobalt" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
