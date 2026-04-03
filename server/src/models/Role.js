const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema({
    view: { type: Boolean, default: false },
    add: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    export: { type: Boolean, default: false },
    // Specific extra permissions can be handled dynamically or with specific fields
    details: { type: Boolean, default: false }, // For 'Detail'
    viewMobile: { type: Boolean, default: false },
    editCreditLimit: { type: Boolean, default: false },
}, { _id: false });

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    isSystem: { type: Boolean, default: false }, // Prevent deleting system roles like SUPERADMIN
    permissions: {
        dashboard: { type: Boolean, default: true }, // Basic access

        // Modules
        hub: { type: permissionSchema, default: {} },
        products: { type: permissionSchema, default: {} },
        categories: { type: permissionSchema, default: {} },
        customers: { type: permissionSchema, default: {} },
        orders: { type: permissionSchema, default: {} },
        invoices: { type: permissionSchema, default: {} },
        payments: { type: permissionSchema, default: {} },
        users: { type: permissionSchema, default: {} },
        roles: { type: permissionSchema, default: {} },
        logistics: { type: permissionSchema, default: {} }, // Factory, StockPoint
        inventory: { type: permissionSchema, default: {} }, // Vendors, Milk Collection, Stock Analytics
        attendance: { type: permissionSchema, default: {} }, // Attendance & Salary Management
        settings: { type: permissionSchema, default: {} },
        
        // Newly added modules
        riders: { type: permissionSchema, default: {} },
        staff: { type: permissionSchema, default: {} },
        distributors: { type: permissionSchema, default: {} },
        deliveries: { type: permissionSchema, default: {} },
        live_tracking: { type: permissionSchema, default: {} },
        bottle_management: { type: permissionSchema, default: {} },
        leads: { type: permissionSchema, default: {} },
        complaints: { type: permissionSchema, default: {} },
    }
}, { timestamps: true });

module.exports = mongoose.model("Role", roleSchema);
