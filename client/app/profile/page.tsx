"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import api, { endpoints } from '../../src/services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
	const router = useRouter();
	const { user, updateProfile } = useAuth();
	const [saving, setSaving] = useState(false);

	const [profile, setProfile] = useState({
		firstName: '',
		lastName: '',
		phoneNumber: '',
		emergencyContact: { name: '', relationship: '', phoneNumber: '' },
	});

	const [health, setHealth] = useState<any>({
		height: { value: undefined, unit: 'cm' },
		weight: { value: undefined, unit: 'kg' },
		bloodType: '',
		allergies: [],
		chronicConditions: [],
		familyHistory: [],
	});

	const [loadingHealth, setLoadingHealth] = useState(true);

	useEffect(() => {
		if (user) {
			setProfile({
				firstName: user.firstName || '',
				lastName: user.lastName || '',
				phoneNumber: user.phoneNumber || '',
				emergencyContact: {
					name: user.emergencyContact?.name || '',
					relationship: user.emergencyContact?.relationship || '',
					phoneNumber: user.emergencyContact?.phoneNumber || '',
				},
			});
		}
	}, [user]);

	useEffect(() => {
		const loadHealth = async () => {
			try {
				const res = await api.get(endpoints.users.healthProfile);
				setHealth({
					...res.data.healthProfile,
					height: res.data.healthProfile.height || { value: undefined, unit: 'cm' },
					weight: res.data.healthProfile.weight || { value: undefined, unit: 'kg' },
					allergies: res.data.healthProfile.allergies || [],
					chronicConditions: res.data.healthProfile.chronicConditions || [],
					familyHistory: res.data.healthProfile.familyHistory || [],
				});
			} catch {
				toast.error('Failed to load health profile');
			} finally {
				setLoadingHealth(false);
			}
		};
		loadHealth();
	}, []);

	const saveAccount = async () => {
		setSaving(true);
		try {
			const res = await updateProfile(profile as any);
			res.success ? toast.success('Profile updated') : toast.error(res.error || 'Failed to update profile');
		} finally {
			setSaving(false);
		}
	};

	const saveHealth = async () => {
		setSaving(true);
		try {
			await api.put(endpoints.users.healthProfile, {
				height: health.height,
				weight: health.weight,
				bloodType: health.bloodType || undefined,
				allergies: health.allergies,
				chronicConditions: health.chronicConditions,
				familyHistory: health.familyHistory,
			});
			toast.success('Health profile saved');
		} catch (e: any) {
			toast.error(e?.response?.data?.error || 'Failed to save health profile');
		} finally {
			setSaving(false);
		}
	};

	const addAllergy = () =>
		setHealth((h: any) => ({
			...h,
			allergies: [...(h.allergies || []), { name: '', severity: 'mild', notes: '' }],
		}));

	const removeAllergy = (idx: number) =>
		setHealth((h: any) => ({ ...h, allergies: h.allergies.filter((_: any, i: number) => i !== idx) }));

	return (
		<div className="container-healthcare py-8 space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<button className="btn btn-outline" onClick={() => router.back()} aria-label="Go back">
						Back
					</button>
					<h1 className="text-2xl font-semibold">Profile</h1>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Account Information */}
				<div className="card">
					<div className="card-header">
						<h2 className="font-medium">Account Information</h2>
					</div>
					<div className="card-body space-y-3">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label className="form-label">First name</label>
								<input
									className="form-input"
									value={profile.firstName}
									onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
								/>
							</div>
							<div>
								<label className="form-label">Last name</label>
								<input
									className="form-input"
									value={profile.lastName}
									onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
								/>
							</div>
						</div>

						<div>
							<label className="form-label">Phone number</label>
							<input
								className="form-input"
								value={profile.phoneNumber}
								onChange={(e) => setProfile((p) => ({ ...p, phoneNumber: e.target.value }))}
							/>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div>
								<label className="form-label">Emergency name</label>
								<input
									className="form-input"
									value={profile.emergencyContact.name}
									onChange={(e) =>
										setProfile((p) => ({ ...p, emergencyContact: { ...p.emergencyContact, name: e.target.value } }))
									}
								/>
							</div>
							<div>
								<label className="form-label">Relationship</label>
								<input
									className="form-input"
									value={profile.emergencyContact.relationship}
									onChange={(e) =>
										setProfile((p) => ({ ...p, emergencyContact: { ...p.emergencyContact, relationship: e.target.value } }))
									}
								/>
							</div>
							<div>
								<label className="form-label">Phone</label>
								<input
									className="form-input"
									value={profile.emergencyContact.phoneNumber}
									onChange={(e) =>
										setProfile((p) => ({ ...p, emergencyContact: { ...p.emergencyContact, phoneNumber: e.target.value } }))
									}
								/>
							</div>
						</div>
					</div>
					<div className="card-footer">
						<button className="btn btn-primary" onClick={saveAccount} disabled={saving}>
							{saving ? 'Saving…' : 'Save changes'}
						</button>
					</div>
				</div>

				{/* Health Profile */}
				<div className="card">
					<div className="card-header">
						<h2 className="font-medium">Health Profile</h2>
					</div>
					<div className="card-body space-y-3">
						{loadingHealth ? (
							<div className="text-gray-600">Loading health profile…</div>
						) : (
							<>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<div>
										<label className="form-label">Height</label>
										<div className="flex gap-2">
											<input
												className="form-input"
												type="number"
												min={0}
												value={health.height?.value ?? ''}
												onChange={(e) =>
													setHealth((h: any) => ({
														...h,
														height: { ...h.height, value: e.target.value ? Number(e.target.value) : undefined },
													}))
												}
											/>
											<select
												className="form-input"
												value={health.height?.unit ?? 'cm'}
												onChange={(e) => setHealth((h: any) => ({ ...h, height: { ...h.height, unit: e.target.value } }))}
											>
												<option value="cm">cm</option>
												<option value="ft">ft</option>
											</select>
										</div>
									</div>

									<div>
										<label className="form-label">Weight</label>
										<div className="flex gap-2">
											<input
												className="form-input"
												type="number"
												min={0}
												value={health.weight?.value ?? ''}
												onChange={(e) =>
													setHealth((h: any) => ({
														...h,
														weight: { ...h.weight, value: e.target.value ? Number(e.target.value) : undefined },
													}))
												}
											/>
											<select
												className="form-input"
												value={health.weight?.unit ?? 'kg'}
												onChange={(e) => setHealth((h: any) => ({ ...h, weight: { ...h.weight, unit: e.target.value } }))}
											>
												<option value="kg">kg</option>
												<option value="lbs">lbs</option>
											</select>
										</div>
									</div>
								</div>

								<div>
									<label className="form-label">Blood type</label>
									<select
										className="form-input"
										value={health.bloodType || ''}
										onChange={(e) => setHealth((h: any) => ({ ...h, bloodType: e.target.value }))}
									>
										<option value="">Not set</option>
										{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
											<option key={b} value={b}>
												{b}
											</option>
										))}
									</select>
								</div>

								<div>
									<div className="flex items-center justify-between mb-2">
										<label className="form-label">Allergies</label>
										<button className="btn btn-secondary btn-sm" onClick={addAllergy}>
											Add
										</button>
									</div>
									<div className="space-y-2">
										{(health.allergies || []).map((a: any, idx: number) => (
											<div key={idx} className="border border-gray-200 rounded-md p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
												<input
													className="form-input"
													placeholder="Name"
													value={a.name}
													onChange={(e) =>
														setHealth((h: any) => ({
															...h,
															allergies: h.allergies.map((x: any, i: number) => (i === idx ? { ...x, name: e.target.value } : x)),
														}))
													}
												/>
												<select
													className="form-input"
													value={a.severity || 'mild'}
													onChange={(e) =>
														setHealth((h: any) => ({
															...h,
															allergies: h.allergies.map((x: any, i: number) => (i === idx ? { ...x, severity: e.target.value } : x)),
														}))
													}
												>
													<option value="mild">mild</option>
													<option value="moderate">moderate</option>
													<option value="severe">severe</option>
												</select>
												<input
													className="form-input"
													placeholder="Notes"
													value={a.notes || ''}
													onChange={(e) =>
														setHealth((h: any) => ({
															...h,
															allergies: h.allergies.map((x: any, i: number) => (i === idx ? { ...x, notes: e.target.value } : x)),
														}))
													}
												/>
												<button className="btn btn-outline btn-sm" onClick={() => removeAllergy(idx)}>
													Remove
												</button>
											</div>
										))}
									</div>
								</div>
							</>
						)}
					</div>
					<div className="card-footer">
						<button className="btn btn-primary" onClick={saveHealth} disabled={saving}>
							{saving ? 'Saving…' : 'Save health profile'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
