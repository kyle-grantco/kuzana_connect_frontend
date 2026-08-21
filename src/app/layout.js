import "./globals.css";
import { Inter } from "next/font/google";
import Toaster from "./components/ui/Toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Kuzana Connect",
  description: "Discover what other founders are building, what they offer, and what they're looking for. Connect with them and be discovered too.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Kuzana Connect",
    statusBarStyle: "default",
  },
  icons: { apple: "/apple-icon.png" },
  openGraph: {
    title: "Kuzana Connect",
    description: "Discover what other founders are building, what they offer, and what they're looking for. Connect with them and be discovered too.",
    url: "https://connect.kuzana.co",
    siteName: "Kuzana Connect",
    images: [{ url: "https://connect.kuzana.co/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kuzana Connect",
    description: "Discover what other founders are building, what they offer, and what they're looking for. Connect with them and be discovered too.",
    images: ["https://connect.kuzana.co/og-image.png"],
  },
};

export const viewport = { themeColor: "#1d4ed8" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* Global toast host — reads the notification store */}
        <Toaster />
      </body>
    </html>
  );
}
