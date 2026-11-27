import MapKit
import GoogleMobileAds
import SwiftUI
import UIKit
import WebKit

/// The native "Browse" tab: listings read straight from the marketplace's
/// public API, searchable and filterable, with a native detail screen
/// (photo pager, zoom, map, share, saved list). Saved listings and the last
/// loaded feed are kept on the device, so both still open without a network.
/// Posting and messaging open native workflows; the account stays in the web view.

struct SXMListing: Codable, Identifiable, Equatable {
    let id: String
    let title: String
    let titleFr: String?
    let titleEn: String?
    let weeklyRate: Double?
    enum RentalKeys: String, CodingKey { case f, week }
    func weeklyRateLabel(french: Bool) -> String? {
        guard category == "locvoit", let rate = weeklyRate, rate > 0 else { return nil }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency == "eur" ? "EUR" : "USD"
        formatter.locale = Locale(identifier: french ? "fr_FR" : "en_US")
        return (formatter.string(from: NSNumber(value: rate)) ?? String(rate)) + (french ? " / semaine (7 jours)" : " / week (7 days)")
    }

    func displayTitle(french: Bool) -> String {
        let translated = (french ? titleFr : titleEn)?.trimmingCharacters(in: .whitespacesAndNewlines)
        return translated?.isEmpty == false ? translated! : title
    }
    let description: String?
    let category: String?
    let subcategory: String?
    let area: String?
    let side: String?
    let currency: String?
    let priceEur: Double?
    let priceUsd: Double?
    let photos: [String]?
    let thumbPhotos: [String]?
    let createdAt: String?
    /// Hidden French + English search words from the listing-keywords function (never shown).
    let searchKeywords: String?
    let sellerName: String?
    /// Seller account id, for the "Follow" button. Missing on listings cached before it existed.
    let sellerId: String?
    /// Key information (website listing-detail.js): condition id, handover mode, negotiable price.
    let condition: String?
    let delivery: String?
    let negotiable: Bool?
    let vehicle: SXMVehicle?

    enum CodingKeys: String, CodingKey {
        case id, title, description, category, subcategory, area, side, currency, photos
        case titleFr = "title_fr", titleEn = "title_en"
        case details
        case priceEur = "price_eur", priceUsd = "price_usd", thumbPhotos = "thumb_photos", createdAt = "created_at"
        case searchKeywords = "search_keywords"
        case sellerName = "seller_name", vehicle
        case sellerId = "seller_id"
        case condition, delivery, negotiable
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // Ids are numbers on older rows and uuids on newer ones.
        if let number = try? c.decode(Int.self, forKey: .id) { id = String(number) } else { id = try c.decode(String.self, forKey: .id) }
        title = (try? c.decode(String.self, forKey: .title)) ?? ""
        titleFr = try? c.decode(String.self, forKey: .titleFr)
        titleEn = try? c.decode(String.self, forKey: .titleEn)
        if let details = try? c.nestedContainer(keyedBy: RentalKeys.self, forKey: .details),
           let rates = try? details.nestedContainer(keyedBy: RentalKeys.self, forKey: .f) {
            weeklyRate = (try? rates.decode(Double.self, forKey: .week)) ?? (try? rates.decode(String.self, forKey: .week)).flatMap(Double.init)
        } else { weeklyRate = nil }
        description = try? c.decode(String.self, forKey: .description)
        category = try? c.decode(String.self, forKey: .category)
        subcategory = try? c.decode(String.self, forKey: .subcategory)
        area = try? c.decode(String.self, forKey: .area)
        side = try? c.decode(String.self, forKey: .side)
        currency = try? c.decode(String.self, forKey: .currency)
        priceEur = try? c.decode(Double.self, forKey: .priceEur)
        priceUsd = try? c.decode(Double.self, forKey: .priceUsd)
        photos = try? c.decode([String].self, forKey: .photos)
        thumbPhotos = try? c.decode([String].self, forKey: .thumbPhotos)
        createdAt = try? c.decode(String.self, forKey: .createdAt)
        searchKeywords = try? c.decode(String.self, forKey: .searchKeywords)
        sellerName = (try? c.decode(String.self, forKey: .sellerName)).flatMap { $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : $0 }
        vehicle = try? c.decode(SXMVehicle.self, forKey: .vehicle)
        sellerId = try? c.decode(String.self, forKey: .sellerId)
        condition = try? c.decode(String.self, forKey: .condition)
        delivery = try? c.decode(String.self, forKey: .delivery)
        negotiable = try? c.decode(Bool.self, forKey: .negotiable)
    }

