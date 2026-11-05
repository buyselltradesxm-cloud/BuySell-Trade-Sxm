import MapKit
import SwiftUI
import UIKit

/// The native "Browse" tab: listings read straight from the marketplace's
/// public API, searchable and filterable, with a native detail screen
/// (photo pager, zoom, map, share, saved list). Saved listings and the last
/// loaded feed are kept on the device, so both still open without a network.
/// Posting and messaging open native workflows; the account stays in the web view.

struct SXMListing: Codable, Identifiable, Equatable {
    let id: String
    let title: String
    let description: String?
    let category: String?
    let area: String?
    let side: String?
    let currency: String?
    let priceEur: Double?
    let priceUsd: Double?
    let photos: [String]?
    let thumbPhotos: [String]?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, description, category, area, side, currency, photos
        case priceEur = "price_eur", priceUsd = "price_usd", thumbPhotos = "thumb_photos", createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // Ids are numbers on older rows and uuids on newer ones.
        if let number = try? c.decode(Int.self, forKey: .id) { id = String(number) } else { id = try c.decode(String.self, forKey: .id) }
        title = (try? c.decode(String.self, forKey: .title)) ?? ""
        description = try? c.decode(String.self, forKey: .description)
        category = try? c.decode(String.self, forKey: .category)
        area = try? c.decode(String.self, forKey: .area)
        side = try? c.decode(String.self, forKey: .side)
        currency = try? c.decode(String.self, forKey: .currency)
        priceEur = try? c.decode(Double.self, forKey: .priceEur)
        priceUsd = try? c.decode(Double.self, forKey: .priceUsd)
        photos = try? c.decode([String].self, forKey: .photos)
        thumbPhotos = try? c.decode([String].self, forKey: .thumbPhotos)
        createdAt = try? c.decode(String.self, forKey: .createdAt)
    }

    var photoURLs: [URL] { (photos ?? []).compactMap { $0.hasPrefix("https://") ? URL(string: $0) : nil } }
    var thumbURL: URL? {
        (thumbPhotos ?? []).first.flatMap { $0.hasPrefix("https://") ? URL(string: $0) : nil } ?? photoURLs.first
    }
    var priceLabel: String? {
        // Food & Drinks listings are menus: the site shows no price for them either.
        if category == "food" { return nil }
        let usd = currency == "usd"
        guard let amount = usd ? priceUsd : priceEur, amount > 0 else { return nil }
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: "fr_FR")
        f.maximumFractionDigits = 0
        let text = f.string(from: NSNumber(value: amount)) ?? String(Int(amount))
        return usd ? "$\(text)" : "\(text) €"
    }
    var place: String {
        [area, side == "nl" ? "Sint Maarten" : "Saint-Martin"].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
    }
}

enum SXMCategories {
    static let all: [(id: String, fr: String, en: String, symbol: String)] = [
        ("voit", "Véhicules", "Vehicles", "car"),
        ("immo", "Immobilier", "Property", "house"),
        ("elec", "Électronique", "Electronics", "iphone"),
        ("meub", "Maison & meubles", "Home & Furniture", "sofa"),
        ("mode", "Mode", "Fashion", "tshirt"),
        ("job", "Emploi", "Jobs", "briefcase"),
        ("serv", "Services", "Services", "wrench.and.screwdriver"),
        ("pets", "Animaux", "Pets", "pawprint"),
        ("bat", "Bateaux", "Boats", "sailboat"),
        ("gaming", "Gaming", "Gaming", "gamecontroller"),
        ("beauty", "Beauté", "Beauty", "sparkles"),
        ("scoot", "Motos & scooters", "Motorcycles & scooters", "bicycle"),
        ("locvoit", "Locations de voitures", "Car rentals", "key"),
        ("menag", "Électroménager", "Appliances", "washer"),
        ("dining", "Restaurants, bars & sorties", "Restaurants, bars & nightlife", "fork.knife"),
        ("tourism", "Excursions & activités", "Tours & activities", "binoculars"),
        ("transport", "Taxis & transferts", "Taxis & transfers", "bus"),
        ("food", "Alimentation & Boissons", "Food & Drinks", "cart"),
        ("lois", "Loisirs", "Leisure", "figure.walk"),
        ("billet", "Billetterie", "Tickets", "ticket"),
        ("pro", "Matériel pro", "Business gear", "hammer"),
        ("bonplan", "Bons plans", "Deals", "tag"),
        ("autres", "Plus", "More", "ellipsis.circle")
    ]
    static func name(_ id: String?, french: Bool) -> String? {
        all.first { $0.id == id }.map { french ? $0.fr : $0.en }
    }
}

