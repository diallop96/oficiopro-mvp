import { NextResponse } from 'next/server';
import { generateProfileDescription, generateWorkDescription } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.type === 'work') {
      const description = await generateWorkDescription({
        title: body.title,
        category: body.category,
      });
      return NextResponse.json({ description });
    }

    const description = await generateProfileDescription({
      name: body.name,
      categories: body.categories,
      zone: body.zone,
      yearsExperience: body.yearsExperience,
    });

    return NextResponse.json({ description });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'No se pudo generar la descripción. Verificá la API key de Grok.' },
      { status: 500 }
    );
  }
}