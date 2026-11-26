import type { Booking, Company, Notification, SuperAdminSummaryStats, WeeklyActivity } from './super-admin-state.service';

/* Placeholder data used before/without a backend response (initial state and offline fallback). */

export const INITIAL_SUMMARY_STATS: SuperAdminSummaryStats = {
    totalIncome: 34250000,
    totalBookings: 8246,
    totalTrips: 318,
    totalCompanies: 27
  };

export const INITIAL_WEEKLY_ACTIVITY: WeeklyActivity[] = [
    { day: 'الأحد', value: 45 },
    { day: 'الاثنين', value: 55 },
    { day: 'الثلاثاء', value: 65 },
    { day: 'الأربعاء', value: 70 },
    { day: 'الخميس', value: 75 },
    { day: 'الجمعة', value: 80 },
    { day: 'السبت', value: 95 }
  ];

export const INITIAL_COMPANIES: Company[] = [
    {
      id: '1',
      name: 'شركة الشريف للنقل',
      email: 'hasan.abrash32@gmail.com',
      phone: '+90654656556155',
      address: 'حلب اعزاز الكراج الرئيسي',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 150,
      totalBookings: 1200,
      documents: [
        { id: '1', name: 'سجل الشركة', fileName: 'السجل التجاري.pdf', uploadDate: '15-01-2023', status: 'completed' },
        { id: '2', name: 'رخصة التشغيل', fileName: 'رخصة_التشغيل.pdf', uploadDate: '15-01-2023', status: 'completed' },
        { id: '3', name: 'شهادة التسجيل', fileName: 'شهادة_التسجيل.pdf', uploadDate: '15-01-2023', status: 'completed' }
      ]
    },
    {
      id: '2',
      name: 'شركة البدران',
      email: 'albadran@transport.com',
      phone: '+963123456789',
      address: 'دمشق، شارع الجلاء',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 200,
      totalBookings: 1800,
      documents: []
    },
    {
      id: '3',
      name: 'شركة الزاجل',
      email: 'alzajel@transport.com',
      phone: '+963987654321',
      address: 'حلب، شارع الجامعة',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 180,
      totalBookings: 1500,
      documents: []
    },
    {
      id: '4',
      name: 'شركة الزاجل',
      email: 'alzajel2@transport.com',
      phone: '+963555444333',
      address: 'إدلب، وسط المدينة',
      status: 'blocked',
      registrationDate: '01-01-2024',
      totalTrips: 50,
      totalBookings: 400,
      documents: []
    },
    {
      id: '5',
      name: 'شركة الزاجل',
      email: 'alzajel3@transport.com',
      phone: '+963111222333',
      address: 'حمص، شارع الدبلان',
      status: 'recently_submitted',
      registrationDate: '01-01-2024',
      totalTrips: 0,
      totalBookings: 0,
      documents: []
    },
    {
      id: '6',
      name: 'شركة الزاجل',
      email: 'alzajel4@transport.com',
      phone: '+963444555666',
      address: 'اللاذقية، الكورنيش',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 120,
      totalBookings: 950,
      documents: []
    },
    {
      id: '7',
      name: 'شركة الزاجل',
      email: 'alzajel5@transport.com',
      phone: '+963777888999',
      address: 'طرطوس، الكورنيش',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 100,
      totalBookings: 800,
      documents: []
    },
    {
      id: '8',
      name: 'شركة الزاجل',
      email: 'alzajel6@transport.com',
      phone: '+963222333444',
      address: 'حماه، شارع الرئيسي',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 90,
      totalBookings: 700,
      documents: []
    },
    {
      id: '9',
      name: 'شركة الزاجل',
      email: 'alzajel7@transport.com',
      phone: '+963333444555',
      address: 'دير الزور، شارع الثورة',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 80,
      totalBookings: 600,
      documents: []
    },
    {
      id: '10',
      name: 'شركة الزاجل',
      email: 'alzajel8@transport.com',
      phone: '+963444555666',
      address: 'السويداء، شارع الرئيسي',
      status: 'recently_submitted',
      registrationDate: '01-01-2024',
      totalTrips: 0,
      totalBookings: 0,
      documents: []
    },
    {
      id: '11',
      name: 'شركة الزاجل',
      email: 'alzajel9@transport.com',
      phone: '+963555666777',
      address: 'القنيطرة، شارع الرئيسي',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 70,
      totalBookings: 500,
      documents: []
    },
    {
      id: '12',
      name: 'شركة الزاجل',
      email: 'alzajel10@transport.com',
      phone: '+963666777888',
      address: 'درعا، شارع الرئيسي',
      status: 'active',
      registrationDate: '01-01-2024',
      totalTrips: 60,
      totalBookings: 450,
      documents: []
    }
  ];

