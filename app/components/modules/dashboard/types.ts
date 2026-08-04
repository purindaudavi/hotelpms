export type DashboardProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

export const dashboardTabs = ["Overview", "Analytics", "Travel Agents"] as const;

export type DashboardTab = (typeof dashboardTabs)[number];
