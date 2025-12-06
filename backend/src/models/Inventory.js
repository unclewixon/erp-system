import mongoose from 'mongoose';

// ============ WAREHOUSE / LOCATION ============
const warehouseSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['warehouse', 'store', 'production', 'transit', 'quarantine'], default: 'warehouse' },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
  },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  contact: {
    phone: String,
    email: String,
  },
  capacity: {
    totalArea: Number, // sq meters
    usableArea: Number,
    totalBins: Number,
  },
  locations: [{
    code: { type: String, required: true },
    name: String,
    zone: String, // A, B, C zones
    aisle: String,
    rack: String,
    shelf: String,
    bin: String,
    type: { type: String, enum: ['storage', 'picking', 'receiving', 'shipping', 'staging', 'quarantine'], default: 'storage' },
    capacity: Number,
    isActive: { type: Boolean, default: true },
  }],
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

warehouseSchema.index({ tenant: 1, code: 1 }, { unique: true });

// ============ PRODUCT CATEGORY ============
const productCategorySchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory' },
  description: String,
  attributes: [{
    name: String,
    type: { type: String, enum: ['text', 'number', 'boolean', 'select'] },
    options: [String], // for select type
    required: Boolean,
  }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

productCategorySchema.index({ tenant: 1, code: 1 }, { unique: true });

// ============ UNIT OF MEASURE ============
const unitOfMeasureSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  category: { type: String, enum: ['quantity', 'weight', 'volume', 'length', 'area', 'time'], required: true },
  baseUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'UnitOfMeasure' },
  conversionFactor: { type: Number, default: 1 }, // relative to base unit
  isBase: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

unitOfMeasureSchema.index({ tenant: 1, symbol: 1 }, { unique: true });

// ============ PRODUCT / ITEM MASTER ============
const productSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  sku: { type: String, required: true },
  barcode: String,
  name: { type: String, required: true },
  description: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory' },
  type: { type: String, enum: ['stockable', 'consumable', 'service'], default: 'stockable' },

  // Units
  primaryUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'UnitOfMeasure', required: true },
  secondaryUnits: [{
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'UnitOfMeasure' },
    conversionRate: Number, // 1 primary = X secondary
  }],

  // Tracking
  trackingMethod: { type: String, enum: ['none', 'batch', 'serial', 'both'], default: 'none' },
  hasExpiryDate: { type: Boolean, default: false },
  shelfLifeDays: Number,

  // Pricing
  costingMethod: { type: String, enum: ['fifo', 'lifo', 'average', 'standard'], default: 'average' },
  standardCost: { type: Number, default: 0 },
  lastPurchasePrice: { type: Number, default: 0 },
  averageCost: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },

  // Inventory Control
  reorderPoint: { type: Number, default: 0 },
  reorderQuantity: { type: Number, default: 0 },
  safetyStock: { type: Number, default: 0 },
  maxStock: Number,
  minStock: { type: Number, default: 0 },
  leadTimeDays: { type: Number, default: 0 },

  // Physical
  weight: Number,
  weightUnit: String,
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: String,
  },

  // Custom Attributes
  attributes: mongoose.Schema.Types.Mixed,

  // Vendor Info
  preferredVendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  vendorProducts: [{
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendorSku: String,
    vendorProductName: String,
    unitPrice: Number,
    minOrderQty: Number,
    leadTimeDays: Number,
  }],

  // Media
  images: [String],

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

productSchema.index({ tenant: 1, sku: 1 }, { unique: true });
productSchema.index({ tenant: 1, barcode: 1 }, { sparse: true });
productSchema.index({ tenant: 1, category: 1 });
productSchema.index({ tenant: 1, name: 'text', sku: 'text' });

// ============ BATCH / LOT ============
const batchSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  batchNumber: { type: String, required: true },
  manufacturingDate: Date,
  expiryDate: Date,
  status: { type: String, enum: ['active', 'expired', 'recalled', 'consumed'], default: 'active' },
  notes: String,
  attributes: mongoose.Schema.Types.Mixed, // custom batch attributes
}, { timestamps: true });

batchSchema.index({ tenant: 1, product: 1, batchNumber: 1 }, { unique: true });

