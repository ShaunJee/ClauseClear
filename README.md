# ClauseClear

### AI Contract Auditing and Financial Transparency Engine for Students and First-Time Renters
*Built for NextSpark Hacks 2026: Addressing predatory housing leases, unpaid internship traps, and hidden junk fees.*

---

## Executive Summary and Value Proposition

Every year, millions of university students, young graduates, and first-time renters sign legally binding 15-page contracts without understanding the fine print. Landlords and predatory corporations exploit this lack of experience by burying hazardous legal traps:
- **Unannounced Entry:** Clauses permitting landlords or maintenance teams to enter student apartments at any hour without prior notice.
- **Buried Monthly Junk Fees:** Doorstep trash valet ($35/mo), digital portal convenience fees ($45/mo), and administrative charges ($25/mo) adding **+$1,260/year** or more over advertised rent.
- **Mandatory Repair Deductibles:** Forcing tenants to pay the first $350 of plumbing or appliance repairs regardless of fault.
- **Intellectual Property Seizure:** Unpaid summer internship agreements that claim complete ownership over personal student projects, capstone hackathon code, and coursework.
- **Deceptive Auto-Renewals:** 60-day certified-mail cancellation windows that trap members into recurring annual billing.

**ClauseClear** transforms opaque contracts into clear, quantified, and actionable leverage in seconds. It scores agreements from 0 to 100, unbundles buried fees, highlights exact verbatim quotes, and drafts attorney-grade counter-offers and binding Addendum Riders.

---

## Core Product Capabilities and Selling Points

### 1. Zero-Setup 1-Click Judge Mode Presets
Explore pre-computed, realistic benchmark contracts with zero login walls, zero onboarding, and zero API key requirements:
- **University Off-Campus Apartment Lease:** Advertised at $2,000/month; reveals $6,750 in upfront deposits and buried charges, habitability waivers, and unannounced entry.
- **Tech Startup Summer Internship Agreement:** Uncovers aggressive claims over personal student hackathon repositories and a 2-year non-compete covenant.
- **Metro Iron Gym Membership Agreement:** Uncovers hidden $89 annual facility maintenance charges and a certified-mail cancellation trap.

### 2. Hybrid Dual-Engine Architecture (Online + Offline)
- **Live Google Gemini Reasoning:** Deep contextual legal reasoning and customized negotiation letters powered by Google Gemini.
- **Local Heuristic NLP Engine:** 100% client-side, deterministic pattern extractor that parses custom pasted text offline with zero API key requirement and zero data retention.

### 3. Interactive Fairness Score (0 to 100)
- **Dynamic Circular Progress Ring:** Color-coded gradient progress ring (Emerald Green 80+, Amber Warning 50-79, Rose Red <50) with animated cubic ease-out count-up.
- **Mathematical Risk Rubric:** Base score of 100 with explicit deductions:
  - `-18 points` for critical legal violations (e.g., habitability waivers, unannounced entry).
  - `-8 points` for one-sided moderate warnings (e.g., disproportionate repair deductibles).
  - `-4 points` per omitted statutory tenant protection.
- **Untruncated Executive Summaries:** Clear explanations without ellipsis truncation, giving users a complete overview of risks.

### 4. Verbatim Document Viewer with Bi-Directional Highlighting
- **Exact Quote Matching:** Verbatim contract phrases are highlighted directly on paper-styled text.
- **Bi-Directional Navigation:** Clicking any flagged clause card scrolls the document directly to the exact quote with a pulse animation; clicking any highlighted text in the document scrolls to its corresponding analysis card.
- **Toolbar Controls:** Compact font size toggles ([A-] [A] [A+]) for customizable reading comfort without layout overflow.

### 5. "True Cost" Financial Liability Simulator
- **Unbundled Monthly Accounting:** Separates base advertised rent from mandatory recurring add-ons.
- **Upfront vs Recurring Distinction:** Correctly categorizes one-time move-in fees and security deposits versus hidden monthly surcharges.
- **Student Grocery Conversion:** Translates annual hidden surcharges into relatable student benchmarks (e.g., "Equivalent to 112 weeks of student groceries").
- **12-Month Financial Liability Comparison:** Visual side-by-side progress bar comparing advertised commitments against true out-of-pocket liabilities.

### 6. 1-Click Attorney-Grade Counter-Offer Drafter
- **Multi-Tone Negotiation Selector:**
  - *Collaborative (Recommended):* Polite, respectful student tone framing adjustments as mutual clarifications.
  - *Firm:* Direct, assertive commercial tone requesting standard balanced terms.
  - *Legal Standard:* Formal statutory tone citing tenant rights and bilateral fairness.
