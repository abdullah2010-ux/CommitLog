import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { FOCUS_CATEGORIES, formatHumanDate } from '../data/seedData';
import { CodingSession, FocusCategory } from '../types';

interface SessionLogTableProps {
  sessions: CodingSession[];
  onOpenLogModal: (defaultDate?: string) => void;
  onEditSession: (session: CodingSession) => void;
  onIncrementSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  selectedDateFilter?: string | null;
  onClearDateFilter?: () => void;
}

export const SessionLogTable: React.FC<SessionLogTableProps> = ({
  sessions,
  onOpenLogModal,
  onEditSession,
  onIncrementSession,
  onDeleteSession,
  selectedDateFilter,
  onClearDateFilter,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FocusCategory | 'All'>('All');
  const [visibleCount, setVisibleCount] = useState(25);

  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        if (selectedDateFilter && s.date !== selectedDateFilter) return false;
        if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            s.title.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q) ||
            (s.notes && s.notes.toLowerCase().includes(q)) ||
            s.date.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
  }, [sessions, selectedDateFilter, categoryFilter, search]);

  const displayedSessions = filteredSessions.slice(0, visibleCount);

  const totalFilteredSessionsCount = useMemo(
    () => filteredSessions.reduce((acc, s) => acc + s.sessionsCount, 0),
    [filteredSessions]
  );
  const totalFilteredMinutes = useMemo(
    () => filteredSessions.reduce((acc, s) => acc + s.durationMinutes, 0),
    [filteredSessions]
  );

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Coding Session Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            <span>{totalFilteredSessionsCount} sessions</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{filteredSessions.length} log records</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{totalFilteredMinutes} total minutes</span>
            {selectedDateFilter && (
              <>
                <span className="mx-2" aria-hidden="true">·</span>
                <span className="text-emerald-700 font-medium">
                  Filtered to {formatHumanDate(selectedDateFilter)}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {selectedDateFilter && onClearDateFilter && (
            <button
              type="button"
              onClick={onClearDateFilter}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              Show All Dates
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenLogModal(selectedDateFilter || undefined)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Coding Session
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategoryFilter('All')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              categoryFilter === 'All'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Categories
          </button>
          {FOCUS_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter sessions by task or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="mt-4 overflow-x-auto">
        {displayedSessions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-slate-900">
              No coding sessions logged yet.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Log your first coding session of the day to start building your contribution graph and streak.
            </p>
            <button
              type="button"
              onClick={() => onOpenLogModal(selectedDateFilter || undefined)}
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Log First Coding Session
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-2.5 pr-4 whitespace-nowrap">Date</th>
                <th className="py-2.5 px-4">Work Summary &amp; Notes</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Focus Area</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Times Coded</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Duration</th>
                <th className="py-2.5 pl-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedSessions.map((session) => (
                <tr
                  key={session.id}
                  className="hover:bg-slate-50/80 transition-colors h-10"
                >
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-700 whitespace-nowrap align-top">
                    {session.date}
                  </td>
                  <td className="py-2.5 px-4 align-top">
                    <div className="font-medium text-slate-900">{session.title}</div>
                    {session.notes && (
                      <div className="text-slate-500 mt-0.5 line-clamp-1">{session.notes}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap align-top">
                    {session.category}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap align-top">
                    <span>
                      {session.sessionsCount} {session.sessionsCount === 1 ? 'session' : 'sessions'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncrementSession(session.id)}
                      className="ml-2 px-1.5 py-0.5 text-[11px] font-mono bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded transition-colors"
                      title="Coded again on this task (+1 session & +30m)"
                    >
                      +1
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap align-top">
                    {session.durationMinutes}m
                  </td>
                  <td className="py-2.5 pl-4 text-right whitespace-nowrap align-top">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditSession(session)}
                        className="text-slate-400 hover:text-slate-900 transition-colors p-1"
                        aria-label={`Edit session ${session.title}`}
                      >
                        <Edit3 className="w-3.5 h-3.5 inline" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSession(session.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        aria-label={`Delete session ${session.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filteredSessions.length > visibleCount && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono tabular-nums">
            Showing {displayedSessions.length} of {filteredSessions.length} records
          </span>
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 25)}
            className="px-3 py-1.5 font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            Load More Sessions
          </button>
        </div>
      )}
    </section>
  );
};