// ============ SERIAL NUMBER ============
const serialNumberSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  serialNumber: { type: String, required: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  status: { type: String, enum: ['available', 'reserved', 'sold', 'returned', 'scrapped'], default: 'available' },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  location: String,
  receivedDate: Date,
  soldDate: Date,
  warrantyEndDate: Date,
  notes: String,
}, { timestamps: true });

serialNumberSchema.index({ tenant: 1, serialNumber: 1 }, { unique: true });
serialNumberSchema.index({ tenant: 1, product: 1, status: 1 });

// ============ STOCK / INVENTORY ============
const stockSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  location: String, // bin location code
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },

  // Quantities
  quantityOnHand: { type: Number, default: 0 },
  quantityReserved: { type: Number, default: 0 },
  quantityAllocated: { type: Number, default: 0 },
  quantityInTransit: { type: Number, default: 0 },
  quantityOnOrder: { type: Number, default: 0 },

  // Valuation
  unitCost: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },

  lastStockTakeDate: Date,
  lastMovementDate: Date,
}, { timestamps: true });

stockSchema.index({ tenant: 1, product: 1, warehouse: 1, location: 1, batch: 1 }, { unique: true });
stockSchema.index({ tenant: 1, warehouse: 1 });

// Virtual for available quantity
stockSchema.virtual('quantityAvailable').get(function() {
  return this.quantityOnHand - this.quantityReserved - this.quantityAllocated;
});

// ============ STOCK MOVEMENT ============
const stockMovementSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  movementNumber: { type: String, required: true },
  movementDate: { type: Date, default: Date.now },

  type: {
    type: String,
    enum: [
      'receipt',         // goods received
      'issue',           // goods issued
      'transfer',        // warehouse to warehouse
      'adjustment',      // inventory adjustment
      'return_in',       // customer return
      'return_out',      // return to vendor
      'production_in',   // finished goods from production
      'production_out',  // raw materials to production
      'scrap',          // scrapped items
      'count',          // stock count adjustment
    ],
    required: true,
  },

  status: { type: String, enum: ['draft', 'confirmed', 'completed', 'cancelled'], default: 'draft' },

  // Source/Destination
  sourceWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  sourceLocation: String,
  destinationWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  destinationLocation: String,

  // Reference
  referenceType: { type: String, enum: ['purchase_order', 'sales_order', 'transfer_order', 'production_order', 'manual', 'grn'] },
  referenceId: mongoose.Schema.Types.ObjectId,
  referenceNumber: String,

  lines: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    serialNumbers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SerialNumber' }],
    quantity: { type: Number, required: true },
    unitCost: Number,
    totalCost: Number,
    reason: String,
  }],

  totalItems: { type: Number, default: 0 },
  totalQuantity: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },

  notes: String,

  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

stockMovementSchema.index({ tenant: 1, movementNumber: 1 }, { unique: true });
stockMovementSchema.index({ tenant: 1, type: 1, movementDate: 1 });
stockMovementSchema.index({ tenant: 1, referenceType: 1, referenceId: 1 });

// Auto-generate movement number
stockMovementSchema.pre('save', async function(next) {
  if (this.isNew && !this.movementNumber) {
    const prefix = {
      'receipt': 'RCV',
      'issue': 'ISS',
      'transfer': 'TRF',
      'adjustment': 'ADJ',
      'return_in': 'RTI',
      'return_out': 'RTO',
      'production_in': 'PIN',
      'production_out': 'POT',
      'scrap': 'SCP',
      'count': 'CNT',
    }[this.type] || 'MOV';

    const count = await this.constructor.countDocuments({ tenant: this.tenant, type: this.type });
    this.movementNumber = `${prefix}-${String(count + 1).padStart(6, '0')}`;
  }

  // Calculate totals
  if (this.lines && this.lines.length > 0) {
    this.totalItems = this.lines.length;
    this.totalQuantity = this.lines.reduce((sum, line) => sum + line.quantity, 0);
    this.totalValue = this.lines.reduce((sum, line) => sum + (line.totalCost || 0), 0);
  }

  next();
});

