import { CodingSession, DailyTargets, FocusCategory, JournalEntry } from '../types';

export function formatDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayStr(): string {
  return formatDateStr(new Date());
}

export function addDays(dateStr: string, offset: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + offset);
  return formatDateStr(dt);
}

export function formatHumanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export const FOCUS_CATEGORIES: FocusCategory[] = [
  'TypeScript / Frontend',
  'Backend & APIs',
  'Algorithms & DSA',
  'System Architecture',
  'Database & SQL',
  'DevOps & Tooling',
];

export const DEFAULT_TARGETS: DailyTargets = {
  dailySessionsGoal: 3,
  dailyMinutesGoal: 120,
  weeklyDaysGoal: 6,
};

const SAMPLE_SESSION_TEMPLATES: {
  title: string;
  category: FocusCategory;
  durationMinutes: number;
  sessionsCount: number;
  notes: string;
}[] = [
  {
    title: 'Implemented virtualized data grid and keyboard navigation',
    category: 'TypeScript / Frontend',
    durationMinutes: 65,
    sessionsCount: 1,
    notes: 'Reduced DOM nodes from 4,200 to 48 visible rows with zero scroll jank.',
  },
  {
    title: 'Solved graph shortest-path & dynamic programming set',
    category: 'Algorithms & DSA',
    durationMinutes: 50,
    sessionsCount: 1,
    notes: 'Completed Dijkstra with binary heap and memoized knapsack variations.',
  },
  {
    title: 'Built idempotent webhook processor & retry queue',
    category: 'Backend & APIs',
    durationMinutes: 85,
    sessionsCount: 2,
    notes: 'Added exponential backoff with jitter and dead-letter inspection.',
  },
  {
    title: 'Optimized composite indexing on time-series queries',
    category: 'Database & SQL',
    durationMinutes: 45,
    sessionsCount: 1,
    notes: 'Cut p95 query execution time from 140ms down to 11ms using covering index.',
  },
  {
    title: 'Refactored state machine for local-first sync engine',
    category: 'System Architecture',
    durationMinutes: 75,
    sessionsCount: 2,
    notes: 'Deterministic conflict resolution for offline mutations.',
  },
  {
    title: 'Configured automated build pipeline & bundle size checks',
    category: 'DevOps & Tooling',
    durationMinutes: 40,
    sessionsCount: 1,
    notes: 'Enforced tree-shaking budget and source-map analysis.',
  },
  {
    title: 'Designed accessible command palette & shortcut parser',
    category: 'TypeScript / Frontend',
    durationMinutes: 55,
    sessionsCount: 1,
    notes: 'Added fuzzy matching and full ARIA roving tabindex support.',
  },
  {
    title: 'Implemented token bucket rate limiter middleware',
    category: 'Backend & APIs',
    durationMinutes: 60,
    sessionsCount: 1,
    notes: 'Sliding window counter with clean HTTP 429 Retry-After headers.',
  },
];

