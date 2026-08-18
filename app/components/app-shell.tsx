"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Languages,
  Menu,
  MessageCircle,
  PanelLeft,
  Search,
  Sun,
  X
} from "lucide-react";
import {
  dateLabel,
  FinancialTransaction,
  getActiveTitle,
  isGroupActive,
  navigation,
  property,
  Reservation,
  reservations as seedReservations,
  Room,
  rooms as seedRooms,
  transactions as seedTransactions
} from "@/app/data/pms-data";
import { isReservationArray, isRoomArray, isTransactionArray } from "@/app/lib/pms-storage-validators";
import { readPropertyHomeCurrency } from "@/app/lib/property-repository";
import { migrateReservationRecords, reservationStorageKey } from "@/app/lib/reservation-repository";
import { ModuleContent } from "@/app/components/module-pages";
import { useLocalStorageState, writeLocalStorageValue } from "@/app/components/hooks/use-local-storage-state";
import { roomTypeStorageKey } from "@/app/components/modules/rooms-rates/constants";
import { getRoomCatalog } from "@/app/lib/rooms-api";
import { getReservations } from "@/app/lib/bookings-api";
import { usePropertyBrand } from "@/app/components/hooks/use-property-brand";
import { usePropertyTheme } from "@/app/components/hooks/use-property-theme";
import { CurrentUserProfileDrawer } from "@/app/components/current-user-profile-drawer";
import { currentSessionUser } from "@/app/lib/current-user";

type WorkspaceProps = {
  propertyId: string;
  slug: string[];
};

