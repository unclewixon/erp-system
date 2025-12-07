import mongoose from 'mongoose';

const subscriptionPaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'NGN',
  },
  paymentReference: {
    type: String,
    required: true,
  },
  paymentProvider: {
    type: String,
    enum: ['paystack', 'flutterwave', 'manual'],
    default: 'paystack',
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'ussd', 'mobile_money', 'qr', 'manual'],
    default: 'card',
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending',
  },
  paidAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

const subscriptionSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  },
  status: {
    type: String,
    enum: ['trial', 'active', 'past_due', 'cancelled', 'expired'],
    default: 'trial',
  },
  // Pricing at time of subscription
  priceAtSubscription: {
    type: Number,
    required: true,
  },
  // Trial period
  trialEndsAt: Date,
  // Current billing period
  currentPeriodStart: {
    type: Date,
    required: true,
  },
  currentPeriodEnd: {
    type: Date,
    required: true,
  },
  // Paystack subscription details (if using recurring)
  paystackSubscriptionCode: String,
  paystackCustomerCode: String,
  paystackPlanCode: String,
  paystackEmailToken: String,
  // Auto-renewal
  autoRenew: {
    type: Boolean,
    default: true,
  },
  // Payment history
  payments: [subscriptionPaymentSchema],
  // Cancellation
  cancelledAt: Date,
  cancelReason: String,
  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

subscriptionSchema.index({ tenant: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

// Virtual to check if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  return ['trial', 'active'].includes(this.status) &&
         new Date() <= this.currentPeriodEnd;
});

// Virtual to check days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.currentPeriodEnd);
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

// Add payment to subscription
subscriptionSchema.methods.addPayment = async function(paymentData) {
  this.payments.push(paymentData);

  if (paymentData.status === 'success') {
    this.status = 'active';

    // Extend subscription period
    const periodDuration = this.billingCycle === 'yearly' ? 365 : 30;
    const now = new Date();
    this.currentPeriodStart = now;
    this.currentPeriodEnd = new Date(now.getTime() + (periodDuration * 24 * 60 * 60 * 1000));
  }

  await this.save();
  return this;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
