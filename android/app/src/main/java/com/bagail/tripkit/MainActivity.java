package com.bagail.tripkit;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * Capacitor host. OAuth callbacks (Google / Apple Custom Tabs) arrive via the
 * VIEW intent-filter in AndroidManifest; BridgeActivity forwards them to plugins.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TripPhotoScannerPlugin.class);
        registerPlugin(PdfOpenerPlugin.class);
        registerPlugin(NativeMapOpenerPlugin.class);
        registerPlugin(MicPermissionPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Keep the latest OAuth return intent as the activity intent so
        // Firebase Auth / Capacitor-Firebase Authentication can finish
        // pending Apple / Google Custom-Tabs flows after process recreation.
        setIntent(intent);
    }
}
