# Trip Kit — Complete API & Service Reference (for Cursor)

> This document catalogs every backend Express endpoint, Firestore service method, third-party API, and native Capacitor bridge in the Trip Kit codebase so Cursor can extend the Web Independent Site, `/admin` Dashboard, and iOS/Android App cleanly.

---

## 1. Backend Overview (`server.ts`)

- **Framework**: Express (port `3000` in dev via `tsx server.ts`; serves `dist/` SPA fallback in production)
- **Body Limit**: `express.json({ limit: '18mb' })` (supports Base64 images, receipts, passes, and voice audio)
- **Common Request Field**: `language?: 'zh-CN' | 'en-US' | 'en-GB' | 'es-MX' | 'fr-FR' | 'de-DE' | 'pt-BR' | 'ja-JP'`
- **Common Error Format**: `{ "error": "localized message" }`
  - `400`: Missing/invalid request parameters
  - `403`: Missing or invalid `GEMINI_API_KEY`
  - `429`: AI rate limit / quota reached
  - `502`: Malformed AI JSON output
  - `500`: Unexpected server error
- **Required Server Env Vars**:
  - `GEMINI_API_KEY` — Gemini API key (server-side only, never expose to client)
  - `APP_URL` — Public service URL
- **Optional Client Env Vars**:
  - `VITE_API_BASE_URL` — Remote backend origin used by Capacitor mobile builds
  - `VITE_GOOGLE_MAPS_API_KEY` — Optional Google Maps Platform key (auto-falls back to zero-key map links when unset)

---

## 2. Express AI Backend Endpoints (18 `POST` Routes)

### A. Trip Setup & Itinerary Planning
| # | Method & Path | Request Body Fields | Purpose |
|---|---|---|---|
| 1 | `POST /api/ai/plan-trip` | `naturalPrompt`, `setup`, `baggageLimits`, `language` | Generate full trip intelligence, weather summary, initial packing groups, budget, and starter itinerary from setup or natural language. |
| 2 | `POST /api/ai/plan-full-itinerary` | `cities`, `cityDays`, `departureDate`, `days`, `tripStyle`, `activities`, `travelers`, `intel`, `budgetTier`, `targetDailyBudgetLocal`, `includeHotelSuggestions`, `includeTransitDetails`, `wishlist`, `language` | Generate a complete multi-day schedule with transit, pacing, and optional hotel suggestions. |
| 3 | `POST /api/ai/optimize-itinerary` | `cities`, `departureDate`, `travelers`, `day`, `city`, `totalDays`, `activities`, `tripStyle`, `timeline`, `actionType`, `delayMinutes`, `wishlistItem`, `weatherSummary`, `language` | Optimize a day's itinerary (handle delays, insert wishlist stop, rebalance route). |
| 4 | `POST /api/ai/smart-reorder-itinerary` | `cities`, `departureDate`, `totalDays`, `dayContexts`, `stops`, `tripStyle`, `weatherSummary`, `language` | Geographically and chronologically reorder stops across days to reduce backtracking. |
| 5 | `POST /api/ai/parse-stop` | `inputText`, `activeDay`, `totalDays`, `cities`, `currencyCode`, `existingStops`, `language` | Parse a single natural-language stop description into a structured timeline stop. |
| 6 | `POST /api/ai/extract-stops` | `mode`, `inputText`, `imageBase64`, `mimeType`, `forYouCategory`, `activeDay`, `totalDays`, `targetCity`, `cities`, `currencyCode`, `existingStops`, `language` | Batch-extract candidate places/stops from pasted text, screenshots/images, or curated "For You" recommendations. |
| 7 | `POST /api/ai/local-card` | `city`, `scenario`, `targetName`, `targetAddress`, `language` | Generate local-language taxi / restaurant / dietary / emergency communication cards. |
| 18 | `POST /api/ai/recommend-nearby-hotels` | `city`, `day`, `budgetTier`, `currencyCode`, `currencySymbol`, `tripStyle`, `stops`, `language` | AI fallback: recommend 4 real nearby hotels for the day's stop cluster when Maps Places is unavailable or returns no lodging results. |

