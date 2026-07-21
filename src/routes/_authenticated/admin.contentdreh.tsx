import { createFileRoute } from "@tanstack/react-router";
import { BookingsList } from "./admin.termine";

export const Route = createFileRoute("/_authenticated/admin/contentdreh")({
  head: () => ({ meta: [{ title: "Content-Dreh-Anfragen — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => <BookingsList kind="contentdreh" />,
});
