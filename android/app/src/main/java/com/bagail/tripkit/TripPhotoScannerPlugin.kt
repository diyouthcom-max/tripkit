package com.bagail.tripkit

import android.Manifest
import android.content.ContentUris
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.max
import kotlin.math.min

/**
 * Local Capacitor plugin: silent MediaStore scan by trip date ranges.
 * Never uploads photo bytes — returns 680px JPEG thumbnails + GPS only.
 */
@CapacitorPlugin(
    name = "TripPhotoScanner",
    permissions = [
        Permission(
            strings = [Manifest.permission.READ_MEDIA_IMAGES],
            alias = "photos"
        ),
        Permission(
            strings = [Manifest.permission.READ_EXTERNAL_STORAGE],
            alias = "photosLegacy"
        )
    ]
)
class TripPhotoScannerPlugin : Plugin() {

    private val utc: TimeZone = TimeZone.getTimeZone("UTC")
    private val isoParser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = utc
    }
    private val isoParserBasic = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = utc
    }
    private val isoOut = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = utc
    }

    private fun parseIso(value: String?): Long? {
        if (value.isNullOrBlank()) return null
        return try {
            isoParser.parse(value)?.time
        } catch (_: Exception) {
            try {
                isoParserBasic.parse(value)?.time
            } catch (_: Exception) {
                null
            }
        }
    }

    private fun hasPhotoAccess(): Boolean {
        val ctx = context
        return if (Build.VERSION.SDK_INT >= 33) {
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_MEDIA_IMAGES) ==
                PackageManager.PERMISSION_GRANTED ||
                (
                    Build.VERSION.SDK_INT >= 34 &&
                        ContextCompat.checkSelfPermission(
                            ctx,
                            Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED
                        ) == PackageManager.PERMISSION_GRANTED
                    )
        } else {
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_EXTERNAL_STORAGE) ==
                PackageManager.PERMISSION_GRANTED
        }
    }

    private fun photosStateLabel(): String {
        return if (hasPhotoAccess()) "granted" else "denied"
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (hasPhotoAccess()) {
            call.resolve(JSObject().put("photos", "granted"))
            return
        }
        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissionForAlias("photos", call, "photosPermsCallback")
        } else {
            requestPermissionForAlias("photosLegacy", call, "photosPermsCallback")
        }
    }

    @PermissionCallback
    private fun photosPermsCallback(call: PluginCall) {
        val state =
            if (Build.VERSION.SDK_INT >= 33) {
                getPermissionState("photos")
            } else {
                getPermissionState("photosLegacy")
            }
        val label =
            when (state) {
                PermissionState.GRANTED -> "granted"
                else -> if (hasPhotoAccess()) "granted" else "denied"
            }
        call.resolve(JSObject().put("photos", label))
    }

    @PluginMethod
    fun scanPhotosByDateRanges(call: PluginCall) {
        if (!hasPhotoAccess()) {
            call.reject("PHOTO_PERMISSION_DENIED")
            return
        }

        val ranges = call.getArray("ranges") ?: JSArray()
        val limitPerTrip = max(1, min(200, call.getInt("limitPerTrip") ?: 60))
        val assets = JSArray()
        val seen = HashSet<String>()

        for (i in 0 until ranges.length()) {
            val range = ranges.optJSONObject(i) ?: continue
            val tripId = range.optString("tripId", "")
            val startMs = parseIso(range.optString("startDateIso", null)) ?: continue
            val endMs = parseIso(range.optString("endDateIso", null)) ?: continue

            val projection =
                arrayOf(
                    MediaStore.Images.Media._ID,
                    MediaStore.Images.Media.DISPLAY_NAME,
                    MediaStore.Images.Media.DATE_TAKEN,
                    MediaStore.Images.Media.WIDTH,
                    MediaStore.Images.Media.HEIGHT,
                    MediaStore.Images.Media.DATA
                )
            val selection = "${MediaStore.Images.Media.DATE_TAKEN} BETWEEN ? AND ?"
            val args = arrayOf(startMs.toString(), endMs.toString())
            val sort = "${MediaStore.Images.Media.DATE_TAKEN} ASC"

            context.contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection,
                selection,
                args,
                sort
            )?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
                val dateCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)
                val wCol = cursor.getColumnIndex(MediaStore.Images.Media.WIDTH)
                val hCol = cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT)
                val dataCol = cursor.getColumnIndex(MediaStore.Images.Media.DATA)

                var count = 0
                while (cursor.moveToNext() && count < limitPerTrip) {
                    val id = cursor.getLong(idCol)
                    val localId = id.toString()
                    if (!seen.add(localId)) continue

                    val uri =
                        ContentUris.withAppendedId(
                            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                            id
                        )
                    val fileName = cursor.getString(nameCol) ?: "PHOTO_$localId.JPG"
                    val takenAt = cursor.getLong(dateCol)
                    val width = if (wCol >= 0) cursor.getInt(wCol) else 0
                    val height = if (hCol >= 0) cursor.getInt(hCol) else 0
                    val path = if (dataCol >= 0) cursor.getString(dataCol) else null

                    val thumb = decodeThumbnail(uri, 680) ?: continue
                    val thumbDataUrl = bitmapToJpegDataUrl(thumb, 82) ?: continue

                    var lat: Double? = null
                    var lng: Double? = null
                    try {
                        context.contentResolver.openInputStream(uri)?.use { stream ->
                            val exif = ExifInterface(stream)
                            val latLong = FloatArray(2)
                            if (exif.getLatLong(latLong)) {
                                lat = latLong[0].toDouble()
                                lng = latLong[1].toDouble()
                            }
                        }
                    } catch (_: Exception) {
                        // GPS optional
                    }
                    if (lat == null && !path.isNullOrBlank()) {
                        try {
                            val exif = ExifInterface(path)
                            val latLong = FloatArray(2)
                            if (exif.getLatLong(latLong)) {
                                lat = latLong[0].toDouble()
                                lng = latLong[1].toDouble()
                            }
                        } catch (_: Exception) {
                            // ignore
                        }
                    }

                    val entry =
                        JSObject()
                            .put("localIdentifier", localId)
                            .put("fileName", fileName)
                            .put("takenAtIso", isoOut.format(Date(takenAt)))
                            .put("width", if (width > 0) width else thumb.width)
                            .put("height", if (height > 0) height else thumb.height)
                            .put("thumbDataUrl", thumbDataUrl)
                    if (lat != null && lng != null) {
                        entry.put("lat", lat)
                        entry.put("lng", lng)
                    }
                    // tripId kept only for local dedupe naming; not part of NativeScannedAsset contract
                    assets.put(entry)
                    count += 1
                }
            }
        }

        call.resolve(JSObject().put("assets", assets))
    }

    @PluginMethod
    fun getHighResPhotoBase64(call: PluginCall) {
        if (!hasPhotoAccess()) {
            call.reject("PHOTO_PERMISSION_DENIED")
            return
        }
        val localIdentifier = call.getString("localIdentifier")
        if (localIdentifier.isNullOrBlank()) {
            call.reject("MISSING_LOCAL_IDENTIFIER")
            return
        }
        val maxDimension = max(680, call.getInt("maxDimension") ?: 2480)
        val id = localIdentifier.toLongOrNull()
        if (id == null) {
            call.reject("ASSET_NOT_FOUND")
            return
        }
        val uri =
            ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
        val bitmap = decodeThumbnail(uri, maxDimension)
        if (bitmap == null) {
            call.reject("IMAGE_LOAD_FAILED")
            return
        }
        val dataUrl = bitmapToJpegDataUrl(bitmap, 92)
        if (dataUrl == null) {
            call.reject("IMAGE_LOAD_FAILED")
            return
        }
        call.resolve(
            JSObject()
                .put("dataUrl", dataUrl)
                .put("width", bitmap.width)
                .put("height", bitmap.height)
        )
    }

    private fun decodeThumbnail(uri: android.net.Uri, maxSide: Int): Bitmap? {
        return try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            context.contentResolver.openInputStream(uri)?.use {
                BitmapFactory.decodeStream(it, null, bounds)
            }
            var sample = 1
            val maxDim = max(bounds.outWidth, bounds.outHeight)
            while (maxDim / sample > maxSide * 2) {
                sample *= 2
            }
            val opts = BitmapFactory.Options().apply { inSampleSize = sample }
            val decoded =
                context.contentResolver.openInputStream(uri)?.use {
                    BitmapFactory.decodeStream(it, null, opts)
                } ?: return null
            scaleToMax(decoded, maxSide)
        } catch (_: Exception) {
            null
        }
    }

    private fun scaleToMax(src: Bitmap, maxSide: Int): Bitmap {
        val maxDim = max(src.width, src.height)
        if (maxDim <= maxSide) return src
        val scale = maxSide.toFloat() / maxDim.toFloat()
        val w = max(1, (src.width * scale).toInt())
        val h = max(1, (src.height * scale).toInt())
        return Bitmap.createScaledBitmap(src, w, h, true)
    }

    private fun bitmapToJpegDataUrl(bitmap: Bitmap, quality: Int): String? {
        return try {
            val baos = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos)
            val b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
            "data:image/jpeg;base64,$b64"
        } catch (_: Exception) {
            null
        }
    }
}
