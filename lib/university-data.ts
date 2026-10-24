export interface Lesson {
  id: string
  title: string
  duration: string
  type: "video" | "document" | "audio"
  videoUrl?: string
  content: string
  keyTakeaways: string[]
  resources?: { name: string; url?: string; type: string }[]
}

export interface CourseModule {
  id: string
  title: string
  lessons: Lesson[]
}

export interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface Course {
  id: string
  title: string
  description: string
  category: "Business" | "Styling" | "Customer Service" | "Marketing" | "Aesthetics" | "Finance"
  level: "Beginner" | "Intermediate" | "Advanced"
  type: "video" | "document" | "audio"
  instructor: string
  instructorRole: string
  duration: string
  lessonsCount: number
  rating: number
  studentsCount: number
  modules: CourseModule[]
  quiz: QuizQuestion[]
  badgeTitle: string
  // User progress fields
  progress: number
  status: "not_started" | "in_progress" | "completed"
  completedLessonIds: string[]
  quizScore?: number | null
  certificateId?: string | null
}

export interface Certificate {
  id: string
  certificateId: string
  studentName: string
  courseId: string
  courseTitle: string
  score: number
  issueDate: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earned: boolean
  earnedDate?: string
}

export interface UniversityData {
  courses: Course[]
  stats: {
    coursesCompleted: number
    hoursLearned: number
    certificatesEarned: number
    averageScore: number
  }
  certificates: Certificate[]
  achievements: Achievement[]
  userName: string
}

