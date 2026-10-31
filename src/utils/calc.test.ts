import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRequiredScore,
  calculateWeightedFinalScore,
  getNextClassCountdown,
  getTaskUrgency,
  DEFAULT_PERIOD_TIMES,
  ScheduleItem,
} from './calc';

test('calculateRequiredScore accurately computes needed exam scores', () => {
  const res1 = calculateRequiredScore([70, 70], 80, 3);
  assert.equal(res1.requiredScore, 100);
  assert.equal(res1.isFeasible, true);
  assert.equal(res1.status, 'challenging');

  const res2 = calculateRequiredScore([50, 50], 90, 3);
  assert.equal(res2.requiredScore, 170);
  assert.equal(res2.isFeasible, false);
  assert.equal(res2.status, 'impossible');

  const res3 = calculateRequiredScore([90, 95], 60, 3);
  assert.equal(res3.requiredScore, 0);
  assert.equal(res3.status, 'already_achieved');
});

test('calculateWeightedFinalScore handles weights and final exam goals', () => {
  const weighted = calculateWeightedFinalScore(
    [
      { name: '小テスト', score: 80, weight: 20 },
      { name: '中間試験', score: 70, weight: 30 },
    ],
    80,
    50
  );

  assert.equal(weighted.currentWeightedPoints, 37);
  assert.equal(weighted.requiredFinalScore, 86);
  assert.equal(weighted.isFeasible, true);
});

test('getNextClassCountdown correctly detects ongoing and upcoming classes', () => {
  const schedule: ScheduleItem[] = [
    {
      id: '1',
      dayOfWeek: 1, // Monday
      period: 1, // 09:00 - 10:30
      subject: '高等数学',
    },
    {
      id: '2',
      dayOfWeek: 1, // Monday
      period: 2, // 10:45 - 12:15
      subject: '情報工学',
    },
  ];

  const insideClass = new Date('2026-11-02T09:30:00');
  const resOngoing = getNextClassCountdown(schedule, DEFAULT_PERIOD_TIMES, insideClass);
  assert.equal(resOngoing.status, 'ongoing');
  assert.equal(resOngoing.currentClass?.subject, '高等数学');

  const beforeClass = new Date('2026-11-02T08:30:00');
  const resUpcoming = getNextClassCountdown(schedule, DEFAULT_PERIOD_TIMES, beforeClass);
  assert.equal(resUpcoming.status, 'upcoming_today');
  assert.equal(resUpcoming.nextClass?.subject, '高等数学');

  const emptyRes = getNextClassCountdown([], DEFAULT_PERIOD_TIMES, beforeClass);
  assert.equal(emptyRes.status, 'empty');
});

test('getTaskUrgency calculates overdue, today, and future badges', () => {
  const base = new Date('2026-11-02T10:00:00');

  const overdue = getTaskUrgency('2026-11-01', base);
  assert.equal(overdue.isOverdue, true);
  assert.equal(overdue.level, 'overdue');

  const today = getTaskUrgency('2026-11-02', base);
  assert.equal(today.isDueToday, true);
  assert.equal(today.level, 'critical');

  const tomorrow = getTaskUrgency('2026-11-03', base);
  assert.equal(tomorrow.isDueTomorrow, true);
  assert.equal(tomorrow.level, 'warning');

  const future = getTaskUrgency('2026-11-07', base);
  assert.equal(future.daysRemaining, 5);
  assert.equal(future.level, 'normal');
});
