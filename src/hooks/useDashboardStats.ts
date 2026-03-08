import { useState, useEffect } from 'react';
import { db } from '../db/schema';
import { categories } from '../utils/categories';

interface DashboardStats {
  completed: number;
  dismissed: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  weeklyAverage: number;
  consistencyScore: number;
}

interface DashboardData {
  stats: DashboardStats;
  categoryData: any[];
  trendData: any[];
  hourlyData: any[];
  dayOfWeekData: any[];
  heatmapData: any[];
  weeklyData: any[];
  velocityData: any[];
}

export function useDashboardStats(timeRange: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [logs, reminders] = await Promise.all([
          db.activityLogs.toArray(),
          db.reminders.toArray()
        ]);

        const completed = logs.filter(l => l.action === 'completed').length;
        const dismissed = logs.filter(l => l.action === 'dismissed').length;
        const completionRate = logs.length > 0 ? Math.round((completed / logs.length) * 100) : 0;

        // Calculate streaks
        const completedLogs = logs.filter(l => l.action === 'completed');
        const dates = [...new Set(completedLogs.map(l => new Date(l.timestamp).toDateString()))].sort();
        let currentStreak = 0;
        let bestStreak = 1;
        let tempStreak = 1;
        
        const today = new Date().toDateString();
        for (let i = 0; i < 365; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          if (dates.includes(d.toDateString())) {
            currentStreak++;
          } else if (i > 0) break;
        }

        for (let i = 1; i < dates.length; i++) {
          const diff = Math.floor((new Date(dates[i]).getTime() - new Date(dates[i-1]).getTime()) / (1000 * 60 * 60 * 24));
          if (diff <= 1) {
            tempStreak++;
            bestStreak = Math.max(bestStreak, tempStreak);
          } else {
            tempStreak = 1;
          }
        }

        const oldestLog = logs.length > 0 ? new Date(Math.min(...logs.map(l => l.timestamp))) : new Date();
        const daysActive = Math.max(Math.floor((Date.now() - oldestLog.getTime()) / (1000 * 60 * 60 * 24)), 1);
        const weeklyAverage = parseFloat((completed / Math.ceil(daysActive / 7)).toFixed(1));

        const dailyCounts: Record<string, number> = {};
        completedLogs.forEach(log => {
          const date = new Date(log.timestamp).toISOString().split('T')[0];
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });
        const counts = Object.values(dailyCounts);
        const mean = counts.reduce((a, b) => a + b, 0) / (counts.length || 1);
        const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (counts.length || 1);
        const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (Math.sqrt(variance) / (mean || 1)) * 100)));

        // Category data
        const categoryData = Object.keys(categories).map(catKey => {
          const catTotal = logs.filter(l => {
            const r = reminders.find(rem => rem.id === l.reminderId);
            return r?.category === catKey;
          }).length;
          const catCompleted = logs.filter(l => {
            const r = reminders.find(rem => rem.id === l.reminderId);
            return r?.category === catKey && l.action === 'completed';
          }).length;
          const baseColor = categories[catKey as keyof typeof categories].color;
          return {
            name: categories[catKey as keyof typeof categories].label,
            total: catTotal,
            completed: catCompleted,
            rate: catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0,
            baseColor
          };
        }).filter(c => c.total > 0);

        // Trend data
        const trendData: any[] = [];
        const now = new Date();
        let startDate = new Date();
        if (timeRange === '30d') startDate.setDate(startDate.getDate() - 30);
        else if (timeRange === '90d') startDate.setDate(startDate.getDate() - 90);
        else if (timeRange === '180d') startDate.setDate(startDate.getDate() - 180);
        else if (timeRange === 'ytd') startDate = new Date(now.getFullYear(), 0, 1);

        const diffDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        for (let i = diffDays - 1; i >= 0; i--) {
          const day = new Date(now);
          day.setDate(day.getDate() - i);
          const dateStr = day.toISOString().split('T')[0];
          trendData.push({
            label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            completed: dailyCounts[dateStr] || 0,
            timestamp: day.getTime()
          });
        }

        // Hourly data
        const hourlyData = new Array(24).fill(0).map((_, h) => ({
          hour: `${h}:00`,
          count: completedLogs.filter(l => new Date(l.timestamp).getHours() === h).length
        }));

        // Day of week
        const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const dayOfWeekData = dayNames.map((_, idx) => {
          const dayLogs = logs.filter(l => {
            let d = new Date(l.timestamp).getDay();
            d = d === 0 ? 6 : d - 1;
            return d === idx;
          });
          const completed = dayLogs.filter(l => l.action === 'completed').length;
          return {
            day: dayNames[idx],
            completed,
            total: dayLogs.length,
            rate: dayLogs.length > 0 ? Math.round((completed / dayLogs.length) * 100) : 0
          };
        });

        // Heatmap
        const heatmapData: any[] = [];
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
        let current = new Date(ninetyDaysAgo);
        let weekIdx = 0;
        while (current <= now && weekIdx < 13) {
          for (let d = 0; d < 7; d++) {
            const dateStr = current.toISOString().split('T')[0];
            const count = dailyCounts[dateStr] || 0;
            heatmapData.push({
              date: dateStr,
              week: weekIdx,
              day: d,
              count,
              intensity: count > 0 ? (count > 5 ? 1 : count > 3 ? 0.75 : count > 1 ? 0.5 : 0.25) : 0
            });
            current.setDate(current.getDate() + 1);
          }
          weekIdx++;
        }

        // Weekly activity
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const weeklyData = days.map((day, idx) => {
          const start = new Date();
          start.setDate(start.getDate() - (start.getDay() - idx));
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setHours(23, 59, 59, 999);
          const count = logs.filter(l => l.timestamp >= start.getTime() && l.timestamp <= end.getTime()).length;
          return { day, count, fill: count > 3 ? '#1e40af' : count > 2 ? '#2563eb' : count > 1 ? '#3b82f6' : '#60a5fa' };
        });

        const velocity = trendData.length >= 4 ? trendData[trendData.length - 1].completed - trendData[0].completed : 0;

        setData({
          stats: { completed, dismissed, completionRate, currentStreak, bestStreak, weeklyAverage, consistencyScore },
          categoryData,
          trendData,
          hourlyData,
          dayOfWeekData,
          heatmapData,
          weeklyData,
          velocityData: [{ value: velocity }]
        });
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load'));
        setIsLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  return { data, isLoading, error, refetch: () => {} };
}