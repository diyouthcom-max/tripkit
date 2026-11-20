import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Minus,
  Package,
  Plus,
  Printer,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { formatCloudSyncError } from '../firebase';
import { isVerifiedAdminUser } from '../services/proRedeemService';
import {
  adminUpdatePhotobookOrderFulfillment,
  cancelPhotobookOrder,
  computePhotobookOrderPricing,
  createPhotobookPrintOrder,
  fetchPhotobookOrdersForUser,
  fetchPhotobookOrderShipping,
} from '../services/photobookOrderService';
import type {
  AppLanguage,
  HomeCurrencyCode,
  MemoryPhotoMeta,
  PhotobookDraft,
  PhotobookOrderRecord,
  PhotobookOrderStatus,
  PhotobookShippingInfo,
  SavedTripEntry,
} from '../types';
import { exportPrintReadyPhotobookPdf } from '../utils/exportPhotobookPdf';
import { buildWhatsAppClaimUrl } from '../utils/preferencesHelpers';
import { getPrintOrderCheckoutCopy } from '../i18n/packs/memoriesStudioPack';

export interface PrintOrderCheckoutModalProps {
  open: boolean;
  initialTab?: 'checkout' | 'orders';
  onClose: () => void;
  draft: PhotobookDraft;
  photos: MemoryPhotoMeta[];
  trips: SavedTripEntry[];
  authUser: User | null;
  homeCurrency: HomeCurrencyCode;
  language: AppLanguage;
  onToast: (msg: string) => void;
}

