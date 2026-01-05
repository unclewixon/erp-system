import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { Wallet, WalletTransaction, FundRequest } from '../models/Wallet.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ WALLETS ============

router.get('/', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    // Super Admin has no tenant - return empty array
    if (!req.user.tenant) {
      return res.json({ success: true, data: [] });
    }

    const wallets = await Wallet.find({
      tenant: req.user.tenant,
      isActive: true,
    })
      .populate('custodian', 'firstName lastName')
      .populate('department', 'name')
      .sort({ name: 1 });

    res.json({ success: true, data: wallets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('custodian', 'firstName lastName email')
      .populate('department', 'name');

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    res.json({ success: true, data: wallet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const wallet = await Wallet.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: wallet });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const wallet = await Wallet.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    res.json({ success: true, data: wallet });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ WALLET TRANSACTIONS ============

router.get('/:id/transactions', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    const { startDate, endDate, type, limit = 50 } = req.query;
    const query = { tenant: req.user.tenant, wallet: req.params.id };

    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await WalletTransaction.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/deposit', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const balanceBefore = wallet.balance;
    wallet.balance += req.body.amount;

    const transaction = await WalletTransaction.create({
      tenant: req.user.tenant,
      wallet: wallet._id,
      type: 'credit',
      category: 'deposit',
      amount: req.body.amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: req.body.description,
      reference: req.body.reference,
      paymentMethod: req.body.paymentMethod,
      createdBy: req.user._id,
    });

    await wallet.save();

    res.json({ success: true, data: { wallet, transaction } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/:id/withdraw', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (wallet.balance < req.body.amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const balanceBefore = wallet.balance;
    wallet.balance -= req.body.amount;

    const transaction = await WalletTransaction.create({
      tenant: req.user.tenant,
      wallet: wallet._id,
      type: 'debit',
      category: 'withdrawal',
      amount: req.body.amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: req.body.description,
      reference: req.body.reference,
      paymentMethod: req.body.paymentMethod,
      createdBy: req.user._id,
    });

    await wallet.save();

    res.json({ success: true, data: { wallet, transaction } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/transfer', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const { fromWalletId, toWalletId, amount, description } = req.body;

    const fromWallet = await Wallet.findOne({ _id: fromWalletId, tenant: req.user.tenant });
    const toWallet = await Wallet.findOne({ _id: toWalletId, tenant: req.user.tenant });

    if (!fromWallet || !toWallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (fromWallet.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const fromBalanceBefore = fromWallet.balance;
    const toBalanceBefore = toWallet.balance;

    fromWallet.balance -= amount;
    toWallet.balance += amount;

    // Create debit transaction
    const debitTxn = await WalletTransaction.create({
      tenant: req.user.tenant,
      wallet: fromWallet._id,
      type: 'debit',
      category: 'transfer',
      amount,
      balanceBefore: fromBalanceBefore,
      balanceAfter: fromWallet.balance,
      description: `Transfer to ${toWallet.name}: ${description}`,
      transferTo: toWallet._id,
      createdBy: req.user._id,
    });

    // Create credit transaction
    const creditTxn = await WalletTransaction.create({
      tenant: req.user.tenant,
      wallet: toWallet._id,
      type: 'credit',
      category: 'transfer',
      amount,
      balanceBefore: toBalanceBefore,
      balanceAfter: toWallet.balance,
      description: `Transfer from ${fromWallet.name}: ${description}`,
      transferFrom: fromWallet._id,
      createdBy: req.user._id,
    });

    await Promise.all([fromWallet.save(), toWallet.save()]);

    res.json({
      success: true,
      data: {
        fromWallet,
        toWallet,
        debitTransaction: debitTxn,
        creditTransaction: creditTxn,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ FUND REQUESTS ============

router.get('/fund-requests', async (req, res) => {
  try {
    const { status } = req.query;
    const query = { tenant: req.user.tenant };

    const isFinance = ['super_admin', 'tenant_admin', 'finance_manager'].includes(req.user.role);
    if (!isFinance) {
      query.requestedBy = req.user._id;
    }
    if (status) query.status = status;

    const requests = await FundRequest.find(query)
      .populate('wallet', 'name type')
      .populate('requestedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/fund-requests', async (req, res) => {
  try {
    const request = await FundRequest.create({
      ...req.body,
      tenant: req.user.tenant,
      requestedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/fund-requests/:id/approve', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const request = await FundRequest.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'pending' },
      {
        status: 'approved',
        approvedAmount: req.body.approvedAmount,
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/fund-requests/:id/disburse', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const request = await FundRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'approved',
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const wallet = await Wallet.findById(request.wallet);
    if (wallet.balance < request.approvedAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    const balanceBefore = wallet.balance;
    wallet.balance -= request.approvedAmount;

    await WalletTransaction.create({
      tenant: req.user.tenant,
      wallet: wallet._id,
      type: 'debit',
      category: 'expense',
      amount: request.approvedAmount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: `Fund request: ${request.purpose}`,
      reference: request.requestNumber,
      createdBy: req.user._id,
    });

    request.status = 'disbursed';
    request.disbursedAt = new Date();
    request.disbursedBy = req.user._id;

    await Promise.all([wallet.save(), request.save()]);

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/fund-requests/:id/settle', async (req, res) => {
  try {
    const request = await FundRequest.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'disbursed',
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const { amountUsed, receipts } = req.body;
    const amountReturned = request.approvedAmount - amountUsed;

    // If returning funds
    if (amountReturned > 0) {
      const wallet = await Wallet.findById(request.wallet);
      const balanceBefore = wallet.balance;
      wallet.balance += amountReturned;

      await WalletTransaction.create({
        tenant: req.user.tenant,
        wallet: wallet._id,
        type: 'credit',
        category: 'refund',
        amount: amountReturned,
        balanceBefore,
        balanceAfter: wallet.balance,
        description: `Fund request return: ${request.purpose}`,
        reference: request.requestNumber,
        createdBy: req.user._id,
      });

      await wallet.save();
    }

    request.status = 'settled';
    request.settlement = {
      amountUsed,
      amountReturned,
      settledAt: new Date(),
      settledBy: req.user._id,
      receipts,
    };

    await request.save();

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/stats/summary', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const [walletBalances, recentTransactions, pendingRequests] = await Promise.all([
      Wallet.aggregate([
        { $match: { tenant: req.user.tenant, isActive: true } },
        { $group: { _id: '$type', totalBalance: { $sum: '$balance' }, count: { $sum: 1 } } },
      ]),
      WalletTransaction.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'wallets',
            localField: 'wallet',
            foreignField: '_id',
            as: 'wallet',
          },
        },
        { $unwind: '$wallet' },
        { $project: { walletName: '$wallet.name', type: 1, category: 1, amount: 1, createdAt: 1 } },
      ]),
      FundRequest.countDocuments({ tenant: req.user.tenant, status: 'pending' }),
    ]);

    const totalBalance = await Wallet.aggregate([
      { $match: { tenant: req.user.tenant, isActive: true } },
      { $group: { _id: null, total: { $sum: '$balance' } } },
    ]);

    res.json({
      success: true,
      data: {
        byType: walletBalances,
        totalBalance: totalBalance[0]?.total || 0,
        recentTransactions,
        pendingRequests,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
