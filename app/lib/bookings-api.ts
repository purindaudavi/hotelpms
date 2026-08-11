import type {
  Reservation,
  ReservationOccupant,
  ReservationRoom,
  ReservationStatus
} from "@/app/data/pms-data";
import type {
  BusinessBlock,
  BusinessBlockAllocation,
  BusinessBlockLogEntry,
  BusinessBlockStatus
} from "@/app/components/modules/reservation/types";
import { currentSessionUser } from "./current-user";
import {
  type ReservationAttachmentMetadata,
  type ReservationLogEntry
} from "./reservation-activity-repository";
import { api, getApiErrorMessage } from "./api";

type ApiActor = {
  user_id?: string;
  name?: string;
  email?: string;
};

type ApiTravelAgent = {
  travel_agent_id?: string;
  name?: string;
  commission_percentage?: number;
};

type ApiBooker = {
  title?: string;
  name: string;
  phone?: string;
  email?: string;
  country?: string;
};

type ApiReservationRoom = {
  _id: string;
  room_type_id: string;
  room_type_name: string;
  physical_room_id?: string;
  room_number?: string;
  occupancy?: string;
  bed_type?: string;
  adults: number;
  children: number;
  rate_plan_id?: string;
  rate_plan_name?: string;
  meal_plan?: string;
  currency?: string;
  original_nightly_rate?: number;
  effective_nightly_rate?: number;
  is_complimentary?: boolean;
  complimentary_reason?: string;
  requires_manager_approval?: boolean;
  business_block_allocation_id?: string;
  created_at?: string;
  updated_at?: string;
};

type ApiReservationOccupant = {
  _id: string;
  room_line_id: string;
  title?: string;
  name: string;
  guest_type: "adult" | "child";
  is_primary?: boolean;
  is_main_booker?: boolean;
  email?: string;
  phone?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
};

type ApiFinancialSummary = {
  room_total?: number;
  tax_total?: number;
  discount_total?: number;
  extra_total?: number;
  grand_total?: number;
  paid_total?: number;
};

type ApiReservation = {
  _id: string;
  property_id: string;
  reservation_no: string;
  booking_reference?: string;
  reservation_date: string;
  check_in: string;
  check_out: string;
  is_day_room?: boolean;
  status: string;
  booking_source: string;
  tour_number?: string;
  group_name?: string;
  travel_agent?: ApiTravelAgent;
  booker: ApiBooker;
  rooms?: ApiReservationRoom[];
  occupants?: ApiReservationOccupant[];
  room_count?: number;
  currency?: string;
  rate_plan_id?: string;
  rate_plan_name?: string;
  meal_plan?: string;
  refundable?: boolean;
  cancellation_policy?: string;
  financial_summary?: ApiFinancialSummary;
  reservation_remarks?: string;
  guest_remarks?: string;
  internal_remarks?: string;
  business_block_id?: string;
  business_block_allocation_id?: string;
  checked_in_at?: string;
  checked_in_by?: ApiActor;
  email_delivery?: {
    status?: string;
    sent_at?: string;
    failure_message?: string;
  };
  created_by?: ApiActor;
  created_at?: string;
  updated_at?: string;
};

type ApiAuditLog = {
  _id: string;
  property_id: string;
  entity_id: string;
  action: string;
  description: string;
  actor?: ApiActor;
  created_at: string;
};

type ApiAttachment = {
  _id: string;
  property_id: string;
  reservation_id: string;
  file_name: string;
  content_type: string;
  file_size: number;
  document_category?: string;
  description?: string;
  uploaded_by?: ApiActor;
  uploaded_at: string;
  file_url: string;
};

type ApiBlockAllocation = {
  _id: string;
  room_type_id: string;
  room_type_name: string;
  quantity: number;
  rate_plan_id?: string;
  rate_plan_name?: string;
  meal_plan?: string;
  currency: string;
  negotiated_rate: number;
  tax_inclusive?: boolean;
  is_complimentary?: boolean;
  complimentary_reason?: string;
  released_quantity?: number;
};

