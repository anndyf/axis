import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import NextTopLoader from 'nextjs-toploader';
import { escolaDaRequisicao } from "@/lib/escola-atual";
import { cookies } from "next/headers";
import { COOKIE_TEMA, temaValido } from "@/lib/tema";
import { DESTAQUE_PADRAO, variaveisDaEscola } from "@/lib/services/identidade";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cor do tema do navegador/PWA = azul Áxis (fixo)
export async function generateViewport(): Promise<Viewport> {
  return {
    themeColor: DESTAQUE_PADRAO,
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  };
}

export const metadata: Metadata = {
  title: "Áxis – Sistema de Gestão Escolar",
  description: "Sistema de Gestão Escolar Áxis – Lançamento de notas, laboratórios e relatórios.",
  // Manifest por escola (nome e cor do tema); src/app/manifest/route.ts
  manifest: "/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Áxis",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Cor da escola só como detalhe (--escola); o destaque é fixo no globals.css
  const escola = await escolaDaRequisicao();
  // Tema escolhido no menu do usuário (cookie), aplicado já no HTML do servidor: sem piscar
  const tema = temaValido((await cookies()).get(COOKIE_TEMA)?.value);
  return (
    <html lang="pt-BR" data-theme={tema} style={variaveisDaEscola(escola?.corPrimaria) as React.CSSProperties}>
      <head>
        {/* PWA meta tags para melhor suporte em iOS */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Áxis" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/icon-128x128.png" />
        <link rel="apple-touch-icon" sizes="96x96" href="/icon-96x96.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icon-72x72.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader 
          color="var(--accent)"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow={false}
        />
        <Providers>{children}</Providers>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
