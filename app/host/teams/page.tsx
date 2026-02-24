// app/host/teams/page.tsx
// REDIRECT: Esta ruta redirige a /host/workgroups
import { redirect } from "next/navigation";

export default async function TeamsPage() {
  redirect("/host/workgroups");
}
