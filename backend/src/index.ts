import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authController';
import customerRoutes from './routes/customerController';
import billingRoutes from './routes/billingController';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bills', billingRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Seed demo bills for an existing user (dev convenience — no auth needed)
app.post('/api/dev/seed-user', async (req, res) => {
    const prisma = new PrismaClient();
    try {
        const { meter_no } = req.body;
        if (!meter_no) return res.status(400).json({ error: 'meter_no is required' });

        const customer = await prisma.customer.findUnique({ where: { meter_no } });
        if (!customer) return res.status(404).json({ error: `No customer found with meter_no: ${meter_no}` });

        // Wipe old bills so re-seeding is always safe
        await prisma.bill.deleteMany({ where: { meter_no } });

        const generateDynamicBills = (meter_no: string) => {
            const result = [];
            const currentDate = new Date(); // Use current date as reference (March 2026)
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
                
                // If bill is UNPAID and more than 3 months old (i >= 3), apply penalty
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

        const bills = generateDynamicBills(meter_no);

        await prisma.bill.createMany({ data: bills });
        res.json({ message: `Seeded ${bills.length} bills for meter ${meter_no}` });
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    } finally {
        await prisma.$disconnect();
    }
});

const PORT = Number(process.env.PORT) || 5050;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT}`);
});