export const INITIAL_BOOKINGS: Booking[] = [
    {
      id: '1',
      bookingNumber: '123123123123',
      bookingDate: '15-07-2025',
      status: 'confirmed',
      paymentMethod: 'شام كاش',
      passenger: { name: 'حسن الابرش', phone: '+963465465454', email: 'hasan.abrash32@gmail.com' },
      trip: { plan: 'إدلب - دمشق', busNumber: 'B12', tripDate: '26-07-2025', tripTime: '8:00 صباحا', companyId: '1', companyName: 'شركة النقل السريع' },
      seat: { number: 15, type: 'normal' },
      totalAmount: 150000
    },
    {
      id: '2',
      bookingNumber: '123123123124',
      bookingDate: '15-07-2025',
      status: 'canceled',
      paymentMethod: 'شام كاش',
      passenger: { name: 'حسن الابرش', phone: '+963465465454', email: 'hasan.abrash32@gmail.com' },
      trip: { plan: 'إدلب - دمشق', busNumber: 'B12', tripDate: '26-07-2025', tripTime: '8:00 صباحا', companyId: '1', companyName: 'شركة النقل السريع' },
      seat: { number: 12, type: 'normal' },
      totalAmount: 150000
    },
    {
      id: '3',
      bookingNumber: '123123123125',
      bookingDate: '15-07-2025',
      status: 'pending',
      paymentMethod: 'فاتورة',
      passenger: { name: 'حسن الابرش', phone: '+963465465454', email: 'hasan.abrash32@gmail.com' },
      trip: { plan: 'إدلب - دمشق', busNumber: 'B12', tripDate: '26-07-2025', tripTime: '8:00 صباحا', companyId: '2', companyName: 'شركة الرحلات الذهبية' },
      seat: { number: 12, type: 'normal' },
      totalAmount: 150000
    },
    {
      id: '4',
      bookingNumber: '123123123126',
      bookingDate: '15-07-2025',
      status: 'confirmed',
      paymentMethod: 'شام كاش',
      passenger: { name: 'حسن الابرش', phone: '+963465465454', email: 'hasan.abrash32@gmail.com' },
      trip: { plan: 'إدلب - دمشق', busNumber: 'B12', tripDate: '26-07-2025', tripTime: '8:00 صباحا', companyId: '1', companyName: 'شركة النقل السريع' },
      seat: { number: 12, type: 'normal' },
      totalAmount: 150000
    },
    {
      id: '5',
      bookingNumber: '123123123127',
      bookingDate: '15-07-2025',
      status: 'confirmed',
      paymentMethod: 'ام تي ان كاش',
      passenger: { name: 'أحمد حسن', phone: '+963123456789', email: 'ahmed.hassan@gmail.com' },
      trip: { plan: 'حلب - دمشق', busNumber: 'B15', tripDate: '27-07-2025', tripTime: '9:00 صباحا', companyId: '2', companyName: 'شركة الرحلات الذهبية' },
      seat: { number: 8, type: 'vip' },
      totalAmount: 200000
    }
  ];

export const INITIAL_NOTIFICATIONS: Notification[] = [
    {
      id: '1',
      passengerName: 'حسن الابرش',
      passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan',
      route: 'إدلب - دمشق',
      date: '15-07-2025',
      type: 'booking'
    },
    {
      id: '2',
      passengerName: 'حسن الابرش',
      passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan2',
      route: 'إدلب - دمشق',
      date: '15-07-2025',
      type: 'booking'
    },
    {
      id: '3',
      passengerName: 'حسن الابرش',
      passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan3',
      route: 'إدلب - دمشق',
      date: '15-07-2025',
      type: 'booking'
    },
    {
      id: '4',
      passengerName: 'حسن الابرش',
      passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan4',
      route: 'إدلب - دمشق',
      date: '15-07-2025',
      type: 'booking'
    }
  ];

export const MOCK_SUMMARY_STATS: SuperAdminSummaryStats = {
      totalIncome: 34250000,
      totalBookings: 8246,
      totalTrips: 318,
      totalCompanies: 27
    };

export const MOCK_WEEKLY_ACTIVITY: WeeklyActivity[] = [
      { day: 'الأحد', value: 118 },
      { day: 'الاثنين', value: 142 },
      { day: 'الثلاثاء', value: 96 },
      { day: 'الأربعاء', value: 173 },
      { day: 'الخميس', value: 205 },
      { day: 'الجمعة', value: 187 },
      { day: 'السبت', value: 154 }
    ];

