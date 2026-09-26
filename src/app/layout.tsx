import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Convert Ventas", template: "%s · Convert Ventas" },
  description: "Gestión del equipo de ventas de Convert – zapatillas de cuero al por mayor",
  applicationName: "Convert Ventas",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#74421d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-PE">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
