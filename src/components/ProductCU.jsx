import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { createProduct, getProductById, updateProduct, getCategories, getHubs } from "./../lib/api";
import { useNavigate, useParams } from "react-router-dom";
import { queryClient } from "../lib/queryClient";
import { ChevronLeft, Upload, X } from "lucide-react";

const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:4000";

export const ProductCU = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    weight: "",
    slug: "",
    description: "",
    shortDescription: "",
    keywords: "", // comma separated
    productFeature: "",
    prepaidPrice: "",
    unit: "litre",
    unitValue: "", // Pack Size
    price: "", // Selling Price (Base/Subscription)
    taxRate: "",
    mrp: "",
    trialPrice: "", // Trial pack price
    trialMrp: "", // Trial pack MRP
    trialEnabled: false, // Enable trial packs
    trialDuration: "7", // Trial duration in days
    customTrialDays: "", // Custom trial duration
    oneTimePrice: "", // One-time purchase price
    oneTimeMrp: "", // One-time purchase MRP
    oneTimePriceEnabled: false, // Enable separate one-time pricing
    minQuantity: "1",
    discountText: "",
    cancellationCharge: "",
    stock: "",
    stockStatus: "in_stock", // "no_stock_required", "manage_inventory"
    leadTime: "",
    adminLeadTime: "",
    expiryDays: "",
    harvestPeriod: "",
    cutoffTime: "", // Product specific cutoff
    cutoffDay: "", // Product specific cutoff day type
    category: "",
    subcategory: "",
    childCategory: "",
    hub: "",
    status: "active",
    isVisible: true,
    reverseLogistic: false,
    isSubscription: true,
    isOneTime: true,
    actualQuantityCanVary: false,
    isFeatured: false, // Trending
    autoAssignToDeliveryBoy: false,
    image: null,
    gallery: [],
  });

  const [preview, setPreview] = useState("");
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  // Fetch Data
  const { data: productData } = useQuery({
    queryKey: ["products", id],
    queryFn: () => getProductById(id),
    enabled: isEdit,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: hubs } = useQuery({
    queryKey: ["hubs"],
    queryFn: getHubs,
  });

  useEffect(() => {
    if (productData?.result) {
      const p = productData.result;
      setFormData({
        name: p.name || "",
        sku: p.sku || "",
        weight: p.weight || "",
        slug: p.slug || "",
        description: p.description || "",
        shortDescription: p.shortDescription || "",
        keywords: p.tags?.join(", ") || "",
        productFeature: p.productFeature || "",
        prepaidPrice: p.prepaidPrice || "",
        unit: p.unit || "litre",
        unitValue: p.unitValue || "",
        price: p.price || "",
        taxRate: p.taxRate || "",
        mrp: p.mrp || "",
        trialPrice: p.trialPrice || "",
        trialMrp: p.trialMrp || "",
        trialEnabled: p.trialEnabled ?? false,
        trialDuration: p.trialDuration || "7",
        oneTimePrice: p.oneTimePrice || "",
        oneTimeMrp: p.oneTimeMrp || "",
        oneTimePriceEnabled: p.oneTimePriceEnabled ?? false,
        minQuantity: p.subscriptionOptions?.minQuantity || "1",
        discountText: "", // Not in model explicitly, maybe description?
        cancellationCharge: p.cancellationCharge || "",
        stock: p.stock || "",
        stockStatus: p.trackInventory ? "manage_inventory" : "no_stock_required",
        leadTime: p.leadTime || "",
        adminLeadTime: p.adminLeadTime || "",
        expiryDays: p.expiryDays || "",
        harvestPeriod: p.harvestPeriod || "",
        cutoffTime: p.cutoffTime || "",
        cutoffDay: (p.cutoffDay !== undefined && p.cutoffDay !== null) ? String(p.cutoffDay) : "",
        category: p.category?._id || p.category || "",
        subcategory: p.subcategory?._id || p.subcategory || "",
        childCategory: p.childCategory?._id || p.childCategory || "",
        hub: p.hub || "",
        status: p.isActive ? "active" : "inactive",
        isVisible: p.isVisible ?? true,
        reverseLogistic: p.reverseLogistic ?? false,
        isSubscription: p.productType === "subscription" || p.productType === "both",
        isOneTime: p.productType === "one-time" || p.productType === "both",
        actualQuantityCanVary: p.actualQuantityCanVary ?? false,
        isFeatured: p.isFeatured ?? false,
        autoAssignToDeliveryBoy: p.autoAssignToDeliveryBoy ?? false,
        image: null,
        gallery: [],
      });
      if (p.image) setPreview(p.image.startsWith("http") ? p.image : `${BASE_URL}${p.image}`);
    }
  }, [productData]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else if (type === "file") {
      if (name === "image") {
        const file = files[0];
        setFormData({ ...formData, image: file });
        setPreview(URL.createObjectURL(file));
      } else if (name === "gallery") {
        const newFiles = Array.from(files);
        setFormData({ ...formData, gallery: [...formData.gallery, ...newFiles] });
        const newPreviews = newFiles.map(f => URL.createObjectURL(f));
        setGalleryPreviews([...galleryPreviews, ...newPreviews]);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateProduct({ id, data }) : createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      alert("Product saved successfully!");
      navigate("/administrator/dashboard/products");
    },
    onError: (error) => {
      console.error("Mutation Error:", error);
      alert(`Failed to save product: ${error.response?.data?.message || error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData();

    // Append simple fields
    Object.keys(formData).forEach(key => {
      if (key === "image" || key === "gallery") return;
      if (key === "keywords") {
        data.append("tags", formData.keywords.split(",").map(k => k.trim()));
        return;
      }
      if (key === "status") {
        data.append("isActive", formData.status === "active");
        return;
      }
      if (key === "isSubscription" || key === "isOneTime") return; // Handled via productType

      data.append(key, formData[key]);
    });

    // Handle derived fields
    const productType = formData.isSubscription && formData.isOneTime ? "both" : formData.isSubscription ? "subscription" : "one-time";
    data.append("productType", productType);
    data.append("trackInventory", formData.stockStatus === "manage_inventory");

    // Append files
    if (formData.image) data.append("image", formData.image);
    formData.gallery.forEach(file => data.append("gallery", file));

    mutation.mutate(data);
  };

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="btn btn-circle btn-ghost">
          <ChevronLeft />
        </button>
        <h1 className="text-2xl font-bold">{isEdit ? "Edit Product" : "Add Product"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* About Product */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">About Product</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="form-control md:col-span-3">
                <label className="label">Name</label>
                <input required name="name" value={formData.name} onChange={handleChange} className="input input-bordered w-full" placeholder="Enter Name" />
              </div>
              <div className="form-control">
                <label className="label">SKU</label>
                <input name="sku" value={formData.sku} onChange={handleChange} className="input input-bordered w-full" placeholder="SKU" />
              </div>
              <div className="form-control">
                <label className="label">Weight (g)</label>
                <input type="number" name="weight" value={formData.weight} onChange={handleChange} className="input input-bordered w-full" placeholder="Weight" />
              </div>
              <div className="form-control">
                <label className="label">Slug</label>
                <input name="slug" value={formData.slug} onChange={handleChange} className="input input-bordered w-full" placeholder="Slug" />
              </div>
              <div className="form-control md:col-span-3">
                <label className="label">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="textarea textarea-bordered h-24 w-full" placeholder="Product Description"></textarea>
              </div>
              <div className="form-control md:col-span-3">
                <label className="label">Short Description</label>
                <textarea name="shortDescription" value={formData.shortDescription} onChange={handleChange} className="textarea textarea-bordered w-full" placeholder="Short Description"></textarea>
              </div>
              <div className="form-control md:col-span-2">
                <label className="label">Keywords</label>
                <input name="keywords" value={formData.keywords} onChange={handleChange} className="input input-bordered w-full" placeholder="milk, fresh, organic" />
              </div>
              <div className="form-control">
                <label className="label">Product Feature</label>
                <select name="productFeature" value={formData.productFeature} onChange={handleChange} className="select select-bordered w-full">
                  <option value="">Select Feature</option>
                  <option value="new">New Arrival</option>
                  <option value="bestseller">Best Seller</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Pricing & Unit</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label">Prepaid Price (Optional)</label>
                <input type="number" name="prepaidPrice" value={formData.prepaidPrice} onChange={handleChange} className="input input-bordered" />
              </div>
              <div className="form-control">
                <label className="label">Unit</label>
                <select name="unit" value={formData.unit} onChange={handleChange} className="select select-bordered">
                  <option value="litre">Litre</option>
                  <option value="ml">ML</option>
                  <option value="kg">KG</option>
                  <option value="gram">Gram</option>
                  <option value="piece">Piece</option>
                  <option value="pack">Pack</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">Pack Size (Unit Value)</label>
                <input type="number" name="unitValue" value={formData.unitValue} onChange={handleChange} className="input input-bordered" placeholder="e.g. 1 or 500" />
              </div>

              {/* Regular Pricing */}
              <div className="form-control md:col-span-3">
                <h3 className="font-semibold text-gray-700 mb-2">Regular Pricing (Subscription & One-Time)</h3>
              </div>
              <div className="form-control">
                <label className="label">Selling Price (Inc. Tax)</label>
                <input required type="number" name="price" value={formData.price} onChange={handleChange} className="input input-bordered" />
              </div>
              <div className="form-control">
                <label className="label">Tax (%)</label>
                <input type="number" name="taxRate" value={formData.taxRate} onChange={handleChange} className="input input-bordered" />
              </div>
              <div className="form-control">
                <label className="label">MRP</label>
                <input type="number" name="mrp" value={formData.mrp} onChange={handleChange} className="input input-bordered" />
              </div>

              {/* Trial Pack Pricing */}
              <div className="form-control md:col-span-3 mt-4">
                <label className="label cursor-pointer justify-start gap-3 bg-blue-50 p-3 rounded-lg">
                  <input
                    type="checkbox"
                    name="trialEnabled"
                    checked={formData.trialEnabled}
                    onChange={handleChange}
                    className="checkbox checkbox-primary"
                  />
                  <div>
                    <span className="label-text font-semibold text-blue-900">Enable Trial Pack</span>
                    <p className="text-xs text-blue-700 mt-1">Allow customers to purchase this product as a trial pack with special pricing</p>
                  </div>
                </label>
              </div>

              {formData.trialEnabled && (
                <>
                  <div className="form-control md:col-span-3">
                    <h3 className="font-semibold text-blue-700 mb-2">Trial Pack Pricing</h3>
                  </div>
                  <div className="form-control">
                    <label className="label">Trial Price (Inc. Tax)</label>
                    <input
                      type="number"
                      name="trialPrice"
                      value={formData.trialPrice}
                      onChange={handleChange}
                      className="input input-bordered input-primary"
                      placeholder="Special trial price"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">Trial MRP</label>
                    <input
                      type="number"
                      name="trialMrp"
                      value={formData.trialMrp}
                      onChange={handleChange}
                      className="input input-bordered input-primary"
                      placeholder="Trial pack MRP"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">Trial Duration</label>
                    <select
                      name="trialDuration"
                      value={formData.trialDuration}
                      onChange={handleChange}
                      className="select select-bordered select-primary"
                    >
                      <option value="3">3 Days</option>
                      <option value="7">7 Days (1 Week)</option>
                      <option value="10">10 Days</option>
                      <option value="15">15 Days (2 Weeks)</option>
                      <option value="21">21 Days (3 Weeks)</option>
                      <option value="30">30 Days (1 Month)</option>
                      <option value="custom">Custom Duration</option>
                    </select>
                  </div>
                  {formData.trialDuration === "custom" && (
                    <div className="form-control">
                      <label className="label">Custom Days</label>
                      <input
                        type="number"
                        name="customTrialDays"
                        value={formData.customTrialDays || ""}
                        onChange={handleChange}
                        className="input input-bordered input-primary"
                        placeholder="Enter number of days"
                        min="1"
                        max="365"
                      />
                    </div>
                  )}
                  <div className="form-control flex items-end">
                    <div className="alert alert-info py-2 px-3 text-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span>Trial price should be lower than regular price to attract customers</span>
                    </div>
                  </div>
                </>
              )}

              {/* One-Time Purchase Pricing */}
              <div className="form-control md:col-span-3 mt-4">
                <label className="label cursor-pointer justify-start gap-3 bg-green-50 p-3 rounded-lg">
                  <input
                    type="checkbox"
                    name="oneTimePriceEnabled"
                    checked={formData.oneTimePriceEnabled}
                    onChange={handleChange}
                    className="checkbox checkbox-success"
                  />
                  <div>
                    <span className="label-text font-semibold text-green-900">Enable Separate One-Time Pricing</span>
                    <p className="text-xs text-green-700 mt-1">Set a different price for one-time purchases (if disabled, uses base subscription price)</p>
                  </div>
                </label>
              </div>

              {formData.oneTimePriceEnabled && (
                <>
                  <div className="form-control md:col-span-3">
                    <h3 className="font-semibold text-green-700 mb-2">One-Time Purchase Pricing</h3>
                  </div>
                  <div className="form-control">
                    <label className="label">One-Time Price (Inc. Tax)</label>
                    <input
                      type="number"
                      name="oneTimePrice"
                      value={formData.oneTimePrice}
                      onChange={handleChange}
                      className="input input-bordered input-success"
                      placeholder="One-time purchase price"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">One-Time MRP</label>
                    <input
                      type="number"
                      name="oneTimeMrp"
                      value={formData.oneTimeMrp}
                      onChange={handleChange}
                      className="input input-bordered input-success"
                      placeholder="One-time MRP"
                    />
                  </div>
                  <div className="form-control flex items-end">
                    <div className="alert alert-success py-2 px-3 text-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>One-time price can be higher than subscription to encourage subscriptions</span>
                    </div>
                  </div>
                </>
              )}

              <div className="form-control">
                <label className="label">Min Order Qty</label>
                <input type="number" name="minQuantity" value={formData.minQuantity} onChange={handleChange} className="input input-bordered" />
              </div>
              <div className="form-control">
                <label className="label">Discount Text</label>
                <input name="discountText" value={formData.discountText} onChange={handleChange} className="input input-bordered" />
              </div>
              <div className="form-control">
                <label className="label">Cancellation Charge</label>
                <input type="number" name="cancellationCharge" value={formData.cancellationCharge} onChange={handleChange} className="input input-bordered" />
              </div>
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Inventory</h2>
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <span className="label-text">Stock Management:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="stockStatus" value="no_stock_required" checked={formData.stockStatus === "no_stock_required"} onChange={handleChange} className="radio radio-primary" />
                  <span>No stock required</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="stockStatus" value="manage_inventory" checked={formData.stockStatus === "manage_inventory"} onChange={handleChange} className="radio radio-primary" />
                  <span>Manage inventory</span>
                </label>
              </label>
            </div>
            {formData.stockStatus === "manage_inventory" && (
              <div className="form-control max-w-xs mt-2">
                <label className="label">Stock Quantity</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="input input-bordered" />
              </div>
            )}
          </div>
        </div>

        {/* Delivery & Logistics */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Delivery & Logistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">Lead Time (mins)</label>
                <input type="number" name="leadTime" value={formData.leadTime} onChange={handleChange} className="input input-bordered" />
              </div>
              <div className="form-control">
                <label className="label">Admin Lead Time (mins)</label>
                <input type="number" name="adminLeadTime" value={formData.adminLeadTime} onChange={handleChange} className="input input-bordered" />
              </div>
              <div className="form-control">
                <label className="label">Default Expiry Days</label>
                <input type="number" name="expiryDays" value={formData.expiryDays} onChange={handleChange} className="input input-bordered" />
              </div>
              <div className="form-control">
                <label className="label">Harvest Period</label>
                <input name="harvestPeriod" value={formData.harvestPeriod} onChange={handleChange} className="input input-bordered" />
              </div>
              <div className="form-control">
                <label className="label">Cutoff Time (HH:MM)</label>
                <input type="time" name="cutoffTime" value={formData.cutoffTime} onChange={handleChange} className="input input-bordered" />
                <label className="label-text-alt text-gray-400 mt-1">Leave empty to use global setting</label>
              </div>
              <div className="form-control">
                <label className="label">Cutoff Type</label>
                <select name="cutoffDay" value={formData.cutoffDay} onChange={handleChange} className="select select-bordered w-full">
                  <option value="">Default (Use Global Setting)</option>
                  <option value="-1">Previous Day (Order today for tomorrow)</option>
                  <option value="0">Same Day (Order today for today)</option>
                </select>
                <label className="label-text-alt text-gray-400 mt-1">When does the order close?</label>
              </div>
            </div>
          </div>
        </div>

        {/* Categorization */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Categorization</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value, subcategory: "" }); // Reset subcategory on parent change
                  }}
                  className="select select-bordered"
                >
                  <option value="">Select Category</option>
                  {categories?.result?.filter(c => !c.parent).map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Show Subcategory if parent selected and subcategories exist */}
              {formData.category && categories?.result?.some(c => c.parent?._id === formData.category || c.parent === formData.category) && (
                <div className="form-control">
                  <label className="label">Sub Category</label>
                  <select
                    name="subcategory"
                    value={formData.subcategory}
                    onChange={(e) => {
                      setFormData({ ...formData, subcategory: e.target.value, childCategory: "" });
                    }}
                    className="select select-bordered"
                  >
                    <option value="">Select Sub Category</option>
                    {categories?.result?.filter(c => c.parent?._id === formData.category || c.parent === formData.category).map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Show Child Category if subcategory selected and children exist */}
              {formData.subcategory && categories?.result?.some(c => c.parent?._id === formData.subcategory || c.parent === formData.subcategory) && (
                <div className="form-control">
                  <label className="label">Leaf Category</label>
                  <select name="childCategory" value={formData.childCategory} onChange={handleChange} className="select select-bordered">
                    <option value="">Select Child Category</option>
                    {categories?.result?.filter(c => c.parent?._id === formData.subcategory || c.parent === formData.subcategory).map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-control">
                <label className="label">Hub</label>
                <select name="hub" value={formData.hub} onChange={handleChange} className="select select-bordered">
                  <option value="">Select Hub</option>
                  {hubs?.result?.map(hub => (
                    <option key={hub._id} value={hub._id}>{hub.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Images</h2>
            <div className="form-control">
              <label className="label">Product Image</label>
              <input type="file" name="image" onChange={handleChange} className="file-input file-input-bordered w-full" accept="image/*" />
              {preview && <img src={preview} alt="Preview" className="w-32 h-32 mt-2 object-cover rounded border" />}
            </div>
            <div className="form-control mt-4">
              <label className="label">Product Gallery</label>
              <input type="file" name="gallery" multiple onChange={handleChange} className="file-input file-input-bordered w-full" accept="image/*" />
              <div className="flex gap-2 mt-2 flex-wrap">
                {galleryPreviews.map((src, idx) => (
                  <img key={idx} src={src} alt={`Gallery ${idx}`} className="w-20 h-20 object-cover rounded border" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Settings</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <span className="label-text font-medium">Status</span>
                  <input type="checkbox" className="toggle toggle-success" checked={formData.status === "active"} onChange={(e) => setFormData({ ...formData, status: e.target.checked ? "active" : "inactive" })} />
                  <span className="label-text">{formData.status === "active" ? "Active" : "Inactive"}</span>
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <span className="label-text font-medium">Is Visible?</span>
                  <input type="checkbox" name="isVisible" checked={formData.isVisible} onChange={handleChange} className="toggle toggle-primary" />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <span className="label-text font-medium">Reverse Logistic</span>
                  <input type="checkbox" name="reverseLogistic" checked={formData.reverseLogistic} onChange={handleChange} className="toggle toggle-primary" />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <span className="label-text font-medium">Is Subscription?</span>
                  <input type="checkbox" name="isSubscription" checked={formData.isSubscription} onChange={handleChange} className="toggle toggle-primary" />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <span className="label-text font-medium">Is One Time?</span>
                  <input type="checkbox" name="isOneTime" checked={formData.isOneTime} onChange={handleChange} className="toggle toggle-primary" />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <span className="label-text font-medium">Qty Can Vary?</span>
                  <input type="checkbox" name="actualQuantityCanVary" checked={formData.actualQuantityCanVary} onChange={handleChange} className="toggle toggle-primary" />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <span className="label-text font-medium">Is Trending?</span>
                  <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange} className="toggle toggle-primary" />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-2">
                  <span className="label-text font-medium">Auto Assign?</span>
                  <input type="checkbox" name="autoAssignToDeliveryBoy" checked={formData.autoAssignToDeliveryBoy} onChange={handleChange} className="toggle toggle-primary" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-end">
          <button type="button" className="btn" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-primary min-w-[150px]" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : (isEdit ? "Update Product" : "Create Product")}
          </button>
        </div>
      </form>
    </div>
  );
};
