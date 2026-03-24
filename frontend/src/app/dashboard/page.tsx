'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard, FileText, LogOut, Zap, DownloadCloud, Activity,
    CheckCircle, AlertTriangle, Bell, X, TrendingUp, TrendingDown,
    DollarSign, Cpu, Users, BarChart2, Shield, Filter, Search, Eye,
    CreditCard, Clock, ShieldCheck
} from 'lucide-react';
import Chart from '@/components/Chart';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5050';

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface Bill {
    bill_id: number;
    meter_no: string;
    month: string;
    year: number;
    units: number;
    amount: number;
    tax_amount: number;
    penalty_amount: number;
    total_amount: number;
    remaining_amount: number;
    amount_paid: number;
    status: string;
}

interface User {
    name: string | null;
    meter_no: string | null;
}

interface AiData {
    predicted_units: number;
    anomaly_detected: boolean;
    alert: string;
    suggestion: string;
}

interface Outstanding {
    unpaid_months: number;
    total_due: number;
    total_penalty: number;
}

interface Customer {
    name: string;
    meter_no: string;
    email: string;
    contact_no: string;
    address: string;
    meter_info?: {
        meter_type: string;
        bill_type: string;
    };
}

interface OutstandingWithMeter extends Outstanding {
    meter_no: string;
}

// ─── Bill Status Helper ─────────────────────────────────────────────────────
function getBillStatus(bill: Bill, unpaidCount: number) {
    if (bill.status === 'PAID') return { label: 'Paid', class: 'badge badge-paid', icon: <CheckCircle size={12} /> };
    if (bill.status === 'PARTIAL') return { label: 'Partial', class: 'badge badge-partial', icon: <CreditCard size={12} /> };
    if (bill.penalty_amount > 0) return { label: 'Penalized', class: 'badge badge-penalty', icon: <Shield size={12} /> };
    if (unpaidCount > 3) return { label: 'Overdue', class: 'badge badge-overdue', icon: <AlertTriangle size={12} /> };
    return { label: 'Unpaid', class: 'badge badge-unpaid', icon: <AlertTriangle size={12} /> };
}

