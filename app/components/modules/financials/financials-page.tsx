"use client";

import { type Dispatch, type FormEvent, type SetStateAction, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  FileText,
  Filter,
  Paperclip,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X
} from "lucide-react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { dateLabel, type FinancialTransaction, property, type Reservation } from "@/app/data/pms-data";
import { ChartOfAccountantsPage } from "./chartofaccountants";
import { IntegrationsPage } from "./integrations";
import { ProfitLossPage } from "./profit&loss";
import { SuppliersPage } from "./suppliers";
import { TransferFundsPage } from "./transferfunds";

type FinancialsPageProps = {
  activePath: string;
  propertyId: string;
  reservations: Reservation[];
  transactions: FinancialTransaction[];
  setTransactions: Dispatch<SetStateAction<FinancialTransaction[]>>;
  setToast: (message: string) => void;
};

type FrontOfficeTransaction = {
  id: string;
  category: string;
  description: string;
  date: string;
  amount: number;
  status: "Completed" | "Pending" | "Cancelled";
};

type PurchaseStatus = "Unpaid" | "Paid";

type GlLine = {
  id: string;
  account: string;
  amount: number;
  memo: string;
};

type Purchase = {
  id: string;
  supplier: string;
  purchaseDate: string;
  dueDate: string;
  invoiceNumber: string;
  referenceAmount: number;
  narration: string;
  attachments: string[];
  glLines: GlLine[];
  status: PurchaseStatus;
  createdAt: string;
};

type Expense = {
  id: string;
  date: string;
  expenseType: string;
  paidUsing: string;
  description: string;
  amount: number;
  attachments: string[];
  remark: string;
  status: "Posted";
};

type Supplier = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  vatNo: string;
  commission: number;
  category: string;
  status: "Active" | "Inactive";
};

type ReceivableStatus = "To be Paid" | "Paid";

type Receivable = {
  id: string;
  docNo: string;
  resNo: string;
  name: string;
  tourNo: string;
  date: string;
  invValue: number;
  bookerName: string;
  paid: number;
  balance: number;
  age: number;
  status: ReceivableStatus;
};

type TravelAgent = {
  id: string;
  name: string;
  contactPerson: string;
  agentType: string;
  email: string;
  phone: string;
  commission: number;
  address: string;
  vatNo: string;
  code: string;
  status: "Active" | "Inactive";
};

type AgentImportPreview = {
  rows: TravelAgent[];
  skipped: number;
};

const initialFrontOfficeTransactions: FrontOfficeTransaction[] = [
  {
    id: "FOT-002",
    category: "Room Change",
    description: "Moved from Room 101 to 102",
    date: "2023-04-04",
    amount: 20,
    status: "Completed"
  },
  {
    id: "FOT-001",
    category: "Check-in",
    description: "Guest checked into Room 101",
    date: "2023-04-02",
    amount: 0,
    status: "Completed"
  }
];

const initialSuppliers: Supplier[] = [];

const initialReceivables: Receivable[] = [
  {
    id: "rec-1052171005",
    docNo: "1052171005",
    resNo: "1052711005",
    name: "Agoda",
    tourNo: "2016815254",
    date: "2026-05-28T00:00:00",
    invValue: 5188.91,
    bookerName: "-",
    paid: 0,
    balance: 5188.91,
    age: 19,
    status: "To be Paid"
  }
];

const supplierCategories = ["Food & Beverage", "Laundry", "Utilities", "Maintenance", "Room Amenities", "Other"];
const expenseAccounts = ["Electricity", "Water", "Internet", "Laundry", "Room Amenities", "Repairs", "Staff Meal"];
const paymentAccounts = ["Cash Account", "Bank Account", "Card Settlement", "Petty Cash"];
const glAccounts = ["Cost of Goods Sold", "Food Purchases", "Laundry Expense", "Maintenance Expense", "Utilities", "Room Amenities"];

export function FinancialsPage(props: FinancialsPageProps) {
  const keyPrefix = `staypilot:${props.propertyId}:financials`;
  const [frontOfficeTransactions] = useSessionState<FrontOfficeTransaction[]>(`${keyPrefix}:front-office-transactions`, initialFrontOfficeTransactions);
  const [purchases, setPurchases] = useSessionState<Purchase[]>(`${keyPrefix}:purchases`, []);
  const [expenses, setExpenses] = useSessionState<Expense[]>(`${keyPrefix}:expenses`, []);
  const [suppliers, setSuppliers] = useSessionState<Supplier[]>(`${keyPrefix}:suppliers`, initialSuppliers);
  const [receivables, setReceivables] = useSessionState<Receivable[]>(`${keyPrefix}:receivables`, initialReceivables);
  const [agents, setAgents] = useSessionState<TravelAgent[]>(`${keyPrefix}:travel-agents`, []);
  const path = props.activePath;
  const shared = {
    ...props,
    purchases,
    setPurchases,
    expenses,
    setExpenses,
    suppliers,
    setSuppliers,
    receivables,
    setReceivables,
    agents,
    setAgents
  };

  if (path.endsWith("purchases")) return <PurchasesPage {...shared} />;
  if (path.endsWith("expenses")) return <ExpensesPage {...shared} />;
  if (path.endsWith("payables")) return <PayablesPage {...shared} />;
  if (path.endsWith("receivables")) return <ReceivablesPage {...shared} />;
  if (path.endsWith("profit-loss")) return <ProfitLossPage transactions={props.transactions} purchases={purchases} expenses={expenses} setToast={props.setToast} />;
  if (path.endsWith("chart-of-accounts")) return <ChartOfAccountantsPage propertyId={props.propertyId} setToast={props.setToast} />;
  if (path.endsWith("suppliers")) return <SuppliersPage suppliers={suppliers} setSuppliers={setSuppliers} setToast={props.setToast} />;
  if (path.endsWith("transfer-funds")) return <TransferFundsPage propertyId={props.propertyId} setTransactions={props.setTransactions} setToast={props.setToast} />;
  if (path.endsWith("integrations")) return <IntegrationsPage />;

  return <TransactionsPage {...props} frontOfficeTransactions={frontOfficeTransactions} />;
}

type SharedFinancialState = FinancialsPageProps & {
  purchases: Purchase[];
  setPurchases: Dispatch<SetStateAction<Purchase[]>>;
  expenses: Expense[];
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  suppliers: Supplier[];
  setSuppliers: Dispatch<SetStateAction<Supplier[]>>;
  receivables: Receivable[];
  setReceivables: Dispatch<SetStateAction<Receivable[]>>;
  agents: TravelAgent[];
  setAgents: Dispatch<SetStateAction<TravelAgent[]>>;
};

