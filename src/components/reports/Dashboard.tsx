// ============================================================================
// DASHBOARD COMPONENT - Mobile Responsive Version with Chart Breakpoints
// ============================================================================
import { useEffect, useState } from 'react';
import { db } from '../../db/schema';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CheckCircle, XCircle, TrendingUp, RefreshCw, Award, Calendar, Activity, HelpCircle, Download } from 'lucide-react';
import { categories } from '../../utils/categories';
import CategoryCalendar from './CategoryCalendar';
import CategoryStreakBreakdown from './CategoryStreakBreakdown';
import { useDashboardStats } from '../../hooks/useDashboardStats';  // ← assuming this is the correct import path

// Keep these helper functions unchanged
const generateSampleData = async () => {
  // ... your original implementation
};

const HelpTooltip = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={() => setShow(!show)} className="text-gray-500 hover:text-gray-300 transition cursor-pointer">
        <HelpCircle className="w-3.5 h-3.5" />
      </div>
      {show && (
        <div className="absolute right-0 top-full mt-2 z-50 w-40 p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl text-xs text-gray-300">
          {text}
        </div>
      )}
    </div>
  );
};

const adjustColorBrightness = (hex: string, factor: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

interface DashboardProps {
  onSampleGenerated?: () => void;
}

export default function Dashboard({ onSampleGenerated }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '180d' | 'ytd' | 'all'>('30d');
  const [selectedCategory, setSelectedCategory] = useState<{key: string, color: string} | null>(null);
  const [showStreakBreakdown, setShowStreakBreakdown] = useState(false);

  const { data, isLoading, error } = useDashboardStats(timeRange);

  const handleGenerateSample = async () => {
    if (confirm('This will clear existing data and generate sample reminders. Continue?')) {
      await generateSampleData();
      // Assuming useDashboardStats will re-run on remount or you have a refetch mechanism
      // If not, you may need to add refetch prop or force remount
      onSampleGenerated?.();
    }
  };

  const exportData = () => {
    Promise.all([db.activityLogs.toArray(), db.reminders.toArray()]).then(([logsData, remindersData]) => {
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

  if (isLoading) return <div className="text-center py-10 text-gray-400">Loading analytics...</div>;
  if (error) return <div className="text-center py-10 text-red-400">Error loading data: {error.message}</div>;

  const { stats, categoryData, trendData, heatmapData, velocityData } = data || {};

  return (
    <div className="p-3 sm:p-4 space-y-4 bg-gray-950 min-h-screen w-full overflow-y-auto overflow-x-hidden">
      <div className="max-w-3xl mx-auto w-full space-y-4">

        {/* Header Buttons */}
        <div className="flex gap-3">
          <button
            onClick={exportData}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 transition"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={handleGenerateSample}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <RefreshCw className="w-4 h-4" /> Sample
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Completed</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.completed ?? 0}</p>
          </div>
          <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">Dismissed</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.dismissed ?? 0}</p>
          </div>
          <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Rate</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.completionRate ?? 0}%</p>
          </div>
          <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Award className="w-4 h-4" />
              <span className="text-sm">Consistency</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.consistencyScore ?? 0}%</p>
          </div>
        </div>

        {/* Streak & Velocity */}
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => setShowStreakBreakdown(true)}
            className="bg-gradient-to-br from-blue-600 to-cyan-600 p-4 rounded-xl border border-blue-500 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-white mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Streak</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats?.currentStreak ?? 0}d</p>
            <p className="text-xs text-blue-200">Best: {stats?.bestStreak ?? 0}d</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-xl border border-blue-500">
            <div className="flex items-center gap-2 text-white mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Velocity</span>
            </div>
            <p className="text-2xl font-bold text-white">{velocityData?.[0]?.value ?? 0}</p>
            <p className="text-xs text-blue-200">vs last month</p>
          </div>
        </div>

        {/* Weekly Average */}
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Weekly Average</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.weeklyAverage ?? 0}</p>
          <p className="text-xs text-gray-400">completions/week</p>
        </div>

        {/* Completion Trend */}
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
          <h3 className="text-base font-semibold text-white mb-3">Completion Trend</h3>
          <div className="h-[160px] sm:h-[200px] md:h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="completed" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['30d', '90d', '180d', 'ytd', 'all'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                  timeRange === range
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {range.toUpperCase() === '30D' ? '30D' : range === '90d' ? '3M' : range === '180d' ? '6M' : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Category Success */}
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
          <h3 className="text-base font-semibold text-white mb-3">Category Success</h3>
          <div className="h-[200px] sm:h-[240px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 70, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" width={70} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', fontSize: '12px' }} />
                <Bar dataKey="rate" radius={[4, 4, 4, 4]}>
                  {categoryData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.darkColor || entry.baseColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Heatmap */}
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 overflow-x-auto">
          <h3 className="text-base font-semibold text-white mb-3">Activity Heatmap</h3>
          <div className="min-w-[340px] sm:min-w-[480px]">
            <div className="flex gap-1 mb-2">
              <div className="w-4"></div>
              {['M','T','W','T','F','S','S'].map((d,i) => (
                <div key={i} className="w-4 text-xs text-gray-400 text-center flex-1">{d}</div>
              ))}
            </div>
            <div className="space-y-1">
              {Array.from({ length: 13 }).map((_, week) => (
                <div key={week} className="flex gap-1">
                  <div className="w-4"></div>
                  {Array.from({ length: 7 }).map((_, day) => {
                    const cell = heatmapData?.find(d => d.week === week && d.day === day);
                    return (
                      <div
                        key={`${week}-${day}`}
                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-sm"
                        style={{ backgroundColor: cell ? getHeatmapColor(cell.intensity) : '#1f2937' }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showStreakBreakdown && <CategoryStreakBreakdown onClose={() => setShowStreakBreakdown(false)} />}
        {selectedCategory && <CategoryCalendar category={selectedCategory.key} categoryColor={selectedCategory.color} onClose={() => setSelectedCategory(null)} />}
      </div>
    </div>
  );
}