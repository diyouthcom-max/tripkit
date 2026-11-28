import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  UserPlus,
  Copy,
  Check,
  QrCode,
  Link2,
  Share2,
  ShieldCheck,
  Cloud,
  CloudOff,
  Loader2,
  LogOut,
  Users,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { signOut, type User } from 'firebase/auth';
import {
  auth,
  formatCloudSyncError,
  FIREBASE_PROJECT_ID,
  FIRESTORE_REGION,
} from '../firebase';
import { signInWithGoogleInteractive } from '../services/googleSignIn';
import {
  buildRoomInviteUrl,
  createCloudTripRoom,
  fetchMyMemberSeat,
  fetchMyRecentRooms,
  fetchRoomPreview,
  isValidRoomCode,
  joinRoomAndClaimSeat,
  normalizeRoomCode,
  type JoinedRoomBookmark,
  type TripRoomDoc,
} from '../services/cloudSync';
import { useTranslation } from 'react-i18next';
import {
  translateDemoCrewRole,
  translateMemberInitials,
  translateMemberName,
} from '../i18n';
import type { AppLanguage, CrewMember, SeatId, TripState } from '../types';
import { HERO_AVATAR_BG } from '../utils/accentTheme';
import { tkColor } from '../utils/tkColor';
import { normalizeAppLanguage } from '../utils/preferencesHelpers';
import { getCrewInviteCopy } from '../i18n/packs/crewInvitePack';

interface CrewInviteModalProps {
  open: boolean;
  onClose: () => void;
  trip: TripState;
  authUser: User | null;
  authReady: boolean;
  activeRoomId: string | null;
  claimedSeatId: SeatId;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  lastSyncedByName?: string;
  initialJoinCode?: string | null;
  onClearInitialJoinCode?: () => void;
  onConnectedToRoom: (payload: {
    roomId: string;
    seatId: SeatId;
    nextTrip: TripState;
    revision: number;
  }) => void;
  onChangeClaimedSeatLocal: (seatId: SeatId) => void;
  onDisconnectRoom: () => void;
  onUpdateCrewMember: (
    memberId: string,
    updates: Partial<Pick<CrewMember, 'name' | 'role'>>
  ) => void;
  onAddCompanionSeatLocal: (name: string, role: string) => void;
  onRemoveCompanionSeatLocal?: (memberId: string) => void;
  onRequireProForRoomCreation?: () => boolean;
  onOpenAuthModal?: () => void;
  onToast: (msg: string) => void;
}

const ALL_SEATS: SeatId[] = ['m1', 'm2', 'm3', 'm4'];

