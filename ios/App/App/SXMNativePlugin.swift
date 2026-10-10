import AuthenticationServices
import Capacitor
import CryptoKit
import StoreKit
import UserNotifications
import WebKit

final class SXMBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SXMNativePlugin())
        // The site is shared with older builds and with browsers: tell it,
        // before its scripts run, what this build can do natively.
        let info = "window.SXMNativeInfo={shell:3,tabs:true,appleSignIn:true,refresh:true,push:true};" +
            "document.documentElement&&document.documentElement.classList.add('sxm-native-tabs');"
        webView?.configuration.userContentController.addUserScript(
            WKUserScript(source: info, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }
}

@objc(SXMNativePlugin)
public class SXMNativePlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding,
                              ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding,
                              NotificationHandlerProtocol {
    public let identifier = "SXMNativePlugin"
    public let jsName = "SXMNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "appleSignIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ready", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTabs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshDone", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pushStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pushEnable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pushDisable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pending", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise)
    ]
    private var authSession: ASWebAuthenticationSession?
    private var appleCall: CAPPluginCall?
    private var appleNonce: String?
    private var pushCall: CAPPluginCall?
    private static let pushTokenKey = "sxm.push.token"
    private static let pushOnKey = "sxm.push.on"
    private var updates: Task<Void, Never>?
    private let productIDs: Set<String> = Set([
        "pro_starter_monthly", "pro_business_monthly", "pro_premium_monthly",
        "pro_elite_monthly", "pro_unlimited_monthly", "boost_3_days", "boost_7_days", "boost_14_days"
    ].map { "com.korekdigitalmarketing.buyselltradesxm." + $0 })

    public override func load() {
        // Taps on a notification and the device token both arrive through Capacitor.
        bridge?.notificationRouter.pushNotificationHandler = self
        NotificationCenter.default.addObserver(self, selector: #selector(didRegisterForPush(_:)),
                                               name: .capacitorDidRegisterForRemoteNotifications, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(didFailToRegisterForPush(_:)),
                                               name: .capacitorDidFailToRegisterForRemoteNotifications, object: nil)
        updates = Task { [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard case .verified = result else { continue }
                self?.notifyListeners("transaction", data: ["signedTransaction": result.jwsRepresentation])
            }
        }
    }

    deinit { updates?.cancel() }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        guard let value = call.getString("url"), let url = URL(string: value),
              url.scheme == "https", url.host == "szhaxlmronirhnntlwyb.supabase.co",
              url.path == "/auth/v1/authorize" else {
            call.reject("Invalid authentication URL", "INVALID_URL"); return
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard self.authSession == nil else { call.reject("Sign-in is already open", "BUSY"); return }
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "buyselltradesxm") { [weak self] callback, error in
                self?.authSession = nil
                if let callback = callback, callback.host == "auth", callback.path == "/callback" {
                    call.resolve(["url": callback.absoluteString])
                } else if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    call.reject("Sign-in cancelled", "CANCELLED")
                } else { call.reject("Unable to complete sign-in", "AUTH_FAILED") }
            }
            session.presentationContextProvider = self
            self.authSession = session
            if !session.start() {
                self.authSession = nil
                call.reject("Unable to open sign-in", "AUTH_FAILED")
            }
        }
    }

    // MARK: - Sign in with Apple (system sheet)

    private var root: SXMRootViewController? { bridge?.viewController?.parent as? SXMRootViewController }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    /// Resolves with Apple's identity token and the nonce it was issued for;
    /// the page exchanges them for a session (signInWithIdToken).
    @objc func appleSignIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard self.appleCall == nil else { call.reject("Sign-in is already open", "BUSY"); return }
            var bytes = [UInt8](repeating: 0, count: 32)
            guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
                call.reject("Unable to open sign-in", "AUTH_FAILED"); return
            }
            let nonce = bytes.map { String(format: "%02x", $0) }.joined()
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            // Apple signs the hash; the backend checks it against the plain nonce.
            request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            call.keepAlive = true
            self.appleCall = call
            self.appleNonce = nonce
            controller.performRequests()
        }
    }

    private func finishApple(_ body: (CAPPluginCall) -> Void) {
        guard let call = appleCall else { return }
        appleCall = nil
        appleNonce = nil
        body(call)
        bridge?.releaseCall(call)
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        let nonce = appleNonce
        finishApple { call in
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let data = credential.identityToken, let token = String(data: data, encoding: .utf8),
                  let nonce = nonce else {
                call.reject("Unable to complete sign-in", "AUTH_FAILED"); return
            }
            // Apple shares the name only the first time; the token never carries it.
            let name = [credential.fullName?.givenName, credential.fullName?.familyName]
                .compactMap { $0 }.joined(separator: " ")
            call.resolve(["identityToken": token, "nonce": nonce, "name": name])
        }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        finishApple { call in
            if let error = error as? ASAuthorizationError, error.code == .canceled {
                call.reject("Sign-in cancelled", "CANCELLED")
            } else { call.reject("Unable to complete sign-in", "AUTH_FAILED") }
        }
    }

    // MARK: - Push notifications (APNs)
    // The page keeps the opt-in switch and stores the device token with the
    // account (native-ios.js); the server sends through APNs (send-push).

    @objc func pushStatus(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let status: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: status = "granted"
            case .denied: status = "denied"
            default: status = "prompt"
            }
            DispatchQueue.main.async {
                call.resolve(["status": status,
                              "on": status == "granted" && UserDefaults.standard.bool(forKey: Self.pushOnKey)])
            }
        }
    }

    /// Asks for permission if needed, registers with Apple and resolves with the device token.
    @objc func pushEnable(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { [weak self] granted, _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                guard granted else { call.resolve(["status": "denied"]); return }
                guard self.pushCall == nil else { call.resolve(["status": "busy"]); return }
                call.keepAlive = true
                self.pushCall = call
                UIApplication.shared.registerForRemoteNotifications()
                // Apple may never answer (no network): do not leave the page waiting.
                let id = call.callbackId
                DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
                    guard self?.pushCall?.callbackId == id else { return }
                    self?.finishPush(["status": "error"])
                }
            }
        }
    }

    @objc func pushDisable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var result: [String: Any] = [:]
            if let token = UserDefaults.standard.string(forKey: Self.pushTokenKey) { result["token"] = token }
            UserDefaults.standard.set(false, forKey: Self.pushOnKey)
            UIApplication.shared.unregisterForRemoteNotifications()
            call.resolve(result)
        }
    }

    private func finishPush(_ result: [String: Any]) {
        guard let call = pushCall else { return }
        pushCall = nil
        call.resolve(result)
        bridge?.releaseCall(call)
    }

    @objc private func didRegisterForPush(_ notification: Notification) {
        guard let data = notification.object as? Data else { return }
        let token = data.map { String(format: "%02x", $0) }.joined()
        UserDefaults.standard.set(token, forKey: Self.pushTokenKey)
        UserDefaults.standard.set(true, forKey: Self.pushOnKey)
        DispatchQueue.main.async { [weak self] in self?.finishPush(["status": "granted", "token": token]) }
    }

    @objc private func didFailToRegisterForPush(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in self?.finishPush(["status": "error"]) }
    }

    /// While the app is open the page already announces new messages.
    public func willPresent(notification: UNNotification) -> UNNotificationPresentationOptions { [] }

    /// A tapped notification is a new message: open the inbox.
    public func didReceive(response: UNNotificationResponse) {
        DispatchQueue.main.async { [weak self] in self?.root?.open(.messages) }
    }

    // MARK: - Tab bar and pull to refresh

    /// Called once by the page when it can react to tabs.
    @objc func ready(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            var result: [String: Any] = [:]
            if let tab = self?.root?.takePendingTab() { result["tab"] = tab }
            call.resolve(result)
        }
    }

    @objc func setTabs(_ call: CAPPluginCall) {
        let selected = call.getString("selected")
        let french = call.getString("lang").map { $0.hasPrefix("fr") }
        var badges: [String: Int] = [:]
        for (name, value) in call.getObject("badges") ?? [:] {
            if let count = value as? Int { badges[name] = count } else if let count = value as? Double { badges[name] = Int(count) }
        }
        var titles: [String: String] = [:]
        for (name, value) in call.getObject("titles") ?? [:] {
            if let text = value as? String { titles[name] = text }
        }
        DispatchQueue.main.async { [weak self] in
            self?.root?.update(selected: selected, french: french, badges: badges, titles: titles)
            call.resolve()
        }
    }

    @objc func refreshDone(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.root?.finishRefresh()
            call.resolve()
        }
    }

    @objc func products(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                let products = try await Product.products(for: productIDs)
                call.resolve(["products": products.map { product in
                    ["id": product.id, "name": product.displayName, "price": product.displayPrice]
                }])
            } catch { call.reject("The App Store is unavailable. Please try again.", "STORE_UNAVAILABLE") }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("productId"), productIDs.contains(id),
              let token = call.getString("appAccountToken"), let uuid = UUID(uuidString: token) else {
            call.reject("Invalid purchase", "INVALID_PURCHASE"); return
        }
        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    call.reject("This product is currently unavailable in the App Store.", "PRODUCT_UNAVAILABLE"); return
                }
                switch try await product.purchase(options: [.appAccountToken(uuid)]) {
                case .success(let result):
                    guard case .verified = result else { call.reject("Purchase could not be verified", "UNVERIFIED"); return }
                    // Finish only after the backend has durably delivered the entitlement.
                    call.resolve(["signedTransaction": result.jwsRepresentation])
                case .pending: call.resolve(["pending": true])
                case .userCancelled: call.resolve(["cancelled": true])
                @unknown default: call.reject("Unknown purchase result", "PURCHASE_FAILED")
                }
            } catch { call.reject("Purchase failed. Please try again.", "PURCHASE_FAILED") }
        }
    }

    private func transactions(_ call: CAPPluginCall, restore: Bool) {
        Task { @MainActor in
            do {
                if restore { try await AppStore.sync() }
                var signed: [String] = []
                var seen = Set<UInt64>()
                for await result in StoreKit.Transaction.unfinished {
                    if case .verified(let transaction) = result, seen.insert(transaction.id).inserted {
                        signed.append(result.jwsRepresentation)
                    }
                }
                for await result in StoreKit.Transaction.currentEntitlements {
                    if case .verified(let transaction) = result, seen.insert(transaction.id).inserted {
                        signed.append(result.jwsRepresentation)
                    }
                }
                call.resolve(["transactions": signed])
            } catch { call.reject("Unable to restore purchases", "RESTORE_FAILED") }
        }
    }

    @objc func pending(_ call: CAPPluginCall) { transactions(call, restore: false) }
    @objc func restore(_ call: CAPPluginCall) { transactions(call, restore: true) }

    @objc func finish(_ call: CAPPluginCall) {
        guard let value = call.getString("transactionId"), let id = UInt64(value) else {
            call.reject("Invalid transaction", "INVALID_TRANSACTION"); return
        }
        Task {
            for await result in StoreKit.Transaction.unfinished {
                if case .verified(let transaction) = result, transaction.id == id {
                    await transaction.finish()
                    break
                }
            }
            call.resolve()
        }
    }

    @objc func manageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = bridge?.viewController?.view.window?.windowScene else {
                call.reject("Unable to open subscriptions", "NO_SCENE"); return
            }
            do { try await AppStore.showManageSubscriptions(in: scene); call.resolve() }
            catch { call.reject("Unable to open subscriptions", "STORE_UNAVAILABLE") }
        }
    }
}
