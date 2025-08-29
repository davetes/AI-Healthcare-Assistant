"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api, { endpoints } from "../../src/services/api";
import Link from "next/link";

type Appointment = {
	id: string;
	type: string;
	mode: string;
	status: string;
	dateTime: string;
	duration: number;
	reason: string;
	isUpcoming: boolean;
	isToday: boolean;
	canBeCancelled: boolean;
};

export default function AppointmentsPage() {
    const router = useRouter();
	const [items, setItems] = useState<Appointment[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState({
		doctorId: "000000000000000000000000",
		type: "consultation",
		mode: "virtual",
		dateTime: "",
		reason: "",
		duration: 30,
	});

	const canSubmit = useMemo(() => {
		return !!form.doctorId && !!form.type && !!form.mode && !!form.dateTime && form.reason.trim().length > 0;
	}, [form]);

	const load = async () => {
		try {
			setLoading(true);
			setError(null);
			const { data } = await api.get(endpoints.appointments.list);
			setItems(data?.appointments ?? []);
		} catch (e: any) {
			setError(e?.response?.data?.error || "Failed to load appointments");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	const createAppointment = async () => {
		try {
			setLoading(true);
			setError(null);
			await api.post(endpoints.appointments.create, form);
			await load();
			setForm({ ...form, dateTime: "", reason: "" });
		} catch (e: any) {
			const serverError = e?.response?.data;
			const details = Array.isArray(serverError?.errors)
				? serverError.errors.map((er: any) => er.msg || er.message).join("; ")
				: serverError?.error || serverError?.message;
			setError(details || "Failed to schedule appointment");
		} finally {
			setLoading(false);
		}
	};

	const cancelAppointment = async (id: string) => {
		try {
			setLoading(true);
			setError(null);
			await api.delete(endpoints.appointments.delete(id));
			await load();
		} catch (e: any) {
			setError(e?.response?.data?.error || "Failed to cancel appointment");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container-healthcare py-8">
			<div className="flex items-center gap-3 mb-2">
				<button className="btn btn-outline" onClick={() => router.back()} aria-label="Go back">Back</button>
				<h1 className="text-2xl font-semibold">Appointments</h1>
			</div>
			<p className="text-gray-600 mb-6">Schedule and manage appointments.</p>

			{error && (
				<div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
			)}

			<div className="rounded-lg border border-gray-200 bg-white p-4 mb-6">
				<h2 className="font-medium mb-3">New appointment</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<input className="rounded-md border px-2 py-2 text-sm" placeholder="Doctor ID" value={form.doctorId} onChange={e => setForm({ ...form, doctorId: e.target.value })} />
					<select className="rounded-md border px-2 py-2 text-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
						<option value="consultation">Consultation</option>
						<option value="follow-up">Follow-up</option>
						<option value="emergency">Emergency</option>
						<option value="routine">Routine</option>
						<option value="specialist">Specialist</option>
					</select>
					<select className="rounded-md border px-2 py-2 text-sm" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
						<option value="virtual">Virtual</option>
						<option value="in-person">In person</option>
						<option value="phone">Phone</option>
					</select>
					<input className="rounded-md border px-2 py-2 text-sm" type="datetime-local" value={form.dateTime} onChange={e => setForm({ ...form, dateTime: e.target.value })} />
					<input className="rounded-md border px-2 py-2 text-sm" placeholder="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
					<input className="rounded-md border px-2 py-2 text-sm" type="number" min={15} max={240} step={15} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} />
					<button disabled={!canSubmit || loading} onClick={createAppointment} className={`rounded-md px-3 py-2 text-sm text-white ${(!canSubmit || loading) ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'}`}>{loading ? 'Saving...' : 'Create'}</button>
				</div>
			</div>

			<div className="rounded-lg border border-gray-200 bg-white">
				<div className="p-4 border-b font-medium">Your appointments</div>
				{items.length === 0 ? (
					<div className="p-4 text-sm text-gray-500">No appointments.</div>
				) : (
					<ul className="divide-y">
						{items.map(a => (
							<li key={a.id} className="p-4 flex items-center justify-between">
								<div>
									<div className="text-sm font-medium">{new Date(a.dateTime).toLocaleString()} · {a.type} · {a.mode}</div>
									<div className="text-xs text-gray-600">{a.status} · {a.reason}</div>
								</div>
								<div className="flex items-center gap-2">
									{a.canBeCancelled && (
										<button onClick={() => cancelAppointment(a.id)} className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50">Cancel</button>
									)}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

