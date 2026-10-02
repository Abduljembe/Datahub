// County Supervisor & Central Admin Field Operations Engine
// Handles the complete end-to-end data pipeline:
// Field Enumerators -> County Supervisors (review, clean, standardize) -> Central Office Admin (inspect, ingest, manage across all counties)

export interface CountyInfo {
  code: string;
  name: string;
  capital: string;
  region: 'Nairobi' | 'Central' | 'Coast' | 'Rift Valley' | 'Western' | 'Nyanza' | 'Eastern' | 'North Eastern';
  subCounties: string[];
}

export interface AssignedEnumerator {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  subCounty: string;
  status: 'active' | 'idle' | 'in_transit' | 'offline';
  collectedCount: number;
  lastActive: string;
}

export interface CountySupervisor {
  id: string;
  name: string;
  email: string;
  phone: string;
  badgeId: string;
  county: string;
  countyCode: string;
  region: string;
  role: string;
  avatarGradient: string;
  assignedSubCounties: string[];
  assignedEnumerators: AssignedEnumerator[];
  totalCollected: number;
  totalCleaned: number;
  totalDispatchedToAdmin: number;
  pendingCleaning: number;
  avgQualityScore: number;
  lastActive: string;
  status: 'active_in_field' | 'cleaning_batch' | 'dispatched_to_office' | 'idle';
}

export interface CountyCleanedRecord {
  recordId: string;
  submissionCode: string;
  county: string;
  countyCode: string;
  subCounty: string;
  ward: string;
  enumeratorId: string;
  enumeratorName: string;
  collectedAt: string;
  gps: {
    lat: number;
    lng: number;
    accuracy: number;
    isInsideZone?: boolean;
    locationName?: string;
  };
  supervisorId: string;
  supervisorName: string;
  cleanedAt: string;
  qualityScore: number;
  rawData: Record<string, any>;
  cleanedData: Record<string, any>;
  cleaningDiffs: Array<{
    field: string;
    originalValue: any;
    cleanedValue: any;
    ruleApplied: string;
    severity: 'fixed' | 'warning' | 'info';
  }>;
  supervisorNotes: string;
  status: 'collected_raw' | 'cleaned_by_supervisor' | 'sent_to_admin' | 'ingested_by_admin' | 'returned_for_reclean';
}

export interface CountyDispatchBatch {
  batchId: string;
  title: string;
  county: string;
  countyCode: string;
  supervisorId: string;
  supervisorName: string;
  supervisorBadge: string;
  supervisorEmail: string;
  supervisorPhone: string;
  sentAt: string;
  recordCount: number;
  enumeratorsInvolved: string[];
  cleaningSummary: {
    whitespaceTrimmed: number;
    casesStandardized: number;
    phonesFormatted: number;
    outliersCapped: number;
    missingImputed: number;
  };
  avgQualityScore: number;
  supervisorSignoff: string;
  status: 'sent_to_admin' | 'admin_received' | 'admin_ingested' | 'returned_with_notes';
  adminFeedback?: string;
  adminReceivedAt?: string;
  adminIngestedAt?: string;
  adminActionBy?: string;
  records: CountyCleanedRecord[];
}

export interface CountySummaryStat {
  county: string;
  countyCode: string;
  region: string;
  supervisorsCount: number;
  enumeratorsCount: number;
  totalCollected: number;
  totalCleaned: number;
  totalDispatchedToOffice: number;
  totalIngestedByAdmin: number;
  pendingCleaning: number;
  avgQualityScore: number;
  batchesCount: number;
  latestBatchDate?: string;
  latestStatus?: 'sent_to_admin' | 'admin_received' | 'admin_ingested' | 'returned_with_notes';
}

