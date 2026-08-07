export const STATUS_LABELS = {
  pending: 'На модерации',
  approved: 'Одобрено',
  rejected: 'Отклонено',
};

export const STATUS_CLASSES = {
  pending: 'status-pending',
  approved: 'status-approved',
  rejected: 'status-rejected',
};

export function getStatusText(status) {
  return STATUS_LABELS[status] || status;
}

export function getStatusClass(status) {
  return STATUS_CLASSES[status] || '';
}

export const STATUS_FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'pending', label: 'На модерации' },
  { key: 'approved', label: 'Одобрено' },
  { key: 'rejected', label: 'Отклонено' },
];
