/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  CheckSquare,
  Calculator,
  Bookmark,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Download,
  Upload,
  Smartphone,
  Search,
  Sliders,
  Sparkles,
  RefreshCw,
  Award,
  Link as LinkIcon,
  ChevronRight,
  Pin,
  TrendingUp,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import {
  ScheduleItem,
  PeriodTime,
  DEFAULT_PERIOD_TIMES,
  DAY_NAMES,
  getNextClassCountdown,
  getTaskUrgency,
  calculateRequiredScore,
  calculateWeightedFinalScore,
  WeightedExamItem,
} from './utils/calc';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';

export interface TaskItem {
  id: string;
  title: string;
  subject: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: 'high' | 'medium' | 'low';
  memo?: string;
  completed: boolean;
  createdAt: string;
}

export interface QuickLinkItem {
  id: string;
  title: string;
  url: string;
  category: string;
}

export interface QuickMemoItem {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  updatedAt: string;
}

export interface SavedSimulation {
  id: string;
  title: string;
  type: 'average' | 'weighted';
  data: any;
  createdAt: string;
}

const COLOR_PALETTES = [
  { id: 'indigo', name: 'インディゴ', bg: 'bg-indigo-500/15', border: 'border-indigo-500/40', text: 'text-indigo-400', badge: 'bg-indigo-500' },
  { id: 'emerald', name: 'エメラルド', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-400', badge: 'bg-emerald-500' },
  { id: 'amber', name: 'アンバー', bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400', badge: 'bg-amber-500' },
  { id: 'rose', name: 'ローズ', bg: 'bg-rose-500/15', border: 'border-rose-500/40', text: 'text-rose-400', badge: 'bg-rose-500' },
  { id: 'violet', name: 'バイオレット', bg: 'bg-violet-500/15', border: 'border-violet-500/40', text: 'text-violet-400', badge: 'bg-violet-500' },
  { id: 'cyan', name: 'シアン', bg: 'bg-cyan-500/15', border: 'border-cyan-500/40', text: 'text-cyan-400', badge: 'bg-cyan-500' },
  { id: 'sky', name: 'スカイ', bg: 'bg-sky-500/15', border: 'border-sky-500/40', text: 'text-sky-400', badge: 'bg-sky-500' },
];

const STORAGE_KEYS = {
  SCHEDULE: 'campushack_schedule_v1',
  PERIODS: 'campushack_period_times_v1',
  TASKS: 'campushack_tasks_v1',
  LINKS: 'campushack_links_v1',
  MEMOS: 'campushack_memos_v1',
  SIMULATIONS: 'campushack_simulations_v1',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'tasks' | 'simulator' | 'memos'>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Firebase Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // In-app Toast state
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // State Management (All initialized empty per instructions)
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PERIODS);
      return saved ? JSON.parse(saved) : DEFAULT_PERIOD_TIMES;
    } catch {
      return DEFAULT_PERIOD_TIMES;
    }
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [links, setLinks] = useState<QuickLinkItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LINKS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [memos, setMemos] = useState<QuickMemoItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEMOS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SIMULATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // LocalStorage sync
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(periodTimes));
  }, [periodTimes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(links));
  }, [links]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMOS, JSON.stringify(memos));
  }, [memos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIMULATIONS, JSON.stringify(savedSimulations));
  }, [savedSimulations]);

  // Firebase Auth listener and connection validation
  useEffect(() => {
    testFirestoreConnection();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        showToast(`${user.displayName || user.email} としてログインしました`, 'info');
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore sync when user is authenticated
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    // Save/update user profile doc
    const userDocRef = doc(db, 'users', uid);
    setDoc(
      userDocRef,
      {
        uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || '',
        photoURL: currentUser.photoURL || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch((err) => handleFirestoreError(err, OperationType.WRITE, `users/${uid}`));

    // Listen to Schedules
    const schedulesPath = `users/${uid}/schedules`;
    const unsubSchedule = onSnapshot(
      collection(db, 'users', uid, 'schedules'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as ScheduleItem);
        if (items.length > 0) setSchedule(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, schedulesPath)
    );

    // Listen to Tasks
    const tasksPath = `users/${uid}/tasks`;
    const unsubTasks = onSnapshot(
      collection(db, 'users', uid, 'tasks'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as TaskItem);
        if (items.length > 0) setTasks(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, tasksPath)
    );

    // Listen to Links
    const linksPath = `users/${uid}/links`;
    const unsubLinks = onSnapshot(
      collection(db, 'users', uid, 'links'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as QuickLinkItem);
        if (items.length > 0) setLinks(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, linksPath)
    );

    // Listen to Memos
    const memosPath = `users/${uid}/memos`;
    const unsubMemos = onSnapshot(
      collection(db, 'users', uid, 'memos'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as QuickMemoItem);
        if (items.length > 0) setMemos(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, memosPath)
    );

    // Listen to Simulations
    const simsPath = `users/${uid}/simulations`;
    const unsubSims = onSnapshot(
      collection(db, 'users', uid, 'simulations'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as SavedSimulation);
        if (items.length > 0) setSavedSimulations(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, simsPath)
    );

    // Listen to Settings
    const settingsPath = `users/${uid}/settings/periodTimes`;
    const unsubSettings = onSnapshot(
      doc(db, 'users', uid, 'settings', 'periodTimes'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.periodTimes) setPeriodTimes(data.periodTimes);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, settingsPath)
    );

    return () => {
      unsubSchedule();
      unsubTasks();
      unsubLinks();
      unsubMemos();
      unsubSims();
      unsubSettings();
    };
  }, [currentUser]);

  // Firestore Sync Helper for operations
  const syncToFirestore = async (
    collectionName: string,
    id: string,
    data: any,
    isDelete = false
  ) => {
    if (!currentUser) return;
    const path = `users/${currentUser.uid}/${collectionName}/${id}`;
    try {
      const docRef = doc(db, 'users', currentUser.uid, collectionName, id);
      if (isDelete) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { ...data, userId: currentUser.uid }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        isDelete ? OperationType.DELETE : OperationType.WRITE,
        path
      );
    }
  };

  // Login & Logout
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Googleアカウントと連携しました！', 'success');
    } catch (err: any) {
      showToast(`ログインエラー: ${err.message || '認証に失敗しました'}`, 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showToast('ログアウトしました');
    } catch (err: any) {
      showToast('ログアウトに失敗しました', 'error');
    }
  };

  // Real-time clock interval
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Online / Offline Status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // PWA install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        showToast('インストールを受け付けました！');
      }
    } else {
      setShowIOSModal(true);
    }
  };

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ day: number; period: number } | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<QuickMemoItem | null>(null);

  const [periodConfigModalOpen, setPeriodConfigModalOpen] = useState(false);
  const [dataManagementModalOpen, setDataManagementModalOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Countdown computation
  const countdown = useMemo(() => {
    return getNextClassCountdown(schedule, periodTimes, currentTime);
  }, [schedule, periodTimes, currentTime]);

  // Tasks Filter & Sort State
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'high'>('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskSort, setTaskSort] = useState<'dueDate' | 'priority' | 'created'>('dueDate');

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (taskSearch.trim()) {
      const q = taskSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          (t.memo && t.memo.toLowerCase().includes(q))
      );
    }

    if (taskFilter === 'pending') {
      result = result.filter((t) => !t.completed);
    } else if (taskFilter === 'completed') {
      result = result.filter((t) => t.completed);
    } else if (taskFilter === 'high') {
      result = result.filter((t) => t.priority === 'high' && !t.completed);
    }

    result.sort((a, b) => {
      if (taskSort === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      } else if (taskSort === 'priority') {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [tasks, taskFilter, taskSearch, taskSort]);

  const pendingCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);

  // Simulator State
  const [simMode, setSimMode] = useState<'average' | 'weighted'>('average');
  const [avgSubjectName, setAvgSubjectName] = useState('');
  const [targetAverage, setTargetAverage] = useState<number>(80);
  const [totalExamCount, setTotalExamCount] = useState<number>(3);
  const [currentExamScores, setCurrentExamScores] = useState<number[]>([]);
  const [newScoreInput, setNewScoreInput] = useState<string>('');

  // Weighted mode
  const [weightedTarget, setWeightedTarget] = useState<number>(80);
  const [finalWeight, setFinalWeight] = useState<number>(40);
  const [weightedItems, setWeightedItems] = useState<WeightedExamItem[]>([]);
  const [newWeightName, setNewWeightName] = useState('');
  const [newWeightScore, setNewWeightScore] = useState('');
  const [newWeightPercent, setNewWeightPercent] = useState('');

  const averageResult = useMemo(() => {
    return calculateRequiredScore(currentExamScores, targetAverage, totalExamCount);
  }, [currentExamScores, targetAverage, totalExamCount]);

  const weightedResult = useMemo(() => {
    return calculateWeightedFinalScore(weightedItems, weightedTarget, finalWeight);
  }, [weightedItems, weightedTarget, finalWeight]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup & Restore
  const handleExportData = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      schedule,
      periodTimes,
      tasks,
      links,
      memos,
      savedSimulations,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wasedashboard_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('バックアップJSONを出力しました');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.schedule) setSchedule(parsed.schedule);
        if (parsed.periodTimes) setPeriodTimes(parsed.periodTimes);
        if (parsed.tasks) setTasks(parsed.tasks);
        if (parsed.links) setLinks(parsed.links);
        if (parsed.memos) setMemos(parsed.memos);
        if (parsed.savedSimulations) setSavedSimulations(parsed.savedSimulations);
        showToast('データを正常に復元しました！', 'success');
        setDataManagementModalOpen(false);
      } catch {
        showToast('ファイルの読み込みに失敗しました', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    setSchedule([]);
    setTasks([]);
    setLinks([]);
    setMemos([]);
    setSavedSimulations([]);
    setPeriodTimes(DEFAULT_PERIOD_TIMES);
    localStorage.clear();
    setConfirmResetOpen(false);
    setDataManagementModalOpen(false);
    showToast('すべてのデータを初期化しました', 'info');
  };

  const subjectList = useMemo(() => {
    const s = new Set<string>();
    schedule.forEach((item) => {
      if (item.subject.trim()) s.add(item.subject.trim());
    });
    return Array.from(s);
  }, [schedule]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold border ${
              toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
                : toast.type === 'info'
                ? 'bg-slate-900/90 text-slate-200 border-slate-700'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400/30">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                wasedashboard
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PWA
              </span>
              {currentUser && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Cloud className="w-3 h-3 animate-pulse" />
                  クラウド同期中
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">オールインワン学生ダッシュボード</p>
          </div>
        </div>

        {/* Center / Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 shadow-inner">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            ホーム
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'schedule'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            時間割
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            課題・ToDo
            {pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center -ml-0.5">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            目標点逆算
          </button>
          <button
            onClick={() => setActiveTab('memos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'memos'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            リンク・メモ
          </button>
        </nav>

        {/* Right Action Tools & Auth Button */}
        <div className="flex items-center gap-2">
          {!authLoading && (
            <>
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="User"
                        className="w-5 h-5 rounded-full"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="hidden sm:inline max-w-[100px] truncate text-slate-300 font-medium">
                      {currentUser.displayName || currentUser.email}
                    </span>
                    <button
                      onClick={handleSignOut}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                      title="ログアウト"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-all"
                  title="Googleアカウントでクラウド同期"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Googleログイン</span>
                </button>
              )}
            </>
          )}

          {!isStandalone && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition-all shadow-sm"
              title="アプリをホーム画面にインストール"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PWAインストール</span>
            </button>
          )}

          <button
            onClick={() => setDataManagementModalOpen(true)}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all"
            title="データ管理・バックアップ"
            aria-label="データ管理"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" />
          <span>オフラインモードで動作中です（ローカルデータを使用中）</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: DASHBOARD (HOME) */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Intelligent Timer & Greeting Card */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800/80 p-5 sm:p-7 shadow-xl shadow-black/40">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      リアルタイム連携中
                    </span>
                    <span className="text-xs text-slate-400">
                      {currentTime.toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    インテリジェント時間割タイマー
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    現在の講義状況や次の授業までの残り時間を秒単位でスマートに算出します
                  </p>
                </div>

                {/* Digital Clock Display */}
                <div className="flex items-baseline gap-2 bg-slate-950/70 border border-slate-800/80 px-4 py-3 rounded-2xl shadow-inner">
                  <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-indigo-400">
                    {currentTime.toLocaleTimeString('ja-JP', { hour12: false })}
                  </span>
                </div>
              </div>

              {/* Status / Countdown Banner */}
              <div className="mt-6 pt-6 border-t border-slate-800/60">
                {countdown.status === 'empty' ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">時間割がまだ登録されていません</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          時間割を追加すると、次の授業までのリアルタイムカウントダウンが自動起動します
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingSchedule(null);
                        setSelectedCell({ day: 1, period: 1 });
                        setScheduleModalOpen(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      科目・時間割を登録
                    </button>
                  </div>
                ) : countdown.status === 'ongoing' ? (
                  <div className="p-4 sm:p-5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                          <BookOpen className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            現在受講中 ({countdown.currentClass?.period}限)
                          </span>
                          <h3 className="text-xl font-bold text-white mt-1">
                            {countdown.currentClass?.subject}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                            {countdown.currentClass?.room && <span>📍 {countdown.currentClass.room}</span>}
                            {countdown.currentClass?.teacher && <span>👤 {countdown.currentClass.teacher}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-medium text-emerald-400">講義終了まであと</p>
                        <div className="text-3xl font-mono font-black text-white">
                          {countdown.minutesRemaining}
                          <span className="text-sm font-normal text-slate-400 mx-1">分</span>
                          {countdown.secondsRemaining}
                          <span className="text-sm font-normal text-slate-400 ml-1">秒</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-1000 ease-linear"
                          style={{ width: `${countdown.percentage || 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                        <span>進捗率: {countdown.percentage}%</span>
                        <span>集中していきましょう！</span>
                      </div>
                    </div>
                  </div>
                ) : countdown.status === 'upcoming_today' ? (
                  <div className="p-4 sm:p-5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          本日の次の授業 ({countdown.nextClass?.period}限)
                        </span>
                        <h3 className="text-xl font-bold text-white mt-1">
                          {countdown.nextClass?.subject}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                          {countdown.nextClass?.room && <span>📍 {countdown.nextClass.room}</span>}
                          {countdown.nextClass?.teacher && <span>👤 {countdown.nextClass.teacher}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-indigo-300">開始まであと</p>
                      <div className="text-3xl font-mono font-black text-white">
                        {countdown.minutesRemaining}
                        <span className="text-sm font-normal text-slate-400 mx-1">分</span>
                        {countdown.secondsRemaining}
                        <span className="text-sm font-normal text-slate-400 ml-1">秒</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400">
                        <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">
                          {countdown.status === 'upcoming_future'
                            ? countdown.label
                            : '本日の授業はすべて終了しました'}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          課題のチェックや明日の準備をしてリラックスしましょう
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('schedule')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      時間割一覧へ <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Quick Overview Grid: Tasks summary, Quick simulator snippet, Quick Links */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 1: Urgent Tasks / Assignments */}
              <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-rose-400" />
                      <h3 className="text-sm font-bold text-white">直近の課題・タスク</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                    >
                      すべて見る ({pendingCount})
                    </button>
                  </div>

                  {tasks.filter((t) => !t.completed).length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-10 h-10 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500 mb-2">
                        <Check className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-slate-400">未完了の課題はありません</p>
                      <button
                        onClick={() => {
                          setEditingTask(null);
                          setTaskModalOpen(true);
                        }}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-all"
                      >
                        + 新しい課題を登録
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {tasks
                        .filter((t) => !t.completed)
                        .slice(0, 3)
                        .map((task) => {
                          const urg = getTaskUrgency(task.dueDate, currentTime);
                          return (
                            <div
                              key={task.id}
                              className="group p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-slate-700 flex items-center justify-between gap-3 transition-all"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  onClick={() => {
                                    const updatedCompleted = !task.completed;
                                    setTasks(
                                      tasks.map((t) =>
                                        t.id === task.id ? { ...t, completed: updatedCompleted } : t
                                      )
                                    );
                                    syncToFirestore('tasks', task.id, {
                                      ...task,
                                      completed: updatedCompleted,
                                    });
                                    showToast(
                                      updatedCompleted ? '課題を完了にしました！' : '課題を未完了に戻しました'
                                    );
                                  }}
                                  className="w-5 h-5 rounded-md border border-slate-600 hover:border-indigo-400 flex items-center justify-center text-transparent hover:text-indigo-400 shrink-0 transition-colors"
                                  title="完了にする"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-slate-200 truncate">
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                    <span>{task.subject}</span>
                                    {task.dueTime && <span>· {task.dueTime}</span>}
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  urg.level === 'overdue'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                                    : urg.level === 'critical'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : urg.level === 'warning'
                                    ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {urg.badgeText}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setEditingTask(null);
                    setTaskModalOpen(true);
                  }}
                  className="mt-4 w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-700/50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  課題を追加
                </button>
              </div>

              {/* Card 2: Quick Grade Target Simulator */}
              <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-sm font-bold text-white">目標点逆算シミュレーター</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('simulator')}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      詳細ツールへ
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mb-4">
                    次のテストで何点取れば目標平均点や単位基準を突破できるかを即時判定します。
                  </p>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">シミュレーション目標平均:</span>
                      <span className="font-bold text-indigo-300">{targetAverage} 点</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">現在登録済みの過去点:</span>
                      <span className="text-slate-200">
                        {currentExamScores.length > 0
                          ? `${currentExamScores.join('点, ')}点`
                          : '未登録'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex justify-between items-baseline">
                      <span className="text-xs text-slate-300 font-medium">次回必要な目安:</span>
                      <span
                        className={`text-lg font-bold font-mono ${
                          averageResult.isFeasible ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {averageResult.requiredScore} 点
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('simulator')}
                  className="mt-4 w-full py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  逆算シミュレーションを行う
                </button>
              </div>

              {/* Card 3: Quick Links & Campus Portal */}
              <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-sky-400" />
                      <h3 className="text-sm font-bold text-white">クイックリンク集</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('memos')}
                      className="text-xs text-slate-400 hover:text-sky-400 transition-colors"
                    >
                      すべて見る ({links.length})
                    </button>
                  </div>

                  {links.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-10 h-10 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500 mb-2">
                        <LinkIcon className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-slate-400">よく使うリンクが未登録です</p>
                      <p className="text-[11px] text-slate-500 mt-1">大学ポータルやClassroomを即開けます</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {links.slice(0, 4).map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-sky-500/40 hover:bg-slate-900 flex items-center justify-between gap-1 text-xs text-slate-200 transition-all group"
                        >
                          <span className="truncate font-medium group-hover:text-sky-300">
                            {link.title}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setLinkModalOpen(true);
                  }}
                  className="mt-4 w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-700/50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  リンクを追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: INTELLIGENT TIMETABLE (時間割) */}
        {/* ========================================================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-indigo-400" />
                  週間スマート時間割
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  講義の教室、教員、メモを管理。空いているコマをクリックして即座に追加できます
                </p>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <button
                  onClick={() => setPeriodConfigModalOpen(true)}
                  className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 transition-all flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  時限時刻の設定
                </button>
                <button
                  onClick={() => {
                    setEditingSchedule(null);
                    setSelectedCell({ day: 1, period: 1 });
                    setScheduleModalOpen(true);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  講義を追加
                </button>
              </div>
            </div>

            {/* Timetable Table Grid */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/80">
                    <th className="py-3 px-3 text-center text-xs font-semibold text-slate-400 w-24">
                      時限 / 曜日
                    </th>
                    {[1, 2, 3, 4, 5, 6].map((dayNum) => (
                      <th
                        key={dayNum}
                        className={`py-3 px-3 text-center text-xs font-bold ${
                          currentTime.getDay() === dayNum
                            ? 'text-indigo-400 bg-indigo-500/10'
                            : 'text-slate-300'
                        }`}
                      >
                        {DAY_NAMES[dayNum]}
                        {currentTime.getDay() === dayNum && (
                          <span className="block text-[10px] font-normal text-indigo-400">今日</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {periodTimes.map((periodObj) => (
                    <tr key={periodObj.period} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-2 text-center bg-slate-950/40 border-r border-slate-800/60">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-xs font-bold text-slate-200">
                          {periodObj.period} 限
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">
                          {periodObj.start}
                          <br />~ {periodObj.end}
                        </div>
                      </td>

                      {[1, 2, 3, 4, 5, 6].map((dayNum) => {
                        const cellItem = schedule.find(
                          (s) => s.dayOfWeek === dayNum && s.period === periodObj.period
                        );
                        const palette = COLOR_PALETTES.find((p) => p.id === cellItem?.color) || COLOR_PALETTES[0];

                        return (
                          <td
                            key={dayNum}
                            className={`p-2 align-top h-28 border-r border-slate-800/40 last:border-r-0 transition-colors ${
                              currentTime.getDay() === dayNum ? 'bg-indigo-950/10' : ''
                            }`}
                          >
                            {cellItem ? (
                              <div
                                onClick={() => {
                                  setEditingSchedule(cellItem);
                                  setSelectedCell({ day: dayNum, period: periodObj.period });
                                  setScheduleModalOpen(true);
                                }}
                                className={`h-full p-2.5 rounded-xl ${palette.bg} ${palette.border} border hover:scale-[1.02] cursor-pointer transition-all flex flex-col justify-between group shadow-sm`}
                              >
                                <div>
                                  <h4 className="font-bold text-xs text-white group-hover:text-indigo-200 line-clamp-2">
                                    {cellItem.subject}
                                  </h4>
                                  {cellItem.room && (
                                    <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                                      <span>📍</span>
                                      <span className="truncate">{cellItem.room}</span>
                                    </p>
                                  )}
                                  {cellItem.teacher && (
                                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                      👤 {cellItem.teacher}
                                    </p>
                                  )}
                                </div>

                                {cellItem.memo && (
                                  <p className="text-[10px] text-slate-400 truncate mt-1 italic opacity-80">
                                    "{cellItem.memo}"
                                  </p>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingSchedule(null);
                                  setSelectedCell({ day: dayNum, period: periodObj.period });
                                  setScheduleModalOpen(true);
                                }}
                                className="w-full h-full rounded-xl border border-dashed border-slate-800/70 hover:border-indigo-500/50 hover:bg-indigo-500/5 flex flex-col items-center justify-center text-slate-600 hover:text-indigo-400 transition-all group"
                                title="クリックして講義を登録"
                              >
                                <Plus className="w-4 h-4 transition-transform group-hover:scale-110" />
                                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                  追加
                                </span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                ヒント: 登録した科目は「課題・ToDo」の科目タグとして自動でサジェストされます。また、時限の開始・終了時刻に合わせてダッシュボード上で正確にカウントダウンされます。
              </span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SMART TASK & ASSIGNMENTS (課題・ToDo) */}
        {/* ========================================================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-6 h-6 text-rose-400" />
                  スマート課題 & タスク管理
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  期限日、優先度、科目タグで整理。直近の提出期限は自動でハイライトされます
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingTask(null);
                  setTaskModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                課題を追加
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                {(['all', 'pending', 'high', 'completed'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setTaskFilter(filterKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      taskFilter === filterKey
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {filterKey === 'all' && `すべて (${tasks.length})`}
                    {filterKey === 'pending' && `進行中 (${pendingCount})`}
                    {filterKey === 'high' && `優先度：高 (${tasks.filter((t) => t.priority === 'high' && !t.completed).length})`}
                    {filterKey === 'completed' && `完了済み (${tasks.filter((t) => t.completed).length})`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="課題・科目名で検索..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <select
                  value={taskSort}
                  onChange={(e) => setTaskSort(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="dueDate">期限が近い順</option>
                  <option value="priority">優先度順</option>
                  <option value="created">登録順</option>
                </select>
              </div>
            </div>

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800/80 p-12 text-center bg-slate-900/30">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500 mb-3">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-300">表示できる課題はありません</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {taskSearch
                    ? '検索条件に一致する課題がありませんでした'
                    : 'レポートや提出物、テスト勉強などのToDoを登録しましょう'}
                </p>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setTaskModalOpen(true);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  最初の課題を登録
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTasks.map((task) => {
                  const urg = getTaskUrgency(task.dueDate, currentTime);
                  return (
                    <div
                      key={task.id}
                      className={`group p-4 rounded-2xl border transition-all ${
                        task.completed
                          ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                          : urg.level === 'overdue'
                          ? 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-950/40'
                          : urg.level === 'critical'
                          ? 'bg-amber-950/20 border-amber-500/40 shadow-sm shadow-amber-950/40'
                          : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button
                            onClick={() => {
                              const updatedCompleted = !task.completed;
                              setTasks(
                                tasks.map((t) =>
                                  t.id === task.id ? { ...t, completed: updatedCompleted } : t
                                )
                              );
                              syncToFirestore('tasks', task.id, {
                                ...task,
                                completed: updatedCompleted,
                              });
                              showToast(
                                updatedCompleted ? '課題を完了にしました！' : '課題を未完了に戻しました'
                              );
                            }}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center mt-0.5 shrink-0 transition-all ${
                              task.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                : 'border-slate-600 hover:border-indigo-400 text-transparent hover:text-indigo-400 bg-slate-950/50'
                            }`}
                            title={task.completed ? '未完了に戻す' : '完了にする'}
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  task.priority === 'high'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : task.priority === 'medium'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                                }`}
                              >
                                {task.priority === 'high' ? '優先度: 高' : task.priority === 'medium' ? '優先度: 中' : '優先度: 低'}
                              </span>

                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                {task.subject}
                              </span>
                            </div>

                            <h3
                              className={`text-sm font-bold mt-2 break-words ${
                                task.completed ? 'line-through text-slate-500' : 'text-white'
                              }`}
                            >
                              {task.title}
                            </h3>

                            {task.memo && (
                              <p className="text-xs text-slate-400 mt-1 break-words line-clamp-2">
                                {task.memo}
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-800/60 text-xs">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-slate-300">
                                期限: {task.dueDate || '指定なし'}
                                {task.dueTime ? ` ${task.dueTime}` : ''}
                              </span>

                              {!task.completed && task.dueDate && (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${
                                    urg.level === 'overdue'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : urg.level === 'critical'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : urg.level === 'warning'
                                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {urg.badgeText}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setTaskModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="編集"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setTasks(tasks.filter((t) => t.id !== task.id));
                              syncToFirestore('tasks', task.id, null, true);
                              showToast('課題を削除しました');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: TEST SCORE BACKWARD SIMULATOR (目標点数・逆算シミュレーター) */}
        {/* ========================================================= */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-indigo-400" />
                  テスト目標点数・逆算シミュレーター
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  目標平均点や期末試験の目標成績から、次のテストで何点取る必要があるかを科学的に逆算します
                </p>
              </div>

              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  onClick={() => setSimMode('average')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    simMode === 'average'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  平均点・回数逆算
                </button>
                <button
                  onClick={() => setSimMode('weighted')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    simMode === 'weighted'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  配点ウェイト逆算
                </button>
              </div>
            </div>

            {/* Mode A: Average Target Calculator */}
            {simMode === 'average' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 space-y-4 shadow-xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    条件設定
                  </h3>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      科目名（任意）
                    </label>
                    <input
                      type="text"
                      value={avgSubjectName}
                      onChange={(e) => setAvgSubjectName(e.target.value)}
                      placeholder="例: 微積分学, 英語コミュニケーション"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        目標平均点 (点)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={targetAverage}
                        onChange={(e) => setTargetAverage(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        全テスト回数 (回)
                      </label>
                      <input
                        type="number"
                        min={Math.max(1, currentExamScores.length + 1)}
                        max="20"
                        value={totalExamCount}
                        onChange={(e) => setTotalExamCount(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      実施済みのテスト点数を追加
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newScoreInput}
                        onChange={(e) => setNewScoreInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newScoreInput) {
                            const val = Number(newScoreInput);
                            if (val >= 0 && val <= 100) {
                              setCurrentExamScores([...currentExamScores, val]);
                              setNewScoreInput('');
                              if (currentExamScores.length + 1 >= totalExamCount) {
                                setTotalExamCount(currentExamScores.length + 2);
                              }
                            }
                          }
                        }}
                        placeholder="点数 (0〜100)"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Number(newScoreInput);
                          if (!isNaN(val) && val >= 0 && val <= 100 && newScoreInput.trim()) {
                            setCurrentExamScores([...currentExamScores, val]);
                            setNewScoreInput('');
                            if (currentExamScores.length + 1 >= totalExamCount) {
                              setTotalExamCount(currentExamScores.length + 2);
                            }
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
                      >
                        追加
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {currentExamScores.map((score, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700"
                        >
                          第{idx + 1}回: {score}点
                          <button
                            onClick={() => {
                              setCurrentExamScores(currentExamScores.filter((_, i) => i !== idx));
                            }}
                            className="text-slate-400 hover:text-rose-400"
                            title="削除"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                      {currentExamScores.length === 0 && (
                        <p className="text-xs text-slate-500 italic">
                          まだ既済のテスト点数が追加されていません
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                        逆算シミュレーション結果
                      </span>
                      {avgSubjectName && (
                        <span className="text-xs font-bold text-slate-300">
                          科目: {avgSubjectName}
                        </span>
                      )}
                    </div>

                    <div className="mt-6 text-center">
                      <p className="text-xs font-medium text-slate-400">
                        残り {averageResult.remainingTests} 回のテストで必要な1回あたりの点数
                      </p>
                      <div className="mt-2 text-5xl sm:text-6xl font-black font-mono tracking-tight text-white flex items-center justify-center gap-1">
                        <span
                          className={
                            averageResult.requiredScore > 100
                              ? 'text-rose-400'
                              : averageResult.requiredScore <= 60
                              ? 'text-emerald-400'
                              : 'text-indigo-300'
                          }
                        >
                          {averageResult.requiredScore}
                        </span>
                        <span className="text-xl font-normal text-slate-400">点以上</span>
                      </div>

                      <div className="mt-3 inline-block">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            averageResult.status === 'impossible'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : averageResult.status === 'challenging'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : averageResult.status === 'already_achieved'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          }`}
                        >
                          {averageResult.statusText}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8">
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
                        <span>難易度メーター</span>
                        <span>
                          {Math.min(100, Math.max(0, Math.round(averageResult.requiredScore)))}% / 100点
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            averageResult.requiredScore > 100
                              ? 'bg-rose-500'
                              : averageResult.requiredScore > 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-400'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(5, averageResult.requiredScore))}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-3 text-center border-t border-slate-800/80 pt-4">
                      <div className="p-2.5 rounded-xl bg-slate-950/50">
                        <span className="text-[10px] text-slate-400 block">現在の獲得合計</span>
                        <span className="text-sm font-bold text-slate-200">
                          {averageResult.currentSum} 点
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/50">
                        <span className="text-[10px] text-slate-400 block">目標到達必要合計</span>
                        <span className="text-sm font-bold text-indigo-300">
                          {averageResult.neededTotal} 点
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/50">
                        <span className="text-[10px] text-slate-400 block">残り必要点差</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {Math.max(0, averageResult.neededTotal - averageResult.currentSum)} 点
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        const sim: SavedSimulation = {
                          id: Date.now().toString(),
                          title: avgSubjectName || `目標平均${targetAverage}点シミュレーション`,
                          type: 'average',
                          data: {
                            subject: avgSubjectName,
                            targetAverage,
                            totalExamCount,
                            scores: currentExamScores,
                            requiredScore: averageResult.requiredScore,
                          },
                          createdAt: new Date().toLocaleDateString('ja-JP'),
                        };
                        setSavedSimulations([sim, ...savedSimulations]);
                        syncToFirestore('simulations', sim.id, sim);
                        showToast('シミュレーション結果を保存しました！');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      この結果を保存
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mode B: Weighted Final Exam Target Calculator */}
            {simMode === 'weighted' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 space-y-4 shadow-xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    配点比率 & 実績入力
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        総合目標点 (例: 80点=A)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={weightedTarget}
                        onChange={(e) => setWeightedTarget(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-amber-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        期末試験の配点比率 (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={finalWeight}
                        onChange={(e) => setFinalWeight(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      既済の評価項目（小テスト、中間試験、課題点など）
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newWeightName}
                        onChange={(e) => setNewWeightName(e.target.value)}
                        placeholder="項目名 (例: 中間)"
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <input
                        type="number"
                        value={newWeightScore}
                        onChange={(e) => setNewWeightScore(e.target.value)}
                        placeholder="得点 (点)"
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={newWeightPercent}
                          onChange={(e) => setNewWeightPercent(e.target.value)}
                          placeholder="配点 (%)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newWeightName.trim() && newWeightScore && newWeightPercent) {
                              setWeightedItems([
                                ...weightedItems,
                                {
                                  name: newWeightName.trim(),
                                  score: Number(newWeightScore),
                                  weight: Number(newWeightPercent),
                                },
                              ]);
                              setNewWeightName('');
                              setNewWeightScore('');
                              setNewWeightPercent('');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
                        >
                          追加
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {weightedItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-200">{item.name}</span>
                            <span className="text-slate-400 ml-2">
                              {item.score}点 × {item.weight}% ={' '}
                              <strong className="text-amber-400">
                                {((item.score * item.weight) / 100).toFixed(1)}
                              </strong>{' '}
                              pt
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setWeightedItems(weightedItems.filter((_, i) => i !== idx));
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {weightedItems.length === 0 && (
                        <p className="text-xs text-slate-500 py-2">
                          項目がありません。「中間試験 70点 30%」のように登録してください
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 rounded-2xl bg-gradient-to-br from-slate-900 to-amber-950/30 border border-amber-500/30 p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      期末試験・必要スコア逆算
                    </span>

                    <div className="mt-6 text-center">
                      <p className="text-xs font-medium text-slate-400">
                        配点 {finalWeight}% の期末試験で必要な得点
                      </p>
                      <div className="mt-2 text-5xl sm:text-6xl font-black font-mono tracking-tight text-white flex items-center justify-center gap-1">
                        <span
                          className={
                            weightedResult.requiredFinalScore > 100
                              ? 'text-rose-400'
                              : 'text-amber-300'
                          }
                        >
                          {weightedResult.requiredFinalScore}
                        </span>
                        <span className="text-xl font-normal text-slate-400">点</span>
                      </div>

                      <p className="text-xs text-slate-300 mt-2">{weightedResult.statusText}</p>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">現在の確定保有ポイント:</span>
                        <span className="font-bold text-amber-400">
                          {weightedResult.currentWeightedPoints} pt
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">目標総合得点:</span>
                        <span className="font-bold text-white">{weightedTarget} pt</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1.5">
                        <span className="text-slate-400">期末で補うべき必要ポイント:</span>
                        <span className="font-bold text-emerald-400">
                          {Math.max(0, Number((weightedTarget - weightedResult.currentWeightedPoints).toFixed(1)))} pt
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        const sim: SavedSimulation = {
                          id: Date.now().toString(),
                          title: `期末配点${finalWeight}% 逆算`,
                          type: 'weighted',
                          data: {
                            targetScore: weightedTarget,
                            finalWeight,
                            items: weightedItems,
                            requiredFinalScore: weightedResult.requiredFinalScore,
                          },
                          createdAt: new Date().toLocaleDateString('ja-JP'),
                        };
                        setSavedSimulations([sim, ...savedSimulations]);
                        syncToFirestore('simulations', sim.id, sim);
                        showToast('シミュレーション結果を保存しました！');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      この結果を保存
                    </button>
                  </div>
                </div>
              </div>
            )}

            {savedSimulations.length > 0 && (
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  保存されたシミュレーション ({savedSimulations.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {savedSimulations.map((sim) => (
                    <div
                      key={sim.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-2"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white">{sim.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          必要スコア:{' '}
                          <strong className="text-indigo-400">
                            {sim.data.requiredScore ?? sim.data.requiredFinalScore}点
                          </strong>
                        </p>
                        <span className="text-[10px] text-slate-500 block mt-1">
                          {sim.createdAt}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSavedSimulations(savedSimulations.filter((s) => s.id !== sim.id));
                          syncToFirestore('simulations', sim.id, null, true);
                          showToast('シミュレーションを削除しました');
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: QUICK MEMOS & LINKS (リンク集 & メモ帳) */}
        {/* ========================================================= */}
        {activeTab === 'memos' && (
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-sky-400" />
                    クイックリンク集
                  </h2>
                  <p className="text-xs text-slate-400">
                    大学ポータル、Google Classroom、シラバス、学内クラウドなどの重要リンク
                  </p>
                </div>
                <button
                  onClick={() => setLinkModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  リンクを追加
                </button>
              </div>

              {links.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center bg-slate-900/30">
                  <LinkIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">登録されたリンクはありません</p>
                  <button
                    onClick={() => setLinkModalOpen(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium"
                  >
                    + リンクを追加
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="group p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-sky-500/40 flex items-center justify-between gap-2 transition-all shadow-sm"
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 min-w-0 flex-1"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-slate-200 group-hover:text-sky-300 truncate">
                            {link.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {link.category || '一般'}
                          </span>
                        </div>
                      </a>

                      <button
                        onClick={() => {
                          setLinks(links.filter((l) => l.id !== link.id));
                          syncToFirestore('links', link.id, null, true);
                          showToast('リンクを削除しました');
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4 pt-6 border-t border-slate-800/80">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-indigo-400" />
                    クイック付箋メモ
                  </h2>
                  <p className="text-xs text-slate-400">
                    講義の要点、パスワード控え、持ち物、ちょっとしたメモを瞬時に保存
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingMemo(null);
                    setMemoModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  メモを作成
                </button>
              </div>

              {memos.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center bg-slate-900/30">
                  <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">メモはまだ作成されていません</p>
                  <button
                    onClick={() => {
                      setEditingMemo(null);
                      setMemoModalOpen(true);
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium"
                  >
                    + 最初のメモを書く
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {memos
                    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                    .map((memo) => {
                      const palette = COLOR_PALETTES.find((p) => p.id === memo.color) || COLOR_PALETTES[0];
                      return (
                        <div
                          key={memo.id}
                          className={`p-4 rounded-2xl border ${palette.bg} ${palette.border} flex flex-col justify-between shadow-lg relative group transition-all`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-white break-words">
                                {memo.title}
                              </h4>
                              <button
                                onClick={() => {
                                  const updatedPinned = !memo.isPinned;
                                  setMemos(
                                    memos.map((m) =>
                                      m.id === memo.id ? { ...m, isPinned: updatedPinned } : m
                                    )
                                  );
                                  syncToFirestore('memos', memo.id, {
                                    ...memo,
                                    isPinned: updatedPinned,
                                  });
                                }}
                                className={`p-1 rounded-md transition-colors ${
                                  memo.isPinned
                                    ? 'text-amber-400 bg-amber-500/20'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                                title={memo.isPinned ? 'ピン留め解除' : 'ピン留めする'}
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <p className="text-xs text-slate-200 mt-2.5 whitespace-pre-wrap leading-relaxed break-words">
                              {memo.content}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                            <span>{memo.updatedAt}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingMemo(memo);
                                  setMemoModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-white"
                                title="編集"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setMemos(memos.filter((m) => m.id !== memo.id));
                                  syncToFirestore('memos', memo.id, null, true);
                                  showToast('メモを削除しました');
                                }}
                                className="p-1 text-slate-400 hover:text-rose-400"
                                title="削除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODALS SECTION */}
      {/* ========================================================= */}

      {/* 1. Schedule Item Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                {editingSchedule ? '講義の編集' : '講義の新規登録'}
              </h3>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const subject = (form.elements.namedItem('subject') as HTMLInputElement).value;
                const room = (form.elements.namedItem('room') as HTMLInputElement).value;
                const teacher = (form.elements.namedItem('teacher') as HTMLInputElement).value;
                const memo = (form.elements.namedItem('memo') as HTMLInputElement).value;
                const dayOfWeek = Number(
                  (form.elements.namedItem('dayOfWeek') as HTMLSelectElement).value
                );
                const period = Number(
                  (form.elements.namedItem('period') as HTMLSelectElement).value
                );
                const color = (form.elements.namedItem('color') as HTMLSelectElement).value;

                if (!subject.trim()) return;

                if (editingSchedule) {
                  const updatedItem = {
                    ...editingSchedule,
                    subject,
                    room,
                    teacher,
                    memo,
                    dayOfWeek,
                    period,
                    color,
                  };
                  setSchedule(schedule.map((s) => (s.id === editingSchedule.id ? updatedItem : s)));
                  syncToFirestore('schedules', editingSchedule.id, updatedItem);
                  showToast('講義情報を更新しました');
                } else {
                  const existing = schedule.filter(
                    (s) => !(s.dayOfWeek === dayOfWeek && s.period === period)
                  );
                  const newItem: ScheduleItem = {
                    id: Date.now().toString(),
                    subject,
                    room,
                    teacher,
                    memo,
                    dayOfWeek,
                    period,
                    color,
                  };
                  setSchedule([...existing, newItem]);
                  syncToFirestore('schedules', newItem.id, newItem);
                  showToast('講義を時間割に登録しました');
                }
                setScheduleModalOpen(false);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  科目名 <span className="text-rose-400">*</span>
                </label>
                <input
                  name="subject"
                  type="text"
                  required
                  defaultValue={editingSchedule?.subject || ''}
                  placeholder="例: データ構造とアルゴリズム"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">曜日</label>
                  <select
                    name="dayOfWeek"
                    defaultValue={editingSchedule?.dayOfWeek ?? selectedCell?.day ?? 1}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>
                        {DAY_NAMES[d]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">時限</label>
                  <select
                    name="period"
                    defaultValue={editingSchedule?.period ?? selectedCell?.period ?? 1}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {periodTimes.map((p) => (
                      <option key={p.period} value={p.period}>
                        {p.period} 限 ({p.start}~{p.end})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">教室</label>
                  <input
                    name="room"
                    type="text"
                    defaultValue={editingSchedule?.room || ''}
                    placeholder="例: 301講義室"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">担当教員</label>
                  <input
                    name="teacher"
                    type="text"
                    defaultValue={editingSchedule?.teacher || ''}
                    placeholder="例: 佐藤教授"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">カラーテーマ</label>
                <select
                  name="color"
                  defaultValue={editingSchedule?.color || 'indigo'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {COLOR_PALETTES.map((pal) => (
                    <option key={pal.id} value={pal.id}>
                      {pal.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">メモ</label>
                <input
                  name="memo"
                  type="text"
                  defaultValue={editingSchedule?.memo || ''}
                  placeholder="例: 出席確認あり、教科書必携"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {editingSchedule ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSchedule(schedule.filter((s) => s.id !== editingSchedule.id));
                      syncToFirestore('schedules', editingSchedule.id, null, true);
                      showToast('講義を時間割から削除しました');
                      setScheduleModalOpen(false);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 削除
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30"
                  >
                    保存する
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Task Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-rose-400" />
                {editingTask ? '課題の編集' : '新規課題の登録'}
              </h3>
              <button
                onClick={() => setTaskModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const subject = (form.elements.namedItem('subject') as HTMLInputElement).value;
                const dueDate = (form.elements.namedItem('dueDate') as HTMLInputElement).value;
                const dueTime = (form.elements.namedItem('dueTime') as HTMLInputElement).value;
                const priority = (form.elements.namedItem('priority') as HTMLSelectElement)
                  .value as 'high' | 'medium' | 'low';
                const memo = (form.elements.namedItem('memo') as HTMLTextAreaElement).value;

                if (!title.trim()) return;

                if (editingTask) {
                  const updatedTask = {
                    ...editingTask,
                    title,
                    subject,
                    dueDate,
                    dueTime,
                    priority,
                    memo,
                  };
                  setTasks(tasks.map((t) => (t.id === editingTask.id ? updatedTask : t)));
                  syncToFirestore('tasks', editingTask.id, updatedTask);
                  showToast('課題を更新しました');
                } else {
                  const newTask: TaskItem = {
                    id: Date.now().toString(),
                    title,
                    subject: subject || '一般',
                    dueDate,
                    dueTime,
                    priority,
                    memo,
                    completed: false,
                    createdAt: new Date().toISOString(),
                  };
                  setTasks([newTask, ...tasks]);
                  syncToFirestore('tasks', newTask.id, newTask);
                  showToast('新しい課題を登録しました！');
                }
                setTaskModalOpen(false);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  課題タイトル <span className="text-rose-400">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={editingTask?.title || ''}
                  placeholder="例: 第3回演習レポート提出"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">科目タグ</label>
                  <input
                    name="subject"
                    list="subjectSuggestions"
                    defaultValue={editingTask?.subject || ''}
                    placeholder="例: 情報工学"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <datalist id="subjectSuggestions">
                    {subjectList.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">優先度</label>
                  <select
                    name="priority"
                    defaultValue={editingTask?.priority || 'medium'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="high">高（要最優先）</option>
                    <option value="medium">中（通常）</option>
                    <option value="low">低（余裕あり）</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">提出期限日</label>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={editingTask?.dueDate || ''}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    提出時刻 (任意)
                  </label>
                  <input
                    name="dueTime"
                    type="time"
                    defaultValue={editingTask?.dueTime || '23:59'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  詳細メモ / 提出先URLなど
                </label>
                <textarea
                  name="memo"
                  rows={2}
                  defaultValue={editingTask?.memo || ''}
                  placeholder="提出フォーマット(PDF), 必須記載項目など"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {editingTask ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTasks(tasks.filter((t) => t.id !== editingTask.id));
                      syncToFirestore('tasks', editingTask.id, null, true);
                      showToast('課題を削除しました');
                      setTaskModalOpen(false);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 削除
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30"
                  >
                    保存する
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Quick Link Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-sky-400" />
                クイックリンクの追加
              </h3>
              <button onClick={() => setLinkModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                let url = (form.elements.namedItem('url') as HTMLInputElement).value;
                const category = (form.elements.namedItem('category') as HTMLInputElement).value;

                if (!title.trim() || !url.trim()) return;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                  url = 'https://' + url;
                }

                const newLink: QuickLinkItem = {
                  id: Date.now().toString(),
                  title: title.trim(),
                  url: url.trim(),
                  category: category.trim() || '一般',
                };
                setLinks([...links, newLink]);
                syncToFirestore('links', newLink.id, newLink);
                showToast('リンクを追加しました');
                setLinkModalOpen(false);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  サイト名 <span className="text-rose-400">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="例: 大学ポータルシステム, Classroom"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL <span className="text-rose-400">*</span>
                </label>
                <input
                  name="url"
                  type="text"
                  required
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">カテゴリ</label>
                <input
                  name="category"
                  type="text"
                  placeholder="例: ポータル, LMS, クラウド"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-md"
                >
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Quick Memo Modal */}
      {memoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-400" />
                {editingMemo ? '付箋メモの編集' : '新規付箋メモ'}
              </h3>
              <button onClick={() => setMemoModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;
                const color = (form.elements.namedItem('color') as HTMLSelectElement).value;

                if (!title.trim() && !content.trim()) return;

                if (editingMemo) {
                  const updatedMemo = {
                    ...editingMemo,
                    title: title.trim() || '無題のメモ',
                    content,
                    color,
                    updatedAt: new Date().toLocaleDateString('ja-JP'),
                  };
                  setMemos(memos.map((m) => (m.id === editingMemo.id ? updatedMemo : m)));
                  syncToFirestore('memos', editingMemo.id, updatedMemo);
                  showToast('メモを更新しました');
                } else {
                  const newMemo: QuickMemoItem = {
                    id: Date.now().toString(),
                    title: title.trim() || '無題のメモ',
                    content,
                    color,
                    isPinned: false,
                    updatedAt: new Date().toLocaleDateString('ja-JP'),
                  };
                  setMemos([newMemo, ...memos]);
                  syncToFirestore('memos', newMemo.id, newMemo);
                  showToast('メモを作成しました');
                }
                setMemoModalOpen(false);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">タイトル</label>
                <input
                  name="title"
                  type="text"
                  defaultValue={editingMemo?.title || ''}
                  placeholder="例: 中間試験の出題範囲"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  内容 <span className="text-rose-400">*</span>
                </label>
                <textarea
                  name="content"
                  required
                  rows={4}
                  defaultValue={editingMemo?.content || ''}
                  placeholder="メモ内容を入力..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">カラー</label>
                <select
                  name="color"
                  defaultValue={editingMemo?.color || 'indigo'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {COLOR_PALETTES.map((pal) => (
                    <option key={pal.id} value={pal.id}>
                      {pal.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMemoModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Period Times Config Modal */}
      {periodConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                時限の開始・終了時刻設定
              </h3>
              <button
                onClick={() => setPeriodConfigModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              あなたの学校のチャイム時刻に合わせて変更できます。タイマーのカウントダウンもこの時刻に連動します。
            </p>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {periodTimes.map((p, idx) => (
                <div
                  key={p.period}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <span className="font-bold text-slate-200 w-14">{p.period} 限</span>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <input
                      type="time"
                      value={p.start}
                      onChange={(e) => {
                        const updated = [...periodTimes];
                        updated[idx].start = e.target.value;
                        setPeriodTimes(updated);
                        if (currentUser) {
                          setDoc(
                            doc(db, 'users', currentUser.uid, 'settings', 'periodTimes'),
                            { periodTimes: updated },
                            { merge: true }
                          ).catch((err) =>
                            handleFirestoreError(
                              err,
                              OperationType.WRITE,
                              `users/${currentUser.uid}/settings/periodTimes`
                            )
                          );
                        }
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                    />
                    <span className="text-slate-500">〜</span>
                    <input
                      type="time"
                      value={p.end}
                      onChange={(e) => {
                        const updated = [...periodTimes];
                        updated[idx].end = e.target.value;
                        setPeriodTimes(updated);
                        if (currentUser) {
                          setDoc(
                            doc(db, 'users', currentUser.uid, 'settings', 'periodTimes'),
                            { periodTimes: updated },
                            { merge: true }
                          ).catch((err) =>
                            handleFirestoreError(
                              err,
                              OperationType.WRITE,
                              `users/${currentUser.uid}/settings/periodTimes`
                            )
                          );
                        }
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setPeriodTimes(DEFAULT_PERIOD_TIMES);
                  if (currentUser) {
                    setDoc(
                      doc(db, 'users', currentUser.uid, 'settings', 'periodTimes'),
                      { periodTimes: DEFAULT_PERIOD_TIMES },
                      { merge: true }
                    ).catch((err) =>
                      handleFirestoreError(
                        err,
                        OperationType.WRITE,
                        `users/${currentUser.uid}/settings/periodTimes`
                      )
                    );
                  }
                  showToast('デフォルトの時限設定に戻しました');
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> デフォルトに戻す
              </button>
              <button
                onClick={() => setPeriodConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Data Management & Backup Modal */}
      {dataManagementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                データ管理・バックアップ
              </h3>
              <button
                onClick={() => setDataManagementModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              CampusHackはデータを端末のLocalStorageおよびFirebase Firestoreに安全に保存します。端末変更やバックアップのためにJSON形式で書き出し・復元が可能です。
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleExportData}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold">バックアップJSONをダウンロード</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between text-xs text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold">バックアップJSONから復元</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />

              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={() => setConfirmResetOpen(true)}
                  className="w-full p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  すべてのデータを完全リセット
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDataManagementModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-200"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-rose-500/40 p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              データ完全消去の確認
            </h3>
            <p className="text-xs text-slate-300">
              時間割、課題、メモ、シミュレーション等の全データが初期化されます。この操作は取り消せません。本当によろしいですか？
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300"
              >
                キャンセル
              </button>
              <button
                onClick={handleResetData}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md"
              >
                消去する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. iOS PWA Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                iPhone / iPadへの追加手順
              </h3>
              <button onClick={() => setShowIOSModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>Safariブラウザから簡単にホーム画面へアプリとしてインストールできます：</p>
              <ol className="list-decimal list-inside space-y-2 pl-1 text-slate-200">
                <li>
                  Safari下部（iPadは上部）の <strong>共有ボタン</strong> (四角に上矢印のアイコン) をタップ
                </li>
                <li>
                  メニューをスクロールして <strong>「ホーム画面に追加」</strong> を選択
                </li>
                <li>
                  右上の <strong>「追加」</strong> をタップすると、ホーム画面にアイコンが表示されます
                </li>
              </ol>
              <p className="text-[11px] text-slate-400 pt-1">
                ※ ホーム画面から起動すると、アドレスバーのない全画面ネイティブアプリ体験で利用可能です。
              </p>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <footer className="md:hidden sticky bottom-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-medium transition-all ${
            activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Clock className="w-4 h-4" />
          ホーム
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-medium transition-all ${
            activeTab === 'schedule' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-4 h-4" />
          時間割
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-medium transition-all relative ${
            activeTab === 'tasks' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <CheckSquare className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </div>
          課題
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-medium transition-all ${
            activeTab === 'simulator' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Calculator className="w-4 h-4" />
          目標逆算
        </button>
        <button
          onClick={() => setActiveTab('memos')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-medium transition-all ${
            activeTab === 'memos' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          メモ
        </button>
      </footer>
    </div>
  );
}
