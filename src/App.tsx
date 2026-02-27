import { useState, useEffect } from 'react';
import { Plus, BarChart3 } from 'lucide-react';
import { db } from './db/schema';
import ReminderCard from './components/reminders/ReminderCard';
import ReminderForm from './components/reminders/ReminderForm';
import Dashboard from './components/reports/Dashboard';

export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [completedToday, setCompletedToday] = useState(0);

  useEffect(() => {
    if (!showDashboard) {
      loadReminders();
    }
  }, [showDashboard]);

  const loadReminders = async () => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const allReminders = await db.reminders.where('isActive').equals(1).toArray();
      console.log('All reminders from DB:', allReminders);
      
      const upcoming = allReminders.filter(r => {
        const reminderDate = new Date(`${r.scheduledDate} ${r.scheduledTime}`);
        return reminderDate >= now;
      });
      
      const allLogs = await db.activityLogs.toArray();
      const completed = allLogs.filter(l => {
        const logDate = new Date(l.timestamp).toISOString().split('T')[0];
        return logDate === today && l.action === 'completed';
      });
      
      const sorted = upcoming.sort((a: any, b: any) => {
        const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`).getTime();
        const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`).getTime();
        return dateA - dateB;
      });
      
      console.log('Upcoming reminders to display:', sorted);
      setReminders(sorted);
      setCompletedToday(completed.length);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const handleReminderSaved = () => {
    loadReminders();
  };

  const handleCardClick = (reminderId: number) => {
    console.log('Reminder clicked:', reminderId);
    // Add your click handling logic here
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
            <h1 className="text-lg font-semibold">Analytics Dashboard</h1>
            <div className="w-16"></div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          <Dashboard />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">Reminders</h1>
          
          {/* Dashboard Button - Under title, full width */}
          <button
            onClick={() => setShowDashboard(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition bg-blue-400 text-gray-900 hover:bg-blue-500"
          >
            <BarChart3 className="w-5 h-5" />
            Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats Card */}
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Completed Today</p>
              <p className="text-2xl font-bold text-white">{completedToday}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Upcoming</p>
              <p className="text-2xl font-bold text-white">{reminders.length}</p>
            </div>
          </div>
        </div>

        {/* Reminders List */}
        {reminders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No upcoming reminders</p>
            <p className="text-sm mt-1">Tap + to create your first reminder!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <ReminderCard 
                key={reminder.id} 
                reminder={reminder}
                onClick={() => handleCardClick(reminder.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      <button
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
        style={{ backgroundColor: '#2563eb' }}
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* New Reminder Form Modal */}
      <ReminderForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={handleReminderSaved}
      />
    </div>
  );
}