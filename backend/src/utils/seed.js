import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { ROLES } from '../config/constants.js';

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Check if super admin exists
    const existingAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });

    if (existingAdmin) {
      console.log('Super Admin already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create super admin
    const superAdmin = await User.create({
      email: process.env.SUPER_ADMIN_EMAIL || 'admin@erp.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123',
      firstName: 'Super',
      lastName: 'Admin',
      role: ROLES.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    });

    console.log('Super Admin created successfully!');
    console.log('Email:', superAdmin.email);
    console.log('Password:', process.env.SUPER_ADMIN_PASSWORD || 'Admin@123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
