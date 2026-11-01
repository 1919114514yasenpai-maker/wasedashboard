/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ClubEvent, getClubCategoryInfo, getUpcomingClubEvents } from './club';

test('getClubCategoryInfo returns matching category metadata', () => {
  const matchInfo = getClubCategoryInfo('match');
  assert.equal(matchInfo.key, 'match');
  assert.equal(matchInfo.label, '試合・大会・対戦');

  const fallback = getClubCategoryInfo('unknown');
  assert.equal(fallback.key, 'practice');
});

test('getUpcomingClubEvents filters and sorts future club events', () => {
  const now = new Date('2026-10-31T10:00:00Z');
  const sampleEvents: ClubEvent[] = [
    {
      id: '1',
      title: '過去の練習',
      category: 'practice',
      date: '2026-10-25',
      createdAt: '2026-10-20',
    },
    {
      id: '2',
      title: '公式戦 vs 東大',
      category: 'match',
      date: '2026-11-05',
      startTime: '14:00',
      createdAt: '2026-10-20',
    },
    {
      id: '3',
      title: '今日の夜練習',
      category: 'practice',
      date: '2026-10-31',
      startTime: '18:00',
      createdAt: '2026-10-20',
    },
  ];

  const upcoming = getUpcomingClubEvents(sampleEvents, 5, now);
  assert.equal(upcoming.length, 2);
  assert.equal(upcoming[0].id, '3');
  assert.equal(upcoming[1].id, '2');
});
