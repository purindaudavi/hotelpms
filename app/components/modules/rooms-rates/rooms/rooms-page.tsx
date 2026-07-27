"use client";

import type { Dispatch, SetStateAction } from "react";
import { FormEvent, useMemo, useState } from "react";
import { Check, Edit3, Grid3X3, ImageIcon, List, Plus, RotateCw, Trash2, X } from "lucide-react";
import type { Reservation, Room } from "@/app/data/pms-data";
import { createUuid } from "@/app/lib/record-ids";
import {
  addPhysicalRoom,
  createRoomType,
  deletePhysicalRoom,
  deleteRoomTypeImage,
  getRoomCatalog,
  getRoomsApiErrorMessage,
  setRoomTypeActive,
  updatePhysicalRoom,
  updateRoomType,
  uploadRoomTypeImage
} from "@/app/lib/rooms-api";
import { amenityGroups, roomTypeImageGradients } from "../constants";
import type { RoomTypeImage, RoomTypeRecord, RoomsRatesModuleProps } from "../types";
import { roomTypeSearch } from "../utils";
import {
  Drawer,
  Field,
  IconButton,
  Panel,
  RoomsRatesFrame,
  SearchInput,
  SegmentedTabs,
  SelectInput,
  TextInput,
  ToolbarButton
} from "../components/rooms-rates-ui";

type RoomsPageProps = RoomsRatesModuleProps & {
  roomTypes: RoomTypeRecord[];
  setRoomTypes: Dispatch<SetStateAction<RoomTypeRecord[]>>;
};

type RoomDrawerTab = "details" | "amenities" | "images" | "rooms";
type PhysicalRoomDraft = Pick<Room, "code" | "type" | "floor" | "status">;

const operationalStatuses: Array<Room["status"]> = ["Available", "Out of Order", "Maintenance"];
const MAX_ROOM_TYPE_IMAGES = 8;
const MAX_IMAGE_BYTES = 5_000_000;

