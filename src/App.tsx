/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { ContributionHeatmap } from './components/ContributionHeatmap';
import { JournalWorkspace } from './components/JournalWorkspace';
import { SessionLoggerModal } from './components/SessionLoggerModal';
import { SessionLogTable } from './components/SessionLogTable';
import {
  addDays,
  DEFAULT_TARGETS,
  FOCUS_CATEGORIES,
  formatHumanDate,
  formatShortDate,
  getTodayStr,
} from './data/seedData';
import {
  CodingSession,
  DailyTargets,
  DaySummary,
  FocusCategory,
  JournalEntry,
} from './types';

const STORAGE_KEYS = {
  SESSIONS: 'commitlog_real_v2_sessions',
  JOURNALS: 'commitlog_real_v2_journals',
  TARGETS: 'commitlog_real_v2_targets',
  TIMER: 'commitlog_real_v2_timer',
};

// Purge legacy v1 demo keys so the app starts cleanly from zero
const LEGACY_KEYS = [
  'commitlog_sessions_v1',
  'commitlog_journals_v1',
  'commitlog_targets_v1',
];

type ActiveSection = 'overview' | 'heatmap' | 'sessions' | 'journal';

interface PersistedTimerState {
  isRunning: boolean;
  accumulatedSeconds: number;
  lastStartedAt: number | null;
}

