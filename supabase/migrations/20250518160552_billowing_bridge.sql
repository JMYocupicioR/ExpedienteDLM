/*
  # Initial Schema Setup

  This migration creates the initial database schema with proper error handling for existing tables.

  1. Core Features
    - UUID support
    - Timestamp handling
    - Audit logging
    - Row versioning

  2. Security
    - Role-based access control
    - Audit trails
    - Data protection
*/

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create audit log function
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

-- Create audit logs table if not exists
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Create roles table if not exists
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create specialties table if not exists
CREATE TABLE IF NOT EXISTS specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Insert default roles if not exist
INSERT INTO roles (name, description)
SELECT 'administrator', 'System administrator with full access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'administrator');

INSERT INTO roles (name, description)
SELECT 'doctor', 'Medical doctor with access to assigned patients'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'doctor');

INSERT INTO roles (name, description)
SELECT 'nurse', 'Nursing staff with limited access'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'nurse');

-- Insert default specialties if not exist
DO $$
DECLARE
  specialties text[] := ARRAY[
    'General Medicine',
    'Cardiology',
    'Dermatology',
    'Endocrinology',
    'Gastroenterology',
    'Neurology',
    'Obstetrics and Gynecology',
    'Ophthalmology',
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'Pulmonology',
    'Radiology',
    'Urology'
  ];
  specialty text;
BEGIN
  FOREACH specialty IN ARRAY specialties
  LOOP
    INSERT INTO specialties (name)
    SELECT specialty
    WHERE NOT EXISTS (
      SELECT 1 FROM specialties WHERE name = specialty
    );
  END LOOP;
END $$;