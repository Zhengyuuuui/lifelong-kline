import AuthenticationServices
import Capacitor
import CryptoKit
import Foundation
import StoreKit
import UIKit

@objc(LifeKlineNativePlugin)
public class LifeKlineNativePlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "LifeKlineNativePlugin"
    public let jsName = "LifeKlineNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signInWithApple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseAppleProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restoreApplePurchases", returnType: CAPPluginReturnPromise)
    ]

    private var activeAppleSignInCall: CAPPluginCall?
    private var activeAppleNonce: String?

    @objc public func signInWithApple(_ call: CAPPluginCall) {
        guard activeAppleSignInCall == nil else {
            call.reject("Another Apple sign-in request is already running.", "APPLE_SIGN_IN_BUSY")
            return
        }

        let nonce = randomNonceString()
        let nonceSha256 = sha256Hex(nonce)
        activeAppleSignInCall = call
        activeAppleNonce = nonce

        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = nonceSha256

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    @objc public func purchaseAppleProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("productId is required.", "PRODUCT_ID_REQUIRED")
            return
        }

        Task {
            do {
                let result = try await purchase(productId: productId)
                await MainActor.run {
                    call.resolve(result)
                }
            } catch NativeBridgeError.userCancelled {
                await MainActor.run {
                    call.reject("Purchase was cancelled by the user.", "PURCHASE_CANCELLED")
                }
            } catch NativeBridgeError.pending {
                await MainActor.run {
                    call.reject("Purchase is pending external approval.", "PURCHASE_PENDING")
                }
            } catch {
                await MainActor.run {
                    call.reject("StoreKit purchase failed.", "PURCHASE_FAILED", error)
                }
            }
        }
    }

    @objc public func restoreApplePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                let purchases = try await restorePurchases()
                await MainActor.run {
                    call.resolve(["purchases": purchases])
                }
            } catch {
                await MainActor.run {
                    call.reject("StoreKit restore failed.", "RESTORE_FAILED", error)
                }
            }
        }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = activeAppleSignInCall else {
            clearAppleSignInState()
            return
        }
        defer { clearAppleSignInState() }

        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            call.reject("Apple authorization did not return an Apple ID credential.", "APPLE_CREDENTIAL_MISSING")
            return
        }
        guard
            let tokenData = credential.identityToken,
            let identityToken = String(data: tokenData, encoding: .utf8),
            !identityToken.isEmpty
        else {
            call.reject("Apple authorization did not return an identity token.", "APPLE_TOKEN_MISSING")
            return
        }

        var payload: [String: Any] = [
            "identityToken": identityToken
        ]
        if let nonce = activeAppleNonce {
            payload["nonce"] = nonce
            payload["nonceSha256"] = sha256Hex(nonce)
        }
        if let authorizationCodeData = credential.authorizationCode,
           let authorizationCode = String(data: authorizationCodeData, encoding: .utf8),
           !authorizationCode.isEmpty {
            payload["authorizationCode"] = authorizationCode
        }
        if let email = credential.email, !email.isEmpty {
            payload["email"] = email
        }

        let givenName = credential.fullName?.givenName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let familyName = credential.fullName?.familyName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let fullName = [givenName, familyName].filter { !$0.isEmpty }.joined(separator: " ")
        if !fullName.isEmpty {
            payload["fullName"] = fullName
        }

        call.resolve(payload)
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = activeAppleSignInCall else {
            clearAppleSignInState()
            return
        }
        defer { clearAppleSignInState() }

        let nsError = error as NSError
        if nsError.domain == ASAuthorizationError.errorDomain,
           ASAuthorizationError.Code(rawValue: nsError.code) == .canceled {
            call.reject("Apple sign-in was cancelled by the user.", "APPLE_SIGN_IN_CANCELLED", error)
            return
        }
        call.reject("Apple sign-in failed.", "APPLE_SIGN_IN_FAILED", error)
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? UIWindow()
    }

    private func clearAppleSignInState() {
        activeAppleSignInCall = nil
        activeAppleNonce = nil
    }

    private func purchase(productId: String) async throws -> [String: Any] {
        let products = try await Product.products(for: [productId])
        guard let product = products.first else {
            throw NativeBridgeError.productNotFound
        }

        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await transaction.finish()
            let receipt = try await appReceiptBase64()
            return [
                "receiptData": receipt,
                "signedTransactionInfo": verification.jwsRepresentation,
                "productId": transaction.productID,
                "transactionId": String(transaction.id),
                "environment": "auto"
            ]
        case .userCancelled:
            throw NativeBridgeError.userCancelled
        case .pending:
            throw NativeBridgeError.pending
        @unknown default:
            throw NativeBridgeError.unknownPurchaseState
        }
    }

    private func restorePurchases() async throws -> [[String: Any]] {
        do {
            try await AppStore.sync()
        } catch {
            // Current entitlements can still be read if the App Store sync prompt fails.
        }

        let receipt = try await appReceiptBase64()
        var purchases: [[String: Any]] = []
        for await verification in Transaction.currentEntitlements {
            do {
                let transaction = try checkVerified(verification)
                purchases.append([
                    "receiptData": receipt,
                    "signedTransactionInfo": verification.jwsRepresentation,
                    "productId": transaction.productID,
                    "transactionId": String(transaction.id),
                    "environment": "auto"
                ])
            } catch {
                continue
            }
        }
        return purchases
    }

    private func appReceiptBase64() async throws -> String {
        guard let receiptURL = Bundle.main.appStoreReceiptURL else {
            throw NativeBridgeError.receiptMissing
        }
        if !FileManager.default.fileExists(atPath: receiptURL.path) {
            try await AppStore.sync()
        }
        let receiptData = try Data(contentsOf: receiptURL)
        guard !receiptData.isEmpty else {
            throw NativeBridgeError.receiptMissing
        }
        return receiptData.base64EncodedString()
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let safe):
            return safe
        case .unverified(_, let error):
            throw error
        }
    }

    private func randomNonceString(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var generator = SystemRandomNumberGenerator()
        return String((0..<length).compactMap { _ in charset.randomElement(using: &generator) })
    }

    private func sha256Hex(_ value: String) -> String {
        let digest = SHA256.hash(data: Data(value.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

private enum NativeBridgeError: Error {
    case productNotFound
    case userCancelled
    case pending
    case unknownPurchaseState
    case receiptMissing
}
