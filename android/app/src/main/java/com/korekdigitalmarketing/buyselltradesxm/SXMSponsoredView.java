package com.korekdigitalmarketing.buyselltradesxm;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Rect;
import android.net.Uri;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;

/** Hosts one direct-sold campaign using the same renderer as iOS and the web. */
final class SXMSponsoredView extends WebView {
    private final String placement;
    private String page;
    private boolean visible;

    SXMSponsoredView(Context context, String placement) {
        super(context);
        this.placement = placement;
        setBackgroundColor(Color.TRANSPARENT);
        setVerticalScrollBarEnabled(false);
        getSettings().setJavaScriptEnabled(true);
        getSettings().setDomStorageEnabled(true);
        getSettings().setAllowFileAccess(false);
        getSettings().setAllowContentAccess(false);
        getSettings().setMediaPlaybackRequiresUserGesture(false);
        addJavascriptInterface(new HeightBridge(), "AndroidSponsored");
        setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return true;
                Uri url = request.getUrl();
                if (request.hasGesture() && "https".equals(url.getScheme())) {
                    try { getContext().startActivity(new Intent(Intent.ACTION_VIEW, url)); }
                    catch (ActivityNotFoundException ignored) {}
                }
                return !url.toString().equals(page);
            }

            @Override public void onPageFinished(WebView view, String url) { sendVisibility(); }
        });
    }

    void loadCampaign(boolean french) {
        page = "https://buyselltradesxm.com/native-sponsored.html?placement=" + placement + "&lang=" + (french ? "fr" : "en");
        loadUrl(page);
    }

    void refreshVisibility() {
        Rect shown = new Rect();
        boolean next = isShown() && hasWindowFocus() && getGlobalVisibleRect(shown) && shown.height() >= getHeight() / 2.0;
        if (visible == next) return;
        visible = next;
        sendVisibility();
    }

    private void sendVisibility() {
        evaluateJavascript("window.setSponsoredVisibility?.(" + visible + ")", null);
    }

    private final class HeightBridge {
        @JavascriptInterface public void setHeight(int cssPixels) {
            if (cssPixels < 0 || cssPixels > 1200) return;
            post(() -> {
                LinearLayout.LayoutParams params = (LinearLayout.LayoutParams) getLayoutParams();
                if (params == null) return;
                params.height = Math.max(1, Math.round(cssPixels * getResources().getDisplayMetrics().density));
                setLayoutParams(params);
                post(SXMSponsoredView.this::refreshVisibility);
            });
        }
    }
}