export default function App() {
  const todayStr = getTodayStr();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isInitialHydrationRef = useRef(true);

  // Clean up any old v1 demo storage keys on first load
  useEffect(() => {
    try {
      for (const key of LEGACY_KEYS) {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Start strictly from zero (empty array) unless the user has saved real v2 progress
  const [sessions, setSessions] = useState<CodingSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [journals, setJournals] = useState<JournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOURNALS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [targets, setTargets] = useState<DailyTargets>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TARGETS);
      if (saved) {
        return { ...DEFAULT_TARGETS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_TARGETS;
  });

  const [lastSavedAt, setLastSavedAt] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Inline Quick Daily Check-In Form State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState<FocusCategory>('TypeScript / Frontend');
  const [quickSessionsCount, setQuickSessionsCount] = useState(1);
  const [quickDuration, setQuickDuration] = useState(45);
  const [quickSavedBanner, setQuickSavedBanner] = useState(false);

  // UI Navigation & Selection State
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [heatmapCategoryFilter, setHeatmapCategoryFilter] = useState<FocusCategory | 'All'>('All');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<CodingSession | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>(todayStr);
  const [modalDefaultDuration, setModalDefaultDuration] = useState<number>(45);
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Persistent Live Coding Focus Stopwatch State
  const [timerState, setTimerState] = useState<PersistedTimerState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TIMER);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          isRunning: Boolean(parsed.isRunning),
          accumulatedSeconds: Number(parsed.accumulatedSeconds) || 0,
          lastStartedAt: parsed.lastStartedAt ? Number(parsed.lastStartedAt) : null,
        };
      }
    } catch {
      // ignore
    }
    return { isRunning: false, accumulatedSeconds: 0, lastStartedAt: null };
  });

  const [displayTimerSeconds, setDisplayTimerSeconds] = useState<number>(0);

  // Hydrate from server disk store (/api/progress) if local browser storage is empty
  useEffect(() => {
    let cancelled = false;
    async function syncFromServer() {
      try {
        const res = await fetch('/api/progress');
        if (!res.ok) return;
        const serverStore = await res.json();
        if (cancelled) return;

        const localHasSessions =
          (JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]') as unknown[]).length > 0;
        const localHasJournals =
          (JSON.parse(localStorage.getItem(STORAGE_KEYS.JOURNALS) || '[]') as unknown[]).length > 0;

        if (!localHasSessions && Array.isArray(serverStore.sessions) && serverStore.sessions.length > 0) {
          setSessions(serverStore.sessions);
        }
        if (!localHasJournals && Array.isArray(serverStore.journals) && serverStore.journals.length > 0) {
          setJournals(serverStore.journals);
        }
        if (serverStore.targets && !localStorage.getItem(STORAGE_KEYS.TARGETS)) {
          setTargets({ ...DEFAULT_TARGETS, ...serverStore.targets });
        }
      } catch {
        // Fallback to localStorage seamlessly
      } finally {
        isInitialHydrationRef.current = false;
      }
    }
    syncFromServer();
    return () => {
      cancelled = true;
    };
  }, []);

  // Automatically save every change to both localStorage AND backend disk (/api/progress)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      localStorage.setItem(STORAGE_KEYS.JOURNALS, JSON.stringify(journals));
      localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(targets));
    } catch {
      // ignore storage quota errors
    }

    const nowFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastSavedAt(nowFormatted);

    if (isInitialHydrationRef.current) return;

    fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets, sessions, journals }),
    }).catch(() => {
      // localStorage already persisted
    });
  }, [sessions, journals, targets]);

  // Persist timer state and compute live elapsed seconds
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(timerState));
    } catch {
      // ignore
    }

    const computeElapsed = () => {
      if (timerState.isRunning && timerState.lastStartedAt) {
        const delta = Math.max(0, Math.floor((Date.now() - timerState.lastStartedAt) / 1000));
        return timerState.accumulatedSeconds + delta;
      }
      return timerState.accumulatedSeconds;
    };

    setDisplayTimerSeconds(computeElapsed());

    if (!timerState.isRunning) return;
    const interval = window.setInterval(() => {
      setDisplayTimerSeconds(computeElapsed());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerState]);

  // Aggregate Day Map: O(1) lookup by YYYY-MM-DD
  const dayMap = useMemo(() => {
    const map: Record<string, DaySummary> = {};

    for (const s of sessions) {
      if (!map[s.date]) {
        map[s.date] = {
          date: s.date,
          totalSessions: 0,
          totalMinutes: 0,
          sessions: [],
          journals: [],
        };
      }
      map[s.date].totalSessions += s.sessionsCount;
      map[s.date].totalMinutes += s.durationMinutes;
      map[s.date].sessions.push(s);
    }

    for (const j of journals) {
      if (!map[j.date]) {
        map[j.date] = {
          date: j.date,
          totalSessions: 0,
          totalMinutes: 0,
          sessions: [],
          journals: [],
        };
      }
      map[j.date].journals.push(j);
    }

    return map;
  }, [sessions, journals]);

  // Global & Daily Metrics Calculation
  const metrics = useMemo(() => {
    const activeDates = Object.values(dayMap)
      .filter((d) => d.totalSessions > 0)
      .map((d) => d.date)
      .sort();

    const totalDaysCoded = activeDates.length;
    const totalTimesCoded = sessions.reduce((acc, s) => acc + s.sessionsCount, 0);
    const totalMinutesCoded = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

    const todaySummary = dayMap[todayStr] || {
      date: todayStr,
      totalSessions: 0,
      totalMinutes: 0,
      sessions: [],
      journals: [],
    };

    // Calculate Current Streak (counting back from today; if today is 0, check yesterday)
    let currentStreak = 0;
    let cursor = (dayMap[todayStr]?.totalSessions || 0) > 0 ? todayStr : addDays(todayStr, -1);
    while ((dayMap[cursor]?.totalSessions || 0) > 0) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }

    // Calculate Longest Streak
    let longestStreak = 0;
    let runningStreak = 0;
    let prevDate: string | null = null;
    for (const dt of activeDates) {
      if (!prevDate || addDays(prevDate, 1) === dt) {
        runningStreak += 1;
      } else {
        runningStreak = 1;
      }
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
      prevDate = dt;
    }

    // Last 7 days activity
    const last7Days: { dateStr: string; label: string; sessionsCount: number; minutes: number }[] = [];
    let activeDaysLast7 = 0;
    for (let i = -6; i <= 0; i++) {
      const dStr = addDays(todayStr, i);
      const sCount = dayMap[dStr]?.totalSessions || 0;
      const mCount = dayMap[dStr]?.totalMinutes || 0;
      if (sCount > 0) activeDaysLast7 += 1;
      const [y, m, d] = dStr.split('-').map(Number);
      const weekday = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
      last7Days.push({
        dateStr: dStr,
        label: i === 0 ? 'Today' : weekday,
        sessionsCount: sCount,
        minutes: mCount,
      });
    }

    // Focus area breakdown
    const categoryTotals: Record<FocusCategory, { sessions: number; minutes: number }> = {
      'TypeScript / Frontend': { sessions: 0, minutes: 0 },
      'Backend & APIs': { sessions: 0, minutes: 0 },
      'Algorithms & DSA': { sessions: 0, minutes: 0 },
      'System Architecture': { sessions: 0, minutes: 0 },
      'Database & SQL': { sessions: 0, minutes: 0 },
      'DevOps & Tooling': { sessions: 0, minutes: 0 },
    };

    for (const s of sessions) {
      if (categoryTotals[s.category]) {
        categoryTotals[s.category].sessions += s.sessionsCount;
        categoryTotals[s.category].minutes += s.durationMinutes;
      }
    }

    return {
      totalDaysCoded,
      totalTimesCoded,
      totalMinutesCoded,
      todaySessions: todaySummary.totalSessions,
      todayMinutes: todaySummary.totalMinutes,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      activeDaysLast7,
      last7Days,
      categoryTotals,
    };
  }, [dayMap, sessions, todayStr]);

  // Handlers
  const handleSaveSession = (
    sessionData: Omit<CodingSession, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    isInitialHydrationRef.current = false;
    if (existingId) {
      setSessions((prev) =>
        prev.map((s) => (s.id === existingId ? { ...s, ...sessionData } : s))
      );
    } else {
      const created: CodingSession = {
        ...sessionData,
        id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      setSessions((prev) => [created, ...prev]);
    }
    setSelectedDate(sessionData.date);
  };

  const handleQuickDailySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = quickTitle.trim() || `Coding session (${quickCategory})`;
    handleSaveSession({
      date: selectedDate || todayStr,
      title: cleanTitle,
      category: quickCategory,
      sessionsCount: Math.max(1, Number(quickSessionsCount) || 1),
      durationMinutes: Math.max(1, Number(quickDuration) || 45),
    });
    setQuickTitle('');
    setQuickSessionsCount(1);
    setQuickSavedBanner(true);
    window.setTimeout(() => setQuickSavedBanner(false), 2000);
  };

  const handleIncrementSession = (id: string) => {
    isInitialHydrationRef.current = false;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              sessionsCount: s.sessionsCount + 1,
              durationMinutes: s.durationMinutes + 30,
            }
          : s
      )
    );
  };

  const handleDeleteSession = (id: string) => {
    isInitialHydrationRef.current = false;
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSaveJournal = (
    entryData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    isInitialHydrationRef.current = false;
    const now = new Date().toISOString();
    if (existingId) {
      setJournals((prev) =>
        prev.map((j) =>
          j.id === existingId
            ? {
                ...j,
                ...entryData,
                updatedAt: now,
              }
            : j
        )
      );
    } else {
      const created: JournalEntry = {
        ...entryData,
        id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      setJournals((prev) => [created, ...prev]);
    }
    setSelectedDate(entryData.date);
  };

  const handleDeleteJournal = (id: string) => {
    isInitialHydrationRef.current = false;
    setJournals((prev) => prev.filter((j) => j.id !== id));
  };

  const openLogModalForDate = (dateStr?: string, durationMins = 45) => {
    setEditingSession(null);
    setModalDefaultDate(dateStr || selectedDate || todayStr);
    setModalDefaultDuration(durationMins);
    setIsLogModalOpen(true);
  };

  const openEditSessionModal = (session: CodingSession) => {
    setEditingSession(session);
    setModalDefaultDate(session.date);
    setModalDefaultDuration(session.durationMinutes);
    setIsLogModalOpen(true);
  };

  // Timer controls
  const handleToggleTimer = () => {
    setTimerState((prev) => {
      if (prev.isRunning) {
        const delta = prev.lastStartedAt
          ? Math.max(0, Math.floor((Date.now() - prev.lastStartedAt) / 1000))
          : 0;
        return {
          isRunning: false,
          accumulatedSeconds: prev.accumulatedSeconds + delta,
          lastStartedAt: null,
        };
      } else {
        return {
          isRunning: true,
          accumulatedSeconds: prev.accumulatedSeconds,
          lastStartedAt: Date.now(),
        };
      }
    });
  };

  const handleResetTimer = () => {
    setTimerState({ isRunning: false, accumulatedSeconds: 0, lastStartedAt: null });
    setDisplayTimerSeconds(0);
  };

  const handleFinishTimerSession = () => {
    const mins = Math.max(1, Math.round(displayTimerSeconds / 60));
    setTimerState({ isRunning: false, accumulatedSeconds: 0, lastStartedAt: null });
    setDisplayTimerSeconds(0);
    openLogModalForDate(todayStr, mins);
  };

  const handleExportData = () => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      targets,
      sessions,
      journals,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commitlog-backup-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        isInitialHydrationRef.current = false;
        if (Array.isArray(parsed.sessions)) setSessions(parsed.sessions);
        if (Array.isArray(parsed.journals)) setJournals(parsed.journals);
        if (parsed.targets) setTargets({ ...DEFAULT_TARGETS, ...parsed.targets });
      } catch {
        // ignore invalid json
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAllData = () => {
    isInitialHydrationRef.current = false;
    setSessions([]);
    setJournals([]);
    setSelectedDate(todayStr);
    setConfirmClearOpen(false);
  };

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const selectedDaySummary: DaySummary = dayMap[selectedDate] || {
    date: selectedDate,
    totalSessions: 0,
    totalMinutes: 0,
    sessions: [],
    journals: [],
  };

  const dailySessionProgressPct = Math.min(
    100,
    Math.round((metrics.todaySessions / Math.max(1, targets.dailySessionsGoal)) * 100)
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 py-3.5">
        <div className="max-w-[1320px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand Title (Single text element, one line) */}
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('overview');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
          >
            CommitLog
          </a>

          {/* Zone 2: 4 Single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#overview"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('overview');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeSection === 'overview'
                  ? 'text-slate-900 border-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Overview
            </a>
            <a
              href="#heatmap"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('heatmap');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeSection === 'heatmap'
                  ? 'text-slate-900 border-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Contribution Graph
            </a>
            <a
              href="#journal"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('journal');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeSection === 'journal'
                  ? 'text-slate-900 border-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Dev Journal
            </a>
            <a
              href="#sessions"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection('sessions');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeSection === 'sessions'
                  ? 'text-slate-900 border-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Session Ledger
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openLogModalForDate(todayStr, 45)}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Log Coding Session
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Workspace Hero & Live Session Bar */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-mono text-slate-500 tabular-nums">
              <span>{formatHumanDate(todayStr)}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>Auto-saved at {lastSavedAt}</span>
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
              Daily Coding Progress &amp; Activity Tracker
            </h1>
          </div>

          {/* Persistent Live Coding Stopwatch */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-3.5 py-2">
              <span className="text-xs font-medium text-slate-600">Focus Timer:</span>
              <span className="font-mono tabular-nums text-sm font-bold text-slate-900 min-w-[52px]">
                {formatTimer(displayTimerSeconds)}
              </span>
              <button
                type="button"
                onClick={handleToggleTimer}
                className="px-3 py-1 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
              >
                {timerState.isRunning ? (
                  <>
                    <Pause className="w-3 h-3" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    {displayTimerSeconds > 0 ? 'Resume' : 'Start Timer'}
                  </>
                )}
              </button>
              {displayTimerSeconds > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleFinishTimerSession}
                    className="px-3 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Finish &amp; Log
                  </button>
                  <button
                    type="button"
                    onClick={handleResetTimer}
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Reset timer"
                    aria-label="Reset timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Full-Width 4-Column Quantitative KPI Strip (Single-Elevation, Hairline Dividers) */}
        <section className="bg-white border border-slate-200 rounded-xl divide-y md:divide-y-0 md:divide-x divide-slate-200 grid grid-cols-1 md:grid-cols-4">
          {/* Metric 1: Today's Coding Progress */}
          <div className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Today&apos;s Coding Progress</span>
              <button
                type="button"
                onClick={() => setIsEditingTargets((prev) => !prev)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2"
              >
                {isEditingTargets ? 'Done' : 'Edit Goal'}
              </button>
            </div>

            {isEditingTargets ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="daily-sessions-goal" className="text-slate-600">
                    Daily Sessions Target:
                  </label>
                  <input
                    id="daily-sessions-goal"
                    type="number"
                    min={1}
                    max={20}
                    value={targets.dailySessionsGoal}
                    onChange={(e) =>
                      setTargets((prev) => ({
                        ...prev,
                        dailySessionsGoal: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    className="w-16 px-2 py-1 text-right font-mono bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="daily-mins-goal" className="text-slate-600">
                    Daily Minutes Target:
                  </label>
                  <input
                    id="daily-mins-goal"
                    type="number"
                    min={15}
                    max={720}
                    step={15}
                    value={targets.dailyMinutesGoal}
                    onChange={(e) =>
                      setTargets((prev) => ({
                        ...prev,
                        dailyMinutesGoal: Math.max(15, Number(e.target.value) || 60),
                      }))
                    }
                    className="w-16 px-2 py-1 text-right font-mono bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
                  <span className="text-2xl font-bold text-slate-900">
                    {metrics.todaySessions} / {targets.dailySessionsGoal}
                  </span>
                  <span className="text-xs text-slate-500">sessions today</span>
                </div>
                <div className="mt-3">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-transform duration-150 origin-left"
                      style={{ transform: `scaleX(${dailySessionProgressPct / 100})` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
                    {metrics.todayMinutes} / {targets.dailyMinutesGoal} mins ({dailySessionProgressPct}% of daily goal)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Metric 2: Total Days Coded */}
          <div className="p-5 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Total Days Coded</span>
            <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-2xl font-bold text-slate-900">{metrics.totalDaysCoded}</span>
              <span className="text-xs text-slate-500">
                {metrics.totalDaysCoded === 1 ? 'active day' : 'active days'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-mono tabular-nums">
              <span>{metrics.activeDaysLast7} / 7 days coded this week</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{Math.round((metrics.totalDaysCoded / 365) * 100)}% of year</span>
            </p>
          </div>

          {/* Metric 3: Total Times Coded (Sessions Count) */}
          <div className="p-5 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Total Times Coded</span>
            <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-2xl font-bold text-slate-900">{metrics.totalTimesCoded}</span>
              <span className="text-xs text-slate-500">
                {metrics.totalTimesCoded === 1 ? 'coding session' : 'coding sessions'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-mono tabular-nums">
              <span>{Math.round((metrics.totalMinutesCoded / 60) * 10) / 10} hrs total</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>
                {metrics.totalDaysCoded > 0
                  ? (metrics.totalTimesCoded / metrics.totalDaysCoded).toFixed(1)
                  : '0.0'}{' '}
                avg / active day
              </span>
            </p>
          </div>

          {/* Metric 4: Active Coding Streak */}
          <div className="p-5 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Coding Streak</span>
            <div className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-2xl font-bold text-emerald-700">
                {metrics.currentStreak} {metrics.currentStreak === 1 ? 'day' : 'days'}
              </span>
              <span className="text-xs text-slate-500">current streak</span>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-mono tabular-nums">
              <span>Longest streak: {metrics.longestStreak} days</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{journals.length} journal entries</span>
            </p>
          </div>
        </section>

        {/* Inline Fast Daily Check-In Bar (Log coding progress in seconds without opening a modal) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <form onSubmit={handleQuickDailySubmit} className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <label htmlFor="quick-checkin-title" className="block text-xs font-semibold text-slate-800 mb-1">
                Quick Daily Check-In for {selectedDate === todayStr ? 'Today' : formatShortDate(selectedDate)} ({selectedDate})
              </label>
              <input
                id="quick-checkin-title"
                type="text"
                placeholder="What did you code today? (e.g., Built API routes, practiced LeetCode, refactored UI)"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="w-full sm:w-48">
              <label htmlFor="quick-checkin-category" className="block text-xs font-medium text-slate-600 mb-1">
                Focus Area
              </label>
              <select
                id="quick-checkin-category"
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value as FocusCategory)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              >
                {FOCUS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-36">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Times Coded
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuickSessionsCount(n)}
                    className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg border transition-colors ${
                      quickSessionsCount === n
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full sm:w-28">
              <label htmlFor="quick-checkin-mins" className="block text-xs font-medium text-slate-600 mb-1">
                Minutes
              </label>
              <input
                id="quick-checkin-mins"
                type="number"
                min={1}
                max={1440}
                value={quickDuration}
                onChange={(e) => setQuickDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0 h-[34px]"
            >
              {quickSavedBanner ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved!
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Save Progress
                </>
              )}
            </button>
          </form>
        </section>

        {/* GitHub-Style Contribution Heatmap + Selected Date Inspector */}
        {(activeSection === 'overview' || activeSection === 'heatmap') && (
          <div className="space-y-6">
            <ContributionHeatmap
              dayMap={dayMap}
              selectedDate={selectedDate}
              onSelectDate={(dateStr) => setSelectedDate(dateStr)}
              categoryFilter={heatmapCategoryFilter}
              onCategoryFilterChange={setHeatmapCategoryFilter}
            />

            {/* Selected Day Inspector + 7-Day Cadence Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Selected Day Activity Breakdown (7 columns) */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Activity on {formatHumanDate(selectedDate)}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        <span>
                          {selectedDaySummary.totalSessions}{' '}
                          {selectedDaySummary.totalSessions === 1 ? 'coding session' : 'coding sessions'}
                        </span>
                        <span className="mx-2" aria-hidden="true">·</span>
                        <span>{selectedDaySummary.totalMinutes} minutes coded</span>
                        <span className="mx-2" aria-hidden="true">·</span>
                        <span>
                          {selectedDaySummary.journals.length}{' '}
                          {selectedDaySummary.journals.length === 1 ? 'journal entry' : 'journal entries'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedDate !== todayStr && (
                        <button
                          type="button"
                          onClick={() => setSelectedDate(todayStr)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                        >
                          Jump to Today
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openLogModalForDate(selectedDate, 45)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Detailed Log on {formatShortDate(selectedDate)}
                      </button>
                    </div>
                  </div>

                  {/* Sessions recorded on selected date */}
                  {selectedDaySummary.sessions.length === 0 && selectedDaySummary.journals.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm font-medium text-slate-800">
                        No coding sessions recorded on {formatHumanDate(selectedDate)}.
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Use the Quick Daily Check-In bar above or click &ldquo;Detailed Log&rdquo; to record your progress for this day.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 mt-2">
                      {selectedDaySummary.sessions.map((s) => (
                        <div key={s.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                          <div>
                            <div className="font-semibold text-slate-900">{s.title}</div>
                            <div className="text-slate-500 mt-0.5">
                              <span>{s.category}</span>
                              {s.notes && (
                                <>
                                  <span className="mx-1.5" aria-hidden="true">·</span>
                                  <span>{s.notes}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0 font-mono tabular-nums text-slate-700">
                            <span>
                              {s.sessionsCount}x ({s.durationMinutes}m)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleIncrementSession(s.id)}
                              className="px-1.5 py-0.5 text-[11px] bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded transition-colors"
                              title="Coded another session on this task (+1 session & +30m)"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditSessionModal(s)}
                              className="text-slate-400 hover:text-slate-900 transition-colors"
                              aria-label={`Edit session ${s.title}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSession(s.id)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              aria-label={`Remove session ${s.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {selectedDaySummary.journals.map((j) => (
                        <div key={j.id} className="py-3 text-xs">
                          <div className="text-emerald-700 font-medium">
                            Journal Reflection · {j.milestone}
                          </div>
                          <div className="font-semibold text-slate-900 mt-0.5">{j.title}</div>
                          <p className="text-slate-600 mt-1 line-clamp-2">{j.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Click any square on the contribution graph above to inspect or log on past dates.</span>
                  <button
                    type="button"
                    onClick={() => setActiveSection('journal')}
                    className="font-medium text-slate-900 hover:underline whitespace-nowrap shrink-0"
                  >
                    Open Full Journal
                  </button>
                </div>
              </div>

              {/* Last 7 Days Cadence & Focus Breakdown (5 columns) */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 pb-4 border-b border-slate-200">
                    Last 7 Days Coding Frequency
                  </h3>

                  <div className="mt-4 space-y-2.5">
                    {metrics.last7Days.map((day) => {
                      const pct = Math.min(
                        100,
                        Math.round((day.sessionsCount / Math.max(1, targets.dailySessionsGoal)) * 100)
                      );
                      const isSel = day.dateStr === selectedDate;
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => setSelectedDate(day.dateStr)}
                          className={`w-full text-left py-1.5 px-2 rounded-lg transition-colors flex items-center justify-between gap-3 text-xs ${
                            isSel ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="w-24 font-mono tabular-nums text-slate-700 shrink-0">
                            {day.label} ({day.dateStr.slice(5)})
                          </span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 transition-transform duration-150 origin-left"
                              style={{ transform: `scaleX(${pct / 100})` }}
                            />
                          </div>
                          <span className="w-28 text-right font-mono tabular-nums text-slate-800 shrink-0">
                            {day.sessionsCount} {day.sessionsCount === 1 ? 'time' : 'times'} · {day.minutes}m
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Focus Category Distribution */}
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2.5">
                    Cumulative Sessions by Focus Area
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {FOCUS_CATEGORIES.map((cat) => {
                      const stat = metrics.categoryTotals[cat];
                      return (
                        <div key={cat} className="flex items-center justify-between py-0.5">
                          <span className="text-slate-600 truncate pr-2">{cat}</span>
                          <span className="font-mono tabular-nums font-medium text-slate-900 shrink-0">
                            {stat.sessions}x
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Developer Progress Journal Section */}
        {(activeSection === 'overview' || activeSection === 'journal') && (
          <JournalWorkspace
            journals={journals}
            dayMap={dayMap}
            selectedDate={selectedDate}
            onSaveJournal={handleSaveJournal}
            onDeleteJournal={handleDeleteJournal}
            initialComposerOpen={activeSection === 'journal'}
          />
        )}

        {/* Coding Session Ledger Table Section */}
        {(activeSection === 'overview' || activeSection === 'sessions') && (
          <SessionLogTable
            sessions={sessions}
            onOpenLogModal={(defaultDate) => openLogModalForDate(defaultDate, 45)}
            onEditSession={openEditSessionModal}
            onIncrementSession={handleIncrementSession}
            onDeleteSession={handleDeleteSession}
          />
        )}
      </main>

      {/* Quiet Footer with Real Data Management Controls (Export / Import / Clear) */}
      <footer className="bg-white border-t border-slate-200 px-6 py-5 mt-12">
        <div className="max-w-[1320px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            CommitLog — Persistent Daily Coding Tracker. Your progress saves automatically every day to local storage and server disk.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportData}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Import JSON Backup
            </button>
            <button
              type="button"
              onClick={handleExportData}
              className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON Backup
            </button>

            {confirmClearOpen ? (
              <span className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAllData}
                  className="text-red-600 font-semibold hover:underline whitespace-nowrap shrink-0"
                >
                  Confirm Reset to Zero
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(false)}
                  className="text-slate-500 hover:text-slate-800 whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset All to Zero
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Log / Edit Coding Session Modal */}
      <SessionLoggerModal
        isOpen={isLogModalOpen}
        defaultDate={modalDefaultDate}
        defaultDuration={modalDefaultDuration}
        editingSession={editingSession}
        onClose={() => {
          setIsLogModalOpen(false);
          setEditingSession(null);
        }}
        onSaveSession={handleSaveSession}
      />
    </div>
  );
}