### B. Smart Packing & Luggage
| # | Method & Path | Request Body Fields | Purpose |
|---|---|---|---|
| 8 | `POST /api/ai/generate-packing-list` | `setup`, `intel`, `perStopForecasts`, `baggageLimits`, `blockedItems`, `language` | Generate multi-category packing list calibrated to per-stop climate, luggage mode, laundry cycle, and user memory. |
| 9 | `POST /api/ai/classify-pack-item` | `inputText`, `existingGroups`, `existingItems`, `learnedPreferences`, `activeMemberName`, `routeTitle`, `language` | Classify a newly added item into the best packing group with weight, carry-on/checked placement, and duplicate detection. |
| 10 | `POST /api/ai/smart-pack-cubes` | `routeTitle`, `weatherSummary`, `items`, `language` | Organize items into physical compression cubes / pouches with packing layout advice. |
| 11 | `POST /api/ai/audit-missing-items` | `setup`, `intel`, `timelineTitles`, `existingItems`, `baggageLimits`, `language` | Audit current checklist against itinerary and weather to spot high-risk missing essentials. |

### C. Budget, Tickets & Tasks
| # | Method & Path | Request Body Fields | Purpose |
|---|---|---|---|
| 12 | `POST /api/ai/parse-expense` | `text`, `imageBase64`, `mimeType`, `currencyCode`, `vatThresholdLocal`, `fxToUsd`, `companionName`, `travelersCount`, `language` | OCR receipt image or parse natural text into structured expense with FX conversion, split info, and VAT refund eligibility. |
| 13 | `POST /api/ai/parse-travel-pass` | `rawText`, `imageBase64`, `mimeType`, `cities`, `language` | Parse flight/train/hotel/ticket confirmations (text or screenshot/PDF image) into offline Go-Mode Wallet passes. |
| 14 | `POST /api/ai/parse-trip-tasks` | `inputText`, `routeTitle`, `departureDate`, `language` | Convert free-text or dictated notes into structured pre-departure to-do tasks with deadlines. |

### D. Voice, Concierge & Memories Photobook
| # | Method & Path | Request Body Fields | Purpose |
|---|---|---|---|
| 15 | `POST /api/ai/transcribe-audio` | `audioBase64`, `mimeType`, `contextHint`, `language` | Transcribe voice dictation audio (`{ transcript }`). |
| 16 | `POST /api/ai/assistant-dispatch` | `inputText`, `activeTab`, `tripSnapshot`, `conversationHistory`, `language` | Context-aware AI travel concierge that answers questions or dispatches structured workspace actions. |
| 17 | `POST /api/ai/generate-photobook` | `templateId`, `allowPhotoVision`, `tripsContext`, `photosContext`, `language` | Generate editorial photobook title, chapters, epigraph, and per-photo story captions & layout hints. |

### Nearby Hotels AI Fallback (`POST /api/ai/recommend-nearby-hotels`)

Used only when the client has no Google Maps API key, Places `searchNearby` / `searchByText` errors, or returns zero lodging results. Primary UX still prefers live Places data (ratings + review counts from Google).

**Response shape** (`{ hotels: [...] }`, exactly 4 items when successful):

| Field | Type | Notes |
|---|---|---|
| `name` | string | Real operating hotel name in the destination city |
| `district` | string | Neighborhood / district label |
| `address` | string | Street-level address string |
| `lat` / `lng` | number | Approximate WGS84 coords (not a precision pin) |
| `walkMinutes` | number | Approx walk time to nearest listed day stop |
| `nearestStopTitle` | string | Title of the nearest itinerary stop (when provided) |
| `estNightlyLocal` | number | Estimated nightly rate in the trip's local currency |
| `reason` | string | One short localized sentence: why it fits today's route |

**Hard rule**: this endpoint must **never invent star ratings, review scores, or review counts** — those fields are intentionally absent from the schema. Live ratings come only from Google Places on the client.

