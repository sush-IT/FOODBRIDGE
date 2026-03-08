import crypto from 'crypto';
import Payment from '../models/Payment.js';

function toPublicPayment(payment) {
  return {
    id: String(payment._id),
    customerId: payment.customerId,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    upiId: payment.upiId,
    paymentRef: payment.paymentRef,
    upiLink: payment.upiLink,
    status: payment.status,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
  };
}

export async function createUpiPayment(req, res, next) {
  try {
    const { customerId, amount, upiId } = req.body;
    const safeAmount = Number(amount || 0);
    if (!customerId || safeAmount <= 0) {
      return res.status(400).json({ message: 'customerId and valid amount are required' });
    }
    if (!upiId || !String(upiId).includes('@')) {
      return res.status(400).json({ message: 'Valid UPI ID is required' });
    }

    const merchantUpiId = process.env.UPI_MERCHANT_ID || 'foodbridge@upi';
    const merchantName = process.env.UPI_MERCHANT_NAME || 'FOODBRIDGE';
    const paymentRef = `FB${Date.now()}${crypto.randomInt(100, 999)}`;
    const params = new URLSearchParams({
      pa: merchantUpiId,
      pn: merchantName,
      tr: paymentRef,
      tn: `Order ${paymentRef}`,
      am: safeAmount.toFixed(2),
      cu: 'INR',
    });
    const upiLink = `upi://pay?${params.toString()}`;

    const payment = await Payment.create({
      customerId: String(customerId),
      amount: safeAmount,
      method: 'upi',
      upiId: String(upiId).trim(),
      paymentRef,
      upiLink,
      status: 'created',
    });

    res.status(201).json({ item: toPublicPayment(payment) });
  } catch (error) {
    next(error);
  }
}

export async function getPayment(req, res, next) {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ item: toPublicPayment(payment) });
  } catch (error) {
    next(error);
  }
}

export async function confirmPayment(req, res, next) {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (payment.status !== 'paid') {
      payment.status = 'paid';
      payment.paidAt = new Date();
      await payment.save();
    }

    res.json({ item: toPublicPayment(payment) });
  } catch (error) {
    next(error);
  }
}
