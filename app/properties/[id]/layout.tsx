import type { ReactNode } from "react";
import { Workspace } from "@/app/components/app-shell";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function PropertyLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  return <><Workspace propertyId={id} />{children}</>;
}
