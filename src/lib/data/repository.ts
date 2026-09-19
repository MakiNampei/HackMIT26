import type { StudySyncRepository } from "@/lib/data/contracts";
import { mockRepository } from "@/lib/data/mock-repository";

// Integration seam for your teammate:
// replace this export with a Supabase-backed implementation of the same interface.
export const repository: StudySyncRepository = mockRepository;
