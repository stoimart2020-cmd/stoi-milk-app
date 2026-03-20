import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ShoppingBag, ChevronDown, Plus, Bookmark } from "lucide-react";
import { axiosInstance } from "../../shared/api/axios";
import { ProductOrderModal } from "./CustomerSubscriptions";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:4000";

// Helper: get image URL
const getImageUrl = (image) => {
    if (!image) return "/images/logo.png";
    if (image.startsWith("http")) return image;
    if (image.includes("uploads/"))
        return `${BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
    return `${BASE_URL}/uploads/${image}`;
};

// Helper: compute discount %
const getDiscountPercent = (mrp, price) => {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
};

// ─── Instamart-Style Product Card ──────────────────────────────────────────
const ProductCard = ({ product, onAddClick }) => {
    const discount = getDiscountPercent(product.mrp, product.price);
    const unitLabel = product.unitValue && product.unit
        ? `${product.unitValue} ${product.unit}`
        : product.unit && product.unit !== "piece"
            ? `1 ${product.unit}`
            : "";

    return (
        <div className="cp-card">
            {/* Image Area */}
            <div className="cp-card-img-wrap">
                {/* Add Button - circular blue + */}
                <button
                    onClick={() => onAddClick(product)}
                    className="cp-add-btn"
                    aria-label={`Add ${product.name}`}
                >
                    <Plus size={18} strokeWidth={2.5} />
                </button>

                {/* Product Image */}
                <div className="cp-card-img">
                    <img
                        src={getImageUrl(product.image)}
                        onError={(e) => { e.target.onerror = null; e.target.src = "/images/logo.png"; }}
                        alt={product.name}
                        loading="lazy"
                    />
                </div>

                {/* Veg indicator dot */}
                <div className="cp-veg-dot">
                    <span />
                </div>
            </div>

            {/* Unit / Weight below image */}
            {unitLabel && (
                <div className="cp-unit">{unitLabel}</div>
            )}

            {/* Delivery time */}
            {product.deliveryTime && (
                <div className="cp-delivery-time">{product.deliveryTime}</div>
            )}

            {/* Product Name */}
            <h3 className="cp-name">{product.name}</h3>

            {/* Description */}
            {product.description && (
                <p className="cp-desc">{product.description}</p>
            )}

            {/* Badges row */}
            <div className="cp-badges">
                {product.isBestSeller && (
                    <span className="cp-badge cp-badge-bestseller">Bestseller</span>
                )}
                {product.isNewArrival && (
                    <span className="cp-badge cp-badge-new">New</span>
                )}
                {(product.productFeature || product.feature) && (
                    <span className="cp-badge cp-badge-feature">{product.productFeature || product.feature}</span>
                )}
            </div>

            {/* Discount */}
            {discount > 0 && (
                <div className="cp-discount">
                    <span className="cp-discount-pct">{discount}% OFF</span>
                    {unitLabel && (
                        <span className="cp-discount-perunit">₹{product.price}/{unitLabel}</span>
                    )}
                </div>
            )}

            {/* Price Row */}
            <div className="cp-price-row">
                <span className="cp-price">₹{product.price}</span>
                {product.mrp && product.mrp > product.price && (
                    <span className="cp-mrp">₹{product.mrp}</span>
                )}
            </div>
        </div>
    );
};

// ─── Category Sidebar Item ─────────────────────────────────────────────────
const CategoryItem = ({ category, isActive, onClick, imageUrl }) => (
    <button
        onClick={onClick}
        className={`cp-cat-item ${isActive ? "cp-cat-active" : ""}`}
    >
        <div className={`cp-cat-img-wrap ${isActive ? "cp-cat-img-active" : ""}`}>
            <img
                src={imageUrl}
                onError={(e) => { e.target.onerror = null; e.target.src = "/images/logo.png"; }}
                alt={category}
            />
        </div>
        <span className={`cp-cat-label ${isActive ? "cp-cat-label-active" : ""}`}>
            {category}
        </span>
    </button>
);

// ─── Filter Pill ───────────────────────────────────────────────────────────
const FilterPill = ({ label, hasDropdown, isTag, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`cp-filter-pill ${isTag ? (isActive ? "cp-filter-tag-active" : "cp-filter-tag") : "cp-filter-dropdown"}`}
    >
        {icon && <span className="cp-filter-icon">{icon}</span>}
        {label}
        {hasDropdown && <ChevronDown size={14} className="cp-filter-chevron" />}
    </button>
);

// ─── Action Sheet (Subscribe / Buy Once / Trial) ───────────────────────────
const ActionSheet = ({ product, onClose, onSelect, blockedSubcategories = [] }) => {
    const type = (product.productType || "both").toLowerCase();
    const showSubscription = type === "subscription" || type === "both";
    const showOneTime = type === "one-time" || type === "both";

    // If only one option, auto-select
    useEffect(() => {
        if (showOneTime && !showSubscription) {
            onSelect("one-time", false);
        } else if (showSubscription && !showOneTime) {
            onSelect("subscription", false);
        }
    }, []);

    // If auto-selected, don't render the sheet
    if ((showOneTime && !showSubscription) || (showSubscription && !showOneTime)) return null;

    return (
        <>
            <div className="cp-sheet-overlay" onClick={onClose} />
            <div className="cp-sheet">
                <div className="cp-sheet-handle" />
                <div className="cp-sheet-header">
                    <img
                        src={getImageUrl(product.image)}
                        onError={(e) => { e.target.onerror = null; e.target.src = "/images/logo.png"; }}
                        alt=""
                        className="cp-sheet-img"
                    />
                    <div>
                        <h4 className="cp-sheet-name">{product.name}</h4>
                        <p className="cp-sheet-price">₹{product.price}</p>
                    </div>
                    <button onClick={onClose} className="cp-sheet-close">
                        <X size={18} />
                    </button>
                </div>
                <div className="cp-sheet-actions">
                    {showOneTime && (
                        <button
                            onClick={() => onSelect("one-time", false)}
                            className="cp-sheet-btn cp-sheet-btn-outline"
                        >
                            <ShoppingBag size={16} />
                            <span>Buy Once</span>
                        </button>
                    )}
                    {showSubscription && (
                        <button
                            onClick={() => onSelect("subscription", false)}
                            className="cp-sheet-btn cp-sheet-btn-primary"
                        >
                            <span>Subscribe</span>
                        </button>
                    )}
                    {showSubscription && product.trialEnabled && !blockedSubcategories.includes(product.subcategory?._id || product.subcategory) && (
                        <button
                            onClick={() => onSelect("subscription", true)}
                            className="cp-sheet-btn cp-sheet-btn-trial"
                        >
                            <span>Start Trial</span>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────
export const CustomerProducts = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [orderType, setOrderType] = useState("subscription");
    const [isTrial, setIsTrial] = useState(false);
    const [actionSheetProduct, setActionSheetProduct] = useState(null);
    const [sortBy, setSortBy] = useState("default");
    const [activeTag, setActiveTag] = useState(null);

    // Fetch products
    const { data: productsData, isLoading } = useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/products");
            return response.data;
        }
    });

    // Fetch categories
    const { data: categoriesData } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/categories");
            return response.data;
        }
    });

    const products = productsData?.result || [];
    const categories = categoriesData?.result || [];

    // Fetch trial eligibility (blocked subcategories)
    const { data: trialData } = useQuery({
        queryKey: ["trialEligibility"],
        queryFn: async () => {
            const response = await axiosInstance.get("/api/subscriptions/trial-eligibility");
            return response.data;
        }
    });
    const blockedSubcategories = trialData?.result?.blockedSubcategories || [];

    // Filter products
    let filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.description || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || product.category?._id === selectedCategory || product.category === selectedCategory;
        let matchesTag = true;
        if (activeTag === "bestseller") matchesTag = product.isBestSeller;
        if (activeTag === "new") matchesTag = product.isNewArrival;
        return matchesSearch && matchesCategory && product.isActive && matchesTag;
    });

    // Sort
    if (sortBy === "price-low") filteredProducts.sort((a, b) => a.price - b.price);
    if (sortBy === "price-high") filteredProducts.sort((a, b) => b.price - a.price);
    if (sortBy === "name") filteredProducts.sort((a, b) => a.name.localeCompare(b.name));

    const handleAddClick = (product) => {
        const type = (product.productType || "both").toLowerCase();
        const showSubscription = type === "subscription" || type === "both";
        const showOneTime = type === "one-time" || type === "both";

        // If only one option, go directly to modal
        if (showOneTime && !showSubscription) {
            setSelectedProduct(product);
            setOrderType("one-time");
            setIsTrial(false);
            setShowModal(true);
        } else if (showSubscription && !showOneTime) {
            setSelectedProduct(product);
            setOrderType("subscription");
            setIsTrial(false);
            setShowModal(true);
        } else {
            // Show action sheet for multiple options
            setActionSheetProduct(product);
        }
    };

    const handleActionSelect = (type, trial) => {
        setSelectedProduct(actionSheetProduct);
        setOrderType(type);
        setIsTrial(trial);
        setActionSheetProduct(null);
        setShowModal(true);
    };

    // Sort dropdown
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    return (
        <div className="cp-root">
            {/* ─── Inline Styles ─── */}
            <style>{`
                .cp-root {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 64px - 64px);
                    background: #fff;
                    margin: -24px -16px -80px;
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                /* ─── Top Bar ─── */
                .cp-topbar {
                    padding: 12px 16px 0;
                    background: #fff;
                    flex-shrink: 0;
                }
                .cp-search-wrap {
                    position: relative;
                    margin-bottom: 10px;
                }
                .cp-search-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9ca3af;
                }
                .cp-search {
                    width: 100%;
                    height: 40px;
                    padding-left: 36px;
                    padding-right: 36px;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    background: #f9fafb;
                    font-size: 14px;
                    color: #1f2937;
                    outline: none;
                    transition: all 0.2s;
                }
                .cp-search:focus {
                    border-color: #d1d5db;
                    background: #fff;
                    box-shadow: 0 0 0 3px rgba(12, 131, 31, 0.08);
                }
                .cp-search::placeholder {
                    color: #9ca3af;
                }
                .cp-search-clear {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 4px;
                }
                .cp-search-clear:hover { color: #6b7280; }

                /* ─── Filters ─── */
                .cp-filters {
                    display: flex;
                    gap: 8px;
                    overflow-x: auto;
                    padding-bottom: 10px;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .cp-filters::-webkit-scrollbar { display: none; }

                .cp-filter-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                    white-space: nowrap;
                    cursor: pointer;
                    transition: all 0.15s;
                    border: 1px solid #e5e7eb;
                    background: #fff;
                    color: #374151;
                }
                .cp-filter-pill:hover { background: #f3f4f6; }
                .cp-filter-dropdown { }
                .cp-filter-chevron { color: #9ca3af; }
                .cp-filter-tag {
                    border-color: #e5e7eb;
                    background: #fff;
                }
                .cp-filter-tag-active {
                    border-color: #0C831F;
                    background: #f0fdf4;
                    color: #0C831F;
                    font-weight: 600;
                }
                .cp-filter-icon { font-size: 14px; }

                /* Sort dropdown */
                .cp-sort-wrap { position: relative; }
                .cp-sort-dd {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    margin-top: 4px;
                    background: #fff;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                    z-index: 50;
                    min-width: 160px;
                    overflow: hidden;
                }
                .cp-sort-option {
                    display: block;
                    width: 100%;
                    padding: 10px 16px;
                    text-align: left;
                    font-size: 13px;
                    color: #374151;
                    background: none;
                    border: none;
                    cursor: pointer;
                    transition: background 0.1s;
                }
                .cp-sort-option:hover { background: #f3f4f6; }
                .cp-sort-option-active {
                    color: #0C831F;
                    font-weight: 600;
                    background: #f0fdf4;
                }

                /* ─── Content Area ─── */
                .cp-content {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                    border-top: 1px solid #f3f4f6;
                }

                /* ─── Category Sidebar ─── */
                .cp-sidebar {
                    width: 76px;
                    min-width: 76px;
                    overflow-y: auto;
                    background: #fafafa;
                    border-right: 1px solid #f3f4f6;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    padding: 8px 0;
                }
                .cp-sidebar::-webkit-scrollbar { display: none; }

                .cp-cat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    padding: 8px 4px;
                    width: 100%;
                    cursor: pointer;
                    border: none;
                    background: none;
                    transition: all 0.15s;
                    position: relative;
                }
                .cp-cat-active {
                    background: #fff;
                }
                .cp-cat-active::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 8px;
                    bottom: 8px;
                    width: 3px;
                    background: #0C831F;
                    border-radius: 0 2px 2px 0;
                }

                .cp-cat-img-wrap {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: #fff;
                    border: 2px solid #f3f4f6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: border-color 0.15s;
                }
                .cp-cat-img-active {
                    border-color: #0C831F;
                    box-shadow: 0 0 0 2px rgba(12, 131, 31, 0.1);
                }
                .cp-cat-img-wrap img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .cp-cat-label {
                    font-size: 10px;
                    color: #6b7280;
                    text-align: center;
                    line-height: 1.2;
                    word-break: break-word;
                    max-width: 68px;
                    font-weight: 500;
                }
                .cp-cat-label-active {
                    color: #0C831F;
                    font-weight: 700;
                }

                /* ─── Products Grid Area ─── */
                .cp-grid-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .cp-grid-area::-webkit-scrollbar { display: none; }

                .cp-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }
                @media (min-width: 768px) {
                    .cp-grid { grid-template-columns: repeat(3, 1fr); }
                }
                @media (min-width: 1024px) {
                    .cp-grid { grid-template-columns: repeat(4, 1fr); }
                    .cp-sidebar { width: 88px; min-width: 88px; }
                }

                /* ─── Product Card ─── */
                .cp-card {
                    background: #fff;
                    border: 1px solid #f0f0f0;
                    border-radius: 12px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    transition: box-shadow 0.2s;
                }
                .cp-card:hover {
                    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
                }

                .cp-card-img-wrap {
                    position: relative;
                    background: #f8f8f8;
                    padding: 8px;
                    padding-bottom: 4px;
                }

                .cp-add-btn {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    z-index: 5;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 1.5px solid #d1d5db;
                    background: #fff;
                    color: #1C8D36;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.15s;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                }
                .cp-add-btn:hover {
                    background: #f0fdf4;
                    border-color: #1C8D36;
                    transform: scale(1.05);
                }
                .cp-add-btn:active {
                    transform: scale(0.95);
                }

                .cp-card-img {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 120px;
                }
                .cp-card-img img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }

                .cp-veg-dot {
                    position: absolute;
                    bottom: 8px;
                    left: 8px;
                    width: 14px;
                    height: 14px;
                    border: 1.5px solid #0C831F;
                    border-radius: 2px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #fff;
                }
                .cp-veg-dot span {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #0C831F;
                }

                .cp-unit {
                    padding: 6px 10px 0;
                    font-size: 12px;
                    color: #6b7280;
                    font-weight: 500;
                    background: #f8f8f8;
                    margin: 0 1px;
                    border-bottom: 1px solid #f0f0f0;
                    padding-bottom: 6px;
                }

                .cp-delivery-time {
                    padding: 6px 10px 0;
                    font-size: 10px;
                    color: #9ca3af;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }

                .cp-name {
                    padding: 4px 10px 0;
                    font-size: 13px;
                    font-weight: 600;
                    color: #1f2937;
                    line-height: 1.3;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    margin: 0;
                    min-height: 34px;
                }

                .cp-desc {
                    padding: 2px 10px 0;
                    font-size: 11px;
                    color: #9ca3af;
                    line-height: 1.3;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    margin: 0;
                }

                .cp-badges {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    padding: 4px 10px 0;
                }
                .cp-badge {
                    font-size: 9px;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 3px;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                .cp-badge-bestseller {
                    background: #fef3c7;
                    color: #92400e;
                }
                .cp-badge-new {
                    background: #dbeafe;
                    color: #1e40af;
                }
                .cp-badge-feature {
                    background: #f0fdf4;
                    color: #166534;
                    border: 1px solid #bbf7d0;
                }

                .cp-discount {
                    padding: 6px 10px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .cp-discount-pct {
                    font-size: 12px;
                    font-weight: 700;
                    color: #0C831F;
                }
                .cp-discount-perunit {
                    font-size: 11px;
                    color: #6b7280;
                    font-weight: 500;
                    position: relative;
                }
                .cp-discount-perunit::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: -5px;
                    width: 2px;
                    height: 2px;
                    background: #d1d5db;
                    border-radius: 50%;
                }

                .cp-price-row {
                    padding: 4px 10px 10px;
                    display: flex;
                    align-items: baseline;
                    gap: 6px;
                }
                .cp-price {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1f2937;
                }
                .cp-mrp {
                    font-size: 12px;
                    color: #9ca3af;
                    text-decoration: line-through;
                    font-weight: 500;
                }

                /* ─── Skeleton ─── */
                .cp-skel-card {
                    background: #fff;
                    border: 1px solid #f0f0f0;
                    border-radius: 12px;
                    overflow: hidden;
                }
                .cp-skel-img {
                    height: 140px;
                    background: linear-gradient(110deg, #f5f5f5 8%, #ebebeb 18%, #f5f5f5 33%);
                    background-size: 200% 100%;
                    animation: cp-shimmer 1.5s infinite;
                }
                .cp-skel-line {
                    height: 10px;
                    margin: 8px 10px;
                    border-radius: 4px;
                    background: linear-gradient(110deg, #f5f5f5 8%, #ebebeb 18%, #f5f5f5 33%);
                    background-size: 200% 100%;
                    animation: cp-shimmer 1.5s infinite;
                }
                .cp-skel-line-sm { width: 60%; }
                .cp-skel-line-xs { width: 40%; }
                @keyframes cp-shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* ─── Empty State ─── */
                .cp-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    text-align: center;
                }
                .cp-empty-icon {
                    width: 72px;
                    height: 72px;
                    background: #f3f4f6;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                }
                .cp-empty-title {
                    font-size: 15px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 4px;
                }
                .cp-empty-text {
                    font-size: 13px;
                    color: #9ca3af;
                    max-width: 240px;
                }
                .cp-empty-btn {
                    margin-top: 12px;
                    background: none;
                    border: none;
                    color: #0C831F;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .cp-empty-btn:hover { text-decoration: underline; }

                /* ─── Action Sheet ─── */
                .cp-sheet-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.4);
                    z-index: 100;
                    animation: cp-fadeIn 0.2s ease;
                }
                .cp-sheet {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: #fff;
                    border-radius: 20px 20px 0 0;
                    z-index: 101;
                    padding: 12px 20px 24px;
                    animation: cp-slideUp 0.3s ease;
                    box-shadow: 0 -4px 24px rgba(0,0,0,0.1);
                    max-width: 480px;
                    margin: 0 auto;
                }
                .cp-sheet-handle {
                    width: 36px;
                    height: 4px;
                    background: #e5e7eb;
                    border-radius: 2px;
                    margin: 0 auto 16px;
                }
                .cp-sheet-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .cp-sheet-img {
                    width: 48px;
                    height: 48px;
                    border-radius: 10px;
                    object-fit: contain;
                    background: #f8f8f8;
                    border: 1px solid #f0f0f0;
                }
                .cp-sheet-name {
                    font-size: 15px;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0;
                    flex: 1;
                }
                .cp-sheet-price {
                    font-size: 13px;
                    font-weight: 700;
                    color: #0C831F;
                    margin: 2px 0 0;
                }
                .cp-sheet-close {
                    background: none;
                    border: none;
                    padding: 6px;
                    color: #9ca3af;
                    cursor: pointer;
                    border-radius: 50%;
                }
                .cp-sheet-close:hover { background: #f3f4f6; }

                .cp-sheet-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .cp-sheet-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 16px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s;
                    border: none;
                }
                .cp-sheet-btn:active { transform: scale(0.98); }

                .cp-sheet-btn-primary {
                    background: #0C831F;
                    color: #fff;
                }
                .cp-sheet-btn-primary:hover { background: #0a6e1a; }

                .cp-sheet-btn-outline {
                    background: #fff;
                    color: #374151;
                    border: 1.5px solid #e5e7eb;
                }
                .cp-sheet-btn-outline:hover { background: #f9fafb; border-color: #d1d5db; }

                .cp-sheet-btn-trial {
                    background: #eff6ff;
                    color: #1d4ed8;
                    border: 1.5px solid #bfdbfe;
                }
                .cp-sheet-btn-trial:hover { background: #dbeafe; }

                @keyframes cp-fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes cp-slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }

                /* ─── Hide scrollbars ─── */
                .cp-root *::-webkit-scrollbar { display: none; }
            `}</style>

            {/* ─── Top Section ─── */}
            <div className="cp-topbar">
                {/* Search */}
                <div className="cp-search-wrap">
                    <Search size={16} className="cp-search-icon" />
                    <input
                        type="text"
                        placeholder="Search for products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="cp-search"
                    />
                    {searchTerm && (
                        <button className="cp-search-clear" onClick={() => setSearchTerm("")}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
                <div className="cp-filters">
                    <div className="cp-sort-wrap">
                        <FilterPill
                            label="Sort By"
                            hasDropdown
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                        />
                        {showSortDropdown && (
                            <div className="cp-sort-dd">
                                {[
                                    { key: "default", label: "Relevance" },
                                    { key: "price-low", label: "Price: Low to High" },
                                    { key: "price-high", label: "Price: High to Low" },
                                    { key: "name", label: "Name: A to Z" },
                                ].map(opt => (
                                    <button
                                        key={opt.key}
                                        className={`cp-sort-option ${sortBy === opt.key ? "cp-sort-option-active" : ""}`}
                                        onClick={() => { setSortBy(opt.key); setShowSortDropdown(false); }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <FilterPill
                        label="Bestseller"
                        icon="⭐"
                        isTag
                        isActive={activeTag === "bestseller"}
                        onClick={() => setActiveTag(activeTag === "bestseller" ? null : "bestseller")}
                    />
                    <FilterPill
                        label="New Arrivals"
                        icon="🆕"
                        isTag
                        isActive={activeTag === "new"}
                        onClick={() => setActiveTag(activeTag === "new" ? null : "new")}
                    />
                </div>
            </div>

            {/* ─── Content: Sidebar + Grid ─── */}
            <div className="cp-content">
                {/* Category Sidebar */}
                <div className="cp-sidebar">
                    <CategoryItem
                        category="All Products"
                        isActive={selectedCategory === "all"}
                        onClick={() => setSelectedCategory("all")}
                        imageUrl="/images/logo.png"
                    />
                    {categories.map(cat => (
                        <CategoryItem
                            key={cat._id}
                            category={cat.name}
                            isActive={selectedCategory === cat._id}
                            onClick={() => setSelectedCategory(cat._id)}
                            imageUrl={cat.image ? getImageUrl(cat.image) : "/images/logo.png"}
                        />
                    ))}
                </div>

                {/* Products Grid */}
                <div className="cp-grid-area">
                    {isLoading ? (
                        <div className="cp-grid">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="cp-skel-card">
                                    <div className="cp-skel-img" />
                                    <div className="cp-skel-line" />
                                    <div className="cp-skel-line cp-skel-line-sm" />
                                    <div className="cp-skel-line cp-skel-line-xs" />
                                </div>
                            ))}
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="cp-empty">
                            <div className="cp-empty-icon">
                                <ShoppingBag size={28} style={{ color: '#d1d5db' }} />
                            </div>
                            <div className="cp-empty-title">No products found</div>
                            <div className="cp-empty-text">
                                {searchTerm
                                    ? `We couldn't find anything for "${searchTerm}"`
                                    : "No products in this category"}
                            </div>
                            {(searchTerm || activeTag) && (
                                <button
                                    className="cp-empty-btn"
                                    onClick={() => { setSearchTerm(""); setActiveTag(null); }}
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="cp-grid">
                            {filteredProducts.map(product => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                    onAddClick={handleAddClick}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Action Sheet ─── */}
            {actionSheetProduct && (
                <ActionSheet
                    product={actionSheetProduct}
                    onClose={() => setActionSheetProduct(null)}
                    onSelect={handleActionSelect}
                    blockedSubcategories={blockedSubcategories}
                />
            )}

            {/* ─── Order Modal ─── */}
            {showModal && (
                <ProductOrderModal
                    isOpen={showModal}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedProduct(null);
                        setIsTrial(false);
                    }}
                    product={selectedProduct}
                    orderType={orderType}
                    initialIsTrial={isTrial}
                />
            )}
        </div>
    );
};
