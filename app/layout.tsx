import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RemodelFlow | Home improvement leads",
  description: "Consent-aware lead management for home remodeling teams in the Bay Area.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
