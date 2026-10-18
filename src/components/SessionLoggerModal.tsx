import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { FOCUS_CATEGORIES, getTodayStr } from '../data/seedData';
import { CodingSession, FocusCategory } from '../types';

interface SessionLoggerModalProps {
  isOpen: boolean;
  defaultDate: string;
  defaultDuration?: number;
  editingSession?: CodingSession | null;
  onClose: () => void;
  onSaveSession: (session: Omit<CodingSession, 'id' | 'createdAt'>, existingId?: string) => void;
}

export const SessionLoggerModal: React.FC<SessionLoggerModalProps> = ({
  isOpen,
  defaultDate,
  defaultDuration = 45,
  editingSession = null,
  onClose,
  onSaveSession,
}) => {
  const [date, setDate] = useState(defaultDate || getTodayStr());
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FocusCategory>('TypeScript / Frontend');
  const [sessionsCount, setSessionsCount] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(defaultDuration);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingSession) {
        setDate(editingSession.date);
        setTitle(editingSession.title);
        setCategory(editingSession.category);
        setSessionsCount(editingSession.sessionsCount);
        setDurationMinutes(editingSession.durationMinutes);
        setNotes(editingSession.notes || '');
      } else {
        setDate(defaultDate || getTodayStr());
        setDurationMinutes(defaultDuration || 45);
        setTitle('');
        setCategory('TypeScript / Frontend');
        setSessionsCount(1);
        setNotes('');
      }
    }
  }, [isOpen, defaultDate, defaultDuration, editingSession]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveSession(
      {
        date,
        title: title.trim(),
        category,
        sessionsCount: Math.max(1, Number(sessionsCount) || 1),
        durationMinutes: Math.max(1, Number(durationMinutes) || 30),
        notes: notes.trim() || undefined,
      },
      editingSession?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-log-session-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 id="modal-log-session-title" className="text-base font-bold text-slate-900">
              {editingSession ? 'Edit Coding Session' : 'Log Coding Session'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editingSession
                ? 'Update your session count, duration, or notes for this day.'
                : 'Record your coding activity to update your daily streak and contribution graph.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date
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
                Focus Area
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
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              What did you code?
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g., Built authentication middleware & solved 2 tree problems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Times Coded (Sessions)
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSessionsCount(num)}
                    className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg border transition-colors ${
                      sessionsCount === num
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Total Duration (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Technical Notes / Commit Summary (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Key files touched, algorithms used, or metrics improved..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
            >
              {editingSession ? 'Update Coding Session' : 'Save Coding Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
