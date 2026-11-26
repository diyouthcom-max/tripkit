import React, { useState, useRef } from 'react';
import {
  Check,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ListTodo,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  translateDemoTaskNote,
  translateDemoTaskTitle,
  translateMemberInitials,
  translateMemberName,
  translateTaskCategory,
  translateTaskTiming,
} from '../i18n';
import { AiVoiceInputButton } from './AiVoiceInputButton';
import {
  AccentIconBadge,
  HERO_AVATAR_BG,
  resolveTaskCategoryIconMeta,
} from '../utils/accentTheme';
import type { AppLanguage, CrewMember, TripTask, TripTaskCategory } from '../types';

export const TASK_CATEGORIES: TripTaskCategory[] = [
  '门票预约',
  '交通接送',
  '住宿餐饮',
  '通讯金融',
  '其他事务',
];

export function getLocalizedTaskQuickPresets(lang: AppLanguage): Array<{
  label: string;
  title: string;
  category: TripTaskCategory;
  timing: string;
  note: string;
}> {
  if (lang === 'en-US') {
    return [
      {
        label: 'Book Tickets',
        title: 'Book timed-entry museum & landmark tickets',
        category: '门票预约',
        timing: '7 days before',
        note: 'Lock in morning entry slots & save offline QR tickets',
      },
      {
        label: 'Airport Transfer',
        title: 'Reserve airport / hotel private transfer',
        category: '交通接送',
        timing: '48h before',
        note: 'Confirm flight number and checked luggage capacity',
      },
      {
        label: 'Activate eSIM',
        title: 'Buy & install international eSIM data plan',
        category: '通讯金融',
        timing: '1 day before',
        note: 'Enable data upon arrival while keeping home SIM for 2FA SMS',
      },
      {
        label: 'Confirm Dining',
        title: 'Confirm dinner reservations & seating',
        category: '住宿餐饮',
        timing: 'Morning of dining day',
        note: 'Avoid auto-cancellation fees on popular tables',
      },
    ];
  }
  if (lang === 'en-GB') {
    return [
      {
        label: 'Book Entry',
        title: 'Book timed-entry museum & gallery tickets',
        category: '门票预约',
        timing: '7 days before',
        note: 'Reserve morning time slots & store QR passes offline',
      },
      {
        label: 'Airport / Rail Transfer',
        title: 'Reserve airport transfer or Eurostar seats',
        category: '交通接送',
        timing: '48h before',
        note: 'Verify terminal details and hold luggage space',
      },
      {
        label: 'Roaming / eSIM',
        title: 'Activate European roaming / travel eSIM',
        category: '通讯金融',
        timing: '1 day before',
        note: 'Activate prior to departure while keeping home number for banking OTPs',
      },
      {
        label: 'Confirm Table',
        title: 'Confirm evening restaurant booking',
        category: '住宿餐饮',
        timing: 'Morning of dining day',
        note: 'Prevent table release at busy bistros',
      },
    ];
  }
  return [
    {
      label: '购买景点门票',
      title: '购买热门景点分时预约门票',
      category: '门票预约',
      timing: '出发前 7 天',
      note: '锁定入场时段并离线保存电子票二维码',
    },
    {
      label: '预订接送服务',
      title: '预订机场 / 酒店专车接送服务',
      category: '交通接送',
      timing: '出发前 48h',
      note: '核对航班车次与大件行李数量',
    },
    {
      label: '激活境外流量',
      title: '购买并激活境外 eSIM 数据流量包',
      category: '通讯金融',
      timing: '出发前 1 天',
      note: '落地自动连网，保留原卡接收短信验证码',
    },
    {
      label: '确认餐厅留位',
      title: '确认热门餐厅晚餐预约留位',
      category: '住宿餐饮',
      timing: '用餐当日中午前',
      note: '避免超时自动释放座位',
    },
  ];
}

interface TaskEditDraft {
  title: string;
  category: TripTaskCategory;
  timing: string;
  note: string;
  ownerId: string;
}

