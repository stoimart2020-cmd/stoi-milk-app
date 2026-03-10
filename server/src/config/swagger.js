/**
 * Swagger API Documentation Configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Milk Delivery SaaS API',
            version: '1.0.0',
            description: 'Comprehensive API documentation for the Milk Delivery Management System',
            contact: {
                name: 'API Support',
                email: 'support@milkdelivery.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:4000/api',
                description: 'Development server'
            },
            {
                url: 'https://api.milkdelivery.com/api',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'token'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        message: {
                            type: 'string',
                            example: 'Error message'
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        customerId: { type: 'number' },
                        name: { type: 'string' },
                        mobile: { type: 'string' },
                        email: { type: 'string' },
                        role: {
                            type: 'string',
                            enum: ['CUSTOMER', 'ADMIN', 'RIDER', 'SUPERADMIN']
                        },
                        walletBalance: { type: 'number' },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        productId: { type: 'number' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' },
                        mrp: { type: 'number' },
                        category: { type: 'string' },
                        stock: { type: 'number' },
                        isActive: { type: 'boolean' },
                        zonePricing: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    serviceArea: { type: 'string' },
                                    price: { type: 'number' },
                                    isActive: { type: 'boolean' }
                                }
                            }
                        }
                    }
                },
                Subscription: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        subscriptionId: { type: 'number' },
                        user: { type: 'string' },
                        product: { type: 'string' },
                        quantity: { type: 'number' },
                        frequency: {
                            type: 'string',
                            enum: ['Daily', 'Alternate Days', 'Custom', 'Weekdays', 'Weekends']
                        },
                        status: {
                            type: 'string',
                            enum: ['active', 'paused', 'cancelled']
                        },
                        isTrial: { type: 'boolean' },
                        startDate: { type: 'string', format: 'date' }
                    }
                },
                Order: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        orderId: { type: 'number' },
                        customer: { type: 'string' },
                        products: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    product: { type: 'string' },
                                    quantity: { type: 'number' },
                                    price: { type: 'number' }
                                }
                            }
                        },
                        totalAmount: { type: 'number' },
                        status: { type: 'string' },
                        paymentStatus: { type: 'string' },
                        deliveryDate: { type: 'string', format: 'date' }
                    }
                }
            }
        },
        security: [
            {
                cookieAuth: []
            }
        ],
        tags: [
            { name: 'Authentication', description: 'User authentication endpoints' },
            { name: 'Users', description: 'User management endpoints' },
            { name: 'Products', description: 'Product management endpoints' },
            { name: 'Subscriptions', description: 'Subscription management endpoints' },
            { name: 'Orders', description: 'Order management endpoints' },
            { name: 'Payments', description: 'Payment processing endpoints' },
            { name: 'Analytics', description: 'Analytics and reporting endpoints' },
            { name: 'Service Areas', description: 'Service area management endpoints' }
        ]
    },
    apis: [
        './src/routes/*.js',
        './src/controllers/*.js'
    ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
