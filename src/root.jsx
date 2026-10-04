import React from 'react';
import { Links, Scripts, ScrollRestoration, useLocation } from 'react-router';
import { RootLayout } from './layouts/RootLayout';
import { Seo } from './components/ui/Seo';
import { routeSeo } from './lib/route-seo';
import { documentScripts } from './document-scripts';
import './index.css';

export function Layout({ children }) {
  const { pathname } = useLocation();
  const seo = routeSeo(pathname);
  return <html lang={seo.lang} dir={seo.lang === 'ar' ? 'rtl' : 'ltr'}><head>

    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />


    <meta name="author" content="Ahmed Darwish — BznsFlow" />



    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="BznsFlow" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="BznsFlow — AI Receptionist, Booking & WhatsApp Order Automation, in Arabic & English" />


    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@bznsflow" />


    <link rel="icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />


    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
      media="all"

    />
    <noscript>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </noscript>
    <meta name="facebook-domain-verification" content="gp7mxwceshctr5x1y0hrrmukfa1q0j" />








    <Seo {...seo} /><Links />
    {documentScripts.slice(0, 1).map((script, i) => <script key={i} dangerouslySetInnerHTML={{ __html: script }} />)}
    </head><body><div id="root">{children}</div><ScrollRestoration /><Scripts /></body></html>;
}
export default RootLayout;
