'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ArrowLeft, User, Mail, MapPin, Phone, Hash, Lock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '', email: '', address: '', contact_no: '', meter_no: '', password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://127.0.0.1:5050/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Registration failed`);
            setSuccess(true);
            setTimeout(() => router.push('/'), 1800);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not connect to backend.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[0%] left-[-10%] w-[600px] h-[600px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)' }} />

            <div className="relative z-10 w-full max-w-xl glass-intense rounded-2xl overflow-hidden shadow-2xl animate-fadeIn p-8 lg:p-12 border border-white/5"
                 style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}>

                <Link href="/" className="inline-flex items-center text-slate-500 hover:text-blue-400 font-medium text-sm transition-all duration-300 transform hover:-translate-x-1 mb-8">
                    <ArrowLeft size={16} className="mr-1.5" /> Back to Login
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center p-2"
                        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(99,162,255,0.2)' }}>
                        <Zap size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
                        <p className="text-xs text-slate-400 mt-1">Join SmartGrid+ to manage your energy</p>
                    </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    {/* Error & Success Banners */}
                    {error && (
                        <div className="p-3.5 rounded-xl text-sm flex items-center gap-2.5 animate-fadeIn"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}>
                            <span className="text-red-400 flex-shrink-0">⚠</span> {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-4 rounded-xl text-sm flex items-center gap-3 animate-fadeIn"
                            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
                            <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
                            <div>
                                <strong className="block mb-0.5 text-green-300">Account created successfully!</strong>
                                Default bills are being generated. Redirecting...
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative md:col-span-2 delay-100 animate-fadeInLeft" style={{ opacity: 0 }}>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                            <User size={16} className="absolute left-3.5 top-[2.1rem] text-slate-500 pointer-events-none" />
                            <input type="text" name="name" placeholder="John Doe" onChange={handleChange} className="input-glass" required disabled={success} />
                        </div>
                        
                        <div className="relative md:col-span-2 delay-200 animate-fadeInLeft" style={{ opacity: 0 }}>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                            <Mail size={16} className="absolute left-3.5 top-[2.1rem] text-slate-500 pointer-events-none" />
                            <input type="email" name="email" placeholder="john@example.com" onChange={handleChange} className="input-glass" required disabled={success} />
                        </div>

                        <div className="relative delay-300 animate-fadeInLeft" style={{ opacity: 0 }}>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Phone Number</label>
                            <Phone size={16} className="absolute left-3.5 top-[2.1rem] text-slate-500 pointer-events-none" />
                            <input type="text" name="contact_no" placeholder="+1 234 567 890" onChange={handleChange} className="input-glass" required disabled={success} />
                        </div>

                        <div className="relative delay-400 animate-fadeInRight" style={{ opacity: 0 }}>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Meter No.</label>
                            <Hash size={16} className="absolute left-3.5 top-[2.1rem] text-slate-500 pointer-events-none" />
                            <input type="text" name="meter_no" placeholder="e.g. 5001" onChange={handleChange} className="input-glass" required disabled={success} />
                        </div>

                        <div className="relative md:col-span-2 delay-500 animate-fadeInLeft" style={{ opacity: 0 }}>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Billing Address</label>
                            <MapPin size={16} className="absolute left-3.5 top-[2.1rem] text-slate-500 pointer-events-none" />
                            <input type="text" name="address" placeholder="123 Energy St, City" onChange={handleChange} className="input-glass" required disabled={success} />
                        </div>
                        
                        <div className="relative md:col-span-2 delay-500 animate-fadeInRight" style={{ opacity: 0 }}>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                            <Lock size={16} className="absolute left-3.5 top-[2.1rem] text-slate-500 pointer-events-none" />
                            <input type="password" name="password" placeholder="Create a strong password" onChange={handleChange} className="input-glass" required disabled={success} />
                        </div>
                    </div>

                    <div style={{ animationDelay: '0.6s', animationFillMode: 'both' }} className="pt-4 animate-fadeIn">
                        <button type="submit" disabled={loading || success} className="btn-primary w-full py-3.5 text-base">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Creating account...
                                </span>
                            ) : success ? (
                                'Success!'
                            ) : (
                                'Complete Registration'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
