import type {Metadata} from 'next';
import Script from 'next/script';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'PDF Book Reader with Page AI',
  description: 'Browser-based deep reading app for PDF books with page-by-page viewing and strictly scoped, independent AI assistance per page.',
  openGraph: {
    title: 'PDF Book Reader with Page AI',
    description: 'Browser-based deep reading app for PDF books with page-by-page viewing and strictly scoped, independent AI assistance per page.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF Book Reader with Page AI',
    description: 'Browser-based deep reading app for PDF books with page-by-page viewing and strictly scoped, independent AI assistance per page.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <Script src="/pdf.min.js" strategy="beforeInteractive" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
