import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ListTodo,
  Sparkles,
  Plus,
  Check,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HorizontalChipScroller } from './HorizontalChipScroller';
import { AiVoiceInputButton } from './AiVoiceInputButton';
import {
  TASK_CATEGORIES,
  getLocalizedTaskQuickPresets,
} from './TripTasksWorkspace';
import {
  AccentIconBadge,
  HERO_AVATAR_BG,
  resolveTaskCategoryIconMeta,
} from '../utils/accentTheme';
import {
  translateDemoTaskNote,
  translateDemoTaskTitle,
  translateMemberInitials,
  translateMemberName,
  translateTaskCategory,
  translateTaskTiming,
} from '../i18n';
import type {
  AppLanguage,
  CrewMember,
  TripTask,
  TripTaskCategory,
} from '../types';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';
import { getTripTasksModalCopy } from '../i18n/packs/utilsAndModalsPack';

type TasksModalTab = 'list' | 'templates' | 'add';

interface TripTasksModalProps {
  open: boolean;
  onClose: () => void;
  tasks: TripTask[];
  crew: CrewMember[];
  claimedSeatId?: string;
  activeMemberId: string;
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

export const TripTasksModal: React.FC<TripTasksModalProps> = ({
  open,
  onClose,
  tasks,
  crew,
  claimedSeatId,
  activeMemberId,
  onToggleTask,
  onAddTask,
  onAiParseAndAddTasks,
  onUpdateTask,
  onDeleteTask,
  onCycleTaskOwner,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getTripTasksModalCopy(activeLang);

  const [activeTab, setActiveTab] = useState<TasksModalTab>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [addedTemplateKeys, setAddedTemplateKeys] = useState<Record<string, boolean>>({});

  // Edit state
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<TripTaskCategory>('门票预约');
  const [editTiming, setEditTiming] = useState('');
  const [editNote, setEditNote] = useState('');

  // Add tab state (AI + Manual)
  const [aiInput, setAiInput] = useState('');
  const [isParsingAi, setIsParsingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState<TripTaskCategory>('门票预约');
  const [manualTiming, setManualTiming] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualOwnerId, setManualOwnerId] = useState(crew[0]?.id || 'm1');

  const defaultOwner = useMemo(() => {
    if (activeMemberId !== 'all') return activeMemberId;
    if (claimedSeatId && crew.some((c) => c.id === claimedSeatId)) return claimedSeatId;
    return crew[0]?.id || 'm1';
  }, [activeMemberId, claimedSeatId, crew]);

  useEffect(() => {
    if (!open) return;
    setActiveTab('list');
    setStatusFilter('all');
    setAddedTemplateKeys({});
    setExpandedMenuId(null);
    setEditingId(null);
    setAiError('');
    setAddSuccess('');
    setManualOwnerId(defaultOwner);
  }, [open, defaultOwner]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const memberLookup = useMemo(() => {
    const map = new Map<string, CrewMember>();
    crew.forEach((m) => map.set(m.id, m));
    return map;
  }, [crew]);

  const scopedTasks = useMemo(
    () =>
      tasks.filter(
        (tk) => activeMemberId === 'all' || (tk.ownerId || 'm1') === activeMemberId
      ),
    [tasks, activeMemberId]
  );

  const doneCount = scopedTasks.filter((tk) => tk.done).length;
  const pendingCount = scopedTasks.length - doneCount;

  const visibleTasks = useMemo(
    () =>
      scopedTasks.filter((tk) => {
        if (statusFilter === 'todo') return !tk.done;
        if (statusFilter === 'done') return tk.done;
        return true;
      }),
    [scopedTasks, statusFilter]
  );

  const richTemplates = useMemo(() => {
    const base = getLocalizedTaskQuickPresets(activeLang);
    return [...base, ...copy.extraTemplates];
  }, [activeLang, copy]);

  const existingTitlesLower = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((tk) => {
      set.add(tk.title.trim().toLowerCase());
      set.add(translateDemoTaskTitle(tk.title, activeLang).trim().toLowerCase());
    });
    return set;
  }, [tasks, activeLang]);

  const submitAiTasks = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isParsingAi) return;
    setIsParsingAi(true);
    setAiError('');
    setAddSuccess('');
    try {
      const count = await onAiParseAndAddTasks(text, activeMemberId);
      setAiInput('');
      setAddSuccess(copy.addedCountToast(count));
    } catch (err) {
      if (err instanceof Error && err.message === 'PRO_PAYWALL_GATED') {
        return;
      }
      setAiError(
        err instanceof Error ? err.message : copy.aiUnavailable
      );
    } finally {
      setIsParsingAi(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    onAddTask({
      title: manualTitle.trim(),
      category: manualCategory,
      timing: manualTiming.trim() || copy.defaultTiming,
      note: manualNote.trim() || undefined,
      ownerId: manualOwnerId,
    });
    const addedTitle = manualTitle.trim();
    setManualTitle('');
    setManualTiming('');
    setManualNote('');
    setAddSuccess(copy.addedSingleSuccess(addedTitle));
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trip-tasks-modal-title"
      className="fixed inset-0 z-50 tk-bg-overlay p-0 sm:p-4 md:p-6 flex items-end sm:items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border tk-bc-hair bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[86vh] transition-all"
      >
        {/* Mobile Sheet Grab Handle */}
        <div
          aria-hidden="true"
          className="w-10 h-1.5 rounded-full tk-bg-forest-plate mx-auto mt-2.5 sm:hidden shrink-0"
        />

        {/* 1. Minimalist Packy-Style Single-Row Header */}
        <div className="px-5 pt-3 pb-2.5 sm:pt-4 sm:pb-3 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2
              id="trip-tasks-modal-title"
              className="text-base sm:text-lg font-extrabold tracking-tight tk-text-ink truncate"
            >
              {copy.modalTitle}
            </h2>
            <span className="text-xs font-semibold tk-text-forest tabular-nums whitespace-nowrap">
              {copy.doneProgress(doneCount, scopedTasks.length)}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full tk-text-ink hover:tk-bg-paper hover:tk-text-ink transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2. Packy-Style 3-Way Segmented Mode Switcher */}
        <div className="px-5 pb-3 bg-white shrink-0">
          <div
            role="tablist"
            className="grid grid-cols-3 gap-1 rounded-2xl tk-bg-forest-plate p-1"
          >
            {(
              [
                {
                  id: 'list' as TasksModalTab,
                  icon: ListTodo,
                  label: copy.tabList(pendingCount),
                },
                {
                  id: 'templates' as TasksModalTab,
                  icon: Sparkles,
                  label: copy.tabTemplates,
                },
                {
                  id: 'add' as TasksModalTab,
                  icon: Plus,
                  label: copy.tabAdd,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[50px] rounded-xl px-2 py-1.5 flex flex-col items-center justify-center gap-1 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
 isActive
 ? 'bg-white tk-text-ink shadow-xs font-bold'
 : 'tk-text-ink2 hover:tk-text-ink font-medium'
 }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
 isActive ? 'tk-text-forest' : 'tk-text-ink2'
 }`}
                  />
                  <span className="text-[11px] sm:text-xs leading-none truncate max-w-full tabular-nums">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3.5 min-h-[260px]">
          {/* TAB 1: TO-DOS LIST */}
          {activeTab === 'list' && (
            <>
              <HorizontalChipScroller
                activeKey={statusFilter}
                fadeBgClassName="from-white"
                ariaLabel={copy.filterAria}
              >
                {(
                  [
                    {
                      id: 'all' as const,
                      label: `${t('common.all')} (${scopedTasks.length})`,
                    },
                    {
                      id: 'todo' as const,
                      label: `${t('common.todo')} (${pendingCount})`,
                    },
                    {
                      id: 'done' as const,
                      label: `${t('common.done')} (${doneCount})`,
                    },
                  ] as const
                ).map((pill) => {
                  const isActive = statusFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      data-chip-active={isActive ? 'true' : undefined}
                      onClick={() => setStatusFilter(pill.id)}
                      className={`min-h-[36px] px-4 py-1.5 rounded-full text-xs font-bold tabular-nums whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 isActive
 ? 'tk-bg-forest text-white'
 : 'border tk-bc-hair bg-white tk-text-forest hover:tk-bg-forest-tint'
 }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </HorizontalChipScroller>

              {visibleTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed tk-bc-hair tk-bg-card px-4 py-8 text-center space-y-3">
                  <p className="text-xs tk-text-ink2">
                    {scopedTasks.length === 0
                      ? t('tasks.emptyAll')
                      : statusFilter === 'todo'
                      ? t('tasks.emptyTodo')
                      : t('tasks.emptyDone')}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('templates')}
                      className="rounded-xl tk-bg-forest px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      {copy.browseTemplatesBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('add')}
                      className="rounded-xl border tk-bc-hair bg-white px-3.5 py-2 text-xs font-bold tk-text-ink cursor-pointer"
                    >
                      + {t('tasks.addTaskBtn')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleTasks.map((task) => {
                    const taskOwner = memberLookup.get(task.ownerId || 'm1') || crew[0];
                    const iconMeta = resolveTaskCategoryIconMeta(task.category);
                    const isEditing = editingId === task.id;
                    const isMenuOpen = expandedMenuId === task.id;

                    if (isEditing) {
                      return (
                        <div
                          key={task.id}
                          className="rounded-2xl border tk-bc-forest tk-bg-paper p-3.5 space-y-2.5"
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-xl border tk-bc-hair bg-white px-3 py-1.5 text-xs font-semibold tk-text-ink"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value as TripTaskCategory)}
                              className="rounded-xl border tk-bc-hair bg-white px-2.5 py-1.5 text-xs font-semibold tk-text-ink"
                            >
                              {TASK_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {translateTaskCategory(cat, activeLang)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={editTiming}
                              onChange={(e) => setEditTiming(e.target.value)}
                              placeholder={t('tasks.timingPlaceholder')}
                              className="rounded-xl border tk-bc-hair bg-white px-2.5 py-1.5 text-xs tk-text-ink"
                            />
                          </div>
                          <input
                            type="text"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder={t('tasks.notePlaceholder')}
                            className="w-full rounded-xl border tk-bc-hair bg-white px-3 py-1.5 text-xs tk-text-ink2"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-lg border tk-bc-hair bg-white px-3 py-1 text-xs font-semibold tk-text-ink2 cursor-pointer"
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!editTitle.trim()) return;
                                onUpdateTask(task.id, {
                                  title: editTitle.trim(),
                                  category: editCategory,
                                  timing: editTiming.trim() || copy.defaultTiming,
                                  note: editNote.trim() || undefined,
                                });
                                setEditingId(null);
                              }}
                              className="rounded-lg tk-bg-forest px-3.5 py-1 text-xs font-semibold text-white cursor-pointer"
                            >
                              {t('common.save')}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={task.id}
                        className="rounded-2xl border tk-bc-hair bg-white overflow-hidden"
                      >
                        <div className="p-3.5 flex items-start justify-between gap-2.5">
                          <button
                            type="button"
                            onClick={() => onToggleTask(task.id)}
                            className="flex-1 min-w-0 flex items-start gap-3 text-left cursor-pointer"
                          >
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
 task.done
 ? 'tk-bc-forest tk-bg-forest text-white'
 : 'tk-bc-hair bg-white'
 }`}
                            >
                              {task.done && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div
                                className={`text-sm font-bold leading-snug ${
 task.done ? 'line-through tk-text-ink2' : 'tk-text-ink'
 }`}
                              >
                                {translateDemoTaskTitle(task.title, activeLang)}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs tk-text-ink2">
                                <AccentIconBadge
                                  accent={iconMeta.accent}
                                  icon={iconMeta.Icon}
                                  size="2xs"
                                  ring={false}
                                />
                                <span>{translateTaskCategory(task.category, activeLang)}</span>
                                <span>·</span>
                                <span className="tabular-nums">
                                  {translateTaskTiming(task.timing, activeLang)}
                                </span>
                              </div>
                              {task.note && (
                                <p className="mt-0.5 text-xs tk-text-ink2 leading-relaxed">
                                  {translateDemoTaskNote(task.note, activeLang)}
                                </p>
                              )}
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            {crew.length > 1 && taskOwner && (
                              <button
                                type="button"
                                onClick={() => onCycleTaskOwner(task.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-full cursor-pointer"
                              >
                                <span
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
 HERO_AVATAR_BG[taskOwner.accent]
 }`}
                                >
                                  {translateMemberInitials(taskOwner.initials, activeLang)}
                                </span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedMenuId((prev) => (prev === task.id ? null : task.id))
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg tk-text-ink2 hover:tk-bg-paper hover:tk-text-ink cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {isMenuOpen && (
                          <div className="border-t tk-bc-hair tk-bg-paper px-3.5 py-2 flex items-center justify-end gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(task.id);
                                setEditTitle(task.title);
                                setEditCategory(task.category);
                                setEditTiming(task.timing);
                                setEditNote(task.note ?? '');
                                setExpandedMenuId(null);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border tk-bc-hair bg-white px-2.5 py-1 font-semibold tk-text-ink cursor-pointer"
                            >
                              <Pencil className="h-3 w-3 tk-text-forest" />
                              {t('common.edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTask(task.id);
                                setExpandedMenuId(null);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border tk-bc-danger-hair bg-white px-2.5 py-1 font-semibold tk-text-danger cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                              {t('common.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: PRE-TRIP TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-2.5">
              {richTemplates.map((tpl) => {
                const isAdded =
                  existingTitlesLower.has(tpl.title.toLowerCase()) ||
                  Boolean(addedTemplateKeys[tpl.label]);
                const iconMeta = resolveTaskCategoryIconMeta(tpl.category);

                return (
                  <div
                    key={tpl.label}
                    className="rounded-2xl border tk-bc-hair bg-white p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">
                        <AccentIconBadge
                          accent={iconMeta.accent}
                          icon={iconMeta.Icon}
                          size="md"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold tk-text-ink truncate">
                          {tpl.title}
                        </div>
                        <div className="mt-0.5 text-xs tk-text-ink2">
                          {translateTaskCategory(tpl.category, activeLang)} · {tpl.timing}
                        </div>
                        <p className="mt-0.5 text-xs tk-text-ink2 truncate">{tpl.note}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isAdded && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualTitle(tpl.title);
                            setManualCategory(tpl.category);
                            setManualTiming(tpl.timing);
                            setManualNote(tpl.note);
                            setActiveTab('add');
                          }}
                          className="px-2 py-1.5 text-xs font-semibold tk-text-ink2 hover:tk-text-ink whitespace-nowrap cursor-pointer"
                        >
                          {copy.tweakBtn}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => {
                          onAddTask({
                            title: tpl.title,
                            category: tpl.category,
                            timing: tpl.timing,
                            note: tpl.note,
                            ownerId: defaultOwner,
                          });
                          setAddedTemplateKeys((prev) => ({ ...prev, [tpl.label]: true }));
                        }}
                        className={`h-9 inline-flex items-center justify-center gap-1 rounded-xl px-3.5 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
 isAdded
 ? 'tk-bg-forest-tint tk-text-forest border tk-bc-hair cursor-default'
 : 'tk-bg-forest text-white hover:tk-bg-press'
 }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>{copy.addedBtn}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>{copy.addBtn}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: ADD NEW TO-DO (AI VOICE + STRUCTURED) */}
          {activeTab === 'add' && (
            <div className="space-y-4">
              {/* Quick AI Sentence / Voice Parser */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitAiTasks(aiInput);
                }}
                className="space-y-2"
              >
                <label className="block text-xs font-bold tk-text-ink2">
                  {copy.voiceAddLabel}
                </label>
                <div className="flex items-center gap-2 rounded-2xl border tk-bc-hair tk-bg-paper pl-3.5 pr-2 py-1.5 focus-within:tk-bc-forest focus-within:bg-white transition-colors">
                  <Sparkles className="h-4 w-4 tk-text-forest shrink-0" />
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder={t('tasks.desktopPlaceholder')}
                    className="flex-1 min-w-0 bg-transparent py-1 text-xs sm:text-sm tk-text-ink placeholder:tk-text-ink2 focus:outline-none"
                  />
                  <AiVoiceInputButton
                    iconOnly
                    compact
                    contextHint="task"
                    disabled={isParsingAi}
                    label={t('tasks.voiceFillTitle')}
                    onTranscript={async (txt) => {
                      setAiInput(txt);
                      await submitAiTasks(txt);
                    }}
                    onError={(msg) => setAiError(msg)}
                  />
                  <button
                    type="submit"
                    disabled={isParsingAi || !aiInput.trim()}
                    className="h-8 inline-flex items-center justify-center gap-1 rounded-xl tk-bg-forest px-3 text-xs font-bold text-white hover:tk-bg-press disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isParsingAi ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>{copy.aiAddBtn}</span>
                    )}
                  </button>
                </div>
                {aiError && <p className="text-xs font-medium tk-text-warning">{aiError}</p>}
              </form>

              <div className="border-t tk-bc-hair pt-3.5">
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold tk-text-ink2">
                      {copy.manualDetailsLabel}
                    </label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder={t('tasks.taskNamePlaceholder')}
                      className="w-full rounded-xl border tk-bc-hair tk-bg-paper px-3.5 py-2.5 text-sm font-semibold tk-text-ink focus:tk-bc-forest focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value as TripTaskCategory)}
                      className="rounded-xl border tk-bc-hair tk-bg-paper px-3 py-2 text-xs font-semibold tk-text-ink focus:tk-bc-forest focus:bg-white focus:outline-none"
                    >
                      {TASK_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {translateTaskCategory(cat, activeLang)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={manualTiming}
                      onChange={(e) => setManualTiming(e.target.value)}
                      placeholder={t('tasks.timingPlaceholder')}
                      className="rounded-xl border tk-bc-hair tk-bg-paper px-3 py-2 text-xs tk-text-ink focus:tk-bc-forest focus:bg-white focus:outline-none"
                    />
                  </div>

                  <input
                    type="text"
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    placeholder={t('tasks.notePlaceholder')}
                    className="w-full rounded-xl border tk-bc-hair tk-bg-paper px-3.5 py-2 text-xs tk-text-ink2 focus:tk-bc-forest focus:bg-white focus:outline-none"
                  />

                  {crew.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs tk-text-ink2 mr-1">
                        {copy.assignToLabel}
                      </span>
                      {crew.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setManualOwnerId(m.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${
 manualOwnerId === m.id
 ? 'tk-bc-forest tk-bg-forest text-white'
 : 'tk-bc-hair bg-white tk-text-ink2'
 }`}
                        >
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
 HERO_AVATAR_BG[m.accent]
 }`}
                          >
                            {translateMemberInitials(m.initials, activeLang)}
                          </span>
                          <span>{translateMemberName(m.name, activeLang)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {addSuccess && (
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold tk-text-forest">
                      <Check className="h-3.5 w-3.5 tk-text-forest shrink-0" />
                      <span>{addSuccess}</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={!manualTitle.trim()}
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-2xl tk-bg-forest px-4 py-2.5 text-sm font-bold text-white hover:tk-bg-press disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t('tasks.confirmAdd')}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
