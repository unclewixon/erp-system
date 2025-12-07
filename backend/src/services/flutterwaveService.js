import axios from 'axios';
import PaymentSettings from '../models/PaymentSettings.js';

class FlutterwaveService {
  constructor() {
    this.baseUrl = 'https://api.flutterwave.com/v3';
  }

  async getSecretKey() {
    const settings = await PaymentSettings.getSettings();
    if (!settings.flutterwave?.isEnabled) {
      throw new Error('Flutterwave is not enabled');
    }
    return settings.getFlutterwaveSecretKey();
  }

  async getPublicKey() {
    const settings = await PaymentSettings.getSettings();
    return settings.flutterwave?.publicKey;
  }

  async request(method, endpoint, data = null) {
    const secretKey = await this.getSecretKey();

    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Flutterwave API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Payment service error');
    }
  }

  // Initialize a payment
  async initializePayment({ email, amount, currency = 'NGN', reference, customerName, customerPhone, metadata, callbackUrl }) {
    const payload = {
      tx_ref: reference,
      amount,
      currency,
      redirect_url: callbackUrl,
      customer: {
        email,
        name: customerName,
        phonenumber: customerPhone,
      },
      customizations: {
        title: 'ERP Subscription',
        description: 'Subscription payment',
        logo: 'https://your-logo-url.com/logo.png',
      },
      meta: metadata,
    };

    return this.request('POST', '/payments', payload);
  }

  // Verify a transaction
  async verifyTransaction(transactionId) {
    return this.request('GET', `/transactions/${transactionId}/verify`);
  }

  // Verify transaction by reference
  async verifyTransactionByRef(reference) {
    return this.request('GET', `/transactions/verify_by_reference?tx_ref=${reference}`);
  }

  // Get all transactions
  async getTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/transactions${queryString ? '?' + queryString : ''}`);
  }

  // Create a payment plan (for subscriptions)
  async createPaymentPlan({ name, amount, interval, currency = 'NGN' }) {
    return this.request('POST', '/payment-plans', {
      name,
      amount,
      interval, // 'monthly', 'yearly', 'weekly', 'daily'
      currency,
    });
  }

  // Get payment plan
  async getPaymentPlan(planId) {
    return this.request('GET', `/payment-plans/${planId}`);
  }

  // List payment plans
  async listPaymentPlans() {
    return this.request('GET', '/payment-plans');
  }

  // Cancel a payment plan
  async cancelPaymentPlan(planId) {
    return this.request('PUT', `/payment-plans/${planId}/cancel`);
  }

  // Create subscription
  async createSubscription({ customer, plan }) {
    return this.request('POST', '/subscriptions', {
      customer,
      plan,
    });
  }

  // Get subscription
  async getSubscription(subscriptionId) {
    return this.request('GET', `/subscriptions/${subscriptionId}`);
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    return this.request('PUT', `/subscriptions/${subscriptionId}/cancel`);
  }

  // List banks
  async listBanks(country = 'NG') {
    return this.request('GET', `/banks/${country}`);
  }

  // Resolve account number
  async resolveAccountNumber(accountNumber, bankCode) {
    return this.request('POST', '/accounts/resolve', {
      account_number: accountNumber,
      account_bank: bankCode,
    });
  }

  // Generate reference
  generateReference(prefix = 'ERP') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }

  // Verify webhook signature
  async verifyWebhookSignature(signature, secretHash) {
    const settings = await PaymentSettings.getSettings();
    const webhookSecret = settings.flutterwave?.webhookSecret;

    if (!webhookSecret) {
      console.warn('Flutterwave webhook secret not configured');
      return false;
    }

    return signature === webhookSecret;
  }

  // Get available payment methods
  getPaymentMethods() {
    return ['card', 'banktransfer', 'ussd', 'mobilemoney', 'qr'];
  }
}

export default new FlutterwaveService();
