CREATE TABLE users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_name_not_blank
        CHECK (char_length(btrim(name)) > 0),

    CONSTRAINT users_email_not_blank
        CHECK (char_length(btrim(email)) > 0),

    CONSTRAINT users_email_normalized
        CHECK (email = lower(btrim(email))),

    CONSTRAINT users_email_unique
        UNIQUE (email),

    CONSTRAINT users_password_hash_not_blank
        CHECK (char_length(password_hash) > 0)
);