interface TripTasksWorkspaceProps {
  tasks: TripTask[];
  crew: CrewMember[];
  activeMemberId: string;
  taskFilter: 'all' | 'todo' | 'done';
  showCreateDrawer: boolean;
  onChangeShowCreateDrawer: (open: boolean) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (payload: {
    title: string;
    category: TripTaskCategory;
    timing: string;
    note?: string;
    ownerId?: string;
  }) => void;
  onAiParseAndAddTasks: (inputText: string, activeMemberId: string) => Promise<number>;
  onUpdateTask: (taskId: string, updates: Partial<TripTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onCycleTaskOwner: (taskId: string) => void;
}

export const TripTasksWorkspace: React.FC<TripTasksWorkspaceProps> = ({
  tasks,
  crew,
  activeMemberId,
  taskFilter,
  showCreateDrawer,
  onChangeShowCreateDrawer,
  onToggleTask,
  onAddTask,
  onAiParseAndAddTasks,
  onUpdateTask,
  onDeleteTask,
  onCycleTaskOwner,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang = (i18n.language as AppLanguage) || 'zh-CN';
  const shouldReduceMotion = useReducedMotion();
  const taskQuickPresets = React.useMemo(
    () => getLocalizedTaskQuickPresets(activeLang),
    [activeLang]
  );

  // AI Voice + Natural Language Smart Task Add State
  const [aiTaskInput, setAiTaskInput] = useState('');
  const [isAiParsingTask, setIsAiParsingTask] = useState(false);
  const [aiTaskError, setAiTaskError] = useState('');
  const [lastVoiceText, setLastVoiceText] = useState('');

  // Manual Task Form State
  const [quickTitle, setQuickTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TripTaskCategory>('门票预约');
  const [newTiming, setNewTiming] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newOwnerId, setNewOwnerId] = useState(
    activeMemberId === 'all' ? crew[0]?.id || 'm1' : activeMemberId
  );

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TaskEditDraft | null>(null);

  // Mobile Touch Horizontal Swipe State
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null);
  const [activeSwipe, setActiveSwipe] = useState<{ taskId: string; offsetX: number } | null>(null);
  const swipeRef = useRef<{
    taskId: string;
    startX: number;
    startY: number;
    baseOffset: number;
    mode: 'idle' | 'swiping' | 'vertical';
  } | null>(null);
  const suppressClickRef = useRef(false);

  React.useEffect(() => {
    setNewOwnerId(activeMemberId === 'all' ? crew[0]?.id || 'm1' : activeMemberId);
  }, [activeMemberId, crew]);

  const memberLookup = React.useMemo(() => {
    const map = new Map<string, CrewMember>();
    crew.forEach((m) => map.set(m.id, m));
    return map;
  }, [crew]);

  const scopedTasks = tasks.filter(
    (t) => activeMemberId === 'all' || (t.ownerId || 'm1') === activeMemberId
  );
  const visibleTasks = scopedTasks.filter((t) => {
    if (taskFilter === 'todo') return !t.done;
    if (taskFilter === 'done') return t.done;
    return true;
  });

  const submitAiTaskText = async (rawText: string) => {
    const clean = rawText.trim();
    if (!clean || isAiParsingTask) return;
    setIsAiParsingTask(true);
    setAiTaskError('');
    try {
      await onAiParseAndAddTasks(clean, activeMemberId);
      setAiTaskInput('');
    } catch (err) {
      if (err instanceof Error && err.message === 'PRO_PAYWALL_GATED') {
        return;
      }
      setAiTaskError(
        err instanceof Error
          ? err.message
          : activeLang === 'zh-CN'
          ? 'AI 解析旅行事务暂时不可用'
          : 'AI task parsing is temporarily unavailable'
      );
    } finally {
      setIsAiParsingTask(false);
    }
  };

  const handleAiTaskFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAiTaskText(aiTaskInput);
  };

  const handleVoiceTaskTranscript = async (transcript: string) => {
    setLastVoiceText(transcript);
    setAiTaskInput(transcript);
    await submitAiTaskText(transcript);
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onAddTask({
      title: quickTitle.trim(),
      category: newCategory,
      timing: newTiming.trim() || (activeLang === 'zh-CN' ? '出发前' : 'Before departure'),
      note: newNote.trim() || undefined,
      ownerId: newOwnerId,
    });
    setQuickTitle('');
    setNewNote('');
    onChangeShowCreateDrawer(false);
  };