// 47 Administrative Counties
export const KENYA_COUNTIES: CountyInfo[] = [
  { code: '001', name: 'Mombasa', capital: 'Mombasa City', region: 'Coast', subCounties: ['Changamwe', 'Jomvu', 'Kisauni', 'Nyali', 'Likoni', 'Mvita'] },
  { code: '002', name: 'Kwale', capital: 'Kwale', region: 'Coast', subCounties: ['Msambweni', 'Lungalunga', 'Matuga', 'Kinango'] },
  { code: '003', name: 'Kilifi', capital: 'Kilifi', region: 'Coast', subCounties: ['Kilifi North', 'Kilifi South', 'Kaloleni', 'Rabai', 'Ganze', 'Malindi', 'Magarini'] },
  { code: '004', name: 'Tana River', capital: 'Hola', region: 'Coast', subCounties: ['Garsen', 'Galole', 'Bura'] },
  { code: '005', name: 'Lamu', capital: 'Lamu', region: 'Coast', subCounties: ['Lamu East', 'Lamu West'] },
  { code: '006', name: 'Taita Taveta', capital: 'Mwatate', region: 'Coast', subCounties: ['Taveta', 'Wundanyi', 'Mwatate', 'Voi'] },
  { code: '007', name: 'Garissa', capital: 'Garissa', region: 'North Eastern', subCounties: ['Garissa Township', 'Balambala', 'Lagdera', 'Dadaab', 'Fafi', 'Ijara'] },
  { code: '008', name: 'Wajir', capital: 'Wajir', region: 'North Eastern', subCounties: ['Wajir North', 'Wajir East', 'Tarbaj', 'Wajir West', 'Eldas', 'Wajir South'] },
  { code: '009', name: 'Mandera', capital: 'Mandera', region: 'North Eastern', subCounties: ['Mandera West', 'Banissa', 'Mandera North', 'Mandera South', 'Mandera East', 'Lafey'] },
  { code: '010', name: 'Marsabit', capital: 'Marsabit', region: 'Eastern', subCounties: ['Moyale', 'North Horr', 'Saku', 'Laisamis'] },
  { code: '011', name: 'Isiolo', capital: 'Isiolo', region: 'Eastern', subCounties: ['Isiolo North', 'Isiolo South'] },
  { code: '012', name: 'Meru', capital: 'Meru', region: 'Eastern', subCounties: ['Igembe South', 'Igembe Central', 'Igembe North', 'Tigania West', 'Tigania East', 'North Imenti', 'Buuri', 'Central Imenti', 'South Imenti'] },
  { code: '013', name: 'Tharaka-Nithi', capital: 'Kathwana', region: 'Eastern', subCounties: ['Maara', 'Chuka/Igambang\'ombe', 'Tharaka'] },
  { code: '014', name: 'Embu', capital: 'Embu', region: 'Eastern', subCounties: ['Manyatta', 'Runyenjes', 'Mbeere South', 'Mbeere North'] },
  { code: '015', name: 'Kitui', capital: 'Kitui', region: 'Eastern', subCounties: ['Mwingi North', 'Mwingi West', 'Mwingi Central', 'Kitui West', 'Kitui Rural', 'Kitui Central', 'Kitui East', 'Kitui South'] },
  { code: '016', name: 'Machakos', capital: 'Machakos', region: 'Eastern', subCounties: ['Masinga', 'Yatta', 'Kangundo', 'Matungulu', 'Kathiani', 'Mavoko', 'Machakos Town', 'Mwala'] },
  { code: '017', name: 'Makueni', capital: 'Wote', region: 'Eastern', subCounties: ['Mbooni', 'Kilome', 'Kaiti', 'Makueni', 'Kibwezi West', 'Kibwezi East'] },
  { code: '018', name: 'Nyandarua', capital: 'Ol Kalou', region: 'Central', subCounties: ['Kinangop', 'Kipipiri', 'Ol Kalou', 'Ol Jorok', 'Ndaragwa'] },
  { code: '019', name: 'Nyeri', capital: 'Nyeri', region: 'Central', subCounties: ['Tetu', 'Kieni', 'Mathira', 'Othaya', 'Mukurweini', 'Nyeri Town'] },
  { code: '020', name: 'Kirinyaga', capital: 'Kerugoya', region: 'Central', subCounties: ['Mwea', 'Gichugu', 'Ndia', 'Kirinyaga Central'] },
  { code: '021', name: 'Murang\'a', capital: 'Murang\'a', region: 'Central', subCounties: ['Kangema', 'Mathioya', 'Kiharu', 'Kigumo', 'Maragua', 'Kandara', 'Gatanga'] },
  { code: '022', name: 'Kiambu', capital: 'Kiambu', region: 'Central', subCounties: ['Gatundu South', 'Gatundu North', 'Juja', 'Thika Town', 'Ruiru', 'Githunguri', 'Kiambu', 'Kiambaa', 'Kabete', 'Kikuyu', 'Limuru', 'Lari'] },
  { code: '023', name: 'Turkana', capital: 'Lodwar', region: 'Rift Valley', subCounties: ['Turkana North', 'Turkana West', 'Turkana Central', 'Loima', 'Turkana South', 'Turkana East'] },
  { code: '024', name: 'West Pokot', capital: 'Kapenguria', region: 'Rift Valley', subCounties: ['Kapenguria', 'Sigor', 'Kacheliba', 'Pokot South'] },
  { code: '025', name: 'Samburu', capital: 'Maralal', region: 'Rift Valley', subCounties: ['Samburu West', 'Samburu North', 'Samburu East'] },
  { code: '026', name: 'Trans Nzoia', capital: 'Kitale', region: 'Rift Valley', subCounties: ['Kwanza', 'Endebess', 'Saboti', 'Kiminini', 'Cherangany'] },
  { code: '027', name: 'Uasin Gishu', capital: 'Eldoret', region: 'Rift Valley', subCounties: ['Soy', 'Turbo', 'Moiben', 'Ainabkoi', 'Kapseret', 'Kesses'] },
  { code: '028', name: 'Elgeyo-Marakwet', capital: 'Iten', region: 'Rift Valley', subCounties: ['Marakwet East', 'Marakwet West', 'Keiyo North', 'Keiyo South'] },
  { code: '029', name: 'Nandi', capital: 'Kapsabet', region: 'Rift Valley', subCounties: ['Tinderet', 'Aldai', 'Nandi Hills', 'Chesumei', 'Emgwen', 'Mosop'] },
  { code: '030', name: 'Baringo', capital: 'Kabarnet', region: 'Rift Valley', subCounties: ['Tiaty', 'Baringo North', 'Baringo Central', 'Baringo South', 'Mogotio', 'Eldama Ravine'] },
  { code: '031', name: 'Laikipia', capital: 'Rumuruti', region: 'Rift Valley', subCounties: ['Laikipia West', 'Laikipia East', 'Laikipia North'] },
  { code: '032', name: 'Nakuru', capital: 'Nakuru City', region: 'Rift Valley', subCounties: ['Molo', 'Njoro', 'Naivasha', 'Gilgil', 'Kuresoi South', 'Kuresoi North', 'Subukia', 'Rongai', 'Bahati', 'Nakuru Town West', 'Nakuru Town East'] },
  { code: '033', name: 'Narok', capital: 'Narok', region: 'Rift Valley', subCounties: ['Kilgoris', 'Emurua Dikirr', 'Narok North', 'Narok East', 'Narok South', 'Narok West'] },
  { code: '034', name: 'Kajiado', capital: 'Kajiado', region: 'Rift Valley', subCounties: ['Kajiado North', 'Kajiado Central', 'Kajiado East', 'Kajiado West', 'Kajiado South'] },
  { code: '035', name: 'Kericho', capital: 'Kericho', region: 'Rift Valley', subCounties: ['Kipkelion East', 'Kipkelion West', 'Ainamoi', 'Bureti', 'Belgut', 'Sigowet/Soin'] },
  { code: '036', name: 'Bomet', capital: 'Bomet', region: 'Rift Valley', subCounties: ['Sotik', 'Chepalungu', 'Bomet East', 'Bomet Central', 'Konoin'] },
  { code: '037', name: 'Kakamega', capital: 'Kakamega', region: 'Western', subCounties: ['Lugari', 'Likuyani', 'Malava', 'Lurambi', 'Navakholo', 'Mumias West', 'Mumias East', 'Matungu', 'Butere', 'Khwisero', 'Shinyalu', 'Ikolomani'] },
  { code: '038', name: 'Vihiga', capital: 'Vihiga', region: 'Western', subCounties: ['Vihiga', 'Sabatia', 'Hamisi', 'Luanda', 'Emuhaya'] },
  { code: '039', name: 'Bungoma', capital: 'Bungoma', region: 'Western', subCounties: ['Mount Elgon', 'Sirisia', 'Kabuchai', 'Bumula', 'Kanduyi', 'Webuye East', 'Webuye West', 'Kimilili', 'Tongaren'] },
  { code: '040', name: 'Busia', capital: 'Busia', region: 'Western', subCounties: ['Teso North', 'Teso South', 'Nambale', 'Matayos', 'Butula', 'Funyula', 'Budalangi'] },
  { code: '041', name: 'Siaya', capital: 'Siaya', region: 'Nyanza', subCounties: ['Ugenya', 'Ugunja', 'Alego Usonga', 'Gem', 'Bondo', 'Rarieda'] },
  { code: '042', name: 'Kisumu', capital: 'Kisumu City', region: 'Nyanza', subCounties: ['Kisumu East', 'Kisumu West', 'Kisumu Central', 'Seme', 'Nyando', 'Muhoroni', 'Nyakach'] },
  { code: '043', name: 'Homa Bay', capital: 'Homa Bay', region: 'Nyanza', subCounties: ['Kasipul', 'Kabondo Kasipul', 'Karachuonyo', 'Rangwe', 'Homa Bay Town', 'Ndhiwa', 'Suba North', 'Suba South'] },
  { code: '044', name: 'Migori', capital: 'Migori', region: 'Nyanza', subCounties: ['Rongo', 'Awendo', 'Suna East', 'Suna West', 'Uriri', 'Nyatike', 'Kuria West', 'Kuria East'] },
  { code: '045', name: 'Kisii', capital: 'Kisii', region: 'Nyanza', subCounties: ['Bonchari', 'South Mugirango', 'Bomachoge Borabu', 'Bobasi', 'Bomachoge Chache', 'Nyaribari Masaba', 'Nyaribari Chache', 'Kitutu Chache North', 'Kitutu Chache South'] },
  { code: '046', name: 'Nyamira', capital: 'Nyamira', region: 'Nyanza', subCounties: ['Kitutu Masaba', 'West Mugirango', 'North Mugirango', 'Borabu'] },
  { code: '047', name: 'Nairobi', capital: 'Nairobi City (HQ)', region: 'Nairobi', subCounties: ['Westlands', 'Parklands', 'Dagoretti', 'Kibra', 'Roysambu', 'Kasarani', 'Ruaraka', 'Embakasi', 'Makadara', 'Kamukunji', 'Starehe', 'Langata'] }
];