@MainActor
final class SXMBrowseModel: ObservableObject {
    static let supabaseURL = "https://szhaxlmronirhnntlwyb.supabase.co"
    // The public "anon" key, the same one the website ships: it only reads what any visitor can see.
    static let anonKey = "sb_publishable_2EgfSBNrfE-5rIC2qS__tg_dCoEFyac"
    private static let cacheKey = "sxm.browse.cache"
    private static let savedKey = "sxm.browse.saved"

    @Published var listings: [SXMListing] = []
    @Published var saved: [SXMListing] = []
    @Published var loading = false
    @Published var offline = false
    @Published var french: Bool
    @Published var showingSaved = false
    private var loadedOnce = false

    /// Opens the authenticated native conversation with this listing's seller.
    var contact: (SXMListing) -> Void = { _ in }
    var post: () -> Void = {}
    var alerts: () -> Void = {}

    init(french: Bool) {
        self.french = french
        listings = Self.load(Self.cacheKey)
        saved = Self.load(Self.savedKey)
    }

    /// First appearance only; coming back from a detail screen must not reload the feed.
    func loadOnce() async {
        guard !loadedOnce else { return }
        loadedOnce = true
        await refresh()
    }

    func refresh() async {
        loading = true
        defer { loading = false }
        var parts = URLComponents(string: "\(Self.supabaseURL)/rest/v1/listings")!
        parts.queryItems = [
            URLQueryItem(name: "select", value: "id,title,description,category,area,side,currency,price_eur,price_usd,photos,thumb_photos,created_at"),
            URLQueryItem(name: "seller_id", value: "not.is.null"),
            URLQueryItem(name: "or", value: "(status.is.null,status.in.(active,reserved))"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "limit", value: "300")
        ]
        var request = URLRequest(url: parts.url!, timeoutInterval: 15)
        request.setValue(Self.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(Self.anonKey)", forHTTPHeaderField: "Authorization")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            let rows = try JSONDecoder().decode([SXMListing].self, from: data).filter { !$0.title.isEmpty }
            listings = rows
            offline = false
            Self.store(rows, Self.cacheKey)
        } catch {
            // Keep showing the last feed loaded on this device.
            offline = true
        }
    }

    func isSaved(_ l: SXMListing) -> Bool { saved.contains { $0.id == l.id } }

    func toggleSaved(_ l: SXMListing) {
        if isSaved(l) { saved.removeAll { $0.id == l.id } } else { saved.insert(l, at: 0) }
        Self.store(saved, Self.savedKey)
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    func shareURL(_ l: SXMListing) -> URL {
        URL(string: "https://buyselltradesxm.com/?listing=\(l.id)")!
    }

    private static func load(_ key: String) -> [SXMListing] {
        guard let data = UserDefaults.standard.data(forKey: key) else { return [] }
        return (try? JSONDecoder().decode([SXMListing].self, from: data)) ?? []
    }

    private static func store(_ rows: [SXMListing], _ key: String) {
        if let data = try? JSONEncoder().encode(rows) { UserDefaults.standard.set(data, forKey: key) }
    }
}

extension SXMListing {
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(title, forKey: .title)
        try c.encodeIfPresent(description, forKey: .description)
        try c.encodeIfPresent(category, forKey: .category)
        try c.encodeIfPresent(area, forKey: .area)
        try c.encodeIfPresent(side, forKey: .side)
        try c.encodeIfPresent(currency, forKey: .currency)
        try c.encodeIfPresent(priceEur, forKey: .priceEur)
        try c.encodeIfPresent(priceUsd, forKey: .priceUsd)
        try c.encodeIfPresent(photos, forKey: .photos)
        try c.encodeIfPresent(thumbPhotos, forKey: .thumbPhotos)
        try c.encodeIfPresent(createdAt, forKey: .createdAt)
    }
}

