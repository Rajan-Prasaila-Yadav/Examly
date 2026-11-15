// apps/web/src/app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/lib/toast-context';
import { AppQueryProvider } from '@/lib/query/query-provider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Examly — Enterprise Examination & Learning Platform',
  description: 'Next-generation learning and computer-based examination management platform for institutions, faculty, and students.',
  manifest: '/manifest.json',
  applicationName: 'Examly',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Examly',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#5B4FCF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#5B4FCF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Examly" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        <ErrorBoundary>
          <AppQueryProvider>
            <AuthProvider>
              <ToastProvider>{children}</ToastProvider>
            </AuthProvider>
          </AppQueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
