export const apiOrigin = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    if (
      host.includes('trycloudflare.com') ||
      host.includes('localhost') ||
      host === '127.0.0.1'
    ) {
      return '';
    }
  }
  return import.meta.env.VITE_BACKEND_URL || '';
};

export const downloadPrivateFile = async (path, fallbackName) => {
  const response = await fetch(`${apiOrigin()}/v1/api${path}`, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.EM || 'Tai file that bai');
  }
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/i);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href = url; link.download = match?.[1] || fallbackName; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
