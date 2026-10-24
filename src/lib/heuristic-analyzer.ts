import type {
  ContractAuditResult,
  AnalyzedClause,
  FinancialItem,
  MissingProtection,
  ContractType,
  ClauseCategory,
  ClauseSeverity,
  FinancialFrequency,
} from "./schema";

/* ==========================================================================
 * ClauseClear - Local NLP Heuristic Engine (zero dependencies, in-memory)
 *
 * Pipeline: segment (offset-tracked) -> detect contract type -> judge every
 * sentence against 25 trap rules (negation + fair-clause aware) -> extract
 * financials -> tailor missing protections.
 *
 * INVARIANT: every exactQuote is rawText.slice(start, end) of the ORIGINAL
 * input, so it is always a verbatim substring (the highlighter never misses).
 * ========================================================================== */

type Verdict = "critical" | "warning" | "fair";

interface Rule {
  id: string;
  category: ClauseCategory;
  severity: "critical" | "warning";
  title: string;
  fairTitle?: string;
  types?: ContractType[]; // omit = applies to every contract type
  scope: RegExp; // cheap topic gate
  bad: RegExp[]; // predatory phrasing (skipped when negated, e.g. "shall not ...")
  good?: RegExp; // protective phrasing (only used when no bad pattern hit)
  exempt?: RegExp; // carve-out that flips a bad hit to fair (ignored if a $ amount is present)
  max?: number; // max predatory hits to surface (default 1)
  summary: string;
  worst: string;
  legal: string;
  fix: string;
  fair: string;
}

const LEASE: ContractType[] = ["Residential Lease", "General Agreement"];
const WORK: ContractType[] = ["Internship / Employment", "Freelance / IP", "General Agreement"];

