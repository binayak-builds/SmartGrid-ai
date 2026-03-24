'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Lock, Hash, ArrowRight, Eye, EyeOff, Activity, Shield, TrendingUp, Cpu } from 'lucide-react';
import Link from 'next/link';

const features = [
    { icon: <Activity size={16} />, title: 'Real-time Monitoring', desc: 'Live usage tracking & anomaly detection', color: 'blue' },
    { icon: <Cpu size={16} />,      title: 'AI Predictions',       desc: 'Forecast usage & reduce energy costs',   color: 'purple' },
    { icon: <Shield size={16} />,   title: 'Smart Billing',         desc: 'Automated bills with penalty control',   color: 'cyan' },
    { icon: <TrendingUp size={16}/>, title: 'Eco Insights',         desc: 'Green energy tips & savings analytics', color: 'green' },
];
const colorMap: Record<string, string> = {
    blue: 'rgba(59,130,246,0.15)', purple: 'rgba(139,92,246,0.15)',
    cyan: 'rgba(6,182,212,0.15)',  green: 'rgba(16,185,129,0.15)',
};
const borderMap: Record<string, string> = {
    blue: 'rgba(59,130,246,0.3)', purple: 'rgba(139,92,246,0.3)',
    cyan: 'rgba(6,182,212,0.3)',  green: 'rgba(16,185,129,0.3)',
};
const textMap: Record<string, string> = {
    blue: '#60a5fa', purple: '#a78bfa', cyan: '#22d3ee', green: '#34d399'
};

export default function Home() {
    const [meter, setMeter]       = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd]   = useState(false);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5050';
            const res = await fetch(`${API}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meter_no: meter, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            localStorage.setItem('token',    data.token);
            localStorage.setItem('role',     data.role);
            localStorage.setItem('meter_no', data.meter_no);
            localStorage.setItem('name',     data.name);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not connect to server.');
        } finally { setLoading(false); }
    };

    return (
        <main className="min-h-screen bg-animated flex items-center justify-center p-4 relative overflow-hidden">
            <div className="grid-overlay" />

            {/* Ambient glow orbs */}
            <div className="absolute top-[-20%] left-[-15%] w-[700px] h-[700px] rounded-full animate-float pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 65%)', animationDuration: '12s' }} />
            <div className="absolute bottom-[-25%] right-[-15%] w-[600px] h-[600px] rounded-full animate-float pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)', animationDuration: '15s', animationDelay: '3s' }} />
            <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] rounded-full animate-float pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 65%)', animationDuration: '18s', animationDelay: '6s' }} />

            <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row glass-intense rounded-3xl overflow-hidden animate-scaleIn"
                 style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,162,255,0.15)' }}>

                {/* LEFT PANEL */}
                <div className="lg:w-1/2 p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden"
                    style={{ background: 'linear-gradient(145deg, rgba(10,25,80,0.95) 0%, rgba(20,10,60,0.95) 100%)' }}>
                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />

                    {/* Orbital rings */}
                    <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-blue-500/15 animate-spin-slow pointer-events-none" />
                    <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full border border-purple-500/10 animate-spin-slow pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '14s' }} />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 0 30px rgba(59,130,246,0.6), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                                <Zap size={24} className="text-white" fill="currentColor" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold text-white tracking-tight">SmartGrid<span className="text-grad-cosmic">+</span></h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="neon-dot neon-dot-green" style={{ width: '6px', height: '6px' }} />
                                    <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Energy Intelligence Platform</p>
                                </div>
                            </div>
                        </div>

                        <h2 className="text-3xl lg:text-4xl font-bold text-white mt-10 mb-3 leading-tight">
                            Intelligent<br />
                            <span className="text-grad-cosmic">Energy Management</span>
                        </h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-10">
                            AI-powered electricity billing — monitor real-time consumption, predict usage, and automate smart payments with precision.
                        </p>

                        <div className="space-y-3">
                            {features.map((f, i) => (
                                <div key={i} className="flex items-center gap-3 animate-fadeInLeft"
                                    style={{ animationDelay: `${i * 0.1 + 0.2}s`, opacity: 0 }}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: colorMap[f.color], border: `1px solid ${borderMap[f.color]}` }}>
                                        <span style={{ color: textMap[f.color] }}>{f.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-200">{f.title}</p>
                                        <p className="text-xs text-slate-500">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-10 relative z-10 p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="neon-dot neon-dot-green" />
                        <span className="text-xs text-slate-400">All systems operational · <span className="text-green-400 font-semibold">99.9% uptime</span></span>
                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="lg:w-1/2 p-10 lg:p-14 flex flex-col justify-center" style={{ background: 'rgba(2,6,18,0.6)' }}>
                    <div className="mb-8 animate-fadeInRight" style={{ animationDelay: '0.15s', opacity: 0 }}>
                        <h3 className="text-2xl font-bold text-white mb-1">Welcome back</h3>
                        <p className="text-slate-500 text-sm">Authenticate to access your command center</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="p-3.5 rounded-xl text-sm flex items-center gap-2.5 animate-scaleIn"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', boxShadow: '0 0 20px rgba(239,68,68,0.1)' }}>
                                <span className="text-red-400 flex-shrink-0 font-bold">⚠</span> {error}
                            </div>
                        )}
                        <div className="animate-fadeInRight" style={{ animationDelay: '0.2s', opacity: 0 }}>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Meter Number</label>
                            <div className="relative">
                                <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500/60 pointer-events-none" />
                                <input id="meter_no" type="text" placeholder="e.g. MTR-2290" value={meter}
                                    onChange={e => setMeter(e.target.value)} className="input-glass" required />
                            </div>
                        </div>
                        <div className="animate-fadeInRight" style={{ animationDelay: '0.28s', opacity: 0 }}>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500/60 pointer-events-none" />
                                <input id="password" type={showPwd ? 'text' : 'password'} placeholder="Enter your secure password"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    className="input-glass" style={{ paddingRight: '3rem' }} required />
                                <button type="button" onClick={() => setShowPwd(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>
                        <div className="pt-2 animate-fadeInRight" style={{ animationDelay: '0.36s', opacity: 0 }}>
                            <button type="submit" disabled={loading} id="login-btn" className="btn-primary w-full py-4 text-base ripple">
                                {loading ? (
                                    <span className="flex items-center gap-2.5">
                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Authenticating...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">Secure Login <ArrowRight size={17} /></span>
                                )}
                            </button>
                        </div>
                    </form>

                    <p className="mt-8 text-center text-slate-600 text-sm animate-fadeIn" style={{ animationDelay: '0.45s', opacity: 0 }}>
                        New to SmartGrid+?{' '}
                        <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                            Create account →
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
