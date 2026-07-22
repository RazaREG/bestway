package com.bestway.panel;

import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.graphics.Color;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // Allow changing status bar color
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

        // Set status bar background color
        window.setStatusBarColor(Color.BLACK);

        // Force WHITE icons (battery, time)
        View decor = window.getDecorView();
        decor.setSystemUiVisibility(0); // clears LIGHT_STATUS_BAR
    }
}
