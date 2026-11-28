package com.bagail.tripkit

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * Runtime RECORD_AUDIO permission for Capacitor WebView voice input.
 * Manifest declaration alone does not show a system dialog on Android 6+.
 */
@CapacitorPlugin(
    name = "MicPermission",
    permissions = [
        Permission(
            strings = [Manifest.permission.RECORD_AUDIO],
            alias = "microphone"
        )
    ]
)
class MicPermissionPlugin : Plugin() {

    private fun hasMicAccess(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    @PluginMethod
    fun checkPermission(call: PluginCall) {
        call.resolve(
            JSObject()
                .put("granted", hasMicAccess())
                .put("status", if (hasMicAccess()) "granted" else "denied")
        )
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (hasMicAccess()) {
            call.resolve(JSObject().put("granted", true).put("status", "granted"))
            return
        }
        requestPermissionForAlias("microphone", call, "micPermsCallback")
    }

    @PermissionCallback
    private fun micPermsCallback(call: PluginCall) {
        val state = getPermissionState("microphone")
        val granted = state == PermissionState.GRANTED || hasMicAccess()
        call.resolve(
            JSObject()
                .put("granted", granted)
                .put("status", if (granted) "granted" else "denied")
        )
    }

    @PluginMethod
    fun openAppSettings(call: PluginCall) {
        try {
            val intent =
                Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.fromParts("package", context.packageName, null)
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            context.startActivity(intent)
            call.resolve(JSObject().put("opened", true))
        } catch (err: Exception) {
            call.reject(err.message ?: "SETTINGS_OPEN_FAILED", err)
        }
    }
}
