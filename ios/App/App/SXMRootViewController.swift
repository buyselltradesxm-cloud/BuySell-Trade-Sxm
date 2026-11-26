import Capacitor
import SwiftUI
import UIKit

/// The app's root screen: a native tab bar under either the native Browse
/// screen, native posting/messages, or the marketplace account/alerts web view.
/// The tab bar mirrors the unread counts
/// the page reports back (see native-ios.js).
final class SXMRootViewController: UIViewController, UITabBarDelegate {
    enum Tab: String, CaseIterable {
        case browse, saved, post, messages, profile, alerts
        static var allCases: [Tab] { [.browse, .saved, .post, .messages, .profile] }
    }

    // TODO(human): the tabs, their order, labels and icons are a product
    // choice. Icons are SF Symbol names; ".fill" is used for the selected one.
    private static let labels: [Tab: (fr: String, en: String, symbol: String)] = [
        .browse: ("Découvrir", "Discover", "house"),
        .saved: ("Favoris", "Saved", "heart"),
        .post: ("Publier", "Post", "plus.circle"),
        .messages: ("Messages", "Messages", "envelope"),
        .alerts: ("Alertes", "Alerts", "bell"),
        .profile: ("Profil", "Profile", "person.crop.circle")
    ]
    private static let appPaths: Set<String> = ["", "/", "/index.html", "/marketplace.html"]
    private static let sea = UIColor(red: 11 / 255, green: 110 / 255, blue: 127 / 255, alpha: 1)
    private static let paper = UIColor(red: 251 / 255, green: 247 / 255, blue: 239 / 255, alpha: 1)
    private static let ink = UIColor(red: 19 / 255, green: 42 / 255, blue: 46 / 255, alpha: 1)

    let web = SXMBridgeViewController()
    private lazy var browseModel: SXMBrowseModel = {
        let model = SXMBrowseModel(french: french)
        model.contact = { [weak self] listing in self?.contactSeller(listing.id) }
        // native-admob.js decides: consent, Pro, 90 s first delay, 3 min cooldown, 5 per session.
        model.detailClosed = { [weak self] in
            self?.web.webView?.evaluateJavaScript("window.__BST_ADMOB_INTERSTITIAL__&&window.__BST_ADMOB_INTERSTITIAL__()")
        }
        model.follow = { [weak self] sellerId, change in
            guard let self = self else { return false }
            return try await self.followSeller(sellerId, change)
        }
        model.subcategoryName = { [weak self] category, subcategory in
            self?.subcategoryName(category, subcategory)
        }
        model.post = { [weak self] in self?.open(.post) }
        model.manage = { [weak self] listing in self?.showInWeb(listing: listing.id) }
        model.messages = { [weak self] in self?.open(.messages) }
        model.alerts = { [weak self] in self?.open(.alerts) }
        model.languageChanged = { [weak self] useFrench in self?.setBrowseLanguage(useFrench) }
        return model
    }()
    private lazy var browse = UIHostingController(rootView: SXMBrowseView(model: browseModel))
    private let tabBar = UITabBar()
    private let refresh = UIRefreshControl()
    private let feedback = UISelectionFeedbackGenerator()
    private let workflowModel = SXMWorkflowModel()
    private var workflow: UIHostingController<SXMWorkflowView>?
    private var workflowTab: Tab?
    private var french = UserDefaults.standard.bool(forKey: "sxm.language.french")
    /// Titles sent by the page. They replace the built-in ones, so wording can
    /// change on the site without shipping a new build.
    private var pageTitles: [Tab: String] = [:]
    /// A tab chosen before the page could act on it (cold start from a home
    /// screen shortcut, or while a legal page was showing).
    private var pendingTab: Tab?
    private var pendingContact: String?
    private var profileAdEligible = false
    private var profileAd: UIHostingController<SXMInlineAdSection>?
    private var profileAdHeight: NSLayoutConstraint?
    private var webBottom: NSLayoutConstraint?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Self.paper