type ApiBusinessBlock = {
  _id: string;
  property_id: string;
  block_number: string;
  block_name: string;
  company_name: string;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  check_in: string;
  check_out: string;
  cutoff_date: string;
  status: string;
  allocations: ApiBlockAllocation[];
  billing?: {
    payment_method?: string;
    billing_party?: string;
    deposit_required?: number;
    deposit_paid?: number;
    payment_due_date?: string;
    remarks?: string;
  };
  cancellation_policy?: string;
  block_remarks?: string;
  internal_remarks?: string;
  special_requirements?: string;
  created_by?: ApiActor;
  created_at: string;
  updated_at: string;
};

type ReservationListResponse = {
  reservations: ApiReservation[];
  page: number;
  pages: number;
};
type ReservationResponse = { reservation: ApiReservation };
type ReservationDetailsResponse = {
  reservation: ApiReservation;
  logs: ApiAuditLog[];
  attachments: ApiAttachment[];
  payments: unknown[];
};
type BusinessBlockListResponse = { business_blocks: ApiBusinessBlock[] };
type BusinessBlockResponse = { business_block: ApiBusinessBlock };
type BusinessBlockDetailsResponse = {
  business_block: ApiBusinessBlock;
  rooming_list: ApiReservation[];
  logs: ApiAuditLog[];
};

export type ReservationDetails = {
  reservation: Reservation;
  logs: ReservationLogEntry[];
  attachments: Array<ReservationAttachmentMetadata & { fileUrl: string }>;
};

export type BusinessBlockDetails = {
  businessBlock: BusinessBlock;
  roomingList: Reservation[];
  logs: BusinessBlockLogEntry[];
};

const reservationStatusFromApi: Record<string, ReservationStatus> = {
  tentative: "Tentative",
  confirmed: "Confirmed",
  checked_in: "Checked-in",
  checked_out: "Checked-out",
  cancelled: "Cancelled",
  no_show: "No Show",
  blocked: "Blocked"
};

const reservationStatusToApi: Record<ReservationStatus, string> = {
  Tentative: "tentative",
  Confirmed: "confirmed",
  "Checked-in": "checked_in",
  "Checked-out": "checked_out",
  Cancelled: "cancelled",
  "No Show": "no_show",
  Blocked: "blocked"
};

const blockStatusFromApi: Record<string, BusinessBlockStatus> = {
  tentative: "Tentative",
  active: "Active",
  released: "Released",
  cancelled: "Cancelled",
  completed: "Completed"
};

const blockStatusToApi: Record<BusinessBlockStatus, string> = {
  Tentative: "tentative",
  Active: "active",
  Released: "released",
  Cancelled: "cancelled",
  Completed: "completed"
};

const billingPartyToApi: Record<BusinessBlock["billingParty"], string> = {
  Company: "company",
  Guest: "guest",
  "Travel Agent": "travel_agent",
  Split: "split"
};

const billingPartyFromApi: Record<string, BusinessBlock["billingParty"]> = {
  company: "Company",
  guest: "Guest",
  travel_agent: "Travel Agent",
  split: "Split"
};

export async function getReservations(propertyId: string) {
  const reservations: ApiReservation[] = [];
  let page = 1;
  let pages = 1;
  do {
    const response = await api.get<ReservationListResponse>("/bookings/reservations", {
      params: { property_id: propertyId, limit: 100, page, details: true }
    });
    reservations.push(...response.data.reservations);
    pages = response.data.pages;
    page += 1;
  } while (page <= pages);
  return reservations.map(mapReservation);
}

export async function getReservationDetails(propertyId: string, reservationId: string): Promise<ReservationDetails> {
  const response = await api.get<ReservationDetailsResponse>(
    `/bookings/reservations/${reservationId}`,
    { params: { property_id: propertyId } }
  );
  return {
    reservation: mapReservation(response.data.reservation),
    logs: response.data.logs.map(mapReservationLog),
    attachments: response.data.attachments.map(mapAttachment)
  };
}