- **Proper Paragraph Formatting:** Automatically generates clean emails with double newlines separating salutations, numbered negotiation points, and sign-offs.
- **Binding Schedule of Amendments (Rider A):** Formats a signable contractual addendum with formal superseded language, replacement terms, and signature lines.
- **Frictionless Sharing:** One-click copy with confetti feedback and instant `mailto:` launching in the user's default email client.

### 7. Zero-Server Static Export (GitHub Pages Ready)
- Built with Next.js static export (`output: 'export'`), compiling the complete React, Zustand, and Tailwind application into pure static HTML, CSS, and JS inside the `out/` directory.
- Can be deployed to GitHub Pages or any static CDN with zero Node.js server dependencies.

---

## Technical Stack and Architecture

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 14 (App Router, Static Export) | Single-page application architecture |
| **Language** | TypeScript | Strict type safety for contract schemas and scoring rubrics |
| **Styling** | Tailwind CSS + Vanilla CSS Tokens | Glassmorphism, aurora backdrops, and dark mode support |
| **State Management** | Zustand (`persist` middleware) | Reactive client-side store with `localStorage` persistence |
| **AI Integration** | Google Gemini API + Vercel AI SDK | Generative legal analysis and negotiation synthesis |
| **Validation** | Zod | Runtime schema validation for contract extraction |
| **UI Components** | Lucide React Icons, Canvas-Confetti | Modern interactive iconography and micro-animations |

---

## Project Structure

```text
ClauseClear/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Main application view with landing and audit workspace
│   │   ├── layout.tsx                   # Root HTML shell with font definitions and metadata
│   │   └── api/
│   │       ├── analyze/route.ts         # Server-side Gemini contract auditing endpoint
│   │       └── negotiate/route.ts       # Server-side counter-offer drafting endpoint
│   ├── components/
│   │   ├── upload-zone.tsx              # Contract text input, preset loader, and audit engine
│   │   ├── audit-loading-modal.tsx      # Multi-step progress modal with live elapsed timer
│   │   ├── api-key-modal.tsx            # In-browser Gemini API key configuration
│   │   └── dashboard/
│   │       ├── audit-workspace.tsx      # Central audit dashboard coordinator
│   │       ├── score-header.tsx         # Score circle with count-up animation and fee banner
│   │       ├── document-viewer.tsx      # Highlighted contract viewer with font controls
│   │       ├── clause-card.tsx          # Risk cards with plain-English breakdowns
│   │       ├── true-cost-card.tsx       # Unbundled financial surcharge calculator
│   │       └── negotiation-drawer.tsx   # Counter-offer email and Rider A generator
│   ├── lib/
│   │   ├── schema.ts                    # Zod schemas for clauses, risks, and financial items
│   │   ├── scoring.ts                   # Deterministic 0-100 risk scoring algorithm
│   │   ├── sample-contracts.ts          # Benchmark contracts (Lease, Internship, Gym)
│   │   ├── heuristic-analyzer.ts        # Client-side offline regex and NLP heuristic engine
│   │   └── negotiation-generator.ts     # Offline deterministic counter-offer builder
│   └── store/
│       └── use-audit-store.ts           # Central Zustand store for document and audit state
├── out/                                 # Pure static HTML/CSS/JS export for GitHub Pages
├── next.config.mjs                      # Static export configuration
├── tailwind.config.ts                   # Tailored palette and typography configuration
└── package.json                         # Project dependencies and build scripts
```

---

## Getting Started

### Prerequisites
- Node.js 18.17 or later
- npm or pnpm

### 1. Installation
```bash
git clone https://github.com/your-username/clauseclear.git
cd clauseclear
npm install
```

### 2. Running in Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

ClauseClear works completely out of the box using its built-in Local Heuristic NLP Engine and pre-computed benchmark presets.

### 3. Enabling Live Google Gemini AI (Optional)
To use live Google Gemini AI reasoning:
1. Click the **Gemini AI** button in the top navigation bar.
2. Enter your Google AI Studio Gemini API key.
3. The key is stored locally in your browser (`localStorage`) and used for direct requests.

Alternatively, you can provide an environment variable in a `.env.local` file:
```bash
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"
```

### 4. Building for Static Hosting (GitHub Pages)
To compile the TypeScript application into pure static HTML, CSS, and JS:
```bash
npm run build
```
The compiled static website will be created in the `out/` folder, ready for deployment to GitHub Pages or any static web host.

---

## Responsible AI and Legal Disclaimer

ClauseClear is an educational transparency and consumer awareness tool designed to help students identify contractual risks and advocate for fair terms. It does not provide formal legal representation, attorney-client privileged advice, or legal counsel. Users are encouraged to consult their university student legal services or a licensed attorney for binding legal matters.
