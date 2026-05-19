import type { Metadata } from "next";
import "./globals.css";
import { AppStateProvider } from "@/context/app-state";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: "Roammate",
  description: "Group trip planning without the spreadsheet spiral.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  },
  openGraph: {
    title: "Roammate",
    description: "Group trip planning without the spreadsheet spiral.",
    siteName: "Roammate",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Roammate",
    description: "Group trip planning without the spreadsheet spiral."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppStateProvider>
          <ToastProvider>{children}</ToastProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
