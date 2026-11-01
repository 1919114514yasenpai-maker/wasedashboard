import test from 'node:test';
import assert from 'node:assert';
import {
  formatDateToYYYYMMDD,
  buildMonthMatrix,
  getCategoryInfo,
} from './calendar';

test('formatDateToYYYYMMDD formats date as YYYY-MM-DD', () => {
  const d = new Date(2026, 9, 31); // Month 9 is October (0-indexed)
  assert.strictEqual(formatDateToYYYYMMDD(d), '2026-10-31');
});

test('buildMonthMatrix returns correct cells count and month flags', () => {
  const matrix = buildMonthMatrix(2026, 9, false); // Oct 2026
  assert.ok(matrix.length === 35 || matrix.length === 42);
  const currentMonthCells = matrix.filter((c) => c.isCurrentMonth);
  assert.strictEqual(currentMonthCells.length, 31); // Oct has 31 days
});

test('getCategoryInfo returns category colors and labels', () => {
  const exam = getCategoryInfo('exam');
  assert.strictEqual(exam.label, 'テスト・試験');
  assert.ok(exam.badgeBg.includes('rose'));
});