const STORAGE_COUNTY_SUPERVISORS = 'datahub_county_supervisors_v1';
const STORAGE_COUNTY_DISPATCHES = 'datahub_county_dispatches_v1';

// Seed initial supervisors across key strategic counties
export const INITIAL_COUNTY_SUPERVISORS: CountySupervisor[] = [
  {
    id: 'sup_nrb_01',
    name: 'Grace Wambui Njoroge',
    email: 'grace.njoroge@datahub-field.org',
    phone: '+254 712 345 678',
    badgeId: 'SUP-NRB-4701',
    county: 'Nairobi',
    countyCode: '047',
    region: 'Nairobi',
    role: 'County Lead Field Supervisor',
    avatarGradient: 'from-blue-600 via-indigo-600 to-cyan-500',
    assignedSubCounties: ['Westlands', 'Kasarani', 'Kibra', 'Starehe'],
    assignedEnumerators: [
      { id: 'enum_nrb_1', name: 'Kevin Omondi', phone: '+254 723 111 222', email: 'kevin.o@datahub-field.org', role: 'Urban Enumerator', subCounty: 'Westlands', status: 'active', collectedCount: 84, lastActive: '10 mins ago' },
      { id: 'enum_nrb_2', name: 'Faith Chebet', phone: '+254 722 333 444', email: 'faith.c@datahub-field.org', role: 'Household Assessor', subCounty: 'Kibra', status: 'active', collectedCount: 76, lastActive: '5 mins ago' },
      { id: 'enum_nrb_3', name: 'Brian Mwangi', phone: '+254 721 555 666', email: 'brian.m@datahub-field.org', role: 'Business Registrar', subCounty: 'Starehe', status: 'idle', collectedCount: 65, lastActive: '45 mins ago' }
    ],
    totalCollected: 225,
    totalCleaned: 220,
    totalDispatchedToAdmin: 220,
    pendingCleaning: 5,
    avgQualityScore: 98.4,
    lastActive: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'dispatched_to_office'
  },
  {
    id: 'sup_kbu_02',
    name: 'Peter Kamau Ndungu',
    email: 'peter.kamau@datahub-field.org',
    phone: '+254 720 987 654',
    badgeId: 'SUP-KBU-2201',
    county: 'Kiambu',
    countyCode: '022',
    region: 'Central',
    role: 'County Agricultural & Demographic Supervisor',
    avatarGradient: 'from-emerald-600 via-teal-600 to-green-500',
    assignedSubCounties: ['Thika Town', 'Ruiru', 'Gatundu South', 'Kiambu'],
    assignedEnumerators: [
      { id: 'enum_kbu_1', name: 'Alice Muthoni', phone: '+254 724 777 888', email: 'alice.m@datahub-field.org', role: 'Agronomy Collector', subCounty: 'Gatundu South', status: 'active', collectedCount: 92, lastActive: '12 mins ago' },
      { id: 'enum_kbu_2', name: 'Dennis Kariuki', phone: '+254 725 999 000', email: 'dennis.k@datahub-field.org', role: 'Demographics Surveyor', subCounty: 'Thika Town', status: 'active', collectedCount: 88, lastActive: '20 mins ago' }
    ],
    totalCollected: 180,
    totalCleaned: 175,
    totalDispatchedToAdmin: 175,
    pendingCleaning: 5,
    avgQualityScore: 97.2,
    lastActive: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    status: 'dispatched_to_office'
  },
  {
    id: 'sup_msa_03',
    name: 'Fatuma Hassan Bakari',
    email: 'fatuma.hassan@datahub-field.org',
    phone: '+254 733 456 789',
    badgeId: 'SUP-MSA-0101',
    county: 'Mombasa',
    countyCode: '001',
    region: 'Coast',
    role: 'County Maritime & Commercial Supervisor',
    avatarGradient: 'from-cyan-600 via-blue-600 to-indigo-700',
    assignedSubCounties: ['Nyali', 'Mvita', 'Changamwe', 'Likoni'],
    assignedEnumerators: [
      { id: 'enum_msa_1', name: 'Ali Mohammed', phone: '+254 734 111 333', email: 'ali.m@datahub-field.org', role: 'Port Trade Surveyor', subCounty: 'Mvita', status: 'active', collectedCount: 71, lastActive: '8 mins ago' },
      { id: 'enum_msa_2', name: 'Zainab Juma', phone: '+254 735 222 444', email: 'zainab.j@datahub-field.org', role: 'Fisheries Assessor', subCounty: 'Likoni', status: 'active', collectedCount: 68, lastActive: '18 mins ago' }
    ],
    totalCollected: 139,
    totalCleaned: 135,
    totalDispatchedToAdmin: 135,
    pendingCleaning: 4,
    avgQualityScore: 96.8,
    lastActive: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    status: 'dispatched_to_office'
  },
  {
    id: 'sup_ksm_04',
    name: 'Dr. Dan Otieno Okello',
    email: 'dan.okello@datahub-field.org',
    phone: '+254 711 223 344',
    badgeId: 'SUP-KSM-4201',
    county: 'Kisumu',
    countyCode: '042',
    region: 'Nyanza',
    role: 'County Public Health & Lakefront Lead',
    avatarGradient: 'from-purple-600 via-violet-600 to-indigo-800',
    assignedSubCounties: ['Kisumu Central', 'Kisumu East', 'Seme', 'Nyando'],
    assignedEnumerators: [
      { id: 'enum_ksm_1', name: 'Lilian Achieng', phone: '+254 712 555 777', email: 'lilian.a@datahub-field.org', role: 'Clinic Data Collector', subCounty: 'Kisumu Central', status: 'active', collectedCount: 82, lastActive: '14 mins ago' },
      { id: 'enum_ksm_2', name: 'Stephen Onyango', phone: '+254 713 666 888', email: 'stephen.o@datahub-field.org', role: 'Water Quality Field Officer', subCounty: 'Nyando', status: 'active', collectedCount: 74, lastActive: '30 mins ago' }
    ],
    totalCollected: 156,
    totalCleaned: 150,
    totalDispatchedToAdmin: 150,
    pendingCleaning: 6,
    avgQualityScore: 99.1,
    lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: 'dispatched_to_office'
  },
  {
    id: 'sup_nku_05',
    name: 'Samuel Kiprotich Koech',
    email: 'samuel.koech@datahub-field.org',
    phone: '+254 722 888 999',
    badgeId: 'SUP-NKU-3201',
    county: 'Nakuru',
    countyCode: '032',
    region: 'Rift Valley',
    role: 'County Agri-Business & Geothermal Supervisor',
    avatarGradient: 'from-amber-600 via-orange-600 to-yellow-500',
    assignedSubCounties: ['Naivasha', 'Nakuru Town East', 'Rongai', 'Njoro'],
    assignedEnumerators: [
      { id: 'enum_nku_1', name: 'Joyce Cherono', phone: '+254 723 444 555', email: 'joyce.c@datahub-field.org', role: 'Horticulture Assessor', subCounty: 'Naivasha', status: 'active', collectedCount: 95, lastActive: '7 mins ago' },
      { id: 'enum_nku_2', name: 'Erick Rono', phone: '+254 724 666 777', email: 'erick.r@datahub-field.org', role: 'Livestock Field Officer', subCounty: 'Rongai', status: 'active', collectedCount: 81, lastActive: '22 mins ago' }
    ],
    totalCollected: 176,
    totalCleaned: 170,
    totalDispatchedToAdmin: 170,
    pendingCleaning: 6,
    avgQualityScore: 97.9,
    lastActive: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    status: 'dispatched_to_office'
  },
  {
    id: 'sup_mks_06',
    name: 'Mercy Mutheu Kyalo',
    email: 'mercy.kyalo@datahub-field.org',
    phone: '+254 733 123 987',
    badgeId: 'SUP-MKS-1601',
    county: 'Machakos',
    countyCode: '016',
    region: 'Eastern',
    role: 'County Water & Infrastructure Supervisor',
    avatarGradient: 'from-rose-600 via-pink-600 to-orange-500',
    assignedSubCounties: ['Mavoko', 'Machakos Town', 'Kangundo', 'Mwala'],
    assignedEnumerators: [
      { id: 'enum_mks_1', name: 'Joshua Musyoka', phone: '+254 734 888 222', email: 'joshua.m@datahub-field.org', role: 'Industrial Census Agent', subCounty: 'Mavoko', status: 'active', collectedCount: 68, lastActive: '15 mins ago' },
      { id: 'enum_mks_2', name: 'Agnes Kavata', phone: '+254 735 999 333', email: 'agnes.k@datahub-field.org', role: 'Community Surveyor', subCounty: 'Machakos Town', status: 'active', collectedCount: 62, lastActive: '35 mins ago' }
    ],
    totalCollected: 130,
    totalCleaned: 125,
    totalDispatchedToAdmin: 125,
    pendingCleaning: 5,
    avgQualityScore: 98.0,
    lastActive: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    status: 'dispatched_to_office'
  },
  {
    id: 'sup_eld_07',
    name: 'Emmanuel Kiprono Tarus',
    email: 'emmanuel.tarus@datahub-field.org',
    phone: '+254 721 777 444',
    badgeId: 'SUP-UG-2701',
    county: 'Uasin Gishu',
    countyCode: '027',
    region: 'Rift Valley',
    role: 'County Cereal & Grain Logistics Supervisor',
    avatarGradient: 'from-teal-600 via-cyan-600 to-blue-700',
    assignedSubCounties: ['Soy', 'Kapseret', 'Turbo', 'Kesses'],
    assignedEnumerators: [
      { id: 'enum_eld_1', name: 'Gladys Jepkosgei', phone: '+254 722 123 456', email: 'gladys.j@datahub-field.org', role: 'Grain Silo Auditor', subCounty: 'Soy', status: 'active', collectedCount: 79, lastActive: '11 mins ago' },
      { id: 'enum_eld_2', name: 'Collins Bett', phone: '+254 723 234 567', email: 'collins.b@datahub-field.org', role: 'Fertilizer Distribution Agent', subCounty: 'Kapseret', status: 'active', collectedCount: 71, lastActive: '19 mins ago' }
    ],
    totalCollected: 150,
    totalCleaned: 145,
    totalDispatchedToAdmin: 145,
    pendingCleaning: 5,
    avgQualityScore: 98.7,
    lastActive: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    status: 'dispatched_to_office'
  },
  {
    id: 'sup_klf_08',
    name: 'Juma Mwambire Charo',
    email: 'juma.charo@datahub-field.org',
    phone: '+254 738 555 111',
    badgeId: 'SUP-KLF-0301',
    county: 'Kilifi',
    countyCode: '003',
    region: 'Coast',
    role: 'County Coastal Forestry & Tourism Supervisor',
    avatarGradient: 'from-emerald-600 via-teal-700 to-indigo-800',
    assignedSubCounties: ['Malindi', 'Kilifi North', 'Magarini', 'Kaloleni'],
    assignedEnumerators: [
      { id: 'enum_klf_1', name: 'Rehema Sidi', phone: '+254 739 222 333', email: 'rehema.s@datahub-field.org', role: 'Mangrove Eco Surveyor', subCounty: 'Kilifi North', status: 'active', collectedCount: 64, lastActive: '28 mins ago' },
      { id: 'enum_klf_2', name: 'Omar Kazungu', phone: '+254 740 333 444', email: 'omar.k@datahub-field.org', role: 'Hospitality Enumerator', subCounty: 'Malindi', status: 'active', collectedCount: 59, lastActive: '42 mins ago' }
    ],
    totalCollected: 123,
    totalCleaned: 118,
    totalDispatchedToAdmin: 118,
    pendingCleaning: 5,
    avgQualityScore: 96.5,
    lastActive: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    status: 'dispatched_to_office'
  }
];

