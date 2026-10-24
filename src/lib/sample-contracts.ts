import { ContractAuditResult } from "./schema";

export interface SampleContractPreset {
  id: string;
  name: string;
  tagline: string;
  contractType: "Residential Lease" | "Internship / Employment" | "Subscription / Gym";
  badge: string;
  badgeVariant: "rose" | "amber" | "indigo";
  advertisedPriceDisplay: string;
  rawText: string;
  auditResult: ContractAuditResult;
}

/* ==========================================================================
   PRESET 1: OAKWOOD STUDENT COMMONS LEASE (Off-Campus Student Housing)
   ========================================================================== */

const SLUMLORD_LEASE_TEXT = `RESIDENTIAL APARTMENT LEASE AGREEMENT
Oakwood Student Commons - University District

SECTION 1: PARTIES AND PREMISES
This Residential Lease Agreement ('Lease') is entered into by Oakwood Student Living LLC ('Landlord') and the undersigned student tenant ('Tenant') for Unit 304B located at 1420 University Way. The premises shall be occupied solely by the named Tenant for educational residential purposes.

SECTION 2: TERM AND AUTOMATIC RENEWAL
This Lease commences on August 15, 2026, and terminates on July 31, 2027. This Lease shall automatically renew for an additional consecutive twelve (12) month term at a fifteen percent (15%) rent increase unless Tenant provides written cancellation notice delivered exclusively via USPS certified mail with return receipt requested at least ninety (90) days prior to the expiration date.

SECTION 3: BASE RENT AND MANDATORY RESIDENT SURCHARGES
Tenant agrees to pay an advertised Base Rent of $950.00 per month. In addition to Base Rent, Tenant shall pay mandatory non-negotiable monthly surcharges consisting of: (a) $45.00 Smart Lock & Digital Resident Portal Fee, (b) $35.00 Mandatory Doorstep Valet Trash Service Fee, and (c) $25.00 Community Pest Control and Billing Administrative Fee. All payments are due on the 1st of each calendar month.

SECTION 4: SECURITY DEPOSIT AND NON-REFUNDABLE CLEANING CHARGES
Tenant shall deposit with Landlord the sum of $950.00 as a conditional security deposit. Landlord shall retain a mandatory non-refundable Move-Out Carpet Steam Cleaning and Sanitization Fee of $200.00 automatically deducted from the Security Deposit regardless of the physical move-out cleanliness or condition of the premises upon surrender.

SECTION 5: ONE-TIME ADMINISTRATIVE INITIATION FEES
Upon execution of this Lease, Tenant shall tender a non-refundable one-time Lease Administration & Key Fob Issuance Fee of $150.00.

SECTION 6: LANDLORD UNRESTRICTED RIGHT OF ENTRY
Landlord, property management personnel, leasing agents, prospective buyers, and third-party maintenance contractors reserve the unrestricted right to enter the leased premises at any hour of the day or night without prior verbal or written notice for routine inspections, showings, appraisal visits, or general maintenance walkthroughs.

SECTION 7: TENANT MAINTENANCE DEDUCTIBLE AND REPAIR BURDEN
Tenant shall be strictly responsible for and agrees to pay the first $350.00 of any plumbing stoppage, drain obstruction, HVAC filter replacement, or appliance mechanical repair occurring within the premises during the tenancy, regardless of wear, tear, or underlying mechanical causation.

SECTION 8: TOTAL EXCULPATORY WAIVER OF HABITABILITY AND LOSS
Tenant hereby completely releases and waives all statutory claims against Landlord for loss of heat, running water, electrical disruption, toxic mold infestation, or physical theft within the premises, and expressly waives any statutory right to withhold rent or repair-and-deduct under local municipal housing codes.

SECTION 9: GUEST RESTRICTIONS AND VISITATION PENALTIES
No overnight guest may remain within the premises for more than two (2) nights in any single calendar month without prior written approval from property management. Any unauthorized guest stay shall trigger an immediate liquidated penalty of $100.00 per night assessed directly to Tenant's resident portal ledger.

SECTION 10: LATE PAYMENT PENALTIES AND TERMINATION FORFEITURE
Rent received after 11:59 PM on the 3rd calendar day of each month shall incur an immediate $75.00 late charge plus an ongoing late assessment of $10.00 per day until paid in full. If Tenant vacates or terminates this Lease prior to natural expiration, Tenant shall immediately forfeit the full security deposit and pay an Early Lease Break Liquidated Damages Fee of $1,900.00.`;

