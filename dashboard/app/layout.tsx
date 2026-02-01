import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ['latin'],
	variable: '--font-mono',
});

export const metadata: Metadata = {
	title: 'Yxhyx Dashboard',
	description: 'Your personal AI assistant dashboard - view goals, check-ins, and insights',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
			<body className="font-sans bg-background min-h-screen">
				<div className="flex min-h-screen">
					<Sidebar />
					<main className="flex-1 ml-64 p-8">{children}</main>
				</div>
			</body>
		</html>
	);
}