export async function createReservation(propertyId: string, booking: Reservation) {
  const response = await api.post<ReservationResponse>(
    "/bookings/reservations",
    {
      property_id: propertyId,
      status: reservationStatusToApi[booking.status],
      ...reservationPayload(booking, false)
    },
    { headers: actorHeaders() }
  );
  let saved = mapReservation(response.data.reservation);
  saved = await ensurePrimaryOccupant(propertyId, saved, booking);
  return saved;
}

export async function createReservationFromBusinessBlock(
  propertyId: string,
  blockId: string,
  allocationId: string,
  booking: Reservation
) {
  const response = await api.post<ReservationResponse>(
    `/bookings/business-blocks/${blockId}/allocations/${allocationId}/reservations`,
    {
      property_id: propertyId,
      quantity: booking.reservationRooms?.length || booking.rooms,
      ...reservationPayload(booking, false)
    },
    { headers: actorHeaders() }
  );
  return ensurePrimaryOccupant(
    propertyId,
    mapReservation(response.data.reservation),
    booking
  );
}

export async function updateReservation(propertyId: string, booking: Reservation) {
  const response = await api.patch<ReservationResponse>(
    `/bookings/reservations/${booking.id}`,
    reservationPayload(booking, true),
    { params: { property_id: propertyId }, headers: actorHeaders() }
  );
  return mapReservation(response.data.reservation);
}

export async function updateReservationEmailDelivery(
  propertyId: string,
  reservationId: string,
  delivery: {
    status: "pending" | "accepted" | "sent" | "failed";
    category: string;
    requestedAt?: string;
    sentAt?: string;
    failureMessage?: string;
  }
) {
  const response = await api.patch<ReservationResponse>(
    `/bookings/reservations/${reservationId}/email-delivery`,
    {
      property_id: propertyId,
      status: delivery.status,
      category: delivery.category,
      requested_at: delivery.requestedAt,
      sent_at: delivery.sentAt,
      failure_message: delivery.failureMessage
    },
    { headers: actorHeaders() }
  );
  return mapReservation(response.data.reservation);
}

export async function transitionReservation(
  propertyId: string,
  reservationId: string,
  action: "confirm" | "check-in" | "check-out" | "cancel" | "no-show",
  options: { businessDate?: string; reason?: string } = {}
) {
  const response = await api.post<ReservationResponse>(
    `/bookings/reservations/${reservationId}/${action}`,
    {
      property_id: propertyId,
      ...(options.businessDate ? { business_date: options.businessDate } : {}),
      ...(options.reason ? { reason: options.reason } : {})
    },
    { headers: actorHeaders() }
  );
  return mapReservation(response.data.reservation);
}

export async function archiveReservation(propertyId: string, reservationId: string) {
  await api.delete(`/bookings/reservations/${reservationId}`, {
    params: { property_id: propertyId },
    headers: actorHeaders()
  });
}

export async function replaceReservationOccupants(propertyId: string, booking: Reservation) {
  return updateReservation(propertyId, booking);
}

export async function uploadReservationAttachment(
  propertyId: string,
  reservationId: string,
  file: File,
  documentCategory = "Other",
  description = ""
) {
  const response = await api.post<{ attachment: ApiAttachment }>(
    `/bookings/reservations/${reservationId}/attachments`,
    file,
    {
      params: { property_id: propertyId },
      headers: {
        ...actorHeaders(),
        "Content-Type": file.type || "application/octet-stream",
        "x-file-name": file.name,
        "x-document-category": documentCategory,
        "x-description": description
      }
    }
  );
  return mapAttachment(response.data.attachment);
}

export async function deleteReservationAttachment(
  propertyId: string,
  reservationId: string,
  attachmentId: string
) {
  await api.delete(
    `/bookings/reservations/${reservationId}/attachments/${attachmentId}`,
    { params: { property_id: propertyId }, headers: actorHeaders() }
  );
}

export async function getBusinessBlocks(propertyId: string) {
  const response = await api.get<BusinessBlockListResponse>("/bookings/business-blocks", {
    params: { property_id: propertyId }
  });
  return response.data.business_blocks.map(mapBusinessBlock);
}

