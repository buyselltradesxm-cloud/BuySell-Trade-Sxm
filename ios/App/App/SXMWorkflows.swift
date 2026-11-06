import SwiftUI
import WebKit
import PhotosUI
import ImageIO
import UniformTypeIdentifiers

// Private workflows keep authentication in the existing Supabase web client.
// Only the requested data crosses the bridge; tokens never enter native storage.
struct SXMFields: Decodable {
    var photosRequired, price, priceRequired, condition, urgent, vehicle, mileage: Bool
}
struct SXMChoice: Decodable, Identifiable { let id, name: String }
struct SXMSubcategory: Decodable, Identifiable { let id, name: String; let fields: SXMFields }
struct SXMCategory: Decodable, Identifiable { let id, name: String; let fields: SXMFields; let subs: [SXMSubcategory] }
struct SXMPostSchema: Decodable { let categories: [SXMCategory]; let areas: [String]; let conditions: [SXMChoice] }
struct SXMWorkflowSession: Decodable { let userId: String?; let french: Bool; let schema: SXMPostSchema }
struct SXMThread: Decodable, Identifiable, Hashable {
    let key: String
    let listingId: String?
    let otherId, otherName, title, lastBody: String
    let lastAt: String?
    let unread: Int
    var id: String { key }
    var payload: [String: Any] { ["listingId": listingId.map { $0 as Any } ?? NSNull(), "otherId": otherId] }
}
struct SXMMessage: Decodable, Identifiable {
    let id, body, senderId, createdAt: String
    let read: Bool
}
struct SXMMessagePage: Decodable { let messages: [SXMMessage]; let hasMore: Bool }
struct SXMWriteResult: Decodable { let id: String }
struct SXMDone: Decodable { let done: Bool }
private struct SXMReply<T: Decodable>: Decodable { let ok: Bool; let data: T?; let error, code: String? }
struct SXMWorkflowError: LocalizedError {
    let message, code: String
    var errorDescription: String? { message }
}

struct SXMDraftPhoto: Codable, Identifiable, Equatable {
    var id = UUID()
    var data: Data
}
struct SXMPostDraft: Codable, Equatable {
    var title = "", description = "", category = "", subcategory = "", area = ""
    var amount = "", currency = "usd", condition = "", phone = ""
    var year = "", km = "", color = "", fuel = "gas", transmission = "automatic"
    var urgent = false, uncertain = false
    var photos: [SXMDraftPhoto] = []
    var payload: [String: Any] {
        ["title": title, "description": description, "category": category, "subcategory": subcategory,
         "area": area, "amount": amount, "currency": currency, "condition": condition, "phone": phone,
         "year": year, "km": km, "color": color, "fuel": fuel, "transmission": transmission,
         "urgent": urgent, "photos": photos.map { ["data": $0.data.base64EncodedString()] }]
    }
}

@MainActor
final class SXMWorkflowModel: ObservableObject {
    weak var webView: WKWebView?
    var allowedOrigin: URL?
    @Published var session: SXMWorkflowSession?
    @Published var error = ""
    @Published var loading = false
    @Published var busy = false
    @Published var threads: [SXMThread] = []
    @Published var messageDrafts: [String: String] = [:]
    private var generation = UUID()
    var french: Bool { session?.french ?? (Locale.preferredLanguages.first?.hasPrefix("fr") ?? false) }
    func text(_ fr: String, _ en: String) -> String { french ? fr : en }

    func invalidate(userId: String?) {
        guard session?.userId != userId else { return }
        generation = UUID()
        session = nil
        threads = []
        messageDrafts = [:]
        error = text("Le compte a changé. Rouvrez cet écran après connexion.", "The account changed. Reopen this screen after signing in.")
    }