// Master Course Catalog
export const INITIAL_COURSES: Omit<Course, "progress" | "status" | "completedLessonIds">[] = [
  {
    id: "salon-mgmt-fundamentals",
    title: "Salon Management Fundamentals",
    description: "Master everyday salon operations, inventory control, staff scheduling, and front-desk protocol to maximize efficiency.",
    category: "Business",
    level: "Beginner",
    type: "video",
    instructor: "Sarah Johnson",
    instructorRole: "International Salon Operations Consultant",
    duration: "2.5 hours",
    lessonsCount: 6,
    rating: 4.8,
    studentsCount: 1420,
    badgeTitle: "Operations Specialist",
    modules: [
      {
        id: "mod-1",
        title: "Module 1: Front Desk & Opening Procedures",
        lessons: [
          {
            id: "l-101",
            title: "Daily Salon Opening & Cash Register Reconciliation",
            duration: "18 mins",
            type: "video",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            content: "Establish a foolproof morning routine. Learn to count opening floats, verify point-of-sale receipt rolls, and inspect station hygiene before the first guest walks in.",
            keyTakeaways: [
              "Always count cash registers with dual sign-off.",
              "Inspect stations 30 minutes prior to first client appointment.",
              "Check automated appointment confirmation lists on Hanva Billing."
            ],
            resources: [
              { name: "Daily Opening Checklist.pdf", type: "PDF" },
              { name: "Cash Drawer Reconciliation Form.xlsx", type: "Sheet" }
            ]
          },
          {
            id: "l-102",
            title: "Client Check-in, Waitlist & Consultation Flow",
            duration: "22 mins",
            type: "video",
            content: "Seamlessly welcome arriving clients, update wait times on digital boards, and transition clients to stylists with complete service intake notes.",
            keyTakeaways: [
              "Acknowledge arriving clients within 10 seconds of entering.",
              "Log customer allergies and scalp sensitivities in Hanva Customer Profiles.",
              "Offer refreshment options during consultation."
            ]
          }
        ]
      },
      {
        id: "mod-2",
        title: "Module 2: Inventory & Supply Control",
        lessons: [
          {
            id: "l-103",
            title: "Automated Consumption & Backbar Stock Control",
            duration: "25 mins",
            type: "video",
            content: "Prevent product waste. Learn how automatic service consumption deductions in Hanva Billing preserve your bottom line on developer, bleach, and shampoo.",
            keyTakeaways: [
              "Weigh color bowls before and after application to track grams used.",
              "Set minimum stock alerts in inventory settings.",
              "Conduct weekly audits of high-shrinkage retail items."
            ],
            resources: [
              { name: "Backbar Product Usage Guide.pdf", type: "PDF" }
            ]
          },
          {
            id: "l-104",
            title: "Supplier Ordering & Receiving Protocols",
            duration: "15 mins",
            type: "document",
            content: "How to negotiate bulk vendor terms, check inbound shipments against purchase orders, and inspect batch expiry dates.",
            keyTakeaways: [
              "Never accept stock with damaged seal or missing lot numbers.",
              "Negotiate payment credit windows with verified beauty distributors."
            ]
          }
        ]
      },
      {
        id: "mod-3",
        title: "Module 3: Staff Roster & Service Efficiency",
        lessons: [
          {
            id: "l-105",
            title: "Optimizing Chair Utilization & Service Gap Reduction",
            duration: "20 mins",
            type: "video",
            content: "Eliminate 15-minute idle dead zones between haircuts. Learn double-booking processing time strategies without burning out staff.",
            keyTakeaways: [
              "Use 30-minute color processing intervals for express blowdrys.",
              "Review appointment calendar spacing every evening."
            ]
          },
          {
            id: "l-106",
            title: "End of Day Closing & Financial Batch Reports",
            duration: "20 mins",
            type: "video",
            content: "Complete daily register closures, balance UPI/Card receipts, and export executive daily summary reports.",
            keyTakeaways: [
              "Match terminal settlement batch totals with Hanva Daily Sales report.",
              "Ensure all staff check-outs are signed off in Attendance."
            ]
          }
        ]
      }
    ],
    quiz: [
      {
        id: 1,
        question: "Within how many seconds should a guest be warmly acknowledged upon entering the salon?",
        options: ["Within 60 seconds", "Within 10 seconds", "Only when they approach the counter", "Within 5 minutes"],
        correctIndex: 1,
        explanation: "Industry standards dictate acknowledging clients within 10 seconds to build immediate rapport and hospitality."
      },
      {
        id: 2,
        question: "How can backbar product wastage be reduced most effectively?",
        options: [
          "By letting stylists estimate product amounts freely",
          "By weighing bowls and utilizing automated consumption deductions",
          "By purchasing only cheap unbranded products",
          "By diluting shampoo with tap water"
        ],
        correctIndex: 1,
        explanation: "Weighing color bowls and tracking automated service consumption on Hanva Billing cuts backbar shrinkage by up to 25%."
      },
      {
        id: 3,
        question: "What is the key advantage of utilizing processing-time double booking?",
        options: [
          "It maximizes chair utilization and stylist earning capacity without hurting quality",
          "It makes clients wait longer",
          "It eliminates the need for assistants",
          "It doubles product costs"
        ],
        correctIndex: 0,
        explanation: "Productive salons utilize 30-minute color processing intervals for quick haircuts or blowdrys, maximizing earnings."
      }
    ]
  },
  {
    id: "advanced-hair-color",
    title: "Advanced Hair Color & Balayage Masterclass",
    description: "Learn foilayage, root smudges, toner formulation, and chemical bond protection to deliver runway-ready transformations.",
    category: "Styling",
    level: "Advanced",
    type: "video",
    instructor: "Michael Chen",
    instructorRole: "L'Oréal Certified Master Colorist",
    duration: "3.5 hours",
    lessonsCount: 5,
    rating: 4.9,
    studentsCount: 980,
    badgeTitle: "Master Colorist",
    modules: [
      {
        id: "mod-color-1",
        title: "Module 1: Color Theory & Pre-Lightening",
        lessons: [
          {
            id: "l-201",
            title: "Color Wheel Dynamics & Neutralizing Underlying Pigments",
            duration: "30 mins",
            type: "video",
            content: "Deep dive into residual melanin at levels 7 through 10. Learn why blue-violet vs. violet toners make or break an icy blonde.",
            keyTakeaways: [
              "Level 8 always exposes yellow-gold undertones requiring violet-blue counteraction.",
              "Never tone on dry, porous hair without porosity equalization."
            ]
          },
          {
            id: "l-202",
            title: "Foilayage Placement & Feathering Techniques",
            duration: "40 mins",
            type: "video",
            content: "Sectioning patterns for maximum dimensional lift. Mastering the soft diagonal back subsectioning with zero harsh demarcation lines.",
            keyTakeaways: [
              "Hold brush at 45-degree angle when feathering near the root.",
              "Use lower volume developer with insulated foils for controlled lift."
            ]
          }
        ]
      },
      {
        id: "mod-color-2",
        title: "Module 2: Shadow Roots & Glossing",
        lessons: [
          {
            id: "l-203",
            title: "Root Melting & Seamless Transition Blends",
            duration: "35 mins",
            type: "video",
            content: "Application secrets for a lived-in root that grows out effortlessly for 4-6 months with no harsh lines.",
            keyTakeaways: [
              "Melt root formulation 1-2 inches down past the foil line.",
              "Comb gently with wide-tooth detangler to disperse tone."
            ]
          },
          {
            id: "l-204",
            title: "Acidic Demipermanent Gloss Formulations",
            duration: "25 mins",
            type: "video",
            content: "Locking the cuticle, restoring pH balance, and delivering mirror-like glass hair shine.",
            keyTakeaways: [
              "Acidic glosses maintain natural base without lifting virgin roots.",
              "Always process full 20 minutes for maximum longevity."
            ]
          },
          {
            id: "l-205",
            title: "Preserving Chemical Integrity & Post-Care Retail",
            duration: "20 mins",
            type: "video",
            content: "Pairing bond builders (Plex treatments) with take-home sulfate-free shampoo packs.",
            keyTakeaways: [
              "Include take-home color care in the transformation package price.",
              "Educate client on heat protectant essentials."
            ]
          }
        ]
      }
    ],
    quiz: [
      {
        id: 1,
        question: "Which undertone is exposed when lifting natural hair to a Level 8?",
        options: ["Red", "Orange", "Yellow-Gold", "Pale Yellow"],
        correctIndex: 2,
        explanation: "Level 8 exposes yellow-gold pigment, requiring violet-based counter-pigments to achieve neutral or cool tones."
      },
      {
        id: 2,
        question: "Why are acidic demi-permanent glosses preferred for toning balayage?",
        options: [
          "They seal the cuticle and do not lift or shift the natural base",
          "They permanently strip the hair cortex",
          "They lighten hair by 4 levels",
          "They dry out hair completely"
        ],
        correctIndex: 0,
        explanation: "Acidic glosses close down the hair cuticle and will not cause unwanted warmth on virgin roots."
      },
      {
        id: 3,
        question: "At what brush angle should color be applied when feathering balayage to avoid demarcation lines?",
        options: ["Flat 90 degrees", "45 degrees or vertical feathering", "Perpendicular", "Sideways scrubbing"],
        correctIndex: 1,
        explanation: "Holding the brush at a 45-degree angle feathers the lightener softly into the hair shaft."
      }
    ]
  },
  {
    id: "client-retention-sales",
    title: "Customer Service Excellence & Upselling Mastery",
    description: "Turn one-time visitors into loyal brand advocates. Learn consultation scripts, service upgrades, and client rebooking psychology.",
    category: "Customer Service",
    level: "Intermediate",
    type: "video",
    instructor: "Emma Davis",
    instructorRole: "Hospitality & Salon Sales Coach",
    duration: "2 hours",
    lessonsCount: 4,
    rating: 4.7,
    studentsCount: 2150,
    badgeTitle: "Retention Champion",
    modules: [
      {
        id: "mod-serv-1",
        title: "Module 1: The Transformational Consultation",
        lessons: [
          {
            id: "l-301",
            title: "Chairside Discovery: Open-Ended Questioning",
            duration: "20 mins",
            type: "video",
            content: "How to discover unspoken hair and skin concerns without sounding pushy or salesy.",
            keyTakeaways: [
              "Ask 'What frustrates you most about styling your hair at home?'",
              "Never ask yes/no questions during consultation."
            ]
          },
          {
            id: "l-302",
            title: "Offering Add-On Treatments at the Wash Basin",
            duration: "25 mins",
            type: "video",
            content: "How to introduce deep conditioning spa treatments, scalp detoxes, and gloss boosters naturally while client is relaxing.",
            keyTakeaways: [
              "Explain the benefit, not the chemical: 'This will restore moisture and cut blowdry time in half'.",
              "Quote the exact add-on price upfront to build trust."
            ]
          }
        ]
      },
      {
        id: "mod-serv-2",
        title: "Module 2: Checkout & Rebooking Psychology",
        lessons: [
          {
            id: "l-303",
            title: "The Rebooking Formula: Securing the Next Appointment",
            duration: "20 mins",
            type: "video",
            content: "Never ask 'Do you want to rebook today?'. Learn the stylist prescription technique that converts 70%+ of walkouts into scheduled appointments.",
            keyTakeaways: [
              "Say: 'To keep this haircut in shape, we should refresh your cut in 5 weeks. I have Tuesday the 14th open at 3 PM or Thursday at 5 PM.'",
              "Prescribe the appointment like a doctor prescribes medicine."
            ]
          },
          {
            id: "l-304",
            title: "De-escalating Unhappy Clients & Resolving Service Redos",
            duration: "20 mins",
            type: "video",
            content: "How to convert an unhappy customer into your biggest fan through proactive listening and immediate complimentary adjustments.",
            keyTakeaways: [
              "Listen fully without defending before offering solutions.",
              "Offer a complimentary adjustment with your senior director."
            ]
          }
        ]
      }
    ],
    quiz: [
      {
        id: 1,
        question: "Which of the following is the best way to invite a client to rebook?",
        options: [
          "'Do you want to make another appointment or will you call us later?'",
          "'To maintain this shape, I recommend refreshing in 5 weeks. Does Tuesday at 3 PM or Thursday at 5 PM work better?'",
          "'You don't need to rebook now.'",
          "'Our calendar is full for the next year.'"
        ],
        correctIndex: 1,
        explanation: "Providing two specific time options based on a maintenance timeline is the proven hospitality standard."
      },
      {
        id: 2,
        question: "When upselling an add-on treatment at the wash basin, what should always be stated?",
        options: [
          "Keep the price secret until final billing",
          "Clear explanation of the tangible benefits and exact add-on price upfront",
          "Tell them it is free even if it costs extra",
          "Apply the product without asking"
        ],
        correctIndex: 1,
        explanation: "Upfront transparency about benefits and exact price builds client trust and prevents checkout disputes."
      }
    ]
  },
  {
    id: "digital-marketing-salons",
    title: "Digital Marketing & WhatsApp Growth for Salons",
    description: "Fill empty chair slots on slow weekdays. Run high-ROI Meta ads, automate WhatsApp broadcasts, and leverage Google reviews.",
    category: "Marketing",
    level: "Intermediate",
    type: "video",
    instructor: "David Rodriguez",
    instructorRole: "Beauty Brand Growth Specialist",
    duration: "3 hours",
    lessonsCount: 4,
    rating: 4.6,
    studentsCount: 890,
    badgeTitle: "Growth Strategist",
    modules: [
      {
        id: "mod-mkt-1",
        title: "Module 1: Local SEO & Google Business Profile",
        lessons: [
          {
            id: "l-401",
            title: "Dominating 'Best Salon Near Me' Searches on Google Maps",
            duration: "30 mins",
            type: "video",
            content: "Optimize category tags, upload weekly salon photos, and automate 5-star review collection via Hanva SMS/WhatsApp review triggers.",
            keyTakeaways: [
              "Automate Google review request messages 30 minutes after POS checkout.",
              "Respond to all reviews (positive and critical) within 48 hours."
            ]
          },
          {
            id: "l-402",
            title: "Creating High-Converting Instagram Before & After Reels",
            duration: "25 mins",
            type: "video",
            content: "Lighting setups, ring light angles, and trending audio techniques to showcase hair and skin makeovers that go viral locally.",
            keyTakeaways: [
              "Always capture steady, clean 4K 60fps video with consistent salon backdrop.",
              "Tag the client and the stylist's handle in every reel."
            ]
          }
        ]
      },
      {
        id: "mod-mkt-2",
        title: "Module 2: WhatsApp Marketing & Retention Broadcasts",
        lessons: [
          {
            id: "l-403",
            title: "Win-Back Campaigns for 60-Day Inactive Clients",
            duration: "25 mins",
            type: "video",
            content: "How to segment dormant clients in Hanva Billing and dispatch personalized WhatsApp coupons that reactivate 18-22% of lapsed customers.",
            keyTakeaways: [
              "Use personalized client first names and dynamic coupon codes.",
              "Send messages between 11:00 AM and 1:30 PM on Wednesdays or Thursdays."
            ]
          },
          {
            id: "l-404",
            title: "Birthday & Anniversary VIP Rewards Automation",
            duration: "20 mins",
            type: "video",
            content: "Configure automatic birthday messages with a complimentary hair spa or styling upgrade that makes clients feel truly special.",
            keyTakeaways: [
              "Send birthday surprises 5 days before the actual date to allow booking.",
              "Make the gift valid for the entire birthday month."
            ]
          }
        ]
      }
    ],
    quiz: [
      {
        id: 1,
        question: "When is the most effective time to automatically trigger a Google review request to a salon customer?",
        options: [
          "2 weeks later",
          "At 2 AM in the morning",
          "30 to 60 minutes after their checkout while the excitement is fresh",
          "Never send review requests"
        ],
        correctIndex: 2,
        explanation: "Sending review links within 30-60 minutes captures the client's peak satisfaction right after seeing their new look."
      },
      {
        id: 2,
        question: "What is the benchmark reactivation rate for targeted 60-day win-back campaigns on WhatsApp?",
        options: ["0.5%", "15% to 22%", "95%", "0%"],
        correctIndex: 1,
        explanation: "Personalized WhatsApp win-back campaigns with an incentive consistently yield a 15-22% return booking rate."
      }
    ]
  },
  {
    id: "salon-financial-health",
    title: "Financial Management, P&L & Staff Commissions",
    description: "Understand your salon's true numbers. Calculate service margins, set tiered commission structures, and eliminate hidden leaks.",
    category: "Finance",
    level: "Advanced",
    type: "document",
    instructor: "Lisa Thompson",
    instructorRole: "CPA & Salon Financial Advisor",
    duration: "2.5 hours",
    lessonsCount: 4,
    rating: 4.9,
    studentsCount: 760,
    badgeTitle: "Financial Director",
    modules: [
      {
        id: "mod-fin-1",
        title: "Module 1: Profit & Loss Fundamentals",
        lessons: [
          {
            id: "l-501",
            title: "Calculating Cost of Goods Sold (COGS) per Treatment",
            duration: "25 mins",
            type: "document",
            content: "How to calculate your exact product cost per chemical service so you never undercharge for keratin or balayage treatments.",
            keyTakeaways: [
              "Target COGS below 10-12% for hair services and 15% for skin facials.",
              "Factor waste allowance into high-end smoothing treatments."
            ]
          },
          {
            id: "l-502",
            title: "Understanding Fixed vs. Variable Overhead Costs",
            duration: "20 mins",
            type: "document",
            content: "Rent, electricity, POS software, laundry, and licensing. How to determine your daily break-even threshold.",
            keyTakeaways: [
              "Calculate break-even revenue required per styling station per day.",
              "Benchmark rent expense at no more than 15% of gross revenue."
            ]
          }
        ]
      },
      {
        id: "mod-fin-2",
        title: "Module 2: Motivating Commission & Payroll Structures",
        lessons: [
          {
            id: "l-503",
            title: "Designing Escalating Tiered Commission Splits",
            duration: "30 mins",
            type: "video",
            content: "How to structure base salary + tiered incentives (e.g. 10% below ₹50k, 15% from ₹50k-₹100k, 20% above ₹100k) to drive high sales.",
            keyTakeaways: [
              "Tiers encourage stylists to cross-sell retail and high-value treatments.",
              "Track commissions transparently with Hanva Billing Payroll & Splits."
            ]
          },
          {
            id: "l-504",
            title: "Retail Product Commission vs. Service Commission",
            duration: "20 mins",
            type: "video",
            content: "Incentivize front-desk and stylists with 10-15% retail profit sharing to move product inventory fast.",
            keyTakeaways: [
              "Separate service targets from retail incentives.",
              "Pay out weekly or monthly retail bonuses on spot."
            ]
          }
        ]
      }
    ],
    quiz: [
      {
        id: 1,
        question: "What is the recommended benchmark percentage for salon rent expense relative to gross monthly revenue?",
        options: ["Under 15%", "50%", "Over 70%", "0%"],
        correctIndex: 0,
        explanation: "Healthy salon financial models aim for rent overhead at or below 15% of gross revenue."
      },
      {
        id: 2,
        question: "What is the purpose of an escalating tiered commission structure?",
        options: [
          "To penalize top performers",
          "To motivate stylists to exceed sales targets and cross-sell premium services",
          "To eliminate bonuses completely",
          "To confuse payroll"
        ],
        correctIndex: 1,
        explanation: "Tiered incentives give stylists higher reward percentages as they reach higher productivity brackets."
      }
    ]
  }
]

