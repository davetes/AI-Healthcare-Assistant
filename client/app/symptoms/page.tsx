"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { endpoints } from '../../src/services/api';

const severities = ['mild', 'moderate', 'severe'] as const;
const durationUnits = ['hours', 'days', 'weeks', 'months'] as const;

type Symptom = {
	name: string;
	severity: 'mild' | 'moderate' | 'severe';
	duration?: { value?: number; unit?: 'hours' | 'days' | 'weeks' | 'months' };
	description?: string;
	location?: string;
};

type Assessment = {
	possibleConditions: { condition: string; probability?: number; confidence?: number; description?: string; symptoms?: string[]; riskLevel?: string }[];
	recommendations: { type: string; title?: string; description?: string; priority?: string; timeframe?: string }[];
	generalAdvice?: string;
	whenToSeekHelp?: string;
	followUp?: { timeframe?: string; actions?: string[] };
};

export default function SymptomsPage() {
	const [symptoms, setSymptoms] = useState<Symptom[]>([
		{ name: '', severity: 'moderate', duration: { value: 1, unit: 'days' }, description: '' }
	]);
	const [additionalInfo, setAdditionalInfo] = useState<{ age?: number; gender?: string }>({});
	const [submitting, setSubmitting] = useState(false);
	const [assessment, setAssessment] = useState<Assessment | null>(null);

	const updateSymptom = (index: number, updates: Partial<Symptom>) => {
		setSymptoms(prev => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
	};

	const addSymptom = () => setSymptoms(prev => [...prev, { name: '', severity: 'moderate', duration: { value: 1, unit: 'days' }, description: '' }]);
	const removeSymptom = (index: number) => setSymptoms(prev => prev.filter((_, i) => i !== index));

	const submit = async () => {
		try {
			if (symptoms.some(s => !s.name || !s.severity)) {
				toast.error('Please fill in symptom name and severity.');
				return;
			}
			setSubmitting(true);
			const res = await api.post(endpoints.symptoms.check, { symptoms, additionalInfo });
			setAssessment(res.data.assessment);
			toast.success('Analysis completed');
		} catch (error: any) {
			const msg = error?.response?.data?.error || 'Failed to analyze symptoms';
			toast.error(msg);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="container-healthcare py-8 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Symptom Checker</h1>
				<button className="btn btn-outline" onClick={() => setAssessment(null)}>Clear Results</button>
			</div>

			<div className="card">
				<div className="card-header">
					<h2 className="font-medium">Your Symptoms</h2>
				</div>
				<div className="card-body space-y-4">
					{symptoms.map((s, i) => (
						<div key={i} className="border border-gray-200 rounded-md p-4 space-y-3">
							<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
								<input className="form-input" placeholder="Symptom name (e.g., headache)" value={s.name} onChange={e => updateSymptom(i, { name: e.target.value })} />
								<select className="form-input" value={s.severity} onChange={e => updateSymptom(i, { severity: e.target.value as Symptom['severity'] })}>
									{severities.map(v => (<option key={v} value={v}>{v}</option>))}
								</select>
								<div className="flex gap-2">
									<input className="form-input" type="number" min={0} placeholder="Duration" value={s.duration?.value ?? ''} onChange={e => updateSymptom(i, { duration: { ...s.duration, value: e.target.value ? Number(e.target.value) : undefined } })} />
									<select className="form-input" value={s.duration?.unit ?? 'days'} onChange={e => updateSymptom(i, { duration: { ...s.duration, unit: e.target.value as Symptom['duration']['unit'] } })}>
										{durationUnits.map(u => (<option key={u} value={u}>{u}</option>))}
									</select>
								</div>
								<input className="form-input" placeholder="Location (optional)" value={s.location ?? ''} onChange={e => updateSymptom(i, { location: e.target.value })} />
							</div>
							<textarea className="form-input" rows={3} placeholder="Description (optional)" value={s.description ?? ''} onChange={e => updateSymptom(i, { description: e.target.value })} />
							<div className="flex justify-between">
								<button className="btn btn-outline btn-sm" onClick={() => removeSymptom(i)} disabled={symptoms.length === 1}>Remove</button>
								<button className="btn btn-secondary btn-sm" onClick={addSymptom}>Add another</button>
							</div>
						</div>
					))}
				</div>
				<div className="card-footer flex items-center justify-between">
					<div className="flex gap-2 items-end">
						<div>
							<label className="form-label" htmlFor="age">Age (optional)</label>
							<input id="age" type="number" min={0} className="form-input" placeholder="e.g., 34" value={additionalInfo.age ?? ''} onChange={e => setAdditionalInfo(prev => ({ ...prev, age: e.target.value ? Number(e.target.value) : undefined }))} />
						</div>
						<div>
							<label className="form-label" htmlFor="gender">Gender (optional)</label>
							<select id="gender" className="form-input" value={additionalInfo.gender ?? ''} onChange={e => setAdditionalInfo(prev => ({ ...prev, gender: e.target.value || undefined }))}>
								<option value="">Not specified</option>
								<option value="male">Male</option>
								<option value="female">Female</option>
								<option value="other">Other</option>
							</select>
						</div>
					</div>
					<button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Analyzing…' : 'Analyze symptoms'}</button>
				</div>
			</div>

			{assessment && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="card lg:col-span-2">
						<div className="card-header"><h3 className="font-medium">Possible Conditions</h3></div>
						<div className="card-body space-y-3">
							{assessment.possibleConditions?.length ? assessment.possibleConditions.map((c, idx) => (
								<div key={idx} className="border border-gray-200 rounded-md p-4">
									<div className="flex items-center justify-between mb-1">
										<div className="font-medium">{c.condition}</div>
										{c.riskLevel && <span className={`badge ${riskBadge(c.riskLevel)}`}>{c.riskLevel}</span>}
									</div>
									{c.description && <p className="text-sm text-gray-600 mb-2">{c.description}</p>}
									<div className="text-xs text-gray-500">{percentLabel('Probability', c.probability)} • {percentLabel('Confidence', c.confidence)}</div>
									{c.symptoms?.length ? <div className="mt-2 text-xs text-gray-600">Symptoms: {c.symptoms.join(', ')}</div> : null}
								</div>
							)) : <div className="text-gray-600">No conditions identified.</div>}
						</div>
					</div>
					<div className="card">
						<div className="card-header"><h3 className="font-medium">Recommendations</h3></div>
						<div className="card-body space-y-3">
							{assessment.recommendations?.length ? assessment.recommendations.map((r, idx) => (
								<div key={idx} className="border border-gray-200 rounded-md p-4">
									<div className="flex items-center justify-between mb-1">
										<div className="font-medium">{r.title || r.type}</div>
										{r.priority && <span className="badge badge-warning">{r.priority}</span>}
									</div>
									{r.description && <p className="text-sm text-gray-600">{r.description}</p>}
									{r.timeframe && <p className="text-xs text-gray-500 mt-1">Timeframe: {r.timeframe}</p>}
								</div>
							)) : <div className="text-gray-600">No recommendations available.</div>}
						</div>
					</div>
					<div className="card lg:col-span-3">
						<div className="card-header"><h3 className="font-medium">General Guidance</h3></div>
						<div className="card-body space-y-2">
							{assessment.generalAdvice && <p className="text-gray-700">{assessment.generalAdvice}</p>}
							{assessment.whenToSeekHelp && <p className="text-sm text-gray-600">When to seek help: {assessment.whenToSeekHelp}</p>}
							{assessment.followUp?.actions?.length ? (
								<ul className="list-disc pl-6 text-sm text-gray-700">
									{assessment.followUp.actions.map((a, i) => <li key={i}>{a}</li>)}
								</ul>
							) : null}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function riskBadge(level?: string) {
	if (!level) return 'badge-gray';
	const l = level.toLowerCase();
	if (l === 'critical' || l === 'high') return 'badge-danger';
	if (l === 'medium') return 'badge-warning';
	return 'badge-success';
}

function percentLabel(label: string, v?: number) {
	return `${label}: ${typeof v === 'number' ? `${v}%` : 'N/A'}`;
}