export const PrintOrderCheckoutModal: React.FC<PrintOrderCheckoutModalProps> = ({
  open,
  initialTab = 'checkout',
  onClose,
  draft,
  photos,
  trips,
  authUser,
  homeCurrency,
  language,
  onToast,
}) => {
  const copy = getPrintOrderCheckoutCopy(language);
  const isAdmin = isVerifiedAdminUser(authUser);

  const [activeTab, setActiveTab] = useState<'checkout' | 'orders'>(initialTab);
  const [copies, setCopies] = useState(1);
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<PhotobookOrderRecord | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [orders, setOrders] = useState<PhotobookOrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedShippingMap, setExpandedShippingMap] = useState<
    Record<string, PhotobookShippingInfo>
  >({});
  const [trackingDraftMap, setTrackingDraftMap] = useState<Record<string, string>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setSubmitError(null);
    }
  }, [open, initialTab]);

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const list = await fetchPhotobookOrdersForUser(authUser);
      setOrders(list);
    } catch (err) {
      onToast(formatCloudSyncError(err, language));
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (open && activeTab === 'orders') {
      void loadOrders();
    }
  }, [open, activeTab, authUser]);

  const selectedTripsSummary = useMemo(() => {
    const names = trips
      .filter((t) => draft.selectedTripIds.includes(t.id))
      .map((t) => t.state.intel.routeTitle || t.state.setup.cities.join(' · '));
    return names.join(' + ') || copy.curatedTripFallback;
  }, [trips, draft.selectedTripIds, copy]);

  const pricing = useMemo(
    () =>
      computePhotobookOrderPricing({
        currency: homeCurrency,
        formatId: draft.formatId,
        bindingId: draft.bindingId,
        pageCount: draft.pageCount,
        copies,
      }),
    [homeCurrency, draft.formatId, draft.bindingId, draft.pageCount, copies]
  );

  if (!open) return null;

  const formatLabel =
    draft.formatId === 'square_210' ? copy.formatSquare : copy.formatA5;

  const bindingLabel =
    draft.bindingId === 'hardcover_matte'
      ? copy.bindingHardcover
      : copy.bindingSoftcover;

  const buildOrderManifestText = (ord: PhotobookOrderRecord) => {
    return copy.buildManifest({
      orderId: ord.orderId,
      bookTitle: ord.bookTitle,
      tripSummary: ord.tripTitlesSummary,
      formatLabel,
      bindingLabel,
      pageCount: ord.pageCount,
      photoCount: ord.photoCount,
      copies: ord.copies,
      currencySymbol: pricing.currencySymbol,
      totalPrice: ord.totalPrice,
      currencyCode: ord.currencyCode,
      recipientName: ord.shipping?.recipientName || recipientName,
      phone: ord.shipping?.phone || phone,
      shippingAddress: ord.shipping?.shippingAddress || shippingAddress,
      customerNote: ord.shipping?.customerNote,
    });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (recipientName.trim().length < 1) {
      setSubmitError(copy.errRecipient);
      return;
    }
    if (phone.trim().length < 5) {
      setSubmitError(copy.errPhone);
      return;
    }
    if (shippingAddress.trim().length < 5) {
      setSubmitError(copy.errAddress);
      return;
    }

    setSubmitting(true);
    try {
      const { order, syncedToCloud } = await createPhotobookPrintOrder({
        user: authUser,
        bookTitle: draft.bookTitle,
        tripTitlesSummary: selectedTripsSummary,
        templateId: draft.templateId,
        formatSpec: draft.formatId,
        bindingSpec: draft.bindingId,
        pageCount: draft.pageCount,
        photoCount: Math.max(1, draft.includedPhotoIds.length),
        copies,
        currencyCode: pricing.currencyCode,
        totalPrice: pricing.totalPrice,
        shipping: {
          recipientName,
          phone,
          shippingAddress,
          customerNote,
        },
      });
      setCreatedOrder(order);
      onToast(
        syncedToCloud
          ? copy.orderSyncedToast(order.orderId)
          : copy.orderLocalToast(order.orderId)
      );
    } catch (err) {
      setSubmitError(formatCloudSyncError(err, language));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPrintPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await exportPrintReadyPhotobookPdf({
        draft,
        photos,
        trips,
        includeCropMarks: true,
      });
      onToast(copy.pdfExportedToast(res.totalPages));
    } catch {
      onToast(copy.pdfFailedToast);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCopyManifest = async (ord: PhotobookOrderRecord) => {
    try {
      await navigator.clipboard.writeText(buildOrderManifestText(ord));
      onToast(copy.copiedToast);
    } catch {
      onToast(copy.copyFailedToast);
    }
  };

  const handleLoadOrderShipping = async (ord: PhotobookOrderRecord) => {
    if (ord.shipping) {
      setExpandedShippingMap((prev) => ({ ...prev, [ord.orderId]: ord.shipping! }));
      return;
    }
    try {
      const info = await fetchPhotobookOrderShipping(ord.orderId);
      if (info) {
        setExpandedShippingMap((prev) => ({ ...prev, [ord.orderId]: info }));
      } else {
        onToast(copy.noShippingToast);
      }
    } catch (err) {
      onToast(formatCloudSyncError(err, language));
    }
  };

  const handleAdminStatusChange = async (
    ord: PhotobookOrderRecord,
    nextStatus: PhotobookOrderStatus
  ) => {
    setUpdatingOrderId(ord.orderId);
    try {
      const tracking = trackingDraftMap[ord.orderId] ?? ord.trackingNumber ?? '';
      await adminUpdatePhotobookOrderFulfillment({
        orderId: ord.orderId,
        status: nextStatus,
        trackingNumber: tracking,
      });
      await loadOrders();
      onToast(copy.updatedOrderToast(ord.orderId));
    } catch (err) {
      onToast(formatCloudSyncError(err, language));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelMyOrder = async (ord: PhotobookOrderRecord) => {
    setUpdatingOrderId(ord.orderId);
    try {
      await cancelPhotobookOrder(ord.orderId, authUser);
      await loadOrders();
      onToast(copy.cancelledOrderToast);
    } catch (err) {
      onToast(formatCloudSyncError(err, language));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#082220]/55 backdrop-blur-xs p-0 sm:p-4 md:p-6 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[#DCE8E5] bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-[#DCE8E5] mx-auto mt-2.5 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#E8F0EE] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Printer className="w-5 h-5 text-[#093B35] shrink-0" />
            <h2 className="text-base font-bold text-[#152B29] truncate">
              {copy.modalTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closeAria}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-[#5B7370] hover:bg-[#F2F7F6] hover:text-[#152B29] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-5 pt-3 pb-2 bg-[#FAFDFC] border-b border-[#E8F0EE] shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EDF4F2]">
            <button
              type="button"
              onClick={() => setActiveTab('checkout')}
              className={`h-9 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'checkout'
                  ? 'bg-white text-[#152B29] shadow-xs'
                  : 'text-[#5B7370] hover:text-[#152B29]'
              }`}
            >
              {copy.tabCheckout}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`h-9 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white text-[#152B29] shadow-xs'
                  : 'text-[#5B7370] hover:text-[#152B29]'
              }`}
            >
              {isAdmin ? copy.tabAdminOrders : copy.tabMyOrders}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'checkout' ? (
            createdOrder ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#BCE5E2] bg-[#F2FAF9] p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#093B35]">
                      <Check className="w-4 h-4 text-[#078C88]" />
                      {copy.orderCreatedTitle}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#078C88] tabular-nums">
                      {createdOrder.orderId}
                    </span>
                  </div>
                  <p className="text-xs text-[#3B5552] leading-relaxed">
                    {copy.orderCreatedSteps}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#DCE8E5] p-4 space-y-2 text-xs text-[#3B5552]">
                  <div className="font-bold text-sm text-[#152B29]">《{createdOrder.bookTitle}》</div>
                  <div>
                    {formatLabel} · {bindingLabel}
                  </div>
                  <div className="tabular-nums">
                    {createdOrder.pageCount}P · {createdOrder.photoCount}{' '}
                    {copy.photosUnit} · ×{createdOrder.copies}{' '}
                    {copy.copiesUnit} ·{' '}
                    <strong className="text-[#093B35]">
                      {pricing.currencySymbol}
                      {createdOrder.totalPrice} {createdOrder.currencyCode}
                    </strong>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={exportingPdf}
                    onClick={handleDownloadPrintPdf}
                    className="w-full h-11 rounded-xl bg-[#093B35] hover:bg-[#0C4D45] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {exportingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>
                      {copy.downloadPrintPdfBtn}
                    </span>
                  </button>

                  <a
                    href={buildWhatsAppClaimUrl(buildOrderManifestText(createdOrder), language)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 rounded-xl bg-[#078C88] hover:bg-[#067572] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>
                      {copy.whatsappConfirmBtn}
                    </span>
                  </a>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyManifest(createdOrder)}
                      className="h-10 rounded-xl border border-[#DCE8E5] bg-white hover:bg-[#F6FAF9] text-xs font-semibold text-[#152B29] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#078C88]" />
                      <span>{copy.copyOrderBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedOrder(null);
                        setActiveTab('orders');
                      }}
                      className="h-10 rounded-xl border border-[#DCE8E5] bg-white hover:bg-[#F6FAF9] text-xs font-semibold text-[#152B29] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Package className="w-3.5 h-3.5 text-[#078C88]" />
                      <span>{copy.viewOrderStatusBtn}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-5">
                {/* Spec & Price Card */}
                <div className="rounded-2xl border border-[#DCE8E5] bg-[#FAFDFC] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#152B29] truncate">
                        《{draft.bookTitle}》
                      </div>
                      <div className="mt-0.5 text-xs text-[#5B7370] truncate">
                        {selectedTripsSummary}
                      </div>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <div className="text-lg font-extrabold text-[#093B35]">
                        {pricing.currencySymbol}
                        {pricing.totalPrice}
                      </div>
                      <div className="text-[11px] text-[#5B7370]">{pricing.currencyCode}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E6F0EE] flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#3B5552]">
                    <span>{formatLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{bindingLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-semibold">
                      {draft.pageCount}P ({draft.includedPhotoIds.length}{' '}
                      {copy.photosUnit})
                    </span>
                  </div>

                  {/* Copies Stepper */}
                  <div className="pt-2 border-t border-[#E6F0EE] flex items-center justify-between gap-3">
                    <div className="text-xs text-[#3B5552]">
                      <span className="font-semibold text-[#152B29]">
                        {copy.printCopiesLabel}
                      </span>
                      <span className="ml-2 text-[#078C88]">
                        {copy.promoBulkLabel}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCopies((c) => Math.max(1, c - 1))}
                        className="h-8 w-8 rounded-lg border border-[#DCE8E5] bg-white inline-flex items-center justify-center text-[#152B29] hover:bg-[#F2F7F6] cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold text-[#152B29] tabular-nums">
                        {copies}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCopies((c) => Math.min(20, c + 1))}
                        className="h-8 w-8 rounded-lg border border-[#DCE8E5] bg-white inline-flex items-center justify-center text-[#152B29] hover:bg-[#F2F7F6] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#5B7370] flex flex-wrap items-center justify-between gap-2 tabular-nums">
                    <span>
                      {copy.unitLabel} {pricing.currencySymbol}
                      {pricing.unitSubtotal}
                      {pricing.discountRateLabel ? ` · ${pricing.discountRateLabel}` : ''}
                    </span>
                    <span>
                      {pricing.shippingFee === 0
                        ? copy.freeShippingLabel
                        : copy.shippingFeeLabel(pricing.currencySymbol, pricing.shippingFee)}
                    </span>
                  </div>
                </div>

                {/* Shipping Form */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-[#152B29]">
                    {copy.deliveryInfoHeading}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#5B7370] mb-1">
                        {copy.recipientLabel}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder={copy.recipientPlaceholder}
                        className="w-full h-10 rounded-xl border border-[#DCE8E5] px-3 text-sm text-[#152B29] focus:outline-none focus:border-[#078C88]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5B7370] mb-1">
                        {copy.phoneLabel}
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={32}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={copy.phonePlaceholder}
                        className="w-full h-10 rounded-xl border border-[#DCE8E5] px-3 text-sm text-[#152B29] tabular-nums focus:outline-none focus:border-[#078C88]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5B7370] mb-1">
                      {copy.addressLabel}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={240}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder={copy.addressPlaceholder}
                      className="w-full h-10 rounded-xl border border-[#DCE8E5] px-3 text-sm text-[#152B29] focus:outline-none focus:border-[#078C88]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5B7370] mb-1">
                      {copy.noteLabel}
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder={copy.notePlaceholder}
                      className="w-full h-10 rounded-xl border border-[#DCE8E5] px-3 text-sm text-[#152B29] focus:outline-none focus:border-[#078C88]"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 text-[11px] text-[#5B7370]">
                  <ShieldCheck className="w-4 h-4 text-[#078C88] shrink-0 mt-0.5" />
                  <span>
                    {copy.prepressGuarantee}
                  </span>
                </div>

                {submitError && (
                  <div className="rounded-xl border border-[#F2C6C6] bg-[#FFF6F6] px-3.5 py-2.5 text-xs text-[#A63A3A]">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-[#093B35] hover:bg-[#0C4D45] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  <span>
                    {copy.submitOrderBtn(pricing.currencySymbol, pricing.totalPrice)}
                  </span>
                </button>
              </form>
            )
          ) : (
            <div className="space-y-3">
              {loadingOrders ? (
                <div className="py-10 flex items-center justify-center gap-2 text-xs text-[#5B7370]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#078C88]" />
                  <span>{copy.loadingOrders}</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-sm font-semibold text-[#152B29]">
                    {copy.noOrdersTitle}
                  </p>
                  <p className="text-xs text-[#5B7370]">
                    {copy.noOrdersDesc}
                  </p>
                </div>
              ) : (
                orders.map((ord) => {
                  const shipInfo = ord.shipping || expandedShippingMap[ord.orderId];
                  const statusText = copy.statusLabels[ord.status];

                  return (
                    <div
                      key={ord.orderId}
                      className="rounded-2xl border border-[#DCE8E5] p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#152B29] truncate">
                            《{ord.bookTitle}》
                          </div>
                          <div className="mt-0.5 text-xs text-[#5B7370] font-mono tabular-nums">
                            {ord.orderId} · {ord.pageCount}P × {ord.copies} ·{' '}
                            {ord.totalPrice} {ord.currencyCode}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#078C88] whitespace-nowrap shrink-0">
                          {statusText}
                        </span>
                      </div>

                      {ord.trackingNumber && (
                        <div className="flex items-center gap-1.5 text-xs text-[#152B29] tabular-nums">
                          <Truck className="w-3.5 h-3.5 text-[#078C88]" />
                          <span>
                            {copy.trackingPrefix}
                            {ord.trackingNumber}
                          </span>
                        </div>
                      )}

                      {shipInfo && (
                        <div className="rounded-xl bg-[#F7FAF9] p-3 text-xs text-[#3B5552] space-y-0.5">
                          <div className="font-semibold text-[#152B29]">
                            {shipInfo.recipientName} · {shipInfo.phone}
                          </div>
                          <div>{shipInfo.shippingAddress}</div>
                          {shipInfo.customerNote && (
                            <div className="text-[#5B7370]">{shipInfo.customerNote}</div>
                          )}
                        </div>
                      )}

                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        {!shipInfo && authUser?.emailVerified && (
                          <button
                            type="button"
                            onClick={() => void handleLoadOrderShipping(ord)}
                            className="h-8 px-3 rounded-lg border border-[#DCE8E5] text-xs font-semibold text-[#3B5552] hover:bg-[#F2F7F6] cursor-pointer whitespace-nowrap"
                          >
                            {copy.viewAddressBtn}
                          </button>
                        )}

                        <a
                          href={buildWhatsAppClaimUrl(buildOrderManifestText(ord), language)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-3 rounded-lg border border-[#DCE8E5] text-xs font-semibold text-[#078C88] hover:bg-[#F2FAF9] inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{copy.contactDeskBtn}</span>
                        </a>

                        {ord.status === 'pending_payment' && !isAdmin && (
                          <button
                            type="button"
                            disabled={updatingOrderId === ord.orderId}
                            onClick={() => void handleCancelMyOrder(ord)}
                            className="h-8 px-3 rounded-lg border border-[#DCE8E5] text-xs font-semibold text-[#7D938F] hover:text-[#A63A3A] cursor-pointer whitespace-nowrap"
                          >
                            {copy.cancelBtn}
                          </button>
                        )}
                      </div>

                      {/* Admin Fulfillment Bar */}
                      {isAdmin && (
                        <div className="pt-2.5 border-t border-[#E8F0EE] space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={trackingDraftMap[ord.orderId] ?? ord.trackingNumber}
                              onChange={(e) =>
                                setTrackingDraftMap((prev) => ({
                                  ...prev,
                                  [ord.orderId]: e.target.value,
                                }))
                              }
                              placeholder={copy.trackingPlaceholder}
                              className="flex-1 h-8 rounded-lg border border-[#DCE8E5] px-2.5 text-xs text-[#152B29]"
                            />
                            <button
                              type="button"
                              disabled={updatingOrderId === ord.orderId}
                              onClick={() => void handleAdminStatusChange(ord, 'shipped')}
                              className="h-8 px-3 rounded-lg bg-[#093B35] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                            >
                              {copy.markShippedBtn}
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(['paid_queued', 'printing', 'cancelled'] as PhotobookOrderStatus[]).map(
                              (st) => (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={updatingOrderId === ord.orderId}
                                  onClick={() => void handleAdminStatusChange(ord, st)}
                                  className={`h-7 px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                                    ord.status === st
                                      ? 'border-[#078C88] bg-[#EFF9F8] text-[#078C88]'
                                      : 'border-[#DCE8E5] text-[#5B7370] hover:text-[#152B29]'
                                  }`}
                                >
                                  {copy.statusLabels[st]}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
