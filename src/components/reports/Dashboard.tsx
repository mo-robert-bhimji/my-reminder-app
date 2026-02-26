import { useEffect, useState } from 'react';
import { db } from '../../db/schema';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CheckCircle, XCircle, TrendingUp, RefreshCw, Award, Calendar, Activity, HelpCircle, Download } from 'lucide-react';
import { categories } from '../../utils/categories';

const generateSampleData = async () => {
  const categoryKeys = Object.keys(categories) as Array<keyof typeof categories>;
  const titles = [
    'Morning Exercise', 'Take Medication', 'Team Meeting', 'Call Mom',
    'Grocery Shopping', 'Read Book', 'Water Plants', 'Pay Bills',
    'Gym Workout', 'Prepare Dinner', 'Walk Dog', 'Check Email',
    'Dentist Appointment', 'Car Service', 'Laundry', 'Clean House',
    'Study Session', 'Meditation', 'Journal Writing', 'Plan Tomorrow',
    'Backup Files', 'Update Resume', 'Network Event', 'Birthday Call', 'Weekly Review'
  ];

  const descriptions = [
    'Important task to complete',
    'Don\'t forget this one',
    'Recurring activity',
    'Health related reminder',
    'Work commitment'
  ];

  const actions: ('completed' | 'dismissed')[] = ['completed', 'completed', 'completed', 'dismissed', 'completed'];

  await db.reminders.clear();
  await db.activityLogs.clear();

  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() - daysAgo);

    const dateStr = reminderDate.toISOString().split('T')[0];
    const hour = Math.floor(Math.random() * 12) + 8;
    const minute = Math.random() > 0.5 ? '00' : '30';
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;
    const category = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];

    const reminderId = await db.reminders.add({
      title: titles[i],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      category,
      scheduledDate: dateStr,
      scheduledTime: timeStr,
      repeatType: Math.random() > 0.7 ? 'daily' : 'none',
      advanceReminderMin: 0,
      isActive: Math.random() > 0.3,
      createdAt: reminderDate.getTime()
    });

    const numActions = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numActions; j++) {
      const logDate = new Date(reminderDate);
      logDate.setDate(logDate.getDate() + j);

      await db.activityLogs.add({
        reminderId,
        action: actions[Math.floor(Math.random() * actions.length)],
        timestamp: logDate.getTime(),
        scheduledTime: logDate.getTime()
      });
    }
  }

  alert('Sample data generated!');
};

