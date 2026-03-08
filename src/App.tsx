// ============================================================================
// APP.TSX - Main Application Component (Habitminder)
// ============================================================================

import { useState, useEffect } from 'react';
import { Plus, BarChart3, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { db } from './db/schema';
import { categories, type CategoryKey } from './utils/categories';
import ReminderCard from './components/reminders/ReminderCard';
import ReminderForm from './components/reminders/ReminderForm';
import DeleteConfirmModal from './components/reminders/DeleteConfirmModal';
import Dashboard from './components/reports/Dashboard';

// ============================================================================
// HELPER: Adjust Color Brightness for Gradients
// ============================================================================
const adjustColorBrightness = (hex: string, factor: number): string => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// ============================================================================
// HELPER: Check if Reminder is Editable (Future Date/Time)
// ============================================================================
const isReminderEditable = (scheduledDate: string, scheduledTime: string): boolean => {
  const now = new Date();
  const reminderDateTime = new Date(`${scheduledDate} ${scheduledTime}`);
  return reminderDateTime > now;
};

// ============================================================================
// HELPER FUNCTIONS: Calculate Stats
// ============================================================================

const calculateCurrentStreak = async (): Promise<number> => {
  try {
    const logs = await db.activityLogs.toArray();
    const completedLogs = logs.filter(l => l.action === 'completed');
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasCompletion = completedLogs.some(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate === dateStr;
      });
      
      if (hasCompletion) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
};

const calculateBestStreak = async (): Promise<number> => {
  try {
    const logs = await db.activityLogs.toArray();
    const completedLogs = logs.filter(l => l.action === 'completed');
    
    const uniqueDates = [...new Set(completedLogs.map(l => new Date(l.timestamp).toISOString().split('T')[0]))];
    uniqueDates.sort();
    
    let bestStreak = 0;
    let tempStreak = 1;
    
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const date1 = new Date(uniqueDates[i]);
      const date2 = new Date(uniqueDates[i + 1]);
      const diffDays = Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    
    return Math.max(bestStreak, 1);
  } catch (error) {
    console.error('Error calculating best streak:', error);
    return 0;
  }
};

const calculateWeeklyCompletionRate = (logs: any[]): number => {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const weekLogs = logs.filter(l => {
    const logDate = new Date(l.timestamp);
    return logDate >= weekAgo;
  });
  
  const completed = weekLogs.filter(l => l.action === 'completed').length;
  const total = weekLogs.length;
  
  if (total === 0) return 0;
  
  return Math.round((completed / total) * 100);
};

const calculateMonthlyCompletions = (logs: any[]): number => {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  
  return logs.filter(l => {
    const logDate = new Date(l.timestamp);
    return logDate >= monthAgo && l.action === 'completed';
  }).length;
};

const calculateConsistencyScore = (logs: any[]): number => {
  const dailyCounts: { [key: string]: number } = {};
  
  logs.filter(l => l.action === 'completed').forEach(log => {
    const date = new Date(log.timestamp).toISOString().split('T')[0];
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  });
  
  const counts = Object.values(dailyCounts);
  if (counts.length === 0) return 0;
  
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);
  
  const score = Math.max(0, Math.min(100, Math.round(100 - (stdDev / (mean || 1)) * 100)));
  return score;
};

// ============================================================================
// TYPES
// ============================================================================
type ViewMode = 'date' | 'category' | 'all';

interface GroupedReminders {
  dateLabel: string;
  date: string;
  reminders: any[];
}

interface CategoryGroup {
  key: CategoryKey;
  label: string;
  icon: string;
  color: string;
  reminders: any[];
  count: number;
}

interface CalendarDay {
  day: number;
  dateStr: string;
  hasReminders: boolean;
  isToday: boolean;
  isSelected: boolean;
}