    /// Same words as the website's searchAliases(), so "bike" finds a scooter filed under Vehicles.
    static let searchWords: [String: String] = [
        "voit": "vehicules vehicles vehicle car cars voiture voitures auto autos camion truck trucks",
        "immo": "immobilier property real estate maison apartment appartement rent rental sale vendre louer",
        "elec": "electronique electronics electronic phone phones laptop laptops ordinateur telephone",
        "meub": "maison meubles home furniture sofa canape table chair chaise",
        "mode": "mode fashion",
        "job": "emploi jobs job work travail hiring cv resume",
        "serv": "services service cleaning plumber plumbing mechanic construction beauty",
        "pets": "animaux pets",
        "bat": "bateaux boats boat bateau jet ski jetski nautique marine",
        "gaming": "gaming",
        "beauty": "beaute beauty",
        "scoot": "motos scooters motorcycles scooter moto motorcycle bike bikes",
        "locvoit": "locations de voitures car rentals cars voiture rental location louer",
        "menag": "electromenager appliances appliance frigo refrigerator washer washing",
        "dining": "restaurants bars sorties nightlife restaurant bar pub beach club cafe food truck sortie",
        "tourism": "excursions activites tours activities tour excursion activite plongee snorkeling diving jet ski spa wellness",
        "transport": "taxis transferts transfers taxi transfert airport aeroport chauffeur navette shuttle cruise croisiere",
        "food": "alimentation boissons food drinks foods boisson meal repas",
        "lois": "loisirs leisure",
        "billet": "billetterie tickets",
        "pro": "materiel pro business gear",
        "bonplan": "bons plans deals",
        "scooter-sale": "scooter scooters moto motos motorcycle motorcycles motorbike motorbikes bike bikes",
        "motorbike-sale": "scooter scooters moto motos motorcycle motorcycles motorbike motorbikes bike bikes",
        "motorbike-parts": "scooter scooters moto motos motorcycle motorcycles motorbike motorbikes bike bikes",
        "scooter-mechanic": "scooter scooters moto motos motorcycle motorcycles motorbike motorbikes bike bikes",
        "bike-equipment": "velo velos bicycle bicycles bike bikes"
    ]
    static func fold(_ text: String) -> String {
        text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil).lowercased()
    }
    /// Every search word must appear in the listing text or in its category words, as typed or translated.
    func matches(_ terms: [String], _ words: SXMSearchWords) -> Bool {
        let own = SXMListing.fold([title, titleFr ?? "", titleEn ?? "", description ?? "", searchKeywords ?? ""].joined(separator: " "))
        let text = SXMListing.fold([title, titleFr ?? "", titleEn ?? "", description ?? "", area ?? "", searchKeywords ?? ""].joined(separator: " ")) + " " +
            (SXMListing.searchWords[category ?? ""] ?? "") + " " + (SXMListing.searchWords[subcategory ?? ""] ?? "")
        return words.matches(text: text, own: own, terms: terms)
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

    /// "Posted 3 days ago".
    func postedLabel(french fr: Bool) -> String? {
        guard let raw = createdAt else { return nil }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = iso.date(from: raw) ?? ISO8601DateFormatter().date(from: raw) else { return nil }
        let rel = RelativeDateTimeFormatter()
        rel.locale = Locale(identifier: fr ? "fr_FR" : "en_US")
        let prefix = fr ? "Publiée " : "Posted "
        return prefix + rel.localizedString(for: min(date, Date()), relativeTo: Date())
    }

    static let vehicleSubcategories: Set<String> = ["car-sale", "motorbike-sale", "scooter-sale", "truck-sale", "dealer-inventory", "boat-sale", "jet-ski-sale"]

    /// Same rows, labels and order as the website's vehicleDetailsHTML().
    func vehicleSpecs(french fr: Bool) -> [SXMSpec] {
        guard let v = vehicle, category == "locvoit" || SXMListing.vehicleSubcategories.contains(subcategory ?? "") else { return [] }
        // Simple statements only: large mixed literals slow Xcode's type checker down to a build failure.
        var fuels: [String: String] = [:]
        fuels["gas"] = fr ? "Essence" : "Gasoline"
        fuels["diesel"] = "Diesel"
        fuels["hybrid"] = fr ? "Hybride" : "Hybrid"
        fuels["electric"] = fr ? "Électrique" : "Electric"
        fuels["other"] = fr ? "Autre" : "Other"
        var gears: [String: String] = [:]
        gears["automatic"] = fr ? "Automatique" : "Automatic"
        gears["manual"] = fr ? "Manuelle" : "Manual"
        gears["other"] = fr ? "Autre" : "Other"
        var km: String? = v.km
        if let raw = v.km, let n = Double(raw.replacingOccurrences(of: " ", with: "")) {
            let f = NumberFormatter()
            f.numberStyle = .decimal
            f.maximumFractionDigits = 0
            f.locale = Locale(identifier: fr ? "fr_FR" : "en_US")
            let number: String = f.string(from: NSNumber(value: n)) ?? raw
            km = number + " km"
        }
        var fuel: String? = nil
        if let code = v.fuel { fuel = fuels[code] ?? code }
        var gear: String? = nil
        if let code = v.transmission { gear = gears[code] ?? code }
        var specs: [SXMSpec] = []
        func add(_ label: String, _ value: String?) {
            if let value = value { specs.append(SXMSpec(label: label, value: value)) }
        }
        add(fr ? "Année" : "Year", v.year)
        if category != "locvoit" {
            add(fr ? "Kilométrage" : "Mileage", km)
            add(fr ? "Couleur" : "Color", v.color)
        }
        add(fr ? "Motorisation" : "Engine", fuel)
        add("Transmission", gear)
        add(fr ? "Intérieur / extérieur" : "Interior / exterior", v.body)
        add(fr ? "Mécanique & entretien" : "Mechanics & maintenance", v.mechanical)
        add(fr ? "Papiers & disponibilité" : "Paperwork & availability", v.docs)
        return specs
    }
}

struct SXMSpec: Identifiable {
    let label: String
    let value: String
    var id: String { label }
}

/// "Les informations clés": same rows, labels and order as the website (listing-detail.js).
extension SXMListing {
    func conditionLabel(french fr: Bool) -> String? {
        switch condition {
        case "neuf": return fr ? "Neuf" : "New"
        case "tbe": return fr ? "Très bon état" : "Very good"
        case "bon": return fr ? "Bon état" : "Good"
        case "corr": return fr ? "État correct" : "Fair"
        case "piece": return fr ? "Pour pièces" : "For parts"
        default: return nil
        }
    }

    func deliveryLabel(french fr: Bool) -> String? {
        switch delivery {
        case "pickup": return fr ? "Retrait uniquement" : "Pickup only"
        case "delivery": return fr ? "Livraison possible" : "Delivery possible"
        case "meetup": return fr ? "Rendez-vous possible" : "Meetup possible"
        default: return nil
        }
    }

    func sideLabel(french fr: Bool) -> String? {
        switch side {
        case "fr": return fr ? "Côté français" : "French side"
        case "nl": return fr ? "Côté Sint Maarten" : "Sint Maarten side"
        default: return nil
        }
    }

    func keyInfo(french fr: Bool, typeName: String?) -> [SXMSpec] {
        var rows: [SXMSpec] = []
        if let value = conditionLabel(french: fr) {
            rows.append(SXMSpec(label: fr ? "État" : "Condition", value: value))
        }
        if let value = SXMCategories.name(category, french: fr) {
            rows.append(SXMSpec(label: fr ? "Catégorie" : "Category", value: value))
        }
        if let value = typeName {
            rows.append(SXMSpec(label: "Type", value: value))
        }
        var places: [String] = []
        if let value = area, !value.isEmpty { places.append(value) }
        if let value = sideLabel(french: fr) { places.append(value) }
        if !places.isEmpty {
            rows.append(SXMSpec(label: fr ? "Lieu" : "Location", value: places.joined(separator: " · ")))
        }
        if let value = deliveryLabel(french: fr) {
            rows.append(SXMSpec(label: fr ? "Remise" : "Handover", value: value))
        }
        if negotiable == true {
            rows.append(SXMSpec(label: fr ? "Prix" : "Price", value: fr ? "Prix négociable" : "Negotiable price"))
        }
        return rows
    }

    /// Avatar colour from the seller name: same palette and hash as the website.
    static func avatarColor(_ name: String) -> Color {
        let palette: [(Double, Double, Double)] = [(11, 110, 127), (31, 122, 77), (180, 84, 45), (107, 79, 160), (163, 54, 107), (47, 93, 138)]
        var hash: UInt32 = 0
        for scalar in name.unicodeScalars {
            hash = hash &* 31 &+ scalar.value
        }
        let rgb = palette[Int(hash % UInt32(palette.count))]
        return Color(red: rgb.0 / 255, green: rgb.1 / 255, blue: rgb.2 / 255)
    }
}

/// The listing's `vehicle` column (website vehicle form). Values arrive as text or numbers; blanks are dropped.
struct SXMVehicle: Codable, Equatable {
    let year, km, color, fuel, transmission, body, mechanical, docs: String?
    enum CodingKeys: String, CodingKey { case year, km, color, fuel, transmission, body, mechanical, docs }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // Kept as simple statements: one chained expression here timed out Xcode's type checker.
        func text(_ key: CodingKeys) -> String? {
            var value: String? = nil
            if let s = try? c.decode(String.self, forKey: key) {
                value = s
            } else if let n = try? c.decode(Double.self, forKey: key) {
                if n == n.rounded() { value = String(Int64(n)) } else { value = String(n) }
            }
            guard let raw = value else { return nil }
            let trimmed: String = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty { return nil }
            return trimmed
        }
        year = text(.year); km = text(.km); color = text(.color); fuel = text(.fuel)
        transmission = text(.transmission); body = text(.body); mechanical = text(.mechanical); docs = text(.docs)
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

/// French <-> English search words from the website's search-words.json (same list as the site and Android):
/// "fridge" also finds "frigo". Empty until loaded (or offline); search then works untranslated.
struct SXMSearchWords {
    private(set) var translations: [String: [String]] = [:]
    private(set) var phrases: [String] = []

