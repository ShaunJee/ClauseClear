import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClauseClear - AI Contract Auditing Engine for Students",
  description:
    "Protecting students and first-time renters from predatory leases, unannounced entries, IP traps, and hidden junk fees.",
  keywords: [
    "lease audit",
    "contract analysis",
    "student tenant rights",
    "hidden fee calculator",
    "AI legal transparency",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem("clauseclear_theme");
                  if (stored === "dark") {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${display.variable} ${inter.variable} ${jetbrainsMono.variable} ${newsreader.variable} min-h-screen font-sans antialiased transition-colors duration-150`}
      >
        <a
          href="#main"
          className="sr-only z-[60] rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
