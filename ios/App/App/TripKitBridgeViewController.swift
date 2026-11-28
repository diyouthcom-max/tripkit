import UIKit
import Capacitor

/// Registers local TripPhotoScanner plugin into the Capacitor bridge.
/// Also keeps the WebView window available as the Apple Sign-In presentation
/// anchor (ASAuthorizationController reads bridge.webView.window).
class TripKitBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(TripPhotoScannerPlugin())
        bridge?.registerPluginInstance(PdfOpenerPlugin())
        bridge?.registerPluginInstance(NativeMapOpenerPlugin())
        bridge?.registerPluginInstance(MicPermissionPlugin())
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Ensure the Capacitor webView is attached to a key window so
        // FirebaseAuthentication's AppleAuthProviderHandler.presentationAnchor
        // does not force-unwrap a nil window during Sign in with Apple.
        if let window = view.window, !window.isKeyWindow {
            window.makeKeyAndVisible()
        }
    }
}
