import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Avance — A game layer for real-world work",
  description:
    "Avance turns real-world assignments into measurable quests and gives institutions visibility before failure happens.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const unreadCount = user
    ? await prisma.notification.count({ where: { userId: user.id, read: false } })
    : 0;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navbar user={user} unreadCount={unreadCount} />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