const SLUMLORD_LEASE_AUDIT: ContractAuditResult = {
  contractTitle: "Oakwood Student Commons Residential Lease",
  contractType: "Residential Lease",
  executiveSummary:
    "Predatory student housing agreement containing illegal unannounced entry rights, an aggressive 90-day certified mail auto-renewal trap, and over $1,260 in hidden annual surcharges.",
  advertisedMonthlyBase: 950,
  clauses: [
    {
      id: "clause-1",
      sectionTitle: "Section 6: Landlord Unrestricted Right of Entry",
      severity: "critical",
      category: "Privacy & Entry",
      exactQuote:
        "Landlord, property management personnel, leasing agents, prospective buyers, and third-party maintenance contractors reserve the unrestricted right to enter the leased premises at any hour of the day or night without prior verbal or written notice for routine inspections, showings, appraisal visits, or general maintenance walkthroughs.",
      plainEnglishSummary:
        "Your landlord and random contractors can unlock your apartment door at 3:00 AM with zero advance warning.",
      worstCaseScenario:
        "You could be sleeping or showering and have building staff or prospective buyers walk directly into your apartment unannounced, violating statutory privacy rights.",
      legalContextNote:
        "Under standard state landlord-tenant laws (e.g., California Civil Code § 1954, NY Real Property Law), landlords MUST provide at least 24 hours advance written notice for non-emergency entry during reasonable business hours.",
      proposedAmendment:
        "Except in genuine verified emergencies endangering life or property, Landlord shall provide Tenant at least twenty-four (24) hours advance written notice specifying the date, time window, and purpose prior to entering the premises during normal business hours (9:00 AM - 5:00 PM Monday through Friday).",
    },
    {
      id: "clause-2",
      sectionTitle: "Section 7: Tenant Maintenance Deductible and Repair Burden",
      severity: "critical",
      category: "Maintenance & Repairs",
      exactQuote:
        "Tenant shall be strictly responsible for and agrees to pay the first $350.00 of any plumbing stoppage, drain obstruction, HVAC filter replacement, or appliance mechanical repair occurring within the premises during the tenancy, regardless of wear, tear, or underlying mechanical causation.",
      plainEnglishSummary:
        "Whenever something breaks - even a 15-year-old refrigerator or ancient pipe - you get charged $350 out of pocket.",
      worstCaseScenario:
        "A tree root collapses an old sewage pipe outside your unit, and the landlord bills you $350 on your portal even though you did nothing wrong.",
      legalContextNote:
        "The implied warranty of habitability requires landlords to maintain plumbing, appliances, and heating systems in working order at their own expense, except when damage is directly caused by tenant negligence.",
      proposedAmendment:
        "Landlord shall be solely responsible for all maintenance and repair costs regarding structural elements, plumbing, electrical, HVAC, and provided appliances, except where damage results directly from proven gross negligence or willful misuse by Tenant.",
    },
    {
      id: "clause-3",
      sectionTitle: "Section 2: Term and Automatic Renewal",
      severity: "critical",
      category: "Termination & Renewal",
      exactQuote:
        "This Lease shall automatically renew for an additional consecutive twelve (12) month term at a fifteen percent (15%) rent increase unless Tenant provides written cancellation notice delivered exclusively via USPS certified mail with return receipt requested at least ninety (90) days prior to the expiration date.",
      plainEnglishSummary:
        "If you forget to send a certified physical letter 3 months before your lease ends, you're locked in for another full year with a 15% rent hike.",
      worstCaseScenario:
        "You graduate in May and plan to move home, but because you didn't mail certified letters by May 1st, you are legally trapped paying $1,092/month for another entire year.",
      legalContextNote:
        "Many jurisdictions prohibit automatic renewal terms exceeding month-to-month status without a separate signed disclosure and timely reminder notice 15-30 days prior to the opt-out cutoff.",
      proposedAmendment:
        "Upon expiration of the initial term, this Lease shall continue on a month-to-month tenancy terminable by either party upon thirty (30) days written notice delivered via email or portal. Any renewal shall require mutual written agreement.",
    },
    {
      id: "clause-4",
      sectionTitle: "Section 8: Total Exculpatory Waiver of Habitability and Loss",
      severity: "critical",
      category: "Liability & Waivers",
      exactQuote:
        "Tenant hereby completely releases and waives all statutory claims against Landlord for loss of heat, running water, electrical disruption, toxic mold infestation, or physical theft within the premises, and expressly waives any statutory right to withhold rent or repair-and-deduct under local municipal housing codes.",
      plainEnglishSummary:
        "If your heat dies in the dead of winter or black mold spreads, the lease claims you can't sue, withhold rent, or get compensation.",
      worstCaseScenario:
        "The heating system breaks during finals week in January, and management refuses to fix it for three weeks while still charging full rent without consequence.",
      legalContextNote:
        "Waivers of the statutory warranty of habitability are universally void against public policy and strictly unenforceable in nearly every state jurisdiction.",
      proposedAmendment:
        "Landlord covenants to maintain the premises in full compliance with all applicable municipal health, safety, and habitability codes. Nothing in this Lease shall waive Tenant's statutory rights under local and state landlord-tenant laws.",
    },
    {
      id: "clause-5",
      sectionTitle: "Section 3: Base Rent and Mandatory Resident Surcharges",
      severity: "warning",
      category: "Financial Liability",
      exactQuote:
        "In addition to Base Rent, Tenant shall pay mandatory non-negotiable monthly surcharges consisting of: (a) $45.00 Smart Lock & Digital Resident Portal Fee, (b) $35.00 Mandatory Doorstep Valet Trash Service Fee, and (c) $25.00 Community Pest Control and Billing Administrative Fee.",
      plainEnglishSummary:
        "The advertised $950 rent is actually $1,055/month due to $105 in forced add-on fees you cannot decline.",
      worstCaseScenario:
        "You budgeted strictly for $950 rent, but you're forced to pay an extra $1,260 over your 12-month lease for services like digital door locks and trash pickup you may not want.",
      legalContextNote:
        "Unbundled mandatory 'junk fees' conceal the true cost of rental housing and are increasingly targeted by consumer protection scrutiny and FTC deceptive pricing regulations.",
      proposedAmendment:
        "Mandatory ancillary fees shall either be optional amenities elected in writing by Tenant or consolidated transparently into the single agreed-upon total monthly rental amount of $950.00.",
    },
    {
      id: "clause-6",
      sectionTitle: "Section 4: Security Deposit and Non-Refundable Cleaning Charges",
      severity: "warning",
      category: "Financial Liability",
      exactQuote:
        "Landlord shall retain a mandatory non-refundable Move-Out Carpet Steam Cleaning and Sanitization Fee of $200.00 automatically deducted from the Security Deposit regardless of the physical move-out cleanliness or condition of the premises upon surrender.",
      plainEnglishSummary:
        "You automatically lose $200 of your security deposit no matter how spotlessly clean you scrub the apartment before leaving.",
      worstCaseScenario:
        "You spend 8 hours deep-cleaning every inch of your bedroom, but management takes $200 right off the top of your deposit anyway.",
      legalContextNote:
        "Under most state security deposit statutes, deposits must be 100% refundable, and deductions are restricted solely to actual damages beyond normal wear and tear.",
      proposedAmendment:
        "The Security Deposit shall be fully refundable. No deductions shall be made for routine carpet cleaning or ordinary wear and tear if the unit is surrendered in broom-clean condition.",
    },
    {
      id: "clause-7",
      sectionTitle: "Section 9: Guest Restrictions and Visitation Penalties",
      severity: "warning",
      category: "Privacy & Entry",
      exactQuote:
        "No overnight guest may remain within the premises for more than two (2) nights in any single calendar month without prior written approval from property management. Any unauthorized guest stay shall trigger an immediate liquidated penalty of $100.00 per night assessed directly to Tenant's resident portal ledger.",
      plainEnglishSummary:
        "A partner, sibling, or friend visiting for a 3-day weekend triggers a $100 penalty unless you get management's permission in advance.",
      worstCaseScenario:
        "Your family member visits from out of town to help you move for three days, and management bills you a $100 unauthorized guest fine.",
      legalContextNote:
        "Standard tenant occupancy clauses permit guest visits of up to 7 to 14 consecutive days without requiring prior landlord permission or per-night financial penalties.",
      proposedAmendment:
        "Tenant may host social and family guests for up to seven (7) consecutive days or fourteen (14) total days per calendar semester without requiring prior written landlord approval.",
    },
    {
      id: "clause-8",
      sectionTitle: "Section 10: Late Payment Penalties and Termination Forfeiture",
      severity: "warning",
      category: "Financial Liability",
      exactQuote:
        "Rent received after 11:59 PM on the 3rd calendar day of each month shall incur an immediate $75.00 late charge plus an ongoing late assessment of $10.00 per day until paid in full.",
      plainEnglishSummary:
        "A 3-day bank holiday delay results in a punishing $75 immediate fee plus compounding daily penalties.",
      worstCaseScenario:
        "If financial aid disbursement arrives on the 5th, you are hit with a $95 late fee penalty for a 48-hour delay.",
      legalContextNote:
        "Many state laws cap late fees at 5% of monthly rent (which would be $47.50 here) and require a statutory 5-day grace period.",
      proposedAmendment:
        "Rent shall be subject to a five (5) day grace period. If rent is received after 11:59 PM on the 5th day of the month, a one-time late fee not to exceed $35.00 may be assessed, with no daily compounding penalties.",
    },
    {
      id: "clause-9",
      sectionTitle: "Section 1: Authorized Occupant and Educational Use",
      severity: "fair",
      category: "Termination & Renewal",
      exactQuote:
        "The premises shall be occupied solely by the named Tenant for educational residential purposes.",
      plainEnglishSummary:
        "Standard identification of the authorized occupant and primary educational use.",
      worstCaseScenario:
        "Prevents unauthorized commercial business operations or subleasing without agreement.",
      legalContextNote:
        "Standard residential occupancy restriction common to student multi-family properties.",
      proposedAmendment: "Clause is fair and acceptable in current form.",
    },
  ],
  financialItems: [
    {
      id: "fee-1",
      label: "Advertised Base Rent",
      amount: 950,
      frequency: "monthly_mandatory",
    },
    {
      id: "fee-2",
      label: "Smart Lock & Digital Portal Surcharge",
      amount: 45,
      frequency: "monthly_mandatory",
    },
    {
      id: "fee-3",
      label: "Mandatory Valet Trash Service",
      amount: 35,
      frequency: "monthly_mandatory",
    },
    {
      id: "fee-4",
      label: "Pest Control & Community Admin Fee",
      amount: 25,
      frequency: "monthly_mandatory",
    },
    {
      id: "fee-5",
      label: "One-Time Lease Administration Fee",
      amount: 150,
      frequency: "one_time_mandatory",
    },
    {
      id: "fee-6",
      label: "Mandatory Move-Out Carpet Cleaning Deduction",
      amount: 200,
      frequency: "one_time_mandatory",
    },
    {
      id: "fee-7",
      label: "Plumbing / Appliance Repair Deductible",
      amount: 350,
      frequency: "conditional_penalty",
      triggerCondition: "Assessed whenever plumbing, drains, or appliances require servicing",
    },
    {
      id: "fee-8",
      label: "Immediate Late Rent Surcharge (Day 4)",
      amount: 75,
      frequency: "conditional_penalty",
      triggerCondition: "Assessed if payment is received after 11:59 PM on the 3rd of the month",
    },
    {
      id: "fee-9",
      label: "Early Lease Break Liquidated Damages",
      amount: 1900,
      frequency: "conditional_penalty",
      triggerCondition: "Assessed if Tenant surrenders unit prior to 12-month expiration",
    },
  ],
  missingProtections: [
    {
      title: "Mandatory 24-Hour Notice of Entry",
      whyItMatters:
        "Without this statutory clause, tenants have zero contractual protection against landlords entering while they are sleeping or away.",
      suggestedAddition:
        "Landlord shall provide at least twenty-four (24) hours advance written notice prior to entering premises, except during bona fide emergencies.",
    },
    {
      title: "30-Day Guaranteed Security Deposit Itemized Accounting",
      whyItMatters:
        "The lease omits any guaranteed deadline or itemized receipt requirement for returning the remaining security deposit.",
      suggestedAddition:
        "Landlord shall return the full security deposit with an itemized statement of any lawful deductions within twenty-one (21) days following move-out surrender.",
    },
    {
      title: "Habitability Remedy & Rent Abatement Provision",
      whyItMatters:
        "The contract strips tenant remedies if essential utilities, water, or heat fail for extended periods.",
      suggestedAddition:
        "If essential services (heat, water, electricity) remain inoperable for more than 48 hours after notice, rent shall abate proportionally until fully restored.",
    },
  ],
};

