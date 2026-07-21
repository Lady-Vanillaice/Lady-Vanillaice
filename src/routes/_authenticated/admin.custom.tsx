import { createFileRoute } from "@tanstack/react-router";
import { BookingsList } from "./admin.termine";

export const Route = createFileRoute("/_authenticated/admin/custom")({
  head: () => ({ meta: [{ title: "Custom-Anfragen — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <BookingsList kind="custom" />,
});
