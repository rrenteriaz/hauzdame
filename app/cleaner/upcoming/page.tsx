// app/cleaner/upcoming/page.tsx
import { redirect } from "next/navigation";

export default async function UpcomingCleaningsPage({
  searchParams,
}: {
  searchParams?: Promise<{ memberId?: string; returnTo?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const memberIdParam = params?.memberId;
  const returnTo = params?.returnTo;

  const urlParams = new URLSearchParams();
  if (memberIdParam) urlParams.set("memberId", memberIdParam);
  urlParams.set("scope", "upcoming");
  if (returnTo && returnTo.startsWith("/cleaner")) urlParams.set("returnTo", returnTo);

  redirect(`/cleaner/cleanings/all?${urlParams.toString()}`);
}

