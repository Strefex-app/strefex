/**
 * Wallet Store — Secure account balance, payment methods, and transfer management
 *
 * Every registered account (buyer, seller, service_provider) has its own wallet:
 *   - Balance management (top-up, withdraw)
 *   - Multiple payment methods (cards, bank, PayPal, crypto, etc.)
 *   - Buyer-to-seller direct payments with escrow protection
 *   - Full transaction history with audit trail
 *   - Security verification (email + phone OTP) for sensitive operations
 *
 * Data is tenant-scoped — each account sees only their own wallet.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserRole } from '../utils/tenantStorage'
import { canEdit as guardCanEdit, isAuditor } from '../utils/companyGuard'

let _txId = Date.now()

const useWalletStore = create(
  persist(
    (set, get) => ({
      /* ═══════════════════════════════════════════════════════════
       *  WALLET BALANCE
       * ═══════════════════════════════════════════════════════════ */
      balance: 0,
      currency: 'USD',
      escrowHeld: 0,          // funds locked in active escrow
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalSent: 0,
      totalReceived: 0,

      /* ═══════════════════════════════════════════════════════════
       *  SECURITY SETTINGS
       * ═══════════════════════════════════════════════════════════ */
      security: {
        emailVerified: true,
        phoneVerified: false,
        phoneNumber: '',
        twoFactorEnabled: false,
        transactionPin: null,          // hashed 6-digit PIN
        dailyLimit: 50000,
        singleTransactionLimit: 25000,
        withdrawalRequires2FA: true,
        paymentRequires2FA: true,
        lastVerifiedAt: null,
        trustedDevices: [],
        loginAlerts: true,
        transactionAlerts: true,
      },

      /* ═══════════════════════════════════════════════════════════
       *  PAYMENT METHODS
       * ═══════════════════════════════════════════════════════════ */
      paymentMethods: [],
      // Each method: { id, type, label, details, isDefault, addedAt, verified }
      // Types: 'card', 'bank_account', 'paypal', 'stripe', 'google_pay', 'apple_pay',
      //        'crypto_btc', 'crypto_eth', 'crypto_usdt', 'wire_transfer', 'sepa'

      addPaymentMethod: (method) => {
        const id = `pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const newMethod = {
          id,
          ...method,
          addedAt: new Date().toISOString(),
          verified: method.type === 'paypal' || method.type === 'google_pay' || method.type === 'apple_pay',
        }
        set((s) => ({
          paymentMethods: [
            ...s.paymentMethods.map((m) => method.isDefault ? { ...m, isDefault: false } : m),
            newMethod,
          ],
        }))
        return newMethod
      },

      removePaymentMethod: (id) =>
        set((s) => ({ paymentMethods: s.paymentMethods.filter((m) => m.id !== id) })),

      setDefaultPaymentMethod: (id) =>
        set((s) => ({
          paymentMethods: s.paymentMethods.map((m) => ({ ...m, isDefault: m.id === id })),
        })),

      verifyPaymentMethod: (id) =>
        set((s) => ({
          paymentMethods: s.paymentMethods.map((m) =>
            m.id === id ? { ...m, verified: true } : m
          ),
        })),

      /* ═══════════════════════════════════════════════════════════
       *  TRANSACTIONS
       * ═══════════════════════════════════════════════════════════ */
      transactions: [],
      // Each tx: { id, type, amount, currency, status, description, counterparty,
      //            paymentMethodId, reference, createdAt, completedAt, securityVerified }
      // Types: 'top_up', 'withdrawal', 'payment_sent', 'payment_received',
      //        'escrow_lock', 'escrow_release', 'escrow_refund', 'fee'

      /* ═══════════════════════════════════════════════════════════
       *  ESCROW TRANSACTIONS (buyer → platform → seller)
       * ═══════════════════════════════════════════════════════════ */
      escrowTransactions: [],
      // { id, buyerEmail, sellerEmail, amount, currency, rfqId, description,
      //   status: 'pending'|'funded'|'released'|'disputed'|'refunded',
      //   createdAt, fundedAt, releasedAt, disputeReason }

      /* ═══════════════════════════════════════════════════════════
       *  TOP UP BALANCE
       * ═══════════════════════════════════════════════════════════ */
      topUp: (amount, paymentMethodId, description) => {
        const tx = {
          id: `wtx-${++_txId}`,
          type: 'top_up',
          amount,
          currency: get().currency,
          status: 'completed',
          description: description || 'Balance top-up',
          paymentMethodId,
          reference: `TU-${Date.now().toString(36).toUpperCase()}`,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          securityVerified: true,
        }
        set((s) => ({
          balance: s.balance + amount,
          totalDeposited: s.totalDeposited + amount,
          transactions: [tx, ...s.transactions],
        }))
        return tx
      },

      /* ═══════════════════════════════════════════════════════════
       *  WITHDRAW
       * ═══════════════════════════════════════════════════════════ */
      withdraw: (amount, paymentMethodId, description) => {
        const s = get()
        if (amount > s.balance - s.escrowHeld) return { error: 'Insufficient available balance' }
        if (amount > s.security.singleTransactionLimit) return { error: 'Exceeds single transaction limit' }

        const tx = {
          id: `wtx-${++_txId}`,
          type: 'withdrawal',
          amount,
          currency: s.currency,
          status: 'processing',
          description: description || 'Balance withdrawal',
          paymentMethodId,
          reference: `WD-${Date.now().toString(36).toUpperCase()}`,
          createdAt: new Date().toISOString(),
          completedAt: null,
          securityVerified: true,
        }
        set((st) => ({
          balance: st.balance - amount,
          totalWithdrawn: st.totalWithdrawn + amount,
          transactions: [tx, ...st.transactions],
        }))
        // Simulate processing → completed after 2s
        setTimeout(() => {
          set((st) => ({
            transactions: st.transactions.map((t) =>
              t.id === tx.id ? { ...t, status: 'completed', completedAt: new Date().toISOString() } : t
            ),
          }))
        }, 2000)
        return tx
      },

      /* ═══════════════════════════════════════════════════════════
       *  SEND PAYMENT (buyer → seller, direct or escrow)
       * ═══════════════════════════════════════════════════════════ */
      sendPayment: (amount, recipientEmail, recipientName, description, useEscrow = true) => {
        const s = get()
        if (amount > s.balance - s.escrowHeld) return { error: 'Insufficient available balance' }
        if (amount > s.security.singleTransactionLimit) return { error: 'Exceeds single transaction limit' }

        if (useEscrow) {
          // Lock in escrow
          const escrowTx = {
            id: `esc-${++_txId}`,
            buyerEmail: null, // will be set by the caller
            sellerEmail: recipientEmail,
            sellerName: recipientName,
            amount,
            currency: s.currency,
            description,
            status: 'funded',
            createdAt: new Date().toISOString(),
            fundedAt: new Date().toISOString(),
            releasedAt: null,
          }
          const walletTx = {
            id: `wtx-${++_txId}`,
            type: 'escrow_lock',
            amount,
            currency: s.currency,
            status: 'completed',
            description: `Escrow: ${description}`,
            counterparty: { email: recipientEmail, name: recipientName },
            reference: escrowTx.id,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            securityVerified: true,
          }
          set((st) => ({
            escrowHeld: st.escrowHeld + amount,
            transactions: [walletTx, ...st.transactions],
            escrowTransactions: [escrowTx, ...st.escrowTransactions],
          }))
          return { escrowTx, walletTx }
        } else {
          // Direct transfer
          const tx = {
            id: `wtx-${++_txId}`,
            type: 'payment_sent',
            amount,
            currency: s.currency,
            status: 'completed',
            description,
            counterparty: { email: recipientEmail, name: recipientName },
            reference: `PAY-${Date.now().toString(36).toUpperCase()}`,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            securityVerified: true,
          }
          set((st) => ({
            balance: st.balance - amount,
            totalSent: st.totalSent + amount,
            transactions: [tx, ...st.transactions],
          }))
          return { walletTx: tx }
        }
      },

      /* ═══════════════════════════════════════════════════════════
       *  RELEASE ESCROW (confirm delivery → pay seller)
       * ═══════════════════════════════════════════════════════════ */
      releaseEscrow: (escrowId) => {
        const esc = get().escrowTransactions.find((e) => e.id === escrowId)
        if (!esc || esc.status !== 'funded') return { error: 'Escrow not found or not funded' }

        const releaseTx = {
          id: `wtx-${++_txId}`,
          type: 'escrow_release',
          amount: esc.amount,
          currency: esc.currency,
          status: 'completed',
          description: `Released: ${esc.description}`,
          counterparty: { email: esc.sellerEmail, name: esc.sellerName },
          reference: escrowId,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          securityVerified: true,
        }
        set((s) => ({
          balance: s.balance - esc.amount,
          escrowHeld: s.escrowHeld - esc.amount,
          totalSent: s.totalSent + esc.amount,
          transactions: [releaseTx, ...s.transactions],
          escrowTransactions: s.escrowTransactions.map((e) =>
            e.id === escrowId ? { ...e, status: 'released', releasedAt: new Date().toISOString() } : e
          ),
        }))
        return releaseTx
      },

      /* ═══════════════════════════════════════════════════════════
       *  REFUND ESCROW (dispute → return to buyer)
       * ═══════════════════════════════════════════════════════════ */
      refundEscrow: (escrowId, reason) => {
        const esc = get().escrowTransactions.find((e) => e.id === escrowId)
        if (!esc || esc.status !== 'funded') return { error: 'Escrow not found or not funded' }

        const refundTx = {
          id: `wtx-${++_txId}`,
          type: 'escrow_refund',
          amount: esc.amount,
          currency: esc.currency,
          status: 'completed',
          description: `Refund: ${esc.description}`,
          counterparty: { email: esc.sellerEmail, name: esc.sellerName },
          reference: escrowId,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          securityVerified: true,
        }
        set((s) => ({
          escrowHeld: s.escrowHeld - esc.amount,
          transactions: [refundTx, ...s.transactions],
          escrowTransactions: s.escrowTransactions.map((e) =>
            e.id === escrowId ? { ...e, status: 'refunded', disputeReason: reason, releasedAt: new Date().toISOString() } : e
          ),
        }))
        return refundTx
      },

      /* ═══════════════════════════════════════════════════════════
       *  RECEIVE PAYMENT (seller side)
       * ═══════════════════════════════════════════════════════════ */
      receivePayment: (amount, senderEmail, senderName, description, reference) => {
        const tx = {
          id: `wtx-${++_txId}`,
          type: 'payment_received',
          amount,
          currency: get().currency,
          status: 'completed',
          description,
          counterparty: { email: senderEmail, name: senderName },
          reference: reference || `RCV-${Date.now().toString(36).toUpperCase()}`,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          securityVerified: true,
        }
        set((s) => ({
          balance: s.balance + amount,
          totalReceived: s.totalReceived + amount,
          transactions: [tx, ...s.transactions],
        }))
        return tx
      },

      /* ═══════════════════════════════════════════════════════════
       *  SECURITY
       * ═══════════════════════════════════════════════════════════ */
      updateSecurity: (updates) =>
        set((s) => ({ security: { ...s.security, ...updates } })),

      setTransactionPin: (pin) =>
        set((s) => ({ security: { ...s.security, transactionPin: pin } })),

      verifyPhone: (phone) =>
        set((s) => ({ security: { ...s.security, phoneVerified: true, phoneNumber: phone } })),

      enable2FA: () =>
        set((s) => ({ security: { ...s.security, twoFactorEnabled: true } })),

      disable2FA: () =>
        set((s) => ({ security: { ...s.security, twoFactorEnabled: false } })),

      markVerified: () =>
        set((s) => ({ security: { ...s.security, lastVerifiedAt: new Date().toISOString() } })),

      /* ═══════════════════════════════════════════════════════════
       *  ROLE-BASED ACCESS
       * ═══════════════════════════════════════════════════════════ */
      canEditWallet: () => guardCanEdit(),
      isReadOnly: () => isAuditor(),
      getAccessLevel: () => getUserRole(),

      /* ═══════════════════════════════════════════════════════════
       *  GETTERS
       * ═══════════════════════════════════════════════════════════ */
      getAvailableBalance: () => get().balance - get().escrowHeld,
      getDefaultPaymentMethod: () => get().paymentMethods.find((m) => m.isDefault) || get().paymentMethods[0],
      getTransactionsByType: (type) => get().transactions.filter((t) => t.type === type),
      getActiveEscrows: () => get().escrowTransactions.filter((e) => e.status === 'funded'),
      getRecentTransactions: (count = 10) => get().transactions.slice(0, count),
    }),
    {
      name: 'strefex-wallet',
      storage: createTenantStorage(),
    }
  )
)

export default useWalletStore
