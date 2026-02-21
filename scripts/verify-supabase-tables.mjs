#!/usr/bin/env node
/**
 * Script para verificar qué tablas existen en Supabase.
 * Ejecutar: node scripts/verify-supabase-tables.mjs
 * Requiere: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_TO_CHECK = [
  // Escalas médicas (normalizadas)
  'medical_scales',
  'scale_questions',
  'question_options',
  'scale_scoring',
  'scoring_ranges',
  'scale_references',
  // Sistema actual
  'scale_assessments',
  // Notificaciones
  'notifications',
  // Invitaciones / pendientes
  'patient_registration_tokens',
  'patient_tasks',
  // Otros
  'patients',
  'clinics',
  'profiles',
];

async function checkTable(name) {
  try {
    const { data, error } = await supabase.from(name).select('*').limit(0);
    if (error) {
      if (error.code === '42P01') return { exists: false, error: 'Tabla no existe' };
      return { exists: true, error: error.message };
    }
    return { exists: true };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}

async function main() {
  console.log('🔍 Verificando tablas en Supabase...\n');

  const results = [];
  for (const table of TABLES_TO_CHECK) {
    const r = await checkTable(table);
    results.push({ table, ...r });
  }

  console.log('Tabla                    | Existe | Notas');
  console.log('-------------------------|--------|----------------------');
  for (const { table, exists, error } of results) {
    const status = exists ? '✅ Sí' : '❌ No';
    const note = error || '';
    console.log(`${table.padEnd(24)} | ${status.padEnd(6)} | ${note}`);
  }

  console.log('\n--- Resumen para el plan ---');
  const existing = results.filter(r => r.exists).map(r => r.table);
  const missing = results.filter(r => !r.exists).map(r => r.table);
  console.log('Existen:', existing.join(', '));
  console.log('No existen:', missing.join(', '));

  // Conteo de filas en tablas clave
  console.log('\n--- Conteo de filas ---');
  for (const t of ['medical_scales', 'scale_questions', 'question_options', 'scale_scoring', 'scoring_ranges', 'scale_references']) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (!error) console.log(`${t}: ${count ?? '?'} filas`);
    } catch (_) {}
  }
}

main().catch(console.error);
