import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import { Account, JournalEntry, FiscalPeriod, Budget } from '../models/Bookkeeping.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// ============ CHART OF ACCOUNTS ============

router.get('/accounts', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    const { type, category } = req.query;
    const query = { tenant: req.user.tenant, isActive: true };

    if (type) query.type = type;
    if (category) query.category = category;

    const accounts = await Account.find(query)
      .populate('parentAccount', 'code name')
      .sort({ code: 1 });

    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/accounts/:id', async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    }).populate('parentAccount', 'code name');

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/accounts', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    // Determine normal balance based on account type
    let normalBalance = 'debit';
    if (['liability', 'equity', 'revenue'].includes(req.body.type)) {
      normalBalance = 'credit';
    }

    const account = await Account.create({
      ...req.body,
      tenant: req.user.tenant,
      normalBalance,
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/accounts/:id', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (account.isSystemAccount) {
      return res.status(400).json({ success: false, message: 'Cannot modify system account' });
    }

    Object.assign(account, req.body);
    await account.save();

    res.json({ success: true, data: account });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ JOURNAL ENTRIES ============

router.get('/journals', authorize('super_admin', 'tenant_admin', 'finance_manager', 'finance_officer'), async (req, res) => {
  try {
    const { status, startDate, endDate, type } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const journals = await JournalEntry.find(query)
      .populate('lines.account', 'code name')
      .populate('postedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ date: -1, createdAt: -1 });

    res.json({ success: true, data: journals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/journals/:id', async (req, res) => {
  try {
    const journal = await JournalEntry.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('lines.account', 'code name type')
      .populate('postedBy', 'firstName lastName')
      .populate('reversedEntry')
      .populate('createdBy', 'firstName lastName');

    if (!journal) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    res.json({ success: true, data: journal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/journals', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const journal = await JournalEntry.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    const populated = await JournalEntry.findById(journal._id)
      .populate('lines.account', 'code name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/journals/:id/post', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const journal = await JournalEntry.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'draft',
    }).populate('lines.account');

    if (!journal) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    // Update account balances
    for (const line of journal.lines) {
      const account = await Account.findById(line.account._id);
      if (account.normalBalance === 'debit') {
        account.balance += line.debit - line.credit;
      } else {
        account.balance += line.credit - line.debit;
      }
      await account.save();
    }

    journal.status = 'posted';
    journal.postedBy = req.user._id;
    journal.postedAt = new Date();
    await journal.save();

    res.json({ success: true, data: journal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/journals/:id/reverse', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const originalJournal = await JournalEntry.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'posted',
    });

    if (!originalJournal) {
      return res.status(404).json({ success: false, message: 'Journal entry not found or not posted' });
    }

    // Create reversing entry
    const reversingLines = originalJournal.lines.map(line => ({
      account: line.account,
      description: `Reversal: ${line.description || ''}`,
      debit: line.credit,
      credit: line.debit,
    }));

    const reversalJournal = await JournalEntry.create({
      tenant: req.user.tenant,
      date: req.body.date || new Date(),
      description: `Reversal of ${originalJournal.entryNumber}: ${originalJournal.description}`,
      type: 'reversing',
      lines: reversingLines,
      totalDebit: originalJournal.totalCredit,
      totalCredit: originalJournal.totalDebit,
      reversedEntry: originalJournal._id,
      status: 'draft',
      createdBy: req.user._id,
    });

    originalJournal.status = 'reversed';
    await originalJournal.save();

    res.json({ success: true, data: reversalJournal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ FISCAL PERIODS ============

router.get('/periods', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const { year } = req.query;
    const query = { tenant: req.user.tenant };

    if (year) query.year = parseInt(year);

    const periods = await FiscalPeriod.find(query)
      .populate('closedBy', 'firstName lastName')
      .sort({ year: -1, period: 1 });

    res.json({ success: true, data: periods });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/periods', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const period = await FiscalPeriod.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: period });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/periods/:id/close', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const period = await FiscalPeriod.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'open' },
      {
        status: 'closed',
        closedBy: req.user._id,
        closedAt: new Date(),
      },
      { new: true }
    );

    if (!period) {
      return res.status(404).json({ success: false, message: 'Period not found or already closed' });
    }

    res.json({ success: true, data: period });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ BUDGETS ============

router.get('/budgets', authorize('super_admin', 'tenant_admin', 'finance_manager', 'hr_manager'), async (req, res) => {
  try {
    const { year, department, status } = req.query;
    const query = { tenant: req.user.tenant };

    if (year) query.fiscalYear = parseInt(year);
    if (department) query.department = department;
    if (status) query.status = status;

    const budgets = await Budget.find(query)
      .populate('department', 'name')
      .populate('lines.account', 'code name')
      .populate('approvedBy', 'firstName lastName')
      .sort({ fiscalYear: -1 });

    res.json({ success: true, data: budgets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/budgets', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const budget = await Budget.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/budgets/:id/approve', authorize('super_admin', 'tenant_admin'), async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant, status: 'pending_approval' },
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    res.json({ success: true, data: budget });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ REPORTS ============

router.get('/reports/trial-balance', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const accounts = await Account.find({
      tenant: req.user.tenant,
      isActive: true,
    }).sort({ code: 1 });

    const trialBalance = accounts.map(acc => ({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debit: acc.normalBalance === 'debit' ? acc.balance : 0,
      credit: acc.normalBalance === 'credit' ? acc.balance : 0,
    }));

    const totals = trialBalance.reduce((sum, acc) => ({
      debit: sum.debit + acc.debit,
      credit: sum.credit + acc.credit,
    }), { debit: 0, credit: 0 });

    res.json({
      success: true,
      data: {
        accounts: trialBalance,
        totals,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/reports/income-statement', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const revenueAccounts = await Account.find({
      tenant: req.user.tenant,
      type: 'revenue',
      isActive: true,
    });

    const expenseAccounts = await Account.find({
      tenant: req.user.tenant,
      type: 'expense',
      isActive: true,
    });

    const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    res.json({
      success: true,
      data: {
        revenue: revenueAccounts.map(a => ({ code: a.code, name: a.name, amount: a.balance })),
        expenses: expenseAccounts.map(a => ({ code: a.code, name: a.name, amount: a.balance })),
        totalRevenue,
        totalExpenses,
        netIncome,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/reports/balance-sheet', authorize('super_admin', 'tenant_admin', 'finance_manager'), async (req, res) => {
  try {
    const [assets, liabilities, equity] = await Promise.all([
      Account.find({ tenant: req.user.tenant, type: 'asset', isActive: true }),
      Account.find({ tenant: req.user.tenant, type: 'liability', isActive: true }),
      Account.find({ tenant: req.user.tenant, type: 'equity', isActive: true }),
    ]);

    const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
    const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);

    res.json({
      success: true,
      data: {
        assets: assets.map(a => ({ code: a.code, name: a.name, category: a.category, amount: a.balance })),
        liabilities: liabilities.map(a => ({ code: a.code, name: a.name, category: a.category, amount: a.balance })),
        equity: equity.map(a => ({ code: a.code, name: a.name, category: a.category, amount: a.balance })),
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
