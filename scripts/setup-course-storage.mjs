import { createClient } from '@supabase/supabase-js';
const client = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const bucket = 'course-materials';
const existing = await client.storage.getBucket(bucket);
if (!existing.error) {
  if (existing.data.public) throw new Error('Course material storage must be private. Review the bucket configuration.');
  console.log('Private course storage is ready.');
} else {
  const { error } = await client.storage.createBucket(bucket, { public: false, fileSizeLimit: 10 * 1024 * 1024, allowedMimeTypes: ['application/pdf', 'text/plain', 'application/json'] });
  if (error) throw new Error(error.message);
  console.log('Private course storage created.');
}
