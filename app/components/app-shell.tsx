"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Menu,
  MessageCircle,
  Moon,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
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
import { useColorScheme } from "@/app/components/hooks/use-color-scheme";
import { CurrentUserProfileDrawer } from "@/app/components/current-user-profile-drawer";
import { getAuthenticatedUser, logoutUser } from "@/app/lib/auth-api";
import {
  clearAuthSession,
  currentSessionUser,
  getUserInitials,
  loadCurrentSessionUser,
  readAccessToken,
  readRefreshToken,
  storeCurrentSessionUser
} from "@/app/lib/current-user";

import { NotificationMenu } from "@/app/components/notification-menu";
import { PRODUCT_ICON_URL, PRODUCT_NAME } from "@/app/lib/product-brand";

type WorkspaceProps = {
  propertyId: string;
  slug: string[];
};

export function Workspace({ propertyId, slug }: WorkspaceProps) {
  const router = useRouter();
  const activePath = slug.join("/") || "dashboard";
  const reservationKey = reservationStorageKey(propertyId);
  const roomKey = `staypilot:${propertyId}:rooms`;
  const transactionKey = `staypilot:${propertyId}:transactions`;
  const sidebarScrollKey = `staypilot:${propertyId}:sidebar-scroll`;
  const sidebarCollapseKey = `staypilot:${propertyId}:sidebar-collapsed`;
  const homeCurrency = readPropertyHomeCurrency(propertyId);
  const propertyBrand = usePropertyBrand(propertyId, property.name);
  usePropertyTheme(propertyId);
  const { colorScheme, toggleColorScheme } = useColorScheme();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState(sidebarCollapseKey, false);
  const [dataSource, setDataSource] = useState("connecting");
  const [profileOpen, setProfileOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState(() => ({ ...currentSessionUser }));
  const [expanded, setExpanded] = useState(() => new Set(navigation.map((item) => item.title)));
  const [collapsedExpanded, setCollapsedExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    const storedUser = loadCurrentSessionUser();
    setCurrentUser({ ...storedUser });

    if (storedUser.mode === "demo") {
      setAuthChecking(false);
      return;
    }

    if (!readAccessToken() && !readRefreshToken()) {
      router.replace("/login");
      return;
    }

    getAuthenticatedUser()
      .then((user) => {
        if (cancelled) return;
        storeCurrentSessionUser(user);
        setCurrentUser({ ...user });
        setAuthChecking(false);
      })
      .catch(() => {
        if (cancelled) return;
        clearAuthSession();
        router.replace("/login?reason=session-expired");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    document.title = PRODUCT_NAME;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    if (authChecking) return;

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
  }, [authChecking, propertyId, setReservations, setRoomList]);

  useLayoutEffect(() => {
    if (authChecking) return;

    const sidebar = sidebarScrollRef.current;
    if (!sidebar) return;

    const savedPosition = Number(window.sessionStorage.getItem(sidebarScrollKey));
    if (Number.isFinite(savedPosition) && savedPosition > 0) {
      sidebar.scrollTop = savedPosition;
    }

    return () => {
      window.sessionStorage.setItem(sidebarScrollKey, String(sidebar.scrollTop));
    };
  }, [authChecking, sidebarScrollKey]);

  const pageTitle = useMemo(() => getActiveTitle(activePath), [activePath]);

  function toggleGroup(title: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function toggleCollapsedGroup(title: string) {
    setCollapsedExpanded((current) => {
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

  function rememberSidebarScroll() {
    const sidebar = sidebarScrollRef.current;
    if (sidebar) {
      window.sessionStorage.setItem(sidebarScrollKey, String(sidebar.scrollTop));
    }
  }

  async function handleSignOut() {
    await logoutUser().catch(() => undefined);
    router.replace("/login");
  }

  function handlePasswordChanged() {
    clearAuthSession();
    router.replace("/login?reason=password-reset");
  }

  if (authChecking) {
    return (
      <main className="app-shell-root grid min-h-screen place-items-center bg-[#f8fafc] px-6 text-center text-slate-600">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl border border-line bg-white text-blue-600 shadow-sm">
            <PanelLeft className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-semibold">Opening your workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell-root min-h-screen bg-[#f8fafc] text-ink">
      {sidebarOpen ? (
        <button
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
        />
      ) : null}

      <aside
        id="workspace-sidebar"
        data-collapsed={sidebarCollapsed}
        className={`app-sidebar fixed inset-y-0 left-0 z-40 flex w-[292px] flex-col border-r border-line bg-[#f4f8fe] transition-[width,transform] duration-200 lg:translate-x-0 ${
          sidebarCollapsed ? "lg:w-[100px]" : "lg:w-[292px]"
        } ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`border-b border-line bg-white/70 p-3 ${sidebarCollapsed ? "lg:p-2" : ""}`}>
          <div className={`flex items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-sm ${sidebarCollapsed ? "lg:justify-center lg:p-2" : ""}`}>
            <BrandLogo logoUrl={PRODUCT_ICON_URL} hotelName={PRODUCT_NAME} className="h-9 w-9 rounded-md" />
            <div className={`min-w-0 flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              <p className="truncate text-sm font-semibold" title={propertyBrand.hotelName}>{propertyBrand.hotelName}</p>
              <p className="truncate text-xs text-slate-500" title={PRODUCT_NAME}>{PRODUCT_NAME}</p>
            </div>
            <button className={`rounded-md p-1 text-slate-500 hover:bg-slate-100 ${sidebarCollapsed ? "lg:hidden" : ""}`} aria-label="Property menu">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav ref={sidebarScrollRef} onScroll={rememberSidebarScroll} className="table-scroll flex-1 overflow-y-auto px-2 py-3">
          {navigation.map((group) => {
            const Icon = group.icon;
            const active = isGroupActive(group, activePath);
            const isExpanded = sidebarCollapsed ? collapsedExpanded.has(group.title) : expanded.has(group.title);

            if (!group.children?.length) {
              return (
                <Link
                  key={group.title}
                  href={`/properties/${propertyId}/${group.path}`}
                  onClick={closeSidebarForNavigation}
                  title={sidebarCollapsed ? group.title : undefined}
                  className={`mb-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm transition ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""} ${
                    active ? "property-accent-soft property-accent-text font-semibold" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className={sidebarCollapsed ? "lg:hidden" : ""}>{group.title}</span>
                </Link>
              );
            }

            return (
              <div key={group.title} className="sidebar-navigation-group mb-1">
                <button
                  type="button"
                  onClick={() => {
                    if (sidebarCollapsed && window.matchMedia("(min-width: 1024px)").matches) {
                      toggleCollapsedGroup(group.title);
                      return;
                    }
                    toggleGroup(group.title);
                  }}
                  title={sidebarCollapsed ? group.title : undefined}
                  aria-label={sidebarCollapsed ? `${isExpanded ? "Close" : "Open"} ${group.title} submenu` : undefined}
                  className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""} ${
                    active ? "property-accent-soft property-accent-text font-semibold" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className={`min-w-0 flex-1 truncate ${sidebarCollapsed ? "lg:hidden" : ""}`}>{group.title}</span>
                  <span className={sidebarCollapsed ? "lg:hidden" : ""}>{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                </button>
                {isExpanded ? (
                  <div className="sidebar-submenu-rail ml-5 mt-1 border-l border-line pl-2">
                    {group.children.map((item) => {
                      const ChildIcon = item.icon;
                      const childActive = item.path === activePath || activePath.startsWith(`${item.path}/`);
                      return (
                        <Link
                          key={item.path}
                          href={`/properties/${propertyId}/${item.path}`}
                          onClick={closeSidebarForNavigation}
                          title={sidebarCollapsed ? item.title : undefined}
                          className={`sidebar-submenu-link mb-1 flex h-9 items-center gap-3 rounded-md px-3 text-sm transition ${
                            childActive ? "property-accent-soft property-accent-text font-semibold" : "text-slate-600 hover:bg-white"
                          }`}
                        >
                          <ChildIcon className="h-4 w-4 shrink-0" />
                          <span className={`truncate ${sidebarCollapsed ? "lg:hidden" : ""}`}>{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className={`border-t border-line bg-white/70 p-3 ${sidebarCollapsed ? "lg:p-2" : ""}`}>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
            aria-label={`Open ${currentUser.name} profile`}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-200 font-semibold">{getUserInitials(currentUser)}</div>
            <div className={`min-w-0 flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              <p className="truncate text-sm font-semibold">{currentUser.name}</p>
              <p className="truncate text-xs text-slate-500">{currentUser.email}</p>
            </div>
            <ChevronRight className={`h-4 w-4 text-slate-500 ${sidebarCollapsed ? "lg:hidden" : ""}`} />
          </button>
        </div>
      </aside>

      <CurrentUserProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={currentUser}
        onPasswordChanged={handlePasswordChanged}
        onSignOut={handleSignOut}
        propertyId={propertyId}
        propertyName={propertyBrand.hotelName}
        currency={homeCurrency}
        cachedTransactions={transactions}
      />

      <div className={`min-w-0 transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-[100px]" : "lg:pl-[292px]"}`}>
        <header className="app-header sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((value) => !value)}
              className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-controls="workspace-sidebar"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (sidebarCollapsed) setExpanded(new Set(collapsedExpanded));
                else setCollapsedExpanded(new Set(expanded));
                setSidebarCollapsed((value) => !value);
              }}
              className="hidden h-9 w-9 place-items-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-50 lg:grid"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-controls="workspace-sidebar"
              aria-expanded={!sidebarCollapsed}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
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
              
              <span>  {dateLabel(property.systemDate)}</span>
            </div>
            <TopIcon label="Calendar">
              <Calendar className="h-4 w-4" />
            </TopIcon>
            <NotificationMenu propertyId={propertyId} />
            <TopIcon label="Search">
              <Search className="h-4 w-4" />
            </TopIcon>
            <TopIcon
              label={colorScheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleColorScheme}
              pressed={colorScheme === "dark"}
            >
              {colorScheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </TopIcon>
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

function TopIcon({
  label,
  children,
  onClick,
  pressed
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      title={label}
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
