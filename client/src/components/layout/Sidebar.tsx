"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
	{ href: '/', label: 'Dashboard' },
	{ href: '/symptoms', label: 'Symptom Checker' },
	{ href: '/chat', label: 'Chat' },
	{ href: '/appointments', label: 'Appointments' },
	{ href: '/profile', label: 'Profile' },
];

export default function Sidebar() {
	const pathname = usePathname();
	return (
		<aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
			<nav className="p-4 space-y-1">
				{links.map(link => {
					const active = pathname === link.href;
					return (
						<Link key={link.href} href={link.href} className={`block px-3 py-2 rounded-md text-sm ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}>
							{link.label}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}





