export const getTimeRemaining = (date?: string, time?: string): string => {
  if (!date) return '-';
  const now = new Date();
  const appointment = new Date(`${date}T${time || '00:00'}`);
  const diff = appointment.getTime() - now.getTime();
  if (diff < 0) return 'ผ่านมาแล้ว';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${days} วัน ${hours} ชั่วโมง`;
};