// Deterministic pseudo-random helper so initial seed data is stable
function seededNumber(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function generateInitialSessions(todayStr: string): CodingSession[] {
  const sessions: CodingSession[] = [];

  // Always include 2 sessions today and sessions across a current 9-day streak,
  // plus realistic activity across the past 365 days.
  for (let offset = 0; offset >= -364; offset--) {
    const dateStr = addDays(todayStr, offset);
    const absOffset = Math.abs(offset);

    // Guarantee a 9-day active streak up to today
    const isCurrentStreak = absOffset <= 8;
    const rand = seededNumber(absOffset + 101);

    // Higher activity in recent 120 days (~68% of days active), moderate earlier (~48% active)
    const activeThreshold = absOffset < 120 ? 0.32 : 0.52;
    const isActiveDay = isCurrentStreak || rand > activeThreshold;

    if (!isActiveDay) continue;

    // Determine how many session records on this day (1 to 3 entries)
    let entryCount = 1;
    if (offset === 0) {
      entryCount = 2; // Today has 2 logged sessions already
    } else if (rand > 0.86) {
      entryCount = 3;
    } else if (rand > 0.58) {
      entryCount = 2;
    }

    for (let i = 0; i < entryCount; i++) {
      const tplIdx = (absOffset * 3 + i * 5) % SAMPLE_SESSION_TEMPLATES.length;
      const tpl = SAMPLE_SESSION_TEMPLATES[tplIdx];
      const durationVariation = Math.round((seededNumber(absOffset * 7 + i) - 0.5) * 20);
      const durationMinutes = Math.max(20, tpl.durationMinutes + durationVariation);

      sessions.push({
        id: `seed-session-${dateStr}-${i}`,
        date: dateStr,
        title: tpl.title,
        category: tpl.category,
        sessionsCount: i === 0 && rand > 0.78 ? 2 : 1,
        durationMinutes,
        notes: tpl.notes,
        createdAt: `${dateStr}T${String(9 + i * 4).padStart(2, '0')}:30:00.000Z`,
      });
    }
  }

  return sessions;
}

export function generateInitialJournals(todayStr: string): JournalEntry[] {
  return [
    {
      id: 'seed-journal-1',
      date: todayStr,
      title: 'Sub-millisecond date aggregation & contribution matrix architecture',
      content:
        'Focused today on structuring the 52-week contribution matrix and memoizing daily session rollups. Moving the date index to an O(1) lookup map eliminated redundant array scans when scrubbing across 365 days of coding telemetry.',
      wentWell:
        'Clean separation between raw session logs and aggregated day summaries. Keyboard navigation through heatmap cells feels crisp.',
      blockers:
        'Handling timezone boundary shifts when parsing YYYY-MM-DD strings in local time vs UTC.',
      nextSteps:
        'Add batch JSON export and refine the focus timer auto-log transition.',
      category: 'TypeScript / Frontend',
      milestone: 'Feature Shipped',
      createdAt: `${todayStr}T14:20:00.000Z`,
      updatedAt: `${todayStr}T14:20:00.000Z`,
    },
    {
      id: 'seed-journal-2',
      date: addDays(todayStr, -1),
      title: 'Idempotent webhook consumers and dead-letter queue recovery',
      content:
        'Designed a deterministic retry loop for incoming payment and deployment webhooks. Used composite idempotency keys so duplicate network deliveries are safely ignored without locking the primary transaction table.',
      wentWell:
        'Wrote 14 integration test cases simulating network partitions and out-of-order event timestamps.',
      blockers:
        'Initial connection pool exhaustion during burst replay tests.',
      nextSteps:
        'Benchmark worker concurrency limits under 500 req/sec load.',
      category: 'Backend & APIs',
      milestone: 'Deep Work',
      createdAt: `${addDays(todayStr, -1)}T18:10:00.000Z`,
      updatedAt: `${addDays(todayStr, -1)}T18:10:00.000Z`,
    },
    {
      id: 'seed-journal-3',
      date: addDays(todayStr, -3),
      title: 'Mastering monotonic stack & segment tree range queries',
      content:
        'Dedicated two focused morning blocks to monotonic stack problems (largest rectangle in histogram, daily temperatures) and lazy-propagation segment trees. Drawing the tree invariants on paper before writing code cut debugging time in half.',
      wentWell:
        'Solved 4 hard-rated graph & range query problems without consulting editorial hints.',
      blockers:
        'Off-by-one indexing in 0-based segment tree leaf nodes.',
      nextSteps:
        'Practice Fenwick tree (Binary Indexed Tree) space optimizations this weekend.',
      category: 'Algorithms & DSA',
      milestone: 'Concept Mastered',
      createdAt: `${addDays(todayStr, -3)}T11:45:00.000Z`,
      updatedAt: `${addDays(todayStr, -3)}T11:45:00.000Z`,
    },
    {
      id: 'seed-journal-4',
      date: addDays(todayStr, -5),
      title: 'Eliminated N+1 query bottleneck in analytics rollup endpoint',
      content:
        'Inspected slow query logs and discovered a nested loop firing per-project count queries. Replaced 38 sequential round-trips with a single CTE and window function (`SUM() OVER (PARTITION BY ...)`).',
      wentWell:
        'Endpoint latency dropped from 620ms to 18ms at p99.',
      blockers:
        'Ensuring null-safe aggregation when projects have zero recorded events.',
      nextSteps:
        'Add automated query plan regression checks to CI.',
      category: 'Database & SQL',
      milestone: 'Bug Resolved',
      createdAt: `${addDays(todayStr, -5)}T16:05:00.000Z`,
      updatedAt: `${addDays(todayStr, -5)}T16:05:00.000Z`,
    },
    {
      id: 'seed-journal-5',
      date: addDays(todayStr, -8),
      title: 'Local-first state synchronization & optimistic UI updates',
      content:
        'Mapped out the state transition diagram for offline-capable forms. By queuing mutations with monotonic Lamport timestamps, the UI can reflect changes in <16ms while persisting durability in the background.',
      wentWell:
        'Zero state flicker during simulated offline/online toggles.',
      blockers:
        'Schema migration versioning for older cached payloads.',
      nextSteps:
        'Document the storage adapter contract for future modules.',
      category: 'System Architecture',
      milestone: 'Refactoring',
      createdAt: `${addDays(todayStr, -8)}T19:30:00.000Z`,
      updatedAt: `${addDays(todayStr, -8)}T19:30:00.000Z`,
    },
  ];
}