    func request<T: Decodable>(_ action: String, _ payload: [String: Any] = [:], as: T.Type = T.self) async throws -> T {
        guard let webView = webView, let current = webView.url, let origin = allowedOrigin,
              current.scheme == origin.scheme, current.host == origin.host, current.port == origin.port,
              ["", "/", "/index.html", "/marketplace.html"].contains(current.path) else {
            throw SXMWorkflowError(message: text("Ouvrez l'accueil puis réessayez.", "Open the home screen and try again."), code: "UNAVAILABLE")
        }
        let revision = generation
        var arguments = payload
        if action != "session" {
            guard let id = session?.userId else { throw SXMWorkflowError(message: text("Connectez-vous pour continuer.", "Sign in to continue."), code: "AUTH_REQUIRED") }
            arguments["userId"] = id
        }
        do {
            let value = try await webView.callAsyncJavaScript(
                "if (!window.SXMNativeWorkflows) throw new Error('Update required'); return JSON.stringify(await window.SXMNativeWorkflows.request(action, payload));",
                arguments: ["action": action, "payload": arguments], in: nil, contentWorld: .page)
            guard revision == generation else { throw SXMWorkflowError(message: text("Le compte a changé.", "The account changed."), code: "AUTH_REQUIRED") }
            guard let json = value as? String, let bytes = json.data(using: .utf8) else { throw URLError(.cannotParseResponse) }
            let reply = try JSONDecoder().decode(SXMReply<T>.self, from: bytes)
            guard reply.ok, let data = reply.data else {
                if reply.code == "AUTH_REQUIRED" { invalidate(userId: nil) }
                throw SXMWorkflowError(message: reply.error ?? text("Service indisponible.", "Service unavailable."), code: reply.code ?? "REQUEST_FAILED")
            }
            return data
        } catch let failure as SXMWorkflowError { throw failure }
        catch {
            // A bridge/navigation failure after a write can hide a committed response.
            throw SXMWorkflowError(message: text("Connexion interrompue. Vérifiez votre profil ou la conversation avant de réessayer.", "Connection interrupted. Check your profile or conversation before retrying."), code: ["publish", "send"].contains(action) ? "UNCERTAIN_WRITE" : "REQUEST_FAILED")
        }
    }

    func start() async {
        guard !loading else { return }
        loading = true; error = ""
        defer { loading = false }
        do {
            let current: SXMWorkflowSession = try await request("session")
            if session?.userId != current.userId { invalidate(userId: current.userId) }
            session = current
            error = current.userId == nil ? text("Connectez-vous pour continuer.", "Sign in to continue.") : ""
        } catch { self.error = error.localizedDescription }
    }

    func inbox() async {
        guard session?.userId != nil, !loading else { return }
        loading = true
        defer { loading = false }
        do { threads = try await request("inbox"); error = "" }
        catch { self.error = error.localizedDescription }
    }

