import "./globals.css";
import { Inter } from "next/font/google";
import Toaster from "./components/ui/Toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Kuzana Connect",
  description: "Discover and connect with members of the Kuzana community.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Kuzana Connect",
    statusBarStyle: "default",
  },
  icons: { apple: "/apple-icon.png" },
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
