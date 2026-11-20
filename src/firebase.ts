import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  initializeFirestore,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { loadAppPreferences } from './utils/preferencesHelpers';
import type { AppLanguage } from './types';

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;
export const FIRESTORE_REGION = 'asia-southeast1';

// Suppress noisy internal WebChannel 10s offline fallback console.error logs
// so local-first usage on restricted/offline networks never triggers false crash alerts.
setLogLevel('silent');

const app = initializeApp(firebaseConfig);

// Force HTTP long-polling in browsers to avoid 10-second WebChannel hangs behind
// HTTP proxies, VPNs, and restrictive middleboxes.
export const db = initializeFirestore(
  app,
  typeof window !== 'undefined'
    ? {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      }
    : {
        ignoreUndefinedProperties: true,
      },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export let isCloudBackendReachable = true;

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    isCloudBackendReachable = true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes('the client is offline') ||
      msg.includes('Could not reach Cloud Firestore') ||
      msg.includes('unavailable')
    ) {
      isCloudBackendReachable = false;
      console.warn(
        '[Trip Kit] Cloud Firestore is unreachable on the current network; operating in local-first offline mode.'
      );
    } else {
      // e.g. PERMISSION_DENIED confirms the Firestore backend responded properly
      isCloudBackendReachable = true;
    }
  }
}
void testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const rawErrMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: rawErrMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  const isTransientNetworkOffline =
    rawErrMsg.includes('the client is offline') ||
    rawErrMsg.includes('Could not reach Cloud Firestore') ||
    rawErrMsg.includes('unavailable');

  if (isTransientNetworkOffline) {
    console.warn('Firestore Offline Warning: ', JSON.stringify(errInfo));
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }

  throw new Error(JSON.stringify(errInfo));
}

import { pickLang } from './i18n/langHelper';

