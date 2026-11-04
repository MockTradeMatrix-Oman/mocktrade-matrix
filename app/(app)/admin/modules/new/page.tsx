import { requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { AdminModuleEditor } from "@/components/admin-module-editor";
import { blankModule } from "@/lib/editor-module";

export const dynamic = "force-dynamic";

export default async function NewModulePage() {
  await requireAdmin();
  const next = one<{ n: number }>("SELECT COALESCE(MAX(order_index),0) + 1 AS n FROM modules")?.n ?? 1;

  return (
    <AdminModuleEditor
      initial={{
        ...blankModule(),
        order_index: next,
      }}
    />
  );
}
