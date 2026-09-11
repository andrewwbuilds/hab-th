import type { MyApplication } from "@/lib/data/types";
import { applyPath, roadiePath } from "@/lib/navigation";
import type { PetSpec, Track } from "@/lib/types";

/**
 * An applicant with a single draft is on their first application. There is not enough to navigate
 * between yet, so the shell drops the sidebar and walks them through: pick a guide, then the form.
 */
export function firstApplication(applications: MyApplication[]): MyApplication | null {
  const [only] = applications;
  return applications.length === 1 && only?.status === "draft" ? only : null;
}

/** Where the first-application walkthrough continues: the guide picker until a guide exists, then the form. */
export function onboardingPath(pet: PetSpec | null, track: Track): string {
  return pet ? applyPath(track) : roadiePath(applyPath(track));
}