// HelpTooltip - no button background, tooltip BELOW icon
const HelpTooltip = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-500 hover:text-gray-300 transition cursor-pointer"
      >
        <HelpCircle className="w-4 h-4" />
      </div>
      {show && (
        <div className="absolute right-0 top-full mt-2 z-50 w-40 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl text-sm text-gray-300">
          {text}
          <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-800 border-t border-l border-gray-700 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

// Helper to adjust color brightness
const adjustColorBrightness = (hex: string, factor: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '180d' | 'ytd' | 'all'>('30d');
  const [stats, setStats] = useState({
    completed: 0,
    dismissed: 0,
    total: 0,
    completionRate: 0,
    currentStreak: 0,
    bestStreak: 0,
    weeklyAverage: 0,
    consistencyScore: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [dayOfWeekData, setDayOfWeekData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [velocityData, setVelocityData] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    const logs = await db.activityLogs.toArray();
    const reminders = await db.reminders.toArray();
    
    const completed = logs.filter(l => l.action === 'completed').length;
    const dismissed = logs.filter(l => l.action === 'dismissed').length;
    const total = logs.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate streaks
    const completedLogs = logs.filter(l => l.action === 'completed').sort((a, b) => b.timestamp - a.timestamp);
    let currentStreak = 0;
    let bestStreak = 0;
    const uniqueDates = [...new Set(completedLogs.map(l => new Date(l.timestamp).toDateString()))];
    
    const todayDate = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(todayDate);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toDateString();
      
      if (uniqueDates.includes(dateStr)) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    let tempStreak = 0;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const date1 = new Date(uniqueDates[i]);
      const date2 = new Date(uniqueDates[i + 1]);
      const diffDays = Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, 1);

    // Weekly average
    const oldestLog = logs.length > 0 ? new Date(Math.min(...logs.map(l => l.timestamp))) : new Date();
    const daysActive = Math.max(Math.floor((Date.now() - oldestLog.getTime()) / (1000 * 60 * 60 * 24)), 1);
    const weeksActive = Math.ceil(daysActive / 7);
    const weeklyAverage = (completed / weeksActive).toFixed(1);

    // Consistency score
    const dailyCounts: { [key: string]: number } = {};
    logs.filter(l => l.action === 'completed').forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    
    const counts = Object.values(dailyCounts);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length || 0;
    const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length || 0;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (stdDev / mean) * 100)));

    setStats({ 
      completed, 
      dismissed, 
      total, 
      completionRate,
      currentStreak,
      bestStreak,
      weeklyAverage: parseFloat(weeklyAverage),
      consistencyScore
    });

    setChartData([
      { name: 'Completed', value: completed, color: '#16a34a' },
      { name: 'Dismissed', value: dismissed, color: '#dc2626' }
    ]);

    // Category success rate WITH HORIZONTAL GRADIENTS
    const categoryStats = Object.keys(categories).map((catKey) => {
      const catCompleted = logs.filter(log => {
        const reminder = reminders.find(r => r.id === log.reminderId);
        return reminder?.category === catKey && log.action === 'completed';
      }).length;
      
      const catTotal = logs.filter(log => {
        const reminder = reminders.find(r => r.id === log.reminderId);
        return reminder?.category === catKey;
      }).length;

      const rate = catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0;
      const baseColor = categories[catKey as keyof typeof categories].color;
      
      const lightColor = adjustColorBrightness(baseColor, 0.6);
      const darkColor = baseColor;

      return {
        name: categories[catKey as keyof typeof categories].label,
        completed: catCompleted,
        total: catTotal,
        rate: rate,
        lightColor: lightColor,
        darkColor: darkColor,
        baseColor: baseColor
      };
    }).filter(c => c.total > 0);

    setCategoryData(categoryStats);

    // Completion Trend - DYNAMIC BASED ON TIME RANGE
    const trendDataLocal: any[] = [];
    const now = new Date();
    let startDate = new Date();

    if (timeRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeRange === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    } else if (timeRange === '180d') {
      startDate.setDate(startDate.getDate() - 180);
    } else if (timeRange === 'ytd') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      const oldestLog = logs.length > 0 ? new Date(Math.min(...logs.map(l => l.timestamp))) : new Date();
      startDate = oldestLog;
    }

    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const useMonthly = diffDays > 180;
    const useWeekly = diffDays > 30 && diffDays <= 180;

    if (useMonthly) {
      const months: { [key: string]: { completed: number, total: number } } = {};
      
      logs.forEach(log => {
        const logDate = new Date(log.timestamp);
        if (logDate >= startDate) {
          const monthKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
          if (!months[monthKey]) months[monthKey] = { completed: 0, total: 0 };
          months[monthKey].total++;
          if (log.action === 'completed') months[monthKey].completed++;
        }
      });
      
      Object.entries(months).forEach(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        trendDataLocal.push({
          label,
          completed: data.completed,
          total: data.total,
          rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
          timestamp: date.getTime()
        });
      });
      
      trendDataLocal.sort((a, b) => a.timestamp - b.timestamp);
    } else if (useWeekly) {
      for (let i = Math.ceil(diffDays / 7); i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekCompleted = logs.filter(l => 
          l.action === 'completed' && 
          l.timestamp >= weekStart.getTime() && 
          l.timestamp <= weekEnd.getTime()
        ).length;

        const weekTotal = logs.filter(l => 
          l.timestamp >= weekStart.getTime() && 
          l.timestamp <= weekEnd.getTime()
        ).length;

        const weekNum = Math.ceil((diffDays - i * 7) / 7);
        
        trendDataLocal.push({
          label: `Week ${weekNum}`,
          completed: weekCompleted,
          total: weekTotal,
          rate: weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0,
          timestamp: weekStart.getTime()
        });
      }
    } else {
      for (let i = 29; i >= 0; i--) {
        const dayStart = new Date(now);
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dayCompleted = logs.filter(l => 
          l.action === 'completed' && 
          l.timestamp >= dayStart.getTime() && 
          l.timestamp <= dayEnd.getTime()
        ).length;

        const dayTotal = logs.filter(l => 
          l.timestamp >= dayStart.getTime() && 
          l.timestamp <= dayEnd.getTime()
        ).length;

        const dayLabel = dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        trendDataLocal.push({
          label: dayLabel,
          completed: dayCompleted,
          total: dayTotal,
          rate: dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) : 0,
          timestamp: dayStart.getTime()
        });
      }
    }
    setTrendData(trendDataLocal);

    // Hourly activity
    const hourCounts: { [key: number]: number } = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;
    
    logs.filter(l => l.action === 'completed').forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourCounts[hour]++;
    });

    const hourlyStats = Object.entries(hourCounts).map(([hour, count]) => ({
      hour: `${hour}:00`,
      count
    }));
    setHourlyData(hourlyStats);

    // Day of week analysis
    const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const dayCounts: { [key: number]: { completed: number, total: number } } = {};
    for (let i = 1; i <= 7; i++) dayCounts[i] = { completed: 0, total: 0 };

    logs.forEach(log => {
      let day = new Date(log.timestamp).getDay();
      day = day === 0 ? 7 : day;
      dayCounts[day].total++;
      if (log.action === 'completed') {
        dayCounts[day].completed++;
      }
    });

    const dayStats = dayNames.map((dayName, index) => {
      const dayNum = index + 1;
      const data = dayCounts[dayNum];
      const rate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
      
      return {
        day: dayName,
        completed: data.completed,
        total: data.total,
        rate: rate
      };
    });
    setDayOfWeekData(dayStats);

    // Activity Heatmap
    const heatData: any[] = [];
    const endDate = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
    
    const startDayOfWeek = ninetyDaysAgo.getDay();
    const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const mondayOfFirstWeek = new Date(ninetyDaysAgo);
    mondayOfFirstWeek.setDate(ninetyDaysAgo.getDate() - daysToMonday);
    mondayOfFirstWeek.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(mondayOfFirstWeek);
    let weekIndex = 0;
    
    while (currentDate <= endDate && weekIndex < 13) {
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const count = logs.filter(l => 
          l.action === 'completed' && 
          new Date(l.timestamp).toISOString().split('T')[0] === dateStr
        ).length;

        heatData.push({
          date: dateStr,
          week: weekIndex,
          day: day,
          count,
          intensity: count > 0 ? (count > 5 ? 1 : count > 3 ? 0.75 : count > 1 ? 0.5 : 0.25) : 0
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
      weekIndex++;
    }
    setHeatmapData(heatData);

    // Velocity
    const recentWeeks = trendDataLocal.slice(-4);
    const velocity = recentWeeks.length >= 2 ? 
      recentWeeks[recentWeeks.length - 1].completed - recentWeeks[0].completed : 0;
    
    setVelocityData([
      { label: 'Velocity', value: velocity, trend: velocity > 0 ? 'up' : velocity < 0 ? 'down' : 'stable' }
    ]);

    // Weekly activity with gradient
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const weeklyLogs = logs.filter(l => l.timestamp >= weekAgo);
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    const dayCountsTemp = days.map((day, index) => {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - (dayStart.getDay() - index));
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = weeklyLogs.filter(l => 
        l.timestamp >= dayStart.getTime() && l.timestamp <= dayEnd.getTime()
      ).length;

      return { day, count };
    });

    const maxCount = Math.max(...dayCountsTemp.map(d => d.count), 1);
    const weeklyStatsTemp = dayCountsTemp.map(({ day, count }) => {
      const intensity = count / maxCount;
      const blueGradient = intensity > 0.75 ? '#1e40af' :
                          intensity > 0.5 ? '#2563eb' :
                          intensity > 0.25 ? '#3b82f6' :
                          intensity > 0 ? '#60a5fa' : '#93c5fd';
      return { day, count, fill: blueGradient };
    });
    setWeeklyData(weeklyStatsTemp);
  };

  const handleGenerateSample = async () => {
    if (confirm('This will clear existing data and generate 25 sample reminders. Continue?')) {
      await generateSampleData();
    }
  };

  const exportData = () => {
    const logs = db.activityLogs.toArray();
    const reminders = db.reminders.toArray();
    
    Promise.all([logs, reminders]).then(([logsData, remindersData]) => {
      const headers = ['Date', 'Reminder Title', 'Action', 'Category', 'Scheduled Date'];
      const rows = logsData.map(log => {
        const reminder = remindersData.find(r => r.id === log.reminderId);
        return [
          new Date(log.timestamp).toISOString(),
          reminder?.title || 'Unknown',
          log.action,
          reminder?.category || 'Unknown',
          reminder?.scheduledDate || 'Unknown'
        ].join(',');
      });
      
      const csv = [headers.join(','), ...rows].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reminder-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const getHeatmapColor = (intensity: number) => {
    if (intensity === 0) return '#1f2937';
    if (intensity <= 0.25) return '#7f1d1d';
    if (intensity <= 0.5) return '#b91c1c';
    if (intensity <= 0.75) return '#dc2626';
    return '#ef4444';
  };

  return (
    <div className="p-4 space-y-6 bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleGenerateSample}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            style={{ backgroundColor: '#2563eb', color: 'white' }}
          >
            <RefreshCw className="w-4 h-4" />
            Generate Sample
          </button>
        </div>
      </div>

      {/* Core Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
          <div className="absolute top-3 right-3">
            <HelpTooltip text="Total number of reminders you've completed" />
          </div>
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Completed</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.completed}</p>
        </div>

        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
          <div className="absolute top-3 right-3">
            <HelpTooltip text="Total number of reminders you've dismissed or skipped" />
          </div>
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Dismissed</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.dismissed}</p>
        </div>

        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
          <div className="absolute top-3 right-3">
            <HelpTooltip text="Percentage of reminders completed vs total reminders" />
          </div>
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Completion Rate</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.completionRate}%</p>
        </div>

        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
          <div className="absolute top-3 right-3">
            <HelpTooltip text="How consistent you are with completing reminders (based on variance in daily completions)" />
          </div>
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Award className="w-5 h-5" />
            <span className="text-sm font-medium">Consistency</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.consistencyScore}%</p>
        </div>
      </div>

      {/* Streak & Velocity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-600 to-red-600 p-4 rounded-xl border border-orange-500 relative">
          <div className="absolute top-3 right-3">
            <HelpTooltip text="Current streak: Consecutive days with at least one completion. Best: Your longest streak ever" />
          </div>
          <div className="flex items-center gap-2 text-white mb-2">
            <Activity className="w-5 h-5" />
            <span className="text-sm font-medium">Current Streak</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.currentStreak} days</p>
          <p className="text-xs text-orange-200 mt-1">Best: {stats.bestStreak} days</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-xl border border-blue-500 relative">
          <div className="absolute top-3 right-3">
            <HelpTooltip text="Change in completions compared to the previous month. Positive means you're improving!" />
          </div>
          <div className="flex items-center gap-2 text-white mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Velocity</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {velocityData[0]?.value > 0 ? '+' : ''}{velocityData[0]?.value || 0}
          </p>
          <p className="text-xs text-blue-200 mt-1">vs last month</p>
        </div>
      </div>

      {/* Weekly Average */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
        <div className="absolute top-3 right-3">
          <HelpTooltip text="Average number of reminders completed per week over your entire history" />
        </div>
        <div className="flex items-center gap-2 text-cyan-400 mb-2">
          <Calendar className="w-5 h-5" />
          <span className="text-sm font-medium">Weekly Average</span>
        </div>
        <p className="text-3xl font-bold text-white">{stats.weeklyAverage}</p>
        <p className="text-xs text-gray-400 mt-1">completions per week</p>
      </div>

      {/* Completed vs Dismissed */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
        <div className="absolute top-3 right-3">
          <HelpTooltip text="Visual breakdown of completed vs dismissed reminders" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-4">Completed vs Dismissed</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  if (midAngle === undefined) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-sm font-semibold">
      {value}
    </text>
  );
}}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Completion Trend with Time Range Buttons */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
        <div className="absolute top-3 right-3">
          <HelpTooltip text="Your completion trend over time. Use buttons below to change the time range" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-4">Completion Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <XAxis dataKey="label" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="completed" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
{/* Time Range Buttons */}
<div className="flex justify-center gap-1.5 mt-4 flex-wrap">
  <button
    onClick={() => setTimeRange('30d')}
    style={{ 
      backgroundColor: timeRange === '30d' ? '#60a5fa' : 'rgba(96, 165, 250, 0.3)',
      color: '#111827'
    }}
    className="px-2.5 py-1 rounded text-[10px] font-medium transition hover:bg-blue-400/50"
  >
    30 Days
  </button>
  <button
    onClick={() => setTimeRange('90d')}
    style={{ 
      backgroundColor: timeRange === '90d' ? '#60a5fa' : 'rgba(96, 165, 250, 0.3)',
      color: '#111827'
    }}
    className="px-2.5 py-1 rounded text-[10px] font-medium transition hover:bg-blue-400/50"
  >
    3 Months
  </button>
  <button
    onClick={() => setTimeRange('180d')}
    style={{ 
      backgroundColor: timeRange === '180d' ? '#60a5fa' : 'rgba(96, 165, 250, 0.3)',
      color: '#111827'
    }}
    className="px-2.5 py-1 rounded text-[10px] font-medium transition hover:bg-blue-400/50"
  >
    6 Months
  </button>
  <button
    onClick={() => setTimeRange('ytd')}
    style={{ 
      backgroundColor: timeRange === 'ytd' ? '#60a5fa' : 'rgba(96, 165, 250, 0.3)',
      color: '#111827'
    }}
    className="px-2.5 py-1 rounded text-[10px] font-medium transition hover:bg-blue-400/50"
  >
    This Year
  </button>
  <button
    onClick={() => setTimeRange('all')}
    style={{ 
      backgroundColor: timeRange === 'all' ? '#60a5fa' : 'rgba(96, 165, 250, 0.3)',
      color: '#111827'
    }}
    className="px-2.5 py-1 rounded text-[10px] font-medium transition hover:bg-blue-400/50"
  >
    All Time
  </button>
</div>
      </div>

      {/* Category Success Rate */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
        <div className="absolute top-3 right-3">
          <HelpTooltip text="Success rate by category. Gradient shows completion rate (light→dark)" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-4">Category Success Rate</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} layout="vertical">
              <defs>
                {categoryData.map((entry, index) => (
                  <linearGradient key={`gradient-${index}`} id={`categoryGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={entry.darkColor} />
                    <stop offset="100%" stopColor={entry.lightColor} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Success Rate']}
              />
              <Bar dataKey="rate" radius={[4, 4, 4, 4]}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#categoryGradient-${index})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Day of Week Performance */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
        <div className="absolute top-3 right-3">
          <HelpTooltip text="Your best performing days. Vertical gradient (light→dark purple)" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-4">Best Day Analysis</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayOfWeekData}>
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6d28d9" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="rate" fill="url(#purpleGradient)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Activity */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
        <div className="absolute top-3 right-3">
          <HelpTooltip text="What hours of the day you're most productive at completing reminders" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-4">Peak Activity Hours</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <XAxis dataKey="hour" stroke="#9ca3af" interval={3} />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
        <div className="absolute top-3 right-3">
          <HelpTooltip text="GitHub-style activity heatmap showing your daily completions over the last 90 days. Darker red = more completions" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-4">Activity Heatmap (90 Days)</h3>
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="flex gap-1 mb-2">
              <div className="w-3"></div>
              {['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                <div key={day} className="w-3 text-xs text-gray-500 text-center flex-1">{day}</div>
              ))}
            </div>
            <div className="space-y-1">
              {Array.from({ length: 13 }).map((_, weekIndex) => (
                <div key={weekIndex} className="flex gap-1">
                  <div className="w-3"></div>
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const dayData = heatmapData.find(d => d.week === weekIndex && d.day === dayIndex);
                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className="w-3 h-3 rounded-sm flex-1"
                        style={{ 
                          backgroundColor: dayData ? getHeatmapColor(dayData.intensity) : '#1f2937',
                          opacity: dayData ? 1 : 0.3
                        }}
                        title={dayData ? `${dayData.date}: ${dayData.count} completions` : 'No data'}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400 justify-end">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#1f2937' }}></div>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#7f1d1d' }}></div>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#b91c1c' }}></div>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#dc2626' }}></div>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ef4444' }}></div>
          <span>More</span>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 relative">
        <div className="absolute top-3 right-3">
          <HelpTooltip text="Activity for the current week. Darker blue means more completions that day" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-4">Activity This Week</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}