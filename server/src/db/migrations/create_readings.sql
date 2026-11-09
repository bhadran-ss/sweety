CREATE TABLE readings (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    reading_date DATE NOT NULL,
    slot TEXT NOT NULL,
    value INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT readings_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT readings_slot_valid
        CHECK (slot IN (
            'morning_fasting',
            'after_breakfast',
            'after_lunch',
            'after_dinner'
        )),

    CONSTRAINT readings_value_range
        CHECK (value BETWEEN 40 AND 600),

    CONSTRAINT readings_user_date_slot_unique
        UNIQUE (user_id, reading_date, slot)
);
