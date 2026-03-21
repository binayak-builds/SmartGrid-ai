import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-smartgrid';

router.post('/register', async (req, res) => {
    try {
        const { name, email, address, contact_no, password, meter_no } = req.body;

        const existingMeter = await prisma.customer.findUnique({ where: { meter_no } });
        if (existingMeter) return res.status(400).json({ error: 'Meter number already registered.' });

        const existingEmail = await prisma.customer.findUnique({ where: { email } });
        if (existingEmail) return res.status(400).json({ error: 'Email address is already in use.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newCustomer = await prisma.customer.create({
            data: {
                meter_no, name, email, address, contact_no, role: 'USER',
                login: { create: { password: hashedPassword } },
                meter_info: {
                    create: { meter_type: 'Post-paid', phase_code: 'Single', bill_type: 'Residential' }
                }
            }
        });

        // ─── Generate Mock Data for New User ───
        const generateDynamicBills = (meter_no: string) => {
            const result = [];
            const currentDate = new Date(); // Use current date for reference (March 2026)
            const unpaidCount = Math.floor(Math.random() * 4); // 0, 1, 2, or 3 unpaid months
            
            const baseUnits = 100 + Math.floor(Math.random() * 50); // baseline between 100 and 150
            for (let i = 5; i >= 0; i--) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                
                // Fluctuates by up to +/- 15 units from the baseline
                const units = baseUnits + Math.floor(Math.random() * 30) - 15;
                const amount = units * 5.0;
                const tax_amount = parseFloat((amount * 0.18).toFixed(2));
                const total_amount = parseFloat((amount + tax_amount).toFixed(2));
                
                const isUnpaid = i < unpaidCount; // latest i months are unpaid
                const status = isUnpaid ? 'UNPAID' : 'PAID';

                // Penalty of 10% if bill is UNPAID and > 3 months old
                const penalty_amount = (status === 'UNPAID' && i >= 3) ? parseFloat((amount * 0.10).toFixed(2)) : 0;
                const total_amount_with_penalty = parseFloat((total_amount + penalty_amount).toFixed(2));
                
                result.push({
                    meter_no,
                    month: monthNames[date.getMonth()],
                    year: date.getFullYear(),
                    units,
                    amount,
                    tax_amount,
                    penalty_amount,
                    total_amount: total_amount_with_penalty,
                    amount_paid: 0,
                    remaining_amount: total_amount_with_penalty,
                    status,
                    dueDate: new Date(date.getFullYear(), date.getMonth(), 15)
                });
            }
            return result;
        };

        const mockBills = generateDynamicBills(meter_no);

        await prisma.bill.createMany({
            data: mockBills
        });

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { meter_no, password } = req.body;

        const loginRecord = await prisma.login.findUnique({
            where: { meter_no },
            include: { customer: true }
        });

        if (!loginRecord) return res.status(400).json({ error: 'Invalid meter number or password' });

        const validPassword = await bcrypt.compare(password, loginRecord.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid meter number or password' });

        const token = jwt.sign(
            { meter_no: loginRecord.meter_no, role: loginRecord.customer.role },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ token, role: loginRecord.customer.role, meter_no, name: loginRecord.customer.name });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;
