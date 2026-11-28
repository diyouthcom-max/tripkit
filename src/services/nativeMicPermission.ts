import { Capacitor, registerPlugin } from '@capacitor/core';

export interface MicPermissionPlugin {
  checkPermission(): Promise<{ granted: boolean; status: string }>;
  requestPermission(): Promise<{ granted: boolean; status: string }>;
  openAppSettings(): Promise<{ opened?: boolean }>;
}

const MicPermission = registerPlugin<MicPermissionPlugin>('MicPermission');

export function isNativeMicPermissionAvailable(): boolean {
  return (
    Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('MicPermission')
  );
}

/**
 * On Capacitor iOS/Android: show the system mic prompt if needed.
 * Returns true when recording may proceed. On Web always returns true
 * (getUserMedia still enforces browser permission).
 */
export async function ensureMicrophonePermission(): Promise<boolean> {
  if (!isNativeMicPermissionAvailable()) return true;
  try {
    const current = await MicPermission.checkPermission();
    if (current.granted) return true;
    const requested = await MicPermission.requestPermission();
    return Boolean(requested.granted);
  } catch (err) {
    console.warn('[TripKit] MicPermission request failed', err);
    return false;
  }
}

/** Opens the OS app settings page so the user can re-enable the microphone. */
export async function openAppSettings(): Promise<void> {
  if (!isNativeMicPermissionAvailable()) return;
  try {
    await MicPermission.openAppSettings();
  } catch (err) {
    console.warn('[TripKit] openAppSettings failed', err);
  }
}
