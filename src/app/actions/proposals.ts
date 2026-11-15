"use server";

import { revalidatePath } from "next/cache";

import { DELIVERY_METHODS } from "@/lib/constants";
import {
  createProposalRecord,
  getListingView,
  getProposalViews,
  setProposalStatus,
} from "@/lib/data";
import { getCurrentPharmacy } from "@/lib/session";
import type { ActionResult, CreateProposalInput, ProposalStatus } from "@/lib/types";

export async function createProposalAction(input: CreateProposalInput): Promise<ActionResult> {
  const pharmacy = await getCurrentPharmacy();
  if (!pharmacy) return { ok: false, error: "سجّل الدخول كصيدلية لتقديم عرض بدل." };

  const listing = await getListingView(input.listing_id);
  if (!listing) return { ok: false, error: "هذا العرض غير موجود." };
  if (listing.pharmacy_id === pharmacy.id) {
    return { ok: false, error: "لا يمكنك تقديم عرض بدل على عرضك الخاص." };
  }
  if (listing.status !== "ACTIVE") {
    return { ok: false, error: "هذا العرض لم يعد متاحاً للتبادل." };
  }

  const items = input.offered_items.filter((item) => item.name.trim().length > 0);
  if (!items.length) return { ok: false, error: "أضف صنفاً واحداً على الأقل في عرضك." };
  if (items.some((item) => item.quantity < 1 || item.unit_price < 0)) {
    return { ok: false, error: "راجع الكميات والأسعار في عرضك." };
  }
  if (!(DELIVERY_METHODS as readonly string[]).includes(input.handover_method)) {
    return { ok: false, error: "اختر طريقة تسليم صحيحة." };
  }

  const existing = await getProposalViews();
  const duplicate = existing.find(
    (proposal) =>
      proposal.listing_id === listing.id &&
      proposal.proposer_pharmacy_id === pharmacy.id &&
      proposal.status === "PENDING",
  );
  if (duplicate) {
    return { ok: false, error: "لديك عرض بدل قيد المراجعة على هذا الصنف بالفعل." };
  }

  const proposal = await createProposalRecord(pharmacy.id, {
    listing_id: listing.id,
    offered_items: items,
    handover_method: input.handover_method,
    notes: input.notes.slice(0, 500),
  });

  revalidatePath(`/listings/${listing.id}`);
  revalidatePath("/dashboard/swaps");
  revalidatePath("/dashboard");

  return { ok: true, id: proposal.id };
}

export async function respondProposalAction(
  proposalId: string,
  status: ProposalStatus,
): Promise<ActionResult> {
  const pharmacy = await getCurrentPharmacy();
  if (!pharmacy) return { ok: false, error: "الجلسة منتهية." };
  if (!["ACCEPTED", "REJECTED", "COMPLETED"].includes(status)) {
    return { ok: false, error: "إجراء غير صحيح." };
  }

  const proposals = await getProposalViews();
  const proposal = proposals.find((entry) => entry.id === proposalId);
  if (!proposal) return { ok: false, error: "عرض البدل غير موجود." };

  const isOwner = proposal.listing.pharmacy_id === pharmacy.id;
  const isProposer = proposal.proposer_pharmacy_id === pharmacy.id;

  if (status === "COMPLETED") {
    if (!isOwner && !isProposer) return { ok: false, error: "لا تملك صلاحية على هذا العرض." };
    if (proposal.status !== "ACCEPTED") {
      return { ok: false, error: "لا يمكن تأكيد التنفيذ قبل قبول العرض." };
    }
  } else if (!isOwner) {
    return { ok: false, error: "صاحب العرض الأصلي فقط يستطيع قبول أو رفض العروض." };
  }

  if (proposal.status === "COMPLETED" || proposal.status === "REJECTED") {
    return { ok: false, error: "تم إغلاق هذا العرض بالفعل." };
  }

  await setProposalStatus(proposalId, status);

  revalidatePath("/dashboard/swaps");
  revalidatePath("/dashboard");
  revalidatePath("/market");
  revalidatePath(`/listings/${proposal.listing.id}`);

  return { ok: true };
}
