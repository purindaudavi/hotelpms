import { createClient } from "@/app/utils/supabase/client";

export type RecordType =
  | "reservations"
  | "rooms"
  | "housekeeping"
  | "transactions"
  | "pos_orders"
  | "activity_logs"
  | "settings";

export type SupabaseSnapshot<T> = {
  records: T[];
  source: "supabase" | "seed";
  error?: string;
};

type StoredRecord<T> = {
  id: string;
  payload: T;
};

export async function loadRecords<T>(
  propertyId: string,
  recordType: RecordType
): Promise<SupabaseSnapshot<T>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("staypilot_records")
      .select("id,payload")
      .eq("property_id", propertyId)
      .eq("record_type", recordType)
      .order("updated_at", { ascending: false });

    if (error || !data?.length) {
      return { records: [], source: "seed", error: error?.message };
    }

    return {
      records: (data as StoredRecord<T>[]).map((record) => record.payload),
      source: "supabase"
    };
  } catch (error) {
    return {
      records: [],
      source: "seed",
      error: error instanceof Error ? error.message : "Supabase unavailable"
    };
  }
}

export async function upsertRecord<T extends { id: string }>(
  propertyId: string,
  recordType: RecordType,
  payload: T
) {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("staypilot_records").upsert(
      {
        id: `${propertyId}:${recordType}:${payload.id}`,
        property_id: propertyId,
        record_type: recordType,
        payload,
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );

    return { ok: !error, error: error?.message };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Supabase unavailable"
    };
  }
}

export async function appendActivity(propertyId: string, message: string) {
  return upsertRecord(propertyId, "activity_logs", {
    id: `activity-${Date.now()}`,
    message,
    at: new Date().toISOString()
  });
}