// Helper to generate sample cleaned records for initial dispatches
function generateSampleCleanedRecords(county: string, countyCode: string, supervisor: CountySupervisor, count: number): CountyCleanedRecord[] {
  const records: CountyCleanedRecord[] = [];
  const enumList = supervisor.assignedEnumerators;
  const subCounties = supervisor.assignedSubCounties;

  for (let i = 1; i <= count; i++) {
    const enumAgent = enumList[(i - 1) % enumList.length];
    const subCounty = subCounties[(i - 1) % subCounties.length];
    const ward = `${subCounty} Ward ${(i % 3) + 1}`;
    const rawHouseholdHead = ['john kamau ', 'mary atieno', 'ali hassan  ', 'esther cherono', 'ahmed ibrahim ', 'agatha muthoni', 'george omondi', 'grace chepkemoi'][i % 8];
    const cleanedHouseholdHead = rawHouseholdHead.trim().split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    
    const rawPhone = `07${Math.floor(10000000 + Math.random() * 89999999)}`;
    const cleanedPhone = `+254 ${rawPhone.substring(1, 4)} ${rawPhone.substring(4, 7)} ${rawPhone.substring(7)}`;

    const householdSize = (i % 7) + 2;
    const monthlyIncomeRaw = `${(Math.floor(15 + Math.random() * 70) * 1000)}`;
    const monthlyIncomeCleaned = Number(monthlyIncomeRaw);

    const farmSizeRaw = `${(Math.floor(1 + Math.random() * 15))}.${(i % 9)}`;
    const farmSizeCleaned = parseFloat(farmSizeRaw);

    records.push({
      recordId: `REC-${countyCode}-${supervisor.id.substring(4, 7).toUpperCase()}-${1000 + i}`,
      submissionCode: `SUB-${countyCode}-${202600 + i}`,
      county,
      countyCode,
      subCounty,
      ward,
      enumeratorId: enumAgent.id,
      enumeratorName: enumAgent.name,
      collectedAt: new Date(Date.now() - (i * 25 + 60) * 60 * 1000).toISOString(),
      gps: {
        lat: -1.286389 + (Math.random() - 0.5) * 0.4,
        lng: 36.817223 + (Math.random() - 0.5) * 0.4,
        accuracy: 3 + Math.floor(Math.random() * 5),
        isInsideZone: true,
        locationName: `${ward}, ${subCounty}`
      },
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      cleanedAt: new Date(Date.now() - (i * 20 + 20) * 60 * 1000).toISOString(),
      qualityScore: 94 + (i % 6),
      rawData: {
        respondent_id: `HH-${countyCode}-${1000 + i}`,
        household_head: rawHouseholdHead,
        contact_phone: rawPhone,
        family_size: `${householdSize} members`,
        monthly_income_kes: monthlyIncomeRaw,
        primary_activity: i % 2 === 0 ? 'Farming ' : 'Retail Business ',
        farm_acreage: farmSizeRaw,
        has_electricity: i % 3 === 0 ? 'yes' : 'no',
        water_source: i % 2 === 0 ? 'borehole' : 'piped_water'
      },
      cleanedData: {
        respondent_id: `HH-${countyCode}-${1000 + i}`,
        household_head: cleanedHouseholdHead,
        contact_phone: cleanedPhone,
        family_size: householdSize,
        monthly_income_kes: monthlyIncomeCleaned,
        primary_activity: i % 2 === 0 ? 'Farming' : 'Retail Business',
        farm_acreage: farmSizeCleaned,
        has_electricity: i % 3 === 0 ? 'Yes' : 'No',
        water_source: i % 2 === 0 ? 'Borehole' : 'Piped Water'
      },
      cleaningDiffs: [
        { field: 'household_head', originalValue: rawHouseholdHead, cleanedValue: cleanedHouseholdHead, ruleApplied: 'Trim whitespace & Title Case format', severity: 'fixed' },
        { field: 'contact_phone', originalValue: rawPhone, cleanedValue: cleanedPhone, ruleApplied: 'E.164 Kenya National Phone Standardizer', severity: 'fixed' },
        { field: 'family_size', originalValue: `${householdSize} members`, cleanedValue: householdSize, ruleApplied: 'Cast string label to Integer', severity: 'fixed' },
        { field: 'monthly_income_kes', originalValue: monthlyIncomeRaw, cleanedValue: monthlyIncomeCleaned, ruleApplied: 'Cast numeric income to Currency Number', severity: 'fixed' },
        { field: 'has_electricity', originalValue: i % 3 === 0 ? 'yes' : 'no', cleanedValue: i % 3 === 0 ? 'Yes' : 'No', ruleApplied: 'Standardize Boolean taxonomy', severity: 'info' }
      ],
      supervisorNotes: 'Verified against GPS sector perimeter. Respondent phone and household income validated by supervisor.',
      status: 'sent_to_admin'
    });
  }

  return records;
}