  const handlePresetTap = (preset: ReturnType<typeof getLocalizedTaskQuickPresets>[number]) => {
    setQuickTitle(preset.title);
    setNewCategory(preset.category);
    setNewTiming(preset.timing);
    setNewNote(preset.note);
    onChangeShowCreateDrawer(true);
  };

  const beginEdit = (task: TripTask) => {
    setSwipedTaskId(null);
    setExpandedTaskId(null);
    setEditingTaskId(task.id);
    setEditDraft({
      title: task.title,
      category: task.category,
      timing: task.timing,
      note: task.note ?? '',
      ownerId: task.ownerId ?? crew[0]?.id ?? 'm1',
    });
  };

  const saveEdit = (taskId: string) => {
    if (!editDraft || !editDraft.title.trim()) return;
    onUpdateTask(taskId, {
      title: editDraft.title.trim(),
      category: editDraft.category,
      timing: editDraft.timing.trim() || (activeLang === 'zh-CN' ? '旅行期间' : 'During trip'),
      note: editDraft.note.trim() || undefined,
      ownerId: editDraft.ownerId,
    });
    setEditingTaskId(null);
    setEditDraft(null);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, taskId: string) => {
    if (editingTaskId === taskId) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, select, textarea')) return;
    if (e.pointerType === 'mouse') return;

    const baseOffset = swipedTaskId === taskId ? -112 : 0;
    swipeRef.current = {
      taskId,
      startX: e.clientX,
      startY: e.clientY,
      baseOffset,
      mode: 'idle',
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = swipeRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    if (st.mode === 'idle') {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        st.mode = 'swiping';
        suppressClickRef.current = true;
      } else if (Math.abs(dy) > 12) {
        st.mode = 'vertical';
        swipeRef.current = null;
        return;
      } else {
        return;
      }
    }

    if (st.mode === 'swiping') {
      const nextOffset = Math.max(-132, Math.min(84, st.baseOffset + dx));
      setActiveSwipe({ taskId: st.taskId, offsetX: nextOffset });
    }
  };

