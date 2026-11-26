package com.bagail.tripkit;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TripPhotoScannerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
