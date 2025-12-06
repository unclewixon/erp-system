import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import { ROLES, SUBSCRIPTION_PLANS, MODULES } from '../config/constants.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // 1. Create Super Admin (Platform Owner)
    let superAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });

    if (!superAdmin) {
      superAdmin = await User.create({
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@erp.com',
        password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123',
        firstName: 'Super',
        lastName: 'Admin',
        role: ROLES.SUPER_ADMIN,
        isEmailVerified: true,
        isActive: true,
      });
      console.log('Super Admin created!');
    } else {
      console.log('Super Admin already exists:', superAdmin.email);
    }

    // 2. Create Demo Organization with Enterprise Plan
    let demoTenant = await Tenant.findOne({ slug: 'demo-company' });

    if (!demoTenant) {
      demoTenant = await Tenant.create({
        name: 'Demo Company',
        slug: 'demo-company',
        email: 'demo@company.com',
        phone: '+234 800 000 0000',
        industry: 'Technology',
        size: '51-200',
        subscription: {
          plan: SUBSCRIPTION_PLANS.ENTERPRISE,
          modules: Object.values(MODULES), // All modules
          maxEmployees: -1, // Unlimited
          maxBranches: -1,
          startDate: new Date(),
          isActive: true,
        },
        settings: {
          timezone: 'Africa/Lagos',
          currency: 'NGN',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          workingHours: { start: '09:00', end: '17:00' },
        },
        isActive: true,
      });
      console.log('Demo Company tenant created!');
    } else {
      console.log('Demo Company tenant already exists');
    }

    // 3. Create Tenant Admin (Organization Admin with full access)
    let tenantAdmin = await User.findOne({ email: 'demo@company.com' });

    if (!tenantAdmin) {
      tenantAdmin = await User.create({
        email: 'demo@company.com',
        password: 'Demo@123',
        firstName: 'Demo',
        lastName: 'Admin',
        role: ROLES.TENANT_ADMIN,
        tenant: demoTenant._id,
        isEmailVerified: true,
        isActive: true,
        permissions: Object.values(MODULES).map(module => ({
          module,
          actions: ['create', 'read', 'update', 'delete'],
        })),
      });

      // Update tenant with creator
      demoTenant.createdBy = tenantAdmin._id;
      await demoTenant.save();

      console.log('Tenant Admin created!');
    } else {
      console.log('Tenant Admin already exists:', tenantAdmin.email);
    }

    console.log('\n========================================');
    console.log('SEEDING COMPLETE!');
    console.log('========================================');
    console.log('\nLogin Credentials:');
    console.log('----------------------------------------');
    console.log('SUPER ADMIN (Platform Owner):');
    console.log('  Email: admin@erp.com');
    console.log('  Password: Admin@123');
    console.log('----------------------------------------');
    console.log('TENANT ADMIN (Demo Company - All Features):');
    console.log('  Email: demo@company.com');
    console.log('  Password: Demo@123');
    console.log('----------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
