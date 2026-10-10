import Capacitor
import UIKit

/// The app's root screen: the marketplace web view above a native tab bar.
/// The page still owns every screen; the tab bar tells it which one to show
/// and mirrors the unread counts it reports back (see native-ios.js).
final class SXMRootViewController: UIViewController, UITabBarDelegate {
    enum Tab: String, CaseIterable {
        case browse, post, messages, alerts, profile
    }

    // TODO(human): the tabs, their order, labels and icons are a product
    // choice. Icons are SF Symbol names; ".fill" is used for the selected one.
    private static let labels: [Tab: (fr: String, en: String, symbol: String)] = [
        .browse: ("Parcourir", "Browse", "house"),
        .post: ("Déposer", "Post", "plus.circle"),
        .messages: ("Messages", "Messages", "envelope"),
        .alerts: ("Alertes", "Alerts", "bell"),
        .profile: ("Profil", "Profile", "person.crop.circle")
    ]
    private static let appPaths: Set<String> = ["", "/", "/index.html", "/marketplace.html"]
    private static let sea = UIColor(red: 11 / 255, green: 110 / 255, blue: 127 / 255, alpha: 1)
    private static let paper = UIColor(red: 251 / 255, green: 247 / 255, blue: 239 / 255, alpha: 1)
    private static let ink = UIColor(red: 19 / 255, green: 42 / 255, blue: 46 / 255, alpha: 1)

    let web = SXMBridgeViewController()
    private let tabBar = UITabBar()
    private let refresh = UIRefreshControl()
    private let feedback = UISelectionFeedbackGenerator()
    private var french = Locale.preferredLanguages.first?.hasPrefix("fr") ?? false
    /// A tab chosen before the page could act on it (cold start from a home
    /// screen shortcut, or while a legal page was showing).
    private var pendingTab: Tab?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Self.paper

        addChild(web)
        web.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web.view)
        tabBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tabBar)
        NSLayoutConstraint.activate([
            web.view.topAnchor.constraint(equalTo: view.topAnchor),
            web.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            web.view.bottomAnchor.constraint(equalTo: tabBar.topAnchor),
            tabBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tabBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tabBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            // 49pt of buttons above the home indicator area.
            tabBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -49)
        ])
        web.didMove(toParent: self)

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

    override var childForStatusBarStyle: UIViewController? { web }
    override var childForStatusBarHidden: UIViewController? { web }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { web.supportedInterfaceOrientations }

    // MARK: - Tabs

    private func buildItems(selected: Tab) {
        let items = Tab.allCases.enumerated().map { index, tab -> UITabBarItem in
            let label = Self.labels[tab]
            let symbol = label?.symbol ?? "circle"
            let item = UITabBarItem(title: french ? label?.fr : label?.en,
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
        tabBar.selectedItem = tabBar.items?.first { $0.tag == Tab.allCases.firstIndex(of: tab) }
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
        select(tab)
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

    func takePendingTab() -> String? {
        defer { pendingTab = nil }
        return pendingTab?.rawValue
    }

    /// The page reports what it is showing, in which language, and its unread counts.
    func update(selected: String?, french: Bool?, badges: [String: Int]) {
        if let french = french, french != self.french {
            self.french = french
            buildItems(selected: selected.flatMap(Tab.init(rawValue:)) ?? .browse)
            updateShortcuts()
        } else if let tab = selected.flatMap(Tab.init(rawValue:)) {
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
            let label = Self.labels[tab]
            return UIApplicationShortcutItem(type: tab.rawValue,
                                             localizedTitle: (french ? label?.fr : label?.en) ?? tab.rawValue,
                                             localizedSubtitle: nil,
                                             icon: UIApplicationShortcutIcon(systemImageName: label?.symbol ?? "circle"),
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