    func draftURL(_ owner: String) throws -> URL {
        guard UUID(uuidString: owner) != nil else { throw URLError(.userAuthenticationRequired) }
        var directory = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("ListingDrafts", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var values = URLResourceValues(); values.isExcludedFromBackup = true
        try directory.setResourceValues(values)
        return directory.appendingPathComponent(owner + ".json")
    }
    func save(_ draft: SXMPostDraft, owner: String) throws {
        try JSONEncoder().encode(draft).write(to: draftURL(owner), options: [.atomic, .completeFileProtection])
    }
    func restore(owner: String) throws -> SXMPostDraft {
        let url = try draftURL(owner)
        guard FileManager.default.fileExists(atPath: url.path) else { return SXMPostDraft() }
        return try JSONDecoder().decode(SXMPostDraft.self, from: Data(contentsOf: url))
    }
    func discard(owner: String) throws {
        let url = try draftURL(owner)
        if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }
}

struct SXMWorkflowView: View {
    @ObservedObject var model: SXMWorkflowModel
    let tab: String
    let listingId: String?
    let close, profile: () -> Void
    @State private var contact: SXMThread?
    @State private var owner = ""
    var body: some View {
        NavigationView {
            Group {
                if let id = model.session?.userId {
                    if tab == "post" {
                        SXMPostView(model: model, owner: id, profile: profile).id(id)
                    } else if listingId != nil {
                        if let contact = contact { SXMThreadView(model: model, thread: contact) }
                        else { status }
                    } else { SXMInboxView(model: model) }
                } else { status }
            }
            .navigationTitle(tab == "post" ? model.text("Publier", "Post") : model.text("Messages", "Messages"))
            .toolbar { ToolbarItem(placement: .navigationBarLeading) { Button(model.text("Fermer", "Close"), action: close).disabled(model.busy) } }
        }
        .navigationViewStyle(.stack)
        .tint(Color(red: 11/255, green: 110/255, blue: 127/255))
        .task {
            await model.start()
            owner = model.session?.userId ?? ""
            if let listingId = listingId, !owner.isEmpty {
                do { contact = try await model.request("contact", ["listingId": listingId]) }
                catch { model.error = error.localizedDescription }
            }
        }
        .onChange(of: model.session?.userId) { id in if id != owner { contact = nil } }
    }
    private var status: some View {
        VStack(spacing: 20) {
            if model.loading { ProgressView() }
            if !model.error.isEmpty { Text(model.error).multilineTextAlignment(.center) }
            Button(model.text("Réessayer", "Try again")) { Task {
                await model.start()
                if let listingId = listingId, model.session?.userId != nil {
                    do { contact = try await model.request("contact", ["listingId": listingId]) }
                    catch { model.error = error.localizedDescription }
                }
            } }
            Button(model.text("Ouvrir mon profil", "Open my profile"), action: profile)
        }.padding()
    }
}

struct SXMPostView: View {
    @ObservedObject var model: SXMWorkflowModel
    let owner: String
    let profile: () -> Void
    @State private var draft = SXMPostDraft()
    @State private var restored = false
    @State private var saved = false
    @State private var published = false
    @State private var addingPhotos = false
    @State private var notice = ""
    @State private var storageError = ""
    @State private var picker: SXMPhotoSource?
    @State private var confirmDiscard = false
    private var category: SXMCategory? { model.session?.schema.categories.first { $0.id == draft.category } }
    private var fields: SXMFields? { category?.subs.first { $0.id == draft.subcategory }?.fields ?? category?.fields }
    var body: some View {
        Form {
            if published {
                Section {
                    Label(model.text("Annonce publiée", "Listing published"), systemImage: "checkmark.circle.fill")
                    if !storageError.isEmpty { Text(storageError).foregroundColor(.red) }
                    Button(model.text("Voir mes annonces", "View my listings"), action: profile)
                    Button(model.text("Créer une autre annonce", "Create another listing")) { published = false }
                }
            } else {
                Section(header: Text(model.text("Votre annonce", "Your listing"))) {
                    TextField(model.text("Titre", "Title"), text: $draft.title)
                    Picker(model.text("Catégorie", "Category"), selection: Binding(get: { draft.category }, set: { draft.category = $0; draft.subcategory = "" })) {
                        Text(model.text("Choisir", "Choose")).tag("")
                        ForEach(model.session?.schema.categories ?? []) { Text($0.name).tag($0.id) }
                    }
                    if let category = category, !category.subs.isEmpty {
                        Picker(model.text("Sous-catégorie", "Subcategory"), selection: $draft.subcategory) {
                            Text(model.text("Choisir", "Choose")).tag("")
                            ForEach(category.subs) { Text($0.name).tag($0.id) }
                        }
                    }
                    Picker(model.text("Secteur", "Area"), selection: $draft.area) {
                        Text(model.text("Choisir", "Choose")).tag("")
                        ForEach(model.session?.schema.areas ?? [], id: \.self) { Text($0).tag($0) }
                    }
                    Text(model.text("Description", "Description")).font(.caption).foregroundColor(.secondary)
                    TextEditor(text: $draft.description).frame(minHeight: 120).accessibilityLabel(model.text("Description", "Description"))
                }
                Section(header: Text(model.text("Photos", "Photos")), footer: Text(model.text("Jusqu'à 8 photos. La première est la photo principale.", "Up to 8 photos. The first is the cover photo."))) {
                    ForEach(Array(draft.photos.enumerated()), id: \.element.id) { index, photo in
                        HStack {
                            if let image = UIImage(data: photo.data) { Image(uiImage: image).resizable().scaledToFill().frame(width: 64, height: 64).clipped().accessibilityLabel(model.text("Photo", "Photo") + " \(index + 1)") }
                            Text(index == 0 ? model.text("Principale", "Cover") : "\(index + 1)")
                            Spacer()
                            Button { draft.photos.swapAt(index, index - 1) } label: { Image(systemName: "arrow.up").frame(minWidth: 44, minHeight: 44) }.disabled(index == 0).accessibilityLabel(model.text("Avancer la photo", "Move photo earlier"))
                            Button { draft.photos.remove(at: index) } label: { Image(systemName: "trash").frame(minWidth: 44, minHeight: 44) }.accessibilityLabel(model.text("Retirer la photo", "Remove photo"))
                        }.buttonStyle(.borderless)
                    }
                    if draft.photos.count < 8 {
                        Button { picker = .library } label: { Label(model.text("Photothèque", "Photo library"), systemImage: "photo.on.rectangle") }.disabled(addingPhotos)
                        if UIImagePickerController.isSourceTypeAvailable(.camera) {
                            Button { picker = .camera } label: { Label(model.text("Prendre une photo", "Take a photo"), systemImage: "camera") }.disabled(addingPhotos)
                        }
                    }
                    if addingPhotos { ProgressView(model.text("Préparation des photos…", "Preparing photos…")) }
                }
                if let fields = fields {
                    Section(header: Text(model.text("Détails", "Details"))) {
                        if fields.price {
                            TextField(fields.priceRequired ? model.text("Prix", "Price") : model.text("Prix (facultatif)", "Price (optional)"), text: $draft.amount).keyboardType(.decimalPad)
                            Picker(model.text("Devise", "Currency"), selection: $draft.currency) { Text("USD ($)").tag("usd"); Text("EUR (€)").tag("eur") }
                        }
                        if fields.condition {
                            Picker(model.text("État", "Condition"), selection: $draft.condition) {
                                Text(model.text("Choisir", "Choose")).tag("")
                                ForEach(model.session?.schema.conditions ?? []) { Text($0.name).tag($0.id) }
                            }
                        }
                        if fields.vehicle {
                            TextField(model.text("Année", "Year"), text: $draft.year).keyboardType(.numberPad)
                            if fields.mileage {
                                TextField(model.text("Kilométrage", "Mileage (km)"), text: $draft.km).keyboardType(.numberPad)
                                TextField(model.text("Couleur", "Color"), text: $draft.color)
                            }
                            Picker(model.text("Carburant", "Fuel"), selection: $draft.fuel) {
                                Text(model.text("Essence", "Gasoline")).tag("gas"); Text("Diesel").tag("diesel")
                                Text(model.text("Hybride", "Hybrid")).tag("hybrid"); Text(model.text("Électrique", "Electric")).tag("electric")
                            }
                            Picker(model.text("Transmission", "Transmission"), selection: $draft.transmission) {
                                Text(model.text("Automatique", "Automatic")).tag("automatic"); Text(model.text("Manuelle", "Manual")).tag("manual")
                            }
                        }
                        TextField(model.text("Téléphone (facultatif, visible sur l'annonce)", "Phone (optional, visible on listing)"), text: $draft.phone).keyboardType(.phonePad)
                        if fields.urgent { Toggle(model.text("Vente urgente", "Urgent sale"), isOn: $draft.urgent) }
                    }
                }
                Section {
                    if !notice.isEmpty { Text(notice).foregroundColor(.primary).accessibilityAddTraits(.updatesFrequently) }
                    if !storageError.isEmpty { Text(storageError).foregroundColor(.red) }
                    if saved { Label(model.text("Brouillon enregistré sur cet appareil", "Draft saved on this device"), systemImage: "checkmark") }
                    if draft.uncertain {
                        Text(model.text("Vérifiez vos annonces avant de recommencer pour éviter un doublon.", "Check your listings before starting again to avoid a duplicate."))
                        Button(model.text("Vérifier mon profil", "Check my profile"), action: profile)
                    } else {
                        Button { Task { await publish() } } label: {
                            if model.busy { ProgressView() } else { Text(model.text("Publier l'annonce", "Publish listing")).fontWeight(.semibold) }
                        }.disabled(model.busy || addingPhotos || !restored || !storageError.isEmpty)
                    }
                    Button(model.text("Effacer le brouillon", "Discard draft"), role: .destructive) { confirmDiscard = true }.disabled(model.busy || !restored)
                }
            }
        }
        .disabled(model.busy || model.session?.userId != owner)
        .onAppear {
            guard !restored else { return }
            do { draft = try model.restore(owner: owner); restored = true }
            catch { storageError = model.text("Impossible de charger le brouillon. Fermez puis réessayez.", "Could not load your draft. Close and try again.") }
        }
        .onChange(of: draft) { _ in persist() }
        .sheet(item: $picker) { source in
            SXMPhotoPicker(source: source, limit: 8 - draft.photos.count, processing: { addingPhotos = $0; model.busy = $0 }) { data in
                guard model.session?.userId == owner, draft.photos.count < 8 else { return }
                if let data = data { draft.photos.append(SXMDraftPhoto(data: data)) }
                else { notice = model.text("Photo illisible. Choisissez une autre photo.", "Could not read this photo. Choose another photo.") }
            }
        }
        .confirmationDialog(model.text("Effacer le brouillon et ses photos ?", "Discard this draft and its photos?"), isPresented: $confirmDiscard, titleVisibility: .visible) {
            Button(model.text("Effacer le brouillon", "Discard draft"), role: .destructive) {
                do { try model.discard(owner: owner); draft = SXMPostDraft(); notice = "" }
                catch { storageError = error.localizedDescription }
            }
            Button(model.text("Annuler", "Cancel"), role: .cancel) {}
        }
    }
    private func persist() {
        guard restored, model.session?.userId == owner, !published else { return }
        do { try model.save(draft, owner: owner); saved = true; storageError = "" }
        catch { saved = false; storageError = model.text("Brouillon non enregistré. Libérez de l'espace puis réessayez.", "Draft not saved. Free up space and try again.") }
    }
    private func publish() async {
        guard !model.busy, !draft.uncertain, model.session?.userId == owner else { return }
        persist()
        guard storageError.isEmpty else { return }
        model.busy = true; notice = ""
        defer { model.busy = false }
        do {
            // A killed app cannot know whether the server committed the request.
            var pending = draft; pending.uncertain = true
            try model.save(pending, owner: owner)
            let _: SXMWriteResult = try await model.request("publish", ["draft": draft.payload])
            published = true
            do { try model.discard(owner: owner); draft = SXMPostDraft(); saved = false }
            catch { storageError = model.text("Annonce publiée. Le brouillon n'a pas pu être effacé.", "Listing published. The draft could not be removed.") }
        } catch {
            notice = error.localizedDescription
            if ["UNCERTAIN_WRITE", "AUTH_REQUIRED"].contains((error as? SXMWorkflowError)?.code ?? "") { draft.uncertain = true }
            persist()
        }
    }
}

enum SXMPhotoSource: String, Identifiable { case camera, library; var id: String { rawValue } }
struct SXMPhotoPicker: UIViewControllerRepresentable {
    let source: SXMPhotoSource
    let limit: Int
    let processing: (Bool) -> Void
    let receive: (Data?) -> Void
    @Environment(\.dismiss) private var dismiss
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    func makeUIViewController(context: Context) -> UIViewController {
        if source == .camera {
            let picker = UIImagePickerController(); picker.sourceType = .camera; picker.delegate = context.coordinator
            return picker
        }
        var config = PHPickerConfiguration(); config.filter = .images; config.selectionLimit = max(1, limit)
        let picker = PHPickerViewController(configuration: config); picker.delegate = context.coordinator
        return picker
    }
    func updateUIViewController(_ controller: UIViewController, context: Context) {}
    final class Coordinator: NSObject, PHPickerViewControllerDelegate, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: SXMPhotoPicker
        init(_ parent: SXMPhotoPicker) { self.parent = parent }
        // Downsample before decoding so large camera originals do not exhaust memory.
        private static func jpeg(_ data: Data) -> Data? {
            guard let source = CGImageSourceCreateWithData(data as CFData, nil),
                  let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceCreateThumbnailWithTransform: true, kCGImageSourceThumbnailMaxPixelSize: 1600] as CFDictionary) else { return nil }
            return UIImage(cgImage: image).jpegData(compressionQuality: 0.78)
        }
        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            parent.dismiss()
            guard !results.isEmpty else { return }
            parent.processing(true)
            // Process sequentially to cap memory while preserving the user's chosen order.
            load(Array(results.prefix(parent.limit)), index: 0)
        }
        private func load(_ results: [PHPickerResult], index: Int) {
            guard index < results.count else { parent.processing(false); return }
            results[index].itemProvider.loadDataRepresentation(forTypeIdentifier: UTType.image.identifier) { data, _ in
                let jpeg = data.flatMap { Self.jpeg($0) }
                DispatchQueue.main.async {
                    self.parent.receive(jpeg)
                    self.load(results, index: index + 1)
                }
            }
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            parent.dismiss()
            guard let image = info[.originalImage] as? UIImage else { parent.receive(nil); return }
            let size = image.size
            let scale = min(1, 1600 / max(size.width, size.height))
            let format = UIGraphicsImageRendererFormat(); format.scale = 1
            let result = UIGraphicsImageRenderer(size: CGSize(width: size.width * scale, height: size.height * scale), format: format).image { _ in image.draw(in: CGRect(x: 0, y: 0, width: size.width * scale, height: size.height * scale)) }
            parent.receive(result.jpegData(compressionQuality: 0.78))
        }
    }
}

