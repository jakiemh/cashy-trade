import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
export const metadata: Metadata = {
  title: "Cashy Trade",
  description: "Trading signals, journal, and Cashy assistant",
  icons: {
    icon: "/cashy/cashy-cape.jpg",
    apple: "/cashy/cashy-cape.jpg",
  },
  appleWebApp: {
    capable: true,
    title: "Cashy Trade",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ecfdf5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-[100dvh] antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
