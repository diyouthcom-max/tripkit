import Foundation
import UIKit
import AVFoundation
import Capacitor

/**
 * Runtime microphone permission via AVAudioSession.
 * Info.plist NSMicrophoneUsageDescription alone does not prompt until requested.
 */
@objc(MicPermissionPlugin)
public class MicPermissionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MicPermissionPlugin"
    public let jsName = "MicPermission"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAppSettings", returnType: CAPPluginReturnPromise)
    ]

    private func currentMicStatus() -> AVAudioSession.RecordPermission {
        AVAudioSession.sharedInstance().recordPermission
    }

    @objc public func checkPermission(_ call: CAPPluginCall) {
        let status = currentMicStatus()
        let granted = status == .granted
        call.resolve([
            "granted": granted,
            "status": granted ? "granted" : (status == .denied ? "denied" : "prompt")
        ])
    }

    @objc public func requestPermission(_ call: CAPPluginCall) {
        let status = currentMicStatus()
        switch status {
        case .granted:
            call.resolve(["granted": true, "status": "granted"])
        case .denied:
            call.resolve(["granted": false, "status": "denied"])
        case .undetermined:
            AVAudioSession.sharedInstance().requestRecordPermission { allowed in
                DispatchQueue.main.async {
                    call.resolve([
                        "granted": allowed,
                        "status": allowed ? "granted" : "denied"
                    ])
                }
            }
        @unknown default:
            call.resolve(["granted": false, "status": "denied"])
        }
    }

    @objc public func openAppSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("SETTINGS_URL_INVALID")
                return
            }
            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    call.resolve(["opened": true])
                } else {
                    call.reject("SETTINGS_OPEN_FAILED")
                }
            }
        }
    }
}