---

## 3. Firestore Data Services (`src/services/*`)

All client Firestore operations are enforced by `firestore.rules` (default-deny + strict field whitelists):

1. **Collaborative Trip Rooms** (`src/services/cloudSync.ts`)
   - Collections: `/rooms/{roomId}`, `/rooms/{roomId}/members/{memberUid}`, `/users/{userId}/joinedRooms/{roomId}`, `/rateLimits/{userId}`
   - Key functions: `createCloudTripRoom`, `fetchRoomPreview`, `fetchMyMemberSeat`, `joinRoomAndClaimSeat`, `fetchMyRecentRooms`, `pushTripRoomUpdate`, `subscribeToTripRoom`
2. **Pro Redeem Codes & Entitlements** (`src/services/proRedeemService.ts`)
   - Collections: `/redeemCodes/{codeId}`, `/users/{userId}/entitlements/pro`, `/admins/{adminUid}`
   - Key functions: `isVerifiedAdminUser`, `generateAdminRedeemCodes`, `fetchAdminRedeemCodes`, `deleteAdminRedeemCode`, `fetchMyCloudEntitlement`, `redeemProCodeWithCloud`
3. **Print-on-Demand Photobook Orders** (`src/services/photobookOrderService.ts`)
   - Collections: `/photobookOrders/{orderId}` + isolated PII `/photobookOrders/{orderId}/shipping/recipient`
   - Key functions: `computePhotobookOrderPricing`, `createPhotobookPrintOrder`, `fetchPhotobookOrdersForUser`, `fetchPhotobookOrderShipping`, `cancelPhotobookOrder`, `adminUpdatePhotobookOrderFulfillment`
4. **Native Photo Bridge** (`src/services/nativePhotoBridge.ts`)
   - Capacitor plugin name: `TripPhotoScanner` (`requestPermissions`, `scanPhotosByDateRanges`, `getHighResPhotoBase64`)
   - Helper: `resolveApiUrl(apiPath)` — prepends `VITE_API_BASE_URL` on native builds.

---

## 4. External / Third-Party APIs

- **Live FX Exchange Rates** (`src/utils/currencyHelpers.ts`): `GET https://open.er-api.com/v6/latest/USD` (cached with safe static fallbacks).
- **Google Maps Platform** (`src/services/googlePlaceLiveStore.ts` + `@vis.gl/react-google-maps`): Optional Places/Routes enrichment when `VITE_GOOGLE_MAPS_API_KEY` is provided.
- **Firebase Auth & Firestore**: Configured via `firebase-applet-config.json`.

---

## 5. Production & Capacitor Handoff Checklist for Cursor

1. **Wrap Remaining `fetch('/api/ai/...')` Calls for Capacitor**:
   - Currently `PhotobookStudioModal.tsx` uses `resolveApiUrl('/api/ai/generate-photobook')`.
   - Before compiling iOS/Android via Capacitor, update the other 17 `fetch('/api/ai/...')` calls in `src/App.tsx`, `AddStopModal.tsx`, `AiVoiceInputButton.tsx`, `GoModeWalletModal.tsx`, `PlaceDetailSheet.tsx`, and `SmartPackingInlinePanel.tsx` to use `resolveApiUrl(...)`.
2. **Add CORS & Dynamic Port/Model in `server.ts`**:
   - Allow origins for your production domain + `capacitor://localhost` + `http://localhost` (Android WebView).
   - Change `const PORT = Number(process.env.PORT) || 3000;` and `const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';` for standalone cloud deployment.
3. **Recommended New Server Endpoints to Add**:
   - `POST /api/payments/create-checkout` & `POST /api/payments/webhook` (Stripe / LemonSqueezy / Creem → Firebase Admin SDK to grant `/users/{uid}/entitlements/pro` or mark `/photobookOrders/{orderId}` as `paid_queued`).
   - `GET/POST/PATCH /api/admin/*` (Express middleware verifying Firebase ID Token + `admin` status before mutating codes, orders, users, or remote config).
