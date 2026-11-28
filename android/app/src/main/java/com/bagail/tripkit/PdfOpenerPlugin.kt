package com.bagail.tripkit

import android.content.Intent
import android.net.Uri
import android.util.Base64
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileOutputStream

/**
 * Opens a local PDF in the system viewer via FileProvider + ACTION_VIEW.
 * Also can write base64 PDF bytes into app cache first (used by the JS exporter).
 */
@CapacitorPlugin(name = "PdfOpener")
class PdfOpenerPlugin : Plugin() {

    @PluginMethod
    fun openPdf(call: PluginCall) {
        val path = call.getString("path")?.trim().orEmpty()
        val base64 = call.getString("base64")
        val fileName = call.getString("fileName")?.trim().orEmpty()

        try {
            val file: File = when {
                path.isNotEmpty() -> resolveReadableFile(path)
                !base64.isNullOrBlank() && fileName.isNotEmpty() ->
                    writeBase64Pdf(base64, fileName)
                else -> {
                    call.reject("MISSING_PATH_OR_BASE64")
                    return
                }
            }

            if (!file.exists() || file.length() <= 0L) {
                call.reject("PDF_FILE_NOT_FOUND")
                return
            }

            val uri: Uri =
                FileProvider.getUriForFile(
                    context,
                    context.packageName + ".fileprovider",
                    file
                )
            val intent =
                Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/pdf")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

            val chooser = Intent.createChooser(intent, "Open PDF")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(chooser)

            val result =
                JSObject()
                    .put("opened", true)
                    .put("path", file.absolutePath)
            call.resolve(result)
        } catch (err: Exception) {
            call.reject(err.message ?: "PDF_OPEN_FAILED", err)
        }
    }

    @PluginMethod
    fun writePdf(call: PluginCall) {
        val base64 = call.getString("base64")
        val fileName = call.getString("fileName")?.trim().orEmpty()
        if (base64.isNullOrBlank() || fileName.isEmpty()) {
            call.reject("MISSING_BASE64_OR_FILENAME")
            return
        }
        try {
            val file = writeBase64Pdf(base64, fileName)
            call.resolve(JSObject().put("path", file.absolutePath))
        } catch (err: Exception) {
            call.reject(err.message ?: "PDF_WRITE_FAILED", err)
        }
    }

    private fun writeBase64Pdf(base64: String, fileName: String): File {
        val cleanName =
            fileName
                .replace(Regex("[\\\\/]+"), "-")
                .ifBlank { "Trip-Kit-Handbook.pdf" }
        val safeName = if (cleanName.endsWith(".pdf", ignoreCase = true)) cleanName else "$cleanName.pdf"
        val dir = File(context.cacheDir, "tripkit-pdfs").apply { mkdirs() }
        val out = File(dir, safeName)
        val payload =
            if (base64.contains(',')) base64.substringAfter(',') else base64
        val bytes = Base64.decode(payload, Base64.DEFAULT)
        FileOutputStream(out).use { it.write(bytes) }
        return out
    }

    private fun resolveReadableFile(path: String): File {
        val stripped =
            path
                .removePrefix("file://")
                .let {
                    try {
                        Uri.parse(it).path ?: it
                    } catch (_: Exception) {
                        it
                    }
                }
        val direct = File(stripped)
        if (direct.exists()) return direct
        // Capacitor Filesystem sometimes returns content-ish paths; try cache sibling.
        val byName = File(context.cacheDir, File(stripped).name)
        if (byName.exists()) return byName
        return direct
    }
}
