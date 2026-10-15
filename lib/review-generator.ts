// lib/review-generator.ts
/**
 * Combinatorial Review Generator for Hanva Billing
 * 
 * Generates natural, diverse, keyword-rich salon reviews using modular
 * sentence components. Yields 150,000+ unique permutations so no two
 * customers post identical text on Google Reviews, preventing spam flags.
 */

export interface ReviewContext {
  businessName: string
  serviceName?: string
  staffName?: string
}

export interface ReviewChip {
  id: string
  label: string
  phrase: string
}

export const SMART_REVIEW_CHIPS: ReviewChip[] = [
  { id: "hygiene", label: "✨ Clean & Hygienic", phrase: "Spotless cleanliness and great hygiene standards." },
  { id: "staff", label: "✂️ Skilled Staff", phrase: "The staff is highly skilled and attentive." },
  { id: "relaxing", label: "💆 Relaxing Vibe", phrase: "Very peaceful and relaxing atmosphere." },
  { id: "ontime", label: "⏱️ On Time", phrase: "Prompt appointment with zero waiting time." },
  { id: "value", label: "💰 Great Value", phrase: "Reasonable prices for such premium quality." },
  { id: "polite", label: "😊 Warm Hospitality", phrase: "Super polite and welcoming team." },
]

const OPENINGS = [
  "Had an incredible experience at {businessName}!",
  "Visited {businessName} today and I am beyond impressed!",
  "Always a pleasure getting pampered at {businessName}.",
  "Hands down the best salon experience I've had in a long time at {businessName}.",
  "Super happy with my visit to {businessName}!",
  "Can't say enough good things about {businessName}.",
  "Just finished my appointment at {businessName} and I'm thrilled with the results!",
  "First time visiting {businessName} and they exceeded all my expectations.",
  "{businessName} has officially become my go-to salon!",
  "Truly exceptional hospitality and service at {businessName}.",
  "Such a relaxing and wonderful experience at {businessName}.",
  "If you're looking for top-notch salon care, {businessName} is the place to go.",
  "Five-star treatment from the moment I stepped into {businessName}.",
  "Loved every bit of my time at {businessName}.",
  "Came to {businessName} on a recommendation and they did not disappoint!",
  "Really satisfied with the quality of care at {businessName}.",
  "{businessName} never fails to deliver amazing results.",
  "Top-tier salon experience at {businessName}!",
  "My visit to {businessName} was smooth, professional, and refreshing.",
  "Great vibe and stellar service at {businessName}!",
  "Found my new favorite beauty spot at {businessName}.",
  "Loved the personalized attention and warmth at {businessName}.",
  "Impressed with the professionalism and skill at {businessName}.",
  "A truly 5-star experience from start to finish at {businessName}!",
  "Everything about my appointment at {businessName} was on point.",
  "Such warm and welcoming service at {businessName}.",
  "So happy I chose {businessName} for my self-care day.",
  "High quality, reasonable pricing, and amazing work at {businessName}.",
  "Stepped out of {businessName} feeling completely refreshed and pampered.",
  "Consistent quality and warm hospitality every single time at {businessName}.",
  "Outstanding service and a great team at {businessName}!",
  "One of the best salon experiences in the area at {businessName}.",
  "The attention to detail at {businessName} is second to none.",
  "Flawless service and very polite staff at {businessName}.",
  "Can definitely vouch for the expertise and standard at {businessName}."
]

const SERVICE_STAFF_VARIANTS = [
  (ctx: ReviewContext) => ctx.serviceName && ctx.staffName
    ? `The ${ctx.serviceName} by ${ctx.staffName} was done to absolute perfection.`
    : null,
  (ctx: ReviewContext) => ctx.serviceName && ctx.staffName
    ? `Special thanks to ${ctx.staffName} for the wonderful ${ctx.serviceName} — truly an expert!`
    : null,
  (ctx: ReviewContext) => ctx.serviceName && ctx.staffName
    ? `${ctx.staffName} was so patient and attentive during my ${ctx.serviceName}. Nailed the look completely.`
    : null,
  (ctx: ReviewContext) => ctx.serviceName && ctx.staffName
    ? `Got a ${ctx.serviceName} with ${ctx.staffName} and the results speak for themselves.`
    : null,
  (ctx: ReviewContext) => ctx.serviceName && ctx.staffName
    ? `${ctx.staffName} did an incredible job with the ${ctx.serviceName}. Very gentle and meticulous.`
    : null,
  (ctx: ReviewContext) => ctx.staffName
    ? `Special shoutout to ${ctx.staffName} for being so attentive, polite, and skilled.`
    : null,
  (ctx: ReviewContext) => ctx.staffName
    ? `${ctx.staffName} is a master of their craft — listened patiently and delivered exactly what I wanted.`
    : null,
  (ctx: ReviewContext) => ctx.staffName
    ? `Huge appreciation for ${ctx.staffName}'s expertise, patience, and friendly demeanor.`
    : null,
  (ctx: ReviewContext) => ctx.staffName
    ? `${ctx.staffName} made sure I felt comfortable throughout the entire session.`
    : null,
  (ctx: ReviewContext) => ctx.serviceName
    ? `The ${ctx.serviceName} was worth every penny — feeling so good!`
    : null,
  (ctx: ReviewContext) => ctx.serviceName
    ? `Loved the precision and care taken during my ${ctx.serviceName}.`
    : null,
  (ctx: ReviewContext) => ctx.serviceName
    ? `The quality of products and techniques used for the ${ctx.serviceName} was top tier.`
    : null,
  () => "The staff is super skilled, attentive, and genuinely cares about customer satisfaction.",
  () => "They take their time to understand your needs and give honest, customized recommendations.",
  () => "The stylists really know their craft and use authentic, high-grade products.",
  () => "Every step of the service was carried out with utmost precision and care.",
  () => "Appreciated the thorough consultation and personalized suggestions from the team.",
  () => "The whole team is well-trained, courteous, and very respectful of your time.",
  () => "Professional techniques, gentle touch, and great attention to detail throughout.",
  () => "They listened carefully to what I had in mind and executed it flawlessly.",
  () => "The staff took great care and ensured I was 100% satisfied with the outcome.",
  () => "Expert staff who clearly take pride in their work and provide honest guidance."
]

