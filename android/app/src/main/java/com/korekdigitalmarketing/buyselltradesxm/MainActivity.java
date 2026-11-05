package com.korekdigitalmarketing.buyselltradesxm;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.getcapacitor.BridgeActivity;

/** Native browse/navigation wrapped around the existing authenticated marketplace. */
public class MainActivity extends BridgeActivity {
    private static final int PAPER = Color.rgb(251, 247, 239);
    private static final int SEA = Color.rgb(11, 110, 127);
    private static final int INK = Color.rgb(19, 42, 46);
    private static final String[] TABS = {"browse", "saved", "post", "messages", "profile"};
    private static final String[] ICONS = {"⌂", "♡", "+", "✉", "◯"};
    private FrameLayout content;
    private LinearLayout bar;
    private SXMBrowseScreen browse;
    private WebView web;
    private String selected = "browse";
    private boolean french;

    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayBillingPlugin.class);
        super.onCreate(savedInstanceState);
        french = getResources().getConfiguration().getLocales().get(0).getLanguage().equals("fr");
        web = getBridge().getWebView();
        installShell();
    }

    private int dp(float value) { return (int) (value * getResources().getDisplayMetrics().density + .5f); }

    private void installShell() {
        ViewGroup parent = (ViewGroup) web.getParent();
        if (parent == null) return;
        parent.removeView(web);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(PAPER);
        parent.addView(root, new ViewGroup.LayoutParams(-1, -1));
        content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
        content.addView(web, new FrameLayout.LayoutParams(-1, -1));
        browse = new SXMBrowseScreen(this, this::openListing, () -> select("post"), () -> select("alerts"), french);
        content.addView(browse, new FrameLayout.LayoutParams(-1, -1));
        bar = new LinearLayout(this);
        bar.setBackgroundColor(PAPER);
        bar.setElevation(dp(8));
        root.addView(bar, new LinearLayout.LayoutParams(-1, dp(60)));
        select("browse");
        web.postDelayed(this::hideWebNavigation, 800);
    }

    private void hideWebNavigation() {
        if (web == null) return;
        web.evaluateJavascript("(function(){if(!document.getElementById('sxm-android-nav')){" +
            "var s=document.createElement('style');s.id='sxm-android-nav';" +
            "s.textContent='.mobile-nav{display:none!important}body{padding-bottom:0!important}';" +
            "document.head.appendChild(s)}})()", null);
    }

    private void openListing(String id) {
        selected = "browse";
        browse.setVisibility(View.GONE);
        renderBar();
        web.loadUrl("https://buyselltradesxm.com/?listing=" + android.net.Uri.encode(id));
        web.postDelayed(this::hideWebNavigation, 900);
        web.postDelayed(this::hideWebNavigation, 2500);
        web.postDelayed(this::hideWebNavigation, 5500);
    }

    private void select(String tab) {
        selected = tab;
        boolean nativeBrowse = tab.equals("browse") || tab.equals("saved");
        browse.setVisibility(nativeBrowse ? View.VISIBLE : View.GONE);
        if (nativeBrowse) {
            browse.showSaved(tab.equals("saved"));
            web.evaluateJavascript("(function(){document.querySelectorAll('.modal.open').forEach(function(m){" +
                "if(typeof closeModal==='function')closeModal(m.id)})})()", null);
        } else {
            String action = tab.equals("post") ? "openPostModal" : tab.equals("messages") ?
                "openMessages" : tab.equals("alerts") ? "toggleNotifPanel" : "openProfile";
            openWebAction(tab, action, 0);
        }
        renderBar();
        hideWebNavigation();
    }

    private void openWebAction(String tab, String action, int attempt) {
        // A listing deep link may still be loading when a tab is tapped.
        web.evaluateJavascript("(function(){if(typeof " + action + "==='function'){" +
            "document.querySelectorAll('.modal.open').forEach(function(m){" +
            "if(typeof closeModal==='function')closeModal(m.id)});" + action +
            "();return true}return false})()", result -> {
                if ("false".equals(result) && selected.equals(tab)) {
                    if (attempt < 25)
                        web.postDelayed(() -> { if (selected.equals(tab)) openWebAction(tab, action, attempt + 1); }, 400);
                    else android.widget.Toast.makeText(this,
                        french ? "Écran indisponible. Réessayez." : "Screen unavailable. Please retry.",
                        android.widget.Toast.LENGTH_SHORT).show();
                }
            });
    }

    private void renderBar() {
        if (bar == null) return;
        bar.removeAllViews();
        String[] labels = french ? new String[]{"Découvrir", "Favoris", "Publier", "Messages", "Profil"} :
            new String[]{"Discover", "Saved", "Post", "Messages", "Profile"};
        for (int i = 0; i < TABS.length; i++) {
            final String tab = TABS[i];
            TextView item = new TextView(this);
            item.setGravity(Gravity.CENTER);
            item.setText(ICONS[i] + "\n" + labels[i]);
            item.setTextSize(12);
            item.setContentDescription(labels[i]);
            item.setTextColor(selected.equals(tab) ? SEA : INK);
            item.setOnClickListener(v -> select(tab));
            bar.addView(item, new LinearLayout.LayoutParams(0, -1, 1));
        }
    }

    @Override public void onBackPressed() {
        if (!selected.equals("browse") && !selected.equals("saved") ||
            browse != null && browse.getVisibility() != View.VISIBLE) {
            select("browse");
        } else {
            super.onBackPressed();
        }
    }
}
