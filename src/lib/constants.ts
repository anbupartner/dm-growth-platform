export const LEAD_STATUSES = [
  "NEW_LEAD",
  "CONTACTED",
  "INTERESTED",
  "AUDIT_SENT",
  "MEETING_SCHEDULED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "FOLLOW_UP",
  "NOT_INTERESTED",
  "ON_HOLD",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  AUDIT_SENT: "Audit Sent",
  MEETING_SCHEDULED: "Meeting Scheduled",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  FOLLOW_UP: "Follow-up",
  NOT_INTERESTED: "Not Interested",
  ON_HOLD: "On Hold",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  NEW_LEAD: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  CONTACTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  INTERESTED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  AUDIT_SENT: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  MEETING_SCHEDULED: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  PROPOSAL_SENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  NEGOTIATION: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  WON: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  LOST: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  FOLLOW_UP: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  NOT_INTERESTED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  ON_HOLD: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
};

export const TASK_STATUSES = ["PENDING", "ONGOING", "CLOSED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pending",
  ONGOING: "Ongoing",
  CLOSED: "Closed",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  ONGOING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CLOSED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  HIGH: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

// Used to sort task lists priority-first (highest priority on top) within a
// status group — higher number sorts first.
export const TASK_PRIORITY_ORDER: Record<TaskPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const GENDERS = ["MALE", "FEMALE", "TRANS", "NOT_PREFER"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  TRANS: "Trans",
  NOT_PREFER: "Prefer not to say",
};

export const LEAD_SOURCES = [
  "LINKEDIN",
  "FACEBOOK",
  "INSTAGRAM",
  "WEBSITE",
  "REFERRAL",
  "GOOGLE_MAPS",
  "WHATSAPP",
  "OTHER",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  WEBSITE: "Website",
  REFERRAL: "Referral",
  GOOGLE_MAPS: "Google Maps",
  WHATSAPP: "WhatsApp",
  OTHER: "Other",
};

export const BUSINESS_GOALS = [
  "Increase website traffic",
  "Increase organic traffic",
  "Improve keyword rankings",
  "Increase leads",
  "Increase qualified leads",
  "Increase sales",
  "Increase revenue",
  "Improve brand awareness",
  "Improve online visibility",
  "Enter new markets",
  "Generate B2B enquiries",
  "Reduce CAC",
  "Improve ROAS",
  "Improve conversion rate",
];

export const ORGANIC_GOALS = [
  "Increase organic traffic",
  "Improve search rankings",
  "Increase search visibility",
  "Increase non-branded traffic",
  "Increase qualified organic leads",
  "Improve local SEO",
  "Build topical authority",
  "Increase organic enquiries",
  "Increase organic conversions",
];

export const PPC_OBJECTIVES = [
  "Website traffic",
  "Lead generation",
  "Sales",
  "Product enquiries",
  "Brand awareness",
  "Remarketing",
  "B2B lead generation",
  "Appointment generation",
  "Store visits where applicable",
];

// Shown only when the consultant flags this business as also having a
// physical/local store to promote (Business Details step) — additional goal
// options layered onto the standard Organic/PPC goals above, reflecting the
// local-search funnel: Google Business Profile -> Search/Maps -> Reviews ->
// Website/Call/WhatsApp -> Qualified Enquiry -> Sales Follow-up -> Purchase
// -> Review + Referral.
export const LOCAL_ORGANIC_GOALS = [
  "Improve Google Business Profile ranking",
  "Increase visibility in the Local (Maps) Pack",
  "Increase Google Business Profile views",
  "Grow review count & rating",
];

export const LOCAL_PPC_OBJECTIVES = [
  "Increase calls from Search/Maps",
  "Increase direction requests",
  "Increase store visits",
  "Increase WhatsApp enquiries from local search",
];

// WhatsApp Marketing — its own campaign channel alongside Organic/PPC
// (Organic & PPC step), since it's a distinct, plannable channel in its own
// right, not just an outcome of the other two.
export const WHATSAPP_MARKETING_GOALS = [
  "Click-to-WhatsApp ads for lead generation",
  "Broadcast offers & promotions to opted-in customers",
  "Automated quick replies / FAQ catalogue",
  "Product catalogue sharing",
  "Abandoned cart / enquiry follow-up",
  "Post-purchase order updates & shipping notifications",
  "Review & referral requests after purchase",
  "Appointment / booking reminders",
];

export type SocialPlatformKey = "facebook" | "instagram" | "linkedin" | "youtube";

// Organic social profile links (Facebook, Instagram, LinkedIn, YouTube) —
// captured on the Business Details step alongside the rest of the business's
// identity info. Saved as a single JSON object on the assessment (see
// schema.ts `assessments.socialMedia`).
export const SOCIAL_MEDIA_LINK_FIELDS: Array<{ key: SocialPlatformKey; label: string; placeholder: string }> = [
  { key: "facebook", label: "Facebook Page", placeholder: "https://facebook.com/yourbusiness" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbusiness" },
  { key: "linkedin", label: "LinkedIn Company Page", placeholder: "https://linkedin.com/company/yourbusiness" },
  { key: "youtube", label: "YouTube Channel", placeholder: "https://youtube.com/@yourbusiness" },
];

// Curated best-practice playbook per platform — key metrics, recommendations
// and content ideas to grow engagement. Same non-fabrication approach as
// LOCAL_BRANDING_RECOMMENDATIONS below: general industry practice researched
// from public sources, shown as reference guidance for the consultant —
// never a generated or fabricated claim about this specific business's own
// account performance. Only ever surfaced for a platform the consultant
// actually entered a link for (see SocialMediaInsightsPanel in
// assessment/new/page.tsx) — paired there with a real, live reachability
// check of that link (src/lib/social-audit.ts) and a field for the
// consultant to paste in real metrics from the platform's own Insights/
// Analytics, since follower counts and engagement numbers can't be honestly
// scraped from Facebook/Instagram/LinkedIn (login-walled, JS-rendered).
export const SOCIAL_MEDIA_PLAYBOOK: Array<{
  key: SocialPlatformKey;
  platform: string;
  keyMetrics: string[];
  recommendations: string[];
  contentIdeas: string[];
}> = [
  {
    key: "facebook",
    platform: "Facebook Page",
    keyMetrics: [
      "Engagement rate (1–3% is average; organic reach keeps declining, so track it alongside reach, not alone)",
      "Reach — unique accounts reached per post",
      "Page follower growth",
      "Video watch time (a view counts at 3 seconds on Facebook)",
      "Click-through rate on links/offers",
    ],
    recommendations: [
      "Post 3–5x/week, mixing native video, Reels and photo/link posts.",
      "Put a small boost budget behind whichever organic post is already outperforming — cheaper and more effective than boosting blind.",
      "Reply to comments and Messages within a few hours — Meta's response-time badge and reach both reward it.",
      "Track reach and CTR in Meta Business Suite, not just likes.",
    ],
    contentIdeas: [
      "Customer testimonials & reviews",
      "Behind-the-scenes of the business",
      "Local community involvement / events",
      "Polls and simple questions",
      "Limited-time offers & announcements",
      "FAQ posts and live Q&A",
      "Reposted user-generated content (with permission)",
    ],
  },
  {
    key: "instagram",
    platform: "Instagram",
    keyMetrics: [
      "Engagement rate (benchmark ~3.5% — one of the higher-engagement platforms)",
      "Reach and Reels plays",
      "Saves — a stronger high-intent signal than likes",
      "Story completion rate",
      "Follower growth rate",
    ],
    recommendations: [
      "Prioritise Reels — currently the highest-organic-reach format on the platform.",
      "Post consistently: 3–5 feed posts/week plus daily Stories.",
      "Use 5–15 specific, relevant hashtags rather than broad generic ones.",
      "Track saves and shares in Insights, not just likes — that's what the algorithm rewards.",
      "Partner with local micro-influencers or complementary businesses for reach.",
    ],
    contentIdeas: [
      "Short Reels — quick tips, before/after, behind-the-scenes",
      "Carousel posts — step-by-step guides, \"swipe to see\"",
      "Stories with polls, quizzes and countdown stickers",
      "Reposted customer/user-generated content",
      "Product or service demos",
      "Staff/team spotlights",
    ],
  },
  {
    key: "linkedin",
    platform: "LinkedIn Company Page",
    keyMetrics: [
      "Engagement rate (benchmark ~3.4%)",
      "Follower growth",
      "Impressions",
      "Click-through rate on posts/ads",
      "Employee advocacy reach — shares by team members",
    ],
    recommendations: [
      "Post thought-leadership content 2–4x/week.",
      "Encourage employees to share company posts — the single biggest reach lever on LinkedIn.",
      "Use native video and document carousels — both reach further than posts linking off-platform.",
      "Post during business hours and reply to comments to keep the algorithm favouring the post.",
    ],
    contentIdeas: [
      "Industry insights & trend commentary",
      "Case studies and client wins",
      "Company culture & team spotlights",
      "Hiring / job openings",
      "Founder or leadership posts",
      "Polls on industry topics",
      "Document carousels — how-to guides, checklists",
    ],
  },
  {
    key: "youtube",
    platform: "YouTube Channel",
    keyMetrics: [
      "Watch time — total minutes watched, YouTube's primary ranking signal",
      "Average view duration / audience retention",
      "Click-through rate on thumbnails",
      "Subscriber growth",
      "Shorts performance (tracked separately from long-form)",
    ],
    recommendations: [
      "Keep a consistent upload schedule — the algorithm rewards consistency over volume.",
      "Invest in strong thumbnails and titles — they drive click-through more than anything else.",
      "Use Shorts to grow reach and funnel new viewers into long-form content.",
      "Group videos into playlists to increase session watch time.",
      "Add end screens/cards pointing to related videos.",
    ],
    contentIdeas: [
      "How-to / tutorial videos",
      "Customer testimonials & case studies",
      "Behind-the-scenes / company culture",
      "Q&A / FAQ videos",
      "Product or service demos",
      "Shorts versions of key tips from long-form videos",
      "\"Day in the life\" content",
    ],
  },
];

// Industry-specific social media content strategy — recommendations and
// content ideas tailored by business type, layered on top of the
// platform-level SOCIAL_MEDIA_PLAYBOOK above. That playbook's "Key metrics
// to track" stay platform-only and unchanged here — those are analytics/
// algorithm categories that don't meaningfully vary by industry (YouTube's
// Watch Time matters the same way for a law firm as it does for a
// restaurant). What genuinely differs by industry is *what to post and why*
// — a law firm and a restaurant shouldn't be handed the same content ideas.
//
// Rather than writing fully bespoke content for all 34 INDUSTRIES x 4
// platforms (which would mostly duplicate itself across near-identical
// business types), the 34 industries are grouped into content-strategy
// clusters of genuinely similar businesses — e.g. Auto and Home Improvement
// share the same "local trade, before/after, service area" strategy; Legal
// and Finance & Insurance share the same "compliance-aware authority
// content" strategy. See INDUSTRY_TO_SOCIAL_CLUSTER below for the exact,
// disclosed mapping — the same approach already used elsewhere in this file
// when extending benchmark data to a new vertical by mapping it to its
// closest real analog (see the LinkedIn/YouTube/Instagram/Microsoft Ads/
// WhatsApp benchmark comments further down). General, defensible guidance
// for that type of business — never a fabricated claim about this specific
// business's own account performance.
export type SocialContentClusterKey =
  | "b2b-professional"
  | "industrial-trade"
  | "home-auto-services"
  | "beauty-fitness-personal"
  | "health-medical"
  | "food-hospitality-travel"
  | "retail-ecommerce"
  | "real-estate"
  | "education"
  | "technology"
  | "media-events";

export const SOCIAL_MEDIA_INDUSTRY_CONTENT: Record<
  SocialContentClusterKey,
  { label: string; platforms: Record<SocialPlatformKey, { recommendations: string[]; contentIdeas: string[] }> }
> = {
  "b2b-professional": {
    label: "B2B & Professional Services",
    platforms: {
      facebook: {
        recommendations: [
          "Keep posts factual and compliance-safe — avoid result/outcome guarantees; frame wins as case studies, not promises.",
          "Post 2–3x/week; frequency matters less here than credibility, since B2B buyers research before they engage.",
          "Pin your strongest client testimonial or case result to the top of the Page.",
        ],
        contentIdeas: [
          "Client success stories & case studies (with permission)",
          "Explainers on common questions prospects ask before hiring",
          "Industry news commentary — what a regulation/market change means for clients",
          "Team credentials & expertise spotlights",
          "Free downloadable guides/checklists as post links",
        ],
      },
      instagram: {
        recommendations: [
          "Use Instagram mainly for trust-building visuals — office, team, credentials — not hard selling.",
          "Carousels explaining a process (e.g. \"What happens after you file a claim\") outperform single images here.",
          "Keep captions professional; save the personality for LinkedIn.",
        ],
        contentIdeas: [
          "Behind-the-scenes of the office/team at work",
          "Carousel breakdowns of a process or timeline",
          "Quote graphics from client testimonials",
          "Team credential/award spotlights",
          "Simple explainer graphics for common questions",
        ],
      },
      linkedin: {
        recommendations: [
          "This is the primary platform for this industry — post 3–5x/week, more than Facebook/Instagram.",
          "Have partners/consultants post from their personal profiles too and reshare from the Page — personal profiles reach further than company Pages.",
          "Comment thoughtfully on clients' and industry leaders' posts to build visibility beyond your own feed.",
        ],
        contentIdeas: [
          "Case studies and client wins",
          "Commentary on industry news/regulatory changes",
          "Founder/partner thought-leadership posts",
          "Hiring posts and team growth announcements",
          "Document carousels — checklists, process guides, FAQs",
        ],
      },
      youtube: {
        recommendations: [
          "Longer-form explainer and Q&A videos build the trust this industry sells on — don't force short-form if it doesn't fit.",
          "Answer the exact questions prospects type into Google/YouTube search (\"how does X work\", \"what does X cost\").",
          "Feature the actual people clients will work with, not just narration over stock footage.",
        ],
        contentIdeas: [
          "Q&A videos answering common client questions",
          "Process walkthroughs (\"what to expect when you...\")",
          "Client testimonial videos (with permission)",
          "Team/partner introduction videos",
          "Short explainer clips repurposed from longer webinars/talks",
        ],
      },
    },
  },
  "industrial-trade": {
    label: "Industrial, Trade & Logistics",
    platforms: {
      facebook: {
        recommendations: [
          "Lead with capability and reliability, not lifestyle — show the work actually happening.",
          "Post project milestones and completions; B2B buyers browsing Facebook are checking credibility, not being entertained.",
          "Use Facebook mainly as a public proof-of-work archive; expect lower engagement volume than consumer industries and don't chase it.",
        ],
        contentIdeas: [
          "Project/job site progress and completion photos",
          "Equipment, fleet or facility showcases",
          "Safety practices and certifications",
          "Client/project testimonials",
          "Team and crew spotlights",
        ],
      },
      instagram: {
        recommendations: [
          "Short before/after or timelapse clips of a project or process perform best here.",
          "Use Reels to show equipment/processes in motion — this industry photographs surprisingly well when it's in action.",
          "Post less frequently but keep quality high; a stream of low-effort site photos won't build authority.",
        ],
        contentIdeas: [
          "Timelapse or before/after Reels of a project",
          "Equipment and process close-ups in action",
          "Site/facility tours",
          "Safety gear and standards in practice",
          "Crew spotlights and day-in-the-life content",
        ],
      },
      linkedin: {
        recommendations: [
          "This is usually the highest-value platform for this industry's actual decision-makers — prioritise it over Facebook/Instagram if budget/time is limited.",
          "Post capacity, capability and compliance content (certifications, safety records) — the things procurement teams actually screen for.",
          "Share completed-project case studies with scope, timeline and outcome, not just a photo.",
        ],
        contentIdeas: [
          "Completed project case studies with real scope/outcome",
          "Certifications, compliance and safety-record posts",
          "Capacity/capability overviews (fleet size, facility specs, service area)",
          "Industry news and regulatory commentary",
          "Hiring and team-growth posts",
        ],
      },
      youtube: {
        recommendations: [
          "Facility/process walkthrough videos do real work here — they're often the first thing a procurement team looks for.",
          "Keep production simple and honest — a phone-shot walkthrough of a real site outperforms an over-produced generic video.",
          "Add captions/on-screen text; a lot of B2B video is watched muted at a desk.",
        ],
        contentIdeas: [
          "Facility or fleet walkthrough videos",
          "Process/how-it's-made explainer videos",
          "Project case study videos (scope, challenge, outcome)",
          "Safety and compliance training excerpts",
          "Client testimonial videos",
        ],
      },
    },
  },
  "home-auto-services": {
    label: "Home & Auto Services",
    platforms: {
      facebook: {
        recommendations: [
          "Post 3–4x/week — this audience is highly local and browses Facebook for reviews and recent work.",
          "Ask every satisfied customer for a Facebook review; local service businesses live and die by review volume here.",
          "Use local-area Facebook Groups to share helpful tips, not just ads.",
        ],
        contentIdeas: [
          "Before/after project or service photos",
          "Customer reviews and testimonials",
          "Quick tips (maintenance, seasonal prep, DIY-adjacent advice)",
          "Behind-the-scenes of a job in progress",
          "Local community involvement",
        ],
      },
      instagram: {
        recommendations: [
          "Before/after Reels are this category's single best-performing format — invest there first.",
          "Geo-tag every post/Story with the service area to help local discovery.",
          "Show the actual technician/team doing the work — familiar faces build local trust.",
        ],
        contentIdeas: [
          "Before/after Reels of jobs completed",
          "Quick how-it-works or \"what we check\" clips",
          "Technician/team spotlights",
          "Customer testimonial Stories",
          "Seasonal tips and reminders (maintenance, prep, etc.)",
        ],
      },
      linkedin: {
        recommendations: [
          "Lower priority here — LinkedIn reaches other businesses and job seekers, not local consumers, so use it mainly for hiring and any commercial/contract-account work.",
          "If the business does commercial/contract work alongside residential, post those case studies here specifically.",
          "Keep frequency low (1–2x/month) rather than force content this audience isn't on the platform to see.",
        ],
        contentIdeas: [
          "Commercial/contract project case studies (if applicable)",
          "Hiring posts for technicians/staff",
          "Business milestones (locations, fleet growth, certifications)",
        ],
      },
      youtube: {
        recommendations: [
          "How-to and \"what we check during a service\" videos build trust and rank well in local search (\"how to fix X near me\").",
          "Keep videos short (2–5 min) and practical — this audience wants the answer, not a brand film.",
          "Feature real technicians answering real questions on camera.",
        ],
        contentIdeas: [
          "How-to / maintenance tip videos",
          "\"What we check\" service walkthrough videos",
          "Before/after project videos",
          "Customer testimonial videos",
          "FAQ videos answering common service questions",
        ],
      },
    },
  },
  "beauty-fitness-personal": {
    label: "Beauty, Fitness & Personal Care",
    platforms: {
      facebook: {
        recommendations: [
          "Lean on client transformation stories and reviews — this is the strongest trust signal for this category.",
          "Run a simple referral or loyalty offer through posts; word-of-mouth already drives this category, Facebook just needs to carry it.",
          "Post at times your typical client is likely browsing (evenings/weekends), not just business hours.",
        ],
        contentIdeas: [
          "Client transformation / results stories (with permission)",
          "Before/after photos",
          "Reviews and testimonials",
          "Behind-the-scenes of a session/appointment",
          "Limited-time offers and seasonal promotions",
        ],
      },
      instagram: {
        recommendations: [
          "This is usually the primary platform for this category — prioritise it over Facebook.",
          "Reels showing real transformations, technique or results consistently outperform static posts.",
          "Use Stories daily for availability/booking reminders — this audience books impulsively.",
        ],
        contentIdeas: [
          "Transformation/results Reels",
          "Technique or process clips",
          "Client testimonial Stories",
          "Tips and mini-tutorials",
          "Booking/availability reminders and last-minute openings",
        ],
      },
      linkedin: {
        recommendations: [
          "Generally not a priority platform for this category's actual customers — use sparingly, mainly for hiring.",
          "If relevant, post here only for staff hiring or franchise/partnership announcements.",
        ],
        contentIdeas: [
          "Hiring posts for staff/trainers/stylists",
          "Business growth or new-location announcements",
        ],
      },
      youtube: {
        recommendations: [
          "Longer tutorial and routine videos build authority and get discovered via search long after posting.",
          "Feature real clients/results with permission — it's more convincing than staged demonstrations.",
          "Shorts versions of key tips help this content get discovered by people not yet following the channel.",
        ],
        contentIdeas: [
          "Full tutorial or routine videos",
          "Client transformation videos",
          "Q&A / myth-busting videos",
          "Product or technique demos",
          "Shorts versions of key tips",
        ],
      },
    },
  },
  "health-medical": {
    label: "Health & Medical",
    platforms: {
      facebook: {
        recommendations: [
          "Keep all content compliance-aware — patient testimonials need explicit consent, and never make outcome guarantees.",
          "Health education content (not just promotion) builds trust and gets shared, which raw promotional posts rarely do.",
          "Respond to every comment/message promptly — health inquiries on social often carry real urgency.",
        ],
        contentIdeas: [
          "Patient education (condition explainers, prevention tips)",
          "Staff/doctor spotlights and credentials",
          "Facility tours",
          "Patient testimonials (with explicit consent)",
          "Seasonal health reminders (flu season, checkups, etc.)",
        ],
      },
      instagram: {
        recommendations: [
          "Use short, clear educational graphics/Reels — health topics travel well when explained simply and visually.",
          "Never show identifiable patient information without documented consent, even in Stories.",
          "Highlight the human side of the practice (staff, facility) to reduce the intimidation factor before someone books.",
        ],
        contentIdeas: [
          "Simple health-tip graphics or Reels",
          "Facility and staff behind-the-scenes",
          "Myth-busting / FAQ content",
          "Patient testimonials (with consent)",
          "Seasonal health reminders",
        ],
      },
      linkedin: {
        recommendations: [
          "Useful mainly for hiring, partnerships, and reaching referring providers rather than patients directly.",
          "Share credentials, accreditations and clinical outcomes data where available — this audience screens on those.",
        ],
        contentIdeas: [
          "Staff credentials and continuing-education milestones",
          "Facility accreditations and outcomes data",
          "Hiring posts for clinical/support staff",
          "Partnership or referral-network announcements",
        ],
      },
      youtube: {
        recommendations: [
          "Condition-explainer and \"what to expect\" videos are heavily searched — this is one of the highest-value uses of YouTube for this category.",
          "Have an actual clinician present the content on camera; it reads far more credible than narration over stock footage.",
          "Add a clear disclaimer that content is educational, not a substitute for individual medical advice.",
        ],
        contentIdeas: [
          "Condition/procedure explainer videos",
          "\"What to expect at your visit\" videos",
          "Doctor/staff Q&A videos",
          "Patient testimonial videos (with consent)",
          "Preventive health tip videos",
        ],
      },
    },
  },
  "food-hospitality-travel": {
    label: "Food, Hospitality & Travel",
    platforms: {
      facebook: {
        recommendations: [
          "Post mouth/eye-catching photos and videos frequently (4–5x/week) — this category rewards volume more than most.",
          "Keep hours, menu/offers and booking links current in every post caption, not just the Page info.",
          "Encourage and respond to reviews — they're often the deciding factor for this category.",
        ],
        contentIdeas: [
          "Fresh food/room/venue photos and short videos",
          "Daily specials, seasonal menus or offers",
          "Customer reviews and testimonials",
          "Behind-the-scenes (kitchen, staff, prep)",
          "Events, live music or seasonal happenings",
        ],
      },
      instagram: {
        recommendations: [
          "This is the primary discovery platform for this category — prioritise high-quality photo/video over Facebook.",
          "Reels of food/drink being made or a space in use consistently outperform static shots.",
          "Geo-tag every post and encourage guests to tag the business — location-tagged content drives real local discovery here.",
        ],
        contentIdeas: [
          "Reels of food/drink preparation or venue ambience",
          "Guest/user-generated content reposts",
          "Daily specials and limited-time offers",
          "Behind-the-scenes of staff/kitchen",
          "Events and seasonal happenings",
        ],
      },
      linkedin: {
        recommendations: [
          "Low priority for reaching customers — use mainly for hiring and, if there's a corporate/events/catering angle, for that audience specifically.",
          "If the business does corporate events/catering/group bookings, post that case-study content here.",
        ],
        contentIdeas: [
          "Hiring posts for staff",
          "Corporate/group booking or catering case studies (if applicable)",
          "Milestones — new locations, awards, anniversaries",
        ],
      },
      youtube: {
        recommendations: [
          "Short venue/experience walkthrough and recipe/behind-the-scenes videos work well and get discovered via search.",
          "Keep videos short and visual — this category doesn't need long-form explanation.",
          "Shorts drawn from Instagram Reels content can be repurposed here with almost no extra work.",
        ],
        contentIdeas: [
          "Venue or experience walkthrough videos",
          "Recipe or drink-making videos",
          "Staff/chef spotlights",
          "Guest experience/testimonial videos",
          "Shorts repurposed from Instagram Reels",
        ],
      },
    },
  },
  "retail-ecommerce": {
    label: "Retail & E-Commerce",
    platforms: {
      facebook: {
        recommendations: [
          "Use Shop/product tagging so posts link straight to checkout — every extra click loses buyers.",
          "Run retargeting-friendly content (new arrivals, restocks, sales) since this audience often needs a second nudge.",
          "Feature real customer photos/reviews — social proof converts better than product-only shots for this category.",
        ],
        contentIdeas: [
          "New arrival and restock announcements",
          "Customer photos and reviews (UGC)",
          "Sales, bundles and limited-time offers",
          "Styling / usage tips for the product",
          "Unboxing or product-in-use clips",
        ],
      },
      instagram: {
        recommendations: [
          "Tag every product in every post/Reel — this is the platform's single highest-leverage feature for this category.",
          "Reels showing the product in real use outperform studio product shots.",
          "Repost customer content generously — it's both free content and trust-building.",
        ],
        contentIdeas: [
          "Shoppable product posts and Reels",
          "Customer unboxing / styling / usage content (UGC)",
          "New arrivals and restocks",
          "Behind-the-scenes of sourcing/making the product",
          "Sales and limited-time offer countdowns",
        ],
      },
      linkedin: {
        recommendations: [
          "Low priority for direct sales; use mainly for hiring, supplier/partnership announcements, or a wholesale/B2B side of the business if one exists.",
        ],
        contentIdeas: [
          "Hiring and company growth posts",
          "Wholesale/B2B partnership announcements (if applicable)",
          "Brand milestones and sustainability/sourcing initiatives",
        ],
      },
      youtube: {
        recommendations: [
          "Product demo, unboxing and \"how to style/use it\" videos are heavily searched before purchase in this category.",
          "Shorts built from Reels content can be republished here at almost no extra cost.",
          "Link products in video descriptions to capture the search-driven traffic these videos attract.",
        ],
        contentIdeas: [
          "Product demo and unboxing videos",
          "Styling / how-to-use videos",
          "Customer review/testimonial videos",
          "Behind-the-scenes of production/sourcing",
          "Shorts repurposed from Instagram Reels",
        ],
      },
    },
  },
  "real-estate": {
    label: "Real Estate & Property",
    platforms: {
      facebook: {
        recommendations: [
          "Post active listings with clear photos, price and a direct enquiry link — this audience browses Facebook specifically for listings.",
          "Share market updates (local price trends, days-on-market) to build authority beyond just \"for sale\" posts.",
          "Boost your best-performing listing posts locally — geo-targeted reach is cheap and effective for this category.",
        ],
        contentIdeas: [
          "New/active listing showcases",
          "Local market updates and trends",
          "Client testimonials (buyers and sellers)",
          "Neighbourhood/area guides",
          "Just-sold announcements",
        ],
      },
      instagram: {
        recommendations: [
          "Reels/virtual-tour-style video of listings significantly outperform static photos.",
          "Use Stories for open-house countdowns and behind-the-scenes of the closing process.",
          "Post consistently even between listings — market commentary and area content keeps the account active.",
        ],
        contentIdeas: [
          "Listing walkthrough Reels",
          "Neighbourhood/area spotlight content",
          "Client testimonials and \"sold\" celebrations",
          "Open house countdowns and Stories",
          "Market update graphics",
        ],
      },
      linkedin: {
        recommendations: [
          "Useful for reaching investors, commercial clients and referral partners (mortgage brokers, lawyers, contractors) alongside residential clients.",
          "Share market data and closed-deal case studies — this audience responds to numbers and track record.",
        ],
        contentIdeas: [
          "Market data and trend commentary",
          "Closed-deal case studies",
          "Referral-partner spotlights (lenders, lawyers, contractors)",
          "Commercial/investment listing highlights",
        ],
      },
      youtube: {
        recommendations: [
          "Full listing walkthrough videos are one of the highest-converting content types available to this category — prioritise them.",
          "Local area guide videos capture long-tail search traffic from people relocating to the area.",
          "Keep a consistent intro/format so viewers recognise your listings across videos.",
        ],
        contentIdeas: [
          "Full listing walkthrough videos",
          "Neighbourhood/area guide videos",
          "Buyer/seller process explainer videos",
          "Client testimonial videos",
          "Market update videos",
        ],
      },
    },
  },
  education: {
    label: "Education & Training",
    platforms: {
      facebook: {
        recommendations: [
          "Post enrollment deadlines and program highlights clearly, with a direct link to apply/enquire.",
          "Student and alumni testimonials are this category's strongest conversion driver — collect and post them regularly.",
          "Use Facebook Events for open days, webinars and enrollment deadlines.",
        ],
        contentIdeas: [
          "Student/alumni testimonials and outcomes",
          "Program/course highlights",
          "Enrollment deadlines and open-day announcements",
          "Faculty/instructor spotlights",
          "Free mini-lessons or tips related to the subject taught",
        ],
      },
      instagram: {
        recommendations: [
          "Short \"mini-lesson\" Reels showcasing your teaching style are one of the best ways to demonstrate quality before enrollment.",
          "Post real campus/classroom life, not just marketing graphics — prospective students and parents want to see the real environment.",
          "Highlight student outcomes (placements, projects, results) consistently, not just at graduation time.",
        ],
        contentIdeas: [
          "Mini-lesson or study-tip Reels",
          "Real classroom/campus life",
          "Student project or outcome showcases",
          "Faculty/instructor spotlights",
          "Enrollment deadline reminders",
        ],
      },
      linkedin: {
        recommendations: [
          "Especially valuable for career-focused programs — post here to reach both prospective adult learners and hiring partners.",
          "Share graduate outcome data and employer partnerships — this audience screens on career results.",
        ],
        contentIdeas: [
          "Graduate outcome and placement data",
          "Employer/industry partnership announcements",
          "Faculty credentials and research/industry involvement",
          "Program launch and enrollment posts",
        ],
      },
      youtube: {
        recommendations: [
          "Full sample lessons or lecture excerpts let prospective students evaluate teaching quality before enrolling — a strong conversion tool.",
          "Campus/facility tour videos work well for programs where the physical environment matters to the decision.",
          "Shorts pulled from lesson highlights help discovery beyond your existing subscriber base.",
        ],
        contentIdeas: [
          "Sample lesson or lecture excerpt videos",
          "Campus/facility tour videos",
          "Student and alumni testimonial videos",
          "Faculty introduction videos",
          "Shorts from lesson highlights",
        ],
      },
    },
  },
  technology: {
    label: "Technology & Software",
    platforms: {
      facebook: {
        recommendations: [
          "Lower priority than LinkedIn for B2B/SaaS products — use it mainly for brand awareness and hiring rather than lead-gen.",
          "If the product is consumer-facing, focus on clear feature demos and real user results rather than technical jargon.",
          "Keep posting frequency modest (1–2x/week); quality product/feature content matters more than volume here.",
        ],
        contentIdeas: [
          "Feature highlight / product update posts",
          "Customer success stories",
          "Team and company culture spotlights",
          "Hiring posts",
          "Industry news/commentary relevant to the product",
        ],
      },
      instagram: {
        recommendations: [
          "Use for company culture, product visuals and short feature demos — this platform builds brand, not usually direct leads, for most tech products.",
          "Reels demoing a feature in under 30 seconds perform better than long walkthroughs here.",
          "Team/culture content helps with recruiting as much as marketing for this category.",
        ],
        contentIdeas: [
          "Short feature-demo Reels",
          "Team and company culture content",
          "Behind-the-scenes of building the product",
          "Customer shout-outs and use cases",
          "Event/conference presence",
        ],
      },
      linkedin: {
        recommendations: [
          "This is the primary platform for this industry — most B2B/SaaS leads and hiring happen here, not Facebook/Instagram.",
          "Founder and team thought-leadership posts consistently outperform brand-account posts for reach in this category.",
          "Share product updates alongside genuine industry commentary — an all-promotion feed underperforms a mixed one.",
        ],
        contentIdeas: [
          "Product updates and feature launches",
          "Customer case studies with measurable outcomes",
          "Founder/team thought-leadership posts",
          "Industry trend commentary",
          "Hiring and team-growth posts",
        ],
      },
      youtube: {
        recommendations: [
          "Product demo and tutorial videos double as both marketing and support content — invest here if the product has any learning curve.",
          "Customer case-study videos with real users are far more persuasive than a produced brand video for this category.",
          "Keep a consistent series format (e.g. \"What's New\" updates) so subscribers know what to expect.",
        ],
        contentIdeas: [
          "Product demo and walkthrough videos",
          "Feature update / \"what's new\" videos",
          "Customer case study videos",
          "Tutorial / how-to videos",
          "Founder or team Q&A videos",
        ],
      },
    },
  },
  "media-events": {
    label: "Media, Entertainment & Events",
    platforms: {
      facebook: {
        recommendations: [
          "Post highlight clips and behind-the-scenes content around each release/event — this category thrives on anticipation and recap content.",
          "Use Facebook Events for anything ticketed or date-specific.",
          "Engage actively in comments — fan/audience interaction itself is a major part of this category's content.",
        ],
        contentIdeas: [
          "Highlight clips and event recaps",
          "Behind-the-scenes of production/setup",
          "Announcements and countdowns",
          "Audience/fan-generated content reposts",
          "Portfolio or showreel pieces",
        ],
      },
      instagram: {
        recommendations: [
          "This is usually the primary discovery platform for this category — prioritise polished visual/video content here.",
          "Reels of key moments (performance clips, event highlights, shoot behind-the-scenes) are this category's best-performing format.",
          "Post consistently around a release/event calendar, not just when something is happening.",
        ],
        contentIdeas: [
          "Highlight/recap Reels",
          "Behind-the-scenes of a shoot, set or production",
          "Countdown and announcement content",
          "Portfolio or showreel carousels",
          "Audience/fan content reposts",
        ],
      },
      linkedin: {
        recommendations: [
          "Useful mainly for reaching corporate/B2B clients (event planners booking for corporate functions, brand partnership contacts) rather than a general audience.",
          "Share portfolio case studies and client results if the business does corporate/commercial work.",
        ],
        contentIdeas: [
          "Corporate/commercial project case studies (if applicable)",
          "Brand partnership or sponsorship announcements",
          "Hiring and crew-growth posts",
        ],
      },
      youtube: {
        recommendations: [
          "Full-length recap, showreel or \"making of\" videos are this category's strongest long-form content — prioritise them.",
          "Shorts drawn from your best moments extend reach well beyond existing subscribers.",
          "Keep a consistent channel format/branding so returning viewers recognise your content immediately.",
        ],
        contentIdeas: [
          "Full event/project recap videos",
          "\"Making of\" / behind-the-scenes videos",
          "Portfolio or showreel videos",
          "Client/audience testimonial videos",
          "Shorts from key highlight moments",
        ],
      },
    },
  },
};

// Maps each of the 34 INDUSTRIES to its social-content-strategy cluster
// above. See SOCIAL_MEDIA_INDUSTRY_CONTENT's leading comment for why
// clusters are used instead of 34 fully bespoke entries.
export const INDUSTRY_TO_SOCIAL_CLUSTER: Record<string, SocialContentClusterKey> = {
  Advocacy: "b2b-professional",
  Agriculture: "industrial-trade",
  Apparel: "retail-ecommerce",
  Auto: "home-auto-services",
  Automobile: "home-auto-services",
  B2B: "b2b-professional",
  Beauty: "beauty-fitness-personal",
  Construction: "industrial-trade",
  "Consumer Services": "home-auto-services",
  "Dating & Personals": "beauty-fitness-personal",
  "E-Commerce": "retail-ecommerce",
  Education: "education",
  "Employment & Job Training": "b2b-professional",
  "Employment Services": "b2b-professional",
  "Energy & Utilities": "industrial-trade",
  "Finance & Insurance": "b2b-professional",
  Fitness: "beauty-fitness-personal",
  "Health & Medical": "health-medical",
  Healthcare: "health-medical",
  "Home Goods": "retail-ecommerce",
  "Home Improvement": "home-auto-services",
  "Industrial Services": "industrial-trade",
  Legal: "b2b-professional",
  "Logistics & Transportation": "industrial-trade",
  Manufacturing: "industrial-trade",
  "Media & Entertainment": "media-events",
  "Pet Services": "home-auto-services",
  "Photography & Events": "media-events",
  "Real Estate": "real-estate",
  "Restaurants & Food Service": "food-hospitality-travel",
  Retail: "retail-ecommerce",
  Technology: "technology",
  Telecommunications: "industrial-trade",
  "Travel & Hospitality": "food-hospitality-travel",
};

// Standard local-SEO / Google Business Profile best practices — general
// industry practice, never claims specific to this business's actual
// listing (that would need a paid Places API, which isn't configured; see
// the Local Presence Notes field for the consultant's own manual read of
// each listing). Same non-fabrication approach as STRATEGIC_RECOMMENDATIONS
// in recommendations.ts.
export const LOCAL_BRANDING_RECOMMENDATIONS = [
  "Claim and fully verify the Google Business Profile for every location.",
  "Keep NAP (Name, Address, Phone) 100% consistent across the website, GBP and all directories.",
  "Complete every GBP field — categories, service areas, attributes, products/services, business description.",
  "Add fresh, high-quality photos and videos regularly (exterior, interior, team, products/services).",
  "Post weekly updates and offers via Google Posts to stay active in local search.",
  "Respond to every review — positive and negative — within 24-48 hours.",
  "Build a steady flow of new reviews with a simple ask (in-store signage, WhatsApp/SMS after purchase, receipt QR code).",
  "Enable messaging / click-to-WhatsApp on the profile so 'near me' searchers can reach out instantly.",
  "Add a booking/appointment link if the business takes bookings.",
  "Use local keywords naturally in the business description and Google Posts.",
  "Link the website to the GBP listing and embed a Google Map on the Contact page.",
  "Build local citations on major and industry-specific directories with identical NAP.",
];

export const AD_PLATFORMS = [
  "Google Search",
  "Google Display",
  "YouTube",
  "Facebook",
  "Instagram",
  "WhatsApp",
  "LinkedIn",
  "Microsoft Ads",
];

// Fallback Ad type / Expected result shown on the Audience step's
// "Platform-Wise Ad Type & Expected Result" card for WhatsApp, since it isn't
// one of the per-business-vertical platform suggestions in recommendations.ts
// (those cover the paid search/social networks). Click-to-WhatsApp ads run
// through Meta Ads Manager, so this is a real, defensible ad type — not a
// guess about this specific business's results.
export const WHATSAPP_PLATFORM_DETAIL = {
  adType: "Click-to-WhatsApp ads (via Meta Ads Manager)",
  expectedResult:
    "Opens a direct 1:1 WhatsApp chat with an interested prospect — typically faster replies and higher engagement than a contact form, feeding straight into the WhatsApp Marketing follow-up flow.",
};

// Maps each Audience-step platform chip to how it's keyed in the Benchmark
// Database (data/benchmarks/*.json / the `benchmarks` table) — platform name
// and campaign type there don't always match the chip label 1:1 (e.g. both
// "Google Search" and "Google Display" chips resolve to benchmark platform
// "Google Ads", split by campaignType; "Facebook" resolves to "Meta", the
// bundled Facebook+Instagram benchmark platform, since Instagram now has its
// own separate benchmark rows). Used to look up a real CPC/CPV benchmark for
// the Audience step's per-platform budget-allocation estimate — see
// suggestBudgetAllocation/estimateChannelBudgetResult in recommendations.ts.
// spendMetric is whichever metric this channel is actually bought on (CPC for
// every click-based channel, CPV for YouTube's cost-per-view video ads);
// conversionMetric is the benchmark that turns that traffic into a lead
// estimate, left unset for YouTube since "View Rate" measures ad completion,
// not a lead conversion, and estimating leads from it would be a guess this
// app doesn't have data to back up.
export const PLATFORM_BENCHMARK_KEY: Record<
  string,
  { platform: string; campaignType: string; spendMetric: "CPC" | "CPV"; volumeLabel: string; conversionMetric?: "CVR" }
> = {
  "Google Search": { platform: "Google Ads", campaignType: "Search", spendMetric: "CPC", volumeLabel: "clicks", conversionMetric: "CVR" },
  "Google Display": { platform: "Google Ads", campaignType: "Display", spendMetric: "CPC", volumeLabel: "clicks", conversionMetric: "CVR" },
  "YouTube": { platform: "YouTube", campaignType: "In-Stream (Skippable)", spendMetric: "CPV", volumeLabel: "views" },
  "Facebook": { platform: "Meta", campaignType: "Feed", spendMetric: "CPC", volumeLabel: "clicks", conversionMetric: "CVR" },
  "Instagram": { platform: "Instagram", campaignType: "Feed", spendMetric: "CPC", volumeLabel: "clicks", conversionMetric: "CVR" },
  "LinkedIn": { platform: "LinkedIn", campaignType: "Sponsored Content", spendMetric: "CPC", volumeLabel: "clicks", conversionMetric: "CVR" },
  "Microsoft Ads": { platform: "Microsoft Ads", campaignType: "Search", spendMetric: "CPC", volumeLabel: "clicks", conversionMetric: "CVR" },
  "WhatsApp": { platform: "WhatsApp", campaignType: "Click-to-Chat", spendMetric: "CPC", volumeLabel: "chats started", conversionMetric: "CVR" },
};

export const WEBSITE_TYPES = [
  "Corporate website",
  "Business website",
  "Lead-generation website",
  "E-commerce website",
  "Product catalogue",
  "Service website",
  "Landing page",
];

// Crisp, catchy detail for each website type, shown on the Audit/Info step
// when there's no existing website to recommend the right foundation instead
// of a bare dropdown. Same non-fabrication rule as everywhere else — these
// describe the website TYPE in general (a real, well-known category), never
// a claim about how this specific business's site will perform.
export const WEBSITE_TYPE_DETAILS: Record<
  string,
  { description: string; idealFor: string; suggestedPages: string[] }
> = {
  "Corporate website": {
    description:
      "The brand's digital HQ — polished and credible, built to reassure rather than hard-sell. First stop for partners and press as much as customers.",
    idealFor: "Established or multi-location businesses that need brand presence and trust more than an immediate lead form.",
    suggestedPages: ["Home", "About Us", "Our Story", "Leadership", "Careers", "Contact"],
  },
  "Business website": {
    description:
      "The reliable all-rounder — explains who you are, what you offer and why to trust you, all in one clean, professional home base.",
    idealFor: "Most small and mid-size businesses that want one credible site covering services, team and contact.",
    suggestedPages: ["Home", "About", "Services", "Testimonials", "FAQ", "Contact"],
  },
  "Lead-generation website": {
    description:
      "Built around one job: turning visitors into enquiries. Clear value proposition, trust signals, and a quote/contact form on every page.",
    idealFor: "Service businesses running paid or organic campaigns, aiming for calls, form fills or quote requests.",
    suggestedPages: ["Home", "Services", "Why Choose Us", "Testimonials", "Get a Quote"],
  },
  "E-commerce website": {
    description: "A full online store — browse, add to cart, checkout and pay. Product pages do the selling, around the clock.",
    idealFor: "Businesses selling products directly online, with delivery or shipping already sorted out.",
    suggestedPages: ["Home", "Shop", "Product Detail", "Cart", "Checkout", "About", "Contact"],
  },
  "Product catalogue": {
    description:
      "Shows off the full range with rich detail and photography — no online checkout. Every enquiry closes with a real conversation, not a cart.",
    idealFor: "High-value, custom or bespoke products better sold over a call, WhatsApp or in-store visit.",
    suggestedPages: ["Home", "Catalogue", "Product Detail", "About", "Enquire"],
  },
  "Service website": {
    description:
      "Speaks to one core service (or a tight set of them) — the problem it solves, how it works, and how to book it. Focused beats broad.",
    idealFor: "Single-service or niche providers who want a sharp pitch instead of a scattered multi-service site.",
    suggestedPages: ["Home", "The Service", "How It Works", "Pricing", "Testimonials", "Book Now"],
  },
  "Landing page": {
    description: "One page, one offer, one action — every distraction stripped away so the visitor does exactly one thing.",
    idealFor: "A single campaign, launch or promotion where every visitor should take the same next step.",
    suggestedPages: ["Home"],
  },
};

// What kind of business this actually is (what they sell / how they sell it)
// — a different axis from Business Vertical (which sector). Used on the "no
// website yet" path to drive two things: which of the WEBSITE_TYPES above
// are relevant (BUSINESS_TYPE_WEBSITE_TYPES), and what to suggest for online
// presence in the meantime, before a website exists (ONLINE_PRESENCE_
// SUGGESTIONS below).
export const BUSINESS_TYPES = ["Services", "Physical Products", "E-commerce"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

// Narrows the 7 WEBSITE_TYPES to the ones that actually fit each business
// type, so the "Recommended Website Type" dropdown offers relevant choices
// instead of all 7 regardless of what the business sells. The first entry in
// each list is used as the auto-selected default when a Business Type is
// chosen; the consultant can still pick any of the others in the narrowed
// list, or clear Business Type to see the full unfiltered set of 7.
export const BUSINESS_TYPE_WEBSITE_TYPES: Record<BusinessType, string[]> = {
  "Services": ["Lead-generation website", "Service website", "Business website", "Landing page"],
  "Physical Products": ["Product catalogue", "Business website", "Landing page"],
  "E-commerce": ["E-commerce website", "Product catalogue", "Landing page"],
};

// Real, well-known platforms a business can use for online presence RIGHT
// NOW, before a website exists — shown on the "no website yet" path as an
// editable starting list (same free-editable pattern as WEBSITE_TYPE_
// DETAILS.suggestedPages), never a claim about what will work for this
// specific client. These are genuinely real platforms/features (Google
// Business Profile, WhatsApp Business catalogs, Instagram/Facebook Shops,
// Google's free Shopping listings, etc.) — the consultant swaps in whichever
// specific marketplace/directory is actually strong in the client's own
// country or city, since that varies too much to hardcode correctly (e.g.
// Justdial/Urban Company in India vs. Yelp/Thumbtack in the US for local
// service directories, or Etsy vs. IndiaMART vs. Meesho depending on the
// product category and market).
export const ONLINE_PRESENCE_SUGGESTIONS: Record<BusinessType, { description: string; channels: string[] }> = {
  "Services": {
    description:
      "For a services business, the goal before a website exists is to be findable and bookable — most of this converts into real content for the website later, so none of it is wasted effort.",
    channels: [
      "Google Business Profile — free, appears in Maps and \"near me\" search, the single highest-priority action with no website yet.",
      "WhatsApp Business — free verified profile with a catalog/quick-replies; often the fastest way to take enquiries and bookings before a site exists.",
      "Instagram / Facebook Business Page — portfolio of past work and client testimonials, doubles as ad-ready assets later.",
      "A local service directory or marketplace matched to the market (e.g. Justdial, Urban Company or Sulekha in India; Yelp, Thumbtack or Angi in the US) — reaches people already searching for this exact service, swap in whichever is actually strong locally.",
      "LinkedIn Company Page — for B2B service businesses specifically, credibility with corporate buyers researching before they call.",
    ],
  },
  "Physical Products": {
    description:
      "For a business selling physical products but not ready for full e-commerce, the priority is letting people browse and enquire without needing a site yet.",
    channels: [
      "Google Business Profile — for a showroom, workshop or pickup location, and to show up in local product searches.",
      "WhatsApp Business Catalog — lists products with photos and prices for free; buyers message directly to order, no checkout needed.",
      "Instagram Shop / Facebook Shop — tag products directly in posts and reels so people can browse without a website.",
      "A marketplace matched to the product category (e.g. Etsy for handmade/craft, IndiaMART for B2B or wholesale, Meesho for reseller-driven products in India) — pick the one that actually fits, not all of them.",
      "Local classifieds (e.g. Facebook Marketplace, OLX) for straightforward local product sales.",
    ],
  },
  "E-commerce": {
    description:
      "For a business that wants to sell online at scale, marketplaces and social storefronts let selling start immediately, before investing in a dedicated site — and most of that catalog/photo work carries straight over once the site is built.",
    channels: [
      "A marketplace storefront (e.g. Amazon, Flipkart, Etsy or eBay, depending on geography and category) — fastest way to start selling online with built-in traffic and buyer trust already in place.",
      "Instagram Shop / Facebook Shop with checkout — a direct-to-consumer sales channel that works immediately, no site required.",
      "WhatsApp Business Catalog with Click-to-Chat — order-taking without checkout infrastructure, useful alongside the above.",
      "Google Business Profile — if there's a physical pickup, returns or fulfillment location.",
      "Google Merchant Center free listings — once there's a marketplace or social product feed, products can also appear free in Google Shopping search results.",
    ],
  },
};

export const CURRENCIES = ["USD", "INR", "AED", "SAR", "GBP", "EUR"] as const;

export const REGIONS = ["Global", "India", "UAE", "Saudi Arabia", "USA", "UK", "Other"];

// Countries for the "Target Country" selector in the assessment wizard — used
// to steer the auto-suggested target audience toward real, widely-known
// digital-behavior patterns for that market (see COUNTRY_AUDIENCE_NOTES in
// recommendations.ts). Not every micro-territory is listed — this covers
// recognised sovereign states plus a handful of major distinct markets
// (Hong Kong, Puerto Rico, etc.). "India" is the default selection.
export const COUNTRIES = [
  "Afghanistan","Albania","Algeria","American Samoa","Andorra","Angola","Anguilla","Antigua & Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia & Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cambodia","Cameroon","Canada","Cape Verde","Cayman Islands","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo - Brazzaville","Congo - Kinshasa","Cook Islands","Costa Rica","Côte d’Ivoire","Croatia","Cuba","Curaçao","Cyprus","Czechia",
  "Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
  "Falkland Islands","Faroe Islands","Fiji","Finland","France","French Guiana","French Polynesia",
  "Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guadeloupe","Guam","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hong Kong SAR China","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
  "Macao SAR China","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Martinique","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Myanmar (Burma)",
  "Namibia","Nauru","Nepal","Netherlands","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Northern Mariana Islands","Norway",
  "Oman",
  "Pakistan","Palau","Palestinian Territories","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Puerto Rico",
  "Qatar",
  "Romania","Russia","Rwanda",
  "Samoa","San Marino","São Tomé & Príncipe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Sint Maarten","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","St. Kitts & Nevis","St. Lucia","St. Vincent & Grenadines","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad & Tobago","Tunisia","Türkiye","Turkmenistan","Turks & Caicos Islands","Tuvalu",
  "U.S. Virgin Islands","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
  "Vanuatu","Vatican City","Venezuela","Vietnam",
  "Western Sahara",
  "Yemen",
  "Zambia","Zimbabwe",
  "Other",
];

// Each COUNTRIES entry's real, official ISO 4217 currency code — used to pick
// the currency symbol shown throughout the forecast/report once a consultant
// selects a Target Country, instead of always defaulting to USD. This is
// factual reference data (which currency a country actually uses), not a
// business-specific claim. "Other" has no entry and falls back to USD in
// currencyForCountry() below.
export const COUNTRY_CURRENCY: Record<string, string> = {
  "Afghanistan": "AFN",
  "Albania": "ALL",
  "Algeria": "DZD",
  "American Samoa": "USD",
  "Andorra": "EUR",
  "Angola": "AOA",
  "Anguilla": "XCD",
  "Antigua & Barbuda": "XCD",
  "Argentina": "ARS",
  "Armenia": "AMD",
  "Aruba": "AWG",
  "Australia": "AUD",
  "Austria": "EUR",
  "Azerbaijan": "AZN",
  "Bahamas": "BSD",
  "Bahrain": "BHD",
  "Bangladesh": "BDT",
  "Barbados": "BBD",
  "Belarus": "BYN",
  "Belgium": "EUR",
  "Belize": "BZD",
  "Benin": "XOF",
  "Bermuda": "BMD",
  "Bhutan": "BTN",
  "Bolivia": "BOB",
  "Bosnia & Herzegovina": "BAM",
  "Botswana": "BWP",
  "Brazil": "BRL",
  "British Virgin Islands": "USD",
  "Brunei": "BND",
  "Bulgaria": "BGN",
  "Burkina Faso": "XOF",
  "Burundi": "BIF",
  "Cambodia": "KHR",
  "Cameroon": "XAF",
  "Canada": "CAD",
  "Cape Verde": "CVE",
  "Cayman Islands": "KYD",
  "Central African Republic": "XAF",
  "Chad": "XAF",
  "Chile": "CLP",
  "China": "CNY",
  "Colombia": "COP",
  "Comoros": "KMF",
  "Congo - Brazzaville": "XAF",
  "Congo - Kinshasa": "CDF",
  "Cook Islands": "NZD",
  "Costa Rica": "CRC",
  "Croatia": "EUR",
  "Cuba": "CUP",
  "Curaçao": "ANG",
  "Cyprus": "EUR",
  "Czechia": "CZK",
  "Côte d’Ivoire": "XOF",
  "Denmark": "DKK",
  "Djibouti": "DJF",
  "Dominica": "XCD",
  "Dominican Republic": "DOP",
  "Ecuador": "USD",
  "Egypt": "EGP",
  "El Salvador": "USD",
  "Equatorial Guinea": "XAF",
  "Eritrea": "ERN",
  "Estonia": "EUR",
  "Eswatini": "SZL",
  "Ethiopia": "ETB",
  "Falkland Islands": "FKP",
  "Faroe Islands": "DKK",
  "Fiji": "FJD",
  "Finland": "EUR",
  "France": "EUR",
  "French Guiana": "EUR",
  "French Polynesia": "XPF",
  "Gabon": "XAF",
  "Gambia": "GMD",
  "Georgia": "GEL",
  "Germany": "EUR",
  "Ghana": "GHS",
  "Gibraltar": "GIP",
  "Greece": "EUR",
  "Greenland": "DKK",
  "Grenada": "XCD",
  "Guadeloupe": "EUR",
  "Guam": "USD",
  "Guatemala": "GTQ",
  "Guinea": "GNF",
  "Guinea-Bissau": "XOF",
  "Guyana": "GYD",
  "Haiti": "HTG",
  "Honduras": "HNL",
  "Hong Kong SAR China": "HKD",
  "Hungary": "HUF",
  "Iceland": "ISK",
  "India": "INR",
  "Indonesia": "IDR",
  "Iran": "IRR",
  "Iraq": "IQD",
  "Ireland": "EUR",
  "Israel": "ILS",
  "Italy": "EUR",
  "Jamaica": "JMD",
  "Japan": "JPY",
  "Jordan": "JOD",
  "Kazakhstan": "KZT",
  "Kenya": "KES",
  "Kiribati": "AUD",
  "Kuwait": "KWD",
  "Kyrgyzstan": "KGS",
  "Laos": "LAK",
  "Latvia": "EUR",
  "Lebanon": "LBP",
  "Lesotho": "LSL",
  "Liberia": "LRD",
  "Libya": "LYD",
  "Liechtenstein": "CHF",
  "Lithuania": "EUR",
  "Luxembourg": "EUR",
  "Macao SAR China": "MOP",
  "Madagascar": "MGA",
  "Malawi": "MWK",
  "Malaysia": "MYR",
  "Maldives": "MVR",
  "Mali": "XOF",
  "Malta": "EUR",
  "Marshall Islands": "USD",
  "Martinique": "EUR",
  "Mauritania": "MRU",
  "Mauritius": "MUR",
  "Mexico": "MXN",
  "Micronesia": "USD",
  "Moldova": "MDL",
  "Monaco": "EUR",
  "Mongolia": "MNT",
  "Montenegro": "EUR",
  "Montserrat": "XCD",
  "Morocco": "MAD",
  "Mozambique": "MZN",
  "Myanmar (Burma)": "MMK",
  "Namibia": "NAD",
  "Nauru": "AUD",
  "Nepal": "NPR",
  "Netherlands": "EUR",
  "New Caledonia": "XPF",
  "New Zealand": "NZD",
  "Nicaragua": "NIO",
  "Niger": "XOF",
  "Nigeria": "NGN",
  "North Korea": "KPW",
  "North Macedonia": "MKD",
  "Northern Mariana Islands": "USD",
  "Norway": "NOK",
  "Oman": "OMR",
  "Pakistan": "PKR",
  "Palau": "USD",
  "Palestinian Territories": "ILS",
  "Panama": "PAB",
  "Papua New Guinea": "PGK",
  "Paraguay": "PYG",
  "Peru": "PEN",
  "Philippines": "PHP",
  "Poland": "PLN",
  "Portugal": "EUR",
  "Puerto Rico": "USD",
  "Qatar": "QAR",
  "Romania": "RON",
  "Russia": "RUB",
  "Rwanda": "RWF",
  "Samoa": "WST",
  "San Marino": "EUR",
  "Saudi Arabia": "SAR",
  "Senegal": "XOF",
  "Serbia": "RSD",
  "Seychelles": "SCR",
  "Sierra Leone": "SLL",
  "Singapore": "SGD",
  "Sint Maarten": "ANG",
  "Slovakia": "EUR",
  "Slovenia": "EUR",
  "Solomon Islands": "SBD",
  "Somalia": "SOS",
  "South Africa": "ZAR",
  "South Korea": "KRW",
  "South Sudan": "SSP",
  "Spain": "EUR",
  "Sri Lanka": "LKR",
  "St. Kitts & Nevis": "XCD",
  "St. Lucia": "XCD",
  "St. Vincent & Grenadines": "XCD",
  "Sudan": "SDG",
  "Suriname": "SRD",
  "Sweden": "SEK",
  "Switzerland": "CHF",
  "Syria": "SYP",
  "São Tomé & Príncipe": "STN",
  "Taiwan": "TWD",
  "Tajikistan": "TJS",
  "Tanzania": "TZS",
  "Thailand": "THB",
  "Timor-Leste": "USD",
  "Togo": "XOF",
  "Tonga": "TOP",
  "Trinidad & Tobago": "TTD",
  "Tunisia": "TND",
  "Turkmenistan": "TMT",
  "Turks & Caicos Islands": "USD",
  "Tuvalu": "AUD",
  "Türkiye": "TRY",
  "U.S. Virgin Islands": "USD",
  "Uganda": "UGX",
  "Ukraine": "UAH",
  "United Arab Emirates": "AED",
  "United Kingdom": "GBP",
  "United States": "USD",
  "Uruguay": "UYU",
  "Uzbekistan": "UZS",
  "Vanuatu": "VUV",
  "Vatican City": "EUR",
  "Venezuela": "VES",
  "Vietnam": "VND",
  "Western Sahara": "MAD",
  "Yemen": "YER",
  "Zambia": "ZMW",
  "Zimbabwe": "ZWL",
};

/** Currency code for a Target Country selection — falls back to USD for "Other" or an unrecognised value. */
export function currencyForCountry(country: string | undefined | null): string {
  return (country && COUNTRY_CURRENCY[country]) || "USD";
}

export const INDUSTRIES = [
  "Advocacy",
  "Agriculture",
  "Apparel",
  "Auto",
  "Automobile",
  "B2B",
  "Beauty",
  "Construction",
  "Consumer Services",
  "Dating & Personals",
  "E-Commerce",
  "Education",
  "Employment & Job Training",
  "Employment Services",
  "Energy & Utilities",
  "Finance & Insurance",
  "Fitness",
  "Health & Medical",
  "Healthcare",
  "Home Goods",
  "Home Improvement",
  "Industrial Services",
  "Legal",
  "Logistics & Transportation",
  "Manufacturing",
  "Media & Entertainment",
  "Pet Services",
  "Photography & Events",
  "Real Estate",
  "Restaurants & Food Service",
  "Retail",
  "Technology",
  "Telecommunications",
  "Travel & Hospitality",
];

export const AUDIT_CATEGORIES = [
  { key: "technicalSeo", label: "Technical SEO" },
  { key: "onPageSeo", label: "On-Page SEO" },
  { key: "content", label: "Content" },
  { key: "uxConversion", label: "UX & Conversion" },
  { key: "branding", label: "Branding" },
  { key: "localSeo", label: "Local SEO" },
  { key: "performance", label: "Performance" },
] as const;

export function auditStatusLabel(score: number): "Critical" | "Needs Improvement" | "Good" | "Excellent" {
  if (score < 40) return "Critical";
  if (score < 65) return "Needs Improvement";
  if (score < 85) return "Good";
  return "Excellent";
}

export const BENCHMARK_DISCLAIMER =
  "Industry benchmarks are indicative reference values. Actual advertising costs and conversion performance vary based on geography, competition, audience, offer, creative quality, landing-page experience, campaign optimisation and market conditions.";

export const DATA_UNAVAILABLE = "Data unavailable – requires external tool/account access.";