export function Workspace({ propertyId, slug }: WorkspaceProps) {
  const activePath = slug.join("/") || "dashboard";
  const reservationKey = reservationStorageKey(propertyId);
  const roomKey = `staypilot:${propertyId}:rooms`;
  const transactionKey = `staypilot:${propertyId}:transactions`;
  const sidebarScrollKey = `staypilot:${propertyId}:sidebar-scroll`;
  const homeCurrency = readPropertyHomeCurrency(propertyId);
  const propertyBrand = usePropertyBrand(propertyId, property.name);
  usePropertyTheme(propertyId);
  const sidebarScrollRef = useRef<HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [reservations, setReservations] = useLocalStorageState<Reservation[]>(
    reservationKey,
    seedReservations,
    isReservationArray,
    (records) => migrateReservationRecords(records, propertyId, homeCurrency)
  );
  const [roomList, setRoomList] = useLocalStorageState<Room[]>(roomKey, seedRooms, isRoomArray);
  const [transactions, setTransactions] = useLocalStorageState<FinancialTransaction[]>(transactionKey, seedTransactions, isTransactionArray);
  const [dataSource, setDataSource] = useState("connecting");
  const [profileOpen, setProfileOpen] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set(navigation.map((item) => item.title)));

  useEffect(() => {
    const faviconId = "staypilot-property-favicon";
    const existingFavicon = document.getElementById(faviconId);

    if (!propertyBrand.logoUrl) {
      existingFavicon?.remove();
      return;
    }

    const favicon = existingFavicon instanceof HTMLLinkElement
      ? existingFavicon
      : document.createElement("link");

    favicon.id = faviconId;
    favicon.rel = "icon";
    favicon.href = propertyBrand.logoUrl;

    if (!favicon.isConnected) {
      document.head.appendChild(favicon);
    }

    return () => {
      favicon.remove();
    };
  }, [propertyBrand.logoUrl]);

  useEffect(() => {
    const pmsName = propertyBrand.pmsName.trim() || "StayPilot";
    document.title = /\bPMS$/i.test(pmsName) ? pmsName : `${pmsName} PMS`;
  }, [propertyBrand.pmsName]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getRoomCatalog(propertyId), getReservations(propertyId)])
      .then(([catalog, savedReservations]) => {
        if (cancelled) return;
        setRoomList(catalog.rooms);
        setReservations(savedReservations);
        writeLocalStorageValue(roomTypeStorageKey(propertyId), catalog.roomTypes);
        setDataSource("MongoDB");
      })
      .catch(() => {
        if (cancelled) return;
        setDataSource("local cache");
        setToast("Room API unavailable; using cached room data");
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId, setReservations, setRoomList]);

  useLayoutEffect(() => {
    const sidebar = sidebarScrollRef.current;
    if (!sidebar) return;

    const savedPosition = Number(window.sessionStorage.getItem(sidebarScrollKey));
    if (Number.isFinite(savedPosition) && savedPosition > 0) {
      sidebar.scrollTop = savedPosition;
    }

    return () => {
      window.sessionStorage.setItem(sidebarScrollKey, String(sidebar.scrollTop));
    };
  }, [sidebarScrollKey]);

  const pageTitle = useMemo(() => getActiveTitle(activePath), [activePath]);

  function toggleGroup(title: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function closeSidebarForNavigation() {
    const sidebar = sidebarScrollRef.current;
    if (sidebar) {
      window.sessionStorage.setItem(sidebarScrollKey, String(sidebar.scrollTop));
    }
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-ink">
      {sidebarOpen ? (
        <button
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[292px] flex-col border-r border-line bg-[#f4f8fe] transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-line bg-white/70 p-3">
          <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-sm">
            <BrandLogo logoUrl={propertyBrand.logoUrl} hotelName={propertyBrand.hotelName} className="h-9 w-9 rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" title={propertyBrand.hotelName}>{propertyBrand.hotelName}</p>
              <p className="truncate text-xs text-slate-500" title={propertyBrand.pmsName}>{propertyBrand.pmsName}</p>
            </div>
            <button className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Property menu">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav ref={sidebarScrollRef} className="table-scroll flex-1 overflow-y-auto px-2 py-3">
          {navigation.map((group) => {
            const Icon = group.icon;
            const active = isGroupActive(group, activePath);
            const isExpanded = expanded.has(group.title);

            if (!group.children?.length) {
              return (
                <Link
                  key={group.title}
                  href={`/properties/${propertyId}/${group.path}`}
                  onClick={closeSidebarForNavigation}
                  className={`mb-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm transition ${
                    active ? "property-accent-soft property-accent-text font-semibold" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{group.title}</span>
                </Link>
              );
            }

            return (
              <div key={group.title} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition ${
                    active ? "property-accent-soft property-accent-text font-semibold" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="min-w-0 flex-1 truncate">{group.title}</span>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {isExpanded ? (
                  <div className="ml-5 mt-1 border-l border-line pl-2">
                    {group.children.map((item) => {
                      const ChildIcon = item.icon;
                      const childActive = item.path === activePath;
                      return (
                        <Link
                          key={item.path}
                          href={`/properties/${propertyId}/${item.path}`}
                          onClick={closeSidebarForNavigation}
                          className={`mb-1 flex h-9 items-center gap-3 rounded-md px-3 text-sm transition ${
                            childActive ? "property-accent-soft property-accent-text font-semibold" : "text-slate-600 hover:bg-white"
                          }`}
                        >
                          <ChildIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-line bg-white/70 p-3">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean"
            aria-label="Open Asiri Perera profile"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-200 font-semibold">AP</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{currentSessionUser.name}</p>
              <p className="truncate text-xs text-slate-500">{currentSessionUser.email}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </aside>

      <CurrentUserProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        propertyId={propertyId}
        propertyName={propertyBrand.hotelName}
        currency={homeCurrency}
        cachedTransactions={transactions}
      />

      <div className="lg:pl-[292px]">
        <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((value) => !value)}
              className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-4 w-4 lg:hidden" />
              <PanelLeft className="hidden h-4 w-4 lg:block" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold lg:text-2xl">{pageTitle}</h1>
              <div className="group relative mt-1 flex items-center gap-2">
                <span className="property-accent-soft property-accent-text inline-flex max-w-[min(55vw,420px)] items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold uppercase">
                  <BrandLogo logoUrl={propertyBrand.logoUrl} hotelName={propertyBrand.hotelName} className="h-4 w-4 rounded-sm" />
                  <span className="truncate">{propertyBrand.hotelName}</span>
                </span>
                <span className="pointer-events-none absolute left-full z-30 ml-2 hidden whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 sm:inline" role="status">
                  Data: {dataSource}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 px-2 text-sm text-slate-600 md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>System Date: {dateLabel(property.systemDate)}</span>
            </div>
            <TopIcon label="Calendar">
              <Calendar className="h-4 w-4" />
            </TopIcon>
            <TopIcon label="Alerts">
              <Bell className="h-4 w-4" />
            </TopIcon>
            <TopIcon label="Search">
              <Search className="h-4 w-4" />
            </TopIcon>
            <button className="hidden h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:bg-slate-50 md:inline-flex">
              <CircleHelp className="h-4 w-4" />
              Support
            </button>
            <TopIcon label="Theme">
              <Sun className="h-4 w-4" />
            </TopIcon>
            <button className="hidden h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:bg-slate-50 sm:inline-flex">
              <Languages className="h-4 w-4" />
              English
            </button>
          </div>
        </header>

        <ModuleContent
          activePath={activePath}
          propertyId={propertyId}
          reservations={reservations}
          setReservations={setReservations}
          roomList={roomList}
          setRoomList={setRoomList}
          transactions={transactions}
          setTransactions={setTransactions}
          setToast={setToast}
        />
      </div>

      <button
        type="button"
        onClick={() => setToast("Support message panel opened")}
        className="property-accent-bg fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg"
        aria-label="Open support"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {toast ? (
        <div className="fixed bottom-24 right-5 z-40 flex max-w-sm items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm shadow-panel">
          <span className="h-2 w-2 rounded-full bg-mint" />
          <span className="flex-1">{toast}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast("")}>
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TopIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function BrandLogo({ logoUrl, hotelName, className }: { logoUrl: string; hotelName: string; className: string }) {
  const [failedUrl, setFailedUrl] = useState("");
  const initials = hotelName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "SP";
  const showImage = Boolean(logoUrl) && failedUrl !== logoUrl;

  return (
    <div className={`property-accent-soft property-accent-text grid shrink-0 place-items-center overflow-hidden ${className}`}>
      {showImage ? (
        <img
          src={logoUrl}
          alt={`${hotelName} logo`}
          className="h-full w-full object-contain"
          onError={() => setFailedUrl(logoUrl)}
        />
      ) : (
        <span className="text-[0.7em] font-bold">{initials}</span>
      )}
    </div>
  );
}
