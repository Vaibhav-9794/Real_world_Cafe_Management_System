import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/db';
import { logAuditEvent } from '../../../../lib/audit';
import { sendCustomerOtpEmail } from '@/lib/email/emailTemplates';
import bcrypt from 'bcryptjs';

// GET: Check active customer session
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('customer-auth-session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    const sessionData = JSON.parse(sessionCookie.value);
    
    // Fetch fresh database record to ensure up-to-date points/tier
    const customer = await prisma.customer.findUnique({
      where: { id: sessionData.id }
    });

    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer record no longer exists.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        points: customer.points,
        membershipTier: customer.membershipTier,
        vipStatus: customer.vipStatus,
        totalSpent: customer.totalSpent,
        visitCount: customer.visitCount,
        birthday: customer.birthday,
        notes: customer.notes
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Request Login OTP OR Login with Password
export async function POST(request: Request) {
  try {
    const { contact, password } = await request.json(); // contact can be email or phone number

    if (!contact) {
      return NextResponse.json({ success: false, message: 'Email or phone number is required.' }, { status: 400 });
    }

    const cleanContact = contact.trim().toLowerCase();

    // ==========================================
    // 1. Password Authentication Path
    // ==========================================
    if (password) {
      const customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { email: cleanContact },
            { phone: cleanContact }
          ]
        }
      });

      if (!customer) {
        return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
      }

      if (!customer.password) {
        return NextResponse.json({ 
          success: false, 
          message: 'No password configured for this account. Please verify your email first and request a reset, or login via OTP.' 
        }, { status: 400 });
      }

      const isPasswordValid = bcrypt.compareSync(password, customer.password);
      if (!isPasswordValid) {
        return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
      }

      // Set cookie session for customer
      const cookieStore = await cookies();
      cookieStore.set('customer-auth-session', JSON.stringify({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        membershipTier: customer.membershipTier
      }), {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days session
      });

      await logAuditEvent(
        customer.email,
        'CUSTOMER',
        'LOGIN_SUCCESS',
        `Logged in successfully using password.`
      );

      return NextResponse.json({
        success: true,
        message: 'Logged in successfully.',
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          points: customer.points,
          membershipTier: customer.membershipTier,
          vipStatus: customer.vipStatus
        }
      });
    }
    
    // ==========================================
    // 2. OTP Authentication Path (Generate & Send)
    // ==========================================
    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: cleanContact },
          { phone: cleanContact }
        ]
      }
    });

    // If customer not found, look up reservation records to migrate guest profile
    if (!customer) {
      const reservation = await prisma.reservation.findFirst({
        where: {
          OR: [
            { email: cleanContact },
            { phone: cleanContact }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      if (reservation) {
        const resEmail = reservation.email.toLowerCase();
        const resPhone = reservation.phone;

        // Double check if customer already exists with reservation email or phone
        const existingCustomer = await prisma.customer.findFirst({
          where: {
            OR: [
              { email: resEmail },
              { phone: resPhone }
            ]
          }
        });

        if (existingCustomer) {
          customer = existingCustomer;
        } else {
          // Automatically create loyalty customer from reservation details
          customer = await prisma.customer.create({
            data: {
              name: reservation.name,
              email: resEmail,
              phone: resPhone,
              points: Math.floor(reservation.paymentAmount || 0),
              totalSpent: reservation.paymentAmount || 0,
              visitCount: 1
            }
          });
        }
      } else {
        // Create new walk-in sign up
        const isEmail = cleanContact.includes('@');
        const candidateEmail = isEmail ? cleanContact : `${cleanContact}@bohocafe.com`;
        const candidatePhone = isEmail ? `email-${cleanContact}` : cleanContact;

        // Double check if customer already exists with candidate email or phone
        const existingCustomer = await prisma.customer.findFirst({
          where: {
            OR: [
              { email: candidateEmail },
              { phone: candidatePhone }
            ]
          }
        });

        if (existingCustomer) {
          customer = existingCustomer;
        } else {
          customer = await prisma.customer.create({
            data: {
              name: isEmail ? cleanContact.split('@')[0] : 'New Guest',
              email: candidateEmail,
              phone: candidatePhone,
              points: 0,
              totalSpent: 0,
              visitCount: 0
            }
          });
        }
      }
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save to customer record
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        otpCode: otp,
        otpExpires: expires
      }
    });

    // Audit log
    await logAuditEvent(
      customer.email,
      'CUSTOMER',
      'OTP_REQUESTED',
      `Requested login verification OTP.`
    );

    // Send OTP email via Resend
    try {
      await sendCustomerOtpEmail(customer.email, otp);
      console.log(`[BOHO SECURE LOGIN] Sent OTP to customer email ${customer.email}: ${otp}`);
    } catch (mailErr) {
      console.error('Failed to send Customer OTP email:', mailErr);
    }

    // Return success. Hide sandboxOtp for security hardening.
    return NextResponse.json({
      success: true,
      message: 'Verification OTP sent to your registered email address.'
    });
  } catch (error: any) {
    console.error('OTP request error (contained):', error);
    return NextResponse.json({
      success: false,
      message: 'Unable to process verification request. Please try again.'
    }, { status: 500 });
  }
}

// PUT: Verify OTP code and create session
export async function PUT(request: Request) {
  try {
    const { contact, code } = await request.json();

    if (!contact || !code) {
      return NextResponse.json({ success: false, message: 'Contact and verification code are required.' }, { status: 400 });
    }

    const cleanContact = contact.trim().toLowerCase();
    const cleanCode = code.trim();

    // Find customer
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: cleanContact },
          { phone: cleanContact }
        ]
      }
    });

    if (!customer) {
      return NextResponse.json({ success: false, message: 'Invalid verification credentials.' }, { status: 401 });
    }

    // Check OTP validity
    const now = new Date();
    if (!customer.otpCode || customer.otpCode !== cleanCode || !customer.otpExpires || customer.otpExpires < now) {
      return NextResponse.json({ success: false, message: 'Invalid or expired verification code.' }, { status: 401 });
    }

    // Clear OTP code
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        otpCode: null,
        otpExpires: null
      }
    });

    // Set cookie session for customer
    const cookieStore = await cookies();
    cookieStore.set('customer-auth-session', JSON.stringify({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      membershipTier: customer.membershipTier
    }), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days session
    });

    // Audit log
    await logAuditEvent(
      customer.email,
      'CUSTOMER',
      'LOGIN_SUCCESS',
      `Logged in successfully to Account Portal.`
    );

    return NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        points: customer.points,
        membershipTier: customer.membershipTier
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE: Sign out and clear session cookie
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('customer-auth-session');
    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