// ─── Bill Detail Modal (Digital Receipt Experience) ──────────────────────────
function BillModal({ bill, onClose, onPay, onPayPartial }: {
    bill: Bill; onClose: () => void;
    onPay: (id: number) => void;
    onPayPartial: (id: number, amount: number) => void;
}) {
    const [partialAmt, setPartialAmt] = useState('');
    const [partialErr, setPartialErr] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const isFullyPaid = bill.status === 'PAID';
    
    // Safety Fallback: For older bills that don't have remaining_amount backfilled
    const rawRemaining = (bill.remaining_amount === 0 && !isFullyPaid) ? bill.total_amount : (bill.remaining_amount ?? bill.total_amount);
    const remaining = parseFloat(rawRemaining.toFixed(2));
    const amountPaid = parseFloat((bill.amount_paid ?? 0).toFixed(2));
    const progressPct = bill.total_amount > 0 ? Math.min(100, (amountPaid / bill.total_amount) * 100) : 0;

    const handlePartialPay = () => {
        const amt = parseFloat(partialAmt);
        if (isNaN(amt) || amt <= 0) { setPartialErr('Enter a valid payment amount.'); return; }
        if (amt > remaining + 0.01) { setPartialErr(`Max payable: ₹${remaining.toFixed(2)}`); return; }
        setPartialErr('');
        setIsProcessing(true);
        onPayPartial(bill.bill_id, amt);
    };
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fadeIn">
            <div className="glass-intense w-full max-w-lg animate-scaleIn overflow-hidden p-0 rounded-3xl" style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,162,255,0.15)' }}>
                {/* Receipt Header */}
                <div className="p-8 pb-6 border-b border-dashed border-white/10 relative">
                    {/* Decorative notches */}
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-slate-950 z-10" />
                    <div className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-slate-950 z-10" />
                    
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-lg grad-primary flex items-center justify-center shadow-lg"><Zap size={16} /></div>
                                <h3 className="font-black text-white tracking-widest text-sm uppercase">Invoice Receipt</h3>
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono tracking-widest">TRANSACTION ID: SG-{bill.bill_id}-{bill.year}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-500 hover:text-white"><X size={20} /></button>
                    </div>

                    <div className="mt-8 flex justify-between items-end">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Billing Period</p>
                            <p className="text-xl font-black text-white">{bill.month} {bill.year}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Status</p>
                            <span className={getBillStatus(bill, 0).class + " px-4 py-1.5 font-black uppercase text-[10px] tracking-wider"}>
                                {bill.status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-8 pt-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scroll">
                    {/* Breakdown Items */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Consumption Analytics</p>
                        {([
                            ['Power Consumed', `${bill.units} kWh`, 'white'],
                            ['Unit Tariff', '₹5.00', 'slate-400'],
                            ['Net Amount', `₹${bill.amount.toFixed(2)}`, 'slate-400'],
                            ['Energy Tax (18%)', `₹${bill.tax_amount.toFixed(2)}`, 'slate-400'],
                            ['Late Surcharge', `₹${bill.penalty_amount.toFixed(2)}`, bill.penalty_amount > 0 ? 'red-400' : 'slate-600'],
                        ] as [string, string, string][]).map(([label, val, color]) => (
                            <div key={label} className="flex justify-between items-center group">
                                <span className="text-xs text-slate-500 font-medium group-hover:text-slate-400 transition-colors">{label}</span>
                                <span className={`text-xs font-bold text-${color} tracking-wide`}>{val}</span>
                            </div>
                        ))}
                    </div>

                    {/* Total Section */}
                    <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-blue-400/70 uppercase tracking-widest">Outstanding Balance</p>
                                <p className="text-3xl font-black text-white mt-1">₹{remaining.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isFullyPaid ? 'Invoice Settled' : 'Payment Due'}</p>
                                <p className="text-[10px] text-emerald-400 font-bold mt-1 tracking-tighter flex items-center gap-1 justify-end uppercase">
                                    <Shield size={10} /> Secure Portal
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Status Progress */}
                    {(amountPaid > 0 || isFullyPaid) && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Cycle Progress</p>
                                <p className="text-xs font-black text-emerald-400">{progressPct.toFixed(0)}% Settled</p>
                            </div>
                            <div className="progress-track h-2 bg-slate-900 border border-white/5">
                                <div className="progress-fill grad-success shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ width: `${progressPct}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold tracking-tight">
                                <span className="text-slate-400 italic">Total Paid: <span className="text-emerald-400 font-black">₹{amountPaid.toFixed(2)}</span></span>
                                <span className="text-slate-400 italic">Outstanding: <span className="text-red-400 font-black">₹{remaining.toFixed(2)}</span></span>
                            </div>
                        </div>
                    )}

                    {/* Payment Input Area */}
                    {!isFullyPaid && (
                        <div className="space-y-4 pt-2">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Settlement Portal</p>
                             <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">₹</span>
                                    <input
                                        type="number" value={partialAmt}
                                        onChange={e => { setPartialAmt(e.target.value); setPartialErr(''); }}
                                        placeholder={`Enter amount (Max ₹${remaining.toFixed(0)})`}
                                        className="input-glass w-full pl-8 py-3.5 bg-slate-950/50 border-white/5"
                                    />
                                </div>
                                <button onClick={() => setPartialAmt(remaining.toFixed(2))} className="btn-ghost text-[10px] px-3 font-black uppercase text-blue-400">Fixed-All</button>
                             </div>
                             {partialErr && <p className="text-red-400 text-[10px] font-bold animate-bounce pl-1">⚠ {partialErr}</p>}
                             <div className="flex justify-between items-center text-[10px]">
                                <p className="text-slate-500 italic">Suggested Installment: <span className="text-amber-400 font-black">₹{(remaining * 0.25).toFixed(2)} (25%)</span></p>
                                <div className="flex gap-2">
                                    <button onClick={() => setPartialAmt((remaining * 0.5).toFixed(2))} className="text-slate-500 hover:text-white transition-colors underline font-bold">50%</button>
                                    <button onClick={() => setPartialAmt((remaining * 0.25).toFixed(2))} className="text-slate-500 hover:text-white transition-colors underline font-bold">25%</button>
                                </div>
                             </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-8 pt-2">
                    {isFullyPaid ? (
                        <div className="w-full py-4 glass-intense border-emerald-500/20 text-emerald-400 font-black text-sm tracking-[0.2em] flex items-center justify-center gap-2 animate-pulse">
                            <CheckCircle size={18} /> INVOICE SETTLED
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={handlePartialPay} 
                                disabled={isProcessing}
                                className="btn-ghost py-4 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-500/10 hover:text-blue-400 flex items-center justify-center gap-2 group"
                            >
                                <div className={isProcessing ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}>
                                    <CreditCard size={15} />
                                </div>
                                {isProcessing ? 'Processing' : 'Installment'}
                            </button>
                            <button 
                                onClick={async () => { 
                                    const confirmed = confirm('Authenticate payment securely?');
                                    if (confirmed) {
                                        setIsProcessing(true); 
                                        await onPay(bill.bill_id); 
                                    }
                                }} 
                                disabled={isProcessing}
                                className="btn-primary py-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-blue-500/40"
                            >
                                <Zap size={15} className={isProcessing ? 'animate-pulse' : ''} /> Settle Full
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Notification Overlay (Premium Sliding Drawer) ──────────────────────────
function NotifPanel({ bills, onClose }: { bills: Bill[]; onClose: () => void }) {
    const unpaid = bills.filter(b => b.status === 'UNPAID' || b.status === 'OVERDUE');
    const penalized = bills.filter(b => b.penalty_amount > 0);
    const partial = bills.filter(b => b.status === 'PARTIAL');
    
    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
            <div className="relative w-full max-w-sm glass-intense h-full shadow-2xl animate-fadeInRight flex flex-col border-l border-white/10" style={{ borderRadius: 0 }}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Bell size={20} className="text-blue-400 icon-glow-blue" /> Notifications
                        </h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">System Intelligence Status</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Alerts Section */}
                    {penalized.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Priority Alerts</p>
                            {penalized.map(b => (
                                <div key={b.bill_id} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                                    <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-red-100">Penalty Applied</p>
                                        <p className="text-xs text-red-300 opacity-80 leading-relaxed">{b.month} {b.year} invoice reflects a 10% late fee (₹{b.penalty_amount.toFixed(2)}).</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Billing Updates */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Billing & Payments</p>
                        {unpaid.map(b => (
                            <div key={b.bill_id} className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                                <DollarSign size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                <div className="space-y-1 flex-1">
                                    <p className="text-xs font-bold text-amber-100">Outstanding: {b.month} {b.year}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-[10px] text-amber-300 opacity-80">Due: ₹{b.total_amount.toFixed(2)}</p>
                                        <span className="text-[9px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-400 font-bold uppercase tracking-tighter border border-amber-500/30">Action Required</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {partial.length > 0 && (
                             <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                <CreditCard size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-blue-100">Active Installments</p>
                                    <p className="text-xs text-blue-300 opacity-80 leading-relaxed">You have {partial.length} partially paid bills remaining in your active cycle.</p>
                                </div>
                             </div>
                        )}
                        {unpaid.length === 0 && penalized.length === 0 && (
                            <div className="py-20 text-center space-y-4 opacity-50">
                                <div className="w-20 h-20 rounded-full bg-slate-800/40 flex items-center justify-center mx-auto border border-white/5"><CheckCircle size={32} className="text-emerald-500" /></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-300">System Balanced</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-1">No pending notifications</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AI Suggestions (Placeholder for extra premium feel) */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Engine Insights</p>
                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex gap-3">
                            <Cpu size={18} className="text-purple-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-purple-100">Optimizer Active</p>
                                <p className="text-[10px] text-purple-300 opacity-80 leading-relaxed">System is analyzing usage patterns for potential savings recommendations.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-white/5 bg-white/5">
                    <button onClick={onClose} className="btn-primary w-full shadow-lg shadow-blue-500/25 py-3.5">
                        Acknowledge All
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [bills, setBills] = useState<Bill[]>([]);
    const [aiData, setAiData] = useState<AiData | null>(null);
    const [outstanding, setOutstanding] = useState<Outstanding | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [adminOutstanding, setAdminOutstanding] = useState<OutstandingWithMeter[]>([]);
    const [loading, setLoading] = useState(true);
    const [backendError, setBackendError] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [currentView, setCurrentView] = useState('DASHBOARD');
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [showNotif, setShowNotif] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterMonth] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [adminSimUnits, setAdminSimUnits] = useState<Record<string, number>>({});
    const [payingAll, setPayingAll] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const r = localStorage.getItem('role');
        const meter_no = localStorage.getItem('meter_no');
        if (!token) { router.push('/'); return; }
        setRole(r);
        setUser({ name: localStorage.getItem('name'), meter_no });

        const headers = { 'Authorization': `Bearer ${token}` };
        const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };

        (async () => {
            try {
                const health = await fetch(`${API}/api/health`).catch(() => null);
                if (!health || !health.ok) { setBackendError(true); return; }

                if (r === 'USER') {
                    const billRes = await fetch(`${API}/api/bills/${meter_no}`, { headers });
                    const bData = await billRes.json();
                    let cUsage = 120, hUsage = 100;
                    if (Array.isArray(bData)) {
                        setBills(bData);
                        if (bData.length > 0) {
                            cUsage = bData[0].units || 120;
                            hUsage = bData.length > 1 ? (bData.reduce((sum: number, b: Bill) => sum + b.units, 0) - cUsage) / (bData.length - 1) : cUsage;
                        }
                    }
                    
                    const [aiRes, outRes] = await Promise.all([
                        fetch(`${API}/api/bills/predict`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ meter_no, current_usage: cUsage, historical_usage: hUsage }) }),
                        fetch(`${API}/api/bills/my/outstanding`, { headers })
                    ]);
                    
                    const aData = await aiRes.json();
                    setAiData(aData);
                    const oData = await outRes.json();
                    if (!oData.error) setOutstanding(oData);
                } else if (r === 'ADMIN') {
                    const [custRes, outRes] = await Promise.all([
                        fetch(`${API}/api/customers`, { headers }),
                        fetch(`${API}/api/bills/admin/outstanding`, { headers })
                    ]);
                    const cData = await custRes.json();
                    if (Array.isArray(cData)) setCustomers(cData);
                    const oData = await outRes.json();
                    if (Array.isArray(oData)) setAdminOutstanding(oData);
                }
            } catch (err) {
                console.error('Dashboard error:', err);
                setBackendError(true);
            } finally { setLoading(false); }
        })();
    }, [router]);

    const handleLogout = () => { localStorage.clear(); router.push('/'); };

    const handleSeedMyData = async () => {
        const meter_no = localStorage.getItem('meter_no');
        if (!meter_no) return;
        setSeeding(true);
        try {
            const res = await fetch(`${API}/api/dev/seed-user`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meter_no }) });
            if (res.ok) window.location.reload();
            else alert(`Seed failed`);
        } catch {
            alert('Could not connect to backend.');
        } finally { setSeeding(false); }
    };

    const handlePay = async (bill_id: number) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API}/api/bills/${bill_id}/pay`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            setSelectedBill(null);
            window.location.reload();
        } catch (err) {
            console.error('Pay error:', err);
            alert('Payment failed. Please try again.');
        }
    };

    const handlePayPartial = async (bill_id: number, amount: number) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/bills/pay-partial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ bill_id: Number(bill_id), amount: Number(amount) })
            });

            // Defensive parse: ensure we actually got JSON (prevents "Unexpected token <")
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                throw new Error(`Server returned invalid response: ${text.substring(0, 50)}...`);
            }

            const data = await res.json();
            if (res.ok) {
                // Success feedback
                alert(data.message || 'Payment successful!');
                setSelectedBill(null);
                window.location.reload();
            } else {
                alert(data.error || 'The system could not process this installment.');
                window.location.reload(); // Reload to sync state just in case
            }
        } catch (err) {
            console.error('Partial pay error:', err);
            const msg = err instanceof Error ? err.message : 'Unknown Network Error';
            alert(`CRITICAL: Connection to financial gateway failed. [${msg}]`);
        }
    };

    const handlePayAll = async () => {
        if (!confirm('Pay all outstanding balance?')) return;
        setPayingAll(true);
        await fetch(`${API}/api/bills/pay-all`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        window.location.reload();
    };

    const handleApplyPenalties = async () => {
        const res = await fetch(`${API}/api/bills/admin/apply-penalties`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const data = await res.json();
        alert(data.message);
        window.location.reload();
    };

    const handleGenerateBill = async (meter_no: string) => {
        const units = adminSimUnits[meter_no] ?? 100;
        const now = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        await fetch(`${API}/api/bills/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ meter_no, units, month: monthNames[now.getMonth()], year: now.getFullYear() })
        });
        alert(`Bill Generated: ${meter_no}`);
    };

    // Computed
    const unpaidBills = bills.filter(b => b.status === 'UNPAID' || b.status === 'PARTIAL' || b.status === 'OVERDUE');
    const paidBills = bills.filter(b => b.status === 'PAID');
    const totalUnits = bills.reduce((s, b) => s + b.units, 0);
    const latestBill = bills[0];
    const notifCount = unpaidBills.length + bills.filter(b => b.penalty_amount > 0).length;

    const sortedBills = [...bills].sort((a, b) => b.units - a.units);
    const highestMonth = sortedBills[0];
    const currentMonthUnits = bills[0]?.units ?? 0;
    const prevMonthUnits = bills[1]?.units ?? currentMonthUnits;
    const usageChangePct = prevMonthUnits > 0 ? ((currentMonthUnits - prevMonthUnits) / prevMonthUnits * 100).toFixed(1) : '0';
    const avgUnits = bills.length > 0 ? totalUnits / bills.length : 0;
    // Eco Score: 100 if avg <= 80, scales down as usage increases
    const ecoScore = Math.max(0, Math.min(100, Math.round(100 - ((avgUnits - 80) / 100) * 60)));

    // Removed unused months array from unique b.month
    const filteredBills = useMemo(() => bills.filter(b => {
        if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
        if (filterMonth !== 'ALL' && b.month !== filterMonth) return false;
        if (searchQuery && !`${b.month} ${b.year}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    }), [bills, filterStatus, filterMonth, searchQuery]);

    const navBtn = (view: string, icon: React.ReactNode, label: string, badge?: number) => (
        <button onClick={() => setCurrentView(view)}
            className={`sidebar-item ${currentView === view ? 'active' : ''}`}>
            {icon}
            <span className="flex-1">{label}</span>
            {badge && badge > 0 ? (
                <span className="bg-red-500/20 border border-red-500/50 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>
            ) : null}
        </button>
    );

    if (loading) return (
        <div className="min-h-screen bg-animated flex flex-col items-center justify-center text-white gap-6">
            <div className="grid-overlay" />
            <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border border-blue-500/20 border-t-blue-400 animate-spin absolute" />
                <div className="w-14 h-14 rounded-full border border-purple-500/15 border-b-purple-400 animate-spin absolute" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                <Zap className="w-8 h-8 text-blue-400 icon-glow-blue animate-pulse" fill="currentColor" />
            </div>
            <div className="text-center">
                <p className="text-white font-semibold mb-1">SmartGrid<span className="text-grad-cosmic">+</span></p>
                <p className="text-slate-500 text-xs font-medium tracking-widest uppercase">Initializing Interface...</p>
            </div>
            <div className="flex gap-1.5">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-animated text-white overflow-hidden">
            <div className="grid-overlay" />
            
            {/* ─── SIDEBAR ─── */}
            <div className="w-64 flex flex-col shadow-2xl z-20 flex-shrink-0 m-4 mb-4 rounded-2xl p-4 mr-0" style={{ background: 'rgba(5,12,30,0.85)', backdropFilter: 'blur(32px)', border: '1px solid rgba(99,162,255,0.1)' }}>
                <div className="flex items-center gap-3 mb-10 px-2 mt-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 0 20px rgba(59,130,246,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                        <Zap size={20} className="text-white" fill="currentColor" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">SmartGrid<span className="text-grad-cosmic">+</span></h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="neon-dot neon-dot-green" style={{ width: '5px', height: '5px' }} />
                            <p className="text-[9px] text-slate-600 font-medium tracking-widest uppercase">Portal v2.0</p>
                        </div>
                    </div>
                </div>
                
                <nav className="flex-1 space-y-2 relative">
                    {/* Active Indicator Line */}
                    <div className="absolute left-[-1rem] w-1 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-md transition-all duration-300" 
                         style={{ 
                             height: '40px', 
                             top: role === 'USER' ? 
                                  (currentView === 'DASHBOARD' ? '0px' : currentView === 'MY_BILLS' ? '52px' : '104px') :
                                  (currentView === 'ADMIN_PANEL' ? '0px' : '52px')
                         }} />
                         
                    {role === 'USER' ? (<>
                        {navBtn('DASHBOARD', <LayoutDashboard size={18} />, 'Dashboard')}
                        {navBtn('MY_BILLS', <FileText size={18} />, 'My Bills', unpaidBills.length)}
                        {navBtn('ANALYTICS', <BarChart2 size={18} />, 'Analytics')}
                    </>) : (<>
                        {navBtn('ADMIN_PANEL', <LayoutDashboard size={18} />, 'Admin Center', adminOutstanding.length)}
                        {navBtn('ADMIN_CUSTOMERS', <Users size={18} />, 'Operations')}
                    </>)}
                </nav>
                
                <div className="pt-4 mt-auto">
                    <div className="glass-intense p-3 rounded-xl mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full grad-blue flex items-center justify-center shadow-lg font-bold text-lg">
                            {user?.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-bold truncate text-slate-200">{user?.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {user?.meter_no}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-ghost w-full justify-center hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30">
                        <LogOut size={16} /> Secure Logout
                    </button>
                </div>
            </div>

            {/* ─── MAIN CONTENT ─── */}
            <div className="flex-1 overflow-y-auto relative p-4 pl-6">
                
                {/* Header */}
                <header className="glass rounded-2xl p-4 px-6 flex justify-between items-center mb-6 sticky top-0 z-30 shadow-md backdrop-blur-3xl animate-fadeInDown">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            {currentView === 'DASHBOARD' && <LayoutDashboard size={20} className="text-blue-400" />}
                            {currentView === 'MY_BILLS' && <FileText size={20} className="text-blue-400" />}
                            {currentView === 'ANALYTICS' && <BarChart2 size={20} className="text-blue-400" />}
                            {currentView === 'ADMIN_PANEL' && <Shield size={20} className="text-purple-400" />}
                            {currentView === 'ADMIN_CUSTOMERS' && <Users size={20} className="text-purple-400" />}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-100">
                                {currentView === 'MY_BILLS' ? 'Billing History' : 
                                 currentView === 'ANALYTICS' ? 'AI Usage Analytics' : 
                                 currentView === 'ADMIN_CUSTOMERS' ? 'System Operations' : 
                                 currentView === 'ADMIN_PANEL' ? 'Command Center' : 
                                 `Overview`}
                            </h1>
                            <p className="text-slate-400 text-xs mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {role === 'USER' && (
                            <div className="relative">
                                <button onClick={() => setShowNotif(v => !v)} className={`relative p-2.5 rounded-xl transition-all border ${showNotif ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800'}`}>
                                    <Bell size={18} />
                                    {notifCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 border-2 border-slate-900 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">{notifCount}</span>}
                                </button>
                                {showNotif && <NotifPanel bills={bills} onClose={() => setShowNotif(false)} />}
                            </div>
                        )}
                        <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 border-green-500/20 bg-green-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                            <span className="neon-dot neon-dot-green"></span>
                            <span className="text-xs font-bold text-green-400 tracking-wide uppercase">System Online</span>
                        </div>
                    </div>
                </header>

                <div className="max-w-7xl mx-auto space-y-6 pb-20">

                    {backendError && (
                        <div className="glass p-5 rounded-2xl bg-red-900/10 border-red-500/30 flex justify-between items-center animate-fadeInLeft">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                                    <AlertTriangle size={24} className="text-red-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-red-400 mb-1">Connection Lost</h3>
                                    <p className="text-slate-300 text-sm">Cannot reach central servers. Ensure backend is running.</p>
                                </div>
                            </div>
                            <button onClick={() => window.location.reload()} className="btn-danger"><Zap size={16}/> Reconnect</button>
                        </div>
                    )}

                    {/* ═══ USER DASHBOARD ═══════════════════════════════════════════════════ */}
                    {role === 'USER' && currentView === 'DASHBOARD' && (
                        <div className="space-y-6">

                            {/* Alert Banner */}
                            {outstanding && outstanding.unpaid_months > 0 && (
                                <div className={`glass p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 animate-fadeInLeft border 
                                    ${outstanding.unpaid_months > 3 ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'border-orange-500/40 bg-orange-500/5 shadow-[0_0_30px_rgba(245,158,11,0.1)]'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl flex-shrink-0 mt-1 ${outstanding.unpaid_months > 3 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                            <Shield size={24} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-white tracking-wide mb-1">Attention Required</h3>
                                            <p className="text-slate-300 text-sm leading-relaxed">
                                                You have <strong className="text-white">{outstanding.unpaid_months} pending invoices</strong> totaling <strong className="text-white">₹{outstanding.total_due.toFixed(2)}</strong>.
                                                {outstanding.total_penalty > 0 && <span className="text-red-400 ml-2">Includes ₹{outstanding.total_penalty.toFixed(2)} late fee.</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={handlePayAll} disabled={payingAll} className="btn-primary w-full sm:w-auto shadow-lg shadow-blue-500/30 whitespace-nowrap">
                                        {payingAll ? 'Processing Securely...' : 'Resolve Balance Now'}
                                    </button>
                                </div>
                            )}

                            {/* Stat Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="stat-card stat-card-blue animate-fadeInLeft delay-100">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 icon-glow-blue"><Zap size={24} /></div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">30-Day Usage</p>
                                        <div className="flex items-end gap-2">
                                            <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">{latestBill?.units ?? 0}</p>
                                            <span className="text-sm font-medium text-slate-500 pb-1">kWh</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="stat-card stat-card-green animate-fadeInLeft delay-200">
                                    <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 icon-glow-green"><DollarSign size={24} /></div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Latest Invoice</p>
                                        <div className="flex items-end gap-2 text-white font-bold drop-shadow-md">
                                            <span className="text-lg pb-0.5">₹</span><span className="text-3xl">{latestBill ? latestBill.total_amount.toFixed(2) : '0.00'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`stat-card ${(outstanding?.total_due ?? 0) > 0 ? 'stat-card-red' : 'stat-card-purple'} animate-fadeInLeft delay-300`}>
                                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center
                                        ${(outstanding?.total_due ?? 0) > 0 ? 'bg-red-500/20 border-red-500/30 text-red-400 icon-glow-red' : 'bg-purple-500/20 border-purple-500/30 text-purple-400 icon-glow-purple'}`}>
                                        {(outstanding?.total_due ?? 0) > 0 ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Open Balance</p>
                                        <div className={`flex items-end gap-2 font-bold ${(outstanding?.total_due ?? 0) > 0 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-slate-300'}`}>
                                            <span className="text-lg pb-0.5">₹</span><span className="text-3xl">{(outstanding?.total_due ?? 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Eco Score Card */}
                                <div className="stat-card stat-card-green animate-fadeInLeft delay-400">
                                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0
                                        ${ecoScore >= 70 ? 'bg-green-500/20 border-green-500/30 text-green-400 icon-glow-green'
                                          : ecoScore >= 40 ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 icon-glow-yellow'
                                          : 'bg-red-500/20 border-red-500/30 text-red-400 icon-glow-red'}`}>
                                        <TrendingUp size={22} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Eco Score</p>
                                        <div className={`flex items-end gap-1 font-bold ${ecoScore >= 70 ? 'text-green-400' : ecoScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                            <span className="text-3xl">{ecoScore}</span>
                                            <span className="text-sm pb-0.5">/100</span>
                                        </div>
                                        <div className="progress-track mt-2">
                                            <div className="progress-fill" style={{
                                                width: `${ecoScore}%`,
                                                background: ecoScore >= 70 ? 'linear-gradient(90deg, #10b981, #34d399)' : ecoScore >= 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)'
                                            }} />
                                        </div>
                                        <p className="text-[10px] text-slate-600 mt-1">
                                            {ecoScore >= 70 ? 'Eco-friendly usage' : ecoScore >= 40 ? 'Moderate consumption' : 'High consumption'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Core AI Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn delay-400">
                                <div className="glass-intense rounded-2xl p-7 relative overflow-hidden group shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-700" />
                                    
                                    <div className="flex items-center justify-between mb-8 relative z-10">
                                        <h3 className="font-bold flex items-center gap-2 text-lg">
                                            <Cpu size={20} className="text-blue-400 icon-glow-blue" /> Engine Cortex
                                        </h3>
                                        <div className="flex gap-1"><span className="neon-dot neon-dot-blue"/><span className="neon-dot neon-dot-purple" style={{animationDelay: '0.2s', width: '6px', height: '6px'}}/></div>
                                    </div>

                                    {aiData ? (
                                        <div className="space-y-5 relative z-10">
                                            <div>
                                                <p className="text-xs tracking-wider text-slate-400 uppercase font-semibold mb-2">Predictive Forecast</p>
                                                <div className="flex items-baseline gap-2 pb-4 border-b border-white/10">
                                                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 drop-shadow-sm">{aiData.predicted_units?.toFixed(0)}</span>
                                                    <span className="text-slate-400 font-medium">kWh</span>
                                                </div>
                                            </div>

                                            {aiData.anomaly_detected && (
                                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                                                    <Shield size={18} className="text-red-400 mt-0.5 flex-shrink-0 animate-pulse" />
                                                    <p className="text-xs text-red-200 leading-relaxed font-medium">{aiData.alert}</p>
                                                </div>
                                            )}
                                            
                                            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/5 rounded-xl border-l-2 border-l-blue-500">
                                                <p className="text-xs text-slate-300 leading-relaxed max-w-[90%]">&quot;{aiData.suggestion}&quot;</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-10 opacity-60">
                                            <div className="relative mb-4"><Cpu size={30} className="text-slate-500 animate-pulse"/><div className="absolute inset-0 border-2 border-slate-700 rounded-full w-12 h-12 -translate-x-1.5 -translate-y-1.5 border-t-slate-500 animate-spin-slow"/></div>
                                            <p className="text-xs text-slate-400 font-mono">CALCULATING ALGORITHMS...</p>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="lg:col-span-2 glass rounded-2xl p-6 border-white/5 h-[400px] flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
                                     <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                                    
                                    <div className="flex justify-between items-center mb-6 relative z-10">
                                        <h3 className="font-bold flex items-center gap-2"><Activity size={18} className="text-cyan-400" /> Consumption Telemetry</h3>
                                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-slate-300">Live Model</div>
                                    </div>
                                    <div className="flex-1 min-h-0 relative z-10"><Chart data={bills} /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ MY BILLS VIEW ════════════════════════════════════════════════════════ */}
                    {role === 'USER' && currentView === 'MY_BILLS' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Toolbar */}
                            <div className="glass p-4 rounded-xl flex flex-wrap gap-4 items-center shadow-lg border-white/5">
                                <div className="relative flex-1 min-w-[250px]">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
                                        placeholder="Search by invoice month..." 
                                        className="w-full bg-slate-900/50 border border-white/10 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium placeholder:text-slate-600" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-slate-900/50 border border-white/10 rounded-lg pr-1 overflow-hidden">
                                        <div className="pl-3 pr-2 py-2.5 bg-white/5 text-slate-400 border-r border-white/10"><Filter size={14}/></div>
                                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-transparent text-sm py-2 px-2 text-white outline-none cursor-pointer">
                                            <option value="ALL" className="bg-slate-900">All Status</option>
                                            <option value="PAID" className="bg-slate-900">Paid Invoices</option>
                                            <option value="UNPAID" className="bg-slate-900">Outstanding</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="glass rounded-2xl overflow-hidden border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] relative">
                                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                                <table className="sg-table">
                                    <thead className="bg-white/5 backdrop-blur-md">
                                        <tr>
                                            {['Period', 'Usage', 'Breakdown', 'Balance', 'Total', 'Status', 'Action'].map(h => (
                                                <th key={h} className="text-[10px] tracking-[0.2em] font-extrabold">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 bg-slate-900/40">
                                        {filteredBills.length === 0 ? (
                                            <tr><td colSpan={8}>
                                                <div className="py-24 flex flex-col items-center justify-center opacity-80">
                                                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-white/5"><FileText size={24} className="text-slate-500"/></div>
                                                    <p className="text-base font-bold text-slate-300 mb-1">No Data Available</p>
                                                    <p className="text-xs text-slate-500 max-w-xs text-center mb-6">Simulation requires historical data to process engine analytics.</p>
                                                    <button onClick={handleSeedMyData} disabled={seeding} className="btn-ghost shadow-lg">
                                                        <DownloadCloud size={16}/> {seeding ? 'Initializing System...' : 'Inject Demo Dataset'}
                                                    </button>
                                                </div>
                                            </td></tr>
                                        ) : filteredBills.map((b, i) => {
                                            const s = getBillStatus(b, unpaidBills.length);
                                            const paidPct = b.total_amount > 0 ? Math.round(((b.amount_paid || 0) / b.total_amount) * 100) : 0;
                                            
                                            return (
                                                <tr key={b.bill_id} className="animate-fadeIn group" style={{ animationDelay: `${i * 0.05}s` }}>
                                                    <td className="font-semibold text-white">
                                                        <div className="flex flex-col">
                                                            <span>{b.month}</span>
                                                            <span className="text-[10px] text-slate-500 font-mono tracking-wider">{b.year}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-blue-400">{b.units} <span className="text-[10px] font-medium text-slate-500">kWh</span></span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col gap-0.5 text-[11px]">
                                                            <div className="flex justify-between w-24"><span className="text-slate-500">Base:</span> <span className="text-slate-300 font-mono">₹{b.amount.toFixed(0)}</span></div>
                                                            <div className="flex justify-between w-24"><span className="text-slate-500">Tax:</span> <span className="text-slate-300 font-mono">₹{b.tax_amount.toFixed(0)}</span></div>
                                                            {b.penalty_amount > 0 && <div className="flex justify-between w-24"><span className="text-red-500/70">Fine:</span> <span className="text-red-400 font-mono">₹{b.penalty_amount.toFixed(0)}</span></div>}
                                                        </div>
                                                    </td>
                                                    <td className="min-w-[140px]">
                                                        <div className="flex flex-col gap-1.5 pt-1">
                                                            <div className="flex justify-between text-[10px] font-bold">
                                                                <span className="text-emerald-400">₹{b.amount_paid?.toFixed(0) || 0}</span>
                                                                <span className="text-slate-500">₹{b.remaining_amount?.toFixed(0) || b.total_amount.toFixed(0)}</span>
                                                            </div>
                                                            <div className="progress-track h-1.5">
                                                                <div className={`progress-fill ${paidPct === 100 ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-blue-500 shadow-blue-500/50'}`} 
                                                                     style={{ width: `${paidPct}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="font-black text-white text-base font-mono">₹{b.total_amount.toFixed(2)}</td>
                                                    <td>
                                                        <span className={`${s.class} shadow-sm px-3 py-1 flex items-center w-fit`}>
                                                            {s.icon} <span className="ml-1.5">{s.label}</span>
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-3">
                                                            <button onClick={() => setSelectedBill(b)} 
                                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/40 border border-white/5 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/10 transition-all duration-300 group-hover:scale-110">
                                                                <Eye size={16}/>
                                                            </button>
                                                            {(b.status === 'UNPAID' || b.status === 'PARTIAL' || b.status === 'OVERDUE') && (
                                                                <button onClick={() => setSelectedBill(b)} 
                                                                        className="btn-primary py-2 px-5 text-xs font-bold shadow-blue-500/20">
                                                                    Pay
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ═══ ANALYTICS ════════════════════════════════════════════════════════ */}
                    {role === 'USER' && currentView === 'ANALYTICS' && (
                        <div className="space-y-6 animate-fadeIn pb-12">
                            {/* ─── PERFORMANCE METRICS ────────────────────────────────────────────── */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className={`glass-intense p-6 rounded-3xl flex items-center gap-6 border-l-4 shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-500 ${+usageChangePct > 0 ? 'border-l-orange-500 bg-orange-500/5' : 'border-l-green-500 bg-green-500/5'}`}>
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse-slow ${+usageChangePct > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                        {+usageChangePct > 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Impact Delta</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-4xl font-black italic tracking-tighter ${+usageChangePct > 0 ? 'text-orange-400' : 'text-green-400'}`}>{+usageChangePct > 0 ? '+' : ''}{usageChangePct}%</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-2 opacity-60">
                                            <div className={`w-1.5 h-1.5 rounded-full ${+usageChangePct > 0 ? 'bg-orange-500' : 'bg-green-500'}`} />
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{+usageChangePct > 0 ? 'Surge Detected' : 'Optimized Flow'}</p>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 grad-blue opacity-[0.03] -mr-16 -mt-16 rounded-full blur-3xl pointer-events-none" />
                                </div>

                                <div className="glass-intense p-6 rounded-3xl flex items-center gap-6 border-l-4 border-l-blue-500 bg-blue-500/5 shadow-2xl group hover:-translate-y-1 transition-all duration-500">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                        <Zap size={32} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Peak Amplitude</p>
                                        <p className="text-xl font-black text-white uppercase tracking-tight">{highestMonth ? highestMonth.month : 'SYSTEM COLD'}</p>
                                        <p className="text-xs font-black text-blue-400/80 mt-1 font-mono tracking-widest">{highestMonth ? `${highestMonth.units} KWH` : 'NO DATA'}</p>
                                    </div>
                                </div>

                                <div className="glass-intense p-6 rounded-3xl flex items-center gap-6 border-l-4 border-l-purple-500 bg-purple-500/5 shadow-2xl group hover:-translate-y-1 transition-all duration-500">
                                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                                        <Activity size={32} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Mean Consumption</p>
                                        <p className="text-3xl font-black text-white italic tracking-tighter">{avgUnits.toFixed(0)} <span className="text-sm font-normal not-italic text-slate-600">kwh/mo</span></p>
                                        <p className="text-[10px] text-purple-400/60 font-bold uppercase tracking-widest mt-1">Normal Operating Range</p>
                                    </div>
                                </div>
                            </div>

                            {/* ─── MAIN TELEMETRY ─────────────────────────────────────────────────── */}
                            <div className="glass-intense rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden">
                                <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                                    <div>
                                        <h3 className="text-xl font-black italic text-white flex items-center gap-3 tracking-tight">
                                           <div className="w-2 h-8 grad-blue rounded-full" /> HISTORICAL LOAD SYNC
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] ml-5 mt-1">Multi-cycle usage telemetry</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="w-3 h-3 rounded-full bg-blue-500" />
                                        <span className="w-3 h-3 rounded-full bg-purple-500/30" />
                                    </div>
                                </div>
                                <div className="h-[380px] w-full"><Chart data={bills} /></div>
                                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><div className="w-64 h-64 border-[1px] border-blue-500 rounded-full scale-[2] blur-xl" /></div>
                            </div>
                            
                            {/* ─── SYSTEM INSIGHTS ────────────────────────────────────────────────── */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                <div className="lg:col-span-5 glass-intense rounded-[2rem] p-8 shadow-2xl border border-white/5 flex flex-col justify-between">
                                    <div className="mb-8">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                            Account Integrity <span className="h-[1px] flex-1 bg-white/5" />
                                        </h4>
                                        <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-white/5">
                                            <div className="space-y-1">
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">System Load</p>
                                                <p className="text-2xl font-black text-white italic tracking-tighter">{bills.length} Nodes</p>
                                            </div>
                                            <div className="h-12 w-[1px] bg-white/10" />
                                            <div className="text-right">
                                                <div className="flex gap-1 justify-end mb-1">
                                                    {[...Array(bills.length)].map((_, i) => (
                                                        <div key={i} className={`w-1.5 h-3 rounded-sm ${i < paidBills.length ? 'bg-blue-500' : 'bg-red-500 animate-pulse'}`} />
                                                    ))}
                                                </div>
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{paidBills.length} COMPLETED</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 rounded-2xl bg-green-500/5 border border-green-500/20 group hover:bg-green-500/10 transition-colors">
                                           <div className="flex justify-between mb-3">
                                               <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400"><ShieldCheck size={18} /></div>
                                               <p className="text-xs font-black text-green-400">{((paidBills.length/bills.length)*100).toFixed(0)}%</p>
                                           </div>
                                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Health Score</p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 group hover:bg-red-500/10 transition-colors">
                                           <div className="flex justify-between mb-3">
                                               <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400"><Activity size={18} /></div>
                                               <p className="text-xs font-black text-red-400">{unpaidBills.length}</p>
                                           </div>
                                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Open Vulnerabilities</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-7 glass-intense rounded-[2rem] p-8 shadow-2xl border border-white/5">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                        System Intelligence <span className="h-[1px] flex-1 bg-white/5" />
                                    </h4>
                                    <div className="space-y-4">
                                        {unpaidBills.length > 0 && (
                                            <div className="flex gap-5 items-center bg-red-500/10 p-5 rounded-2xl border border-red-500/30 group animate-pulse-slow">
                                                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0 border border-red-500/30 shadow-lg shadow-red-500/20"><AlertTriangle size={24} /></div>
                                                <div>
                                                    <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Priority Intervention Required</p>
                                                    <p className="text-sm text-slate-300 font-medium">Auto-penalty sequence initialized for {unpaidBills.length} outstanding cycles.</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-5 rounded-2xl bg-blue-500/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 mb-4 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform"><Clock size={20} /></div>
                                                <p className="text-xs font-black text-white uppercase tracking-widest mb-2">Off-Peak Sync</p>
                                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">System recommends active load shifting to 22:00–06:00 window for maximal efficiency.</p>
                                            </div>
                                            <div className="p-5 rounded-2xl bg-purple-500/5 border border-white/5 hover:border-purple-500/30 transition-all group">
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 mb-4 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><Zap size={20} /></div>
                                                <p className="text-xs font-black text-white uppercase tracking-widest mb-2">Hardware Audit</p>
                                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Integration of IoT smart-nodes detected old-gen lighting; upgrade recommended.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ ADMIN PANEL: COMMAND CENTER ══════════════════════════════════════════ */}
                    {role === 'ADMIN' && currentView === 'ADMIN_PANEL' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="stat-card stat-card-purple flex items-center gap-6 p-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                    <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 icon-glow-purple flex-shrink-0 group-hover:scale-110 transition-transform duration-500"><Shield size={32} /></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-purple-400/70 uppercase tracking-[0.2em] mb-1">Total Grid Arrears</p>
                                        <div className="flex items-end gap-2 text-white font-black drop-shadow-md">
                                            <span className="text-xl pb-1">₹</span><span className="text-4xl">{adminOutstanding.reduce((s, o) => s + o.total_due, 0).toFixed(2)}</span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Across {adminOutstanding.length} high-risk nodes</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="stat-card stat-card-red flex items-center gap-6 p-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                    <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 icon-glow-red flex-shrink-0 group-hover:scale-110 transition-transform duration-500"><AlertTriangle size={32} /></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.2em] mb-1">Critical Overdue Rate</p>
                                        <p className="text-4xl font-black text-white">{adminOutstanding.filter(o => o.unpaid_months > 3).length}</p>
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Penalty-eligible accounts</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-intense p-8 rounded-3xl border border-purple-500/20 flex flex-col lg:flex-row justify-between items-center bg-purple-500/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 bottom-0 w-1/2 bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />
                                <div className="relative z-10 mb-6 lg:mb-0">
                                    <h3 className="font-black text-2xl mb-1 text-white tracking-tight flex items-center gap-3">
                                        <Cpu size={24} className="text-purple-400" /> Automated Enforcement
                                    </h3>
                                    <p className="text-slate-400 text-sm max-w-md">Initialize the global penalty protocol to apply a 10% late surcharge on all nodes exceeding the 3-month unpaid threshold.</p>
                                </div>
                                <button onClick={handleApplyPenalties} className="btn-primary py-4 px-10 text-xs font-black tracking-widest uppercase bg-gradient-to-r from-purple-600 to-indigo-600 border-white/10 shadow-purple-500/30 flex items-center gap-3 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                                    <Zap size={18} fill="currentColor" /> Run System Protocol
                                </button>
                            </div>

                            <div className="glass rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Critical Arrears Ledger</h4>
                                    <span className="text-[9px] bg-slate-800 text-slate-500 px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-white/5">Auto-refresh: 15s</span>
                                </div>
                                <table className="sg-table">
                                    <thead>
                                        <tr>
                                            <th className="text-[10px] tracking-[0.2em] font-black italic">METER-NODE</th>
                                            <th className="text-[10px] tracking-[0.2em] font-black italic">LAG TIME</th>
                                            <th className="text-[10px] tracking-[0.2em] font-black italic">ARREARS</th>
                                            <th className="text-[10px] tracking-[0.2em] font-black italic">ALERT LEVEL</th>
                                            <th className="text-[10px] tracking-[0.2em] font-black italic">ACCESS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-slate-900/20">
                                        {adminOutstanding.length === 0 ? (
                                            <tr><td colSpan={5} className="py-24 text-center">
                                                <div className="opacity-40 flex flex-col items-center">
                                                    <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex items-center justify-center mb-4"><CheckCircle size={32} /></div>
                                                    <p className="text-sm font-black uppercase tracking-widest">No Active Violations</p>
                                                </div>
                                            </td></tr>
                                        ) : adminOutstanding.map(o => (
                                            <tr key={o.meter_no} className="group hover:bg-white/5 transition-colors">
                                                <td className="font-mono text-blue-400 font-black tracking-wider group-hover:text-blue-300 transition-colors uppercase">{o.meter_no}</td>
                                                <td>
                                                    <span className={`px-3 py-1.5 rounded-xl border font-black text-[10px] uppercase shadow-sm
                                                        ${o.unpaid_months > 3 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                                        {o.unpaid_months} Cycle Lag
                                                    </span>
                                                </td>
                                                <td className="font-black text-white text-base font-mono tracking-tighter">₹{o.total_due.toFixed(2)}</td>
                                                <td>
                                                    <span className={`flex items-center gap-2 font-black text-[10px] tracking-[0.1em] uppercase shadow-sm
                                                        ${o.unpaid_months > 3 ? "text-red-400" : "text-amber-400"}`}>
                                                        <span className={`w-2 h-2 rounded-full ${o.unpaid_months > 3 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                                                        {o.unpaid_months > 3 ? 'PENALTY PENDING' : 'PRIORITY 2'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button onClick={() => { setSearchQuery(o.meter_no); setCurrentView('ADMIN_CUSTOMERS'); }} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-800/40 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800 transition-all hover:scale-110">
                                                        <Eye size={18}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ═══ ADMIN CUSTOMERS: OPERATIONS ══════════════════════════════════════════ */}
                    {role === 'ADMIN' && currentView === 'ADMIN_CUSTOMERS' && (
                        <div className="space-y-6 animate-fadeIn">
                             <div className="glass-intense p-2 rounded-2xl flex items-center shadow-lg border-white/10 group focus-within:border-blue-500/30 transition-all duration-500">
                                <div className="p-4"><Search size={20} className="text-slate-600 group-focus-within:text-blue-400 transition-colors" /></div>
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
                                    placeholder="Execute search by Meter ID, Name or Address..." 
                                    className="flex-1 bg-transparent border-none text-white outline-none placeholder:text-slate-600 font-medium tracking-tight h-14" />
                                <button className="mr-2 px-4 py-2 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-500/20 active:scale-95 transition-all">Filter</button>
                            </div>

                            <div className="glass rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                                <div className="p-6 border-b border-white/5 bg-white/5">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Customer Operations Control</h4>
                                </div>
                                <table className="sg-table">
                                    <thead>
                                        <tr>
                                            <th className="text-[10px] tracking-[0.2em] font-black italic">CLIENT IDENTITY</th>
                                            <th className="text-[10px] tracking-[0.2em] font-black italic">COMMS</th>
                                            <th className="text-[10px] tracking-[0.2em] font-black italic">CONFIGURATION</th>
                                            <th className="text-[10px] tracking-[0.2em] font-black italic">METER OVERRIDE</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-slate-900/20">
                                        {customers.filter(c => `${c.name} ${c.meter_no}`.toLowerCase().includes(searchQuery.toLowerCase())).map((c, i) => (
                                            <tr key={c.meter_no} className="group hover:bg-white/5 transition-colors animate-fadeIn" style={{ animationDelay: `${i * 0.05}s` }}>
                                                <td>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl grad-blue border border-white/10 flex items-center justify-center font-black text-lg text-white shadow-lg group-hover:scale-105 transition-transform">{c.name[0]}</div>
                                                        <div>
                                                            <p className="font-black text-white group-hover:text-blue-300 transition-colors uppercase tracking-tight">{c.name}</p>
                                                            <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">{c.meter_no}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-slate-500 text-[11px] font-medium leading-loose">
                                                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-700" /> {c.email}</div>
                                                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-700" /> {c.contact_no}</div>
                                                </td>
                                                <td>
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-lg text-blue-400 w-fit">{c.meter_info?.meter_type || 'STANDARD'}</span>
                                                        <span className="text-[9px] font-black uppercase tracking-widest bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-lg text-purple-400 w-fit">{c.meter_info?.bill_type || 'POSTPAID'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative group/input">
                                                            <input type="number" 
                                                                value={adminSimUnits[c.meter_no] || ''} 
                                                                onChange={e => setAdminSimUnits({...adminSimUnits, [c.meter_no]: Number(e.target.value)})}
                                                                placeholder="UNIT"
                                                                className="w-32 bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500/40 transition-all font-mono" />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 tracking-tighter">KWH</span>
                                                        </div>
                                                        <button onClick={() => handleGenerateBill(c.meter_no)} className="w-11 h-11 bg-white/5 text-slate-400 border border-white/10 rounded-xl hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/40 transition-all flex items-center justify-center group/btn active:scale-90">
                                                            <DownloadCloud size={20} className="group-hover/btn:animate-bounce" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selectedBill && <BillModal bill={selectedBill} onClose={() => setSelectedBill(null)} onPay={handlePay} onPayPartial={handlePayPartial} />}
        </div>
    );
}
