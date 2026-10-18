export type FocusCategory =
  | 'TypeScript / Frontend'
  | 'Backend & APIs'
  | 'Algorithms & DSA'
  | 'System Architecture'
  | 'Database & SQL'
  | 'DevOps & Tooling';

export type JournalMilestone =
  | 'Feature Shipped'
  | 'Deep Work'
  | 'Bug Resolved'
  | 'Concept Mastered'
  | 'Refactoring';

export interface CodingSession {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: FocusCategory;
  sessionsCount: number; // How many coding blocks/times coded in this entry (default 1, can be 1+)
  durationMinutes: number;
  notes?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  wentWell: string;
  blockers: string;
  nextSteps: string;
  category: FocusCategory;
  milestone: JournalMilestone;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTargets {
  dailySessionsGoal: number;
  dailyMinutesGoal: number;
  weeklyDaysGoal: number;
}

export interface DaySummary {
  date: string; // YYYY-MM-DD
  totalSessions: number;
  totalMinutes: number;
  sessions: CodingSession[];
  journals: JournalEntry[];
}
