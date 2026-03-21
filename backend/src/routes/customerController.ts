import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// GET all customers (admin only)
router.get('/', authenticate, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only access' });
    const customers = await prisma.customer.findMany({ include: { meter_info: true } });
    res.json(customers);
});

// GET single customer
router.get('/:meter_no', authenticate, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.meter_no !== req.params.meter_no) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }
    const customer = await prisma.customer.findUnique({
        where: { meter_no: req.params.meter_no as string },
        include: { meter_info: true, bills: true }
    });
    res.json(customer);
});

// PUT update customer details
router.put('/:meter_no', authenticate, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.meter_no !== req.params.meter_no) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }
    const updatedCustomer = await prisma.customer.update({
        where: { meter_no: req.params.meter_no as string },
        data: req.body
    });
    res.json(updatedCustomer);
});

export default router;
