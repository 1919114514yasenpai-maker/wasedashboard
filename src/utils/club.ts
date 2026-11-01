/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ClubCategory = 'practice' | 'match' | 'camp' | 'meeting' | 'event' | 'off';

export interface ClubEvent {
  id: string;
  userId?: string;
  title: string;           // 例: 全体練習、秋季公式戦 vs ○○大学、夏合宿
  clubName?: string;        // 所属部活・サークル名（例: 蹴球部、テニスサークル）
  category: ClubCategory;  // 練習, 試合, 合宿, ミーティング, イベント, オフ
  date: string;            // YYYY-MM-DD
  endDate?: string;        // 複数日にまたがる合宿・遠征 (YYYY-MM-DD)
  startTime?: string;      // HH:mm
  endTime?: string;        // HH:mm
  isAllDay?: boolean;
  location?: string;       // 場所 (東伏見グラウンド, 戸山体育館など)
  opponent?: string;       // 対戦相手（試合の場合）
  memo?: string;           // 持ち物・連絡事項
  attendance?: 'attending' | 'absent' | 'maybe' | 'undecided'; // 自分の出欠
  createdAt: string;
}

export interface ClubCategoryInfo {
  key: ClubCategory;
  label: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconName: string;
}

export const CLUB_CATEGORIES: ClubCategoryInfo[] = [
  {
    key: 'practice',
    label: '練習・トレーニング',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    badgeBorder: 'border-emerald-500/40',
    iconName: 'Dumbbell',
  },
  {
    key: 'match',
    label: '試合・大会・対戦',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/40',
    iconName: 'Trophy',
  },
  {
    key: 'camp',
    label: '合宿・遠征',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/40',
    iconName: 'Tent',
  },
  {
    key: 'meeting',
    label: '部会・ミーティング',
    dotColor: 'bg-sky-500',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-500/40',
    iconName: 'Users',
  },
  {
    key: 'event',
    label: 'イベント・新歓・コンパ',
    dotColor: 'bg-purple-500',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
    badgeBorder: 'border-purple-500/40',
    iconName: 'PartyPopper',
  },
  {
    key: 'off',
    label: 'オフ・自主練',
    dotColor: 'bg-slate-400',
    badgeBg: 'bg-slate-500/20',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-500/40',
    iconName: 'Coffee',
  },
];

export function getClubCategoryInfo(category: ClubCategory | string): ClubCategoryInfo {
  const found = CLUB_CATEGORIES.find((c) => c.key === category);
  return (
    found || {
      key: 'practice',
      label: '練習',
      dotColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/40',
      iconName: 'Dumbbell',
    }
  );
}

export function getUpcomingClubEvents(events: ClubEvent[], limit = 5, now = new Date()): ClubEvent[] {
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  return events
    .filter((e) => e.date >= todayStr || (e.endDate && e.endDate >= todayStr))
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    })
    .slice(0, limit);
}
