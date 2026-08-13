import type { Room } from "@/app/data/pms-data";
import { roomTypeImageGradients } from "@/app/components/modules/rooms-rates/constants";
import type { RoomTypeRecord } from "@/app/components/modules/rooms-rates/types";
import { api, getApiErrorMessage } from "./api";

type ApiPhysicalRoom = {
  _id: string;
  room_number: string;
  floor: string;
  operational_status: string;
  housekeeping_status: string;
  active: boolean;
  room_type_id: string;
  room_type: string;
};

type ApiRoomImage = {
  _id: string;
  filename: string;
  alt_text: string;
  is_primary: boolean;
  url: string;
};

type ApiRoomType = {
  _id: string;
  name: string;
  maximum_adults: number;
  maximum_children: number;
  included_adults?: number;
  included_children?: number;
  extra_adult_rate?: number;
  extra_child_rate?: number;
  base_rate: number;
  description: string;
  amenities: string[];
  active: boolean;
  physical_rooms: ApiPhysicalRoom[];
  images: ApiRoomImage[];
};

type RoomTypesResponse = {
  room_types: ApiRoomType[];
};

type RoomTypeResponse = {
  room_type: ApiRoomType;
};

export type RoomCatalog = {
  roomTypes: RoomTypeRecord[];
  rooms: Room[];
};

export type PhysicalRoomInput = {
  code: string;
  floor: string;
  status: Room["status"];
  housekeeping?: Room["housekeeping"];
};

export async function getRoomCatalog(propertyId: string): Promise<RoomCatalog> {
  const response = await api.get<RoomTypesResponse>("/rooms", {
    params: { property_id: propertyId }
  });
  return mapRoomCatalog(response.data.room_types);
}

export async function createRoomType(propertyId: string, roomType: RoomTypeRecord) {
  const response = await api.post<RoomTypeResponse>("/rooms", {
    property_id: propertyId,
    ...roomTypePayload(roomType),
    physical_rooms: roomType.rooms.map((roomNumber) => ({
      room_number: roomNumber,
      floor: "Unassigned",
      operational_status: "available",
      housekeeping_status: "clean"
    }))
  });
  return response.data.room_type;
}

export async function updateRoomType(propertyId: string, roomType: RoomTypeRecord) {
  const response = await api.patch<RoomTypeResponse>(
    `/rooms/${roomType.id}`,
    roomTypePayload(roomType),
    { params: { property_id: propertyId } }
  );
  return response.data.room_type;
}

export async function setRoomTypeActive(propertyId: string, roomTypeId: string, active: boolean) {
  await api.patch(
    `/rooms/${roomTypeId}`,
    { active },
    { params: { property_id: propertyId } }
  );
}

export async function addPhysicalRoom(
  propertyId: string,
  roomTypeId: string,
  room: PhysicalRoomInput
) {
  await api.post(
    `/rooms/${roomTypeId}/physical-rooms`,
    physicalRoomPayload(room),
    { params: { property_id: propertyId } }
  );
}

export async function updatePhysicalRoom(
  propertyId: string,
  roomTypeId: string,
  physicalRoomId: string,
  room: PhysicalRoomInput
) {
  await api.patch(
    `/rooms/${roomTypeId}/physical-rooms/${physicalRoomId}`,
    physicalRoomPayload(room),
    { params: { property_id: propertyId } }
  );
}

export async function deletePhysicalRoom(
  propertyId: string,
  roomTypeId: string,
  physicalRoomId: string
) {
  await api.delete(`/rooms/${roomTypeId}/physical-rooms/${physicalRoomId}`, {
    params: { property_id: propertyId }
  });
}

export async function uploadRoomTypeImage(
  propertyId: string,
  roomTypeId: string,
  image: { name: string; dataUrl: string }
) {
  if (!image.dataUrl.startsWith("data:")) return;
  const fileResponse = await fetch(image.dataUrl);
  const blob = await fileResponse.blob();
  await api.post(`/rooms/${roomTypeId}/images`, blob, {
    params: { property_id: propertyId },
    headers: {
      "Content-Type": blob.type,
      "x-file-name": image.name,
      "x-alt-text": image.name
    }
  });
}

