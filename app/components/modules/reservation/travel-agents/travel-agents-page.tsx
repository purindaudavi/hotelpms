"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import { BarChart3, Building2, Edit3, Eye, Mail, MapPin, Phone, Plus, Search, User, WalletCards } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { initialTravelAgents } from "../constants";
import type { ReservationModuleProps, TravelAgent, TravelAgentMetric } from "../types";
import {
  DetailGrid,
  Drawer,
  Field,
  Panel,
  ReservationPageFrame,
  SearchBox,
  SegmentedTabs,
  SelectInput,
  TextInput,
  ToolbarButton
} from "../components/reservation-ui";

const agentColors = ["#81c995", "#726bd9", "#60c7e6", "#ff6b6b", "#f59e0b", "#14b8a6"];

export function TravelAgentsPage({ propertyId, setToast }: ReservationModuleProps) {
  const [agents, setAgents] = useSessionState(`staypilot:${propertyId}:reservation:travel-agents`, initialTravelAgents);
  const [metric, setMetric] = useState<TravelAgentMetric>("revenue");
  const [query, setQuery] = useState("");
  const [editingAgent, setEditingAgent] = useState<TravelAgent | null>(null);
  const [detailsAgent, setDetailsAgent] = useState<TravelAgent | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const visibleAgents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return agents;
    return agents.filter((agent) => [agent.name, agent.email, agent.phone, agent.code].join(" ").toLowerCase().includes(needle));
  }, [agents, query]);

  const chartRows = useMemo(
    () =>
      agents
        .filter((agent) => agent[metric] > 0)
        .map((agent) => ({
          name: agent.name,
          value: agent[metric],
          currency: agent.currency
        })),
    [agents, metric]
  );

  function saveAgent(agent: TravelAgent) {
    setAgents((current) => (current.some((item) => item.id === agent.id) ? current.map((item) => (item.id === agent.id ? agent : item)) : [agent, ...current]));
    setEditingAgent(null);
    setAddOpen(false);
    setToast(`${agent.name} saved`);
  }

  return (
    <ReservationPageFrame>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <Panel
            title="Travel Agent Performance"
            action={
              <SegmentedTabs
                tabs={[
                  { label: "Revenue", value: "revenue" },
                  { label: "Room Nights", value: "roomNights" }
                ]}
                value={metric}
                onChange={setMetric}
              />
            }
          >
            <div className="grid min-h-[300px] items-center gap-6 lg:grid-cols-[1fr_320px]">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartRows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={105} label={renderPieLabel}>
                    {chartRows.map((row, index) => (
                      <Cell key={row.name} fill={agentColors[index % agentColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => {
                      const numericValue = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
                      return metric === "revenue" ? [`USD ${numericValue.toFixed(2)}`, "Revenue"] : [numericValue, "Room Nights"];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-3">
                {chartRows.map((row, index) => (
                  <div key={row.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: agentColors[index % agentColors.length] }} />
                      {row.name}
                    </span>
                    <span>{metric === "revenue" ? row.value.toFixed(2) : row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Agent Statistics" bodyClassName="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {["Channel", "Currency", "Revenue", "Reservations", "Room Nights"].map((heading) => (
                    <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.filter((agent) => agent.revenue > 0 || agent.roomNights > 0).map((agent) => (
                  <tr key={agent.id} className="border-t border-line">
                    <td className="px-5 py-3">{agent.name}</td>
                    <td className="px-5 py-3">{agent.currency}</td>
                    <td className="px-5 py-3">{agent.revenue.toFixed(2)}</td>
                    <td className="px-5 py-3">{agent.reservations}</td>
                    <td className="px-5 py-3">{agent.roomNights}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        <Panel
          action={
            <ToolbarButton tone="dark" icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
              Add Agent
            </ToolbarButton>
          }
        >
          <div className="mb-4">
            <SearchBox value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search..." />
          </div>
          <div className="divide-y divide-line">
            {visibleAgents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between gap-4 py-4">
                <button type="button" onClick={() => setDetailsAgent(agent)} className="min-w-0 text-left">
                  <p className="truncate text-lg font-semibold">{agent.name}</p>
                  <p className="truncate text-sm text-slate-500">{agent.email || "N/A"} <span className="px-2">|</span> {agent.phone || "N/A"}</p>
                </button>
                <div className="flex items-center gap-4 text-slate-700">
                  <button type="button" title="Edit agent" onClick={() => setEditingAgent(agent)} className="hover:text-slate-950">
                    <Edit3 className="h-5 w-5" />
                  </button>
                  <button type="button" title="View performance" onClick={() => setDetailsAgent(agent)} className="hover:text-slate-950">
                    <BarChart3 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {addOpen ? <AgentFormDrawer mode="add" agent={null} onClose={() => setAddOpen(false)} onSave={saveAgent} setToast={setToast} /> : null}
      {editingAgent ? <AgentFormDrawer mode="edit" agent={editingAgent} onClose={() => setEditingAgent(null)} onSave={saveAgent} setToast={setToast} /> : null}
      {detailsAgent ? <AgentDetailsDrawer agent={detailsAgent} onClose={() => setDetailsAgent(null)} /> : null}
    </ReservationPageFrame>
  );
}

function renderPieLabel(props: { name?: string; percent?: number }) {
  const percent = Math.round((props.percent ?? 0) * 100);
  return percent > 0 ? `${percent}%` : "";
}

function AgentFormDrawer({
  mode,
  agent,
  onClose,
  onSave,
  setToast
}: {
  mode: "add" | "edit";
  agent: TravelAgent | null;
  onClose: () => void;
  onSave: (agent: TravelAgent) => void;
  setToast: (message: string) => void;
}) {
  const [method, setMethod] = useState<"manual" | "excel">("manual");
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState<TravelAgent>(
    agent ?? {
      id: `agent-${Date.now()}`,
      name: "",
      contactPerson: "",
      agentType: "Online Travel Agent",
      nameType: "Customer",
      email: "",
      phone: "",
      code: `TA${Math.floor(100 + Math.random() * 900)}`,
      status: "Active",
      commission: 10,
      address: "",
      vatNo: "",
      currency: "USD",
      revenue: 0,
      reservations: 0,
      roomNights: 0,
      averageDailyRate: 0
    }
  );

  function update<K extends keyof TravelAgent>(key: K, value: TravelAgent[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <Drawer title={mode === "add" ? "Add Travel Agent" : "Edit Travel Agent"} onClose={onClose} width="max-w-3xl">
      <form onSubmit={submit} className="space-y-5">
        {mode === "add" ? (
          <SegmentedTabs
            tabs={[
              { label: "Add manually (POST)", value: "manual" },
              { label: "Import Excel", value: "excel" }
            ]}
            value={method}
            onChange={setMethod}
            className="w-full"
          />
        ) : null}

        {method === "excel" ? (
          <div className="rounded-lg border border-dashed border-line p-6 text-center">
            <Search className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-3 text-sm text-slate-500">Upload an Excel file to stage agents. This demo stores imported rows locally.</p>
            <TextInput
              type="file"
              accept=".xlsx,.xls,.csv"
              className="mt-4"
              onChange={(event) => {
                const fileName = event.target.files?.[0]?.name;
                if (fileName) setToast(`${fileName} staged for import`);
              }}
            />
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              <Field label="Name">
                <TextInput value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Global Travels Ltd" required />
              </Field>
              <Field label="Contact Person">
                <TextInput value={form.contactPerson} onChange={(event) => update("contactPerson", event.target.value)} placeholder="John Smith" />
              </Field>
              <Field label="Agent Type">
                <SelectInput value={form.agentType} onChange={(event) => update("agentType", event.target.value)}>
                  <option>Online Travel Agent</option>
                  <option>Direct Agent</option>
                  <option>Booking Engine</option>
                  <option>Corporate</option>
                </SelectInput>
              </Field>
              <Field label="Email">
                <TextInput type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="john@globaltravels.com" />
              </Field>
              <Field label="Phone">
                <TextInput value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+1 (555) 123-4567" />
              </Field>
              <Field label="Commission">
                <TextInput type="number" min={0} value={form.commission} onChange={(event) => update("commission", Number(event.target.value))} />
              </Field>
              <Field label="Address">
                <TextInput value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="123 Main St, Springfield" />
              </Field>
              <Field label="VAT No">
                <TextInput value={form.vatNo} onChange={(event) => update("vatNo", event.target.value)} placeholder="VAT123456" />
              </Field>
              {mode === "add" ? (
                <Field label="Code">
                  <TextInput value={form.code} onChange={(event) => update("code", event.target.value)} placeholder="TA001" />
                </Field>
              ) : null}
              <Field label="Status">
                <SelectInput value={form.status} onChange={(event) => update("status", event.target.value as TravelAgent["status"])}>
                  <option>Active</option>
                  <option>Inactive</option>
                </SelectInput>
              </Field>
            </div>

            {preview ? (
              <pre className="max-h-56 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-white">{JSON.stringify(form, null, 2)}</pre>
            ) : null}
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <ToolbarButton onClick={onClose}>Cancel</ToolbarButton>
          {mode === "add" && method === "manual" ? (
            <ToolbarButton onClick={() => setPreview((current) => !current)}>
              Preview POST JSON
            </ToolbarButton>
          ) : null}
          <ToolbarButton type="submit" tone="dark" disabled={method === "excel"}>
            {mode === "add" ? "Save Agent" : "Save"}
          </ToolbarButton>
        </div>
      </form>
    </Drawer>
  );
}

function AgentDetailsDrawer({ agent, onClose }: { agent: TravelAgent; onClose: () => void }) {
  return (
    <Drawer title="Travel Agent Details" onClose={onClose} width="max-w-xl">
      <div className="space-y-5">
        <DetailsSection title="Basic Information" icon={<User className="h-5 w-5" />}>
          <DetailGrid
            items={[
              { label: "Name", value: agent.name },
              { label: "Code", value: agent.code },
              { label: "Status", value: <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">{agent.status}</span> }
            ]}
          />
        </DetailsSection>

        <DetailsSection title="Contact Information" icon={<Mail className="h-5 w-5" />}>
          <DetailGrid
            items={[
              { label: "Email", value: agent.email || "No data available" },
              { label: "Phone", value: agent.phone || "No data available" },
              { label: "Address", value: agent.address || "No data available" }
            ]}
          />
        </DetailsSection>

        <DetailsSection title="Business Information" icon={<Building2 className="h-5 w-5" />}>
          <DetailGrid
            items={[
              { label: "Commission", value: agent.commission ? `${agent.commission}%` : "No data available" },
              { label: "VAT Number", value: agent.vatNo || "No data available" },
              { label: "Agent Type", value: agent.agentType },
              { label: "Name Type", value: agent.nameType }
            ]}
          />
        </DetailsSection>

        <DetailsSection title="Performance" icon={<BarChart3 className="h-5 w-5" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard icon={<WalletCards className="h-4 w-4 text-emerald-600" />} label="Revenue" value={`${agent.currency} ${agent.revenue.toFixed(2)}`} />
            <MetricCard icon={<MapPin className="h-4 w-4 text-blue-600" />} label="Room Nights" value={agent.roomNights} />
            <MetricCard icon={<BarChart3 className="h-4 w-4 text-violet-600" />} label="Average Daily Rate" value={`${agent.currency} ${agent.averageDailyRate.toFixed(2)}`} />
            <MetricCard icon={<Phone className="h-4 w-4 text-orange-600" />} label="Reservations" value={agent.reservations} />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
            <span className="text-slate-500">Status</span>
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">CONFIRMED</span>
          </div>
        </DetailsSection>
      </div>
    </Drawer>
  );
}

function DetailsSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line p-4">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}
