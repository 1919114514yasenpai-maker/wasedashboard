/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScheduleItem, PeriodTime } from './calc';
import { ClubEvent } from './club';

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

// Helper to escape text for iCalendar format (RFC 5545)
function escapeICSText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Helper to format date string to iCalendar compact format (YYYYMMDD or YYYYMMDDTHHMMSS)
function formatToICSDate(dateStr: string, timeStr?: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  if (!timeStr) return cleanDate;
  const cleanTime = timeStr.replace(/:/g, '');
  return `${cleanDate}T${cleanTime.padEnd(6, '0')}`;
}

/**
 * Generates an RFC 5545 standard .ics file string for device calendar import (Apple Calendar / Google Calendar / Outlook).
 */
export function generateICSContent(
  events: CalendarEvent[],
  schedule: ScheduleItem[] = [],
  periodTimes: PeriodTime[] = [],
  clubEvents: ClubEvent[] = []
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//wasedashboard//PWA Calendar Sync//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:wasedashboard カレンダー',
    'X-WR-TIMEZONE:Asia/Tokyo',
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // 1. Export Calendar Events
  events.forEach((ev) => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:ev_${ev.id || Math.random().toString(36).substr(2, 9)}@wasedashboard`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`SUMMARY:${escapeICSText(ev.title)}`);

    if (ev.isAllDay || !ev.startTime) {
      lines.push(`DTSTART;VALUE=DATE:${formatToICSDate(ev.date)}`);
      // Add 1 day for DTEND in all day event per RFC 5545
      const d = new Date(ev.date);
      d.setDate(d.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${formatToICSDate(formatDateToYYYYMMDD(d))}`);
    } else {
      lines.push(`DTSTART:${formatToICSDate(ev.date, ev.startTime)}`);
      lines.push(`DTEND:${formatToICSDate(ev.date, ev.endTime || ev.startTime)}`);
    }

    if (ev.location) lines.push(`LOCATION:${escapeICSText(ev.location)}`);
    if (ev.memo) lines.push(`DESCRIPTION:${escapeICSText(ev.memo)}`);
    lines.push('END:VEVENT');
  });

  // 2. Export Club Events
  clubEvents.forEach((cev) => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:club_${cev.id || Math.random().toString(36).substr(2, 9)}@wasedashboard`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`SUMMARY:${escapeICSText(`【サークル】${cev.title}${cev.opponent ? ` vs ${cev.opponent}` : ''}`)}`);

    if (cev.isAllDay || !cev.startTime) {
      lines.push(`DTSTART;VALUE=DATE:${formatToICSDate(cev.date)}`);
      const d = new Date(cev.date);
      d.setDate(d.getDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${formatToICSDate(formatDateToYYYYMMDD(d))}`);
    } else {
      lines.push(`DTSTART:${formatToICSDate(cev.date, cev.startTime)}`);
      lines.push(`DTEND:${formatToICSDate(cev.endDate || cev.date, cev.endTime || cev.startTime)}`);
    }

    if (cev.location) lines.push(`LOCATION:${escapeICSText(cev.location)}`);
    const memo = `${cev.clubName ? `所属: ${cev.clubName}\n` : ''}${cev.memo || ''}`;
    lines.push(`DESCRIPTION:${escapeICSText(memo)}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Downloads .ics file or triggers native iOS/Android device calendar import
 */
export function downloadICSFile(icsContent: string, filename = 'wasedashboard_calendar.ics') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

  // For iOS Safari / PWA: Creating blob link with .ics extension triggers iOS Apple Calendar import prompt
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(link.href), 1000);
}

/**
 * Generates a URL for direct export to Google Calendar
 */
export function generateGoogleCalendarUrl(event: {
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  location?: string;
  memo?: string;
}): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const text = encodeURIComponent(event.title);
  const location = event.location ? encodeURIComponent(event.location) : '';
  const details = event.memo ? encodeURIComponent(event.memo) : '';

  let dates = '';
  if (event.isAllDay || !event.startTime) {
    const startDate = event.date.replace(/-/g, '');
    const d = new Date(event.date);
    d.setDate(d.getDate() + 1);
    const endDate = formatDateToYYYYMMDD(d).replace(/-/g, '');
    dates = `${startDate}/${endDate}`;
  } else {
    const startStr = `${event.date.replace(/-/g, '')}T${(event.startTime || '09:00').replace(/:/g, '')}00`;
    const endDateStr = event.endDate || event.date;
    const endStr = `${endDateStr.replace(/-/g, '')}T${(event.endTime || event.startTime || '10:00').replace(/:/g, '')}00`;
    dates = `${startStr}/${endStr}`;
  }

  return `${baseUrl}&text=${text}&dates=${dates}&details=${details}&location=${location}`;
}

/**
 * Export a single event to native device calendar (.ics download)
 */
export function exportSingleEventICS(event: {
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  location?: string;
  memo?: string;
}) {
  const calEvent: CalendarEvent = {
    id: `single_${Date.now()}`,
    title: event.title,
    date: event.date,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    isAllDay: !!event.isAllDay,
    category: 'event',
    color: '#6366f1',
    location: event.location,
    memo: event.memo,
    createdAt: new Date().toISOString(),
  };

  const ics = generateICSContent([calEvent]);
  const safeTitle = event.title.replace(/[^a-zA-Z0-9-_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_');
  downloadICSFile(ics, `${safeTitle}_event.ics`);
}
