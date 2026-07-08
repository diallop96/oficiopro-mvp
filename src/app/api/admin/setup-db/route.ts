import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

export const maxDuration = 60;

const SETUP_SECRET = process.env.SETUP_SECRET || 'oficiopro-setup-2026';

async function runMigration() {
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Falta POSTGRES_URL_NON_POOLING en variables de entorno');
  }

  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/001_initial_schema.sql'),
    'utf8'
  );

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('already exists')) {
      // Migración idempotente parcial — continuar
    } else {
      throw err;
    }
  } finally {
    await client.end();
  }
}

async function ensureBuckets() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const buckets = [
    { id: 'avatars', public: true },
    { id: 'works', public: true },
    { id: 'verification', public: false },
  ];

  const { data: existing } = await supabase.storage.listBuckets();
  const names = new Set((existing || []).map((b) => b.id));

  for (const b of buckets) {
    if (!names.has(b.id)) {
      await supabase.storage.createBucket(b.id, { public: b.public });
    }
  }
}

async function seedDemoUsers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const demos = [
    {
      email: 'demo.prestador@oficiopro.app',
      password: 'demo123456',
      full_name: 'Carlos Mendoza',
      role: 'prestador' as const,
      provider: {
        bio: 'Plomero matriculado con más de 15 años de experiencia.',
        zone: 'CABA - Palermo',
        categories: ['plomeria', 'gas'],
        years_experience: 15,
        is_verified: true,
        completed_jobs: 52,
      },
      services: [
        { name: 'Reparación de pérdidas', description: 'Detección y reparación', price: 15000, duration_minutes: 60 },
        { name: 'Destape de cañerías', description: 'Destape con máquina', price: 25000, duration_minutes: 90 },
      ],
    },
    {
      email: 'demo.electricista@oficiopro.app',
      password: 'demo123456',
      full_name: 'María Fernández',
      role: 'prestador' as const,
      provider: {
        bio: 'Electricista matriculada. Instalaciones y luminarias LED.',
        zone: 'CABA - Belgrano',
        categories: ['electricidad'],
        years_experience: 8,
        is_verified: true,
        completed_jobs: 34,
      },
      services: [
        { name: 'Instalación de luminaria', description: 'Colocación y conexión', price: 12000, duration_minutes: 45 },
      ],
    },
    {
      email: 'demo.cliente@oficiopro.app',
      password: 'demo123456',
      full_name: 'Juan Pérez',
      role: 'cliente' as const,
    },
  ];

  const created: string[] = [];

  for (const demo of demos) {
    const { data: list } = await supabase.auth.admin.listUsers();
    let userId = list?.users?.find((u) => u.email === demo.email)?.id;

    if (!userId) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: demo.email,
        password: demo.password,
        email_confirm: true,
      });
      if (error) throw new Error(`Usuario ${demo.email}: ${error.message}`);
      userId = data.user.id;
      created.push(demo.email);
    }

    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).single();
    if (!profile) {
      await supabase.from('profiles').insert({
        id: userId,
        email: demo.email,
        full_name: demo.full_name,
        phone: '11 5555-0000',
        role: demo.role,
        verification_status: 'verificado',
      });
    }

    if (demo.provider) {
      const { data: pp } = await supabase.from('provider_profiles').select('id').eq('user_id', userId).single();
      let providerId = pp?.id;

      if (!providerId) {
        const { data: createdProvider } = await supabase.from('provider_profiles').insert({
          user_id: userId,
          ...demo.provider,
          average_rating: 4.8,
          total_reviews: 12,
        }).select('id').single();
        providerId = createdProvider?.id;
      }

      if (providerId && demo.services) {
        const { count } = await supabase.from('services').select('*', { count: 'exact', head: true }).eq('provider_id', providerId);
        if (!count) {
          await supabase.from('services').insert(demo.services.map((s) => ({ ...s, provider_id: providerId })));
        }

        const { count: avail } = await supabase.from('availability').select('*', { count: 'exact', head: true }).eq('provider_id', providerId);
        if (!avail) {
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

        const { count: works } = await supabase.from('works').select('*', { count: 'exact', head: true }).eq('provider_id', providerId);
        if (!works) {
          await supabase.from('works').insert({
            provider_id: providerId,
            title: 'Trabajo destacado',
            description: 'Ejemplo de trabajo realizado.',
            image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
            category: demo.provider.categories[0],
          });
        }
      }
    }
  }

  return created;
}

async function enableRealtime() {
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL;

  if (!connectionString) return;

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  } finally {
    await client.end();
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/setup-db',
    method: 'POST',
    auth: 'Authorization: Bearer <SETUP_SECRET>',
    steps: ['migrate', 'buckets', 'seed', 'realtime'],
    query: '?only=buckets,seed — omitir migración si ya corriste el SQL en Supabase',
    manual_sql: 'supabase/migrations/001_initial_schema.sql',
    maintenance: 'supabase/maintenance.sql',
  });
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${SETUP_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const url = new URL(req.url);
  const only = url.searchParams.get('only')?.split(',').map((s) => s.trim()) ?? null;
  const run = (step: string) => !only || only.includes(step);

  try {
    const steps: string[] = [];

    if (run('migrate')) {
      await runMigration();
      steps.push('Migración SQL aplicada');
    }

    if (run('buckets')) {
      await ensureBuckets();
      steps.push('Buckets de storage verificados');
    }

    if (run('seed')) {
      const created = await seedDemoUsers();
      steps.push(`Usuarios demo: ${created.length ? created.join(', ') : 'ya existían'}`);
    }

    if (run('realtime')) {
      await enableRealtime();
      steps.push('Realtime habilitado para chat_messages');
    }

    return NextResponse.json({ success: true, steps });
  } catch (error) {
    console.error('Setup DB error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error en setup',
        hint: 'Si la migración falla, ejecutá supabase/migrations/001_initial_schema.sql en Supabase SQL Editor y llamá POST ?only=buckets,seed,realtime',
      },
      { status: 500 }
    );
  }
}
