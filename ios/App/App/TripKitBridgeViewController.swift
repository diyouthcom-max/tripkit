import UIKit
import Capacitor

/// Registers local TripPhotoScanner plugin into the Capacitor bridge.
class TripKitBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(TripPhotoScannerPlugin())
    }
}
