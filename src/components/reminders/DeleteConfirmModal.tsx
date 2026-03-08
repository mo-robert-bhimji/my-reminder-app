// ============================================================================
// DELETECONFIRMMODAL.TSX - Delete Confirmation Modal
// ============================================================================

import { X, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reminderTitle: string;
  reminderDate: string;
  reminderTime: string;
}

export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  reminderTitle,
  reminderDate,
  reminderTime 
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-800 shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-500/20">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Delete Reminder?</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Reminder Details */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <h3 className="text-white font-semibold mb-2">{reminderTitle}</h3>
            <p className="text-gray-400 text-sm">
              📅 {reminderDate} • ⏰ {reminderTime}
            </p>
          </div>

          {/* Warning Message */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm text-yellow-500 font-medium">This action cannot be undone</p>
              <p className="text-xs text-yellow-500/80 mt-1">
                This reminder will be permanently deleted from your Habit\Minder.
              </p>
            </div>
          </div>
        </div>

        {/* Actions - Blue Gradient Buttons with White Text */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg font-medium transition text-white"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-lg font-medium transition text-white"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)'
            }}
          >
            Delete Reminder
          </button>
        </div>
      </div>
    </div>
  );
}