    init() {}
    init(json: Data) throws {
        struct File: Decodable { let groups: [[String]]; let notAsTranslation: [String]? }
        let file = try JSONDecoder().decode(File.self, from: json)
        let skip = Set(file.notAsTranslation ?? [])
        var map: [String: [String]] = [:]
        for group in file.groups {
            for word in group {
                for other in group where other != word && !skip.contains(other) && !(map[word] ?? []).contains(other) {
                    map[word, default: []].append(other)
                }
            }
        }
        translations = map
        phrases = map.keys.filter { $0.contains(" ") }.sorted { $0.count > $1.count }
    }

    /// Lowercase, no accents, only letters and digits: the same text the website searches.
    static func normalize(_ text: String) -> String {
        let folded = text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil).lowercased()
        let kept = folded.unicodeScalars.map { $0.isASCII && CharacterSet.alphanumerics.contains($0) ? Character($0) : " " }
        return String(kept).split(separator: " ").joined(separator: " ")
    }

    /// Query words, keeping known phrases ("washing machine") together so they translate as one.
    func terms(_ query: String) -> [String] {
        var q = " " + Self.normalize(query) + " "
        var out: [String] = []
        for p in phrases where q.contains(" \(p) ") {
            out.append(p)
            q = q.replacingOccurrences(of: " \(p) ", with: " ")
        }
        return out + q.split(separator: " ").map(String.init)
    }

    func alternatives(_ word: String) -> [String] {
        if let alts = translations[word] { return alts }
        if word.count > 3, word.hasSuffix("s") || word.hasSuffix("x") { return translations[String(word.dropLast())] ?? [] }
        return []
    }

    /// `text` (listing + category words) and `own` (the seller's title and description) are already folded.
    /// Translations only look at `own`, so "house" does not find every "Maison & meubles" listing, and must
    /// be a whole word (plural allowed), so "ac" never matches "achat".
    func matches(text: String, own: String, terms: [String]) -> Bool {
        let all = " " + Self.normalize(text) + " "
        let padded = " " + Self.normalize(own) + " "
        return terms.allSatisfy { term in
            text.contains(term) || all.contains(term) || alternatives(term).contains { alt in
                padded.contains(" \(alt) ") || padded.contains(" \(alt)s ") || padded.contains(" \(alt)x ")
            }
        }
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
    @Published var adsAllowed = false
    @Published var discoverVisible = true
    var sponsoredOrigin = URL(string: "https://buyselltradesxm.com")!
    @Published var searchWords = SXMSearchWords()
    private var loadedOnce = false

    /// Opens the authenticated native conversation with this listing's seller.
    var contact: (SXMListing) -> Void = { _ in }
    /// A native listing page closed: a natural break for the throttled full-screen ad (native-admob.js).
    var detailClosed: () -> Void = {}
    /// Reads (change false) or toggles (change true) "follow this seller". nil = own listing.
    var follow: (_ sellerId: String, _ change: Bool) async throws -> Bool? = { _, _ in false }
    /// Subcategory display name ("Scooters à vendre"), nil until the website schema is loaded.
    var subcategoryName: (_ category: String?, _ subcategory: String?) -> String? = { _, _ in nil }
    var post: () -> Void = {}
    /// Owner tools for your own listing: the website listing page (edit, sold, delete) and the Messages tab.
    var manage: (SXMListing) -> Void = { _ in }
    var messages: () -> Void = {}
    var alerts: () -> Void = {}
    var languageChanged: (Bool) -> Void = { _ in }

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
        await loadSearchWords()
    }

    // shortcut: the word list is not kept offline, so offline search is untranslated; cache it like the feed if that matters.
    private func loadSearchWords() async {
        guard let url = URL(string: "https://buyselltradesxm.com/search-words.json"),
              let result = try? await URLSession.shared.data(from: url),
              (result.1 as? HTTPURLResponse)?.statusCode == 200,
              let words = try? SXMSearchWords(json: result.0) else { return }
        searchWords = words
    }

