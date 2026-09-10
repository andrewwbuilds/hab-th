import { Badge } from "@/components/ui";
import type { AnswerValue, Answers } from "@/lib/forms/schema";
import { isAnswered } from "@/lib/forms/schema";
import type { FieldDef, Section } from "@/lib/forms/tracks";

function optionLabel(field: FieldDef, value: string): string {
  return field.options?.find((option) => option.value === value)?.label ?? value;
}

function AnswerValueView({ field, value }: { field: FieldDef; value: AnswerValue | undefined }) {
  if (!isAnswered(field, value)) {
    return <span className="text-dim">Not answered</span>;
  }
  switch (field.type) {
    case "multiselect":
      return (
        <span className="flex flex-wrap gap-1">
          {(value as string[]).map((item) => (
            <Badge key={item}>{optionLabel(field, item)}</Badge>
          ))}
        </span>
      );
    case "select":
      return <span>{optionLabel(field, String(value))}</span>;
    case "checkbox":
      return <span>Yes</span>;
    case "url": {
      const href = String(value);
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-accent transition-colors duration-120 ease-out-quick hover:text-accent-hover hover:underline"
        >
          {href.replace(/^https?:\/\//, "")}
        </a>
      );
    }
    case "number":
      return <span className="tabular-nums">{String(value)}</span>;
    case "textarea":
      return <p className="whitespace-pre-wrap">{String(value)}</p>;
    default:
      return <span>{String(value)}</span>;
  }
}

export function AnswerSections({ sections, answers }: { sections: Section[]; answers: Answers }) {
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-md font-medium text-fg">{section.title}</h2>
            {section.description && <p className="text-sm text-muted">{section.description}</p>}
          </div>
          <dl className="flex flex-col divide-y divide-border rounded-panel border border-border bg-panel">
            {section.fields.map((field) => (
              <div key={field.key} className="grid grid-cols-[180px_1fr] gap-4 px-4 py-2.5">
                <dt className="text-sm text-muted">{field.label}</dt>
                <dd className="min-w-0 text-base text-fg">
                  <AnswerValueView field={field} value={answers[field.key]} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