/* ==========================================================================
   PRESET 2: NEXTGEN STARTUP INTERNSHIP AGREEMENT (IP & Non-Compete Trap)
   ========================================================================== */

const INTERNSHIP_TRAP_TEXT = `NEXTGEN TECH VENTURES - STUDENT SOFTWARE CONTRIBUTOR & INTELLECTUAL PROPERTY AGREEMENT

SECTION 1: ENGAGEMENT AND EDUCATIONAL PURPOSE
This Contributor Agreement ('Agreement') is made between NextGen Tech Ventures Inc. ('Company') and the participating university student contributor ('Contributor'). Contributor participates in an experimental pre-seed accelerator program designed to impart real-world software engineering experience.

SECTION 2: UNPAID STATUS AND MANDATORY TIME COMMITMENT
Contributor acknowledges and agrees that this engagement is designated as an educational, unpaid learning experience with zero monetary compensation or health benefits, while Contributor agrees to maintain a mandatory minimum commitment of thirty-five (35) hours per week including requested weekend sprint cycles.

SECTION 3: COMPREHENSIVE AND PERPETUAL INTELLECTUAL PROPERTY ASSIGNMENT
Contributor hereby irrevocably sells, assigns, transfers, and conveys to Company all worldwide rights, title, copyright, and patent interests in any and all software code, architectural designs, algorithms, documentation, scripts, or inventions conceived or developed by Contributor during the term of this Agreement, whether developed on personal hardware, personal time, or utilizing university computational networks and academic lab resources.

SECTION 4: IRREVOCABLE COMMERCIAL NAME, IMAGE, AND LIKENESS RIGHTS
Contributor grants Company a perpetual, worldwide, royalty-free, fully transferable license to utilize Contributor's name, likeness, photographic image, student portfolio quotes, and voice in all commercial promotional materials, investor pitch decks, and website advertising without further compensation or notification.

SECTION 5: MANDATORY DELAWARE ARBITRATION AND LEGAL FEE SHIFTING
Any dispute, claim, or controversy arising out of this Agreement shall be resolved solely through binding individual arbitration administered in Wilmington, Delaware, with Contributor expressly agreeing to advance all initial arbitration administration fees and pay Company's full attorney fees in the event Company prevails.

SECTION 6: GLOBAL 24-MONTH RESTRICTIVE COVENANT AND NON-COMPETE
For a period of twenty-four (24) consecutive months following the termination of this Agreement, Contributor shall not directly or indirectly design, code, consult for, or seek employment with any entity, project, or venture operating within the artificial intelligence, developer tooling, or cloud computing sectors anywhere in North America or Europe.

SECTION 7: RETURN OF COMPANY ASSETS AND LIQUIDATED DAMAGE PROVISIONS
Failure to surrender any Company-issued cryptographic access key or development token within forty-eight (48) hours of departure shall trigger an immediate $500.00 non-return equipment penalty. Contributor agrees that any breach of Section 3 or Section 8 shall incur stipulated liquidated damages of $2,500.00 payable within ten business days.

SECTION 8: PERPETUAL CONFIDENTIALITY AND WHISTLEBLOWER CARVEOUT
Contributor shall maintain strict confidentiality regarding Company proprietary algorithms, customer leads, and internal roadmaps in perpetuity, provided that nothing herein shall prohibit Contributor from testifying under lawful subpoena or reporting statutory violations to federal regulatory authorities.`;

