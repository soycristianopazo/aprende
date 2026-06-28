-- Aptiva — Mandantes / Contratos / Gerencias (additive)

-- 1. Company type
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS company_type TEXT;  -- 'mandante' | 'contratista' | NULL

-- 2. Mandantes (clients of a 'contratista' company)
CREATE TABLE IF NOT EXISTS mandantes (
    mandante_id     TEXT PRIMARY KEY,
    company_id      TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    rut             TEXT,
    contact_email   TEXT,
    contact_phone   TEXT,
    address         TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);
CREATE INDEX IF NOT EXISTS idx_mandantes_company ON mandantes(company_id);

-- 3. Contracts (between a contratista and a mandante)
CREATE TABLE IF NOT EXISTS contracts (
    contract_id     TEXT PRIMARY KEY,
    company_id      TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    mandante_id     TEXT NOT NULL REFERENCES mandantes(mandante_id) ON DELETE CASCADE,
    contract_number TEXT NOT NULL,
    glosa           TEXT,
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'finished' | 'on_hold'
    notes           TEXT,
    worker_ids      TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, contract_number)
);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_mandante ON contracts(mandante_id);
CREATE INDEX IF NOT EXISTS idx_contracts_workers ON contracts USING GIN(worker_ids);

-- 4. Gerencias (divisions inside a 'mandante' company)
CREATE TABLE IF NOT EXISTS gerencias (
    gerencia_id     TEXT PRIMARY KEY,
    company_id      TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    worker_ids      TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);
CREATE INDEX IF NOT EXISTS idx_gerencias_company ON gerencias(company_id);
CREATE INDEX IF NOT EXISTS idx_gerencias_workers ON gerencias USING GIN(worker_ids);