// ============================================================================
// MAIN COMPONENT: App
// ============================================================================
export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formPreFillDate, setFormPreFillDate] = useState<string | null>(null);
  const [editingReminder, setEditingReminder] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<any | null>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [allReminders, setAllReminders] = useState<any[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryKey>>(new Set());
  const [allCategoriesExpanded, setAllCategoriesExpanded] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [weeklyRate, setWeeklyRate] = useState(0);
  const [monthlyCompletions, setMonthlyCompletions] = useState(0);
  const [consistencyScore, setConsistencyScore] = useState(0);
  
  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    if (!showDashboard) {
      loadReminders();
    }
  }, [showDashboard]);

  const loadReminders = async () => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const allRems = await db.reminders.toArray();
      const allLogs = await db.activityLogs.toArray();
      
      const filteredReminders = allRems.filter(r => {
        if (r.isActive !== true) return false;
        
        const reminderDate = new Date(`${r.scheduledDate} ${r.scheduledTime}`);
        const reminderDateOnly = reminderDate.toISOString().split('T')[0];
        
        return reminderDateOnly >= today;
      });
      
      const sorted = filteredReminders.sort((a: any, b: any) => {
        const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`).getTime();
        const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`).getTime();
        return dateA - dateB;
      });
      
      const completed = allLogs.filter(l => {
        const logDate = new Date(l.timestamp).toISOString().split('T')[0];
        return logDate === today && l.action === 'completed';
      });
      
      const streak = await calculateCurrentStreak();
      const best = await calculateBestStreak();
      const weekly = calculateWeeklyCompletionRate(allLogs);
      const monthly = calculateMonthlyCompletions(allLogs);
      const consistency = calculateConsistencyScore(allLogs);
      
      console.log('✅ Loaded reminders:', sorted.length);
      setReminders(sorted);
      setAllReminders(allRems.filter(r => r.isActive === true));
      setCompletedToday(completed.length);
      setCurrentStreak(streak);
      setBestStreak(best);
      setWeeklyRate(weekly);
      setMonthlyCompletions(monthly);
      setConsistencyScore(consistency);
    } catch (error) {
      console.error('❌ Error loading reminders:', error);
    }
  };

  const handleReminderSaved = () => {
    loadReminders();
    setFormPreFillDate(null);
    setEditingReminder(null);
  };

  const handleCardClick = (reminderId: number) => {
    console.log('Reminder clicked:', reminderId);
  };

  const handleEditReminder = (reminder: any) => {
    if (!isReminderEditable(reminder.scheduledDate, reminder.scheduledTime)) {
      alert('Cannot edit past reminders. You can only edit reminders scheduled for the future.');
      return;
    }
    setEditingReminder(reminder);
    setIsFormOpen(true);
  };

  const handleDeleteReminder = (reminder: any) => {
    setReminderToDelete(reminder);
    setShowDeleteModal(true);
  };

  const confirmDeleteReminder = async () => {
    if (!reminderToDelete) return;

    try {
      await db.reminders.delete(reminderToDelete.id);
      console.log('✅ Reminder deleted');
      loadReminders();
      setShowDeleteModal(false);
      setReminderToDelete(null);
    } catch (error) {
      console.error('❌ Error deleting reminder:', error);
      alert('Failed to delete reminder. Please try again.');
    }
  };

  const handleCategoryTabClick = () => {
    if (viewMode === 'category') {
      if (allCategoriesExpanded) {
        setExpandedCategories(new Set());
        setAllCategoriesExpanded(false);
      } else {
        const allKeys = new Set(Object.keys(categories) as CategoryKey[]);
        setExpandedCategories(allKeys);
        setAllCategoriesExpanded(true);
      }
    } else {
      setViewMode('category');
      setExpandedCategories(new Set());
      setAllCategoriesExpanded(false);
    }
  };

  const toggleCategory = (categoryKey: CategoryKey) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      
      const allKeys = Object.keys(categories) as CategoryKey[];
      const allExpanded = allKeys.every(key => newSet.has(key));
      setAllCategoriesExpanded(allExpanded);
      
      return newSet;
    });
  };

  // ============================================================================
  // CALENDAR FUNCTIONS
  // ============================================================================
  
  const getCalendarDays = (): CalendarDay[] => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const today = new Date().toISOString().split('T')[0];
    
    const datesWithReminders = new Set(allReminders.map(r => r.scheduledDate));
    
    const days: CalendarDay[] = [];
    
    const adjustedStart = startingDay === 0 ? 6 : startingDay - 1;
    for (let i = 0; i < adjustedStart; i++) {
      days.push({ day: 0, dateStr: '', hasReminders: false, isToday: false, isSelected: false });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateStr,
        hasReminders: datesWithReminders.has(dateStr),
        isToday: dateStr === today,
        isSelected: dateStr === selectedDate
      });
    }
    
    return days;
  };

  const prevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.day === 0) return;
    setSelectedDate(day.dateStr);
  };

  const handleAddForDay = () => {
    setFormPreFillDate(selectedDate);
    setEditingReminder(null);
    setIsFormOpen(true);
  };

  const getRemindersForSelectedDate = () => {
    return allReminders.filter(r => r.scheduledDate === selectedDate);
  };

  const formatDateForDisplay = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const groupRemindersByDate = (reminders: any[]): GroupedReminders[] => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const groups: { [key: string]: GroupedReminders } = {};
    
    reminders.forEach(reminder => {
      const dateStr = reminder.scheduledDate;
      let dateLabel = '';
      
      if (dateStr === today) {
        dateLabel = 'Today';
      } else if (dateStr === tomorrowStr) {
        dateLabel = 'Tomorrow';
      } else {
        const date = new Date(dateStr);
        dateLabel = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      if (!groups[dateStr]) {
        groups[dateStr] = {
          dateLabel,
          date: dateStr,
          reminders: []
        };
      }
      
      groups[dateStr].reminders.push(reminder);
    });
    
    return Object.values(groups).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  const groupRemindersByCategory = (reminders: any[]): CategoryGroup[] => {
    const groups: { [key: string]: CategoryGroup } = {};
    
    (Object.keys(categories) as CategoryKey[]).forEach(key => {
      const cat = categories[key];
      groups[key] = {
        key,
        label: cat.label,
        icon: cat.icon,
        color: cat.color,
        reminders: [],
        count: 0
      };
    });
    
    reminders.forEach(reminder => {
      const catKey = reminder.category as CategoryKey;
      if (groups[catKey]) {
        groups[catKey].reminders.push(reminder);
        groups[catKey].count++;
      }
    });
    
    return Object.values(groups)
      .filter(g => g.count > 0)
      .sort((a, b) => b.count - a.count);
  };

  if (showDashboard) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <button
              onClick={() => setShowDashboard(false)}
              className="text-gray-400 hover:text-white transition"
            >
              ← Back
            </button>
            <h1 className="text-lg font-semibold">Habit\Minder Analytics</h1>
            <div className="w-16"></div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          <Dashboard />
        </main>
      </div>
    );
  }

  const groupedByDate = groupRemindersByDate(reminders);
  const groupedByCategory = groupRemindersByCategory(reminders);
  const calendarDays = getCalendarDays();
  const selectedDateReminders = getRemindersForSelectedDate();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      
      {/* HEADER */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">Habit\Minder</h1>
          
          {/* View Mode Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setViewMode('date')}
              className="flex-1 py-2 px-3 rounded-full text-xs font-medium transition hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              📅 Date
            </button>
            <button
              onClick={handleCategoryTabClick}
              className="flex-1 py-2 px-3 rounded-full text-xs font-medium transition flex items-center justify-center gap-1 hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              🏷️ Category
              {viewMode === 'category' && (
                allCategoriesExpanded ? (
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                )
              )}
            </button>
            <button
              onClick={() => {
                setViewMode('all');
                setAllCategoriesExpanded(false);
              }}
              className="flex-1 py-2 px-3 rounded-full text-xs font-medium transition hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              📋 All
            </button>
          </div>
          
          {/* Dashboard Button */}
          <button
            onClick={() => setShowDashboard(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
              whiteSpace: 'nowrap'
            }}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            Analytics Dashboard
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* Stats Grid - 2x2 with 5th stat */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Current Streak */}
          <div 
            className="p-4 rounded-xl border border-gray-800"
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.3)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🔥</span>
              <span className="text-xs text-white/90 font-medium">Streak</span>
            </div>
            <p className="text-3xl font-bold text-white">{currentStreak} <span className="text-sm font-normal">days</span></p>
            <p className="text-xs text-white/70 mt-1">Best: {bestStreak}</p>
          </div>

          {/* Weekly Completion Rate */}
          <div 
            className="p-4 rounded-xl border border-gray-800"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">✅</span>
              <span className="text-xs text-white/90 font-medium">This Week</span>
            </div>
            <p className="text-3xl font-bold text-white">{weeklyRate}%</p>
          </div>

          {/* Monthly Completions */}
          <div 
            className="p-4 rounded-xl border border-gray-800"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📈</span>
              <span className="text-xs text-white/90 font-medium">This Month</span>
            </div>
            <p className="text-3xl font-bold text-white">{monthlyCompletions}</p>
          </div>

          {/* Today's Progress */}
          <div 
            className="p-4 rounded-xl border border-gray-800"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">⏰</span>
              <span className="text-xs text-white/90 font-medium">Today</span>
            </div>
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const todayReminders = reminders.filter(r => r.scheduledDate === todayStr);
              const totalToday = todayReminders.length;
              
              if (totalToday === 0) {
                return (
                  <p className="text-2xl font-bold text-white">
                    <span className="text-sm font-normal text-white/70">Nothing today!</span>
                  </p>
                );
              }
              
              return (
                <p className="text-3xl font-bold text-white">
                  {completedToday}<span className="text-sm font-normal">/{totalToday}</span>
                </p>
              );
            })()}
          </div>


          {/* Consistency Score - Full Width */}
          <div 
            className="col-span-2 p-4 rounded-xl border border-gray-800"
            style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              boxShadow: '0 4px 6px -1px rgba(236, 72, 153, 0.3)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💪</span>
                <span className="text-sm text-white/90 font-medium">Consistency Score</span>
              </div>
              <p className="text-3xl font-bold text-white">{consistencyScore}%</p>
            </div>
            <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${consistencyScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* VIEW 1: By Date (Calendar) */}
        {viewMode === 'date' && (
          <div className="space-y-6">
            {/* Calendar */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              {/* Month Navigation */}
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-gray-800 rounded-full transition"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                <h3 className="text-lg font-semibold text-white">
                  {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </h3>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-800 rounded-full transition"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Day Headers - FIXED: Unique keys using index */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                  <div key={`header-${index}`} className="text-center text-xs text-gray-500 py-2">{day}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  if (day.day === 0) {
                    return <div key={`empty-${index}`} className="aspect-square"></div>;
                  }

                  const dayReminders = allReminders.filter(r => r.scheduledDate === day.dateStr).length;
                  const displayCount = dayReminders > 9 ? '9+' : dayReminders.toString();

                  return (
                    <button
                      key={`day-${day.dateStr}`}
                      onClick={() => handleDayClick(day)}
                      className="aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition relative"
                      style={{
                        background: day.hasReminders 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                          : '#ffffff',
                        color: day.hasReminders ? '#ffffff' : '#111827',
                        border: day.isSelected ? '3px solid #f97316' : 'none',
                        boxShadow: day.isToday && !day.isSelected 
                          ? '0 0 0 3px rgba(249, 115, 22, 0.5)'
                          : 'none'
                      }}
                    >
                      <span className="text-base">{day.day}</span>
                      
                      {dayReminders > 0 && (
                        <span 
                          className="absolute bottom-1 right-1 flex items-center justify-center rounded-full font-bold"
                          style={{
                            width: '14px',
                            height: '14px',
                            fontSize: '8px',
                            backgroundColor: day.hasReminders ? 'rgba(255,255,255,0.9)' : 'rgba(59, 130, 246, 0.9)',
                            color: day.hasReminders ? '#111827' : '#ffffff'
                          }}
                        >
                          {displayCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Reminders */}
            <div className="min-h-[200px]">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {(() => {
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  const dateObj = new Date(year, month - 1, day);
                  
                  const formatted = dateObj.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric' 
                  });
                  
                  const isToday = selectedDate === new Date().toISOString().split('T')[0];
                  
                  return `${formatted}${isToday ? ' (Today)' : ''} (${selectedDateReminders.length} reminders)`;
                })()}
              </h3>

              {selectedDateReminders.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateReminders.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onClick={() => handleCardClick(reminder.id)}
                      onEdit={() => handleEditReminder(reminder)}
                      onDelete={() => handleDeleteReminder(reminder)}
                      showCategory={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-[150px] flex items-center justify-center">
                  {/* Empty state - no text, no button */}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: All Reminders */}
        {viewMode === 'all' && (
          <div className="space-y-6">
            {groupedByDate.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">No upcoming reminders</p>
              </div>
            ) : (
              groupedByDate.map((group) => (
                <div key={group.date}>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    {group.dateLabel}
                  </h3>
                  
                  <div className="space-y-3">
                    {group.reminders.map((reminder) => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        onClick={() => handleCardClick(reminder.id)}
                        onEdit={() => handleEditReminder(reminder)}
                        onDelete={() => handleDeleteReminder(reminder)}
                        showCategory={true}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW 3: By Category */}
        {viewMode === 'category' && (
          <div className="space-y-3">
            {groupedByCategory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">No upcoming reminders</p>
              </div>
            ) : (
              groupedByCategory.map((category) => {
                const isExpanded = expandedCategories.has(category.key);
                const gradientEnd = adjustColorBrightness(category.color, 0.7);
                
                return (
                  <div 
                    key={category.key} 
                    style={{
                      background: `linear-gradient(135deg, ${category.color}, ${gradientEnd})`,
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      border: '1px solid #1f2937'
                    }}
                  >
                    
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.key)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'filter 0.2s',
                        backgroundColor: 'transparent',
                        border: 'none'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>{category.icon}</span>
                          <span style={{ 
                            color: '#ffffff', 
                            fontWeight: 600,
                            fontSize: '0.95rem'
                          }}>
                            {category.label}
                          </span>
                        </div>
                      </div>
                      
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        color: '#111827',
                        fontWeight: 700
                      }}>
                        {category.count}
                      </span>
                    </button>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <div style={{
                        padding: '0.75rem 1rem 1rem',
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        borderTop: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div className="space-y-3">
                          {category.reminders.map((reminder) => (
                            <ReminderCard
                              key={reminder.id}
                              reminder={reminder}
                              onClick={() => handleCardClick(reminder.id)}
                              onEdit={() => handleEditReminder(reminder)}
                              onDelete={() => handleDeleteReminder(reminder)}
                              showCategory={false}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          setEditingReminder(null);
          setIsFormOpen(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
        style={{ backgroundColor: '#2563eb' }}
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* New Reminder Form Modal */}
      <ReminderForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingReminder(null);
          setFormPreFillDate(null);
        }}
        onSaved={handleReminderSaved}
        preFillDate={formPreFillDate}
        editingReminder={editingReminder}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setReminderToDelete(null);
        }}
        onConfirm={confirmDeleteReminder}
        reminderTitle={reminderToDelete?.title || ''}
        reminderDate={reminderToDelete?.scheduledDate || ''}
        reminderTime={reminderToDelete?.scheduledTime || ''}
      />
    </div>
  );
}