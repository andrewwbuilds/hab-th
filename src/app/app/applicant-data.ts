import { cache } from "react";
import { listMyApplications } from "@/lib/data/applications";
import { getMyPet } from "@/lib/data/pets";

/** Loads the pet and application list once per request; the layout and each page share the result. */
export const loadApplicant = cache(async () => Promise.all([getMyPet(), listMyApplications()]));
