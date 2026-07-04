import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { xai } from '@ai-sdk/xai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: xai('grok-3-mini'),
    system: `Sos un asistente de OficioPro, una plataforma argentina que conecta prestadores de servicios con clientes.
Respondé siempre en español argentino, de forma clara y amable.
Ayudá con consultas sobre servicios, reservas, precios y disponibilidad.
Si no tenés información específica, sugerí contactar al prestador por el chat.`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
