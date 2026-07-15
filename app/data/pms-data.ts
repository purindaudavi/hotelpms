import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BedDouble,
  Boxes,
  Building2,
  CalendarDays,
  CalendarPlus,
  CircleDollarSign,
  ClipboardList,
  DoorOpen,
  DownloadCloud,
  FileText,
  Globe,
  Home,
  Info,
  Landmark,
  LayoutDashboard,
  Link2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Network,
  Plug,
  Radar,
  Receipt,
  Repeat,
  RotateCw,
  Send,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tags,
  TrendingUp,
  Truck,
  UploadCloud,
  UserCog,
  UserRound,
  Users,
  Utensils,
  WalletCards
} from "lucide-react";

export type NavChild = {
  title: string;
  path: string;
  icon: LucideIcon;
};

export type NavGroup = {
  title: string;
  path: string;
  icon: LucideIcon;
  children?: NavChild[];
};

export type ReservationStatus =
  | "Confirmed"
  | "Tentative"
  | "Checked-in"
  | "Checked-out"
  | "Cancelled"
  | "No Show"
  | "Blocked";

export type ReservationEmailStatus = "not_requested" | "pending" | "sent" | "failed";

export type ReservationRoom = {
  id: string;
  propertyId: string;
  reservationId: string;
  roomTypeId: string;
  roomType: string;
  roomId: string;
  roomNumber: string;
  occupancy: string;
  bedType: string;
  adults: number;
  children: number;
  ratePlanId: string;
  ratePlanName: string;
  mealPlan: string;
  currency: string;
  originalNightlyRate: number;
  effectiveNightlyRate: number;
  isFoc: boolean;
  focReason: string;
  focSelectedBy?: string;
  focSelectedAt?: string;
  requiresManagerApproval: boolean;
  businessBlockAllocationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReservationOccupant = {
  id: string;
  propertyId: string;
  reservationId: string;
  roomLineId: string;
  name: string;
  title?: string;
  guestType: "Adult" | "Child";
  isPrimary: boolean;
  isMainBooker: boolean;
  email?: string;
  phone?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
};

export type Reservation = {
  id: string;
  propertyId?: string;
  resNo: string;
  bookingRef: string;
  bookingSource?: string;
  bookingReference?: string;
  tourNumber?: string;
  groupName?: string;
  reservationDate: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  source: string;
  status: ReservationStatus;
  guest: string;
  phone: string;
  email: string;
  country: string;
  roomType: string;
  room: string;
  adults: number;
  children: number;
  total: number;
  paid: number;
  guestTitle?: string;
  reservationRemarks?: string;
  guestRemarks?: string;
  internalRemarks?: string;
  isDayRoom?: boolean;
  ratePlanId?: string;
  ratePlanName?: string;
  mealPlan?: string;
  currency?: string;
  refundable?: boolean;
  cancellationPolicy?: string;
  reservationRooms?: ReservationRoom[];
  occupants?: ReservationOccupant[];
  businessBlockId?: string;
  businessBlockAllocationId?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  emailStatus?: ReservationEmailStatus;
  emailSentAt?: string;
  emailFailureMessage?: string;
  createdBy?: string;
  currencyMigratedFromProperty?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type RoomType = {
  id: string;
  name: string;
  rooms: string[];
  maxAdults: number;
  maxChildren: number;
  amenities: string[];
  baseRate: number;
  imageGradient: string;
};

export type Room = {
  id: string;
  code: string;
  type: string;
  floor: string;
  status: "Available" | "Occupied" | "Out of Order" | "Maintenance";
  housekeeping: "Clean" | "Dirty" | "Occupied" | "WIP";
  attendant: string;
};

export type FinancialTransaction = {
  id: string;
  date: string;
  type: string;
  documentNo: string;
  value: number;
  reservationNo: string;
  roomNo: string;
  createdBy: string;
  status: "Active" | "Voided" | "Pending";
};

export type PosProduct = {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
};

export type Channel = {
  id: string;
  name: string;
  status: "Connected" | "Needs Mapping" | "Paused";
  bookings: number;
  revenue: number;
  lastSync: string;
};

export type Employee = {
  id: string;
  name: string;
  role: string;
  email: string;
  status: "Active" | "Invited" | "Disabled";
};

export const appName = "StayPilot";

export const property = {
  id: "demo",
  name: "Ronaka Airport Transit Hotel",
  shortName: "Ronaka Airport Transit",
  type: "Boutique Hotel",
  address: "Airport Junction, Katunayake, Sri Lanka",
  city: "Katunayake",
  country: "LK",
  currency: "LKR",
  rooms: 14,
  starCategory: 3,
  systemDate: "2026-06-18",
  email: "reservations@staypilot.demo",
  phone: "+94 70 355 1340"
};

export const navigation: NavGroup[] = [
  { title: "Dashboard", path: "dashboard", icon: LayoutDashboard },
  { title: "Front Desk", path: "front-desk", icon: ClipboardList },
  {
    title: "Reservation",
    path: "reservation/bookings",
    icon: CalendarDays,
    children: [
      { title: "Bookings", path: "reservation/bookings", icon: FileText },
      { title: "Create event", path: "reservation/create-event", icon: CalendarPlus },
      { title: "Cross Booking", path: "reservation/cross-booking", icon: Link2 },
      { title: "Arrivals", path: "reservation/arrivals", icon: LogIn },
      { title: "Departures", path: "reservation/departures", icon: LogOut },
      { title: "In-House", path: "reservation/in-house", icon: DoorOpen },
      { title: "Travel Agents", path: "reservation/travel-agents", icon: MapPin },
      { title: "Guest Profile", path: "reservation/guest-profile", icon: Users }
    ]
  },
  {
    title: "Room & Rates",
    path: "rooms-rates/rooms",
    icon: Home,
    children: [
      { title: "Rooms", path: "rooms-rates/rooms", icon: BedDouble },
      { title: "Rates", path: "rooms-rates/rates", icon: Tags },
      { title: "Inventory", path: "rooms-rates/inventory", icon: Boxes },
      { title: "Rate Hunter", path: "rooms-rates/rate-hunter", icon: Radar }
    ]
  },
  {
    title: "POS",
    path: "pos/dashboard",
    icon: Utensils,
    children: [
      { title: "Dashboard", path: "pos/dashboard", icon: LayoutDashboard },
      { title: "POS order", path: "pos/order", icon: ShoppingCart },
      { title: "Kot/Bot Monitor", path: "pos/kot-bot-monitor", icon: Monitor }
    ]
  },
  {
    title: "Housekeeping",
    path: "housekeeping/board",
    icon: Sparkles,
    children: [
      { title: "Housekeeping Board", path: "housekeeping/board", icon: CircleDollarSign },
      { title: "Information", path: "housekeeping/information", icon: Info }
    ]
  },
  {
    title: "Financials",
    path: "financials/transactions",
    icon: WalletCards,
    children: [
      { title: "Transactions", path: "financials/transactions", icon: Receipt },
      { title: "Purchases", path: "financials/purchases", icon: ShoppingBag },
      { title: "Expenses", path: "financials/expenses", icon: FileText },
      { title: "Payables", path: "financials/payables", icon: CircleDollarSign },
      { title: "Receivables", path: "financials/receivables", icon: CircleDollarSign },
      { title: "Profit & Loss", path: "financials/profit-loss", icon: TrendingUp },
      { title: "Chart of Accounts", path: "financials/chart-of-accounts", icon: Landmark },
      { title: "Suppliers", path: "financials/suppliers", icon: Truck },
      { title: "Transfer Funds", path: "financials/transfer-funds", icon: Repeat },
      { title: "Integrations", path: "financials/integrations", icon: Plug }
    ]
  },
  { title: "Reports", path: "reports", icon: BarChart3 },
  {
    title: "CRM",
    path: "crm/templates",
    icon: Mail,
    children: [
      { title: "Templates", path: "crm/templates", icon: FileText },
      { title: "Campaigns", path: "crm/campaigns", icon: Send }
    ]
  },
  {
    title: "Channel Manager",
    path: "channel-manager/dashboard",
    icon: Network,
    children: [
      { title: "Request", path: "channel-manager/request", icon: BedDouble },
      { title: "Dashboard", path: "channel-manager/dashboard", icon: LayoutDashboard },
      { title: "Inventory", path: "channel-manager/inventory", icon: Tags },
      { title: "Channels", path: "channel-manager/channels", icon: Network },
      { title: "Room and Rates", path: "channel-manager/room-and-rates", icon: Boxes },
      { title: "Bookings", path: "channel-manager/bookings", icon: Link2 },
      { title: "Logs", path: "channel-manager/logs", icon: Activity },
      { title: "Message", path: "channel-manager/message", icon: Mail },
      { title: "Full Sync", path: "channel-manager/full-sync", icon: RotateCw },
      { title: "Pull Future Reservations", path: "channel-manager/pull-future-reservations", icon: DownloadCloud }
    ]
  },
  { title: "Night Audit", path: "night-audit", icon: Moon },
  { title: "IBE", path: "ibe", icon: Globe },
  {
    title: "Settings",
    path: "settings/property",
    icon: Settings,
    children: [
      { title: "Users", path: "settings/users", icon: UserRound },
      { title: "Property", path: "settings/property", icon: Building2 },
      { title: "Templates", path: "settings/templates", icon: FileText },
      { title: "Data Import", path: "settings/data-import", icon: UploadCloud },
      { title: "Activity Logs", path: "settings/activity-logs", icon: Activity },
      { title: "Employee", path: "settings/employee", icon: UserCog }
    ]
  }
];

export const roomTypes: RoomType[] = [
  {
    id: "deluxe-double",
    name: "Deluxe Double Room",
    rooms: ["02", "05", "06", "09", "10", "12", "14"],
    maxAdults: 2,
    maxChildren: 1,
    amenities: ["Air Conditioner", "Fan", "Wardrobe", "King Bed", "City View", "Shower", "Hot Water"],
    baseRate: 14500,
    imageGradient: "linear-gradient(135deg, #f7ead9 0%, #f8fafc 38%, #a7f3d0 39%, #22c55e 44%, #7c2d12 100%)"
  },
  {
    id: "deluxe-twin",
    name: "Deluxe Twin Room",
    rooms: ["04", "11"],
    maxAdults: 2,
    maxChildren: 0,
    amenities: ["Air Conditioner", "Twin Bed", "Wardrobe", "City View", "Hair Dryer", "Bath Amenities"],
    baseRate: 13200,
    imageGradient: "linear-gradient(135deg, #fef3c7 0%, #ffffff 34%, #8b5cf6 35%, #6d28d9 42%, #78350f 100%)"
  },
  {
    id: "deluxe-triple",
    name: "Deluxe Triple Room",
    rooms: ["01", "03", "08"],
    maxAdults: 3,
    maxChildren: 1,
    amenities: ["Air Conditioner", "Single Bed", "Table", "Shower", "Wash Basin", "Towel"],
    baseRate: 16800,
    imageGradient: "linear-gradient(135deg, #e0f2fe 0%, #f8fafc 42%, #4338ca 43%, #60a5fa 49%, #92400e 100%)"
  },
  {
    id: "family",
    name: "Deluxe Family Room",
    rooms: ["07", "15"],
    maxAdults: 4,
    maxChildren: 2,
    amenities: ["Air Conditioner", "Queen Bed", "Sofa", "Mini Fridge", "Hot Water", "Balcony"],
    baseRate: 22000,
    imageGradient: "linear-gradient(135deg, #fff7ed 0%, #fde68a 31%, #14b8a6 32%, #0f766e 40%, #7f1d1d 100%)"
  }
];

export const rooms: Room[] = [
  { id: "r01", code: "01", type: "Deluxe Triple Room", floor: "Ground", status: "Available", housekeeping: "Clean", attendant: "Amaya" },
  { id: "r02", code: "02", type: "Deluxe Double Room", floor: "Ground", status: "Occupied", housekeeping: "Occupied", attendant: "Kasun" },
  { id: "r03", code: "03", type: "Deluxe Triple Room", floor: "Ground", status: "Available", housekeeping: "Clean", attendant: "Amaya" },
  { id: "r04", code: "04", type: "Deluxe Twin Room", floor: "Ground", status: "Occupied", housekeeping: "Occupied", attendant: "Kasun" },
  { id: "r05", code: "05", type: "Deluxe Double Room", floor: "First", status: "Available", housekeeping: "Clean", attendant: "Nuwan" },
  { id: "r06", code: "06", type: "Deluxe Double Room", floor: "First", status: "Available", housekeeping: "Clean", attendant: "Nuwan" },
  { id: "r07", code: "07", type: "Deluxe Family Room", floor: "First", status: "Available", housekeeping: "WIP", attendant: "Amaya" },
  { id: "r08", code: "08", type: "Deluxe Triple Room", floor: "First", status: "Available", housekeeping: "Dirty", attendant: "Kasun" },
  { id: "r09", code: "09", type: "Deluxe Double Room", floor: "Second", status: "Available", housekeeping: "Clean", attendant: "Nuwan" },
  { id: "r10", code: "10", type: "Deluxe Double Room", floor: "Second", status: "Available", housekeeping: "Clean", attendant: "Amaya" },
  { id: "r11", code: "11", type: "Deluxe Twin Room", floor: "Second", status: "Available", housekeeping: "Clean", attendant: "Kasun" },
  { id: "r12", code: "12", type: "Deluxe Double Room", floor: "Second", status: "Available", housekeeping: "Clean", attendant: "Nuwan" },
  { id: "r14", code: "14", type: "Deluxe Double Room", floor: "Third", status: "Available", housekeeping: "Dirty", attendant: "Amaya" },
  { id: "r15", code: "15", type: "Deluxe Family Room", floor: "Third", status: "Available", housekeeping: "Clean", attendant: "Kasun" }
];

export const reservations: Reservation[] = [
  {
    id: "res-1052711040",
    resNo: "1052711040",
    bookingRef: "2022816467",
    reservationDate: "2026-06-18",
    checkIn: "2026-06-18",
    checkOut: "2026-06-19",
    rooms: 1,
    source: "Agoda",
    status: "Confirmed",
    guest: "Daniel Wijekoon",
    phone: "+94 77 123 2211",
    email: "daniel@example.com",
    country: "Sri Lanka",
    roomType: "Deluxe Double Room",
    room: "02",
    adults: 2,
    children: 0,
    total: 14500,
    paid: 7250
  },
  {
    id: "res-1052711039",
    resNo: "1052711039",
    bookingRef: "2485088937",
    reservationDate: "2026-06-17",
    checkIn: "2026-06-18",
    checkOut: "2026-06-20",
    rooms: 1,
    source: "Expedia",
    status: "Confirmed",
    guest: "Siva Kailasam",
    phone: "+94 76 540 1111",
    email: "siva@example.com",
    country: "Malaysia",
    roomType: "Deluxe Twin Room",
    room: "04",
    adults: 2,
    children: 0,
    total: 26400,
    paid: 0
  },
  {
    id: "res-1052711038",
    resNo: "1052711038",
    bookingRef: "2484252152",
    reservationDate: "2026-06-16",
    checkIn: "2026-06-19",
    checkOut: "2026-06-21",
    rooms: 1,
    source: "Direct",
    status: "Tentative",
    guest: "Amir Khan",
    phone: "+91 98 5555 5512",
    email: "amir@example.com",
    country: "India",
    roomType: "Deluxe Triple Room",
    room: "01",
    adults: 3,
    children: 1,
    total: 33600,
    paid: 10000
  },
  {
    id: "res-1052711037",
    resNo: "1052711037",
    bookingRef: "2022006013",
    reservationDate: "2026-06-16",
    checkIn: "2026-06-20",
    checkOut: "2026-06-22",
    rooms: 1,
    source: "Booking.com",
    status: "Confirmed",
    guest: "Kanavathipillai Suresh",
    phone: "+94 79 044 0817",
    email: "-",
    country: "Sri Lanka",
    roomType: "Deluxe Double Room",
    room: "05",
    adults: 2,
    children: 0,
    total: 29000,
    paid: 29000
  },
  {
    id: "res-1052711036",
    resNo: "1052711036",
    bookingRef: "668343359",
    reservationDate: "2026-06-15",
    checkIn: "2026-06-21",
    checkOut: "2026-06-22",
    rooms: 1,
    source: "Agoda",
    status: "Tentative",
    guest: "Kajeeyan Jeganathan",
    phone: "+94 74 603 9246",
    email: "kajeeyan@example.com",
    country: "Sri Lanka",
    roomType: "Deluxe Family Room",
    room: "07",
    adults: 2,
    children: 2,
    total: 22000,
    paid: 0
  },
  {
    id: "res-1052711035",
    resNo: "1052711035",
    bookingRef: "667949019",
    reservationDate: "2026-06-14",
    checkIn: "2026-06-22",
    checkOut: "2026-06-23",
    rooms: 1,
    source: "Travel Agent",
    status: "Confirmed",
    guest: "Nimali Perera",
    phone: "+94 71 222 1188",
    email: "nimali@example.com",
    country: "Sri Lanka",
    roomType: "Deluxe Double Room",
    room: "09",
    adults: 1,
    children: 0,
    total: 14500,
    paid: 5000
  }
];

export const transactions: FinancialTransaction[] = [
  { id: "tran-01", date: "2026-06-11", type: "Opening Balance", documentNo: "1052011007", value: 0, reservationNo: "-", roomNo: "-", createdBy: "asiri.business@gmail.com", status: "Active" },
  { id: "tran-02", date: "2026-06-03", type: "Receive Payment", documentNo: "1052171010", value: 5249.53, reservationNo: "1052711014", roomNo: "-", createdBy: "ASIRI PERERA", status: "Active" },
  { id: "tran-03", date: "2026-06-02", type: "Invoice", documentNo: "1052021003", value: 4521.36, reservationNo: "1052711009", roomNo: "-", createdBy: "ASIRI PERERA", status: "Active" },
  { id: "tran-04", date: "2026-06-01", type: "Receive Payment", documentNo: "1052171007", value: 5249.53, reservationNo: "1052711006", roomNo: "-", createdBy: "ASIRI PERERA", status: "Active" },
  { id: "tran-05", date: "2026-06-01", type: "Receive Payment", documentNo: "1052171009", value: 0.56, reservationNo: "1052711006", roomNo: "-", createdBy: "ASIRI PERERA", status: "Active" },
  { id: "tran-06", date: "2026-06-01", type: "Receive Payment", documentNo: "1052171008", value: 0.48, reservationNo: "1052711008", roomNo: "-", createdBy: "HotelMate Admin", status: "Active" },
  { id: "tran-07", date: "2026-06-01", type: "Receive Payment", documentNo: "1052171006", value: 4520.89, reservationNo: "1052711008", roomNo: "-", createdBy: "ASIRI PERERA", status: "Active" },
  { id: "tran-08", date: "2026-05-31", type: "Invoice", documentNo: "1052021001", value: 5250.08, reservationNo: "1052711006", roomNo: "-", createdBy: "ASIRI PERERA", status: "Active" },
  { id: "tran-09", date: "2026-05-31", type: "Invoice", documentNo: "1052021002", value: 4521.36, reservationNo: "1052711008", roomNo: "-", createdBy: "ASIRI PERERA", status: "Active" },
  { id: "tran-10", date: "2026-05-28", type: "Receive Payment", documentNo: "1052171005", value: 5188.91, reservationNo: "1052711005", roomNo: "-", createdBy: "ASIRI PERERA", status: "Active" },
  { id: "tran-11", date: "2026-05-23", type: "Receive Payment", documentNo: "1052171002", value: 7000, reservationNo: "1052711002", roomNo: "-", createdBy: "ASIRI PERERA", status: "Active" }
];

export const products: PosProduct[] = [
  { id: "p-01", name: "Water", code: "001", category: "Beverages", price: 200 },
  { id: "p-02", name: "Ceylon Tea", code: "002", category: "Beverages", price: 350 },
  { id: "p-03", name: "Airport Club Sandwich", code: "110", category: "Food", price: 1850 },
  { id: "p-04", name: "Margherita Pizza", code: "210", category: "Food", price: 2800 },
  { id: "p-05", name: "Laundry Bag", code: "510", category: "Services", price: 1200 }
];

export const channels: Channel[] = [
  { id: "chn-01", name: "Agoda", status: "Connected", bookings: 45, revenue: 237000, lastSync: "2 minutes ago" },
  { id: "chn-02", name: "Expedia", status: "Connected", bookings: 14, revenue: 108000, lastSync: "7 minutes ago" },
  { id: "chn-03", name: "Booking.com", status: "Needs Mapping", bookings: 8, revenue: 76000, lastSync: "1 hour ago" },
  { id: "chn-04", name: "Direct Booking Engine", status: "Connected", bookings: 21, revenue: 181000, lastSync: "Live" }
];

export const employees: Employee[] = [
  { id: "emp-01", name: "Asiri Perera", role: "Owner", email: "asiri.business@example.com", status: "Active" },
  { id: "emp-02", name: "Kasun Silva", role: "Front Desk", email: "kasun@example.com", status: "Active" },
  { id: "emp-03", name: "Amaya Fernando", role: "Housekeeping", email: "amaya@example.com", status: "Active" },
  { id: "emp-04", name: "Nuwan Jayasekara", role: "Housekeeping", email: "nuwan@example.com", status: "Invited" }
];

export function currency(value: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: property.currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export function getActiveTitle(path: string) {
  for (const group of navigation) {
    if (group.path === path) return group.title;
    const child = group.children?.find((item) => item.path === path);
    if (child) return child.title;
  }
  return "Dashboard";
}

export function isGroupActive(group: NavGroup, path: string) {
  return group.path === path || Boolean(group.children?.some((item) => item.path === path));
}
