import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/umplanen")({
  beforeLoad: () => { throw redirect({ to: "/admin/termine", replace: true }); },
});