private let sea = Color(red: 11 / 255, green: 110 / 255, blue: 127 / 255)
private let ink = Color(red: 19 / 255, green: 42 / 255, blue: 46 / 255)
private let paper = Color(red: 251 / 255, green: 247 / 255, blue: 239 / 255)

struct SXMBrowseView: View {
    @ObservedObject var model: SXMBrowseModel
    @State private var query = ""
    @State private var category: String?
    @State private var side: String?
    @State private var showFilters = false
    private var fr: Bool { model.french }
    private var shown: [SXMListing] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let source = model.showingSaved ? model.saved : model.listings
        return source.filter { l in
            (category == nil || l.category == category) &&
            (side == nil || l.side == side) &&
            (q.isEmpty || [l.title, l.description ?? "", l.area ?? ""].joined(separator: " ").lowercased().contains(q))
        }
    }
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header
                    search
                    shortcuts
                    if model.offline {
                        Label(fr ? "Hors ligne : dernières annonces enregistrées" : "Offline: previously saved listings", systemImage: "wifi.slash")
                            .font(.footnote).foregroundColor(ink).padding(.horizontal, 20)
                    }
                    Text(model.showingSaved ? (fr ? "Vos favoris." : "Your saved finds.") : (fr ? "De belles trouvailles.\nTout près de vous." : "Good finds.\nClose by."))
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .foregroundColor(ink).padding(.horizontal, 20)
                        .accessibilityAddTraits(.isHeader)
                    if shown.isEmpty {
                        VStack(spacing: 12) {
                            if model.loading { ProgressView() }
                            else {
                                Image(systemName: model.showingSaved ? "heart" : "magnifyingglass").font(.largeTitle)
                                Text(fr ? "Aucune annonce trouvée" : "No listings found").font(.headline)
                                Button(fr ? "Effacer les filtres" : "Clear filters") { query = ""; category = nil; side = nil }
                            }
                        }.foregroundColor(ink).frame(maxWidth: .infinity).padding(24)
                    } else {
                        SXMListingGrid(listings: shown, model: model)
                    }
                    Button { model.post() } label: {
                        Label(fr ? "Un objet à vendre ? Ajoutez vos photos" : "Selling something? Add your photos", systemImage: "camera")
                            .font(.subheadline.weight(.semibold)).padding(18)
                            .frame(maxWidth: .infinity).foregroundColor(.white)
                            .background(RoundedRectangle(cornerRadius: 18).fill(sea))
                    }.padding(.horizontal, 20)
                }.padding(.vertical, 20)
            }
            .background(paper.ignoresSafeArea())
            .refreshable { await model.refresh() }
            .navigationBarHidden(true)
            .sheet(isPresented: $showFilters) { filters }
        }
        .navigationViewStyle(.stack).accentColor(sea)
        .task { await model.loadOnce() }
        .onChange(of: model.showingSaved) { _ in query = ""; category = nil; side = nil }
    }
    private var header: some View {
        HStack(spacing: 12) {
            Image("MarketLogo").resizable().scaledToFit().frame(width: 44, height: 44).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text(fr ? "Découvrez SXM" : "Discover SXM").font(.title2.weight(.bold)).foregroundColor(ink)
                Button { showFilters = true } label: {
                    Label(side == "fr" ? "Saint-Martin" : side == "nl" ? "Sint Maarten" : (fr ? "Toute l’île" : "Whole island"), systemImage: "mappin.circle.fill")
                        .font(.subheadline).foregroundColor(sea)
                }
            }
            Spacer(minLength: 0)
            Button { model.alerts() } label: { Image(systemName: "bell").frame(width: 44, height: 44) }
                .accessibilityLabel(fr ? "Notifications" : "Notifications")
        }.padding(.horizontal, 20)
    }
    private var search: some View {
        HStack(spacing: 10) {
            HStack {
                Image(systemName: "magnifyingglass").foregroundColor(sea)
                TextField(fr ? "Que cherchez-vous ?" : "What are you looking for?", text: $query)
                    .submitLabel(.search)
                if !query.isEmpty {
                    Button { query = "" } label: { Image(systemName: "xmark.circle.fill") }
                        .accessibilityLabel(fr ? "Effacer la recherche" : "Clear search")
                }
            }.padding(14).background(RoundedRectangle(cornerRadius: 16).fill(Color.white))
            Button { showFilters = true } label: {
                Image(systemName: "slider.horizontal.3").font(.title3).frame(width: 50, height: 50)
                    .foregroundColor(.white).background(RoundedRectangle(cornerRadius: 16).fill(sea))
            }.accessibilityLabel(fr ? "Filtres et catégories" : "Filters and categories")
        }.padding(.horizontal, 20)
    }
    private var shortcuts: some View {
        HStack(spacing: 0) {
            shortcut("voit", fr ? "Véhicules" : "Cars", "car")
            shortcut("immo", fr ? "Logements" : "Homes", "house")
            shortcut("elec", fr ? "Électronique" : "Electronics", "laptopcomputer")
            Button { showFilters = true } label: {
                VStack(spacing: 8) { Image(systemName: "square.grid.2x2").font(.title2); Text(fr ? "Plus" : "More").font(.caption) }
                    .frame(maxWidth: .infinity, minHeight: 64).foregroundColor(ink)
            }
        }.padding(.horizontal, 16)
    }
    private func shortcut(_ id: String, _ title: String, _ symbol: String) -> some View {
        Button { category = category == id ? nil : id } label: {
            VStack(spacing: 8) { Image(systemName: symbol).font(.title2); Text(title).font(.caption) }
                .frame(maxWidth: .infinity, minHeight: 64).foregroundColor(category == id ? sea : ink)
                .background(RoundedRectangle(cornerRadius: 12).fill(category == id ? sea.opacity(0.09) : Color.clear))
        }.accessibilityAddTraits(category == id ? .isSelected : [])
    }
    private var filters: some View {
        NavigationView {
            Form {
                Section(header: Text(fr ? "Secteur" : "Area")) {
                    Picker(fr ? "Côté de l’île" : "Island side", selection: $side) {
                        Text(fr ? "Toute l’île" : "Whole island").tag(String?.none)
                        Text("Saint-Martin").tag(String?.some("fr"))
                        Text("Sint Maarten").tag(String?.some("nl"))
                    }
                }
                Section(header: Text(fr ? "Catégorie" : "Category")) {
                    Picker(fr ? "Catégorie" : "Category", selection: $category) {
                        Text(fr ? "Toutes les catégories" : "All categories").tag(String?.none)
                        ForEach(SXMCategories.all, id: \.id) { c in Text(fr ? c.fr : c.en).tag(String?.some(c.id)) }
                    }.pickerStyle(.inline).labelsHidden()
                }
                Button(fr ? "Tout effacer" : "Clear all") { category = nil; side = nil; query = "" }
            }
            .navigationTitle(fr ? "Affiner la recherche" : "Refine your search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(fr ? "Afficher" : "Show results") { showFilters = false } } }
        }.accentColor(sea)
    }
}

