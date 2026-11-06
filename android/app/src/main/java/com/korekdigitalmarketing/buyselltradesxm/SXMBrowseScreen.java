package com.korekdigitalmarketing.buyselltradesxm;

import android.content.Context;
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
        "?select=id,title,description,category,area,side,currency,price_eur,price_usd,photos,thumb_photos,created_at" +
        "&seller_id=not.is.null&or=(status.is.null,status.in.(active,reserved))&order=created_at.desc&limit=300";
    // Public publishable key; protected writes continue through the signed-in WebView.
    private static final String PUBLIC_KEY = "sb_publishable_2EgfSBNrfE-5rIC2qS__tg_dCoEFyac";
    private final ExecutorService io = Executors.newFixedThreadPool(3);
    private final List<JSONObject> listings = new ArrayList<>();
    private final List<JSONObject> savedRows = new ArrayList<>();
    private final Set<String> saved;
    private final Consumer<String> open;
    private final Runnable post, alerts;
    private final boolean french;
    private final LinearLayout grid, filters;
    private final TextView heading, status;
    private final EditText search;
    private String category = "", side = "", area = "";
    private TextView locationPicker;
    private static final String[] AREAS_FR = {"Marigot","Concordia","Agrément","Galisbay","Hameau du Pont","Saint-James","Bellevue","Sandy Ground","Baie Nettlé","Terres Basses","Grand Case","La Savane","Cul-de-Sac","Anse Marcel","Colombier","Rambaud","Saint-Louis","Friar's Bay","Quartier d'Orléans","Oyster Pond","Baie Orientale"};
    private static final String[] AREAS_NL = {"Philipsburg","Simpson Bay","Cole Bay","Maho","Beacon Hill","Cupecoy","Mullet Bay","Lowlands","Pelican Key","Cay Bay","Cay Hill","Little Bay","Belair","Point Blanche","Guana Bay","Dawn Beach","Oyster Pond","Dutch Quarter","Middle Region","Madame Estate","Sucker Garden","Belvedere","Defiance","St. Peters","Saunders","South Reward","Ebenezer","Cul de Sac","St. John's Estate","Mary's Estate / Mary's Fancy","Sentry Hill","Pond Island","Indigo Bay","Orange Grove","Billy Folly","Point Pirouette"};
    private boolean savedOnly;
    private int generation;
    private int visibleLimit = 40;

    SXMBrowseScreen(Context context, Consumer<String> open, Runnable post, Runnable alerts, boolean french) {
        super(context);
        this.open = open; this.post = post; this.alerts = alerts; this.french = french;
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
        page.setPadding(dp(18), dp(18), dp(18), dp(24));
        addView(page);
        TextView header = label(french ? "Découvrez SXM" : "Discover SXM", 24, true);
        page.addView(header);
        LinearLayout actions = new LinearLayout(context);
        actions.setGravity(Gravity.END | Gravity.CENTER_VERTICAL);
        page.addView(actions, new LinearLayout.LayoutParams(-1, dp(42)));
        TextView reload = label("↻", 28, true);
        reload.setContentDescription(french ? "Actualiser les annonces" : "Refresh listings");
        reload.setTextColor(SEA);
        reload.setOnClickListener(v -> refresh());
        actions.addView(reload, new LinearLayout.LayoutParams(dp(52), -1));
        TextView bell = label("🔔", 22, true);
        bell.setContentDescription(french ? "Notifications" : "Notifications");
        bell.setGravity(Gravity.END); bell.setTextColor(SEA);
        bell.setOnClickListener(v -> alerts.run());
        actions.addView(bell, new LinearLayout.LayoutParams(dp(52), -1));
        TextView location = label(french ? "Toute l’île  ·  Saint-Martin & Sint Maarten" :
            "Whole island  ·  Saint-Martin & Sint Maarten", 13, false);
        location.setTextColor(SEA); page.addView(location);
        search = new EditText(context);
        search.setSingleLine(true);
        search.setTextSize(16);
        search.setHint(french ? "Que cherchez-vous ?" : "What are you looking for?");
        search.setBackground(shape(Color.WHITE, 16));
        search.setPadding(dp(14), 0, dp(14), 0);
        LinearLayout.LayoutParams searchParams = new LinearLayout.LayoutParams(-1, dp(52));
        searchParams.topMargin = dp(22); page.addView(search, searchParams);
        search.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            public void onTextChanged(CharSequence s, int start, int before, int count) { render(); }
            public void afterTextChanged(Editable s) {}
        });
        filters = new LinearLayout(context);
        filters.setOrientation(LinearLayout.VERTICAL);
        page.addView(filters);
        addFilterRow(french ? new String[]{"Tout", "Véhicules", "Logements", "Électronique", "Plus"} :
            new String[]{"All", "Cars", "Homes", "Electronics", "More"},
            new String[]{"", "voit", "immo", "elec", "*"}, false);
        locationPicker = button(french ? "Où chercher ? · Toute l'île" : "Where? · Whole island");
        locationPicker.setOnClickListener(v -> showLocations());
        filters.addView(locationPicker, new LinearLayout.LayoutParams(-1, dp(52)));
        heading = label("", 25, true);
        LinearLayout.LayoutParams headingParams = new LinearLayout.LayoutParams(-1, -2);
        headingParams.topMargin = dp(16); headingParams.bottomMargin = dp(14);
        page.addView(heading, headingParams);
        status = label("", 14, false); page.addView(status);
        grid = new LinearLayout(context); grid.setOrientation(LinearLayout.VERTICAL); page.addView(grid);
        TextView cta = button(french ? "Vendre un objet  +  Ajouter vos photos" : "Sell something  +  Add your photos");
        LinearLayout.LayoutParams ctaParams = new LinearLayout.LayoutParams(-1, dp(54));
        ctaParams.topMargin = dp(24); page.addView(cta, ctaParams);
        cta.setOnClickListener(v -> post.run());
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
        String label = side.isEmpty() ? (french ? "Toute l'île" : "Whole island") :
            side.equals("fr") ? (french ? "Côté français" : "French side") : (french ? "Côté hollandais" : "Dutch side");
        locationPicker.setText((area.isEmpty() ? "" : area + " · ") + label + " ▾");
        render();
    }

    private int dp(float n) { return (int) (n * getResources().getDisplayMetrics().density + .5f); }
    private GradientDrawable shape(int color, int radius) {
        GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radius)); return d;
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
    private void addFilterRow(String[] names, String[] values, boolean forSide) {
        LinearLayout row = new LinearLayout(getContext());
        row.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(43));
        params.topMargin = dp(12); filters.addView(row, params);
        for (int i = 0; i < names.length; i++) {
            final String value = values[i];
            TextView chip = label(names[i], 11, false);
            chip.setGravity(Gravity.CENTER); chip.setSingleLine(true);
            chip.setBackground(shape(Color.WHITE, 10));
            LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(0, -1, 1);
            cp.rightMargin = dp(4); row.addView(chip, cp);
            chip.setOnClickListener(v -> {
                if (forSide) side = value;
                else if (value.equals("*")) { showCategories(); return; }
                else category = value;
                visibleLimit = 40;
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
                category = ids[which]; visibleLimit = 40; render();
            }).show();
    }
    void showSaved(boolean value) { savedOnly = value; search.setText(""); render(); scrollTo(0, 0); }
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
        heading.setText(savedOnly ? (french ? "Vos favoris." : "Your saved finds.") :
            (french ? "De belles trouvailles. Tout près de vous." : "Good finds. Close by."));
        List<JSONObject> shown = new ArrayList<>();
        String query = search.getText().toString().trim().toLowerCase(java.util.Locale.ROOT);
        for (JSONObject l : savedOnly ? savedRows : listings) {
            String id = l.optString("id");
            if (savedOnly && !saved.contains(id)) continue;
            if (!category.isEmpty() && !category.equals(l.optString("category"))) continue;
            if (!side.isEmpty() && !side.equals(l.optString("side"))) continue;
            if (!area.isEmpty() && !area.equalsIgnoreCase(l.optString("area"))) continue;
            if (!query.isEmpty() && !(l.optString("title") + " " + l.optString("description") + " " +
                l.optString("area")).toLowerCase(java.util.Locale.ROOT).contains(query)) continue;
            shown.add(l);
        }
        if (shown.isEmpty()) {
            grid.addView(label(french ? "Aucune annonce trouvée" : "No listings found", 17, false));
            return;
        }
        int width = getResources().getDisplayMetrics().widthPixels;
        boolean twoColumns = width >= dp(300);
        for (int i = 0; i < Math.min(shown.size(), visibleLimit); i += twoColumns ? 2 : 1) {
            LinearLayout row = new LinearLayout(getContext());
            LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(-1, -2); rp.bottomMargin = dp(22);
            grid.addView(row, rp);
            for (int j = i; j < Math.min(shown.size(), Math.min(visibleLimit, i + (twoColumns ? 2 : 1))); j++) {
                View card = card(shown.get(j), generation);
                LinearLayout.LayoutParams cp = new LinearLayout.LayoutParams(0, -2, 1);
                if (j > i) cp.leftMargin = dp(12); row.addView(card, cp);
                if (twoColumns && j == i && i + 1 >= Math.min(shown.size(), visibleLimit)) {
                    View spacer = new View(getContext());
                    LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(0, 1, 1); sp.leftMargin = dp(12); row.addView(spacer, sp);
                }
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
        box.setBackgroundColor(Color.TRANSPARENT); box.setPadding(0, 0, 0, dp(8));
        String id = l.optString("id"); box.setOnClickListener(v -> showDetail(l));
        ImageView photo = new ImageView(getContext());
        photo.setScaleType(ImageView.ScaleType.CENTER_CROP);
        photo.setBackgroundColor(Color.rgb(233, 238, 233));
        android.widget.FrameLayout imageFrame = new android.widget.FrameLayout(getContext());
        int imageHeight = Math.max(dp(130), (getResources().getDisplayMetrics().widthPixels - dp(48)) / 2);
        imageFrame.setBackground(shape(Color.rgb(233, 238, 233), 14));
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
        TextView title = label(l.optString("title"), 15, true); title.setMaxLines(2); title.setMinLines(2); title.setEllipsize(android.text.TextUtils.TruncateAt.END); title.setPadding(0, dp(8), 0, 0); box.addView(title);
        TextView location = label(place(l), 12, false); location.setMaxLines(2); box.addView(location);
        String priceText = price(l);
        if (!priceText.isEmpty()) {
            TextView value = label(priceText, 17, true); value.setTextColor(SEA); box.addView(value);
        }
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
        TextView save = label(saved.contains(id) ? "♥  " + (french ? "Enregistré" : "Saved") :
            "♡  " + (french ? "Enregistrer" : "Save"), 16, true);
        save.setOnClickListener(v -> {
            toggleSaved(id);
            save.setText(saved.contains(id) ? "♥  " + (french ? "Enregistré" : "Saved") :
                "♡  " + (french ? "Enregistrer" : "Save"));
        });
        content.addView(save);
        TextView share = label(french ? "Partager l’annonce" : "Share listing", 16, true);
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
    @Override protected void onDetachedFromWindow() { super.onDetachedFromWindow(); io.shutdownNow(); }
}
