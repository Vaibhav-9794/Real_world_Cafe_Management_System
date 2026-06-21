export interface AssistantProvider {
  name: string;
  generateResponse(prompt: string, context?: any): Promise<string>;
}

export class GeminiProvider implements AssistantProvider {
  name = 'Gemini AI';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(prompt: string, context?: any): Promise<string> {
    try {
      if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey === 'placeholder') {
        throw new Error('API key is missing or invalid.');
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are the BOHO Assistant, an elegant, helpful, and luxury concierge for "Boho Cafe & Dining", a premium restaurant in Kanpur, Uttar Pradesh, India.
Contact Details:
- Phone: +91 8400678200
- Email: hs142636@gmail.com
- Kanpur Centre (Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 10am-9pm)
- Kanpur East (Mon-Fri 12pm-11pm, Sat-Sun 10am-11pm)
- Menu includes Truffle Wild Mushroom Pizza (₹24), Smoked Butter Chicken (₹24.50), Margherita (₹18), Paneer Butter Masala (₹21).

Context:
${JSON.stringify(context || {})}

User request: ${prompt}`
                  }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        const errorDetails = await response.json().catch(() => ({}));
        throw new Error(`API response status ${response.status}: ${JSON.stringify(errorDetails)}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text || text.trim() === '') {
        throw new Error('Returned response content was empty.');
      }
      return text;
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }
}

export class OpenAIProvider implements AssistantProvider {
  name = 'OpenAI GPT';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(prompt: string, context?: any): Promise<string> {
    try {
      if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey === 'placeholder') {
        throw new Error('API key is missing or invalid.');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are the BOHO Assistant, an elegant, helpful, and luxury concierge for "Boho Cafe & Dining", a premium restaurant in Kanpur, Uttar Pradesh, India.
Contact Details:
- Phone: +91 8400678200
- Email: hs142636@gmail.com
- Kanpur Centre (Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 10am-9pm)
- Kanpur East (Mon-Fri 12pm-11pm, Sat-Sun 10am-11pm)
- Menu includes Truffle Wild Mushroom Pizza (₹24), Smoked Butter Chicken (₹24.50), Margherita (₹18), Paneer Butter Masala (₹21).`
            },
            {
              role: 'user',
              content: `Context: ${JSON.stringify(context || {})}\n\nRequest: ${prompt}`
            }
          ]
        })
      });

      if (!response.ok) {
        const errorDetails = await response.json().catch(() => ({}));
        throw new Error(`API response status ${response.status}: ${JSON.stringify(errorDetails)}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text || text.trim() === '') {
        throw new Error('Returned response content was empty.');
      }
      return text;
    } catch (error: any) {
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI generation failed: ${error.message}`);
    }
  }
}

export class MockProvider implements AssistantProvider {
  name = 'BOHO Mock Assistant';

  async generateResponse(prompt: string, context?: any): Promise<string> {
    const q = prompt.toLowerCase();
    
    // Luxury Q&A answers
    if (q.includes('book') || q.includes('reserve') || q.includes('table')) {
      return "I would be delighted to assist you with booking! You can easily secure your table by clicking the **BOOK A TABLE** button at the top right, or directly going to our [Reservations Page](/reserve). If you scan the table QR code, you can also place orders directly to our kitchen queue.";
    }
    if (q.includes('menu') || q.includes('food') || q.includes('eat') || q.includes('dish') || q.includes('spicy') || q.includes('veg')) {
      return "Our curated menu blends bohemian elegance with fine gastronomy. Some of our guest favorites include the **Truffle & Wild Mushroom Pizza**, **Smoked Butter Chicken**, and **Paneer Butter Masala**. You can browse our interactive menu with Veg, Spicy, and Chef Special indicators on the [Digital Menu Page](/menu).";
    }
    if (q.includes('event') || q.includes('party') || q.includes('birthday') || q.includes('corporate') || q.includes('wedding')) {
      return "We offer bespoke event hosting! From intimate candlelit **Anniversary celebrations** to grand **Prestige Corporate Galas** or **Exclusive Venue Takeovers**. You can plan your event in detail on our homepage and check estimated pricing and inclusions. Proceed to our reservation page to book a package!";
    }
    if (q.includes('loyalty') || q.includes('points') || q.includes('rewards') || q.includes('tier')) {
      return "We reward our loyal guests through the Boho Club! Tiers range from **Bronze** to **VIP Elite**. Every visit accumulates points that can be redeemed for fine desserts, premium discounts, or private chef tastings. You can check your status on the [Customer Portal](/account).";
    }
    if (q.includes('hours') || q.includes('time') || q.includes('open') || q.includes('close')) {
      return "Our branches opening hours are:\n- **Kanpur Centre**: Mon - Thu (11:00 AM - 10:00 PM), Fri - Sat (11:00 AM - 11:00 PM), Sunday (10:00 AM - 9:00 PM).\n- **Kanpur East (Lounge)**: Mon - Fri (12:00 PM - 11:00 PM), Sat - Sun (10:00 AM - 11:00 PM).";
    }
    if (q.includes('location') || q.includes('address') || q.includes('where') || q.includes('kanpur')) {
      return "We are located at **Boho Cafe & Dining, Kanpur, Uttar Pradesh, India**. You can view our branches, get directions, and see the interactive map at the bottom of the [Homepage](/).";
    }
    if (q.includes('phone') || q.includes('contact') || q.includes('whatsapp') || q.includes('email')) {
      return "You can reach our concierge desk at **+91 8400678200** or via email at **hs142636@gmail.com**. You can also chat directly via WhatsApp by clicking the floating icon in the bottom corner of your screen!";
    }

    return "Hello! I am your BOHO Concierge Assistant. I can assist you with booking tables, recommending dishes, planning private events, or explaining our Loyalty Rewards. How may I serve you today?";
  }
}

export class FallbackProvider implements AssistantProvider {
  name = 'BOHO Resilient Assistant';
  private providers: AssistantProvider[];

  constructor(providers: AssistantProvider[]) {
    this.providers = providers;
  }

  async generateResponse(prompt: string, context?: any): Promise<string> {
    let lastError = null;
    for (const provider of this.providers) {
      try {
        console.log(`BOHO Resilient Assistant: Attempting response generation with ${provider.name}...`);
        return await provider.generateResponse(prompt, context);
      } catch (err: any) {
        console.warn(`BOHO Resilient Assistant Warning: Provider ${provider.name} failed. Error:`, err.message || err);
        lastError = err;
      }
    }
    throw new Error(`All assistant providers failed. Last error: ${lastError?.message || 'unknown'}`);
  }
}

export function getAssistantProvider(): AssistantProvider {
  const chain: AssistantProvider[] = [];

  // Add Gemini provider if key is present and not a dummy placeholder
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== 'placeholder' && geminiKey.trim() !== '') {
    chain.push(new GeminiProvider(geminiKey));
  }

  // Add OpenAI provider if key is present and not a dummy placeholder
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey !== 'placeholder' && openaiKey.trim() !== '') {
    chain.push(new OpenAIProvider(openaiKey));
  }

  // Always append MockProvider to the end of the chain to guarantee a response
  chain.push(new MockProvider());

  if (chain.length === 1) {
    return chain[0];
  }

  return new FallbackProvider(chain);
}
