"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function LoginPage() {
	const router = useRouter();
	const { user, login } = useAuth();
	const { register, handleSubmit, formState: { errors }, setError } = useForm({
		defaultValues: { email: '', password: '' }
	});
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (user) router.replace('/');
	}, [user, router]);

	const onSubmit = async (values) => {
		try {
			setSubmitting(true);
			const res = await login(values.email, values.password);
			if (res.success) {
				toast.success('Welcome back!');
				router.replace('/');
			} else {
				const message = res.error || 'Login failed.';
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
			<h1 className="text-2xl font-semibold mb-4">Login</h1>
			<p className="text-gray-600 mb-6">Access your AI Healthcare Assistant account.</p>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<div>
					<label className="form-label" htmlFor="email">Email</label>
					<input
						id="email"
						type="email"
						className="form-input"
						placeholder="you@example.com"
						{...register('email', {
							required: 'Email is required',
							pattern: { value: /[^@\s]+@[^@\s]+\.[^@\s]+/, message: 'Enter a valid email' }
						})}
					/>
					{errors.email && <p className="form-error">{errors.email.message as string}</p>}
				</div>
				<div>
					<label className="form-label" htmlFor="password">Password</label>
					<input
						id="password"
						type="password"
						className="form-input"
						placeholder="••••••••"
						{...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
					/>
					{errors.password && <p className="form-error">{errors.password.message as string}</p>}
				</div>
				{errors.root && <div className="alert alert-error">{errors.root.message as string}</div>}
				<button type="submit" className="btn btn-primary w-full" disabled={submitting}>
					{submitting ? 'Signing in…' : 'Sign in'}
				</button>
			</form>
			<div className="mt-4 text-sm text-gray-600">
				Don\'t have an account? <a href="/register" className="text-primary-600 hover:underline">Create one</a>
			</div>
		</div>
	);
}
