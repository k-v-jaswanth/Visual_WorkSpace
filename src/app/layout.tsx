import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Startupathon Echo — AI Collaborative Visual Workspace',
  description: 'Find the room where your best work happens. Video communication, real-time collaboration, and AI-powered visualization in one seamless workspace.',
  keywords: ['AI workspace', 'collaborative canvas', 'video meeting', 'mind mapping', 'real-time collaboration', 'Startupathon'],
  openGraph: {
    title: 'Startupathon Echo — AI Collaborative Visual Workspace',
    description: 'Find the room where your best work happens.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
