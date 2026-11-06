package com.korekdigitalmarketing.buyselltradesxm;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name = "SXMLayout")
public class SXMLayoutPlugin extends Plugin {
    @PluginMethod public void bannerSize(PluginCall call) {
        int height = Math.max(0, Math.min(200, call.getInt("height", 0)));
        getActivity().runOnUiThread(() -> {
            ((MainActivity)getActivity()).reserveBanner(height);
            call.resolve();
        });
    }
}
