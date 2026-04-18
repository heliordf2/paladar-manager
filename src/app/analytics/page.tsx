import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isThinkCookieValid, THINK_COOKIE_KEY } from "@/lib/think";

import AnalyticsDashboard from "./components/analytics-dashboard";

export default async function AnalyticsPage() {
  const thinkCookie = (await cookies()).get(THINK_COOKIE_KEY)?.value;

  if (!isThinkCookieValid(thinkCookie)) {
    redirect("/usuario?next=/analytics");
  }

  return <AnalyticsDashboard />;
}