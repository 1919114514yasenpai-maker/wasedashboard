/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Dumbbell,
  Tent,
  Users,
  PartyPopper,
  Coffee,
  Plus,
  Trash2,
  Edit2,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Filter,
  Search,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import {
  ClubEvent,
  ClubCategory,
  CLUB_CATEGORIES,
  getClubCategoryInfo,
} from '../utils/club';
import { exportSingleEventICS } from '../utils/calendar';

interface ClubScheduleViewProps {
  clubEvents: ClubEvent[];
  onAddEvent: (event: Omit<ClubEvent, 'id' | 'createdAt'>) => void;
  onUpdateEvent: (event: ClubEvent) => void;
  onDeleteEvent: (id: string) => void;
  onSyncToCalendar?: (clubEvent: ClubEvent) => void;
}

export function ClubScheduleView({
  clubEvents,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onSyncToCalendar,
}: ClubScheduleViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [clubFilter, setClubFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formClubName, setFormClubName] = useState('');
  const [formCategory, setFormCategory] = useState<ClubCategory>('practice');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formEndDate, setFormEndDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('17:00');
  const [formEndTime, setFormEndTime] = useState('19:00');
  const [formIsAllDay, setFormIsAllDay] = useState(false);
  const [formLocation, setFormLocation] = useState('');
  const [formOpponent, setFormOpponent] = useState('');
  const [formMemo, setFormMemo] = useState('');
  const [formAttendance, setFormAttendance] = useState<
    'attending' | 'absent' | 'maybe' | 'undecided'
  >('attending');

  // Unique club names for filter
  const existingClubNames = useMemo(() => {
    const set = new Set<string>();
    clubEvents.forEach((e) => {
      if (e.clubName && e.clubName.trim()) set.add(e.clubName.trim());
    });
    return Array.from(set);
  }, [clubEvents]);

  const openAddModal = (defaultCat: ClubCategory = 'practice') => {
    setEditingEvent(null);
    setFormTitle('');
    setFormClubName(existingClubNames[0] || '部活・サークル');
    setFormCategory(defaultCat);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormEndDate('');
    setFormStartTime('17:00');
    setFormEndTime('19:00');
    setFormIsAllDay(false);
    setFormLocation('');
    setFormOpponent('');
    setFormMemo('');
    setFormAttendance('attending');
    setModalOpen(true);
  };

  const openEditModal = (event: ClubEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormClubName(event.clubName || '');
    setFormCategory(event.category);
    setFormDate(event.date);
    setFormEndDate(event.endDate || '');
    setFormStartTime(event.startTime || '17:00');
    setFormEndTime(event.endTime || '19:00');
    setFormIsAllDay(!!event.isAllDay);
    setFormLocation(event.location || '');
    setFormOpponent(event.opponent || '');
    setFormMemo(event.memo || '');
    setFormAttendance(event.attendance || 'attending');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingEvent) {
      onUpdateEvent({
        ...editingEvent,
        title: formTitle.trim(),
        clubName: formClubName.trim() || undefined,
        category: formCategory,
        date: formDate,
        endDate: formEndDate || undefined,
        startTime: formIsAllDay ? undefined : formStartTime,
        endTime: formIsAllDay ? undefined : formEndTime,
        isAllDay: formIsAllDay,
        location: formLocation.trim() || undefined,
        opponent: formOpponent.trim() || undefined,
        memo: formMemo.trim() || undefined,
        attendance: formAttendance,
      });
    } else {
      onAddEvent({
        title: formTitle.trim(),
        clubName: formClubName.trim() || undefined,
        category: formCategory,
        date: formDate,
        endDate: formEndDate || undefined,
        startTime: formIsAllDay ? undefined : formStartTime,
        endTime: formIsAllDay ? undefined : formEndTime,
        isAllDay: formIsAllDay,
        location: formLocation.trim() || undefined,
        opponent: formOpponent.trim() || undefined,
        memo: formMemo.trim() || undefined,
        attendance: formAttendance,
      });
    }
    setModalOpen(false);
  };

  // Filtered list
  const filteredEvents = useMemo(() => {
    let list = [...clubEvents];

    if (categoryFilter !== 'all') {
      list = list.filter((e) => e.category === categoryFilter);
    }

    if (clubFilter !== 'all') {
      list = list.filter((e) => e.clubName === clubFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.clubName && e.clubName.toLowerCase().includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q)) ||
          (e.opponent && e.opponent.toLowerCase().includes(q)) ||
          (e.memo && e.memo.toLowerCase().includes(q))
      );
    }

    // Sort by date (ascending)
    list.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });

    return list;
  }, [clubEvents, categoryFilter, clubFilter, searchQuery]);

  // Statistics
  const upcomingCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return clubEvents.filter((e) => e.date >= today).length;
  }, [clubEvents]);

  const matchesCount = useMemo(() => {
    return clubEvents.filter((e) => e.category === 'match').length;
  }, [clubEvents]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 p-5 sm:p-7 shadow-xl shadow-black/40">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                部活・サークルマネージャー
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              部活・サークル日程管理
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              練習・大会・合宿・部会のスケジュールや出欠をスマートに管理。学業と両立できます！
            </p>
          </div>

          <button
            onClick={() => openAddModal('practice')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            部活の予定を登録
          </button>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] text-slate-400">登録イベント数</span>
            <p className="text-xl font-bold text-white mt-0.5">{clubEvents.length}</p>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] text-slate-400">今後の予定</span>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{upcomingCount}</p>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] text-slate-400">試合・大会</span>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{matchesCount}</p>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] text-slate-400">所属団体数</span>
            <p className="text-xl font-bold text-sky-400 mt-0.5">
              {existingClubNames.length || 1}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter Pills */}
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              categoryFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            すべて
          </button>
          {CLUB_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                categoryFilter === cat.key
                  ? `${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder}`
                  : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${cat.dotColor}`} />
              {cat.label.split('・')[0]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {existingClubNames.length > 0 && (
            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              className="bg-slate-950 text-xs border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">すべての部活・サークル</option>
              {existingClubNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 md:w-48">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="検索（対戦相手、場所...）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">
            該当する部活・サークルの予定はありません
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            「部活の予定を登録」ボタンから練習日程、試合、遠征、合宿のスケジュールを追加してください。
          </p>
          <button
            onClick={() => openAddModal('practice')}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            最初の予定を追加する
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => {
            const catInfo = getClubCategoryInfo(event.category);
            const isToday = event.date === new Date().toISOString().slice(0, 10);
            const isPast = event.date < new Date().toISOString().slice(0, 10);

            return (
              <div
                key={event.id}
                className={`group relative rounded-xl bg-slate-900/80 border p-4 transition-all duration-200 flex flex-col justify-between hover:border-slate-700 hover:shadow-lg ${
                  isToday
                    ? 'border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'border-slate-800/80'
                } ${isPast ? 'opacity-75' : ''}`}
              >
                <div>
                  {/* Top Category Badge & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${catInfo.badgeBg} ${catInfo.badgeText} ${catInfo.badgeBorder}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${catInfo.dotColor}`} />
                        {catInfo.label}
                      </span>
                      {event.clubName && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {event.clubName}
                        </span>
                      )}
                      {isToday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                          本日
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                      <button
                        onClick={() =>
                          exportSingleEventICS({
                            title: `【${event.clubName || 'サークル'}】${event.title}${event.opponent ? ` vs ${event.opponent}` : ''}`,
                            date: event.date,
                            endDate: event.endDate,
                            startTime: event.startTime,
                            endTime: event.endTime,
                            isAllDay: !!event.isAllDay,
                            location: event.location,
                            memo: event.memo,
                          })
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800"
                        title="端末の純正カレンダーアプリに追加 (.ics)"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                      {onSyncToCalendar && (
                        <button
                          onClick={() => onSyncToCalendar(event)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800"
                          title="全学カレンダーにも同期追加"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(event)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        title="編集"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteEvent(event.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white tracking-tight mb-2">
                    {event.title}
                  </h3>

                  {/* Opponent (for matches) */}
                  {event.opponent && (
                    <div className="mb-2 px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs font-semibold text-rose-300 inline-flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-rose-400" />
                      VS {event.opponent}
                    </div>
                  )}

                  {/* Date & Time info */}
                  <div className="space-y-1 text-xs text-slate-300 mb-3">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        {event.date}
                        {event.endDate && event.endDate !== event.date && ` 〜 ${event.endDate}`}
                      </span>
                    </div>

                    {!event.isAllDay && event.startTime && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>
                          {event.startTime} {event.endTime && `〜 ${event.endTime}`}
                        </span>
                      </div>
                    )}

                    {event.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Memo */}
                  {event.memo && (
                    <p className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 mb-3 line-clamp-2">
                      {event.memo}
                    </p>
                  )}
                </div>

                {/* Footer Attendance Pill */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">出欠ステータス:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        onUpdateEvent({ ...event, attendance: 'attending' })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                        event.attendance === 'attending'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      出席
                    </button>
                    <button
                      onClick={() => onUpdateEvent({ ...event, attendance: 'maybe' })}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                        event.attendance === 'maybe'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      未定
                    </button>
                    <button
                      onClick={() =>
                        onUpdateEvent({ ...event, attendance: 'absent' })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                        event.attendance === 'absent'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      欠席
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Add / Edit Club Event */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingEvent ? '部活・サークル予定の編集' : '部活・サークルの予定を追加'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  イベントタイトル <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 全体練習、秋季公式戦 vs ○○大、夏合宿"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    所属団体・部活名
                  </label>
                  <input
                    type="text"
                    placeholder="例: サッカー部、テニスサークル"
                    value={formClubName}
                    onChange={(e) => setFormClubName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ClubCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {CLUB_CATEGORIES.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Match opponent if match */}
              {formCategory === 'match' && (
                <div>
                  <label className="block text-xs font-medium text-rose-300 mb-1">
                    対戦相手・大学名
                  </label>
                  <input
                    type="text"
                    placeholder="例: 慶應義塾大学、明治大学"
                    value={formOpponent}
                    onChange={(e) => setFormOpponent(e.target.value)}
                    className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    開始日 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    終了日（任意・合宿など）
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Times */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAllDay"
                    checked={formIsAllDay}
                    onChange={(e) => setFormIsAllDay(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="isAllDay" className="text-xs text-slate-300">
                    終日イベント（時間を指定しない）
                  </label>
                </div>

                {!formIsAllDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        開始時刻
                      </label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        終了時刻
                      </label>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  開催場所・グラウンド
                </label>
                <input
                  type="text"
                  placeholder="例: 東伏見グラウンド、戸山体育館、秩父宮ラグビー場"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Memo */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  持ち物・注意事項・詳細メモ
                </label>
                <textarea
                  rows={3}
                  placeholder="例: 白ユニフォーム着用、集合時間16:30厳守、スパイク持参"
                  value={formMemo}
                  onChange={(e) => setFormMemo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                >
                  {editingEvent ? '更新する' : '保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
