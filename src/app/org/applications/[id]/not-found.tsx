import { FileQuestion } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { OrgPage } from "../../_components/OrgPage";

export default function ApplicationNotFound() {
  return (
    <OrgPage breadcrumbs={[{ label: "Applications", href: "/org/applications" }, { label: "Not found" }]}>
      <EmptyState
        className="h-full"
        icon={<FileQuestion />}
        title="No application here"
        description="It may have been removed, or the link is wrong."
        action={<Button href="/org/applications">Back to applications</Button>}
      />
    </OrgPage>
  );
}