export async function getBusinessBlockDetails(propertyId: string, blockId: string): Promise<BusinessBlockDetails> {
  const response = await api.get<BusinessBlockDetailsResponse>(
    `/bookings/business-blocks/${blockId}`,
    { params: { property_id: propertyId } }
  );
  return {
    businessBlock: mapBusinessBlock(response.data.business_block),
    roomingList: response.data.rooming_list.map(mapReservation),
    logs: response.data.logs.map(mapBusinessBlockLog)
  };
}

export async function createBusinessBlock(propertyId: string, block: BusinessBlock) {
  const response = await api.post<BusinessBlockResponse>(
    "/bookings/business-blocks",
    { property_id: propertyId, ...businessBlockPayload(block) },
    { headers: actorHeaders() }
  );
  return mapBusinessBlock(response.data.business_block);
}

export async function updateBusinessBlock(propertyId: string, block: BusinessBlock) {
  const response = await api.patch<BusinessBlockResponse>(
    `/bookings/business-blocks/${block.id}`,
    businessBlockPayload(block),
    { params: { property_id: propertyId }, headers: actorHeaders() }
  );
  return mapBusinessBlock(response.data.business_block);
}

export async function transitionBusinessBlock(
  propertyId: string,
  blockId: string,
  action: "activate" | "release" | "cancel" | "complete",
  reason = ""
) {
  const response = await api.post<BusinessBlockResponse>(
    `/bookings/business-blocks/${blockId}/${action}`,
    { property_id: propertyId, ...(reason ? { reason } : {}) },
    { headers: actorHeaders() }
  );
  return mapBusinessBlock(response.data.business_block);
}

export function getBookingsApiErrorMessage(error: unknown) {
  const apiMessage = getApiErrorMessage(error, "");
  if (apiMessage) return apiMessage;
  if (error instanceof Error && error.message) return error.message;
  return "The booking change could not be saved.";
}

function reservationPayload(booking: Reservation, includeOccupants: boolean) {
  const rooms = booking.reservationRooms ?? [];
  return {
    booking_reference: booking.bookingReference || booking.bookingRef || "",
    reservation_date: booking.reservationDate,
    check_in: booking.checkIn,
    check_out: booking.checkOut,
    is_day_room: Boolean(booking.isDayRoom),
    booking_source: booking.bookingSource || booking.source,
    tour_number: booking.tourNumber || "",
    group_name: booking.groupName || "",
    travel_agent: {
      travel_agent_id: booking.travelAgentId || "",
      name: booking.travelAgentName || "",
      commission_percentage: booking.travelAgentCommission || 0
    },
    booker: {
      title: booking.guestTitle || "",
      name: booking.guest,
      phone: booking.phone === "-" ? "" : booking.phone,
      email: booking.email === "-" ? "" : booking.email,
      country: booking.country
    },
    rooms: rooms.map((room) => ({
      ...(isMongoId(room.id) ? { _id: room.id } : {}),
      room_type_id: room.roomTypeId,
      room_type_name: room.roomType,
      ...(room.roomId ? { physical_room_id: room.roomId } : {}),
      room_number: room.roomNumber,
      occupancy: room.occupancy,
      bed_type: room.bedType,
      adults: room.adults,
      children: room.children,
      rate_plan_id: room.ratePlanId,
      rate_plan_name: room.ratePlanName,
      meal_plan: room.mealPlan,
      currency: room.currency,
      original_nightly_rate: room.originalNightlyRate,
      effective_nightly_rate: room.effectiveNightlyRate,
      is_complimentary: room.isFoc,
      complimentary_reason: room.focReason,
      requires_manager_approval: room.requiresManagerApproval,
      ...(room.businessBlockAllocationId
        ? { business_block_allocation_id: room.businessBlockAllocationId }
        : {})
    })),
    ...(includeOccupants
      ? {
          occupants: (booking.occupants ?? []).map((occupant) => ({
            room_line_id: occupant.roomLineId,
            title: occupant.title || "",
            name: occupant.name,
            guest_type: occupant.guestType.toLowerCase(),
            is_primary: occupant.isPrimary,
            is_main_booker: occupant.isMainBooker,
            email: occupant.email || "",
            phone: occupant.phone || "",
            country: occupant.country || ""
          }))
        }
      : {}),
    currency: booking.currency || "LKR",
    rate_plan_id: booking.ratePlanId || "",
    rate_plan_name: booking.ratePlanName || "",
    meal_plan: booking.mealPlan || "",
    refundable: booking.refundable ?? true,
    cancellation_policy: booking.cancellationPolicy || "",
    financial_summary: {
      room_total: booking.total,
      grand_total: booking.total,
      paid_total: booking.paid
    },
    reservation_remarks: booking.reservationRemarks || "",
    guest_remarks: booking.guestRemarks || "",
    internal_remarks: booking.internalRemarks || ""
  };
}