export function formatCloudSyncError(err: unknown, langOverride?: AppLanguage): string {
  const lang: AppLanguage = langOverride ?? loadAppPreferences().language ?? 'zh-CN';
  const rawMessage = err instanceof Error ? err.message : String(err);
  let innerError = rawMessage;

  try {
    const parsed = JSON.parse(rawMessage) as Partial<FirestoreErrorInfo>;
    if (parsed && typeof parsed.error === 'string') {
      innerError = parsed.error;
    }
  } catch {
    // Not a JSON-wrapped FirestoreErrorInfo string
  }

  if (
    innerError.includes('the client is offline') ||
    innerError.includes('Could not reach Cloud Firestore') ||
    innerError.includes('unavailable')
  ) {
    return pickLang(lang, {
      'zh-CN': '当前网络暂无法连接云端同步服务（如使用网络代理，请确认已放行 firestore.googleapis.com）；本地打包、行程与记账功能均正常可用。',
      'en-US': 'Unable to reach Cloud Sync right now (if using a proxy/VPN, please allow firestore.googleapis.com). Local packing, itinerary, and budget features remain fully available.',
      'es-MX': 'No se pudo conectar con la sincronización en la nube ahora mismo. Tus listas, itinerarios y gastos locales siguen funcionando sin problema.',
      'fr-FR': 'Impossible de joindre la synchronisation cloud pour le moment. Vos listes, itinéraires et dépenses locales restent pleinement disponibles.',
      'de-DE': 'Cloud-Sync ist derzeit nicht erreichbar. Lokale Packlisten, Reisepläne und Ausgaben bleiben weiterhin voll nutzbar.',
      'pt-BR': 'Não foi possível conectar à sincronização na nuvem agora. Suas listas, roteiros e gastos locais continuam funcionando normalmente.',
      'ja-JP': '現在クラウド同期に接続できません（VPN等をご利用の場合は firestore.googleapis.com を許可してください）。ローカルのパッキング・旅程・家計簿機能はそのまま使えます。',
    });
  }

  if (
    innerError.includes(
      "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
    )
  ) {
    const url = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;
    return pickLang(lang, {
      'zh-CN': `今日免费读取额度已达上限（次日自动重置）。升级或查看额度：${url}`,
      'en-US': `Daily free read quota reached (resets automatically tomorrow). View or upgrade quota: ${url}`,
      'es-MX': `Se alcanzó el límite diario gratuito de lecturas (se reinicia mañana): ${url}`,
      'fr-FR': `Quota quotidien de lectures gratuites atteint (réinitialisé demain) : ${url}`,
      'de-DE': `Tägliches kostenloses Lesekontingent erreicht (wird morgen zurückgesetzt): ${url}`,
      'pt-BR': `Cota diária gratuita de leituras atingida (reinicia amanhã): ${url}`,
      'ja-JP': `本日の無料読み取り上限に達しました（翌日自動リセット）: ${url}`,
    });
  }

  if (innerError.includes('Quota exceeded')) {
    return pickLang(lang, {
      'zh-CN': '云端当日免费配额已达上限（次日自动重置），详情可参考 Firebase 定价页 Spark / Enterprise 说明。',
      'en-US': 'Daily free cloud quota reached (resets tomorrow). See Firebase Spark / Enterprise pricing for details.',
      'es-MX': 'Se alcanzó la cuota gratuita diaria en la nube (se reinicia mañana).',
      'fr-FR': 'Quota cloud gratuit quotidien atteint (réinitialisé demain).',
      'de-DE': 'Tägliches kostenloses Cloud-Kontingent erreicht (wird morgen zurückgesetzt).',
      'pt-BR': 'Cota diária gratuita na nuvem atingida (reinicia amanhã).',
      'ja-JP': '本日のクラウド無料枠に達しました（翌日自動リセットされます）。',
    });
  }

  if (
    innerError.includes('Missing or insufficient permissions') ||
    innerError.includes('PERMISSION_DENIED')
  ) {
    return pickLang(lang, {
      'zh-CN': '云端安全规则拦截了本次请求（可能触发了防刷频率限制：建房需间隔 10 秒/上限 20 个，或连续写入间隔不足 1 秒，请稍候重试）。',
      'en-US': 'Cloud security rules blocked this request (rate-limit protection may have triggered: 10s between new rooms / max 20 rooms, or <1s between rapid writes — please retry shortly).',
      'es-MX': 'Las reglas de seguridad bloquearon esta solicitud por límite de frecuencia. Intenta de nuevo en unos segundos.',
      'fr-FR': 'Les règles de sécurité cloud ont bloqué cette requête (limitation de fréquence temporaire). Réessayez dans un instant.',
      'de-DE': 'Cloud-Sicherheitsregeln haben die Anfrage vorübergehend blockiert (Ratenlimit). Bitte kurz warten und erneut versuchen.',
      'pt-BR': 'As regras de segurança bloquearam esta solicitação temporariamente (limite de frequência). Tente novamente em instantes.',
      'ja-JP': 'クラウドのセキュリティルールによりリクエストが制限されました（短時間の連続操作など）。少し待ってから再試行してください。',
    });
  }

  if (innerError.includes('popup-closed-by-user')) {
    return pickLang(lang, {
      'zh-CN': '已取消 Google 登录窗口',
      'en-US': 'Google sign-in window was closed',
      'es-MX': 'Se cerró la ventana de inicio de sesión con Google',
      'fr-FR': 'La fenêtre de connexion Google a été fermée',
      'de-DE': 'Das Google-Anmeldefenster wurde geschlossen',
      'pt-BR': 'A janela de login com o Google foi fechada',
      'ja-JP': 'Google ログインウィンドウが閉じられました',
    });
  }

  if (innerError.includes('popup-blocked')) {
    return pickLang(lang, {
      'zh-CN': '浏览器拦截了登录弹窗，请允许当前页面的弹窗权限后重试',
      'en-US': 'Sign-in popup was blocked by your browser — please allow popups for this page and try again',
      'es-MX': 'Tu navegador bloqueó la ventana de inicio de sesión. Permite las ventanas emergentes e intenta de nuevo.',
      'fr-FR': 'La fenêtre de connexion a été bloquée par votre navigateur. Autorisez les pop-ups puis réessayez.',
      'de-DE': 'Das Anmelde-Popup wurde vom Browser blockiert. Bitte Pop-ups erlauben und erneut versuchen.',
      'pt-BR': 'O pop-up de login foi bloqueado pelo navegador. Permita pop-ups para esta página e tente novamente.',
      'ja-JP': 'ログインのポップアップがブラウザにブロックされました。ポップアップを許可して再試行してください。',
    });
  }

  return (
    innerError ||
    pickLang(lang, {
      'zh-CN': '云端同步操作失败，请稍后重试',
      'en-US': 'Cloud sync failed. Please try again shortly.',
      'es-MX': 'Falló la sincronización en la nube. Intenta de nuevo en breve.',
      'fr-FR': 'La synchronisation cloud a échoué. Veuillez réessayer dans un instant.',
      'de-DE': 'Cloud-Sync fehlgeschlagen. Bitte versuchen Sie es gleich erneut.',
      'pt-BR': 'Falha na sincronização na nuvem. Tente novamente em instantes.',
      'ja-JP': 'クラウド同期に失敗しました。しばらくしてから再試行してください。',
    })
  );
}

