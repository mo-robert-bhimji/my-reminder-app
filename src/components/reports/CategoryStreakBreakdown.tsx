import { useState, useEffect } from 'react';
import { db } from '../../db/schema';
import { X, TrendingUp, Award } from 'lucide-react';
import { categories } from '../../utils/categories';
import CategoryStreakDetail from './CategoryStreakDetail';

interface CategoryStreakBreakdownProps {
  onClose: () => void;
}

interface CategoryStreakData {
  key: string;
  label: string;
  color: string;
  currentStreak: number;
  bestStreak: number;
  totalCompleted: number;
  totalDismissed: number;
}

export default function CategoryStreakBreakdown({ onClose }: CategoryStreakBreakdownProps) {
  const [categoryData, setCategoryData] = useState<CategoryStreakData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryStreakData | null>(null);

  useEffect(() => {
    loadCategoryStreaks();
  }, []);

  const loadCategoryStreaks = async () => {
    const logs = await db.activityLogs.toArray();
    const reminders = await db.reminders.toArray();

    const categoryStats: { [key: string]: CategoryStreakData } = {};

    // Initialize all categories
    Object.keys(categories).forEach(catKey => {
      const cat = categories[catKey as keyof typeof categories];
      categoryStats[catKey] = {
        key: catKey,
        label: cat.label,
        color: cat.color,
        currentStreak: 0,
        bestStreak: 0,
        totalCompleted: 0,
        totalDismissed: 0
      };
    });

    // Calculate stats per category
    reminders.forEach(reminder => {
      const categoryKey = reminder.category;
      if (!categoryStats[categoryKey]) return;

      const reminderLogs = logs.filter(l => l.reminderId === reminder.id);
      
      // Count completions and dismissals
      categoryStats[categoryKey].totalCompleted += reminderLogs.filter(l => l.action === 'completed').length;
      categoryStats[categoryKey].totalDismissed += reminderLogs.filter(l => l.action === 'dismissed').length;

      // Calculate current streak
      const completedLogs = reminderLogs
        .filter(l => l.action === 'completed')
        .sort((a, b) => b.timestamp - a.timestamp);

      let currentStreak = 0;
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
          currentStreak++;
        } else if (i > 0) {
          break;
        }
      }

      // Calculate best streak
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
      bestStreak = Math.max(bestStreak, 1);

      // Update if this reminder has better streaks
      categoryStats[categoryKey].currentStreak = Math.max(
        categoryStats[categoryKey].currentStreak,
        currentStreak
      );
      categoryStats[categoryKey].bestStreak = Math.max(
        categoryStats[categoryKey].bestStreak,
        bestStreak
      );
    });

    setCategoryData(Object.values(categoryStats).filter(c => c.totalCompleted > 0 || c.totalDismissed > 0));
  };

  if (selectedCategory) {
    return (
      <CategoryStreakDetail
        category={selectedCategory}
        onBack={() => setSelectedCategory(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 w-full max-w-md rounded-2xl p-6 border border-gray-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Streak by Category</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Category Cards - 2 Per Row with Horizontal Layout */}
        <div className="grid grid-cols-2 gap-3">
          {categoryData.map((category) => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category)}
              className="p-3 rounded-xl border-2 transition hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${category.color}20 0%, ${category.color}10 100%)`,
                borderColor: category.color
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-white font-semibold text-sm">{category.label}</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" style={{ color: category.color }} />
                  <span className="text-white font-bold text-sm">{category.currentStreak}d</span>
                </div>
              </div>
              <div className="text-xs text-gray-400 text-left">
                Best: <span className="text-white">{category.bestStreak}d</span>
              </div>
            </button>
          ))}
        </div>
        {categoryData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No streak data yet</p>
            <p className="text-sm mt-1">Complete some reminders to see your streaks!</p>
          </div>
        )}
      </div>
    </div>
  );
}