    func refresh() async {
        loading = true
        defer { loading = false }
        var parts = URLComponents(string: "\(Self.supabaseURL)/rest/v1/listings")!
        parts.queryItems = [
            URLQueryItem(name: "select", value: "id,title,title_fr,title_en,details,description,category,subcategory,area,side,currency,price_eur,price_usd,photos,thumb_photos,created_at,search_keywords,seller_name,seller_id,condition,delivery,negotiable,vehicle"),
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
            let current = Dictionary(uniqueKeysWithValues: rows.map { ($0.id, $0) })
            saved = saved.map { current[$0.id] ?? $0 }
            Self.store(saved, Self.savedKey)
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
        try c.encodeIfPresent(titleFr, forKey: .titleFr)
        try c.encodeIfPresent(titleEn, forKey: .titleEn)
        if let rate = weeklyRate {
            var details = c.nestedContainer(keyedBy: RentalKeys.self, forKey: .details)
            var rates = details.nestedContainer(keyedBy: RentalKeys.self, forKey: .f)
            try rates.encode(rate, forKey: .week)
        }
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
        try c.encodeIfPresent(subcategory, forKey: .subcategory)
        try c.encodeIfPresent(searchKeywords, forKey: .searchKeywords)
        try c.encodeIfPresent(sellerName, forKey: .sellerName)
        try c.encodeIfPresent(sellerId, forKey: .sellerId)
        try c.encodeIfPresent(condition, forKey: .condition)
        try c.encodeIfPresent(delivery, forKey: .delivery)
        try c.encodeIfPresent(negotiable, forKey: .negotiable)
        try c.encodeIfPresent(vehicle, forKey: .vehicle)
    }
}

private let sea = Color(red: 11 / 255, green: 110 / 255, blue: 127 / 255)
private let ink = Color(red: 19 / 255, green: 42 / 255, blue: 46 / 255)
private let paper = Color(red: 251 / 255, green: 247 / 255, blue: 239 / 255)

private enum SXMAreas {
    static let french = ["Marigot", "Concordia", "Agrément", "Galisbay", "Hameau du Pont", "Saint-James", "Bellevue", "Sandy Ground", "Baie Nettlé", "Terres Basses", "Grand Case", "La Savane", "Cul-de-Sac", "Anse Marcel", "Colombier", "Rambaud", "Saint-Louis", "Friar's Bay", "Quartier d'Orléans", "Oyster Pond", "Baie Orientale"]
    static let dutch = ["Philipsburg", "Simpson Bay", "Cole Bay", "Maho", "Beacon Hill", "Cupecoy", "Mullet Bay", "Lowlands", "Pelican Key", "Cay Bay", "Cay Hill", "Little Bay", "Belair", "Point Blanche", "Guana Bay", "Dawn Beach", "Oyster Pond", "Dutch Quarter", "Middle Region", "Madame Estate", "Sucker Garden", "Belvedere", "Defiance", "St. Peters", "Saunders", "South Reward", "Ebenezer", "Cul de Sac", "St. John's Estate", "Mary's Estate / Mary's Fancy", "Sentry Hill", "Pond Island", "Indigo Bay", "Orange Grove", "Billy Folly", "Point Pirouette"]
}

struct SXMBrowseView: View {
    @ObservedObject var model: SXMBrowseModel
    @State private var query = ""
    @State private var category: String?
    @State private var side: String?
    @State private var area: String?
    @State private var showFilters = false
    @State private var sponsoredRevision = 0
    private var fr: Bool { model.french }
    private var shown: [SXMListing] {
        let terms = model.searchWords.terms(query)
        let source = model.showingSaved ? model.saved : model.listings
        return source.filter { l in
            (category == nil || l.category == category) &&
            (side == nil || l.side == side) &&
            (area.map { l.area?.localizedCaseInsensitiveCompare($0) == .orderedSame } ?? true) &&
            (terms.isEmpty || l.matches(terms, model.searchWords))
        }
    }
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header
                    search
                    if !model.showingSaved && model.discoverVisible && model.adsAllowed {
                        SXMInlineAdSection(french: fr, maxHeight: 60).padding(.horizontal, 20)
                    }
                    if !model.showingSaved { spotlight }
                    if !model.showingSaved && model.discoverVisible {
                        SXMSponsoredSection(origin: model.sponsoredOrigin, placement: "content-1", french: fr)
                            .id(sponsoredRevision).padding(.horizontal, 20)
                    }
                    shortcuts
                    locationPicker
                    if model.offline {
                        Label(fr ? "Hors ligne : dernières annonces enregistrées" : "Offline: previously saved listings", systemImage: "wifi.slash")
                            .font(.footnote).foregroundColor(ink).padding(.horizontal, 20)
                    }
                    Text(model.showingSaved ? (fr ? "Vos favoris" : "Your saved finds") : (fr ? "Annonces récentes" : "Fresh finds"))
                        .font(.system(size: 25, weight: .bold, design: .rounded))
                        .foregroundColor(ink).padding(.horizontal, 20)
                        .accessibilityAddTraits(.isHeader)
                    if shown.isEmpty {
                        VStack(spacing: 12) {
                            if model.loading { ProgressView() }
                            else {
                                Image(systemName: model.showingSaved ? "heart" : "magnifyingglass").font(.largeTitle)
                                Text(fr ? "Aucune annonce trouvée" : "No listings found").font(.headline)
                                Button(fr ? "Effacer les filtres" : "Clear filters") { query = ""; category = nil; side = nil; area = nil }
                            }
                        }.foregroundColor(ink).frame(maxWidth: .infinity).padding(24)
                    } else {
                        SXMListingGrid(listings: shown, model: model, sponsoredRevision: sponsoredRevision)
                    }
                    Button { model.post() } label: {
                        Label(fr ? "Un objet à vendre ? Ajoutez vos photos" : "Selling something? Add your photos", systemImage: "camera")
                            .font(.subheadline.weight(.semibold)).padding(18)
                            .frame(maxWidth: .infinity).foregroundColor(.white)
                            .background(RoundedRectangle(cornerRadius: 18).fill(sea))
                    }.padding(.horizontal, 20)
                    // Last block of Discover: inside the scroll view, so it never covers a listing or the tab bar.
                    if !model.showingSaved && model.discoverVisible && model.adsAllowed {
                        SXMInlineAdSection(french: fr, maxHeight: 250).padding(.horizontal, 20)
                    }
                }.padding(.vertical, 20)
            }
            .background(paper.ignoresSafeArea())
            .bottomAd(model.showingSaved && model.adsAllowed)
            .refreshable { await model.refresh(); sponsoredRevision += 1 }
            .navigationBarHidden(true)
            .sheet(isPresented: $showFilters) { filters }
        }
        .navigationViewStyle(.stack).accentColor(sea)
        .task { await model.loadOnce() }
        .onChange(of: model.showingSaved) { _ in query = ""; category = nil; side = nil; area = nil }
    }
    private var header: some View {
        HStack(spacing: 12) {
            Image("MarketLogo").resizable().scaledToFit().frame(width: 44, height: 44).accessibilityHidden(true)
            Text(fr ? "Découvrir" : "Discover")
                .font(.system(size: 22, weight: .bold, design: .rounded)).foregroundColor(ink)
            Spacer(minLength: 0)
            Image(systemName: "globe.americas.fill").foregroundColor(sea)
                .accessibilityLabel(fr ? "Langue" : "Language")
            HStack(spacing: 2) {
                languageButton("FR", french: true)
                languageButton("EN", french: false)
            }.padding(3).background(RoundedRectangle(cornerRadius: 14).fill(sea.opacity(0.12)))
            Button { model.alerts() } label: { Image(systemName: "bell").frame(width: 36, height: 44) }
                .accessibilityLabel(fr ? "Notifications" : "Notifications")
        }.padding(.horizontal, 20)
    }
    private func languageButton(_ label: String, french: Bool) -> some View {
        Button {
            guard model.french != french else { return }
            model.french = french
            model.languageChanged(french)
        } label: {
            Text(label).font(.caption.weight(.bold))
                .foregroundColor(model.french == french ? .white : ink)
                .frame(width: 37, height: 34)
                .background(RoundedRectangle(cornerRadius: 11).fill(model.french == french ? sea : .clear))
        }.accessibilityAddTraits(model.french == french ? .isSelected : [])
    }
    private var spotlight: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(fr ? "LE MARCHÉ LOCAL · SXM" : "THE LOCAL MARKET · SXM")
                    .font(.system(size: 10, weight: .heavy)).tracking(1.2).foregroundColor(.white.opacity(0.8))
                Text(fr ? "Deux côtés. Un marché." : "Two sides. One market.")
                    .font(.system(size: 19, weight: .bold, design: .rounded)).foregroundColor(.white)
                Text(fr ? "Achetez et vendez sur toute l'île" : "Buy and sell across the island")
                    .font(.caption).foregroundColor(.white.opacity(0.9))
            }
            Spacer(minLength: 0)
            Button { model.post() } label: {
                Image(systemName: "arrow.up.right").font(.title3.weight(.bold))
                    .frame(width: 42, height: 42).background(Circle().fill(.white))
            }.accessibilityLabel(fr ? "Publier" : "Post")
        }
        .padding(18)
        .background(RoundedRectangle(cornerRadius: 20).fill(
            LinearGradient(colors: [sea, ink], startPoint: .topLeading, endPoint: .bottomTrailing)))
        .padding(.horizontal, 20)
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
            Button { showFilters = true } label: {
                VStack(spacing: 8) { Image(systemName: "square.grid.2x2").font(.title2); Text(fr ? "Tout" : "All").font(.caption) }
                    .frame(maxWidth: .infinity, minHeight: 64).foregroundColor(ink)
            }.accessibilityLabel(fr ? "Toutes les catégories" : "All categories")
            shortcut("voit", fr ? "Véhicules" : "Cars", "car")
            shortcut("immo", fr ? "Logements" : "Homes", "house")
            shortcut("elec", fr ? "Électronique" : "Electronics", "laptopcomputer")
            Button { showFilters = true } label: {
                VStack(spacing: 8) { Image(systemName: "square.grid.2x2").font(.title2); Text(fr ? "Plus" : "More").font(.caption) }
                    .frame(maxWidth: .infinity, minHeight: 64).foregroundColor(ink)
            }
        }.padding(.horizontal, 16)
    }
    private var locationPicker: some View {
        Menu {
            Button(fr ? "Toute l'île" : "Whole island") { side = nil; area = nil }
            locationSide(fr ? "Côté français" : "French side", sideCode: "fr", areas: SXMAreas.french)
            locationSide(fr ? "Côté hollandais" : "Dutch side", sideCode: "nl", areas: SXMAreas.dutch)
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "mappin.and.ellipse").font(.title2).foregroundColor(sea)
                VStack(alignment: .leading, spacing: 2) {
                    Text(fr ? "OÙ CHERCHER ?" : "WHERE TO SEARCH?")
                        .font(.system(size: 10, weight: .heavy)).tracking(1.2).foregroundColor(sea)
                    Text(area ?? (side == "fr" ? (fr ? "Côté français" : "French side") : side == "nl" ? (fr ? "Côté hollandais" : "Dutch side") : (fr ? "Toute l'île" : "Whole island")))
                        .font(.subheadline.weight(.bold)).foregroundColor(ink)
                }
                Spacer()
                Text(fr ? "CHOISIR" : "EXPLORE")
                    .font(.system(size: 10, weight: .bold)).foregroundColor(sea)
                Image(systemName: "chevron.down").font(.caption.weight(.bold)).foregroundColor(sea)
            }
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 17).fill(.white))
            .overlay(RoundedRectangle(cornerRadius: 17).stroke(sea.opacity(0.22)))
        }.padding(.horizontal, 20)
    }
    private func locationSide(_ label: String, sideCode: String, areas: [String]) -> some View {
        Menu {
            Button(fr ? "Tous les quartiers" : "All areas") { side = sideCode; area = nil }
            ForEach(areas, id: \.self) { district in
                Button(district) { side = sideCode; area = district }
            }
        } label: { Label(label, systemImage: sideCode == "fr" ? "f.circle" : "n.circle") }
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
                    Picker(fr ? "Côté de l’île" : "Island side", selection: Binding(
                        get: { side }, set: { side = $0; area = nil })) {
                        Text(fr ? "Toute l’île" : "Whole island").tag(String?.none)
                        Text("Saint-Martin").tag(String?.some("fr"))
                        Text("Sint Maarten").tag(String?.some("nl"))
                    }
                    if let side = side {
                        Picker(fr ? "Quartier" : "District", selection: $area) {
                            Text(fr ? "Tous les quartiers" : "All areas").tag(String?.none)
                            ForEach(side == "fr" ? SXMAreas.french : SXMAreas.dutch, id: \.self) { district in
                                Text(district).tag(String?.some(district))
                            }
                        }
                    }
                }
                Section(header: Text(fr ? "Catégorie" : "Category")) {
                    Picker(fr ? "Catégorie" : "Category", selection: $category) {
                        Text(fr ? "Toutes les catégories" : "All categories").tag(String?.none)
                        ForEach(SXMCategories.all, id: \.id) { c in Text(fr ? c.fr : c.en).tag(String?.some(c.id)) }
                    }.pickerStyle(.inline).labelsHidden()
                }
                Button(fr ? "Tout effacer" : "Clear all") { category = nil; side = nil; area = nil; query = "" }
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
    var sponsoredRevision: Int? = nil
    @Environment(\.sizeCategory) private var sizeCategory
    private var adAfter: Int { listings.count <= 4 ? 2 : listings.count <= 12 ? 4 : 8 }
    var body: some View {
        VStack(spacing: 20) {
            listingRows(Array(listings.prefix(adAfter)))
            if let revision = sponsoredRevision, !model.showingSaved && model.discoverVisible {
                SXMSponsoredSection(origin: model.sponsoredOrigin, placement: "feed", french: model.french)
                    .id(revision)
            }
            // Saved already has the pinned bottom banner (bottomAd): one Google ad per screen.
            if listings.count > adAfter && model.adsAllowed && !model.showingSaved {
                SXMInlineAdSection(french: model.french)
            }
            if listings.count > 16 && sponsoredRevision != nil && !model.showingSaved {
                listingRows(Array(listings[adAfter..<16]))
                if let revision = sponsoredRevision, model.discoverVisible {
                    SXMSponsoredSection(origin: model.sponsoredOrigin, placement: "restaurant", french: model.french)
                        .id("restaurant-\(revision)")
                }
                listingRows(Array(listings.dropFirst(16)))
            } else if listings.count > adAfter {
                listingRows(Array(listings.dropFirst(adAfter)))
            }
        }.padding(.horizontal, 20)
    }

    private func listingRows(_ rows: [SXMListing]) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: sizeCategory.isAccessibilityCategory ? 280 : 150), spacing: 14)], spacing: 24) {
            ForEach(rows) { l in
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
        }
    }
}

