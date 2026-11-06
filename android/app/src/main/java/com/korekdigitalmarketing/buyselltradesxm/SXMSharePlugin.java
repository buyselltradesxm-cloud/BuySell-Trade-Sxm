package com.korekdigitalmarketing.buyselltradesxm;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SXMShare")
public class SXMSharePlugin extends Plugin {
    private String listingUrl(PluginCall call) {
        String value = call.getString("url", "");
        Uri uri = Uri.parse(value);
        // This bridge only exports public marketplace listing links.
        if (!"https".equals(uri.getScheme()) || !"buyselltradesxm.com".equals(uri.getHost()) ||
            uri.getUserInfo() != null || uri.getPort() != -1 || uri.getFragment() != null) return null;
        String path = uri.getPath();
        boolean page = path != null && path.matches("/[sl]/[a-zA-Z0-9-]+\\.html") && uri.getQuery() == null;
        String id = uri.getQueryParameter("listing");
        boolean direct = "/".equals(path) && id != null && id.matches("[a-zA-Z0-9-]+") &&
            uri.getQueryParameterNames().size() == 1;
        return page || direct ? value : null;
    }
    @PluginMethod public void copy(PluginCall call) {
        String url = listingUrl(call);
        if (url == null) { call.reject("Invalid listing link"); return; }
        getActivity().runOnUiThread(() -> {
            ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            clipboard.setPrimaryClip(ClipData.newPlainText("Buy Sell Trade SXM", url));
            call.resolve();
        });
    }
    @PluginMethod public void share(PluginCall call) {
        String url = listingUrl(call);
        if (url == null) { call.reject("Invalid listing link"); return; }
        getActivity().runOnUiThread(() -> {
            try {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(Intent.EXTRA_TEXT, url);
                getActivity().startActivity(Intent.createChooser(send, "Buy Sell Trade SXM"));
                call.resolve();
            } catch (Exception error) { call.reject("Sharing unavailable", error); }
        });
    }
}
