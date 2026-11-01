/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EventCategory = 'exam' | 'assignment' | 'class' | 'event' | 'work' | 'other';

export interface CalendarEvent {
  id: string;
  userId?: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional for multi-day)
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isAllDay: boolean;
  category: EventCategory;
  color: string;
  location?: string;
  memo?: string;
  createdAt: string;
}

export interface CalendarCategoryInfo {
  key: EventCategory;
  label: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const EVENT_CATEGORIES: CalendarCategoryInfo[] = [
  {
    key: 'exam',
    label: 'テスト・試験',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/40',
  },
  {
    key: 'assignment',
    label: '課題・提出物',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/40',
  },
  {
    key: 'class',
    label: '講義・休講・補講',
    dotColor: 'bg-sky-500',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-500/40',
  },
  {
    key: 'event',
    label: '学校行事・サークル',
    dotColor: 'bg-indigo-500',
    badgeBg: 'bg-indigo-500/20',
    badgeText: 'text-indigo-300',
    badgeBorder: 'border-indigo-500/40',
  },
  {
    key: 'work',
    label: 'バイト・インターン',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/40',
  },
  {
    key: 'other',
    label: 'その他・私用',
    dotColor: 'bg-slate-400',
    badgeBg: 'bg-slate-500/20',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-500/40',
  },
];

export function getCategoryInfo(category: EventCategory | string): CalendarCategoryInfo {
  const found = EVENT_CATEGORIES.find((c) => c.key === category);
  return (
    found || {
      key: 'other',
      label: 'その他',
      dotColor: 'bg-slate-400',
      badgeBg: 'bg-slate-500/20',
      badgeText: 'text-slate-300',
      badgeBorder: 'border-slate-500/40',
    }
  );
}

export function formatDateToYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface CalendarDayCell {
  date: Date;
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0: Sun, 1: Mon, ..., 6: Sat
}

/**
 * Returns a 35 or 42 day matrix for the given month (starts on Sunday or Monday).
 * @param year full year (e.g. 2026)
 * @param month 0-indexed month (0 = Jan, 11 = Dec)
 * @param startOnMonday default true (starts on Monday for students, Sun=last or Sun=first)
 */
export function buildMonthMatrix(
  year: number,
  month: number,
  startOnMonday = false
): CalendarDayCell[] {
  const todayStr = formatDateToYYYYMMDD(new Date());
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDay = firstDayOfMonth.getDay(); // 0 is Sun, 1 is Mon...
  let offset = startOnMonday ? (startDay === 0 ? 6 : startDay - 1) : startDay;

  const totalCells = offset + lastDayOfMonth.getDate() > 35 ? 42 : 35;
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < totalCells; i++) {
    const currentDay = new Date(year, month, 1 - offset + i);
    const dateStr = formatDateToYYYYMMDD(currentDay);
    cells.push({
      date: currentDay,
      dateString: dateStr,
      dayNumber: currentDay.getDate(),
      isCurrentMonth: currentDay.getMonth() === month,
      isToday: dateStr === todayStr,
      dayOfWeek: currentDay.getDay(),
    });
  }

  return cells;
}
