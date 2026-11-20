import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ADMIN_OWNER_EMAIL, loadAppPreferences } from '../utils/preferencesHelpers';
import { pickLang } from '../i18n/langHelper';

export type RedeemPlanType = 'annual' | 'lifetime';

export interface RedeemCodeRecord {
  code: string;
  planType: RedeemPlanType;
  durationDays: number;
  status: 'unused' | 'redeemed';
  note: string;
  createdBy: string;
  redeemedBy: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface CloudEntitlementRecord {
  uid: string;
  planType: RedeemPlanType;
  redeemedCode: string;
  durationDays: number;
  activatedAtMs: number;
  expiresAtMs: number | null;
}

export interface RedeemActivationResult {
  code: string;
  planType: RedeemPlanType;
  durationDays: number;
  expiresAtMs: number | null;
  restoredExisting: boolean;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REDEEM_CODE_REGEX = /^TK(1Y|LT)-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

export class RedeemUserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedeemUserFacingError';
  }
}

export function isVerifiedAdminUser(user: User | null | undefined): boolean {
  return Boolean(
    user &&
      user.emailVerified &&
      typeof user.email === 'string' &&
      user.email.toLowerCase() === ADMIN_OWNER_EMAIL
  );
}

export function normalizeRedeemCodeInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`;
}

export function isValidRedeemCodeFormat(code: string): boolean {
  return code.length === 14 && REDEEM_CODE_REGEX.test(code);
}

function randomCodeSegment(len = 4): string {
  const bytes = new Uint32Array(len);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i += 1) {
      bytes[i] = Math.floor(Math.random() * 1_000_000);
    }
  }
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function buildRandomRedeemCode(planType: RedeemPlanType): string {
  const prefix = planType === 'lifetime' ? 'TKLT' : 'TK1Y';
  return `${prefix}-${randomCodeSegment(4)}-${randomCodeSegment(4)}`;
}

function parseTimestampMs(val: unknown): number {
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  if (
    val &&
    typeof val === 'object' &&
    'seconds' in val &&
    typeof (val as { seconds: unknown }).seconds === 'number'
  ) {
    return (val as { seconds: number }).seconds * 1000;
  }
  return Date.now();
}

export async function generateAdminRedeemCodes(params: {
  user: User;
  planType: RedeemPlanType;
  count: number;
  note: string;
}): Promise<RedeemCodeRecord[]> {
  const { user, planType } = params;
  if (!isVerifiedAdminUser(user)) {
    throw new RedeemUserFacingError(
      pickLang(loadAppPreferences().language, {
        'zh-CN': '仅限主理人已验证账号生成授权兑换码',
        'en-US': 'Only the verified admin account can generate redemption codes.',
        'es-MX': 'Solo la cuenta administradora verificada puede generar códigos.',
        'fr-FR': 'Seul le compte administrateur vérifié peut générer des codes.',
        'de-DE': 'Nur das verifizierte Admin-Konto kann Einlösecodes erstellen.',
        'pt-BR': 'Somente a conta administradora verificada pode gerar códigos.',
        'ja-JP': '認証済み管理者アカウントのみ特典コードを発行できます。',
      })
    );
  }

  const safeCount = Math.max(1, Math.min(10, Math.round(params.count) || 1));
  const safeNote = (params.note || '').trim().slice(0, 80);
  const durationDays = planType === 'lifetime' ? 36500 : 365;
  const nowMs = Date.now();

  const batch = writeBatch(db);
  const createdRecords: RedeemCodeRecord[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < safeCount; i += 1) {
    let code = buildRandomRedeemCode(planType);
    while (usedIds.has(code)) {
      code = buildRandomRedeemCode(planType);
    }
    usedIds.add(code);

    const ref = doc(db, 'redeemCodes', code);
    batch.set(ref, {
      code,
      planType,
      durationDays,
      status: 'unused',
      note: safeNote,
      createdBy: user.uid,
      redeemedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    createdRecords.push({
      code,
      planType,
      durationDays,
      status: 'unused',
      note: safeNote,
      createdBy: user.uid,
      redeemedBy: '',
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    });
  }

  try {
    await batch.commit();
    return createdRecords;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'redeemCodes');
  }
}

export async function fetchAdminRedeemCodes(user: User): Promise<RedeemCodeRecord[]> {
  if (!isVerifiedAdminUser(user)) {
    return [];
  }
  const q = query(
    collection(db, 'redeemCodes'),
    where('createdBy', '==', user.uid),
    limit(50)
  );
  try {
    const snap = await getDocs(q);
    const items: RedeemCodeRecord[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (!data || typeof data.code !== 'string') return;
      items.push({
        code: data.code,
        planType: data.planType === 'lifetime' ? 'lifetime' : 'annual',
        durationDays: typeof data.durationDays === 'number' ? data.durationDays : 365,
        status: data.status === 'redeemed' ? 'redeemed' : 'unused',
        note: typeof data.note === 'string' ? data.note : '',
        createdBy: typeof data.createdBy === 'string' ? data.createdBy : user.uid,
        redeemedBy: typeof data.redeemedBy === 'string' ? data.redeemedBy : '',
        createdAtMs: parseTimestampMs(data.createdAt),
        updatedAtMs: parseTimestampMs(data.updatedAt),
      });
    });
    return items.sort((a, b) => b.createdAtMs - a.createdAtMs);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'redeemCodes');
  }
}

export async function deleteAdminRedeemCode(code: string): Promise<void> {
  const normalized = normalizeRedeemCodeInput(code);
  if (!isValidRedeemCodeFormat(normalized)) return;
  const path = `redeemCodes/${normalized}`;
  try {
    await deleteDoc(doc(db, 'redeemCodes', normalized));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fetchMyCloudEntitlement(
  uid: string
): Promise<CloudEntitlementRecord | null> {
  if (!uid) return null;
  const path = `users/${uid}/entitlements/pro`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'entitlements', 'pro'));
    if (!snap.exists()) return null;
    const data = snap.data();
    const planType: RedeemPlanType = data.planType === 'lifetime' ? 'lifetime' : 'annual';
    const durationDays = typeof data.durationDays === 'number' ? data.durationDays : 365;
    const activatedAtMs = parseTimestampMs(data.activatedAt);
    const expiresAtMs =
      planType === 'lifetime' ? null : activatedAtMs + durationDays * 86_400_000;
    return {
      uid,
      planType,
      redeemedCode: typeof data.redeemedCode === 'string' ? data.redeemedCode : '',
      durationDays,
      activatedAtMs,
      expiresAtMs,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function redeemProCodeWithCloud(params: {
  rawCode: string;
  user: User;
}): Promise<RedeemActivationResult> {
  const lang = loadAppPreferences().language;
  const code = normalizeRedeemCodeInput(params.rawCode);
  if (!isValidRedeemCodeFormat(code)) {
    throw new RedeemUserFacingError(
      pickLang(lang, {
        'zh-CN': '兑换码格式不正确：请输入 12 位授权码（如 TK1Y-8K4M-9X2P，不含数字 0 和 1）',
        'en-US': 'Invalid code format: enter a 12-character license code (e.g. TK1Y-8K4M-9X2P, excluding digits 0 and 1).',
        'es-MX': 'Formato de código inválido: ingresa un código de 12 caracteres (ej. TK1Y-8K4M-9X2P).',
        'fr-FR': 'Format de code invalide : saisissez un code à 12 caractères (ex. TK1Y-8K4M-9X2P).',
        'de-DE': 'Ungültiges Codeformat: Gib einen 12-stelligen Lizenzcode ein (z. B. TK1Y-8K4M-9X2P).',
        'pt-BR': 'Formato inválido: digite o código de 12 caracteres (ex.: TK1Y-8K4M-9X2P).',
        'ja-JP': 'コード形式が正しくありません：12桁のライセンスコード（例：TK1Y-8K4M-9X2P）を入力してください。',
      })
    );
  }
  if (!params.user.emailVerified) {
    throw new RedeemUserFacingError(
      pickLang(lang, {
        'zh-CN': '请使用已验证邮箱的 Google 账号登录以绑定 1 年授权',
        'en-US': 'Please sign in with a verified Google account to bind your 1-Year Pro license.',
        'es-MX': 'Inicia sesión con una cuenta verificada para vincular tu licencia Pro de 1 año.',
        'fr-FR': 'Connectez-vous avec un compte vérifié pour lier votre licence Pro d’un an.',
        'de-DE': 'Melde dich mit einem verifizierten Konto an, um deine 1-Jahres-Pro-Lizenz zu verknüpfen.',
        'pt-BR': 'Entre com uma conta verificada para vincular sua licença Pro de 1 ano.',
        'ja-JP': '1年間の Pro ライセンスを紐付けるため、認証済みアカウントでログインしてください。',
      })
    );
  }

  const codePath = `redeemCodes/${code}`;
  let codeData: Record<string, unknown> | undefined;
  try {
    const codeSnap = await getDoc(doc(db, 'redeemCodes', code));
    if (codeSnap.exists()) {
      codeData = codeSnap.data() as Record<string, unknown>;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, codePath);
  }

  if (!codeData) {
    throw new RedeemUserFacingError(
      pickLang(lang, {
        'zh-CN': '未找到该兑换码，请核对字母与数字是否输入有误',
        'en-US': 'Redemption code not found — please double-check the letters and digits.',
        'es-MX': 'Código no encontrado. Verifica las letras y dígitos.',
        'fr-FR': 'Code introuvable — vérifiez les lettres et chiffres saisis.',
        'de-DE': 'Code nicht gefunden — bitte Buchstaben und Ziffern prüfen.',
        'pt-BR': 'Código não encontrado — confira as letras e dígitos.',
        'ja-JP': 'コードが見つかりません。文字と数字をもう一度ご確認ください。',
      })
    );
  }

  const planType: RedeemPlanType =
    codeData.planType === 'lifetime' ? 'lifetime' : 'annual';
  const durationDays = planType === 'lifetime' ? 36500 : 365;

  if (codeData.status === 'redeemed') {
    if (codeData.redeemedBy === params.user.uid) {
      // Idempotent restore for the exact same owner who already redeemed this code
      const existingEnt = await fetchMyCloudEntitlement(params.user.uid);
      const fallbackExpires =
        planType === 'lifetime' ? null : Date.now() + durationDays * 86_400_000;
      return {
        code,
        planType,
        durationDays,
        expiresAtMs: existingEnt ? existingEnt.expiresAtMs : fallbackExpires,
        restoredExisting: true,
      };
    }
    throw new RedeemUserFacingError(
      pickLang(lang, {
        'zh-CN': '该兑换码已被激活使用（一码仅限一人兑换）。如需申领新授权码，请联系主理人 WhatsApp 或 Facebook。',
        'en-US': 'This redemption code has already been used (1 code per user). Message us on WhatsApp or Facebook to claim a new free code.',
        'es-MX': 'Este código ya fue usado (1 por usuario). Escríbenos por WhatsApp o Facebook para pedir uno nuevo.',
        'fr-FR': 'Ce code a déjà été utilisé (1 code par utilisateur). Contactez-nous sur WhatsApp ou Facebook pour en obtenir un nouveau.',
        'de-DE': 'Dieser Code wurde bereits eingelöst (1 Code pro Nutzer). Schreib uns auf WhatsApp oder Facebook für einen neuen Code.',
        'pt-BR': 'Este código já foi resgatado (1 por usuário). Fale conosco no WhatsApp ou Facebook para solicitar um novo.',
        'ja-JP': 'このコードはすでに使用済みです（1人1コードまで）。新しいコードが必要な場合は WhatsApp または Facebook よりご連絡ください。',
      })
    );
  }

  const batch = writeBatch(db);
  const codeRef = doc(db, 'redeemCodes', code);
  const entRef = doc(db, 'users', params.user.uid, 'entitlements', 'pro');

  batch.update(codeRef, {
    status: 'redeemed',
    redeemedBy: params.user.uid,
    updatedAt: serverTimestamp(),
  });

  batch.set(entRef, {
    uid: params.user.uid,
    planType,
    redeemedCode: code,
    durationDays,
    activatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, codePath);
  }

  const expiresAtMs =
    planType === 'lifetime' ? null : Date.now() + durationDays * 86_400_000;

  return {
    code,
    planType,
    durationDays,
    expiresAtMs,
    restoredExisting: false,
  };
}