// ============ STOCK TAKE / PHYSICAL COUNT ============
const stockTakeSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  stockTakeNumber: { type: String, required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  location: String, // specific location or null for entire warehouse

  type: { type: String, enum: ['full', 'cycle', 'spot', 'annual'], default: 'full' },
  status: { type: String, enum: ['planned', 'in_progress', 'counting', 'review', 'completed', 'cancelled'], default: 'planned' },

  plannedDate: Date,
  startedAt: Date,
  completedAt: Date,

  // Filters
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory' }],
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  lines: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    location: String,

    // Book quantities
    bookQuantity: { type: Number, default: 0 },
    bookValue: { type: Number, default: 0 },

    // Counted quantities
    countedQuantity: Number,
    countedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    countedAt: Date,

    // Recount (if variance > threshold)
    recountQuantity: Number,
    recountedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recountedAt: Date,

    // Final
    finalQuantity: Number,
    variance: Number,
    varianceValue: Number,
    variancePercent: Number,

    adjustmentReason: String,
    notes: String,
    status: { type: String, enum: ['pending', 'counted', 'recounted', 'approved', 'adjusted'], default: 'pending' },
  }],

  // Summary
  totalItems: { type: Number, default: 0 },
  totalBookValue: { type: Number, default: 0 },
  totalCountedValue: { type: Number, default: 0 },
  totalVarianceValue: { type: Number, default: 0 },
  varianceThreshold: { type: Number, default: 5 }, // percent

  adjustmentMovement: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },

  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
}, { timestamps: true });

stockTakeSchema.index({ tenant: 1, stockTakeNumber: 1 }, { unique: true });
stockTakeSchema.index({ tenant: 1, warehouse: 1, status: 1 });

stockTakeSchema.pre('save', async function(next) {
  if (this.isNew && !this.stockTakeNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.stockTakeNumber = `STK-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// ============ STOCK RESERVATION ============
const stockReservationSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  reservationNumber: { type: String, required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },

  quantity: { type: Number, required: true },
  quantityFulfilled: { type: Number, default: 0 },

  // Reference
  referenceType: { type: String, enum: ['sales_order', 'production_order', 'transfer_order', 'manual'] },
  referenceId: mongoose.Schema.Types.ObjectId,
  referenceNumber: String,

  status: { type: String, enum: ['active', 'partial', 'fulfilled', 'cancelled', 'expired'], default: 'active' },
  priority: { type: Number, default: 0 },

  reservedAt: { type: Date, default: Date.now },
  expiresAt: Date,
  fulfilledAt: Date,

  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

stockReservationSchema.index({ tenant: 1, reservationNumber: 1 }, { unique: true });
stockReservationSchema.index({ tenant: 1, product: 1, warehouse: 1, status: 1 });

// ============ REORDER ALERT ============
const reorderAlertSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },

  alertType: { type: String, enum: ['reorder_point', 'safety_stock', 'min_stock', 'expiring', 'expired'], required: true },

  currentQuantity: Number,
  thresholdQuantity: Number,
  reorderQuantity: Number,

  status: { type: String, enum: ['open', 'acknowledged', 'ordered', 'resolved', 'ignored'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },

  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,

  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  notes: String,
}, { timestamps: true });

reorderAlertSchema.index({ tenant: 1, status: 1, priority: 1 });
reorderAlertSchema.index({ tenant: 1, product: 1 });

export const Warehouse = mongoose.model('Warehouse', warehouseSchema);
export const ProductCategory = mongoose.model('ProductCategory', productCategorySchema);
export const UnitOfMeasure = mongoose.model('UnitOfMeasure', unitOfMeasureSchema);
export const Product = mongoose.model('Product', productSchema);
export const Batch = mongoose.model('Batch', batchSchema);
export const SerialNumber = mongoose.model('SerialNumber', serialNumberSchema);
export const Stock = mongoose.model('Stock', stockSchema);
export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export const StockTake = mongoose.model('StockTake', stockTakeSchema);
export const StockReservation = mongoose.model('StockReservation', stockReservationSchema);
export const ReorderAlert = mongoose.model('ReorderAlert', reorderAlertSchema);
