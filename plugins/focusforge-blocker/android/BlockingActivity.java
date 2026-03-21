package com.focusforge.app;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.graphics.Color;
import android.graphics.Typeface;
import android.util.TypedValue;

/**
 * Full-screen blocking activity shown when a blocked app is detected
 * during a focus session. Displays a dark UI with "Focus session active" message.
 *
 * Pressing back returns to the home launcher, not to the blocked app.
 */
public class BlockingActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Make it full-screen
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.parseColor("#0D0F14"));
        getWindow().setNavigationBarColor(Color.parseColor("#0D0F14"));

        // Build UI programmatically (no XML needed)
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#0D0F14"));
        root.setPadding(80, 0, 80, 0);

        // Lock icon
        TextView lockIcon = new TextView(this);
        lockIcon.setText("🔒");
        lockIcon.setTextSize(TypedValue.COMPLEX_UNIT_SP, 48);
        lockIcon.setGravity(Gravity.CENTER);
        lockIcon.setPadding(0, 0, 0, 48);
        root.addView(lockIcon);

        // Title
        TextView title = new TextView(this);
        title.setText("Focus Session Active");
        title.setTextColor(Color.parseColor("#E6EAF2"));
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 0, 0, 24);
        root.addView(title);

        // Subtitle
        String blockedApp = getIntent().getStringExtra("blocked_app_name");
        String message = "This app is blocked during your focus session.\nStay disciplined — your future self will thank you.";
        if (blockedApp != null) {
            message = blockedApp + " is blocked right now.\nStay focused — you're building real discipline.";
        }
        TextView subtitle = new TextView(this);
        subtitle.setText(message);
        subtitle.setTextColor(Color.parseColor("#9AA4B2"));
        subtitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setLineSpacing(8, 1);
        subtitle.setPadding(0, 0, 0, 64);
        root.addView(subtitle);

        // Return button
        TextView returnBtn = new TextView(this);
        returnBtn.setText("Return to FocusForge");
        returnBtn.setTextColor(Color.parseColor("#5B8CFF"));
        returnBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        returnBtn.setTypeface(Typeface.DEFAULT_BOLD);
        returnBtn.setGravity(Gravity.CENTER);
        returnBtn.setPadding(48, 28, 48, 28);
        returnBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish(); // Go back to FocusForge
            }
        });
        root.addView(returnBtn);

        setContentView(root);
    }

    @Override
    public void onBackPressed() {
        // Don't go back to the blocked app — go home instead
        moveTaskToBack(true);
    }
}
