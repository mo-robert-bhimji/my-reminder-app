// ============================================================================
// CATEGORIES.TSX - Category Definitions for Reminders
// ============================================================================

export const categories = {
  health: {
    icon: '🏃',
    label: 'Health',
    color: '#ec4899'  // Pink - represents vitality, energy
  },
  work: {
    icon: '💼',
    label: 'Work',
    color: '#3b82f6'  // Blue - professional, trustworthy
  },
  personal: {
    icon: '📚',
    label: 'Personal',
    color: '#8b5cf6'  // Violet - personal growth
  },
  home: {
    icon: '🏠',
    label: 'Home',
    color: '#f97316'  // Orange - warmth, comfort
  },
  finance: {
    icon: '💰',
    label: 'Finance',
    color: '#10b981'  // Emerald - money, growth
  },
  social: {
    icon: '👥',
    label: 'Social',
    color: '#6366f1'  // Indigo - connection, community
  },
  learning: {
    icon: '🎓',
    label: 'Learning',
    color: '#14b8a6'  // Teal - knowledge, clarity
  },
  other: {
    icon: '📌',
    label: 'Other',
    color: '#6b7280'  // Gray - neutral
  }
};

export type CategoryKey = keyof typeof categories;