function businessBlockPayload(block: BusinessBlock) {
  return {
    block_name: block.blockName,
    company_name: block.companyName,
    contact: {
      name: block.contactName,
      email: block.contactEmail,
      phone: block.contactPhone
    },
    check_in: block.checkIn,
    check_out: block.checkOut,
    cutoff_date: block.cutoffDate,
    allocations: block.allocations.map((allocation) => ({
      ...(isMongoId(allocation.id) ? { _id: allocation.id } : {}),
      room_type_id: allocation.roomTypeId,
      room_type_name: allocation.roomTypeName,
      quantity: allocation.quantity,
      rate_plan_id: allocation.ratePlanId || "",
      rate_plan_name: allocation.ratePlanName || "",
      meal_plan: allocation.mealPlan,
      currency: allocation.currency,
      negotiated_rate: allocation.negotiatedRate,
      tax_inclusive: allocation.taxInclusive,
      is_complimentary: allocation.isComplimentary,
      complimentary_reason: allocation.complimentaryReason || "",
      released_quantity: allocation.releasedQuantity
    })),
    billing: {
      payment_method: block.paymentMethod || "",
      billing_party: billingPartyToApi[block.billingParty],
      deposit_required: block.depositRequired,
      deposit_paid: block.depositPaid,
      payment_due_date: block.paymentDueDate || undefined,
      remarks: block.billingRemarks || ""
    },
    cancellation_policy: block.cancellationPolicy || "",
    block_remarks: block.blockRemarks || "",
    internal_remarks: block.internalRemarks || "",
    special_requirements: block.specialRequirements || ""
  };
}

function mapReservation(value: ApiReservation): Reservation {
  const rooms = (value.rooms ?? []).map((room) => mapReservationRoom(value, room));
  const financial = value.financial_summary ?? {};
  const first = rooms[0];
  return {
    id: value._id,
    propertyId: value.property_id,
    resNo: value.reservation_no,
    bookingRef: value.booking_reference || "",
    bookingReference: value.booking_reference || "",
    bookingSource: value.booking_source,
    source: value.booking_source,
    travelAgentId: value.travel_agent?.travel_agent_id || "",
    travelAgentName: value.travel_agent?.name || "",
    travelAgentCommission: Number(value.travel_agent?.commission_percentage || 0),
    tourNumber: value.tour_number || "",
    groupName: value.group_name || "",
    reservationDate: dateOnly(value.reservation_date),
    checkIn: dateOnly(value.check_in),
    checkOut: dateOnly(value.check_out),
    rooms: rooms.length || Number(value.room_count || 0),
    status: reservationStatusFromApi[value.status] ?? "Confirmed",
    guestTitle: value.booker?.title || "",
    guest: value.booker?.name || "",
    phone: value.booker?.phone || "-",
    email: value.booker?.email || "-",
    country: value.booker?.country || "",
    roomType: first?.roomType || "",
    room: first?.roomNumber || "-",
    adults: rooms.reduce((sum, room) => sum + room.adults, 0),
    children: rooms.reduce((sum, room) => sum + room.children, 0),
    total: Number(financial.grand_total || 0),
    paid: Number(financial.paid_total || 0),
    reservationRemarks: value.reservation_remarks || "",
    guestRemarks: value.guest_remarks || "",
    internalRemarks: value.internal_remarks || "",
    isDayRoom: Boolean(value.is_day_room),
    ratePlanId: value.rate_plan_id || "",
    ratePlanName: value.rate_plan_name || "",
    mealPlan: value.meal_plan || "",
    currency: value.currency || "LKR",
    refundable: value.refundable ?? true,
    cancellationPolicy: value.cancellation_policy || "",
    reservationRooms: rooms,
    occupants: (value.occupants ?? []).map((occupant) =>
      mapReservationOccupant(value, occupant)
    ),
    businessBlockId: value.business_block_id,
    businessBlockAllocationId: value.business_block_allocation_id,
    checkedInAt: value.checked_in_at,
    checkedInBy: value.checked_in_by?.name,
    emailStatus: normalizeEmailStatus(value.email_delivery?.status),
    emailSentAt: value.email_delivery?.sent_at,
    emailFailureMessage: value.email_delivery?.failure_message,
    createdBy: value.created_by?.name || "",
    createdAt: value.created_at,
    updatedAt: value.updated_at
  };
}

