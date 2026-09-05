import { writeFileSync } from "node:fs";

const path = "src/components/admin/AdminWorkspaceBar.tsx";

writeFileSync(
  path,
  `// Die zusätzliche Admin-Navigationsleiste wurde bewusst entfernt.\n// Die normale Seiten-Navigation und die Zurück-Buttons der einzelnen Admin-Seiten bleiben bestehen.\nexport function AdminWorkspaceBar() {\n  return null;\n}\n`,
);

console.log("Admin workspace bar removed for a cleaner mobile admin UI.");
