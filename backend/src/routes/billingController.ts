import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// ─── ALL STATIC ROUTES FIRST (before /:meter_no wildcard) ───────────────────

// Generate bill (Admin)
router.post('/generate', authenticate, async (req: AuthRequest, res) => {
    try {
        const { meter_no, units, month, year } = req.body;
        const unitPrice = 5.0;
        const amount = units * unitPrice;
        const tax_amount = parseFloat((amount * 0.18).toFixed(2));
        const total_amount = parseFloat((amount + tax_amount).toFixed(2));
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);
        const bill = await prisma.bill.create({
            data: {
                meter_no, month, year: Number(year), units: Number(units),
                amount, tax_amount, total_amount,
                amount_paid: 0, remaining_amount: total_amount,
                dueDate
            }
        });
        res.status(201).json(bill);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// AI Predict (must be before /:meter_no)
router.post('/predict', authenticate, async (req: AuthRequest, res) => {
    try {
        const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${AI_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        return res.json(data);
    } catch {
        const historicalAvg = req.body.historical_usage || 200;
        const current = req.body.current_usage || 120;
        return res.json({
            predicted_units: historicalAvg * 1.05,
            suggestion: 'Switch off appliances during peak hours to save up to 20%.',
            anomaly_detected: current > historicalAvg * 1.5,
            alert: current > historicalAvg * 1.5 ? 'WARNING: Usage spike detected!' : 'Usage looks normal.'
        });
    }
});

// Pay ALL unpaid bills for the authenticated user (must be before /:meter_no)
router.post('/pay-all', authenticate, async (req: AuthRequest, res) => {
    const meter_no = req.user?.meter_no;
    if (!meter_no) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const unpaidBills = await prisma.bill.findMany({
            where: { meter_no, status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } }
        });

        for (const bill of unpaidBills) {
            const remaining = parseFloat(bill.remaining_amount.toFixed(2));
            await prisma.bill.update({
                where: { bill_id: bill.bill_id },
                data: {
                    amount_paid: bill.total_amount,
                    remaining_amount: 0,
                    status: 'PAID'
                }
            });
            await prisma.payment.create({
                data: {
                    bill_id: bill.bill_id,
                    meter_no,
                    amount: remaining,
                    notes: 'Pay All'
                }
            });
        }
        res.json({ message: `Paid ${unpaidBills.length} bill(s) successfully.`, count: unpaidBills.length });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// ─── PARTIAL PAYMENT ─────────────────────────────────────────────────────────
router.post('/pay-partial', authenticate, async (req: AuthRequest, res) => {
    const meter_no = req.user?.meter_no;
    if (!meter_no) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { bill_id, amount } = req.body;
        const payAmount = parseFloat(parseFloat(amount).toFixed(2));

        if (!payAmount || payAmount <= 0) {
            return res.status(400).json({ error: 'Payment amount must be greater than 0.' });
        }

        const bill = await prisma.bill.findUnique({ where: { bill_id: Number(bill_id) } });
        if (!bill) return res.status(404).json({ error: 'Bill not found.' });
        if (bill.meter_no !== meter_no) return res.status(403).json({ error: 'Unauthorized.' });
        if (bill.status === 'PAID') return res.status(400).json({ error: 'This bill is already fully paid.' });

        const remaining = parseFloat(bill.remaining_amount.toFixed(2));
        if (payAmount > remaining) {
            return res.status(400).json({ error: `Overpayment prevented. Max payable: ₹${remaining.toFixed(2)}` });
        }

        const newAmountPaid = parseFloat((bill.amount_paid + payAmount).toFixed(2));
        const newRemaining = parseFloat((remaining - payAmount).toFixed(2));
        const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

        const updatedBill = await prisma.bill.update({
            where: { bill_id: Number(bill_id) },
            data: {
                amount_paid: newAmountPaid,
                remaining_amount: newRemaining,
                status: newStatus
            }
        });

        await prisma.payment.create({
            data: {
                bill_id: Number(bill_id),
                meter_no,
                amount: payAmount,
                notes: newStatus === 'PAID' ? 'Full payment (via partial)' : 'Partial payment'
            }
        });

        res.json({
            message: newStatus === 'PAID' ? 'Bill fully paid!' : `Partial payment of ₹${payAmount.toFixed(2)} recorded.`,
            bill: updatedBill
        });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// Payment history for a bill
router.get('/payment-history/:bill_id', authenticate, async (req: AuthRequest, res) => {
    try {
        const bill = await prisma.bill.findUnique({ where: { bill_id: Number(req.params.bill_id) } });
        if (!bill) return res.status(404).json({ error: 'Bill not found.' });
        if (req.user?.role !== 'ADMIN' && req.user?.meter_no !== bill.meter_no) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const payments = await prisma.payment.findMany({
            where: { bill_id: Number(req.params.bill_id) },
            orderBy: { payment_date: 'asc' }
        });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// Get user's own outstanding summary (must be before /:meter_no)
router.get('/my/outstanding', authenticate, async (req: AuthRequest, res) => {
    const meter_no = req.user?.meter_no;
    if (!meter_no) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const unpaidBills = await prisma.bill.findMany({
            where: { meter_no, status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
            orderBy: { bill_id: 'asc' }
        });
        const total_due = parseFloat(unpaidBills.reduce((sum, b) => {
            const rem = (b.remaining_amount === 0 && b.status !== 'PAID') ? b.total_amount : b.remaining_amount;
            return sum + rem;
        }, 0).toFixed(2));
        const total_penalty = parseFloat(unpaidBills.reduce((sum, b) => sum + b.penalty_amount, 0).toFixed(2));
        const total_paid = parseFloat(unpaidBills.reduce((sum, b) => sum + (b.amount_paid || 0), 0).toFixed(2));
        const partial_count = unpaidBills.filter(b => b.status === 'PARTIAL').length;
        res.json({
            unpaid_months: unpaidBills.length,
            total_due,
            total_penalty,
            total_paid,
            partial_count,
            penalty_applied: unpaidBills.length > 3
        });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// Admin: Get outstanding bills grouped by customer (must be before /:meter_no)
router.get('/admin/outstanding', authenticate, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    try {
        // Detailed map with safety fallback
        const bills = await prisma.bill.findMany({ where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } } });
        const grouped: Record<string, any> = {};
        for (const b of bills) {
            if (!grouped[b.meter_no]) {
                grouped[b.meter_no] = { meter_no: b.meter_no, unpaid_months: 0, total_due: 0, total_penalty: 0 };
            }
            const rem = (b.remaining_amount === 0 && b.status !== 'PAID') ? b.total_amount : b.remaining_amount;
            grouped[b.meter_no].unpaid_months++;
            grouped[b.meter_no].total_due += rem;
            grouped[b.meter_no].total_penalty += b.penalty_amount;
        }
        const mapped = Object.values(grouped).map((item: any) => ({
            ...item,
            total_due: parseFloat(item.total_due.toFixed(2)),
            total_penalty: parseFloat(item.total_penalty.toFixed(2))
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// Admin: Apply 10% penalty to customers with > 3 unpaid bills (must be before /:meter_no)
router.post('/admin/apply-penalties', authenticate, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const outstanding = await prisma.bill.groupBy({
            by: ['meter_no'],
            where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
            _count: { _all: true }
        });
        const metersToPenalize = outstanding
            .filter(item => item._count._all > 3)
            .map(item => item.meter_no);

        if (metersToPenalize.length === 0) {
            return res.json({ message: 'No customers qualify for penalty (need >3 unpaid months).' });
        }

        const unpaidBills = await prisma.bill.findMany({
            where: { meter_no: { in: metersToPenalize }, status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }, penalty_amount: 0 }
        });

        let updatedCount = 0;
        for (const bill of unpaidBills) {
            const newPenalty = parseFloat((bill.amount * 0.10).toFixed(2));
            const newRemaining = parseFloat((bill.remaining_amount + newPenalty).toFixed(2));
            await prisma.bill.update({
                where: { bill_id: bill.bill_id },
                data: {
                    penalty_amount: newPenalty,
                    total_amount: { increment: newPenalty },
                    remaining_amount: newRemaining
                }
            });
            updatedCount++;
        }
        res.json({
            message: `Applied 10% penalty to ${updatedCount} overdue bills across ${metersToPenalize.length} customer(s).`,
            meters: metersToPenalize
        });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// ─── PARAMETERIZED ROUTES LAST ───────────────────────────────────────────────

// Pay a single bill (full payment)
router.post('/:bill_id/pay', authenticate, async (req: AuthRequest, res) => {
    const meter_no = req.user?.meter_no;
    try {
        const bill = await prisma.bill.findUnique({ where: { bill_id: Number(req.params.bill_id) } });
        if (!bill) return res.status(404).json({ error: 'Bill not found' });
        const remaining = parseFloat(bill.remaining_amount.toFixed(2));
        const updatedBill = await prisma.bill.update({
            where: { bill_id: Number(req.params.bill_id) },
            data: { amount_paid: bill.total_amount, remaining_amount: 0, status: 'PAID' }
        });
        if (meter_no) {
            await prisma.payment.create({
                data: { bill_id: Number(req.params.bill_id), meter_no, amount: remaining, notes: 'Full payment' }
            });
        }
        res.json(updatedBill);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// Get bills for a specific meter (must be LAST — wildcard route)
router.get('/:meter_no', authenticate, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.meter_no !== req.params.meter_no) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }
    try {
        const bills = await prisma.bill.findMany({
            where: { meter_no: req.params.meter_no as string },
            orderBy: { bill_id: 'desc' }
        });
        res.json(bills);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;
