package io.github.fbgron.littleorbit;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.Locale;

/**
 * Little Orbit itself is a web page (assets/www) shown full screen in a WebView.
 * This activity adds what the page can't do alone: the phone's text-to-speech voice,
 * the Back button, and a full screen that stays awake while a child plays.
 */
public class MainActivity extends Activity implements TextToSpeech.OnInitListener {
    private static final String START_PAGE = "file:///android_asset/www/index.html";

    private WebView web;
    private TextToSpeech tts;
    private volatile boolean ttsReady;
    private String insetsScript;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(11, 16, 38));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setHapticFeedbackEnabled(false);
        // A long press would otherwise start selecting text.
        web.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                return true;
            }
        });

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true); // remembers progress and the sound buttons
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // The game never leaves its own pages.
                return !url.startsWith("file:///android_asset/");
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (insetsScript != null) web.evaluateJavascript(insetsScript, null);
            }
        });
        web.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                sendSafeInsets(insets);
                return v.onApplyWindowInsets(insets);
            }
        });

        setContentView(web);
        web.loadUrl(START_PAGE);
        tts = new TextToSpeech(this, this);
    }

    /** Tells the page where the camera cutout is, so buttons stay clear of it. */
    private void sendSafeInsets(WindowInsets insets) {
        int left = 0;
        int top = 0;
        int right = 0;
        int bottom = 0;
        if (Build.VERSION.SDK_INT >= 28) {
            try {
                // The app is compiled against an older Android SDK that doesn't have
                // getDisplayCutout() (added in Android 9), so it is looked up by name.
                Object cutout = WindowInsets.class.getMethod("getDisplayCutout").invoke(insets);
                if (cutout != null) {
                    Class<?> c = cutout.getClass();
                    left = (Integer) c.getMethod("getSafeInsetLeft").invoke(cutout);
                    top = (Integer) c.getMethod("getSafeInsetTop").invoke(cutout);
                    right = (Integer) c.getMethod("getSafeInsetRight").invoke(cutout);
                    bottom = (Integer) c.getMethod("getSafeInsetBottom").invoke(cutout);
                }
            } catch (Exception ignored) {
                // No cutout information: the page keeps its normal margins.
            }
        }
        float d = getResources().getDisplayMetrics().density;
        insetsScript = String.format(Locale.US,
                "window.setSafeInsets && window.setSafeInsets(%.1f,%.1f,%.1f,%.1f)",
                left / d, top / d, right / d, bottom / d);
        web.evaluateJavascript(insetsScript, null);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    // These flags are deprecated on newer Android versions but still work there,
    // which lets one simple build run on Android 7 and up.
    private void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN);
    }

    @Override
    public void onBackPressed() {
        // Back returns to the game's home screen. On the home screen it does nothing,
        // so a toddler can't close the game by accident.
        web.evaluateJavascript("window.onAndroidBack && window.onAndroidBack()", null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        web.resumeTimers();
        hideSystemBars();
    }

    @Override
    protected void onPause() {
        if (ttsReady) tts.stop();
        web.onPause();
        web.pauseTimers();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        web.destroy();
        super.onDestroy();
    }

    @Override
    public void onInit(int status) {
        if (status != TextToSpeech.SUCCESS) return;
        Locale[] english = {Locale.US, Locale.UK, Locale.ENGLISH};
        for (Locale locale : english) {
            int result = tts.setLanguage(locale);
            if (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED) break;
        }
        tts.setSpeechRate(0.9f);
        tts.setPitch(1.1f);
        ttsReady = true;
    }

    /** The page reaches this as window.AndroidBridge. */
    public class Bridge {
        @JavascriptInterface
        public void speak(String text) {
            if (ttsReady && text != null) tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "littleorbit");
        }

        @JavascriptInterface
        public void stop() {
            if (ttsReady) tts.stop();
        }
    }
}
