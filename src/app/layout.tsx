import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IdentityForge — Decentralized Persistent Memory for AI Agents",
  description: "Durable agent identity decoupled from model context and stored in Walrus Memory blobs. Reconstructed cold across environments and models.",
  keywords: ["Walrus Memory", "Sui", "AI Agents", "Persistent Memory", "DeepSeek", "Hackathon", "IdentityForge"],
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
      </head>
      <body>{children}</body>
    </html>
  );
}