function mapReservationRoom(reservation: ApiReservation, room: ApiReservationRoom): ReservationRoom {
  const now = new Date().toISOString();
  return {
    id: room._id,
    propertyId: reservation.property_id,
    reservationId: reservation._id,
    roomTypeId: String(room.room_type_id),
    roomType: room.room_type_name,
    roomId: room.physical_room_id ? String(room.physical_room_id) : "",
    roomNumber: room.room_number || "",
    occupancy: room.occupancy || "",
    bedType: room.bed_type || "",
    adults: Number(room.adults || 0),
    children: Number(room.children || 0),
    ratePlanId: room.rate_plan_id || "",
    ratePlanName: room.rate_plan_name || "",
    mealPlan: room.meal_plan || "",
    currency: room.currency || reservation.currency || "LKR",
    originalNightlyRate: Number(room.original_nightly_rate || 0),
    effectiveNightlyRate: Number(room.effective_nightly_rate || 0),
    isFoc: Boolean(room.is_complimentary),
    focReason: room.complimentary_reason || "",
    requiresManagerApproval: Boolean(room.requires_manager_approval),
    businessBlockAllocationId: room.business_block_allocation_id,
    createdAt: room.created_at || now,
    updatedAt: room.updated_at || now
  };
}

function mapReservationOccupant(
  reservation: ApiReservation,
  occupant: ApiReservationOccupant
): ReservationOccupant {
  const now = new Date().toISOString();
  return {
    id: occupant._id,
    propertyId: reservation.property_id,
    reservationId: reservation._id,
    roomLineId: String(occupant.room_line_id),
    title: occupant.title || "",
    name: occupant.name,
    guestType: occupant.guest_type === "child" ? "Child" : "Adult",
    isPrimary: Boolean(occupant.is_primary),
    isMainBooker: Boolean(occupant.is_main_booker),
    email: occupant.email || "",
    phone: occupant.phone || "",
    country: occupant.country || "",
    createdAt: occupant.created_at || now,
    updatedAt: occupant.updated_at || now
  };
}

function mapBusinessBlock(value: ApiBusinessBlock): BusinessBlock {
  return {
    id: value._id,
    propertyId: value.property_id,
    blockNumber: value.block_number,
    blockName: value.block_name,
    companyName: value.company_name,
    contactName: value.contact?.name || "",
    contactEmail: value.contact?.email || "",
    contactPhone: value.contact?.phone || "",
    checkIn: dateOnly(value.check_in),
    checkOut: dateOnly(value.check_out),
    cutoffDate: dateOnly(value.cutoff_date),
    status: blockStatusFromApi[value.status] ?? "Tentative",
    paymentMethod: value.billing?.payment_method || "",
    billingParty: billingPartyFromApi[value.billing?.billing_party || "company"] ?? "Company",
    depositRequired: Number(value.billing?.deposit_required || 0),
    depositPaid: Number(value.billing?.deposit_paid || 0),
    paymentDueDate: value.billing?.payment_due_date
      ? dateOnly(value.billing.payment_due_date)
      : "",
    billingRemarks: value.billing?.remarks || "",
    cancellationPolicy: value.cancellation_policy || "",
    blockRemarks: value.block_remarks || "",
    internalRemarks: value.internal_remarks || "",
    specialRequirements: value.special_requirements || "",
    allocations: value.allocations.map((allocation) =>
      mapBusinessBlockAllocation(value, allocation)
    ),
    createdBy: value.created_by?.name || "",
    createdAt: value.created_at,
    updatedAt: value.updated_at
  };
}