struct SXMInboxView: View {
    @ObservedObject var model: SXMWorkflowModel
    @Environment(\.scenePhase) private var scenePhase
    var body: some View {
        List {
            if !model.error.isEmpty { Text(model.error).foregroundColor(.red) }
            if model.loading { ProgressView() }
            if model.threads.isEmpty && !model.loading && model.error.isEmpty {
                Text(model.text("Contactez un vendeur depuis une annonce pour commencer une conversation.", "Contact a seller from a listing to start a conversation."))
            }
            ForEach(model.threads) { thread in
                NavigationLink(destination: SXMThreadView(model: model, thread: thread)) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack { Text(thread.otherName).font(.headline); Spacer(); if thread.unread > 0 { Text("\(thread.unread)").font(.caption.bold()).accessibilityLabel(model.text("Messages non lus", "Unread messages") + " \(thread.unread)") } }
                        Text(thread.title).font(.subheadline)
                        Text(thread.lastBody).font(.body).foregroundColor(.secondary).lineLimit(2)
                    }.padding(.vertical, 6)
                }
            }
            Button(model.text("Actualiser", "Refresh")) { Task { await model.inbox() } }
        }
        .refreshable { await model.inbox() }
        .task {
            while !Task.isCancelled {
                if scenePhase == .active { await model.inbox() }
                do { try await Task.sleep(nanoseconds: 8_000_000_000) } catch { break }
            }
        }
    }
}

