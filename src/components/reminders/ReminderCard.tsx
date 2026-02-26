import { categories } from '../../utils/categories';

interface ReminderCardProps {
  reminder: any;
  onClick: () => void;
}

export default function ReminderCard({ reminder, onClick }: ReminderCardProps) {
  const category = categories[reminder.category as keyof typeof categories] || categories.personal;

  return (
    <div 
      onClick={onClick}
      className="bg-gray-900 p-4 rounded-xl border border-gray-800 active:scale-95 transition cursor-pointer hover:border-gray-700"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{category.icon}</span>
          <h3 className="font-semibold text-white text-lg">{reminder.title}</h3>
        </div>
        <span 
          className="px-2 py-1 text-xs rounded-full text-white"
          style={{ backgroundColor: category.color }}
        >
          {category.label}
        </span>
      </div>
      
      {reminder.description && (
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{reminder.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-1">
          <span>📅</span>
          <span>{reminder.scheduledDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🕐</span>
          <span>{reminder.scheduledTime}</span>
        </div>
      </div>

      {reminder.repeatType !== 'none' && (
        <div className="flex items-center gap-1 text-xs text-blue-400 mt-2">
          <span>🔁</span>
          <span className="capitalize">{reminder.repeatType}</span>
        </div>
      )}
    </div>
  );
}