export async function deleteRoomTypeImage(
  propertyId: string,
  roomTypeId: string,
  imageId: string
) {
  await api.delete(`/rooms/${roomTypeId}/images/${imageId}`, {
    params: { property_id: propertyId }
  });
}

export function getRoomsApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "The room change could not be saved.");
}

function roomTypePayload(roomType: RoomTypeRecord) {
  return {
    name: roomType.name.trim(),
    maximum_adults: roomType.maxAdults,
    maximum_children: roomType.maxChildren,
    included_adults: roomType.includedAdults,
    included_children: roomType.includedChildren,
    extra_adult_rate: roomType.extraAdultRate,
    extra_child_rate: roomType.extraChildRate,
    base_rate: roomType.baseRate,
    currency: "LKR",
    description: roomType.description,
    amenities: roomType.amenities,
    active: roomType.active
  };
}

function physicalRoomPayload(room: PhysicalRoomInput) {
  return {
    room_number: room.code.trim(),
    floor: room.floor.trim() || "Unassigned",
    operational_status: toApiOperationalStatus(room.status),
    housekeeping_status: toApiHousekeepingStatus(room.housekeeping ?? "Clean")
  };
}

function mapRoomCatalog(apiRoomTypes: ApiRoomType[]): RoomCatalog {
  const roomTypes = apiRoomTypes.map((roomType, index): RoomTypeRecord => ({
    id: roomType._id,
    name: roomType.name,
    rooms: roomType.physical_rooms
      .filter((room) => room.active !== false)
      .map((room) => room.room_number)
      .sort(numericRoomSort),
    maxAdults: roomType.maximum_adults,
    maxChildren: roomType.maximum_children,
    includedAdults: roomType.included_adults ?? 1,
    includedChildren: roomType.included_children ?? 0,
    extraAdultRate: roomType.extra_adult_rate ?? 0,
    extraChildRate: roomType.extra_child_rate ?? 0,
    amenities: roomType.amenities ?? [],
    description: roomType.description ?? "",
    baseRate: roomType.base_rate,
    imageGradient: roomTypeImageGradients[index % roomTypeImageGradients.length],
    images: [...(roomType.images ?? [])]
      .sort((left, right) => Number(right.is_primary) - Number(left.is_primary))
      .map((image) => ({
        id: image._id,
        name: image.filename,
        dataUrl: image.url
      })),
    active: roomType.active
  }));

  const rooms = apiRoomTypes.flatMap((roomType) =>
    roomType.physical_rooms
      .filter((room) => room.active !== false)
      .map((room): Room => ({
        id: room._id,
        code: room.room_number,
        type: roomType.name,
        floor: room.floor || "Unassigned",
        status: fromApiOperationalStatus(room.operational_status),
        housekeeping:
          room.operational_status === "occupied"
            ? "Occupied"
            : fromApiHousekeepingStatus(room.housekeeping_status),
        attendant: ""
      }))
  ).sort((left, right) => numericRoomSort(left.code, right.code));

  return { roomTypes, rooms };
}

function fromApiOperationalStatus(value: string): Room["status"] {
  if (value === "occupied") return "Occupied";
  if (value === "out_of_order") return "Out of Order";
  if (value === "maintenance") return "Maintenance";
  return "Available";
}

function toApiOperationalStatus(value: Room["status"]) {
  if (value === "Occupied") return "occupied";
  if (value === "Out of Order") return "out_of_order";
  if (value === "Maintenance") return "maintenance";
  return "available";
}

function fromApiHousekeepingStatus(value: string): Room["housekeeping"] {
  if (value === "dirty") return "Dirty";
  if (value === "in_progress") return "WIP";
  return "Clean";
}

function toApiHousekeepingStatus(value: Room["housekeeping"]) {
  if (value === "Dirty") return "dirty";
  if (value === "WIP") return "in_progress";
  return "clean";
}

function numericRoomSort(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true });
}
