import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, User, Sparkles, Loader2, MinusSquare } from 'lucide-react';
import { axiosInstance } from '../api/axios';
import ReactMarkdown from 'react-markdown';

export const AiAssistantWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Hi there! I am your STOI Milk AI Assistant. You can ask me questions about your business, like "Who has a wallet balance below 100?" or "What are today\'s order stats?".' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [historyInfo, setHistoryInfo] = useState([]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setIsLoading(true);

        try {
            const res = await axiosInstance.post(
                '/api/ai/chat', 
                { 
                    message: userText,
                    history: historyInfo
                }
            );

            if (res.data.success) {
                const aiResponse = res.data.result;
                setMessages(prev => [...prev, { role: 'model', text: aiResponse }]);
                
                setHistoryInfo(prev => [
                    ...prev, 
                    { role: 'user', parts: [{ text: userText }] },
                    { role: 'model', parts: [{ text: aiResponse }] }
                ]);
            } else {
                setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
            }
        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: `Sorry, there was a problem connecting to the AI brain. (${error.response?.data?.message || error.message})` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            {/* Widget Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group"
                >
                    <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                    <Sparkles size={24} className="animate-pulse" />
                </button>
            )}

            {/* Chat Pan */}
            {isOpen && (
                <div className="w-[380px] h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 transform transition-all duration-300 origin-bottom-right scale-100 opacity-100">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white shadow-sm shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Bot size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-wide">STOI AI Assistant</h3>
                                <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 block animate-pulse"></span>
                                    Online (Gemini 2.5)
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setMessages([{ role: 'model', text: 'Chat cleared. How can I help?' }])} className="p-1 hover:bg-white/20 rounded-md transition-colors" title="Clear Chat">
                                <MinusSquare size={16} />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-md transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} max-w-full`}>
                                <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                                        {msg.role === 'user' ? <User size={12} /> : <Sparkles size={12} />}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-700 shadow-sm rounded-tl-none prose prose-sm max-w-none prose-p:leading-snug prose-headings:mb-2 prose-p:mb-2 last:prose-p:mb-0'}`}>
                                        {msg.role === 'model' ? (
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        ) : (
                                            msg.text
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {isLoading && (
                            <div className="flex justify-start max-w-full">
                                <div className="flex gap-2 max-w-[80%] flex-row">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 bg-purple-100 text-purple-600">
                                        <Bot size={12} />
                                    </div>
                                    <div className="p-3 rounded-2xl text-sm bg-white border border-gray-100 text-gray-700 shadow-sm rounded-tl-none flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin text-purple-500" />
                                        <span className="text-xs text-gray-500">Searching database...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                        <form onSubmit={handleSend} className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about customers, sales..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-gray-700"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={14} className="ml-0.5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
