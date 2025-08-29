"use client";

import { useEffect, useMemo, useState } from "react";
import api, { endpoints } from "../../src/services/api";
// Note: Image removed to avoid missing asset issues; using inline SVG instead
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

type ChatSummary = { sessionId: string; title?: string; updatedAt?: string };
type AppointmentSummary = { id: string; dateTime: string; type: string; status: string; reason: string };

export default function DashboardPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [recentChats, setRecentChats] = useState<ChatSummary[]>([]);
	const [upcoming, setUpcoming] = useState<AppointmentSummary | null>(null);
	const [upcomingList, setUpcomingList] = useState<AppointmentSummary[]>([]);
	const [chatTrend, setChatTrend] = useState<number[]>([]);
	const [symptomTrend, setSymptomTrend] = useState<number[]>([]);
	const [severityBreakdown, setSeverityBreakdown] = useState<{ mild?: number; moderate?: number; severe?: number }>({});
	const [symptomTotals, setSymptomTotals] = useState<{ total: number; active: number; resolved: number; highUrgency: number }>({ total: 0, active: 0, resolved: 0, highUrgency: 0 });

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				setError(null);
				const [chatsRes, apptRes, symRes] = await Promise.all([
					api.get(endpoints.chat.history + "?limit=5"),
					api.get(endpoints.appointments.list + "?limit=50"),
					api.get(endpoints.symptoms.stats)
				]);
				const chats = chatsRes.data?.chats ?? [];
				setRecentChats(chats.map((c: any) => ({ sessionId: c.sessionId, title: c.title, updatedAt: c.updatedAt })));
				const appts = apptRes.data?.appointments ?? [];
				const future = appts.filter((a: any) => new Date(a.dateTime) > new Date()).sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
				const next = future[0];
				setUpcoming(next ? { id: next.id, dateTime: next.dateTime, type: next.type, status: next.status, reason: next.reason } : null);
				setUpcomingList(future.slice(0, 3).map((a: any) => ({ id: a.id, dateTime: a.dateTime, type: a.type, status: a.status, reason: a.reason })));
				// Build 7-day activity series (today - 6 to today)
				const days: string[] = [];
				const fmt = (d: Date) => d.toISOString().slice(0,10);
				for (let i = 6; i >= 0; i--) {
					const d = new Date();
					d.setDate(d.getDate() - i);
					days.push(fmt(d));
				}
				const short = (iso: string) => {
					const d = new Date(iso);
					return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
				};
				const chatCounts = days.map(key => (chats.filter((c: any) => (c.updatedAt ? c.updatedAt.slice(0,10) === key : false)).length));
				// Without a dedicated endpoint for symptom events by day, approximate from stats (fallback zeros)
				const symCounts = days.map(() => 0);
				setChatTrend(chatCounts);
				setSymptomTrend(symCounts);
				const sym = symRes.data || {};
				setSymptomTotals({ total: sym.total || 0, active: sym.active || 0, resolved: sym.resolved || 0, highUrgency: sym.highUrgency || 0 });
				setSeverityBreakdown({
					mild: sym.severityBreakdown?.mild || 0,
					moderate: sym.severityBreakdown?.moderate || 0,
					severe: sym.severityBreakdown?.severe || 0
				});
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

	// Derive severity data for chart with a visual baseline when all are zero
	const hasSeverity = (severityBreakdown.mild || 0) + (severityBreakdown.moderate || 0) + (severityBreakdown.severe || 0) > 0;
	const severityData = [
		{
			name: 'Severity',
			mild: hasSeverity ? (severityBreakdown.mild || 0) : 1,
			moderate: hasSeverity ? (severityBreakdown.moderate || 0) : 1,
			severe: hasSeverity ? (severityBreakdown.severe || 0) : 1
		}
	];

	return (
		<div className="container-healthcare py-8">
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-semibold">AI Healthcare Assistant</h1>
			</div>
			<p className="text-gray-600 mb-6">Your companion for general health guidance, symptom insights, and appointment management. This app provides educational information and wellness support, not medical diagnosis.</p>

			{/* AI + Hospital hero illustration */}
			<div className="rounded-lg border border-gray-200 bg-white p-4 mb-8">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
					<div className="md:col-span-2">
						<svg viewBox="0 0 600 220" className="w-full h-40 md:h-44">
							<defs>
								<linearGradient id="heroSky" x1="0" x2="0" y1="0" y2="1">
									<stop offset="0%" stopColor="#eef2ff" />
									<stop offset="100%" stopColor="#f8fafc" />
								</linearGradient>
								<linearGradient id="aiGlow" x1="0" x2="0" y1="0" y2="1">
									<stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
									<stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
								</linearGradient>
							</defs>
							<rect x="0" y="0" width="600" height="220" fill="url(#heroSky)" rx="12" />
							{/* Hospital */}
							<rect x="40" y="60" width="160" height="110" fill="#ffffff" stroke="#e5e7eb" />
							<rect x="100" y="40" width="40" height="20" fill="#ffffff" stroke="#e5e7eb" />
							<rect x="70" y="90" width="30" height="30" fill="#f1f5f9" />
							<rect x="140" y="90" width="30" height="30" fill="#f1f5f9" />
							<rect x="105" y="120" width="30" height="50" fill="#e2e8f0" />
							<rect x="115" y="125" width="10" height="20" fill="#94a3b8" />
							<rect x="110" y="70" width="20" height="8" fill="#ef4444" />
							<rect x="117" y="63" width="6" height="22" fill="#ef4444" />
							{/* AI chip */}
							<circle cx="380" cy="110" r="48" fill="url(#aiGlow)" />
							<rect x="350" y="80" width="60" height="60" rx="10" fill="#1d4ed8" />
							<rect x="360" y="90" width="40" height="40" rx="6" fill="#93c5fd" />
							<circle cx="380" cy="110" r="10" fill="#1d4ed8" />
							{/* Connection lines */}
							<path d="M200 115 C 260 115, 300 110, 350 110" stroke="#60a5fa" strokeWidth="2" fill="none" strokeDasharray="4 4" />
						</svg>
					</div>
					<div className="space-y-2 text-sm text-gray-700">
						<div className="font-medium">Smart, safe, and supportive</div>
						<ul className="list-disc pl-5">
							<li>AI-assisted insights for symptoms and wellness</li>
							<li>Clear guidance on when to seek care</li>
							<li>Appointments and chats in one place</li>
						</ul>
					</div>
				</div>
			</div>



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
					{upcomingList?.length > 1 && (
						<div className="mt-3">
							<div className="text-xs text-gray-500 mb-1">Next appointments</div>
							<ul className="space-y-1 text-xs text-gray-700">
								{upcomingList.slice(1).map(a => (
									<li key={a.id}>{new Date(a.dateTime).toLocaleString()} · {a.type} · {a.status}</li>
								))}
							</ul>
						</div>
					)}
				</div>
				<div className="rounded-lg border border-gray-200 bg-white p-4">
					<h2 className="font-medium mb-2">Trends</h2>
					<div className="text-xs text-gray-600 mb-2">Weekly activity</div>
					<div className="w-full h-32">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={mergeSeriesForChart(chatTrend, symptomTrend)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
								<XAxis dataKey="label" />
								<YAxis hide />
								<Tooltip formatter={(v: any, name: any) => [v, name === 'chat' ? 'Chat' : 'Symptoms']} />
								<Line type="monotone" dataKey="chat" stroke="#2563eb" strokeWidth={2} dot={false} />
								<Line type="monotone" dataKey="symptoms" stroke="#10b981" strokeWidth={2} dot={false} />
							</LineChart>
						</ResponsiveContainer>
					</div>
					<div className="text-xs text-gray-500 mt-1">Blue: Chat • Green: Symptoms</div>
					<div className="mt-4">
						<div className="text-xs text-gray-600 mb-2">Symptom severity (last 30 days)</div>
						<div className="w-full h-32">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={severityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
									<XAxis dataKey="name" hide />
									<YAxis hide />
									<Tooltip />
									<Bar dataKey="mild" fill="#3b82f6" isAnimationActive={false} />
									<Bar dataKey="moderate" fill="#f59e0b" isAnimationActive={false} />
									<Bar dataKey="severe" fill="#ef4444" isAnimationActive={false} />
								</BarChart>
							</ResponsiveContainer>
						</div>
						<div className="text-xs text-gray-500 mt-2">
							{!hasSeverity ? (
								<span>No data yet. Bars shown as placeholders.</span>
							) : null}
							<span className="ml-1">Total: {symptomTotals.total} · Active: {symptomTotals.active} · Resolved: {symptomTotals.resolved} · High urgency: {symptomTotals.highUrgency}</span>
						</div>
					</div>
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

// Simple helper to compute bar height percentage for severity bars
function barHeight(value?: number) {
	const v = typeof value === 'number' ? value : 0;
	const max = Math.max(1, v, 5); // ensure some visual height baseline
	return Math.min(100, Math.round((v / max) * 100));
}

function mergeSeriesForChart(a: number[], b: number[]) {
    const length = Math.max(a.length, b.length);
    const pad = (arr: number[], l: number) => arr.concat(Array(Math.max(0, l - arr.length)).fill(0));
    const aa = pad(a, length);
    const bb = pad(b, length);
    const labels: string[] = [];
    for (let i = length - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - (length - 1 - i));
        labels.push(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]);
    }
    return aa.map((v, i) => ({ label: labels[i], chat: v, symptoms: bb[i] }));
}
