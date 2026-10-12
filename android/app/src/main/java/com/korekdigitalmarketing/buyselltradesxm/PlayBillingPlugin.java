package com.korekdigitalmarketing.buyselltradesxm;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private static final List<String> SUBSCRIPTION_IDS = Arrays.asList(
        "pro_starter_monthly", "pro_business_monthly",
        "pro_premium_monthly", "pro_elite_monthly",
        "pro_unlimited_monthly"
    );
    private BillingClient client;
    private final Map<String, ProductDetails> products = new HashMap<>();
    private PluginCall purchaseCall;

    private ProductDetails.SubscriptionOfferDetails baseOffer(ProductDetails detail) {
        List<ProductDetails.SubscriptionOfferDetails> offers = detail.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) return null;
        for (ProductDetails.SubscriptionOfferDetails offer : offers) if (offer.getOfferId() == null) return offer;
        return offers.get(0);
    }

    @Override public void load() {
        client = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
    }

    private void connected(PluginCall call, Runnable action) {
        if (client == null) load();
        if (client.isReady()) { action.run(); return; }
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) action.run();
                else call.reject("Google Play Billing is unavailable. Please try again.", "BILLING_UNAVAILABLE");
            }
            @Override public void onBillingServiceDisconnected() { /* reconnect on the next call */ }
        });
    }

    @PluginMethod public void products(PluginCall call) {
        connected(call, () -> {
            List<QueryProductDetailsParams.Product> requests = new ArrayList<>();
            for (String id : SUBSCRIPTION_IDS) requests.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id).setProductType(BillingClient.ProductType.SUBS).build());
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(requests).build();
            client.queryProductDetailsAsync(params, (result, detailsResult) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Unable to load Google Play prices. Please try again.", "PRODUCTS_UNAVAILABLE"); return;
                }
                products.clear();
                JSArray values = new JSArray();
                for (ProductDetails detail : detailsResult.getProductDetailsList()) {
                    products.put(detail.getProductId(), detail);
                    ProductDetails.SubscriptionOfferDetails offer = baseOffer(detail);
                    if (offer == null || offer.getPricingPhases().getPricingPhaseList().isEmpty()) continue;
                    String price = offer.getPricingPhases().getPricingPhaseList().get(offer.getPricingPhases().getPricingPhaseList().size() - 1).getFormattedPrice();
                    JSObject item = new JSObject(); item.put("id", detail.getProductId()); item.put("price", price);
                    values.put(item);
                }
                JSObject response = new JSObject(); response.put("products", values); call.resolve(response);
            });
        });
    }

    @PluginMethod public void purchase(PluginCall call) {
        String id = call.getString("productId");
        String accountId = call.getString("obfuscatedAccountId");
        if (id == null || accountId == null || !SUBSCRIPTION_IDS.contains(id) || !accountId.matches("[A-Fa-f0-9]{64}")) {
            call.reject("Invalid purchase", "INVALID_PURCHASE"); return;
        }
        connected(call, () -> {
            ProductDetails detail = products.get(id);
            if (detail == null) {
                call.reject("This plan is currently unavailable in Google Play.", "PRODUCT_UNAVAILABLE"); return;
            }
            ProductDetails.SubscriptionOfferDetails offer = baseOffer(detail);
            if (offer == null) {
                call.reject("This plan has no available subscription offer.", "OFFER_UNAVAILABLE"); return;
            }
            if (purchaseCall != null) { call.reject("A purchase is already in progress.", "PURCHASE_IN_PROGRESS"); return; }
            BillingFlowParams.ProductDetailsParams productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(detail).setOfferToken(offer.getOfferToken()).build();
            BillingFlowParams flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(productParams))
                .setObfuscatedAccountId(accountId).build();
            Activity activity = getActivity();
            if (activity == null) { call.reject("Unable to open Google Play.", "NO_ACTIVITY"); return; }
            purchaseCall = call;
            BillingResult result = client.launchBillingFlow(activity, flow);
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                purchaseCall = null;
                if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) call.resolve(new JSObject().put("cancelled", true));
                else call.reject("Google Play could not start the purchase.", "PURCHASE_FAILED");
            }
        });
    }

    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> list) {
        PluginCall call = purchaseCall;
        if (call == null) return;
        purchaseCall = null;
        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) { call.resolve(new JSObject().put("cancelled", true)); return; }
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || list == null || list.isEmpty()) {
            call.reject("Google Play purchase failed. Please try again.", "PURCHASE_FAILED"); return;
        }
        Purchase purchase = list.get(0);
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) { call.resolve(new JSObject().put("pending", true)); return; }
        JSObject response = purchaseJSON(purchase);
        call.resolve(response);
    }

    @PluginMethod public void ownedPurchases(PluginCall call) {
        connected(call, () -> client.queryPurchasesAsync(QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS).build(), (result, list) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Unable to restore Google Play purchases.", "RESTORE_FAILED"); return;
                }
                JSArray values = new JSArray();
                for (Purchase item : list) if (item.getPurchaseState() == Purchase.PurchaseState.PURCHASED) values.put(purchaseJSON(item));
                JSObject response = new JSObject(); response.put("purchases", values); call.resolve(response);
            }));
    }

    @PluginMethod public void manageSubscriptions(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/account/subscriptions?package=" + getContext().getPackageName()));
            getContext().startActivity(intent); call.resolve();
        } catch (Exception e) { call.reject("Unable to open Google Play subscriptions.", "STORE_UNAVAILABLE"); }
    }

    private JSObject purchaseJSON(Purchase purchase) {
        JSObject value = new JSObject(); value.put("purchaseToken", purchase.getPurchaseToken());
        value.put("products", new JSArray(purchase.getProducts())); return value;
    }
}
