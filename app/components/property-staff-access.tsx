"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getApiErrorMessage } from "@/app/lib/api";
import { listAttendantsForAccess, type AttendantOption } from "@/app/lib/property-workspaces";
import { updateNightAuditPermission, addPropertyMember, getPropertyMembers, propertyRoleLabel, removePropertyMember, updatePropertyMemberRole, type PropertyMember, type PropertySummary, type StaffRole } from "@/app/lib/property-workspaces";

export function PropertyStaffAccess({ property, onClose }: { property: PropertySummary; onClose?: () => void }) {
  const owner = property.role === "owner";
  const [members, setMembers] = useState<PropertyMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("front_desk");
  const [attendants, setAttendants] = useState<AttendantOption[]>([]);
  const [attendantId, setAttendantId] = useState("");
  const [linkMember, setLinkMember] = useState<PropertyMember | null>(null);
  const [linkAttendantId, setLinkAttendantId] = useState("");
  const [attendantsLoading, setAttendantsLoading] = useState(false);
  useEffect(() => {
    if (role !== "housekeeping" && !linkMember) return;
    let active = true; setAttendantsLoading(true);
    void listAttendantsForAccess(property.property_id).then(values => { if (active) setAttendants(values); })
      .catch(failure => { if (active) setError(getApiErrorMessage(failure, "Could not load attendant records.")); })
      .finally(() => { if (active) setAttendantsLoading(false); });
    return () => { active = false; };
  }, [property.property_id, role, linkMember?.id]);
  function attendantOptions(forUser?: string) {
    return attendants.filter(attendant => attendant.status === "active" && !members.some(member => member.id !== forUser && member.attendant_id === attendant._id));
  }
  function editLink(member: PropertyMember) { setError(""); setLinkMember(member); setLinkAttendantId(member.attendant_id || ""); }
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void getPropertyMembers(property.property_id).then((values) => { if (active) setMembers(values); })
      .catch((failure) => { if (active) setError(getApiErrorMessage(failure, "Could not load property access.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [property.property_id]);
  async function change(action: () => Promise<void>, success: string, clearEmail = false) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await action();
      setMembers(await getPropertyMembers(property.property_id));
      if (clearEmail) { setEmail(""); setAttendantId(""); }
      setMessage(success);
      return true;
    } catch (failure) { setError(getApiErrorMessage(failure, "Unable to update property access.")); return false; }
    finally { setBusy(false); }
  }
  return <section className="settings-appearance mb-8 rounded-2xl border border-line bg-white p-6" aria-labelledby="staff-access-heading">
    <div className="flex items-center justify-between gap-3"><h2 id="staff-access-heading" className="text-xl font-semibold">Access · {property.hotel_name}</h2>{onClose && <button aria-label="Close access panel" onClick={onClose}><X className="h-5 w-5" /></button>}</div>
    <p className="mt-3 text-sm text-slate-500">Owners and administrators manage staff access. Only the owner can appoint or remove administrators and change plan or trial settings.</p>
    <p className="mt-2 text-sm text-slate-500">Front Desk manages bookings, guest payments, housekeeping requests and attendant assignments, with read-only room/rate access. Only Owner/Admin can create attendants. General members retain other broad legacy access. Staff must register before you grant access.</p>
    <p className="mt-2 text-sm text-slate-500">Finance handles invoices, payments, purchases, expenses and financial reports, with read-only booking access and a separate review of completed Night Audits. Refund completion, credit issuance, withdrawals approval and posted-record voids require Owner/Admin.</p>
    <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={(event) => {
      event.preventDefault(); void change(() => addPropertyMember(property.property_id, email, role, role === "housekeeping" ? attendantId : undefined), "Property access granted.", true);
    }}>
      <label className="min-w-0 flex-1 text-sm font-medium"><span className="mb-2 block">Staff account email</span><input type="email" required maxLength={254} disabled={busy || loading} placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-lg border border-line bg-white px-3" /></label>
      <label className="text-sm font-medium"><span className="mb-2 block">Property role</span><select value={role} disabled={busy || loading} onChange={(event) => setRole(event.target.value as StaffRole)} className="h-11 rounded-lg border border-line bg-white px-3"><option value="front_desk">Front Desk</option><option value="housekeeping">Housekeeping</option><option value="finance">Finance</option><option value="member">General member (broad access)</option>{owner && <option value="administrator">Administrator</option>}</select></label>
      {role === "housekeeping" ? <label className="min-w-0 text-sm font-medium"><span className="mb-2 block">Linked attendant</span><select required aria-label="Linked attendant" value={attendantId} onChange={event => setAttendantId(event.target.value)} disabled={busy || attendantsLoading} className="h-11 max-w-full rounded-lg border border-line bg-white px-3"><option value="">Select active attendant</option>{attendantOptions().map(attendant => <option key={attendant._id} value={attendant._id}>{attendant.name} · {attendant.employee_number}</option>)}</select></label> : null}
      <button disabled={busy || loading} className="h-11 rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:opacity-50">Grant access</button>
    </form>
    {role === "housekeeping" ? <p className="mt-3 text-sm text-slate-500">Link the login to an active attendant from this property. Create the attendant in Housekeeping first. One attendant can be linked to only one login.</p> : null}
    {linkMember ? <form className="mt-4 space-y-3 rounded-lg border border-line p-4" onSubmit={event => { event.preventDefault(); void (async () => { if (await change(() => updatePropertyMemberRole(property.property_id, linkMember.id, "housekeeping", linkAttendantId), "Housekeeping role and attendant link saved.")) setLinkMember(null); })(); }}>
      <h3 className="font-semibold">Link Housekeeping access: {linkMember.name}</h3><label className="grid gap-2 text-sm">Attendant<select required value={linkAttendantId} onChange={event => setLinkAttendantId(event.target.value)} disabled={busy || attendantsLoading} className="h-11 rounded-lg border border-line bg-white px-3"><option value="">Select active attendant</option>{attendantOptions(linkMember.id).map(attendant => <option key={attendant._id} value={attendant._id}>{attendant.name} · {attendant.employee_number}</option>)}</select></label><div className="flex gap-3"><button type="button" disabled={busy} onClick={() => setLinkMember(null)} className="rounded border border-line px-3 py-2">Cancel</button><button disabled={busy || attendantsLoading} className="rounded bg-blue-600 px-3 py-2 font-semibold text-white">Save Housekeeping access</button></div>
    </form> : null}
    {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-emerald-600">{message}</p>}
    {loading ? <p className="mt-4 text-sm text-slate-500">Loading access…</p> : <ul className="mt-5 divide-y divide-slate-100">{members.map((member) => <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0"><p className="break-words text-sm font-semibold">{member.name} <span className="font-normal text-slate-500">({propertyRoleLabel(member.role)})</span></p><p className="break-all text-sm text-slate-500">{member.email}</p></div>
      <div className="flex flex-wrap items-center gap-3">
        {member.role !== "owner" && (owner || member.role !== "administrator") && <label><span className="sr-only">Role for {member.name}</span><select aria-label={`Role for ${member.name}`} disabled={busy} value={member.role} onChange={(event) => { const next = event.target.value as StaffRole; if (next === "housekeeping") editLink(member); else void change(() => updatePropertyMemberRole(property.property_id, member.id, next), "Property role updated."); }} className="h-10 rounded-lg border border-line bg-white px-2 text-sm"><option value="front_desk">Front Desk</option><option value="housekeeping">Housekeeping</option><option value="finance">Finance</option><option value="member">General member (broad access)</option>{owner && <option value="administrator">Administrator</option>}</select></label>}
        {member.role === "front_desk" ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label={`Run Night Audit for ${member.name}`} disabled={busy} checked={member.run_night_audit === true} onChange={event => void change(() => updateNightAuditPermission(property.property_id, member.id, event.target.checked), "Night Audit permission updated. Ask the employee to refresh their workspace.")} />Run Night Audit</label> : null}
        {member.role === "housekeeping" ? <button type="button" disabled={busy} onClick={() => editLink(member)} className="text-sm font-semibold text-blue-600">Change linked attendant</button> : null}
        {(owner ? member.role !== "owner" : ["member", "front_desk", "housekeeping", "finance"].includes(member.role)) && <button disabled={busy} onClick={() => void change(() => removePropertyMember(property.property_id, member.id), "Property access removed.")} className="text-sm text-rose-600 disabled:opacity-50">Remove access</button>}
      </div>
    </li>)}</ul>}
  </section>;
}
