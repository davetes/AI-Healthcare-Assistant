import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../src/contexts/AuthContext';

export const metadata = {
	title: 'AI Healthcare Assistant',
	description: 'Monitor health, check symptoms, chat with AI, manage appointments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className="bg-gray-50 text-gray-900">
				<AuthProvider>
					<Toaster position="top-right" />
					{children}
				</AuthProvider>
			</body>
		</html>
	);
}








