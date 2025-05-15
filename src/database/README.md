# ExpedienteDLM Database Schema

This document provides an overview of the database schema for the ExpedienteDLM medical records system.

## Schema Overview

The database is designed to support a comprehensive medical records system with the following features:

- User authentication and role-based access control
- Complete patient demographic and medical information
- Consultation and appointment tracking
- Vital signs monitoring
- Medication prescriptions
- Medical tests and studies
- Customizable fields for different medical specialties
- File attachments
- Comprehensive audit logging

## Key Tables

### Authentication and Users

- **roles**: System roles for access control
- **specialties**: Medical specialties (cardiology, neurology, etc.)
- **users**: System users including doctors, nurses, and administrators

### Patient Information

- **patients**: Core patient demographic and contact information
- **patient_contacts**: Emergency contacts for patients
- **medical_histories**: Complete medical history records
- **allergies**: Catalog of common allergies
- **patient_allergies**: Junction table connecting patients to their allergies

### Clinical Operations

- **consultations**: Medical consultations/appointments
- **vital_signs**: Patient vital signs recorded during consultations
- **medications**: Medication catalog with details
- **prescriptions**: Medication prescriptions given to patients
- **medical_tests**: Medical tests and studies for patients
- **file_attachments**: Files attached to various entities in the system

### Customization

- **custom_fields**: Custom fields defined for different entities
- **custom_field_values**: Values for custom fields

### Auditing

- **audit_logs**: System audit logs for compliance and security

## Database Features

The schema includes several powerful features:

- **UUID Primary Keys**: For enhanced security and scalability
- **Soft Delete**: Deleted_at timestamps for non-destructive record removal
- **Automated Timestamps**: Created_at and updated_at fields maintained automatically
- **Audit Trails**: Comprehensive logging of all changes
- **Indexing**: Strategic indexes for performance optimization
- **Data Validation**: Constraints to ensure data integrity
- **Internationalization Support**: Language preferences for patients

## Security Features

The database schema supports HIPAA compliance through:

- Comprehensive audit logging
- Strong authentication and authorization
- Data encryption capabilities
- Secure access patterns

## Customization

The system supports customization for different medical specialties through:

- Custom fields that can be associated with specific specialties
- Flexible data storage for specialty-specific information
- Configuration options for different medical workflows