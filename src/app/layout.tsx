import type { Metadata } from "next";
import "./globals.css";
import { BRANDING } from "../config/branding";
import FloatingWidgets from "./components/floating-widgets";

export const metadata: Metadata = {
  title: `${BRANDING.name} | Premium Dining Experience`,
  description: BRANDING.tagline,
  keywords: "restaurant, cafe, fine dining, luxury dining, reservations, events, premium",
  openGraph: {
    title: `${BRANDING.name} | Premium Dining Experience`,
    description: BRANDING.tagline,
    type: "website",
    siteName: BRANDING.name,
  },
  twitter: {
    card: "summary_large_image",
    title: BRANDING.name,
    description: BRANDING.tagline,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: BRANDING.name,
    description: BRANDING.tagline,
    address: {
      "@type": "PostalAddress",
      streetAddress: BRANDING.branches[0].address,
    },
    telephone: BRANDING.branches[0].phone,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: BRANDING.globalRating.toString(),
      reviewCount: BRANDING.totalReviewsCount.toString(),
    },
    servesCuisine: BRANDING.menu.map((c) => c.name),
  };

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <FloatingWidgets />
      </body>
    </html>
  );
}
