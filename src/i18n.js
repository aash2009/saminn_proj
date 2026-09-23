// English-only string and label lookup. Spanish support was removed --
// t()/label() are kept as simple lookup functions (rather than deleted) so
// every existing call site in App.jsx and pdf.js keeps working untouched.

export const STRINGS = {
  appTitle: 'Resource Sheet Maker',
  appPlace: 'McKinney, Texas',
  lede: 'Check the boxes that fit the person you are helping. Then press the big green button to make a sheet you can print and hand to them.',
  optional: 'optional',

  qName: 'Their first name',
  qNameHelp: 'This just prints at the top of the sheet. You can leave it blank.',
  qNamePlaceholder: 'For example: Maria',
  qResidence: 'Where do they live?',
  qResidenceHelp: 'Some places only help people from certain towns. Answering this keeps them off the sheet so nobody gets sent across town to be turned away. If you are not sure, leave the first one picked.',
  qIncome: 'About how much do they make a month?',
  qIncomeHelp: 'This flags programs with income-based fees or limits. It is fine to pick "Prefer not to say."',
  qIdentities: 'Does anything else describe them?',
  qIdentitiesHelp: 'Check any that apply — this affects which places show up below, including shelter and safety resources. It is fine to check none.',
  qNeeds: 'What do they need?',
  qNeedsHelp: 'Check every one that fits.',
  qHangout: 'A place they usually spend time',
  qHangoutHelp: "If they don't have a fixed address, a landmark or intersection they know well lets us draw them a map. Totally optional.",
  qHangoutPlaceholder: 'For example: near the library on Wilmeth Rd',
  qNotes: 'Anything to add?',
  qNotesHelp: 'Write anything you want printed at the bottom of their sheet. For example, the name of the person they should ask for.',
  qNotesPlaceholder: 'For example: Ask for Dana at the front desk on Tuesday.',

  findOnMap: 'Find on map',
  locating: 'Looking it up…',
  locationFound: 'Got it — a map will be included on their sheet.',

  makeSheet: 'Make the resource sheet',
  needOneBox: 'Check at least one box above to continue.',
  matchedOne: '1 place matched.',
  matchedMany: '{n} places matched.',

  goBack: '← Go back and change',
  resultTitleOne: '1 place to send them to',
  resultTitleMany: '{n} places to send them to',
  sheetFor: 'Sheet for {name}',
  downloadPdf: 'Download the PDF',
  printNow: 'Print it now',
  startOver: 'Start over',

  excludedOne: '1 place was left off this sheet',
  excludedMany: '{n} places were left off this sheet',
  excludedBecause: 'because they do not serve people from {where}:',
  excludedOverride: 'If you know they would still be seen, change the answer to "Not sure" and the sheet will include everything.',
  limitedArea: 'limited service area',

  safetyTitle: 'Please read this first.',
  safetyScreen: 'If someone at home might see this paper and that could put them in danger, offer to hold it here, or help them write down just the phone numbers. Their safety comes first.',
  safetyPdf: 'If someone at home might see this paper and that could put you in danger, ask a staff member to hold it here for you, or write down just the phone numbers on something small. Your safety comes first.',

  emergencyHead: 'If you need help right now',
  placesHead: 'Places that can help',
  placesHeadPdf: 'Places that can help you',
  visitNotes: 'Notes from your visit',
  directions: 'directions',

  labelPhone: 'Phone',
  labelAlso: 'Also',
  labelWhere: 'Where',
  labelWhen: 'When',
  labelNote: 'Good to know',
  headSay: 'What to say when you call',
  headSteps: 'Step by step',
  headBring: 'Bring with you',
  headRequirements: 'For your situation',

  footVerified: 'Phone numbers and addresses were checked on {date}. Hours change often — always call before sending someone across town.',
  footPrivacy: 'Nothing typed about a client is saved or sent anywhere. It disappears when you press Start over or close the page.',
  staffTools: 'Staff Tools — add or edit the places on this list',

  pdfTitle: 'Your Resource Sheet',
  pdfPreparedFor: 'Prepared for: {name}',
  pdfPrinted: 'Printed {date}',
  pdfSafetyTitle: 'Please read this first',
  pdfMapTitle: 'Where these places are',
  pdfYouAreHere: '= YOU ARE HERE',
  pdfPinLegend: '= the places listed below',
  pdfMapCaption: 'Dashed rings show distance from where you told us you usually are. Straight-line positions - driving distance will be longer.',
  pdfRoadCredit: 'Roads (c) OpenStreetMap contributors',
  pdfDirections: 'Tap here for directions',
  pdfFooter: 'Please call before you go - hours change. Information checked {date}.',
  pdfPage: 'Page {n} of {total}',
  pdfMile: 'mile',
  pdfMiles: 'miles',
  pdfMiShort: 'mi',
  distanceOf: '{dist} of The Samaritan Inn',
  aboutMiles: 'about {n} {unit} {dir}',
  youAreHereShort: 'you are here',
}

export function t(key, vars) {
  let s = STRINGS[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

// Label for an answer choice. There is no translation table anymore, so this
// just returns whatever label the caller already has.
export function label(kind, id, fallback) {
  return fallback
}

// Both kept as identity functions so App.jsx / pdf.js don't need editing.
export function localizeResource(resource) {
  return resource
}

export function localizeEmergency(list) {
  return list
}
