import { useState } from 'react';
import { X, Save, Play } from 'lucide-react';
import { addReminder } from '../../db/queries';
import { categories } from '../../utils/categories';

type CategoryKey = keyof typeof categories;

interface ReminderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const notificationTones = [
  { id: 1, name: 'Gentle Chime', frequency: 523.25, duration: 200 },
  { id: 2, name: 'Soft Bell', frequency: 659.25, duration: 300 },
  { id: 3, name: 'Digital Beep', frequency: 880, duration: 150 },
  { id: 4, name: 'Warm Tone', frequency: 440, duration: 250 },
  { id: 5, name: 'Crystal Clear', frequency: 1046.50, duration: 200 },
  { id: 6, name: 'Deep Resonance', frequency: 261.63, duration: 350 },
  { id: 7, name: 'Bright Alert', frequency: 783.99, duration: 180 },
  { id: 8, name: 'Calm Pulse', frequency: 349.23, duration: 280 },
  { id: 9, name: 'Sharp Notice', frequency: 1174.66, duration: 120 },
  { id: 10, name: 'Melodic Ring', frequency: 587.33, duration: 320 }
];

export default function ReminderForm({ isOpen, onClose, onSaved }: ReminderFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryKey>('personal');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('12:00');
  const [repeatType, setRepeatType] = useState('none');
  const [advanceMin, setAdvanceMin] = useState(0);
  const [notificationTone, setNotificationTone] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert('Title is required');

    try {
      await addReminder({
        title,
        description,
        category,
        scheduledDate: date,
        scheduledTime: time,
        repeatType,
        advanceReminderMin: advanceMin,
        isActive: true,
        createdAt: Date.now()
      });
      
      setTitle('');
      setDescription('');
      setCategory('personal');
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to save reminder');
    }
  };

  const playTone = (toneId: number) => {
    const tone = notificationTones.find(t => t.id === toneId);
    if (!tone) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = tone.frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + tone.duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + tone.duration / 1000);
    } catch (e) {
      console.log('Audio playback not supported');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">New Reminder</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Take medicine"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(categories) as CategoryKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  style={{
                    backgroundColor: 'transparent',
                    border: category === key ? '2px solid white' : '2px solid #374151',
                    color: '#9ca3af'
                  }}
                  className="p-3 rounded-lg transition hover:border-gray-500"
                >
                  <div className="text-2xl mb-1">{categories[key].icon}</div>
                  <div className="text-xs text-gray-300">{categories[key].label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Repeat</label>
            <select
              value={repeatType}
              onChange={(e) => setRepeatType(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Advance Reminder</label>
            <select
              value={advanceMin}
              onChange={(e) => setAdvanceMin(Number(e.target.value))}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>No advance notification</option>
              <option value={5}>5 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notification Tone</label>
            <div className="flex gap-2">
              <select
                value={notificationTone}
                onChange={(e) => setNotificationTone(Number(e.target.value))}
                className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                {notificationTones.map((tone) => (
                  <option key={tone.id} value={tone.id}>
                    {tone.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => playTone(notificationTone)}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
              >
                <Play className="w-5 h-5" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            style={{ backgroundColor: '#2563eb', color: 'white' }}
          >
            <Save className="w-5 h-5" />
            Save Reminder
          </button>
        </form>
      </div>
    </div>
  );
}