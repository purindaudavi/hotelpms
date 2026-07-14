"use client";

import { type Dispatch, FormEvent, type ReactNode, type SetStateAction, useEffect, useMemo, useState } from "react";
import { CreditCard, Edit3, ListChecks, Minus, Package, Pizza, Plus, RefreshCw, Search, Settings, ShoppingCart, Trash2 } from "lucide-react";
import type { PosCartLine, PosCategory, PosMenuItem, PosOrder, PosOutlet } from "../types";
import { cartTotal, itemMatchesSearch, money } from "../utils";
import { Drawer, Field, Modal, PosButton, PosFrame, PosPanel, SearchInput, SelectInput, TextInput } from "../components/pos-ui";

type PosOrderPageProps = {
  outlets: PosOutlet[];
  setOutlets: Dispatch<SetStateAction<PosOutlet[]>>;
  selectedOutletId: string | null;
  setSelectedOutletId: Dispatch<SetStateAction<string | null>>;
  categories: PosCategory[];
  setCategories: Dispatch<SetStateAction<PosCategory[]>>;
  menuItems: PosMenuItem[];
  setMenuItems: Dispatch<SetStateAction<PosMenuItem[]>>;
  cart: PosCartLine[];
  setCart: Dispatch<SetStateAction<PosCartLine[]>>;
  orders: PosOrder[];
  createOrder: (outlet: PosOutlet, lines: PosCartLine[], settled: boolean) => void;
  setToast: (message: string) => void;
};