// Initial pre-seeded dispatches sent from supervisors to the Central Admin Office
export const INITIAL_COUNTY_DISPATCHES: CountyDispatchBatch[] = [
  {
    batchId: 'DISPATCH-NRB-2026-041',
    title: 'Nairobi County Urban Baseline Census & Business Register',
    county: 'Nairobi',
    countyCode: '047',
    supervisorId: 'sup_nrb_01',
    supervisorName: 'Grace Wambui Njoroge',
    supervisorBadge: 'SUP-NRB-4701',
    supervisorEmail: 'grace.njoroge@datahub-field.org',
    supervisorPhone: '+254 712 345 678',
    sentAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    recordCount: 220,
    enumeratorsInvolved: ['Kevin Omondi', 'Faith Chebet', 'Brian Mwangi'],
    cleaningSummary: {
      whitespaceTrimmed: 220,
      casesStandardized: 215,
      phonesFormatted: 220,
      outliersCapped: 4,
      missingImputed: 6
    },
    avgQualityScore: 98.4,
    supervisorSignoff: 'All 220 urban household and commercial records collected by enumerators Kevin, Faith, and Brian have been audited. Names capitalized, phone numbers standardized to +254, and GPS geofences verified. Dispatched to Admin HQ.',
    status: 'admin_received',
    adminReceivedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    records: generateSampleCleanedRecords('Nairobi', '047', INITIAL_COUNTY_SUPERVISORS[0], 12)
  },
  {
    batchId: 'DISPATCH-KBU-2026-022',
    title: 'Kiambu County Agricultural Productivity & Farm Size Survey',
    county: 'Kiambu',
    countyCode: '022',
    supervisorId: 'sup_kbu_02',
    supervisorName: 'Peter Kamau Ndungu',
    supervisorBadge: 'SUP-KBU-2201',
    supervisorEmail: 'peter.kamau@datahub-field.org',
    supervisorPhone: '+254 720 987 654',
    sentAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    recordCount: 175,
    enumeratorsInvolved: ['Alice Muthoni', 'Dennis Kariuki'],
    cleaningSummary: {
      whitespaceTrimmed: 175,
      casesStandardized: 170,
      phonesFormatted: 175,
      outliersCapped: 2,
      missingImputed: 4
    },
    avgQualityScore: 97.2,
    supervisorSignoff: 'Full agricultural dataset cleaned. Farm acreages checked against satellite cadastral layers. Outliers on maize yields capped using 2.5 IQR recipe. Forwarded to Admin.',
    status: 'sent_to_admin',
    records: generateSampleCleanedRecords('Kiambu', '022', INITIAL_COUNTY_SUPERVISORS[1], 10)
  },
  {
    batchId: 'DISPATCH-KSM-2026-042',
    title: 'Kisumu County Public Health & Water Access Survey',
    county: 'Kisumu',
    countyCode: '042',
    supervisorId: 'sup_ksm_04',
    supervisorName: 'Dr. Dan Otieno Okello',
    supervisorBadge: 'SUP-KSM-4201',
    supervisorEmail: 'dan.okello@datahub-field.org',
    supervisorPhone: '+254 711 223 344',
    sentAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    recordCount: 150,
    enumeratorsInvolved: ['Lilian Achieng', 'Stephen Onyango'],
    cleaningSummary: {
      whitespaceTrimmed: 150,
      casesStandardized: 148,
      phonesFormatted: 150,
      outliersCapped: 1,
      missingImputed: 2
    },
    avgQualityScore: 99.1,
    supervisorSignoff: 'Pristine health clinic and lakefront water source telemetry. All 150 records validated with biometric timestamp. Signed off by Lead Public Health Auditor.',
    status: 'admin_ingested',
    adminReceivedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    adminIngestedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    adminActionBy: 'abduljembe@gmail.com (Central Admin)',
    records: generateSampleCleanedRecords('Kisumu', '042', INITIAL_COUNTY_SUPERVISORS[3], 10)
  },
  {
    batchId: 'DISPATCH-MSA-2026-001',
    title: 'Mombasa County Coastal Trade & Fisheries Demographic Audit',
    county: 'Mombasa',
    countyCode: '001',
    supervisorId: 'sup_msa_03',
    supervisorName: 'Fatuma Hassan Bakari',
    supervisorBadge: 'SUP-MSA-0101',
    supervisorEmail: 'fatuma.hassan@datahub-field.org',
    supervisorPhone: '+254 733 456 789',
    sentAt: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    recordCount: 135,
    enumeratorsInvolved: ['Ali Mohammed', 'Zainab Juma'],
    cleaningSummary: {
      whitespaceTrimmed: 135,
      casesStandardized: 130,
      phonesFormatted: 135,
      outliersCapped: 5,
      missingImputed: 3
    },
    avgQualityScore: 96.8,
    supervisorSignoff: 'Verified coastal landing sites and wholesale fish trader revenues. Outliers normalized, respondent identities anonymized according to PII protocols.',
    status: 'sent_to_admin',
    records: generateSampleCleanedRecords('Mombasa', '001', INITIAL_COUNTY_SUPERVISORS[2], 8)
  },
  {
    batchId: 'DISPATCH-NKU-2026-032',
    title: 'Nakuru County Horticulture & Dairy Herd Enumeration',
    county: 'Nakuru',
    countyCode: '032',
    supervisorId: 'sup_nku_05',
    supervisorName: 'Samuel Kiprotich Koech',
    supervisorBadge: 'SUP-NKU-3201',
    supervisorEmail: 'samuel.koech@datahub-field.org',
    supervisorPhone: '+254 722 888 999',
    sentAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    recordCount: 170,
    enumeratorsInvolved: ['Joyce Cherono', 'Erick Rono'],
    cleaningSummary: {
      whitespaceTrimmed: 170,
      casesStandardized: 165,
      phonesFormatted: 170,
      outliersCapped: 3,
      missingImputed: 5
    },
    avgQualityScore: 97.9,
    supervisorSignoff: 'Naivasha and Rongai livestock survey complete. Cleaned and verified. Ready for central executive ingestion.',
    status: 'admin_received',
    adminReceivedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    records: generateSampleCleanedRecords('Nakuru', '032', INITIAL_COUNTY_SUPERVISORS[4], 8)
  },
  {
    batchId: 'DISPATCH-UG-2026-027',
    title: 'Uasin Gishu County Cereal Stockpile & Fertilizer Logistics',
    county: 'Uasin Gishu',
    countyCode: '027',
    supervisorId: 'sup_eld_07',
    supervisorName: 'Emmanuel Kiprono Tarus',
    supervisorBadge: 'SUP-UG-2701',
    supervisorEmail: 'emmanuel.tarus@datahub-field.org',
    supervisorPhone: '+254 721 777 444',
    sentAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    recordCount: 145,
    enumeratorsInvolved: ['Gladys Jepkosgei', 'Collins Bett'],
    cleaningSummary: {
      whitespaceTrimmed: 145,
      casesStandardized: 140,
      phonesFormatted: 145,
      outliersCapped: 2,
      missingImputed: 3
    },
    avgQualityScore: 98.7,
    supervisorSignoff: 'Soy and Kapseret grain depot survey completed. Cleaned and validated against national cereal board metrics.',
    status: 'sent_to_admin',
    records: generateSampleCleanedRecords('Uasin Gishu', '027', INITIAL_COUNTY_SUPERVISORS[6], 8)
  }
];

