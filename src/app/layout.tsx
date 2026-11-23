import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vórtex Compress - Comprimir y extraer ZIP, sin límites",
  description:
    "Vórtex Compress, de Vortex Company: crea archivos ZIP con nivel de compresión ajustable y extrae ZIPs leyendo solo lo que te interesa. Todo se procesa dentro de tu navegador, tus archivos nunca salen de tu equipo. Gratis, sin anuncios y 100% local.",
  keywords: [
    "Vórtex Compress",
    "comprimir archivos",
    "crear ZIP online",
    "extraer ZIP",
    "descomprimir online",
    "sin anuncios",
  ],
  authors: [{ name: "Vortex Company" }],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#161616"/><rect x="10" y="8" width="28" height="32" rx="4" fill="none" stroke="#f59e0b" stroke-width="3.5"/><path d="M17 16h6M17 21h6M17 26h6M17 31h6" stroke="#fbbf24" stroke-width="3" strokeLinecap="round"/><path d="M35 12l6 8-6 8" fill="none" stroke="#fbbf24" stroke-width="3" strokeLinecap="round" strokeLinejoin="round"/></svg>`
      ),
  },
  openGraph: {
    title: "Vórtex Compress - Comprimir y extraer ZIP, sin límites",
    description:
      "Vórtex Compress, de Vortex Company: crea archivos ZIP con nivel de compresión ajustable y extrae ZIPs leyendo solo lo que te interesa. Todo se procesa dentro de tu navegador. Gratis, sin anuncios y 100% local.",
    siteName: "Vórtex Compress - Comprimir y extraer ZIP, sin límites",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#0f0f10] text-[#ececf1]">{children}</body>
    </html>
  );
}