export function formatAuthError(err: unknown, langOverride?: AppLanguage): string {
  const lang: AppLanguage = langOverride ?? loadAppPreferences().language ?? 'zh-CN';
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const msg = err instanceof Error ? err.message : String(err || '');
  const combined = `${code} ${msg}`;

  if (combined.includes('popup-closed-by-user') || combined.includes('cancelled-popup-request')) {
    return pickLang(lang, {
      'zh-CN': '已取消登录窗口。',
      'en-US': 'Sign-in window was closed.',
      'es-MX': 'Se cerró la ventana de inicio de sesión.',
      'fr-FR': 'La fenêtre de connexion a été fermée.',
      'de-DE': 'Das Anmeldefenster wurde geschlossen.',
      'pt-BR': 'A janela de login foi fechada.',
      'ja-JP': 'ログインウィンドウが閉じられました。',
    });
  }
  if (combined.includes('popup-blocked')) {
    return pickLang(lang, {
      'zh-CN': '浏览器拦截了登录弹窗，请允许当前页面弹窗后重试。',
      'en-US': 'Sign-in popup was blocked by your browser. Please allow popups and try again.',
      'es-MX': 'Tu navegador bloqueó la ventana emergente. Permítela e intenta de nuevo.',
      'fr-FR': 'La fenêtre de connexion a été bloquée. Autorisez les pop-ups et réessayez.',
      'de-DE': 'Das Anmelde-Popup wurde blockiert. Bitte Pop-ups zulassen und erneut versuchen.',
      'pt-BR': 'O pop-up de login foi bloqueado. Libere os pop-ups e tente novamente.',
      'ja-JP': 'ポップアップがブロックされました。ブラウザで許可して再試行してください。',
    });
  }
  if (combined.includes('operation-not-allowed') || combined.includes('configuration-not-found')) {
    return pickLang(lang, {
      'zh-CN': '该登录方式尚未在 Firebase 控制台开启。请先使用 Google 一键登录，或在 Firebase Authentication 中开启 Apple / 邮箱登录开关。',
      'en-US': 'This sign-in method is not yet enabled in Firebase Console. Please use Google Sign-In for now, or enable Apple / Email in Firebase Authentication.',
      'es-MX': 'Este método de acceso aún no está habilitado en la consola. Usa Google por ahora.',
      'fr-FR': 'Cette méthode de connexion n’est pas encore activée. Utilisez Google pour le moment.',
      'de-DE': 'Diese Anmeldemethode ist noch nicht aktiviert. Bitte nutzen Sie vorerst Google.',
      'pt-BR': 'Este método de login ainda não está ativado. Use o login com Google por enquanto.',
      'ja-JP': 'このログイン方法はまだ有効化されていません。現在は Google ログインをご利用ください。',
    });
  }
  if (combined.includes('invalid-email')) {
    return pickLang(lang, {
      'zh-CN': '请输入有效的电子邮箱地址。',
      'en-US': 'Please enter a valid email address.',
      'es-MX': 'Ingresa un correo electrónico válido.',
      'fr-FR': 'Veuillez saisir une adresse e-mail valide.',
      'de-DE': 'Bitte gib eine gültige E-Mail-Adresse ein.',
      'pt-BR': 'Digite um endereço de e-mail válido.',
      'ja-JP': '有効なメールアドレスを入力してください。',
    });
  }
  if (
    combined.includes('invalid-credential') ||
    combined.includes('wrong-password') ||
    combined.includes('user-not-found')
  ) {
    return pickLang(lang, {
      'zh-CN': '邮箱或密码不正确，请核对后重试。',
      'en-US': 'Incorrect email or password. Please try again.',
      'es-MX': 'Correo o contraseña incorrectos. Verifica e intenta de nuevo.',
      'fr-FR': 'E-mail ou mot de passe incorrect. Veuillez réessayer.',
      'de-DE': 'E-Mail oder Passwort falsch. Bitte erneut versuchen.',
      'pt-BR': 'E-mail ou senha incorretos. Tente novamente.',
      'ja-JP': 'メールアドレスまたはパスワードが正しくありません。',
    });
  }
  if (combined.includes('email-already-in-use')) {
    return pickLang(lang, {
      'zh-CN': '该邮箱已注册，请直接切换为登录或找回密码。',
      'en-US': 'This email is already registered. Please switch to Sign In.',
      'es-MX': 'Este correo ya está registrado. Cambia a Iniciar sesión.',
      'fr-FR': 'Cet e-mail est déjà enregistré. Passez à la connexion.',
      'de-DE': 'Diese E-Mail ist bereits registriert. Bitte melde dich an.',
      'pt-BR': 'Este e-mail já está cadastrado. Faça login ou redefina a senha.',
      'ja-JP': 'このメールアドレスはすでに登録されています。ログインに切り替えてください。',
    });
  }
  if (combined.includes('weak-password')) {
    return pickLang(lang, {
      'zh-CN': '密码长度至少需要 6 位字符。',
      'en-US': 'Password must be at least 6 characters.',
      'es-MX': 'La contraseña debe tener al menos 6 caracteres.',
      'fr-FR': 'Le mot de passe doit contenir au moins 6 caractères.',
      'de-DE': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
      'pt-BR': 'A senha deve ter pelo menos 6 caracteres.',
      'ja-JP': 'パスワードは6文字以上で入力してください。',
    });
  }
  if (combined.includes('too-many-requests')) {
    return pickLang(lang, {
      'zh-CN': '尝试次数过多，请稍候片刻再试。',
      'en-US': 'Too many attempts. Please wait a moment and try again.',
      'es-MX': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
      'fr-FR': 'Trop de tentatives. Patientez un moment avant de réessayer.',
      'de-DE': 'Zu viele Versuche. Bitte warte einen Moment.',
      'pt-BR': 'Muitas tentativas. Aguarde um instante e tente novamente.',
      'ja-JP': '試行回数が上限を超えました。しばらく待ってから再試行してください。',
    });
  }
  if (combined.includes('requires-recent-login')) {
    return pickLang(lang, {
      'zh-CN': '为保障账号安全，删除账号前需要先重新验证一次登录身份。',
      'en-US': 'For your security, please re-verify your sign-in before deleting your account.',
      'es-MX': 'Por seguridad, vuelve a verificar tu identidad antes de eliminar tu cuenta.',
      'fr-FR': 'Par sécurité, veuillez vous reconnecter avant de supprimer votre compte.',
      'de-DE': 'Zu deiner Sicherheit musst du dich vor dem Löschen erneut anmelden.',
      'pt-BR': 'Por segurança, confirme seu login novamente antes de excluir a conta.',
      'ja-JP': 'セキュリティ保護のため、アカウント削除の前に再認証が必要です。',
    });
  }
  if (combined.includes('network-request-failed')) {
    return pickLang(lang, {
      'zh-CN': '网络连接异常，请检查网络状态后重试。',
      'en-US': 'Network error during sign-in. Please check your connection.',
      'es-MX': 'Error de red al iniciar sesión. Revisa tu conexión.',
      'fr-FR': 'Erreur réseau lors de la connexion. Vérifiez votre accès.',
      'de-DE': 'Netzwerkfehler bei der Anmeldung. Bitte Verbindung prüfen.',
      'pt-BR': 'Erro de rede ao entrar. Verifique sua conexão.',
      'ja-JP': 'ログイン中にネットワークエラーが発生しました。接続をご確認ください。',
    });
  }
  if (combined.includes('account-exists-with-different-credential')) {
    return pickLang(lang, {
      'zh-CN': '该邮箱已通过其他登录方式注册，请使用原方式登录。',
      'en-US': 'An account already exists with this email using another sign-in provider.',
      'es-MX': 'Ya existe una cuenta con este correo usando otro proveedor.',
      'fr-FR': 'Un compte existe déjà avec cet e-mail via un autre fournisseur.',
      'de-DE': 'Mit dieser E-Mail existiert bereits ein Konto über einen anderen Anbieter.',
      'pt-BR': 'Já existe uma conta com este e-mail usando outro método de login.',
      'ja-JP': 'このメールアドレスは別のログイン方法で既に登録されています。',
    });
  }

  return pickLang(lang, {
    'zh-CN': '登录未能完成，请稍后重试。',
    'en-US': 'Sign-in could not be completed. Please try again.',
    'es-MX': 'No se pudo completar el inicio de sesión. Intenta de nuevo.',
    'fr-FR': 'La connexion n’a pas pu être finalisée. Veuillez réessayer.',
    'de-DE': 'Anmeldung konnte nicht abgeschlossen werden. Bitte erneut versuchen.',
    'pt-BR': 'Não foi possível concluir o login. Tente novamente.',
    'ja-JP': 'ログインを完了できませんでした。時間をおいて再試行してください。',
  });
}