private struct SXMSponsoredSection: View {
    let origin: URL
    let placement: String
    let french: Bool
    @Environment(\.scenePhase) private var scenePhase
    @State private var height: CGFloat = 0
    @State private var onscreen = false

    var body: some View {
        SXMSponsoredWebView(origin: origin, placement: placement, french: french,
                            visible: onscreen && scenePhase == .active, height: $height)
            .frame(height: max(1, height))
            .accessibilityHidden(height == 0)
            .background {
                GeometryReader { geometry in
                    let frame = geometry.frame(in: .global)
                    Color.clear
                        .onAppear { updateVisibility(frame) }
                        .onChange(of: frame) { updateVisibility($0) }
                }
            }
    }

    private func updateVisibility(_ frame: CGRect) {
        let overlap = frame.intersection(UIScreen.main.bounds.inset(by: UIEdgeInsets(top: 24, left: 0, bottom: 54, right: 0)))
        onscreen = !overlap.isNull && overlap.height >= frame.height / 2
    }
}

private struct SXMSponsoredWebView: UIViewRepresentable {
    let origin: URL
    let placement: String
    let french: Bool
    let visible: Bool
    @Binding var height: CGFloat

    func makeCoordinator() -> Coordinator { Coordinator(height: $height) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.userContentController.add(context.coordinator, name: "sponsoredHeight")
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.isScrollEnabled = false
        view.scrollView.contentInsetAdjustmentBehavior = .never
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        let coordinator = context.coordinator
        var url = URLComponents(url: origin, resolvingAgainstBaseURL: false)
        url?.path = "/native-sponsored.html"
        url?.queryItems = [URLQueryItem(name: "placement", value: placement),
                           URLQueryItem(name: "lang", value: french ? "fr" : "en")]
        if let request = url?.url, request != coordinator.url {
            coordinator.url = request
            coordinator.visible = visible
            view.load(URLRequest(url: request, cachePolicy: .reloadRevalidatingCacheData))
        } else if coordinator.visible != visible {
            coordinator.visible = visible
            coordinator.syncVisibility(view)
        }
    }

    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        view.configuration.userContentController.removeScriptMessageHandler(forName: "sponsoredHeight")
        view.stopLoading()
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        var url: URL?
        var visible = false
        let height: Binding<CGFloat>

