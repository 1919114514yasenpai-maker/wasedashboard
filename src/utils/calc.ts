/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TestScoreResult {
  requiredScore: number;
  neededTotal: number;
  currentSum: number;
  remainingTests: number;
  isFeasible: boolean;
  status: 'already_achieved' | 'easy' | 'realistic' | 'challenging' | 'impossible';
  statusText: string;
}

export function calculateRequiredScore(
  currentScores: number[],
  targetAverage: number,
  totalTests: number
): TestScoreResult {
  const count = currentScores.length;
  const remaining = Math.max(1, totalTests - count);
  const currentSum = currentScores.reduce((acc, s) => acc + s, 0);
  const neededTotal = targetAverage * totalTests;
  const neededRemainingTotal = neededTotal - currentSum;
  const requiredPerTest = Number((neededRemainingTotal / remaining).toFixed(1));

  let status: TestScoreResult['status'] = 'realistic';
  let statusText = '十分達成可能です';

  if (requiredPerTest <= 0) {
    status = 'already_achieved';
    statusText = '0点でも目標平均点に到達します！';
  } else if (requiredPerTest <= 60) {
    status = 'easy';
    statusText = '余裕を持って達成可能なペースです';
  } else if (requiredPerTest <= 85) {
    status = 'realistic';
    statusText = '堅実な対策で狙えるスコアです';
  } else if (requiredPerTest <= 100) {
    status = 'challenging';
    statusText = '高得点が必要です！重点的に対策しましょう';
  } else {
    status = 'impossible';
    statusText = '100点満点を超えています。目標点を見直すかボーナス課題を確認してください';
  }

  return {
    requiredScore: Math.max(0, requiredPerTest),
    neededTotal,
    currentSum,
    remainingTests: remaining,
    isFeasible: requiredPerTest <= 100,
    status,
    statusText,
  };
}

export interface WeightedExamItem {
  name: string;
  score: number;
  weight: number; // percentage, e.g. 20, 30
}

export interface WeightedExamResult {
  requiredFinalScore: number;
  currentWeightedPoints: number;
  targetScore: number;
  finalWeight: number;
  isFeasible: boolean;
  statusText: string;
}

export function calculateWeightedFinalScore(
  items: WeightedExamItem[],
  targetScore: number,
  finalWeight: number
): WeightedExamResult {
  const currentWeightedPoints = items.reduce(
    (acc, item) => acc + (item.score * item.weight) / 100,
    0
  );
  const remainingPointsNeeded = targetScore - currentWeightedPoints;
  const safeFinalWeight = Math.max(1, finalWeight);
  const requiredFinalScore = Number(
    ((remainingPointsNeeded / safeFinalWeight) * 100).toFixed(1)
  );

  let statusText = '合格・目標達成ラインです';
  if (requiredFinalScore <= 0) {
    statusText = 'すでに目標評価ラインをクリアしています！';
  } else if (requiredFinalScore > 100) {
    statusText = '満点(100点)を超えています';
  } else if (requiredFinalScore >= 85) {
    statusText = '期末でハイスコア（85点以上）が必要です';
  }

  return {
    requiredFinalScore: Math.max(0, requiredFinalScore),
    currentWeightedPoints: Number(currentWeightedPoints.toFixed(1)),
    targetScore,
    finalWeight,
    isFeasible: requiredFinalScore <= 100,
    statusText,
  };
}

export interface ScheduleItem {
  id: string;
  dayOfWeek: number; // 1 = Mon, ..., 6 = Sat, 0 = Sun
  period: number;
  subject: string;
  room?: string;
  teacher?: string;
  color?: string;
  memo?: string;
}

export interface PeriodTime {
  period: number;
  start: string; // "09:00"
  end: string;   // "10:30"
}

export const DEFAULT_PERIOD_TIMES: PeriodTime[] = [
  { period: 1, start: '09:00', end: '10:30' },
  { period: 2, start: '10:45', end: '12:15' },
  { period: 3, start: '13:00', end: '14:30' },
  { period: 4, start: '14:45', end: '16:15' },
  { period: 5, start: '16:30', end: '18:00' },
  { period: 6, start: '18:15', end: '19:45' },
  { period: 7, start: '20:00', end: '21:30' },
];

export const DAY_NAMES: Record<number, string> = {
  1: '月曜日',
  2: '火曜日',
  3: '水曜日',
  4: '木曜日',
  5: '金曜日',
  6: '土曜日',
  0: '日曜日',
};

