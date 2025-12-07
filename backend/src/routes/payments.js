import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import PaymentSettings from '../models/PaymentSettings.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import { Tenant } from '../models/index.js';
import paystackService from '../services/paystackService.js';
import flutterwaveService from '../services/flutterwaveService.js';

const router = express.Router();

// ========================================
// PAYMENT SETTINGS ROUTES (Super Admin Only)
// ========================================

// @route   GET /api/payments/settings
// @desc    Get payment settings
// @access  Private (Super Admin)
router.get('/settings', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const settings = await PaymentSettings.getSettings();
    res.json({
      success: true,
      data: settings.toSafeObject(),
    });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/payments/settings
// @desc    Update payment settings
// @access  Private (Super Admin)
router.put('/settings', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { paystack, flutterwave, defaultCurrency, taxEnabled, taxRate } = req.body;

    let settings = await PaymentSettings.getSettings();

    // Update Paystack settings
    if (paystack) {
      if (paystack.publicKey !== undefined) {
        settings.paystack.publicKey = paystack.publicKey;
      }
      if (paystack.secretKey && !paystack.secretKey.includes('••••')) {
        settings.paystack.secretKey = paystack.secretKey;
      }
      if (paystack.webhookSecret && !paystack.webhookSecret.includes('••••')) {
        settings.paystack.webhookSecret = paystack.webhookSecret;
      }
      if (paystack.isEnabled !== undefined) {
        settings.paystack.isEnabled = paystack.isEnabled;
      }
      if (paystack.isLive !== undefined) {
        settings.paystack.isLive = paystack.isLive;
      }
    }

    // Update Flutterwave settings
    if (flutterwave) {
      if (!settings.flutterwave) settings.flutterwave = {};
      if (flutterwave.publicKey !== undefined) {
        settings.flutterwave.publicKey = flutterwave.publicKey;
      }
      if (flutterwave.secretKey && !flutterwave.secretKey.includes('••••')) {
        settings.flutterwave.secretKey = flutterwave.secretKey;
      }
      if (flutterwave.webhookSecret && !flutterwave.webhookSecret.includes('••••')) {
        settings.flutterwave.webhookSecret = flutterwave.webhookSecret;
      }
      if (flutterwave.isEnabled !== undefined) {
        settings.flutterwave.isEnabled = flutterwave.isEnabled;
      }
      if (flutterwave.isLive !== undefined) {
        settings.flutterwave.isLive = flutterwave.isLive;
      }
    }

    if (defaultCurrency) settings.defaultCurrency = defaultCurrency;
    if (taxEnabled !== undefined) settings.taxEnabled = taxEnabled;
    if (taxRate !== undefined) settings.taxRate = taxRate;

    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({
      success: true,
      message: 'Payment settings updated successfully',
      data: settings.toSafeObject(),
    });
  } catch (error) {
    console.error('Update payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/payments/settings/test
// @desc    Test Paystack connection
// @access  Private (Super Admin)
router.post('/settings/test', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const banks = await paystackService.listBanks();
    res.json({
      success: true,
      message: 'Paystack connection successful',
      data: { bankCount: banks.data?.length || 0 },
    });
  } catch (error) {
    console.error('Test Paystack error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to connect to Paystack',
    });
  }
});

// @route   POST /api/payments/settings/test-flutterwave
// @desc    Test Flutterwave connection
// @access  Private (Super Admin)
router.post('/settings/test-flutterwave', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const banks = await flutterwaveService.listBanks('NG');
    res.json({
      success: true,
      message: 'Flutterwave connection successful',
      data: { bankCount: banks.data?.length || 0 },
    });
  } catch (error) {
    console.error('Test Flutterwave error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to connect to Flutterwave',
    });
  }
});

// ========================================
// PUBLIC KEY ROUTE (For Frontend)
// ========================================