export const MOCK_BOOKINGS: Booking[] = [
      {
        id: 'mock-1',
        bookingNumber: 'SP-2026-1048',
        bookingDate: '26-07-2026',
        status: 'confirmed',
        paymentMethod: 'شام كاش',
        passenger: { name: 'حسن الأبرش', phone: '+963944112233', email: 'hassan@example.com' },
        trip: { plan: 'حلب - دمشق', busNumber: 'ALE-214', tripDate: '27-07-2026', tripTime: '08:30 صباحا', companyId: '1', companyName: 'شركة الشام للنقل' },
        seat: { number: 14, type: 'vip' },
        totalAmount: 185000
      },
      {
        id: 'mock-2',
        bookingNumber: 'SP-2026-1047',
        bookingDate: '26-07-2026',
        status: 'pending',
        paymentMethod: 'فاتورة',
        passenger: { name: 'مها خليل', phone: '+963955667788', email: 'maha@example.com' },
        trip: { plan: 'دمشق - اللاذقية', busNumber: 'DAM-087', tripDate: '28-07-2026', tripTime: '11:00 صباحا', companyId: '2', companyName: 'شركة الساحل السريع' },
        seat: { number: 7, type: 'normal' },
        totalAmount: 160000
      },
      {
        id: 'mock-3',
        bookingNumber: 'SP-2026-1046',
        bookingDate: '25-07-2026',
        status: 'confirmed',
        paymentMethod: 'سيرياتيل كاش',
        passenger: { name: 'عمر الحسن', phone: '+963933445566', email: 'omar@example.com' },
        trip: { plan: 'إدلب - حلب', busNumber: 'IDL-332', tripDate: '26-07-2026', tripTime: '06:45 مساء', companyId: '3', companyName: 'شركة الشمال' },
        seat: { number: 21, type: 'business' },
        totalAmount: 125000
      },
      {
        id: 'mock-4',
        bookingNumber: 'SP-2026-1045',
        bookingDate: '25-07-2026',
        status: 'canceled',
        paymentMethod: 'ام تي ان كاش',
        passenger: { name: 'نور اليوسف', phone: '+963988776655', email: 'nour@example.com' },
        trip: { plan: 'حمص - طرطوس', busNumber: 'HMS-119', tripDate: '27-07-2026', tripTime: '03:15 مساء', companyId: '4', companyName: 'شركة البدران' },
        seat: { number: 4, type: 'normal' },
        totalAmount: 95000
      },
      {
        id: 'mock-5',
        bookingNumber: 'SP-2026-1044',
        bookingDate: '24-07-2026',
        status: 'confirmed',
        paymentMethod: 'فاتورة',
        passenger: { name: 'ليلى مراد', phone: '+963922334455', email: 'layla@example.com' },
        trip: { plan: 'دمشق - درعا', busNumber: 'DRA-506', tripDate: '26-07-2026', tripTime: '01:00 مساء', companyId: '5', companyName: 'شركة الجنوب' },
        seat: { number: 18, type: 'normal' },
        totalAmount: 80000
      },
      {
        id: 'mock-6',
        bookingNumber: 'SP-2026-1043',
        bookingDate: '24-07-2026',
        status: 'confirmed',
        paymentMethod: 'شام كاش',
        passenger: { name: 'سارة ديب', phone: '+963911223344', email: 'sara@example.com' },
        trip: { plan: 'اللاذقية - حلب', busNumber: 'LAT-441', tripDate: '29-07-2026', tripTime: '09:30 مساء', companyId: '2', companyName: 'شركة الساحل السريع' },
        seat: { number: 2, type: 'vip' },
        totalAmount: 210000
      }
    ];

export const MOCK_NOTIFICATIONS: Notification[] = [
      {
        id: 'mock-notification-1',
        passengerName: 'حسن الأبرش',
        passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan',
        route: 'حجز جديد: حلب - دمشق',
        date: 'منذ 5 دقائق',
        type: 'booking'
      },
      {
        id: 'mock-notification-2',
        passengerName: 'مها خليل',
        passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maha',
        route: 'دفعة بانتظار التأكيد',
        date: 'منذ 18 دقيقة',
        type: 'payment'
      },
      {
        id: 'mock-notification-3',
        passengerName: 'نور اليوسف',
        passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nour',
        route: 'شكوى على رحلة حمص - طرطوس',
        date: 'منذ ساعة',
        type: 'complaint'
      },
      {
        id: 'mock-notification-4',
        passengerName: 'عمر الحسن',
        passengerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Omar',
        route: 'حجز مؤكد: إدلب - حلب',
        date: 'اليوم',
        type: 'booking'
      }
    ];
