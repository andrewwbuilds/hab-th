import { Spinner } from "@/components/ui";
import { OrgPage } from "../../_components/OrgPage";

export default function ApplicationLoading() {
  return (
    <OrgPage breadcrumbs={[{ label: "Applications", href: "/org/applications" }, { label: "Loading" }]}>
      <div className="flex h-full items-center justify-center text-muted">
        <Spinner size={16} label="Loading application" />
      </div>
    </OrgPage>
  );
}
