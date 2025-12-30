CREATE OR REPLACE FUNCTION tasks.check_task_dates()
    RETURNS TRIGGER AS $$
BEGIN
    -- Если обе даты заданы, проверяем их на корректность
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
        IF NEW.start_date > NEW.end_date THEN
            RAISE EXCEPTION 'Start date (startDate) can not be bigger endDate. Start date: %, End date: %', NEW.start_date, NEW.end_date;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


drop trigger if exists check_dates_before_insert_update on tasks.tasks;

CREATE TRIGGER check_dates_before_insert_update
    BEFORE INSERT OR UPDATE ON tasks.tasks
    FOR EACH ROW
EXECUTE FUNCTION tasks.check_task_dates();
