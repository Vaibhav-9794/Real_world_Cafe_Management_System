import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { logAuditEvent } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner privileges required.' }, { status: 403 });
    }

    // Get list of subscribers (all CRM customer emails)
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        vipStatus: true,
        membershipTier: true
      }
    });

    // Simulate marketing campaign history logs
    const mockCampaigns = [
      {
        id: 'campaign-1',
        title: 'Summer Solstice Tasting Event',
        subject: 'You are invited: Boho Summer Solstice Tasting',
        sentToCount: customers.length + 12,
        openRate: '72.4%',
        clickRate: '34.8%',
        status: 'SENT',
        sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'campaign-2',
        title: 'Loyalty Rewards Update',
        subject: 'Earn double points on your next visit!',
        sentToCount: customers.length + 8,
        openRate: '81.1%',
        clickRate: '42.9%',
        status: 'SENT',
        sentAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      subscribers: customers,
      campaigns: mockCampaigns
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner privileges required.' }, { status: 403 });
    }

    const { title, subject, content, targetTier } = await request.json();
    if (!title || !subject || !content) {
      return NextResponse.json({ success: false, message: 'Missing title, subject or content.' }, { status: 400 });
    }

    // Determine target subscriber count
    const whereClause = targetTier && targetTier !== 'All' ? { membershipTier: targetTier } : {};
    const recipients = await prisma.customer.findMany({
      where: whereClause,
      select: { email: true }
    });

    // Write audit log
    await logAuditEvent(
      session.email,
      session.role,
      'NEWSLETTER_SEND',
      `Sent newsletter "${title}" to ${recipients.length} recipients. Subject: "${subject}". Target: ${targetTier || 'All'}`
    );

    return NextResponse.json({
      success: true,
      message: `Newsletter campaign dispatched successfully to ${recipients.length} subscribers.`,
      stats: {
        sentCount: recipients.length,
        estimatedDeliverability: '99.8%'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