export function RoomsPage({ propertyId, roomTypes, setRoomTypes, reservations, roomList, setRoomList, setToast }: RoomsPageProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [roomListOpen, setRoomListOpen] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomTypeRecord | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const configuredRoomTypes = useMemo(() => synchronizeRoomTypeRooms(roomTypes, roomList), [roomList, roomTypes]);
  const filtered = useMemo(
    () => configuredRoomTypes.filter((type) => type.active && roomTypeSearch(type, search)),
    [configuredRoomTypes, search]
  );

  async function refreshCatalog(showToast = false) {
    const catalog = await getRoomCatalog(propertyId);
    setRoomTypes(catalog.roomTypes);
    setRoomList(catalog.rooms);
    if (showToast) setToast("Rooms refreshed from MongoDB");
    return catalog;
  }

  async function handleRefresh() {
    setSyncing(true);
    try {
      await refreshCatalog(true);
    } catch (error) {
      setToast(getRoomsApiErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function saveRoomType(roomType: RoomTypeRecord) {
    const name = roomType.name.trim();
    if (!name) return "Room type name is required.";

    const existing = roomTypes.find((item) => item.id === roomType.id);
    if (roomTypes.some((item) => item.id !== roomType.id && item.name.toLowerCase() === name.toLowerCase())) {
      return "A room type with this name already exists.";
    }
    if (existing && existing.name !== name) return "Room type names are permanent after creation. Create a new type instead.";

    const requestedCodes = Array.from(new Set(roomType.rooms.map((code) => code.trim()).filter(Boolean)));
    const currentRooms = existing ? roomList.filter((room) => room.type === existing.name) : [];
    const conflict = requestedCodes.find((code) => {
      const configured = roomList.find((room) => room.code.toLowerCase() === code.toLowerCase());
      return configured && configured.type !== existing?.name;
    });
    if (conflict) return `Room ${conflict} already belongs to another room type.`;

    const removedRooms = currentRooms.filter((room) => !requestedCodes.includes(room.code));
    const protectedRoom = removedRooms.find((room) => room.status === "Occupied" || roomIsReferenced(room.code, reservations));
    if (protectedRoom) return `Room ${protectedRoom.code} cannot be removed because it is occupied or has reservation history.`;

    setSyncing(true);
    try {
      let roomTypeId: string;
      if (existing) {
        await updateRoomType(propertyId, { ...roomType, name, rooms: requestedCodes });
        roomTypeId = existing.id;

        for (const room of removedRooms) {
          await deletePhysicalRoom(propertyId, roomTypeId, room.id);
        }
        for (const code of requestedCodes) {
          if (currentRooms.some((room) => room.code.toLowerCase() === code.toLowerCase())) continue;
          await addPhysicalRoom(propertyId, roomTypeId, {
            code,
            floor: "Unassigned",
            status: "Available",
            housekeeping: "Clean"
          });
        }

        const retainedImageIds = new Set(roomType.images.map((image) => image.id));
        for (const image of existing.images) {
          if (!retainedImageIds.has(image.id)) {
            await deleteRoomTypeImage(propertyId, roomTypeId, image.id);
          }
        }
      } else {
        const created = await createRoomType(propertyId, {
          ...roomType,
          name,
          rooms: requestedCodes,
          images: []
        });
        roomTypeId = created._id;
      }

      const existingImageIds = new Set(existing?.images.map((image) => image.id) ?? []);
      for (const image of roomType.images) {
        if (!existingImageIds.has(image.id) && image.dataUrl.startsWith("data:")) {
          await uploadRoomTypeImage(propertyId, roomTypeId, image);
        }
      }

      await refreshCatalog();
      setAddOpen(false);
      setEditingRoomType(null);
      setToast(`${name} saved to MongoDB`);
      return "";
    } catch (error) {
      return getRoomsApiErrorMessage(error);
    } finally {
      setSyncing(false);
    }
  }

  async function savePhysicalRoom(draft: PhysicalRoomDraft, roomId?: string) {
    const code = draft.code.trim();
    if (!code) return "Room number is required.";
    if (!configuredRoomTypes.some((type) => type.name === draft.type && type.active)) return "Select an active room type.";

    const existing = roomId ? roomList.find((room) => room.id === roomId) : undefined;
    if (roomList.some((room) => room.id !== roomId && room.code.toLowerCase() === code.toLowerCase())) {
      return `Room number ${code} already exists.`;
    }
    if (existing?.status === "Occupied" && (draft.type !== existing.type || draft.status !== "Occupied")) {
      return `Room ${existing.code} is occupied. Check out the guest before changing its type or status.`;
    }
    if (existing && existing.type !== draft.type && roomIsReferenced(existing.code, reservations)) {
      return `Room ${existing.code} has reservation history, so its room type cannot be changed.`;
    }

    const targetType = configuredRoomTypes.find((type) => type.name === draft.type);
    const currentType = existing
      ? configuredRoomTypes.find((type) => type.name === existing.type)
      : undefined;
    if (!targetType) return "Select an active room type.";
    if (existing && !currentType) return "The room's current room type could not be found.";

    setSyncing(true);
    try {
      if (!existing) {
        await addPhysicalRoom(propertyId, targetType.id, {
          ...draft,
          code,
          housekeeping: "Clean"
        });
      } else if (currentType?.id === targetType.id) {
        await updatePhysicalRoom(propertyId, targetType.id, existing.id, {
          ...draft,
          code,
          housekeeping: existing.housekeeping
        });
      } else {
        await deletePhysicalRoom(propertyId, currentType!.id, existing.id);
        await addPhysicalRoom(propertyId, targetType.id, {
          ...draft,
          code,
          housekeeping: existing.housekeeping
        });
      }

      await refreshCatalog();
      setToast(`Room ${code} ${existing ? "updated" : "added"} in MongoDB`);
      return "";
    } catch (error) {
      return getRoomsApiErrorMessage(error);
    } finally {
      setSyncing(false);
    }
  }

  async function removePhysicalRoom(room: Room) {
    if (room.status === "Occupied") {
      setToast(`Room ${room.code} is occupied and cannot be removed`);
      return;
    }
    if (roomIsReferenced(room.code, reservations)) {
      setToast(`Room ${room.code} has reservation history and cannot be removed`);
      return;
    }
    if (!window.confirm(`Remove physical room ${room.code}?`)) return;
    const roomType = configuredRoomTypes.find((type) => type.name === room.type);
    if (!roomType) {
      setToast("The room type could not be found");
      return;
    }
    setSyncing(true);
    try {
      await deletePhysicalRoom(propertyId, roomType.id, room.id);
      await refreshCatalog();
      setToast(`Room ${room.code} removed from MongoDB`);
    } catch (error) {
      setToast(getRoomsApiErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  async function disableRoomType(roomType: RoomTypeRecord) {
    if (roomList.some((room) => room.type === roomType.name)) {
      setToast("Reassign or remove this type's physical rooms before disabling it");
      return;
    }
    setSyncing(true);
    try {
      await setRoomTypeActive(propertyId, roomType.id, false);
      await refreshCatalog();
      setToast("Room type disabled in MongoDB");
    } catch (error) {
      setToast(getRoomsApiErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <RoomsRatesFrame>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rooms & Room Types</h1>
          <p className="mt-1 text-sm text-slate-500">Room types hold shared details, amenities and images. Physical rooms hold operational status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToolbarButton disabled={syncing} icon={<RotateCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />} onClick={() => void handleRefresh()}>Refresh</ToolbarButton>
          <ToolbarButton tone="dark" onClick={() => setRoomListOpen(true)}>Physical Room List</ToolbarButton>
          <ToolbarButton tone="dark" icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>Add Room Type</ToolbarButton>
        </div>
      </div>

      <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search room types, rooms or amenities..." />

      <Panel
        title="Room Types"
        subtitle={`${filtered.length} active room type${filtered.length === 1 ? "" : "s"}`}
        action={
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            <IconButton label="Grid view" active={view === "grid"} onClick={() => setView("grid")}><Grid3X3 className="h-4 w-4" /></IconButton>
            <IconButton label="List view" active={view === "list"} onClick={() => setView("list")}><List className="h-4 w-4" /></IconButton>
          </div>
        }
      >
        {view === "grid" ? (
          <div className="grid gap-6 xl:grid-cols-3">
            {filtered.map((type) => (
              <RoomTypeCard key={type.id} roomType={type} onEdit={() => setEditingRoomType(type)} onDisable={() => void disableRoomType(type)} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b border-line text-slate-500">
                <tr>
                  {["Room Type", "Physical Rooms", "Max Adults", "Max Children", "Base Rate", "Images", "Amenities", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((type) => (
                  <tr key={type.id} className="border-b border-line">
                    <td className="px-4 py-3 font-semibold">{type.name}</td>
                    <td className="px-4 py-3">{type.rooms.length ? type.rooms.join(", ") : "None"}</td>
                    <td className="px-4 py-3">{type.maxAdults}</td>
                    <td className="px-4 py-3">{type.maxChildren}</td>
                    <td className="px-4 py-3">{type.baseRate.toLocaleString()}</td>
                    <td className="px-4 py-3">{type.images.length}</td>
                    <td className="px-4 py-3">{type.amenities.slice(0, 4).join(", ") || "None"}</td>
                    <td className="px-4 py-3"><ToolbarButton tone="dark" onClick={() => setEditingRoomType(type)}>Edit</ToolbarButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!filtered.length ? <div className="py-12 text-center text-sm text-slate-500">No active room types match this search.</div> : null}
      </Panel>

      {roomListOpen ? (
        <RoomListDrawer
          roomList={roomList}
          roomTypes={configuredRoomTypes}
          onClose={() => setRoomListOpen(false)}
          onSave={savePhysicalRoom}
          onRemove={removePhysicalRoom}
        />
      ) : null}

      {addOpen ? <RoomTypeDrawer mode="add" roomType={null} roomTypes={configuredRoomTypes} onClose={() => setAddOpen(false)} onSave={saveRoomType} /> : null}
      {editingRoomType ? <RoomTypeDrawer mode="edit" roomType={editingRoomType} roomTypes={configuredRoomTypes} onClose={() => setEditingRoomType(null)} onSave={saveRoomType} /> : null}
    </RoomsRatesFrame>
  );
}

function RoomTypeCard({ roomType, onEdit, onDisable }: { roomType: RoomTypeRecord; onEdit: () => void; onDisable: () => void }) {
  const cover = roomType.images[0]?.dataUrl;
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="h-56 bg-cover bg-center" style={{ backgroundImage: cover ? `url("${cover}")` : roomType.imageGradient }}>
        {!cover ? <div className="flex h-full items-center justify-center bg-slate-950/10"><ImageIcon className="h-10 w-10 text-white/80" /></div> : null}
      </div>
      <div className="space-y-3 p-6">
        <h2 className="text-xl font-semibold">{roomType.name}</h2>
        <div className="space-y-1 text-sm text-slate-600">
          <p><span className="font-semibold">Physical rooms:</span> {roomType.rooms.length || 0}</p>
          <p><span className="font-semibold">Capacity:</span> {roomType.maxAdults} adults, {roomType.maxChildren} children</p>
          <p><span className="font-semibold">Rooms:</span> {roomType.rooms.join(", ") || "Not assigned"}</p>
          <p><span className="font-semibold">Shared images:</span> {roomType.images.length}</p>
          <p><span className="font-semibold">Amenities:</span> {roomType.amenities.join(", ") || "None"}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <ToolbarButton tone="dark" onClick={onEdit}>Edit Room Type</ToolbarButton>
          <ToolbarButton onClick={onDisable}>Disable</ToolbarButton>
        </div>
      </div>
    </section>
  );
}

function RoomListDrawer({
  roomList,
  roomTypes,
  onClose,
  onSave,
  onRemove
}: {
  roomList: Room[];
  roomTypes: RoomTypeRecord[];
  onClose: () => void;
  onSave: (draft: PhysicalRoomDraft, roomId?: string) => Promise<string>;
  onRemove: (room: Room) => Promise<void>;
}) {
  const activeRoomTypes = roomTypes.filter((type) => type.active);
  const emptyDraft = (): PhysicalRoomDraft => ({
    code: "",
    type: activeRoomTypes[0]?.name ?? "",
    floor: "Unassigned",
    status: "Available"
  });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<PhysicalRoomDraft>(emptyDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(room: Room) {
    setAdding(false);
    setEditingRoomId(room.id);
    setDraft({ code: room.code, type: room.type, floor: room.floor, status: room.status });
    setError("");
  }

  function startAdd() {
    setEditingRoomId(null);
    setAdding(true);
    setDraft(emptyDraft());
    setError("");
  }

  async function save(roomId?: string) {
    setSaving(true);
    try {
      const message = await onSave(draft, roomId);
      if (message) { setError(message); return; }
      setAdding(false);
      setEditingRoomId(null);
      setError("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer title="Physical Room List" subtitle="Configure room numbers and types. Occupancy and cleaning states are controlled by Front Desk and Housekeeping." onClose={onClose} width="max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{roomList.length} physical rooms configured</p>
        <ToolbarButton tone="dark" icon={<Plus className="h-4 w-4" />} onClick={startAdd}>Add Physical Room</ToolbarButton>
      </div>
      {error ? <div role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-4 font-semibold">Room Number</th>
              <th className="px-4 py-4 font-semibold">Room Type</th>
              <th className="px-4 py-4 font-semibold">Floor</th>
              <th className="px-4 py-4 font-semibold">Operational Status</th>
              <th className="px-4 py-4 font-semibold">Housekeeping</th>
              <th className="px-4 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {adding ? (
              <tr className="border-t border-line bg-emerald-50/40">
                <td className="px-4 py-3"><TextInput autoFocus value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} placeholder="e.g. 16" /></td>
                <td className="px-4 py-3"><RoomTypeSelect value={draft.type} roomTypes={activeRoomTypes} onChange={(type) => setDraft((current) => ({ ...current, type }))} /></td>
                <td className="px-4 py-3"><TextInput value={draft.floor} onChange={(event) => setDraft((current) => ({ ...current, floor: event.target.value }))} /></td>
                <td className="px-4 py-3"><OperationalStatusSelect value={draft.status} onChange={(status) => setDraft((current) => ({ ...current, status }))} /></td>
                <td className="px-4 py-3"><RoomStateBadge value="Clean" /></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2"><ToolbarButton disabled={saving} tone="dark" onClick={() => void save()}>{saving ? "Saving..." : "Save"}</ToolbarButton><ToolbarButton disabled={saving} onClick={() => setAdding(false)}>Cancel</ToolbarButton></div></td>
              </tr>
            ) : null}
            {sortRooms(roomList).map((room) => {
              const editing = editingRoomId === room.id;
              return (
                <tr key={room.id} className="border-t border-line">
                  <td className="px-4 py-4 text-base font-semibold">{room.code}</td>
                  <td className="px-4 py-4">
                    {editing ? <RoomTypeSelect disabled={room.status === "Occupied"} value={draft.type} roomTypes={activeRoomTypes} onChange={(type) => setDraft((current) => ({ ...current, type }))} /> : room.type}
                  </td>
                  <td className="px-4 py-4">{editing ? <TextInput value={draft.floor} onChange={(event) => setDraft((current) => ({ ...current, floor: event.target.value }))} /> : room.floor}</td>
                  <td className="px-4 py-4">{editing ? <OperationalStatusSelect disabled={room.status === "Occupied"} value={draft.status} includeOccupied={room.status === "Occupied"} onChange={(status) => setDraft((current) => ({ ...current, status }))} /> : <RoomStateBadge value={room.status} />}</td>
                  <td className="px-4 py-4"><RoomStateBadge value={room.housekeeping} /></td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      {editing ? (
                        <><ToolbarButton disabled={saving} tone="dark" onClick={() => void save(room.id)}>{saving ? "Saving..." : "Save"}</ToolbarButton><ToolbarButton disabled={saving} onClick={() => setEditingRoomId(null)}>Cancel</ToolbarButton></>
                      ) : (
                        <><ToolbarButton icon={<Edit3 className="h-4 w-4" />} tone="muted" onClick={() => startEdit(room)}>Edit</ToolbarButton><ToolbarButton icon={<Trash2 className="h-4 w-4" />} tone="danger" onClick={() => void onRemove(room)}>Remove</ToolbarButton></>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Drawer>
  );
}

function RoomTypeSelect({ value, roomTypes, onChange, disabled = false }: { value: string; roomTypes: RoomTypeRecord[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <SelectInput disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>{roomTypes.map((type) => <option key={type.id}>{type.name}</option>)}</SelectInput>;
}

function OperationalStatusSelect({ value, onChange, disabled = false, includeOccupied = false }: { value: Room["status"]; onChange: (value: Room["status"]) => void; disabled?: boolean; includeOccupied?: boolean }) {
  const options = includeOccupied ? ["Occupied" as const, ...operationalStatuses] : operationalStatuses;
  return <SelectInput disabled={disabled} value={value} onChange={(event) => onChange(event.target.value as Room["status"])}>{options.map((status) => <option key={status}>{status}</option>)}</SelectInput>;
}

function RoomStateBadge({ value }: { value: Room["status"] | Room["housekeeping"] }) {
  const tone = value === "Clean" || value === "Available"
    ? "bg-emerald-100 text-emerald-700"
    : value === "Dirty"
      ? "bg-rose-100 text-rose-700"
      : value === "WIP"
        ? "bg-blue-100 text-blue-700"
        : "bg-amber-100 text-amber-700";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{value}</span>;
}

function RoomTypeDrawer({
  mode,
  roomType,
  roomTypes,
  onClose,
  onSave
}: {
  mode: "add" | "edit";
  roomType: RoomTypeRecord | null;
  roomTypes: RoomTypeRecord[];
  onClose: () => void;
  onSave: (roomType: RoomTypeRecord) => Promise<string>;
}) {
  const [tab, setTab] = useState<RoomDrawerTab>("details");
  const [form, setForm] = useState<RoomTypeRecord>(() => roomType ? { ...roomType, images: roomType.images ?? [] } : {
    id: `room-type-${Date.now()}`,
    name: "",
    rooms: [],
    maxAdults: 2,
    maxChildren: 0,
    amenities: ["Air Conditioner", "Fan"],
    description: "",
    baseRate: 6500,
    imageGradient: roomTypeImageGradients[0],
    images: [],
    active: true
  });
  const [newRoom, setNewRoom] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof RoomTypeRecord>(key: K, value: RoomTypeRecord[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function cloneExisting(existingName: string) {
    const existing = roomTypes.find((type) => type.name === existingName);
    if (!existing) return;
    setForm({
      ...existing,
      id: `room-type-${Date.now()}`,
      name: `${existing.name} Copy`,
      rooms: [],
      images: [],
      active: true
    });
  }

  function toggleAmenity(amenity: string) {
    update("amenities", form.amenities.includes(amenity) ? form.amenities.filter((item) => item !== amenity) : [...form.amenities, amenity]);
  }

  function addRoomNumber() {
    const value = newRoom.trim();
    if (!value) return;
    if (form.rooms.some((room) => room.toLowerCase() === value.toLowerCase())) { setError(`Room ${value} is already in this type.`); return; }
    update("rooms", [...form.rooms, value].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
    setNewRoom("");
    setError("");
  }

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    const remaining = MAX_ROOM_TYPE_IMAGES - form.images.length;
    if (remaining <= 0) { setError(`A room type can have up to ${MAX_ROOM_TYPE_IMAGES} shared images.`); return; }
    const selected = Array.from(files).slice(0, remaining);
    const tooLarge = selected.find((file) => file.size > MAX_IMAGE_BYTES);
    if (tooLarge) { setError(`${tooLarge.name} is too large. Use images smaller than 5 MB.`); return; }
    try {
      const images = await Promise.all(selected.map(async (file): Promise<RoomTypeImage> => ({
        id: createUuid(),
        name: file.name,
        dataUrl: await readFileAsDataUrl(file)
      })));
      update("images", [...form.images, ...images]);
      setError("");
    } catch {
      setError("One or more images could not be read.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) { setError("Room type name is required."); setTab("details"); return; }
    if (form.maxAdults < 1) { setError("Adult capacity must be at least one."); setTab("details"); return; }
    setSaving(true);
    try {
      const message = await onSave({ ...form, name: form.name.trim(), imageGradient: form.imageGradient || roomTypeImageGradients[0] });
      if (message) setError(message);
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { label: "Details", value: "details" as const },
    { label: "Amenities", value: "amenities" as const },
    { label: "Shared Images", value: "images" as const },
    { label: "Physical Rooms", value: "rooms" as const }
  ];

  return (
    <Drawer title={mode === "add" ? "Add Room Type" : "Edit Room Type"} subtitle="Details, amenities and images apply to every physical room assigned to this type." onClose={onClose} width="max-w-4xl">
      <form onSubmit={submit} className="space-y-6">
        <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} className="w-full" />
        {error ? <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        {tab === "details" ? (
          <div className="space-y-4">
            {mode === "add" ? <Field label="Copy Existing Room Type"><SelectInput defaultValue="" onChange={(event) => cloneExisting(event.target.value)}><option value="">Start from blank</option>{roomTypes.map((type) => <option key={type.id}>{type.name}</option>)}</SelectInput></Field> : null}
            <Field label="Room Type Name">
              <TextInput disabled={mode === "edit"} value={form.name} onChange={(event) => update("name", event.target.value)} />
            </Field>
            {mode === "edit" ? <p className="text-xs text-slate-500">The name is locked because reservations and rate plans reference it.</p> : null}
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Maximum Adults"><TextInput type="number" min={1} value={form.maxAdults} onChange={(event) => update("maxAdults", Number(event.target.value))} /></Field>
              <Field label="Maximum Children"><TextInput type="number" min={0} value={form.maxChildren} onChange={(event) => update("maxChildren", Number(event.target.value))} /></Field>
              <Field label="Base Rate"><TextInput type="number" min={0} value={form.baseRate} onChange={(event) => update("baseRate", Number(event.target.value))} /></Field>
            </div>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Description</span><textarea value={form.description} onChange={(event) => update("description", event.target.value)} className="min-h-28 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-slate-500" /></label>
          </div>
        ) : null}

        {tab === "amenities" ? (
          <div className="space-y-6">
            {amenityGroups.map((group) => (
              <section key={group.title}>
                <h3 className="mb-3 text-lg font-semibold">{group.title}</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {group.items.map((amenity) => {
                    const selected = form.amenities.includes(amenity);
                    return <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)} className={`flex items-center gap-3 rounded-md border px-4 py-3 text-left text-sm font-semibold ${selected ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-line bg-white text-slate-700"}`}><span className={`grid h-5 w-5 place-items-center rounded border ${selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>{selected ? <Check className="h-3.5 w-3.5" /> : ""}</span>{amenity}</button>;
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {tab === "images" ? (
          <div className="space-y-4">
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">These images belong to the room type and are reused by every physical room in it. Maximum {MAX_ROOM_TYPE_IMAGES} images, 5 MB each.</div>
            <Field label="Add shared room-type images"><TextInput type="file" multiple accept="image/*" onChange={(event) => void addImages(event.target.files)} /></Field>
            <div className="grid gap-3 md:grid-cols-2">
              {form.images.map((image, index) => (
                <figure key={image.id} className="relative overflow-hidden rounded-lg border border-line bg-slate-50">
                  <img src={image.dataUrl} alt={`${form.name || "Room type"} image ${index + 1}`} className="h-48 w-full object-cover" />
                  <figcaption className="truncate px-3 py-2 text-xs text-slate-600">{image.name}</figcaption>
                  <button type="button" aria-label={`Remove ${image.name}`} onClick={() => update("images", form.images.filter((item) => item.id !== image.id))} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-rose-600 shadow"><X className="h-4 w-4" /></button>
                </figure>
              ))}
            </div>
            {!form.images.length ? <div className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-slate-500">No shared images uploaded. The room-type placeholder will be used.</div> : null}
          </div>
        ) : null}

        {tab === "rooms" ? (
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Add physical room numbers that belong to this type. New rooms start as Available and Clean; set their floor from the Physical Room List.</div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]"><TextInput value={newRoom} onChange={(event) => setNewRoom(event.target.value)} placeholder="Room number, e.g. 16" /><ToolbarButton type="button" tone="dark" onClick={addRoomNumber}>Add room</ToolbarButton></div>
            <div className="flex flex-wrap gap-2">
              {form.rooms.map((room) => <button key={room} type="button" title="Remove from this room type" onClick={() => update("rooms", form.rooms.filter((item) => item !== room))} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">{room} ×</button>)}
            </div>
            {!form.rooms.length ? <p className="text-sm text-slate-500">No physical rooms assigned yet. You may save the type first and add rooms later.</p> : null}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 border-t border-line pt-5"><ToolbarButton disabled={saving} type="button" onClick={onClose}>Cancel</ToolbarButton><ToolbarButton disabled={saving} type="submit" tone="dark">{saving ? "Saving..." : "Save Room Type"}</ToolbarButton></div>
      </form>
    </Drawer>
  );
}

function synchronizeRoomTypeRooms(roomTypes: RoomTypeRecord[], roomList: Room[]) {
  return roomTypes.map((type) => ({
    ...type,
    images: type.images ?? [],
    rooms: roomList.filter((room) => room.type === type.name).map((room) => room.code).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }));
}

function roomIsReferenced(roomCode: string, reservations: Reservation[]) {
  return reservations.some((reservation) =>
    reservation.room === roomCode || reservation.reservationRooms?.some((room) => room.roomNumber === roomCode)
  );
}

function sortRooms(rooms: Room[]) {
  return [...rooms].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image could not be read"));
    reader.onerror = () => reject(reader.error ?? new Error("Image could not be read"));
    reader.readAsDataURL(file);
  });
}
