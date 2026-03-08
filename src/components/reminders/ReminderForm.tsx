// ============================================================================
// REMINDERFORM.TSX - New/Edit Reminder Form Modal
// ============================================================================

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { db } from '../../db/schema';
import { categories, type CategoryKey } from '../../utils/categories';

interface ReminderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  preFillDate?: string | null;
  editingReminder?: any | null;
}

export default function ReminderForm({ isOpen, onClose, onSaved, preFillDate, editingReminder }: ReminderFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryKey>('other');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ============================================================================
  // EFFECT: Pre-fill form when editing or adding for specific date
  // ============================================================================
  useEffect(() => {
    if (editingReminder) {
      // Edit mode - pre-fill with existing data
      setTitle(editingReminder.title || '');
      setDescription(editingReminder.description || '');
      setCategory((editingReminder.category as CategoryKey) || 'other');
      setScheduledDate(editingReminder.scheduledDate || '');
      setScheduledTime(editingReminder.scheduledTime || '');
    } else if (preFillDate) {
      // New reminder for specific date
      setTitle('');
      setDescription('');
      setCategory('other');
      setScheduledDate(preFillDate);
      setScheduledTime('09:00');
    } else {
      // New reminder (default)
      setTitle('');
      setDescription('');
      setCategory('other');
      setScheduledDate(new Date().toISOString().split('T')[0]);
      setScheduledTime('09:00');
    }
  }, [editingReminder, preFillDate, isOpen]);

  // ============================================================================
  // FUNCTION: Handle Form Submission
  // ============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Please enter a title for your reminder');
      return;
    }

    setIsSaving(true);

    try {
      if (editingReminder) {
        // UPDATE existing reminder
        await db.reminders.update(editingReminder.id, {
          title: title.trim(),
          description: description.trim(),
          category,
          scheduledDate,
          scheduledTime,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Reminder updated');
      } else {
        // CREATE new reminder
        await db.reminders.add({
          title: title.trim(),
          description: description.trim(),
          category,
          scheduledDate,
          scheduledTime,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Reminder created');
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('❌ Error saving reminder:', error);
      alert('Failed to save reminder. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // RENDER: Modal
  // ============================================================================
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50">
      <div className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl font-bold text-white">
            {editingReminder ? 'Edit Reminder' : 'New Reminder'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to remember?"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details (optional)"
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(categories) as CategoryKey[]).map((key) => {
                const cat = categories[key];
                const isSelected = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`p-3 rounded-lg border transition flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                    style={{
                      borderColor: isSelected ? cat.color : undefined,
                      backgroundColor: isSelected ? `${cat.color}30` : undefined
                    }}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-xs text-gray-400">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Time *
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Warning for Past Dates */}
          {scheduledDate && scheduledTime && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-xs text-yellow-500">
                ⚠️ Reminders can only be edited if they are scheduled for the future.
              </p>
            </div>
          )}

          {/* Submit Button - Blue Gradient */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 rounded-lg font-medium transition text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
            }}
          >
            {isSaving ? 'Saving...' : (editingReminder ? 'Update Reminder' : 'Create Reminder')}
          </button>
        </form>
      </div>
    </div>
  );
}