struct SXMListingGrid: View {
    let listings: [SXMListing]
    @ObservedObject var model: SXMBrowseModel
    @Environment(\.sizeCategory) private var sizeCategory
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: sizeCategory.isAccessibilityCategory ? 280 : 150), spacing: 14)], spacing: 24) {
            ForEach(listings) { l in
                NavigationLink(destination: SXMListingDetail(listing: l, model: model)) {
                    SXMListingCard(listing: l, french: model.french)
                }
                .buttonStyle(.plain)
                .overlay(alignment: .topTrailing) {
                    Button { model.toggleSaved(l) } label: {
                        Image(systemName: model.isSaved(l) ? "heart.fill" : "heart")
                            .font(.system(size: 19, weight: .medium)).foregroundColor(sea)
                            .frame(width: 44, height: 44).background(Circle().fill(Color.white))
                    }.buttonStyle(.plain).padding(8)
                        .accessibilityLabel(model.french ? (model.isSaved(l) ? "Retirer des favoris" : "Enregistrer") : (model.isSaved(l) ? "Remove from saved" : "Save listing"))
                }
            }
        }.padding(.horizontal, 20)
    }
}

struct SXMListingCard: View {
    let listing: SXMListing
    let french: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Color.clear.aspectRatio(1, contentMode: .fit)
                .overlay(SXMRemoteImage(url: listing.thumbURL, fill: true))
                .clipShape(RoundedRectangle(cornerRadius: 18))
            Text(listing.title).font(.subheadline.weight(.semibold)).foregroundColor(ink).lineLimit(2)
            if let price = listing.priceLabel {
                Text(price + (listing.category == "locvoit" ? (french ? " / jour" : " / day") : ""))
                    .font(.title3.weight(.bold)).foregroundColor(sea)
            }
            Label(listing.area ?? listing.place, systemImage: "mappin.circle")
                .font(.caption).foregroundColor(ink.opacity(0.7)).lineLimit(1)
        }.accessibilityElement(children: .combine)
    }
}