// @route   GET /api/payments/public-key
// @desc    Get payment gateway public keys for frontend
// @access  Public
router.get('/public-key', async (req, res) => {
  try {
    const settings = await PaymentSettings.getSettings();

    const gateways = [];

    // Check Paystack
    if (settings.paystack?.isEnabled && settings.paystack?.publicKey) {
      gateways.push({
        provider: 'paystack',
        publicKey: settings.paystack.publicKey,
        isLive: settings.paystack.isLive,
      });
    }

    // Check Flutterwave
    if (settings.flutterwave?.isEnabled && settings.flutterwave?.publicKey) {
      gateways.push({
        provider: 'flutterwave',
        publicKey: settings.flutterwave.publicKey,
        isLive: settings.flutterwave.isLive,
      });
    }

    if (gateways.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Online payments are not currently available',
      });
    }

    res.json({
      success: true,
      data: {
        gateways,
        // For backwards compatibility
        publicKey: gateways[0]?.publicKey,
        isLive: gateways[0]?.isLive,
      },
    });
  } catch (error) {
    console.error('Get public key error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ========================================
// SUBSCRIPTION PAYMENT ROUTES
// ========================================

// @route   POST /api/payments/subscribe/initialize
// @desc    Initialize subscription payment
// @access  Private
router.post('/subscribe/initialize', protect, async (req, res) => {
  try {
    const { planId, billingCycle = 'monthly', gateway = 'paystack' } = req.body;

    // Get the plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Get price based on billing cycle
    const price = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This plan requires custom pricing. Please contact sales.',
      });
    }

    // Get callback URL
    const callbackUrl = `${process.env.FRONTEND_URL}/payment/callback`;

    let paymentData;

    if (gateway === 'flutterwave') {
      // Initialize Flutterwave payment
      const reference = flutterwaveService.generateReference('SUB');

      const response = await flutterwaveService.initializePayment({
        email: req.user.email,
        amount: price,
        currency: 'NGN',
        reference,
        customerName: `${req.user.firstName} ${req.user.lastName}`,
        customerPhone: req.user.phone || '',
        metadata: {
          planId: plan._id.toString(),
          tenantId: req.user.tenant.toString(),
          userId: req.user._id.toString(),
          billingCycle,
          gateway: 'flutterwave',
        },
        callbackUrl,
      });

      paymentData = {
        authorizationUrl: response.data.link,
        reference,
        amount: price,
        gateway: 'flutterwave',
        plan: {
          id: plan._id,
          name: plan.name,
          billingCycle,
        },
      };
    } else {
      // Initialize Paystack payment (default)
      const reference = paystackService.generateReference('SUB');

      const response = await paystackService.initializeTransaction({
        email: req.user.email,
        amount: price,
        reference,
        metadata: {
          custom_fields: [
            { display_name: 'Plan', variable_name: 'plan_name', value: plan.name },
            { display_name: 'Billing Cycle', variable_name: 'billing_cycle', value: billingCycle },
          ],
          planId: plan._id.toString(),
          tenantId: req.user.tenant.toString(),
          userId: req.user._id.toString(),
          billingCycle,
          gateway: 'paystack',
        },
        callbackUrl,
      });

      paymentData = {
        authorizationUrl: response.data.authorization_url,
        accessCode: response.data.access_code,
        reference: response.data.reference,
        amount: price,
        gateway: 'paystack',
        plan: {
          id: plan._id,
          name: plan.name,
          billingCycle,
        },
      };
    }

    res.json({
      success: true,
      message: 'Payment initialized',
      data: paymentData,
    });
  } catch (error) {
    console.error('Initialize subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize payment',
    });
  }
});

// @route   POST /api/payments/subscribe/verify
// @desc    Verify subscription payment
// @access  Private
router.post('/subscribe/verify', protect, async (req, res) => {
  try {
    const { reference, gateway = 'paystack', transactionId } = req.body;

    if (!reference && !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference or transaction ID is required',
      });
    }

    let verificationData;
    let paymentProvider = gateway;

    if (gateway === 'flutterwave') {
      // Verify with Flutterwave
      const response = transactionId
        ? await flutterwaveService.verifyTransaction(transactionId)
        : await flutterwaveService.verifyTransactionByRef(reference);

      if (response.status !== 'success' || response.data.status !== 'successful') {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          data: { status: response.data?.status },
        });
      }

      verificationData = {
        metadata: response.data.meta,
        amount: response.data.amount * 100, // Convert to kobo for consistency
        authorization: {
          channel: response.data.payment_type,
          card_type: response.data.card?.type,
          last4: response.data.card?.last_4digits,
          bank: response.data.card?.issuer,
        },
        paid_at: response.data.created_at,
        customer: response.data.customer,
      };
    } else {
      // Verify with Paystack (default)
      const response = await paystackService.verifyTransaction(reference);

      if (response.data.status !== 'success') {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          data: { status: response.data.status },
        });
      }

      verificationData = {
        metadata: response.data.metadata,
        amount: response.data.amount,
        authorization: response.data.authorization,
        paid_at: response.data.paid_at,
        customer: response.data.customer,
      };
    }

    const { metadata, amount, authorization, paid_at } = verificationData;
    const { planId, tenantId, billingCycle } = metadata;

    // Get the plan
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Calculate subscription period
    const periodDays = billingCycle === 'yearly' ? 365 : 30;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + (periodDays * 24 * 60 * 60 * 1000));

    // Create or update subscription
    let subscription = await Subscription.findOne({ tenant: tenantId });

    if (subscription) {
      // Update existing subscription
      subscription.plan = planId;
      subscription.billingCycle = billingCycle;
      subscription.status = 'active';
      subscription.priceAtSubscription = amount / 100; // Convert from kobo
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = periodEnd;
      if (verificationData.customer?.customer_code) {
        subscription.paystackCustomerCode = verificationData.customer.customer_code;
      }

      subscription.payments.push({
        amount: amount / 100,
        paymentReference: reference,
        paymentProvider: paymentProvider,
        paymentMethod: authorization?.channel || 'card',
        status: 'success',
        paidAt: paid_at,
        metadata: {
          authorization_code: authorization?.authorization_code,
          card_type: authorization?.card_type,
          last4: authorization?.last4,
          bank: authorization?.bank,
        },
      });

      await subscription.save();
    } else {
      // Create new subscription
      subscription = await Subscription.create({
        tenant: tenantId,
        plan: planId,
        billingCycle,
        status: 'active',
        priceAtSubscription: amount / 100,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        paystackCustomerCode: verificationData.customer?.customer_code,
        createdBy: req.user._id,
        payments: [{
          amount: amount / 100,
          paymentReference: reference,
          paymentProvider: paymentProvider,
          paymentMethod: authorization?.channel || 'card',
          status: 'success',
          paidAt: paid_at,
          metadata: {
            authorization_code: authorization?.authorization_code,
            card_type: authorization?.card_type,
            last4: authorization?.last4,
            bank: authorization?.bank,
          },
        }],
      });
    }

    // Update tenant subscription status
    await Tenant.findByIdAndUpdate(tenantId, {
      'subscription.plan': plan.slug,
      'subscription.isActive': true,
      'subscription.startDate': now,
      'subscription.endDate': periodEnd,
      'subscription.maxEmployees': plan.employeeRange.max || -1,
      'subscription.maxBranches': plan.maxBranches || -1,
    });

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        subscription: {
          id: subscription._id,
          plan: plan.name,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          daysRemaining: subscription.daysRemaining,
        },
      },
    });
  } catch (error) {
    console.error('Verify subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed',
    });
  }
});

