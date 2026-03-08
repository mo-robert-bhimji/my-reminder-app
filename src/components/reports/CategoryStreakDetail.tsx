import { useState, useEffect } from 'react';
import { db } from '../../db/schema';
import { X, ArrowLeft, Award, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface CategoryStreakDetailProps {
  category: {
    key: string;
    label: string;
    color: string;
    currentStreak: number;
    bestStreak: number;
    totalCompleted: number;
    totalDismissed: number;
  };
  onBack: () => void;
  onClose: () => void;
}

interface HabitStrengthData {
  date: string;
  completed: number;
  strength: number;
}

export default function CategoryStreakDetail({ category, onBack, onClose }: CategoryStreakDetailProps) {
  const [habitStrengthData, setHabitStrengthData] = useState<HabitStrengthData[]>([]);
  const [completionRate, setCompletionRate] = useState(0);

  useEffect(() => {
    loadHabitStrength();
  }, [category]);

  const loadHabitStrength = async () => {
    const logs = await db.activityLogs.toArray();
    const reminders = await db.reminders.toArray();

    const categoryReminderIds = reminders
      .filter(r => r.category === category.key)
      .map(r => r.id);

    const categoryLogs = logs.filter(l => categoryReminderIds.includes(l.reminderId));

    // Calculate completion rate
    const completed = categoryLogs.filter(l => l.action === 'completed').length;
    const dismissed = categoryLogs.filter(l => l.action === 'dismissed').length;
    const total = completed + dismissed;
    setCompletionRate(total > 0 ? Math.round((completed / total) * 100) : 0);

    // Generate habit strength data for last 30 days
    const data: HabitStrengthData[] = [];
    const today = new Date();
    let strength = 0;
    let completedCount = 0;
    let missedCount = 0;

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayLogs = categoryLogs.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate === dateStr;
      });

      const dayCompleted = dayLogs.some(l => l.action === 'completed');
      const dayDismissed = dayLogs.some(l => l.action === 'dismissed');

      if (dayCompleted) {
        completedCount++;
        strength = Math.min(100, strength + 10);
      } else if (dayDismissed) {
        missedCount++;
        strength = Math.max(0, strength - 15);
      } else {
        // No activity - slight decay
        strength = Math.max(0, strength - 2);
      }

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: dayCompleted ? 1 : 0,
        strength: Math.round(strength)
      });
    }

    setHabitStrengthData(data);
  };

  // Determine habit strength level
  const currentStrength = habitStrengthData.length > 0 
    ? habitStrengthData[habitStrengthData.length - 1].strength 
    : 0;

  const getStrengthLevel = (strength: number) => {
    if (strength >= 70) return 'Strong';
    if (strength >= 40) return 'Medium';
    return 'Weak';
  };

  const strengthLevel = getStrengthLevel(currentStrength);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 w-full max-w-md rounded-2xl p-6 border border-gray-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h3 className="text-lg font-semibold text-white">{category.label} Streak</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Streak Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div 
            className="p-4 rounded-xl border-2 text-center"
            style={{ 
              background: `linear-gradient(135deg, ${category.color}30 0%, ${category.color}10 100%)`,
              borderColor: category.color 
            }}
          >
            <div className="flex justify-center mb-2">
              <TrendingUp className="w-6 h-6" style={{ color: category.color }} />
            </div>
            <p className="text-gray-400 text-xs mb-1">Current Streak</p>
            <p className="text-3xl font-bold text-white">{category.currentStreak}</p>
            <p className="text-xs text-gray-400 mt-1">days</p>
          </div>

          <div 
            className="p-4 rounded-xl border-2 text-center"
            style={{ 
              background: `linear-gradient(135deg, ${category.color}30 0%, ${category.color}10 100%)`,
              borderColor: category.color 
            }}
          >
            <div className="flex justify-center mb-2">
              <Award className="w-6 h-6" style={{ color: category.color }} />
            </div>
            <p className="text-gray-400 text-xs mb-1">Best Streak</p>
            <p className="text-3xl font-bold text-white">{category.bestStreak}</p>
            <p className="text-xs text-gray-400 mt-1">days</p>
          </div>
        </div>

        {/* Habit Strength Section */}
        <div className="mb-6">
          <h4 className="text-white font-semibold mb-4">Habit Strength</h4>
          
          {/* Strength Level Indicator */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">{strengthLevel}</span>
              <span className="text-white font-bold">{currentStrength}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${currentStrength}%`,
                  backgroundColor: category.color 
                }}
              />
            </div>
          </div>

          {/* Completion Rate */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Completion rate</span>
              <span className="text-white font-bold">{completionRate}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${completionRate}%`,
                  backgroundColor: category.color 
                }}
              />
            </div>
          </div>

          {/* Line Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={habitStrengthData}>
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  interval={6}
                />
                <YAxis 
                  stroke="#6b7280" 
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="strength" 
                  stroke={category.color} 
                  strokeWidth={2}
                  dot={{ fill: category.color, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}