const INTERNSHIP_TRAP_AUDIT: ContractAuditResult = {
  contractTitle: "NextGen Startup Contributor & IP Agreement",
  contractType: "Internship / Employment",
  executiveSummary:
    "Highly exploitative unpaid internship agreement requiring 35 hours/week, seizing student capstone and personal code IP, and enforcing an illegal 2-year non-compete.",
  advertisedMonthlyBase: 0,
  clauses: [
    {
      id: "clause-1",
      sectionTitle: "Section 3: Comprehensive and Perpetual Intellectual Property Assignment",
      severity: "critical",
      category: "IP & Ownership",
      exactQuote:
        "Contributor hereby irrevocably sells, assigns, transfers, and conveys to Company all worldwide rights, title, copyright, and patent interests in any and all software code, architectural designs, algorithms, documentation, scripts, or inventions conceived or developed by Contributor during the term of this Agreement, whether developed on personal hardware, personal time, or utilizing university computational networks and academic lab resources.",
      plainEnglishSummary:
        "The company claims ownership of all personal code, weekend hackathon projects, and university coursework you create during this semester.",
      worstCaseScenario:
        "You build an independent mobile app or capstone project on your own laptop at home; this startup can legally claim 100% ownership and demand all revenue or IP rights.",
      legalContextNote:
        "Under California Labor Code § 2870 and similar state statutes, IP assignments cannot extend to inventions created on the worker's own time without company equipment, trade secrets, or direct correlation to company business.",
      proposedAmendment:
        "Assignment of intellectual property shall be strictly restricted to code and deliverables created directly for Company during authorized working hours utilizing Company-supplied resources, excluding all personal projects, academic coursework, and pre-existing code.",
    },
    {
      id: "clause-2",
      sectionTitle: "Section 6: Global 24-Month Restrictive Covenant and Non-Compete",
      severity: "critical",
      category: "Termination & Renewal",
      exactQuote:
        "For a period of twenty-four (24) consecutive months following the termination of this Agreement, Contributor shall not directly or indirectly design, code, consult for, or seek employment with any entity, project, or venture operating within the artificial intelligence, developer tooling, or cloud computing sectors anywhere in North America or Europe.",
      plainEnglishSummary:
        "You are barred from working at virtually any tech startup or software company for 2 years after leaving an unpaid role.",
      worstCaseScenario:
        "You graduate and receive a full-time $85,000 junior developer offer at a cloud software company, but this company threatens litigation under this clause.",
      legalContextNote:
        "Non-compete clauses for employees and interns are legally void in states like California, Minnesota, and New York, and severely restricted by the FTC's nationwide rulemaking.",
      proposedAmendment:
        "Section 6 shall be deleted in its entirety. Contributor shall be free to pursue employment, internships, and consulting opportunities across all sectors without restriction upon termination.",
    },
    {
      id: "clause-3",
      sectionTitle: "Section 2: Unpaid Status and Mandatory Time Commitment",
      severity: "critical",
      category: "Financial Liability",
      exactQuote:
        "Contributor acknowledges and agrees that this engagement is designated as an educational, unpaid learning experience with zero monetary compensation or health benefits, while Contributor agrees to maintain a mandatory minimum commitment of thirty-five (35) hours per week including requested weekend sprint cycles.",
      plainEnglishSummary:
        "The company is demanding full-time 35+ hour work weeks without paying minimum wage or overtime.",
      worstCaseScenario:
        "You work 140 hours a month doing core production work without receiving a single dollar, violating federal Fair Labor Standards Act (FLSA) regulations.",
      legalContextNote:
        "Under the Department of Labor's Primary Beneficiary Test, an unpaid intern cannot displace regular employees and must not be engaged in primary production work for the employer's economic benefit.",
      proposedAmendment:
        "Engagement shall be limited to a flexible maximum of ten (10) voluntary learning hours per week, structured around Contributor's university class schedule with zero mandatory weekend quotas.",
    },
    {
      id: "clause-4",
      sectionTitle: "Section 5: Mandatory Delaware Arbitration and Legal Fee Shifting",
      severity: "warning",
      category: "Liability & Waivers",
      exactQuote:
        "Any dispute, claim, or controversy arising out of this Agreement shall be resolved solely through binding individual arbitration administered in Wilmington, Delaware, with Contributor expressly agreeing to advance all initial arbitration administration fees and pay Company's full attorney fees in the event Company prevails.",
      plainEnglishSummary:
        "If they violate your rights, you have to fly to Delaware, pay thousands in arbitration fees upfront, and risk paying their corporate lawyers.",
      worstCaseScenario:
        "You dispute a $2,500 liquidated damages claim, but filing arbitration costs $1,500 upfront in administrative fees, making legal defense financially impossible.",
      legalContextNote:
        "One-sided arbitration clauses forcing low-wage workers or interns to travel to remote venues or bear disproportionate fees are frequently struck down as unconscionable.",
      proposedAmendment:
        "Disputes shall be resolved in Contributor's local county court or municipal jurisdiction. Each party shall bear their own attorney fees, and Company shall cover all arbitration filing expenses exceeding standard court fees.",
    },
    {
      id: "clause-5",
      sectionTitle: "Section 4: Irrevocable Commercial Name, Image, and Likeness Rights",
      severity: "warning",
      category: "Privacy & Entry",
      exactQuote:
        "Contributor grants Company a perpetual, worldwide, royalty-free, fully transferable license to utilize Contributor's name, likeness, photographic image, student portfolio quotes, and voice in all commercial promotional materials, investor pitch decks, and website advertising without further compensation or notification.",
      plainEnglishSummary:
        "They can plaster your face and quotes on billboards and investor decks forever without asking or paying you.",
      worstCaseScenario:
        "Five years from now, the startup uses your photo and quote endorsing a commercial product you disagree with, and you have no legal ability to revoke it.",
      legalContextNote:
        "Commercial likeness rights should be terminable upon conclusion of engagement and restricted to factual attribution of student participation.",
      proposedAmendment:
        "Company may cite Contributor's name and role strictly for factual resume attribution during the term of engagement. Any commercial advertising or marketing use shall require separate written consent.",
    },
    {
      id: "clause-6",
      sectionTitle: "Section 8: Perpetual Confidentiality and Whistleblower Carveout",
      severity: "fair",
      category: "Liability & Waivers",
      exactQuote:
        "provided that nothing herein shall prohibit Contributor from testifying under lawful subpoena or reporting statutory violations to federal regulatory authorities.",
      plainEnglishSummary:
        "Protects your legal right to report fraud or labor violations to the government.",
      worstCaseScenario:
        "Standard statutory whistleblower carve-out ensuring legal compliance.",
      legalContextNote:
        "Reflects mandatory SEC and NLRB whistleblower protections.",
      proposedAmendment: "Clause is fair and compliant with federal whistleblower standards.",
    },
  ],
  financialItems: [
    {
      id: "fee-1",
      label: "Advertised Monthly Compensation",
      amount: 0,
      frequency: "monthly_mandatory",
    },
    {
      id: "fee-2",
      label: "Late Key / Token Return Penalty",
      amount: 500,
      frequency: "conditional_penalty",
      triggerCondition: "Triggered if credentials are not surrendered within 48 hours of exit",
    },
    {
      id: "fee-3",
      label: "Breach of IP / Non-Compete Liquidated Damages",
      amount: 2500,
      frequency: "conditional_penalty",
      triggerCondition: "Stipulated damages assessed upon alleged breach of IP or non-compete covenants",
    },
  ],
  missingProtections: [
    {
      title: "University & Academic Coursework Carveout",
      whyItMatters:
        "Without an explicit academic carveout, your university or professor could face conflicting claims over your thesis or capstone code.",
      suggestedAddition:
        "Company expressly disclaims all ownership interest in academic coursework, degree requirements, capstone projects, and personal open-source contributions created outside authorized project tasks.",
    },
    {
      title: "Fair Labor Standards Act Minimum Wage Compliance",
      whyItMatters:
        "Demanding 35 weekly production hours without financial compensation violates federal minimum wage mandates.",
      suggestedAddition:
        "Contributor shall be compensated at no less than the statutory minimum hourly wage for all documented working hours.",
    },
    {
      title: "Mutual Non-Disparagement and Fair Reference Guarantee",
      whyItMatters:
        "Prevents the startup from sabotaging the student's future job search after receiving 35 hours/week of unpaid labor.",
      suggestedAddition:
        "Company agrees to provide a prompt, factual letter of recommendation verifying dates of participation upon successful completion.",
    },
  ],
};

