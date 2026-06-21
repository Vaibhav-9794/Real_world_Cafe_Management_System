import { BRANDING } from '../../config/branding';

/**
 * Formats phone number by removing non-numeric characters for WhatsApp URLs.
 */
function cleanPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace('+', '');
}

/**
 * Generates a wa.me URL with urlencoded text.
 */
function generateWhatsAppUrl(recipientPhone: string, text: string): string {
  const cleaned = cleanPhone(recipientPhone);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

export const WHATSAPP_FLOWS = {
  /**
   * For Customer: Send reservation details to Restaurant after booking on website
   */
  getReservationReceivedMessage(details: {
    id: string;
    branchName: string;
    name: string;
    date: string;
    time: string;
    guests: number;
    type: string;
    amount: number;
  }): string {
    const text = `✦ *NEW RESERVATION REQUEST* ✦
    
*Reservation ID:* ${details.id.substring(0, 8)}
*Customer Name:* ${details.name}
*Branch:* ${details.branchName}
*Type:* ${details.type}
*Date:* ${details.date}
*Time:* ${details.time}
*Guests:* ${details.guests} people
*Deposit Paid:* $${details.amount.toFixed(2)}

Hi, I just submitted a reservation on the website and completed the advance payment. Please verify and approve my booking!`;
    
    return generateWhatsAppUrl(BRANDING.branches[0].whatsapp, text);
  },

  /**
   * For Host: Send reservation confirmation to Customer
   */
  getReservationApprovedMessage(customerPhone: string, details: {
    id: string;
    name: string;
    branchName: string;
    date: string;
    time: string;
    guests: number;
    tables: string[];
  }): string {
    const text = `✦ *CONFIRMED RESERVATION* ✦

Dear *${details.name}*,

We are delighted to confirm your booking at *${BRANDING.name}*!

*Reservation ID:* ${details.id.substring(0, 8)}
*Branch:* ${details.branchName}
*Date:* ${details.date}
*Time:* ${details.time}
*Guests:* ${details.guests} people
*Assigned Table(s):* ${details.tables.join(', ')}

Please arrive 10 minutes before your time slot. We hold tables for 15 minutes max.

We look forward to welcoming you! ✦`;
    
    return generateWhatsAppUrl(customerPhone, text);
  },

  /**
   * For Host: Notify Customer reservation was rejected
   */
  getReservationRejectedMessage(customerPhone: string, details: {
    id: string;
    name: string;
    branchName: string;
    date: string;
    time: string;
    refundAmount: number;
  }): string {
    const text = `✦ *RESERVATION UPDATE* ✦

Dear *${details.name}*,

We regret to inform you that we cannot accommodate your reservation *(${details.id.substring(0, 8)})* on *${details.date}* at *${details.time}* due to full capacity.

Your booking deposit of *$${details.refundAmount.toFixed(2)}* has been fully voided and initiated for refund. It should reflect in your account within 5-7 business days.

We apologize for the inconvenience and hope to serve you another time.`;
    
    return generateWhatsAppUrl(customerPhone, text);
  },

  /**
   * For Customer: Ask about an Event package
   */
  getEventInquiryMessage(details: {
    packageName: string;
    branchId: string;
    name: string;
    date: string;
    guests: number;
  }): string {
    const branch = BRANDING.branches.find(b => b.id === details.branchId) || BRANDING.branches[0];
    const text = `✦ *EVENT INQUIRY* ✦

*Event Package:* ${details.packageName}
*Branch:* ${branch.name}
*Customer Name:* ${details.name}
*Proposed Date:* ${details.date}
*Guests:* ${details.guests} people

Hello, I would like to check availability and request custom styling/catering quotes for hosting my event with you. Thank you!`;
    
    return generateWhatsAppUrl(branch.whatsapp, text);
  },

  /**
   * General WhatsApp Direct Link
   */
  getGeneralContactLink(branchId?: string): string {
    const branch = BRANDING.branches.find(b => b.id === branchId) || BRANDING.branches[0];
    const text = `Hello *${BRANDING.name}*, I have a general inquiry about your services, menu, or booking options.`;
    return generateWhatsAppUrl(branch.whatsapp, text);
  }
};
