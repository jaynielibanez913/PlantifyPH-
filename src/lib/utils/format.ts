export function formatManilaDate(isoString: string | null | undefined): string {
  if (!isoString) {
    return 'Not yet recorded';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(date);
}

export function formatRelativeDays(isoString: string): {
  label: string;
  tone: 'overdue' | 'due-soon' | 'upcoming';
} {
  const target = new Date(isoString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );

  const diffDays = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return {
      label: `${abs} ${abs === 1 ? 'day' : 'days'} overdue`,
      tone: 'overdue',
    };
  }
  if (diffDays === 0) {
    return { label: 'Due today', tone: 'due-soon' };
  }
  if (diffDays === 1) {
    return { label: 'Due tomorrow', tone: 'due-soon' };
  }
  return { label: `In ${diffDays} days`, tone: 'upcoming' };
}
