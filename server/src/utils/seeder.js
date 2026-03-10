const User = require("../models/User");
const Product = require("../models/Product");
const Category = require("../models/Category");

const customers = [
    {
        name: "John Doe",
        mobile: "9876543210",
        email: "john@example.com",
        role: "CUSTOMER",
        address: {
            houseNo: "101",
            floor: "1st",
            area: "Downtown",
            landmark: "Near Plaza",
            fullAddress: "101, Downtown, Near Plaza",
        },
    },
    {
        name: "Jane Smith",
        mobile: "9123456780",
        email: "jane@example.com",
        role: "CUSTOMER",
        address: {
            houseNo: "205",
            floor: "2nd",
            area: "Uptown",
            landmark: "Opposite Mall",
            fullAddress: "205, Uptown, Opposite Mall",
        },
    },
    {
        name: "Alice Johnson",
        mobile: "8899776655",
        email: "alice@example.com",
        role: "CUSTOMER",
        address: {
            houseNo: "Villa 4",
            area: "Suburbs",
            fullAddress: "Villa 4, Suburbs",
        },
    },
];

const seedData = async () => {
    try {
        // Always ensure Admin exists
        const adminExists = await User.findOne({ role: "SUPERADMIN" });
        if (!adminExists) {
            console.log("Creating Super Admin...");
            await User.create({
                name: "Super Admin",
                mobile: "0000000000",
                role: "SUPERADMIN",
            });
            console.log("Super Admin created!");
        }

        // Ensure Rider exists
        const riderMobile = "9876543210";
        let rider = await User.findOne({ mobile: riderMobile });
        if (rider) {
            if (rider.role !== "RIDER") {
                rider.role = "RIDER";
                rider.name = "Ramesh Rider";
                await rider.save();
                console.log("Updated existing user to Rider role");
            }
        } else {
            console.log("Creating Rider...");
            await User.create({
                name: "Ramesh Rider",
                mobile: riderMobile,
                role: "RIDER",
                walletBalance: 0,
            });
            console.log("Rider created!");
        }

        // Seed customers if none exist
        const customerCount = await User.countDocuments({ role: "CUSTOMER" });
        if (customerCount === 0) {
            console.log("Seeding Customers...");
            for (const customer of customers) {
                await User.updateOne(
                    { mobile: customer.mobile },
                    { $set: customer },
                    { upsert: true }
                );
            }
            console.log("Customers Seeded!");
        }

        // Seed categories if none exist
        const categoryCount = await Category.countDocuments();
        if (categoryCount === 0) {
            console.log("Seeding Categories...");

            // Create root categories
            const milkCategory = await Category.create({
                name: "Dairy",
                slug: "dairy",
                description: "Fresh dairy products",
                isActive: true,
            });

            const groceryCategory = await Category.create({
                name: "Grocery",
                slug: "grocery",
                description: "Everyday grocery items",
                isActive: true,
            });

            // Create subcategories
            await Category.create({
                name: "Milk",
                slug: "milk",
                description: "Fresh milk varieties",
                parent: milkCategory._id,
                ancestors: [milkCategory._id],
                level: 1,
                isActive: true,
            });

            await Category.create({
                name: "Ghee & Butter",
                slug: "ghee-butter",
                description: "Ghee and butter products",
                parent: milkCategory._id,
                ancestors: [milkCategory._id],
                level: 1,
                isActive: true,
            });

            console.log("Categories Seeded!");
        }

        // Seed products if none exist
        const productCount = await Product.countDocuments();
        if (productCount === 0) {
            console.log("Seeding Products...");

            // Get category reference
            const milkSubCat = await Category.findOne({ slug: "milk" });
            const gheeSubCat = await Category.findOne({ slug: "ghee-butter" });
            const dairyCat = await Category.findOne({ slug: "dairy" });

            const products = [
                {
                    name: "Fresh Cow Milk - 1 Litre",
                    sku: "MILK-COW-1L",
                    price: 70,
                    mrp: 75,
                    description: "Pure, organic fresh cow milk. Farm fresh and delivered daily.",
                    shortDescription: "Fresh A2 Cow Milk",
                    category: dairyCat?._id,
                    subcategory: milkSubCat?._id,
                    image: "/images/product/milk.png",
                    unit: "litre",
                    unitValue: 1,
                    stock: 100,
                    productType: "both",
                    hasVariants: true,
                    variants: [
                        { name: "500ml", sku: "MILK-COW-500ML", price: 35, mrp: 40, stock: 50, isDefault: false, isActive: true },
                        { name: "1 Litre", sku: "MILK-COW-1L-V", price: 70, mrp: 75, stock: 100, isDefault: true, isActive: true },
                        { name: "2 Litre", sku: "MILK-COW-2L", price: 135, mrp: 145, stock: 30, isDefault: false, isActive: true },
                    ],
                    subscriptionOptions: {
                        allowDaily: true,
                        allowAlternate: true,
                        allowWeekly: true,
                        minQuantity: 1,
                        maxQuantity: 10,
                    },
                    isActive: true,
                    isFeatured: true,
                },
                {
                    name: "Desi A2 Cow Ghee",
                    sku: "GHEE-A2-500G",
                    price: 500,
                    mrp: 550,
                    description: "Traditional A2 Cow Ghee made using bilona method.",
                    shortDescription: "Pure A2 Bilona Ghee",
                    category: dairyCat?._id,
                    subcategory: gheeSubCat?._id,
                    image: "/images/product/ghee.png",
                    unit: "gram",
                    unitValue: 500,
                    stock: 50,
                    productType: "one-time",
                    hasVariants: true,
                    variants: [
                        { name: "250g", sku: "GHEE-A2-250G", price: 275, mrp: 300, stock: 30, isDefault: false, isActive: true },
                        { name: "500g", sku: "GHEE-A2-500G-V", price: 500, mrp: 550, stock: 50, isDefault: true, isActive: true },
                        { name: "1kg", sku: "GHEE-A2-1KG", price: 950, mrp: 1050, stock: 20, isDefault: false, isActive: true },
                    ],
                    isActive: true,
                    isFeatured: true,
                },
            ];

            await Product.create(products);
            console.log("Products Seeded!");
        }

        console.log("Database seeding complete!");
    } catch (error) {
        console.error("Error seeding data:", error);
    }
};

module.exports = seedData;
