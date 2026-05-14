const MYT_TZ = { timeZone: 'Asia/Kuala_Lumpur' } as const;

export const getMYTDateStr = (): string =>
  new Date().toLocaleDateString('en-CA', MYT_TZ);

export const getMYTHours = (): number =>
  new Date(Date.now() + 8 * 3600_000).getUTCHours();

export const getMYTNowStr = (): string => {
  const now = new Date();
  const date = now.toLocaleDateString('en-CA', MYT_TZ);
  const time = now.toLocaleTimeString('en-GB', { ...MYT_TZ, hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
};

export const parseMYTDatetime = (s: string): Date =>
  new Date(s.includes('T') || s.includes('+') || s.includes('Z') ? s : s.replace(' ', 'T') + '+08:00');

export const toMYTHour = (d: Date): number =>
  new Date(d.getTime() + 8 * 3600_000).getUTCHours();
