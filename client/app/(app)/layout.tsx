"use client";

import '../globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import Navbar from '../../src/components/layout/Navbar';
import Sidebar from '../../src/components/layout/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading && !user) {
			router.replace('/login');
		}
	}, [user, loading, router]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
			</div>
		);
	}

	if (!user) return null;

	return (
		<div className="flex h-screen bg-gray-50">
			<Sidebar />
			<div className="flex-1 flex flex-col overflow-hidden">
				<Navbar />
				<main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
					{children}
				</main>
			</div>
		</div>
	);
}