export const CrewInviteModal: React.FC<CrewInviteModalProps> = ({
  open,
  onClose,
  trip,
  authUser,
  authReady,
  activeRoomId,
  claimedSeatId,
  syncStatus,
  lastSyncedByName,
  initialJoinCode,
  onClearInitialJoinCode,
  onConnectedToRoom,
  onChangeClaimedSeatLocal,
  onDisconnectRoom,
  onUpdateCrewMember,
  onAddCompanionSeatLocal,
  onRemoveCompanionSeatLocal,
  onRequireProForRoomCreation,
  onOpenAuthModal,
  onToast,
}) => {
  const { t, i18n } = useTranslation();
  const activeLang: AppLanguage = normalizeAppLanguage(i18n.language, 'en-US');
  const copy = getCrewInviteCopy(activeLang);

  const [modalTab, setModalTab] = useState<'invite' | 'join'>('invite');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [showSecurityGuide, setShowSecurityGuide] = useState(false);

  // Join & Seat Claim state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [roomPreview, setRoomPreview] = useState<TripRoomDoc | null>(null);
  const [selectedClaimSeat, setSelectedClaimSeat] = useState<SeatId>('m2');
  const [claimNickname, setClaimNickname] = useState('');
  const [claimRole, setClaimRole] = useState('');
  const [recentRooms, setRecentRooms] = useState<JoinedRoomBookmark[]>([]);

  // Inline roster edit state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editNameDraft, setEditNameDraft] = useState('');
  const [editRoleDraft, setEditRoleDraft] = useState('');
  const [addingLocalSeat, setAddingLocalSeat] = useState(false);
  const [newSeatName, setNewSeatName] = useState('');
  const [newSeatRole, setNewSeatRole] = useState(() => copy.fallbackPeer);

  useEffect(() => {
    setNewSeatRole(copy.fallbackPeer);
  }, [copy.fallbackPeer]);

  const markCopied = (key: string, toastText: string) => {
    setCopiedKey(key);
    onToast(toastText);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2200);
  };

  const copyText = async (text: string, key: string, toastText: string) => {
    try {
      await navigator.clipboard.writeText(text);
      markCopied(key, toastText);
    } catch {
      onToast(copy.clipboardBlocked);
    }
  };

  // Switch to Join tab automatically when opened via ?room=XXXXXX URL link
  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    if (initialJoinCode) {
      const normalized = normalizeRoomCode(initialJoinCode);
      setModalTab('join');
      setJoinCodeInput(normalized);
    } else {
      setModalTab('invite');
    }
  }, [open, initialJoinCode]);

  // Load recent rooms (strictly limit(5)) when signed in & viewing Join tab
  useEffect(() => {
    if (!open || !authReady || !authUser) {
      setRecentRooms([]);
      return;
    }
    let cancelled = false;
    fetchMyRecentRooms(authUser.uid)
      .then((list) => {
        if (!cancelled) setRecentRooms(list);
      })
      .catch(() => {
        // Non-blocking bookmark list
      });
    return () => {
      cancelled = true;
    };
  }, [open, authReady, authUser, activeRoomId]);

  const loadRoomForClaim = useCallback(
    async (rawCode: string, currentUser: User) => {
      const code = normalizeRoomCode(rawCode);
      if (!isValidRoomCode(code)) {
        setErrorMsg(copy.invalidCodeErr);
        return;
      }
      setBusyAction('lookup');
      setErrorMsg(null);
      try {
        const [found, existingMyMember] = await Promise.all([
          fetchRoomPreview(code),
          fetchMyMemberSeat(code, currentUser.uid),
        ]);
        if (!found) {
          setRoomPreview(null);
          setErrorMsg(copy.roomNotFoundErr(code));
          return;
        }
        if (found.status === 'archived') {
          setRoomPreview(null);
          setErrorMsg(copy.roomArchivedErr(code));
          return;
        }
        setRoomPreview(found);

        const crewList = found.tripPayload?.crew || [];
        let defaultSeat: SeatId = 'm2';
        if (existingMyMember) {
          defaultSeat = existingMyMember.seatId;
        } else {
          const matchedByUid = crewList.find((c) => c.claimedByUid === currentUser.uid);
          if (matchedByUid && ALL_SEATS.includes(matchedByUid.id as SeatId)) {
            defaultSeat = matchedByUid.id as SeatId;
          } else {
            const unclaimedCompanion = crewList.find(
              (c, idx) => idx > 0 && !c.claimedByUid && ALL_SEATS.includes(c.id as SeatId)
            );
            if (unclaimedCompanion) {
              defaultSeat = unclaimedCompanion.id as SeatId;
            } else if (crewList.length < 4) {
              defaultSeat = ALL_SEATS[crewList.length];
            } else {
              defaultSeat = 'm2';
            }
          }
        }
        setSelectedClaimSeat(defaultSeat);

        const seatObj = crewList.find((c) => c.id === defaultSeat);
        if (existingMyMember) {
          setClaimNickname(existingMyMember.displayName);
          setClaimRole(existingMyMember.role);
        } else if (seatObj) {
          setClaimNickname(
            seatObj.name === '本人'
              ? currentUser.displayName || copy.fallbackPeer
              : translateMemberName(seatObj.name, activeLang)
          );
          setClaimRole(seatObj.role || copy.fallbackPeer);
        } else {
          setClaimNickname(currentUser.displayName?.slice(0, 24) || copy.newCompanionName);
          setClaimRole(copy.newCompanionRole);
        }
      } catch (err) {
        setErrorMsg(formatCloudSyncError(err));
      } finally {
        setBusyAction(null);
      }
    },
    [copy, activeLang]
  );

  // Auto-lookup when initialJoinCode is present and user is authenticated
  useEffect(() => {
    if (!open || !initialJoinCode || !authReady || !authUser) return;
    const normalized = normalizeRoomCode(initialJoinCode);
    if (isValidRoomCode(normalized)) {
      void loadRoomForClaim(normalized, authUser);
      onClearInitialJoinCode?.();
    }
  }, [open, initialJoinCode, authReady, authUser, loadRoomForClaim, onClearInitialJoinCode]);

  if (!open) return null;

  const handleGoogleSignIn = async () => {
    setBusyAction('signin');
    setErrorMsg(null);
    try {
      const result = await signInWithGoogleInteractive();
      if (result.status === 'redirecting') {
        return;
      }
      onToast(copy.googleSignedInToast);
    } catch (err) {
      setErrorMsg(formatCloudSyncError(err));
    } finally {
      setBusyAction(null);
    }
  };

  const handleSignOut = async () => {
    setBusyAction('signout');
    setErrorMsg(null);
    try {
      if (activeRoomId) {
        onDisconnectRoom();
      }
      await signOut(auth);
      setRoomPreview(null);
      onToast(copy.signedOutToast);
    } catch (err) {
      setErrorMsg(formatCloudSyncError(err));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateCloudRoom = async () => {
    if (onRequireProForRoomCreation && onRequireProForRoomCreation()) {
      return;
    }
    if (!authUser) return;
    setBusyAction('create');
    setErrorMsg(null);
    try {
      const res = await createCloudTripRoom({
        trip,
        user: authUser,
      });
      onConnectedToRoom({
        roomId: res.roomId,
        seatId: res.seatId,
        nextTrip: res.updatedTrip,
        revision: res.revision,
      });
      onToast(copy.roomCreatedToast(res.roomId));
    } catch (err) {
      setErrorMsg(formatCloudSyncError(err));
    } finally {
      setBusyAction(null);
    }
  };

  const handleSelectClaimSeatOption = (seatId: SeatId) => {
    setSelectedClaimSeat(seatId);
    const existingSeat = roomPreview?.tripPayload?.crew?.find((c) => c.id === seatId);
    if (existingSeat) {
      setClaimNickname(
        existingSeat.name === '本人' && seatId !== 'm1'
          ? authUser?.displayName || translateMemberName(existingSeat.name, activeLang)
          : translateMemberName(existingSeat.name, activeLang)
      );
      setClaimRole(existingSeat.role || copy.fallbackPeer);
    } else {
      setClaimNickname(authUser?.displayName?.slice(0, 24) || copy.fallbackPeer);
      setClaimRole(copy.fallbackPeer);
    }
  };

  const handleConfirmClaimSeat = async () => {
    if (!authUser || !roomPreview) return;
    setBusyAction('claim');
    setErrorMsg(null);
    try {
      const { nextTrip, nextRevision } = await joinRoomAndClaimSeat({
        room: roomPreview,
        user: authUser,
        seatId: selectedClaimSeat,
        nickname: claimNickname,
        role: claimRole,
      });
      onConnectedToRoom({
        roomId: roomPreview.roomId,
        seatId: selectedClaimSeat,
        nextTrip,
        revision: nextRevision,
      });
      onToast(
        copy.joinedRoomToast(roomPreview.roomId, claimNickname || selectedClaimSeat)
      );
      onClose();
    } catch (err) {
      setErrorMsg(formatCloudSyncError(err));
    } finally {
      setBusyAction(null);
    }
  };

  const inviteUrl = activeRoomId ? buildRoomInviteUrl(activeRoomId) : '';
  const wechatInviteCardText = activeRoomId
    ? copy.inviteCardText({
        routeTitle: trip.intel.routeTitle,
        days: trip.setup.days,
        departureDate: trip.setup.departureDate,
        roomId: activeRoomId,
        inviteUrl,
      })
    : '';

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async () => {
    if (!activeRoomId || !canNativeShare) return;
    try {
      await navigator.share({
        title: copy.shareTitle(trip.intel.routeTitle),
        text: copy.shareText(activeRoomId),
        url: inviteUrl,
      });
    } catch {
      // User cancelled share sheet
    }
  };

  const startInlineEdit = (m: CrewMember) => {
    setEditingMemberId(m.id);
    setEditNameDraft(translateMemberName(m.name, activeLang));
    setEditRoleDraft(m.role);
  };

  const saveInlineEdit = (memberId: string) => {
    const cleanName = editNameDraft.trim().slice(0, 40);
    const cleanRole = editRoleDraft.trim().slice(0, 60);
    if (!cleanName) return;
    onUpdateCrewMember(memberId, {
      name: cleanName,
      role: cleanRole || copy.fallbackPeer,
    });
    setEditingMemberId(null);
    onToast(copy.updatedCompanionToast(cleanName));
  };

  return (
    <div
      className="[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] fixed inset-0 z-50 flex items-end sm:items-center justify-center tk-bg-overlay p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border tk-bc-hair bg-white tk-elev-soft flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b tk-bc-hair bg-white/95 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base font-extrabold tracking-tight tk-text-ink">
                {copy.modalTitle}
              </h2>
              {activeRoomId ? (
                <span className="inline-flex items-center gap-1.5 rounded-md tk-bg-forest-tint px-2 py-0.5 text-[13px] font-bold tk-text-forest">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
 syncStatus === 'syncing'
 ? 'tk-bg-warning animate-pulse'
 : syncStatus === 'error'
 ? 'tk-bg-danger'
 : 'tk-bg-forest'
 }`}
                  />
                  {copy.cloudRoomBadge} <span className="font-serif tabular-nums">{activeRoomId}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md tk-bg-forest-plate px-2 py-0.5 text-[13px] font-semibold tk-text-ink2">
                  <CloudOff className="h-3 w-3" />
                  {copy.localOnlyBadge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm tk-text-ink2 truncate">
              {activeRoomId
                ? copy.subtitleActive(FIRESTORE_REGION, lastSyncedByName)
                : copy.subtitleIdle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[16px] p-2 tk-text-ink2 hover:tk-bg-paper hover:tk-text-ink transition-colors cursor-pointer"
            aria-label={copy.closeAria}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Google Auth Gate Banner */}
          {!authReady ? (
            <div className="flex items-center justify-center gap-2 rounded-[20px] border tk-bc-hair tk-bg-paper py-6 text-sm font-semibold tk-text-ink2">
              <Loader2 className="h-4 w-4 animate-spin tk-text-forest" />
              {copy.checkingSession}
            </div>
          ) : !authUser ? (
            <div className="rounded-[20px] border tk-bc-hair tk-bg-warning-tint p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="space-y-1">
                <div className="font-serif flex items-center gap-1.5 text-sm font-bold tk-text-ink">
                  <ShieldCheck className="h-4 w-4 tk-text-forest shrink-0" />
                  {copy.signInTitle}
                </div>
                <p className="text-sm tk-text-ink2 leading-relaxed">
                  {copy.signInDesc}
                </p>
              </div>
              <button
                type="button"
                disabled={busyAction === 'signin'}
                onClick={() => {
                  if (onOpenAuthModal) {
                    onOpenAuthModal();
                  } else {
                    void handleGoogleSignIn();
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-[16px] tk-bg-forest px-4 py-2.5 text-sm font-bold text-white hover:tk-bg-forest disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
              >
                {busyAction === 'signin' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {copy.signInBtn}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-[20px] border tk-bc-hair tk-bg-paper px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full tk-bg-forest text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {(authUser.displayName || authUser.email || copy.avatarFallbackChar)
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-sm font-bold tk-text-ink truncate">
                    {authUser.displayName || copy.defaultTravelerName}
                  </div>
                  <div className="text-[13px] tk-text-ink2 truncate">
                    {copy.signedInReady}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={busyAction === 'signout'}
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 rounded-lg border tk-bc-hair bg-white px-2.5 py-1.5 text-[13px] font-semibold tk-text-ink2 hover:tk-text-ink cursor-pointer shrink-0"
              >
                <LogOut className="h-3 w-3" />
                {copy.signOutBtn}
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="rounded-[16px] border tk-bc-danger-hair tk-bg-danger-tint px-3.5 py-2.5 flex items-start gap-2 text-sm tk-text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed break-all">{errorMsg}</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 rounded-[16px] tk-bg-warning-tint p-1 text-sm font-bold">
            <button
              type="button"
              onClick={() => {
                setModalTab('invite');
                setErrorMsg(null);
              }}
              className={`rounded-lg py-2 transition-colors cursor-pointer ${
 modalTab === 'invite'
 ? 'bg-white tk-text-forest shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
            >
              {copy.tabInvite}
            </button>
            <button
              type="button"
              onClick={() => {
                setModalTab('join');
                setErrorMsg(null);
              }}
              className={`rounded-lg py-2 transition-colors cursor-pointer ${
 modalTab === 'join'
 ? 'bg-white tk-text-forest shadow-xs'
 : 'tk-text-ink2 hover:tk-text-ink'
 }`}
            >
              {copy.tabJoin}
            </button>
          </div>

          {modalTab === 'invite' ? (
            <div className="space-y-5">
              {/* Cloud Room Creation OR 3-in-1 Invite Card */}
              {!activeRoomId ? (
                <div className="rounded-[20px] border tk-bc-hair tk-bg-card p-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-serif text-sm font-extrabold tk-text-ink">
                        {copy.createRoomTitle(trip.intel.routeTitle)}
                      </div>
                      <p className="mt-1 text-sm tk-text-ink2 leading-relaxed">
                        {copy.createRoomDescBefore}
                        <strong>{copy.createRoomDescStrong}</strong>
                        {copy.createRoomDescAfter}
                      </p>
                    </div>
                    <Cloud className="h-5 w-5 tk-text-forest shrink-0 mt-0.5" />
                  </div>
                  <button
                    type="button"
                    disabled={!authUser || busyAction === 'create'}
                    onClick={handleCreateCloudRoom}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-[16px] tk-bg-forest px-4 py-3 text-sm font-bold text-white hover:tk-bg-press disabled:opacity-45 transition-colors cursor-pointer"
                  >
                    {busyAction === 'create' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {copy.creatingRoomBtn}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        {authUser ? copy.createRoomBtn : copy.signInFirstBtn}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="rounded-[20px] border tk-bc-hair tk-bg-forest-tint p-4 space-y-4">
                  {/* 1. 6-Char Invite Code */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b tk-bc-hair">
                    <div>
                      <div className="text-[13px] font-bold uppercase tracking-wider tk-text-ink2">
                        {copy.step1CodeLabel}
                      </div>
                      <div className="mt-1 font-serif tabular-nums text-2xl font-extrabold tracking-[0.22em] tk-text-forest">
                        {activeRoomId}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            activeRoomId,
                            'code',
                            copy.copiedCodeToast(activeRoomId)
                          )
                        }
                        className="font-serif inline-flex items-center gap-1.5 rounded-[16px] border tk-bc-hair bg-white px-3 py-2 text-sm font-bold tk-text-ink hover:tk-bc-forest hover:tk-text-forest transition-colors cursor-pointer"
                      >
                        {copiedKey === 'code' ? (
                          <Check className="h-4 w-4 tk-text-forest" />
                        ) : (
                          <Copy className="h-4 w-4 tk-text-forest" />
                        )}
                        {copy.copyCodeBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQrPanel((v) => !v)}
                        className={`inline-flex items-center gap-1.5 rounded-[16px] border px-3 py-2 text-sm font-bold transition-colors cursor-pointer ${
 showQrPanel
 ? 'tk-bc-forest tk-bg-forest-tint tk-text-forest'
 : 'tk-bc-hair bg-white tk-text-ink2 hover:tk-bc-forest'
 }`}
                      >
                        <QrCode className="h-4 w-4" />
                        {copy.qrCodeBtn}
                      </button>
                    </div>
                  </div>

                  {/* 2. Face-to-Face QR Code Drawer */}
                  {showQrPanel && (
                    <div className="rounded-[20px] border tk-bc-hair bg-white p-4 flex flex-col sm:flex-row items-center gap-4">
                      <div className="rounded-[16px] border tk-bc-hair bg-white p-2.5 shrink-0">
                        <QRCodeSVG
                          value={inviteUrl}
                          size={136}
                          level="M"
                          bgColor={tkColor('--tk-card')}
                          fgColor={tkColor('--tk-ink')}
                        />
                      </div>
                      <div className="space-y-1.5 text-center sm:text-left">
                        <div className="font-serif text-sm font-extrabold tk-text-ink">
                          {copy.step3QrTitle}
                        </div>
                        <p className="text-sm tk-text-ink2 leading-relaxed">
                          {copy.step3QrDesc(trip.intel.routeTitle)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 3. Direct Invite Link + Formatted Copy */}
                  <div className="space-y-2.5">
                    <div className="text-[13px] font-bold tk-text-ink2">
                      {copy.step2LinkLabel}
                    </div>
                    <div className="flex items-center gap-2 rounded-[16px] border tk-bc-hair bg-white px-3 py-2">
                      <Link2 className="h-4 w-4 tk-text-forest shrink-0" />
                      <span className="font-serif tabular-nums text-sm tk-text-ink truncate flex-1">
                        {inviteUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            inviteUrl,
                            'url',
                            copy.copiedLinkToast
                          )
                        }
                        className="text-sm font-bold tk-text-forest hover:underline shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'url' ? t('common.copied') : copy.copyLinkBtn}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            wechatInviteCardText,
                            'wechat',
                            copy.copiedInviteMsgToast
                          )
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[16px] tk-bg-forest px-3.5 py-2.5 text-sm font-bold text-white hover:tk-bg-press transition-colors cursor-pointer"
                      >
                        {copiedKey === 'wechat' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copy.copyInviteMsgBtn}
                      </button>
                      {canNativeShare && (
                        <button
                          type="button"
                          onClick={handleNativeShare}
                          className="font-serif inline-flex items-center justify-center gap-1.5 rounded-[16px] border tk-bc-hair bg-white px-3.5 py-2.5 text-sm font-bold tk-text-ink hover:tk-bc-forest transition-colors cursor-pointer"
                        >
                          <Share2 className="h-4 w-4 tk-text-forest" />
                          {copy.shareBtn}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Current Crew Roster & Seat Perspective Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-serif flex items-center gap-1.5 text-sm font-extrabold tk-text-ink">
                    <Users className="h-4 w-4 tk-text-forest" />
                    {copy.seatsHeading(trip.crew.length)}
                  </div>
                  {trip.crew.length < 4 && !addingLocalSeat && (
                    <button
                      type="button"
                      onClick={() => setAddingLocalSeat(true)}
                      className="text-sm font-bold tk-text-forest hover:underline cursor-pointer"
                    >
                      {copy.addSeatBtnLink}
                    </button>
                  )}
                </div>

                {addingLocalSeat && (
                  <div className="rounded-[16px] border tk-bc-hair tk-bg-forest-tint p-3 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        maxLength={40}
                        value={newSeatName}
                        onChange={(e) => setNewSeatName(e.target.value)}
                        placeholder={copy.nicknamePlaceholder}
                        className="rounded-lg border tk-bc-hair bg-white px-3 py-1.5 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                      />
                      <input
                        type="text"
                        maxLength={60}
                        value={newSeatRole}
                        onChange={(e) => setNewSeatRole(e.target.value)}
                        placeholder={copy.rolePlaceholder}
                        className="rounded-lg border tk-bc-hair bg-white px-3 py-1.5 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingLocalSeat(false);
                          setNewSeatName('');
                        }}
                        className="rounded-lg px-2.5 py-1 text-sm font-semibold tk-text-ink2 cursor-pointer"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = newSeatName.trim();
                          if (!trimmed) {
                            onToast(copy.enterNameToast);
                            return;
                          }
                          onAddCompanionSeatLocal(
                            trimmed,
                            newSeatRole.trim() || copy.fallbackPeer
                          );
                          setNewSeatName('');
                          setAddingLocalSeat(false);
                        }}
                        className="rounded-lg tk-bg-forest px-3 py-1.5 text-sm font-bold text-white cursor-pointer"
                      >
                        {copy.addSeatBtn}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {trip.crew.map((member) => {
                    const seatId = (ALL_SEATS.includes(member.id as SeatId)
                      ? member.id
                      : 'm1') as SeatId;
                    const isMyActiveSeat = claimedSeatId === seatId;
                    const isEditing = editingMemberId === member.id;
                    const displayName = translateMemberName(member.name, activeLang);
                    const displayInitials = translateMemberInitials(member.initials, activeLang);

                    return (
                      <div
                        key={member.id}
                        className={`rounded-[16px] border px-3.5 py-2.5 transition-colors ${
 isMyActiveSeat
 ? 'tk-bc-forest tk-bg-forest-tint'
 : 'tk-bc-hair bg-white'
 }`}
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                maxLength={40}
                                value={editNameDraft}
                                onChange={(e) => setEditNameDraft(e.target.value)}
                                placeholder={copy.editNicknamePlaceholder}
                                className="rounded-lg border tk-bc-hair bg-white px-2.5 py-1.5 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                              />
                              <input
                                type="text"
                                maxLength={60}
                                value={editRoleDraft}
                                onChange={(e) => setEditRoleDraft(e.target.value)}
                                placeholder={copy.editRolePlaceholder}
                                className="rounded-lg border tk-bc-hair bg-white px-2.5 py-1.5 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingMemberId(null)}
                                className="px-2.5 py-1 text-sm font-semibold tk-text-ink2 cursor-pointer"
                              >
                                {t('common.cancel')}
                              </button>
                              <button
                                type="button"
                                onClick={() => saveInlineEdit(member.id)}
                                className="rounded-lg tk-bg-forest px-3 py-1 text-sm font-bold text-white cursor-pointer"
                              >
                                {t('common.save')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${
 HERO_AVATAR_BG[member.accent] || HERO_AVATAR_BG.teal
 }`}
                              >
                                {displayInitials}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-serif text-sm font-bold tk-text-ink truncate">
                                    {displayName}
                                  </span>
                                  {member.claimedByUid && (
                                    <span className="inline-flex items-center gap-0.5 rounded tk-bg-forest-tint px-1.5 py-0.5 text-[13px] font-bold tk-text-forest">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      {copy.claimedBadge}
                                    </span>
                                  )}
                                  {isMyActiveSeat && (
                                    <span className="rounded tk-bg-ink px-1.5 py-0.5 text-[13px] font-bold text-white">
                                      {copy.activeViewBadge}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[13px] tk-text-ink2 truncate">
                                  {translateDemoCrewRole(member.role, activeLang)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!isMyActiveSeat && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onChangeClaimedSeatLocal(seatId);
                                    onToast(copy.switchViewToast(displayName));
                                  }}
                                  className="rounded-lg border tk-bc-hair bg-white px-2.5 py-1 text-[13px] font-semibold tk-text-ink2 hover:tk-bc-forest hover:tk-text-forest cursor-pointer"
                                >
                                  {copy.switchViewBtn}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => startInlineEdit(member)}
                                className="rounded-lg p-1.5 tk-text-ink2 hover:tk-bg-forest-tint hover:tk-text-ink cursor-pointer"
                                aria-label={copy.editMemberLabel(displayName)}
                                title={copy.editMemberLabel(displayName)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {member.id !== 'm1' &&
                                !member.claimedByUid &&
                                onRemoveCompanionSeatLocal && (
                                  <button
                                    type="button"
                                    onClick={() => onRemoveCompanionSeatLocal(member.id)}
                                    className="rounded-lg p-1.5 tk-text-ink2 hover:tk-bg-danger-tint hover:tk-text-danger cursor-pointer"
                                    aria-label={copy.removeMemberLabel(displayName)}
                                    title={copy.removeMemberLabel(displayName)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {activeRoomId && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onDisconnectRoom();
                      onToast(copy.disconnectToast);
                    }}
                    className="text-sm font-semibold tk-text-ink2 hover:underline cursor-pointer"
                  >
                    {copy.disconnectBtn}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Join Room & Claim Seat View */
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-serif block text-sm font-bold tk-text-ink">
                  {copy.enterCodeLabel}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(normalizeRoomCode(e.target.value))}
                    placeholder={copy.codePlaceholder}
                    className="flex-1 rounded-[16px] border tk-bc-hair tk-bg-paper px-3.5 py-2.5 font-serif tabular-nums text-base font-extrabold tracking-[0.2em] uppercase tk-text-ink placeholder:tracking-normal placeholder:font-normal placeholder:text-sm focus:tk-bc-forest focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!authUser || busyAction === 'lookup' || joinCodeInput.length < 6}
                    onClick={() => authUser && loadRoomForClaim(joinCodeInput, authUser)}
                    className="inline-flex items-center gap-1.5 rounded-[16px] tk-bg-forest px-4 py-2.5 text-sm font-bold text-white hover:tk-bg-press disabled:opacity-45 transition-colors cursor-pointer shrink-0"
                  >
                    {busyAction === 'lookup' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {copy.findRoomBtn}
                  </button>
                </div>
              </div>

              {/* Seat Claiming Card once roomPreview is loaded */}
              {roomPreview && (
                <div className="rounded-[20px] border tk-bc-forest tk-bg-forest-tint p-4 space-y-4">
                  <div className="flex items-start justify-between gap-2 border-b tk-bc-hair pb-3">
                    <div>
                      <div className="text-[13px] font-bold tk-text-forest">
                        {copy.foundRoomPrefix}
                        <span className="font-serif tabular-nums">{roomPreview.roomId}</span>
                      </div>
                      <div className="font-serif mt-0.5 text-sm font-extrabold tk-text-ink">
                        {roomPreview.routeTitle}
                      </div>
                      <div className="mt-0.5 text-sm tk-text-ink2">
                        {copy.organizerRev(roomPreview.ownerName)}
                        <span className="font-serif tabular-nums">v{roomPreview.revision}</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Choose which seat to claim */}
                  <div className="space-y-2">
                    <div className="font-serif text-sm font-bold tk-text-ink">
                      {copy.step1ClaimTitle}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(roomPreview.tripPayload?.crew || []).slice(0, 4).map((seat) => {
                        const sid = (ALL_SEATS.includes(seat.id as SeatId)
                          ? seat.id
                          : 'm1') as SeatId;
                        const active = selectedClaimSeat === sid;
                        const claimedByOther =
                          Boolean(seat.claimedByUid) && seat.claimedByUid !== authUser?.uid;
                        const claimedByMe =
                          Boolean(seat.claimedByUid) && seat.claimedByUid === authUser?.uid;
                        const seatDisplayName = translateMemberName(seat.name, activeLang);

                        return (
                          <button
                            key={sid}
                            type="button"
                            onClick={() => handleSelectClaimSeatOption(sid)}
                            className={`text-left rounded-[16px] border p-2.5 transition-colors cursor-pointer ${
 active
 ? 'tk-bc-forest bg-white ring-1 tk-ring-forest'
 : 'tk-bc-hair bg-white/75 hover:tk-bc-forest'
 }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-serif text-sm font-extrabold tk-text-ink truncate">
                                {copy.iAmName(seatDisplayName)}
                              </span>
                              {claimedByMe ? (
                                <span className="rounded tk-bg-forest-tint px-1.5 py-0.5 text-[13px] font-bold tk-text-forest">
                                  {copy.mySeatBadge}
                                </span>
                              ) : claimedByOther ? (
                                <span className="rounded tk-bg-warning-tint px-1.5 py-0.5 text-[13px] font-semibold tk-text-warning">
                                  {copy.takenBadge}
                                </span>
                              ) : (
                                <span className="rounded tk-bg-forest-tint px-1.5 py-0.5 text-[13px] font-semibold tk-text-ink2">
                                  {copy.openBadge}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[13px] tk-text-ink2 truncate">
                              {translateDemoCrewRole(seat.role, activeLang)}
                            </div>
                          </button>
                        );
                      })}

                      {(roomPreview.tripPayload?.crew?.length || 0) < 4 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectClaimSeatOption(
                              ALL_SEATS[roomPreview.tripPayload?.crew?.length || 1]
                            )
                          }
                          className={`text-left rounded-[16px] border border-dashed p-2.5 transition-colors cursor-pointer ${
 selectedClaimSeat ===
 ALL_SEATS[roomPreview.tripPayload?.crew?.length || 1]
 ? 'tk-bc-forest bg-white ring-1 tk-ring-forest'
 : 'tk-bc-hair bg-white/60 hover:tk-bc-forest'
 }`}
                        >
                          <div className="text-sm font-extrabold tk-text-forest">
                            {copy.joinAsNewTitle}
                          </div>
                          <div className="mt-0.5 text-[13px] tk-text-ink2">
                            {copy.joinAsNewSub}
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Confirm Nickname & Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[13px] font-bold tk-text-ink2 mb-1">
                        {copy.myNicknameLabel}
                      </label>
                      <input
                        type="text"
                        maxLength={40}
                        value={claimNickname}
                        onChange={(e) => setClaimNickname(e.target.value)}
                        placeholder={copy.nicknameEgPlaceholder}
                        className="font-serif w-full rounded-[16px] border tk-bc-hair bg-white px-3 py-2 text-base sm:text-sm font-semibold tk-text-ink focus:tk-bc-forest focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold tk-text-ink2 mb-1">
                        {copy.tripRoleLabel}
                      </label>
                      <input
                        type="text"
                        maxLength={60}
                        value={claimRole}
                        onChange={(e) => setClaimRole(e.target.value)}
                        placeholder={copy.roleEgPlaceholder}
                        className="w-full rounded-[16px] border tk-bc-hair bg-white px-3 py-2 text-base sm:text-sm tk-text-ink focus:tk-bc-forest focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busyAction === 'claim'}
                    onClick={handleConfirmClaimSeat}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-[16px] tk-bg-forest px-4 py-3 text-sm font-bold text-white hover:tk-bg-press disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {busyAction === 'claim' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {copy.claimingBtn}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {copy.claimBtn}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Recent Joined Rooms Bookmarks (limit(5)) */}
              {authUser && recentRooms.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-[13px] font-bold tk-text-ink2">
                    {copy.recentRoomsTitle}
                  </div>
                  <div className="space-y-1.5">
                    {recentRooms.map((bm) => (
                      <button
                        key={bm.roomId}
                        type="button"
                        onClick={() => {
                          setJoinCodeInput(bm.roomId);
                          void loadRoomForClaim(bm.roomId, authUser);
                        }}
                        className="w-full flex items-center justify-between gap-2 rounded-[16px] border tk-bc-hair tk-bg-paper px-3.5 py-2.5 text-left hover:tk-bc-forest transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="font-serif text-sm font-bold tk-text-ink truncate">
                            {bm.routeTitle}
                          </div>
                          <div className="text-[13px] tk-text-ink2">
                            {copy.codePrefix}
                            <span className="font-serif tabular-nums font-bold tk-text-forest">{bm.roomId}</span>
                            {copy.seatPrefix}
                            <span className="font-serif tabular-nums">{bm.seatId.toUpperCase()}</span>
                          </div>
                        </div>
                        <span className="text-sm font-bold tk-text-forest shrink-0">
                          {copy.reconnectBtn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Rules & GCP Billing Budget Alert Guide */}
          <div className="rounded-[20px] border tk-bc-hair tk-bg-paper overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSecurityGuide((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left cursor-pointer"
            >
              <div className="font-serif flex items-center gap-2 text-sm font-bold tk-text-ink">
                <ShieldCheck className="h-4 w-4 tk-text-forest shrink-0" />
                <span>{copy.securityGuideTitle}</span>
              </div>
              {showSecurityGuide ? (
                <ChevronUp className="h-4 w-4 tk-text-ink2 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 tk-text-ink2 shrink-0" />
              )}
            </button>

            {showSecurityGuide && (
              <div className="border-t tk-bc-hair px-4 py-3.5 space-y-3 text-sm tk-text-ink2 leading-relaxed">
                <div className="space-y-1">
                  <div className="font-bold tk-text-ink">{copy.sec1Title}</div>
                  <ul className="list-disc pl-4 space-y-1 text-[13px]">
                    <li>
                      <strong>{copy.sec1SingleRegionTitle}</strong>
                      {copy.sec1SingleRegionA}
                      <code className="font-serif tabular-nums font-bold tk-text-forest">
                        {FIRESTORE_REGION}
                      </code>
                      {copy.sec1SingleRegionB}
                    </li>
                    <li>
                      <strong>{copy.sec1ExactReadsTitle}</strong>
                      {copy.sec1ExactReadsA}
                      <code className="font-serif tabular-nums">doc(db, &apos;rooms&apos;, roomId)</code>
                      {copy.sec1ExactReadsB}
                      <code className="font-serif tabular-nums">allow list: if false</code>
                      {copy.sec1ExactReadsC}
                      <code className="font-serif tabular-nums">limit(5)</code>.
                    </li>
                    <li>
                      <strong>{copy.sec1RateLimitsTitle}</strong>
                      {copy.sec1RateLimitsDesc}
                    </li>
                  </ul>
                </div>

                <div className="space-y-1.5 pt-1 border-t tk-bc-hair">
                  <div className="font-bold tk-text-ink">{copy.sec2Title}</div>
                  <ol className="list-decimal pl-4 space-y-1 text-[13px]">
                    <li>
                      {copy.sec2Step1A}
                      <strong>Google Cloud Console</strong>
                      {copy.sec2Step1B}
                      <strong>{copy.sec2Step1C}</strong>
                    </li>
                    <li>
                      {copy.sec2Step2Prefix}
                      <span className="inline-flex items-center gap-1 ml-1">
                        <code className="font-serif tabular-nums rounded bg-white border tk-bc-hair px-1.5 py-0.5 tk-text-ink">
                          {FIREBASE_PROJECT_ID}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              FIREBASE_PROJECT_ID,
                              'gcp_pid',
                              copy.copiedProjectToast(FIREBASE_PROJECT_ID)
                            )
                          }
                          className="tk-text-forest font-bold hover:underline cursor-pointer"
                        >
                          {copiedKey === 'gcp_pid' ? t('common.copied') : copy.copyProjectIdBtn}
                        </button>
                      </span>
                    </li>
                    <li>
                      {copy.sec2Step3Prefix}
                      <span className="font-serif tabular-nums font-bold">{copy.sec2Step3Mid}</span>
                      {copy.sec2Step3Suffix}
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
