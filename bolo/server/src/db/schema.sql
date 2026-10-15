-- Bolo – database schema (PostgreSQL 16)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS companies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             varchar(150) NOT NULL,
  slug             varchar(60)  NOT NULL UNIQUE,
  city             varchar(80),
  sector           varchar(80),
  retention_months smallint NOT NULL DEFAULT 24,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name     varchar(120) NOT NULL,
  email         varchar(160) NOT NULL,
  password_hash text NOT NULL,
  role          varchar(12) NOT NULL CHECK (role IN ('admin', 'hr', 'recruiter')),
  failed_logins smallint NOT NULL DEFAULT 0,
  locked_until  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON users (lower(email));

-- default stages copied into every new job offer
CREATE TABLE IF NOT EXISTS stage_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       varchar(60) NOT NULL,
  position   smallint NOT NULL,
  kind       varchar(10) NOT NULL DEFAULT 'active' CHECK (kind IN ('active', 'hired', 'rejected')),
  sla_days   smallint,
  email_key  varchar(20)
);

CREATE TABLE IF NOT EXISTS jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title         varchar(160) NOT NULL,
  slug          varchar(180) NOT NULL,
  department    varchar(80),
  location      varchar(80) NOT NULL,
  contract_type varchar(20) NOT NULL CHECK (contract_type IN ('CDI', 'CDD', 'Stage', 'Freelance')),
  description   text NOT NULL,
  requirements  text,
  skills        text[] NOT NULL DEFAULT '{}',
  openings      smallint NOT NULL DEFAULT 1,
  status        varchar(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  deadline      date,
  created_by    uuid REFERENCES users(id),
  published_at  timestamptz,
  closed_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);

CREATE TABLE IF NOT EXISTS job_recruiters (
  job_id  uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, user_id)
);

CREATE TABLE IF NOT EXISTS stages (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id    uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name      varchar(60) NOT NULL,
  position  smallint NOT NULL,
  kind      varchar(10) NOT NULL DEFAULT 'active' CHECK (kind IN ('active', 'hired', 'rejected')),
  sla_days  smallint,
  email_key varchar(20)
);
CREATE INDEX IF NOT EXISTS stages_job_idx ON stages (job_id, position);

CREATE TABLE IF NOT EXISTS candidates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name        varchar(120) NOT NULL,
  email            varchar(160),
  phone            varchar(20) NOT NULL,
  city             varchar(80),
  headline         varchar(160),
  experience_years smallint NOT NULL DEFAULT 0,
  skills           text[] NOT NULL DEFAULT '{}',
  language         char(2) NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  consent_at       timestamptz,
  anonymized_at    timestamptz,
  search           tsvector,
  created_at       timestamptz NOT NULL DEFAULT now()
);
-- one candidate per phone number and company: the phone is the identifier everybody has
CREATE UNIQUE INDEX IF NOT EXISTS candidates_phone_uq ON candidates (company_id, phone);
CREATE INDEX IF NOT EXISTS candidates_search_idx ON candidates USING gin (search);

CREATE OR REPLACE FUNCTION candidates_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search :=
    setweight(to_tsvector('simple', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.skills, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.headline, '') || ' ' || coalesce(NEW.city, '')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS candidates_search_trg ON candidates;
CREATE TRIGGER candidates_search_trg BEFORE INSERT OR UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION candidates_search_update();

CREATE TABLE IF NOT EXISTS cv_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  storage_key   text NOT NULL,
  original_name varchar(200) NOT NULL,
  mime          varchar(100) NOT NULL,
  size_bytes    integer NOT NULL,
  sha256        char(64) NOT NULL,
  text_search   tsvector,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cv_documents_cand_idx ON cv_documents (candidate_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS cv_documents_search_idx ON cv_documents USING gin (text_search);

CREATE TABLE IF NOT EXISTS applications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id     uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  stage_id         uuid NOT NULL REFERENCES stages(id),
  source           varchar(12) NOT NULL CHECK (source IN ('career_page', 'whatsapp', 'email', 'walk_in', 'referral', 'linkedin')),
  cover_note       text,
  rating           smallint CHECK (rating BETWEEN 1 AND 5),
  tracking_token   varchar(48) NOT NULL UNIQUE,
  answered_at      timestamptz,
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);
CREATE INDEX IF NOT EXISTS applications_stage_idx ON applications (stage_id);

CREATE TABLE IF NOT EXISTS stage_history (
  id             bigserial PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_stage_id  uuid REFERENCES stages(id) ON DELETE SET NULL,
  to_stage_id    uuid REFERENCES stages(id) ON DELETE SET NULL,
  moved_by       uuid REFERENCES users(id),
  reason         text,
  moved_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stage_history_app_idx ON stage_history (application_id, moved_at);

CREATE TABLE IF NOT EXISTS evaluations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id),
  score          smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key        varchar(20) NOT NULL,
  lang       char(2) NOT NULL CHECK (lang IN ('fr', 'en')),
  subject    varchar(200) NOT NULL,
  body       text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  UNIQUE (company_id, key, lang)
);

-- messages to candidates; a worker sends them when send_after is reached
CREATE TABLE IF NOT EXISTS outbox (
  id             bigserial PRIMARY KEY,
  company_id     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  channel        varchar(8) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms')),
  recipient      varchar(160) NOT NULL,
  lang           char(2) NOT NULL,
  subject        varchar(200),
  body           text NOT NULL,
  status         varchar(10) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'cancelled')),
  send_after     timestamptz NOT NULL DEFAULT now(),
  sent_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_queue_idx ON outbox (status, send_after);

CREATE TABLE IF NOT EXISTS notifications (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       varchar(30) NOT NULL,
  title      varchar(200) NOT NULL,
  link       varchar(200),
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         bigserial PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES users(id),
  action     varchar(40) NOT NULL,
  entity     varchar(30) NOT NULL,
  entity_id  uuid,
  detail     varchar(200),
  ip         varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_company_idx ON audit_logs (company_id, created_at DESC);
