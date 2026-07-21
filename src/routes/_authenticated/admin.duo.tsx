import { createFileRoute } from "@tanstack/react-router";
import { BookingsList } from "./admin.termine";

export const Route = createFileRoute("/_authenticated/admin/duo")({
  head: () => ({ meta: [{ title: "Duo-Anfragen — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <BookingsList kind="duo" />,
});
