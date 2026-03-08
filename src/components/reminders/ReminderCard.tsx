// ============================================================================
// REMINDERCARD.TSX - Individual Reminder Card Component
// ============================================================================

import { Calendar, Clock, Edit2, Trash2 } from 'lucide-react';
import { categories } from '../../utils/categories';

interface ReminderCardProps {
  reminder: {
    id: number;
    title: string;
    description?: string;
    category: string;
    scheduledDate: string;
    scheduledTime: string;
  };
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showCategory?: boolean;
}

// ============================================================================
// HELPER: Check if Reminder is Editable (Future Date/Time)
// ============================================================================
const isReminderEditable = (scheduledDate: string, scheduledTime: string): boolean => {
  const now = new Date();
  const reminderDateTime = new Date(`${scheduledDate} ${scheduledTime}`);
  return reminderDateTime > now;
};

export default function ReminderCard({ reminder, onClick, onEdit, onDelete, showCategory = true }: ReminderCardProps) {
  const category = categories[reminder.category as keyof typeof categories];
  const editable = isReminderEditable(reminder.scheduledDate, reminder.scheduledTime);
  
  // ============================================================================
  // HELPER: Format Date for Display (No Timezone Shift)
  // ============================================================================
  const formatDate = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    if (dateStr === today) {
      return 'Today';
    } else if (dateStr === tomorrowStr) {
      return 'Tomorrow';
    } else {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div 
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition cursor-pointer"
    >
      <div className="flex items-start gap-3">
        {/* Main Content */}
        <div className="flex-1">
          {/* Title with Edit/Delete Icons */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-white font-semibold text-base">
              {reminder.title}
            </h3>
            
            {/* Edit & Delete Icons (Only for Future Reminders) */}
            {editable && (
              <div className="flex items-center gap-1">
                {onEdit && (
                  <Edit2 
                    onClick={handleEditClick}
                    className="w-4 h-4 text-yellow-500 cursor-pointer hover:text-yellow-400 transition"
                    title="Edit reminder"
                  />
                )}
                {onDelete && (
                  <Trash2 
                    onClick={handleDeleteClick}
                    className="w-4 h-4 text-red-500 cursor-pointer hover:text-red-400 transition"
                    title="Delete reminder"
                  />
                )}
              </div>
            )}
          </div>
          
          {/* Description */}
          {reminder.description && (
            <p className="text-gray-400 text-sm mb-3 line-clamp-2">
              {reminder.description}
            </p>
          )}
          
          {/* Date & Time */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(reminder.scheduledDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{reminder.scheduledTime}</span>
            </div>
            {!editable && (
              <span className="text-xs text-gray-600 italic">(Past)</span>
            )}
          </div>
        </div>
        
        {/* Category Badge */}
        {showCategory && category && (
          <span 
            className="text-xs px-2 py-1 rounded-full text-white font-medium whitespace-nowrap"
            style={{ backgroundColor: category.color }}
          >
            {category.label}
          </span>
        )}
      </div>
    </div>
  );
}