"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api, { endpoints } from "../../../src/services/api";

type ChatMessage = {
	role: "user" | "assistant" | "system";
	content: string;
};

export default function ChatPage() {
	const router = useRouter();
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [booting, setBooting] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);

	const isSendDisabled = useMemo(() => {
		return !sessionId || loading || input.trim().length === 0;
	}, [sessionId, loading, input]);

	useEffect(() => {
		const init = async () => {
			try {
				setBooting(true);
				setError(null);
				const { data } = await api.post(endpoints.chat.start, { category: "general" });
				setSessionId(data?.chat?.sessionId ?? null);
			} catch (e: any) {
				setError("Unable to start chat. You may need to login.");
			} finally {
				setBooting(false);
			}
		};
		init();
	}, []);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const handleSend = async () => {
		if (!sessionId) {
			setError("Chat session not initialized. Please start a new session.");
			return;
		}
		if (input.trim().length === 0) return;
		const userText = input.trim();
		setInput("");
		setLoading(true);
		setError(null);

		setMessages(prev => [...prev, { role: "user", content: userText }]);
		try {
			const { data } = await api.post(endpoints.chat.sendMessage(sessionId), { content: userText });
			const aiText: string = data?.response ?? "";
			setMessages(prev => [...prev, { role: "assistant", content: aiText }]);
		} catch (e: any) {
			const status = e?.response?.status;
			const serverError = e?.response?.data;
			if (status === 404) {
				try {
					const { data: startData } = await api.post(endpoints.chat.start, { category: "general" });
					const newSession = startData?.chat?.sessionId;
					if (newSession) {
						setSessionId(newSession);
						const { data: retryData } = await api.post(endpoints.chat.sendMessage(newSession), { content: userText });
						const retryAi: string = retryData?.response ?? "";
						setMessages(prev => [...prev, { role: "assistant", content: retryAi }]);
						return;
					}
				} catch (retryErr: any) {
					const retryServerError = retryErr?.response?.data;
					const retryDetails = Array.isArray(retryServerError?.errors)
						? retryServerError.errors.map((er: any) => er.msg || er.message).join("; ")
						: retryServerError?.error || retryServerError?.message;
					setError("Reconnected failed. Please try again.");
					return;
				}
			}
			if (status === 429) {
				setError("You are sending messages too quickly. Please wait a few seconds.");
				return;
			}
			setError("Failed to send message. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const onKeyDown = (e: any) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (!isSendDisabled) handleSend();
		}
	};

	return (
		<div className="container-healthcare py-8">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-3">
					<button className="btn btn-outline" onClick={() => router.back()} aria-label="Go back">Back</button>
					<h1 className="text-2xl font-semibold">AI Health Chat</h1>
				</div>
				<button
					className="rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50"
					onClick={async () => {
						setMessages([]);
						setError(null);
						setBooting(true);
						try {
							const { data } = await api.post(endpoints.chat.start, { category: "general" });
							setSessionId(data?.chat?.sessionId ?? null);
						} catch (e) {
							setError("Unable to start a new session.");
						} finally {
							setBooting(false);
						}
					}}
				>
					New chat
				</button>
			</div>
			<p className="text-gray-600 mb-6">Ask questions and get AI guidance.</p>

			{error && (
				<div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
					{error} {error.includes("logged in") && (
						<a href="/login" className="underline">Login</a>
					)}
				</div>
			)}

			<div className="flex h-[65vh] flex-col rounded-lg border border-gray-200">
				<div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
					{booting && (
						<div className="text-sm text-gray-500">Initializing chat...</div>
					)}
					{!booting && messages.length === 0 && (
						<div className="space-y-3">
							<div className="text-sm text-gray-500">Start by typing your question below.</div>
							{!sessionId && (
								<button
									onClick={() => {
										setError(null);
										setBooting(true);
										(async () => {
											try {
												const { data } = await api.post(endpoints.chat.start, { category: "general" });
												setSessionId(data?.chat?.sessionId ?? null);
											} catch (e: any) {
												setError(e?.response?.data?.error || "Failed to start chat session");
											} finally {
												setBooting(false);
											}
										})();
									}}
									className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
								>
									Start new session
								</button>
							)}
						</div>
					)}
					{messages.map((m, idx) => (
						<div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
							<div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm ${m.role === "user" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-900"}`}>
								{m.content}
							</div>
						</div>
					))}
				</div>

				<div className="border-t border-gray-200 bg-gray-50 p-3">
					<div className="flex items-end gap-2">
						<textarea
							className="flex-1 resize-none rounded-md border border-gray-300 bg-white p-2 text-sm focus:border-primary-600 focus:outline-none"
							rows={2}
							value={input}
							onChange={e => setInput(e.target.value)}
							onKeyDown={onKeyDown}
							placeholder={sessionId ? "Type your message..." : "Starting session..."}
							disabled={!sessionId || loading}
						/>
						<button
							onClick={handleSend}
							disabled={isSendDisabled}
							className={`rounded-md px-4 py-2 text-sm font-medium text-white ${isSendDisabled ? "bg-gray-400" : "bg-primary-600 hover:bg-primary-700"}`}
						>
							{loading ? "Sending..." : "Send"}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}


