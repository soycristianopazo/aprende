-- Aptiva — Extend companies table with business profile fields
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS business_name           TEXT,
    ADD COLUMN IF NOT EXISTS city                    TEXT,
    ADD COLUMN IF NOT EXISTS country                 TEXT,
    ADD COLUMN IF NOT EXISTS website                 TEXT,
    ADD COLUMN IF NOT EXISTS industry                TEXT,
    ADD COLUMN IF NOT EXISTS legal_representative    TEXT,
    ADD COLUMN IF NOT EXISTS legal_representative_rut TEXT;
