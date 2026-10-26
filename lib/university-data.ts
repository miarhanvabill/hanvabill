export interface LessonStep {
  title: string
  subtitle?: string
  description: string
  actionChecklist?: string[]
  proTip?: string
  imageUrl?: string
  imageCaption?: string
}

export interface LessonScenario {
  situation: string
  question: string
  options: {
    text: string
    isRecommended: boolean
    feedback: string
  }[]
}

export interface LessonScript {
  title: string
  scenario: string
  script: string
  whyItWorks: string
}

export interface LessonDosDonts {
  dos: string[]
  donts: string[]
}

export interface Lesson {
  id: string
  title: string
  duration: string
  type: "interactive" | "guide" | "protocol" | "case_study" | "video" | "document"
  heroImage?: string
  content: string
  keyTakeaways: string[]
  steps?: LessonStep[]
  scenario?: LessonScenario
  script?: LessonScript
  dosDonts?: LessonDosDonts
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
  type: "interactive" | "guide" | "protocol" | "case_study"
  thumbnail?: string
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

// Master Course Catalog with Rich Interactive Content
export const INITIAL_COURSES: Omit<Course, "progress" | "status" | "completedLessonIds">[] = [
  {
    id: "salon-mgmt-fundamentals",
    title: "Front Desk Mastery, POS Checkout & Cash Control",
    description: "Master everyday salon operations, register floats, rapid UPI/Card checkouts, customer intake allergy notes, and end-of-day financial reconciliation.",
    category: "Business",
    level: "Beginner",
    type: "interactive",
    thumbnail: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
    instructor: "Sarah Johnson",
    instructorRole: "International Salon Operations Consultant",
    duration: "1.5 hours",
    lessonsCount: 4,
    rating: 4.9,
    studentsCount: 1840,
    badgeTitle: "Front Desk Specialist",
    modules: [
      {
        id: "mod-1",
        title: "Module 1: Opening Procedures & POS Operations",
        lessons: [
          {
            id: "l-101",
            title: "Daily Salon Opening & Cash Register Reconciliation",
            duration: "20 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
            content: "Establish a foolproof morning routine. Learn to count opening floats, verify point-of-sale receipt rolls, and inspect station hygiene 30 minutes before the first guest walks in.",
            keyTakeaways: [
              "Always count cash registers with dual sign-off before unlocking doors.",
              "Inspect stations 30 minutes prior to first client appointment.",
              "Review automated WhatsApp appointment confirmation lists on Hanva Billing."
            ],
            steps: [
              {
                title: "Step 1: Cash Drawer Float Verification",
                subtitle: "Never start a salon shift with an unverified cash drawer",
                description: "Open the safe, retrieve the morning float (typically ₹2,000–₹5,000 in mixed denominations), and count each bill. Enter the opening count into Hanva Billing Cash Drawer.",
                actionChecklist: [
                  "Count 10x ₹100 notes, 4x ₹500 notes, and loose change",
                  "Verify float matches the previous night's recorded closing balance",
                  "Lock spare float bills in the drop safe"
                ],
                proTip: "Keep at least 20 notes of ₹100 and ₹50 bills ready — morning clients paying with ₹500 notes often exhaust small change within the first hour."
              },
              {
                title: "Step 2: Hardware & POS Terminal Diagnostics",
                subtitle: "Prevent checkout delays during morning peak hours",
                description: "Power on the POS terminal, verify thermal printer paper roll has at least 50% capacity (look for pink margin warning stripe), and test high-speed Wi-Fi connectivity.",
                actionChecklist: [
                  "Test thermal printer paper feed and print a test receipt",
                  "Ensure UPI QR display terminal is powered and connected",
                  "Confirm Hanva Billing web app is logged in with active tenant sync"
                ],
                proTip: "Always keep a fresh thermal paper roll placed right beneath the register for instant swap during back-to-back client checkouts."
              },
              {
                title: "Step 3: Appointment Grid & Staff Attendance Check",
                subtitle: "Synchronize stylist chairs with booked service durations",
                description: "Review today's booking calendar on Hanva Billing. Check for VIP client tags, special treatment notes, and verify all rostered stylists have clocked in using Face ID.",
                actionChecklist: [
                  "Review morning appointments on Calendar view",
                  "Check Staff Attendance tab for on-time clock-ins",
                  "Flag any double-booked slots or overlapping stylist requests"
                ],
                proTip: "If a VIP client is scheduled at 11:00 AM, inform their assigned stylist at 10:30 AM so their station is pre-sanitized and prepped."
              }
            ],
            scenario: {
              situation: "It is 9:15 AM. You are counting the morning cash float and discover that the drawer is short by ₹500 compared to the closing sheet logged by yesterday evening's cashier.",
              question: "What is the proper professional operational protocol to follow?",
              options: [
                {
                  text: "Ignore it and hope today's cash tips or change cover the difference by evening.",
                  isRecommended: false,
                  feedback: "Never ignore cash discrepancies. This leads to end-of-day audit failures and potential disciplinary issues."
                },
                {
                  text: "Immediately log the ₹500 shortage as an opening variance in Hanva Cash Drawer, notify the salon manager, and document it before processing the first sale.",
                  isRecommended: true,
                  feedback: "Correct! Logging the variance immediately protects you, preserves audit integrity, and alerts management to verify yesterday's CCTV or shift logs."
                },
                {
                  text: "Put ₹500 from your own personal wallet into the cash register to balance the count.",
                  isRecommended: false,
                  feedback: "Never use personal funds to cover business drawer discrepancies. Audits require transparent discrepancy logs."
                }
              ]
            },
            dosDonts: {
              dos: [
                "Count cash drawers out of public client view",
                "Ensure both receptionist and manager sign off on opening float counts",
                "Review client intake notes for allergies before morning arrivals"
              ],
              donts: [
                "Never leave the cash register drawer unlocked or unattended",
                "Don't wait until 10:00 AM opening to discover the POS printer is out of paper",
                "Never share your staff POS login PIN with other team members"
              ]
            },
            resources: [
              { name: "Daily Opening Checklist.pdf", type: "PDF" },
              { name: "Cash Drawer Reconciliation Form.xlsx", type: "Sheet" }
            ]
          },
          {
            id: "l-102",
            title: "Client Check-in, Waitlist & Consultation Flow",
            duration: "25 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80",
            content: "Seamlessly welcome arriving clients, update wait times on digital boards, and transition clients to stylists with complete service intake notes.",
            keyTakeaways: [
              "Acknowledge arriving clients within 10 seconds of entering the door.",
              "Log customer allergies and scalp sensitivities in Hanva Customer Profiles.",
              "Offer refreshment options during initial chairside consultation."
            ],
            steps: [
              {
                title: "Step 1: The 10-Second Warm Welcome",
                subtitle: "The golden rule of salon hospitality",
                description: "Smile, make eye contact, and warmly greet the guest by name as soon as they cross the threshold. Never leave a client standing unacknowledged while typing on the computer.",
                actionChecklist: [
                  "Make warm eye contact and greet within 10 seconds",
                  "Verify client's appointment in Hanva Calendar",
                  "Offer complimentary beverage (green tea, water, espresso)"
                ],
                proTip: "Saying 'Good morning Mrs. Sharma, welcome back! Alex is preparing your station right now' creates instant luxury rapport."
              },
              {
                title: "Step 2: Digital Intake & Allergy Verification",
                subtitle: "Protect client safety and prevent chemical sensitivities",
                description: "For new clients or clients undergoing chemical treatments, verify scalp sensitivity or past tint reactions. Update the Hanva Customer Profile note with specific preferences.",
                actionChecklist: [
                  "Confirm mobile number for WhatsApp digital receipt and loyalty points",
                  "Check for past allergies or scalp sensitivities in profile",
                  "Notify assigned stylist on the floor via Hanva internal status"
                ],
                proTip: "If a client notes scalp sensitivity to bleach, add a permanent red warning tag in Hanva Billing so all stylists see it automatically."
              }
            ],
            script: {
              title: "Welcoming an Appointment Client",
              scenario: "A client arrives on time for a scheduled haircut and hair spa appointment.",
              script: "“Welcome to [Salon Name], Priya! It is wonderful to see you today. I see you are scheduled with Alex for a Haircut and Nourishing Spa. Please take a seat in our lounge, may I offer you some infused lemon water or green tea while Alex finishes sanitizing your chair?”",
              whyItWorks: "Using the client's first name, confirming services upfront, and explaining that the chair is being sanitized conveys hygiene, prestige, and attentiveness."
            },
            dosDonts: {
              dos: [
                "Use the client's name at least twice during the check-in interaction",
                "Explain the exact waiting time if a stylist is running 5-7 minutes behind",
                "Take coats, umbrellas, or shopping bags to the designated wardrobe"
              ],
              donts: [
                "Never keep typing on the keyboard without looking up when a client walks in",
                "Don't say 'He's running late' without offering a refreshment or reading material",
                "Never guess client contact details — always verify phone numbers"
              ]
            }
          }
        ]
      },
      {
        id: "mod-2",
        title: "Module 2: Rapid Checkout & End-of-Day Settlement",
        lessons: [
          {
            id: "l-103",
            title: "Split Payments, Loyalty Redemptions & Digital Invoicing",
            duration: "25 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
            content: "Master the 30-second checkout flow. Process split payments (Cash + UPI QR + Card), redeem customer membership wallet balances, and send instant WhatsApp tax invoices.",
            keyTakeaways: [
              "Always summarize the invoice total and applied discounts before charging.",
              "Seamlessly handle split payments across UPI, Credit Card, and Cash.",
              "Dispatch WhatsApp invoices automatically to eliminate paper waste."
            ],
            steps: [
              {
                title: "Step 1: Itemized Bill Review Chairside or at Counter",
                subtitle: "Ensure full client agreement on treatments performed",
                description: "Load the booking onto the POS screen. Confirm all services delivered (e.g. Haircut, Color, Add-on K18 Mask) match the stylist's ticket.",
                actionChecklist: [
                  "Verify service list matches stylist's service card",
                  "Apply available package sessions or loyalty points if requested",
                  "State the total clearly: 'Your total today with the conditioning treatment is ₹3,400'"
                ],
                proTip: "Never ask 'Is everything okay with the bill?' Instead say: 'Here is your summary including your loyalty discount of ₹300.'"
              },
              {
                title: "Step 2: Processing Split Payments in Hanva POS",
                subtitle: "Handling clients paying ₹2,000 via UPI and ₹1,400 in Cash",
                description: "In Hanva POS checkout, select 'Split Payment'. Enter the cash tender amount first, collect cash, then click 'Dynamic UPI QR' for the balance.",
                actionChecklist: [
                  "Enter Cash tender: ₹1,400 and provide receipt",
                  "Present Dynamic UPI QR for ₹2,000 on the terminal",
                  "Verify green payment success webhook on screen before completing sale"
                ],
                proTip: "Never click complete on an invoice before your UPI terminal or screen displays 'Transaction Approved'."
              }
            ],
            scenario: {
              situation: "A client taps their credit card at checkout, but the POS terminal displays 'Declined: 05 - Do Not Honor'. The client seems slightly embarrassed.",
              question: "How should the front-desk executive handle this courteously without making the client uncomfortable?",
              options: [
                {
                  text: "Loudly announce across the counter: 'Your credit card has been declined, do you have another card or cash?'",
                  isRecommended: false,
                  feedback: "Never embarrass a client publicly. Card declines happen frequently due to bank server timeouts or daily transaction limits."
                },
                {
                  text: "Lower your voice discreetly and say: 'It looks like the bank terminal timed out on this card. Would you like to try another card, or would our quick UPI QR code on your phone be easier?'",
                  isRecommended: true,
                  feedback: "Excellent! Blaming the machine or bank server saves the client from embarrassment and smoothly provides an alternative payment route."
                },
                {
                  text: "Ask the client to leave their phone at the counter while they go find an ATM outside.",
                  isRecommended: false,
                  feedback: "This damages client trust and ruins a premium salon experience."
                }
              ]
            }
          },
          {
            id: "l-104",
            title: "End of Day Closing & Financial Batch Reports",
            duration: "20 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
            content: "Complete daily register closures, balance UPI/Card receipts, and export executive daily summary reports.",
            keyTakeaways: [
              "Match terminal settlement batch totals with Hanva Daily Sales report.",
              "Ensure all staff check-outs are signed off in Attendance.",
              "Safeguard cash drops in the salon commercial safe."
            ],
            steps: [
              {
                title: "Step 1: Batch Settle Card & UPI Terminals",
                subtitle: "Close terminal batches to ensure funds settle to your bank account",
                description: "Run 'Batch Settlement' on all swipe machines. Print the summary settlement slip and staple it to the daily ledger.",
                actionChecklist: [
                  "Press 'Settle Batch' on swipe machines and print confirmation",
                  "Verify total matches Hanva Billing 'Card Payments' line item",
                  "Export UPI transaction reconciliation report"
                ],
                proTip: "If there is a ₹100 discrepancy between the terminal batch and POS, check if an invoice was accidentally marked as Card instead of UPI."
              },
              {
                title: "Step 2: Physical Cash Count & Drop Safe Transfer",
                subtitle: "Leave only the base float for tomorrow morning's team",
                description: "Count total physical cash. Retain exactly the morning float (e.g. ₹3,000). Place all excess daily cash revenue in a sealed cash deposit envelope into the drop safe.",
                actionChecklist: [
                  "Count cash drawer and verify against Hanva Daily Cash total",
                  "Enclose revenue cash into safe drop envelope with date and sign-off",
                  "Leave exact standard opening float in the cash drawer"
                ],
                proTip: "Both the closing receptionist and salon shift lead must initial the cash deposit envelope."
              }
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
        explanation: "Industry standards dictate acknowledging clients within 10 seconds to build immediate luxury rapport and hospitality."
      },
      {
        id: 2,
        question: "When a credit card declines at checkout, what is the best customer service response?",
        options: [
          "Loudly tell the customer their card has insufficient funds",
          "Politely blame a bank terminal connection timeout and offer a quick UPI QR code or alternative card",
          "Confiscate the customer's purse until payment is arranged",
          "Ask the customer to clean the salon floor"
        ],
        correctIndex: 1,
        explanation: "Politely framing the issue as a bank connection timeout protects client dignity while smoothly resolving payment."
      },
      {
        id: 3,
        question: "What is the primary rule for the salon opening cash float?",
        options: [
          "Estimate the amount without counting",
          "Always count and verify denominations with dual sign-off before unlocking doors",
          "Spend the float on morning staff coffees",
          "Only count cash at the end of the week"
        ],
        correctIndex: 1,
        explanation: "Counting the morning float with dual sign-off ensures audit accuracy and prevents shift-to-shift disputes."
      }
    ]
  },
  {
    id: "appointment-calendar-optimization",
    title: "Appointment Calendar & Chair Utilization Mastery",
    description: "Maximize salon revenue by eliminating chair dead zones, double-booking color processing intervals, and reducing no-shows with automated WhatsApp reminders.",
    category: "Business",
    level: "Intermediate",
    type: "interactive",
    thumbnail: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80",
    instructor: "Michael Chen",
    instructorRole: "Salon Operations Director",
    duration: "1.5 hours",
    lessonsCount: 3,
    rating: 4.8,
    studentsCount: 1210,
    badgeTitle: "Scheduling Master",
    modules: [
      {
        id: "mod-cal-1",
        title: "Module 1: Calendar Grid & Slot Utilization",
        lessons: [
          {
            id: "l-201",
            title: "Eliminating Idle Dead Zones & Smart Booking Alignment",
            duration: "25 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80",
            content: "Learn how unorganized booking spacing creates 15-minute dead zones that bleed ₹30,000+ per month in lost chair revenue. Master tight slot alignment.",
            keyTakeaways: [
              "Schedule appointments back-to-back with zero 15-minute awkward gaps.",
              "Use color processing 30-minute intervals for express services.",
              "Anchor morning and evening slots first before filling midday."
            ],
            steps: [
              {
                title: "Step 1: The 'Book from the Edges' Principle",
                subtitle: "Avoid scattered appointments that ruin stylist productivity",
                description: "When a client asks for 'sometime Saturday afternoon', guide them to either 1:00 PM (adjacent to morning bookings) or 4:00 PM (adjacent to evening bookings). Never book at 2:15 PM if it splits a 3-hour block into unusable 45-minute chunks.",
                actionChecklist: [
                  "Identify vacant gap slots under 30 minutes on Hanva Calendar",
                  "Guide callers to adjacent booking slots",
                  "Reserve 2-hour continuous blocks for high-ticket hair color & balayage"
                ],
                proTip: "A 15-minute gap is too short for a haircut and too long to rest. Eliminating just three 15-minute gaps per stylist per day recovers up to 1.5 billable hours daily."
              },
              {
                title: "Step 2: Processing-Time Double Booking",
                subtitle: "Turn 35-minute color development time into productive revenue",
                description: "While a hair color client is sitting under the heat lamp or processing cap for 35 minutes, the stylist is free. Schedule an express men's haircut, beard trim, or quick blowdry in that exact window.",
                actionChecklist: [
                  "Tag color services with 'Processing Interval: 35 mins' in Hanva",
                  "Assign express styling or haircut during the processing window",
                  "Ensure salon assistant is prepped for the subsequent wash basin rinse"
                ],
                proTip: "Always communicate with the color client first: 'While your gloss is developing for 30 minutes, I will step over to do a quick trim, and my assistant Priya will check your warmth levels every 10 minutes.'"
              }
            ],
            scenario: {
              situation: "A client calls on Friday wanting a blowout at 2:30 PM on Saturday. Stylist Rahul has an existing appointment ending at 2:00 PM, and another starting at 3:30 PM.",
              question: "Booking at 2:30 PM leaves two 30-minute dead zones (2:00-2:30 PM and 3:00-3:30 PM). How should you steer the client?",
              options: [
                {
                  text: "Book them at 2:30 PM without saying anything because the customer is always right.",
                  isRecommended: false,
                  feedback: "This fractures Rahul's afternoon into two unfillable 30-minute dead slots, costing the salon ₹1,500+ in potential revenue."
                },
                {
                  text: "Say: 'Rahul has a 2:00 PM opening right after his morning client, or a 3:30 PM slot. Which of those two times works best for your schedule?'",
                  isRecommended: true,
                  feedback: "Brilliant! Providing two adjacent times guides the client smoothly without revealing schedule gaps, keeping Rahul's chair 100% utilized."
                },
                {
                  text: "Tell the customer Rahul is completely fully booked and hang up.",
                  isRecommended: false,
                  feedback: "Never turn away business when viable adjacent slots exist."
                }
              ]
            }
          },
          {
            id: "l-202",
            title: "Automated WhatsApp Confirmations & No-Show Reduction",
            duration: "20 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1571875257727-256c39da42af?auto=format&fit=crop&w=1200&q=80",
            content: "How automated WhatsApp booking reminders reduce salon no-shows by 78%. Learn the optimal 24-hour and 2-hour cadence.",
            keyTakeaways: [
              "Dispatch automated WhatsApp confirmations instantly upon booking.",
              "Send 24-hour reminder with one-click 'Confirm' or 'Reschedule' options.",
              "Maintain a standby waitlist to immediately fill last-minute cancellations."
            ],
            steps: [
              {
                title: "Step 1: The 24-Hour Automated Reminder Trigger",
                subtitle: "Give clients notice while leaving time to backfill slots",
                description: "Hanva Billing triggers an automated WhatsApp message 24 hours prior to the scheduled time. The message includes stylist name, service list, date, and salon Google Maps pin.",
                actionChecklist: [
                  "Verify Hanva WhatsApp automation is toggled ON for booking reminders",
                  "Review morning status responses: Confirmed vs Pending",
                  "Follow up with unconfirmed high-ticket bookings by 12:00 PM"
                ],
                proTip: "Include a friendly note in the reminder: 'Please let us know at least 4 hours in advance if you need to reschedule so we can offer this slot to our waitlist guests.'"
              }
            ]
          }
        ]
      }
    ],
    quiz: [
      {
        id: 1,
        question: "What is the primary benefit of processing-time double booking?",
        options: [
          "It forces clients to wait longer",
          "It utilizes 30-40 minute chemical development windows for quick haircuts or trims, maximizing chair revenue",
          "It eliminates the need for stylist assistants",
          "It doubles product costs"
        ],
        correctIndex: 1,
        explanation: "Productive salons utilize color and treatment processing intervals for quick haircuts, significantly increasing stylist earnings per hour."
      },
      {
        id: 2,
        question: "How should a receptionist steer a caller asking for an awkward midday slot that creates dead gaps?",
        options: [
          "Reject the customer immediately",
          "Offer two adjacent times that hug existing appointments (e.g., 'I have 2:00 PM or 3:30 PM available')",
          "Charge double the price",
          "Tell them to come whenever they feel like it"
        ],
        correctIndex: 1,
        explanation: "Offering two specific adjacent times anchors the calendar tightly, preventing fragmented 15-minute dead zones."
      }
    ]
  },
  {
    id: "customer-retention-upselling",
    title: "Customer Retention, Rebooking & Basin Upselling",
    description: "Train stylists and receptionists to recommend premium bond treatments at the wash basin, secure the next appointment chairside, and resolve client redos with grace.",
    category: "Customer Service",
    level: "Intermediate",
    type: "interactive",
    thumbnail: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80",
    instructor: "Elena Rostova",
    instructorRole: "Luxury Salon Guest Experience Coach",
    duration: "2 hours",
    lessonsCount: 4,
    rating: 4.9,
    studentsCount: 2150,
    badgeTitle: "Retention Champion",
    modules: [
      {
        id: "mod-ret-1",
        title: "Module 1: The Transformational Consultation & Basin Upsell",
        lessons: [
          {
            id: "l-301",
            title: "Chairside Discovery: Open-Ended Questioning",
            duration: "25 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80",
            content: "Never ask 'What are we doing today?' Master the 5-point consultation to uncover scalp concerns, styling habits, and high-margin treatment opportunities.",
            keyTakeaways: [
              "Conduct consultation at eye level through the mirror.",
              "Ask open-ended lifestyle questions instead of yes/no questions.",
              "Touch and examine hair texture and scalp condition physically."
            ],
            steps: [
              {
                title: "Step 1: Eye-Level Mirror Alignment",
                subtitle: "Never stand towering over a seated client during consultation",
                description: "Sit or kneel on a styling stool beside the client. Look into the mirror together. This removes intimidation and establishes a collaborative partnership.",
                actionChecklist: [
                  "Lower yourself to eye level before touching the hair",
                  "Inquire about their daily morning styling routine",
                  "Ask: 'What is the #1 thing you struggle with when styling your hair at home?'"
                ],
                proTip: "When a client says 'My ends feel dry and frizzy', that is your natural bridge to prescribe a bond-building hair treatment."
              }
            ],
            script: {
              title: "The 5-Point Discovery Consultation",
              scenario: "A client sits in the chair for a regular haircut.",
              script: "“Priya, before we wash your hair, let us look at your ends together in the mirror. I notice the humidity has made the mid-lengths slightly rebellious, and the ends are craving hydration. How much time do you typically spend blowdrying in the morning, and would you like me to show you an express treatment that cuts your styling time in half?”",
              whyItWorks: "It identifies a real pain point (morning styling time), diagnoses the cause (dehydration), and introduces a solution without sounding like a hard sales pitch."
            }
          },
          {
            id: "l-302",
            title: "Offering Add-On Treatments at the Wash Basin",
            duration: "20 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=80",
            content: "The wash basin is the highest-converting upsell zone in the entire salon. Master sensory touchpoints and chemical bond recommendations.",
            keyTakeaways: [
              "Recommend treatments when the hair is wet and cuticle is open.",
              "Focus on sensory benefits: scalp relief, silkiness, and color longevity.",
              "State price upfront with confidence: 'It is an additional ₹800'."
            ],
            script: {
              title: "Wash Basin Bond-Builder Recommendation",
              scenario: "Stylist is shampooing client's hair before a haircut.",
              script: "“Priya, while rinsing your shampoo, I feel your cuticles are quite porous from previous heat styling. We have an express K18 peptide bond treatment that repairs this in 4 minutes right here at the basin for ₹750. It will make your blowout feel like silk and last through your next 5 washes. Should I apply that for you today?”",
              whyItWorks: "It explains the 'why' (heat porosity), the time commitment (only 4 minutes), the cost (transparent ₹750), and the lasting benefit (5 washes)."
            },
            dosDonts: {
              dos: [
                "Always state the treatment price clearly before applying product",
                "Explain the exact sensory feeling they will experience (cooling scalp, silky glide)",
                "Show the client the product bottle and let them smell the botanical aroma"
              ],
              donts: [
                "Never apply an add-on treatment without client permission and surprise them on the bill",
                "Don't say 'Do you want a spa?' without explaining how it helps their specific hair problem",
                "Never rush the basin head massage — it is the #1 reason clients return"
              ]
            }
          }
        ]
      },
      {
        id: "mod-ret-2",
        title: "Module 2: The Rebooking Formula & Service Redos",
        lessons: [
          {
            id: "l-303",
            title: "The Rebooking Formula: Securing the Next Appointment",
            duration: "25 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
            content: "Securing the next appointment while the client is still in love with their fresh style increases lifetime client value by 300%.",
            keyTakeaways: [
              "Initiate rebooking at the styling chair, NOT at the noisy checkout desk.",
              "Prescribe the maintenance window like a doctor: 'In 6 weeks your roots will show 0.5 inches.'",
              "Suggest specific days and times tailored to their lifestyle."
            ],
            script: {
              title: "The Chairside 6-Week Rebooking Script",
              scenario: "Stylist is finishing the blowout, client is admiring their hair in the hand mirror.",
              script: "“Priya, to keep this cut looking crisp and prevent your layers from collapsing, we should refresh your shape in exactly 6 weeks. That lands us right around the second week of December. I know you prefer Saturday mornings — should I reserve 10:30 AM on December 12th for you so you get your favorite slot before the holiday rush?”",
              whyItWorks: "Prescribes the exact timing based on hair science, references their personal preference (Saturday mornings), and creates natural urgency (holiday rush)."
            }
          },
          {
            id: "l-304",
            title: "De-escalating Unhappy Clients & Resolving Service Redos",
            duration: "20 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80",
            content: "A service redo handled with empathy turns an unhappy customer into your most vocal advocate. Master the 4-step 'Listen, Validate, Fix, Retain' framework.",
            keyTakeaways: [
              "Never become defensive or argue about subjective taste.",
              "Offer a zero-charge consultation and redo within 7 days.",
              "Log redo notes in Hanva Customer Profiles to prevent recurrence."
            ],
            scenario: {
              situation: "A client calls two days after a color appointment stating their blonde toner looks 'way darker and cooler than the picture they brought'.",
              question: "What is the professional protocol to resolve this and protect the salon reputation?",
              options: [
                {
                  text: "Tell the client: 'You approved it before leaving the salon, toners always fade after 10 washes anyway.'",
                  isRecommended: false,
                  feedback: "Dismissive and defensive. This guarantees a 1-star Google review and permanently loses the client."
                },
                {
                  text: "Say: 'Thank you so much for letting us know! Hair looks different in home lighting compared to salon lights. Please come in tomorrow for a complimentary 15-minute clarifying wash and gloss adjustment with senior stylist Alex so it is 100% what you love.'",
                  isRecommended: true,
                  feedback: "Gold standard! Validates the client's perception, eliminates blame, and provides a swift, complimentary fix."
                },
                {
                  text: "Offer an immediate 100% cash refund and ask them never to return.",
                  isRecommended: false,
                  feedback: "Refunds without offering a correction leave the client with hair they dislike and destroy customer loyalty."
                }
              ]
            }
          }
        ]
      }
    ],
    quiz: [
      {
        id: 1,
        question: "When is the most effective time to secure a client's next appointment?",
        options: [
          "At the styling chair while presenting the finished look with a hand mirror",
          "At the noisy checkout desk while they are paying",
          "By sending a cold email 3 months later",
          "Never ask — wait for them to remember"
        ],
        correctIndex: 0,
        explanation: "Clients feel the highest emotional satisfaction right at the styling chair when admiring their fresh look, making it the ideal moment to rebook."
      },
      {
        id: 2,
        question: "What is the critical rule when recommending an add-on treatment at the wash basin?",
        options: [
          "Apply the product secretly and charge it at the end",
          "State the exact price and explain the tangible problem it solves before applying product",
          "Only offer treatments on Mondays",
          "Tell the client their hair is damaged beyond repair"
        ],
        correctIndex: 1,
        explanation: "Transparency builds trust. Always explain the hair benefit and state the price clearly before opening and applying product."
      }
    ]
  },
  {
    id: "inventory-backbar-control",
    title: "Backbar Product Control & Inventory Audits",
    description: "Eliminate chemical product waste, weigh color bowls, configure automated consumption deductions in Hanva Billing, and prevent retail product shrinkage.",
    category: "Finance",
    level: "Intermediate",
    type: "interactive",
    thumbnail: "https://images.unsplash.com/photo-1571875257727-256c39da42af?auto=format&fit=crop&w=1200&q=80",
    instructor: "David Vance",
    instructorRole: "Salon Supply Chain & Financial Auditor",
    duration: "1.5 hours",
    lessonsCount: 3,
    rating: 4.8,
    studentsCount: 940,
    badgeTitle: "Inventory Controller",
    modules: [
      {
        id: "mod-inv-1",
        title: "Module 1: Backbar Weighing & Waste Reduction",
        lessons: [
          {
            id: "l-401",
            title: "Weighing Color Bowls & Automated Gram Deduction",
            duration: "25 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1571875257727-256c39da42af?auto=format&fit=crop&w=1200&q=80",
            content: "Over-dispensing color tubes and developer by just 15 grams per client costs a 6-chair salon over ₹1,80,000 annually. Learn digital scale discipline.",
            keyTakeaways: [
              "Every color bar must have a calibrated digital kitchen scale.",
              "Mix 80% of estimated formula first; mix extra only if needed.",
              "Log exact tube numbers and developer volume in client history."
            ],
            steps: [
              {
                title: "Step 1: The 'Mix 80%' Golden Rule",
                subtitle: "You can always mix more, but you can never put mixed bleach back in the tube",
                description: "Stylists typically mix 60g of tint and 60g of developer for a root touchup, and leave 25g in the bowl that gets washed down the sink. Mix 40g first. If more is needed for thick hair, mix an express 15g batch.",
                actionChecklist: [
                  "Zero (tare) the digital scale with clean bowl",
                  "Dispense precise grams of tint and developer according to formula",
                  "Scrape color bowls thoroughly with silicone scrapers"
                ],
                proTip: "Silicone bowl scrapers recover 8–10 grams of premium hair color per bowl that would otherwise be rinsed down the drain."
              }
            ]
          },
          {
            id: "l-402",
            title: "Minimum Stock Alerts & Vendor Purchase Orders",
            duration: "20 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1571875257727-256c39da42af?auto=format&fit=crop&w=1200&q=80",
            content: "Never run out of 20 Volume developer or foil rolls on a busy Saturday. Configure low-stock thresholds in Hanva Inventory.",
            keyTakeaways: [
              "Set minimum alert levels for high-velocity SKUs (bleach, foils, developers).",
              "Audit inbound vendor deliveries against purchase order quantities.",
              "Check batch manufacturing and expiry dates upon delivery."
            ]
          }
        ]
      }
    ],
    quiz: [
      {
        id: 1,
        question: "Why should colorists mix 80% of estimated chemical formula initially?",
        options: [
          "Because color tubes are heavy to carry",
          "Because extra color can always be mixed in 60 seconds, preventing unused leftover product from being washed down the drain",
          "Because developer expires in 2 minutes",
          "To cheat the customer"
        ],
        correctIndex: 1,
        explanation: "Mixing 80% first prevents significant backbar wastage while ensuring the stylist can mix extra only if hair density demands it."
      }
    ]
  },
  {
    id: "salon-sanitization-hygiene",
    title: "Hygiene, Sanitization & Client Safety Standards",
    description: "Industry-standard protocols for autoclaving, barbicide tool immersion, 5-minute chair turnovers, and 48-hour chemical patch test compliance.",
    category: "Styling",
    level: "Beginner",
    type: "interactive",
    thumbnail: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80",
    instructor: "Dr. Rachel Kapoor",
    instructorRole: "Cosmetic Trichologist & Sanitation Auditor",
    duration: "1.5 hours",
    lessonsCount: 2,
    rating: 5.0,
    studentsCount: 1620,
    badgeTitle: "Safety & Hygiene Specialist",
    modules: [
      {
        id: "mod-san-1",
        title: "Module 1: 3-Step Tool Disinfection & Station Turnover",
        lessons: [
          {
            id: "l-501",
            title: "3-Step Disinfection: Washing, Barbicide Immersion & UV Sterilization",
            duration: "25 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80",
            content: "Dipping shears in alcohol for 2 seconds is NOT disinfection. Master the hospital-grade 3-step disinfection protocol.",
            keyTakeaways: [
              "Step 1: Clean debris and hair under warm soapy water.",
              "Step 2: Fully immerse combs and shears in freshly mixed Barbicide for 10 minutes.",
              "Step 3: Dry thoroughly and store in sealed UV sanitizer cabinet."
            ],
            steps: [
              {
                title: "Step 1: Mechanical Debris Removal",
                subtitle: "Disinfectant solutions cannot penetrate organic hair buildup",
                description: "Remove all hair strands from brushes and combs using a cleaning rake. Wash tools with warm antibacterial soap water to eliminate sebum and styling residue.",
                actionChecklist: [
                  "Remove hair from brush bristles",
                  "Wash with warm water and antibacterial detergent",
                  "Rinse thoroughly before chemical immersion"
                ],
                proTip: "Immersing tools with hair still stuck in them deactivates the disinfectant solution rapidly, turning the Barbicide cloudy."
              },
              {
                title: "Step 2: Complete Barbicide Immersion for 10 Minutes",
                subtitle: "Full contact time is required to destroy fungal and bacterial spores",
                description: "Completely submerge scissors, clipper guards, and combs in hospital-grade disinfectant. Maintain full contact time for at least 10 minutes.",
                actionChecklist: [
                  "Mix Barbicide at exact 2oz per 32oz water ratio",
                  "Submerge tools completely for full 10-minute contact time",
                  "Change Barbicide jar solution daily or as soon as it becomes cloudy"
                ],
                proTip: "Never leave shears in disinfectant overnight — chemical immersion beyond 20 minutes can cause pivot screw corrosion and blade dulling."
              }
            ],
            dosDonts: {
              dos: [
                "Change Barbicide jars daily every morning",
                "Use fresh neck strips and freshly laundered capes for every single client",
                "Sanitize styling chair armrests and headrest between guests"
              ],
              donts: [
                "Never reuse a cape on another client without laundering",
                "Don't blow loose hair off client neck with breath or mouth — use a fresh paper towel or blowdryer on cool",
                "Never pick up dropped shears from the floor and use them immediately on a client"
              ]
            }
          },
          {
            id: "l-502",
            title: "Chemical Patch Testing & Emergency Allergy Protocols",
            duration: "20 mins",
            type: "interactive",
            heroImage: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=80",
            content: "Protect clients from severe paraphenylenediamine (PPD) and chemical allergic reactions with mandatory 48-hour behind-ear patch tests.",
            keyTakeaways: [
              "Conduct 48-hour patch tests for all new hair color and tint clients.",
              "Never proceed with bleach if the scalp shows abrasions or sunburn.",
              "Log patch test sign-offs directly in Hanva Customer Profiles."
            ]
          }
        ]
      }
    ],
    quiz: [
      {
        id: 1,
        question: "What is the minimum required contact time for tools fully submerged in hospital-grade Barbicide?",
        options: ["2 seconds", "10 minutes", "Overnight (12 hours)", "30 seconds"],
        correctIndex: 1,
        explanation: "Disinfectant solutions require a full 10-minute contact time to effectively neutralize bacterial, fungal, and viral pathogens."
      },
      {
        id: 2,
        question: "What must be done before immersing combs and brushes into disinfectant solution?",
        options: [
          "Spray them with perfume",
          "Remove all hair strands and wash with warm antibacterial soap water to eliminate organic debris",
          "Place them in the freezer",
          "Nothing — throw them straight into the jar"
        ],
        correctIndex: 1,
        explanation: "Chemical disinfectants cannot penetrate organic buildup. Hair and sebum must be washed away first."
      }
    ]
  }
]

export function getDefaultUniversityData(userName: string = "Salon Team"): UniversityData {
  const courses: Course[] = INITIAL_COURSES.map((course, idx) => {
    if (idx === 0) {
      // First course completed as demonstration
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
        progress: 50,
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
      courseTitle: "Front Desk Mastery, POS Checkout & Cash Control",
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