// @route   GET /api/payments/subscription
// @desc    Get current subscription
// @access  Private
router.get('/subscription', protect, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ tenant: req.user.tenant })
      .populate('plan', 'name slug price features')
      .sort({ createdAt: -1 });

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        message: 'No subscription found',
      });
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/payments/subscription/history
// @desc    Get subscription payment history
// @access  Private
router.get('/subscription/history', protect, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ tenant: req.user.tenant });

    if (!subscription) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Return payments sorted by date (newest first)
    const payments = [...subscription.payments].sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// ========================================
// WEBHOOK ROUTE
// ========================================

// @route   POST /api/payments/webhook/paystack
// @desc    Handle Paystack webhooks
// @access  Public (verified by signature)
router.post('/webhook/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Verify signature
    const isValid = await paystackService.verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.warn('Invalid Paystack webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const { event, data } = body;

    console.log('Paystack webhook:', event);

    switch (event) {
      case 'charge.success':
        // Handle successful charge (already handled by verify endpoint for subscriptions)
        break;

      case 'subscription.create':
        // Handle subscription created
        break;

      case 'subscription.disable':
        // Handle subscription cancelled
        if (data.subscription_code) {
          const subscription = await Subscription.findOne({
            paystackSubscriptionCode: data.subscription_code,
          });
          if (subscription) {
            subscription.status = 'cancelled';
            subscription.cancelledAt = new Date();
            await subscription.save();
          }
        }
        break;

      case 'invoice.payment_failed':
        // Handle failed payment
        if (data.subscription?.subscription_code) {
          const subscription = await Subscription.findOne({
            paystackSubscriptionCode: data.subscription.subscription_code,
          });
          if (subscription) {
            subscription.status = 'past_due';
            await subscription.save();
          }
        }
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// @route   POST /api/payments/webhook/flutterwave
// @desc    Handle Flutterwave webhooks
// @access  Public (verified by signature)
router.post('/webhook/flutterwave', async (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    const settings = await PaymentSettings.getSettings();
    const webhookSecret = settings.getFlutterwaveWebhookSecret();

    // Verify signature
    if (webhookSecret && signature !== webhookSecret) {
      console.warn('Invalid Flutterwave webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const { event, data } = req.body;

    console.log('Flutterwave webhook:', event);

    switch (event) {
      case 'charge.completed':
        // Payment successful - handled by verify endpoint
        if (data.status === 'successful') {
          console.log('Flutterwave payment successful:', data.tx_ref);
        }
        break;

      case 'subscription.cancelled':
        // Handle subscription cancellation
        console.log('Flutterwave subscription cancelled');
        break;

      case 'payment.failed':
        // Handle failed payment
        console.log('Flutterwave payment failed:', data.tx_ref);
        break;

      default:
        console.log('Unhandled Flutterwave webhook event:', event);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Flutterwave webhook error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// ========================================
// ADMIN ROUTES - Subscription Management
// ========================================

// @route   GET /api/payments/admin/subscriptions
// @desc    Get all subscriptions (Super Admin)
// @access  Private (Super Admin)
router.get('/admin/subscriptions', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('tenant', 'name slug email')
      .populate('plan', 'name slug price')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(query);

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
