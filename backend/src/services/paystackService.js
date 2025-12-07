import axios from 'axios';
import PaymentSettings from '../models/PaymentSettings.js';

class PaystackService {
  constructor() {
    this.baseUrl = 'https://api.paystack.co';
  }

  async getSecretKey() {
    const settings = await PaymentSettings.getSettings();
    if (!settings.paystack.isEnabled) {
      throw new Error('Paystack is not enabled');
    }
    return settings.getPaystackSecretKey();
  }

  async getPublicKey() {
    const settings = await PaymentSettings.getSettings();
    return settings.paystack.publicKey;
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
      console.error('Paystack API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Payment service error');
    }
  }

  // Initialize a transaction
  async initializeTransaction({ email, amount, reference, metadata, callbackUrl, channels }) {
    // Amount should be in kobo (NGN * 100)
    const amountInKobo = Math.round(amount * 100);

    const payload = {
      email,
      amount: amountInKobo,
      reference,
      metadata,
      callback_url: callbackUrl,
    };

    if (channels) {
      payload.channels = channels;
    }

    return this.request('POST', '/transaction/initialize', payload);
  }

  // Verify a transaction
  async verifyTransaction(reference) {
    return this.request('GET', `/transaction/verify/${reference}`);
  }

  // Create a customer
  async createCustomer({ email, firstName, lastName, phone }) {
    return this.request('POST', '/customer', {
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
    });
  }

  // Get customer by email or code
  async getCustomer(emailOrCode) {
    return this.request('GET', `/customer/${emailOrCode}`);
  }

  // Create a plan (for subscriptions)
  async createPlan({ name, amount, interval, description }) {
    // Amount should be in kobo
    const amountInKobo = Math.round(amount * 100);

    return this.request('POST', '/plan', {
      name,
      amount: amountInKobo,
      interval, // 'monthly', 'yearly', 'weekly', 'daily'
      description,
    });
  }

  // Get plan
  async getPlan(planIdOrCode) {
    return this.request('GET', `/plan/${planIdOrCode}`);
  }

  // List plans
  async listPlans() {
    return this.request('GET', '/plan');
  }

  // Create subscription
  async createSubscription({ customer, plan, startDate, authorization }) {
    const payload = {
      customer,
      plan,
    };

    if (startDate) {
      payload.start_date = startDate;
    }

    if (authorization) {
      payload.authorization = authorization;
    }

    return this.request('POST', '/subscription', payload);
  }

  // Get subscription
  async getSubscription(idOrCode) {
    return this.request('GET', `/subscription/${idOrCode}`);
  }

  // Enable subscription
  async enableSubscription({ code, token }) {
    return this.request('POST', '/subscription/enable', { code, token });
  }

  // Disable subscription
  async disableSubscription({ code, token }) {
    return this.request('POST', '/subscription/disable', { code, token });
  }

  // Charge authorization (for recurring payments)
  async chargeAuthorization({ email, amount, authorizationCode, reference, metadata }) {
    const amountInKobo = Math.round(amount * 100);

    return this.request('POST', '/transaction/charge_authorization', {
      email,
      amount: amountInKobo,
      authorization_code: authorizationCode,
      reference,
      metadata,
    });
  }

  // List banks
  async listBanks(country = 'nigeria') {
    return this.request('GET', `/bank?country=${country}`);
  }

  // Resolve account number
  async resolveAccountNumber(accountNumber, bankCode) {
    return this.request('GET', `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
  }

  // Generate reference
  generateReference(prefix = 'ERP') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }

  // Verify webhook signature
  async verifyWebhookSignature(body, signature) {
    const settings = await PaymentSettings.getSettings();
    const secret = settings.getPaystackWebhookSecret();

    if (!secret) {
      console.warn('Webhook secret not configured');
      return false;
    }

    const crypto = await import('crypto');
    const hash = crypto.createHmac('sha512', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    return hash === signature;
  }
}

export default new PaystackService();
