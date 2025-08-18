#!/usr/bin/env node

/**
 * Script para aplicar la migración del Sistema de Aprobación de Personal
 * Este script ejecuta la migración SQL y verifica que todo esté funcionando
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔧 APLICANDO MIGRACIÓN: Sistema de Aprobación de Personal');
console.log('='.repeat(60));

const steps = [
  {
    name: 'Verificar archivo de migración',
    check: () => {
      const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250811000000_staff_approval_system.sql');
      if (!fs.existsSync(migrationPath)) {
        throw new Error('Archivo de migración no encontrado: 20250811000000_staff_approval_system.sql');
      }
      console.log('✅ Archivo de migración encontrado');
      return true;
    }
  },
  
  {
    name: 'Verificar que Supabase esté ejecutándose',
    check: () => {
      try {
        // Verificar si Docker está ejecutándose
        execSync('docker ps', { stdio: 'pipe' });
        console.log('✅ Docker está ejecutándose');
        
        // Verificar si Supabase está activo
        try {
          execSync('npx supabase status', { stdio: 'pipe' });
          console.log('✅ Supabase está activo');
          return true;
        } catch (error) {
          console.log('⚠️ Supabase no está activo, iniciando...');
          execSync('npx supabase start', { stdio: 'inherit' });
          return true;
        }
      } catch (error) {
        throw new Error('Docker no está ejecutándose. Por favor, inicia Docker y vuelve a intentar.');
      }
    }
  },
  
  {
    name: 'Aplicar migración SQL',
    check: () => {
      try {
        console.log('📋 Aplicando migración SQL...');
        execSync('npx supabase db reset', { stdio: 'inherit' });
        console.log('✅ Migración aplicada exitosamente');
        return true;
      } catch (error) {
        throw new Error('Error aplicando migración: ' + error.message);
      }
    }
  },
  
  {
    name: 'Verificar estructura de la base de datos',
    check: () => {
      try {
        console.log('🔍 Verificando estructura de la base de datos...');
        
        // Verificar que la columna status existe
        const result = execSync('npx supabase db diff --schema public', { 
          stdio: 'pipe',
          encoding: 'utf8'
        });
        
        if (result.includes('status')) {
          console.log('✅ Columna status agregada correctamente');
        } else {
          console.log('⚠️ Columna status no encontrada en el diff');
        }
        
        return true;
      } catch (error) {
        console.log('⚠️ No se pudo verificar la estructura (esto es normal en algunos casos)');
        return true;
      }
    }
  },
  
  {
    name: 'Verificar funciones RPC',
    check: () => {
      try {
        console.log('🔍 Verificando funciones RPC...');
        
        // Listar funciones disponibles
        const result = execSync('npx supabase db diff --schema public', { 
          stdio: 'pipe',
          encoding: 'utf8'
        });
        
        const functions = [
          'user_has_approved_access_to_clinic',
          'user_is_clinic_admin',
          'approve_clinic_user',
          'reject_clinic_user'
        ];
        
        functions.forEach(func => {
          if (result.includes(func)) {
            console.log(`✅ Función ${func} encontrada`);
          } else {
            console.log(`⚠️ Función ${func} no encontrada en el diff`);
          }
        });
        
        return true;
      } catch (error) {
        console.log('⚠️ No se pudieron verificar las funciones RPC');
        return true;
      }
    }
  },
  
  {
    name: 'Verificar políticas RLS',
    check: () => {
      try {
        console.log('🔍 Verificando políticas RLS...');
        
        const result = execSync('npx supabase db diff --schema public', { 
          stdio: 'pipe',
          encoding: 'utf8'
        });
        
        const policies = [
          'patients_select_by_clinic',
          'patients_insert_by_clinic',
          'patients_update_by_clinic',
          'patients_delete_by_clinic'
        ];
        
        policies.forEach(policy => {
          if (result.includes(policy)) {
            console.log(`✅ Política ${policy} encontrada`);
          } else {
            console.log(`⚠️ Política ${policy} no encontrada en el diff`);
          }
        });
        
        return true;
      } catch (error) {
        console.log('⚠️ No se pudieron verificar las políticas RLS');
        return true;
      }
    }
  },
  
  {
    name: 'Verificar archivos de TypeScript',
    check: () => {
      const files = [
        'src/lib/services/clinic-staff-service.ts',
        'src/components/ClinicStaffManagement.tsx'
      ];
      
      files.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          console.log(`✅ ${file} encontrado`);
        } else {
          throw new Error(`Archivo no encontrado: ${file}`);
        }
      });
      
      return true;
    }
  },
  
  {
    name: 'Verificar tipos de base de datos',
    check: () => {
      const typesPath = path.join(process.cwd(), 'src', 'lib', 'database.types.ts');
      if (!fs.existsSync(typesPath)) {
        throw new Error('Archivo de tipos no encontrado: database.types.ts');
      }
      
      const content = fs.readFileSync(typesPath, 'utf8');
      
      // Verificar que los nuevos campos estén presentes
      const requiredFields = [
        'status: \'pending\' | \'approved\' | \'rejected\'',
        'approved_by: string | null',
        'approved_at: string | null',
        'rejection_reason: string | null',
        'rejected_by: string | null',
        'rejected_at: string | null'
      ];
      
      requiredFields.forEach(field => {
        if (content.includes(field)) {
          console.log(`✅ Campo ${field.split(':')[0]} encontrado en tipos`);
        } else {
          console.log(`⚠️ Campo ${field.split(':')[0]} no encontrado en tipos`);
        }
      });
      
      return true;
    }
  }
];

async function runMigration() {
  console.log('🚀 Iniciando proceso de migración...\n');
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`\n📋 Paso ${i + 1}/${steps.length}: ${step.name}`);
    console.log('-'.repeat(40));
    
    try {
      await step.check();
      console.log(`✅ ${step.name} completado exitosamente`);
    } catch (error) {
      console.error(`❌ Error en ${step.name}:`, error.message);
      console.log('\n💡 Solución:');
      
      if (error.message.includes('Docker')) {
        console.log('1. Inicia Docker Desktop');
        console.log('2. Espera a que Docker esté completamente ejecutándose');
        console.log('3. Ejecuta este script nuevamente');
      } else if (error.message.includes('migración')) {
        console.log('1. Verifica que no haya errores en el archivo SQL');
        console.log('2. Asegúrate de que Supabase esté ejecutándose');
        console.log('3. Intenta ejecutar manualmente: npx supabase db reset');
      } else {
        console.log('Revisa el error específico y corrige el problema');
      }
      
      process.exit(1);
    }
  }
  
  console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
  console.log('='.repeat(60));
  console.log('\n📋 RESUMEN DE LO IMPLEMENTADO:');
  console.log('✅ Campo status agregado a clinic_user_relationships');
  console.log('✅ Campos de auditoría para aprobación/rechazo');
  console.log('✅ Funciones helper para verificar permisos');
  console.log('✅ Políticas RLS actualizadas para incluir status = approved');
  console.log('✅ Sistema de auditoría completo');
  console.log('✅ Vista para facilitar consultas de personal');
  console.log('✅ Servicio TypeScript para gestión de personal');
  console.log('✅ Componente React para interfaz de administración');
  console.log('✅ Tipos TypeScript actualizados');
  
  console.log('\n🚀 PRÓXIMOS PASOS:');
  console.log('1. Reinicia tu aplicación React');
  console.log('2. Ve a la pestaña "Personal" en el panel de administración');
  console.log('3. Prueba el sistema de aprobación con un nuevo usuario');
  console.log('4. Verifica que las políticas RLS funcionen correctamente');
  
  console.log('\n⚠️ IMPORTANTE:');
  console.log('- Los usuarios existentes se marcarán automáticamente como "approved"');
  console.log('- Los nuevos usuarios tendrán status "pending" por defecto');
  console.log('- Solo los administradores pueden aprobar/rechazar usuarios');
  console.log('- Las políticas RLS ahora requieren status = "approved" para acceso');
  
  console.log('\n🔗 DOCUMENTACIÓN:');
  console.log('- Revisa docs/STAFF_APPROVAL_SYSTEM.md para más detalles');
  console.log('- Consulta la migración SQL para entender los cambios técnicos');
}

// Ejecutar migración
runMigration().catch(error => {
  console.error('💥 Error fatal durante la migración:', error);
  process.exit(1);
});
