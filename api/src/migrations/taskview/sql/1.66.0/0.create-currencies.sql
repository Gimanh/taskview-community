-- Reference list of currencies (ISO 4217) for anything that carries money:
-- invoices, counterparties, seller profiles. Names are stored in English only;
-- the UI localises them through Intl.DisplayNames by code. decimal_digits
-- drives amount formatting (JPY and KRW have none). Rows are never deleted,
-- only deactivated, so existing references stay valid.
CREATE SCHEMA IF NOT EXISTS tv_billing;

CREATE TABLE IF NOT EXISTS tv_billing.currencies (
    id             INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code           CHAR(3) NOT NULL UNIQUE,
    numeric_code   SMALLINT NOT NULL UNIQUE,
    name           VARCHAR(64) NOT NULL,
    symbol         VARCHAR(8) NOT NULL,
    decimal_digits SMALLINT NOT NULL DEFAULT 2,
    sort_order     SMALLINT NOT NULL DEFAULT 0,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT currencies_code_upper_check CHECK (code = UPPER(code)),
    CONSTRAINT currencies_decimal_digits_check CHECK (decimal_digits BETWEEN 0 AND 4)
);

CREATE INDEX IF NOT EXISTS idx_currencies_active_sort ON tv_billing.currencies(is_active, sort_order);

INSERT INTO tv_billing.currencies (code, numeric_code, name, symbol, decimal_digits, sort_order) VALUES
    ('USD', 840, 'US Dollar',             '$',   2, 10),
    ('EUR', 978, 'Euro',                  '€',   2, 20),
    ('GBP', 826, 'Pound Sterling',        '£',   2, 30),
    ('JPY', 392, 'Japanese Yen',          '¥',   0, 40),
    ('CNY', 156, 'Chinese Yuan',          '¥',   2, 50),
    ('CHF', 756, 'Swiss Franc',           'CHF', 2, 60),
    ('CAD', 124, 'Canadian Dollar',       'CA$', 2, 70),
    ('AUD', 36,  'Australian Dollar',     'A$',  2, 80),
    ('RUB', 643, 'Russian Ruble',         '₽',   2, 25),
    ('INR', 356, 'Indian Rupee',          '₹',   2, 100),
    ('BRL', 986, 'Brazilian Real',        'R$',  2, 110),
    ('KRW', 410, 'South Korean Won',      '₩',   0, 120),
    ('SGD', 702, 'Singapore Dollar',      'S$',  2, 130),
    ('HKD', 344, 'Hong Kong Dollar',      'HK$', 2, 140),
    ('SEK', 752, 'Swedish Krona',         'kr',  2, 150),
    ('NOK', 578, 'Norwegian Krone',       'kr',  2, 160),
    ('DKK', 208, 'Danish Krone',          'kr',  2, 170),
    ('PLN', 985, 'Polish Zloty',          'zł',  2, 180),
    ('TRY', 949, 'Turkish Lira',          '₺',   2, 190),
    ('AED', 784, 'UAE Dirham',            'د.إ', 2, 200)
ON CONFLICT (code) DO NOTHING;
