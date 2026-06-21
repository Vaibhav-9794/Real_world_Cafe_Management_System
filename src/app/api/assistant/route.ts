import { NextResponse } from 'next/server';
import { getAssistantProvider } from '../../../lib/assistant/assistantProvider';

export async function POST(request: Request) {
  try {
    const { prompt, context } = await request.json();
    if (!prompt) {
      return NextResponse.json({ success: false, message: 'Prompt is required.' }, { status: 400 });
    }

    const provider = getAssistantProvider();
    console.log(`BOHO Assistant using provider: ${provider.name}`);
    const responseText = await provider.generateResponse(prompt, context);

    return NextResponse.json({
      success: true,
      provider: provider.name,
      response: responseText
    });
  } catch (error: any) {
    console.error('BOHO Assistant API Error (contained):', error);
    return NextResponse.json({
      success: true,
      provider: 'BOHO Emergency Fallback',
      response: 'I apologize, but I am having trouble connecting to my cognitive systems right now. How else may I assist you with Boho Cafe & Dining?'
    });
  }
}