        init(height: Binding<CGFloat>) { self.height = height }

        func syncVisibility(_ view: WKWebView) {
            view.evaluateJavaScript("window.setSponsoredVisibility?.(\(visible ? "true" : "false"))", completionHandler: nil)
        }

        func webView(_ view: WKWebView, didFinish navigation: WKNavigation!) {
            syncVisibility(view)
        }

        func webView(_ view: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if action.navigationType == .linkActivated, let destination = action.request.url,
               destination.scheme == "https" || destination.scheme == "http" {
                UIApplication.shared.open(destination)
            }
            return nil
        }

        func webView(_ view: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let destination = action.request.url, action.navigationType == .linkActivated,
               destination.scheme == "https" || destination.scheme == "http" {
                UIApplication.shared.open(destination)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(action.request.url == url ? .allow : .cancel)
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.frameInfo.request.url == url,
                  let raw = message.body as? NSNumber, (0...1200).contains(raw.doubleValue) else { return }
            height.wrappedValue = CGFloat(raw.doubleValue)
        }

        func webView(_ view: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            if (error as NSError).code != NSURLErrorCancelled { height.wrappedValue = 0 }
        }
    }
}

/// One clearly labelled native banner between listing rows. It never loads
/// without consent and the label appears only after an actual ad loads.
struct SXMInlineAdSection: View {
    let french: Bool
    var maxHeight: Int = 300
    var heightChanged: ((CGFloat) -> Void)? = nil
    @State private var adHeight: CGFloat = 0
    @State private var attempt = 0

    var body: some View {
        GeometryReader { geometry in
            // The first layout pass can report 0 width; a banner requested then is 1 pt wide and Google never fills it.
            let width = (geometry.size.width - 24).rounded()
            VStack(alignment: .leading, spacing: 8) {
                if adHeight > 0 {
                    Text(french ? "PUBLICITÉ" : "ADVERTISEMENT")
                        .font(.system(size: 10, weight: .bold)).tracking(1.2)
                        .foregroundColor(sea)
                }
                if width >= SXMAdReport.minimumWidth {
                    SXMInlineAdBanner(width: width, maxHeight: maxHeight, onLoad: { adHeight = $0 }, onFailure: {
                        adHeight = 0
                        let failedAttempt = attempt
                        DispatchQueue.main.asyncAfter(deadline: .now() + 60) {
                            if attempt == failedAttempt { attempt += 1 }
                        }
                    })
                    // A new width (layout settled, rotation) needs a new request at that size.
                    .id("\(attempt)-\(Int(width))")
                    .frame(width: width, height: max(1, adHeight))
                }
            }
            .padding(adHeight > 0 ? 12 : 0)
            .frame(maxWidth: .infinity)
            .background(adHeight > 0 ? Color.white : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .frame(height: adHeight > 0 ? adHeight + 48 : 1)
        .onChange(of: adHeight) { heightChanged?($0 > 0 ? $0 + 48 : 0) }
        .accessibilityElement(children: .contain)
    }
}

/// Slim banner pinned to the bottom of the native Saved, Post and Messages screens.
/// It stays collapsed (1 pt) until an ad loads and while the keyboard is up.
struct SXMBottomAd: View {
    @State private var adHeight: CGFloat = 0
    @State private var attempt = 0
    @State private var keyboardUp = false
    var body: some View {
        let width = UIScreen.main.bounds.width
        SXMInlineAdBanner(width: width, anchored: true, onLoad: { adHeight = $0 }, onFailure: {
            adHeight = 0
            let failedAttempt = attempt
            DispatchQueue.main.asyncAfter(deadline: .now() + 60) {
                if attempt == failedAttempt { attempt += 1 }
            }
        })
        .id(attempt)
        .frame(width: width, height: keyboardUp ? 0 : max(1, adHeight))
        .clipped()
        .background(adHeight > 0 ? Color.white : Color.clear)
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in keyboardUp = true }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in keyboardUp = false }
    }
}

extension View {
    /// Adds the bottom banner when ads are allowed (UMP consent, not Pro).
    func bottomAd(_ allowed: Bool) -> some View {
        safeAreaInset(edge: .bottom, spacing: 0) { if allowed { SXMBottomAd() } }
    }
}

private struct SXMInlineAdBanner: UIViewRepresentable {
    let width: CGFloat
    var maxHeight = 300
    var anchored = false
    let onLoad: (CGFloat) -> Void
    let onFailure: () -> Void

    func makeUIView(context: Context) -> BannerView {
        let banner = BannerView(adSize: anchored ? currentOrientationAnchoredAdaptiveBanner(width: width)
                                                 : inlineAdaptiveBanner(width: width, maxHeight: CGFloat(maxHeight)))
        #if DEBUG
        banner.adUnitID = "ca-app-pub-3940256099942544/2435281174"
        #else
        banner.adUnitID = "ca-app-pub-7816106453580174/9133808428"
        #endif
        banner.rootViewController = UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow?.rootViewController }.first
        banner.delegate = context.coordinator
        // Only built when model.adsAllowed, which native-admob.js sets from UMP canRequestAds and Pro status;
        // the App target cannot import GoogleUserMessagingPlatform itself (it comes in through the AdMob plugin only).
        // Requested on the next run loop, once SwiftUI has put the banner in the window, not while it is detached.
        DispatchQueue.main.async { banner.load(Request()) }
        return banner
    }

    func updateUIView(_ banner: BannerView, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(width: width, onLoad: onLoad, onFailure: onFailure) }

    final class Coordinator: NSObject, BannerViewDelegate {
        let width: CGFloat
        let onLoad: (CGFloat) -> Void
        let onFailure: () -> Void
        init(width: CGFloat, onLoad: @escaping (CGFloat) -> Void, onFailure: @escaping () -> Void) {
            self.width = width; self.onLoad = onLoad; self.onFailure = onFailure
        }
        func bannerViewDidReceiveAd(_ bannerView: BannerView) {
            DispatchQueue.main.async { self.onLoad(bannerView.intrinsicContentSize.height) }
        }
        func bannerView(_ bannerView: BannerView, didFailToReceiveAdWithError error: Error) {
            SXMAdReport.bannerFailed(error, width: width)
            DispatchQueue.main.async { self.onFailure() }
        }
    }
}

/// Sends Google's reason for an empty native banner to the admin error log (same RPC as telemetry.js),
/// once per distinct reason per app launch, so a low match rate in AdMob can be explained.
enum SXMAdReport {
    /// Narrower banners are not requested: Google fills almost none of them.
    static let minimumWidth: CGFloat = 200
    private static var sent = Set<String>()

    static func bannerFailed(_ error: Error, width: CGFloat) {
        let ns = error as NSError
        let text = "AdMob ios native banner failed: code \(ns.code) " + ns.localizedDescription
        var message = String(text.prefix(160)) + " (width \(Int(width)))"
        // Which ad sources Google asked and why each one passed (AdMob Network, Magnite, OpenX...).
        let info = ns.userInfo.values.compactMap { $0 as? ResponseInfo }.first
        let sources = info?.adNetworkInfoArray ?? []
        var details: [String] = []
        for source in sources {
            let sourceError = source.error as NSError?
            let reason = sourceError == nil ? "ok" : "code \(sourceError!.code)"
            details.append(source.adSourceName + " " + reason)
        }
        if !details.isEmpty { message += " [" + details.joined(separator: "; ") + "]" }
        let final = String(message.prefix(480))
        DispatchQueue.main.async { send(final) }
    }

