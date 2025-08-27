"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function RegisterPage() {
	const router = useRouter();
	const { user, register: registerUser } = useAuth();
	const { register, handleSubmit, formState: { errors }, setError } = useForm({
		defaultValues: {
			email: '',
			password: '',
			firstName: '',
			lastName: '',
			dateOfBirth: '',
			gender: 'other',
			phoneNumber: ''
		}
	});
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (user) router.replace('/');
	}, [user, router]);

	const onSubmit = async (values) => {
		try {
			setSubmitting(true);
			const res = await registerUser({
				email: values.email,
				password: values.password,
				firstName: values.firstName,
				lastName: values.lastName,
				dateOfBirth: values.dateOfBirth,
				gender: values.gender,
				phoneNumber: values.phoneNumber || undefined,
			});
			if (res.success) {
				toast.success('Account created!');
				router.replace('/');
			} else {
				const message = res.error || 'Registration failed.';
				setError('root', { message });
				toast.error(message);
			}
		} catch (e) {
			toast.error('Unexpected error. Please try again.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div>
			<h1 className="text-2xl font-semibold mb-4">Create account</h1>
			<p className="text-gray-600 mb-6">Sign up to start using the AI Healthcare Assistant.</p>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="form-label" htmlFor="firstName">First name</label>
						<input id="firstName" className="form-input" placeholder="Jane" {...register('firstName', { required: 'First name is required' })} />
						{errors.firstName && <p className="form-error">{errors.firstName.message as string}</p>}
					</div>
					<div>
						<label className="form-label" htmlFor="lastName">Last name</label>
						<input id="lastName" className="form-input" placeholder="Doe" {...register('lastName', { required: 'Last name is required' })} />
						{errors.lastName && <p className="form-error">{errors.lastName.message as string}</p>}
					</div>
				</div>

				<div>
					<label className="form-label" htmlFor="email">Email</label>
					<input id="email" type="email" className="form-input" placeholder="you@example.com" {...register('email', { required: 'Email is required', pattern: { value: /[^@\s]+@[^@\s]+\.[^@\s]+/, message: 'Enter a valid email' } })} />
					{errors.email && <p className="form-error">{errors.email.message as string}</p>}
				</div>

				<div>
					<label className="form-label" htmlFor="password">Password</label>
					<input id="password" type="password" className="form-input" placeholder="••••••••" {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })} />
					{errors.password && <p className="form-error">{errors.password.message as string}</p>}
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="form-label" htmlFor="dateOfBirth">Date of birth</label>
						<input id="dateOfBirth" type="date" className="form-input" {...register('dateOfBirth', { required: 'Date of birth is required' })} />
						{errors.dateOfBirth && <p className="form-error">{errors.dateOfBirth.message as string}</p>}
					</div>
					<div>
						<label className="form-label" htmlFor="gender">Gender</label>
						<select id="gender" className="form-input" {...register('gender', { required: 'Gender is required' })}>
							<option value="male">Male</option>
							<option value="female">Female</option>
							<option value="other">Other</option>
							<option value="prefer-not-to-say">Prefer not to say</option>
						</select>
						{errors.gender && <p className="form-error">{errors.gender.message as string}</p>}
					</div>
				</div>

				<div>
					<label className="form-label" htmlFor="phoneNumber">Phone number (optional)</label>
					<input id="phoneNumber" className="form-input" placeholder="+1 555 123 4567" {...register('phoneNumber')} />
				</div>

				{errors.root && <div className="alert alert-error">{errors.root.message as string}</div>}
				<button type="submit" className="btn btn-primary w-full" disabled={submitting}>
					{submitting ? 'Creating account…' : 'Create account'}
				</button>
			</form>
			<div className="mt-4 text-sm text-gray-600">
				Already have an account? <a href="/login" className="text-primary-600 hover:underline">Sign in</a>
			</div>
		</div>
	);
}
