-- ============================================================
-- 土拨鼠日记 v4 — Initial Schema
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Extended user profile ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 2. Diaries (full DiaryData as JSONB per day) ──────────────
-- Stores the entire DiaryData object for simplicity; normalise later if needed.
CREATE TABLE IF NOT EXISTS public.diaries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.diaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own diaries" ON public.diaries
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS diaries_user_date ON public.diaries (user_id, date DESC);


-- ── 3. Goals ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id         TEXT PRIMARY KEY,          -- local generateId()
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.goals
  FOR ALL USING (auth.uid() = user_id);


-- ── 4. Custom Personas ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_personas (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.custom_personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own personas" ON public.custom_personas
  FOR ALL USING (auth.uid() = user_id);


-- ── 5. Auto-update updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER diaries_touch  BEFORE UPDATE ON public.diaries       FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER goals_touch    BEFORE UPDATE ON public.goals          FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER personas_touch BEFORE UPDATE ON public.custom_personas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
