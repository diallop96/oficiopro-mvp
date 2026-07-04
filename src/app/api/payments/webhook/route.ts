import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.type === 'payment' && body.data?.id) {
      const paymentId = body.data.id;
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (accessToken) {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payment = await res.json();

        if (payment.status === 'approved' && payment.external_reference) {
          const supabase = await createServiceClient();
          await supabase
            .from('bookings')
            .update({
              payment_status: 'pagado',
              mercadopago_payment_id: String(paymentId),
            })
            .eq('id', payment.external_reference);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
