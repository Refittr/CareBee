-- Migration: Analytics tables for usage tracking

-- 1. API usage log (AI/external API calls)
CREATE TABLE IF NOT EXISTS public.api_usage_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID,
  feature      TEXT NOT NULL,
  action       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  tokens_used  INT,
  duration_ms  INT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_log_user ON public.api_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_feature ON public.api_usage_log(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_created ON public.api_usage_log(created_at DESC);

ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;
-- Service role handles all writes; no user-facing policies needed

-- 2. Page view log
CREATE TABLE IF NOT EXISTS public.page_view_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  path          TEXT NOT NULL,
  referrer_path TEXT,
  session_id    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_view_log_user ON public.page_view_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_view_log_path ON public.page_view_log(path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_view_log_created ON public.page_view_log(created_at DESC);

ALTER TABLE public.page_view_log ENABLE ROW LEVEL SECURITY;

-- 3. Feature usage log (button clicks, record creation, etc.)
CREATE TABLE IF NOT EXISTS public.feature_usage_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_log_user ON public.feature_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_log_feature ON public.feature_usage_log(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_log_created ON public.feature_usage_log(created_at DESC);

ALTER TABLE public.feature_usage_log ENABLE ROW LEVEL SECURITY;

-- 4. Error log
CREATE TABLE IF NOT EXISTS public.error_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type    TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace   TEXT,
  path          TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_log_created ON public.error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_type ON public.error_log(error_type, created_at DESC);

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;
-- Service role handles all writes
