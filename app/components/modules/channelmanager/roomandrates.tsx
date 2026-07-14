"use client";

import { type ChangeEvent, type FormEvent, type ReactNode, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronsUpDown, Edit3, Eye, ImagePlus, PlusCircle, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import {
  type ChannelRoomPhoto,
  type ChannelRoomRecord,
  channelRoomRatesKey,
  initialChannelRooms
} from "@/app/components/modules/channelmanager/session";
import { property } from "@/app/data/pms-data";

type ChannelManagerRoomRatesPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

type RoomMode = "create" | "edit" | "view";
type RoomDrawerTab = "general" | "content";

type RoomForm = Omit<ChannelRoomRecord, "id" | "countOfRooms" | "adultSpaces" | "childrenSpaces" | "cotSpaces"> & {
  countOfRooms: string;
  adultSpaces: string;
  childrenSpaces: string;
  cotSpaces: string;
};

const roomTypeOptions = ["Room", "Apartment", "Dorm", "Villa", "Suite"];
const facilityOptions = [
  "Air Conditioner",
  "Fan",
  "Wardrobe",
  "King Bed",
  "Twin Bed",
  "City View",
  "Shower",
  "Hot Water",
  "Mini Fridge",
  "Balcony",
  "Hair Dryer",
  "Bath Amenities"
];

const emptyForm: RoomForm = {
  propertyName: property.name,
  title: "",
  roomType: "Room",
  countOfRooms: "",
  adultSpaces: "",
  childrenSpaces: "",
  cotSpaces: "",
  description: "",
  facilities: [],
  photos: []
};

export function ChannelManagerRoomRatesPage({ propertyId, setToast }: ChannelManagerRoomRatesPageProps) {
  const [rooms, setRooms] = useSessionState<ChannelRoomRecord[]>(channelRoomRatesKey(propertyId), initialChannelRooms);
  const [search, setSearch] = useState("");
  const [actionsOpenId, setActionsOpenId] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [drawer, setDrawer] = useState<{ mode: RoomMode; roomId?: string } | null>(null);
  const [form, setForm] = useState<RoomForm>(emptyForm);

  const visibleRooms = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rooms;
    return rooms.filter((room) => [room.title, room.roomType, room.propertyName, room.facilities.join(" ")].join(" ").toLowerCase().includes(needle));
  }, [rooms, search]);

  function openCreate() {
    setForm(emptyForm);
    setDrawer({ mode: "create" });
    setActionsOpenId("");
  }

  function openEdit(room: ChannelRoomRecord) {
    setForm(toForm(room));
    setDrawer({ mode: "edit", roomId: room.id });
    setActionsOpenId("");
  }

  function openView(room: ChannelRoomRecord) {
    setForm(toForm(room));
    setDrawer({ mode: "view", roomId: room.id });
    setActionsOpenId("");
  }

  function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (drawer?.mode === "view") return;
    if (!form.title.trim()) {
      setToast("Enter a room title");
      return;
    }
    if (!toPositiveInteger(form.countOfRooms)) {
      setToast("Enter count of rooms");
      return;
    }

    const record: ChannelRoomRecord = {
      id: drawer?.mode === "edit" && drawer.roomId ? drawer.roomId : `room-${Date.now()}`,
      propertyName: form.propertyName,
      title: form.title.trim(),
      roomType: form.roomType,
      countOfRooms: toPositiveInteger(form.countOfRooms),
      adultSpaces: toWholeNumber(form.adultSpaces),
      childrenSpaces: toWholeNumber(form.childrenSpaces),
      cotSpaces: toWholeNumber(form.cotSpaces),
      description: form.description.trim(),
      facilities: form.facilities,
      photos: form.photos
    };

    setRooms((current) => {
      if (drawer?.mode === "edit") return current.map((room) => (room.id === record.id ? record : room));
      return [record, ...current];
    });
    setDrawer(null);
    setToast(`${record.title} saved`);
  }

  function deleteRoom(room: ChannelRoomRecord) {
    setRooms((current) => current.filter((item) => item.id !== room.id));
    setActionsOpenId("");
    setToast(`${room.title} removed`);
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-4 py-4">
      <section className="rounded-md border border-line bg-white">
        <div className="flex flex-wrap items-center border-b border-line">
          <label className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="focus-ring h-12 w-full border-0 bg-white pl-11 pr-4 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setToast("Rooms refreshed");
            }}
            className="inline-flex h-12 items-center gap-2 border-l border-line px-5 text-sm font-semibold hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button type="button" onClick={openCreate} className="m-2 inline-flex h-10 items-center gap-2 rounded bg-blue-500 px-5 text-sm font-semibold text-white hover:bg-blue-600">
            <PlusCircle className="h-4 w-4" />
            Create
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-white text-slate-900">
                <th className="w-16 px-5 py-5" />
                {["Title", "Count Of Rooms", "Occupancy", "Actions"].map((heading) => (
                  <th key={heading} className={`px-5 py-5 font-semibold ${heading === "Actions" ? "text-right" : ""}`}>
                    <span className={`inline-flex items-center gap-2 ${heading === "Actions" ? "justify-end" : ""}`}>
                      {heading}
                      {heading !== "Actions" ? <ChevronsUpDown className="h-4 w-4 text-slate-300" /> : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRooms.map((room) => (
                <FragmentRow
                  key={room.id}
                  room={room}
                  expanded={expandedId === room.id}
                  actionsOpen={actionsOpenId === room.id}
                  onToggleExpand={() => setExpandedId((current) => (current === room.id ? "" : room.id))}
                  onToggleActions={() => setActionsOpenId((current) => (current === room.id ? "" : room.id))}
                  onEdit={() => openEdit(room)}
                  onView={() => openView(room)}
                  onDelete={() => deleteRoom(room)}
                />
              ))}
              {!visibleRooms.length ? (
                <tr>
                  <td colSpan={5} className="px-5 py-20 text-center text-slate-500">
                    No rooms found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 px-5 py-5 text-blue-500">
          <button type="button" className="text-slate-300">
            {"<"}
          </button>
          <span className="rounded border border-blue-500 px-2 text-blue-600">1</span>
          <button type="button" className="text-slate-300">
            {">"}
          </button>
        </div>
      </section>

      {drawer ? (
        <RoomDrawer
          mode={drawer.mode}
          form={form}
          setForm={setForm}
          onClose={() => setDrawer(null)}
          onSave={saveRoom}
          setToast={setToast}
        />
      ) : null}
    </main>
  );
}

function FragmentRow({
  room,
  expanded,
  actionsOpen,
  onToggleExpand,
  onToggleActions,
  onEdit,
  onView,
  onDelete
}: {
  room: ChannelRoomRecord;
  expanded: boolean;
  actionsOpen: boolean;
  onToggleExpand: () => void;
  onToggleActions: () => void;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr className="border-b border-line">
        <td className="px-5 py-5">
          <button type="button" onClick={onToggleExpand} className="grid h-5 w-5 place-items-center rounded-sm border border-line text-lg leading-none hover:bg-slate-50" aria-label="Expand room details">
            {expanded ? "-" : "+"}
          </button>
        </td>
        <td className="px-5 py-5">{room.title}</td>
        <td className="px-5 py-5">{room.countOfRooms}</td>
        <td className="px-5 py-5">{formatOccupancy(room)}</td>
        <td className="relative px-5 py-5 text-right">
          <button type="button" onClick={onToggleActions} className="inline-flex items-center gap-1 font-semibold text-blue-500 hover:text-blue-700">
            Actions
            <ChevronDown className="h-4 w-4" />
          </button>
          {actionsOpen ? (
            <div className="absolute right-5 top-12 z-20 w-40 overflow-hidden rounded-sm border border-line bg-white text-left shadow-xl">
              <ActionButton onClick={onView} icon={<Eye className="h-4 w-4" />}>
                View
              </ActionButton>
              <ActionButton onClick={onEdit} icon={<Edit3 className="h-4 w-4" />}>
                Edit
              </ActionButton>
              <ActionButton danger onClick={onDelete} icon={<Trash2 className="h-4 w-4" />}>
                Remove
              </ActionButton>
            </div>
          ) : null}
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-line bg-slate-50">
          <td />
          <td colSpan={4} className="px-5 py-4">
            <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
              <p>
                <span className="font-semibold text-slate-800">Type:</span> {room.roomType}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Facilities:</span> {room.facilities.length ? room.facilities.join(", ") : "-"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Photos:</span> {room.photos.length}
              </p>
              <p className="md:col-span-3">
                <span className="font-semibold text-slate-800">Description:</span> {room.description || "-"}
              </p>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function RoomDrawer({
  mode,
  form,
  setForm,
  onClose,
  onSave,
  setToast
}: {
  mode: RoomMode;
  form: RoomForm;
  setForm: (form: RoomForm) => void;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  setToast: (message: string) => void;
}) {
  const [tab, setTab] = useState<RoomDrawerTab>("general");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readOnly = mode === "view";

  function update<K extends keyof RoomForm>(key: K, value: RoomForm[K]) {
    setForm({ ...form, [key]: value });
  }

  function toggleFacility(facility: string) {
    if (readOnly) return;
    const next = form.facilities.includes(facility) ? form.facilities.filter((item) => item !== facility) : [...form.facilities, facility];
    update("facilities", next);
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const imageFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        setToast("Only image files can be added");
        return false;
      }
      return true;
    });

    const photos = await Promise.all(imageFiles.map(readPhotoFile));
    if (photos.length) {
      setForm({ ...form, photos: [...form.photos, ...photos] });
    }

    event.target.value = "";
  }

  function removePhoto(photoId: string) {
    if (readOnly) return;
    update(
      "photos",
      form.photos.filter((photo) => photo.id !== photoId)
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45">
      <div className="hidden flex-1 bg-black/20 lg:block" onClick={onClose} />
      <form onSubmit={onSave} className="flex h-full w-full max-w-[880px] flex-col bg-white shadow-2xl">
        <div className="flex items-center gap-4 border-b border-line px-7 py-6">
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold">{mode === "create" ? "Create Room" : mode === "edit" ? "Edit Room" : "View Room"}</h2>
        </div>

        <div className="flex gap-9 border-b border-line px-7 pt-4">
          <TabButton active={tab === "general"} onClick={() => setTab("general")}>
            General
          </TabButton>
          <TabButton active={tab === "content"} onClick={() => setTab("content")}>
            Content
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-8">
          {tab === "general" ? (
            <div className="ml-auto max-w-[760px] space-y-4">
              <AlignedField label="Properties :">
                <select disabled={readOnly} value={form.propertyName} onChange={(event) => update("propertyName", event.target.value)} className="focus-ring h-10 w-full rounded border border-line bg-white px-3 text-sm disabled:bg-slate-50">
                  <option>{property.name}</option>
                </select>
              </AlignedField>
              <AlignedField label="Title :">
                <input disabled={readOnly} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Title" className="focus-ring h-10 w-full rounded border border-line px-3 text-sm disabled:bg-slate-50" />
              </AlignedField>
              <AlignedField label="Type Of Room :">
                <select disabled={readOnly} value={form.roomType} onChange={(event) => update("roomType", event.target.value)} className="focus-ring h-10 w-full rounded border border-line bg-white px-3 text-sm disabled:bg-slate-50">
                  {roomTypeOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </AlignedField>
              <AlignedField label="Count Of Rooms :">
                <input disabled={readOnly} type="number" min="1" value={form.countOfRooms} onChange={(event) => update("countOfRooms", event.target.value)} placeholder="Count Of Rooms" className="focus-ring h-10 w-full rounded border border-line px-3 text-sm disabled:bg-slate-50" />
              </AlignedField>

              <div className="pt-6">
                <h3 className="border-b border-line pb-3 text-xl text-slate-500">Occupancy settings</h3>
                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-800">
                  <p>Channex works with bed spaces, Adult beds can sleep adults and children, child beds are for children only.</p>
                  <p>
                    Example: If you have a family room that has 1 double bed and 2 single beds, just enter 4 for adults and 0 for children since
                    children can sleep in adult beds.
                  </p>
                </div>
              </div>

              <AlignedField label="Adult Spaces :">
                <div>
                  <input disabled={readOnly} type="number" min="0" value={form.adultSpaces} onChange={(event) => update("adultSpaces", event.target.value)} placeholder="Adult Spaces" className="focus-ring h-10 w-full rounded border border-line px-3 text-sm disabled:bg-slate-50" />
                  <p className="mt-1 text-xs text-slate-500">Count of spaces where Adults can sleep (Children can sleep in adult spaces too)</p>
                </div>
              </AlignedField>
              <AlignedField label="Children Spaces :">
                <div>
                  <input disabled={readOnly} type="number" min="0" value={form.childrenSpaces} onChange={(event) => update("childrenSpaces", event.target.value)} placeholder="Children Spaces" className="focus-ring h-10 w-full rounded border border-line px-3 text-sm disabled:bg-slate-50" />
                  <p className="mt-1 text-xs text-slate-500">Count of spaces where only Children can sleep e.g. Child bunk beds</p>
                </div>
              </AlignedField>
              <AlignedField label="Cot Spaces :">
                <div>
                  <input disabled={readOnly} type="number" min="0" value={form.cotSpaces} onChange={(event) => update("cotSpaces", event.target.value)} placeholder="Cot Spaces" className="focus-ring h-10 w-full rounded border border-line px-3 text-sm disabled:bg-slate-50" />
                  <p className="mt-1 text-xs text-slate-500">Count of spaces where only infants can sleep e.g. cot beds</p>
                </div>
              </AlignedField>
            </div>
          ) : null}

          {tab === "content" ? (
            <div className="ml-auto max-w-[760px] space-y-4">
              <AlignedField label="Description :">
                <textarea disabled={readOnly} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Description" className="focus-ring min-h-32 w-full rounded border border-line px-3 py-2 text-sm disabled:bg-slate-50" />
              </AlignedField>
              <AlignedField label="Facilities :">
                <div className="rounded border border-line p-3">
                  <div className="flex flex-wrap gap-2">
                    {facilityOptions.map((facility) => (
                      <button
                        key={facility}
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggleFacility(facility)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          form.facilities.includes(facility) ? "border-blue-400 bg-blue-50 text-blue-600" : "border-line bg-white text-slate-600"
                        } disabled:cursor-default`}
                      >
                        {facility}
                      </button>
                    ))}
                  </div>
                </div>
              </AlignedField>

              <div className="pt-6">
                <h3 className="border-b border-line pb-3 text-xl text-slate-500">Photos:</h3>
                <div className="mt-5 flex flex-wrap gap-4">
                  {!readOnly ? (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="grid h-44 w-64 place-items-center border border-dashed border-blue-400 text-blue-500 hover:bg-blue-50"
                      >
                        <span className="text-center">
                          <ImagePlus className="mx-auto mb-3 h-8 w-8" />
                          Add new photo
                        </span>
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={uploadPhotos} className="hidden" />
                    </>
                  ) : null}
                  {form.photos.map((photo) => (
                    <div key={photo.id} className="relative h-44 w-64 overflow-hidden rounded border border-line bg-slate-100">
                      <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                      {!readOnly ? (
                        <button type="button" onClick={() => removePhoto(photo.id)} className="absolute right-2 top-2 rounded bg-white/90 p-2 text-rose-500 shadow hover:bg-white" aria-label="Remove photo">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                      <div className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-xs text-white">{photo.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-line p-5">
          {readOnly ? (
            <button type="button" onClick={onClose} className="h-12 w-full rounded bg-blue-500 text-sm font-semibold text-white hover:bg-blue-600">
              Close
            </button>
          ) : (
            <button type="submit" className="h-12 w-full rounded bg-blue-500 text-sm font-semibold text-white hover:bg-blue-600">
              Save
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function AlignedField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid items-start gap-3 md:grid-cols-[210px_1fr]">
      <span className="pt-2 text-right text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`border-b-2 px-1 pb-4 text-sm font-semibold ${active ? "border-blue-500 text-blue-500" : "border-transparent text-slate-700 hover:text-blue-500"}`}>
      {children}
    </button>
  );
}

function ActionButton({ children, icon, onClick, danger = false }: { children: ReactNode; icon: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-sm last:border-0 hover:bg-slate-50 ${danger ? "text-rose-500" : "text-slate-700"}`}>
      {icon}
      {children}
    </button>
  );
}

function toForm(room: ChannelRoomRecord): RoomForm {
  return {
    propertyName: room.propertyName,
    title: room.title,
    roomType: room.roomType,
    countOfRooms: String(room.countOfRooms),
    adultSpaces: String(room.adultSpaces),
    childrenSpaces: String(room.childrenSpaces),
    cotSpaces: String(room.cotSpaces),
    description: room.description,
    facilities: room.facilities,
    photos: room.photos
  };
}

function readPhotoFile(file: File): Promise<ChannelRoomPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        url: String(reader.result ?? "")
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function toPositiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function toWholeNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatOccupancy(room: ChannelRoomRecord) {
  return `A:${room.adultSpaces} C:${room.childrenSpaces} I:${room.cotSpaces}`;
}
