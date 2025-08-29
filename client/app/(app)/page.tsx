"use client";

import { useEffect, useMemo, useState } from "react";
import api, { endpoints } from "../../src/services/api";
// Note: Image removed to avoid missing asset issues; using inline SVG instead

type ChatSummary = { sessionId: string; title?: string; updatedAt?: string };
type AppointmentSummary = { id: string; dateTime: string; type: string; status: string; reason: string };

export default function DashboardPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [recentChats, setRecentChats] = useState<ChatSummary[]>([]);
	const [upcoming, setUpcoming] = useState<AppointmentSummary | null>(null);
	const [chatTrend, setChatTrend] = useState<number[]>([]);
	const [symptomTrend, setSymptomTrend] = useState<number[]>([]);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				setError(null);
				const [chatsRes, apptRes] = await Promise.all([
					api.get(endpoints.chat.history + "?limit=5"),
					api.get(endpoints.appointments.list + "?limit=10"),
				]);
				const chats = chatsRes.data?.chats ?? [];
				setRecentChats(chats.map((c: any) => ({ sessionId: c.sessionId, title: c.title, updatedAt: c.updatedAt })));
				const appts = apptRes.data?.appointments ?? [];
				const next = appts.find((a: any) => new Date(a.dateTime) > new Date());
				setUpcoming(next ? { id: next.id, dateTime: next.dateTime, type: next.type, status: next.status, reason: next.reason } : null);
				// Simple placeholder trends until backend supports stats endpoints
				setChatTrend(chats.length ? new Array(Math.min(8, chats.length)).fill(0).map((_, i) => i + 1) : [1,2,1,3,2,4,3,5]);
				setSymptomTrend([2,1,3,2,4,2,5,3]);
			} catch (e: any) {
				setError(e?.response?.data?.error || "Failed to load dashboard data");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	const miniBars = (series: number[], colorClass: string) => {
		const max = Math.max(1, ...series);
		return (
			<div className="flex items-end gap-1 h-10">
				{series.map((v, i) => (
					<div key={i} className={`${colorClass}`} style={{ width: 8, height: Math.max(2, Math.round((v / max) * 40)) }} />
				))}
			</div>
		);
	};

	const checklist = useMemo(() => [
		{ label: "Complete your profile", href: "/profile" },
		{ label: "Start your first chat", href: "/chat" },
		{ label: "Schedule an appointment", href: "/appointments" },
	], []);

	return (
		<div className="container-healthcare py-8">
			<h1 className="text-2xl font-semibold mb-4">AI Healthcare Assistant</h1>
			<p className="text-gray-600 mb-6">Your companion for general health guidance, symptom insights, and appointment management. This app provides educational information and wellness support, not medical diagnosis.</p>

			{error && (
				<div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<h2 className="font-medium mb-1">Health Chat</h2>
					<p className="text-sm text-gray-600 mb-3">Ask health questions and receive AI guidance within safe boundaries.</p>
					<a href="/chat" className="text-sm text-primary-700 hover:underline">Open Chat →</a>
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<h2 className="font-medium mb-1">Symptom Checker</h2>
					<p className="text-sm text-gray-600 mb-3">Describe symptoms to get educational insights and next-step suggestions.</p>
					<a href="/symptoms" className="text-sm text-primary-700 hover:underline">Check Symptoms →</a>
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<h2 className="font-medium mb-1">Appointments</h2>
					<p className="text-sm text-gray-600 mb-3">Schedule, view, and manage your healthcare appointments in one place.</p>
					<a href="/appointments" className="text-sm text-primary-700 hover:underline">Manage Appointments →</a>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<h2 className="font-medium mb-2">Getting started</h2>
					<ul className="space-y-2 text-sm">
						{checklist.map(step => (
							<li key={step.label} className="flex items-center gap-2">
								<span className="inline-block h-2 w-2 rounded-full bg-primary-600" />
								<a href={step.href} className="hover:underline">{step.label}</a>
							</li>
						))}
					</ul>
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<h2 className="font-medium mb-2">Upcoming appointment</h2>
					{!upcoming ? (
						<p className="text-sm text-gray-600">No upcoming appointment found.</p>
					) : (
						<div className="text-sm">
							<div className="font-medium">{new Date(upcoming.dateTime).toLocaleString()}</div>
							<div className="text-gray-600">{upcoming.type} · {upcoming.status}</div>
							<div className="text-gray-600">{upcoming.reason}</div>
						</div>
					)}
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<h2 className="font-medium mb-2">Trends</h2>
					<div className="text-xs text-gray-600 mb-2">Weekly activity</div>
					<svg viewBox="0 0 300 100" className="w-full h-24">
						<defs>
							<linearGradient id="gradChat" x1="0" x2="0" y1="0" y2="1">
								<stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
								<stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
							</linearGradient>
							<linearGradient id="gradSym" x1="0" x2="0" y1="0" y2="1">
								<stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
								<stop offset="100%" stopColor="#10b981" stopOpacity="0" />
							</linearGradient>
						</defs>
						<polyline fill="none" stroke="#2563eb" strokeWidth="2" points={pointsFromSeries(chatTrend)} />
						<polyline fill="none" stroke="#10b981" strokeWidth="2" points={pointsFromSeries(symptomTrend)} />
					</svg>
					<div className="text-xs text-gray-500 mt-1">Blue: Chat • Green: Symptoms</div>
				</div>
			</div>

			<div className="rounded-lg border border-gray-200 bg-white p-4">
				<h2 className="font-medium mb-2">Recent chats</h2>
				{recentChats.length === 0 ? (
					<div className="flex items-center gap-4">
						<svg width="96" height="64" viewBox="0 0 96 64" className="rounded-md">
							<defs>
								<linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
									<stop offset="0%" stopColor="#e0f2fe" />
									<stop offset="100%" stopColor="#f0f9ff" />
								</linearGradient>
							</defs>
							<rect x="0" y="0" width="96" height="64" fill="url(#grad)" rx="8" />
							<path d="M10 40 L30 40 L38 22 L50 48 L58 34 L86 34" stroke="#2563eb" strokeWidth="3" fill="none" strokeLinecap="round" />
							<circle cx="30" cy="40" r="3" fill="#2563eb" />
							<circle cx="58" cy="34" r="3" fill="#2563eb" />
						</svg>
						<p className="text-sm text-gray-600">No recent chats.</p>
					</div>
				) : (
					<ul className="divide-y">
						{recentChats.map(c => (
							<li key={c.sessionId} className="py-3 flex items-center justify-between">
								<div>
									<div className="text-sm font-medium">{c.title || "Health Consultation"}</div>
									<div className="text-xs text-gray-600">Updated {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "recently"}</div>
								</div>
								<a className="text-xs text-primary-700 hover:underline" href={`/chat?session=${c.sessionId}`}>Resume →</a>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}


// Convert a small series to SVG polyline points
function pointsFromSeries(series: number[]) {
    const n = Math.max(1, series.length);
    const max = Math.max(1, ...series);
    const stepX = 300 / (n - 1 || 1);
    return series.map((v, i) => `${i * stepX},${100 - (v / max) * 80 - 10}`).join(" ");
}