function mapBusinessBlockAllocation(
  block: ApiBusinessBlock,
  value: ApiBlockAllocation
): BusinessBlockAllocation {
  return {
    id: value._id,
    propertyId: block.property_id,
    businessBlockId: block._id,
    roomTypeId: String(value.room_type_id),
    roomTypeName: value.room_type_name,
    quantity: value.quantity,
    ratePlanId: value.rate_plan_id || "",
    ratePlanName: value.rate_plan_name || "",
    mealPlan: value.meal_plan || "",
    currency: value.currency,
    negotiatedRate: value.negotiated_rate,
    taxInclusive: Boolean(value.tax_inclusive),
    isComplimentary: Boolean(value.is_complimentary),
    complimentaryReason: value.complimentary_reason || "",
    releasedQuantity: Number(value.released_quantity || 0)
  };
}

function mapReservationLog(value: ApiAuditLog): ReservationLogEntry {
  return {
    id: value._id,
    propertyId: value.property_id,
    reservationId: String(value.entity_id),
    action: readableAction(value.action),
    description: value.description,
    createdBy: value.actor?.name || "System",
    createdAt: value.created_at
  };
}

function mapBusinessBlockLog(value: ApiAuditLog): BusinessBlockLogEntry {
  return {
    id: value._id,
    propertyId: value.property_id,
    businessBlockId: String(value.entity_id),
    action: readableAction(value.action),
    description: value.description,
    createdBy: value.actor?.name || "System",
    createdAt: value.created_at
  };
}

function mapAttachment(value: ApiAttachment): ReservationAttachmentMetadata & { fileUrl: string } {
  return {
    id: value._id,
    propertyId: value.property_id,
    reservationId: String(value.reservation_id),
    fileName: value.file_name,
    fileType: value.content_type,
    fileSize: value.file_size,
    documentCategory: value.document_category
      ? readableAction(value.document_category)
      : "Other",
    description: value.description || "",
    uploadedBy: value.uploaded_by?.name || "System",
    uploadedAt: value.uploaded_at,
    fileUrl: value.file_url
  };
}

function actorHeaders() {
  return {
    "x-user-id": currentSessionUser.email,
    "x-user-name": currentSessionUser.name,
    "x-user-email": currentSessionUser.email
  };
}

async function ensurePrimaryOccupant(
  propertyId: string,
  saved: Reservation,
  source: Reservation
) {
  if (saved.occupants?.length || !saved.reservationRooms?.[0] || !source.guest.trim()) {
    return saved;
  }
  const room = saved.reservationRooms[0];
  await api.post(
    `/bookings/reservations/${saved.id}/occupants`,
    {
      room_line_id: room.id,
      title: source.guestTitle || "",
      name: source.guest,
      guest_type: "adult",
      is_primary: true,
      is_main_booker: true,
      email: source.email === "-" ? "" : source.email,
      phone: source.phone === "-" ? "" : source.phone,
      country: source.country
    },
    { params: { property_id: propertyId }, headers: actorHeaders() }
  );
  return (await getReservationDetails(propertyId, saved.id)).reservation;
}

function dateOnly(value: string) {
  return value ? value.slice(0, 10) : "";
}

function isMongoId(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

function readableAction(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeEmailStatus(value?: string): Reservation["emailStatus"] {
  if (value === "pending" || value === "accepted" || value === "sent" || value === "failed") {
    return value;
  }
  return "not_requested";
}

export { blockStatusToApi, reservationStatusToApi };