        addChild(web)
        web.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web.view)
        tabBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tabBar)
        let webBottom = web.view.bottomAnchor.constraint(equalTo: tabBar.topAnchor)
        self.webBottom = webBottom
        NSLayoutConstraint.activate([
            web.view.topAnchor.constraint(equalTo: view.topAnchor),
            web.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webBottom,
            tabBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tabBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tabBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            // 49pt of buttons above the home indicator area.
            tabBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -49)
        ])
        web.didMove(toParent: self)
        if let origin = web.bridge?.config.serverURL { browseModel.sponsoredOrigin = origin }

        addChild(browse)
        browse.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(browse.view)
        NSLayoutConstraint.activate([
            browse.view.topAnchor.constraint(equalTo: view.topAnchor),
            browse.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            browse.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            browse.view.bottomAnchor.constraint(equalTo: tabBar.topAnchor)
        ])
        browse.didMove(toParent: self)

        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = Self.paper
        tabBar.standardAppearance = appearance
        tabBar.scrollEdgeAppearance = appearance
        tabBar.tintColor = Self.sea
        tabBar.unselectedItemTintColor = Self.ink.withAlphaComponent(0.6)
        tabBar.delegate = self
        buildItems(selected: .browse)

        refresh.tintColor = Self.sea
        refresh.addTarget(self, action: #selector(pulledToRefresh), for: .valueChanged)
        web.webView?.scrollView.refreshControl = refresh

        updateShortcuts()
        #if DEBUG
        // Simulator checks open a tab without a tap: `-sxmTab messages`.
        if let name = UserDefaults.standard.string(forKey: "sxmTab"), let tab = Tab(rawValue: name) {
            pendingTab = tab
        }
        #endif
    }

    override var childForStatusBarStyle: UIViewController? { browse.view.isHidden ? web : browse }
    override var childForStatusBarHidden: UIViewController? { web }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { web.supportedInterfaceOrientations }

    // MARK: - Tabs

    private func title(_ tab: Tab) -> String {
        let label = Self.labels[tab]
        if tab == .browse || tab == .saved { return (french ? label?.fr : label?.en) ?? tab.rawValue }
        return pageTitles[tab] ?? (french ? label?.fr : label?.en) ?? tab.rawValue
    }

    private func buildItems(selected: Tab) {
        let items = Tab.allCases.enumerated().map { index, tab -> UITabBarItem in
            let symbol = Self.labels[tab]?.symbol ?? "circle"
            let item = UITabBarItem(title: title(tab),
                                    image: UIImage(systemName: symbol),
                                    selectedImage: UIImage(systemName: symbol + ".fill"))
            item.tag = index
            item.badgeValue = tabBar.items?.first(where: { $0.tag == index })?.badgeValue
            return item
        }
        tabBar.setItems(items, animated: false)
        select(selected)
    }

    private func select(_ tab: Tab) {
        let visible = tab == .alerts ? Tab.profile : tab
        tabBar.selectedItem = tabBar.items?.first { $0.tag == Tab.allCases.firstIndex(of: visible) }
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard Tab.allCases.indices.contains(item.tag) else { return }
        feedback.selectionChanged()
        open(Tab.allCases[item.tag])
    }

    /// Shows a tab's screen. The page does the work when it is the one on
    /// screen; from any other page (terms, privacy) the app goes home first
    /// and the page picks the tab up through `takePendingTab()`.
    func open(_ tab: Tab) {
        if workflowModel.busy { select(workflowTab ?? .browse); return }
        hideWorkflow()
        if tab != .profile {
            profileAdEligible = false
            syncProfileAd()
        }
        pendingContact = nil
        select(tab)
        // For Browse the page still closes whatever it had open behind the native screen.
        if tab == .browse || tab == .saved { browseModel.showingSaved = tab == .saved }
        showNativeBrowse(tab == .browse || tab == .saved)
        guard let webView = web.webView, let bridge = web.bridge else { return }
        let home = bridge.config.serverURL
        let current = webView.url
        let onAppPage = current?.host == home.host && Self.appPaths.contains(current?.path ?? "-")
        if onAppPage && !webView.isLoading {
            bridge.triggerWindowJSEvent(eventName: "sxmTab", data: "{\"tab\":\"\(tab.rawValue)\"}")
        } else {
            pendingTab = tab
            // Nothing loaded yet means the first load is already on its way.
            if !onAppPage && current != nil { webView.load(URLRequest(url: home)) }
        }
    }

    private func showNativeBrowse(_ on: Bool) {
        browse.view.isHidden = !on
        browseModel.discoverVisible = on
        setNeedsStatusBarAppearanceUpdate()
    }

    func setNativeAdsAllowed(_ allowed: Bool) {
        browseModel.adsAllowed = allowed
        workflowModel.adsAllowed = allowed
        syncProfileAd()
    }

    private func syncProfileAd() {
        if !profileAdEligible || !browseModel.adsAllowed || workflow != nil {
            if let ad = profileAd {
                profileAd = nil
                profileAdHeight = nil
                webBottom?.constant = 0
                ad.willMove(toParent: nil)
                ad.view.removeFromSuperview()
                ad.removeFromParent()
            }
            return
        }
        guard profileAd == nil else { return }
        let ad = UIHostingController(rootView: SXMInlineAdSection(french: french, maxHeight: 60, heightChanged: { [weak self] height in
            guard let self = self, let constraint = self.profileAdHeight else { return }
            constraint.constant = height
            self.webBottom?.constant = height > 0 ? -(height + 16) : 0
        }))
        profileAd = ad
        addChild(ad)
        ad.view.backgroundColor = .clear
        ad.view.translatesAutoresizingMaskIntoConstraints = false
        view.insertSubview(ad.view, belowSubview: tabBar)
        let height = ad.view.heightAnchor.constraint(equalToConstant: 1)
        profileAdHeight = height
        let width = ad.view.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.9)
        width.priority = .defaultHigh
        NSLayoutConstraint.activate([
            ad.view.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            width,
            ad.view.widthAnchor.constraint(lessThanOrEqualToConstant: 460),
            ad.view.bottomAnchor.constraint(equalTo: tabBar.topAnchor, constant: -16),
            height
        ])
        ad.didMove(toParent: self)
    }

    private func setBrowseLanguage(_ useFrench: Bool) {
        french = useFrench
        UserDefaults.standard.set(useFrench, forKey: "sxm.language.french")
        buildItems(selected: browseModel.showingSaved ? .saved : .browse)
        let language = useFrench ? "fr" : "en"
        web.webView?.evaluateJavaScript("if(typeof setLang==='function')setLang('\(language)')")
    }

    private func hideWorkflow() {
        workflow?.willMove(toParent: nil)
        workflow?.view.removeFromSuperview()
        workflow?.removeFromParent()
        workflow = nil
        workflowTab = nil
    }

    func workflowIdentity(_ userId: String?) { workflowModel.invalidate(userId: userId) }

    func showWorkflow(tab: String, listingId: String? = nil) {
        guard !workflowModel.busy, let chosen = Tab(rawValue: tab), chosen == .post || chosen == .messages else { return }
        hideWorkflow()
        workflowModel.webView = web.webView
        workflowModel.allowedOrigin = web.bridge?.config.serverURL
        let screen = SXMWorkflowView(model: workflowModel, tab: tab, listingId: listingId,
            close: { [weak self] in self?.open(.browse) }, profile: { [weak self] in self?.open(.profile) })
        let controller = UIHostingController(rootView: screen)
        workflow = controller; workflowTab = chosen
        syncProfileAd()
        addChild(controller)
        controller.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(controller.view)
        NSLayoutConstraint.activate([
            controller.view.topAnchor.constraint(equalTo: view.topAnchor),
            controller.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            controller.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            controller.view.bottomAnchor.constraint(equalTo: tabBar.topAnchor)
        ])
        controller.didMove(toParent: self)
        showNativeBrowse(false)
        select(chosen)
    }

    /// "Follow this seller" from the native detail, through the signed-in web session.
    private func followSeller(_ sellerId: String, _ change: Bool) async throws -> Bool? {
        workflowModel.webView = web.webView
        workflowModel.allowedOrigin = web.bridge?.config.serverURL
        if workflowModel.session?.userId == nil {
            await workflowModel.start()
        }
        let reply: SXMFollowReply = try await workflowModel.request("follow", ["sellerId": sellerId, "change": change])
        if reply.own { return nil }
        return reply.following
    }

    private func subcategoryName(_ category: String?, _ subcategory: String?) -> String? {
        guard let sub = subcategory, let schema = workflowModel.session?.schema else { return nil }
        guard let group = schema.categories.first(where: { $0.id == category }) else { return nil }
        return group.subs.first(where: { $0.id == sub })?.name
    }

    private func contactSeller(_ id: String) {
        guard let bridge = web.bridge, let webView = web.webView else { return }
        if webView.isLoading || webView.url?.host != bridge.config.serverURL.host || !Self.appPaths.contains(webView.url?.path ?? "-") {
            pendingContact = id
            return
        }
        let json = String(data: (try? JSONSerialization.data(withJSONObject: ["id": id])) ?? Data(), encoding: .utf8) ?? "{}"
        bridge.triggerWindowJSEvent(eventName: "sxmContact", data: json)
    }

    /// "Contact the seller": the page shows the listing with its chat button.
    func showInWeb(listing id: String) {
        showNativeBrowse(false)
        guard let webView = web.webView, let bridge = web.bridge else { return }
        let home = bridge.config.serverURL
        let current = webView.url
        let onAppPage = current?.host == home.host && Self.appPaths.contains(current?.path ?? "-")
        let json = String(data: (try? JSONSerialization.data(withJSONObject: ["id": id])) ?? Data(), encoding: .utf8) ?? "{}"
        if onAppPage && !webView.isLoading {
            bridge.triggerWindowJSEvent(eventName: "sxmListing", data: json)
        } else {
            var parts = URLComponents(url: home, resolvingAgainstBaseURL: false)
            parts?.queryItems = [URLQueryItem(name: "listing", value: id)]
            if let url = parts?.url { webView.load(URLRequest(url: url)) }
        }
    }

    @discardableResult func openListingURL(_ url: URL) -> Bool {
        guard url.scheme == "https", url.host == "buyselltradesxm.com",
              !workflowModel.busy else { return false }
        let parts = url.path.split(separator: "/")
        let id: String?
        if parts.count == 2, ["l", "s"].contains(String(parts[0])), parts[1].hasSuffix(".html") {
            id = String(parts[1].dropLast(5))
        } else if url.path == "/" {
            id = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "listing" }?.value
        } else { return false }
        guard let id = id, id.range(of: "^[A-Za-z0-9_-]+$", options: .regularExpression) != nil else { return false }
        loadViewIfNeeded()
        hideWorkflow()
        showInWeb(listing: id)
        return true
    }

    func takePendingTab() -> String? {
        defer { pendingTab = nil }
        return pendingTab?.rawValue
    }

    func takePendingContact() -> String? {
        defer { pendingContact = nil }
        return pendingContact
    }

    /// The page reports what it is showing, in which language, and its unread counts.
    func update(selected: String?, french: Bool?, badges: [String: Int], titles: [String: String],
                detail: Bool? = nil, profileAd: Bool = false) {
        if let french = french, french != browseModel.french { browseModel.french = french }
        // `detail`: the page has a screen open outside the tabs (a listing from a shared
        // link or from "Contact the seller", pricing...). It shows over Browse until closed.
        if workflow == nil, let tab = selected.flatMap(Tab.init(rawValue:)), let detail = detail {
            showNativeBrowse((tab == .browse || tab == .saved) && !detail)
        }
        var sent: [Tab: String] = [:]
        for (name, text) in titles where !text.isEmpty {
            if let tab = Tab(rawValue: name) { sent[tab] = text }
        }
        let retitled = !sent.isEmpty && sent != pageTitles
        if retitled { pageTitles = sent }
        let languageChanged = french != nil && french != self.french
        if let french = french {
            self.french = french
            UserDefaults.standard.set(french, forKey: "sxm.language.french")
        }
        let chosen = selected.flatMap(Tab.init(rawValue:))
        profileAdEligible = chosen == .profile && profileAd
        syncProfileAd()
        if retitled || languageChanged {
            let current = tabBar.selectedItem.flatMap { Tab.allCases.indices.contains($0.tag) ? Tab.allCases[$0.tag] : nil }
            buildItems(selected: chosen ?? current ?? .browse)
            updateShortcuts()
        } else if let tab = chosen {
            select(tab)
        }
        for (name, count) in badges {
            guard let tab = Tab(rawValue: name), let index = Tab.allCases.firstIndex(of: tab) else { continue }
            tabBar.items?.first { $0.tag == index }?.badgeValue = count > 0 ? (count > 99 ? "99+" : String(count)) : nil
        }
    }

    // MARK: - Pull to refresh

    @objc private func pulledToRefresh() {
        web.bridge?.triggerWindowJSEvent(eventName: "sxmRefresh")
        // The page answers through `finishRefresh()`; never leave the spinner
        // turning if it cannot.
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self] in self?.finishRefresh() }
    }

    func finishRefresh() {
        if refresh.isRefreshing { refresh.endRefreshing() }
    }

    // MARK: - Home screen shortcuts

    private func updateShortcuts() {
        UIApplication.shared.shortcutItems = [Tab.post, .messages].map { tab in
            return UIApplicationShortcutItem(type: tab.rawValue,
                                             localizedTitle: title(tab),
                                             localizedSubtitle: nil,
                                             icon: UIApplicationShortcutIcon(systemImageName: Self.labels[tab]?.symbol ?? "circle"),
                                             userInfo: nil)
        }
    }

    @discardableResult
    func open(shortcut: UIApplicationShortcutItem) -> Bool {
        guard let tab = Tab(rawValue: shortcut.type) else { return false }
        // `open` needs the views; at cold start they load with this call.
        loadViewIfNeeded()
        open(tab)
        return true
    }
}
