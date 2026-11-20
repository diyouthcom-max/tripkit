# Trip Kit Collaborative Cloud Sync & Pro Redeem Codes — Security Specification (`security_spec.md`)

## 1. Data Invariants & Cost/Abuse Controls
1. **Verified Identity Gate**: Every read and write operation requires a signed-in Google account with `request.auth.token.email_verified == true`. Unauthenticated or unverified bot accounts are denied at the edge.
2. **Exact Single-Document Room & Code Lookup (Zero Collection Scraping)**:
   - `/rooms/{roomId}` sets `allow list: if false;`. Enumerating or scraping rooms is mathematically impossible.
   - `/redeemCodes/{codeId}` forbids `list` for all regular users; only the bootstrapped verified admin (`diyouth.com@gmail.com`) can query their own issued codes (`resource.data.createdBy == request.auth.uid` with `request.query.limit <= 50` and zero `get()`/`exists()` inside `allow list`).
3. **Master Gate Relational Authorization**:
   - Modifying `/rooms/{roomId}` requires `existing().status == 'active'` AND (`existing().ownerId == request.auth.uid` OR `exists(/databases/$(database)/documents/rooms/$(roomId)/members/$(request.auth.uid))`).
4. **Single-Use Atomic Redeem Code & Entitlement Invariant**:
   - Only `isAdmin()` (`diyouth.com@gmail.com` with `email_verified == true` or `/admins/{uid}`) can `create` or `delete` documents in `/redeemCodes/{codeId}`.
   - A verified traveler can transition `/redeemCodes/{codeId}` ONLY from `existing().status == 'unused'` to `incoming().status == 'redeemed'` with `incoming().redeemedBy == request.auth.uid`, AND `getAfter(...)` enforces that `/users/$(request.auth.uid)/entitlements/pro` is written in the exact same atomic batch. Once `status == 'redeemed'`, terminal state locking blocks all further non-admin updates.
   - Conversely, writing `/users/{userId}/entitlements/pro` requires `getAfter(/databases/$(database)/documents/redeemCodes/$(incoming().redeemedCode))` to match `status == 'redeemed'`, `redeemedBy == request.auth.uid`, `updatedAt == request.time`, `planType`, and `durationDays` — making self-minted Pro entitlements impossible.
5. **Anti-Brushing Rate Limits (`request.time` Server Cooldowns)**:
   - Room creation enforces `>= 10s` server interval and `<= 20` rooms per user via `/rateLimits/{uid}`.
   - Room updates enforce `>= 1s` server cooldown.
6. **PII Isolation (Split-Collection Architecture)**:
   - No user email, phone number, or home address is stored in `/rooms`, `/redeemCodes`, `/users/{userId}/entitlements`, or `/photobookOrders/{orderId}`.
   - Recipient shipping PII (`recipientName`, `phone`, `shippingAddress`) is strictly isolated in `/photobookOrders/{orderId}/shipping/recipient` (`allow list: if false;`, single-doc `get` restricted exclusively to parent order `uid` or verified `isAdmin()`, and atomically co-created via `existsAfter`).
7. **Photobook Order Integrity & Terminal State Locking**:
   - Creating `/photobookOrders/{orderId}` requires `incoming().uid == request.auth.uid`, `status == 'pending_payment'`, `trackingNumber == ''`, and `existsAfter(/databases/$(database)/documents/photobookOrders/$(orderId)/shipping/recipient)`.
   - Regular owners can ONLY transition an active `'pending_payment'` order to `'cancelled'` (Terminal State Lock); only `isAdmin()` can advance fulfillment statuses (`paid_queued`, `printing`, `shipped`) or set `trackingNumber`.

---

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return `PERMISSION_DENIED`)

1. **Payload 1 — Unverified Email Spoof (Including Admin Email Spoof)**: Authenticated user with `email: 'diyouth.com@gmail.com'` but `email_verified: false` attempts to mint `/redeemCodes/TK1Y-ABCD-2345` or read `/rooms/PK8294`.
2. **Payload 2 — Collection Scraping (`list` on `/rooms`, `/redeemCodes`, or `/photobookOrders/{id}/shipping`)**: Verified non-admin user attempts `getDocs` on `/rooms`, `/redeemCodes`, or `/photobookOrders/PB-261118-AB23/shipping`.
3. **Payload 3 — Self-Admin Privilege Escalation**: Verified user attempts `setDoc(doc(db, 'admins', 'attacker_uid'), ...)` to gain admin status.
4. **Payload 4 — Unauthorized Redeem Code Minting**: Non-admin verified user attempts `setDoc(doc(db, 'redeemCodes', 'TK1Y-8K4M-9X2P'), ...)`.
5. **Payload 5 — Double Redemption / Replay Attack (Terminal State Bypass)**: User B attempts to redeem `/redeemCodes/TK1Y-8K4M-9X2P` when `status` is already `'redeemed'`.
6. **Payload 6 — Self-Minted Pro Entitlement Without Burning Unused Code**: Attacker writes `/users/attacker_uid/entitlements/pro` without atomically transitioning an unused `/redeemCodes/{codeId}` at `request.time`.
7. **Payload 7 — Orphan Room / Order Creation Bypassing Atomic Companion Doc**: User creates `/rooms/AB2345` without `/rateLimits/uid_attacker`, or creates `/photobookOrders/PB-261118-AB23` without `/shipping/recipient` in the same batch.
8. **Payload 8 — Unauthorized Non-Member Room Mutation / Self-Paid Order Spoof**: Verified user `uid_outsider` attempts `updateDoc` on `/rooms/PK8294` or customer attempts to self-mark `/photobookOrders/PB-261118-AB23` as `status: 'paid_queued'`.
9. **Payload 9 — High-Frequency Write Brushing (< 1s Cooldown)**: Authorized member sends back-to-back `updateDoc` on `/rooms/PK8294` within 200ms.
10. **Payload 10 — Shadow Field Injection**: User updates `/redeemCodes/{codeId}` or `/photobookOrders/{orderId}` with an undeclared field `isLifetime: true`.
11. **Payload 11 — Immutable Field Tampering / Plan Upgrade Tampering**: Redeemer attempts to mutate `durationDays: 36500` or `planType: 'lifetime'` while redeeming an `'annual'` code.
12. **Payload 12 — Cross-User Entitlement, Bookmark, or Shipping PII Leak**: User `uid_attacker` attempts `getDoc` on `/users/uid_victim/entitlements/pro` or `/photobookOrders/PB-261118-AB23/shipping/recipient`.