struct SXMRemoteImage: View {
    let url: URL?
    var fill = true

    var body: some View {
        AsyncImage(url: url, transaction: Transaction(animation: .easeIn(duration: 0.2))) { phase in
            switch phase {
            case .success(let image):
                image.resizable().aspectRatio(contentMode: fill ? .fill : .fit)
            case .failure:
                placeholder(symbol: "photo")
            default:
                placeholder(symbol: nil)
            }
        }
    }

    private func placeholder(symbol: String?) -> some View {
        ZStack {
            ink.opacity(0.06)
            if let symbol = symbol { Image(systemName: symbol).foregroundColor(ink.opacity(0.3)) } else { ProgressView() }
        }
    }
}

struct SXMListingDetail: View {
    let listing: SXMListing
    @ObservedObject var model: SXMBrowseModel
    @State private var page = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var zoomed: URL?
    @State private var sharing = false
    @State private var region: MKCoordinateRegion?

    private var fr: Bool { model.french }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                gallery
                VStack(alignment: .leading, spacing: 8) {
                    Text(listing.title).font(.title2.weight(.bold)).foregroundColor(ink)
                    if let price = listing.priceLabel { Text(price).font(.title3.weight(.heavy)).foregroundColor(sea) }
                    HStack(spacing: 6) {
                        Image(systemName: "mappin.and.ellipse")
                        Text(listing.place)
                        if let cat = SXMCategories.name(listing.category, french: fr) { Text("· \(cat)") }
                    }
                    .font(.subheadline).foregroundColor(ink.opacity(0.7))
                }
                .padding(.horizontal)