export function PosOrderPage({
  outlets,
  setOutlets,
  selectedOutletId,
  setSelectedOutletId,
  categories,
  setCategories,
  menuItems,
  setMenuItems,
  cart,
  setCart,
  orders,
  createOrder,
  setToast
}: PosOrderPageProps) {
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "");
  const [outletModalOpen, setOutletModalOpen] = useState(!selectedOutletId);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PosCategory | null>(null);
  const [outletCreateOpen, setOutletCreateOpen] = useState(false);
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PosMenuItem | null>(null);
  const [ordersDrawerOpen, setOrdersDrawerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);

  const selectedOutlet = outlets.find((outlet) => outlet.id === selectedOutletId) ?? null;
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0] ?? null;
  const filteredItems = useMemo(
    () => menuItems.filter((item) => item.active && (!activeCategory || item.category === activeCategory.name) && itemMatchesSearch(item, search)),
    [activeCategory, menuItems, search]
  );
  const total = cartTotal(cart);

  useEffect(() => {
    if (!activeCategoryId && categories[0]) setActiveCategoryId(categories[0].id);
  }, [activeCategoryId, categories]);

  useEffect(() => {
    if (!selectedOutletId) setOutletModalOpen(true);
  }, [selectedOutletId]);

  function addToCart(item: PosMenuItem) {
    setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      if (existing) return current.map((line) => (line.item.id === item.id ? { ...line, qty: line.qty + 1 } : line));
      return [...current, { item, qty: 1 }];
    });
  }

  function updateQty(itemId: string, delta: number) {
    setCart((current) =>
      current
        .map((line) => (line.item.id === itemId ? { ...line, qty: Math.max(0, line.qty + delta) } : line))
        .filter((line) => line.qty > 0)
    );
  }

  function submitOrder(settled: boolean) {
    if (!selectedOutlet) {
      setOutletModalOpen(true);
      return;
    }
    if (!cart.length) {
      setToast("Add items before creating an order");
      return;
    }
    createOrder(selectedOutlet, cart, settled);
    setCart([]);
  }

  function openItemEditor(item: PosMenuItem) {
    setEditingItem(item);
    setItemDrawerOpen(true);
  }

  function saveItem(item: PosMenuItem) {
    setMenuItems((current) => (current.some((existing) => existing.id === item.id) ? current.map((existing) => (existing.id === item.id ? item : existing)) : [item, ...current]));
    setCart((current) => current.map((line) => (line.item.id === item.id ? { ...line, item } : line)));
    setEditingItem(null);
    setItemDrawerOpen(false);
    setToast(`${item.name} saved`);
  }

  function deleteItem(item: PosMenuItem) {
    setMenuItems((current) => current.filter((existing) => existing.id !== item.id));
    setCart((current) => current.filter((line) => line.item.id !== item.id));
    setToast(`${item.name} deleted`);
  }

  function saveCategory(name: string) {
    if (editingCategory) {
      const previousName = editingCategory.name;
      const nextCategory = { ...editingCategory, name };
      setCategories((current) => current.map((category) => (category.id === editingCategory.id ? nextCategory : category)));
      setMenuItems((current) => current.map((item) => (item.category === previousName ? { ...item, category: name } : item)));
      setCart((current) => current.map((line) => (line.item.category === previousName ? { ...line, item: { ...line.item, category: name } } : line)));
      setEditingCategory(null);
      setToast(`${name} category saved`);
    } else {
      const category: PosCategory = { id: `cat-${Date.now()}`, name };
      setCategories((current) => [...current, category]);
      setActiveCategoryId(category.id);
      setToast(`${name} category created`);
    }
    setCategoryModalOpen(false);
  }

  function deleteCategory(category: PosCategory) {
    if (categories.length <= 1) {
      setToast("At least one category is required");
      return;
    }
    setCategories((current) => {
      const next = current.filter((item) => item.id !== category.id);
      if (activeCategoryId === category.id) setActiveCategoryId(next[0]?.id ?? "");
      return next;
    });
    setMenuItems((current) => current.filter((item) => item.category !== category.name));
    setCart((current) => current.filter((line) => line.item.category !== category.name));
    setToast(`${category.name} category deleted`);
  }

  return (
    <PosFrame>
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
            <h1 className="text-3xl font-bold uppercase leading-tight tracking-normal">
              {selectedOutlet?.name ?? "Select Outlet"}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <PosButton icon={<RefreshCw className="h-4 w-4" />} onClick={() => setToast("Menu synced")}>
                Sync Menu
              </PosButton>
              <span className="grid h-16 w-16 place-items-center rounded-full bg-cyan-100 text-slate-900">
                <Package className="h-5 w-5" />
              </span>
              <PosButton className="px-3 text-blue-500">LKR</PosButton>
              <PosButton className="min-w-72 justify-start truncate" onClick={() => setOutletModalOpen(true)}>
                {selectedOutlet?.name ?? "Select Outlet"}
              </PosButton>
              <PosButton icon={<Plus className="h-4 w-4" />} onClick={() => setOutletCreateOpen(true)} />
              <PosButton icon={<Settings className="h-4 w-4" />} onClick={() => setSettingsDrawerOpen(true)} />
              <PosButton icon={<ListChecks className="h-4 w-4" />} onClick={() => setOrdersDrawerOpen(true)}>
                Orders Management
              </PosButton>
              <div className="relative">
                <PosButton icon={<Settings className="h-4 w-4" />} onClick={() => setActionOpen((value) => !value)}>
                  Action
                </PosButton>
                {actionOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-56 rounded-lg border border-line bg-white p-2 shadow-panel">
                    <ActionItem onClick={() => { setEditingItem(null); setItemDrawerOpen(true); setActionOpen(false); }}>Add item</ActionItem>
                    <ActionItem onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); setActionOpen(false); }}>Add category</ActionItem>
                    <ActionItem onClick={() => { setCart([]); setActionOpen(false); setToast("Cart cleared"); }}>Clear cart</ActionItem>
                    <ActionItem onClick={() => { setOutletModalOpen(true); setActionOpen(false); }}>Switch outlet</ActionItem>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <SearchInput icon={<Search className="h-5 w-5" />} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." />

          <PosPanel className="border-blue-200 bg-blue-50" bodyClassName="p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-500">Department</p>
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={`rounded-md px-6 py-4 text-sm font-bold uppercase shadow-sm ${
                    activeCategoryId === category.id ? "bg-blue-500 text-white" : "border border-blue-200 bg-white text-blue-600"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </PosPanel>

          <PosPanel className="min-h-[650px] border-blue-200" bodyClassName="grid min-h-[650px] grid-cols-[230px_1fr] p-0">
            <aside className="border-r border-blue-200 bg-blue-50">
              <div className="flex h-16 items-center justify-between border-b border-blue-200 px-4">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-500">Categories</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryModalOpen(true);
                  }}
                  className="grid h-10 w-10 place-items-center rounded-md bg-blue-500 text-white"
                  aria-label="Add category"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2 p-3">
              {categories.map((category) => (
                <div key={category.id} className={`flex h-14 items-center gap-1 rounded-md shadow-sm ${activeCategoryId === category.id ? "bg-blue-500 text-white" : "bg-white text-blue-600"}`}>
                  <button
                    type="button"
                    onClick={() => setActiveCategoryId(category.id)}
                    className="min-w-0 flex-1 truncate px-4 text-left text-sm font-bold uppercase"
                  >
                    {category.name}
                  </button>
                  <button
                    type="button"
                    title="Edit category"
                    onClick={() => {
                      setEditingCategory(category);
                      setCategoryModalOpen(true);
                    }}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-white/20"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Delete category"
                    onClick={() => deleteCategory(category)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-white/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              </div>
            </aside>

            <div className="grid content-start gap-4 p-5 md:grid-cols-2 2xl:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setItemDrawerOpen(true);
                }}
                className="grid min-h-64 place-items-center rounded-lg border-2 border-dashed border-blue-400 bg-blue-50 text-blue-600"
              >
                <span className="text-center text-sm font-semibold">
                  <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-blue-500 text-white">
                    <Plus className="h-7 w-7" />
                  </span>
                  Add Item
                </span>
              </button>

              {filteredItems.map((item) => (
                <section key={item.id} className="overflow-hidden rounded-lg border border-blue-200 bg-white shadow-sm">
                  <div className="relative grid h-36 place-items-center bg-slate-50 text-slate-300">
                    <Pizza className="h-28 w-28 stroke-[1.25]" />
                    <div className="absolute left-3 top-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openItemEditor(item)}
                        aria-label={`Edit ${item.name}`}
                        className="grid h-9 w-9 place-items-center rounded-md bg-white text-slate-700 shadow"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item)}
                        aria-label={`Delete ${item.name}`}
                        className="grid h-9 w-9 place-items-center rounded-md bg-white text-rose-500 shadow"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      aria-label={`Add ${item.name}`}
                      className="absolute bottom-4 right-4 grid h-12 w-12 place-items-center rounded-full bg-blue-500 text-white shadow-lg"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold uppercase">{item.name}</h3>
                    <p className="mt-1 text-sm text-blue-500">code - {item.code}</p>
                    <p className="mt-3 text-2xl font-semibold text-blue-500">{money(item.price)}</p>
                  </div>
                </section>
              ))}
            </div>
          </PosPanel>
        </section>

        <CartPanel cart={cart} total={total} onUpdateQty={updateQty} onClear={() => setCart([])} onSend={() => submitOrder(false)} onSettle={() => submitOrder(true)} />
      </div>

      {outletModalOpen ? (
        <OutletModal
          outlets={outlets}
          onSelect={(id) => {
            setSelectedOutletId(id);
            setOutletModalOpen(false);
          }}
          onCreate={() => {
            setOutletModalOpen(false);
            setOutletCreateOpen(true);
          }}
          onClose={() => {
            if (selectedOutletId) setOutletModalOpen(false);
          }}
        />
      ) : null}

      {outletCreateOpen ? (
        <CreateOutletModal
          onClose={() => setOutletCreateOpen(false)}
          onCreate={(name) => {
            const outlet: PosOutlet = {
              id: `outlet-${Date.now()}`,
              name,
              currency: "LKR",
              active: true
            };
            setOutlets((current) => [...current, outlet]);
            setSelectedOutletId(outlet.id);
            setOutletCreateOpen(false);
            setToast(`${name} created`);
          }}
        />
      ) : null}

      {categoryModalOpen ? (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          onSave={saveCategory}
        />
      ) : null}

      {itemDrawerOpen ? (
        <ItemDrawer
          item={editingItem}
          categories={categories}
          defaultCategory={editingItem?.category ?? activeCategory?.name ?? "BEVERAGES"}
          onClose={() => {
            setItemDrawerOpen(false);
            setEditingItem(null);
          }}
          onSave={saveItem}
        />
      ) : null}

      {ordersDrawerOpen ? <OrdersDrawer orders={orders} onClose={() => setOrdersDrawerOpen(false)} /> : null}
      {settingsDrawerOpen ? <SettingsDrawer selectedOutlet={selectedOutlet} onClose={() => setSettingsDrawerOpen(false)} /> : null}
    </PosFrame>
  );
}

function ActionItem({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100">
      {children}
    </button>
  );
}

function CartPanel({
  cart,
  total,
  onUpdateQty,
  onClear,
  onSend,
  onSettle
}: {
  cart: PosCartLine[];
  total: number;
  onUpdateQty: (itemId: string, delta: number) => void;
  onClear: () => void;
  onSend: () => void;
  onSettle: () => void;
}) {
  return (
    <PosPanel className="h-fit min-h-[340px]" bodyClassName="p-7">
      <h2 className="flex items-center gap-3 text-3xl font-semibold">
        <ShoppingCart className="h-7 w-7" />
        Cart
      </h2>
      {!cart.length ? (
        <div className="grid min-h-72 place-items-center text-center text-slate-500">
          <div>
            <Package className="mx-auto mb-5 h-16 w-16 text-slate-400" />
            <p className="text-2xl font-semibold text-ink">Your cart is empty</p>
            <p className="mt-3 text-base">Add items to your cart</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {cart.map((line) => (
            <div key={line.item.id} className="rounded-lg border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{line.item.name}</p>
                  <p className="text-sm text-slate-500">{money(line.item.price)}</p>
                </div>
                <button type="button" onClick={() => onUpdateQty(line.item.id, -line.qty)} className="text-rose-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onUpdateQty(line.item.id, -1)} className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-7 text-center font-semibold">{line.qty}</span>
                  <button type="button" onClick={() => onUpdateQty(line.item.id, 1)} className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="font-semibold">{money(line.item.price * line.qty)}</p>
              </div>
            </div>
          ))}
          <div className="border-t border-line pt-5">
            <div className="mb-4 flex items-center justify-between text-xl font-semibold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            <div className="grid gap-2">
              <PosButton tone="dark" onClick={onSend}>Send KOT/BOT</PosButton>
              <PosButton tone="blue" icon={<CreditCard className="h-4 w-4" />} onClick={onSettle}>Settle Order</PosButton>
              <PosButton onClick={onClear}>Clear Cart</PosButton>
            </div>
          </div>
        </div>
      )}
    </PosPanel>
  );
}

function OutletModal({
  outlets,
  onSelect,
  onCreate,
  onClose
}: {
  outlets: PosOutlet[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Select an Outlet" subtitle="Please select your working outlet before continuing." onClose={onClose}>
      <div className="space-y-3">
        {outlets.filter((outlet) => outlet.active).map((outlet) => (
          <button
            key={outlet.id}
            type="button"
            onClick={() => onSelect(outlet.id)}
            className="h-14 w-full rounded-md bg-slate-950 px-4 text-sm font-bold uppercase text-white hover:bg-slate-800"
          >
            {outlet.name}
          </button>
        ))}
      </div>
      <div className="mt-10 text-center">
        <PosButton tone="dark" icon={<Plus className="h-4 w-4" />} onClick={onCreate}>
          Create Outlet
        </PosButton>
      </div>
    </Modal>
  );
}

function CreateOutletModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = name.trim().toUpperCase();
    if (!value) return;
    onCreate(value);
  }

  return (
    <Modal title="Create Outlet" subtitle="Create a working outlet for POS orders." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Outlet name">
          <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="RONAKA NEW OUTLET" />
        </Field>
        <div className="flex justify-end gap-2">
          <PosButton onClick={onClose}>Cancel</PosButton>
          <PosButton type="submit" tone="dark">Create Outlet</PosButton>
        </div>
      </form>
    </Modal>
  );
}

function CategoryModal({
  category,
  onClose,
  onSave
}: {
  category: PosCategory | null;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = name.trim().toUpperCase();
    if (!value) return;
    onSave(value);
  }

  return (
    <Modal title={category ? "Edit Category" : "Create Category"} subtitle="Manage a department category for menu items." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Category name">
          <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="FOOD" />
        </Field>
        <div className="flex justify-end gap-2">
          <PosButton onClick={onClose}>Cancel</PosButton>
          <PosButton type="submit" tone="dark">{category ? "Save Category" : "Create Category"}</PosButton>
        </div>
      </form>
    </Modal>
  );
}

function ItemDrawer({
  item,
  categories,
  defaultCategory,
  onClose,
  onSave
}: {
  item: PosMenuItem | null;
  categories: PosCategory[];
  defaultCategory: string;
  onClose: () => void;
  onSave: (item: PosMenuItem) => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [code, setCode] = useState(item?.code ?? "");
  const [category, setCategory] = useState(defaultCategory);
  const [price, setPrice] = useState(item?.price ?? 0);

  function submit(event: FormEvent) {
    event.preventDefault();
    const itemName = name.trim().toUpperCase();
    if (!itemName) return;
    onSave({
      id: item?.id ?? `item-${Date.now()}`,
      name: itemName,
      code: code.trim() || String(Date.now()).slice(-3),
      category,
      price: Number(price) || 0,
      active: true
    });
  }

  return (
    <Drawer title={item ? "Edit Item" : "Add Item"} subtitle="Manage a menu item for the selected outlet." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Item name">
          <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="WATER" />
        </Field>
        <Field label="Code">
          <TextInput value={code} onChange={(event) => setCode(event.target.value)} placeholder="001" />
        </Field>
        <Field label="Category">
          <SelectInput value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Price">
          <TextInput type="number" min={0} value={price} onChange={(event) => setPrice(Number(event.target.value))} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <PosButton onClick={onClose}>Cancel</PosButton>
          <PosButton type="submit" tone="dark">{item ? "Save Item" : "Add Item"}</PosButton>
        </div>
      </form>
    </Drawer>
  );
}

function OrdersDrawer({ orders, onClose }: { orders: PosOrder[]; onClose: () => void }) {
  return (
    <Drawer title="Orders Management" subtitle="View current POS orders." onClose={onClose} width="max-w-4xl">
      {orders.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["Order", "Ticket", "Outlet", "Items", "Status", "Total"].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-line">
                  <td className="px-4 py-4 font-semibold">{order.orderNo}</td>
                  <td className="px-4 py-4">{order.ticketNo}</td>
                  <td className="px-4 py-4">{order.outletName}</td>
                  <td className="px-4 py-4">{order.lines.map((line) => `${line.qty}x ${line.item.name}`).join(", ")}</td>
                  <td className="px-4 py-4">{order.status}</td>
                  <td className="px-4 py-4 font-semibold">{money(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid min-h-48 place-items-center text-slate-500">No orders yet.</div>
      )}
    </Drawer>
  );
}

function SettingsDrawer({ selectedOutlet, onClose }: { selectedOutlet: PosOutlet | null; onClose: () => void }) {
  return (
    <Drawer title="POS Settings" subtitle={selectedOutlet?.name ?? "No outlet selected"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Currency">
          <TextInput value={selectedOutlet?.currency ?? "LKR"} readOnly />
        </Field>
        <label className="flex items-center gap-3 rounded-lg border border-line p-4 text-sm font-semibold">
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-slate-950" />
          Print KOT/BOT automatically
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-line p-4 text-sm font-semibold">
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-slate-950" />
          Show order confirmation before checkout
        </label>
        <div className="flex justify-end">
          <PosButton tone="dark" onClick={onClose}>Save Settings</PosButton>
        </div>
      </div>
    </Drawer>
  );
}