/* ==========================================================================
   PRESET 3: IRONPEAK FITNESS MEMBERSHIP (Cancellation & Hidden Fee Trap)
   ========================================================================== */

const GYM_TRAP_TEXT = `IRONPEAK ATHLETIC CLUB - 12-MONTH PREMIER MEMBERSHIP CONTRACT

SECTION 1: FACILITY ACCESS AND STANDARD PRIVILEGES
IronPeak Athletic Club LLC ('Club') grants Member standard access to general gym floor equipment, strength machines, and general locker room amenities during published operating hours.

SECTION 2: ADVERTISED DUES AND MANDATORY FACILITY SURCHARGES
Member agrees to an advertised base membership rate of $29.99 per month. In addition, Member agrees to pay: (a) a mandatory $9.99 monthly Peak Hours Locker and Clean Towel Privilege Surcharge, and (b) a mandatory non-refundable Initiation and Key Fob Programming Fee of $59.00 due upon execution.

SECTION 3: AUTOMATIC ANNUAL FACILITY IMPROVEMENT LEVY
On the 60th day following account enrollment, and annually on each anniversary date thereafter, Club shall automatically charge Member's payment account an Annual Facility Improvement & Equipment Modernization Fee of $89.00 without requirement of separate advance billing notice.

SECTION 4: RESTRICTIVE IN-PERSON CERTIFIED MAIL CANCELLATION PROTOCOL
This Agreement cannot be cancelled via telephone, email, member mobile app, or online portal. To cancel this Agreement, Member must deliver a notarized written cancellation request either in-person directly to the General Manager between 10:00 AM and 2:00 PM on the first Tuesday of the month, or by USPS certified mail with postal return receipt requested delivered to Club's statutory corporate agent at least sixty (60) days prior to the proposed billing termination date.

SECTION 5: UNILATERAL PRICE ESCALATION AND DUES REVISION
Club reserves the unilateral authority to adjust, increase, or surcharge monthly membership dues by up to twenty percent (20%) during each calendar year without executing an amended agreement or securing Member's re-authorization.

SECTION 6: MANDATORY RECURRING ELECTRONIC FUNDS TRANSFER (EFT)
Member authorizes Club to initiate recurring monthly ACH debits from Member's designated checking account on the first calendar day of each month. Any declined debit or returned check shall incur an immediate $25.00 returned debit processing surcharge.

SECTION 7: MEDICAL FREEZE AND TEMPORARY ILLNESS RELIEF
Member may request a temporary medical freeze of membership billing for up to sixty (60) days upon presentation of an original, signed physician letter certifying total physical disability prohibiting athletic exercise.

SECTION 8: TOTAL EXCULPATORY NEGLIGENCE AND LIABILITY WAIVER
Member assumes all risks of personal injury, spinal injury, heart attack, or death arising from the use of Club facilities, and completely releases and holds harmless Club, its owners, and trainers from all liability, claims, or lawsuits, even if such injury or damage results directly from Club's gross negligence, lack of supervision, or defective, broken, or improperly maintained exercise machinery.

SECTION 9: EARLY CONTRACT BUYOUT AND CANCELLATION LIQUIDATED DAMAGES
In the event Member relocates or seeks to terminate this 12-month commitment prior to completing twelve (12) consecutive billing cycles, Member shall pay an immediate Early Buyout Termination Penalty of $199.00.`;

