export const getFileType = (fileName = '', mimeType = '') => {
  const lowerName = (fileName || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();
  if (lowerName.endsWith('.pdf') || lowerMime.includes('pdf')) return 'pdf';
  if (
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.gif') ||
    lowerName.endsWith('.svg') ||
    lowerMime.startsWith('image/')
  ) {
    return 'image';
  }
  if (
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.json') ||
    lowerMime.startsWith('text/')
  ) {
    return 'text';
  }
  if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) return 'word';
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) return 'excel';
  return 'other';
};

export const getMimeTypeFromFileName = (fileName = '') => {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
};
