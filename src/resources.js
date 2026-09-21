// ===========================================================================
// resources.js -- THE DATA. This is the file you will edit most.
//
// It holds three kinds of thing:
//
//   1. The answer choices on the form (NEEDS, SITUATIONS, RESIDENCES)
//   2. The list of places that can help (RESOURCES)
//   3. The rules that decide which places match (matchResources)
//
// FACTS LIVE HERE, WORDS LIVE ELSEWHERE. English wording is here because it
// is the source of truth; the Spanish version of each entry is in
// resources.es.js, keyed by the same `id`. Phone numbers, addresses, and map
// coordinates exist in exactly one place -- here -- so the two languages can
// never disagree about a fact.
//
// THE IDS ARE MACHINE VALUES. `needs: ['food']` matches the checkbox whose
// id is 'food'. Those strings are never translated and never shown to
// anyone. Change a label freely; changing an id means updating every
// resource that uses it.
//
// A RESOURCE WITH EMPTY `needs` AND EMPTY `situations` WILL NEVER APPEAR on
// anyone's sheet. That is the most common mistake when adding one.
//
// See GUIDE.md for a worked example of adding a resource.
// ===========================================================================

// Community resource data for The Samaritan Inn, McKinney TX.
//
// EVERY phone number and address here was taken from the organization's own
// website or a public directory in August 2026. Sources are listed in
// SOURCES.md. Hours change often -- see VERIFIED_ON and the "call ahead"
// notice that gets printed on every sheet.
//
// `coords` came from OpenStreetMap geocoding and is used to draw the map.
//
// To edit this list you only need to change this file. Nothing else.

import { COMPASS_ES, t } from './i18n.js'

// Stored as a plain date so it can be printed in whichever language the sheet
// is in. Update this whenever someone re-checks the phone numbers.
export const VERIFIED_ON_ISO = '2026-08-05'

