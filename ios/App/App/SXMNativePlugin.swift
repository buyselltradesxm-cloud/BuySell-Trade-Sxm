import AuthenticationServices
import Capacitor
import StoreKit

final class SXMBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SXMNativePlugin())
    }
}

@objc(SXMNativePlugin)
public class SXMNativePlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "SXMNativePlugin"
    public let jsName = "SXMNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pending", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manageSubscriptions", returnType: CAPPluginReturnPromise)
    ]
    private var authSession: ASWebAuthenticationSession?
    private var updates: Task<Void, Never>?
    private let productIDs: Set<String> = Set([
        "pro_starter_monthly", "pro_business_monthly", "pro_premium_monthly",
        "pro_elite_monthly", "pro_unlimited_monthly", "boost_3_days", "boost_7_days", "boost_14_days"
    ].map { "com.korekdigitalmarketing.buyselltradesxm." + $0 })

    public override func load() {
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
