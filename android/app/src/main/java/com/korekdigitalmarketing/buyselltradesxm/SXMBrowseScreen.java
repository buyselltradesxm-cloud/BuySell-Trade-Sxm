package com.korekdigitalmarketing.buyselltradesxm;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.HorizontalScrollView;

import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.ump.UserMessagingPlatform;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.HttpURLConnection;
import java.net.URL;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/** Public listings use the same read-only endpoint and filtering as iOS. */
final class SXMBrowseScreen extends ScrollView {
    private static final int SEA = Color.rgb(11, 110, 127), INK = Color.rgb(19, 42, 46);
    private static final int PAPER = Color.rgb(251, 247, 239);
    private static final String ENDPOINT = "https://szhaxlmronirhnntlwyb.supabase.co/rest/v1/listings" +
        "?select=id,title,description,category,subcategory,area,side,currency,price_eur,price_usd,photos,thumb_photos,created_at" +
        "&seller_id=not.is.null&or=(status.is.null,status.in.(active,reserved))&order=created_at.desc&limit=300";
    // Public publishable key; protected writes continue through the signed-in WebView.
    private static final String PUBLIC_KEY = "sb_publishable_2EgfSBNrfE-5rIC2qS__tg_dCoEFyac";
    // Same words as the website's searchAliases(), so "bike" finds a scooter filed under Vehicles.
    private static final java.util.Map<String, String> SEARCH_WORDS = new java.util.HashMap<>();
    static {
        String[][] rows = {
            {"voit", "vehicules vehicles vehicle car cars voiture voitures auto autos camion truck trucks"},
            {"immo", "immobilier property real estate maison apartment appartement rent rental sale vendre louer"},
            {"elec", "electronique electronics electronic phone phones laptop laptops ordinateur telephone"},
            {"meub", "maison meubles home furniture sofa canape table chair chaise"},
            {"mode", "mode fashion"},
            {"job", "emploi jobs job work travail hiring cv resume"},
            {"serv", "services service cleaning plumber plumbing mechanic construction beauty"},
            {"pets", "animaux pets"},
            {"bat", "bateaux boats boat bateau jet ski jetski nautique marine"},
            {"gaming", "gaming"},
            {"beauty", "beaute beauty"},
            {"scoot", "motos scooters motorcycles scooter moto motorcycle bike bikes"},
            {"locvoit", "locations de voitures car rentals cars voiture rental location louer"},
            {"menag", "electromenager appliances appliance frigo refrigerator washer washing"},
            {"dining", "restaurants bars sorties nightlife restaurant bar pub beach club cafe food truck sortie"},
            {"tourism", "excursions activites tours activities tour excursion activite plongee snorkeling diving jet ski spa wellness"},
            {"transport", "taxis transferts transfers taxi transfert airport aeroport chauffeur navette shuttle cruise croisiere"},
            {"food", "alimentation boissons food drinks foods boisson meal repas"},
            {"lois", "loisirs leisure"},
            {"billet", "billetterie tickets"},
            {"pro", "materiel pro business gear"},
            {"bonplan", "bons plans deals"},
            {"scooter-sale", "scooter scooters moto motos motorcycle motorcycles motorbike motorbikes bike bikes"},
            {"motorbike-sale", "scooter scooters moto motos motorcycle motorcycles motorbike motorbikes bike bikes"},
            {"motorbike-parts", "scooter scooters moto motos motorcycle motorcycles motorbike motorbikes bike bikes"},
            {"scooter-mechanic", "scooter scooters moto motos motorcycle motorcycles motorbike motorbikes bike bikes"},
            {"bike-equipment", "velo velos bicycle bicycles bike bikes"}
        };
        for (String[] row : rows) SEARCH_WORDS.put(row[0], row[1]);
    }
    static String fold(String text) {
        return java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "").toLowerCase(java.util.Locale.ROOT);
    }
    static boolean matchesSearch(JSONObject l, String[] terms) {
        String text = fold(l.optString("title") + " " + l.optString("description") + " " + l.optString("area")) + " " +
            SEARCH_WORDS.getOrDefault(l.optString("category"), "") + " " + SEARCH_WORDS.getOrDefault(l.optString("subcategory"), "");
        for (String term : terms) if (!text.contains(term)) return false;
        return true;
    }
    private final ExecutorService io = Executors.newFixedThreadPool(3);
    private final List<JSONObject> listings = new ArrayList<>();
    private final List<JSONObject> savedRows = new ArrayList<>();
    private final Set<String> saved;
    private final Consumer<String> open;
    private final Consumer<Boolean> languageChanged;
    private final Runnable post, alerts;
    private boolean french;
    private final LinearLayout grid, filters;
    private final LinearLayout adContainer;
    private AdView inlineAd;
    private TextView adDisclosure;
    private final Runnable adRetry = this::loadInlineAd;
    private boolean adsAllowed;
    private long lastAdAttemptAt;
    private final TextView heading, status, header, tagline, locationSubtitle, cta;
    private final TextView spotlightTitle, spotlightCaption, spotlightAction;
    private final LinearLayout spotlight;
    private final TextView frButton, enButton, refreshButton, bellButton, locationCaption;
    private final EditText search;
    private String category = "", side = "", area = "";
    private TextView locationPicker;
    private LinearLayout locationCard;
    private ImageView globe;
    private static final String[] AREAS_FR = {"Marigot","Concordia","Agrément","Galisbay","Hameau du Pont","Saint-James","Bellevue","Sandy Ground","Baie Nettlé","Terres Basses","Grand Case","La Savane","Cul-de-Sac","Anse Marcel","Colombier","Rambaud","Saint-Louis","Friar's Bay","Quartier d'Orléans","Oyster Pond","Baie Orientale"};
    private static final String[] AREAS_NL = {"Philipsburg","Simpson Bay","Cole Bay","Maho","Beacon Hill","Cupecoy","Mullet Bay","Lowlands","Pelican Key","Cay Bay","Cay Hill","Little Bay","Belair","Point Blanche","Guana Bay","Dawn Beach","Oyster Pond","Dutch Quarter","Middle Region","Madame Estate","Sucker Garden","Belvedere","Defiance","St. Peters","Saunders","South Reward","Ebenezer","Cul de Sac","St. John's Estate","Mary's Estate / Mary's Fancy","Sentry Hill","Pond Island","Indigo Bay","Orange Grove","Billy Folly","Point Pirouette"};
    private boolean savedOnly;
    private int generation;
    private int visibleLimit = 40;

    SXMBrowseScreen(Context context, Consumer<String> open, Runnable post, Runnable alerts,
                    Consumer<Boolean> languageChanged, boolean french) {
        super(context);
        this.open = open; this.post = post; this.alerts = alerts;
        this.languageChanged = languageChanged; this.french = french;
        saved = new HashSet<>(context.getSharedPreferences("sxm.browse", 0).getStringSet("saved", new HashSet<>()));
        try {
            JSONArray stored = new JSONArray(context.getSharedPreferences("sxm.browse", 0).getString("savedRows", "[]"));
            for (int i = 0; i < stored.length(); i++) {
                JSONObject row = stored.optJSONObject(i);
                if (row != null) savedRows.add(row);
            }
        } catch (Exception ignored) {}
        setBackgroundColor(PAPER);
        setFillViewport(true);
        LinearLayout page = new LinearLayout(context);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(16), dp(16), dp(16), dp(24));
        addView(page);
        LinearLayout top = new LinearLayout(context);
        top.setGravity(Gravity.CENTER_VERTICAL);
        page.addView(top, new LinearLayout.LayoutParams(-1, dp(56)));
        LinearLayout titleGroup = new LinearLayout(context);
        titleGroup.setOrientation(LinearLayout.VERTICAL);
        top.addView(titleGroup, new LinearLayout.LayoutParams(0, -2, 1));
        TextView brand = label("BUY SELL TRADE · SXM", 10, true);
        brand.setLetterSpacing(.12f); brand.setTextColor(SEA);
        titleGroup.addView(brand);
        header = label("", 27, true); titleGroup.addView(header);
        LinearLayout language = new LinearLayout(context);
        language.setGravity(Gravity.CENTER);
        language.setPadding(dp(3), dp(3), dp(3), dp(3));
        language.setBackground(shape(INK, 16));
        globe = new ImageView(context);
        globe.setImageResource(R.drawable.ic_globe);
        globe.setColorFilter(SEA);
        globe.setPadding(dp(7), dp(7), dp(7), dp(7));
        globe.setBackground(shape(Color.rgb(228, 243, 243), 18));
        globe.setContentDescription(french ? "Langue" : "Language");
        LinearLayout.LayoutParams globeParams = new LinearLayout.LayoutParams(dp(36), dp(36));
        globeParams.rightMargin = dp(7);
        top.addView(globe, globeParams);
        top.addView(language, new LinearLayout.LayoutParams(dp(98), dp(44)));
        frButton = languageOption("FR"); enButton = languageOption("EN");
        language.addView(frButton, new LinearLayout.LayoutParams(0, -1, 1));
        language.addView(enButton, new LinearLayout.LayoutParams(0, -1, 1));
        frButton.setOnClickListener(v -> changeLanguage(true));
        enButton.setOnClickListener(v -> changeLanguage(false));

        LinearLayout intro = new LinearLayout(context);
        intro.setGravity(Gravity.CENTER_VERTICAL);
        page.addView(intro, new LinearLayout.LayoutParams(-1, dp(42)));
        tagline = label("", 13, false); tagline.setTextColor(Color.rgb(89, 110, 111));
        intro.addView(tagline, new LinearLayout.LayoutParams(0, -2, 1));
        refreshButton = iconAction("↻", () -> refresh());
        bellButton = iconAction("🔔", alerts);
        intro.addView(refreshButton, new LinearLayout.LayoutParams(dp(42), dp(42)));
        LinearLayout.LayoutParams bellParams = new LinearLayout.LayoutParams(dp(42), dp(42));
        bellParams.leftMargin = dp(8); intro.addView(bellButton, bellParams);
        search = new EditText(context);
        search.setSingleLine(true);
        search.setTextSize(16);
        search.setHint(french ? "Que cherchez-vous ?" : "What are you looking for?");
        search.setBackground(outlinedShape(Color.WHITE, 16, Color.rgb(218, 227, 225)));
        search.setCompoundDrawablesWithIntrinsicBounds(android.R.drawable.ic_menu_search, 0, 0, 0);
        search.setCompoundDrawablePadding(dp(10));
        search.setPadding(dp(16), 0, dp(14), 0);
        LinearLayout.LayoutParams searchParams = new LinearLayout.LayoutParams(-1, dp(48));
        searchParams.topMargin = dp(3); page.addView(search, searchParams);
        search.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            public void onTextChanged(CharSequence s, int start, int before, int count) { render(); }
            public void afterTextChanged(Editable s) {}
        });
        filters = new LinearLayout(context);
        filters.setOrientation(LinearLayout.VERTICAL);
        page.addView(filters);
        locationCard = new LinearLayout(context);
        locationCard.setGravity(Gravity.CENTER_VERTICAL);
        locationCard.setPadding(dp(14), dp(9), dp(12), dp(9));
        locationCard.setBackground(outlinedShape(Color.WHITE, 17, Color.rgb(192, 224, 224)));
        LinearLayout locationCopy = new LinearLayout(context);
        locationCopy.setOrientation(LinearLayout.VERTICAL);
        locationCard.addView(locationCopy, new LinearLayout.LayoutParams(0, -2, 1));
        locationPicker = label("", 16, true);
        locationPicker.setTextColor(INK);
        locationPicker.setSingleLine(true);
        locationPicker.setEllipsize(android.text.TextUtils.TruncateAt.END);
        locationCopy.addView(locationPicker);
        locationCaption = label("", 11, false);
        locationCaption.setTextColor(Color.rgb(89, 110, 111));
        locationCaption.setSingleLine(true);
        locationCopy.addView(locationCaption);
        TextView explore = label("➜", 20, true);
        explore.setTextColor(Color.WHITE);
        explore.setGravity(Gravity.CENTER);
        explore.setBackground(shape(SEA, 17));
        LinearLayout.LayoutParams exploreParams = new LinearLayout.LayoutParams(dp(34), dp(34));
        exploreParams.leftMargin = dp(8);
        locationCard.addView(explore, exploreParams);
        locationCard.setOnClickListener(v -> showLocations());
        buildFilters();
        spotlight = new LinearLayout(context);
        spotlight.setGravity(Gravity.CENTER_VERTICAL);
        spotlight.setPadding(dp(15), dp(10), dp(12), dp(10));
        GradientDrawable glow = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,
            new int[]{SEA, Color.rgb(20, 65, 78)});
        glow.setCornerRadius(dp(17)); spotlight.setBackground(glow);
        LinearLayout.LayoutParams spotlightParams = new LinearLayout.LayoutParams(-1, dp(64));
        spotlightParams.topMargin = dp(10); page.addView(spotlight, spotlightParams);
        LinearLayout spotlightCopy = new LinearLayout(context);
        spotlightCopy.setOrientation(LinearLayout.VERTICAL);
        spotlight.addView(spotlightCopy, new LinearLayout.LayoutParams(0, -2, 1));
        spotlightTitle = label("", 16, true); spotlightTitle.setTextColor(Color.WHITE);
        spotlightCopy.addView(spotlightTitle);
        spotlightCaption = label("", 11, false);
        spotlightCaption.setTextColor(Color.rgb(221, 244, 241));
        spotlightCopy.addView(spotlightCaption);
        spotlightAction = label("", 12, true);
        spotlightAction.setTextColor(Color.WHITE); spotlightAction.setGravity(Gravity.CENTER);
        spotlightAction.setBackground(shape(Color.rgb(231, 78, 56), 12));
        spotlightAction.setOnClickListener(v -> post.run());
        LinearLayout.LayoutParams spotlightActionParams = new LinearLayout.LayoutParams(dp(82), dp(40));
        spotlightActionParams.leftMargin = dp(8); spotlight.addView(spotlightAction, spotlightActionParams);
        heading = label("", 25, true);
        LinearLayout.LayoutParams headingParams = new LinearLayout.LayoutParams(-1, -2);
        headingParams.topMargin = dp(15); headingParams.bottomMargin = dp(2);
        page.addView(heading, headingParams);
        locationSubtitle = label("", 13, false);
        locationSubtitle.setTextColor(Color.rgb(89, 110, 111));
        page.addView(locationSubtitle);
        status = label("", 13, false); page.addView(status);
        adContainer = new LinearLayout(context);
        adContainer.setOrientation(LinearLayout.VERTICAL);
        adContainer.setGravity(Gravity.CENTER_HORIZONTAL);
        adContainer.setPadding(0, dp(12), 0, dp(12));
        adContainer.setBackground(outlinedShape(Color.rgb(244, 249, 247), 16,
            Color.rgb(218, 230, 227)));
        adContainer.setVisibility(View.GONE);
        grid = new LinearLayout(context); grid.setOrientation(LinearLayout.VERTICAL); page.addView(grid);
        cta = button("");
        LinearLayout.LayoutParams ctaParams = new LinearLayout.LayoutParams(-1, dp(54));
        ctaParams.topMargin = dp(24); page.addView(cta, ctaParams);
        cta.setOnClickListener(v -> post.run());
        updateLanguageText();
        try {
            JSONArray cached = new JSONArray(context.getSharedPreferences("sxm.browse", 0).getString("feed", "[]"));
            setRows(cached);
        } catch (Exception ignored) {}
        render();
        refresh();
    }

    private void showLocations() {
        String[] choices = french ? new String[]{"Toute l'île", "Côté français", "Côté hollandais"} :
            new String[]{"Whole island", "French side", "Dutch side"};
        new android.app.AlertDialog.Builder(getContext())
            .setTitle(french ? "Où chercher ?" : "Where to search?")
            .setItems(choices, (dialog, which) -> {
                if (which == 0) { chooseLocation("", ""); return; }
                String chosenSide = which == 1 ? "fr" : "nl";
                String[] districts = which == 1 ? AREAS_FR : AREAS_NL;
                String[] items = new String[districts.length + 1];
                items[0] = french ? "Tous les quartiers" : "All areas";
                System.arraycopy(districts, 0, items, 1, districts.length);
                new android.app.AlertDialog.Builder(getContext()).setTitle(choices[which])
                    .setItems(items, (areaDialog, index) -> chooseLocation(chosenSide, index == 0 ? "" : districts[index - 1]))
                    .setNegativeButton(french ? "Annuler" : "Cancel", null).show();
            }).setNegativeButton(french ? "Annuler" : "Cancel", null).show();
    }

    private void chooseLocation(String chosenSide, String chosenArea) {
        side = chosenSide; area = chosenArea; visibleLimit = 40;
        updateLocationText();
        render();
    }

    private void updateLocationText() {
        String label = side.isEmpty() ? (french ? "Toute l'île" : "Whole island") :
            side.equals("fr") ? (french ? "Côté français" : "French side") : (french ? "Côté hollandais" : "Dutch side");
        locationPicker.setText("⌖  " + (area.isEmpty() ? "" : area + " · ") + label);
        locationCaption.setText(area.isEmpty()
            ? (side.isEmpty() ? (french ? "Les bonnes affaires des deux côtés" : "Great finds on both sides")
                : (french ? "Explorez tous les quartiers" : "Explore every neighborhood"))
            : (french ? "Découvrez les annonces du quartier" : "Discover listings in this area"));
        locationCard.setContentDescription((french ? "Choisir une zone : " : "Choose an area: ") + locationPicker.getText());
    }

    private void changeLanguage(boolean useFrench) {
        if (french == useFrench) return;
        applyLanguage(useFrench);
        languageChanged.accept(french);
    }

    void applyLanguage(boolean useFrench) {
        if (french == useFrench) return;
        french = useFrench;
        getContext().getSharedPreferences("sxm.browse", 0).edit().putBoolean("french", french).apply();
        status.setText("");
        updateLanguageText();
    }

    private void updateLanguageText() {
        header.setText(savedOnly ? (french ? "Favoris" : "Saved") :
            (french ? "Découvrir" : "Discover"));
        tagline.setText(french ? "Des trouvailles sur toute l'île" : "Good finds across the island");
        search.setHint(french ? "Que cherchez-vous ?" : "What are you looking for?");
        refreshButton.setContentDescription(french ? "Actualiser les annonces" : "Refresh listings");
        bellButton.setContentDescription(french ? "Notifications" : "Notifications");
        frButton.setBackground(shape(french ? SEA : Color.TRANSPARENT, 13));
        enButton.setBackground(shape(french ? Color.TRANSPARENT : SEA, 13));
        frButton.setContentDescription(french ? "Français sélectionné" : "Switch to French");
        enButton.setContentDescription(french ? "Passer en anglais" : "English selected");
        frButton.setSelected(french); enButton.setSelected(!french);
        if (adDisclosure != null) adDisclosure.setText(french ? "PUBLICITÉ" : "ADVERTISEMENT");
        globe.setContentDescription(french ? "Langue" : "Language");
        cta.setText(french ? "+  Publier une annonce" : "+  Post a listing");
        spotlightTitle.setText(french ? "Deux côtés. Un marché." : "Two sides. One market.");
        spotlightCaption.setText(french ? "Achetez et vendez sur toute l'île" : "Buy and sell across the island");
        spotlightAction.setText(french ? "Publier ↗" : "Post ↗");
        buildFilters();
        updateLocationText();
        render();
    }

    private int dp(float n) { return (int) (n * getResources().getDisplayMetrics().density + .5f); }
    private GradientDrawable shape(int color, int radius) {
        GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radius)); return d;
    }
    private GradientDrawable outlinedShape(int color, int radius, int border) {
        GradientDrawable d = shape(color, radius); d.setStroke(dp(1), border); return d;
    }
    private TextView languageOption(String text) {
        TextView option = label(text, 13, true); option.setTextColor(Color.WHITE);
        option.setGravity(Gravity.CENTER); option.setMinHeight(dp(38)); return option;
    }
    private TextView iconAction(String glyph, Runnable action) {
        TextView button = label(glyph, 24, true);
        button.setGravity(Gravity.CENTER); button.setTextColor(SEA);
        button.setBackground(shape(Color.rgb(228, 243, 243), 14));
        button.setOnClickListener(v -> action.run()); return button;
    }
    private TextView label(String text, int size, boolean bold) {
        TextView view = new TextView(getContext()); view.setText(text); view.setTextColor(INK); view.setTextSize(size);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }
    private TextView button(String text) {
        TextView b = label(text, 14, true); b.setTextColor(Color.WHITE); b.setGravity(Gravity.CENTER);
        b.setBackground(shape(SEA, 15)); return b;
    }
    private void buildFilters() {
        filters.removeAllViews();
        addFilterRow(french ? new String[]{"Tout ▾", "Véhicules", "Immobilier", "Électronique", "Plus ▾"} :
            new String[]{"All ▾", "Vehicles", "Property", "Electronics", "More ▾"},
            new String[]{"", "voit", "immo", "elec", "*"});
        LinearLayout.LayoutParams pickerParams = new LinearLayout.LayoutParams(-1, dp(62));
        pickerParams.topMargin = dp(8);
        filters.addView(locationCard, pickerParams);
    }
    private void addFilterRow(String[] names, String[] values) {
        HorizontalScrollView horizontal = new HorizontalScrollView(getContext());
        horizontal.setHorizontalScrollBarEnabled(false);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(40));
        params.topMargin = dp(8); filters.addView(horizontal, params);
        LinearLayout row = new LinearLayout(getContext());
        row.setOrientation(LinearLayout.HORIZONTAL);
        horizontal.addView(row);
        for (int i = 0; i < names.length; i++) {
            final String value = values[i];
            boolean active = !value.equals("*") && category.equals(value);
            TextView chip = label(names[i], 13, active);
            chip.setGravity(Gravity.CENTER); chip.setSingleLine(true);
            chip.setTextColor(active ? Color.WHITE : INK);
            chip.setPadding(dp(15), 0, dp(15), 0);
            chip.setBackground(outlinedShape(active ? SEA : Color.WHITE, 13,
                active ? SEA : Color.rgb(219, 229, 226)));
            LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(-2, -1);
            cp.rightMargin = dp(8); row.addView(chip, cp);
            chip.setOnClickListener(v -> {
                if (value.isEmpty() || value.equals("*")) { showCategories(); return; }
                category = value;
                visibleLimit = 40;
                buildFilters();
                render();
            });
        }
    }
    private void showCategories() {
        String[] ids = {"", "voit", "immo", "elec", "meub", "mode", "job", "serv", "pets",
            "bat", "gaming", "beauty", "scoot", "locvoit", "menag", "dining", "tourism",
            "transport", "food", "lois", "billet", "pro", "bonplan", "autres"};
        String[] fr = {"Toutes", "Véhicules", "Immobilier", "Électronique", "Maison & meubles",
            "Mode", "Emploi", "Services", "Animaux", "Bateaux", "Gaming", "Beauté",
            "Motos & scooters", "Location de voitures", "Électroménager", "Restaurants",
            "Excursions", "Taxis & transferts", "Alimentation & boissons", "Loisirs",
            "Billetterie", "Matériel pro", "Bons plans", "Autres"};
        String[] en = {"All", "Vehicles", "Property", "Electronics", "Home & furniture",
            "Fashion", "Jobs", "Services", "Pets", "Boats", "Gaming", "Beauty",
            "Motorcycles", "Car rentals", "Appliances", "Restaurants", "Tours",
            "Taxis & transfers", "Food & drinks", "Leisure", "Tickets", "Business gear",
            "Deals", "Other"};
        new android.app.AlertDialog.Builder(getContext())
            .setTitle(french ? "Catégorie" : "Category")
            .setItems(french ? fr : en, (dialog, which) -> {
                category = ids[which]; visibleLimit = 40; buildFilters(); render();
            }).show();
    }
    void showSaved(boolean value) {
        savedOnly = value; search.setText(""); render(); scrollTo(0, 0);
        spotlight.setVisibility(savedOnly ? View.GONE : View.VISIBLE);
        header.setText(savedOnly ? (french ? "Favoris" : "Saved") : (french ? "Découvrir" : "Discover"));
        if (adContainer != null) adContainer.setVisibility(!savedOnly && adsAllowed && inlineAd != null && inlineAd.getTag() == Boolean.TRUE ? View.VISIBLE : View.GONE);
        if (!savedOnly) loadInlineAd();
    }

    void setAdsAllowed(boolean allowed) {
        adsAllowed = allowed;
        if (!allowed) {
            removeCallbacks(adRetry);
            adContainer.setVisibility(View.GONE);
            if (inlineAd != null) { inlineAd.destroy(); inlineAd = null; adContainer.removeAllViews(); adDisclosure = null; }
            lastAdAttemptAt = 0;
        } else loadInlineAd();
    }

    private void loadInlineAd() {
        if (!adsAllowed || savedOnly || inlineAd != null ||
            !UserMessagingPlatform.getConsentInformation(getContext()).canRequestAds() ||
            (lastAdAttemptAt != 0 && android.os.SystemClock.elapsedRealtime() - lastAdAttemptAt < 60000)) return;
        lastAdAttemptAt = android.os.SystemClock.elapsedRealtime();
        boolean debug = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        AdView view = new AdView(getContext());
        inlineAd = view;
        view.setAdUnitId(debug ? "ca-app-pub-3940256099942544/6300978111" :
            getResources().getString(R.string.admob_browse_banner_id));
        int width = Math.max(250, (int) ((getResources().getDisplayMetrics().widthPixels - dp(36)) /
            getResources().getDisplayMetrics().density));
        view.setAdSize(AdSize.getInlineAdaptiveBannerAdSize(width, 110));
        view.setAdListener(new AdListener() {
            @Override public void onAdLoaded() {
                if (inlineAd == view) {
                    view.setTag(Boolean.TRUE);
                    adContainer.setVisibility(adsAllowed && !savedOnly ? View.VISIBLE : View.GONE);
                }
            }
            @Override public void onAdFailedToLoad(LoadAdError error) {
                if (inlineAd == view) {
                    adContainer.setVisibility(View.GONE);
                    adContainer.removeAllViews();
                    view.destroy();
                    inlineAd = null;
                    adDisclosure = null;
                    removeCallbacks(adRetry);
                    postDelayed(adRetry, 60000);
                }
            }
        });
        adDisclosure = label(french ? "PUBLICITÉ" : "ADVERTISEMENT", 10, true);
        adDisclosure.setTextColor(SEA);
        adDisclosure.setLetterSpacing(.1f);
        LinearLayout.LayoutParams disclosureParams = new LinearLayout.LayoutParams(-1, -2);
        disclosureParams.leftMargin = dp(12);
        disclosureParams.bottomMargin = dp(8);
        adContainer.addView(adDisclosure, disclosureParams);
        adContainer.addView(view, new LinearLayout.LayoutParams(-1, -2));
        view.loadAd(new AdRequest.Builder().build());
    }

    void resumeAd() { if (inlineAd != null) inlineAd.resume(); }
    void pauseAd() { if (inlineAd != null) inlineAd.pause(); }
    void destroyAd() { removeCallbacks(adRetry); if (inlineAd != null) { inlineAd.destroy(); inlineAd = null; } io.shutdownNow(); }
    private void setRows(JSONArray rows) {
        listings.clear();
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row != null && !row.optString("title").isEmpty()) listings.add(row);
        }
    }
    private void refresh() {
        status.setText(french ? "Chargement des annonces…" : "Loading listings…");
        io.execute(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(ENDPOINT).openConnection();
                connection.setConnectTimeout(12000); connection.setReadTimeout(12000);
                connection.setRequestProperty("apikey", PUBLIC_KEY);
                connection.setRequestProperty("Authorization", "Bearer " + PUBLIC_KEY);
                try {
                    if (connection.getResponseCode() != 200) throw new Exception("HTTP " + connection.getResponseCode());
                    BufferedReader reader = new BufferedReader(new InputStreamReader(
                        connection.getInputStream(), java.nio.charset.StandardCharsets.UTF_8));
                    StringBuilder body = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) body.append(line);
                    String json = body.toString();
                    JSONArray rows = new JSONArray(json);
                    post(() -> {
                        setRows(rows);
                        getContext().getSharedPreferences("sxm.browse", 0).edit().putString("feed", json).apply();
                        status.setText(""); render();
                    });
                } finally { connection.disconnect(); }
            } catch (Exception error) {
                post(() -> status.setText(french ? "Hors ligne : annonces enregistrées" : "Offline: saved listings"));
            }
        });
    }
    private void render() {
        if (grid == null) return;
        generation++;
        grid.removeAllViews();
        heading.setText(savedOnly ? (french ? "Vos annonces enregistrées" : "Your saved listings") :
            (french ? "Annonces récentes" : "Recent listings"));
        locationSubtitle.setText(savedOnly ? (french ? "Les annonces que vous aimez" : "Listings you love") :
            (french ? "Trouvez votre prochain coup de cœur" : "Find your next favorite thing"));
        List<JSONObject> shown = new ArrayList<>();
        String query = fold(search.getText().toString()).trim();
        String[] terms = query.split("\\s+");
        for (JSONObject l : savedOnly ? savedRows : listings) {
            String id = l.optString("id");
            if (savedOnly && !saved.contains(id)) continue;
            if (!category.isEmpty() && !category.equals(l.optString("category"))) continue;
            if (!side.isEmpty() && !side.equals(l.optString("side"))) continue;
            if (!area.isEmpty() && !area.equalsIgnoreCase(l.optString("area"))) continue;
            if (!query.isEmpty() && !matchesSearch(l, terms)) continue;
            shown.add(l);
        }
        if (shown.isEmpty()) {
            TextView empty = label(french ? "Aucune annonce ici pour le moment. Essayez un autre quartier ou une autre catégorie." :
                "Nothing here yet. Try another area or category.", 15, false);
            empty.setTextColor(Color.rgb(89, 110, 111));
            empty.setPadding(dp(18), dp(22), dp(18), dp(22));
            empty.setBackground(shape(Color.WHITE, 15));
            grid.addView(empty);
            return;
        }
        int width = getResources().getDisplayMetrics().widthPixels;
        boolean twoColumns = width >= dp(300);
        for (int i = 0; i < Math.min(shown.size(), visibleLimit); i += twoColumns ? 2 : 1) {
            LinearLayout row = new LinearLayout(getContext());
            LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2); rp.bottomMargin = dp(12);
            grid.addView(row, rp);
            for (int j = i; j < Math.min(shown.size(), Math.min(visibleLimit, i + (twoColumns ? 2 : 1))); j++) {
                View card = card(shown.get(j), generation);
                LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(0, -2, 1);
                if (j > i) cp.leftMargin = dp(10); row.addView(card, cp);
                if (twoColumns && j == i && i + 1 >= Math.min(shown.size(), visibleLimit)) {
                    View spacer = new View(getContext());
                    LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(0, 1, 1); sp.leftMargin = dp(10); row.addView(spacer, sp);
                }
            }
            if (i == 0) {
                LinearLayout.LayoutParams adParams = new LinearLayout.LayoutParams(-1, -2);
                adParams.topMargin = dp(6);
                adParams.bottomMargin = dp(18);
                grid.addView(adContainer, adParams);
            }
        }
        if (shown.size() > visibleLimit) {
            TextView more = button(french ? "Afficher plus d’annonces" : "Show more listings");
            grid.addView(more, new LinearLayout.LayoutParams(-1, dp(50)));
            more.setOnClickListener(v -> { visibleLimit += 40; render(); });
        }
    }
    private View card(JSONObject l, int currentGeneration) {
        LinearLayout box = new LinearLayout(getContext()); box.setOrientation(LinearLayout.VERTICAL);
        box.setBackground(shape(Color.WHITE, 16)); box.setClipToOutline(true);
        box.setElevation(dp(2)); box.setPadding(0, 0, 0, dp(11));
        String id = l.optString("id"); box.setOnClickListener(v -> showDetail(l));
        ImageView photo = new ImageView(getContext());
        photo.setScaleType(ImageView.ScaleType.CENTER_CROP);
        photo.setBackgroundColor(Color.rgb(233, 238, 233));
        android.widget.FrameLayout imageFrame = new android.widget.FrameLayout(getContext());
        int imageHeight = Math.max(dp(130), (getResources().getDisplayMetrics().widthPixels - dp(42)) / 2);
        imageFrame.setBackground(shape(Color.rgb(233, 238, 233), 16));
        imageFrame.setClipToOutline(true);
        imageFrame.addView(photo, new android.widget.FrameLayout.LayoutParams(-1, -1));
        box.addView(imageFrame, new LinearLayout.LayoutParams(-1, imageHeight));
        JSONArray pictures = l.optJSONArray("thumb_photos");
        if (pictures == null || pictures.length() == 0) pictures = l.optJSONArray("photos");
        String photoURL = pictures == null ? "" : pictures.optString(0);
        loadPhoto(photoURL, photo, currentGeneration);
        android.widget.ImageButton heart = new android.widget.ImageButton(getContext());
        heart.setImageResource(R.drawable.tab_saved);
        heart.setColorFilter(saved.contains(id) ? Color.rgb(208, 70, 54) : INK);
        heart.setBackground(shape(Color.WHITE, 24));
        heart.setPadding(dp(10), dp(10), dp(10), dp(10));
        heart.setContentDescription(saved.contains(id) ? (french ? "Retirer des favoris" : "Remove from saved") : (french ? "Enregistrer" : "Save listing"));
        heart.setOnClickListener(v -> toggleSaved(id));
        android.widget.FrameLayout.LayoutParams hp = new android.widget.FrameLayout.LayoutParams(dp(44), dp(44), Gravity.TOP | Gravity.END);
        hp.setMargins(dp(6), dp(6), dp(6), dp(6));
        imageFrame.addView(heart, hp);
        TextView title = label(l.optString("title"), 14, true);
        title.setMaxLines(2); title.setMinLines(2);
        title.setEllipsize(android.text.TextUtils.TruncateAt.END);
        title.setPadding(dp(10), dp(10), dp(10), 0); box.addView(title);
        String priceText = price(l);
        if (!priceText.isEmpty()) {
            TextView value = label(priceText, 17, true);
            value.setTextColor(SEA); value.setPadding(dp(10), dp(5), dp(10), 0); box.addView(value);
        }
        TextView location = label(place(l), 11, false);
        location.setTextColor(Color.rgb(89, 110, 111));
        location.setMaxLines(2); location.setPadding(dp(10), dp(6), dp(10), 0);
        box.addView(location);
        return box;
    }
    private String place(JSONObject l) {
        String area = l.optString("area");
        return area + (area.isEmpty() ? "" : " · ") + (l.optString("side").equals("nl") ?
            (french ? "Côté hollandais" : "Dutch side") : (french ? "Côté français" : "French side"));
    }
    private String price(JSONObject l) {
        if (l.optString("category").equals("food")) return "";
        boolean usd = l.optString("currency").equals("usd");
        double amount = l.optDouble(usd ? "price_usd" : "price_eur", 0);
        return amount > 0 ? (usd ? "$" : "€") + java.text.NumberFormat.getIntegerInstance().format(amount) : "";
    }
    private void toggleSaved(String id) {
        if (!saved.add(id)) saved.remove(id);
        savedRows.removeIf(row -> id.equals(row.optString("id")));
        if (saved.contains(id)) {
            for (JSONObject row : listings) if (id.equals(row.optString("id"))) { savedRows.add(0, row); break; }
        }
        getContext().getSharedPreferences("sxm.browse", 0).edit()
            .putStringSet("saved", new HashSet<>(saved))
            .putString("savedRows", new JSONArray(savedRows).toString()).apply();
        render();
    }
    private void loadPhoto(String photoURL, ImageView photo, int currentGeneration) {
        photo.setTag(photoURL);
        if (photoURL.startsWith("https://")) io.execute(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(photoURL).openConnection();
                conn.setConnectTimeout(6000); conn.setReadTimeout(6000);
                try {
                    BitmapFactory.Options options = new BitmapFactory.Options();
                    options.inSampleSize = 4;
                    Bitmap bitmap = BitmapFactory.decodeStream(conn.getInputStream(), null, options);
                    if (bitmap != null) post(() -> {
                        if (generation == currentGeneration && photoURL.equals(photo.getTag())) photo.setImageBitmap(bitmap);
                    });
                } finally { conn.disconnect(); }
            } catch (Exception ignored) {}
        });
    }
    private void showDetail(JSONObject l) {
        String id = l.optString("id");
        LinearLayout content = new LinearLayout(getContext());
        content.setOrientation(LinearLayout.VERTICAL); content.setPadding(dp(18), dp(12), dp(18), dp(20));
        ImageView photo = new ImageView(getContext()); photo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        content.addView(photo, new LinearLayout.LayoutParams(-1, dp(260)));
        JSONArray photos = l.optJSONArray("photos");
        if (photos == null || photos.length() == 0) photos = l.optJSONArray("thumb_photos");
        final JSONArray gallery = photos;
        final int[] page = {0};
        if (gallery != null && gallery.length() > 0) loadPhoto(gallery.optString(0), photo, generation);
        if (gallery != null && gallery.length() > 1) {
            LinearLayout controls = new LinearLayout(getContext());
            TextView prev = label("◀", 22, true), next = label("▶", 22, true);
            prev.setContentDescription(french ? "Photo précédente" : "Previous photo");
            next.setContentDescription(french ? "Photo suivante" : "Next photo");
            controls.addView(prev, new LinearLayout.LayoutParams(0, dp(48), 1));
            controls.addView(next, new LinearLayout.LayoutParams(0, dp(48), 1));
            content.addView(controls);
            prev.setOnClickListener(v -> {
                page[0] = (page[0] + gallery.length() - 1) % gallery.length();
                loadPhoto(gallery.optString(page[0]), photo, generation);
            });
            next.setOnClickListener(v -> {
                page[0] = (page[0] + 1) % gallery.length();
                loadPhoto(gallery.optString(page[0]), photo, generation);
            });
        }
        TextView title = label(l.optString("title"), 22, true); content.addView(title);
        content.addView(label(place(l), 14, false));
        String amount = price(l);
        if (!amount.isEmpty()) {
            TextView value = label(amount, 20, true); value.setTextColor(SEA); content.addView(value);
        }
        TextView description = label(l.optString("description"), 15, false);
        LinearLayout.LayoutParams desc = new LinearLayout.LayoutParams(-1, -2);
        desc.topMargin = dp(12); content.addView(description, desc);
        TextView save = label("", 16, true);
        Runnable paintSave = () -> {
            boolean on = saved.contains(id);
            save.setText(on ? (french ? "Enregistré" : "Saved") : (french ? "Enregistrer" : "Save"));
            actionIcon(save, on ? R.drawable.ic_heart_filled : R.drawable.tab_saved, on ? Color.rgb(208, 70, 54) : INK);
        };
        paintSave.run();
        save.setOnClickListener(v -> { toggleSaved(id); paintSave.run(); });
        content.addView(save);
        TextView share = label(french ? "Partager l’annonce" : "Share listing", 16, true);
        actionIcon(share, R.drawable.ic_share, INK);
        share.setOnClickListener(v -> {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, "https://buyselltradesxm.com/?listing=" + Uri.encode(id));
            getContext().startActivity(Intent.createChooser(send, null));
        });
        content.addView(share);
        String area = l.optString("area");
        if (!area.isEmpty()) {
            TextView map = label(french ? "Voir le secteur sur la carte" : "View area on map", 16, true);
            actionIcon(map, R.drawable.ic_location, INK);
            map.setOnClickListener(v -> {
                Uri uri = Uri.parse("geo:0,0?q=" + Uri.encode(area +
                    (l.optString("side").equals("nl") ? ", Sint Maarten" : ", Saint-Martin")));
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                try { getContext().startActivity(intent); }
                catch (android.content.ActivityNotFoundException ignored) {}
            });
            content.addView(map);
        }
        TextView contact = button(french ? "Contacter le vendeur" : "Contact seller");
        LinearLayout.LayoutParams contactParams = new LinearLayout.LayoutParams(-1, dp(52));
        contactParams.topMargin = dp(18); content.addView(contact, contactParams);
        ScrollView scroll = new ScrollView(getContext());
        scroll.addView(content);
        android.app.AlertDialog dialog = new android.app.AlertDialog.Builder(getContext()).setView(scroll)
            .setNegativeButton(french ? "Fermer" : "Close", (d, which) -> {}).create();
        contact.setOnClickListener(v -> { dialog.dismiss(); open.accept(id); });
        dialog.show();
    }
    /** Puts a 24dp icon before a detail action and gives the row a 48dp tap height. */
    private void actionIcon(TextView row, int icon, int color) {
        android.graphics.drawable.Drawable d = androidx.appcompat.content.res.AppCompatResources.getDrawable(getContext(), icon).mutate();
        d.setTint(color);
        d.setBounds(0, 0, dp(24), dp(24));
        row.setCompoundDrawablesRelative(d, null, null, null);
        row.setCompoundDrawablePadding(dp(12));
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setMinHeight(dp(48));
    }
    @Override protected void onDetachedFromWindow() { super.onDetachedFromWindow(); io.shutdownNow(); }
}
