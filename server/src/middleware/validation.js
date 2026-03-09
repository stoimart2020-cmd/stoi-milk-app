const { z } = require('zod');

// User/Customer Validation Schemas
const createCustomerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    mobile: z.string().regex(/^[0-9]{10}$/, "Mobile must be 10 digits"),
    email: z.string().email().optional().or(z.literal('')),
    alternateMobile: z.string().regex(/^[0-9]{10}$/).optional().or(z.literal('')),
    role: z.enum(['CUSTOMER', 'ADMIN', 'RIDER']).default('CUSTOMER'),
    address: z.object({
        houseNo: z.string().optional(),
        floor: z.string().optional(),
        area: z.string().optional(),
        landmark: z.string().optional(),
        fullAddress: z.string().min(10, "Address must be at least 10 characters"),
        location: z.object({
            coordinates: z.array(z.number()).length(2)
        }).optional()
    }).optional()
});

const updateCustomerSchema = createCustomerSchema.partial();

// Product Validation Schemas
const createProductSchema = z.object({
    name: z.string().min(2, "Product name must be at least 2 characters").max(200),
    description: z.string().optional(),
    price: z.number().positive("Price must be positive"),
    mrp: z.number().positive().optional(),
    costPrice: z.number().positive().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    stock: z.number().int().nonnegative().default(0),
    sku: z.string().optional(),
    isActive: z.boolean().default(true),
    productType: z.enum(['subscription', 'one-time', 'both']).default('both'),
    zonePricing: z.array(z.object({
        serviceArea: z.string(),
        price: z.number().positive(),
        isActive: z.boolean().default(true)
    })).optional()
});

const updateProductSchema = createProductSchema.partial();

// Subscription Validation Schemas
const createSubscriptionSchema = z.object({
    product: z.string().min(1, "Product ID is required"),
    quantity: z.number().int().positive("Quantity must be positive"),
    frequency: z.enum(['Daily', 'Alternate Days', 'Custom', 'Weekdays', 'Weekends']),
    alternateQuantity: z.number().int().nonnegative().default(0),
    startDate: z.string().or(z.date()),
    isTrial: z.boolean().default(false),
    userId: z.string().optional()
});

const updateSubscriptionSchema = z.object({
    quantity: z.number().int().positive().optional(),
    frequency: z.enum(['Daily', 'Alternate Days', 'Custom', 'Weekdays', 'Weekends']).optional(),
    alternateQuantity: z.number().int().nonnegative().optional(),
    status: z.enum(['active', 'paused', 'cancelled']).optional()
});

// Order Validation Schemas
const createOrderSchema = z.object({
    products: z.array(z.object({
        product: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().positive()
    })).min(1, "At least one product is required"),
    totalAmount: z.number().positive("Total amount must be positive"),
    deliveryDate: z.string().or(z.date()),
    paymentMode: z.enum(['Cash', 'Online', 'Wallet']).default('Wallet'),
    customerId: z.string().optional()
});

// Payment Validation Schemas
const addPaymentSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
    mode: z.enum(['Cash', 'Online', 'UPI', 'Card']),
    customerId: z.string().optional(),
    description: z.string().optional()
});

// Service Area Validation Schemas
const createServiceAreaSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    polygon: z.object({
        type: z.literal('Polygon'),
        coordinates: z.array(z.array(z.array(z.number()).length(2)))
    }),
    deliveryCharge: z.number().nonnegative().default(0),
    minimumOrderValue: z.number().nonnegative().default(0),
    isActive: z.boolean().default(true)
});

// Complaint Validation Schemas
const createComplaintSchema = z.object({
    subject: z.string().min(5, "Subject must be at least 5 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    category: z.string().optional()
});

// Validation Middleware Factory
const validate = (schema) => {
    return (req, res, next) => {
        try {
            // Parse and validate the request body
            const validated = schema.parse(req.body);
            req.validatedData = validated;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            next(error);
        }
    };
};

// Query Parameter Validation
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const validated = schema.parse(req.query);
            req.validatedQuery = validated;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid query parameters",
                    errors: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            next(error);
        }
    };
};

module.exports = {
    // Schemas
    createCustomerSchema,
    updateCustomerSchema,
    createProductSchema,
    updateProductSchema,
    createSubscriptionSchema,
    updateSubscriptionSchema,
    createOrderSchema,
    addPaymentSchema,
    createServiceAreaSchema,
    createComplaintSchema,

    // Middleware
    validate,
    validateQuery
};
