import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing database...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.rewardRedemption.deleteMany({});
  await prisma.qRScanLog.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.table.deleteMany({});
  await prisma.waitlist.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.cMSConfig.deleteMany({});
  await prisma.branch.deleteMany({});

  console.log('Seeding branches...');
  const downtown = await prisma.branch.create({
    data: {
      id: 'downtown',
      name: 'Boho Cafe & Dining - Kanpur Centre',
      city: 'Kanpur',
      address: 'Boho Cafe & Dining, Kanpur, Uttar Pradesh, India',
      phone: '+91 8400678200',
      whatsapp: '+918400678200',
      email: 'hs142636@gmail.com',
      openingHours: JSON.stringify([
        { days: 'Mon - Thu', hours: '11:00 AM - 10:00 PM' },
        { days: 'Fri - Sat', hours: '11:00 AM - 11:00 PM' },
        { days: 'Sunday', hours: '10:00 AM - 9:00 PM' },
      ]),
    },
  });

  const uptown = await prisma.branch.create({
    data: {
      id: 'uptown',
      name: 'Boho Lounge - Kanpur East',
      city: 'Kanpur',
      address: 'Boho Cafe & Dining, Kanpur, Uttar Pradesh, India',
      phone: '+91 8400678200',
      whatsapp: '+918400678200',
      email: 'hs142636@gmail.com',
      openingHours: JSON.stringify([
        { days: 'Mon - Fri', hours: '12:00 PM - 11:00 PM' },
        { days: 'Sat - Sun', hours: '10:00 AM - 11:00 PM' },
      ]),
    },
  });

  console.log('Seeding tables for Downtown & Uptown...');
  const tableData = [
    { number: '1', capacity: 2, x: 15.0, y: 20.0 },
    { number: '2', capacity: 2, x: 15.0, y: 45.0 },
    { number: '3', capacity: 4, x: 40.0, y: 20.0 },
    { number: '4', capacity: 4, x: 40.0, y: 45.0 },
    { number: '5', capacity: 6, x: 65.0, y: 20.0 },
    { number: '6', capacity: 6, x: 65.0, y: 45.0 },
    { number: '7', capacity: 8, x: 90.0, y: 20.0 },
    { number: '8', capacity: 8, x: 90.0, y: 45.0 },
    { number: '9', capacity: 10, x: 30.0, y: 75.0 },
    { number: '10', capacity: 12, x: 70.0, y: 75.0 },
  ];

  for (const t of tableData) {
    // Downtown tables
    await prisma.table.create({
      data: {
        number: t.number,
        capacity: t.capacity,
        status: 'AVAILABLE',
        x: t.x,
        y: t.y,
        branchId: downtown.id,
      },
    });

    // Uptown tables
    await prisma.table.create({
      data: {
        number: t.number,
        capacity: t.capacity,
        status: 'AVAILABLE',
        x: t.x,
        y: t.y,
        branchId: uptown.id,
      },
    });
  }

  // Retrieve tables for assigning to reservations
  const downtownTables = await prisma.table.findMany({ where: { branchId: downtown.id } });
  const uptownTables = await prisma.table.findMany({ where: { branchId: uptown.id } });

  console.log('Seeding staff profiles...');
  await prisma.staff.create({
    data: {
      name: 'Aria Vance',
      email: 'hs142636@gmail.com',
      role: 'OWNER',
      pin: bcrypt.hashSync('8888', 10), // Owner master pin
      status: 'ACTIVE',
    },
  });

  await prisma.staff.create({
    data: {
      name: 'Julian Sterling',
      email: 'manager@bohocafe.com',
      role: 'MANAGER',
      pin: bcrypt.hashSync('7777', 10), // Downtown Manager pin
      status: 'ACTIVE',
      branchId: downtown.id,
    },
  });

  await prisma.staff.create({
    data: {
      name: 'Chloe Bennet',
      email: 'staff@bohocafe.com',
      role: 'STAFF',
      pin: bcrypt.hashSync('1111', 10), // Downtown Staff pin
      status: 'ACTIVE',
      branchId: downtown.id,
    },
  });

  await prisma.staff.create({
    data: {
      name: 'Suspended Manager',
      email: 'suspended@bohocafe.com',
      role: 'MANAGER',
      pin: bcrypt.hashSync('9999', 10),
      status: 'SUSPENDED',
      branchId: downtown.id,
    },
  });

  await prisma.staff.create({
    data: {
      name: 'Inactive Manager',
      email: 'inactive@bohocafe.com',
      role: 'MANAGER',
      pin: bcrypt.hashSync('5555', 10),
      status: 'INACTIVE',
      branchId: downtown.id,
    },
  });

  console.log('Seeding customer CRM database...');
  await prisma.customer.create({
    data: {
      name: 'William Harrison',
      email: 'william@harrison.com',
      phone: '+91 94150 21928',
      visitCount: 19,
      totalSpent: 1240.50,
      points: 1240,
      vipStatus: true,
      membershipTier: 'VIP Elite',
      birthday: '08-15',
      notes: 'Prefers quiet corner tables. Loves white truffle chanterelle pizza.',
    },
  });

  await prisma.customer.create({
    data: {
      name: 'Sophia Loren',
      email: 'sophia@loren.com',
      phone: '+91 94150 29382',
      visitCount: 6,
      totalSpent: 420.00,
      points: 420,
      vipStatus: false,
      membershipTier: 'Gold',
      birthday: '12-04',
      notes: 'Allergic to shell fish. Prefers mocktails.',
    },
  });

  await prisma.customer.create({
    data: {
      name: 'Liam Neeson',
      email: 'liam@neeson.com',
      phone: '+91 94150 28493',
      visitCount: 1,
      totalSpent: 65.00,
      points: 65,
      vipStatus: false,
      membershipTier: 'Silver',
      birthday: '05-18',
    },
  });

  console.log('Seeding discount coupons...');
  await prisma.coupon.create({
    data: {
      code: 'BOHOGOLD',
      type: 'PERCENTAGE',
      value: 15.0,
      minSpend: 50.0,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      usageLimit: 500,
      usageCount: 28,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'WELCOME50',
      type: 'FIXED',
      value: 50.0,
      minSpend: 200.0,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      usageLimit: 100,
      usageCount: 12,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'SUNDAYFEAST',
      type: 'PERCENTAGE',
      value: 10.0,
      minSpend: 0.0,
      startDate: '2026-05-01',
      endDate: '2026-09-30',
      usageLimit: 1000,
      usageCount: 45,
    },
  });

  console.log('Seeding sales leads and event pipeline...');
  await prisma.lead.create({
    data: {
      name: 'Google LLC (Sarah Jenkins)',
      email: 'jenkins@google.com',
      phone: '+91 94150 29281',
      type: 'CORPORATE',
      source: 'Website',
      notes: 'Interested in hosting a corporate mixer for 45 people at Downtown branch.',
      status: 'CONTACTED',
    },
  });

  await prisma.lead.create({
    data: {
      name: 'Rebecca Miller',
      email: 'rebecca@miller.com',
      phone: '+91 94150 21192',
      type: 'BIRTHDAY',
      source: 'WhatsApp',
      notes: 'Requesting details on birthday inclusions and custom cake for 15 guests.',
      status: 'NEW',
    },
  });

  await prisma.lead.create({
    data: {
      name: 'Johnathan Crane',
      email: 'johnathan@crane.com',
      phone: '+91 94150 21293',
      type: 'CONTACT',
      source: 'Website',
      notes: 'General inquiry regarding catering availability for outdoor wedding dinner.',
      status: 'RESERVED',
    },
  });

  console.log('Seeding past, current & future reservations...');
  // Helper to format date strings relative to today
  const getRelativeDate = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  // We assign tables to reservations
  // Reservation 1: Today, Lunch
  // We assign tables to reservations
  // Reservation 1: Today, Lunch
  const r1 = await prisma.reservation.create({
    data: {
      name: 'Sophia Loren',
      email: 'sophia@loren.com',
      phone: '+91 94150 29382',
      type: 'TABLE',
      booking_type: 'TABLE',
      table_number: 3,
      table_capacity: 4,
      guest_count: 4,
      reservation_date: getRelativeDate(0),
      start_time: '13:00',
      end_time: '15:00',
      booking_status: 'CONFIRMED',
      special_requests: 'Window seat if possible, thank you.',
      approval_status: 'APPROVED',
      approved_by: 'Aria Vance',
      approved_at: new Date(),
      is_full_cafe_booking: false,
      date: getRelativeDate(0),
      time: '13:00',
      guests: 4,
      notes: 'Window seat if possible, thank you.',
      status: 'APPROVED',
      paymentStatus: 'PAID',
      paymentAmount: 25.0,
      paymentGateway: 'STRIPE',
      paymentId: 'ch_stripe_mock_1122',
      branchId: downtown.id,
      pointsAwarded: 25,
    },
  });
  // Assign Table 3 (capacity 4) to Reservation 1
  await prisma.reservation.update({
    where: { id: r1.id },
    data: { tables: { connect: { id: downtownTables.find(t => t.number === '3')?.id } } },
  });

  // Reservation 2: Today, Dinner
  const r2 = await prisma.reservation.create({
    data: {
      name: 'Alexander Hamilton',
      email: 'alex@hamilton.com',
      phone: '+91 94150 26189',
      type: 'ANNIVERSARY',
      booking_type: 'EVENT',
      table_number: 1,
      table_capacity: 2,
      guest_count: 2,
      reservation_date: getRelativeDate(0),
      start_time: '19:30',
      end_time: '21:30',
      booking_status: 'ARRIVED',
      special_requests: 'A quiet and romantic table, celebrating 10th anniversary.',
      approval_status: 'APPROVED',
      approved_by: 'Aria Vance',
      approved_at: new Date(),
      is_full_cafe_booking: false,
      date: getRelativeDate(0),
      time: '19:30',
      guests: 2,
      notes: 'A quiet and romantic table, celebrating 10th anniversary.',
      status: 'ARRIVED',
      paymentStatus: 'PAID',
      paymentAmount: 25.0,
      paymentGateway: 'RAZORPAY',
      paymentId: 'pay_razor_mock_9938',
      branchId: downtown.id,
      pointsAwarded: 25,
    },
  });
  // Assign Table 1 (capacity 2) to Reservation 2
  await prisma.reservation.update({
    where: { id: r2.id },
    data: { tables: { connect: { id: downtownTables.find(t => t.number === '1')?.id } } },
  });

  // Reservation 3: Tomorrow, Dinner (Requires table combination)
  const r3 = await prisma.reservation.create({
    data: {
      name: 'William Harrison',
      email: 'william@harrison.com',
      phone: '+91 94150 21928',
      type: 'CORPORATE',
      booking_type: 'EVENT',
      table_number: 7, // Principal table
      table_capacity: 18,
      guest_count: 18,
      reservation_date: getRelativeDate(1),
      start_time: '20:00',
      end_time: '22:00',
      booking_status: 'CONFIRMED',
      special_requests: 'Corporate executive dinner.',
      approval_status: 'APPROVED',
      approved_by: 'Aria Vance',
      approved_at: new Date(),
      is_full_cafe_booking: false,
      date: getRelativeDate(1),
      time: '20:00',
      guests: 18,
      notes: 'Corporate executive dinner.',
      status: 'APPROVED',
      paymentStatus: 'PAID',
      paymentAmount: 110.0,
      paymentGateway: 'UPI',
      paymentId: 'upi_mock_7739',
      branchId: downtown.id,
      pointsAwarded: 110,
    },
  });
  // Assign Table 7 (8), Table 8 (8) and Table 1 (2) to Reservation 3 -> Combined capacity 18
  await prisma.reservation.update({
    where: { id: r3.id },
    data: {
      tables: {
        connect: [
          { id: downtownTables.find(t => t.number === '7')?.id },
          { id: downtownTables.find(t => t.number === '8')?.id },
          { id: downtownTables.find(t => t.number === '1')?.id },
        ],
      },
    },
  });

  // Reservation 4: Yesterday, Completed
  const r4 = await prisma.reservation.create({
    data: {
      name: 'David Beckham',
      email: 'david@beckham.com',
      phone: '+91 94150 21234',
      type: 'TABLE',
      booking_type: 'TABLE',
      table_number: 5,
      table_capacity: 6,
      guest_count: 6,
      reservation_date: getRelativeDate(-1),
      start_time: '19:00',
      end_time: '21:00',
      booking_status: 'COMPLETED',
      special_requests: 'No spices please.',
      approval_status: 'APPROVED',
      approved_by: 'Julian Sterling',
      approved_at: new Date(),
      is_full_cafe_booking: false,
      date: getRelativeDate(-1),
      time: '19:00',
      guests: 6,
      notes: 'No spices please.',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentAmount: 25.0,
      paymentGateway: 'PAYTM',
      paymentId: 'paytm_mock_8849',
      branchId: downtown.id,
      pointsAwarded: 25,
    },
  });
  await prisma.reservation.update({
    where: { id: r4.id },
    data: { tables: { connect: { id: downtownTables.find(t => t.number === '5')?.id } } },
  });

  // Reservation 5: Tomorrow, Pending
  const r5 = await prisma.reservation.create({
    data: {
      name: 'Gwyneth Paltrow',
      email: 'gwyneth@goop.com',
      phone: '+91 94150 21920',
      type: 'TABLE',
      booking_type: 'TABLE',
      table_number: 2,
      table_capacity: 2,
      guest_count: 2,
      reservation_date: getRelativeDate(1),
      start_time: '18:00',
      end_time: '20:00',
      booking_status: 'PENDING',
      special_requests: 'Organic/Vegan recommendations.',
      approval_status: 'PENDING',
      is_full_cafe_booking: false,
      date: getRelativeDate(1),
      time: '18:00',
      guests: 2,
      notes: 'Organic/Vegan recommendations.',
      status: 'PENDING_APPROVAL',
      paymentStatus: 'PAID',
      paymentAmount: 25.0,
      paymentGateway: 'STRIPE',
      paymentId: 'ch_stripe_mock_3948',
      branchId: uptown.id,
    },
  });
  await prisma.reservation.update({
    where: { id: r5.id },
    data: { tables: { connect: { id: uptownTables.find(t => t.number === '2')?.id } } },
  });

  console.log('Seeding CMS contents...');
  const defaultCMS = {
    hero: {
      title: '✦ BOHO ✦',
      subtitle: 'Where Culinary Art Meets Bohemian Luxury',
      videoUrl: '/videos/hero-video.mp4',
      primaryCta: 'Reserve Table',
      secondaryCta: 'Explore Menu',
    },
    about: {
      title: 'Our Story',
      heading: 'A Gastronomic Sanctuary For The Discerning Soul',
      text1: 'Founded on the philosophy of bohemian luxury and culinary craftsmanship, Boho offers a sensory journey unlike any other. We source organic, local ingredients to craft global fusion plates that elevate simple dining into a profound experience.',
      text2: 'From our candlelit vaults to our meticulously balanced flavors, every detail is engineered to wow you. Step in, unwind, and let us feed your spirit.',
      image1: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600',
      image2: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=600',
    },
    gallery: [
      { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600', caption: 'Warm Velvet Lounges' },
      { url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=600', caption: 'Chef Plated Masterpieces' },
      { url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=600', caption: 'Artisanal Brew Station' },
      { url: 'https://images.unsplash.com/photo-1508766917616-d22f3f1eea14?q=80&w=600', caption: 'Candlelit Tables' },
      { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600', caption: 'Woodfired Pizza Oven' },
      { url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=600', caption: 'Premium Cocktails' },
    ],
  };

  await prisma.cMSConfig.create({
    data: {
      key: 'homepage',
      value: JSON.stringify(defaultCMS),
    },
  });

  console.log('Seeding inventory items...');
  await prisma.inventoryItem.createMany({
    data: [
      { name: 'Espresso Beans Blend', category: 'BEVERAGE', quantity: 15.0, unit: 'KG', minThreshold: 5.0 },
      { name: 'Wagyu Ribeye Steak', category: 'INGREDIENT', quantity: 3.5, unit: 'KG', minThreshold: 10.0 }, // LOW STOCK
      { name: 'White Truffle Oil', category: 'INGREDIENT', quantity: 2.0, unit: 'LITER', minThreshold: 1.0 },
      { name: 'Organic Almond Milk', category: 'BEVERAGE', quantity: 25.0, unit: 'LITER', minThreshold: 8.0 },
      { name: 'Boho Signature Coffee Beans', category: 'BEVERAGE', quantity: 4.0, unit: 'KG', minThreshold: 5.0 }, // LOW STOCK
      { name: 'Premium Champagne Flutes', category: 'DRY_GOODS', quantity: 120.0, unit: 'PCS', minThreshold: 20.0 }
    ]
  });

  console.log('Seeding QR menu scan logs...');
  await prisma.qRScanLog.createMany({
    data: [
      { branchId: 'downtown', tableNumber: '3', scannedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { branchId: 'downtown', tableNumber: '5', scannedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000) },
      { branchId: 'downtown', tableNumber: '3', scannedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
      { branchId: 'uptown', tableNumber: '2', scannedAt: new Date(Date.now() - 30 * 60 * 1000) },
      { branchId: 'downtown', tableNumber: '7', scannedAt: new Date(Date.now() - 10 * 60 * 1000) }
    ]
  });

  console.log('Seeding notifications...');
  await prisma.notification.createMany({
    data: [
      { userId: 'owner@bohocafe.com', title: 'Inventory Warning', message: 'Wagyu Ribeye Steak is below the minimum threshold (3.5 KG remaining). Please reorder soon.', type: 'WARNING' },
      { userId: 'manager@bohocafe.com', title: 'New VIP Reservation', message: 'Sophia Loren (VIP Elite) has placed a reservation for today at 13:00.', type: 'SUCCESS' },
      { userId: 'ALL', title: 'System Upgrade Successful', message: 'The platform has been migrated to Supabase PG and extended operations modules are active.', type: 'INFO' }
    ]
  });

  console.log('Seeding audit logs...');
  await prisma.auditLog.createMany({
    data: [
      { actorEmail: 'owner@bohocafe.com', actorRole: 'OWNER', action: 'STAFF_CREATE', details: 'Created staff profile for Julian Sterling (manager@bohocafe.com)', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { actorEmail: 'owner@bohocafe.com', actorRole: 'OWNER', action: 'PROMOTION_CREATE', details: 'Created promotion code BOHOGOLD (PERCENTAGE: 15%)', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { actorEmail: 'manager@bohocafe.com', actorRole: 'MANAGER', action: 'RESERVATION_APPROVE', details: 'Approved table reservation for Sophia Loren', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
    ]
  });

  console.log('Seeding orders and payments...');
  // Create orders linked to reservation or walk-in
  const order1 = await prisma.order.create({
    data: {
      tableNumber: 5,
      status: 'COMPLETED',
      totalAmount: 185.0,
      reservationId: r4.id, // Linked to yesterday completed reservation
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      items: {
        create: [
          { itemId: 'menu-wagyu', itemName: 'Wagyu Ribeye Steak', quantity: 2, price: 75.0 },
          { itemId: 'menu-redwine', itemName: 'Red Wine Glass', quantity: 2, price: 17.5 }
        ]
      },
      payments: {
        create: {
          amount: 185.0,
          status: 'SUCCESS',
          gateway: 'RAZORPAY',
          transactionId: 'tx_mock_112233',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    }
  });

  const order2 = await prisma.order.create({
    data: {
      tableNumber: 1,
      status: 'SERVED',
      totalAmount: 65.0,
      reservationId: r2.id, // Linked to today arrived reservation
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      items: {
        create: [
          { itemId: 'menu-pizza', itemName: 'Chanterelle Pizza', quantity: 1, price: 35.0 },
          { itemId: 'menu-martini', itemName: 'Boho Espresso Martini', quantity: 2, price: 15.0 }
        ]
      },
      payments: {
        create: {
          amount: 65.0,
          status: 'SUCCESS',
          gateway: 'UPI',
          transactionId: 'tx_mock_445566',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        }
      }
    }
  });

  // Also create a standalone Payment for the reservation deposit itself
  await prisma.payment.create({
    data: {
      reservationId: r1.id,
      amount: 25.0,
      status: 'SUCCESS',
      gateway: 'STRIPE',
      transactionId: 'ch_stripe_mock_1122',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
    }
  });

  console.log('Seeding loyalty redemptions...');
  const customerSophia = await prisma.customer.findFirst({ where: { email: 'sophia@loren.com' } });
  if (customerSophia) {
    await prisma.rewardRedemption.create({
      data: {
        customerId: customerSophia.id,
        rewardName: 'Free Espresso Drink',
        pointsBurned: 100,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      }
    });
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
