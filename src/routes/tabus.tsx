import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tabus")({
  beforeLoad: () => {
    throw redirect({ to: "/leistungen", hash: "tabus" });
  },
});