const GYM_TRAP_AUDIT: ContractAuditResult = {
  contractTitle: "IronPeak Fitness Club Annual Membership Agreement",
  contractType: "Subscription / Gym",
  executiveSummary:
    "Deceptive gym membership advertising $29.99/mo that actually costs $47.40/mo, requiring notarized in-person cancellation on specific Tuesdays and shielding the gym from defective equipment negligence.",
  advertisedMonthlyBase: 29.99,
  clauses: [
    {
      id: "clause-1",
      sectionTitle: "Section 4: Restrictive In-Person Certified Mail Cancellation Protocol",
      severity: "critical",
      category: "Termination & Renewal",
      exactQuote:
        "This Agreement cannot be cancelled via telephone, email, member mobile app, or online portal. To cancel this Agreement, Member must deliver a notarized written cancellation request either in-person directly to the General Manager between 10:00 AM and 2:00 PM on the first Tuesday of the month, or by USPS certified mail with postal return receipt requested delivered to Club's statutory corporate agent at least sixty (60) days prior to the proposed billing termination date.",
      plainEnglishSummary:
        "You cannot cancel online; you must either show up during a 4-hour window on one specific Tuesday a month with a notarized letter, or send certified postal mail 2 months ahead.",
      worstCaseScenario:
        "You move to another state for college or a job, and the gym continues debiting your bank account for months because you cannot appear in person on the first Tuesday of the month.",
      legalContextNote:
        "The FTC's 'Click-to-Cancel' rule and state automatic renewal laws (e.g., California AB 390) mandate that consumers who enroll online must be permitted to cancel online with equal ease.",
      proposedAmendment:
        "Member may cancel this membership at any time upon thirty (30) days notice submitted via member portal, email, or simple online cancellation button.",
    },
    {
      id: "clause-2",
      sectionTitle: "Section 8: Total Exculpatory Negligence and Liability Waiver",
      severity: "critical",
      category: "Liability & Waivers",
      exactQuote:
        "Member assumes all risks of personal injury, spinal injury, heart attack, or death arising from the use of Club facilities, and completely releases and holds harmless Club, its owners, and trainers from all liability, claims, or lawsuits, even if such injury or damage results directly from Club's gross negligence, lack of supervision, or defective, broken, or improperly maintained exercise machinery.",
      plainEnglishSummary:
        "If a gym cable snaps and breaks your collarbone because management never maintained it, the contract claims they have zero responsibility.",
      worstCaseScenario:
        "A heavily frayed weight cable snaps mid-repetition due to skipped maintenance, inflicting severe injury, and the gym points to this waiver to deny medical coverage.",
      legalContextNote:
        "While standard recreational assumption of risk is common, exculpatory releases waiving liability for gross negligence or defective maintenance are strictly void in most jurisdictions.",
      proposedAmendment:
        "Member assumes ordinary inherent risks of athletic exercise. However, Club remains fully responsible for injuries caused by defective equipment, improper maintenance, or gross negligence of Club personnel.",
    },
    {
      id: "clause-3",
      sectionTitle: "Section 3: Automatic Annual Facility Improvement Levy",
      severity: "warning",
      category: "Financial Liability",
      exactQuote:
        "On the 60th day following account enrollment, and annually on each anniversary date thereafter, Club shall automatically charge Member's payment account an Annual Facility Improvement & Equipment Modernization Fee of $89.00 without requirement of separate advance billing notice.",
      plainEnglishSummary:
        "Just two months after joining, an unexpected $89 fee is quietly debited from your checking account.",
      worstCaseScenario:
        "You check your student bank account in month two and find an unexpected $89 deduction, potentially causing overdraft fees.",
      legalContextNote:
        "Surprise annual charges billed shortly after enrollment are a primary source of consumer banking disputes and credit card chargebacks.",
      proposedAmendment:
        "All facility and equipment costs shall be incorporated into the monthly membership dues. No supplemental annual maintenance levies shall be charged without affirmative opt-in.",
    },
    {
      id: "clause-4",
      sectionTitle: "Section 5: Unilateral Price Escalation and Dues Revision",
      severity: "warning",
      category: "Financial Liability",
      exactQuote:
        "Club reserves the unilateral authority to adjust, increase, or surcharge monthly membership dues by up to twenty percent (20%) during each calendar year without executing an amended agreement or securing Member's re-authorization.",
      plainEnglishSummary:
        "The gym can hike your monthly dues by up to 20% each year without asking for your signature or consent.",
      worstCaseScenario:
        "Your $29.99 dues jump to $35.98/month six months in, and you cannot cancel without paying a $199 early termination penalty.",
      legalContextNote:
        "Unilateral price increases without giving the consumer a penalty-free right to exit violate consumer fairness standards.",
      proposedAmendment:
        "Monthly dues shall remain locked for the duration of the 12-month commitment. Any proposed price adjustment shall grant Member the unconditional right to cancel penalty-free.",
    },
    {
      id: "clause-5",
      sectionTitle: "Section 7: Medical Freeze and Temporary Illness Relief",
      severity: "fair",
      category: "Termination & Renewal",
      exactQuote:
        "Member may request a temporary medical freeze of membership billing for up to sixty (60) days upon presentation of an original, signed physician letter certifying total physical disability prohibiting athletic exercise.",
      plainEnglishSummary:
        "Allows a 60-day billing freeze if you suffer a doctor-documented injury or illness.",
      worstCaseScenario:
        "Helpful protection if you break an arm or undergo surgery during your membership.",
      legalContextNote:
        "Standard fitness contract accommodation for documented medical inability.",
      proposedAmendment: "Clause is acceptable as stated.",
    },
  ],
  financialItems: [
    {
      id: "fee-1",
      label: "Advertised Monthly Base Dues",
      amount: 29.99,
      frequency: "monthly_mandatory",
    },
    {
      id: "fee-2",
      label: "Peak Hours Locker & Clean Towel Surcharge",
      amount: 9.99,
      frequency: "monthly_mandatory",
    },
    {
      id: "fee-3",
      label: "One-Time Initiation & Key Fob Fee",
      amount: 59.0,
      frequency: "one_time_mandatory",
    },
    {
      id: "fee-4",
      label: "Annual Facility Improvement Fee (Day 60)",
      amount: 89.0,
      frequency: "one_time_mandatory",
    },
    {
      id: "fee-5",
      label: "Early Buyout Cancellation Penalty",
      amount: 199.0,
      frequency: "conditional_penalty",
      triggerCondition: "Assessed if Member cancels before completing 12 consecutive billing cycles",
    },
    {
      id: "fee-6",
      label: "Returned ACH / Debit Surcharge",
      amount: 25.0,
      frequency: "conditional_penalty",
      triggerCondition: "Assessed if payment account has insufficient funds upon debit date",
    },
  ],
  missingProtections: [
    {
      title: "1-Click Online Cancellation Right",
      whyItMatters:
        "Forcing consumers to deliver notarized physical letters or appear in-person creates an artificial barrier designed to trap recurring payments.",
      suggestedAddition:
        "Member shall have the absolute right to cancel recurring billing via online account dashboard with immediate electronic confirmation.",
    },
    {
      title: "14-Day Buyer's Remorse Full Refund Window",
      whyItMatters:
        "Consumers who realize the gym is overcrowded or not as advertised within the first two weeks are trapped for 12 months.",
      suggestedAddition:
        "Member may terminate this contract within fourteen (14) days of enrollment for a full 100% refund of all dues and initiation fees.",
    },
    {
      title: "30-Day Advance Written Notice of Rate Hikes",
      whyItMatters:
        "Protects the consumer from surprise account deductions and allows timely account closure.",
      suggestedAddition:
        "Club shall provide at least thirty (30) days advance written email notice prior to implementing any fee or price modification.",
    },
  ],
};

