CREATE OR REPLACE FUNCTION tasks.adjust_start_and_end_dates()
    RETURNS TRIGGER AS
$$
DECLARE
    start_timestamp TIMESTAMPTZ;
    end_timestamp   TIMESTAMPTZ;
BEGIN
    -- Если start_date равен NULL, то start_time тоже должен быть NULL
    IF NEW.start_date IS NULL THEN
        NEW.start_time := NULL;
    END IF;

    -- Если end_date равен NULL, то end_time тоже должен быть NULL
    IF NEW.end_date IS NULL THEN
        NEW.end_time := NULL;
    END IF;

    -- Если обе даты заданы
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
        -- Корректировка дат
        IF NEW.start_date > NEW.end_date THEN
            -- Если start_date больше end_date, устанавливаем end_date равным start_date
            NEW.end_date := NEW.start_date;
            -- end_time остается без изменений
        ELSIF NEW.end_date < NEW.start_date THEN
            -- Если end_date меньше start_date, устанавливаем start_date равным end_date
            NEW.start_date := NEW.end_date;
            -- start_time остается без изменений
        END IF;

        -- Подготовка временных меток для сравнения
        start_timestamp := (NEW.start_date::text || ' ' || COALESCE(NEW.start_time::text, '00:00:00+00'))::timestamptz;
        end_timestamp := (NEW.end_date::text || ' ' || COALESCE(NEW.end_time::text, '00:00:00+00'))::timestamptz;

        -- Если start_timestamp больше end_timestamp, корректируем end_date и end_time
        IF start_timestamp > end_timestamp THEN
            NEW.end_date := NEW.start_date;
            -- Присваиваем end_time только если start_time не NULL
            IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
                NEW.end_time := NEW.start_time;
            END IF;
            -- Если start_time NULL, а end_time задано, обнуляем end_time
--         ELSIF NEW.end_time IS NOT NULL THEN
--             NEW.end_time := NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


drop trigger if exists adjust_dates_and_times_trigger on tasks.tasks;
CREATE TRIGGER adjust_dates_and_times_trigger
    BEFORE INSERT OR UPDATE
    ON tasks.tasks
    FOR EACH ROW
EXECUTE FUNCTION tasks.adjust_start_and_end_dates();



--17:25:00.000000 +02:00