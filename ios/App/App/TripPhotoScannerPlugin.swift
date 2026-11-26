import Foundation
import UIKit
import Photos
import Capacitor

/**
 * Local Capacitor plugin: silent PhotoKit scan by trip date ranges.
 * Never uploads photo bytes — returns 680px JPEG thumbnails + GPS only.
 */
@objc(TripPhotoScannerPlugin)
public class TripPhotoScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TripPhotoScannerPlugin"
    public let jsName = "TripPhotoScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scanPhotosByDateRanges", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getHighResPhotoBase64", returnType: CAPPluginReturnPromise)
    ]

    private let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private let isoFormatterBasic: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    private func parseIso(_ value: String?) -> Date? {
        guard let value = value, !value.isEmpty else { return nil }
        return isoFormatter.date(from: value) ?? isoFormatterBasic.date(from: value)
    }

    private func toIso(_ date: Date) -> String {
        isoFormatterBasic.string(from: date)
    }

    @objc public func requestPermissions(_ call: CAPPluginCall) {
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        switch status {
        case .authorized:
            call.resolve(["photos": "granted"])
        case .limited:
            call.resolve(["photos": "limited"])
        case .denied, .restricted:
            call.resolve(["photos": "denied"])
        case .notDetermined:
            PHPhotoLibrary.requestAuthorization(for: .readWrite) { newStatus in
                DispatchQueue.main.async {
                    switch newStatus {
                    case .authorized:
                        call.resolve(["photos": "granted"])
                    case .limited:
                        call.resolve(["photos": "limited"])
                    default:
                        call.resolve(["photos": "denied"])
                    }
                }
            }
        @unknown default:
            call.resolve(["photos": "denied"])
        }
    }

    @objc public func scanPhotosByDateRanges(_ call: CAPPluginCall) {
        let auth = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        guard auth == .authorized || auth == .limited else {
            call.reject("PHOTO_PERMISSION_DENIED")
            return
        }

        guard let ranges = call.getArray("ranges", JSObject.self), !ranges.isEmpty else {
            call.resolve(["assets": []])
            return
        }
        let limitPerTrip = max(1, min(200, call.getInt("limitPerTrip") ?? 60))

        DispatchQueue.global(qos: .userInitiated).async {
            var results: [[String: Any]] = []
            var seenIds = Set<String>()

            for range in ranges {
                let tripId = range["tripId"] as? String ?? ""
                guard let start = self.parseIso(range["startDateIso"] as? String),
                      let end = self.parseIso(range["endDateIso"] as? String) else {
                    continue
                }

                let options = PHFetchOptions()
                options.predicate = NSPredicate(
                    format: "mediaType == %d AND creationDate >= %@ AND creationDate <= %@",
                    PHAssetMediaType.image.rawValue,
                    start as NSDate,
                    end as NSDate
                )
                options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: true)]
                options.fetchLimit = limitPerTrip

                let fetch = PHAsset.fetchAssets(with: options)
                var tripCount = 0
                fetch.enumerateObjects { asset, _, stop in
                    if tripCount >= limitPerTrip {
                        stop.pointee = true
                        return
                    }
                    let id = asset.localIdentifier
                    if seenIds.contains(id) { return }
                    seenIds.insert(id)

                    if let entry = self.buildThumbAsset(asset: asset, tripId: tripId) {
                        results.append(entry)
                        tripCount += 1
                    }
                }
            }

            call.resolve(["assets": results])
        }
    }

    @objc public func getHighResPhotoBase64(_ call: CAPPluginCall) {
        guard let localIdentifier = call.getString("localIdentifier"), !localIdentifier.isEmpty else {
            call.reject("MISSING_LOCAL_IDENTIFIER")
            return
        }
        let maxDimension = max(680, call.getInt("maxDimension") ?? 2480)

        let result = PHAsset.fetchAssets(withLocalIdentifiers: [localIdentifier], options: nil)
        guard let asset = result.firstObject else {
            call.reject("ASSET_NOT_FOUND")
            return
        }

        let opts = PHImageRequestOptions()
        opts.isSynchronous = true
        opts.deliveryMode = .highQualityFormat
        opts.resizeMode = .fast
        opts.isNetworkAccessAllowed = true

        let target = CGSize(width: maxDimension, height: maxDimension)
        var outDataUrl: String?
        var outW = 0
        var outH = 0

        PHImageManager.default().requestImage(
            for: asset,
            targetSize: target,
            contentMode: .aspectFit,
            options: opts
        ) { image, _ in
            guard let image = image,
                  let data = image.jpegData(compressionQuality: 0.92) else { return }
            outW = Int(image.size.width * image.scale)
            outH = Int(image.size.height * image.scale)
            outDataUrl = "data:image/jpeg;base64," + data.base64EncodedString()
        }

        guard let dataUrl = outDataUrl else {
            call.reject("IMAGE_LOAD_FAILED")
            return
        }
        call.resolve([
            "dataUrl": dataUrl,
            "width": outW,
            "height": outH
        ])
    }

    private func buildThumbAsset(asset: PHAsset, tripId: String) -> [String: Any]? {
        let opts = PHImageRequestOptions()
        opts.isSynchronous = true
        opts.deliveryMode = .fastFormat
        opts.resizeMode = .fast
        opts.isNetworkAccessAllowed = false

        var thumb: UIImage?
        PHImageManager.default().requestImage(
            for: asset,
            targetSize: CGSize(width: 680, height: 680),
            contentMode: .aspectFill,
            options: opts
        ) { image, info in
            let degraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
            if !degraded, let image = image {
                thumb = image
            } else if thumb == nil {
                thumb = image
            }
        }

        guard let image = thumb,
              let jpeg = image.jpegData(compressionQuality: 0.82) else {
            return nil
        }

        let taken = asset.creationDate ?? Date()
        var entry: [String: Any] = [
            "localIdentifier": asset.localIdentifier,
            "fileName": "PHOTO_\(tripId)_\(Int(taken.timeIntervalSince1970)).JPG",
            "takenAtIso": toIso(taken),
            "width": asset.pixelWidth,
            "height": asset.pixelHeight,
            "thumbDataUrl": "data:image/jpeg;base64," + jpeg.base64EncodedString()
        ]

        if let loc = asset.location {
            entry["lat"] = loc.coordinate.latitude
            entry["lng"] = loc.coordinate.longitude
        }

        return entry
    }
}
