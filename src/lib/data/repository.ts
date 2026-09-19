import type { StudySyncRepository } from "@/lib/data/contracts";
import { mockRepository } from "@/lib/data/mock-repository";
import { supabaseRepository } from "@/lib/data/supabase-repository";

export const repository: StudySyncRepository =
  process.env.DATA_BACKEND === "supabase" ? supabaseRepository : mockRepository;
