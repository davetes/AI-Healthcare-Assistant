"use client";

import { useAuth } from '../../../src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
	const { user, logout } = useAuth();
	const router = useRouter();

	const links = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/symptoms', label: 'Symptom Checker' },
		{ href: '/chat', label: 'Chat' },
		{ href: '/appointments', label: 'Appointments' },
		{ href: '/profile', label: 'Profile' },
	];

	return (
		<header className="w-full bg-white border-b border-gray-200">
			<div className="container-healthcare h-14 flex items-center justify-between">
				<div className="font-semibold">AI Healthcare Assistant</div>
				<div className="flex items-center gap-4">
					<nav className="hidden md:flex items-center gap-3 mr-2">
						{links.map(l => (
							<Link key={l.href} href={l.href} className="text-sm text-gray-700 hover:text-primary-700 hover:underline">
								{l.label}
							</Link>
						))}
					</nav>
					<span className="text-sm text-gray-600">{user?.firstName}</span>
					<button className="btn btn-outline btn-sm" onClick={async () => { await logout(); router.replace('/login'); }}>Logout</button>
				</div>
			</div>
		</header>
	);
}


