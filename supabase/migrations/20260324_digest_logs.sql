-- Migration: Digest logs (store generated weekly update content per user)

CREATE TABLE IF NOT EXISTS public.digest_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL,
  content_text TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digest_logs_user ON public.digest_logs(user_id, created_at DESC);

ALTER TABLE public.digest_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digest logs" ON public.digest_logs
  FOR SELECT USING (user_id = auth.uid());

-- Service role handles inserts via API route
