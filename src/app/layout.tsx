import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhatHeThinks — See When His Texting Changed",
  description:
    "Upload your chat and see what his texting behavior is actually showing. Private by default. Raw chats never leave your browser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