                Button { model.contact(listing) } label: {
                    Label(fr ? "Contacter le vendeur" : "Contact the seller", systemImage: "bubble.left.and.bubble.right.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .foregroundColor(.white)
                        .background(RoundedRectangle(cornerRadius: 14).fill(sea))
                }
                .padding(.horizontal)

                if let text = listing.description, !text.isEmpty {
                    Text(text).font(.body).foregroundColor(ink).padding(.horizontal)
                        .textSelection(.enabled)
                }

                if let region = region {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(fr ? "Secteur" : "Area").font(.headline).foregroundColor(ink)
                        Map(coordinateRegion: .constant(region), annotationItems: [SXMPin(coordinate: region.center)]) { pin in
                            MapMarker(coordinate: pin.coordinate, tint: .red)
                        }
                        .frame(height: 200)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .onTapGesture { openInMaps(region.center) }
                        Text(fr ? "Touchez la carte pour l'ouvrir dans Plans" : "Tap the map to open it in Maps")
                            .font(.caption).foregroundColor(ink.opacity(0.6))
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.bottom, 24)
        }
        .background(paper.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarHidden(false)
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                Button { model.toggleSaved(listing) } label: {
                    Image(systemName: model.isSaved(listing) ? "heart.fill" : "heart")
                }
                .accessibilityLabel(fr ? "Enregistrer" : "Save")
                Button { sharing = true } label: { Image(systemName: "square.and.arrow.up") }
                    .accessibilityLabel(fr ? "Partager" : "Share")
            }
        }
        .sheet(isPresented: $sharing) {
            SXMShareSheet(items: [listing.title, model.shareURL(listing)])
        }
        .fullScreenCover(item: $zoomed) { url in SXMZoomView(url: url) }
        .task { await locate() }
    }

    private var gallery: some View {
        let urls = listing.photoURLs
        return TabView(selection: $page) {
            if urls.isEmpty {
                SXMRemoteImage(url: nil).tag(0)
            }
            ForEach(Array(urls.enumerated()), id: \.offset) { index, url in
                SXMRemoteImage(url: url, fill: false)
                    .background(Color.black)
                    .onTapGesture { zoomed = url }
                    .tag(index)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: urls.count > 1 ? .always : .never))
        .frame(height: 340)
        .background(Color.black)
        .overlay {
            if urls.count > 1 {
                HStack {
                    galleryArrow("chevron.left", label: fr ? "Photo précédente" : "Previous photo", delta: -1, count: urls.count)
                    Spacer()
                    galleryArrow("chevron.right", label: fr ? "Photo suivante" : "Next photo", delta: 1, count: urls.count)
                }.padding(.horizontal, 12)
            }
        }
    }

    private func galleryArrow(_ symbol: String, label: String, delta: Int, count: Int) -> some View {
        Button {
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) { page = (page + delta + count) % count }
        } label: {
            Image(systemName: symbol).font(.headline).foregroundColor(ink)
                .frame(width: 44, height: 44).background(Circle().fill(Color.white))
        }.accessibilityLabel(label)
    }

    /// Places the area on a map with Apple's geocoder (no coordinates are stored with listings).
    private func locate() async {
        guard region == nil, let area = listing.area, !area.isEmpty else { return }
        let island = listing.side == "nl" ? "Sint Maarten" : "Saint-Martin"
        let marks = try? await CLGeocoder().geocodeAddressString("\(area), \(island)")
        guard let c = marks?.first?.location?.coordinate,
              (17.9...18.2).contains(c.latitude), (-63.2 ... -62.9).contains(c.longitude) else { return }
        region = MKCoordinateRegion(center: c, span: MKCoordinateSpan(latitudeDelta: 0.04, longitudeDelta: 0.04))
    }

    private func openInMaps(_ c: CLLocationCoordinate2D) {
        let item = MKMapItem(placemark: MKPlacemark(coordinate: c))
        item.name = listing.area
        item.openInMaps()
    }
}

struct SXMPin: Identifiable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
}

extension URL: Identifiable {
    public var id: String { absoluteString }
}

/// Full-screen photo with pinch to zoom and double tap.
struct SXMZoomView: View {
    let url: URL
    @Environment(\.dismiss) private var dismiss
    @State private var scale: CGFloat = 1
    @State private var lastScale: CGFloat = 1

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()
            SXMRemoteImage(url: url, fill: false)
                .scaleEffect(scale)
                .gesture(MagnificationGesture()
                    .onChanged { scale = max(1, min(5, lastScale * $0)) }
                    .onEnded { _ in lastScale = scale })
                .onTapGesture(count: 2) {
                    withAnimation(.spring()) { scale = scale > 1 ? 1 : 2.5; lastScale = scale }
                }
            Button { dismiss() } label: {
                Image(systemName: "xmark.circle.fill").font(.largeTitle).foregroundColor(.white.opacity(0.85))
            }
            .padding()
            .accessibilityLabel("Close")
        }
    }
}

struct SXMSavedView: View {
    @ObservedObject var model: SXMBrowseModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                if model.saved.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "heart").font(.largeTitle).foregroundColor(ink.opacity(0.4))
                        Text(model.french ? "Touchez ♡ sur une annonce pour la garder ici, même sans connexion."
                                          : "Tap ♡ on a listing to keep it here, even offline.")
                            .multilineTextAlignment(.center).foregroundColor(ink)
                    }
                    .padding(40)
                } else {
                    SXMListingGrid(listings: model.saved, model: model).padding(.vertical)
                }
            }
            .background(paper.ignoresSafeArea())
            .navigationTitle(model.french ? "Enregistrées" : "Saved")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(model.french ? "Fermer" : "Close") { dismiss() }
                }
            }
        }
        .navigationViewStyle(.stack)
        .accentColor(sea)
    }
}

struct SXMShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
