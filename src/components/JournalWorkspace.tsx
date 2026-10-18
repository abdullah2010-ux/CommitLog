import React, { useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { FOCUS_CATEGORIES, formatHumanDate, getTodayStr } from '../data/seedData';
import { DaySummary, FocusCategory, JournalEntry, JournalMilestone } from '../types';

interface JournalWorkspaceProps {
  journals: JournalEntry[];
  dayMap: Record<string, DaySummary>;
  selectedDate: string;
  onSaveJournal: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => void;
  onDeleteJournal: (id: string) => void;
  initialComposerOpen?: boolean;
}

const MILESTONES: JournalMilestone[] = [
  'Feature Shipped',
  'Deep Work',
  'Bug Resolved',
  'Concept Mastered',
  'Refactoring',
];

export const JournalWorkspace: React.FC<JournalWorkspaceProps> = ({
  journals,
  dayMap,
  selectedDate,
  onSaveJournal,
  onDeleteJournal,
  initialComposerOpen = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [milestoneFilter, setMilestoneFilter] = useState<JournalMilestone | 'All'>('All');
  const [isComposing, setIsComposing] = useState(initialComposerOpen);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState(selectedDate || getTodayStr());
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FocusCategory>('TypeScript / Frontend');
  const [milestone, setMilestone] = useState<JournalMilestone>('Deep Work');
  const [content, setContent] = useState('');
  const [wentWell, setWentWell] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  const openNewEntry = (targetDate?: string) => {
    setEditingId(null);
    setDate(targetDate || selectedDate || getTodayStr());
    setTitle('');
    setCategory('TypeScript / Frontend');
    setMilestone('Deep Work');
    setContent('');
    setWentWell('');
    setBlockers('');
    setNextSteps('');
    setIsComposing(true);
  };

  const openEditEntry = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setTitle(entry.title);
    setCategory(entry.category);
    setMilestone(entry.milestone);
    setContent(entry.content);
    setWentWell(entry.wentWell);
    setBlockers(entry.blockers);
    setNextSteps(entry.nextSteps);
    setIsComposing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onSaveJournal(
      {
        date,
        title: title.trim(),
        category,
        milestone,
        content: content.trim(),
        wentWell: wentWell.trim(),
        blockers: blockers.trim(),
        nextSteps: nextSteps.trim(),
      },
      editingId || undefined
    );

    setIsComposing(false);
    setEditingId(null);
  };

  const filteredJournals = useMemo(() => {
    return journals
      .filter((j) => {
        if (milestoneFilter !== 'All' && j.milestone !== milestoneFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            j.title.toLowerCase().includes(q) ||
            j.content.toLowerCase().includes(q) ||
            j.wentWell.toLowerCase().includes(q) ||
            j.blockers.toLowerCase().includes(q) ||
            j.nextSteps.toLowerCase().includes(q) ||
            j.category.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => (a.date === b.date ? b.updatedAt.localeCompare(a.updatedAt) : b.date.localeCompare(a.date)));
  }, [journals, milestoneFilter, searchQuery]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Developer Progress Journal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Document architectural decisions, daily wins, debugging breakthroughs, and tomorrow&apos;s priorities.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isComposing && (
            <button
              type="button"
              onClick={() => openNewEntry(selectedDate)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Write Journal Entry
            </button>
          )}
        </div>
      </div>

      {/* Inline Journal Editor / Composer */}
      {isComposing && (
        <form onSubmit={handleSubmit} className="my-6 pb-6 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingId ? 'Edit Journal Entry' : 'New Progress Reflection'}
            </h3>
            <button
              type="button"
              onClick={() => setIsComposing(false)}
              className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Entry Date
              </label>
              <input
                type="date"
                required
                max={getTodayStr()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Primary Focus Area
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FocusCategory)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              >
                {FOCUS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Milestone Type
              </label>
              <select
                value={milestone}
                onChange={(e) => setMilestone(e.target.value as JournalMilestone)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              >
                {MILESTONES.map((ms) => (
                  <option key={ms} value={ms}>
                    {ms}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Headline / What did you build or learn today?
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Implemented binary heap priority queue & fixed race condition"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Detailed Progress Notes
            </label>
            <textarea
              rows={3}
              required
              placeholder="Walk through your implementation, key takeaways, or architectural tradeoffs..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                What Went Well (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Key breakthroughs or clean patterns..."
                value={wentWell}
                onChange={(e) => setWentWell(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Blockers / Bugs Hit (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Tricky edge cases or bottlenecks..."
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Next Steps for Tomorrow (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Where to pick up next session..."
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsComposing(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
            >
              {editingId ? 'Update Entry' : 'Save Journal Entry'}
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Segmented Milestone Filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setMilestoneFilter('All')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              milestoneFilter === 'All'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Entries ({journals.length})
          </button>
          {MILESTONES.map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => setMilestoneFilter(ms)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                milestoneFilter === ms
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {ms}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search journal reflections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Journal Entries Feed (Unboxed metadata, hairline dividers, zero nested cards) */}
      <div className="mt-6 divide-y divide-slate-200">
        {filteredJournals.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-slate-900">
              No journal entries match the current filter.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Record what you worked on today to build a searchable log of your engineering growth.
            </p>
            <button
              type="button"
              onClick={() => openNewEntry(selectedDate)}
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Log First Entry
            </button>
          </div>
        ) : (
          filteredJournals.map((entry) => {
            const dayActivity = dayMap[entry.date];
            const daySessions = dayActivity?.totalSessions || 0;
            const dayMins = dayActivity?.totalMinutes || 0;

            return (
              <article key={entry.id} className="py-6 first:pt-2 last:pb-2">
                {/* Unboxed Metadata Kicker */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
                    <span className="font-semibold text-slate-800">
                      {formatHumanDate(entry.date)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-sans text-slate-700 font-medium">
                      {entry.milestone}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-sans text-slate-600">{entry.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700">
                      {daySessions} {daySessions === 1 ? 'session' : 'sessions'} ({dayMins} mins coded)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEditEntry(entry)}
                      className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
                      aria-label={`Edit ${entry.title}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteJournal(entry.id)}
                      className="text-xs text-slate-400 hover:text-red-600 inline-flex items-center gap-1 transition-colors"
                      aria-label={`Delete ${entry.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Primary Entry Title */}
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  {entry.title}
                </h3>

                {/* Main Narrative */}
                <p className="text-sm text-slate-700 leading-relaxed mt-2 max-w-[75ch]">
                  {entry.content}
                </p>

                {/* Structured Reflection Grid (Whitespace + subtle top hairline, no thick left borders) */}
                {(entry.wentWell || entry.blockers || entry.nextSteps) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 pt-4 border-t border-slate-100 text-xs">
                    {entry.wentWell && (
                      <div>
                        <span className="font-semibold text-slate-900 block mb-1">
                          What Went Well
                        </span>
                        <p className="text-slate-600 leading-relaxed">{entry.wentWell}</p>
                      </div>
                    )}
                    {entry.blockers && (
                      <div>
                        <span className="font-semibold text-slate-900 block mb-1">
                          Blockers &amp; Edge Cases
                        </span>
                        <p className="text-slate-600 leading-relaxed">{entry.blockers}</p>
                      </div>
                    )}
                    {entry.nextSteps && (
                      <div>
                        <span className="font-semibold text-slate-900 block mb-1">
                          Next Session Priority
                        </span>
                        <p className="text-slate-600 leading-relaxed">{entry.nextSteps}</p>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};
