import { db } from '../db/schema';

export const generateSampleData = async () => {
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

  // Clear existing data first
  await db.reminders.clear();
  await db.activityLogs.clear();

  // Generate 25 reminders with logs
  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() - daysAgo);

    const dateStr = reminderDate.toISOString().split('T')[0];
    const hour = Math.floor(Math.random() * 12) + 8; // 8 AM to 7 PM
    const minute = Math.random() > 0.5 ? '00' : '30';
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;

    // Add reminder
    const reminderId = await db.reminders.add({
      title: titles[i],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      scheduledDate: dateStr,
      scheduledTime: timeStr,
      repeatType: Math.random() > 0.7 ? 'daily' : 'none',
      advanceReminderMin: 0,
      isActive: Math.random() > 0.3,
      createdAt: reminderDate.getTime()
    });

    // Add activity log (1-3 actions per reminder)
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

  console.log('✅ Generated 25 sample reminders with activity logs');
  alert('Sample data generated! Check the Dashboard tab.');
};