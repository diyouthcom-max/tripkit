package com.bagail.tripkit

import android.content.Intent
import android.net.Uri
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Opens Google Maps (or any geo/https maps URL) via the system Intent.
 * Used when the embedded WebView Maps JS SDK fails to authenticate or load.
 */
@CapacitorPlugin(name = "NativeMapOpener")
class NativeMapOpenerPlugin : Plugin() {

    @PluginMethod
    fun openMap(call: PluginCall) {
        val url = call.getString("url")?.trim().orEmpty()
        val query = call.getString("query")?.trim().orEmpty()
        val lat = call.getDouble("lat")
        val lng = call.getDouble("lng")

        try {
            val intentUri: Uri =
                when {
                    url.isNotEmpty() -> Uri.parse(url)
                    lat != null && lng != null ->
                        Uri.parse("geo:$lat,$lng?q=$lat,$lng")
                    query.isNotEmpty() ->
                        Uri.parse("geo:0,0?q=${Uri.encode(query)}")
                    else -> {
                        call.reject("MISSING_MAP_TARGET")
                        return
                    }
                }

            val mapIntent =
                Intent(Intent.ACTION_VIEW, intentUri).apply {
                    // Prefer Google Maps if installed; otherwise the chooser / browser handles it.
                    setPackage("com.google.android.apps.maps")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

            val canMaps = mapIntent.resolveActivity(context.packageManager) != null
            if (canMaps) {
                context.startActivity(mapIntent)
            } else {
                val fallback =
                    Intent(Intent.ACTION_VIEW, intentUri).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                context.startActivity(Intent.createChooser(fallback, "Open map"))
            }
            call.resolve(JSObject().put("opened", true))
        } catch (err: Exception) {
            call.reject(err.message ?: "MAP_OPEN_FAILED", err)
        }
    }
}
