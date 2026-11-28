import Foundation
import UIKit
import QuickLook
import Capacitor

/**
 * Opens a local PDF with QLPreviewController (falls back to UIDocumentInteractionController).
 * Can also write base64 PDF bytes into the app Caches directory first.
 */
@objc(PdfOpenerPlugin)
public class PdfOpenerPlugin: CAPPlugin, CAPBridgedPlugin, QLPreviewControllerDataSource {
    public let identifier = "PdfOpenerPlugin"
    public let jsName = "PdfOpener"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openPdf", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writePdf", returnType: CAPPluginReturnPromise)
    ]

    private var previewItemURL: URL?

    @objc public func openPdf(_ call: CAPPluginCall) {
        let path = (call.getString("path") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let base64 = call.getString("base64")
        let fileName = (call.getString("fileName") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let fileURL: URL
                if !path.isEmpty {
                    fileURL = self.resolveFileURL(path)
                } else if let base64 = base64, !base64.isEmpty, !fileName.isEmpty {
                    fileURL = try self.writeBase64Pdf(base64: base64, fileName: fileName)
                } else {
                    call.reject("MISSING_PATH_OR_BASE64")
                    return
                }

                guard FileManager.default.fileExists(atPath: fileURL.path) else {
                    call.reject("PDF_FILE_NOT_FOUND")
                    return
                }

                DispatchQueue.main.async {
                    self.presentPreview(for: fileURL, call: call)
                }
            } catch {
                call.reject(error.localizedDescription, nil, error)
            }
        }
    }

    @objc public func writePdf(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64"), !base64.isEmpty else {
            call.reject("MISSING_BASE64_OR_FILENAME")
            return
        }
        let fileName = (call.getString("fileName") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !fileName.isEmpty else {
            call.reject("MISSING_BASE64_OR_FILENAME")
            return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let url = try self.writeBase64Pdf(base64: base64, fileName: fileName)
                call.resolve(["path": url.path])
            } catch {
                call.reject(error.localizedDescription, nil, error)
            }
        }
    }

    private func presentPreview(for fileURL: URL, call: CAPPluginCall) {
        self.previewItemURL = fileURL

        let hostVC =
            self.bridge?.viewController
            ?? UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first(where: { $0.isKeyWindow })?
            .rootViewController

        guard let bridgeVC = hostVC else {
            call.reject("NO_VIEW_CONTROLLER")
            return
        }

        let preview = QLPreviewController()
        preview.dataSource = self
        preview.modalPresentationStyle = .fullScreen

        var presenter: UIViewController = bridgeVC
        while let shown = presenter.presentedViewController {
            presenter = shown
        }
        presenter.present(preview, animated: true) {
            call.resolve(["opened": true, "path": fileURL.path])
        }
    }

    private func writeBase64Pdf(base64: String, fileName: String) throws -> URL {
        let cleaned = fileName
            .replacingOccurrences(of: "/", with: "-")
            .replacingOccurrences(of: "\\", with: "-")
        let safeName = cleaned.lowercased().hasSuffix(".pdf") ? cleaned : "\(cleaned).pdf"
        let payload: String
        if let comma = base64.firstIndex(of: ",") {
            payload = String(base64[base64.index(after: comma)...])
        } else {
            payload = base64
        }
        guard let data = Data(base64Encoded: payload, options: .ignoreUnknownCharacters) else {
            throw NSError(
                domain: "PdfOpener",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "INVALID_BASE64"]
            )
        }
        let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
            .appendingPathComponent("tripkit-pdfs", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let out = dir.appendingPathComponent(safeName)
        try data.write(to: out, options: .atomic)
        return out
    }

    private func resolveFileURL(_ path: String) -> URL {
        if path.hasPrefix("file://"), let url = URL(string: path) {
            return url
        }
        return URL(fileURLWithPath: path)
    }

    // MARK: - QLPreviewControllerDataSource

    public func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        previewItemURL == nil ? 0 : 1
    }

    public func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        (previewItemURL as QLPreviewItem?) ?? (URL(fileURLWithPath: "/dev/null") as QLPreviewItem)
    }
}