struct SXMThreadView: View {
    @ObservedObject var model: SXMWorkflowModel
    let thread: SXMThread
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @State private var messages: [SXMMessage] = []
    @State private var loading = false
    @State private var sending = false
    @State private var hasMore = false
    @State private var uncertain = false
    @State private var error = ""
    @State private var confirmBlock = false
    @State private var confirmReport = false
    @State private var blocked = false
    private var draft: Binding<String> { Binding(get: { model.messageDrafts[thread.key] ?? "" }, set: { model.messageDrafts[thread.key] = $0 }) }
    var body: some View {
        VStack(spacing: 0) {
            if !error.isEmpty { Text(error).foregroundColor(.red).padding() }
            ScrollViewReader { reader in
                List {
                    if hasMore { Button(model.text("Messages plus anciens", "Older messages")) { Task { await load(older: true) } }.disabled(loading) }
                    ForEach(messages) { message in
                        VStack(alignment: message.senderId == model.session?.userId ? .trailing : .leading, spacing: 4) {
                            Text(message.senderId == model.session?.userId ? model.text("Vous", "You") : thread.otherName).font(.caption).foregroundColor(.secondary)
                            Text(message.body).textSelection(.enabled)
                            Text(message.createdAt.replacingOccurrences(of: "T", with: " ").prefix(16)).font(.caption2).foregroundColor(.secondary)
                        }.frame(maxWidth: .infinity, alignment: message.senderId == model.session?.userId ? .trailing : .leading).id(message.id)
                    }
                    if loading { ProgressView() }
                }
                .onChange(of: messages.last?.id) { id in if let id = id { reader.scrollTo(id, anchor: .bottom) } }
                .refreshable { await load(manual: true) }
            }
            if !blocked && model.session?.userId != nil {
                VStack {
                    TextField(model.text("Votre message", "Your message"), text: draft).textFieldStyle(.roundedBorder).disabled(sending)
                    HStack {
                        Button(model.text("Actualiser", "Refresh")) { Task { await load(manual: true) } }.disabled(loading || sending)
                        Spacer()
                        Button { Task { await send() } } label: {
                            if sending { ProgressView() } else { Text(model.text("Envoyer", "Send")) }
                        }.disabled(sending || uncertain || draft.wrappedValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                    Text(model.text("Compte gratuit : 5 messages par annonce.", "Free account: 5 messages per listing.")).font(.caption).foregroundColor(.secondary)
                }.padding()
            }
        }
        .navigationTitle(thread.otherName)
        .toolbar { ToolbarItem(placement: .navigationBarTrailing) {
            Menu {
                Button(model.text("Bloquer ce membre", "Block this member"), role: .destructive) { confirmBlock = true }.disabled(blocked || model.busy)
                if thread.listingId != nil { Button(model.text("Signaler l'annonce", "Report listing")) { confirmReport = true }.disabled(model.busy) }
            } label: { Image(systemName: "ellipsis.circle").frame(minWidth: 44, minHeight: 44) }.accessibilityLabel(model.text("Actions de la conversation", "Conversation actions"))
        } }
        .confirmationDialog(model.text("Bloquer ce membre ? Vous ne recevrez plus ses messages.", "Block this member? You will no longer receive their messages."), isPresented: $confirmBlock, titleVisibility: .visible) {
            Button(model.text("Bloquer", "Block"), role: .destructive) { Task { await moderate("block") } }
            Button(model.text("Annuler", "Cancel"), role: .cancel) {}
        }
        .confirmationDialog(model.text("Signaler cette annonce comme contenu inapproprié ?", "Report this listing as inappropriate content?"), isPresented: $confirmReport, titleVisibility: .visible) {
            Button(model.text("Signaler", "Report")) { Task { await moderate("report") } }
            Button(model.text("Annuler", "Cancel"), role: .cancel) {}
        }
        .onChange(of: model.session?.userId) { _ in messages = [] }
        .task {
            while !Task.isCancelled && !blocked && model.session?.userId != nil {
                if scenePhase == .active { await load() }
                do { try await Task.sleep(nanoseconds: 6_000_000_000) } catch { break }
            }
        }
    }
    private func load(older: Bool = false, manual: Bool = false) async {
        guard !loading, !blocked else { return }
        loading = true
        defer { loading = false }
        do {
            var payload = thread.payload
            if older, let first = messages.first { payload["before"] = ["at": first.createdAt, "id": first.id] }
            let page: SXMMessagePage = try await model.request("thread", payload)
            var merged = Dictionary(messages.map { ($0.id, $0) }, uniquingKeysWith: { _, next in next })
            page.messages.forEach { merged[$0.id] = $0 }
            messages = merged.values.sorted {
                if $0.createdAt != $1.createdAt { return $0.createdAt < $1.createdAt }
                if let left = Int64($0.id), let right = Int64($1.id) { return left < right }
                return $0.id < $1.id
            }
            if older || messages.count <= 50 { hasMore = page.hasMore }
            if uncertain && manual {
                error = model.text("Historique actualisé. Vérifiez si le message a été envoyé avant de réessayer.", "History refreshed. Check whether your message was sent before retrying.")
                uncertain = false
            } else if manual { error = "" }
        } catch { self.error = error.localizedDescription }
    }
    private func send() async {
        guard !sending, !uncertain else { return }
        let body = draft.wrappedValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard body.count <= 4000 else { error = model.text("Maximum 4 000 caractères.", "Maximum 4,000 characters."); return }
        sending = true
        defer { sending = false }
        do {
            var payload = thread.payload; payload["body"] = body
            let message: SXMMessage = try await model.request("send", payload)
            if !messages.contains(where: { $0.id == message.id }) { messages.append(message) }
            if draft.wrappedValue.trimmingCharacters(in: .whitespacesAndNewlines) == body { draft.wrappedValue = "" }
            error = ""
        } catch {
            self.error = error.localizedDescription
            uncertain = (error as? SXMWorkflowError)?.code == "UNCERTAIN_WRITE"
        }
    }
    private func moderate(_ action: String) async {
        guard !model.busy else { return }
        model.busy = true
        defer { model.busy = false }
        do {
            var payload = thread.payload; payload["name"] = thread.otherName
            let _: SXMDone = try await model.request(action, payload)
            if action == "block" { blocked = true; messages = []; model.messageDrafts.removeValue(forKey: thread.key); model.threads.removeAll { $0.otherId == thread.otherId }; dismiss() }
            else { error = model.text("Signalement envoyé.", "Report sent.") }
        } catch { self.error = error.localizedDescription }
    }
}
