package com.korekdigitalmarketing.buyselltradesxm;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name = "SXMLayout")
public class SXMLayoutPlugin extends Plugin {
    @PluginMethod public void getBrowseState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("visible", ((MainActivity)getActivity()).isNativeBrowseVisible());
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
    @PluginMethod public void nativeLanguageState(PluginCall call) {
        boolean french = call.getBoolean("french", true);
        getActivity().runOnUiThread(() -> {
            ((MainActivity)getActivity()).applyLanguageFromWeb(french);
            call.resolve();
        });
    }
}