    private static func send(_ message: String) {
        guard !sent.contains(message) else { return }
        sent.insert(message)
        guard let url = URL(string: SXMBrowseModel.supabaseURL + "/rest/v1/rpc/log_client_error") else { return }
        var entry: [String: Any] = [:]
        entry["message"] = message
        entry["source"] = "ios/SXMBrowseView.swift"
        entry["page"] = "native"
        entry["surface"] = "ios"
        guard let body = try? JSONSerialization.data(withJSONObject: ["p": entry]) else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SXMBrowseModel.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer " + SXMBrowseModel.anonKey, forHTTPHeaderField: "Authorization")
        URLSession.shared.dataTask(with: request).resume()
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
            Text(listing.displayTitle(french: french)).font(.subheadline.weight(.semibold)).foregroundColor(ink).lineLimit(2)
            if let price = listing.priceLabel {
                Text(price + (listing.category == "locvoit" ? (french ? " / jour" : " / day") : ""))
                    .font(.title3.weight(.bold)).foregroundColor(sea)
            }
            Label(listing.area ?? listing.place, systemImage: "mappin.and.ellipse")
                .font(.caption).foregroundColor(Color(red: 185.0/255, green: 28.0/255, blue: 28.0/255)).lineLimit(1)
            if let weekly = listing.weeklyRateLabel(french: french) { Text(weekly).font(.caption).foregroundColor(sea) }
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

/// All loaded listings of one seller, opened from the seller card.
struct SXMSellerListings: View {
    let sellerId: String
    let name: String
    @ObservedObject var model: SXMBrowseModel

    var body: some View {
        let rows = model.listings.filter { $0.sellerId == sellerId }
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 14)], spacing: 24) {
                ForEach(rows) { l in
                    NavigationLink(destination: SXMListingDetail(listing: l, model: model)) {
                        SXMListingCard(listing: l, french: model.french)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
        }
        .background(paper.ignoresSafeArea())
        .navigationTitle(name)
        .navigationBarTitleDisplayMode(.inline)
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
    @State private var following: Bool? = false
    @State private var followBusy = false
    @State private var followNote = ""
    @State private var descriptionOpen = false
    /// Learned from the signed-in web session (follow bridge); the contact button waits for it.
    @State private var ownListing = false
    @State private var ownershipKnown = false

    private var fr: Bool { model.french }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                gallery
                VStack(alignment: .leading, spacing: 8) {
                    Text(listing.displayTitle(french: fr)).font(.title2.weight(.bold)).foregroundColor(ink)
                    if let price = listing.priceLabel { Text(price + (listing.category == "locvoit" ? (fr ? " / jour" : " / day") : "")).font(.title3.weight(.heavy)).foregroundColor(sea) }
                    if let weekly = listing.weeklyRateLabel(french: fr) { Text(weekly).font(.subheadline).foregroundColor(sea) }
                    HStack(spacing: 6) {
                        Label(listing.place, systemImage: "mappin.and.ellipse")
                            .foregroundColor(Color(red: 185.0/255, green: 28.0/255, blue: 28.0/255))
                        if let cat = SXMCategories.name(listing.category, french: fr) { Text("· \(cat)") }
                    }
                    .font(.subheadline).foregroundColor(ink.opacity(0.7))
                    if let posted = listing.postedLabel(french: fr) {
                        Text(posted).font(.subheadline).foregroundColor(ink.opacity(0.7))
                    }
                }
                .padding(.horizontal)

                contactSection

                sellerSection
                keyInfoSection

                let specs = listing.vehicleSpecs(french: fr)
                if !specs.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(fr ? "Détails véhicule" : "Vehicle details").font(.headline).foregroundColor(ink)
                        ForEach(specs) { spec in
                            HStack(alignment: .top, spacing: 12) {
                                Text(spec.label).foregroundColor(ink.opacity(0.65))
                                Spacer(minLength: 8)
                                Text(spec.value).fontWeight(.semibold).foregroundColor(ink).multilineTextAlignment(.trailing)
                            }
                            .font(.subheadline)
                        }
                    }
                    .padding(.horizontal)
                }

