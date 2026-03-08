import { useState, useEffect } from 'react';
import { db } from '../../db/schema';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryCalendarProps {
  category: string;
  categoryColor: string;
  onClose: () => void;
}

export default function CategoryCalendar({ category, categoryColor, onClose }: CategoryCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCompletedDates();
  }, [currentMonth, category]);

  const loadCompletedDates = async () => {
    const logs = await db.activityLogs.toArray();
    const reminders = await db.reminders.toArray();
    
    const categoryReminderIds = reminders
      .filter(r => r.category === category)
      .map(r => r.id);

    const completedDatesSet = new Set<string>();
    
    logs
      .filter(l => l.action === 'completed' && categoryReminderIds.includes(l.reminderId))
      .forEach(log => {
        const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
        completedDatesSet.add(dateStr);
      });

    setCompletedDates(completedDatesSet);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 1; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const isCompleted = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    return completedDates.has(dateStr);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Convert hex to RGBA for lighter appearance
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = monthNames[currentMonth.getMonth()];
  const year = currentMonth.getFullYear();

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 w-full max-w-sm rounded-2xl p-6 border border-gray-800">
        {/* Header with Close Button */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">   </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-800 rounded-full">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          <span className="text-white font-medium">
            {monthName} {year}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-800 rounded-full">
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-xs text-gray-500 py-2">{day}</div>
          ))}
        </div>

        {/* Calendar Grid - Fixed Height */}
        <div className="grid grid-cols-7 gap-1 min-h-[280px]">
          {days.map((day, index) => (
            <div key={index} className="aspect-square flex items-center justify-center">
              {day ? (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition"
                  style={{
                    backgroundColor: isCompleted(day) ? hexToRgba(categoryColor, 0.6) : 'transparent',
                    color: isCompleted(day) ? '#fff' : '#6b7280'
                  }}
                >
                  {day}
                </div>
              ) : (
                <div className="w-8 h-8"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}