import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nimba Stay',
  description: 'Front desk room booking for the Nimba nature cure centre',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
