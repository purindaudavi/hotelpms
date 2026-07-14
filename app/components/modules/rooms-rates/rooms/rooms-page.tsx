"use client";

import type { Dispatch, SetStateAction } from "react";
import { FormEvent, useMemo, useState } from "react";
import { Check, Edit3, Grid3X3, List, Plus } from "lucide-react";
import type { Room } from "@/app/data/pms-data";
import { amenityGroups, roomTypeImageGradients } from "../constants";
import type { RoomTypeRecord, RoomsRatesModuleProps } from "../types";
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

export function RoomsPage({ roomTypes, setRoomTypes, roomList, setRoomList, setToast }: RoomsPageProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [roomListOpen, setRoomListOpen] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomTypeRecord | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => roomTypes.filter((type) => type.active && roomTypeSearch(type, search)), [roomTypes, search]);

  function saveRoomType(roomType: RoomTypeRecord) {
    setRoomTypes((current) => {
      if (current.some((item) => item.id === roomType.id)) return current.map((item) => (item.id === roomType.id ? roomType : item));
      return [roomType, ...current];
    });
    setAddOpen(false);
    setEditingRoomType(null);
    setToast(`${roomType.name} saved`);
  }

  function disableRoomType(id: string) {
    setRoomTypes((current) => current.map((item) => (item.id === id ? { ...item, active: false } : item)));
    setToast("Room type disabled");
  }

  return (
    <RoomsRatesFrame>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Room Types</h1>
        <div className="flex flex-wrap gap-2">
          <ToolbarButton tone="dark" onClick={() => setRoomListOpen(true)}>
            Room List
          </ToolbarButton>
          <ToolbarButton tone="dark" icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
            Add Room Type
          </ToolbarButton>
        </div>
      </div>

      <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." />

      <Panel
        title="Room Types"
        action={
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            <IconButton label="Grid view" active={view === "grid"} onClick={() => setView("grid")}>
              <Grid3X3 className="h-4 w-4" />
            </IconButton>
            <IconButton label="List view" active={view === "list"} onClick={() => setView("list")}>
              <List className="h-4 w-4" />
            </IconButton>
          </div>
        }
      >
        {view === "grid" ? (
          <div className="grid gap-6 xl:grid-cols-3">
            {filtered.map((type) => (
              <RoomTypeCard key={type.id} roomType={type} onEdit={() => setEditingRoomType(type)} onDisable={() => disableRoomType(type.id)} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-sm">
              <thead className="border-b border-line text-slate-500">
                <tr>
                  {["Room Type", "Rooms", "Max Adults", "Max Children", "Base Rate", "Amenities", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((type) => (
                  <tr key={type.id} className="border-b border-line">
                    <td className="px-4 py-3 font-semibold">{type.name}</td>
                    <td className="px-4 py-3">{type.rooms.join(", ")}</td>
                    <td className="px-4 py-3">{type.maxAdults}</td>
                    <td className="px-4 py-3">{type.maxChildren}</td>
                    <td className="px-4 py-3">{type.baseRate.toLocaleString()}</td>
                    <td className="px-4 py-3">{type.amenities.slice(0, 5).join(", ")}</td>
                    <td className="px-4 py-3">
                      <ToolbarButton tone="dark" onClick={() => setEditingRoomType(type)}>Edit</ToolbarButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {roomListOpen ? (
        <RoomListDrawer roomList={roomList} setRoomList={setRoomList} roomTypes={roomTypes} onClose={() => setRoomListOpen(false)} setToast={setToast} />
      ) : null}

      {addOpen ? (
        <RoomTypeDrawer
          mode="add"
          roomType={null}
          roomTypes={roomTypes}
          onClose={() => setAddOpen(false)}
          onSave={saveRoomType}
        />
      ) : null}

      {editingRoomType ? (
        <RoomTypeDrawer
          mode="edit"
          roomType={editingRoomType}
          roomTypes={roomTypes}
          onClose={() => setEditingRoomType(null)}
          onSave={saveRoomType}
        />
      ) : null}
    </RoomsRatesFrame>
  );
}

function RoomTypeCard({ roomType, onEdit, onDisable }: { roomType: RoomTypeRecord; onEdit: () => void; onDisable: () => void }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="h-56 bg-cover bg-center" style={{ backgroundImage: roomType.imageGradient }} />
      <div className="space-y-3 p-6">
        <h2 className="text-xl font-semibold">{roomType.name}</h2>
        <div className="space-y-1 text-sm text-slate-600">
          <p><span className="font-semibold">No of rooms:</span> {roomType.rooms.length}</p>
          <p><span className="font-semibold">Max Adults:</span> {roomType.maxAdults}</p>
          <p><span className="font-semibold">Max Children:</span> {roomType.maxChildren}</p>
          <p><span className="font-semibold">Rooms:</span> {roomType.rooms.join(", ")}</p>
          <p><span className="font-semibold">Amenities:</span> {roomType.amenities.join(", ")}</p>
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
  setRoomList,
  roomTypes,
  onClose,
  setToast
}: {
  roomList: Room[];
  setRoomList: Dispatch<SetStateAction<Room[]>>;
  roomTypes: RoomTypeRecord[];
  onClose: () => void;
  setToast: (message: string) => void;
}) {
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [draftTypes, setDraftTypes] = useState<Record<string, string>>(() =>
    roomList.reduce<Record<string, string>>((acc, room) => {
      acc[room.id] = room.type;
      return acc;
    }, {})
  );

  function saveRoom(room: Room) {
    setRoomList((current) => current.map((item) => (item.id === room.id ? { ...item, type: draftTypes[room.id] ?? item.type } : item)));
    setEditingRoom(null);
    setToast(`Room ${room.code} updated`);
  }

  return (
    <Drawer title="Room List" subtitle="View & edit room numbers inline." onClose={onClose} width="max-w-4xl">
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-4 font-semibold">Room Number</th>
              <th className="px-5 py-4 font-semibold">Room Type</th>
              <th className="px-5 py-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {roomList
              .slice()
              .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
              .map((room) => {
                const isEditing = editingRoom === room.id;
                return (
                  <tr key={room.id} className="border-t border-line">
                    <td className="px-5 py-4 text-base font-semibold">{room.code}</td>
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <SelectInput value={draftTypes[room.id] ?? room.type} onChange={(event) => setDraftTypes((current) => ({ ...current, [room.id]: event.target.value }))}>
                          {roomTypes.map((type) => (
                            <option key={type.id}>{type.name}</option>
                          ))}
                        </SelectInput>
                      ) : (
                        <span className="rounded-lg border border-line px-4 py-2 font-semibold">{room.type}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ToolbarButton icon={<Edit3 className="h-4 w-4" />} tone="muted" onClick={() => (isEditing ? saveRoom(room) : setEditingRoom(room.id))}>
                        {isEditing ? "Save" : "Edit"}
                      </ToolbarButton>
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
  onSave: (roomType: RoomTypeRecord) => void;
}) {
  const [tab, setTab] = useState<RoomDrawerTab>("details");
  const [form, setForm] = useState<RoomTypeRecord>(
    roomType ?? {
      id: `room-type-${Date.now()}`,
      name: "",
      rooms: [],
      maxAdults: 2,
      maxChildren: 0,
      amenities: ["Air Conditioner", "Fan"],
      description: "",
      baseRate: 6500,
      imageGradient: roomTypeImageGradients[0],
      imageNames: [],
      active: true
    }
  );
  const [newRoom, setNewRoom] = useState("");

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
      imageNames: existing.imageNames
    });
  }

  function toggleAmenity(amenity: string) {
    update("amenities", form.amenities.includes(amenity) ? form.amenities.filter((item) => item !== amenity) : [...form.amenities, amenity]);
  }

  function addRoomNumber() {
    const value = newRoom.trim();
    if (!value || form.rooms.includes(value)) return;
    update("rooms", [...form.rooms, value].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
    setNewRoom("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      ...form,
      name: form.name.trim() || "New Room Type",
      imageGradient: form.imageGradient || roomTypeImageGradients[0]
    });
  }

  const tabs =
    mode === "add"
      ? [
          { label: "Details", value: "details" as const },
          { label: "Amenities", value: "amenities" as const },
          { label: "Images", value: "images" as const },
          { label: "Rooms", value: "rooms" as const }
        ]
      : [
          { label: "Room Details", value: "details" as const },
          { label: "Amenities", value: "amenities" as const },
          { label: "Room Images", value: "images" as const },
          { label: "Number of Rooms", value: "rooms" as const }
        ];

  return (
    <Drawer
      title={mode === "add" ? "Add Room Type" : "Edit Room Type"}
      subtitle={mode === "add" ? "Enter room type details to create a new room type" : "Modify fields or delete this room type."}
      onClose={onClose}
      width="max-w-4xl"
    >
      <form onSubmit={submit} className="space-y-6">
        <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} className="w-full" />

        {tab === "details" ? (
          <div className="space-y-4">
            {mode === "add" ? (
              <Field label="Select Existing Room Type">
                <SelectInput defaultValue="" onChange={(event) => cloneExisting(event.target.value)}>
                  <option value="">Select a room type</option>
                  {roomTypes.map((type) => (
                    <option key={type.id}>{type.name}</option>
                  ))}
                </SelectInput>
              </Field>
            ) : null}
            {mode === "add" ? <p className="text-sm text-slate-500">Or create a new room type below</p> : null}
            <Field label="Room Type">
              <TextInput value={form.name} onChange={(event) => update("name", event.target.value)} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Adult Space">
                <TextInput type="number" min={1} value={form.maxAdults} onChange={(event) => update("maxAdults", Number(event.target.value))} />
              </Field>
              <Field label="Child Space">
                <TextInput type="number" min={0} value={form.maxChildren} onChange={(event) => update("maxChildren", Number(event.target.value))} />
              </Field>
            </div>
            {mode === "edit" ? (
              <Field label="No of Rooms">
                <TextInput value={form.rooms.length} disabled className="bg-slate-100" />
              </Field>
            ) : null}
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                className="min-h-28 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>
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
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`flex items-center gap-3 rounded-md border px-4 py-3 text-left text-sm font-semibold ${
                          selected ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-line bg-white text-slate-700"
                        }`}
                      >
                        <span className={`grid h-5 w-5 place-items-center rounded border ${selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>
                          {selected ? <Check className="h-3.5 w-3.5" /> : ""}
                        </span>
                        {amenity}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {tab === "images" ? (
          <div className="space-y-4">
            <Field label="Upload room images">
              <TextInput
                type="file"
                multiple
                accept="image/*"
                onChange={(event) => {
                  const names = Array.from(event.target.files ?? []).map((file) => file.name);
                  if (names.length) update("imageNames", [...form.imageNames, ...names]);
                }}
              />
            </Field>
            <div className="grid gap-3 md:grid-cols-3">
              {roomTypeImageGradients.map((gradient, index) => (
                <button
                  key={gradient}
                  type="button"
                  onClick={() => update("imageGradient", gradient)}
                  className={`h-32 rounded-lg border bg-cover bg-center ${form.imageGradient === gradient ? "border-slate-950 ring-2 ring-slate-950" : "border-line"}`}
                  style={{ backgroundImage: gradient }}
                  title={`Image style ${index + 1}`}
                />
              ))}
            </div>
            <div className="rounded-lg border border-line bg-slate-50 p-4 text-sm text-slate-600">
              {form.imageNames.length ? form.imageNames.join(", ") : "No uploaded image names yet. Choose files to stage them for this room type."}
            </div>
          </div>
        ) : null}

        {tab === "rooms" ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <TextInput value={newRoom} onChange={(event) => setNewRoom(event.target.value)} placeholder="Room number, e.g. 16" />
              <ToolbarButton type="button" tone="dark" onClick={addRoomNumber}>Add room</ToolbarButton>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.rooms.map((room) => (
                <button
                  key={room}
                  type="button"
                  onClick={() => update("rooms", form.rooms.filter((item) => item !== room))}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  {room} x
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <ToolbarButton type="button" onClick={onClose}>Cancel</ToolbarButton>
          <ToolbarButton type="submit" tone="dark">Save Changes</ToolbarButton>
        </div>
      </form>
    </Drawer>
  );
}
