import { notFound } from "next/navigation";
import Link from "next/link";
import Page from "@/lib/ui/Page";
import HostWebContainer from "@/lib/ui/HostWebContainer";
import { safeReturnTo } from "@/lib/navigation/safeReturnTo";
import { getVariantGroupAction, listVariantGroupOptionsAction } from "../actions";
import VariantGroupOptionsSection from "./VariantGroupOptionsSection";

export default async function VariantGroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ returnTo?: string; showArchived?: string }>;
}) {
  const { groupId } = await params;
  const resolved = searchParams ? await searchParams : undefined;
  const returnTo = safeReturnTo(resolved?.returnTo, "/host/catalog/variant-groups");
  const includeArchived = resolved?.showArchived === "1";

  const group = await getVariantGroupAction(groupId);
  if (!group) notFound();

  const options = await listVariantGroupOptionsAction({
    groupId,
    includeArchived,
  });

  return (
    <Page
      title={group.label}
      subtitle={group.key}
      showBack
      backHref={returnTo}
    >
      <HostWebContainer className="space-y-6">
        <VariantGroupOptionsSection
          groupId={groupId}
          groupLabel={group.label}
          options={options}
          includeArchived={includeArchived}
          returnTo={returnTo}
        />
      </HostWebContainer>
    </Page>
  );
}