// Persistent Storage Handlers
export function getStoredCountySupervisors(): CountySupervisor[] {
  try {
    const raw = localStorage.getItem(STORAGE_COUNTY_SUPERVISORS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_COUNTY_SUPERVISORS;
}

export function saveStoredCountySupervisors(supervisors: CountySupervisor[]): void {
  try {
    localStorage.setItem(STORAGE_COUNTY_SUPERVISORS, JSON.stringify(supervisors));
    window.dispatchEvent(new CustomEvent('datahub_county_supervisors_updated', { detail: supervisors }));
  } catch {}
}

export function getStoredCountyDispatches(): CountyDispatchBatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_COUNTY_DISPATCHES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_COUNTY_DISPATCHES;
}

export function saveStoredCountyDispatches(dispatches: CountyDispatchBatch[]): void {
  try {
    localStorage.setItem(STORAGE_COUNTY_DISPATCHES, JSON.stringify(dispatches));
    window.dispatchEvent(new CustomEvent('datahub_county_dispatches_updated', { detail: dispatches }));
  } catch {}
}

// Supervisor Actions
export function dispatchCleanedDataToAdmin(params: {
  county: string;
  supervisorId: string;
  supervisorName: string;
  supervisorBadge: string;
  supervisorEmail: string;
  supervisorPhone: string;
  title: string;
  records: CountyCleanedRecord[];
  supervisorSignoff: string;
}): CountyDispatchBatch {
  const countyInfo = KENYA_COUNTIES.find(c => c.name.toLowerCase() === params.county.toLowerCase()) || {
    code: '047',
    name: params.county,
    capital: 'County HQ',
    region: 'Nairobi',
    subCounties: []
  };

  const enumNamesSet = new Set<string>();
  params.records.forEach(r => enumNamesSet.add(r.enumeratorName));

  let whitespaceCount = 0;
  let caseCount = 0;
  let phoneCount = 0;
  let outliersCount = 0;
  let imputedCount = 0;

  params.records.forEach(r => {
    r.cleaningDiffs.forEach(d => {
      const rule = d.ruleApplied.toLowerCase();
      if (rule.includes('trim') || rule.includes('whitespace')) whitespaceCount++;
      if (rule.includes('case') || rule.includes('capital')) caseCount++;
      if (rule.includes('phone')) phoneCount++;
      if (rule.includes('outlier') || rule.includes('iqr')) outliersCount++;
      if (rule.includes('impute') || rule.includes('missing')) imputedCount++;
    });
  });

  const totalScore = params.records.reduce((acc, r) => acc + (r.qualityScore || 95), 0);
  const avgScore = params.records.length > 0 ? Math.round((totalScore / params.records.length) * 10) / 10 : 98.0;

  const newBatch: CountyDispatchBatch = {
    batchId: `DISPATCH-${countyInfo.code}-${Date.now().toString().slice(-4)}`,
    title: params.title || `${params.county} County Cleaned Field Dataset`,
    county: countyInfo.name,
    countyCode: countyInfo.code,
    supervisorId: params.supervisorId,
    supervisorName: params.supervisorName,
    supervisorBadge: params.supervisorBadge,
    supervisorEmail: params.supervisorEmail,
    supervisorPhone: params.supervisorPhone,
    sentAt: new Date().toISOString(),
    recordCount: params.records.length,
    enumeratorsInvolved: Array.from(enumNamesSet),
    cleaningSummary: {
      whitespaceTrimmed: whitespaceCount || params.records.length,
      casesStandardized: caseCount || params.records.length,
      phonesFormatted: phoneCount || params.records.length,
      outliersCapped: outliersCount,
      missingImputed: imputedCount
    },
    avgQualityScore: avgScore,
    supervisorSignoff: params.supervisorSignoff || 'Certified cleaned and validated by County Supervisor. Dispatched to Central Admin Office.',
    status: 'sent_to_admin',
    records: params.records
  };

  const currentDispatches = getStoredCountyDispatches();
  const updated = [newBatch, ...currentDispatches];
  saveStoredCountyDispatches(updated);

  // Update supervisor totals
  const supervisors = getStoredCountySupervisors();
  const supIndex = supervisors.findIndex(s => s.id === params.supervisorId || s.county.toLowerCase() === params.county.toLowerCase());
  if (supIndex >= 0) {
    supervisors[supIndex].totalDispatchedToAdmin += params.records.length;
    supervisors[supIndex].pendingCleaning = Math.max(0, supervisors[supIndex].pendingCleaning - params.records.length);
    supervisors[supIndex].status = 'dispatched_to_office';
    supervisors[supIndex].lastActive = new Date().toISOString();
    saveStoredCountySupervisors(supervisors);
  }

  return newBatch;
}

// Admin Actions in Central Office
export function adminAcknowledgeBatch(batchId: string, adminEmail: string = 'admin@datahub.io'): boolean {
  const dispatches = getStoredCountyDispatches();
  const batch = dispatches.find(b => b.batchId === batchId);
  if (!batch) return false;

  batch.status = 'admin_received';
  batch.adminReceivedAt = new Date().toISOString();
  batch.adminActionBy = adminEmail;

  saveStoredCountyDispatches(dispatches);
  return true;
}

export function adminIngestBatch(batchId: string, adminEmail: string = 'admin@datahub.io'): boolean {
  const dispatches = getStoredCountyDispatches();
  const batch = dispatches.find(b => b.batchId === batchId);
  if (!batch) return false;

  batch.status = 'admin_ingested';
  batch.adminIngestedAt = new Date().toISOString();
  batch.adminActionBy = adminEmail;

  saveStoredCountyDispatches(dispatches);
  return true;
}

export function adminReturnBatchToSupervisor(batchId: string, feedback: string, adminEmail: string = 'admin@datahub.io'): boolean {
  const dispatches = getStoredCountyDispatches();
  const batch = dispatches.find(b => b.batchId === batchId);
  if (!batch) return false;

  batch.status = 'returned_with_notes';
  batch.adminFeedback = feedback;
  batch.adminActionBy = adminEmail;

  saveStoredCountyDispatches(dispatches);
  return true;
}

// Aggregate Statistics across Counties
export function computeCountySummaryMetrics(): {
  totalCountiesMonitored: number;
  totalSupervisorsAcrossCounties: number;
  totalEnumeratorsAcrossCounties: number;
  totalRecordsCollected: number;
  totalRecordsCleaned: number;
  totalDispatchedToAdmin: number;
  totalIngestedByAdmin: number;
  overallFleetQualityScore: number;
  countyBreakdowns: CountySummaryStat[];
} {
  const supervisors = getStoredCountySupervisors();
  const dispatches = getStoredCountyDispatches();

  const totalSupervisors = supervisors.length;
  let totalEnumerators = 0;
  let totalCollected = 0;
  let totalCleaned = 0;
  let totalDispatched = 0;
  let totalIngested = 0;
  let scoreSum = 0;

  const countyMap: Record<string, CountySummaryStat> = {};

  // Initialize with KENYA_COUNTIES
  KENYA_COUNTIES.forEach(c => {
    countyMap[c.name] = {
      county: c.name,
      countyCode: c.code,
      region: c.region,
      supervisorsCount: 0,
      enumeratorsCount: 0,
      totalCollected: 0,
      totalCleaned: 0,
      totalDispatchedToOffice: 0,
      totalIngestedByAdmin: 0,
      pendingCleaning: 0,
      avgQualityScore: 0,
      batchesCount: 0
    };
  });

  supervisors.forEach(s => {
    const cName = s.county;
    if (!countyMap[cName]) {
      countyMap[cName] = {
        county: s.county,
        countyCode: s.countyCode || '047',
        region: (s.region as any) || 'Nairobi',
        supervisorsCount: 0,
        enumeratorsCount: 0,
        totalCollected: 0,
        totalCleaned: 0,
        totalDispatchedToOffice: 0,
        totalIngestedByAdmin: 0,
        pendingCleaning: 0,
        avgQualityScore: 0,
        batchesCount: 0
      };
    }

    countyMap[cName].supervisorsCount += 1;
    countyMap[cName].enumeratorsCount += s.assignedEnumerators?.length || 0;
    countyMap[cName].totalCollected += s.totalCollected;
    countyMap[cName].totalCleaned += s.totalCleaned;
    countyMap[cName].totalDispatchedToOffice += s.totalDispatchedToAdmin;
    countyMap[cName].pendingCleaning += s.pendingCleaning;
    countyMap[cName].avgQualityScore = s.avgQualityScore;

    totalEnumerators += s.assignedEnumerators?.length || 0;
    totalCollected += s.totalCollected;
    totalCleaned += s.totalCleaned;
    totalDispatched += s.totalDispatchedToAdmin;
    scoreSum += s.avgQualityScore;
  });

  dispatches.forEach(d => {
    const cName = d.county;
    if (countyMap[cName]) {
      countyMap[cName].batchesCount += 1;
      if (!countyMap[cName].latestBatchDate || new Date(d.sentAt) > new Date(countyMap[cName].latestBatchDate!)) {
        countyMap[cName].latestBatchDate = d.sentAt;
        countyMap[cName].latestStatus = d.status;
      }
      if (d.status === 'admin_ingested') {
        countyMap[cName].totalIngestedByAdmin += d.recordCount;
        totalIngested += d.recordCount;
      }
    }
  });

  const countyBreakdowns = Object.values(countyMap).sort((a, b) => {
    // Sort counties with active supervisors or dispatches first
    if ((b.supervisorsCount > 0 || b.batchesCount > 0) && a.supervisorsCount === 0 && a.batchesCount === 0) return 1;
    if ((a.supervisorsCount > 0 || a.batchesCount > 0) && b.supervisorsCount === 0 && b.batchesCount === 0) return -1;
    return b.totalDispatchedToOffice - a.totalDispatchedToOffice;
  });

  const activeCountiesCount = countyBreakdowns.filter(c => c.supervisorsCount > 0 || c.batchesCount > 0).length;

  return {
    totalCountiesMonitored: activeCountiesCount,
    totalSupervisorsAcrossCounties: totalSupervisors,
    totalEnumeratorsAcrossCounties: totalEnumerators,
    totalRecordsCollected: totalCollected,
    totalRecordsCleaned: totalCleaned,
    totalDispatchedToAdmin: totalDispatched,
    totalIngestedByAdmin: totalIngested,
    overallFleetQualityScore: totalSupervisors > 0 ? Math.round((scoreSum / totalSupervisors) * 10) / 10 : 98.0,
    countyBreakdowns
  };
}

// One-click Simulator: Simulates an enumerator collecting data, supervisor cleaning it, and dispatching to Admin
export function simulateFieldToSupervisorToAdminFlow(targetCountyName?: string): {
  batch: CountyDispatchBatch;
  supervisor: CountySupervisor;
  newRecordsCount: number;
} {
  const supervisors = getStoredCountySupervisors();
  const county = targetCountyName
    ? supervisors.find(s => s.county.toLowerCase() === targetCountyName.toLowerCase()) || supervisors[0]
    : supervisors[Math.floor(Math.random() * supervisors.length)];

  const recordsCount = Math.floor(12 + Math.random() * 15);
  const sampleRecords = generateSampleCleanedRecords(county.county, county.countyCode, county, recordsCount);

  // Update supervisor stats
  county.totalCollected += recordsCount;
  county.totalCleaned += recordsCount;
  county.status = 'dispatched_to_office';
  county.lastActive = new Date().toISOString();

  const newBatch = dispatchCleanedDataToAdmin({
    county: county.county,
    supervisorId: county.id,
    supervisorName: county.name,
    supervisorBadge: county.badgeId,
    supervisorEmail: county.email,
    supervisorPhone: county.phone,
    title: `${county.county} Real-Time Field Verification & Ingestion Dossier`,
    records: sampleRecords,
    supervisorSignoff: `Simulated live data batch: ${recordsCount} records captured by ${county.assignedEnumerators.map(e => e.name).join(', ')}. All columns standardized, geofences checked, and dispatched to Central Office Admin.`
  });

  return {
    batch: newBatch,
    supervisor: county,
    newRecordsCount: recordsCount
  };
}

// Convert cleaned records into a flat tabular format ready for Dataset creation or Excel export
export function convertCountyCleanedRecordsToFlatData(records: CountyCleanedRecord[]): Record<string, any>[] {
  return records.map(r => ({
    Record_ID: r.recordId,
    County: r.county,
    County_Code: r.countyCode,
    Sub_County: r.subCounty,
    Ward: r.ward,
    Enumerator: r.enumeratorName,
    Collected_At: r.collectedAt,
    Supervisor: r.supervisorName,
    Cleaned_At: r.cleanedAt,
    Quality_Score: r.qualityScore,
    GPS_Lat: r.gps.lat,
    GPS_Lng: r.gps.lng,
    ...r.cleanedData
  }));
}

// Convenient Aliases
export const getCountySupervisors = getStoredCountySupervisors;
export const getCountyDispatches = getStoredCountyDispatches;
export const ALL_KENYA_COUNTIES = KENYA_COUNTIES;
