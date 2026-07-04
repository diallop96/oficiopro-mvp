#!/usr/bin/env node
/**
 * Configura la base de datos OficioPro en Supabase.
 * Uso: node scripts/setup-db.mjs
 * Requiere variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function ensureBuckets() {
  const buckets = [
    { id: 'avatars', public: true },
    { id: 'works', public: true },
    { id: 'verification', public: false },
  ];
  const { data: existing } = await supabase.storage.listBuckets();
  const names = new Set((existing || []).map((b) => b.id));
  for (const b of buckets) {
    if (!names.has(b.id)) {
      const { error } = await supabase.storage.createBucket(b.id, { public: b.public });
      if (error) console.warn(`Bucket ${b.id}:`, error.message);
      else console.log(`✓ Bucket ${b.id} creado`);
    } else {
      console.log(`✓ Bucket ${b.id} ya existe`);
    }
  }
}

async function seedDemoUsers() {
  const demos = [
    {
      email: 'demo.prestador@oficiopro.app',
      password: 'demo123456',
      full_name: 'Carlos Mendoza',
      role: 'prestador',
      provider: {
        bio: 'Plomero matriculado con más de 15 años de experiencia. Trabajos de instalación, mantenimiento y emergencias.',
        zone: 'CABA - Palermo',
        categories: ['plomeria', 'gas'],
        years_experience: 15,
        is_verified: true,
        completed_jobs: 52,
      },
      services: [
        { name: 'Reparación de pérdidas', description: 'Detección y reparación de pérdidas de agua', price: 15000, duration_minutes: 60 },
        { name: 'Destape de cañerías', description: 'Destape con máquina y cámara', price: 25000, duration_minutes: 90 },
      ],
    },
    {
      email: 'demo.electricista@oficiopro.app',
      password: 'demo123456',
      full_name: 'María Fernández',
      role: 'prestador',
      provider: {
        bio: 'Electricista matriculada. Instalaciones, tableros y luminarias LED.',
        zone: 'CABA - Belgrano',
        categories: ['electricidad'],
        years_experience: 8,
        is_verified: true,
        completed_jobs: 34,
      },
      services: [
        { name: 'Instalación de luminaria', description: 'Colocación y conexión', price: 12000, duration_minutes: 45 },
        { name: 'Revisión de tablero', description: 'Diagnóstico completo del tablero eléctrico', price: 18000, duration_minutes: 60 },
      ],
    },
    {
      email: 'demo.cliente@oficiopro.app',
      password: 'demo123456',
      full_name: 'Juan Pérez',
      role: 'cliente',
    },
  ];

  for (const demo of demos) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === demo.email);
    let userId = found?.id;

    if (!userId) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: demo.email,
        password: demo.password,
        email_confirm: true,
        user_metadata: { full_name: demo.full_name, role: demo.role },
      });
      if (error) {
        console.warn(`Usuario ${demo.email}:`, error.message);
        continue;
      }
      userId = data.user.id;
      console.log(`✓ Usuario creado: ${demo.email}`);
    } else {
      console.log(`✓ Usuario existe: ${demo.email}`);
    }

    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single();
    if (!profile) {
      await supabase.from('profiles').insert({
        id: userId,
        email: demo.email,
        full_name: demo.full_name,
        phone: '11 5555-0000',
        role: demo.role,
        verification_status: demo.role === 'prestador' ? 'verificado' : 'verificado',
      });
    }

    if (demo.provider) {
      const { data: pp } = await supabase.from('provider_profiles').select('id').eq('user_id', userId).single();
      let providerId = pp?.id;
      if (!providerId) {
        const { data: created } = await supabase.from('provider_profiles').insert({
          user_id: userId,
          ...demo.provider,
          average_rating: 4.8,
          total_reviews: 12,
        }).select('id').single();
        providerId = created?.id;
      }

      if (providerId && demo.services) {
        const { count } = await supabase.from('services').select('*', { count: 'exact', head: true }).eq('provider_id', providerId);
        if (!count) {
          await supabase.from('services').insert(
            demo.services.map((s) => ({ ...s, provider_id: providerId }))
          );
        }

        const { count: availCount } = await supabase.from('availability').select('*', { count: 'exact', head: true }).eq('provider_id', providerId);
        if (!availCount) {
          await supabase.from('availability').insert(
            [1, 2, 3, 4, 5].map((d) => ({
              provider_id: providerId,
              day_of_week: d,
              start_time: '09:00',
              end_time: '18:00',
              is_active: true,
            }))
          );
        }

        const { count: worksCount } = await supabase.from('works').select('*', { count: 'exact', head: true }).eq('provider_id', providerId);
        if (!worksCount) {
          await supabase.from('works').insert({
            provider_id: providerId,
            title: 'Trabajo destacado',
            description: 'Ejemplo de trabajo realizado con excelentes resultados.',
            image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
            category: demo.provider.categories[0],
          });
        }
      }
    }
  }
}

async function main() {
  console.log('Configurando Supabase para OficioPro...');
  await ensureBuckets();
  await seedDemoUsers();
  console.log('\n✅ Setup completado');
  console.log('\nCuentas demo:');
  console.log('  Prestador: demo.prestador@oficiopro.app / demo123456');
  console.log('  Electricista: demo.electricista@oficiopro.app / demo123456');
  console.log('  Cliente: demo.cliente@oficiopro.app / demo123456');
}

main().catch(console.error);
