import Foundation
import UIKit
import Capacitor

/**
 * Opens Google Maps / Apple Maps via UIApplication.open.
 * Used when the embedded WebView Maps JS SDK fails to authenticate or load.
 */
@objc(NativeMapOpenerPlugin)
public class NativeMapOpenerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeMapOpenerPlugin"
    public let jsName = "NativeMapOpener"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openMap", returnType: CAPPluginReturnPromise)
    ]

    @objc public func openMap(_ call: CAPPluginCall) {
        let urlString = (call.getString("url") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let query = (call.getString("query") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let lat = call.getDouble("lat")
        let lng = call.getDouble("lng")

        var target: URL?
        if !urlString.isEmpty {
            target = URL(string: urlString)
        } else if let lat = lat, let lng = lng {
            // Google Maps app URL scheme; falls through to https if unsupported.
            let gmaps = URL(string: String(format: "comgooglemaps://?q=%.6f,%.6f", lat, lng))
            let apple = URL(string: String(format: "http://maps.apple.com/?ll=%.6f,%.6f", lat, lng))
            if let gmaps = gmaps, UIApplication.shared.canOpenURL(gmaps) {
                target = gmaps
            } else {
                target = apple
            }
        } else if !query.isEmpty {
            let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
            let gmaps = URL(string: "comgooglemaps://?q=\(encoded)")
            let apple = URL(string: "http://maps.apple.com/?q=\(encoded)")
            if let gmaps = gmaps, UIApplication.shared.canOpenURL(gmaps) {
                target = gmaps
            } else {
                target = apple
            }
        }

        guard let url = target else {
            call.reject("MISSING_MAP_TARGET")
            return
        }

        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    call.resolve(["opened": true])
                } else {
                    call.reject("MAP_OPEN_FAILED")
                }
            }
        }
    }
}