const AMBIANCE_VARIANTS = [
  "The salon is squeaky clean, sanitized, and has a very calming vibe.",
  "Spotless hygiene, soothing music, and a very relaxing ambiance.",
  "Loved the clean aesthetic, proper hygiene standards, and welcoming environment.",
  "The atmosphere is serene, peaceful, and beautifully maintained.",
  "Very well-organized, hygienic stations, and pleasant ambiance all around.",
  "From cleanliness to punctuality, everything was properly taken care of.",
  "Spacious, comfortable seating and very tidy work areas.",
  "Clean equipment, fresh towels, and strict sanitization practices in place.",
  "Relaxing vibe with great aesthetics and zero unnecessary waiting time.",
  "Modern setup with a warm, cozy feel that makes you instantly unwind.",
  "Very neat, well-ventilated, and strictly maintains hygiene protocols.",
  "Super pleasant environment that makes the whole experience so relaxing."
]

const CLOSINGS = [
  "Highly recommend to anyone looking for quality salon care! ✨",
  "Will definitely be back for my next appointment soon.",
  "10/10 experience — already recommended them to my friends and family!",
  "Worth every single rupee. Five stars well deserved! ⭐⭐⭐⭐⭐",
  "Booking my next visit already. Keep up the great work guys! 👏",
  "Can't wait to come back. Definitely give them a try!",
  "Solid 5-star experience from start to finish! 🌟",
  "You won't regret visiting — easily one of the best salons around.",
  "Definitely my regular salon from now on!",
  "A must-visit if you value hygiene and top-notch styling.",
  "Thank you for the wonderful pampering session! 😊",
  "Totally impressed and will be returning very soon!",
  "Huge thumbs up to the entire team! 👍",
  "Leaving with a big smile on my face. Highly recommended!",
  "Such great value for money and premium service."
]

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generates a fresh, completely unique review tailored to the business and appointment context.
 */
export function generateSmartReview(ctx: ReviewContext): string {
  const businessName = ctx.businessName || "this salon"

  // 1. Pick Opening
  const rawOpening = getRandom(OPENINGS)
  const opening = rawOpening.replace(/\{businessName\}/g, businessName)

  // 2. Pick Service / Staff Detail
  // Filter variants that apply to this context
  const applicableDetails = SERVICE_STAFF_VARIANTS
    .map((fn) => fn(ctx))
    .filter((res): res is string => Boolean(res))
  
  const detail = applicableDetails.length > 0 ? getRandom(applicableDetails) : ""

  // 3. Decide style structure randomly
  // Structure 1: Opening + Detail + Ambiance + Closing (Detailed)
  // Structure 2: Opening + Detail + Closing (Concise)
  // Structure 3: Opening + Ambiance + Closing (Vibe-focused)
  const rand = Math.random()
  const closing = getRandom(CLOSINGS)

  if (rand < 0.45 && detail) {
    // 3-part review: Opening + Detail + Closing
    return `${opening} ${detail} ${closing}`
  } else if (rand < 0.8 && detail) {
    // 4-part review: Opening + Detail + Ambiance + Closing
    const ambiance = getRandom(AMBIANCE_VARIANTS)
    return `${opening} ${detail} ${ambiance} ${closing}`
  } else {
    // 3-part review: Opening + Ambiance + Closing
    const ambiance = getRandom(AMBIANCE_VARIANTS)
    return `${opening} ${ambiance} ${closing}`
  }
}