const RULES: Rule[] = [
  /* ------------------------------ LEASES ------------------------------ */
  {
    id: "property-grant",
    category: "Termination & Renewal",
    severity: "warning",
    title: "Property Description & Tenancy Grant",
    fairTitle: "Residential Tenancy Grant (Standard Term)",
    types: LEASE,
    scope: /\b(?:agrees?\s+to\s+let|take\s+on\s+tenancy|residential\s+property\s+situated|property\s+address|property\s+type)\b/i,
    bad: [
      /\b(?:landlord|lessor)\b[^.;]{0,60}\b(?:cancel|revoke|terminate|substitute|change\s+property)\b[^.;]{0,40}\bwithout\s+notice/i,
    ],
    good:
      /\b(?:agrees?\s+to\s+let|take\s+on\s+tenancy|residential\s+property\s+situated|property\s+address)\b/i,
    summary:
      "Gives landlord unilateral authority to substitute or alter the leased property.",
    worst:
      "You arrive on move-in day to discover management switched your unit to an inferior floorplan.",
    legal:
      "A tenancy agreement must identify the demised premises with certainty and grant exclusive possession for the agreed term.",
    fix:
      "Landlord agrees to let and Tenant agrees to take the exact premises identified, with no unilateral right to substitute or reassign units.",
    fair:
      "Standard legal grant clearly defining the leased premises and confirming residential tenancy.",
  },
  {
    id: "term-duration",
    category: "Termination & Renewal",
    severity: "warning",
    title: "Lease Term & Commencement",
    fairTitle: "Fixed Lease Term & Duration (Standard Term)",
    types: LEASE,
    scope: /\b(?:term\s+of\s+(?:this\s+)?lease|fixed\s+period\s+of|commencing\s+on|expiring\s+on|duration\s+of\s+tenancy)\b/i,
    bad: [
      /\b(?:terminate\s+at\s+will|cancel\s+at\s+any\s+time|terminate\s+without\s+cause)\b[^.;]{0,40}\b(?:by\s+landlord|without\s+notice)/i,
    ],
    good:
      /\b(?:fixed\s+period\s+of|commencing\s+on|expiring\s+on|fixed\s+term|term\s+of\s+(?:this\s+)?(?:lease|agreement))\b/i,
    summary:
      "Allows the landlord to cut the fixed lease term short without cause or fair notice.",
    worst:
      "You are forced to pack and vacate mid-year because the landlord decided to re-purpose the unit.",
    legal:
      "Fixed-term leases bind both parties through the expiration date unless mutual termination or a proven material breach occurs.",
    fix:
      "The tenancy shall continue for the full fixed period, and neither party may terminate early without proven cause or mutual written agreement.",
    fair:
      "Standard fixed-term tenancy providing guaranteed occupancy dates and stability.",
  },
  {
    id: "rent-payment",
    category: "Financial Liability",
    severity: "warning",
    title: "Monthly Rent & Payment Schedule",
    fairTitle: "Agreed Monthly Rent & Payment Schedule",
    types: LEASE,
    scope: /\b(?:monthly\s+rent\w*|pay\s+a\s+monthly\s+rental|due\s+date|calendar\s+month\s+in\s+advance|bank\s+transfer)\b/i,
    bad: [
      /\b(?:increase|raise|adjust)\s+rent\b[^.;]{0,40}\b(?:at\s+any\s+time|without\s+notice|sole\s+discretion)/i,
      /\bwithout\s+demand\b[^.;]{0,40}\bpenalty\b/i,
    ],
    good:
      /\b(?:pay\s+a\s+monthly\s+rental|due\s+on\s+or\s+before|bank\s+transfer|calendar\s+month\s+in\s+advance)\b/i,
    summary:
      "Allows unexpected mid-term rent increases or punitive payment terms.",
    worst:
      "Landlord raises rent by $300 mid-lease claiming inflation or operating cost adjustments.",
    legal:
      "During a fixed-term residential tenancy, rent cannot be increased unilaterally unless an explicit, reasonable escalation clause was agreed upon in advance.",
    fix:
      "Monthly rent shall remain strictly fixed for the entire lease term and may not be adjusted without Tenant's prior written consent.",
    fair:
      "Specifies the agreed monthly rental amount and clear calendar payment schedule.",
  },
  {
    id: "deposits-breakdown",
    category: "Financial Liability",
    severity: "critical",
    title: "Security & Utility Deposits",
    fairTitle: "Refundable Security & Utility Deposits (21-30 Day Window)",
    types: LEASE,
    scope: /\b(?:security\s+deposit|utility\s+deposit|advance\s+rent|deposits?\s+do\s+not\s+represent\s+rent|refunded\s+without\s+interest)\b/i,
    bad: [
      /\b(?:non[- ]?refundable|forfeit\w*|shall\s+not\s+be\s+refunded)\b/i,
      /\b(?:deduct\w*|withh\w+)\b[^.;]{0,50}\b(?:without\s+itemi|sole\s+discretion)/i,
    ],
    good:
      /\b(?:refunded\s+without\s+interest\s+to\s+the\s+tenant|within\s+(?:\[?e\.g\.,?\s*\]?)?\s*(?:21|30|twenty[- ]one|thirty)\s*days|refundable\s*\))\b/i,
    summary:
      "Labels security or utility deposits as non-refundable or allows arbitrary deductions.",
    worst:
      "Landlord pockets thousands in deposits at move-out citing vague unitemized cleaning costs.",
    legal:
      "Security deposits remain the tenant's lawful property held in trust. They must be refunded within a statutory window (typically 21 to 30 days) less only documented actual repairs beyond fair wear and tear.",
    fix:
      "All security and utility deposits shall be 100% refundable, held in trust, and returned with an itemized accounting within 21 to 30 days of move-out.",
    fair:
      "Clearly designates security and utility deposits as refundable with a defined 21 to 30 day return deadline.",
  },
  {
    id: "utilities-breakdown",
    category: "Financial Liability",
    severity: "warning",
    title: "Utilities & Outgoings Allocation",
    fairTitle: "Fair Utility & Property Tax Division",
    types: LEASE,
    scope: /\b(?:utilities\s+consumed|electricity\s*\(?tnb|water\s*\(?syabas|indah\s+water|sewerage|cukai\s+taksiran|cukai\s+tanah|assessment\s+rates|management\s+fees|sinking\s+fund)\b/i,
    bad: [
      /\btenant\b[^.;]{0,60}\b(?:responsible|liable|pay)\b[^.;]{0,60}\b(?:cukai\s+taksiran|cukai\s+tanah|property\s+tax|sinking\s+fund|assessment\s+rates|management\s+fees)/i,
    ],
    good:
      /\blandlord\s+shall\s+be\s+responsible\s+for\b[^.;]{0,90}\b(?:assessment\s+rates|cukai\s+taksiran|property\s+tax|cukai\s+tanah|management\s+fees|sinking\s+fund)|\btenant\s+shall\s+be\s+responsible\s+for\s+(?:the\s+)?timely\s+payment\s+of\s+all\s+utilities\s+consumed\b/i,
    summary:
      "Pushes owner obligations like property taxes (Cukai Tanah/Taksiran) and building sinking funds onto the student tenant.",
    worst:
      "You receive a surprise annual tax bill for hundreds of dollars that legally belongs to the property owner.",
    legal:
      "Statutory assessment rates (Cukai Taksiran), quit rent (Cukai Tanah), and condo management sinking funds are landlord ownership expenses that should not be shifted to residential tenants.",
    fix:
      "Tenant is responsible only for metered utilities consumed during tenancy (electricity, water, internet). Landlord pays all property taxes, assessment rates, and building management/sinking fund fees.",
    fair:
      "Fairly allocates metered consumption to tenant while landlord covers property taxes and building management fees.",
  },
  {
    id: "entry",
    category: "Privacy & Entry",
    severity: "critical",
    title: "Unannounced Landlord Entry",
    fairTitle: "Advance Notice Required for Landlord Entry",
    types: LEASE,
    scope: /\b(?:enter\w*|entry|entries|access\w*|inspect\w*|unlock\w*|passkey)\b/i,
    bad: [
      /\b(?:enter\w*|entry|access\w*|inspect\w*|unlock\w*)\b[^.;]{0,90}\b(?:at any (?:time|hour)|any time|anytime|without\s+(?:\w+\s+){0,3}?(?:notice|consent|permission|notification|warning)|no (?:prior |advance )?notice)/i,
      /\b(?:at any (?:time|hour)|anytime|without\s+(?:\w+\s+){0,3}?(?:notice|consent|permission))\b[^.;]{0,60}\b(?:enter\w*|entry|access\w*|inspect\w*)/i,
      /\bpasskey\b|\bunannounced\b|\bnotice (?:is|shall be) not (?:required|necessary)\b|\bno notice (?:is|shall be) (?:required|necessary)\b/i,
    ],
    good:
      /\b(?:\d+|twenty[- ]four|forty[- ]eight|seventy[- ]two)\b[^.;]{0,20}\b(?:hours?|days?)\b[^.;]{0,45}\bnotice\b|\bnotice\b[^.;]{0,45}\b(?:\d+|twenty[- ]four|forty[- ]eight)\b[^.;]{0,15}\b(?:hours?|days?)\b|\b(?:with|upon|giving|after)\s+(?:reasonable|prior|advance|written)\s+(?:\w+\s+){0,2}?(?:notice|permission)\b|\breasonable\s+(?:prior\s+)?notice\b|\b(?:shall|may|will|must|can)\s+not\s+(?:\w+\s+){0,2}?(?:enter\w*|access)\b[^.;]{0,40}\bwithout\b/i,
    summary:
      "The landlord can walk into your home at any hour without warning you first.",
    worst:
      "Maintenance staff or a prospective tenant unlocks your door at 3 AM or while you are showering, and the lease says that is allowed.",
    legal:
      "Most states require roughly 24-48 hours' written notice for non-emergency entry (e.g., California Civ. Code 1954 sets 24 hours); unlimited entry undermines the covenant of quiet enjoyment.",
    fix:
      "Except in verified emergencies endangering life or property, Landlord shall give Tenant at least twenty-four (24) hours' advance written notice stating the date, time window, and reason before entering the premises.",
    fair: "Requires advance notice before the landlord enters, protecting your privacy.",
  },
  {
    id: "repair",
    category: "Maintenance & Repairs",
    severity: "critical",
    title: "Tenant-Paid Repairs & Deductibles",
    fairTitle: "Tenant Maintenance with Normal Wear and Tear Excepted",
    types: LEASE,
    scope: /\b(?:repair\w*|maintenance|maintain\w*|plumbing|appliance\w*|hvac|drain\w*|clog\w*|disposal|deductible|water heater|tenantable|fixtures|fittings|wear and tear|clean(?:liness)?)\b/i,
    bad: [
      /\b(?:tenant|resident|lessee|you)\b[^.;]{0,70}\b(?:responsible|liable|pay|bear|cost|expense|reimburse|charged)\w*[^.;]{0,90}\b(?:repair\w*|plumbing|appliance\w*|hvac|maintenance|drain\w*|clog\w*|water heater|disposal)\b/i,
      /\b(?:repair|maintenance|service)\s+(?:deductible|fee|charge|call fee)\b|\bdeductible\b/i,
      /\bfirst\s+\$\s?\d/i,
      /\b(?:tenant|resident|you)\b[^.;]{0,40}\b(?:shall|must|will|agrees? to)\s+(?:maintain|repair|replace)\b[^.;]{0,60}\b(?:all|any|appliance\w*|plumbing|hvac|heating|air)/i,
    ],
    exempt:
      /\b(?:caused by|resulting from|due to|arising from|damage by)\b[^.;]{0,50}\b(?:tenant|resident|guest|negligen\w+|misuse|abuse|willful|intentional)/i,
    good:
      /\b(?:landlord|owner|management|lessor)\b[^.;]{0,40}\b(?:shall|will|agrees to|is|remains?)\b(?!\s+not\b)[^.;]{0,25}\b(?:responsible|maintain|repair|keep)\w*[^.;]{0,70}\b(?:repair\w*|plumbing|appliance\w*|hvac|maintenance|heating|premises|habitable)|\b(?:fair|reasonable|normal|ordinary)\s+wear\s+and\s+tear\s+(?:excepted|excluded)\b|\bclean,\s+good,\s+and\s+tenantable\b/i,
    summary:
      "You pay out of pocket for plumbing, appliance, or HVAC repairs, even when the cause is ordinary wear.",
    worst:
      "The 12-year-old water heater dies and you owe a $350 'deductible' before anyone is sent to fix it.",
    legal:
      "The implied warranty of habitability (recognized in nearly every state) obliges landlords to keep plumbing, heat, and supplied appliances working, and it generally cannot be waived by lease. Tenants can be charged only for damage they cause.",
    fix:
      "Landlord shall bear all cost of maintaining and repairing plumbing, HVAC, and supplied appliances, except damage proven to be caused by Tenant's negligence or misuse. No deductible or service-call fee shall apply.",
    fair: "Standard tenant maintenance obligation with fair wear and tear properly excepted.",
  },
  {
    id: "joint-several",
    category: "Financial Liability",
    severity: "critical",
    title: "Joint & Several Liability (Roommate Ghosting Risk)",
    fairTitle: "Individual Liability / Separate Roommate Share",
    types: LEASE,
    scope: /\b(?:joint\w*|several\w*|each (?:tenant|resident|roommate|occupant)|co-?tenants?|roommates?|guarant\w+|co-?sign\w*)\b/i,
    bad: [
      /\bjoint(?:ly)?(?:\s+and\s+|\s*(?:&|\/)\s*|[- ]and[- ])several(?:ly)?\b|\bjointly\s+(?:liable|responsible)/i,
      /\b(?:each|any|every|all)\s+(?:tenant|resident|roommate|occupant|co-?tenant)s?\b[^.;]{0,80}\b(?:liable|responsible)\b[^.;]{0,50}\b(?:entire|full|total|whole|all|any)\b/i,
      /\bresponsible for (?:the )?(?:entire|full|total) (?:rent|amount|balance)|\b(?:default|failure to pay) by (?:any|one)\b[^.;]{0,60}\b(?:tenant|roommate|occupant)/i,
    ],
    good:
      /\b(?:severally|individually)\b[^.;]{0,20}\b(?:liable|responsible)\b|\bliable only for (?:his|her|their|its) (?:own |individual |pro[- ]?rata )?(?:share|portion)|\bseparate (?:lease|leases|liability)|\bindividual lease\b/i,
    summary:
      "If one roommate stops paying or moves out, the landlord can demand the entire rent from you.",
    worst:
      "A roommate ghosts mid-semester and you are suddenly on the hook for their share, plus their damage and fees.",
    legal:
      "Joint-and-several liability is common and generally enforceable, so negotiate individual leases or a roommate-replacement process before signing.",
    fix:
      "Each Tenant shall be severally liable only for their own pro-rata share of rent and charges. Landlord shall allow a qualified replacement roommate, subject only to reasonable credit verification.",
    fair: "Limits each roommate to their own share of rent and charges.",
  },
  {
    id: "sublet",
    category: "Termination & Renewal",
    severity: "warning",
    title: "Subletting Ban / Summer Break Trap",
    fairTitle: "Subletting Permitted with Reasonable Consent",
    types: LEASE,
    scope: /\b(?:sublet\w*|sub-let\w*|sublease\w*|assign\w*|airbnb|vrbo|short[- ]term rental|replacement (?:tenant|roommate)|re-?let\w*)\b/i,
    bad: [
      /\b(?:no|not|never|prohibit\w*|forbid\w*|forbidden|without\s+(?:\w+\s+){0,4}?(?:consent|approval|permission))\b[^.;]{0,90}\b(?:sublet\w*|sub-let\w*|sublease\w*|assign\w*|airbnb|vrbo|short[- ]term rental)\b/i,
      /\b(?:sublet\w*|sublease\w*|assignment|airbnb|short[- ]term rental)\b[^.;]{0,80}\b(?:prohibited|forbidden|not (?:permitted|allowed)|void)\b/i,
      /\b(?:sublet|sublease|assignment|transfer|re-?let\w*)\s+(?:fee|charge|penalty)\b/i,
      /\b(?:sole|absolute)\s+discretion\b[^.;]{0,60}\b(?:sublet|sublease|assign)|\b(?:sublet|sublease|assign)\w*[^.;]{0,80}\b(?:sole|absolute)\s+discretion\b/i,
    ],
    exempt: /\bunreasonabl\w+\s+(?:withh\w+|condition\w*|delay\w*)|\breasonabl\w+\s+(?:consent|approval)/i,
    good: /\b(?:may|permitted to|entitled to|right to)\s+(?:sublet|sublease|assign)\w*\b/i,
    summary:
      "You cannot sublet or hand off your room, so a summer internship or study-abroad term still costs full rent.",
    worst:
      "You land an internship in another city but must keep paying thousands in rent for an empty room.",
    legal:
      "Some jurisdictions (e.g., New York RPL 226-b) bar landlords from unreasonably refusing sublet consent. Absolute bans are worth negotiating, especially in student markets.",
    fix:
      "Tenant may sublease or assign to a qualified replacement tenant, with Landlord's consent not to be unreasonably withheld, conditioned, or delayed, and subject only to reasonable credit verification.",
    fair: "Allows subletting with reasonable consent, giving you an exit when plans change.",
  },
  {
    id: "deposit",
    category: "Financial Liability",
    severity: "critical",
    title: "Non-Refundable Deposit & Mandatory Move-Out Deductions",
    fairTitle: "Itemized & Refundable Security Deposit",
    types: LEASE,
    scope: /\b(?:deposit\w*|carpet|cleaning|painting|re-?decorat\w*|turnover|move[- ]out|restoration|wear and tear|forfeit\w*)\b/i,
    max: 2,
    bad: [
      /\bnon[- ]?refundable\b|\bforfeit\w*\b/i,
      /\b(?:mandatory|automatic(?:ally)?|flat|standard|required)\b[^.;]{0,50}\b(?:carpet|cleaning|painting|re-?decorat\w*|turnover|restoration)\b/i,
      /\b(?:carpet|cleaning|painting|re-?decorat\w*|turnover|restoration)\b[^.;]{0,60}\b(?:deduct\w*|withh\w+|charged|fee|charge|retain\w*)\b/i,
      /\b(?:deduct\w*|withh\w+)\b[^.;]{0,50}\b(?:for|due to)\s+(?:ordinary|normal|reasonable)\s+wear/i,
      /\bmove[- ]out\s+(?:fee|charge)\b/i,
    ],
    good:
      /\b(?:return\w*|refund\w*)\b[^.;]{0,80}\bwithin\s+(?:\w+\s*){0,2}\(?\d+\)?\s*(?:calendar |business )?days\b|\bitemi[sz]ed\s+(?:statement|list|accounting)|\b(?:excluding|except for|other than|beyond)\s+(?:ordinary|normal|reasonable)\s+wear|\bwear and tear\b[^.;]{0,50}\b(?:excluded|not (?:be )?(?:deducted|charged))/i,
    summary:
      "Part of your deposit is declared non-refundable, or cleaning, carpet, and paint charges are deducted no matter how you leave the unit.",
    worst:
      "You scrub the apartment spotless, yet management still keeps $300-$400 for 'standard turnover' and carpet cleaning.",
    legal:
      "Most states forbid non-refundable security deposits and deductions for normal wear and tear, require itemized deductions, and set a return deadline (e.g., 21 days in California).",
    fix:
      "The entire security deposit is refundable. Landlord may deduct only actual, itemized costs (with receipts) for damage beyond normal wear and tear, and shall return the balance within twenty-one (21) days of move-out.",
    fair: "Promises an itemized, time-limited deposit return that excludes normal wear and tear.",
  },
  {
    id: "rubs",
    category: "Financial Liability",
    severity: "warning",
    title: "Utility Ratio Billing (RUBS) & Billing Markups",
    fairTitle: "Actual-Cost Utilities (No Markups)",
    types: LEASE,
    scope: /\b(?:utilit\w+|water|sewer|electric\w*|trash|ratio|rubs|submeter\w*|allocat\w+|billing)\b/i,
    bad: [
      /\bratio utility\b|\brubs\b|\bsubmeter\w*/i,
      /\ballocat\w+[^.;]{0,60}\b(?:utilit\w+|water|sewer|trash|electric\w*)|\b(?:utilit\w+|water|sewer|trash)\b[^.;]{0,70}\b(?:allocat\w+|pro[- ]?rat\w+|proportion\w*|square f\w+|occupancy|divided|apportion\w*)/i,
      /\b(?:billing|administrative|admin|service)\s+(?:fee|charge)\b[^.;]{0,60}\b(?:utilit\w+|water|sewer|trash)|\b(?:utilit\w+|water|sewer)\b[^.;]{0,60}\b(?:billing|administrative|admin|service)\s+(?:fee|charge)/i,
      /\b(?:utilit\w+|water|sewer)\b[^.;]{0,50}\b(?:plus|\+)\s+(?:a |an )?(?:\w+\s+){0,2}(?:fee|charge|markup)/i,
    ],
    exempt: /\b(?:actual|at cost|without (?:any )?(?:markup|surcharge|administrative fee))\b/i,
    summary:
      "Utilities are split by a formula (square footage, occupancy) rather than your real usage, often with an added billing fee.",
    worst:
      "You live alone, shower quickly, and still pay for a share of the whole building's water plus a $5 monthly 'billing' fee.",
    legal:
      "RUBS billing is legal in many states but regulated: some require disclosure of the formula, cap charges at the landlord's actual cost, or limit admin fees.",
    fix:
      "Utilities shall be billed at the landlord's actual cost based on measured usage, with no markup, administrative fee, or billing surcharge, and the allocation formula shall be disclosed in writing before signing.",
    fair: "Passes utilities through at actual cost without markups.",
  },
  {
    id: "disparage",
    category: "Liability & Waivers",
    severity: "critical",
    title: "Non-Disparagement / Online Review Gag Clause",
    fairTitle: "Protected Right to Honest Reviews & Feedback",
    scope: /\b(?:disparag\w*|review\w*|defam\w*|social media|negative|criticiz\w+|public(?:ly)? (?:statement|comment)s?|yelp|google)\b/i,
    bad: [
      /\bnon[- ]?disparagement\b/i,
      /\b(?:shall not|may not|will not|must not|agrees? not to|prohibited from|refrain from|cannot)\b[^.;]{0,100}\b(?:disparag\w+|defam\w+|criticiz\w+|negative(?:ly)?|(?:online |public |written )?reviews?|social media|post\w*)\b/i,
      /\b(?:disparag\w+|negative (?:review|comment|statement|post)s?)\b[^.;]{0,80}\b(?:fine|penalt\w+|liquidated|damages|forfeit\w*|\$\s?\d)/i,
    ],
    exempt: /\b(?:truthful|honest|accurate)\b|\bnothing (?:herein|in this)\b[^.;]{0,80}\b(?:prohibit|restrict|limit)/i,
    summary:
      "You are barred from posting negative reviews or criticizing them publicly, sometimes under threat of a fine.",
    worst:
      "After a mold problem, you post an honest review and get billed a $500 'breach' penalty.",
    legal:
      "The federal Consumer Review Fairness Act (15 U.S.C. 45b) generally voids form-contract clauses that restrict honest consumer reviews; some states add their own protections.",
    fix:
      "Nothing in this agreement restricts either party from making truthful statements, reviews, or complaints to regulators, courts, or the public.",
    fair: "Explicitly preserves your right to make truthful statements and reviews.",
  },
  {
    id: "guest",
    category: "Privacy & Entry",
    severity: "warning",
    title: "Guest Limits, Curfews & Visitor Fees",
    fairTitle: "Reasonable Guest Policy (No Curfew or Fees)",
    types: LEASE,
    scope: /\b(?:guests?|visitors?|overnight|curfew|occupants?)\b/i,
    bad: [
      /\b(?:guests?|visitors?|overnight)\b[^.;]{0,100}\b(?:\$\s?\d|fee|fine|penalt\w+|not (?:be )?(?:allowed|permitted)|prohibited|no more than|limited to|in excess of|more than \w+\s*\(?\d*\)?\s*(?:consecutive )?(?:nights?|days?)|written (?:consent|approval|permission)|registered)/i,
      /\bcurfew\b|\bunauthori[sz]ed (?:occupants?|persons?|guests?)\b/i,
    ],
    good:
      /\bguests?\b[^.;]{0,80}\b(?:up to|for)\s+(?:\w+\s*)?\(?(?:1[4-9]|[2-9]\d)\)?\s*(?:consecutive\s+)?(?:days|nights)|\bguests?\b[^.;]{0,40}\bwelcome\b/i,
    summary:
      "Friends, partners, or family can only stay a few nights, with fees or fines if they stay longer.",
    worst:
      "Your sibling visits for a long weekend and management bills you a 'unauthorized occupant' penalty.",
    legal:
      "Tenants have a right to reasonable guests; fees or caps that act as penalties, or that conflict with local law, are often unenforceable. Limits are fair only once a guest becomes a de facto resident.",
    fix:
      "Tenant may host guests for up to fourteen (14) consecutive nights, and thirty (30) nights per year, without notice, consent, or fees.",
    fair: "Sets a generous guest allowance without fees.",
  },
  {
    id: "early-termination",
    category: "Termination & Renewal",
    severity: "critical",
    title: "Rent Acceleration & Punitive Early-Exit Penalty",
    fairTitle: "Mitigation Duty / Capped Early Termination",
    scope: /\b(?:terminat\w+|break\w*|early|accelerat\w+|remaining|unexpired|liquidated|vacate|abandon\w*|default\w*|re-?let\w*|mitigat\w+)\b/i,
    bad: [
      /\baccelerat\w+/i,
      /\b(?:all|entire|remaining|balance of|total|full)\b[^.;]{0,35}\b(?:rent|payments?|dues|fees|balance|term)\b[^.;]{0,60}\b(?:immediately|due|payable|owed|accelerat\w+)\b/i,
      /\b(?:remaining|unexpired)\s+(?:term|months?|balance|rent|payments?)\b|\bdue and payable\b|\bliquidated damages\b/i,
      /\b(?:early[- ])?(?:termination|cancell?ation|buy[- ]?out|lease[- ]break)\s+(?:fee|charge|penalty)\b/i,
      /\b(?:break|breaking|terminat\w+)\b[^.;]{0,30}\b(?:lease|agreement|contract|membership)\b[^.;]{0,60}\b(?:fee|penalt\w+|charge|forfeit\w*|\$\s?\d|(?:one|two|three|\d+)\s+months?)/i,
    ],
    exempt:
      /\bmitigat\w+|\bre-?(?:let|rent)\w*\b[^.;]{0,50}\b(?:credit|reduc\w+|release\w*)|\breasonable efforts to re-?(?:let|rent)/i,
    good:
      /\b(?:landlord|lessor|company)\b[^.;]{0,40}\b(?:shall|will|must|agrees to)\b[^.;]{0,30}\b(?:mitigat\w+|re-?(?:let|rent)\w*)\b/i,
    summary:
      "Leaving early makes all remaining payments due at once, or triggers a large flat penalty.",
    worst:
      "You relocate for a job after 4 months and get a demand for the remaining $8,000+ even if they re-rent the unit next week.",
    legal:
      "Most states require landlords to mitigate damages by re-renting, and liquidated damages must be a reasonable forecast of loss, not a penalty. Military and domestic-violence early-exit rights may also apply.",
    fix:
      "Tenant may terminate early on thirty (30) days' written notice by paying a fee not exceeding one (1) month's rent, and Landlord shall use reasonable efforts to re-rent and credit all re-letting income against any balance.",
    fair: "Requires the landlord to mitigate losses instead of demanding all remaining rent.",
  },
  {
    id: "holdover",
    category: "Financial Liability",
    severity: "warning",
    title: "Punitive Holdover Rent",
    fairTitle: "Reasonable Holdover & Month-to-Month Conversion",
    types: LEASE,
    scope: /\b(?:hold(?:ing)?[- ]?over|remain\w*|overstay\w*)\b/i,
    bad: [
      /\bhold(?:ing)?[- ]?over\b[^.;]{0,120}\b(?:double|twice|triple|(?:1[5-9]\d|[2-9]\d\d)\s*%|(?:two|three|2|3)\s*(?:times|x)|\$\s?\d)/i,
      /\b(?:remain\w*|overstay\w*)\b[^.;]{0,60}\b(?:after|beyond)\b[^.;]{0,50}\b(?:term|expir\w+|lease)\b[^.;]{0,100}\b(?:double|twice|triple|\d+\s*%|(?:two|three|2|3)\s*(?:times|x)|\$\s?\d)/i,
    ],
    good: /\bhold(?:ing)?[- ]?over\b[^.;]{0,80}\bmonth[- ]to[- ]month\b/i,
    summary:
      "Staying even a few days past move-out day can cost double rent or a steep daily rate.",
    worst:
      "A delayed move-out by 3 days triggers double-rent charges on top of a full month's overlap.",
    legal:
      "Many states limit holdover damages to actual loss or a reasonable multiple of rent; flat punitive multipliers can be challenged as penalties.",
    fix:
      "A holdover shall convert to a month-to-month tenancy at no more than 110% of the prior rent, prorated daily, and shall not incur additional penalties.",
    fair: "Converts a short holdover to month-to-month at a reasonable rate.",
  },
  {
    id: "self-help",
    category: "Termination & Renewal",
    severity: "critical",
    title: "Lockouts, Self-Help Eviction & Waived Court Rights",
    fairTitle: "Judicial Process & Notice to Cure Protection",
    types: LEASE,
    scope: /\b(?:evict\w*|notice to (?:quit|vacate|cure)|lock\w*|self[- ]help|abandon\w*|confess\w*|cognovit|waive\w*|remov\w+)\b/i,
    bad: [
      /\bwaive\w*\b[^.;]{0,70}\b(?:notice to (?:quit|vacate|cure)|right to (?:cure|notice|a hearing|hearing)|judicial|court|jury)\b/i,
      /\b(?:change the locks?|lock(?:ing)? (?:you|tenant|the tenant) out|lockout|remove (?:your |tenant['’]?s? )?(?:belongings|property|possessions))\b[^.;]{0,100}\b(?:without|immediately|upon default|any default|any breach)/i,
      /\bself[- ]help\b|\bconfess\w*\s+judgment\b|\bcognovit\b|\bwithout\s+(?:\w+\s+){0,2}(?:court|legal|judicial)\s+(?:process|order|proceedings?|action)\b/i,
    ],
    good:
      /\bnotice and (?:an )?opportunity to cure\b|\b(?:\d+|ten|five|three|seven|fourteen|thirty)\b[^.;]{0,15}\bdays?\b[^.;]{0,20}\b(?:notice )?to cure\b|\bonly\b[^.;]{0,30}\b(?:through|by)\b[^.;]{0,20}\b(?:court|judicial|legal process)\b/i,
    summary:
      "The landlord claims they can change your locks or remove your belongings without going to court, or you pre-waive your right to notice.",
    worst:
      "You are one day late and come home to a changed lock and your stuff in the hallway.",
    legal:
      "Self-help evictions (lockouts, removing belongings, utility shutoffs) are illegal in nearly all states, and waivers of statutory notice and hearing rights are typically void.",
    fix:
      "Landlord may recover possession only through lawful judicial process after written notice and a ten (10) day opportunity to cure. Tenant does not waive any statutory notice, hearing, or jury rights.",
    fair: "Gives you written notice and a chance to fix a problem before any remedy.",
  },
  {
    id: "default-cure",
    category: "Termination & Renewal",
    severity: "critical",
    title: "Default & Immediate Lease Forfeiture",
    fairTitle: "Notice & Opportunity to Cure Before Default Action",
    types: LEASE,
    scope: /\b(?:defaults?|breach\w*|remedy|cure|terminate the tenancy|re-?enter)\b/i,
    bad: [
      /\b(?:defaults?|breach\w*)\b[^.;]{0,70}\b(?:immediately|without\s+(?:notice|opportunity|cure)|no notice|waive\w*\s+notice|immediate (?:forfeiture|eviction|termination))/i,
      /\b(?:re-?enter|forfeit\w*|evict\w*)\b[^.;]{0,70}\b(?:without\s+(?:\w+\s+){0,3}?(?:notice|cure|court|process)|immediately)/i,
    ],
    good:
      /\b(?:fails?|neglects?)\s+to\s+(?:remedy|cure)\b[^.;]{0,50}\bwithin\s+[^.;]{0,30}\b(?:days?|hours?)\b|\b(?:written\s+)?notice\s+and\s+(?:an?\s+)?opportunity\s+to\s+cure\b|\bremedy\s+the\s+breach\s+within\b|\b(?:\d+|seven|fourteen|thirty|ten|five)\b[^.;]{0,15}\bdays?\b[^.;]{0,30}\b(?:written\s+)?notice\b[^.;]{0,40}\b(?:cure|remedy|defaults?|breach)/i,
    summary:
      "Allows the landlord to re-enter or terminate immediately upon an alleged breach without giving you time to cure it.",
    worst:
      "A single clerical delay or misunderstanding triggers immediate eviction proceedings without warning.",
    legal:
      "Most jurisdictions require landlords to give formal written notice and a statutory cure window (often 7 to 14 days) before taking lease forfeiture action.",
    fix:
      "In the event of an alleged default, Landlord shall provide at least fourteen (14) days' written notice detailing the breach and granting Tenant the full period to cure prior to initiating legal remedies.",
    fair:
      "Requires written notice and a fair cure window (e.g. 7-14 days) before any forfeiture action.",
  },
  {
    id: "alterations",
    category: "Maintenance & Repairs",
    severity: "warning",
    title: "Strict Alteration & Wall Decorating Ban",
    fairTitle: "Alterations & Decorating with Landlord Approval",
    types: LEASE,
    scope: /\b(?:alteration\w*|structural|paint\w* (?:walls|interior)|drill\w*|holes?|decorat\w*)\b/i,
    bad: [
      /\b(?:no|never|prohibit\w*|not\s+(?:make|permit))\b[^.;]{0,60}\b(?:alteration\w*|structural|paint\w*|drill\w*|holes?)\b[^.;]{0,40}\b(?:under any circumstances|strictly forbidden)/i,
      /\b(?:alteration\w*|decorat\w*|paint\w*|drill\w*)\b[^.;]{0,50}\b(?:prohibited|forbidden|fine|penalty|\$\s?\d)/i,
    ],
    exempt:
      /\b(?:with|without)\s+(?:the\s+)?(?:prior\s+)?(?:written\s+)?(?:consent|approval|permission)\b|\breasonabl\w+\s+(?:consent|approval)\b/i,
    good:
      /\bwithout\s+(?:[a-z0-9'’]+\s+){0,3}?(?:prior\s+)?written\s+(?:approval|consent|permission)\b|\b(?:alteration\w*|structural|paint\w*|drill\w*)\b[^.;]{0,60}\bwritten\s+(?:approval|consent|permission)\b|\b(?:minor|cosmetic)\s+(?:changes?|decorat\w*)\b|\bhang\s+(?:pictures?|art)\b/i,
    summary:
      "Completely bans alterations or painting walls, penalizing you even for minor hanging holes or personalization.",
    worst:
      "Hanging a calendar or small picture frame results in a $150 unauthorized alteration deduction from your deposit.",
    legal:
      "While landlords may regulate structural changes, reasonable hanging of personal items using small nails is standard and protected against punitive deductions.",
    fix:
      "Tenant may hang pictures and standard wall decorations using small nails. Major structural changes or painting shall require Landlord's prior written consent, not to be unreasonably withheld.",
    fair:
      "Standard residential term prohibiting structural alterations while allowing approved modifications.",
  },
  {
    id: "pets-conduct",
    category: "Termination & Renewal",
    severity: "warning",
    title: "Blanket Pet Ban & Activity Restrictions",
    fairTitle: "Standard Pet & Health/Safety Compliance Policy",
    types: LEASE,
    scope: /\b(?:pets?|animals?|hazardous|unlawful|illegal (?:activities?|acts?)|nuisance)\b/i,
    bad: [
      /\b(?:no|not\s+keep|prohibit\w*|forbidden)\b[^.;]{0,40}\b(?:pets?|animals?|dogs?|cats?)\b[^.;]{0,40}\b(?:under any circumstance|strict\w*)/i,
      /\bpet\s+(?:fee|rent|surcharge)\b[^.;]{0,40}\b\$\s?\d/i,
    ],
    exempt:
      /\b(?:service|assistance|support|esa)\s+animals?\b|\bwith(?:out)?\s+(?:the\s+)?(?:prior\s+)?(?:written\s+)?(?:consent|approval|permission)\b/i,
    good:
      /\b(?:hazardous|illegal|unlawful)\b[^.;]{0,40}\b(?:prohibited|not\s+engage|strictly forbidden)\b|\bnot\s+keep\s+any\s+pets\b|\bpets?\s+(?:permitted|allowed|welcome)\b/i,
    summary:
      "Imposes a blanket ban on all pets or charges excessive recurring pet rent without accommodating assistance animals.",
    worst:
      "Having a legally certified emotional support or service animal causes a lease violation notice or illegal fines.",
    legal:
      "Under the federal Fair Housing Act, landlords must provide reasonable accommodations for verified service and assistance animals regardless of a general no-pet policy.",
    fix:
      "Landlord shall accommodate verified service and emotional support animals with zero fees or deposits in accordance with the Fair Housing Act.",
    fair:
      "Standard clause ensuring premises remain safe, lawful, and free from hazardous materials.",
  },
  {
    id: "residential-use",
    category: "Termination & Renewal",
    severity: "warning",
    title: "Restricted Occupancy & Home Activity Prohibition",
    fairTitle: "Residential Use Only (Standard Protective Term)",
    types: LEASE,
    scope: /\b(?:residential\w*|solely|strictly|occupancy|educational|purposes? only|commercial use|home[- ]based business)\b/i,
    bad: [
      /\bprohibit\w*\b[^.;]{0,60}\b(?:remote work|work from home|studying|educational|computer|online)\b/i,
      /\bcommercial\s+purposes?\b[^.;]{0,30}\bpenalty\b/i,
    ],
    exempt:
      /\bcustomary\s+remote\s+work\b|\bhome\s+office\b/i,
    good:
      /\b(?:strictly|solely|used\s+only|used\s+strictly)\s+for\s+(?:residential|private|educational|living)\s+purposes?\b|\bresidential\s+(?:purposes?|use)\s+only\b/i,
    summary:
      "Bans customary home activities, remote work, or quiet freelance work under the guise of commercial use restrictions.",
    worst:
      "Quietly working from your laptop on an online internship is claimed by management to violate a 'no business' clause.",
    legal:
      "Clauses restricting premises to residential use are standard, but cannot reasonably bar quiet online studying or remote work.",
    fix:
      "Tenant may conduct customary quiet remote study and home-office work that does not generate commercial customer foot traffic.",
    fair:
      "Standard term ensuring the property is used exclusively as a peaceful residential home.",
  },

  /* --------------------- UNIVERSAL (lease, gym, work) --------------------- */
  {
    id: "late-fee",
    category: "Financial Liability",
    severity: "warning",
    title: "Excessive or Compounding Late Fees",
    fairTitle: "Grace Period & Capped Late Fee",
    scope: /\b(?:late|grace|delinquen\w+|past[- ]due|overdue)\b/i,
    bad: [
      /\b(?:per|each|every)\s+day\b|\bdaily\b|\bcompound\w*|\bper diem\b/i,
      /\b(?:late|delinquen\w+|past[- ]due|overdue)\b[^.;]{0,70}(?:\b(?:1[0-9]|[2-9][0-9])(?:\.\d+)?\s*%|\$\s?(?:[5-9]\d|\d{3,})(?![\d]))/i,
      /\bno grace\b|\bgrace period\b[^.;]{0,15}\b(?:none|no|waived)\b|\b(?:due|assessed|charged|applied)\b[^.;]{0,30}\b(?:on|after)\s+the\s+(?:1st|first|2nd|second)\b/i,
    ],
    good:
      /\bgrace period of\s+(?:\w+\s*)?\(?(?:[3-9]|\d{2})\)?\s*(?:calendar |business )?days|\blate (?:fee|charge)\b[^.;]{0,50}\b(?:not to exceed|capped at|no more than|maximum of|limited to)\b|\blate fee\b[^.;]{0,30}\$\s?(?:[1-4]?\d)(?:\.\d\d)?(?![\d,])/i,
    summary:
      "Missing a due date by a day triggers heavy or daily-growing late fees with little or no grace period.",
    worst:
      "Rent posts one day late and a $75 fee plus $10/day builds to over $200 in a week.",
    legal:
      "Many states cap residential late fees (often ~4-10% of rent or a flat amount) and require a grace period; daily-compounding fees are frequently struck down as penalties.",
    fix:
      "Late fees apply only after a five (5) day grace period, are a single flat charge capped at 5% of monthly rent, and do not compound or accrue daily.",
    fair: "Offers a grace period and keeps the late fee modest and capped.",
  },
  {
    id: "waiver",
    category: "Liability & Waivers",
    severity: "critical",
    title: "Negligence Waiver & Broad Indemnity",
    fairTitle: "Provider Negligence Liability & Mutual Protection",
    scope: /\b(?:liab\w+|waive\w*|hold harmless|indemnif\w+|responsible for|as[- ]is|negligen\w+|release\w*|assum\w+|risk|disclaim\w*)\b/i,
    bad: [
      /\b(?:waive|release|hold harmless|indemnif)\w*\b[^.;]{0,140}\b(?:negligen\w+|(?:any|all) (?:and all )?(?:claims?|liabilit\w+|damages?|injur\w+|losses)|all claims)/i,
      /\b(?:not|never|no)\s+(?:be\s+)?(?:liable|responsible)\s+(?:for|to)\b[^.;]{0,90}\b(?:theft|injur\w+|damage\w*|loss|water|fire|negligen\w+|malfunction\w*|defect\w*|equipment|property|acts?)/i,
      /\bassum\w+ (?:all|any|full|the) risk|\bat (?:your|member['’]?s?|tenant['’]?s?|user['’]?s?) (?:own )?risk|\bas[- ]is\b|\bsole (?:risk|responsibility)\b|\bregardless of (?:fault|negligence|cause)|\bincluding (?:the )?(?:landlord|company|club|facility|owner|employer)['’]?s?\s+(?:own\s+)?negligence/i,
      /\b(?:landlord|company|club|facility|owner|management)\b[^.;]{0,30}\b(?:disclaims?|excludes?)\b[^.;]{0,60}\b(?:liab\w+|warrant\w+)/i,
    ],
    exempt:
      /\b(?:except|excluding|other than|unless|save for)\b[^.;]{0,70}\b(?:gross negligence|willful|wilful|intentional|misconduct|negligence)\b/i,
    good:
      /\b(?:landlord|company|club|facility|owner|management|employer)\b[^.;]{0,30}\b(?:shall|will|remains?)\b(?!\s+not\b)[^.;]{0,15}\b(?:liable|responsible)\s+for\b[^.;]{0,80}\b(?:negligen\w+|gross|damage\w*|injur\w+)/i,
    summary:
      "They disclaim responsibility, even for their own negligence or broken equipment, and make you assume the risk.",
    worst:
      "A frayed cable machine snaps, or a burst pipe ruins your laptop, and the waiver is used to deny any compensation.",
    legal:
      "Courts rarely enforce waivers of gross negligence or statutory duties, and many states void residential exculpatory clauses (e.g., NY GOL 5-321, Cal. Civ. Code 1953).",
    fix:
      "Provider remains liable for injury or loss caused by its negligence, defective equipment, or failure to maintain safe premises. Any release is limited to ordinary inherent risks and excludes negligence and willful misconduct.",
    fair: "Keeps the provider liable for its own negligence and carves out only inherent risks.",
  },
  {
    id: "attorney-fees",
    category: "Liability & Waivers",
    severity: "critical",
    title: "One-Sided Attorney Fees",
    fairTitle: "Mutual Prevailing Party Attorney Fees",
    scope: /\b(?:attorney\w*|legal fees|court costs|lawyer\w*|collection (?:costs|fees|agency)|prevailing)\b/i,
    bad: [
      /\b(?:tenant|resident|member|employee|intern|contractor|client|you|subscriber|lessee)\b[^.;]{0,90}\b(?:pay|bear|reimburse|liable for|responsible for|indemnify)\b[^.;]{0,70}\b(?:attorney\w*|legal (?:fees|costs)|court costs|collection (?:costs|fees)|lawyer\w*)/i,
      /\b(?:landlord|company|club|employer|owner|management|lessor)['’]?s?\s+(?:reasonable\s+)?(?:attorney\w*|legal (?:fees|costs)|court costs|collection (?:costs|fees))/i,
    ],
    exempt: /\bprevailing party\b|\beach party\b[^.;]{0,30}\bbear/i,
    good: /\b(?:prevailing party|either party|each party)\b[^.;]{0,100}\b(?:attorney\w*|legal fees|court costs)/i,
    summary:
      "You must pay their lawyers and court costs in any dispute, but they never owe yours.",
    worst:
      "You dispute a wrongful $400 deduction and, even if you are right, face thousands in their attorney fees.",
    legal:
      "Many states make one-sided fee clauses reciprocal by statute (e.g., Cal. Civ. Code 1717), and courts view unilateral fee-shifting in consumer contracts skeptically.",
    fix:
      "In any dispute, the substantially prevailing party shall recover reasonable attorney fees and court costs from the other party.",
    fair: "Fee-shifting is mutual and goes to the prevailing party.",
  },
  {
    id: "auto-renewal",
    category: "Termination & Renewal",
    severity: "critical",
    title: "Automatic Renewal Trap",
    fairTitle: "Opt-In Renewal / Month-to-Month Conversion",
    scope: /\b(?:renew\w*|evergreen|month[- ]to[- ]month|automatic\w*|opt[- ]out|roll\w* over|extend\w*)\b/i,
    bad: [
      /\bautomatic(?:ally)?\s+(?:renew\w*|extend\w*|continue\w*|roll\w*)|\bauto[- ]?renew\w*|\bevergreen\b|\brenew\w*\s+automatically/i,
      /\b(?:will|shall)\s+(?:automatically\s+)?(?:renew|continue|extend|roll over)\b[^.;]{0,70}\b(?:unless|until)\b[^.;]{0,70}\b(?:notice|cancel\w*|terminat\w+)/i,
    ],
    exempt: /\bmonth[- ]to[- ]month\b|\bwith your (?:express )?(?:written )?consent\b|\bopt[- ]in\b/i,
    good:
      /\brenew\w*\b[^.;]{0,60}\b(?:only (?:with|upon|by)|mutual|written (?:agreement|consent))|\bno automatic renewal\b|\bwill not (?:automatically )?renew/i,
    summary:
      "The contract silently locks you into another full term unless you cancel inside a narrow window.",
    worst:
      "You miss a 60-day cancellation window by a week and are bound to another 12 months at a higher rate.",
    legal:
      "Federal ROSCA and many state auto-renewal laws (e.g., Cal. Bus. & Prof. Code 17600 et seq.) require clear disclosure and easy cancellation, and some require advance renewal reminders.",
    fix:
      "After the initial term, this agreement converts to month-to-month and either party may end it with thirty (30) days' notice by email or online portal. Provider shall send a renewal reminder 30-60 days before any renewal.",
    fair: "Renewal needs your agreement or becomes a flexible month-to-month.",
  },
  {
    id: "cancel-hurdle",
    category: "Termination & Renewal",
    severity: "critical",
    title: "Certified-Mail / In-Person Cancellation Maze",
    fairTitle: "Easy Online or Email Cancellation",
    scope: /\b(?:cancel\w*|terminat\w+|notice|mail|writing|in[- ]person|opt[- ]out|non[- ]?renew\w*)\b/i,
    bad: [
      /\b(?:certified|registered)\s+(?:u\.?s\.?\s+)?mail|\breturn receipt\b/i,
      /\bin[- ]person\b[^.;]{0,60}\b(?:cancel\w*|terminat\w+)|\b(?:cancel\w*|terminat\w+)\b[^.;]{0,70}\bin[- ]person\b/i,
      /\b(?:cancel\w*|terminat\w+)\b[^.;]{0,70}\b(?:only|must)\b[^.;]{0,50}\b(?:mail|letter|fax|home (?:club|location|gym)|post)\b/i,
      /\b(?:non[- ]?renew\w*|opt[- ]out)\b[^.;]{0,80}\b(?:6\d|7\d|8\d|9\d|sixty|ninety)\b[^.;]{0,6}\s*(?:\(\d+\)\s*)?days/i,
    ],
    exempt: /\b(?:online|e-?mail|app|portal|website|web site|self[- ]serve|one[- ]click|text message)\b/i,
    good:
      /\bcancel\w*\b[^.;]{0,60}\b(?:online|e-?mail|app|portal|website|self[- ]serve|one[- ]click)\b|\b(?:online|e-?mail|app|portal|website)\b[^.;]{0,40}\bcancel\w*/i,
    summary:
      "Quitting requires certified mail, an in-person visit, or an unusually long notice, so most people miss the window.",
    worst:
      "You try to cancel a gym membership by email, are told it is invalid, and get charged for three more months.",
    legal:
      "Federal ROSCA and state laws (e.g., California requires online cancellation if you signed up online) demand simple cancellation methods; mail-only or in-person-only rules are increasingly unlawful.",
    fix:
      "Subscriber may cancel at any time by email, online portal, or app, effective on the next billing cycle, with written confirmation within 48 hours.",
    fair: "Lets you cancel through an easy method like email or an online portal.",
  },

  /* ------------------------ INTERNSHIPS / FREELANCE ------------------------ */
  {
    id: "non-compete",
    category: "IP & Ownership",
    severity: "critical",
    title: "Post-Employment Non-Compete",
    fairTitle: "Freedom to Work / No Non-Compete Restriction",
    scope: /\b(?:compet\w+|restrictive covenant\w*|exclusiv\w+|moonlight\w*|outside (?:work|employment|activit\w+)|other (?:employment|employer|work))\b/i,
    bad: [
      /\bnon[- ]?compet\w+|\brestrictive covenant\w*/i,
      /\b(?:shall|may|will|must|agrees? to)\s+not\b[^.;]{0,40}\b(?:directly or indirectly\s+)?(?:compete|engage|work|be (?:employed|engaged)|provide services|perform services|accept employment|consult)\b[^.;]{0,120}\b(?:competit\w+|competing|similar|any (?:other )?(?:company|business|employer|person)|same (?:industry|field)|related)\b/i,
      /\bcompet\w+\b[^.;]{0,120}\b(?:\d+|one|two|three|six|twelve|eighteen|twenty[- ]four)\b[^.;]{0,15}\b(?:months?|years?)\b|\b(?:\d+|one|two|three|six|twelve|eighteen|twenty[- ]four)\b[^.;]{0,15}\b(?:months?|years?)\b[^.;]{0,100}\bcompet\w+/i,
      /\bexclusive(?:ly)?\b[^.;]{0,50}\b(?:services?|work|employ\w+)\b|\b(?:outside|other)\s+(?:employment|work|activities|projects)\b[^.;]{0,60}\b(?:prohibited|not (?:permitted|allowed)|prior written (?:consent|approval))/i,
    ],
    good:
      /\bno non[- ]?compete\b|\bnot (?:be )?(?:subject to|bound by) (?:a |any )?non[- ]?compete|\b(?:free|permitted|allowed|entitled)\s+to\s+(?:\w+\s+){0,3}(?:other|outside)\s+(?:work|projects|clients|employment)/i,
    summary:
      "After you leave, you are blocked from working in your field or for similar companies for months or years.",
    worst:
      "You finish a summer internship and cannot accept a full-time offer from a rival without a legal threat.",
    legal:
      "The FTC's 2024 non-compete ban was set aside in court and is not in force, but California, Minnesota, North Dakota, and Oklahoma void most employee non-competes and many other states restrict them for interns and lower-wage workers.",
    fix:
      "No non-compete applies. Individual remains bound only by reasonable confidentiality obligations and a non-solicitation covenant limited to trade secrets and not exceeding six (6) months.",
    fair: "Confirms you are free to take other work, clients, or projects.",
  },
  {
    id: "non-solicit",
    category: "IP & Ownership",
    severity: "warning",
    title: "Non-Solicitation of Clients & Colleagues",
    fairTitle: "Reasonable & Limited Non-Solicitation",
    types: WORK,
    scope: /\b(?:solicit\w*|poach\w*|hire away|no[- ]hire|induce|recruit\w*)\b/i,
    bad: [
      /\bnon[- ]?solicit\w*|\bno[- ]hire\b/i,
      /\b(?:solicit\w*|poach\w*|induce|hire away|recruit\w*)\b[^.;]{0,140}\b(?:\d+|one|two|three|six|twelve|eighteen|twenty[- ]four)\b[^.;]{0,15}\b(?:months?|years?)|\b(?:\d+|one|two|three|six|twelve|eighteen|twenty[- ]four)\b[^.;]{0,15}\b(?:months?|years?)\b[^.;]{0,100}\b(?:solicit\w*|poach\w*)/i,
      /\b(?:shall|may|will)\s+not\b[^.;]{0,50}\bsolicit\w*\b[^.;]{0,60}\b(?:customers?|clients?|employees?|contractors?|personnel)/i,
    ],
    summary:
      "You cannot approach the company's clients, contacts, or coworkers for a set period after leaving.",
    worst:
      "A friend at the company asks you to join your new startup, and your former employer threatens you for 'soliciting' them.",
    legal:
      "Non-solicits are enforceable in many states if reasonable in time and scope (often 6-12 months), but are weaker or void for employees in states like California.",
    fix:
      "Non-solicitation is limited to six (6) months, applies only to clients with whom Individual had material contact, and excludes general advertisements and unsolicited inquiries.",
    fair: "Limits non-solicitation to a reasonable scope.",
  },
  {
    id: "ip-grab",
    category: "IP & Ownership",
    severity: "critical",
    title: "Universal IP Assignment (Hackathon & Side-Project Seizure)",
    fairTitle: "Protected Personal IP & Side-Project Exclusions",
    scope: /\b(?:intellectual property|inventions?|work product|works? (?:of authorship|made for hire)|work[- ]for[- ]hire|copyright\w*|patent\w*|assign\w*|ownership|owns?|moral rights|side projects?|hackathon\w*|coursework|license\w*|ideas?)\b/i,
    bad: [
      /\b(?:all|any|every)\b[^.;]{0,50}\b(?:inventions?|works?|ideas?|software|code|creations?|projects?|developments?|materials?|intellectual property|work product|improvements?)\b[^.;]{0,140}\b(?:whether or not|regardless of|related|unrelated|outside\b[^.;]{0,15}\bhours|off[- ]hours|personal (?:time|equipment|laptop|computer|device)s?|(?:own|personal) time|weekends?|evenings?|hackathon\w*|coursework|academic|university|school|side)/i,
      /\bhackathon\w*|\bcoursework\b|\bside[- ]projects?\b|\bmoral rights\b/i,
      /\b(?:irrevocabl\w+|perpetual\w*)\b[^.;]{0,70}\b(?:license|assign\w*|transfer\w*|ownership|rights?)\b/i,
      /\bhereby\s+(?:irrevocably\s+)?assigns?\b[^.;]{0,120}\b(?:all|any|every)\b|\b(?:company|employer|client)\s+(?:shall\s+)?(?:own|owns|retain|retains)\b[^.;]{0,60}\b(?:all|any|every)\b|\ball right,? title,? and interest\b/i,
    ],
    exempt:
      /\b(?:excluding|excludes?|except(?: for)?|other than|carve[- ]?outs?|not (?:include|assign|apply)|does not (?:include|apply|extend))\b[^.;]{0,120}\b(?:personal|own|independent|side|academic|coursework|prior|pre-?existing|hackathon|2870|own time|without (?:company|employer))\b|\bupon\s+(?:receipt of\s+)?(?:full\s+)?payment\b/i,
    good:
      /\b(?:retains?|remains?|keeps?)\b[^.;]{0,50}\b(?:ownership|all (?:right|rights)|copyright)\b|\bnothing\b[^.;]{0,60}\b(?:assign|transfer)\b|\bnon[- ]?exclusive license\b/i,
    summary:
      "The company claims ownership of everything you create, including weekend projects, hackathon code, and coursework.",
    worst:
      "Your side startup or thesis project becomes the company's property, and you cannot publish or sell it.",
    legal:
      "Employee-invention statutes (California Labor Code 2870, plus IL, WA, MN, DE, NC, NJ and others) protect inventions made on your own time without employer resources or trade secrets.",
    fix:
      "Assignment covers only work created within the scope of the engagement using Company resources. Personal, academic, open-source, and hackathon projects made on Individual's own time and equipment are expressly excluded.",
    fair: "Limits IP assignment to work-related output and protects your own projects.",
  },
  {
    id: "trap",
    category: "Financial Liability",
    severity: "critical",
    title: "Training Repayment (TRAP) / Exit Fee",
    fairTitle: "No Training Repayment Penalty",
    types: WORK,
    scope: /\b(?:repay\w*|reimburs\w+|training|relocation|bonus|claw[- ]?back|liquidated|stay[- ]or[- ]pay|exit fee|early (?:departure|separation|resignation|termination)|resign\w*|leav\w+)\b/i,
    bad: [
      /\b(?:repay\w*|reimburs\w+|refund|pay back)\b[^.;]{0,110}\b(?:training|relocation|onboarding|bonus|tuition|certification\w*|recruit\w+|costs?)\b/i,
      /\b(?:training|relocation|signing bonus|sign-on bonus|onboarding|tuition)\b[^.;]{0,120}\b(?:repay\w*|reimburs\w+|pay back|claw[- ]?back|liquidated|forfeit\w*|owe\w*)\b/i,
      /\bclaw[- ]?back\b|\bstay[- ]or[- ]pay\b|\bexit fee\b/i,
      /\b(?:resign\w*|leav\w+|quit|depart\w*|terminat\w+)\b[^.;]{0,40}\b(?:before|prior to|within|earlier than)\b[^.;]{0,50}\b(?:\d+|one|two|six|twelve|eighteen|twenty[- ]four)\b[^.;]{0,15}\b(?:months?|years?)\b[^.;]{0,100}\b(?:\$\s?\d|repay\w*|reimburs\w+|liquidated|owe\w*|forfeit\w*)/i,
      /\bliquidated damages\b[^.;]{0,80}\b(?:resign\w*|leav\w+|quit|depart\w*)/i,
    ],
    good: /\b(?:no|not)\b[^.;]{0,20}\b(?:repay\w*|reimburs\w+|claw[- ]?back)\b|\bwill not be (?:required|obligated) to (?:repay|reimburse)/i,
    summary:
      "If you leave before a set date, you owe the company 'training' or bonus costs, a classic stay-or-pay trap.",
    worst:
      "You quit after 5 months and get a $4,000 bill for 'training' that was just on-the-job onboarding.",
    legal:
      "TRAPs have drawn scrutiny from the CFPB, FTC, and state AGs, and recent laws (e.g., California AB 692) restrict most stay-or-pay terms. Legitimate repayment is usually limited to real, pro-rated third-party costs.",
    fix:
      "Company shall not require repayment of training, onboarding, or equipment costs. Any signing bonus clawback is limited to a pro-rated amount over six (6) months and excludes termination without cause.",
    fair: "Confirms you will not have to repay training or onboarding costs.",
  },
  {
    id: "payment-terms",
    category: "Financial Liability",
    severity: "warning",
    title: "Delayed, Conditional, or Unpaid Compensation",
    fairTitle: "Prompt & Guaranteed Payment Terms",
    types: WORK,
    scope: /\b(?:payment|invoice\w*|net[- ]?\d+|compensat\w+|paid|unpaid|stipend|wages?|retainer|kill fee|exposure)\b/i,
    bad: [
      /\bnet[- ]?(?:60|75|90|120)\b|\b(?:within|after)\s+(?:\w+\s*)?\(?(?:60|75|90|120|sixty|ninety)\)?\s*(?:calendar |business )?days\b[^.;]{0,60}\b(?:invoice|receipt|acceptance|completion|approval|delivery)/i,
      /\b(?:pay\w*|compensat\w+)\b[^.;]{0,80}\b(?:contingent|conditioned|conditional|dependent)\s+(?:up)?on\b[^.;]{0,80}\b(?:satisf\w+|approv\w+|accept\w+|discretion|receipt of (?:payment|funds)|(?:client|company)['’]?s? (?:own )?(?:payment|funding))/i,
      /\bunpaid\b[^.;]{0,50}\b(?:intern\w*|trial|probation\w*|test|sample|spec|work)\b|\bpa(?:y|id)[- ]when[- ]paid\b|\bexposure\b/i,
      /\b(?:no|without)\s+(?:kill fee|compensation)\b[^.;]{0,60}\b(?:cancel\w+|terminat\w+|work (?:performed|completed))/i,
    ],
    good:
      /\bnet[- ]?(?:7|10|14|15|30)\b|\bwithin\s+(?:\w+\s*)?\(?(?:5|7|10|14|15|30)\)?\s*(?:calendar |business )?days\b[^.;]{0,60}\b(?:invoice|receipt|completion|termination|separation)|\blate (?:payment|invoice)s?\b[^.;]{0,60}\b(?:interest|fee)\b/i,
    summary:
      "Pay is delayed, made conditional on the company's approval or own payment, or paid in 'exposure'.",
    worst:
      "You deliver the work, the client sits on it for 90 days, then refuses payment citing 'dissatisfaction'.",
    legal:
      "For-profit unpaid internships must satisfy the FLSA primary-beneficiary test. Freelancer laws (NY, IL, CA) require written contracts and payment within 30 days by default.",
    fix:
      "Invoices are payable within fourteen (14) days of receipt; payment is not conditioned on client approval beyond objective acceptance criteria; late balances accrue 1.5% monthly interest; terminated work is paid pro-rata.",
    fair: "Sets prompt, objective payment terms.",
  },

  /* ----------------------------- GENERAL TRAPS ----------------------------- */
  {
    id: "unilateral-change",
    category: "Financial Liability",
    severity: "warning",
    title: "Unilateral Price & Terms Changes",
    fairTitle: "Price & Term Changes Require Notice or Mutual Consent",
    scope: /\b(?:modif\w+|amend\w*|chang\w+|increas\w+|adjust\w*|revis\w+|alter\w*|update\w*|subject to change|unilateral\w*)\b/i,
    bad: [
      /\b(?:may|can|reserves? the right to|has the right to|have the right to|shall have the (?:sole )?right to|retains? the right to)\b[^.;]{0,30}\b(?:chang\w+|modif\w+|amend\w*|increas\w+|adjust\w*|revis\w+|alter\w*|updat\w+)\b[^.;]{0,110}\b(?:at any time|from time to time|without\s+(?:\w+\s+){0,3}?(?:notice|consent|approval)|(?:sole|absolute) discretion|unilateral\w*)/i,
      /\b(?:fees?|dues|rates?|prices?|rent|charges?|terms)\b[^.;]{0,60}\b(?:subject to change|may (?:be )?(?:increase\w*|chang\w+|adjust\w*)|can (?:be )?(?:increase\w*|chang\w+))\b[^.;]{0,70}\b(?:without|at any time|sole discretion|from time to time)/i,
      /\bunilateral\w*\b[^.;]{0,40}\b(?:amend\w*|modif\w+|chang\w+)/i,
    ],
    exempt:
      /\b(?:\d+|thirty|forty[- ]five|sixty|fourteen)\b[^.;]{0,25}\bdays?\b[^.;]{0,20}\b(?:advance |prior |written )*notice\b|\bwritten notice\b[^.;]{0,50}\b(?:\d+|thirty|sixty)\b|\bmutual (?:written )?(?:agreement|consent)|\bsigned by (?:both|each)\b/i,
    good: /\bmay (?:only )?be (?:amended|modified|changed)\b[^.;]{0,40}\b(?:writing|mutual|both parties|signed)\b/i,
    summary:
      "They can raise prices or rewrite the rules any time without your agreement.",
    worst:
      "Your gym dues jump $15 a month overnight, and staying silent counts as consent.",
    legal:
      "A contract change normally requires mutual consent and consideration; many states require advance notice and a right to cancel before fee increases take effect.",
    fix:
      "No fee, price, or term change takes effect without thirty (30) days' written notice and the Subscriber's right to cancel without penalty before the change applies.",
    fair: "Changes require advance notice or mutual written agreement.",
  },
  {
    id: "junk-fees",
    category: "Financial Liability",
    severity: "warning",
    title: "Buried Mandatory Junk Fees",
    fairTitle: "Transparent All-In Pricing (No Hidden Junk Fees)",
    max: 10,
    scope: /\b(?:fees?|surcharges?|charges?|assessments?|dues|premium)\b/i,
    bad: [
      /\b(?:annual|yearly|semi[- ]annual|quarterly)\s+(?:\w+\s+){0,2}?(?:fee|assessment|charge|surcharge|dues)s?\b/i,
      /\b(?:facility|facilities|maintenance|equipment|enhancement|renovation|amenity|technology|tech|package|parcel|locker|portal|online payment|processing|convenience|trash|valet|pest|administrative|admin|internet|cable|cleaning|move[- ]in|move[- ]out|lock[- ]?out|renewal|community|service|registration|activation|sign[- ]?up|handling|documentation)\s+(?:services?\s+)?(?:fee|charge|surcharge|assessment)s?\b/i,
      /\b(?:fee|charge|surcharge|assessment)s?\b[^.;]{0,40}\b(?:non[- ]?refundable|mandatory|required|automatically|billed|assessed|added|in addition)\b|\bvalet trash\b|\bconvenience fee\b|\bprocessing fee\b/i,
    ],
    exempt:
      /\b(?:no|without|free of|waived|not charge\w*)\b[^.;]{0,25}\b(?:fees?|charges?|surcharges?)\b|\bincluded in (?:the )?(?:monthly )?(?:rent|dues|price|base)/i,
    summary:
      "Mandatory add-on fees quietly inflate the real price well above the advertised rent or dues.",
    worst:
      "A $45 portal fee, $25 valet trash, and $120 annual facility fee add roughly $1,000 a year to your advertised price.",
    legal:
      "The FTC all-in pricing rule covers only lodging and event tickets, but several states (e.g., California Civ. Code 1947.3 for rent, and its Honest Pricing Law) require mandatory fees in the advertised price.",
    fix:
      "All mandatory fees shall be disclosed in writing and included in the advertised price. No additional portal, trash, package, amenity, or administrative fees may be charged without Tenant's written opt-in.",
    fair: "States that no extra fees apply or that fees are included in the price.",
  },
  {
    id: "arbitration",
    category: "Liability & Waivers",
    severity: "warning",
    title: "Forced Arbitration, Class Waiver & Distant Venue",
    fairTitle: "Local Jurisdiction & Court Access Rights",
    scope: /\b(?:arbitrat\w+|class[- ]action|jury|waive\w*|venue|jurisdiction|small claims)\b/i,
    bad: [
      /\b(?:binding|mandatory)\s+arbitration\b|\bclass[- ]action\s+waiver\b/i,
      /\bwaive\w*\b[^.;]{0,80}\b(?:jury|class|trial|right to sue|court|small claims)\b|\bshall be (?:resolved|settled|submitted|decided)\b[^.;]{0,70}\barbitrat\w+/i,
      /\bexclusive\s+(?:venue|jurisdiction)\b[^.;]{0,120}\b(?:county|state|courts? of|located in)\b|\bsmall claims\b[^.;]{0,50}\b(?:waive\w*|may not|not (?:permitted|allowed)|prohibited)/i,
    ],
    exempt:
      /\bsmall claims\b[^.;]{0,70}\b(?:may(?!\s+not)|retain\w*|preserv\w*|permitted|excluded)|\bopt[- ]out\b[^.;]{0,50}\barbitrat\w+/i,
    good: /\bmediation\b[^.;]{0,60}\b(?:before|prior to)\b/i,
    summary:
      "Disputes go to private arbitration or a distant court, and you give up jury and class-action rights.",
    worst:
      "A wrongful charge hits thousands of tenants or members, but you can only fight it alone, in another state.",
    legal:
      "Arbitration and class waivers are generally enforceable under the Federal Arbitration Act, but courts strike unconscionable terms, some states restrict them in residential leases, and small-claims access is commonly preserved.",
    fix:
      "Either party may bring claims in small claims court or the courts of Tenant's county of residence. Any arbitration is optional, non-binding on individual statutory claims, and its costs are borne by the business.",
    fair: "Preserves your access to small claims court or a mediation step first.",
  },
  {
    id: "one-sided-termination",
    category: "Termination & Renewal",
    severity: "warning",
    title: "One-Sided Termination Right",
    fairTitle: "Mutual Notice for Agreement Termination",
    scope: /\b(?:terminat\w+|cancel\w*|dismiss\w*|suspend\w*)\b/i,
    bad: [
      /\b(?:company|employer|client|landlord|club|facility|owner|management|we|us|lessor)\b[^.;]{0,30}\b(?:may|can|reserves? the right to|has the right to)\s+(?:terminate|cancel|suspend|revoke)\b[^.;]{0,120}\b(?:at any time|for any reason|without\s+(?:\w+\s+){0,3}?(?:cause|notice|reason|liability|compensation|payment|refund)|immediately|(?:sole|absolute) discretion)/i,
    ],
    exempt: /\b(?:either|each|both)\s+part(?:y|ies)\b[^.;]{0,50}\b(?:may|can)\s+terminate\b|\bmutual\b/i,
    good: /\b(?:either|each)\s+party\b[^.;]{0,40}\b(?:may|can)\s+terminate\b[^.;]{0,80}\b(?:\d+|fourteen|thirty|seven|ten)\b/i,
    summary:
      "They can end the deal instantly, with no cause or refund, while you stay bound.",
    worst:
      "You are let go mid-project or suspended mid-semester, with no pay for work done and no refund of prepaid fees.",
    legal:
      "Courts often treat one-sided termination rights skeptically; termination typically needs notice, and earned compensation and prepaid unused fees must still be settled.",
    fix:
      "Either party may terminate on fourteen (14) days' written notice. Upon termination, all earned compensation is paid and prepaid unused fees are refunded pro-rata within fourteen (14) days.",
    fair: "Termination is mutual and requires advance notice.",
  },
];

/* ============================ TEXT SEGMENTATION ============================ */

interface Seg {
  start: number;
  end: number;
  text: string;
}

const SENT_END = /[.!?]["”')\]]*\s+(?=["“(\[]?[A-Z0-9$])/g;
const ABBR = /\b(?:e\.g|i\.e|u\.s|inc|llc|ltd|co|corp|no|nos|approx|etc|vs|mr|mrs|ms|dr|st|sec|art|apt|ste)\.$/i;
const BULLET = /^(?:[-*•–]|\d+(?:\.\d+)*[.)]|\([a-zA-Z0-9]{1,3}\)|[a-zA-Z][.)])\s/;

/** Splits text into sentences while remembering exact offsets into the ORIGINAL string. */
function segment(text: string): Seg[] {
  const chunks: [number, number][] = [];
  let cs = -1;
  let ce = -1;
  let prevEnd = 0;
  const flush = () => {
    if (cs >= 0) chunks.push([cs, ce]);
    cs = -1;
  };

  for (const m of text.matchAll(/[^\r\n]+/g)) {
    const raw = m[0];
    const t = raw.trim();
    if (!t) continue;
    const at = m.index as number;
    const newlines = (text.slice(prevEnd, at).match(/\n/g) || []).length;
    prevEnd = at + raw.length;
    const s = at + (raw.length - raw.trimStart().length);
    const heading = t.length <= 60 && !/[.!?;,:]$/.test(t) && !/^[a-z]/.test(t);
    if (newlines > 1 || heading || BULLET.test(t)) flush();
    if (cs < 0) cs = s;
    ce = s + t.length;
    if (heading) flush();
  }
  flush();

  const out: Seg[] = [];
  const push = (a: number, b: number) => {
    let s = a;
    let e = b;
    while (s < e && /\s/.test(text[s])) s++;
    while (e > s && /\s/.test(text[e - 1])) e--;
    const t = text.slice(s, e);
    if (t.length >= 12 && /\s/.test(t)) out.push({ start: s, end: e, text: t });
  };

  for (const [a, b] of chunks) {
    const chunk = text.slice(a, b);
    const parts: [number, number][] = [];
    let last = 0;
    for (const m of chunk.matchAll(SENT_END)) {
      const i = m.index as number;
      if (ABBR.test(chunk.slice(0, i + 1))) continue;
      parts.push([last, i + m[0].trimEnd().length]);
      last = i + m[0].length;
    }
    parts.push([last, chunk.length]);

    for (const [x, y] of parts) {
      if (y - x > 450) {
        // long run-on: split further on semicolons
        const sub = chunk.slice(x, y);
        let p = 0;
        for (const mm of sub.matchAll(/;\s+/g)) {
          const i = mm.index as number;
          push(a + x + p, a + x + i + 1);
          p = i + mm[0].length;
        }
        push(a + x + p, a + y);
      } else {
        push(a + x, a + y);
      }
    }
  }
  return out;
}

/* ============================ CONTRACT TYPE ============================ */

const SIGNALS: [ContractType, RegExp, RegExp][] = [
  ["Residential Lease", /\b(?:landlord|tenant|lessor|lessee|security deposit|premises|apartment|roommates?)\b/gi, /\b(?:lease|rent|sublet|unit|move[- ]out)\b/gi],
  ["Internship / Employment", /\b(?:intern|internship|employee|employer|employment|stipend|at[- ]will|invention assignment|supervisor)\b/gi, /\b(?:salary|wages?|position|duties|onboarding|company)\b/gi],
  ["Freelance / IP", /\b(?:freelanc\w*|independent contractor|deliverables?|scope of work|statement of work|client|work product)\b/gi, /\b(?:contractor|invoices?|milestones?|revisions?|hourly rate|services)\b/gi],
  ["Subscription / Gym", /\b(?:gym|fitness|membership|member|subscription|subscriber|trainer|workout|enrollment|initiation fee)\b/gi, /\b(?:club|facility|dues|cancel\w*|equipment|monthly)\b/gi],
];

function detectType(text: string): ContractType {
  let best: ContractType = "General Agreement";
  let top = 3; // minimum score to leave "General Agreement"
  for (const [type, strong, weak] of SIGNALS) {
    const score = (text.match(strong) || []).length * 3 + (text.match(weak) || []).length;
    if (score > top) {
      top = score;
      best = type;
    }
  }
  return best;
}

const DEFAULT_TITLE: Record<ContractType, string> = {
  "Residential Lease": "Residential Lease Agreement",
  "Internship / Employment": "Internship / Employment Agreement",
  "Freelance / IP": "Freelance Services Agreement",
  "Subscription / Gym": "Membership / Subscription Agreement",
  "General Agreement": "General Agreement",
};

function titleOf(text: string, type: ContractType): string {
  const first = (text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) || "").replace(/\s+/g, " ");
  const ok =
    first.length >= 4 &&
    first.length <= 90 &&
    !/[.!?;,:]$/.test(first) &&
    (/agreement|lease|contract|terms|membership|offer|addendum|policy|rider|waiver/i.test(first) || first.length <= 60);
  return ok ? first : DEFAULT_TITLE[type];
}

/* ============================ CLAUSE DETECTION ============================ */

const NEG = /\b(?:not|never|nor|cannot)\s+(?:\w+\s+){0,1}$|\bprohibited from\s+$/i;

/** True if any pattern matches somewhere that is NOT directly preceded by a negation ("shall not ..."). */
function hasUnnegated(s: string, res: RegExp[]): boolean {
  for (const re of res) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = g.exec(s))) {
      if (m[0].length === 0) {
        g.lastIndex++;
        continue;
      }
      if (!NEG.test(s.slice(Math.max(0, m.index - 40), m.index))) return true;
    }
  }
  return false;
}

function judge(r: Rule, s: string): Verdict | null {
  // Prevent routine landlord entry rule from intercepting lease default / forfeiture remedies
  if (
    r.id === "entry" &&
    /\b(?:terminate\s+(?:the\s+)?tenancy|re-?enter\s+(?:the\s+premises\s+)?and\s+terminate|defaults?\s+on\s+rent|breach(?:es)?\s+any\s+material)\b/i.test(s)
  ) {
    return null;
  }
  if (!r.scope.test(s)) return null;
  if (hasUnnegated(s, r.bad)) {
    return r.exempt && r.exempt.test(s) && !/\$\s?\d/.test(s) ? "fair" : r.severity;
  }
  return (r.good && r.good.test(s)) || (r.exempt && r.exempt.test(s)) ? "fair" : null;
}

const RANK: Record<Verdict, number> = { critical: 3, warning: 2, fair: 1 };

function findClauses(segs: Seg[], type: ContractType, text: string): AnalyzedClause[] {
  const used = new Map<string, number>();
  const clauses: AnalyzedClause[] = [];

  for (const seg of segs) {
    const cands: { rule: Rule; v: Verdict; i: number }[] = [];
    RULES.forEach((rule, i) => {
      if (rule.types && !rule.types.includes(type)) return;
      const v = judge(rule, seg.text);
      if (v) cands.push({ rule, v, i });
    });
    cands.sort((a, b) => RANK[b.v] - RANK[a.v] || a.i - b.i);

    for (const { rule, v } of cands) {
      const key = `${rule.id}:${v === "fair" ? "fair" : "bad"}`;
      const n = used.get(key) || 0;
      const maxAllowed = rule.max ?? (v === "fair" ? 4 : 2);
      if (n >= maxAllowed) continue;
      used.set(key, n + 1);

      const quote = text.slice(seg.start, seg.end); // verbatim by construction
      const fair = v === "fair";
      let sectionTitle = fair ? (rule.fairTitle || `${rule.title} (Protected)`) : rule.title;

      const numMatch = seg.text.match(/^(\d+\.|\([a-z0-9]+\)|•|-)\s*([^:.\n]{3,40})/i);
      if (numMatch && !sectionTitle.startsWith(numMatch[1])) {
        sectionTitle = `${numMatch[1]} ${sectionTitle}`;
      }

      clauses.push({
        id: "",
        sectionTitle,
        severity: v as ClauseSeverity,
        category: rule.category,
        exactQuote: quote,
        plainEnglishSummary: fair ? rule.fair : rule.summary,
        worstCaseScenario: fair
          ? "Low risk as written. Make sure this wording survives unchanged in the final signed copy."
          : rule.worst,
        legalContextNote: rule.legal,
        proposedAmendment: fair
          ? "No change needed. Keep this protection in the final contract."
          : rule.fix,
      });
      break;
    }
  }

  if (clauses.length === 0 && segs.length > 0) {
    const seg = segs.find((s) => s.text.length > 30) || segs[0];
    clauses.push({
      id: "",
      sectionTitle: "No Major Red Flags Detected",
      severity: "info",
      category: "Liability & Waivers",
      exactQuote: text.slice(seg.start, seg.end),
      plainEnglishSummary:
        "The offline scan found none of the 25 known trap patterns in this text. That is encouraging, but pattern matching cannot catch everything.",
      worstCaseScenario:
        "Unusual wording or missing protections could still hide risk; use the checklist below and read the full document.",
      legalContextNote:
        "Offline heuristics cover common fine-print traps only. Rules differ by state and country.",
      proposedAmendment:
        "Ask the counterparty to explain, in writing, any term you do not fully understand before signing.",
    });
  }

  clauses.forEach((c, i) => (c.id = `clause-${i + 1}`));
  return clauses;
}

/* ============================ FINANCIAL EXTRACTION ============================ */

interface Kind {
  re: RegExp;
  label: string | ((near: string, t: ContractType) => string);
  f: "c" | "m" | "o" | "b" | "skip"; // conditional | monthly | one-time | base | ignore
  cond?: string;
  on?: ContractType[];
  ex?: ContractType[];
}

const KINDS: Kind[] = [
  { re: /\boptional\b|\bvoluntary\b|\bat (?:your|tenant['’]?s|member['’]?s) (?:option|election)\b|\bif (?:you )?(?:elect|choose|request)\b/, label: "", f: "skip" },
  { re: /\b(?:carpet|cleaning|painting|turnover|re-?decorat\w*|restoration)\b[^.]{0,30}\b(?:fee|charge|deduct\w*|mandatory)\b|\b(?:fee|charge|deduct\w*|mandatory)\b[^.]{0,30}\b(?:carpet|cleaning|painting|turnover|re-?decorat\w*|restoration)\b/, label: "Mandatory Move-Out / Turnover Charge", f: "o" },
  { re: /\bnon[- ]?refundable\b/, label: (n) => (/\bpet\b/.test(n) ? "Non-Refundable Pet Fee" : /\bdeposit\b/.test(n) ? "Non-Refundable Deposit" : "Non-Refundable Fee"), f: "o" },
  { re: /\bdeposit\b/, label: "", f: "skip" },
  { re: /\b(?:late|delinquen\w*|past[- ]due|overdue)\b/, label: "Late Fee", f: "c", cond: "Rent or payment arrives after the due date or grace period" },
  { re: /\b(?:nsf|returned (?:check|payment)|bounced|dishonou?red|insufficient funds)\b/, label: "Returned Payment Fee", f: "c", cond: "A payment is returned or bounces" },
  { re: /\b(?:repay\w*|reimburs\w+|claw[- ]?back|exit fee|training|relocation|signing bonus|sign-on bonus|stay[- ]or[- ]pay)\b/, label: "Training / Bonus Repayment (TRAP)", f: "c", cond: "You leave before the required retention period", ex: ["Residential Lease"] },
  { re: /\b(?:early termination|terminat\w+ (?:fee|charge|early)|break(?:ing)? (?:the |your )?(?:lease|contract|agreement)|lease[- ]break|buy[- ]?out|re-?leasing|re-?letting|cancell?ation|liquidated damages)\b/, label: "Early Termination / Cancellation Fee", f: "c", cond: "You end the agreement before the full term expires" },
  { re: /\bdeductible\b|\b(?:repair\w*|plumbing|appliance\w*|hvac|clog\w*|drain\w*|water heater|maintenance (?:call|request|visit))\b/, label: "Maintenance / Repair Deductible", f: "c", cond: "Charged to you whenever a repair or maintenance request is made" },
  { re: /\block[- ]?out\b|\bre-?key\w*|\blost (?:key|fob|card|access)\b|\bkey replacement\b/, label: "Lockout / Key Replacement Fee", f: "c", cond: "You are locked out or lose a key or access card" },
  { re: /\bhold(?:ing)?[- ]?over\b|\boverstay\w*/, label: "Holdover Penalty", f: "c", cond: "You stay past the end of the lease term" },
  { re: /\b(?:guest|visitor|unauthori[sz]ed occupant)s?\b/, label: "Guest / Occupant Fee", f: "c", cond: "A guest stays beyond the allowed limit" },
  { re: /\b(?:sublet|sublease|assignment|lease transfer)\b/, label: "Sublet / Transfer Fee", f: "c", cond: "You sublet, assign, or transfer the lease" },
  { re: /\b(?:violation|penalt\w+|fined?|infraction|per occurrence|each (?:time|incident|occurrence)|damage\w*|noise|smoking)\b/, label: "Violation / Damage Penalty", f: "c", cond: "Assessed on a rule violation or damage report" },
  { re: /\b(?:salary|stipend|wages?|hourly|per hour|compensation|retainer|honorarium|budget|you will (?:be )?(?:paid|receive))\b|\/\s?(?:hr|hour)\b/, label: "", f: "skip", on: ["Internship / Employment", "Freelance / IP"] },
  { re: /\bportal\b|online payment|e-?check|convenience/, label: "Online Portal / Payment Fee", f: "m" },
  { re: /\btrash\b|valet|\bwaste\b|garbage (?:service|pickup)|recycl\w+/, label: "Valet Trash / Waste Fee", f: "m" },
  { re: /\bpackage|parcel|locker/, label: "Package Locker Fee", f: "m" },
  { re: /\bpest\b|extermina\w+/, label: "Pest Control Fee", f: "m" },
  { re: /\bpet rent\b/, label: "Pet Rent", f: "m" },
  { re: /\binternet|wi-?fi|\bcable\b|technology|tech fee|smart[- ]home/, label: "Internet / Technology Package Fee", f: "m" },
  { re: /\binsurance|liability (?:program|coverage)|renters/, label: "Mandatory Insurance / Liability Program", f: "m" },
  { re: /\butilit\w+|\bwater\b|sewer|electric|\bgas\b|submeter|billing/, label: "Utility Billing / Admin Fee", f: "m" },
  { re: /\bamenit\w+|facilit\w+|clubhouse|fitness center|\bpool\b|community fee|renovation|equipment (?:fee|maintenance)|enhancement|upgrade|maintenance/, label: "Amenity / Facility Fee", f: "m" },
  { re: /\bapplication|screening|background check|credit check/, label: "Application / Screening Fee", f: "o" },
  { re: /\bmove[- ]?out|carpet|cleaning|paint\w*|turnover|re-?decorat\w*|restoration|walk[- ]through|inspection fee/, label: "Mandatory Move-Out / Turnover Charge", f: "o" },
  { re: /\bpet\b/, label: "Pet Fee", f: "o" },
  { re: /\blease renewal|renewal fee|renew\w+ fee/, label: "Lease Renewal Fee", f: "o" },
  { re: /\bkey\b|\bfob\b|access (?:card|device)/, label: "Key / Access Fob Fee", f: "o" },
  { re: /\badmin\w*|processing|set-?up|enrollment|initiation|joining|activation|registration|sign-?up|move[- ]in|documentation/, label: "Administrative / Initiation Fee", f: "o" },
  {
    re: /\b(?:base |monthly |advertised |basic |total |current )?rent\b|\bdues\b|\bmembership\b|\bsubscription\b|\bmonthly (?:payment|rate|fee|charge|installment|cost|price)\b|\bper month\b|\/\s?mo\b|\bmonthly\b/,
    label: (_n, t) => (t === "Residential Lease" ? "Advertised Base Rent" : "Advertised Base Fee"),
    f: "b",
    ex: ["Internship / Employment", "Freelance / IP"],
  },
];

function classify(s: string, t: ContractType): Kind | undefined {
  return KINDS.find((k) => (!k.on || k.on.includes(t)) && !(k.ex && k.ex.includes(t)) && k.re.test(s));
}

const MONEY = /(?:\$|RM\s?|MYR\s?|USD\s?|£|€)\s?(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?/gi;
const CUT = /[,;$]|\band\b|\bplus\b/;
const ANNUAL = /\bper (?:year|annum)\b|\bannual\w*|\byearly\b|\beach year\b|\bevery year\b|\/\s?yr\b|\ba year\b/;
const QUARTER = /\bquarterly\b|\bper quarter\b|\beach quarter\b/;
const MONTHLY = /\bper month\b|\bmonthly\b|\/\s?mo\b|\ba month\b|\beach month\b|\bevery month\b/;
const DAILY = /\b(?:per day|daily|each day|per diem)\b/;
const r2 = (n: number) => Math.round(n * 100) / 100;

interface Financials {
  items: FinancialItem[];
  base: number;
  baseId: string | null;
}

function extractFinancials(text: string, segs: Seg[], type: ContractType): Financials {
  const raw: Omit<FinancialItem, "id">[] = [];
  const seen = new Set<string>();
  let base = 0;
  let baseLabel = "";

  const add = (it: Omit<FinancialItem, "id">) => {
    const key = `${it.label}|${it.amount}|${it.frequency}`;
    if (seen.has(key) || raw.length >= 40) return;
    seen.add(key);
    raw.push(it);
  };

  for (const m of text.matchAll(MONEY)) {
    const val = parseFloat(m[1].replace(/,/g, "") + (m[2] || ""));
    if (!(val > 0)) continue;
    const idx = m.index as number;
    const seg = segs.find((s) => idx >= s.start && idx < s.end);
    const sentence = (seg ? seg.text : text.slice(Math.max(0, idx - 120), idx + 160)).toLowerCase();
    const rel = seg ? idx - seg.start : Math.min(120, idx);
    const len = m[0].length;

    const left = (sentence.slice(Math.max(0, rel - 35), rel).split(CUT).pop() as string);
    const rightRaw = sentence.slice(rel + len, rel + len + 45);
    const near = `${left} ${rightRaw.split(CUT)[0]}`;
    const wide = sentence.slice(Math.max(0, rel - 90), rel + len + 90);
    const per = `${sentence.slice(Math.max(0, rel - 20), rel).split(CUT).pop()} ${rightRaw.slice(0, 28).split(CUT)[0]}`;

    const kind = classify(near, type) || classify(wide, type);

    if (!kind) {
      if (!/\b(?:fee|charge|surcharge|assessment|cost)s?\b/.test(near)) continue;
      const annual = ANNUAL.test(near);
      const quarter = QUARTER.test(near);
      if (annual || quarter || MONTHLY.test(per)) {
        add({
          label: `Mandatory Service Surcharge${annual ? " (billed annually)" : quarter ? " (billed quarterly)" : ""}`,
          amount: r2(annual ? val / 12 : quarter ? val / 3 : val),
          frequency: "monthly_mandatory",
        });
      } else {
        add({ label: "Additional Mandatory Fee", amount: val, frequency: "one_time_mandatory" });
      }
      continue;
    }
    if (kind.f === "skip") continue;

    const label = typeof kind.label === "function" ? kind.label(near, type) : kind.label;

    if (kind.f === "c") {
      const daily = DAILY.test(`${per} ${near}`);
      add({
        label: daily ? `Daily ${label}` : label,
        amount: val,
        frequency: "conditional_penalty",
        triggerCondition: `${kind.cond}${daily ? " (accrues per day)" : ""}`,
      });
      continue;
    }

    const annual = ANNUAL.test(per) || ANNUAL.test(near);
    const quarter = QUARTER.test(per) || QUARTER.test(near);
    const monthly = MONTHLY.test(per);
    const amount = r2(annual ? val / 12 : quarter ? val / 3 : val);
    const note = annual ? " (billed annually)" : quarter ? " (billed quarterly)" : "";

    if (kind.f === "b") {
      const floor = type === "Residential Lease" ? 250 : 5;
      if (base === 0 && amount >= floor) {
        base = amount;
        baseLabel = label;
        continue;
      }
      if (base > 0 || amount >= floor) continue; // later rent figure (renewal, etc.), not a fee
      add({ label: `Mandatory Service Surcharge${note}`, amount, frequency: "monthly_mandatory" });
      continue;
    }

    const recurring = kind.f === "m" ? true : annual || quarter || monthly;
    add({
      label: `${label}${note}`,
      amount,
      frequency: recurring ? "monthly_mandatory" : "one_time_mandatory",
    });
  }

  // Percent-of-rent and "N month's rent" penalties that have no dollar figure
  if (base > 0 && type !== "Internship / Employment" && type !== "Freelance / IP") {
    for (const seg of segs) {
      if (/\$\s?\d/.test(seg.text)) continue;
      const lo = seg.text.toLowerCase();
      const k = classify(lo, type);
      if (!k || k.f !== "c") continue;
      const pct = lo.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/);
      const mo = lo.match(/\b(one|two|three|1|2|3|a)\s+(?:full\s+)?months?['’]?s?\s+(?:base\s+)?(?:rent|dues|fees?|payment)/);
      const label = typeof k.label === "function" ? k.label(lo, type) : k.label;
      if (pct) {
        add({
          label: `${label} (${pct[1]}% of base)`,
          amount: r2((base * parseFloat(pct[1])) / 100),
          frequency: "conditional_penalty",
          triggerCondition: k.cond,
        });
      } else if (mo) {
        const n = ({ one: 1, a: 1, two: 2, three: 3 } as Record<string, number>)[mo[1]] ?? parseInt(mo[1], 10);
        add({
          label: `${label} (${n} month${n > 1 ? "s" : ""} of base)`,
          amount: r2(base * n),
          frequency: "conditional_penalty",
          triggerCondition: k.cond,
        });
      }
    }
  }

  const items: FinancialItem[] = [];
  if (base > 0) items.push({ id: "", label: baseLabel, amount: base, frequency: "monthly_mandatory" });
  raw.forEach((r) => items.push({ id: "", ...r }));
  items.forEach((it, i) => (it.id = `fee-${i + 1}`));
  return { items, base, baseId: base > 0 ? "fee-1" : null };
}

/* ============================ MISSING PROTECTIONS ============================ */

interface MP extends MissingProtection {
  present: RegExp; // if the document already says this, don't suggest it
}

const MP_LEASE: MP[] = [
  { title: "Itemized Deposit Return Within a Fixed Deadline", whyItMatters: "Without a deadline and itemization duty, landlords can sit on your deposit or deduct vaguely.", suggestedAddition: "Landlord shall return the deposit with an itemized statement of lawful deductions, supported by receipts, within twenty-one (21) days of move-out.", present: /\bitemi[sz]ed\b|\bdeposit\b[^.]{0,100}\bwithin\s+(?:\w+\s*)?\(?\d+\)?\s*days|\bwithin\s+(?:\w+\s*)?\(?\d+\)?\s*days\b[^.]{0,80}\bdeposit/i },
  { title: "24-Hour Written Notice Before Entry", whyItMatters: "With no notice rule, you have no contractual shield against drop-in entries.", suggestedAddition: "Except in verified emergencies, Landlord shall give at least twenty-four (24) hours' written notice stating date, time window, and reason before entering.", present: /\b(?:24|twenty[- ]four|48|forty[- ]eight)\b[^.]{0,40}\bhours?\b[^.]{0,60}\bnotice|\bnotice\b[^.]{0,60}\b(?:24|48)\s*hours?/i },
  { title: "Warranty of Habitability & Prompt Repairs", whyItMatters: "Guarantees heat, running water, and working systems, and gives you a remedy if they fail.", suggestedAddition: "Landlord shall keep the premises compliant with all health, safety, and habitability codes and complete urgent repairs within seventy-two (72) hours of notice.", present: /habitab/i },
  { title: "Duty to Re-Rent & Fair Early-Exit Rights", whyItMatters: "Protects you from owing the whole remaining term if you must leave (job, military orders, safety).", suggestedAddition: "Landlord shall use reasonable efforts to re-rent, credit re-letting income to Tenant, and honor statutory early-termination rights for military service and domestic violence.", present: /mitigat|re-?(?:let|rent)|servicemember|military|domestic violence|\bscra\b/i },
  { title: "Reasonable Sublet / Roommate-Replacement Right", whyItMatters: "Lets you cover summer breaks or a departing roommate without paying for an empty room.", suggestedAddition: "Tenant may sublet or assign to a qualified replacement; Landlord's consent shall not be unreasonably withheld, conditioned, or delayed.", present: /unreasonabl\w+\s+(?:withh|condition|delay)|\b(?:may|right to)\s+(?:sublet|sublease)/i },
  { title: "All-In Fee Disclosure", whyItMatters: "Stops surprise charges from inflating the advertised rent.", suggestedAddition: "All mandatory fees are listed in Exhibit A and no other fees may be charged without Tenant's written agreement.", present: /\ball (?:mandatory )?(?:fees|charges)[^.]{0,40}(?:disclosed|included|listed)|\bno (?:other|additional|hidden) (?:fees|charges)/i },
];

const MP_EMPLOY: MP[] = [
  { title: "Personal, Academic & Hackathon IP Carve-Out", whyItMatters: "Protects coursework, side projects, and open-source work made on your own time from company seizure.", suggestedAddition: "All work created outside working hours, without Company equipment or confidential information, and unrelated to Company business remains Individual's sole property (see Cal. Lab. Code 2870).", present: /\b2870\b|\bexclud\w+[^.]{0,80}\b(?:personal|own|independent|side|academic)|\bown time\b/i },
  { title: "Notice, Final Pay & No Retaliation on Exit", whyItMatters: "Avoids sudden unpaid termination and delayed final pay.", suggestedAddition: "Either party may end the engagement on fourteen (14) days' notice; all earned pay is delivered within five (5) business days.", present: /\b(?:\d+|fourteen|seven)\b[^.]{0,15}\bdays?\b[^.]{0,30}\bnotice|\bfinal pay\b|\bearned compensation\b/i },
  { title: "No Training-Cost Repayment (Anti-TRAP)", whyItMatters: "Prevents surprise exit fees for training you received as part of the job.", suggestedAddition: "Company shall not require repayment of training, onboarding, or equipment costs if Individual leaves or is terminated.", present: /\bno (?:training )?(?:repayment|cost recovery)|\b(?:shall|will) not\b[^.]{0,30}\b(?:repay|reimburse)/i },
  { title: "Wage Compliance & Academic Schedule Flexibility", whyItMatters: "Ensures lawful pay and protects exams and classes.", suggestedAddition: "Compensation shall meet applicable minimum-wage and overtime laws, and Company shall accommodate Individual's academic schedule, including exam periods.", present: /\bminimum wage\b|\bovertime\b|\bflsa\b|\bacademic (?:schedule|calendar|commitments)|\bexam\w*\s+(?:period|schedule)/i },
];

const MP_FREELANCE: MP[] = [
  { title: "Net-15 Payment, Late Interest & Kill Fee", whyItMatters: "Guarantees you are paid on time and for work already done if the client cancels.", suggestedAddition: "Invoices are due net-15; late balances accrue 1.5% monthly interest; if the client cancels, Contractor is paid for all work performed plus a 25% kill fee on the remaining scope.", present: /\bnet[- ]?(?:7|10|14|15|30)\b|\bkill fee\b|\binterest on (?:late|overdue)/i },
  { title: "IP Transfers Only on Full Payment (Portfolio Rights Kept)", whyItMatters: "Keeps leverage if the client doesn't pay and lets you show your work.", suggestedAddition: "Ownership of deliverables transfers upon full payment; Contractor retains the right to display the work in a portfolio and keeps pre-existing tools and code.", present: /\bupon\s+(?:receipt of\s+)?(?:full\s+)?payment\b|\bportfolio\b/i },
  { title: "Scope, Revision Limits & Change Orders", whyItMatters: "Prevents unlimited free revisions and scope creep.", suggestedAddition: "The fee covers two (2) revision rounds; additional work requires a written change order at the agreed hourly rate.", present: /\bchange order\b|\brevision\w*\b|\badditional (?:work|fees)\b/i },
  { title: "Liability Cap Limited to Fees Paid", whyItMatters: "Keeps one mistake from becoming unlimited personal liability.", suggestedAddition: "Contractor's total liability shall not exceed the fees paid under this agreement and excludes indirect or consequential damages.", present: /\blimitation of liability\b|\bshall not exceed\b[^.]{0,40}\b(?:fees|amount) paid\b/i },
];

const MP_GYM: MP[] = [
  { title: "Easy Online Cancellation Right", whyItMatters: "Prevents certified-mail or in-person cancellation traps and lingering charges.", suggestedAddition: "Member may cancel anytime via email, app, or website, effective at the end of the current billing cycle, with written confirmation.", present: /\bcancel\w*\b[^.]{0,60}\b(?:online|e-?mail|app|portal|website)|\b(?:online|e-?mail|app|portal)\b[^.]{0,40}\bcancel/i },
  { title: "Medical, Relocation & Freeze Exit Rights", whyItMatters: "Lets you stop paying when injury or relocation makes the service unusable.", suggestedAddition: "Member may cancel without penalty on a doctor's note or relocation beyond 25 miles, and may freeze the membership for up to three (3) months per year.", present: /\bmedical\b|\brelocat\w+|\bfreeze\b|\binjur\w+/i },
  { title: "Price-Change Notice with Right to Cancel", whyItMatters: "Blocks surprise rate hikes and 'maintenance' fees.", suggestedAddition: "No fee increase takes effect without sixty (60) days' written notice and Member's right to cancel penalty-free before it applies.", present: /\bprice (?:lock|protection)\b|\b(?:30|thirty|60|sixty)\b[^.]{0,20}\bdays\b[^.]{0,30}\bnotice\b[^.]{0,60}\b(?:fee|price|rate|dues)/i },
  { title: "Safe-Equipment Carve-Out from Waivers", whyItMatters: "Ensures a waiver can't excuse broken or poorly maintained equipment.", suggestedAddition: "Nothing in this waiver releases Facility from liability for negligence, defective or poorly maintained equipment, or unsafe premises.", present: /\bgross negligence\b|\b(?:faulty|defective|unsafe)\s+equipment/i },
  { title: "Pro-Rata Refund of Prepaid Fees", whyItMatters: "Returns unused prepaid periods if service ends early.", suggestedAddition: "Upon termination, any prepaid unused fees are refunded pro-rata within fourteen (14) days.", present: /\bpro[- ]?rata\b|\brefund\w*\b/i },
];

const MP_GENERAL: MP[] = [
  { title: "Mutual Termination with Written Notice", whyItMatters: "Ensures both sides have an exit with a fair notice period.", suggestedAddition: "Either party may terminate on thirty (30) days' written notice; earned fees are paid and prepaid unused fees refunded pro-rata.", present: /\b(?:either|each) party\b[^.]{0,40}\bterminate\b|\bmutual\w*\b/i },
  { title: "Amendments Only by Mutual Written Consent", whyItMatters: "Stops either party from changing price or terms unilaterally.", suggestedAddition: "This agreement may be amended only by a writing signed by both parties.", present: /\bamend\w*\b[^.]{0,60}\b(?:writing|mutual|both parties|signed)\b/i },
  { title: "Balanced Dispute Resolution & Fee-Shifting", whyItMatters: "Prevents one-sided legal costs and distant venues.", suggestedAddition: "Disputes begin with good-faith mediation; the prevailing party recovers reasonable attorney fees; small-claims access is preserved.", present: /\bprevailing party\b|\bmediation\b|\bsmall claims\b/i },
  { title: "Plain-Language Fee Disclosure", whyItMatters: "Makes every cost visible before you sign.", suggestedAddition: "All fees and charges are listed in a schedule; no other fees may be charged without written consent.", present: /\bno (?:other|additional|hidden) (?:fees|charges)|\bschedule of fees\b/i },
  { title: "Mutual Limitation of Liability", whyItMatters: "Keeps exposure proportionate on both sides.", suggestedAddition: "Each party's liability is limited to direct damages and capped at the fees paid, excluding gross negligence and willful misconduct.", present: /\blimitation of liability\b|\bshall not exceed\b[^.]{0,40}\b(?:fees|amount) paid/i },
];

function missingFor(type: ContractType, text: string): MissingProtection[] {
  const pool =
    type === "Residential Lease" ? MP_LEASE
    : type === "Internship / Employment" ? MP_EMPLOY
    : type === "Freelance / IP" ? MP_FREELANCE
    : type === "Subscription / Gym" ? MP_GYM
    : MP_GENERAL;

  const pick = [...pool, ...MP_GENERAL].filter((p) => !p.present.test(text));
  const unique: MissingProtection[] = [];
  for (const p of pick) {
    if (unique.some((u) => u.title === p.title)) continue;
    unique.push({ title: p.title, whyItMatters: p.whyItMatters, suggestedAddition: p.suggestedAddition });
    if (unique.length === 3) break;
  }
  return unique;
}

/* ================================ PUBLIC API ================================ */

const fmt = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/**
 * Deterministic, dependency-free legal NLP analyzer used when no Gemini key is configured.
 * Every exactQuote is sliced directly from rawText, so highlighting always succeeds.
 */
export function analyzeCustomTextHeuristically(rawText: string): ContractAuditResult {
  const text = rawText ?? "";
  const contractType = detectType(text);
  const segs = segment(text);
  const clauses = findClauses(segs, contractType, text);
  const { items, base } = extractFinancials(text, segs, contractType);

  const extras = items.filter((i, idx) => !(base > 0 && idx === 0) && i.frequency === "monthly_mandatory");
  const monthlyHidden = r2(extras.reduce((s, i) => s + i.amount, 0));
  const oneTime = r2(items.filter((i) => i.frequency === "one_time_mandatory").reduce((s, i) => s + i.amount, 0));

  const crit = clauses.filter((c) => c.severity === "critical");
  const warn = clauses.filter((c) => c.severity === "warning").length;
  const fair = clauses.filter((c) => c.severity === "fair").length;

  let summary = `${contractType} scan found ${plural(crit.length, "critical red flag")}, ${plural(warn, "warning")}, and ${plural(fair, "fair term")}.`;
  if (monthlyHidden > 0) {
    summary += ` Mandatory add-on fees add ${fmt(monthlyHidden)}/month${
      base > 0 ? ` on top of the advertised ${fmt(base)} (a ${Math.round((monthlyHidden / base) * 100)}% markup)` : ""
    }${oneTime > 0 ? `, plus ${fmt(oneTime)} in one-time charges` : ""} (about ${fmt(r2(monthlyHidden * 12 + oneTime))} over a year).`;
  } else if (oneTime > 0) {
    summary += ` One-time mandatory charges total ${fmt(oneTime)}.`;
  }
  if (crit.length) summary += ` Biggest concerns: ${crit.slice(0, 3).map((c) => c.sectionTitle).join("; ")}.`;
  summary += " Offline heuristic scan: educational, not legal advice.";

  return {
    contractTitle: titleOf(text, contractType),
    contractType,
    executiveSummary: summary,
    advertisedMonthlyBase: base,
    clauses,
    financialItems: items,
    missingProtections: missingFor(contractType, text),
  };
}
