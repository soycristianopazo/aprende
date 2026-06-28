-- Aptiva — Estándar de Acreditación por mandante (categorías + items)

CREATE TABLE IF NOT EXISTS mandante_standard_categories (
    category_id     TEXT PRIMARY KEY,
    company_id      TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    mandante_id     TEXT NOT NULL REFERENCES mandantes(mandante_id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    order_index     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (mandante_id, name)
);
CREATE INDEX IF NOT EXISTS idx_mscat_mandante ON mandante_standard_categories(mandante_id);

CREATE TABLE IF NOT EXISTS mandante_standard_items (
    item_id          TEXT PRIMARY KEY,
    company_id       TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    mandante_id      TEXT NOT NULL REFERENCES mandantes(mandante_id) ON DELETE CASCADE,
    category_id      TEXT NOT NULL REFERENCES mandante_standard_categories(category_id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    description      TEXT,
    document_type_id TEXT,           -- optional FK to company's own document_types
    is_required      BOOLEAN NOT NULL DEFAULT TRUE,
    order_index      INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_msitem_mandante ON mandante_standard_items(mandante_id);
CREATE INDEX IF NOT EXISTS idx_msitem_category ON mandante_standard_items(category_id);
