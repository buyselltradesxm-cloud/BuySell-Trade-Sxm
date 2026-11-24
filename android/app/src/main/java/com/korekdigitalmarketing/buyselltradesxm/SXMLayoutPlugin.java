package com.korekdigitalmarketing.buyselltradesxm;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name = "SXMLayout")
public class SXMLayoutPlugin extends Plugin {
    @PluginMethod public void requestReview(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            android.content.SharedPreferences prefs = getContext().getSharedPreferences("sxm.review", 0);
            long now = System.currentTimeMillis(), first = prefs.getLong("first", now);
            int count = prefs.getInt("successes", 0) + 1;
            prefs.edit().putLong("first", first).putInt("successes", count).apply();
            JSObject result = new JSObject(); result.put("requested", false);
            if (count < 2 || now - first < 7L * 86400000 || now - prefs.getLong("last", 0) < 120L * 86400000) {
                call.resolve(result); return;
            }
            com.google.android.play.core.review.ReviewManager manager = com.google.android.play.core.review.ReviewManagerFactory.create(getContext());
            manager.requestReviewFlow().addOnCompleteListener(task -> {
                if (!task.isSuccessful() || getActivity().isFinishing()) { call.resolve(result); return; }
                prefs.edit().putLong("last", now).apply();
                manager.launchReviewFlow(getActivity(), task.getResult());
                result.put("requested", true); call.resolve(result);
            });
        });
    }
    @PluginMethod public void getBrowseState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("visible", ((MainActivity)getActivity()).isNativeBrowseVisible());
        result.put("placementAds", true);
        result.put("compactListingAds", true);
        call.resolve(result);
    }
    @PluginMethod public void bannerSize(PluginCall call) {
        int height = Math.max(0, Math.min(200, call.getInt("height", 0)));
        getActivity().runOnUiThread(() -> {
            ((MainActivity)getActivity()).reserveBanner(height);
            call.resolve();
        });
    }
    @PluginMethod public void nativeAdsState(PluginCall call) {
        boolean allowed = call.getBoolean("allowed", false);
        getActivity().runOnUiThread(() -> {
            ((MainActivity)getActivity()).setNativeAdsAllowed(allowed);
            call.resolve();
        });
    }
    @PluginMethod public void nativePageAd(PluginCall call) {
        boolean allowed = call.getBoolean("allowed", false);
        boolean compact = call.getBoolean("compact", false);
        getActivity().runOnUiThread(() -> {
            ((MainActivity)getActivity()).setPageAdAllowed(allowed, compact);
            call.resolve();
        });
    }
    @PluginMethod public void nativeLanguageState(PluginCall call) {
        boolean french = call.getBoolean("french", true);
        getActivity().runOnUiThread(() -> {
            ((MainActivity)getActivity()).applyLanguageFromWeb(french);
            call.resolve();
        });
    }
}
