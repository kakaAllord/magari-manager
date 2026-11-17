import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { COMPANY, COMPANY_SHORT } from "@/lib/company";
import { InstallPrompt } from "@/components/install-prompt";
import { LangProvider } from "@/components/lang-provider";
import { getLang } from "@/lib/lang";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: COMPANY_SHORT,
    description: `${COMPANY} · ${lang === "en" ? "Vehicle money requests and spending reports" : "Maombi ya pesa za magari na ripoti za matumizi"}`,
    appleWebApp: { title: COMPANY_SHORT, statusBarStyle: "default" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <LangProvider lang={lang}>
          {children}
          <InstallPrompt />
        </LangProvider>
      </body>
    </html>
  );
}
