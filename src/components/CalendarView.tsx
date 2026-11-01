/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Trash2,
  Edit2,
  CheckCircle2,
  BookOpen,
  Filter,
  Check,
  X,
  AlertCircle,
  FileText,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import {
  CalendarEvent,
  EventCategory,
  EVENT_CATEGORIES,
  getCategoryInfo,
  formatDateToYYYYMMDD,
  buildMonthMatrix,
  CalendarDayCell,
} from '../utils/calendar';
import { ScheduleItem, PeriodTime, DAY_NAMES } from '../utils/calc';
import { TaskItem } from '../App';

interface CalendarViewProps {
  events: CalendarEvent[];
  tasks: TaskItem[];
  schedule: ScheduleItem[];
  periodTimes: PeriodTime[];
  onAddEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onToggleTask?: (id: string) => void;
}

export const COLOR_OPTIONS = [
  { name: 'インディゴ', value: '#6366f1' },
  { name: 'ローズ', value: '#f43f5e' },
  { name: 'アンバー', value: '#f59e0b' },
  { name: 'スカイ', value: '#0ea5e9' },
  { name: 'エメラルド', value: '#10b981' },
  { name: 'パープル', value: '#a855f7' },
  { name: 'フューシャ', value: '#d946ef' },
];

export function CalendarView({
  events,
  tasks,
  schedule,
  periodTimes,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onToggleTask,
}: CalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToYYYYMMDD(today));
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [categoryFilter, setCategoryFilter] = useState<'all' | EventCategory>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(selectedDate);
  const [formStartTime, setFormStartTime] = useState('10:00');
  const [formEndTime, setFormEndTime] = useState('11:30');
  const [formIsAllDay, setFormIsAllDay] = useState(true);
  const [formCategory, setFormCategory] = useState<EventCategory>('exam');
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0].value);
  const [formLocation, setFormLocation] = useState('');
  const [formMemo, setFormMemo] = useState('');

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(formatDateToYYYYMMDD(now));
  };

  // Matrix of days
  const calendarCells = useMemo(() => {
    return buildMonthMatrix(currentYear, currentMonth, false);
  }, [currentYear, currentMonth]);

  // Events map by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [events]);

  // Tasks map by dueDate
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const list = map.get(task.dueDate) || [];
      list.push(task);
      map.set(task.dueDate, list);
    });
    return map;
  }, [tasks]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (categoryFilter === 'all') return events;
    return events.filter((e) => e.category === categoryFilter);
  }, [events, categoryFilter]);

  // Selected date details
  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const selectedDayOfWeek = selectedDateObj.getDay(); // 0 is Sun, 1 is Mon...

  // Classes for selected date day of week
  const selectedDateClasses = useMemo(() => {
    return schedule
      .filter((s) => s.dayOfWeek === selectedDayOfWeek)
      .sort((a, b) => a.period - b.period);
  }, [schedule, selectedDayOfWeek]);

  // Events for selected date
  const selectedDateEvents = useMemo(() => {
    return events
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
  }, [events, selectedDate]);

  // Tasks due on selected date
  const selectedDateTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate === selectedDate);
  }, [tasks, selectedDate]);

  // Open Add Modal
  const openAddModal = (dateStr?: string) => {
    const targetDate = dateStr || selectedDate;
    setEditingEvent(null);
    setFormTitle('');
    setFormDate(targetDate);
    setFormStartTime('10:00');
    setFormEndTime('11:30');
    setFormIsAllDay(true);
    setFormCategory('exam');
    setFormColor(COLOR_OPTIONS[0].value);
    setFormLocation('');
    setFormMemo('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDate(event.date);
    setFormStartTime(event.startTime || '10:00');
    setFormEndTime(event.endTime || '11:30');
    setFormIsAllDay(event.isAllDay);
    setFormCategory(event.category);
    setFormColor(event.color || COLOR_OPTIONS[0].value);
    setFormLocation(event.location || '');
    setFormMemo(event.memo || '');
    setModalOpen(true);
  };

  // Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingEvent) {
      onUpdateEvent({
        ...editingEvent,
        title: formTitle.trim(),
        date: formDate,
        startTime: formIsAllDay ? undefined : formStartTime,
        endTime: formIsAllDay ? undefined : formEndTime,
        isAllDay: formIsAllDay,
        category: formCategory,
        color: formColor,
        location: formLocation.trim() || undefined,
        memo: formMemo.trim() || undefined,
      });
    } else {
      onAddEvent({
        title: formTitle.trim(),
        date: formDate,
        startTime: formIsAllDay ? undefined : formStartTime,
        endTime: formIsAllDay ? undefined : formEndTime,
        isAllDay: formIsAllDay,
        category: formCategory,
        color: formColor,
        location: formLocation.trim() || undefined,
        memo: formMemo.trim() || undefined,
      });
    }

    setModalOpen(false);
  };

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月',
  ];
  const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {currentYear}年 {monthNames[currentMonth]}
              </h2>
              <button
                onClick={handleJumpToToday}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-indigo-300 border border-slate-700 transition-colors"
              >
                今日
              </button>
            </div>
            <p className="text-xs text-slate-400">テスト、課題締切、授業、イベントを統合管理</p>
          </div>
        </div>

        {/* Navigation & View Switcher */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handlePrevMonth}
              aria-label="前月"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2 text-xs font-semibold text-slate-300">
              {currentYear}.{String(currentMonth + 1).padStart(2, '0')}
            </div>
            <button
              onClick={handleNextMonth}
              aria-label="次月"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month / Agenda view toggle */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              月間
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'agenda'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              予定一覧
            </button>
          </div>

          {/* Add Event Button */}
          <button
            onClick={() => openAddModal(selectedDate)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>予定を追加</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-slate-500 flex items-center gap-1 px-1 shrink-0 font-medium text-[11px]">
          <Filter className="w-3 h-3" /> カテゴリ:
        </span>
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
            categoryFilter === 'all'
              ? 'bg-slate-700 text-white border border-slate-600'
              : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          すべて ({events.length})
        </button>
        {EVENT_CATEGORIES.map((cat) => {
          const count = events.filter((e) => e.category === cat.key).length;
          const isSelected = categoryFilter === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 border ${
                isSelected
                  ? `${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder} ring-1 ring-white/10`
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 border-slate-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cat.dotColor}`} />
              <span>{cat.label}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area: Month View or Agenda View */}
      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Calendar Grid (8 cols on lg) */}
          <div className="lg:col-span-8 bg-slate-900/40 rounded-2xl border border-slate-800 p-3 sm:p-5 shadow-xl backdrop-blur-sm">
            {/* Day Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {dayHeaders.map((header, idx) => (
                <div
                  key={header}
                  className={`text-xs font-bold py-2 ${
                    idx === 0
                      ? 'text-rose-400'
                      : idx === 6
                      ? 'text-sky-400'
                      : 'text-slate-400'
                  }`}
                >
                  {header}
                </div>
              ))}
            </div>

            {/* Date Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarCells.map((cell) => {
                const isSelected = cell.dateString === selectedDate;
                const dayEvents = eventsByDate.get(cell.dateString) || [];
                const dayTasks = tasksByDate.get(cell.dateString) || [];
                const hasExam = dayEvents.some((e) => e.category === 'exam');

                return (
                  <div
                    key={cell.dateString}
                    onClick={() => setSelectedDate(cell.dateString)}
                    onDoubleClick={() => openAddModal(cell.dateString)}
                    className={`min-h-[78px] sm:min-h-[96px] p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                        : cell.isCurrentMonth
                        ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                        : 'bg-slate-950/20 border-slate-900/50 opacity-40 hover:opacity-75'
                    }`}
                  >
                    {/* Top Row: Date Number & Badges */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                          cell.isToday
                            ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/50'
                            : cell.dayOfWeek === 0
                            ? 'text-rose-400'
                            : cell.dayOfWeek === 6
                            ? 'text-sky-400'
                            : cell.isCurrentMonth
                            ? 'text-slate-200'
                            : 'text-slate-500'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {/* Small Quick indicators */}
                      <div className="flex items-center gap-0.5">
                        {hasExam && (
                          <span
                            title="テストあり"
                            className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                          />
                        )}
                        {dayTasks.length > 0 && (
                          <span
                            title={`課題期限: ${dayTasks.length}件`}
                            className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          >
                            {dayTasks.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Event Chips (Up to 2 items) */}
                    <div className="space-y-0.5 my-1 overflow-hidden flex-1">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const cat = getCategoryInfo(ev.category);
                        return (
                          <div
                            key={ev.id}
                            className={`text-[9px] sm:text-[10px] truncate px-1 py-0.5 rounded font-medium flex items-center gap-1 ${cat.badgeBg} ${cat.badgeText} border ${cat.badgeBorder}`}
                            title={`${ev.title} (${cat.label})`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: ev.color || '#6366f1' }}
                            />
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-slate-400 font-medium pl-1">
                          +{dayEvents.length - 2}件
                        </div>
                      )}
                    </div>

                    {/* Hover Add Button (Desktop) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddModal(cell.dateString);
                      }}
                      className="opacity-0 group-hover:opacity-100 absolute bottom-1 right-1 p-1 rounded-md bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all shadow-sm"
                      title="この日に予定を追加"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Detail Panel (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 shadow-xl backdrop-blur-sm space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                    Day Details
                  </span>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedDate} ({DAY_NAMES[selectedDayOfWeek]}曜日)
                    {selectedDate === formatDateToYYYYMMDD(today) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
                        本日
                      </span>
                    )}
                  </h3>
                </div>
                <button
                  onClick={() => openAddModal(selectedDate)}
                  className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-all active:scale-95"
                  title="この日に予定を追加"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Schedule / Classes on this day */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                    この曜日の時間割 ({selectedDateClasses.length}コマ)
                  </h4>
                </div>
                {selectedDateClasses.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2.5 rounded-xl bg-slate-950/40 border border-slate-900 text-center">
                    この曜日の講義登録はありません
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedDateClasses.map((item) => {
                      const periodTime = periodTimes.find((p) => p.period === item.period);
                      return (
                        <div
                          key={item.id}
                          className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-400 w-8">{item.period}限</span>
                            <div>
                              <div className="font-semibold text-slate-200">{item.subject}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                {item.room && <span>📍 {item.room}</span>}
                                {item.teacher && <span>👤 {item.teacher}</span>}
                              </div>
                            </div>
                          </div>
                          {periodTime && (
                            <span className="text-[10px] font-mono text-slate-500">
                              {periodTime.start}〜{periodTime.end}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Tasks Due on this day */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    この日が提出期限の課題 ({selectedDateTasks.length}件)
                  </h4>
                </div>
                {selectedDateTasks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2.5 rounded-xl bg-slate-950/40 border border-slate-900 text-center">
                    期限の課題はありません
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedDateTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          task.completed
                            ? 'bg-slate-950/40 border-slate-900 text-slate-500'
                            : 'bg-amber-950/10 border-amber-500/30 text-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {onToggleTask && (
                            <button
                              onClick={() => onToggleTask(task.id)}
                              className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                task.completed
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-600 hover:border-amber-400'
                              }`}
                            >
                              {task.completed && <Check className="w-3 h-3" />}
                            </button>
                          )}
                          <div className="min-w-0">
                            <div className={`font-semibold truncate ${task.completed ? 'line-through' : ''}`}>
                              {task.title}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {task.subject} {task.dueTime && `(${task.dueTime}まで)`}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            task.priority === 'high'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {task.priority === 'high' ? '高優先' : '通常'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Events on this day */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                    この日の予定 ({selectedDateEvents.length}件)
                  </h4>
                </div>
                {selectedDateEvents.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 text-center space-y-2">
                    <p className="text-xs text-slate-500">登録された予定はありません</p>
                    <button
                      onClick={() => openAddModal(selectedDate)}
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> 予定を追加する
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedDateEvents.map((ev) => {
                      const cat = getCategoryInfo(ev.category);
                      return (
                        <div
                          key={ev.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: ev.color || '#6366f1' }}
                              />
                              <span className="font-bold text-slate-100 text-xs">{ev.title}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${cat.badgeBg} ${cat.badgeText} border ${cat.badgeBorder}`}
                              >
                                {cat.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEditModal(ev)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-900"
                                title="編集"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteEvent(ev.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-900"
                                title="削除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Time & Location */}
                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {ev.isAllDay ? '終日' : `${ev.startTime || ''} 〜 ${ev.endTime || ''}`}
                            </span>
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {ev.location}
                              </span>
                            )}
                          </div>

                          {ev.memo && (
                            <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-900 whitespace-pre-wrap">
                              {ev.memo}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Agenda View (List of upcoming events) */
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                登録された予定一覧 ({filteredEvents.length}件)
              </h3>
              <p className="text-xs text-slate-400">日付順のアジェンダリスト</p>
            </div>
            <button
              onClick={() => openAddModal()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-3.5 h-3.5" /> 予定を追加
            </button>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <CalendarDays className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">予定がまだ登録されていません</p>
              <button
                onClick={() => openAddModal()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md"
              >
                最初の予定を追加する
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((ev) => {
                  const cat = getCategoryInfo(ev.category);
                  const isPast = ev.date < formatDateToYYYYMMDD(today);
                  const isCurrentDay = ev.date === formatDateToYYYYMMDD(today);
                  return (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                        isCurrentDay
                          ? 'bg-indigo-950/20 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                          : isPast
                          ? 'bg-slate-950/40 border-slate-900 opacity-60'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="text-center min-w-[56px] p-2 rounded-lg bg-slate-900 border border-slate-800">
                          <div className="text-[10px] text-slate-400 font-mono">
                            {ev.date.slice(5, 7)}月
                          </div>
                          <div className="text-base font-bold text-slate-100 font-mono">
                            {ev.date.slice(8, 10)}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: ev.color || '#6366f1' }}
                            />
                            <span className="font-bold text-sm text-white">{ev.title}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${cat.badgeBg} ${cat.badgeText} border ${cat.badgeBorder}`}
                            >
                              {cat.label}
                            </span>
                            {isCurrentDay && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                                今日
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {ev.isAllDay ? '終日' : `${ev.startTime || ''} 〜 ${ev.endTime || ''}`}
                            </span>
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {ev.location}
                              </span>
                            )}
                            {ev.memo && (
                              <span className="text-slate-400 truncate max-w-xs">
                                💬 {ev.memo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 self-end sm:self-center">
                        <button
                          onClick={() => openEditModal(ev)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                          title="編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteEvent(ev.id)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                {editingEvent ? '予定の編集' : '新規予定の追加'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Title */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  タイトル <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 中間テスト、レポート提出、サークル新歓"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Date & All Day */}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    日付 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id="allDayCheckbox"
                    checked={formIsAllDay}
                    onChange={(e) => setFormIsAllDay(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="allDayCheckbox" className="text-slate-300 font-semibold cursor-pointer">
                    終日の予定
                  </label>
                </div>
              </div>

              {/* Times (if not all day) */}
              {!formIsAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">開始時刻</label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">終了時刻</label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">カテゴリ</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {EVENT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setFormCategory(cat.key)}
                      className={`p-2 rounded-xl border flex items-center gap-1.5 transition-all text-[11px] ${
                        formCategory === cat.key
                          ? `${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder} ring-1 ring-white/10 font-bold`
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${cat.dotColor}`} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Label */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">カラーラベル</label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormColor(c.value)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        formColor === c.value ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">場所・教室</label>
                <input
                  type="text"
                  placeholder="例: 14号館 201教室、Zoom"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Memo */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">メモ・備考</label>
                <textarea
                  rows={2}
                  placeholder="持ち物、範囲、URLなど"
                  value={formMemo}
                  onChange={(e) => setFormMemo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-md shadow-indigo-600/30"
                >
                  {editingEvent ? '更新する' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
