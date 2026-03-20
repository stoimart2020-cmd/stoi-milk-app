/**
 * LocalDB - A simple localStorage wrapper to simulate a database.
 */
class LocalDB {
    constructor() {
        this.STORAGE_KEY_PREFIX = "stoi_local_db_";
        this.collections = {
            users: "users",
            products: "products",
            subscriptions: "subscriptions",
            orders: "orders",
            wallet: "wallet",
            deliveries: "deliveries",
            settings: "settings",
        };
        this.initialize();
    }

    initialize() {
        // Seed default data if empty
        if (!this.get(this.collections.products).length) {
            this.seedProducts();
        }
        if (!this.get(this.collections.settings).length) {
            this.seedSettings();
        }
    }

    // --- Core Storage Methods ---

    _getKey(collection) {
        return `${this.STORAGE_KEY_PREFIX}${collection}`;
    }

    get(collection) {
        const data = localStorage.getItem(this._getKey(collection));
        return data ? JSON.parse(data) : [];
    }

    save(collection, data) {
        localStorage.setItem(this._getKey(collection), JSON.stringify(data));
    }

    // --- CRUD Operations ---

    getAll(collection) {
        return this.get(collection);
    }

    getById(collection, id) {
        const items = this.get(collection);
        return items.find((item) => item._id === id || item.id === id);
    }

    find(collection, queryFn) {
        const items = this.get(collection);
        return items.filter(queryFn);
    }

    findOne(collection, queryFn) {
        const items = this.get(collection);
        return items.find(queryFn);
    }

    create(collection, item) {
        const items = this.get(collection);
        const newItem = {
            _id: item._id || Date.now().toString(),
            createdAt: new Date().toISOString(),
            ...item,
        };
        items.push(newItem);
        this.save(collection, items);
        return newItem;
    }

    update(collection, id, updates) {
        const items = this.get(collection);
        const index = items.findIndex((item) => item._id === id || item.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
            this.save(collection, items);
            return items[index];
        }
        return null;
    }

    delete(collection, id) {
        const items = this.get(collection);
        const filtered = items.filter((item) => item._id !== id && item.id !== id);
        this.save(collection, filtered);
        return filtered.length !== items.length;
    }

    // --- Seeding ---

    seedProducts() {
        const products = [
            {
                _id: "1",
                name: "Fresh Cow Milk",
                price: 60,
                image: "/images/product/milk.png",
                description: "Pure, fresh cow milk delivered daily.",
                category: "Milk",
                unit: "L",
                stock: 100,
            },
            {
                _id: "2",
                name: "Desi Ghee",
                price: 500,
                image: "/images/product/ghee.png",
                description: "Traditional Bilona Ghee.",
                category: "Ghee",
                unit: "kg",
                stock: 50,
            },
            {
                _id: "3",
                name: "Paneer",
                price: 120,
                image: "/images/product/paneer.png",
                description: "Fresh, soft paneer.",
                category: "Dairy",
                unit: "200g",
                stock: 30,
            },
            {
                _id: "4",
                name: "Curd",
                price: 40,
                image: "/images/product/curd.png",
                description: "Thick, creamy curd.",
                category: "Dairy",
                unit: "500g",
                stock: 40,
            }
        ];
        this.save(this.collections.products, products);
    }

    seedSettings() {
        const settings = {
            phone: "9876543210",
            playStoreLink: "#",
            appStoreLink: "#",
            showAppLinks: true
        };
        this.save(this.collections.settings, [settings]); // Save as array for consistency
    }
}

export const localDB = new LocalDB();
