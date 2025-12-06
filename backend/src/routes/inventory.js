import express from 'express';
import { protect, authorize, tenantGuard } from '../middleware/auth.js';
import {
  Warehouse,
  ProductCategory,
  UnitOfMeasure,
  Product,
  Batch,
  SerialNumber,
  Stock,
  StockMovement,
  StockTake,
  StockReservation,
  ReorderAlert,
} from '../models/Inventory.js';
import { AuditLog } from '../models/AuditLog.js';

const router = express.Router();

router.use(protect);
router.use(tenantGuard);

// Helper function to create audit log
const createAuditLog = async (req, action, entityType, entityId, entityNumber, entityName, changes = {}, inventoryDetails = {}) => {
  try {
    await AuditLog.log({
      tenant: req.user.tenant,
      action,
      entityType,
      entityId,
      entityNumber,
      entityName,
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      userRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      changes,
      metadata: { module: 'inventory' },
      inventoryDetails,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

// ============ WAREHOUSES ============

router.get('/warehouses', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'warehouse_manager', 'store_keeper'), async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const query = { tenant: req.user.tenant };

    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const warehouses = await Warehouse.find(query)
      .populate('manager', 'firstName lastName')
      .sort({ name: 1 });

    res.json({ success: true, data: warehouses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/warehouses/:id', async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    }).populate('manager', 'firstName lastName email');

    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    res.json({ success: true, data: warehouse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/warehouses', authorize('super_admin', 'tenant_admin', 'inventory_manager'), async (req, res) => {
  try {
    const warehouse = await Warehouse.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    await createAuditLog(req, 'create', 'warehouse', warehouse._id, warehouse.code, warehouse.name, { after: warehouse.toObject() });

    res.status(201).json({ success: true, data: warehouse });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/warehouses/:id', authorize('super_admin', 'tenant_admin', 'inventory_manager'), async (req, res) => {
  try {
    const before = await Warehouse.findOne({ _id: req.params.id, tenant: req.user.tenant });
    if (!before) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    const warehouse = await Warehouse.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    await createAuditLog(req, 'update', 'warehouse', warehouse._id, warehouse.code, warehouse.name, { before: before.toObject(), after: warehouse.toObject() });

    res.json({ success: true, data: warehouse });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ PRODUCT CATEGORIES ============

router.get('/categories', async (req, res) => {
  try {
    const categories = await ProductCategory.find({
      tenant: req.user.tenant,
      isActive: true,
    })
      .populate('parentCategory', 'name code')
      .sort({ name: 1 });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/categories', authorize('super_admin', 'tenant_admin', 'inventory_manager'), async (req, res) => {
  try {
    const category = await ProductCategory.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ UNITS OF MEASURE ============

router.get('/units', async (req, res) => {
  try {
    const { category } = req.query;
    const query = { tenant: req.user.tenant, isActive: true };
    if (category) query.category = category;

    const units = await UnitOfMeasure.find(query)
      .populate('baseUnit', 'name symbol')
      .sort({ category: 1, name: 1 });

    res.json({ success: true, data: units });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/units', authorize('super_admin', 'tenant_admin', 'inventory_manager'), async (req, res) => {
  try {
    const unit = await UnitOfMeasure.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: unit });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ PRODUCTS ============

router.get('/products', async (req, res) => {
  try {
    const { category, type, search, isActive } = req.query;
    const query = { tenant: req.user.tenant };

    if (category) query.category = category;
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('primaryUnit', 'name symbol')
      .sort({ name: 1 });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('category', 'name code')
      .populate('primaryUnit', 'name symbol')
      .populate('preferredVendor', 'name code')
      .populate('vendorProducts.vendor', 'name code');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Get stock levels
    const stocks = await Stock.find({
      tenant: req.user.tenant,
      product: product._id,
    }).populate('warehouse', 'name code');

    res.json({ success: true, data: { ...product.toObject(), stocks } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/products', authorize('super_admin', 'tenant_admin', 'inventory_manager'), async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    await createAuditLog(req, 'create', 'product', product._id, product.sku, product.name, { after: product.toObject() });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/products/:id', authorize('super_admin', 'tenant_admin', 'inventory_manager'), async (req, res) => {
  try {
    const before = await Product.findOne({ _id: req.params.id, tenant: req.user.tenant });
    if (!before) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    await createAuditLog(req, 'update', 'product', product._id, product.sku, product.name, { before: before.toObject(), after: product.toObject() });

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ BATCHES ============

router.get('/batches', async (req, res) => {
  try {
    const { product, status } = req.query;
    const query = { tenant: req.user.tenant };

    if (product) query.product = product;
    if (status) query.status = status;

    const batches = await Batch.find(query)
      .populate('product', 'name sku')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/batches', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'warehouse_manager'), async (req, res) => {
  try {
    const batch = await Batch.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ SERIAL NUMBERS ============

router.get('/serials', async (req, res) => {
  try {
    const { product, status, warehouse } = req.query;
    const query = { tenant: req.user.tenant };

    if (product) query.product = product;
    if (status) query.status = status;
    if (warehouse) query.warehouse = warehouse;

    const serials = await SerialNumber.find(query)
      .populate('product', 'name sku')
      .populate('warehouse', 'name code')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: serials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/serials', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'warehouse_manager'), async (req, res) => {
  try {
    const serial = await SerialNumber.create({
      ...req.body,
      tenant: req.user.tenant,
    });

    res.status(201).json({ success: true, data: serial });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ STOCK / INVENTORY LEVELS ============

router.get('/stock', async (req, res) => {
  try {
    const { warehouse, product, lowStock, category } = req.query;
    const query = { tenant: req.user.tenant };

    if (warehouse) query.warehouse = warehouse;
    if (product) query.product = product;

    let stocks = await Stock.find(query)
      .populate('product', 'name sku category reorderPoint safetyStock')
      .populate('warehouse', 'name code')
      .populate('batch', 'batchNumber expiryDate');

    // Filter low stock
    if (lowStock === 'true') {
      stocks = stocks.filter(s =>
        s.product && s.quantityOnHand <= (s.product.reorderPoint || 0)
      );
    }

    // Filter by category
    if (category) {
      stocks = stocks.filter(s =>
        s.product && s.product.category?.toString() === category
      );
    }

    res.json({ success: true, data: stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stock/summary', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'finance_manager'), async (req, res) => {
  try {
    const [stockSummary, lowStockCount, expiringBatches, warehouseSummary] = await Promise.all([
      // Total stock value
      Stock.aggregate([
        { $match: { tenant: req.user.tenant } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalQuantity: { $sum: '$quantityOnHand' },
            totalValue: { $sum: '$totalValue' },
            totalReserved: { $sum: '$quantityReserved' },
          },
        },
      ]),

      // Low stock count
      Stock.aggregate([
        { $match: { tenant: req.user.tenant } },
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'productInfo',
          },
        },
        { $unwind: '$productInfo' },
        {
          $match: {
            $expr: { $lte: ['$quantityOnHand', '$productInfo.reorderPoint'] },
          },
        },
        { $count: 'count' },
      ]),

      // Expiring batches (next 30 days)
      Batch.countDocuments({
        tenant: req.user.tenant,
        status: 'active',
        expiryDate: {
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          $gte: new Date(),
        },
      }),

      // By warehouse
      Stock.aggregate([
        { $match: { tenant: req.user.tenant } },
        {
          $group: {
            _id: '$warehouse',
            totalQuantity: { $sum: '$quantityOnHand' },
            totalValue: { $sum: '$totalValue' },
            itemCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'warehouses',
            localField: '_id',
            foreignField: '_id',
            as: 'warehouse',
          },
        },
        { $unwind: '$warehouse' },
        {
          $project: {
            warehouseName: '$warehouse.name',
            warehouseCode: '$warehouse.code',
            totalQuantity: 1,
            totalValue: 1,
            itemCount: 1,
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        summary: stockSummary[0] || { totalItems: 0, totalQuantity: 0, totalValue: 0, totalReserved: 0 },
        lowStockCount: lowStockCount[0]?.count || 0,
        expiringBatches,
        byWarehouse: warehouseSummary,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ STOCK MOVEMENTS ============

router.get('/movements', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'warehouse_manager', 'store_keeper'), async (req, res) => {
  try {
    const { type, status, warehouse, startDate, endDate, product } = req.query;
    const query = { tenant: req.user.tenant };

    if (type) query.type = type;
    if (status) query.status = status;
    if (warehouse) {
      query.$or = [
        { sourceWarehouse: warehouse },
        { destinationWarehouse: warehouse },
      ];
    }
    if (product) query['lines.product'] = product;
    if (startDate || endDate) {
      query.movementDate = {};
      if (startDate) query.movementDate.$gte = new Date(startDate);
      if (endDate) query.movementDate.$lte = new Date(endDate);
    }

    const movements = await StockMovement.find(query)
      .populate('lines.product', 'name sku')
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ movementDate: -1, createdAt: -1 });

    res.json({ success: true, data: movements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/movements/:id', async (req, res) => {
  try {
    const movement = await StockMovement.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('lines.product', 'name sku barcode')
      .populate('lines.batch', 'batchNumber')
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('processedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!movement) {
      return res.status(404).json({ success: false, message: 'Movement not found' });
    }

    res.json({ success: true, data: movement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/movements', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'warehouse_manager', 'store_keeper'), async (req, res) => {
  try {
    const movement = await StockMovement.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user._id,
    });

    const populated = await StockMovement.findById(movement._id)
      .populate('lines.product', 'name sku')
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code');

    await createAuditLog(
      req,
      'create',
      'stock_movement',
      movement._id,
      movement.movementNumber,
      `${movement.type} movement`,
      { after: movement.toObject() },
      { movementType: movement.type, quantity: movement.totalQuantity, totalValue: movement.totalValue }
    );

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/movements/:id/confirm', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'warehouse_manager'), async (req, res) => {
  try {
    const movement = await StockMovement.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: 'draft',
    }).populate('lines.product');

    if (!movement) {
      return res.status(404).json({ success: false, message: 'Movement not found or already confirmed' });
    }

    // Update stock levels based on movement type
    for (const line of movement.lines) {
      const product = line.product;

      if (['issue', 'return_out', 'production_out', 'scrap'].includes(movement.type)) {
        // Decrease stock
        const stock = await Stock.findOne({
          tenant: req.user.tenant,
          product: product._id,
          warehouse: movement.sourceWarehouse,
          batch: line.batch || null,
        });

        if (stock) {
          const previousQty = stock.quantityOnHand;
          stock.quantityOnHand -= line.quantity;
          stock.totalValue = stock.quantityOnHand * stock.unitCost;
          stock.lastMovementDate = new Date();
          await stock.save();

          await createAuditLog(
            req,
            'stock_out',
            'stock',
            stock._id,
            movement.movementNumber,
            product.name,
            {},
            {
              movementType: movement.type,
              sourceWarehouse: movement.sourceWarehouse,
              quantity: line.quantity,
              previousQuantity: previousQty,
              newQuantity: stock.quantityOnHand,
            }
          );
        }
      }

      if (['receipt', 'return_in', 'production_in'].includes(movement.type)) {
        // Increase stock
        let stock = await Stock.findOne({
          tenant: req.user.tenant,
          product: product._id,
          warehouse: movement.destinationWarehouse,
          batch: line.batch || null,
        });

        if (!stock) {
          stock = new Stock({
            tenant: req.user.tenant,
            product: product._id,
            warehouse: movement.destinationWarehouse,
            batch: line.batch,
            quantityOnHand: 0,
            unitCost: line.unitCost || product.averageCost || 0,
          });
        }

        const previousQty = stock.quantityOnHand;
        stock.quantityOnHand += line.quantity;

        // Update average cost
        if (line.unitCost) {
          const totalCost = (previousQty * stock.unitCost) + (line.quantity * line.unitCost);
          stock.unitCost = totalCost / stock.quantityOnHand;
        }

        stock.totalValue = stock.quantityOnHand * stock.unitCost;
        stock.lastMovementDate = new Date();
        await stock.save();

        // Update product average cost
        await Product.findByIdAndUpdate(product._id, {
          averageCost: stock.unitCost,
          lastPurchasePrice: line.unitCost || product.lastPurchasePrice,
        });

        await createAuditLog(
          req,
          'stock_in',
          'stock',
          stock._id,
          movement.movementNumber,
          product.name,
          {},
          {
            movementType: movement.type,
            destinationWarehouse: movement.destinationWarehouse,
            quantity: line.quantity,
            previousQuantity: previousQty,
            newQuantity: stock.quantityOnHand,
            unitCost: line.unitCost,
          }
        );
      }

      if (movement.type === 'transfer') {
        // Decrease from source
        const sourceStock = await Stock.findOne({
          tenant: req.user.tenant,
          product: product._id,
          warehouse: movement.sourceWarehouse,
          batch: line.batch || null,
        });

        if (sourceStock) {
          sourceStock.quantityOnHand -= line.quantity;
          sourceStock.totalValue = sourceStock.quantityOnHand * sourceStock.unitCost;
          sourceStock.lastMovementDate = new Date();
          await sourceStock.save();
        }

        // Increase at destination
        let destStock = await Stock.findOne({
          tenant: req.user.tenant,
          product: product._id,
          warehouse: movement.destinationWarehouse,
          batch: line.batch || null,
        });

        if (!destStock) {
          destStock = new Stock({
            tenant: req.user.tenant,
            product: product._id,
            warehouse: movement.destinationWarehouse,
            batch: line.batch,
            quantityOnHand: 0,
            unitCost: sourceStock?.unitCost || product.averageCost || 0,
          });
        }

        destStock.quantityOnHand += line.quantity;
        destStock.totalValue = destStock.quantityOnHand * destStock.unitCost;
        destStock.lastMovementDate = new Date();
        await destStock.save();

        await createAuditLog(
          req,
          'stock_transfer',
          'stock',
          destStock._id,
          movement.movementNumber,
          product.name,
          {},
          {
            movementType: 'transfer',
            sourceWarehouse: movement.sourceWarehouse,
            destinationWarehouse: movement.destinationWarehouse,
            quantity: line.quantity,
          }
        );
      }

      if (movement.type === 'adjustment' || movement.type === 'count') {
        // Direct adjustment
        let stock = await Stock.findOne({
          tenant: req.user.tenant,
          product: product._id,
          warehouse: movement.destinationWarehouse || movement.sourceWarehouse,
          batch: line.batch || null,
        });

        if (!stock) {
          stock = new Stock({
            tenant: req.user.tenant,
            product: product._id,
            warehouse: movement.destinationWarehouse || movement.sourceWarehouse,
            batch: line.batch,
            quantityOnHand: 0,
            unitCost: product.averageCost || 0,
          });
        }

        const previousQty = stock.quantityOnHand;
        stock.quantityOnHand += line.quantity; // Can be negative for decrease
        stock.totalValue = stock.quantityOnHand * stock.unitCost;
        stock.lastMovementDate = new Date();
        if (movement.type === 'count') {
          stock.lastStockTakeDate = new Date();
        }
        await stock.save();

        await createAuditLog(
          req,
          'stock_adjust',
          'stock',
          stock._id,
          movement.movementNumber,
          product.name,
          {},
          {
            movementType: movement.type,
            quantity: line.quantity,
            previousQuantity: previousQty,
            newQuantity: stock.quantityOnHand,
          }
        );
      }

      // Check for reorder alerts
      const totalStock = await Stock.aggregate([
        { $match: { tenant: req.user.tenant, product: product._id } },
        { $group: { _id: null, total: { $sum: '$quantityOnHand' } } },
      ]);

      const totalQty = totalStock[0]?.total || 0;
      if (totalQty <= product.reorderPoint) {
        const existingAlert = await ReorderAlert.findOne({
          tenant: req.user.tenant,
          product: product._id,
          status: 'open',
        });

        if (!existingAlert) {
          await ReorderAlert.create({
            tenant: req.user.tenant,
            product: product._id,
            alertType: totalQty <= product.safetyStock ? 'safety_stock' : 'reorder_point',
            currentQuantity: totalQty,
            thresholdQuantity: product.reorderPoint,
            reorderQuantity: product.reorderQuantity,
            priority: totalQty <= product.minStock ? 'critical' : totalQty <= product.safetyStock ? 'high' : 'medium',
          });
        }
      }
    }

    movement.status = 'completed';
    movement.processedBy = req.user._id;
    movement.processedAt = new Date();
    await movement.save();

    res.json({ success: true, data: movement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ STOCK TAKES ============

router.get('/stocktakes', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'warehouse_manager'), async (req, res) => {
  try {
    const { status, warehouse } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (warehouse) query.warehouse = warehouse;

    const stockTakes = await StockTake.find(query)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: stockTakes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/stocktakes', authorize('super_admin', 'tenant_admin', 'inventory_manager'), async (req, res) => {
  try {
    // Get current stock for the warehouse
    const query = { tenant: req.user.tenant, warehouse: req.body.warehouse };

    if (req.body.categories && req.body.categories.length > 0) {
      const products = await Product.find({
        tenant: req.user.tenant,
        category: { $in: req.body.categories },
      }).select('_id');
      query.product = { $in: products.map(p => p._id) };
    }

    if (req.body.products && req.body.products.length > 0) {
      query.product = { $in: req.body.products };
    }

    const stocks = await Stock.find(query).populate('product', 'name sku');

    const lines = stocks.map(stock => ({
      product: stock.product._id,
      batch: stock.batch,
      location: stock.location,
      bookQuantity: stock.quantityOnHand,
      bookValue: stock.totalValue,
      status: 'pending',
    }));

    const stockTake = await StockTake.create({
      ...req.body,
      tenant: req.user.tenant,
      lines,
      totalItems: lines.length,
      totalBookValue: lines.reduce((sum, l) => sum + l.bookValue, 0),
      createdBy: req.user._id,
    });

    const populated = await StockTake.findById(stockTake._id)
      .populate('warehouse', 'name code')
      .populate('lines.product', 'name sku');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/stocktakes/:id/count', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'warehouse_manager', 'store_keeper'), async (req, res) => {
  try {
    const { lineId, countedQuantity } = req.body;

    const stockTake = await StockTake.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['planned', 'in_progress', 'counting'] },
    });

    if (!stockTake) {
      return res.status(404).json({ success: false, message: 'Stock take not found' });
    }

    const line = stockTake.lines.id(lineId);
    if (!line) {
      return res.status(404).json({ success: false, message: 'Line not found' });
    }

    line.countedQuantity = countedQuantity;
    line.countedBy = req.user._id;
    line.countedAt = new Date();
    line.variance = countedQuantity - line.bookQuantity;
    line.variancePercent = line.bookQuantity > 0
      ? ((line.variance / line.bookQuantity) * 100).toFixed(2)
      : 0;

    // Check if recount needed
    if (Math.abs(line.variancePercent) > stockTake.varianceThreshold) {
      line.status = 'counted'; // Needs review
    } else {
      line.finalQuantity = countedQuantity;
      line.status = 'approved';
    }

    if (stockTake.status === 'planned') {
      stockTake.status = 'counting';
      stockTake.startedAt = new Date();
    }

    await stockTake.save();

    res.json({ success: true, data: stockTake });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/stocktakes/:id/complete', authorize('super_admin', 'tenant_admin', 'inventory_manager'), async (req, res) => {
  try {
    const stockTake = await StockTake.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['counting', 'review'] },
    }).populate('lines.product');

    if (!stockTake) {
      return res.status(404).json({ success: false, message: 'Stock take not found' });
    }

    // Create adjustment movement for variances
    const adjustmentLines = stockTake.lines
      .filter(line => line.variance !== 0 && line.finalQuantity !== undefined)
      .map(line => ({
        product: line.product._id,
        batch: line.batch,
        quantity: line.variance,
        reason: line.adjustmentReason || 'Stock take adjustment',
      }));

    if (adjustmentLines.length > 0) {
      const movement = await StockMovement.create({
        tenant: req.user.tenant,
        type: 'count',
        status: 'draft',
        destinationWarehouse: stockTake.warehouse,
        referenceType: 'manual',
        referenceNumber: stockTake.stockTakeNumber,
        lines: adjustmentLines,
        notes: `Adjustment from stock take ${stockTake.stockTakeNumber}`,
        createdBy: req.user._id,
      });

      stockTake.adjustmentMovement = movement._id;
    }

    // Calculate summary
    stockTake.totalCountedValue = stockTake.lines.reduce((sum, l) =>
      sum + ((l.finalQuantity || l.countedQuantity || 0) * (l.bookValue / l.bookQuantity || 0)), 0);
    stockTake.totalVarianceValue = stockTake.totalCountedValue - stockTake.totalBookValue;

    stockTake.status = 'completed';
    stockTake.completedAt = new Date();
    stockTake.approvedBy = req.user._id;
    stockTake.approvedAt = new Date();
    await stockTake.save();

    await createAuditLog(
      req,
      'stock_count',
      'stock_take',
      stockTake._id,
      stockTake.stockTakeNumber,
      `Stock take at ${stockTake.warehouse}`,
      {},
      { totalValue: stockTake.totalCountedValue }
    );

    res.json({ success: true, data: stockTake });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ RESERVATIONS ============

router.get('/reservations', async (req, res) => {
  try {
    const { product, status, warehouse } = req.query;
    const query = { tenant: req.user.tenant };

    if (product) query.product = product;
    if (status) query.status = status;
    if (warehouse) query.warehouse = warehouse;

    const reservations = await StockReservation.find(query)
      .populate('product', 'name sku')
      .populate('warehouse', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: reservations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/reservations', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'sales_manager'), async (req, res) => {
  try {
    // Check available quantity
    const stock = await Stock.findOne({
      tenant: req.user.tenant,
      product: req.body.product,
      warehouse: req.body.warehouse,
    });

    if (!stock || stock.quantityOnHand - stock.quantityReserved < req.body.quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock available' });
    }

    const count = await StockReservation.countDocuments({ tenant: req.user.tenant });

    const reservation = await StockReservation.create({
      ...req.body,
      tenant: req.user.tenant,
      reservationNumber: `RES-${String(count + 1).padStart(6, '0')}`,
      createdBy: req.user._id,
    });

    // Update reserved quantity
    stock.quantityReserved += req.body.quantity;
    await stock.save();

    await createAuditLog(req, 'stock_reserve', 'stock', stock._id, reservation.reservationNumber, null, {}, { quantity: req.body.quantity });

    res.status(201).json({ success: true, data: reservation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/reservations/:id/release', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'sales_manager'), async (req, res) => {
  try {
    const reservation = await StockReservation.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
      status: { $in: ['active', 'partial'] },
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const stock = await Stock.findOne({
      tenant: req.user.tenant,
      product: reservation.product,
      warehouse: reservation.warehouse,
    });

    if (stock) {
      const releaseQty = reservation.quantity - reservation.quantityFulfilled;
      stock.quantityReserved -= releaseQty;
      await stock.save();
    }

    reservation.status = 'cancelled';
    await reservation.save();

    await createAuditLog(req, 'stock_release', 'stock', stock?._id, reservation.reservationNumber, null, {}, { quantity: reservation.quantity });

    res.json({ success: true, data: reservation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ REORDER ALERTS ============

router.get('/alerts', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'procurement_manager'), async (req, res) => {
  try {
    const { status, priority, alertType } = req.query;
    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (alertType) query.alertType = alertType;

    const alerts = await ReorderAlert.find(query)
      .populate('product', 'name sku reorderQuantity preferredVendor')
      .populate('warehouse', 'name code')
      .sort({ priority: -1, createdAt: -1 });

    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/alerts/:id', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'procurement_manager'), async (req, res) => {
  try {
    const update = { ...req.body };

    if (req.body.status === 'acknowledged') {
      update.acknowledgedBy = req.user._id;
      update.acknowledgedAt = new Date();
    } else if (req.body.status === 'resolved') {
      update.resolvedBy = req.user._id;
      update.resolvedAt = new Date();
    }

    const alert = await ReorderAlert.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      update,
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============ REPORTS ============

router.get('/reports/valuation', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'finance_manager'), async (req, res) => {
  try {
    const { warehouse, category, asOfDate } = req.query;

    const matchQuery = { tenant: req.user.tenant };
    if (warehouse) matchQuery.warehouse = warehouse;

    const stocks = await Stock.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      ...(category ? [{ $match: { 'productInfo.category': mongoose.Types.ObjectId(category) } }] : []),
      {
        $lookup: {
          from: 'productcategories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$productInfo.category',
          categoryName: { $first: '$categoryInfo.name' },
          items: {
            $push: {
              product: '$productInfo.name',
              sku: '$productInfo.sku',
              quantity: '$quantityOnHand',
              unitCost: '$unitCost',
              totalValue: '$totalValue',
            },
          },
          totalQuantity: { $sum: '$quantityOnHand' },
          totalValue: { $sum: '$totalValue' },
        },
      },
      { $sort: { categoryName: 1 } },
    ]);

    const grandTotal = stocks.reduce((sum, cat) => sum + cat.totalValue, 0);

    res.json({
      success: true,
      data: {
        byCategory: stocks,
        grandTotal,
        asOfDate: asOfDate || new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/reports/movement-history', authorize('super_admin', 'tenant_admin', 'inventory_manager', 'warehouse_manager'), async (req, res) => {
  try {
    const { product, startDate, endDate } = req.query;

    if (!product) {
      return res.status(400).json({ success: false, message: 'Product is required' });
    }

    const movements = await StockMovement.find({
      tenant: req.user.tenant,
      'lines.product': product,
      movementDate: {
        $gte: new Date(startDate || '1970-01-01'),
        $lte: new Date(endDate || Date.now()),
      },
      status: 'completed',
    })
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ movementDate: 1 });

    // Calculate running balance
    let balance = 0;
    const history = movements.flatMap(m => {
      const line = m.lines.find(l => l.product.toString() === product);
      if (!line) return [];

      let change = 0;
      if (['receipt', 'return_in', 'production_in'].includes(m.type)) {
        change = line.quantity;
      } else if (['issue', 'return_out', 'production_out', 'scrap'].includes(m.type)) {
        change = -line.quantity;
      } else if (m.type === 'adjustment' || m.type === 'count') {
        change = line.quantity;
      }

      balance += change;

      return {
        date: m.movementDate,
        movementNumber: m.movementNumber,
        type: m.type,
        reference: m.referenceNumber,
        in: change > 0 ? change : 0,
        out: change < 0 ? Math.abs(change) : 0,
        balance,
        warehouse: m.destinationWarehouse?.name || m.sourceWarehouse?.name,
        createdBy: m.createdBy ? `${m.createdBy.firstName} ${m.createdBy.lastName}` : null,
      };
    });

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