export function verifiedOn(lang = 'en') {
  const [y, m, d] = VERIFIED_ON_ISO.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const VERIFIED_ON = verifiedOn('en')

export const HOME_BASE = {
  name: 'The Samaritan Inn',
  address: '1514 N. McDonald St., McKinney, TX 75071',
  phone: '(972) 542-5302',
  coords: { lat: 33.218507, lon: -96.612044 },
}

// The questions on screen. `id` values are what resources match against.
export const SITUATIONS = [
  { id: 'senior', label: 'Senior (60 or older)' },
  { id: 'safety', label: 'Unsafe at home / abuse' },
  { id: 'family', label: 'Has children with them' },
  { id: 'veteran', label: 'Veteran' },
  { id: 'youth', label: 'Young person under 22' },
  { id: 'disability', label: 'Has a disability' },
  { id: 'homeless', label: 'No place to stay tonight' },
]

export const NEEDS = [
  { id: 'food', label: 'Food' },
  { id: 'shelter', label: 'A place to stay' },
  { id: 'rentutility', label: 'Help with rent or bills' },
  { id: 'medical', label: 'A doctor' },
  // Split from 'medical': the old combined "Doctor or dentist" box returned
  // only primary-care clinics, so anyone with a bad tooth got a sheet with no
  // dentist on it.
  { id: 'dental', label: 'A dentist' },
  { id: 'mental', label: 'Someone to talk to' },
  { id: 'id', label: 'ID or papers' },
  { id: 'legal', label: 'Legal help' },
  { id: 'clothing', label: 'Clothes or household items' },
  { id: 'benefits', label: 'Food stamps / Medicaid' },
  { id: 'transport', label: 'A ride' },
]

// Where the person lives. Several places serve only certain areas, so asking
// this stops the sheet sending someone to a clinic that will turn them away.
export const RESIDENCES = [
  { id: 'unknown', label: "Not sure, or no address right now" },
  { id: 'mckinney', label: 'McKinney' },
  { id: 'collin', label: 'Somewhere else in Collin County' },
  { id: 'plano', label: 'Plano' },
  { id: 'wylie', label: 'Wylie' },
  { id: 'outside', label: 'Outside Collin County' },
]

// Always printed at the top of the sheet, no matter what is selected.
export const EMERGENCY = [
  { name: 'Emergency', phone: '911', when: 'You are in danger right now, or someone is hurt' },
  { name: 'Suicide & Crisis Lifeline', phone: '988', when: 'You are thinking about hurting yourself, or in a mental health crisis. Free, 24 hours' },
  { name: '2-1-1 Texas', phone: '211', when: 'You are not sure who to call. They can look up any kind of help in Texas. Free, 24 hours' },
]

export const RESOURCES = [
  {
    id: 'saminn',
    name: 'The Samaritan Inn',
    category: 'Shelter & housing',
    what: 'Shelter for men, women, and families, plus three meals a day and a program to help you get back into your own housing.',
    address: '1514 N. McDonald St., McKinney, TX 75071',
    coords: { lat: 33.218507, lon: -96.612044 },
    phone: '(972) 542-5302',
    hours: 'Call for current intake times',
    say: 'I would like to ask about staying here. Can I set up an intake interview?',
    steps: [
      'You are here now. Ask anyone at the front desk to start an intake interview.',
      'If you are not here, call (972) 542-5302 and ask when the next intake time is.',
      'Come to your interview on time. Bring the papers listed below if you have them.',
    ],
    bring: [
      'Photo ID if you have one — come anyway if you do not',
      'Social Security card if you have it',
      'Names and birthdays of anyone staying with you',
      'Any paperwork about money you receive',
    ],
    notes: 'Not having ID does not disqualify you. Come and ask.',
    website: 'saminn.org',
    needs: ['shelter'],
    situations: ['homeless', 'family'],
    priority: 1,
  },
  {
    id: 'saminn-pantry',
    name: 'The Samaritan Inn Food Pantry',
    category: 'Food',
    what: 'Free groceries. You walk through and pick out your own food.',
    address: '1601 N. Waddill St., McKinney, TX 75069',
    coords: { lat: 33.212456, lon: -96.625856 },
    phone: '(972) 542-5302',
    hours: 'Tue, Wed, Thu 10:00 AM - 2:45 PM (closed 1:00-1:30 PM). Fri 9:00 AM - 1:45 PM',
    say: "I'm here for the food pantry. This is my first time.",
    steps: [
      'Go during open hours. They close 1:00-1:30 PM to restock, so do not arrive then.',
      'Check in at the desk and show your ID and proof of address. A photo on your phone is fine.',
      'Walk through and choose your own groceries.',
    ],
    bring: [
      'Photo ID',
      'Something with your address on it — a lease or a bill',
      'If you have no address, come anyway. They do not ask homeless neighbors for this.',
      'Bags or a cart if you have them',
    ],
    notes: 'Serves McKinney, Anna, Celina, Princeton, Prosper, Melissa, Farmersville and nearby towns.',
    website: 'saminn.org/food-pantry',
    serves: { excludeCities: ['plano', 'wylie'], area: 'North Collin County towns only' },
    needs: ['food'],
    situations: [],
    priority: 2,
  },
  {
    id: 'cfp-mckinney',
    name: 'Community Food Pantry of McKinney',
    category: 'Food',
    what: 'Free groceries and personal hygiene items. Set up like a small grocery store so you choose what your family will eat.',
    address: '307 Smith St., McKinney, TX 75069',
    coords: { lat: 33.203415, lon: -96.613434, approximate: true },
    phone: '(972) 547-4404',
    hours: 'Mon-Wed 11:00 AM - 3:30 PM. Thu 11:00 AM - 6:30 PM. Fri 10:00 AM - 12:30 PM',
    say: 'I need food for my household. What do I need to do to shop today?',
    steps: [
      'Go during open hours. Thursday stays open until 6:30 PM if you work during the day.',
      'Check in at the front desk and tell them it is your first visit.',
      'Shop the shelves yourself and pick what your family will actually eat.',
    ],
    bring: ['Photo ID', 'Proof of your address if you have it', 'Bags if you have them'],
    notes: '',
    website: 'mckinneyfoodpantry.org',
    needs: ['food'],
    situations: [],
    priority: 3,
  },
  {
    id: 'lifeline',
    name: 'Community Lifeline Center',
    category: 'Food & bills',
    what: 'Food pantry plus help paying bills when money is short.',
    address: '1601 N. Waddill St., Suite 102, McKinney, TX 75069',
    coords: { lat: 33.212456, lon: -96.625856 },
    phone: '(972) 542-0020',
    hours: 'Tue & Thu 8:30 - 11:30 AM and 1:00 - 2:30 PM',
    say: 'I need help with food and with a bill. Can you tell me what you need from me?',
    steps: [
      'Call (972) 542-0020 first. They are only open two days a week.',
      'Ask exactly which papers to bring so you do not have to make a second trip.',
      'Come during open hours on Tuesday or Thursday.',
    ],
    bring: ['Photo ID', 'The bill you need help with', 'Proof of income if you have it'],
    notes: 'Suite 102 — same street as the Samaritan Inn food pantry. Check the suite number so you go to the right door.',
    website: 'communitylifeline.org',
    needs: ['food', 'rentutility'],
    situations: [],
    priority: 4,
  },
  {
    id: 'hopes-door',
    name: "Hope's Door New Beginning Center",
    category: 'Safety from abuse',
    what: 'Free, private help if someone is hurting you or scaring you. A 24-hour phone line, emergency shelter, counseling, and help with court and protective orders.',
    address: 'Shelter address is kept secret for safety. Call the hotline first.',
    phone: '(972) 276-0057',
    phoneLabel: '24-hour hotline',
    altPhone: '(972) 422-2911',
    altPhoneLabel: 'Outreach office',
    hours: 'Hotline answers 24 hours a day, every day',
    say: "I'm not safe at home and I need to talk to someone.",
    steps: [
      'If you are in danger right this minute, call 911 first.',
      'Call the 24-hour hotline at (972) 276-0057. Use a phone the other person cannot check.',
      'You do not have to give your real name, and you do not have to decide anything on the call.',
      'Tell them what is happening. Then ask about whichever you want: a safety plan, a shelter bed, or help getting a protective order.',
    ],
    bring: ['Nothing. You only need a phone.'],
    notes: 'You do not have to leave home to get help from them. They serve all of Collin County.',
    website: 'hdnbc.org',
    needs: ['shelter'],
    situations: ['safety'],
    priority: 1,
  },
  {
    id: 'natl-dv',
    name: 'National Domestic Violence Hotline',
    category: 'Safety from abuse',
    what: 'Free and private. Someone to talk to any time, day or night, anywhere in the country.',
    address: 'Phone and online chat only',
    phone: '(800) 799-7233',
    hours: '24 hours a day, every day',
    say: 'I need to talk to someone about what is happening at home.',
    steps: [
      'Call (800) 799-7233, or text START to 88788 if talking out loud is not safe.',
      'Tell them what state you are in so they can find help near you.',
      'Ask for an interpreter if you would rather speak another language.',
    ],
    bring: ['Nothing. You only need a phone.'],
    notes: 'Clear your call and text history afterward if someone checks your phone.',
    website: 'thehotline.org',
    needs: [],
    situations: ['safety'],
    priority: 2,
  },
  {
    id: 'lifepath',
    name: 'LifePath Systems',
    category: 'Mental health',
    what: 'Counseling, mental health care, and help with addiction for Collin County. They have a crisis team that can come to you.',
    address: '1515 Heritage Dr., McKinney, TX 75069',
    coords: { lat: 33.212396, lon: -96.634104 },
    phone: '(877) 422-5939',
    phoneLabel: '24-hour crisis line',
    hours: 'Crisis line answers 24 hours a day. Office hours vary — call.',
    say: 'I need to see someone about my mental health. Can I get an appointment?',
    steps: [
      'Call (877) 422-5939. Someone answers any hour of the day or night.',
      'Say whether this is an emergency right now, or whether you want a regular appointment.',
      'Ask about the sliding fee scale. They help whether or not you can pay.',
      'If you cannot get there, ask about the mobile crisis team that comes to you.',
    ],
    bring: [
      'Photo ID',
      'Your medicine bottles, or a list of what you take',
      'Medicaid or insurance card if you have one',
    ],
    notes: 'This is the county mental health office for Collin County.',
    website: 'lifepathsystems.org',
    needs: ['mental'],
    situations: [],
    priority: 1,
  },
  {
    id: 'assistance-center',
    name: 'Assistance Center of Collin County',
    category: 'Rent & bills',
    what: 'Can pay up to three months of rent or utility bills if you hit a rough patch.',
    address: '900 18th St., Plano, TX 75074',
    coords: { lat: 33.023807, lon: -96.702651 },
    phone: '(972) 422-1850',
    phoneLabel: 'Assistance line',
    altPhone: '(972) 422-1125',
    altPhoneLabel: 'Office',
    hours: 'Call Mon-Thu 9:00 AM - 3:00 PM',
    say: "I'm behind on my rent and I live in Collin County. Can I apply for assistance?",
    steps: [
      'Call (972) 422-1850 between 9:00 AM and 3:00 PM, Monday through Thursday.',
      'Do not drive to Plano first. The application starts on the phone.',
      'Answer their questions. This phone call IS the application.',
      'If they can help, they will set a time for you to come in and meet a caseworker.',
      'Bring every paper listed below to that appointment.',
    ],
    bring: [
      'Photo ID',
      'The overdue bill, or the eviction notice',
      'Proof you live in Collin County — a lease or a utility bill',
      'Proof of income for everyone in the house',
    ],
    notes: 'You must live in Collin County to qualify.',
    website: 'assistancecenter.org',
    serves: { collinOnly: true, area: 'Collin County residents only' },
    needs: ['rentutility'],
    situations: [],
    priority: 1,
  },
  {
    id: 'salvation-army',
    name: 'Salvation Army of McKinney',
    category: 'Food, bills & clothing',
    what: 'Food, clothing, and help with rent and utility bills for families with low income.',
    address: '600 Wilson Creek Pkwy, McKinney, TX 75069',
    coords: { lat: 33.185797, lon: -96.62469 },
    phone: '(972) 542-6694',
    hours: 'Call for current hours',
    say: 'I need help with food and my bills. What day should I come, and what should I bring?',
    steps: [
      'Call (972) 542-6694 first. Their assistance hours were not published anywhere we could check.',
      'Ask what day to come and exactly which papers they need.',
      'Come on the day they tell you.',
    ],
    bring: ['Photo ID', 'The bills you need help with', 'Proof of income'],
    notes: '',
    website: 'salvationarmyntx.org',
    needs: ['food', 'rentutility', 'clothing'],
    situations: [],
    priority: 5,
  },
  {
    id: 'inn-style',
    name: 'Inn Style Resale Store (The Samaritan Inn)',
    category: 'Clothing & household',
    what: 'Low-cost clothes, furniture, and things for the house.',
    address: '1601 N. Waddill St., McKinney, TX 75069',
    coords: { lat: 33.212456, lon: -96.625856 },
    phone: '(972) 542-5302',
    hours: 'Tue-Fri 9:00 AM - 5:00 PM',
    say: 'Do you take vouchers from The Samaritan Inn?',
    steps: [
      'Ask your caseworker at The Samaritan Inn whether you can get a voucher first.',
      'Go Tuesday through Friday, 9:00 AM to 5:00 PM.',
      'Show your voucher at the register if you have one.',
    ],
    bring: ['Your voucher if a caseworker gave you one'],
    notes: '',
    website: 'saminn.org',
    needs: ['clothing'],
    situations: [],
    priority: 6,
  },
  {
    id: 'community-health-clinic',
    name: 'Community Health Clinic',
    category: 'Medical',
    what: 'Free doctor visits for adults and children with no insurance. Check-ups, diabetes, asthma, women\'s exams, school physicals, and help getting medicine.',
    address: '4510 Medical Center Dr., Suite 204, McKinney, TX 75069',
    coords: { lat: 33.172562, lon: -96.637201, approximate: true },
    phone: '(972) 547-0606',
    hours: 'Call for an appointment',
    say: "I don't have insurance. Do I qualify to become a patient here?",
    steps: [
      'Call (972) 547-0606 and ask if you qualify.',
      'They will ask what you earn and where you live. You must be in northern Collin County — not Plano, not Wylie.',
      'If you qualify, set an appointment. Do not walk in without one.',
      'Ask about the prescription assistance program if medicine costs are a problem.',
    ],
    bring: [
      'Photo ID',
      'Proof of income — pay stubs or a benefits letter',
      'A list of every medicine you take',
    ],
    notes: 'Free for uninsured people below 200% of the federal poverty level. No dental here.',
    website: 'chc-mckinney.com',
    serves: {
      collinOnly: true,
      excludeCities: ['plano', 'wylie'],
      area: 'Northern Collin County only - not Plano or Wylie',
    },
    needs: ['medical'],
    situations: [],
    priority: 1,
  },
  {
    id: 'hsnt',
    name: 'Health Services of North Texas',
    category: 'Medical',
    what: 'Regular doctor care, HIV care, medicine, counseling, and help with rides to appointments. They charge based on what you can afford.',
    address: '5501 Independence Pkwy, Suite 110, Plano, TX 75023',
    coords: { lat: 33.056437, lon: -96.75118 },
    phone: '(940) 381-1501',
    altPhone: '(800) 974-2437',
    altPhoneLabel: 'Toll free',
    hours: 'Call for an appointment',
    say: 'I need a doctor and I cannot pay full price. Do you have a sliding scale?',
    steps: [
      'Call (940) 381-1501, or (800) 974-2437 if that is a long distance call for you.',
      'Say you are a Collin County resident and ask for the sliding fee scale.',
      'Ask about help with a ride if getting to Plano is a problem.',
      'Set an appointment before you go.',
    ],
    bring: ['Photo ID', 'Proof of income', 'A list of your medicines'],
    notes: 'No dental here.',
    website: 'healthservicesntx.org',
    serves: { collinOnly: true, area: 'Collin County residents' },
    needs: ['medical'],
    situations: [],
    priority: 3,
  },
  {
    id: 'fhc-virginia',
    name: 'Family Health Center on Virginia',
    category: 'Medical & dental',
    what: 'A full clinic with doctors, a dentist for adults and children, and counselors, all in one building. What you pay is based on your income and family size.',
    address: '1620 W. Virginia St., McKinney, TX 75069',
    coords: { lat: 33.198079, lon: -96.630682 },
    phone: '(214) 618-5600',
    hours: 'Mon-Fri 7:45 AM - 12:00 PM and 1:00 PM - 4:45 PM. Closed weekends.',
    say: 'I need to see a dentist and I cannot pay full price. Do you have a sliding scale?',
    steps: [
      'Call (214) 618-5600 and ask for the sliding fee scale.',
      'Say whether you need the doctor, the dentist, or a counselor.',
      'Ask what papers to bring to prove your income - that is what sets your price.',
      'The dental office is in Suite 103 when you arrive.',
    ],
    bring: [
      'Photo ID',
      'Proof of income for everyone in your household',
      'Insurance or Medicaid card if you have one',
    ],
    notes: 'This is the main place in McKinney for adult dental work - fillings, pulling teeth, and dentures. They see you with or without insurance.',
    website: 'fhcntx.org',
    needs: ['medical', 'dental'],
    situations: [],
    priority: 1,
  },
  {
    id: 'collin-dental-hygiene',
    name: 'Collin College Dental Hygiene Clinic',
    category: 'Medical & dental',
    what: 'Low-cost teeth cleanings, x-rays, and gum care, done by students with instructors watching over them. The first screening visit is free.',
    address: '2200 W. University Dr., #A116, McKinney, TX 75071',
    coords: { lat: 33.217004, lon: -96.641217 },
    phone: '(972) 548-6537',
    hours: 'Mon-Fri 8:00 AM - 5:00 PM',
    say: 'I would like to make a screening appointment for the dental hygiene clinic.',
    steps: [
      'Call (972) 548-6537 and ask for a screening appointment. The screening is free.',
      'Go to the screening. They decide there whether they can take you as a patient.',
      'If they accept you, they will schedule your cleaning.',
      'Bring cash or a debit/credit card to the cleaning visit. They do not take checks.',
    ],
    bring: ['Photo ID', 'Cash or a debit/credit card for the cleaning visit'],
    notes: 'IMPORTANT: cleanings and gum care only. They do NOT do fillings, pull teeth, or make dentures. If a tooth hurts or is broken, call Family Health Center on Virginia instead.',
    website: 'collin.edu/dentalhygiene',
    needs: ['dental'],
    situations: [],
    priority: 3,
  },
  {
    id: 'commongood',
    name: 'CommonGood Medical',
    category: 'Medical',
    what: 'Free doctor visits, eye care, and mental health care for Collin County residents with no insurance. They also help pay for your prescriptions.',
    address: '103 E. Lamar St., McKinney, TX 75069',
    coords: { lat: 33.200638, lon: -96.615677 },
    phone: '(469) 712-4246',
    hours: 'Mon-Fri 8:30 AM - 5:00 PM. Sat 10:00 AM - 3:00 PM.',
    say: "I don't have insurance and I live in Collin County. Can I become a patient?",
    steps: [
      'Call (469) 712-4246 and ask if you qualify.',
      'They will ask about your income. You need to be at or under twice the federal poverty level.',
      'Ask about help paying for your medicines - they cover part or all of the cost.',
      'They are open Saturday mornings, which helps if you cannot miss work on a weekday.',
    ],
    bring: ['Photo ID', 'Proof of income', 'A list of every medicine you take'],
    notes: 'No dental here, but they do cover eye care and glasses. Used to be called Hope Clinic of McKinney.',
    website: 'commongoodmedical.org',
    serves: { collinOnly: true, area: 'Collin County residents only' },
    needs: ['medical'],
    situations: [],
    priority: 2,
  },
  {
    id: 'hrm-bridge',
    name: 'Hope Restored Missions - Bridge to Hope',
    category: 'ID & papers',
    what: 'Help replacing the papers you need before anyone else can help you: birth certificate, Social Security card, and driver\'s license. They also make temporary photo IDs.',
    address: '1947 K Ave., Plano, TX 75074',
    coords: { lat: 33.027612, lon: -96.698986 },
    phone: '(214) 501-2181',
    hours: 'Call for hours',
    say: 'I lost my ID and I need help replacing it. Can you help me?',
    steps: [
      'Call (214) 501-2181 and say which papers you are missing.',
      'Ask about a temporary photo ID if you need something to show people right away.',
      'They can help pay the fees and fill out the forms with you.',
      'Start here first if you have no ID. Almost every other place on this sheet will ask for one.',
    ],
    bring: [
      'Any papers you still have, even expired ones',
      'Anything you remember: your date of birth, where you were born, your parents\' names',
    ],
    notes: 'They are the only agency in Collin County that issues a temporary photo ID. Getting your papers back usually unlocks housing, benefits, and work.',
    website: 'hoperestoredmissions.org/bridge',
    needs: ['id'],
    situations: ['homeless'],
    priority: 1,
  },
  {
    id: 'texas-free-id',
    name: 'Free birth certificate and ID if you are homeless',
    category: 'ID & papers',
    what: 'Texas law says that if you are homeless you can get a copy of your birth certificate for free, and a Texas ID card without paying the fee. Most people are never told this.',
    address: 'Apply at a county clerk or local registrar office',
    phone: '211',
    hours: '2-1-1 answers 24 hours a day',
    say: 'I am homeless and I need a free copy of my birth certificate. Where do I apply?',
    steps: [
      'Ask a caseworker here for the "Certification of Homeless Status" form from Texas DSHS. It is free to download.',
      'A shelter, school, or agency staff member signs the form to confirm your situation.',
      'Take the signed form with your birth certificate application to a county clerk or local registrar. The fee is waived.',
      'Once you have the birth certificate, apply for a Texas ID card - that fee is waived too.',
      'Call 2-1-1 if you need help finding the nearest office.',
    ],
    bring: [
      'The signed Certification of Homeless Status form',
      'Any ID or papers you still have',
    ],
    notes: 'Young people under 18 can do this without a parent signing or even knowing. Ask staff here to help - this is a normal thing for them to sign.',
    website: 'dshs.texas.gov/vital-statistics',
    needs: ['id'],
    situations: ['homeless', 'youth'],
    priority: 2,
  },
  {
    id: 'legal-aid',
    name: 'Legal Aid of NorthWest Texas',
    category: 'Legal help',
    what: 'Free lawyers for people who cannot afford one. Eviction, custody, protective orders, benefits that got cut off, and other non-criminal problems.',
    address: '901 N. McDonald St., McKinney, TX 75069',
    coords: { lat: 33.210329, lon: -96.612494 },
    phone: '(972) 542-9405',
    phoneLabel: 'McKinney office',
    altPhone: '(888) 529-5277',
    altPhoneLabel: 'Legal Aid Line',
    hours: 'Call for office hours and walk-in clinic times',
    say: 'I need free legal help with an eviction. Do I qualify, and when is your next clinic?',
    steps: [
      'Call the Legal Aid Line at (888) 529-5277, or the McKinney office at (972) 542-9405.',
      'Say right away if you already have a court date, and say the date. That moves you up the list.',
      'Tell them what kind of case it is and what your income is.',
      'Ask when the next walk-in clinic at the Collin County courthouse is held.',
      'Bring every single paper you have been given about your case.',
    ],
    bring: [
      'Every court paper and notice you have received — even ones you do not understand',
      'Your lease, if this is about housing',
      'Photo ID',
      'Proof of income',
    ],
    notes: 'Do not wait. Legal deadlines are short and missing one can cost you the case.',
    website: 'legalaidtx.org',
    needs: ['legal'],
    situations: [],
    priority: 1,
  },
  {
    id: 'meals-on-wheels',
    name: 'Collin County Committee on Aging / Meals on Wheels',
    category: 'Senior services',
    what: 'A hot meal delivered to your home every weekday if you cannot easily get out. They also help seniors find other benefits they qualify for.',
    address: '600 N. Tennessee St., McKinney, TX 75069',
    coords: { lat: 33.202315, lon: -96.61489 },
    phone: '(972) 562-6996',
    hours: 'Meals delivered Mon-Fri at midday',
    say: "I'd like to find out if I can get meals delivered to my home.",
    steps: [
      'Call (972) 562-6996 and ask for an eligibility assessment.',
      'They will ask about your age and how easily you can get out of the house.',
      'If you CAN get out, ask instead about lunch at the McKinney Senior Recreation Center.',
      'For that lunch, sign up ahead by calling (972) 547-7491. Meals are served at 11:00 AM on weekdays.',
    ],
    bring: ['Nothing to call. Have your address and date of birth ready.'],
    notes: 'Suggested donation for age 60 and older. Ask about it — nobody is turned away.',
    website: 'cccoaweb.org',
    needs: ['food'],
    situations: ['senior'],
    priority: 1,
  },
  {
    id: 'collin-transit',
    name: 'Collin County Transit (DART)',
    category: 'Transportation',
    what: 'Low-cost shared rides to the grocery store, the doctor, the senior center, and other places around town.',
    address: 'Rides are booked by phone or the GoPass app',
    phone: '(214) 979-1111',
    altPhone: '(469) 771-0667',
    altPhoneLabel: 'To find out if you qualify',
    hours: 'Call for service hours',
    say: 'I want to sign up for Collin County Transit. Do I qualify?',
    steps: [
      'Call (469) 771-0667 FIRST to find out if you qualify and to enroll.',
      'You cannot just show up for a ride. Enrollment has to happen before your first trip.',
      'Once you are enrolled, book rides by calling (214) 979-1111 or using the GoPass app.',
      'Book at least a day ahead when you can. Rides are shared, so allow extra time.',
    ],
    bring: ['Proof of age, disability, or income when you enroll'],
    notes: 'For people 65 or older, people with a disability, or people with low income living in McKinney, Celina, Lowry Crossing, Melissa, Princeton, or Prosper.',
    website: 'dart.org',
    serves: {
      collinOnly: true,
      excludeCities: ['plano', 'wylie'],
      area: 'McKinney, Celina, Lowry Crossing, Melissa, Princeton, Prosper',
    },
    needs: ['transport'],
    situations: ['senior', 'disability'],
    priority: 1,
  },
  {
    id: 'city-house',
    name: 'City House',
    category: 'Youth services',
    what: 'The only place in Collin County that shelters children and young people on their own. Emergency shelter for ages 0-22, housing for young adults 18-21, plus food, showers, laundry, and bus passes at their resource center.',
    address: '902 E. 16th St., Plano, TX 75074',
    coords: { lat: 33.021298, lon: -96.702667 },
    phone: '(972) 424-4626',
    altPhone: '(972) 971-0278',
    altPhoneLabel: 'After 5:00 PM',
    hours: 'Resource center weekdays 10:00 AM - 4:00 PM. Shelter staffed 24 hours.',
    say: "I'm [your age] and I don't have a safe place to stay tonight.",
    steps: [
      'Call (972) 424-4626 during the day, or (972) 971-0278 after 5:00 PM.',
      'Tell them your age right away — it decides which of their programs fits you.',
      'If you have brothers or sisters with you, say so. They work hard to keep siblings together.',
      'Ask about the Youth Resource Center for food, a shower, laundry, and bus passes — weekdays 10:00 AM to 4:00 PM.',
    ],
    bring: ['Nothing is required. Come as you are.'],
    notes: '',
    website: 'cityhouse.org',
    needs: ['shelter'],
    situations: ['youth'],
    priority: 1,
  },
  {
    id: 'veterans',
    name: 'Collin County Veterans Services Office',
    category: 'Veteran services',
    what: 'Free help filing for VA benefits you earned — disability payments, health care, pension, and survivor benefits.',
    address: '900 E. Park Blvd., Plano, TX 75074',
    coords: { lat: 33.030124, lon: -96.70271 },
    phone: '(972) 881-3060',
    hours: 'Mon-Fri 8:00 AM - 12:00 PM and 1:00 PM onward',
    say: "I'm a veteran and I want help filing a claim for my benefits.",
    steps: [
      'Call (972) 881-3060 to make an appointment. They break for lunch at noon.',
      'Ask them to check every benefit you might qualify for, not just the one you called about.',
      'Bring your DD-214 discharge paper. If you do not have it, say so — they can request a copy for you.',
      'This service is free. Never pay anyone to file a VA claim for you.',
    ],
    bring: [
      'DD-214 discharge paper if you have it',
      'Photo ID',
      'Any letters you have received from the VA',
      'Marriage or birth certificates if you are filing for family benefits',
    ],
    notes: '',
    website: 'collincountytx.gov',
    needs: [],
    situations: ['veteran'],
    priority: 1,
  },
  {
    id: 'benefits-211',
    name: 'Your Texas Benefits (through 2-1-1)',
    category: 'Food stamps & Medicaid',
    what: 'Apply for SNAP (food stamps), Medicaid, CHIP children\'s insurance, and TANF cash help.',
    address: 'Apply by phone or online at YourTexasBenefits.com',
    phone: '211',
    altPhone: '(877) 541-7905',
    altPhoneLabel: 'If 211 will not connect',
    hours: '24 hours a day, every day',
    say: 'I want to apply for SNAP food benefits.',
    steps: [
      'Dial 211 from any phone. Pick your language, then press 2.',
      'Or apply yourself online at YourTexasBenefits.com.',
      'Have the papers below in front of you before you call — they will ask for the numbers.',
      'Ask a caseworker here to sit with you if the phone menu is confusing. That is a normal thing to ask for.',
    ],
    bring: [
      'Social Security numbers for everyone applying',
      'Proof of income — pay stubs or a benefits letter',
      'How much you pay for rent and utilities',
      'Photo ID',
    ],
    notes: 'Free. Nobody should ever charge you to apply for these benefits.',
    website: 'YourTexasBenefits.com',
    needs: ['benefits', 'food'],
    situations: [],
    priority: 2,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Builds a Google Maps link that gives real turn-by-turn directions from The
// Samaritan Inn to the resource. We do not write out driving directions by
// hand -- guessing street turns would be worse than useless for someone
// standing at a bus stop.
export function directionsUrl(resource) {
  if (!resource.address || !/\d/.test(resource.address)) return null
  return (
    'https://www.google.com/maps/dir/?api=1&origin=' +
    encodeURIComponent(HOME_BASE.address) +
    '&destination=' +
    encodeURIComponent(resource.address)
  )
}

const MILES_PER_DEG_LAT = 69.0

// Convert a lat/lon into miles east/north of The Samaritan Inn. Flat-earth
// approximation, which is accurate to well under a percent across a county.
export function offsetMiles(coords) {
  if (!coords) return null
  const lat0 = (HOME_BASE.coords.lat * Math.PI) / 180
  return {
    east: (coords.lon - HOME_BASE.coords.lon) * MILES_PER_DEG_LAT * Math.cos(lat0),
    north: (coords.lat - HOME_BASE.coords.lat) * MILES_PER_DEG_LAT,
  }
}

// Pulls "McKinney" out of "1601 N. Waddill St., McKinney, TX 75069" so the map
// can label each cluster of pins with the town it is in.
export function cityOf(address) {
  if (!address) return null
  const m = address.match(/,\s*([A-Za-z][A-Za-z .'-]*?),\s*TX/)
  return m ? m[1].trim() : null
}

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']

// "about 1.2 miles southwest" -- straight line, not driving distance.
// Built from the phrase table so Spanish reads "a unas 1.2 millas al suroeste"
// rather than English word order with Spanish words dropped in.
export function distanceLabel(resource, lang = 'en') {
  const off = offsetMiles(resource.coords)
  if (!off) return null
  const miles = Math.hypot(off.east, off.north)
  if (miles < 0.1) return t(lang, 'youAreHereShort')
  const angle = (Math.atan2(off.east, off.north) * 180) / Math.PI
  const dir = COMPASS[Math.round(((angle + 360) % 360) / 45) % 8]
  const rounded = miles < 10 ? miles.toFixed(1) : Math.round(miles)
  const singular = miles < 1.05 && miles >= 0.95
  return t(lang, 'aboutMiles', {
    n: rounded,
    unit: t(lang, singular ? 'pdfMile' : 'pdfMiles'),
    dir: lang === 'es' ? COMPASS_ES[dir] : dir,
  })
}

// Would this place actually serve someone who lives here? Answering "not sure"
// hides nothing -- it is better to print an extra place than to silently drop
// one because we guessed wrong about where the person lives.
export function servesResident(resource, residence) {
  const s = resource.serves
  if (!s || !residence || residence === 'unknown') return true
  if (s.collinOnly && residence === 'outside') return false
  if (s.excludeCities?.includes(residence)) return false
  return true
}

// Picks the resources that match what the case worker checked off.
// A resource is included when it matches ANY selected need or situation, and
// the person is not obviously ineligible for it.
//
// Returns both lists: `excluded` is shown on screen so staff can see what was
// left off and why, rather than the sheet quietly shrinking.
// `pool` defaults to the built-in list. The app passes in the effective list
// instead -- built-ins with any staff edits applied, plus anything staff have
// added through Staff Tools.
export function matchResources(
  selectedNeeds,
  selectedSituations,
  residence = 'unknown',
  pool = RESOURCES
) {
  const needs = new Set(selectedNeeds)
  const situations = new Set(selectedSituations)

  const byCategory = (a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category)
    return a.priority - b.priority
  }

  const hits = pool.filter((r) => {
    const needHit = r.needs.some((n) => needs.has(n))
    const situationHit = r.situations.some((s) => situations.has(s))
    return needHit || situationHit
  })

  return {
    resources: hits.filter((r) => servesResident(r, residence)).sort(byCategory),
    excluded: hits.filter((r) => !servesResident(r, residence)).sort(byCategory),
  }
}