export interface CountdownState {
  status: 'empty' | 'ongoing' | 'upcoming_today' | 'upcoming_future' | 'no_more_today';
  currentClass?: ScheduleItem;
  nextClass?: ScheduleItem;
  minutesRemaining?: number;
  secondsRemaining?: number;
  percentage?: number;
  label?: string;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function getNextClassCountdown(
  schedule: ScheduleItem[],
  periodTimes: PeriodTime[],
  now: Date
): CountdownState {
  if (!schedule || schedule.length === 0) {
    return { status: 'empty', label: '時間割が未登録です' };
  }

  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = now.getSeconds();

  const todayClasses = schedule
    .filter((s) => s.dayOfWeek === currentDay)
    .map((s) => {
      const pTime = periodTimes.find((p) => p.period === s.period) || {
        start: '09:00',
        end: '10:30',
      };
      return {
        ...s,
        startMinutes: parseTimeToMinutes(pTime.start),
        endMinutes: parseTimeToMinutes(pTime.end),
        timeString: `${pTime.start}〜${pTime.end}`,
      };
    })
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const ongoing = todayClasses.find(
    (c) => currentMinutes >= c.startMinutes && currentMinutes < c.endMinutes
  );

  if (ongoing) {
    const totalMinutes = ongoing.endMinutes - ongoing.startMinutes;
    const elapsedMinutes = currentMinutes - ongoing.startMinutes;
    const minutesLeft = ongoing.endMinutes - currentMinutes - 1;
    const secondsLeft = 60 - currentSeconds;
    const percentage = Math.min(100, Math.round(((elapsedMinutes * 60 + currentSeconds) / (totalMinutes * 60)) * 100));

    return {
      status: 'ongoing',
      currentClass: ongoing,
      minutesRemaining: Math.max(0, minutesLeft),
      secondsRemaining: secondsLeft === 60 ? 0 : secondsLeft,
      percentage,
      label: `現在【${ongoing.subject}】の講義中`,
    };
  }

  const upcomingToday = todayClasses.find((c) => c.startMinutes > currentMinutes);
  if (upcomingToday) {
    const diffMinutes = upcomingToday.startMinutes - currentMinutes - 1;
    const secondsLeft = 60 - currentSeconds;

    return {
      status: 'upcoming_today',
      nextClass: upcomingToday,
      minutesRemaining: Math.max(0, diffMinutes),
      secondsRemaining: secondsLeft === 60 ? 0 : secondsLeft,
      label: `次の授業【${upcomingToday.subject}】まで`,
    };
  }

  for (let offset = 1; offset <= 7; offset++) {
    const targetDay = (currentDay + offset) % 7;
    const classesOnDay = schedule
      .filter((s) => s.dayOfWeek === targetDay)
      .map((s) => {
        const pTime = periodTimes.find((p) => p.period === s.period) || {
          start: '09:00',
          end: '10:30',
        };
        return {
          ...s,
          startMinutes: parseTimeToMinutes(pTime.start),
          timeString: `${pTime.start}〜${pTime.end}`,
        };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);

    if (classesOnDay.length > 0) {
      const nextOne = classesOnDay[0];
      const dayLabel = offset === 1 ? '明日' : DAY_NAMES[targetDay];
      return {
        status: 'upcoming_future',
        nextClass: nextOne,
        label: `${dayLabel}の講義【${nextOne.subject}】(${nextOne.timeString})`,
      };
    }
  }

  return { status: 'no_more_today', label: '登録済みの予定はありません' };
}

export interface TaskUrgency {
  isOverdue: boolean;
  isDueToday: boolean;
  isDueTomorrow: boolean;
  daysRemaining: number;
  level: 'overdue' | 'critical' | 'warning' | 'normal';
  badgeText: string;
}

export function getTaskUrgency(dueDateStr?: string, now = new Date()): TaskUrgency {
  if (!dueDateStr) {
    return {
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      daysRemaining: 999,
      level: 'normal',
      badgeText: '期限なし',
    };
  }

  const target = new Date(dueDateStr);
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffTime = targetDate.getTime() - nowDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      isOverdue: true,
      isDueToday: false,
      isDueTomorrow: false,
      daysRemaining: diffDays,
      level: 'overdue',
      badgeText: `期限切れ (${Math.abs(diffDays)}日前)`,
    };
  } else if (diffDays === 0) {
    return {
      isOverdue: false,
      isDueToday: true,
      isDueTomorrow: false,
      daysRemaining: 0,
      level: 'critical',
      badgeText: '今日まで！',
    };
  } else if (diffDays === 1) {
    return {
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: true,
      daysRemaining: 1,
      level: 'warning',
      badgeText: '明日まで',
    };
  } else {
    return {
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      daysRemaining: diffDays,
      level: 'normal',
      badgeText: `あと${diffDays}日`,
    };
  }
}
