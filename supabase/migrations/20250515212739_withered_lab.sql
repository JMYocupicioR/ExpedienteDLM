/*
  ExpedienteDLM - Medical Records System
  Database Triggers and Functions
*/

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at column
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT t.table_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
        AND c.column_name = 'updated_at'
        AND t.table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', table_name, table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to log changes to audited tables
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_row JSONB := null;
    new_row JSONB := null;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        old_row = row_to_json(OLD)::JSONB;
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, old_values, new_values
        )
        VALUES (
            current_setting('app.current_user_id', true)::uuid,
            TG_OP,
            TG_TABLE_NAME,
            OLD.id,
            old_row,
            null
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        old_row = row_to_json(OLD)::JSONB;
        new_row = row_to_json(NEW)::JSONB;
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, old_values, new_values
        )
        VALUES (
            current_setting('app.current_user_id', true)::uuid,
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            old_row,
            new_row
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        new_row = row_to_json(NEW)::JSONB;
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, old_values, new_values
        )
        VALUES (
            current_setting('app.current_user_id', true)::uuid,
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            null,
            new_row
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Soft delete implementation
CREATE OR REPLACE FUNCTION process_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Instead of actually deleting the row, update deleted_at
    UPDATE users
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = OLD.id;
    
    -- Tell PostgreSQL to skip the actual DELETE
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Example of creating soft delete trigger for a specific table
CREATE TRIGGER soft_delete_users
BEFORE DELETE ON users
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL)
EXECUTE FUNCTION process_soft_delete();

-- Function to automatically set created_by and updated_by
CREATE OR REPLACE FUNCTION set_record_user()
RETURNS TRIGGER AS $$
BEGIN
    -- For new records
    IF (TG_OP = 'INSERT') THEN
        -- Set created_by if the column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = TG_TABLE_NAME 
            AND column_name = 'created_by'
        ) THEN
            NEW.created_by = current_setting('app.current_user_id', true)::uuid;
        END IF;
    END IF;
    
    -- For updates
    IF (TG_OP = 'UPDATE') THEN
        -- Set updated_by if the column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = TG_TABLE_NAME 
            AND column_name = 'updated_by'
        ) THEN
            NEW.updated_by = current_setting('app.current_user_id', true)::uuid;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate BMI automatically when height and weight are present
CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if both height and weight are provided
    IF NEW.height IS NOT NULL AND NEW.weight IS NOT NULL THEN
        -- Ensure height is in meters (convert from cm if needed)
        IF NEW.height_unit = 'cm' THEN
            -- BMI = weight(kg) / height(m)²
            NEW.bmi = NEW.weight / ((NEW.height / 100) * (NEW.height / 100));
        ELSE
            -- Assume height is already in meters
            NEW.bmi = NEW.weight / (NEW.height * NEW.height);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for BMI calculation
CREATE TRIGGER calculate_vital_signs_bmi
BEFORE INSERT OR UPDATE OF height, weight ON vital_signs
FOR EACH ROW
EXECUTE FUNCTION calculate_bmi();

-- Function to check for medication allergies when prescribing
CREATE OR REPLACE FUNCTION check_medication_allergies()
RETURNS TRIGGER AS $$
DECLARE
    allergy_count INTEGER;
BEGIN
    -- Check if patient is allergic to this medication
    SELECT COUNT(*) INTO allergy_count
    FROM patient_allergies pa
    JOIN allergies a ON pa.allergy_id = a.id
    JOIN medications m ON m.generic_name ILIKE '%' || a.name || '%' OR m.brand_name ILIKE '%' || a.name || '%'
    WHERE pa.patient_id = NEW.patient_id
    AND m.id = NEW.medication_id;
    
    IF allergy_count > 0 THEN
        RAISE EXCEPTION 'WARNING: Patient may be allergic to this medication!';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for medication allergy checks
CREATE TRIGGER check_prescription_allergies
BEFORE INSERT OR UPDATE ON prescriptions
FOR EACH ROW
EXECUTE FUNCTION check_medication_allergies();