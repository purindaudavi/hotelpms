import { Workspace } from "@/app/components/app-shell";

type PageProps = {
  params: Promise<{
    id: string;
    slug?: string[];
  }>;
};

export default async function PropertyPage({ params }: PageProps) {
  const resolved = await params;
  return <Workspace propertyId={resolved.id} slug={resolved.slug ?? ["dashboard"]} />;
}
