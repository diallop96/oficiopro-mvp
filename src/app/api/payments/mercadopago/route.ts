import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDepositPreference } from '@/lib/mercadopago';

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select(`*, service:services(name)`)
      .eq('id', bookingId)
      .eq('client_id', user.id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      await supabase
        .from('bookings')
        .update({ payment_status: 'pagado', status: 'pendiente' })
        .eq('id', bookingId);

      return NextResponse.json({
        initPoint: `/dashboard/cliente/reservas?payment=success&booking=${bookingId}`,
        sandbox: true,
      });
    }

    const preference = await createDepositPreference({
      bookingId,
      title: booking.service?.name || 'Servicio OficioPro',
      depositAmount: Number(booking.deposit_amount),
      clientEmail: user.email!,
    });

    await supabase
      .from('bookings')
      .update({ mercadopago_preference_id: preference.id })
      .eq('id', bookingId);

    return NextResponse.json({
      initPoint: preference.init_point,
      preferenceId: preference.id,
    });
  } catch (error) {
    console.error('MercadoPago error:', error);
    return NextResponse.json({ error: 'Error al procesar el pago' }, { status: 500 });
  }
}
