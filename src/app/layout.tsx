import type { Metadata } from "next";
import "./globals.css";
import { AppStateProvider } from "@/context/app-state";

export const metadata: Metadata = {
  title: "Roammate",
  description: "Group trip planning without the spreadsheet spiral."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
