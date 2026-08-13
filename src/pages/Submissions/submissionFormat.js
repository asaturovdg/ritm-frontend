export const formatTime = (t) => t ? t.substring(0, 5) : '';
export const formatDate = (d) => d ? d.split('-').reverse().join('.') : '';
