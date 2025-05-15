import React from 'react';

const TableRelationships = () => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-blue-700 mb-6">Table Relationships</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Table</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Child Table</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Foreign Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <TableRow 
              parent="roles" 
              child="users" 
              type="One-to-Many" 
              foreignKey="role_id" 
              description="Each role can be assigned to multiple users, but each user has only one role"
            />
            <TableRow 
              parent="specialties" 
              child="users" 
              type="One-to-Many" 
              foreignKey="specialty_id" 
              description="Doctors belong to specific medical specialties"
            />
            <TableRow 
              parent="users" 
              child="consultations" 
              type="One-to-Many" 
              foreignKey="doctor_id" 
              description="Doctors can have multiple consultations with patients"
            />
            <TableRow 
              parent="patients" 
              child="consultations" 
              type="One-to-Many" 
              foreignKey="patient_id" 
              description="Patients can have multiple consultations"
            />
            <TableRow 
              parent="patients" 
              child="medical_histories" 
              type="One-to-One" 
              foreignKey="patient_id" 
              description="Each patient has one comprehensive medical history record"
            />
            <TableRow 
              parent="consultations" 
              child="vital_signs" 
              type="One-to-One" 
              foreignKey="consultation_id" 
              description="Vital signs recorded during each consultation"
            />
            <TableRow 
              parent="consultations" 
              child="prescriptions" 
              type="One-to-Many" 
              foreignKey="consultation_id" 
              description="Multiple medications can be prescribed during a consultation"
            />
            <TableRow 
              parent="medications" 
              child="prescriptions" 
              type="One-to-Many" 
              foreignKey="medication_id" 
              description="The same medication can be prescribed to multiple patients"
            />
            <TableRow 
              parent="allergies" 
              child="patient_allergies" 
              type="One-to-Many" 
              foreignKey="allergy_id" 
              description="Many patients can have the same allergy"
            />
            <TableRow 
              parent="patients" 
              child="patient_allergies" 
              type="One-to-Many" 
              foreignKey="patient_id" 
              description="Patients can have multiple allergies"
            />
            <TableRow 
              parent="custom_fields" 
              child="custom_field_values" 
              type="One-to-Many" 
              foreignKey="custom_field_id" 
              description="Custom fields can have many values across different entities"
            />
            <TableRow 
              parent="specialties" 
              child="custom_fields" 
              type="One-to-Many" 
              foreignKey="specialty_id" 
              description="Different specialties can have specific custom fields"
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface TableRowProps {
  parent: string;
  child: string;
  type: string;
  foreignKey: string;
  description: string;
}

const TableRow = ({ parent, child, type, foreignKey, description }: TableRowProps) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="font-mono text-blue-600">{parent}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="font-mono text-green-600">{child}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          {type}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-600">
        {foreignKey}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {description}
      </td>
    </tr>
  );
};

export default TableRelationships;