  const handlePointerEnd = () => {
    const st = swipeRef.current;
    swipeRef.current = null;
    if (!st || st.mode !== 'swiping') return;

    const finalOffset =
      activeSwipe?.taskId === st.taskId ? activeSwipe.offsetX : st.baseOffset;
    setActiveSwipe(null);

    if (finalOffset >= 52) {
      onToggleTask(st.taskId);
      setSwipedTaskId(null);
    } else if (finalOffset <= -48) {
      setSwipedTaskId(st.taskId);
      setExpandedTaskId(null);
    } else {
      setSwipedTaskId(null);
    }

    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 60);
  };

  return (
    <div className="[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] space-y-3">
      {/* Zero-Scroll AI Voice & One-Sentence Smart Task Input Bar */}
      <section className="rounded-[20px] border tk-bc-hair bg-white p-4 space-y-2.5">
        <form onSubmit={handleAiTaskFormSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={aiTaskInput}
            onChange={(e) => setAiTaskInput(e.target.value)}
            placeholder={t('tasks.aiBarPlaceholder')}
            className="flex-1 rounded-[16px] border tk-bc-hair tk-bg-paper px-3.5 py-2 text-base sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:tk-bc-forest focus:bg-white focus:outline-none"
          />
          <div className="flex items-center gap-2 shrink-0">
            <AiVoiceInputButton
              contextHint="task"
              disabled={isAiParsingTask}
              label={t('tasks.voiceDictateLabel')}
              onTranscript={handleVoiceTaskTranscript}
              onError={(msg) => setAiTaskError(msg)}
            />
            <button
              type="submit"
              disabled={isAiParsingTask || !aiTaskInput.trim()}
              className="flex-1 sm:flex-initial h-9 inline-flex items-center justify-center gap-1.5 rounded-[16px] tk-bg-forest px-3.5 text-sm font-semibold text-white hover:tk-bg-press disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isAiParsingTask ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isAiParsingTask ? t('tasks.aiParsing') : t('tasks.aiAddBtn')}
            </button>
          </div>
        </form>

        {lastVoiceText && !aiTaskError && (
          <p className="text-sm tk-text-ink2">
            {t('voice.heardPrefix')}
            <span className="font-semibold tk-text-ink">{lastVoiceText}</span>
          </p>
        )}
        {aiTaskError && <p className="text-sm font-medium tk-text-warning">{aiTaskError}</p>}
      </section>

      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <AccentIconBadge accent="teal" icon={ListTodo} size="xs" />
          <h2 className="font-serif text-sm font-extrabold tracking-tight tk-text-ink">
            {t('tasks.workspaceTitle')}
          </h2>
        </div>
        <span className="text-sm tk-text-ink2">{t('tasks.workspaceSwipeHint')}</span>
      </div>

      {/* Main Interactive Task List Card */}
      <section className="rounded-[20px] border tk-bc-hair bg-white overflow-hidden">
        {visibleTasks.length === 0 ? (
          <div className="px-5 py-8 text-center space-y-2">
            <p className="font-serif text-sm font-bold tk-text-ink">
              {scopedTasks.length === 0
                ? t('tasks.emptyAll')
                : taskFilter === 'todo'
                ? t('tasks.emptyTodo')
                : t('tasks.emptyDone')}
            </p>
            <p className="text-sm tk-text-ink2">{t('tasks.emptyHint')}</p>
          </div>
        ) : (
          <div className="divide-y tk-divide-hair">
            {visibleTasks.map((task) => {
              const taskOwner = memberLookup.get(task.ownerId || 'm1') || crew[0];
              const isMenuOpen = expandedTaskId === task.id;
              const isEditing = editingTaskId === task.id;
              const taskIconMeta = resolveTaskCategoryIconMeta(task.category);

              const currentSwipeOffset =
                activeSwipe?.taskId === task.id
                  ? activeSwipe.offsetX
                  : swipedTaskId === task.id
                  ? -112
                  : 0;
              const showSwipeBackdrop =
                currentSwipeOffset !== 0 || swipedTaskId === task.id;

              return (
                <div key={task.id} className="bg-white overflow-hidden">
                  {isEditing && editDraft ? (
                    <div className="tk-bg-paper px-4 sm:px-5 py-3.5 space-y-2.5">
                      <input
                        type="text"
                        value={editDraft.title}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, title: e.target.value })
                        }
                        placeholder={t('tasks.taskNamePlaceholder')}
                        className="font-serif w-full rounded-[16px] border tk-bc-hair bg-white px-3 py-2 text-base sm:text-sm font-semibold tk-text-ink"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          value={editDraft.category}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              category: e.target.value as TripTaskCategory,
                            })
                          }
                          className="font-serif rounded-[16px] border tk-bc-hair bg-white px-2.5 py-2 text-base sm:text-sm font-semibold tk-text-ink"
                        >
                          {TASK_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {t('tasks.categoryPrefix')}
                              {translateTaskCategory(cat, activeLang)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editDraft.timing}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, timing: e.target.value })
                          }
                          placeholder={t('tasks.timingPlaceholder')}
                          className="rounded-[16px] border tk-bc-hair bg-white px-2.5 py-2 text-base sm:text-sm tk-text-ink"
                        />
                        <select
                          value={editDraft.ownerId}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, ownerId: e.target.value })
                          }
                          className="font-serif rounded-[16px] border tk-bc-hair bg-white px-2.5 py-2 text-base sm:text-sm font-semibold tk-text-ink"
                        >
                          {crew.map((m) => (
                            <option key={m.id} value={m.id}>
                              {t('common.followUpPrefix')}
                              {translateMemberName(m.name, activeLang)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={editDraft.note}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, note: e.target.value })
                        }
                        placeholder={t('tasks.notePlaceholder')}
                        className="w-full rounded-[16px] border tk-bc-hair bg-white px-3 py-2 text-base sm:text-sm tk-text-ink2"
                      />
                      <div className="flex items-center justify-end gap-2 pt-0.5 text-sm">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTaskId(null);
                            setEditDraft(null);
                          }}
                          className="rounded-lg border tk-bc-hair bg-white px-3 py-1.5 font-semibold tk-text-ink2 cursor-pointer"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(task.id)}
                          className="rounded-lg tk-bg-forest px-3.5 py-1.5 font-semibold text-white cursor-pointer"
                        >
                          {t('common.saveChanges')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="relative overflow-hidden">
                        {showSwipeBackdrop && (
                          <div
                            className="absolute inset-0 flex items-stretch justify-between pointer-events-none"
                            aria-hidden={swipedTaskId !== task.id}
                          >
                            <div
                              className={`flex items-center px-4 text-white text-sm font-semibold transition-opacity ${
 currentSwipeOffset > 0
 ? 'tk-bg-forest opacity-100'
 : 'opacity-0'
 }`}
                            >
                              {task.done ? t('tasks.swipeTodo') : t('tasks.swipeDone')}
                            </div>
                            <div
                              className={`flex items-stretch transition-opacity ${
 currentSwipeOffset < 0
 ? 'pointer-events-auto opacity-100'
 : 'pointer-events-none opacity-0'
 }`}
                            >
                              <button
                                type="button"
                                onClick={() => beginEdit(task)}
                                className="w-14 tk-bg-forest text-white text-sm font-semibold hover:tk-bg-press whitespace-nowrap cursor-pointer"
                              >
                                {t('common.edit')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteTask(task.id);
                                  setSwipedTaskId(null);
                                }}
                                className="w-14 tk-bg-danger text-white text-sm font-semibold hover:tk-bg-danger whitespace-nowrap cursor-pointer"
                              >
                                {t('common.delete')}
                              </button>
                            </div>
                          </div>
                        )}

                        <div
                          onPointerDown={(e) => handlePointerDown(e, task.id)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerEnd}
                          onPointerCancel={handlePointerEnd}
                          style={{
                            transform: `translateX(${currentSwipeOffset}px)`,
                            transition:
                              activeSwipe?.taskId === task.id
                                ? 'none'
                                : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                          className="relative z-10 bg-white px-4 sm:px-5 py-3.5 hover:tk-bg-paper transition-colors touch-pan-y"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (suppressClickRef.current) return;
                                if (swipedTaskId === task.id) {
                                  setSwipedTaskId(null);
                                  return;
                                }
                                onToggleTask(task.id);
                              }}
                              className="flex-1 min-w-0 flex items-start gap-3 text-left min-h-[44px] py-0.5 cursor-pointer"
                            >
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
 task.done
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair bg-white'
 }`}
                              >
                                {task.done && <Check className="h-4 w-4 stroke-[1.5]" />}
                              </span>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span
                                    className={`text-sm font-semibold ${
 task.done
 ? 'line-through tk-text-ink2'
 : 'tk-text-ink'
 }`}
                                  >
                                    {translateDemoTaskTitle(task.title, activeLang)}
                                  </span>
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm tk-text-ink2">
                                  <AccentIconBadge
                                    accent={taskIconMeta.accent}
                                    icon={taskIconMeta.Icon}
                                    size="2xs"
                                    ring={false}
                                  />
                                  <span>{translateTaskCategory(task.category, activeLang)}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="tabular-nums">
                                    {translateTaskTiming(task.timing, activeLang)}
                                  </span>
                                </div>

                                {task.note && (
                                  <p className="mt-1 text-sm tk-text-ink2 leading-relaxed">
                                    {translateDemoTaskNote(task.note, activeLang)}
                                  </p>
                                )}
                              </div>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onCycleTaskOwner(task.id)}
                                title={`${t('common.followUpPrefix')}${translateMemberName(
                                  taskOwner?.name ?? '本人',
                                  activeLang
                                )}`}
                                aria-label={`${t('common.followUpPrefix')}${task.title}`}
                                className="flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105 cursor-pointer"
                              >
                                <span
                                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold ${
 taskOwner
 ? HERO_AVATAR_BG[taskOwner.accent]
 : HERO_AVATAR_BG.peach
 }`}
                                >
                                  {translateMemberInitials(taskOwner?.initials ?? '我', activeLang)}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSwipedTaskId(null);
                                  setExpandedTaskId((prev) =>
                                    prev === task.id ? null : task.id
                                  );
                                }}
                                aria-label={task.title}
                                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
 isMenuOpen
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'border-transparent tk-text-ink2 hover:tk-bg-paper hover:tk-text-ink'
 }`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {isMenuOpen && (
                        <div className="border-t tk-bc-hair tk-bg-paper px-4 sm:px-5 py-2.5 flex items-center justify-end gap-2 text-sm">
                          <button
                            type="button"
                            onClick={() => beginEdit(task)}
                            className="inline-flex items-center gap-1 rounded-lg border tk-bc-hair bg-white px-3 py-1.5 font-semibold tk-text-ink hover:tk-bc-forest cursor-pointer"
                          >
                            <Pencil className="h-3 w-3 tk-text-forest" />
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTask(task.id);
                              setExpandedTaskId(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border tk-bc-danger-hair bg-white px-3 py-1.5 font-semibold tk-text-danger hover:tk-bg-danger-tint cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Presets & Fast Add Card (Right Under Thumb, Zero Deep Scroll) */}
      <section className="rounded-[20px] border tk-bc-hair bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-serif text-sm font-bold tk-text-ink">{t('tasks.presetsTitle')}</span>
          {!showCreateDrawer && (
            <button
              type="button"
              onClick={() => onChangeShowCreateDrawer(true)}
              className="inline-flex items-center gap-1 text-sm font-semibold tk-text-forest hover:underline cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {t('tasks.customAddBtn')}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {taskQuickPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetTap(preset)}
              className="font-serif min-h-[38px] rounded-[16px] border tk-bc-hair tk-bg-paper px-3 py-1.5 text-sm font-semibold tk-text-ink hover:tk-bc-forest hover:tk-text-forest transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              + {preset.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {showCreateDrawer && (
            <motion.form
              initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleQuickSubmit}
              className="overflow-hidden border-t tk-bc-hair pt-3 space-y-2.5"
            >
              <div className="font-serif flex items-center justify-between text-sm font-bold tk-text-ink">
                <span>{t('tasks.manualTitle')}</span>
                <button
                  type="button"
                  onClick={() => onChangeShowCreateDrawer(false)}
                  aria-label={t('common.close')}
                  className="p-1 tk-text-ink2 hover:tk-text-ink cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder={t('tasks.taskNamePlaceholder')}
                  className="flex-1 rounded-[16px] border tk-bc-hair tk-bg-paper px-3.5 py-2.5 text-base sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:tk-bc-forest focus:bg-white focus:outline-none"
                />
                <AiVoiceInputButton
                  compact
                  contextHint="task"
                  label={t('tasks.voiceFillTitle')}
                  onTranscript={(txt) => setQuickTitle(txt)}
                  onError={(msg) => setAiTaskError(msg)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as TripTaskCategory)}
                  className="font-serif rounded-[16px] border tk-bc-hair tk-bg-paper px-3 py-2 text-base sm:text-sm font-semibold tk-text-ink"
                >
                  {TASK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t('tasks.categoryPrefix')}
                      {translateTaskCategory(cat, activeLang)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newTiming}
                  onChange={(e) => setNewTiming(e.target.value)}
                  placeholder={t('tasks.timingPlaceholder')}
                  className="rounded-[16px] border tk-bc-hair tk-bg-paper px-3 py-2 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:bg-white focus:outline-none"
                />
                <select
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  className="font-serif rounded-[16px] border tk-bc-hair tk-bg-paper px-3 py-2 text-base sm:text-sm font-semibold tk-text-ink"
                >
                  {crew.map((m) => (
                    <option key={m.id} value={m.id}>
                      {t('common.followUpPrefix')}
                      {translateMemberName(m.name, activeLang)}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t('tasks.notePlaceholder')}
                className="w-full rounded-[16px] border tk-bc-hair tk-bg-paper px-3 py-2 text-base sm:text-sm tk-text-ink2 placeholder:tk-text-ink2 focus:tk-bc-forest focus:bg-white focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => onChangeShowCreateDrawer(false)}
                  className="rounded-[16px] border tk-bc-hair bg-white px-3.5 py-2 text-sm font-semibold tk-text-ink2 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!quickTitle.trim()}
                  className="rounded-[16px] tk-bg-forest px-4 py-2 text-sm font-semibold text-white hover:tk-bg-press disabled:opacity-50 cursor-pointer"
                >
                  {t('tasks.confirmAdd')}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};