function TransactionsPage({
  transactions,
  frontOfficeTransactions
}: FinancialsPageProps & {
  frontOfficeTransactions: FrontOfficeTransaction[];
}) {
  const [activeTab, setActiveTab] = useState<"financial" | "front-office">("financial");
  const [search, setSearch] = useState("");
  const [financialPage, setFinancialPage] = useState(1);
  const [frontOfficePage, setFrontOfficePage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewingFinancial, setViewingFinancial] = useState<FinancialTransaction | null>(null);
  const [viewingFrontOffice, setViewingFrontOffice] = useState<FrontOfficeTransaction | null>(null);

  const financialRows = useMemo(() => {
    const needle = normalize(search);
    if (!needle) return transactions;
    return transactions.filter((tran) => normalize([tran.date, tran.type, tran.documentNo, tran.value, tran.reservationNo, tran.roomNo, tran.createdBy, tran.status].join(" ")).includes(needle));
  }, [transactions, search]);

  const frontOfficeRows = useMemo(() => {
    const needle = normalize(search);
    if (!needle) return frontOfficeTransactions;
    return frontOfficeTransactions.filter((tran) => normalize([tran.id, tran.category, tran.description, tran.date, tran.amount, tran.status].join(" ")).includes(needle));
  }, [frontOfficeTransactions, search]);

  const financialPaged = paginate(financialRows, financialPage, rowsPerPage);
  const frontOfficePaged = paginate(frontOfficeRows, frontOfficePage, rowsPerPage);

  return (
    <FinancialFrame>
      <SegmentedControl
        tabs={[
          { label: "Financial Transactions", value: "financial" },
          { label: "Front Office Transactions", value: "front-office" }
        ]}
        value={activeTab}
        onChange={(value) => {
          setActiveTab(value);
          setSearch("");
        }}
      />

      <SearchInput value={search} onChange={setSearch} />

      {activeTab === "financial" ? (
        <DataPanel title="Transactions">
          <div className="overflow-x-auto">
            <table className="min-w-[1220px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-slate-500">
                  {["Tran Date", "Tran Type", "Doc No", "Tran Value", "Reservation No", "Room No", "Created By", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {financialPaged.rows.map((tran) => (
                  <tr key={tran.id} className="border-b border-line hover:bg-slate-50">
                    <td className="px-4 py-4">{shortDate(tran.date)}</td>
                    <td className="px-4 py-4">{tran.type}</td>
                    <td className="px-4 py-4">{tran.documentNo}</td>
                    <td className="px-4 py-4">{money(tran.value)}</td>
                    <td className="px-4 py-4">{tran.reservationNo}</td>
                    <td className="px-4 py-4">{tran.roomNo}</td>
                    <td className="max-w-[190px] truncate px-4 py-4">{tran.createdBy}</td>
                    <td className="px-4 py-4">
                      <StatusPill tone={tran.status === "Active" ? "green" : tran.status === "Pending" ? "amber" : "slate"}>{tran.status}</StatusPill>
                    </td>
                    <td className="px-4 py-4">
                      <SmallButton onClick={() => setViewingFinancial(tran)}>View</SmallButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={financialRows.length} page={financialPaged.page} rowsPerPage={rowsPerPage} onPageChange={setFinancialPage} onRowsPerPageChange={setRowsPerPage} />
        </DataPanel>
      ) : (
        <DataPanel title="Front Office Transactions">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-slate-500">
                  {["ID", "Category", "Description", "Date", "Amount", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {frontOfficePaged.rows.map((tran) => (
                  <tr key={tran.id} className="border-b border-line hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold">{tran.id}</td>
                    <td className="px-4 py-4">{tran.category}</td>
                    <td className="px-4 py-4">{tran.description}</td>
                    <td className="px-4 py-4">{tran.date}</td>
                    <td className="px-4 py-4">{usd(tran.amount)}</td>
                    <td className="px-4 py-4">
                      <StatusPill tone="green">{tran.status}</StatusPill>
                    </td>
                    <td className="px-4 py-4">
                      <SmallButton onClick={() => setViewingFrontOffice(tran)}>View</SmallButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={frontOfficeRows.length} page={frontOfficePaged.page} rowsPerPage={rowsPerPage} onPageChange={setFrontOfficePage} onRowsPerPageChange={setRowsPerPage} />
        </DataPanel>
      )}

      {viewingFinancial ? <FinancialTransactionDrawer transaction={viewingFinancial} onClose={() => setViewingFinancial(null)} /> : null}
      {viewingFrontOffice ? <FrontOfficeTransactionDrawer transaction={viewingFrontOffice} onClose={() => setViewingFrontOffice(null)} /> : null}
    </FinancialFrame>
  );
}

function PurchasesPage({ purchases, setPurchases, suppliers, setSuppliers, setTransactions, setToast }: SharedFinancialState) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"Unpaid" | "Paid" | "All">("Unpaid");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewing, setViewing] = useState<Purchase | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const visiblePurchases = useMemo(() => {
    const needle = normalize(search);
    return purchases.filter((purchase) => {
      const matchesStatus = status === "All" || purchase.status === status;
      const text = normalize([purchase.supplier, purchase.invoiceNumber, purchase.referenceAmount, purchase.narration, purchase.status].join(" "));
      return matchesStatus && (!needle || text.includes(needle));
    });
  }, [purchases, search, status]);

  const paged = paginate(visiblePurchases, page, rowsPerPage);

  function savePurchase(purchase: Purchase) {
    setPurchases((current) => [purchase, ...current]);
    setTransactions((current) => [makeTransaction("Purchase", purchase.purchaseDate, purchase.invoiceNumber, purchase.referenceAmount, "-", "-", "ASIRI PERERA"), ...current]);
    setDrawerOpen(false);
    setToast("Purchase saved for this session");
  }

  function markPurchasePaid(purchase: Purchase) {
    setPurchases((current) => current.map((item) => (item.id === purchase.id ? { ...item, status: "Paid" } : item)));
    setTransactions((current) => [makeTransaction("Supplier Payment", property.systemDate, `PAY-${purchase.invoiceNumber}`, purchase.referenceAmount, "-", "-", "ASIRI PERERA"), ...current]);
    setToast(`${purchase.invoiceNumber} marked paid`);
  }

  return (
    <FinancialFrame>
      <PageActionBar title="Purchases">
        <ActionButton tone="dark" onClick={() => setDrawerOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Purchase
        </ActionButton>
      </PageActionBar>

      <SearchInput value={search} onChange={setSearch} />

      <DataPanel
        title="Purchases"
        action={
          <SegmentedControl
            compact
            tabs={[
              { label: "Unpaid", value: "Unpaid" },
              { label: "Paid", value: "Paid" },
              { label: "All", value: "All" }
            ]}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        }
      >
        {visiblePurchases.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-slate-500">
                    {["Supplier", "Purchase Date", "Due Date", "Invoice Number", "Reference Amount", "Status", "Actions"].map((heading) => (
                      <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.rows.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-line hover:bg-slate-50">
                      <td className="px-4 py-4">{purchase.supplier}</td>
                      <td className="px-4 py-4">{shortDate(purchase.purchaseDate)}</td>
                      <td className="px-4 py-4">{shortDate(purchase.dueDate)}</td>
                      <td className="px-4 py-4">{purchase.invoiceNumber}</td>
                      <td className="px-4 py-4">{money(purchase.referenceAmount)}</td>
                      <td className="px-4 py-4">
                        <StatusPill tone={purchase.status === "Paid" ? "green" : "amber"}>{purchase.status}</StatusPill>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <SmallButton onClick={() => setViewing(purchase)}>View</SmallButton>
                          {purchase.status === "Unpaid" ? <SmallButton onClick={() => markPurchasePaid(purchase)}>Pay</SmallButton> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={visiblePurchases.length} page={paged.page} rowsPerPage={rowsPerPage} onPageChange={setPage} onRowsPerPageChange={setRowsPerPage} />
          </>
        ) : (
          <EmptyInline message={`No ${status === "All" ? "" : status.toLowerCase() + " "}purchases`} />
        )}
      </DataPanel>

      {drawerOpen ? (
        <PurchaseDrawer
          suppliers={suppliers}
          onClose={() => setDrawerOpen(false)}
          onSave={savePurchase}
          onSaveSupplier={(supplier) => {
            setSuppliers((current) => upsertById(current, supplier));
            setToast(`${supplier.name} saved`);
          }}
        />
      ) : null}
      {viewing ? <PurchaseViewDrawer purchase={viewing} onClose={() => setViewing(null)} /> : null}
    </FinancialFrame>
  );
}

function ExpensesPage({ expenses, setExpenses, setTransactions, setToast }: SharedFinancialState) {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewing, setViewing] = useState<Expense | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const visibleExpenses = useMemo(() => {
    const needle = normalize(search);
    if (!needle) return expenses;
    return expenses.filter((expense) => normalize([expense.date, expense.expenseType, expense.paidUsing, expense.description, expense.amount, expense.remark].join(" ")).includes(needle));
  }, [expenses, search]);

  const paged = paginate(visibleExpenses, page, rowsPerPage);

  function saveExpense(expense: Expense) {
    setExpenses((current) => [expense, ...current]);
    setTransactions((current) => [makeTransaction("Expense", expense.date, `EXP-${expense.id.slice(-6)}`, expense.amount, "-", "-", "ASIRI PERERA"), ...current]);
    setDrawerOpen(false);
    setToast("Expense saved for this session");
  }

  return (
    <FinancialFrame>
      <PageActionBar title="Expenses">
        <ActionButton tone="dark" onClick={() => setDrawerOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Expense
        </ActionButton>
      </PageActionBar>

      <SearchInput value={search} onChange={setSearch} />

      <DataPanel title="Expenses">
        {visibleExpenses.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-slate-500">
                    {["Date", "Expense Type/Account", "Paid Using", "Description", "Amount", "Status", "Actions"].map((heading) => (
                      <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.rows.map((expense) => (
                    <tr key={expense.id} className="border-b border-line hover:bg-slate-50">
                      <td className="px-4 py-4">{shortDate(expense.date)}</td>
                      <td className="px-4 py-4">{expense.expenseType}</td>
                      <td className="px-4 py-4">{expense.paidUsing}</td>
                      <td className="px-4 py-4">{expense.description || "-"}</td>
                      <td className="px-4 py-4">{money(expense.amount)}</td>
                      <td className="px-4 py-4">
                        <StatusPill tone="green">{expense.status}</StatusPill>
                      </td>
                      <td className="px-4 py-4">
                        <SmallButton onClick={() => setViewing(expense)}>View</SmallButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={visibleExpenses.length} page={paged.page} rowsPerPage={rowsPerPage} onPageChange={setPage} onRowsPerPageChange={setRowsPerPage} />
          </>
        ) : (
          <div className="grid min-h-[240px] place-items-center text-center">
            <div>
              <p className="text-5xl text-slate-500">$</p>
              <p className="mt-2 text-lg font-semibold">No expenses found</p>
              <p className="mt-2 text-sm text-slate-500">Add an expense to get started</p>
            </div>
          </div>
        )}
      </DataPanel>

      {drawerOpen ? <ExpenseDrawer onClose={() => setDrawerOpen(false)} onSave={saveExpense} /> : null}
      {viewing ? <ExpenseViewDrawer expense={viewing} onClose={() => setViewing(null)} /> : null}
    </FinancialFrame>
  );
}

function PayablesPage({ purchases, setPurchases, suppliers, setSuppliers, setTransactions, setToast }: SharedFinancialState) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"To be paid" | "Paid">("To be paid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const payableRows = purchases.map((purchase) => ({
    id: purchase.id,
    supplier: purchase.supplier,
    invoiceNumber: purchase.invoiceNumber,
    dueDate: purchase.dueDate,
    amount: purchase.referenceAmount,
    status: purchase.status,
    purchase
  }));

  const visiblePayables = useMemo(() => {
    const needle = normalize(search);
    return payableRows.filter((row) => {
      const matchesStatus = status === "Paid" ? row.status === "Paid" : row.status === "Unpaid";
      const dueAge = daysBetween(row.dueDate, property.systemDate);
      const matchesOverdue = !overdueOnly || (row.status === "Unpaid" && dueAge > 0);
      const matchesSearch = !needle || normalize([row.supplier, row.invoiceNumber, row.amount, row.status].join(" ")).includes(needle);
      return matchesStatus && matchesOverdue && matchesSearch;
    });
  }, [payableRows, search, status, overdueOnly]);

  const paged = paginate(visiblePayables, page, rowsPerPage);

  function createSupplier(supplier: Supplier) {
    setSuppliers((current) => upsertById(current, supplier));
    setDrawerOpen(false);
    setToast(`${supplier.name} saved`);
  }

  function payPurchase(purchase: Purchase) {
    setPurchases((current) => current.map((item) => (item.id === purchase.id ? { ...item, status: "Paid" } : item)));
    setTransactions((current) => [makeTransaction("Supplier Payment", property.systemDate, `PAY-${purchase.invoiceNumber}`, purchase.referenceAmount, "-", "-", "ASIRI PERERA"), ...current]);
    setToast(`${purchase.invoiceNumber} marked paid`);
  }

  return (
    <FinancialFrame>
      <PageActionBar title="Payables">
        <SegmentedControl
          compact
          tabs={[
            { label: "To be paid", value: "To be paid" },
            { label: "Paid", value: "Paid" }
          ]}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <ActionButton onClick={() => setToast("Payables refreshed")}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </ActionButton>
        <ActionButton tone="dark" onClick={() => setDrawerOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Supplier
        </ActionButton>
      </PageActionBar>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} className="min-w-[280px] flex-1" />
        <ActionButton onClick={() => setFilterOpen((current) => !current)}>
          <Filter className="h-4 w-4" />
          Filter
        </ActionButton>
      </div>

      {filterOpen ? (
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} />
            Show overdue only
          </label>
        </div>
      ) : null}

      <DataPanel title="Payables">
        {visiblePayables.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-slate-500">
                    {["Supplier", "Invoice", "Due Date", "Amount", "Age", "Status", "Actions"].map((heading) => (
                      <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.rows.map((row) => (
                    <tr key={row.id} className="border-b border-line hover:bg-slate-50">
                      <td className="px-4 py-4">{row.supplier}</td>
                      <td className="px-4 py-4">{row.invoiceNumber}</td>
                      <td className="px-4 py-4">{shortDate(row.dueDate)}</td>
                      <td className="px-4 py-4">{money(row.amount)}</td>
                      <td className="px-4 py-4">{Math.max(daysBetween(row.dueDate, property.systemDate), 0)}</td>
                      <td className="px-4 py-4">
                        <StatusPill tone={row.status === "Paid" ? "green" : "amber"}>{row.status === "Paid" ? "Paid" : "To be paid"}</StatusPill>
                      </td>
                      <td className="px-4 py-4">
                        {row.status === "Unpaid" ? <SmallButton onClick={() => payPurchase(row.purchase)}>Pay</SmallButton> : <SmallButton>View</SmallButton>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination total={visiblePayables.length} page={paged.page} rowsPerPage={rowsPerPage} onPageChange={setPage} onRowsPerPageChange={setRowsPerPage} />
          </>
        ) : (
          <div className="grid min-h-[240px] place-items-center text-center">
            <div>
              <ArrowUpRight className="mx-auto h-10 w-10 text-slate-500" />
              <p className="mt-3 text-lg font-semibold">No payables found</p>
              <p className="mt-2 text-sm text-slate-500">Add a payable to get started</p>
            </div>
          </div>
        )}
      </DataPanel>

      {drawerOpen ? <SupplierDrawer supplierNames={suppliers.map((supplier) => supplier.name)} onClose={() => setDrawerOpen(false)} onSave={createSupplier} /> : null}
    </FinancialFrame>
  );
}

function ReceivablesPage({ receivables, setReceivables, agents, setAgents, setTransactions, setToast }: SharedFinancialState) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReceivableStatus>("To be Paid");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const counts = {
    "To be Paid": receivables.filter((row) => row.status === "To be Paid").length,
    Paid: receivables.filter((row) => row.status === "Paid").length
  };

  const visibleReceivables = useMemo(() => {
    const needle = normalize(search);
    return receivables.filter((row) => {
      const matchesStatus = row.status === status;
      const matchesSearch = !needle || normalize([row.docNo, row.resNo, row.name, row.tourNo, row.date, row.invValue, row.bookerName, row.paid, row.balance, row.age].join(" ")).includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [receivables, search, status]);

  const paged = paginate(visibleReceivables, page, rowsPerPage);

  function receive(row: Receivable) {
    const updated = {
      ...row,
      paid: row.invValue,
      balance: 0,
      status: "Paid" as const
    };
    setReceivables((current) => current.map((item) => (item.id === row.id ? updated : item)));
    setTransactions((current) => [makeTransaction("Receive Payment", property.systemDate, row.docNo, row.balance, row.resNo, "-", "ASIRI PERERA"), ...current]);
    setToast(`${row.docNo} received`);
  }

  function saveAgent(agent: TravelAgent) {
    setAgents((current) => upsertById(current, agent));
    setDrawerOpen(false);
    setToast(`${agent.name} saved`);
  }

  function exportReceivables() {
    downloadCsv(
      "receivables.csv",
      ["Doc No", "Res No", "Name", "Tour No", "Date", "INV Value", "Booker Name", "Paid", "Balance", "Age", "Status"],
      visibleReceivables.map((row) => [row.docNo, row.resNo, row.name, row.tourNo, row.date, row.invValue, row.bookerName, row.paid, row.balance, row.age, row.status])
    );
    setToast("Receivables exported");
  }

  return (
    <FinancialFrame>
      <PageActionBar title="Receivable">
        <ActionButton onClick={() => setToast("Receivables refreshed")}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </ActionButton>
        <ActionButton onClick={exportReceivables}>
          <Download className="h-4 w-4" />
          Export Excel
        </ActionButton>
        <ActionButton tone="dark" onClick={() => setDrawerOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Agent
        </ActionButton>
      </PageActionBar>

      <SearchInput value={search} onChange={setSearch} />

      <DataPanel
        action={
          <SegmentedControl
            compact
            tabs={[
              { label: `To be Paid (${counts["To be Paid"]})`, value: "To be Paid" },
              { label: `Paid (${counts.Paid})`, value: "Paid" }
            ]}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-slate-500">
                {["Doc No", "Res No", "Name", "Tour No", "Date", "INV Value", "Booker Name", "Paid", "Balance", "Age", "Action"].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((row) => (
                <tr key={row.id} className="border-b border-line hover:bg-slate-50">
                  <td className="px-4 py-4">{row.docNo}</td>
                  <td className="px-4 py-4">{row.resNo}</td>
                  <td className="px-4 py-4">{row.name}</td>
                  <td className="px-4 py-4">{row.tourNo}</td>
                  <td className="px-4 py-4">{row.date}</td>
                  <td className="px-4 py-4">{money(row.invValue)}</td>
                  <td className="px-4 py-4">{row.bookerName}</td>
                  <td className="px-4 py-4">{money(row.paid)}</td>
                  <td className="px-4 py-4">{money(row.balance)}</td>
                  <td className="px-4 py-4">{row.age}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <IconButton label="Print" onClick={() => window.print()}>
                        <Printer className="h-4 w-4" />
                      </IconButton>
                      {row.status === "To be Paid" ? <SmallButton dark onClick={() => receive(row)}>Receive</SmallButton> : <SmallButton>View</SmallButton>}
                    </div>
                  </td>
                </tr>
              ))}
              {!paged.rows.length ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-slate-500">No receivables found</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination total={visibleReceivables.length} page={paged.page} rowsPerPage={rowsPerPage} onPageChange={setPage} onRowsPerPageChange={setRowsPerPage} />
      </DataPanel>

      {drawerOpen ? (
        <TravelAgentDrawer
          agents={agents}
          onClose={() => setDrawerOpen(false)}
          onSave={saveAgent}
          onImport={(rows) => {
            setAgents((current) => mergeUniqueAgents(current, rows));
            setToast(`${rows.length} agents imported`);
          }}
        />
      ) : null}
    </FinancialFrame>
  );
}

function PurchaseDrawer({
  suppliers,
  onClose,
  onSave,
  onSaveSupplier
}: {
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (purchase: Purchase) => void;
  onSaveSupplier: (supplier: Supplier) => void;
}) {
  const [supplierDrawerOpen, setSupplierDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    supplier: suppliers[0]?.name ?? "",
    purchaseDate: property.systemDate,
    dueDate: property.systemDate,
    invoiceNumber: "",
    referenceAmount: "",
    narration: "",
    attachments: [] as string[],
    glLines: [{ id: uniqueId("gl"), account: "", amount: "", memo: "" }]
  });

  const glTotal = form.glLines.reduce((sum, line) => sum + toNumber(line.amount), 0);

  function updateLine(id: string, key: "account" | "amount" | "memo", value: string) {
    setForm((current) => ({
      ...current,
      glLines: current.glLines.map((line) => (line.id === id ? { ...line, [key]: value } : line))
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = toNumber(form.referenceAmount);
    const purchase: Purchase = {
      id: uniqueId("purchase"),
      supplier: form.supplier || "Unassigned Supplier",
      purchaseDate: form.purchaseDate,
      dueDate: form.dueDate,
      invoiceNumber: form.invoiceNumber || `SUPP-INV-${Date.now().toString().slice(-6)}`,
      referenceAmount: amount,
      narration: form.narration,
      attachments: form.attachments,
      glLines: form.glLines.map((line) => ({
        id: line.id,
        account: line.account || "Unassigned Account",
        amount: toNumber(line.amount),
        memo: line.memo
      })),
      status: "Unpaid",
      createdAt: new Date().toISOString()
    };
    onSave(purchase);
  }

  return (
    <>
      <Drawer title="Add Purchase" subtitle="Enter the details for the new purchase" width="max-w-[880px]" onClose={onClose}>
        <form onSubmit={submit} className="space-y-5">
          <FieldBlock label="Supplier">
            <div className="flex gap-2">
              <SelectField value={form.supplier} onChange={(value) => setForm({ ...form, supplier: value })} className="flex-1">
                <option value="">Select a supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                ))}
              </SelectField>
              <IconButton label="Add supplier" onClick={() => setSupplierDrawerOpen(true)}>
                <Plus className="h-5 w-5" />
              </IconButton>
            </div>
          </FieldBlock>

          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock label="Purchase Date">
              <TextField type="date" value={form.purchaseDate} onChange={(value) => setForm({ ...form, purchaseDate: value })} />
            </FieldBlock>
            <FieldBlock label="Due Date">
              <TextField type="date" value={form.dueDate} onChange={(value) => setForm({ ...form, dueDate: value })} />
            </FieldBlock>
            <FieldBlock label="Invoice Number">
              <TextField value={form.invoiceNumber} onChange={(value) => setForm({ ...form, invoiceNumber: value })} placeholder="e.g. SUPP-INV-000123" />
            </FieldBlock>
            <FieldBlock label="Reference Amount">
              <TextField type="number" value={form.referenceAmount} onChange={(value) => setForm({ ...form, referenceAmount: value })} placeholder="0.00" />
            </FieldBlock>
          </div>

          <FieldBlock label="Narration">
            <TextAreaField value={form.narration} onChange={(value) => setForm({ ...form, narration: value })} placeholder="Optional note to appear in ledger" />
          </FieldBlock>

          <AttachmentBox onFiles={(files) => setForm({ ...form, attachments: files.map((file) => file.name) })} />

          <section>
            <h3 className="mb-3 text-lg font-semibold">GL Lines</h3>
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {["Account", "Amount", "Memo", "Action"].map((heading) => (
                      <th key={heading} className="px-4 py-2 font-medium">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.glLines.map((line) => (
                    <tr key={line.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <SelectField value={line.account} onChange={(value) => updateLine(line.id, "account", value)}>
                          <option value="">Select account</option>
                          {glAccounts.map((account) => (
                            <option key={account}>{account}</option>
                          ))}
                        </SelectField>
                      </td>
                      <td className="px-4 py-3">
                        <TextField type="number" value={line.amount} onChange={(value) => updateLine(line.id, "amount", value)} placeholder="0.00" />
                      </td>
                      <td className="px-4 py-3">
                        <TextField value={line.memo} onChange={(value) => updateLine(line.id, "memo", value)} placeholder="-" />
                      </td>
                      <td className="px-4 py-3">
                        <IconButton
                          label="Remove line"
                          onClick={() => setForm((current) => ({ ...current, glLines: current.glLines.filter((item) => item.id !== line.id) || current.glLines }))}
                          disabled={form.glLines.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-line bg-white">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-sm text-slate-600">
                      <span className="mr-8">Total Debit <strong className="text-ink">{money(glTotal)}</strong></span>
                      <span>Total Credit <strong className="text-ink">{money(toNumber(form.referenceAmount))}</strong></span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, glLines: [...current.glLines, { id: uniqueId("gl"), account: "", amount: "", memo: "" }] }))}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add Line
            </button>
          </section>

          <DrawerActions>
            <ActionButton onClick={onClose}>Cancel</ActionButton>
            <ActionButton tone="dark" type="submit">Save</ActionButton>
          </DrawerActions>
        </form>
      </Drawer>

      {supplierDrawerOpen ? (
        <SupplierDrawer
          nested
          supplierNames={suppliers.map((supplier) => supplier.name)}
          onClose={() => setSupplierDrawerOpen(false)}
          onSave={(supplier) => {
            onSaveSupplier(supplier);
            setForm((current) => ({ ...current, supplier: supplier.name }));
            setSupplierDrawerOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function ExpenseDrawer({ onClose, onSave }: { onClose: () => void; onSave: (expense: Expense) => void }) {
  const [form, setForm] = useState({
    date: property.systemDate,
    expenseType: "",
    paidUsing: "",
    description: "",
    amount: "",
    attachments: [] as string[],
    remark: ""
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      id: uniqueId("expense"),
      date: form.date,
      expenseType: form.expenseType || "Unassigned Expense",
      paidUsing: form.paidUsing || "Cash Account",
      description: form.description,
      amount: toNumber(form.amount),
      attachments: form.attachments,
      remark: form.remark,
      status: "Posted"
    });
  }

  return (
    <Drawer title="Add Expense" subtitle="Enter the expense details" width="max-w-[660px]" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <FieldBlock label="Date">
          <TextField type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
        </FieldBlock>
        <FieldBlock label="Expense Type/Account">
          <SelectField value={form.expenseType} onChange={(value) => setForm({ ...form, expenseType: value })}>
            <option value="">Select expense type/account</option>
            {expenseAccounts.map((account) => (
              <option key={account}>{account}</option>
            ))}
          </SelectField>
        </FieldBlock>
        <FieldBlock label="Paid Using">
          <SelectField value={form.paidUsing} onChange={(value) => setForm({ ...form, paidUsing: value })}>
            <option value="">Select bank/cash account</option>
            {paymentAccounts.map((account) => (
              <option key={account}>{account}</option>
            ))}
          </SelectField>
        </FieldBlock>
        <FieldBlock label="Description">
          <TextAreaField value={form.description} onChange={(value) => setForm({ ...form, description: value })} placeholder="Electricity Bill - April" />
        </FieldBlock>
        <FieldBlock label="Amount (LKR)">
          <TextField type="number" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} placeholder="0.00 LKR" />
        </FieldBlock>
        <AttachmentBox onFiles={(files) => setForm({ ...form, attachments: files.map((file) => file.name) })} />
        <FieldBlock label="Remark">
          <TextAreaField value={form.remark} onChange={(value) => setForm({ ...form, remark: value })} placeholder="Optional remarks (e.g., invoice #)" />
        </FieldBlock>
        <DrawerActions>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton tone="dark" type="submit">Save</ActionButton>
        </DrawerActions>
      </form>
    </Drawer>
  );
}

function SupplierDrawer({
  supplierNames,
  nested = false,
  onClose,
  onSave
}: {
  supplierNames: string[];
  nested?: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    vatNo: "",
    commission: "0",
    category: "",
    status: "Active" as Supplier["status"]
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      id: supplierNames.includes(form.name) ? slugId("supplier", form.name) : uniqueId("supplier"),
      name: form.name || "Unnamed Supplier",
      email: form.email,
      phone: form.phone,
      address: form.address,
      vatNo: form.vatNo,
      commission: toNumber(form.commission),
      category: form.category || "Other",
      status: form.status
    });
  }

  return (
    <Drawer title="Add Supplier" subtitle="Enter the details for the new supplier" width="max-w-[760px]" onClose={onClose} nested={nested}>
      <form onSubmit={submit} className="space-y-5">
        <FieldBlock label="Name">
          <TextField value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="ABC Food Supplies" required />
        </FieldBlock>
        <FieldBlock label="Email">
          <TextField type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="john@abcfoods.com" />
        </FieldBlock>
        <FieldBlock label="Phone">
          <TextField value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} placeholder="+94 7X XXX XXXX" />
        </FieldBlock>
        <FieldBlock label="Address">
          <TextField value={form.address} onChange={(value) => setForm({ ...form, address: value })} placeholder="Address" />
        </FieldBlock>
        <FieldBlock label="VAT No">
          <TextField value={form.vatNo} onChange={(value) => setForm({ ...form, vatNo: value })} placeholder="(optional)" />
        </FieldBlock>
        <FieldBlock label="Commission %">
          <TextField type="number" value={form.commission} onChange={(value) => setForm({ ...form, commission: value })} placeholder="0" />
        </FieldBlock>
        <FieldBlock label="Category">
          <SelectField value={form.category} onChange={(value) => setForm({ ...form, category: value })}>
            <option value="">Select a category</option>
            {supplierCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </SelectField>
        </FieldBlock>
        <FieldBlock label="Status">
          <SelectField value={form.status} onChange={(value) => setForm({ ...form, status: value as Supplier["status"] })}>
            <option>Active</option>
            <option>Inactive</option>
          </SelectField>
        </FieldBlock>
        <DrawerActions>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton tone="dark" type="submit">Save</ActionButton>
        </DrawerActions>
      </form>
    </Drawer>
  );
}

function TravelAgentDrawer({
  agents,
  onClose,
  onSave,
  onImport
}: {
  agents: TravelAgent[];
  onClose: () => void;
  onSave: (agent: TravelAgent) => void;
  onImport: (rows: TravelAgent[]) => void;
}) {
  const [tab, setTab] = useState<"manual" | "excel">("manual");
  const [preview, setPreview] = useState(false);
  const [importPreview, setImportPreview] = useState<AgentImportPreview | null>(null);
  const [importError, setImportError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    agentType: "",
    email: "",
    phone: "",
    commission: "10",
    address: "",
    vatNo: "",
    code: "",
    status: "Active" as TravelAgent["status"]
  });

  function makeAgent(): TravelAgent {
    return {
      id: form.code ? slugId("agent", form.code) : uniqueId("agent"),
      name: form.name || "Unnamed Travel Agent",
      contactPerson: form.contactPerson,
      agentType: form.agentType || "Online Travel Agent",
      email: form.email,
      phone: form.phone,
      commission: toNumber(form.commission),
      address: form.address,
      vatNo: form.vatNo,
      code: form.code || `TA${Date.now().toString().slice(-4)}`,
      status: form.status
    };
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tab === "manual") onSave(makeAgent());
  }

  async function parseImport() {
    setImportError("");
    setImportPreview(null);
    if (!selectedFile) {
      setImportError("Choose an Excel-compatible CSV file first.");
      return;
    }
    try {
      const text = await readFileAsText(selectedFile);
      const parsed = parseAgentCsv(text, agents);
      setImportPreview(parsed);
    } catch {
      setImportError("Could not read that file. Download the template and upload it as CSV.");
    }
  }

  function downloadTemplate() {
    downloadCsv(
      "travel-agent-template.csv",
      ["Agent Name", "Name", "Agent Type", "Email", "Contact", "Commission", "Address", "VAT No", "Code", "Status"],
      [["Global Travels Ltd", "John Smith", "Online Travel Agent", "john@globaltravels.com", "+1 (555) 123-4567", "10", "123 Main St", "VAT123456", "TA001", "Active"]]
    );
  }

  const postPreview = tab === "manual" ? makeAgent() : importPreview?.rows ?? [];

  return (
    <Drawer title="Add Travel Agent" width="max-w-[1040px]" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <SegmentedControl
          tabs={[
            { label: "Add manually (POST)", value: "manual" },
            { label: "Import Excel", value: "excel" }
          ]}
          value={tab}
          onChange={(value) => {
            setTab(value);
            setPreview(false);
            setImportPreview(null);
            setImportError("");
          }}
          full
        />

        {tab === "manual" ? (
          <>
            <FieldBlock label="Name">
              <TextField value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Global Travels Ltd" required />
            </FieldBlock>
            <FieldBlock label="Contact Person">
              <TextField value={form.contactPerson} onChange={(value) => setForm({ ...form, contactPerson: value })} placeholder="John Smith" />
            </FieldBlock>
            <FieldBlock label="Agent Type">
              <SelectField value={form.agentType} onChange={(value) => setForm({ ...form, agentType: value })}>
                <option value="">Select TA Type</option>
                <option>Online Travel Agent</option>
                <option>Corporate</option>
                <option>Wholesale</option>
                <option>Direct Agent</option>
              </SelectField>
            </FieldBlock>
            <FieldBlock label="Email">
              <TextField type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="john@globaltravels.com" />
            </FieldBlock>
            <FieldBlock label="Phone">
              <TextField value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} placeholder="+1 (555) 123-4567" />
            </FieldBlock>
            <FieldBlock label="Commission">
              <TextField type="number" value={form.commission} onChange={(value) => setForm({ ...form, commission: value })} placeholder="10" />
            </FieldBlock>
            <FieldBlock label="Address">
              <TextField value={form.address} onChange={(value) => setForm({ ...form, address: value })} placeholder="123 Main St, Springfield" />
            </FieldBlock>
            <FieldBlock label="VAT No">
              <TextField value={form.vatNo} onChange={(value) => setForm({ ...form, vatNo: value })} placeholder="VAT123456" />
            </FieldBlock>
            <FieldBlock label="Code">
              <TextField value={form.code} onChange={(value) => setForm({ ...form, code: value })} placeholder="TA001" />
            </FieldBlock>
            <FieldBlock label="Status">
              <SelectField value={form.status} onChange={(value) => setForm({ ...form, status: value as TravelAgent["status"] })}>
                <option>Active</option>
                <option>Inactive</option>
              </SelectField>
            </FieldBlock>
          </>
        ) : (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-slate-600">
              Download the template, fill one row per travel agent, then upload. Use <strong>Agent Name</strong> for the agency and <strong>Name</strong> for the contact person.
              <strong> Contact</strong> maps to phone. Duplicates by email or phone are skipped.
            </p>
            <ActionButton className="w-full" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Download Excel template
            </ActionButton>
            <FieldBlock label="Upload Excel file">
              <input
                type="file"
                accept=".csv,.txt,.xls,.xlsx"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="block h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
              />
            </FieldBlock>
            <ActionButton className="w-full justify-center bg-slate-500 text-white hover:bg-slate-600" onClick={parseImport}>
              Parse & preview POST JSON
            </ActionButton>
            {importError ? <p className="text-sm font-semibold text-rose-600">{importError}</p> : null}
            {importPreview ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">{importPreview.rows.length} rows parsed, {importPreview.skipped} duplicates skipped.</p>
                <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-white">{JSON.stringify(importPreview.rows, null, 2)}</pre>
                <ActionButton tone="dark" onClick={() => onImport(importPreview.rows)} disabled={!importPreview.rows.length}>
                  Save Imported Agents
                </ActionButton>
              </div>
            ) : null}
          </div>
        )}

        {preview ? <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-white">{JSON.stringify(postPreview, null, 2)}</pre> : null}

        {tab === "manual" ? (
          <DrawerActions>
            <ActionButton onClick={onClose}>Cancel</ActionButton>
            <ActionButton onClick={() => setPreview((current) => !current)}>Preview POST JSON</ActionButton>
            <ActionButton tone="dark" type="submit">Save</ActionButton>
          </DrawerActions>
        ) : null}
      </form>
    </Drawer>
  );
}

function FinancialTransactionDrawer({ transaction, onClose }: { transaction: FinancialTransaction; onClose: () => void }) {
  return (
    <Drawer title="Transaction Details" subtitle="Posted transactions are read-only" width="max-w-xl" onClose={onClose}>
      <DetailList
        items={[
          ["Tran Date", shortDate(transaction.date)],
          ["Tran Type", transaction.type],
          ["Doc No", transaction.documentNo],
          ["Tran Value", money(transaction.value)],
          ["Reservation No", transaction.reservationNo],
          ["Room No", transaction.roomNo],
          ["Created By", transaction.createdBy],
          ["Status", transaction.status]
        ]}
      />
      <DrawerActions>
        <ActionButton onClick={onClose}>Close</ActionButton>
      </DrawerActions>
    </Drawer>
  );
}

function FrontOfficeTransactionDrawer({ transaction, onClose }: { transaction: FrontOfficeTransaction; onClose: () => void }) {
  return (
    <Drawer title="Front Office Transaction" subtitle="Front office transactions are read-only" width="max-w-xl" onClose={onClose}>
      <DetailList
        items={[
          ["ID", transaction.id],
          ["Category", transaction.category],
          ["Description", transaction.description],
          ["Date", transaction.date],
          ["Amount", usd(transaction.amount)],
          ["Status", transaction.status]
        ]}
      />
      <DrawerActions>
        <ActionButton onClick={onClose}>Close</ActionButton>
      </DrawerActions>
    </Drawer>
  );
}

function PurchaseViewDrawer({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  return (
    <Drawer title="Purchase Details" width="max-w-xl" onClose={onClose}>
      <DetailList
        items={[
          ["Supplier", purchase.supplier],
          ["Purchase Date", shortDate(purchase.purchaseDate)],
          ["Due Date", shortDate(purchase.dueDate)],
          ["Invoice Number", purchase.invoiceNumber],
          ["Reference Amount", money(purchase.referenceAmount)],
          ["Narration", purchase.narration || "-"],
          ["Attachments", purchase.attachments.join(", ") || "-"],
          ["Status", purchase.status]
        ]}
      />
      <DrawerActions>
        <ActionButton onClick={onClose}>Close</ActionButton>
      </DrawerActions>
    </Drawer>
  );
}

function ExpenseViewDrawer({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  return (
    <Drawer title="Expense Details" width="max-w-xl" onClose={onClose}>
      <DetailList
        items={[
          ["Date", shortDate(expense.date)],
          ["Expense Type/Account", expense.expenseType],
          ["Paid Using", expense.paidUsing],
          ["Description", expense.description || "-"],
          ["Amount", money(expense.amount)],
          ["Attachments", expense.attachments.join(", ") || "-"],
          ["Remark", expense.remark || "-"],
          ["Status", expense.status]
        ]}
      />
      <DrawerActions>
        <ActionButton onClick={onClose}>Close</ActionButton>
      </DrawerActions>
    </Drawer>
  );
}

function FinancialFrame({ children }: { children: React.ReactNode }) {
  return <main className="space-y-4 p-4 lg:p-6">{children}</main>;
}

function PageActionBar({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

function DataPanel({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white shadow-sm">
      {(title || action) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
          {title ? <h2 className="text-2xl font-semibold">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className={title || action ? "px-5 pb-5" : "p-5"}>{children}</div>
    </section>
  );
}

function SearchInput({ value, onChange, className = "" }: { value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`relative block ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search..."
        className="focus-ring h-12 w-full rounded-md border border-line bg-white pl-11 pr-3 text-base"
      />
    </label>
  );
}

function SegmentedControl<T extends string>({
  tabs,
  value,
  onChange,
  compact = false,
  full = false
}: {
  tabs: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
  full?: boolean;
}) {
  return (
    <div className={`inline-flex rounded-lg bg-slate-100 p-1 ${full ? "w-full" : ""}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`rounded-md font-semibold transition ${
            compact ? "px-4 py-2 text-sm" : "px-5 py-2.5 text-base"
          } ${full ? "flex-1" : ""} ${value === tab.value ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function Drawer({
  title,
  subtitle,
  width,
  nested = false,
  onClose,
  children
}: {
  title: string;
  subtitle?: string;
  width: string;
  nested?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`fixed inset-0 ${nested ? "z-[60]" : "z-50"} flex justify-end bg-slate-950/40`}>
      <aside className={`h-full w-full ${width} overflow-y-auto rounded-l-2xl bg-white shadow-panel`}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-white px-7 py-6">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {subtitle ? <p className="mt-3 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-600 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-7 py-6">{children}</div>
      </aside>
    </div>
  );
}

function DrawerActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2 pt-4">{children}</div>;
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  required = false
}: {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      type={type}
      required={required}
      placeholder={placeholder}
      className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
    />
  );
}

function TextAreaField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="focus-ring min-h-24 w-full rounded-md border border-line bg-white px-4 py-3 text-sm"
    />
  );
}

function SelectField({
  value,
  onChange,
  children,
  className = ""
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={`focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm ${className}`}>
      {children}
    </select>
  );
}

function AttachmentBox({ onFiles }: { onFiles: (files: File[]) => void }) {
  return (
    <FieldBlock label="Attachments (optional)">
      <div className="rounded-md border border-dashed border-slate-300 p-4">
        <Paperclip className="mb-3 h-5 w-5 text-slate-500" />
        <input type="file" multiple onChange={(event) => onFiles(Array.from(event.target.files ?? []))} className="block w-full rounded-md border border-line bg-white px-3 py-2 text-sm" />
        <p className="mt-3 text-xs text-slate-500">Files are only selected in this screen for now. Upload to the server will be connected once the attachment API is ready.</p>
      </div>
    </FieldBlock>
  );
}

function ActionButton({
  children,
  onClick,
  tone = "light",
  type = "button",
  disabled = false,
  className = ""
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "light" | "dark";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:opacity-60 ${
        tone === "dark" ? "bg-ink text-white hover:bg-slate-800" : "border border-line bg-white text-slate-800 hover:bg-slate-50"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function SmallButton({ children, onClick, dark = false }: { children: React.ReactNode; onClick?: () => void; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-md px-4 text-sm font-semibold ${dark ? "bg-ink text-white hover:bg-slate-800" : "border border-line bg-white text-slate-800 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

function IconButton({ label, children, onClick, disabled = false }: { label: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: "green" | "amber" | "slate" }) {
  const classes = {
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-200 text-slate-700"
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes[tone]}`}>{children}</span>;
}

function EmptyInline({ message }: { message: string }) {
  return <div className="grid min-h-[150px] place-items-center text-center text-slate-500">{message}</div>;
}

function DetailList({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="divide-y divide-line rounded-lg border border-line">
      {items.map(([label, value]) => (
        <div key={label} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[170px_1fr]">
          <dt className="font-semibold text-slate-500">{label}</dt>
          <dd className="break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Pagination({
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange
}: {
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const start = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const end = Math.min(total, page * rowsPerPage);

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 pt-4 text-sm text-slate-500">
      <span>{start}-{end} of {total}</span>
      <label className="flex items-center gap-2">
        Rows per page
        <select
          value={rowsPerPage}
          onChange={(event) => {
            onRowsPerPageChange(Number(event.target.value));
            onPageChange(1);
          }}
          className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-ink"
        >
          {[5, 10, 25, 50].map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>
      <span className="font-semibold text-ink">{page} / {totalPages}</span>
      <div className="flex items-center gap-1">
        <PagerButton label="First page" disabled={page <= 1} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="h-4 w-4" />
        </PagerButton>
        <PagerButton label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </PagerButton>
        <PagerButton label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </PagerButton>
        <PagerButton label="Last page" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>
          <ChevronsRight className="h-4 w-4" />
        </PagerButton>
      </div>
    </div>
  );
}

function PagerButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-slate-600 disabled:opacity-40">
      {children}
    </button>
  );
}

function paginate<T>(rows: T[], page: number, rowsPerPage: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * rowsPerPage;
  return {
    page: safePage,
    rows: rows.slice(start, start + rowsPerPage)
  };
}

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().trim();
}

function shortDate(value: string) {
  const dateOnly = value.includes("T") ? value.split("T")[0] : value;
  return dateLabel(dateOnly);
}

function money(value: number) {
  return `LKR ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function usd(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toNumber(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function slugId(prefix: string, value: string) {
  return `${prefix}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || Date.now()}`;
}

function makeTransaction(type: string, date: string, documentNo: string, value: number, reservationNo: string, roomNo: string, createdBy: string): FinancialTransaction {
  return {
    id: uniqueId("tran"),
    date,
    type,
    documentNo,
    value,
    reservationNo,
    roomNo,
    createdBy,
    status: "Active"
  };
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from.split("T")[0]}T00:00:00`).getTime();
  const end = new Date(`${to.split("T")[0]}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.floor((end - start) / 86400000);
}

function upsertById<T extends { id: string }>(rows: T[], item: T) {
  return rows.some((row) => row.id === item.id) ? rows.map((row) => (row.id === item.id ? item : row)) : [item, ...rows];
}

function mergeUniqueAgents(current: TravelAgent[], rows: TravelAgent[]) {
  const seen = new Set(current.map((agent) => `${normalize(agent.email)}|${normalize(agent.phone)}`));
  const incoming = rows.filter((agent) => {
    const key = `${normalize(agent.email)}|${normalize(agent.phone)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...incoming, ...current];
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csv = [headers, ...rows].map((row) => row.map((cell) => JSON.stringify(String(cell ?? ""))).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function parseAgentCsv(text: string, existingAgents: TravelAgent[]): AgentImportPreview {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], skipped: 0 };

  const headers = table[0].map((header) => normalize(header).replace(/[^a-z0-9]/g, ""));
  const existing = new Set(existingAgents.map((agent) => `${normalize(agent.email)}|${normalize(agent.phone)}`));
  const rows: TravelAgent[] = [];
  let skipped = 0;

  for (const row of table.slice(1)) {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
    const email = String(record.email ?? "");
    const phone = String(record.contact ?? record.phone ?? "");
    const key = `${normalize(email)}|${normalize(phone)}`;
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }
    existing.add(key);
    const name = String(record.agentname ?? record.agency ?? record.name ?? "");
    const contactPerson = String(record.name ?? record.contactperson ?? "");
    if (!name && !contactPerson && !email && !phone) continue;
    rows.push({
      id: String(record.code ?? "") ? slugId("agent", String(record.code)) : uniqueId("agent"),
      name: name || contactPerson || "Unnamed Travel Agent",
      contactPerson,
      agentType: String(record.agenttype ?? "Online Travel Agent"),
      email,
      phone,
      commission: toNumber(String(record.commission ?? 0)),
      address: String(record.address ?? ""),
      vatNo: String(record.vatno ?? record.vat ?? ""),
      code: String(record.code ?? `TA${Date.now().toString().slice(-4)}${rows.length}`),
      status: String(record.status ?? "Active").toLowerCase() === "inactive" ? "Inactive" : "Active"
    });
  }

  return { rows, skipped };
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}
