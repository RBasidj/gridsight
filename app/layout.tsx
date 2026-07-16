import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "GridSight · GPU cluster siting for Texas and New York",
  description:
    "Ranks candidate parcels for GPU data-center buildout across Texas (ERCOT) and New York (NYISO), scored on seven factors from public geospatial data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 py-8 text-xs text-ink-faint">
          GridSight is a demonstration project. Site rankings are a screening aid, not investment or engineering advice.
        </footer>
      </body>
    </html>
  );
}