                descriptionSection

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
        .task(id: listing.id) { await loadFollow() }
        .onDisappear { model.detailClosed() }
        // Pinned, so it shows while the buyer looks at the photos and reads the description,
        // not only after scrolling past the map. One Google ad on this screen.
        .bottomAd(model.adsAllowed)
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
            SXMShareSheet(items: [listing.displayTitle(french: fr), model.shareURL(listing)])
        }
        .fullScreenCover(item: $zoomed) { url in
            SXMZoomView(urls: listing.photoURLs, page: listing.photoURLs.firstIndex(of: url) ?? 0,
                        title: listing.displayTitle(french: fr), price: listing.priceLabel,
                        french: fr, adsAllowed: model.adsAllowed)
        }
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

    @ViewBuilder private var contactSection: some View {
        if ownListing {
            ownerPanel
        } else if ownershipKnown {
            Button { model.contact(listing) } label: {
                Label(fr ? "Contacter le vendeur" : "Contact the seller", systemImage: "bubble.left.and.bubble.right.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .foregroundColor(.white)
                    .background(RoundedRectangle(cornerRadius: 14).fill(sea))
            }
            .padding(.horizontal)
        }
    }

    /// The seller's own listing: manage it instead of contacting yourself (same panel as the website).
    private var ownerPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(fr ? "Gérer votre annonce" : "Manage your listing").font(.title3.weight(.bold)).foregroundColor(ink)
                Spacer(minLength: 8)
                Text(fr ? "En ligne" : "Online")
                    .font(.footnote.weight(.heavy))
                    .foregroundColor(Color(red: 21 / 255, green: 128 / 255, blue: 61 / 255))
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Capsule().fill(Color(red: 231 / 255, green: 245 / 255, blue: 236 / 255)))
            }
            Text(fr ? "Les acheteurs vous écrivent depuis cette page. Leurs messages arrivent dans Messages."
                    : "Buyers write to you from this page. Their messages arrive in Messages.")
                .font(.subheadline).foregroundColor(ink.opacity(0.7))
            Button { model.manage(listing) } label: {
                Label(fr ? "Modifier, marquer vendue ou supprimer" : "Edit, mark as sold or delete", systemImage: "slider.horizontal.3")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .foregroundColor(sea)
                    .background(RoundedRectangle(cornerRadius: 12).stroke(sea, lineWidth: 1.5))
            }
            Button { model.messages() } label: {
                Label(fr ? "Messages des acheteurs" : "Messages from buyers", systemImage: "bubble.left.and.bubble.right.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .foregroundColor(.white)
                    .background(RoundedRectangle(cornerRadius: 12).fill(sea))
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.white))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(ink.opacity(0.2), lineWidth: 1.5))
        .padding(.horizontal)
    }

    private var sellerDisplayName: String {
        listing.sellerName ?? (fr ? "Vendeur" : "Seller")
    }

    private var sellerCount: Int {
        guard let sellerId = listing.sellerId else { return 0 }
        return model.listings.filter { $0.sellerId == sellerId }.count
    }

    private var sellerSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Divider()
            Text(fr ? "Vendu par" : "Sold by").font(.title3.weight(.bold)).foregroundColor(ink)
            if let sellerId = listing.sellerId, sellerCount > 0 {
                NavigationLink(destination: SXMSellerListings(sellerId: sellerId, name: sellerDisplayName, model: model)) {
                    sellerCard(chevron: true)
                }
                .buttonStyle(.plain)
            } else {
                sellerCard(chevron: false)
            }
            followButton
        }
        .padding(.horizontal)
    }

    private func sellerCard(chevron: Bool) -> some View {
        let name = sellerDisplayName
        let initial = String(name.trimmingCharacters(in: .whitespaces).prefix(1)).uppercased()
        var detail = ""
        if sellerCount == 1 { detail = fr ? "1 annonce" : "1 listing" }
        if sellerCount > 1 { detail = fr ? "\(sellerCount) annonces" : "\(sellerCount) listings" }
        return HStack(spacing: 14) {
            Text(initial.isEmpty ? "?" : initial)
                .font(.title2.weight(.bold))
                .foregroundColor(.white)
                .frame(width: 52, height: 52)
                .background(Circle().fill(SXMListing.avatarColor(name)))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 3) {
                Text(name).font(.headline).foregroundColor(ink)
                if !detail.isEmpty {
                    Text(detail).font(.subheadline).foregroundColor(ink.opacity(0.65))
                }
            }
            Spacer(minLength: 8)
            if chevron {
                Image(systemName: "chevron.right").foregroundColor(ink).accessibilityHidden(true)
            }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.white))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(ink.opacity(0.2), lineWidth: 1.5))
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private var keyInfoSection: some View {
        let typeName = model.subcategoryName(listing.category, listing.subcategory)
        let rows = listing.keyInfo(french: fr, typeName: typeName)
        if !rows.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                Divider()
                Text(fr ? "Les informations clés" : "Key information")
                    .font(.title3.weight(.bold)).foregroundColor(ink)
                    .padding(.top, 14).padding(.bottom, 4)
                ForEach(rows) { row in
                    HStack(alignment: .top, spacing: 12) {
                        Text(row.label).foregroundColor(ink.opacity(0.65))
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text(row.value).fontWeight(.semibold).foregroundColor(ink)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .font(.subheadline)
                    .padding(.vertical, 10)
                    .accessibilityElement(children: .combine)
                }
            }
            .padding(.horizontal)
        }
    }

    @ViewBuilder private var descriptionSection: some View {
        if let text = listing.description, !text.isEmpty {
            let long = text.count > 320 || text.split(separator: "\n").count > 6
            VStack(alignment: .leading, spacing: 8) {
                Divider()
                Text("Description").font(.title3.weight(.bold)).foregroundColor(ink).padding(.top, 6)
                Text(text).font(.body).foregroundColor(ink)
                    .lineLimit(long && !descriptionOpen ? 6 : nil)
                    .textSelection(.enabled)
                if long {
                    Button { descriptionOpen.toggle() } label: {
                        Text(descriptionLinkLabel).font(.subheadline.weight(.bold)).underline().foregroundColor(ink)
                            .frame(minHeight: 44)
                    }
                }
            }
            .padding(.horizontal)
        }
    }

    private var descriptionLinkLabel: String {
        if descriptionOpen {
            return fr ? "Voir moins" : "See less"
        }
        return fr ? "Voir plus" : "See more"
    }

    @ViewBuilder private var followButton: some View {
        if let sellerId = listing.sellerId, let on = following {
            Button { toggleFollow(sellerId) } label: {
                Text(followLabel(on))
                    .font(.subheadline.weight(.bold))
                    .padding(.horizontal, 18)
                    .frame(minHeight: 44)
                    .foregroundColor(on ? .white : sea)
                    .background(Capsule().fill(on ? sea : Color.white))
                    .overlay(Capsule().stroke(sea, lineWidth: 1.5))
            }
            .disabled(followBusy)
            if !followNote.isEmpty {
                Text(followNote).font(.footnote).foregroundColor(ink.opacity(0.7))
            }
        }
    }

    private func followLabel(_ on: Bool) -> String {
        if on {
            return fr ? "Suivi ✓" : "Following ✓"
        }
        return fr ? "Suivre" : "Follow"
    }

    private func loadFollow() async {
        guard let sellerId = listing.sellerId else {
            ownershipKnown = true
            return
        }
        do {
            let state = try await model.follow(sellerId, false)
            following = state
            ownListing = state == nil
        } catch {
            following = false
        }
        ownershipKnown = true
    }

    private func toggleFollow(_ sellerId: String) {
        followBusy = true
        followNote = ""
        Task {
            do {
                let now = try await model.follow(sellerId, true)
                following = now
                if now == true {
                    followNote = fr ? "Vous serez prévenu de ses nouvelles annonces." : "You will be notified of their new listings."
                }
            } catch {
                followNote = error.localizedDescription
            }
            followBusy = false
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
/// Full-screen photos: centred, swipe between them, pinch or double-tap to zoom;
/// the listing title, price and one small banner fill the space under the photo.
struct SXMZoomView: View {
    let urls: [URL]
    @State var page: Int
    let title: String
    let price: String?
    let french: Bool
    let adsAllowed: Bool
    @Environment(\.dismiss) private var dismiss
    @State private var scale: CGFloat = 1
    @State private var lastScale: CGFloat = 1

    private var counter: String {
        if urls.count < 2 { return "" }
        return String(page + 1) + " / " + String(urls.count)
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(counter).font(.subheadline.weight(.semibold)).foregroundColor(.white.opacity(0.85))
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill").font(.largeTitle).foregroundColor(.white.opacity(0.85))
                }
                .accessibilityLabel(french ? "Fermer" : "Close")
            }
            .padding(.horizontal)
            .padding(.top, 8)

            TabView(selection: $page) {
                ForEach(Array(urls.enumerated()), id: \.offset) { index, url in
                    SXMRemoteImage(url: url, fill: false)
                        .scaleEffect(index == page ? scale : 1)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .simultaneousGesture(MagnificationGesture()
                .onChanged { scale = max(1, min(5, lastScale * $0)) }
                .onEnded { _ in lastScale = scale })
            .onTapGesture(count: 2) {
                withAnimation(.spring()) { scale = scale > 1 ? 1 : 2.5; lastScale = scale }
            }
            .onChange(of: page) { _ in
                scale = 1
                lastScale = 1
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline).foregroundColor(.white).lineLimit(2)
                if let price = price {
                    Text(price).font(.title3.weight(.heavy)).foregroundColor(Color(red: 140 / 255, green: 214 / 255, blue: 226 / 255))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal)
            .padding(.vertical, 12)

            if adsAllowed {
                SXMInlineAdSection(french: french, maxHeight: 60)
                    .padding(.horizontal)
                    .padding(.bottom, 8)
            }
        }
        .background(Color.black.ignoresSafeArea())
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