export function getDefaultUniversityData(userName: string = "Salon Team"): UniversityData {
  const courses: Course[] = INITIAL_COURSES.map((course, idx) => {
    if (idx === 0) {
      // First course completed as seed demonstration
      const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id))
      return {
        ...course,
        progress: 100,
        status: "completed" as const,
        completedLessonIds: allLessonIds,
        quizScore: 100,
        certificateId: "HANVA-CERT-88412",
      }
    } else if (idx === 1) {
      // Second course in-progress
      const firstLessonId = course.modules[0]?.lessons[0]?.id || "l-201"
      return {
        ...course,
        progress: 40,
        status: "in_progress" as const,
        completedLessonIds: [firstLessonId],
        quizScore: null,
        certificateId: null,
      }
    }
    return {
      ...course,
      progress: 0,
      status: "not_started" as const,
      completedLessonIds: [],
      quizScore: null,
      certificateId: null,
    }
  })

  const certificates: Certificate[] = [
    {
      id: "seed-cert-1",
      certificateId: "HANVA-CERT-88412",
      studentName: userName,
      courseId: "salon-mgmt-fundamentals",
      courseTitle: "Salon Management Fundamentals",
      score: 100,
      issueDate: new Date().toISOString().split("T")[0],
    },
  ]

  const achievements: Achievement[] = [
    {
      id: "ach-1",
      title: "First Course Completed",
      description: "Completed your first professional salon training course.",
      icon: "Award",
      earned: true,
      earnedDate: new Date().toISOString().split("T")[0],
    },
    {
      id: "ach-2",
      title: "Quiz Master",
      description: "Scored 100% on a certification examination.",
      icon: "Star",
      earned: true,
      earnedDate: new Date().toISOString().split("T")[0],
    },
    {
      id: "ach-3",
      title: "5 Courses Completed",
      description: "Completed 5 full salon masterclasses.",
      icon: "GraduationCap",
      earned: false,
    },
    {
      id: "ach-4",
      title: "Master Specialist",
      description: "Earned 3 or more verified professional certificates.",
      icon: "ShieldCheck",
      earned: false,
    },
    {
      id: "ach-5",
      title: "Speed Learner",
      description: "Invested more than 20 hours into salon skills mastery.",
      icon: "BookOpen",
      earned: false,
    },
    {
      id: "ach-6",
      title: "Community Helper",
      description: "Shared training insights with salon team members.",
      icon: "Users",
      earned: true,
      earnedDate: new Date().toISOString().split("T")[0],
    },
  ]

  return {
    courses,
    stats: {
      coursesCompleted: 1,
      hoursLearned: 12,
      certificatesEarned: 1,
      averageScore: 95,
    },
    certificates,
    achievements,
    userName,
  }
}