/* ==========================================================================
   EXPORTED PRESETS REGISTRY & LOOKUP HELPERS
   ========================================================================== */

export const SAMPLE_CONTRACT_PRESETS: Record<string, SampleContractPreset> = {
  "slumlord-lease": {
    id: "slumlord-lease",
    name: "Oakwood Student Commons Lease",
    tagline: "Off-Campus Apartment Lease (Predatory Entry & Hidden Junk Fees)",
    contractType: "Residential Lease",
    badge: "Student Housing",
    badgeVariant: "rose",
    advertisedPriceDisplay: "$950 / mo",
    rawText: SLUMLORD_LEASE_TEXT,
    auditResult: SLUMLORD_LEASE_AUDIT,
  },
  "internship-trap": {
    id: "internship-trap",
    name: "NextGen Startup Contributor Agreement",
    tagline: "Student Software Internship (IP Grabbing & Global Non-Compete)",
    contractType: "Internship / Employment",
    badge: "Tech Internship",
    badgeVariant: "amber",
    advertisedPriceDisplay: "Unpaid / 35hr",
    rawText: INTERNSHIP_TRAP_TEXT,
    auditResult: INTERNSHIP_TRAP_AUDIT,
  },
  "gym-trap": {
    id: "gym-trap",
    name: "IronPeak Fitness Club Membership",
    tagline: "Annual Gym Contract (Cancellation Maze & Negligence Waiver)",
    contractType: "Subscription / Gym",
    badge: "Gym Membership",
    badgeVariant: "indigo",
    advertisedPriceDisplay: "$29.99 / mo",
    rawText: GYM_TRAP_TEXT,
    auditResult: GYM_TRAP_AUDIT,
  },
};

export const SAMPLE_PRESET_LIST: SampleContractPreset[] = Object.values(SAMPLE_CONTRACT_PRESETS);

export function getSampleContractById(id: string): SampleContractPreset | undefined {
  return SAMPLE_CONTRACT_PRESETS[id];
}

export function getDefaultSampleContract(): SampleContractPreset {
  return SAMPLE_CONTRACT_PRESETS["slumlord-lease"];
}
