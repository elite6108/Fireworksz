-- Create a completely new analytics system
-- This is unrelated to any existing tables and should not conflict with anything

-- Create a schema for analytics
CREATE SCHEMA IF NOT EXISTS analytics;

-- Create a table for page views
CREATE TABLE IF NOT EXISTS analytics.page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_url TEXT NOT NULL,
  referrer_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  device_type TEXT,
  browser TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a table for events
CREATE TABLE IF NOT EXISTS analytics.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_properties JSONB DEFAULT '{}'::jsonb,
  page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a table for sessions
CREATE TABLE IF NOT EXISTS analytics.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_bounce BOOLEAN DEFAULT false,
  entry_page TEXT,
  exit_page TEXT,
  device_type TEXT,
  browser TEXT,
  country TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON analytics.page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON analytics.page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON analytics.page_views(created_at);

CREATE INDEX IF NOT EXISTS idx_events_session_id ON analytics.events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON analytics.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON analytics.events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics.events(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON analytics.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON analytics.sessions(started_at);

-- Create a function to calculate session duration
CREATE OR REPLACE FUNCTION analytics.calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically calculate session duration
CREATE TRIGGER update_session_duration
BEFORE UPDATE ON analytics.sessions
FOR EACH ROW
EXECUTE FUNCTION analytics.calculate_session_duration();

-- Create a view for daily page views
CREATE OR REPLACE VIEW analytics.daily_page_views AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS total_views,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM
  analytics.page_views
GROUP BY
  DATE_TRUNC('day', created_at)
ORDER BY
  day DESC;

-- Add RLS policies
ALTER TABLE analytics.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.sessions ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated users to view their own data
CREATE POLICY "Users can view their own analytics data"
ON analytics.page_views FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
ON analytics.events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions"
ON analytics.sessions FOR SELECT
USING (auth.uid() = user_id);

-- Add comments to the tables
COMMENT ON TABLE analytics.page_views IS 'Stores information about page views from users';
COMMENT ON TABLE analytics.events IS 'Stores custom events triggered by users';
COMMENT ON TABLE analytics.sessions IS 'Stores user session information';