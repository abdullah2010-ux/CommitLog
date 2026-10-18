import React, { useMemo, useState } from 'react';
import { addDays, FOCUS_CATEGORIES, formatHumanDate, getTodayStr } from '../data/seedData';
import { DaySummary, FocusCategory } from '../types';

interface ContributionHeatmapProps {
  dayMap: Record<string, DaySummary>;
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  categoryFilter: FocusCategory | 'All';
  onCategoryFilterChange: (cat: FocusCategory | 'All') => void;
}

type HeatmapMetric = 'sessions' | 'minutes';

interface CellData {
  dateStr: string;
  sessionsCount: number;
  minutesCount: number;
  hasJournal: boolean;
  isFuture: boolean;
}

export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  dayMap,
  selectedDate,
  onSelectDate,
  categoryFilter,
  onCategoryFilterChange,
}) => {
  const [metric, setMetric] = useState<HeatmapMetric>('sessions');
  const [hoveredCell, setHoveredCell] = useState<CellData | null>(null);

  const todayStr = getTodayStr();

  // Build 53 weeks (Sunday to Saturday columns) ending at the end of the current week
  const { weeks, monthLabels, yearStats } = useMemo(() => {
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const todayDate = new Date(ty, tm - 1, td);
    const todayDayOfWeek = todayDate.getDay(); // 0 = Sun ... 6 = Sat

    // End of current week (Saturday)
    const endOfGridStr = addDays(todayStr, 6 - todayDayOfWeek);
    // Start 52 weeks prior on Sunday (53 columns * 7 days = 371 days)
    const startOfGridStr = addDays(endOfGridStr, -(53 * 7 - 1));

    const weeksList: CellData[][] = [];
    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    let activeDaysInYear = 0;
    let totalSessionsInYear = 0;
    let totalMinutesInYear = 0;

    for (let w = 0; w < 53; w++) {
      const weekCells: CellData[] = [];
      for (let d = 0; d < 7; d++) {
        const offset = w * 7 + d;
        const cellDateStr = addDays(startOfGridStr, offset);
        const isFuture = cellDateStr > todayStr;
        const isWithinLast365 = cellDateStr >= addDays(todayStr, -364) && !isFuture;

        const [cy, cm, cd] = cellDateStr.split('-').map(Number);
        if (d === 0 && cm !== lastMonth) {
          const dt = new Date(cy, cm - 1, cd);
          const monthName = dt.toLocaleDateString('en-US', { month: 'short' });
          // Avoid crowding if first two columns change month immediately
          if (months.length === 0 || w - months[months.length - 1].weekIndex >= 3) {
            months.push({ label: monthName, weekIndex: w });
          }
          lastMonth = cm;
        }

        const summary = dayMap[cellDateStr];
        let sessionsCount = 0;
        let minutesCount = 0;
        let hasJournal = false;

        if (summary && !isFuture) {
          const filteredSessions =
            categoryFilter === 'All'
              ? summary.sessions
              : summary.sessions.filter((s) => s.category === categoryFilter);

          sessionsCount = filteredSessions.reduce((acc, s) => acc + s.sessionsCount, 0);
          minutesCount = filteredSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
          hasJournal =
            categoryFilter === 'All'
              ? summary.journals.length > 0
              : summary.journals.some((j) => j.category === categoryFilter);
        }

        if (isWithinLast365 && sessionsCount > 0) {
          activeDaysInYear += 1;
          totalSessionsInYear += sessionsCount;
          totalMinutesInYear += minutesCount;
        }

        weekCells.push({
          dateStr: cellDateStr,
          sessionsCount,
          minutesCount,
          hasJournal,
          isFuture,
        });
      }
      weeksList.push(weekCells);
    }

    return {
      weeks: weeksList,
      monthLabels: months,
      yearStats: {
        activeDaysInYear,
        totalSessionsInYear,
        totalMinutesInYear,
      },
    };
  }, [dayMap, todayStr, categoryFilter]);

  const getIntensityLevel = (cell: CellData): 0 | 1 | 2 | 3 | 4 => {
    if (cell.isFuture) return 0;
    if (metric === 'sessions') {
      if (cell.sessionsCount <= 0) return 0;
      if (cell.sessionsCount === 1) return 1;
      if (cell.sessionsCount === 2) return 2;
      if (cell.sessionsCount === 3) return 3;
      return 4;
    } else {
      if (cell.minutesCount <= 0) return 0;
      if (cell.minutesCount <= 45) return 1;
      if (cell.minutesCount <= 90) return 2;
      if (cell.minutesCount <= 150) return 3;
      return 4;
    }
  };

  const levelColorClass = (level: 0 | 1 | 2 | 3 | 4, isFuture: boolean): string => {
    if (isFuture) return 'bg-slate-50 border-transparent opacity-30 cursor-default';
    switch (level) {
      case 0:
        return 'bg-slate-100 border-slate-200/80 hover:border-slate-400';
      case 1:
        return 'bg-emerald-200 border-emerald-300/80 hover:border-emerald-600';
      case 2:
        return 'bg-emerald-400 border-emerald-500/80 hover:border-emerald-700';
      case 3:
        return 'bg-emerald-600 border-emerald-700 hover:border-slate-900';
      case 4:
        return 'bg-emerald-800 border-emerald-900 hover:border-slate-900';
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Coding Contribution Activity
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            <span>{yearStats.totalSessionsInYear} coding sessions</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{yearStats.activeDaysInYear} active days in the past 365 days</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{Math.round((yearStats.totalMinutesInYear / 60) * 10) / 10} hrs total</span>
          </p>
        </div>

        {/* Interactive Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Focus Area Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="heatmap-category-select" className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Focus:
            </label>
            <select
              id="heatmap-category-select"
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value as FocusCategory | 'All')}
              className="text-xs font-medium text-slate-800 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="All">All Focus Areas</option>
              {FOCUS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Segmented Metric Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMetric('sessions')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                metric === 'sessions'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sessions Count
            </button>
            <button
              type="button"
              onClick={() => setMetric('minutes')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                metric === 'minutes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Duration (Mins)
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap Matrix Container */}
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="min-w-[780px]">
          {/* Month Labels Row */}
          <div className="flex items-center mb-2 pl-9 relative h-4">
            {monthLabels.map((m) => (
              <span
                key={`${m.label}-${m.weekIndex}`}
                className="text-[11px] font-medium text-slate-500 absolute select-none"
                style={{ left: `${36 + m.weekIndex * 14}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid Body: Day labels + 53 week columns */}
          <div className="flex items-start gap-2">
            {/* Day of Week Labels */}
            <div className="grid grid-rows-7 gap-[3px] text-[10px] font-mono text-slate-400 pr-1 select-none w-7">
              <span className="h-[11px] leading-[11px] opacity-0">Sun</span>
              <span className="h-[11px] leading-[11px]">Mon</span>
              <span className="h-[11px] leading-[11px] opacity-0">Tue</span>
              <span className="h-[11px] leading-[11px]">Wed</span>
              <span className="h-[11px] leading-[11px] opacity-0">Thu</span>
              <span className="h-[11px] leading-[11px]">Fri</span>
              <span className="h-[11px] leading-[11px] opacity-0">Sat</span>
            </div>

            {/* 53 Weeks Columns */}
            <div className="flex items-center gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-rows-7 gap-[3px]">
                  {week.map((cell) => {
                    const level = getIntensityLevel(cell);
                    const isSelected = cell.dateStr === selectedDate;
                    const isToday = cell.dateStr === todayStr;

                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        disabled={cell.isFuture}
                        onClick={() => !cell.isFuture && onSelectDate(cell.dateStr)}
                        onMouseEnter={() => !cell.isFuture && setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        aria-label={`${formatHumanDate(cell.dateStr)}: ${cell.sessionsCount} coding sessions, ${cell.minutesCount} minutes`}
                        className={`w-[11px] h-[11px] rounded-[2px] border transition-transform duration-100 relative ${levelColorClass(
                          level,
                          cell.isFuture
                        )} ${
                          isSelected
                            ? 'ring-2 ring-slate-900 ring-offset-1 scale-110 z-10'
                            : isToday
                            ? 'ring-1 ring-slate-600'
                            : ''
                        }`}
                      >
                        {cell.hasJournal && !cell.isFuture && (
                          <span
                            className={`block w-[3px] h-[3px] rounded-full mx-auto ${
                              level >= 3 ? 'bg-white' : 'bg-slate-900'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bar: Live Cell Readout + Accessible Quantitative Legend */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="font-mono tabular-nums min-h-[20px]">
          {hoveredCell ? (
            <span>
              <strong className="font-semibold text-slate-900">
                {formatHumanDate(hoveredCell.dateStr)}
              </strong>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>
                {hoveredCell.sessionsCount}{' '}
                {hoveredCell.sessionsCount === 1 ? 'coding session' : 'coding sessions'}
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{hoveredCell.minutesCount} mins</span>
              {hoveredCell.hasJournal && (
                <>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-medium">Journal entry logged</span>
                </>
              )}
            </span>
          ) : (
            <span>
              Selected date:{' '}
              <strong className="font-semibold text-slate-900">
                {formatHumanDate(selectedDate)}
              </strong>{' '}
              — click any square to inspect or backfill that day
            </span>
          )}
        </div>

        {/* Quantitative Legend (avoids hue-only state signaling) */}
        <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-slate-500">
          {metric === 'sessions' ? (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-100 border border-slate-200 inline-block" />
                0
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-200 border border-emerald-300 inline-block" />
                1
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-500 inline-block" />
                2
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 border border-emerald-700 inline-block" />
                3
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-800 border border-emerald-900 inline-block" />
                4+ sessions
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-100 border border-slate-200 inline-block" />
                0m
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-200 border border-emerald-300 inline-block" />
                1-45m
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-500 inline-block" />
                46-90m
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 border border-emerald-700 inline-block" />
                91-150m
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-800 border border-emerald-900 inline-block" />
                150m+
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
