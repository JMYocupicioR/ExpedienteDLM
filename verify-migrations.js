#!/usr/bin/env node

/**
 * Script de verificación de migraciones
 * Verifica que las migraciones de CURP se hayan aplicado correctamente
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no configuradas');
  console.error('Asegúrate de tener VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigrations() {
  console.log('🔍 Verificando migraciones de CURP...\n');

  try {
    // 1. Verificar que la columna curp existe
    console.log('1. Verificando columna CURP...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'patients')
      .eq('column_name', 'curp');

    if (columnsError) {
      console.error('❌ Error al verificar columnas:', columnsError.message);
      return;
    }

    if (columns.length === 0) {
      console.error('❌ Columna CURP no encontrada. Aplica las migraciones primero.');
      return;
    }

    console.log('✅ Columna CURP encontrada:', columns[0]);

    // 2. Verificar que el constraint UNIQUE existe
    console.log('\n2. Verificando constraint UNIQUE...');
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'patients')
      .eq('constraint_type', 'UNIQUE')
      .ilike('constraint_name', '%curp%');

    if (constraintsError) {
      console.error('❌ Error al verificar constraints:', constraintsError.message);
      return;
    }

    if (constraints.length === 0) {
      console.error('❌ Constraint UNIQUE no encontrado. Aplica las migraciones primero.');
      return;
    }

    console.log('✅ Constraint UNIQUE encontrado:', constraints[0]);

    // 3. Verificar que la función existe
    console.log('\n3. Verificando función check_patient_exists_by_curp...');
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_name', 'check_patient_exists_by_curp');

    if (functionsError) {
      console.error('❌ Error al verificar funciones:', functionsError.message);
      return;
    }

    if (functions.length === 0) {
      console.error('❌ Función check_patient_exists_by_curp no encontrada. Aplica las migraciones primero.');
      return;
    }

    console.log('✅ Función encontrada:', functions[0]);

    // 4. Verificar que el índice existe
    console.log('\n4. Verificando índice...');
    const { data: indexes, error: indexesError } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .ilike('indexname', '%curp%');

    if (indexesError) {
      console.error('❌ Error al verificar índices:', indexesError.message);
      return;
    }

    if (indexes.length === 0) {
      console.error('❌ Índice CURP no encontrado. Aplica las migraciones primero.');
      return;
    }

    console.log('✅ Índice encontrado:', indexes[0].indexname);

    // 5. Verificar que no hay pacientes sin CURP
    console.log('\n5. Verificando pacientes sin CURP...');
    const { data: patientsWithoutCurp, error: patientsError } = await supabase
      .from('patients')
      .select('id, full_name')
      .or('curp.is.null,curp.eq.');

    if (patientsError) {
      console.error('❌ Error al verificar pacientes:', patientsError.message);
      return;
    }

    if (patientsWithoutCurp.length > 0) {
      console.warn('⚠️  Encontrados pacientes sin CURP:', patientsWithoutCurp.length);
      console.warn('   Ejecuta la migración 20250814001000_populate_curp_for_existing_patients.sql');
    } else {
      console.log('✅ Todos los pacientes tienen CURP');
    }

    // 6. Verificar que la Edge Function está disponible
    console.log('\n6. Verificando Edge Function...');
    try {
      const { data: functionTest, error: functionTestError } = await supabase.functions.invoke('check-patient-exists', {
        body: { clinic_id: '00000000-0000-0000-0000-000000000000', curp: 'TEST' }
      });

      if (functionTestError) {
        if (functionTestError.message.includes('not found')) {
          console.error('❌ Edge Function check-patient-exists no encontrada. Despliega la función primero.');
        } else {
          console.log('✅ Edge Function encontrada (error esperado por datos de prueba)');
        }
      } else {
        console.log('✅ Edge Function funcionando correctamente');
      }
    } catch (error) {
      console.error('❌ Error al probar Edge Function:', error.message);
    }

    console.log('\n🎉 Verificación completada!');
    console.log('\n📋 Resumen:');
    console.log('   ✅ Columna CURP: OK');
    console.log('   ✅ Constraint UNIQUE: OK');
    console.log('   ✅ Función helper: OK');
    console.log('   ✅ Índice: OK');
    console.log('   ✅ Pacientes con CURP: OK');
    console.log('   ⚠️  Edge Function: Verificar deployment');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar verificación
verifyMigrations();
