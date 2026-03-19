import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { axiosInstance } from "../lib/axios";
import { getHubs } from "../lib/api/logistics";

const getSettings = async () => {
    const response = await axiosInstance.get("/api/settings");
    return response.data;
};

const updateSettings = async ({ section, data }) => {
    const response = await axiosInstance.put("/api/settings", { section, data });
    return response.data;
};

export const Settings = () => {
    const [activeTab, setActiveTab] = useState("site");

    const { data, isLoading } = useQuery({
        queryKey: ["settings"],
        queryFn: getSettings,
    });

    const settings = data?.result || {};

    const mutation = useMutation({
        mutationFn: updateSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            alert("Settings saved successfully!");
        },
        onError: (err) => {
            alert(err.response?.data?.message || "Failed to save settings");
        },
    });

    const tabs = [
        { id: "site", label: "🎨 Site Customization", icon: "🎨" },
        { id: "header", label: "📑 Header", icon: "📑" },
        { id: "footer", label: "📋 Footer", icon: "📋" },
        { id: "adminFooter", label: "🛡️ Admin Footer", icon: "🛡️" },
        { id: "sms", label: "📱 SMS Gateway", icon: "📱" },
        { id: "payment", label: "💳 Payment Gateway", icon: "💳" },
        { id: "maps", label: "🗺️ Maps", icon: "🗺️" },
        { id: "email", label: "📧 Email", icon: "📧" },
        { id: "whatsapp", label: "💬 WhatsApp", icon: "💬" },
        { id: "order", label: "🚚 Order & Delivery", icon: "🚚" },
        { id: "referral", label: "🎁 Referral", icon: "🎁" },
        { id: "firebase", label: "🔥 Firebase", icon: "🔥" },
        { id: "manualEmail", label: "📤 Manual Mailer", icon: "📤" },
    ];

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="p-2 sm:p-4 md:p-6">
            <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">⚙️ Settings</h1>

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                {/* Mobile: Horizontal scrollable tabs */}
                <div className="lg:hidden overflow-x-auto -mx-2 px-2 pb-2">
                    <div className="flex gap-2 min-w-max">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`btn btn-sm whitespace-nowrap ${activeTab === tab.id ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Desktop: Sidebar Tabs */}
                <div className="hidden lg:block lg:w-64 flex-shrink-0">
                    <ul className="menu bg-base-200 rounded-box">
                        {tabs.map((tab) => (
                            <li key={tab.id}>
                                <a
                                    className={activeTab === tab.id ? "active" : ""}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            {activeTab === "site" && <SiteSettings settings={settings.site} onSave={(data) => mutation.mutate({ section: "site", data })} />}
                            {activeTab === "header" && <HeaderSettings settings={settings.header} onSave={(data) => mutation.mutate({ section: "header", data })} />}
                            {activeTab === "footer" && <FooterSettings settings={settings.footer} onSave={(data) => mutation.mutate({ section: "footer", data })} />}
                            {activeTab === "adminFooter" && <FooterSettings settings={settings.adminFooter} onSave={(data) => mutation.mutate({ section: "adminFooter", data })} title="🛡️ Admin Footer Settings" />}
                            {activeTab === "sms" && <SmsSettings settings={settings.smsGateway} onSave={(data) => mutation.mutate({ section: "smsGateway", data })} />}
                            {activeTab === "payment" && <PaymentSettings settings={settings.paymentGateway} onSave={(data) => mutation.mutate({ section: "paymentGateway", data })} />}
                            {activeTab === "maps" && <MapsSettings settings={settings.maps} onSave={(data) => mutation.mutate({ section: "maps", data })} />}
                            {activeTab === "email" && <EmailSettings settings={settings.email} onSave={(data) => mutation.mutate({ section: "email", data })} />}
                            {activeTab === "whatsapp" && <WhatsAppSettings settings={settings.whatsapp} onSave={(data) => mutation.mutate({ section: "whatsapp", data })} />}
                            {activeTab === "order" && <OrderSettings settings={settings.order} onSave={(data) => mutation.mutate({ section: "order", data })} />}
                            {activeTab === "referral" && <ReferralSettings settings={settings.referral} onSave={(data) => mutation.mutate({ section: "referral", data })} />}
                            {activeTab === "firebase" && <FirebaseSettings settings={settings.firebase} onSave={(data) => mutation.mutate({ section: "firebase", data })} />}
                            {activeTab === "manualEmail" && <ManualEmailSettings settings={settings} />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// File Upload Component
const FileUpload = ({ label, value, onUpload }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        try {
            const response = await axiosInstance.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUpload(response.data.url);
        } catch (error) {
            alert('Upload failed');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="form-control w-full">
            <label className="label">
                <span className="label-text">{label}</span>
            </label>
            <div className="flex gap-2 items-center">
                <input
                    type="file"
                    className="file-input file-input-bordered w-full"
                    onChange={handleFileChange}
                    accept="image/*"
                    disabled={uploading}
                />
                {uploading && <span className="loading loading-spinner"></span>}
            </div>
            {value && (
                <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Current Image:</p>
                    <img src={value} alt="Preview" className="h-12 object-contain border rounded p-1" />
                </div>
            )}
        </div>
    );
};

// Site Customization Settings
const SiteSettings = ({ settings = {}, onSave }) => {
    const { data: hubsData } = useQuery({ queryKey: ["hubs"], queryFn: getHubs });
    const hubs = hubsData?.result || [];

    const [form, setForm] = useState({
        // Company Details
        companyName: settings.companyName || "Jefvi Agro Products Private Limited",
        companyAddress: settings.companyAddress || "",
        companyWelcomeNote: settings.companyWelcomeNote || "Welcome to Stoi Milk's Web App",
        gstin: settings.gstin || "",

        // Website Info
        siteName: settings.siteName || "STOI Milk",
        websiteLink: settings.websiteLink || "https://stoimilk.com",
        domainName: settings.domainName || "www.stoimilk.com",
        tagline: settings.tagline || "",

        // Contact Info
        customerCareNumber: settings.customerCareNumber || "",
        customerCareWhatsapp: settings.customerCareWhatsapp || "",
        customerCareEmail: settings.customerCareEmail || "",

        // Logos
        logo: settings.logo || "",
        logoSecondary: settings.logoSecondary || "",
        favicon: settings.favicon || "",

        // Colors
        primaryColor: settings.primaryColor || "#14b8a6",
        secondaryColor: settings.secondaryColor || "#0d9488",

        // Other
        countryCode: settings.countryCode || "91",
        defaultHub: settings.defaultHub || "",
        defaultOtp: settings.defaultOtp || "7777",
        defaultOtpMobileNumbers: settings.defaultOtpMobileNumbers || "",
    });

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">🎨 General Settings</h2>

            {/* Company Details Section */}
            <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="my-accordion-2" defaultChecked />
                <div className="collapse-title text-lg font-medium">
                    🏢 Company Details
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control md:col-span-2">
                            <label className="label">Company Name</label>
                            <input type="text" className="input input-bordered" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                        </div>
                        <div className="form-control md:col-span-2">
                            <label className="label">Company Address</label>
                            <textarea className="textarea textarea-bordered h-24" value={form.companyAddress} onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}></textarea>
                        </div>
                        <div className="form-control">
                            <label className="label">GSTIN</label>
                            <input type="text" className="input input-bordered" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
                        </div>
                        <div className="form-control">
                            <label className="label">Company Welcome Note</label>
                            <input type="text" className="input input-bordered" value={form.companyWelcomeNote} onChange={(e) => setForm({ ...form, companyWelcomeNote: e.target.value })} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Website Link Section */}
            <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="my-accordion-2" />
                <div className="collapse-title text-lg font-medium">
                    🌐 Website Link
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control md:col-span-2">
                            <label className="label">Web site Name (URL)</label>
                            <input type="text" className="input input-bordered" value={form.websiteLink} onChange={(e) => setForm({ ...form, websiteLink: e.target.value })} />
                        </div>
                        <div className="form-control md:col-span-2">
                            <label className="label">Domain Name</label>
                            <input type="text" className="input input-bordered" value={form.domainName} onChange={(e) => setForm({ ...form, domainName: e.target.value })} />
                        </div>
                        <div className="form-control">
                            <label className="label">Site Display Name</label>
                            <input type="text" className="input input-bordered" value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
                        </div>
                        <div className="form-control">
                            <label className="label">Company Tagline</label>
                            <input type="text" className="input input-bordered" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Info Section */}
            <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="my-accordion-2" />
                <div className="collapse-title text-lg font-medium">
                    📞 Contact Info
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label">Customer Care Number</label>
                            <input type="text" className="input input-bordered" value={form.customerCareNumber} onChange={(e) => setForm({ ...form, customerCareNumber: e.target.value })} />
                        </div>
                        <div className="form-control">
                            <label className="label">Customer Care Whatsapp Number</label>
                            <input type="text" className="input input-bordered" value={form.customerCareWhatsapp} onChange={(e) => setForm({ ...form, customerCareWhatsapp: e.target.value })} />
                        </div>
                        <div className="form-control md:col-span-2">
                            <label className="label">Customer Care Email</label>
                            <input type="email" className="input input-bordered" value={form.customerCareEmail} onChange={(e) => setForm({ ...form, customerCareEmail: e.target.value })} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Logos Section */}
            <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="my-accordion-2" />
                <div className="collapse-title text-lg font-medium">
                    🖼️ Logos & Branding
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileUpload label="Logo Header" value={form.logo} onUpload={(url) => setForm(prev => ({ ...prev, logo: url }))} />
                        <FileUpload label="Logo Secondary" value={form.logoSecondary} onUpload={(url) => setForm(prev => ({ ...prev, logoSecondary: url }))} />
                        <FileUpload label="Fav Icon" value={form.favicon} onUpload={(url) => setForm(prev => ({ ...prev, favicon: url }))} />

                        <div className="hidden md:block"></div> {/* Spacer for alignment */}

                        <div className="form-control">
                            <label className="label">Primary Color</label>
                            <div className="flex gap-2">
                                <input type="color" className="w-12 h-12 rounded cursor-pointer" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
                                <input type="text" className="input input-bordered flex-1" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-control">
                            <label className="label">Secondary Color</label>
                            <div className="flex gap-2">
                                <input type="color" className="w-12 h-12 rounded cursor-pointer" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
                                <input type="text" className="input input-bordered flex-1" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Other Settings Section */}
            <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="my-accordion-2" />
                <div className="collapse-title text-lg font-medium">
                    ⚙️ Other Settings
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control">
                            <label className="label">Country Code</label>
                            <input type="text" className="input input-bordered" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} />
                        </div>
                        <div className="form-control">
                            <label className="label">Select Default Hub</label>
                             <select className="select select-bordered" value={form.defaultHub} onChange={(e) => setForm({ ...form, defaultHub: e.target.value })}>
                                <option value="">Select Hub</option>
                                {hubs.map((hub) => (
                                    <option key={hub._id || hub.id} value={hub.name}>
                                        {hub.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-control">
                            <label className="label">Default OTP</label>
                            <input type="text" className="input input-bordered" value={form.defaultOtp} onChange={(e) => setForm({ ...form, defaultOtp: e.target.value })} />
                        </div>
                        <div className="form-control md:col-span-2">
                            <label className="label">Default OTP Mobile Numbers</label>
                            <input type="text" className="input input-bordered" placeholder="Comma separated numbers" value={form.defaultOtpMobileNumbers} onChange={(e) => setForm({ ...form, defaultOtpMobileNumbers: e.target.value })} />
                            <label className="label">
                                <span className="label-text-alt">For multiple phone numbers (Example: 12xxxxxxxx,98xxxxxxxx). To allow all the numbers please use -1</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <button className="btn btn-primary w-full md:w-auto" onClick={() => onSave(form)}>
                💾 Save Changes
            </button>
        </div>
    );
};

// Header Settings
const HeaderSettings = ({ settings = {}, onSave }) => {
    const [form, setForm] = useState({
        showLogo: settings.showLogo ?? true,
        showSearch: settings.showSearch ?? true,
        showNotifications: settings.showNotifications ?? true,
        // New fields for top bar
        phone: settings.phone || "7598232759",
        showAppLinks: settings.showAppLinks ?? true,
        playStoreLink: settings.playStoreLink || "https://play.google.com/store",
        appStoreLink: settings.appStoreLink || "https://apps.apple.com",
    });

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">📑 Header Settings</h2>

            {/* Display Options */}
            <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="header-accordion" defaultChecked />
                <div className="collapse-title text-lg font-medium">
                    👁️ Display Options
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="toggle toggle-primary" checked={form.showLogo} onChange={(e) => setForm({ ...form, showLogo: e.target.checked })} />
                            <span>Show Logo in Header</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="toggle toggle-primary" checked={form.showSearch} onChange={(e) => setForm({ ...form, showSearch: e.target.checked })} />
                            <span>Show Search Bar</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="toggle toggle-primary" checked={form.showNotifications} onChange={(e) => setForm({ ...form, showNotifications: e.target.checked })} />
                            <span>Show Notifications Icon</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Top Bar Settings */}
            <div className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="header-accordion" />
                <div className="collapse-title text-lg font-medium">
                    📱 Top Bar Settings
                </div>
                <div className="collapse-content bg-base-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control md:col-span-2">
                            <label className="label">Contact Phone Number</label>
                            <input
                                type="text"
                                className="input input-bordered"
                                placeholder="e.g., 7598232759"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                            <label className="label">
                                <span className="label-text-alt">This number will be clickable and open the phone dialer</span>
                            </label>
                        </div>

                        <div className="form-control md:col-span-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary"
                                    checked={form.showAppLinks}
                                    onChange={(e) => setForm({ ...form, showAppLinks: e.target.checked })}
                                />
                                <span>Show App Store Links</span>
                            </label>
                        </div>

                        {form.showAppLinks && (
                            <>
                                <div className="form-control">
                                    <label className="label">Play Store Link</label>
                                    <input
                                        type="url"
                                        className="input input-bordered"
                                        placeholder="https://play.google.com/store/apps/..."
                                        value={form.playStoreLink}
                                        onChange={(e) => setForm({ ...form, playStoreLink: e.target.value })}
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">App Store Link</label>
                                    <input
                                        type="url"
                                        className="input input-bordered"
                                        placeholder="https://apps.apple.com/app/..."
                                        value={form.appStoreLink}
                                        onChange={(e) => setForm({ ...form, appStoreLink: e.target.value })}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <button className="btn btn-primary" onClick={() => onSave(form)}>💾 Save Changes</button>
        </div>
    );
};

// Footer Settings (Reusable for Admin Footer too)
const FooterSettings = ({ settings = {}, onSave, title = "📋 Footer Settings" }) => {
    const [form, setForm] = useState({
        copyrightText: settings.copyrightText || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        showSocialLinks: settings.showSocialLinks ?? true,
        socialLinks: settings.socialLinks || { facebook: "", twitter: "", instagram: "", youtube: "" },
    });

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold">{title}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="label">Copyright Text</label>
                    <input type="text" className="input input-bordered w-full" value={form.copyrightText} onChange={(e) => setForm({ ...form, copyrightText: e.target.value })} />
                </div>

                <div className="md:col-span-2">
                    <label className="label">Address</label>
                    <textarea className="textarea textarea-bordered w-full" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>

                <div>
                    <label className="label">Phone</label>
                    <input type="text" className="input input-bordered w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>

                <div>
                    <label className="label">Email</label>
                    <input type="email" className="input input-bordered w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>

                <div className="md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                        <input type="checkbox" className="toggle toggle-primary" checked={form.showSocialLinks} onChange={(e) => setForm({ ...form, showSocialLinks: e.target.checked })} />
                        <span>Show Social Links</span>
                    </label>

                    {form.showSocialLinks && (
                        <div className="grid grid-cols-2 gap-3">
                            <input type="text" className="input input-bordered" placeholder="Facebook URL" value={form.socialLinks.facebook} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, facebook: e.target.value } })} />
                            <input type="text" className="input input-bordered" placeholder="Twitter URL" value={form.socialLinks.twitter} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, twitter: e.target.value } })} />
                            <input type="text" className="input input-bordered" placeholder="Instagram URL" value={form.socialLinks.instagram} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, instagram: e.target.value } })} />
                            <input type="text" className="input input-bordered" placeholder="YouTube URL" value={form.socialLinks.youtube} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, youtube: e.target.value } })} />
                        </div>
                    )}
                </div>
            </div>

            <button className="btn btn-primary" onClick={() => onSave(form)}>💾 Save Changes</button>
        </div>
    );
};

// SMS Gateway Settings
const SmsSettings = ({ settings = {}, onSave }) => {
    const [form, setForm] = useState({
        enabled: settings.enabled ?? false,
        provider: settings.provider || "msg91",
        apiKey: "",
        senderId: settings.senderId || "",
        templateId: settings.templateId || "",
        templates: {
            collection: settings.templates?.collection || "Dear {vendor}, {qty}L milk collected ({shift}) on {date}. Rate: Rs.{rate}/L. Amount: Rs.{amount}. - Stoi",
            vendorPayment: settings.templates?.vendorPayment || settings.templates?.payment || "Dear {vendor}, payment of Rs.{amount} has been processed. - Stoi",
            otp: settings.templates?.otp || "Your OTP is {otp} for Stoi Milk login. Valid for 10 mins.",
            welcome: settings.templates?.welcome || "Welcome to Stoi Milk {name}! We are excited to serve you fresh milk daily.",
            subscription: settings.templates?.subscription || "Dear {name}, subscription for {product} ({qty}) started from {date}. - Stoi",
            customerPayment: settings.templates?.customerPayment || "Dear {name}, payment of Rs.{amount} received successfully. Txn ID: {txnId}. - Stoi",
            delivery: settings.templates?.delivery || "Dear {name}, your milk order was delivered at {time}. Enjoy! - Stoi"
        }
    });

    const handleSave = () => {
        const cleanForm = { ...form };
        if (!cleanForm.apiKey) delete cleanForm.apiKey;
        onSave(cleanForm);
    };

    const updateTemplate = (key, value) => {
        setForm(prev => ({ ...prev, templates: { ...prev.templates, [key]: value } }));
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">📱 SMS Gateway & Templates</h2>

            <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg border">
                <div>
                    <h3 className="font-semibold">Enable SMS Gateway</h3>
                    <p className="text-sm text-gray-500">Send automated SMS notifications</p>
                </div>
                <input type="checkbox" className="toggle toggle-success" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!form.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Provider Config */}
                <div className="md:col-span-2 divider font-semibold">Provider Configuration</div>
                <div>
                    <label className="label">Provider</label>
                    <select className="select select-bordered w-full" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                        <option value="msg91">MSG91</option>
                        <option value="twilio">Twilio</option>
                        <option value="textlocal">TextLocal</option>
                    </select>
                </div>

                <div>
                    <label className="label">API Key / Auth Token</label>
                    <input type="password" className="input input-bordered w-full" placeholder={settings.apiKey ? "••••••••" : "Enter API Key"} value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
                </div>

                <div>
                    <label className="label">Sender ID</label>
                    <input type="text" className="input input-bordered w-full" placeholder="e.g., STOIMK" value={form.senderId} onChange={(e) => setForm({ ...form, senderId: e.target.value })} />
                </div>

                <div>
                    <label className="label">DLT Template ID (Global)</label>
                    <input type="text" className="input input-bordered w-full" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} />
                </div>

                {/* Templates Section - Vendor */}
                <div className="md:col-span-2 divider font-semibold">Vendor Notifications</div>

                <div className="md:col-span-2 card bg-base-50 p-4 border">
                    <label className="label font-bold">Milk Collection (Daily)</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.collection} onChange={(e) => updateTemplate('collection', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{vendor}, {qty}, {shift}, {date}, {rate}, {amount}`}</div>
                </div>

                <div className="md:col-span-2 card bg-base-50 p-4 border">
                    <label className="label font-bold">Vendor Payment (Weekly/Monthly)</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.vendorPayment} onChange={(e) => updateTemplate('vendorPayment', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{vendor}, {amount}, {date}`}</div>
                </div>

                {/* Templates Section - Customer */}
                <div className="md:col-span-2 divider font-semibold">Customer Notifications</div>

                <div className="card bg-base-50 p-4 border">
                    <label className="label font-bold">OTP Login / Signup</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.otp} onChange={(e) => updateTemplate('otp', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{otp}`}</div>
                </div>

                <div className="card bg-base-50 p-4 border">
                    <label className="label font-bold">Welcome Message</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.welcome} onChange={(e) => updateTemplate('welcome', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{name}`}</div>
                </div>

                <div className="card bg-base-50 p-4 border">
                    <label className="label font-bold">Subscription Started</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.subscription} onChange={(e) => updateTemplate('subscription', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{name}, {product}, {qty}, {date}`}</div>
                </div>

                <div className="card bg-base-50 p-4 border">
                    <label className="label font-bold">Payment Received</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.customerPayment} onChange={(e) => updateTemplate('customerPayment', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{name}, {amount}, {txnId}`}</div>
                </div>

                <div className="md:col-span-2 card bg-base-50 p-4 border">
                    <label className="label font-bold">Order Delivered</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.delivery} onChange={(e) => updateTemplate('delivery', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{name}, {time}`}</div>
                </div>
            </div>

            <div className="flex gap-2 pt-4">
                <button className="btn btn-primary" onClick={handleSave}>💾 Save All Templates</button>
                <button className="btn btn-outline" onClick={() => alert("Test SMS to console triggered!")}>📤 Send Test SMS</button>
            </div>
        </div>
    );
};

// Payment Gateway Settings
const PaymentSettings = ({ settings = {}, onSave }) => {
    const [form, setForm] = useState({
        enabled: settings.enabled ?? false,
        provider: settings.provider || "razorpay",
        keyId: settings.keyId || "",
        keySecret: "",
        testMode: settings.testMode ?? true,
        companyQrImage: settings.companyQrImage || "",
    });

    const handleSave = () => {
        const cleanForm = { ...form };
        if (!cleanForm.keySecret) delete cleanForm.keySecret;
        onSave(cleanForm);
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold">💳 Payment Gateway</h2>

            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="toggle toggle-success" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                <span className={form.enabled ? "text-success font-bold" : ""}>{form.enabled ? "Enabled" : "Disabled"}</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label">Provider</label>
                    <select className="select select-bordered w-full" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                        <option value="razorpay">Razorpay</option>
                        <option value="paytm">Paytm</option>
                        <option value="stripe">Stripe</option>
                        <option value="phonepe">PhonePe</option>
                    </select>
                </div>

                <div>
                    <label className="flex items-center gap-3 cursor-pointer mt-8">
                        <input type="checkbox" className="toggle toggle-warning" checked={form.testMode} onChange={(e) => setForm({ ...form, testMode: e.target.checked })} />
                        <span>{form.testMode ? "Test Mode" : "Live Mode"}</span>
                    </label>
                </div>

                <div>
                    <label className="label">Key ID / API Key</label>
                    <input type="text" className="input input-bordered w-full" placeholder="Enter Key ID" value={form.keyId} onChange={(e) => setForm({ ...form, keyId: e.target.value })} />
                </div>

                <div>
                    <label className="label">Key Secret</label>
                    <input type="password" className="input input-bordered w-full" placeholder="Enter Key Secret" value={form.keySecret} onChange={(e) => setForm({ ...form, keySecret: e.target.value })} />
                </div>
            </div>

            {/* Company QR Code for Field Sales */}
            <div className="bg-base-200 rounded-xl p-4 space-y-3">
                <div>
                    <h3 className="font-semibold">📱 Company QR Code (Field Sales)</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Upload your company UPI QR code image. Field Sales officers will show this to customers for payment collection.</p>
                </div>
                <FileUpload
                    label="Company QR Image"
                    value={form.companyQrImage}
                    onUpload={(url) => setForm(prev => ({ ...prev, companyQrImage: url }))}
                />
                {form.companyQrImage && (
                    <div className="flex items-center gap-3">
                        <img src={form.companyQrImage} alt="Company QR" className="h-32 w-32 object-contain border rounded-lg p-1 bg-white" />
                        <button
                            type="button"
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => setForm(prev => ({ ...prev, companyQrImage: "" }))}
                        >
                            Remove
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <button className="btn btn-primary" onClick={handleSave}>💾 Save Changes</button>
                <button className="btn btn-outline" onClick={() => alert("Payment gateway test successful!")}>🔗 Test Connection</button>
            </div>
        </div>
    );
};

// Maps Settings
const MapsSettings = ({ settings = {}, onSave }) => {
    const NAGERCOIL = { lat: 8.1833, lng: 77.4119, zoom: 13 };

    const [form, setForm] = useState({
        enabled: settings.enabled ?? false,
        provider: settings.provider || "openstreetmap",
        apiKey: "",
        defaultLat: settings.defaultLat ?? NAGERCOIL.lat,
        defaultLng: settings.defaultLng ?? NAGERCOIL.lng,
        defaultZoom: settings.defaultZoom ?? NAGERCOIL.zoom,
    });
    const [previewSrc, setPreviewSrc] = useState(null);
    const [locationName, setLocationName] = useState("");
    const [geocoding, setGeocoding] = useState(false);

    const applyPreview = async () => {
        const lat = parseFloat(form.defaultLat);
        const lng = parseFloat(form.defaultLng);
        if (isNaN(lat) || isNaN(lng)) return;
        const half = 0.04 * Math.pow(2, 13 - (form.defaultZoom || 13));
        const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - half},${lat - half},${lng + half},${lat + half}&layer=mapnik&marker=${lat},${lng}`;
        setPreviewSrc(src);
        setGeocoding(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const d = await res.json();
            setLocationName(d.display_name || `${lat}, ${lng}`);
        } catch { setLocationName(`${lat}, ${lng}`); }
        setGeocoding(false);
    };

    const handleSave = () => {
        const cleanForm = { ...form };
        if (!cleanForm.apiKey) delete cleanForm.apiKey;
        onSave(cleanForm);
    };

    return (
        <div className="space-y-5">
            <h2 className="text-xl font-bold">🗺️ Maps Settings</h2>

            <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="toggle toggle-success" checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                <span className={form.enabled ? "text-success font-bold" : ""}>{form.enabled ? "Enabled" : "Disabled"}</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label">Map Provider</label>
                    <select className="select select-bordered w-full" value={form.provider}
                        onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                        <option value="openstreetmap">OpenStreetMap (Free)</option>
                        <option value="google">Google Maps</option>
                        <option value="mapbox">Mapbox</option>
                    </select>
                </div>
                <div>
                    <label className="label">API Key (if required)</label>
                    <input type="password" className="input input-bordered w-full"
                        placeholder={settings.apiKey ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "Enter API Key"}
                        value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
                </div>
            </div>

            {/* Default Map Center */}
            <div className="bg-base-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h3 className="font-semibold">📍 Default Map Center</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Where the map opens by default on the customer address page.</p>
                    </div>
                    <button type="button" className="btn btn-xs btn-outline"
                        onClick={() => setForm(f => ({ ...f, defaultLat: NAGERCOIL.lat, defaultLng: NAGERCOIL.lng, defaultZoom: NAGERCOIL.zoom }))}>
                        Reset to Nagercoil
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="label text-xs font-semibold pb-1">Latitude</label>
                        <input type="number" step="0.0001" className="input input-bordered input-sm w-full"
                            value={form.defaultLat}
                            onChange={(e) => setForm({ ...form, defaultLat: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <label className="label text-xs font-semibold pb-1">Longitude</label>
                        <input type="number" step="0.0001" className="input input-bordered input-sm w-full"
                            value={form.defaultLng}
                            onChange={(e) => setForm({ ...form, defaultLng: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div>
                        <label className="label text-xs font-semibold pb-1">Zoom (1–20)</label>
                        <input type="number" min="1" max="20" className="input input-bordered input-sm w-full"
                            value={form.defaultZoom}
                            onChange={(e) => setForm({ ...form, defaultZoom: parseInt(e.target.value) || 13 })} />
                    </div>
                </div>

                <button type="button" className="btn btn-sm btn-outline w-full" onClick={applyPreview}>
                    🔍 Preview Location on Map
                </button>

                <div className="text-sm text-gray-600 flex items-start gap-2 min-h-[1.25rem]">
                    {geocoding
                        ? <span className="loading loading-spinner loading-xs mt-0.5" />
                        : locationName
                            ? <><span className="text-green-600 shrink-0">📍</span><span>{locationName}</span></>
                            : <span className="text-gray-400 italic text-xs">Click "Preview" to verify the area</span>
                    }
                </div>

                {previewSrc && (
                    <div className="h-52 rounded-xl overflow-hidden border border-base-300">
                        <iframe title="Map Preview" src={previewSrc}
                            style={{ width: "100%", height: "100%", border: 0 }} loading="lazy" />
                    </div>
                )}
            </div>

            <button className="btn btn-primary" onClick={handleSave}>💾 Save Changes</button>
        </div>
    );
};

// Email Settings
const EmailSettings = ({ settings = {}, onSave }) => {
    const [form, setForm] = useState({
        enabled: settings.enabled ?? false,
        provider: settings.provider || "smtp",
        host: settings.host || "",
        port: settings.port || 587,
        username: settings.username || "",
        password: "",
        fromEmail: settings.fromEmail || "",
        fromName: settings.fromName || "",
        // Triggers
        sendWelcomeEmail: settings.sendWelcomeEmail ?? true,
        sendSubscriptionEmail: settings.sendSubscriptionEmail ?? true,
        sendPaymentEmail: settings.sendPaymentEmail ?? true,
        sendInvoiceEmail: settings.sendInvoiceEmail ?? true,
        sendMonthlyInvoiceEmail: settings.sendMonthlyInvoiceEmail ?? true,
        templates: {
            welcome: {
                subject: settings.templates?.welcome?.subject || "",
                body: settings.templates?.welcome?.body || "",
                footer: settings.templates?.welcome?.footer || ""
            },
            subscription: {
                subject: settings.templates?.subscription?.subject || "",
                body: settings.templates?.subscription?.body || "",
                footer: settings.templates?.subscription?.footer || ""
            },
            customerPayment: {
                subject: settings.templates?.customerPayment?.subject || "",
                body: settings.templates?.customerPayment?.body || "",
                footer: settings.templates?.customerPayment?.footer || ""
            },
            invoice: {
                subject: settings.templates?.invoice?.subject || "",
                body: settings.templates?.invoice?.body || "",
                footer: settings.templates?.invoice?.footer || ""
            },
            monthlyInvoice: {
                subject: settings.templates?.monthlyInvoice?.subject || "",
                body: settings.templates?.monthlyInvoice?.body || "",
                footer: settings.templates?.monthlyInvoice?.footer || ""
            }
        }
    });

    const [testEmailId, setTestEmailId] = useState("");
    const [testing, setTesting] = useState(false);

    const [showPassword, setShowPassword] = useState(false);

    const handleSave = () => {
        const cleanForm = { ...form };
        if (!cleanForm.password) delete cleanForm.password;
        onSave(cleanForm);
    };

    const updateTemplate = (type, field, value) => {
        setForm(prev => ({
            ...prev,
            templates: {
                ...prev.templates,
                [type]: {
                    ...prev.templates[type],
                    [field]: value
                }
            }
        }));
    };

    const handleTestEmail = async () => {
        if (!testEmailId) return alert("Please enter an email ID");
        setTesting(true);
        try {
            const response = await axiosInstance.post("/api/settings/test-email", { email: testEmailId });
            alert(response.data.message || "Test email sent!");
        } catch (error) {
            alert(error.response?.data?.message || "Failed to send test email");
        } finally {
            setTesting(false);
        }
    };

    const TemplateCard = ({ title, type, variables }) => (
        <div className="card bg-base-50 p-4 border space-y-3">
            <h4 className="font-bold text-lg border-b pb-2">{title}</h4>
            
            <div>
                <label className="label text-xs uppercase font-semibold text-gray-500">Email Subject</label>
                <input 
                    type="text" 
                    className="input input-bordered w-full" 
                    value={form.templates[type].subject} 
                    onChange={(e) => updateTemplate(type, 'subject', e.target.value)}
                    placeholder="Enter email subject..."
                />
            </div>

            <div>
                <label className="label text-xs uppercase font-semibold text-gray-500">Email Body (HTML)</label>
                <textarea 
                    className="textarea textarea-bordered w-full h-32 font-mono text-sm"
                    value={form.templates[type].body} 
                    onChange={(e) => updateTemplate(type, 'body', e.target.value)}
                    placeholder="Enter main HTML body content..."
                />
            </div>

            <div>
                <label className="label text-xs uppercase font-semibold text-gray-500">Email Footer (Optional)</label>
                <textarea 
                    className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                    value={form.templates[type].footer} 
                    onChange={(e) => updateTemplate(type, 'footer', e.target.value)}
                    placeholder="Enter HTML footer content..."
                />
            </div>

            <div className="text-xs text-gray-500 bg-base-200 p-2 rounded">
                <strong>Available Variables:</strong> {variables}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">📧 Email Settings</h2>

            <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg border">
                <div>
                    <h3 className="font-semibold">Enable Email Service</h3>
                    <p className="text-sm text-gray-500">Send automated email notifications</p>
                </div>
                <input type="checkbox" className="toggle toggle-success" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!form.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="md:col-span-2 divider font-semibold">SMTP Configuration</div>
                <div>
                    <label className="label">Provider</label>
                    <select className="select select-bordered w-full" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                        <option value="smtp">SMTP (Recommended)</option>
                        <option value="sendgrid">SendGrid</option>
                        <option value="mailgun">Mailgun</option>
                        <option value="ses">AWS SES</option>
                    </select>
                </div>

                <div>
                    <label className="label">SMTP Host</label>
                    <input type="text" className="input input-bordered w-full" placeholder="smtp.example.com" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
                </div>

                <div>
                    <label className="label">Port</label>
                    <input type="number" className="input input-bordered w-full" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })} />
                </div>

                <div>
                    <label className="label">Username</label>
                    <input type="text" className="input input-bordered w-full" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>

                <div>
                    <label className="label">Password</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            className="input input-bordered w-full pr-10" 
                            placeholder="••••••••" 
                            value={form.password} 
                            onChange={(e) => setForm({ ...form, password: e.target.value })} 
                        />
                        <button 
                            type="button" 
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.644C3.399 8.049 7.21 4.5 12 4.5c4.791 0 8.601 3.549 9.963 7.178.07.186.07.389 0 .575C20.601 15.951 16.79 19.5 12 19.5c-4.791 0-8.601-3.549-9.963-7.178Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="label">From Email</label>
                    <input type="email" className="input input-bordered w-full" placeholder="noreply@example.com" value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} />
                </div>

                <div className="md:col-span-2">
                    <label className="label">From Name</label>
                    <input type="text" className="input input-bordered w-full" placeholder="STOI Milk" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} />
                </div>

                {/* Email Triggers */}
                <div className="md:col-span-2 divider font-semibold">Notification Triggers</div>
                
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-base-200 rounded-lg">
                        <input type="checkbox" className="checkbox checkbox-primary" checked={form.sendWelcomeEmail} onChange={(e) => setForm({ ...form, sendWelcomeEmail: e.target.checked })} />
                        <div className="flex flex-col">
                            <span className="font-medium">Welcome Signup</span>
                            <span className="text-xs text-gray-500">Sent on user registration</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-base-200 rounded-lg">
                        <input type="checkbox" className="checkbox checkbox-primary" checked={form.sendSubscriptionEmail} onChange={(e) => setForm({ ...form, sendSubscriptionEmail: e.target.checked })} />
                        <div className="flex flex-col">
                            <span className="font-medium">New Subscription</span>
                            <span className="text-xs text-gray-500">Sent when a subscription starts</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-base-200 rounded-lg">
                        <input type="checkbox" className="checkbox checkbox-primary" checked={form.sendPaymentEmail} onChange={(e) => setForm({ ...form, sendPaymentEmail: e.target.checked })} />
                        <div className="flex flex-col">
                            <span className="font-medium">Payment Done</span>
                            <span className="text-xs text-gray-500">Sent on wallet recharge</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-base-200 rounded-lg">
                        <input type="checkbox" className="checkbox checkbox-primary" checked={form.sendInvoiceEmail} onChange={(e) => setForm({ ...form, sendInvoiceEmail: e.target.checked })} />
                        <div className="flex flex-col">
                            <span className="font-medium">Invoice Generated</span>
                            <span className="text-xs text-gray-500">Sent on daily order creation</span>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-base-200 rounded-lg">
                        <input type="checkbox" className="checkbox checkbox-primary" checked={form.sendMonthlyInvoiceEmail} onChange={(e) => setForm({ ...form, sendMonthlyInvoiceEmail: e.target.checked })} />
                        <div className="flex flex-col">
                            <span className="font-medium">Monthly Statement</span>
                            <span className="text-xs text-gray-500">Sent on monthly closing</span>
                        </div>
                    </label>
                </div>

                {/* Email Templates */}
                <div className="md:col-span-2 divider font-semibold">Email Templates (HTML supported)</div>

                <div className="md:col-span-2 space-y-6">
                    <TemplateCard title="👋 Welcome Message" type="welcome" variables="{name}, {mobile}, {walletBalance}, {siteName}, {primaryColor}" />
                    <TemplateCard title="📦 Subscription Started" type="subscription" variables="{name}, {mobile}, {walletBalance}, {product}, {qty}, {date}, {siteName}, {primaryColor}" />
                    <TemplateCard title="💰 Payment Received" type="customerPayment" variables="{name}, {mobile}, {walletBalance}, {amount}, {txnId}, {siteName}, {primaryColor}" />
                    <TemplateCard title="📄 Daily Invoice Notification" type="invoice" variables="{name}, {mobile}, {walletBalance}, {orderId}, {amount}, {date}, {siteName}, {primaryColor}" />
                    <TemplateCard title="📊 Monthly Statement Summary" type="monthlyInvoice" variables="{name}, {mobile}, {walletBalance}, {statementNo}, {period}, {closingBalance}, {siteName}, {primaryColor}" />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                <button className="btn btn-primary" onClick={handleSave}>💾 Save Email Settings</button>
                
                <div className="flex-1 flex gap-2">
                    <input 
                        type="email" 
                        placeholder="Test email address" 
                        className="input input-bordered flex-1" 
                        value={testEmailId}
                        onChange={(e) => setTestEmailId(e.target.value)}
                    />
                    <button 
                        className={`btn btn-outline ${testing ? 'loading' : ''}`} 
                        onClick={handleTestEmail}
                        disabled={testing || !form.enabled}
                    >
                        📤 Send Test Mail
                    </button>
                </div>
            </div>
        </div>
    );
};

// Manual Email Tool
const ManualEmailSettings = ({ settings }) => {
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!email || !subject || !message) return alert("Please fill all fields");
        setSending(true);
        try {
            const response = await axiosInstance.post("/api/settings/send-email", {
                to: email,
                subject,
                html: message
            });
            alert(response.data.message || "Email sent successfully!");
            setEmail("");
            setSubject("");
            setMessage("");
        } catch (error) {
            alert(error.response?.data?.message || "Failed to send email");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">📤 Manual Email Composer</h2>
            <p className="text-sm text-gray-500">Send custom one-off emails to any address using your configured SMTP settings.</p>
            
            <div className="card bg-base-100 p-6 border shadow-sm space-y-4">
                <div className="form-control">
                    <label className="label font-semibold">Recipient Email</label>
                    <input 
                        type="email" 
                        className="input input-bordered w-full" 
                        placeholder="customer@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="form-control">
                    <label className="label font-semibold">Subject</label>
                    <input 
                        type="text" 
                        className="input input-bordered w-full" 
                        placeholder="Important Notice regarding your account"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                    />
                </div>

                <div className="form-control">
                    <label className="label font-semibold">Message Body (HTML Supported)</label>
                    <textarea 
                        className="textarea textarea-bordered w-full h-80 font-mono text-sm"
                        placeholder="<h1>Hello!</h1> <p>This is a custom message sent from the admin panel.</p>"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <label className="label">
                        <span className="label-text-alt text-gray-400">You can use HTML tags for better formatting.</span>
                    </label>
                </div>

                <div className="pt-2">
                    <button 
                        className={`btn btn-primary w-full ${sending ? 'loading' : ''}`}
                        onClick={handleSend}
                        disabled={sending || !settings.email?.enabled}
                    >
                        {sending ? "Sending..." : "🚀 Send Email Now"}
                    </button>
                    {!settings.email?.enabled && (
                        <p className="text-error text-xs text-center mt-2">
                            ⚠️ Email service is currently disabled. Please enable it in the Email Settings tab.
                        </p>
                    )}
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-bold text-blue-800 text-sm mb-1">Quick Tips:</h4>
                <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
                    <li>Use <code>&lt;br&gt;</code> for line breaks.</li>
                    <li>Use <code>&lt;b&gt;text&lt;/b&gt;</code> for bolding.</li>
                    <li>Verify the recipient's email address before clicking send.</li>
                </ul>
            </div>
        </div>
    );
};

// WhatsApp Settings
const WhatsAppSettings = ({ settings = {}, onSave }) => {
    const [form, setForm] = useState({
        enabled: settings.enabled ?? false,
        provider: settings.provider || "twilio",
        apiKey: "",
        phoneNumberId: settings.phoneNumberId || "",
        businessAccountId: settings.businessAccountId || "",
        templates: {
            collection: settings.templates?.collection || "",
            vendorPayment: settings.templates?.vendorPayment || settings.templates?.payment || "",
            otp: settings.templates?.otp || "",
            welcome: settings.templates?.welcome || "",
            subscription: settings.templates?.subscription || "",
            customerPayment: settings.templates?.customerPayment || "",
            delivery: settings.templates?.delivery || ""
        }
    });

    const handleSave = () => {
        const cleanForm = { ...form };
        if (!cleanForm.apiKey) delete cleanForm.apiKey;
        onSave(cleanForm);
    };

    const updateTemplate = (key, value) => {
        setForm(prev => ({ ...prev, templates: { ...prev.templates, [key]: value } }));
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">💬 WhatsApp Business</h2>

            <div className="flex items-center justify-between p-4 bg-base-100 rounded-lg border">
                <div>
                    <h3 className="font-semibold">Enable WhatsApp</h3>
                    <p className="text-sm text-gray-500">Send automated WhatsApp notifications</p>
                </div>
                <input type="checkbox" className="toggle toggle-success" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!form.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="md:col-span-2 divider font-semibold">Provider Configuration</div>
                <div>
                    <label className="label">Provider</label>
                    <select className="select select-bordered w-full" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                        <option value="twilio">Twilio</option>
                        <option value="wati">WATI</option>
                        <option value="gupshup">Gupshup</option>
                    </select>
                </div>

                <div>
                    <label className="label">API Key / Auth Token</label>
                    <input type="password" className="input input-bordered w-full" placeholder={settings.apiKey ? "••••••••" : "Enter API Key"} value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
                </div>

                <div>
                    <label className="label">Phone Number ID</label>
                    <input type="text" className="input input-bordered w-full" value={form.phoneNumberId} onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })} />
                </div>

                <div>
                    <label className="label">Business Account ID</label>
                    <input type="text" className="input input-bordered w-full" value={form.businessAccountId} onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })} />
                </div>

                {/* Templates Section - Vendor */}
                <div className="md:col-span-2 divider font-semibold">Vendor Notifications</div>

                <div className="md:col-span-2 card bg-base-50 p-4 border">
                    <label className="label font-bold">Milk Collection (Daily)</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.collection} onChange={(e) => updateTemplate('collection', e.target.value)}
                        placeholder="Template body or Template Name (if using logic)" />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{vendor}, {qty}, {shift}, {date}, {rate}, {amount}`}</div>
                </div>

                <div className="md:col-span-2 card bg-base-50 p-4 border">
                    <label className="label font-bold">Vendor Payment (Weekly/Monthly)</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.vendorPayment} onChange={(e) => updateTemplate('vendorPayment', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{vendor}, {amount}, {date}`}</div>
                </div>

                {/* Templates Section - Customer */}
                <div className="md:col-span-2 divider font-semibold">Customer Notifications</div>

                <div className="card bg-base-50 p-4 border">
                    <label className="label font-bold">OTP Login / Signup</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.otp} onChange={(e) => updateTemplate('otp', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{otp}`}</div>
                </div>

                <div className="card bg-base-50 p-4 border">
                    <label className="label font-bold">Welcome Message</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.welcome} onChange={(e) => updateTemplate('welcome', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{name}`}</div>
                </div>

                <div className="card bg-base-50 p-4 border">
                    <label className="label font-bold">Subscription Started</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.subscription} onChange={(e) => updateTemplate('subscription', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{name}, {product}, {qty}, {date}`}</div>
                </div>

                <div className="card bg-base-50 p-4 border">
                    <label className="label font-bold">Payment Received</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.customerPayment} onChange={(e) => updateTemplate('customerPayment', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{name}, {amount}, {txnId}`}</div>
                </div>

                <div className="md:col-span-2 card bg-base-50 p-4 border">
                    <label className="label font-bold">Order Delivered</label>
                    <textarea className="textarea textarea-bordered w-full h-20 font-mono text-sm"
                        value={form.templates.delivery} onChange={(e) => updateTemplate('delivery', e.target.value)} />
                    <div className="text-xs text-gray-500 mt-1">Vars: {`{name}, {time}, {items}`}</div>
                </div>

            </div>

            <div className="flex gap-2 pt-4">
                <button className="btn btn-primary" onClick={handleSave}>💾 Save All Templates</button>
                <button className="btn btn-outline" onClick={() => alert("Test WhatsApp triggered!")}>📤 Send Test Msg</button>
            </div>
        </div>
    );
};

// Order & Delivery Settings
const OrderSettings = ({ settings = {}, onSave }) => {
    const [form, setForm] = useState({
        customerCutoffTime: settings.customerCutoffTime || "19:00",
        customerCutoffDay: settings.customerCutoffDay !== undefined ? settings.customerCutoffDay : -1,
        adminCutoffTime: settings.adminCutoffTime || "04:00",
        adminCutoffDay: settings.adminCutoffDay !== undefined ? settings.adminCutoffDay : 0,
        deliveryCharge: settings.deliveryCharge || 0,
        minOrderValue: settings.minOrderValue || 0,
        deliverySlots: settings.deliverySlots || [],
    });

    const [newSlot, setNewSlot] = useState({ label: "", startTime: "05:00", endTime: "07:00" });

    const addSlot = () => {
        if (!newSlot.label.trim()) return;
        if (!newSlot.startTime || !newSlot.endTime) return;
        const exists = form.deliverySlots.some(s => s.label.toLowerCase() === newSlot.label.trim().toLowerCase());
        if (exists) return;
        setForm({
            ...form,
            deliverySlots: [...form.deliverySlots, { ...newSlot, label: newSlot.label.trim(), isActive: true }],
        });
        setNewSlot({ label: "", startTime: "05:00", endTime: "07:00" });
    };

    const removeSlot = (idx) => {
        setForm({
            ...form,
            deliverySlots: form.deliverySlots.filter((_, i) => i !== idx),
        });
    };

    const toggleSlot = (idx) => {
        const updated = [...form.deliverySlots];
        updated[idx] = { ...updated[idx], isActive: !updated[idx].isActive };
        setForm({ ...form, deliverySlots: updated });
    };

    const formatTime12 = (t) => {
        if (!t) return "";
        const [h, m] = t.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const hr = h % 12 || 12;
        return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">🚚 Order & Delivery Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                    <label className="label">Customer Cutoff</label>
                    <p className="text-xs text-gray-500 mb-2">When can customers modify next day's delivery?</p>
                    <div className="flex gap-2">
                        <select
                            className="select select-bordered flex-1"
                            value={form.customerCutoffDay}
                            onChange={(e) => setForm({ ...form, customerCutoffDay: parseInt(e.target.value) })}
                        >
                            <option value={-1}>Previous Day (Before Delivery)</option>
                            <option value={0}>Same Day (Morning of Delivery)</option>
                        </select>
                        <input
                            type="time"
                            className="input input-bordered flex-1"
                            value={form.customerCutoffTime}
                            onChange={(e) => setForm({ ...form, customerCutoffTime: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-control">
                    <label className="label">Admin Cutoff</label>
                    <p className="text-xs text-gray-500 mb-2">When can admins modify today's delivery?</p>
                    <div className="flex gap-2">
                        <select
                            className="select select-bordered flex-1"
                            value={form.adminCutoffDay}
                            onChange={(e) => setForm({ ...form, adminCutoffDay: parseInt(e.target.value) })}
                        >
                            <option value={-1}>Previous Day (Before Delivery)</option>
                            <option value={0}>Same Day (Morning of Delivery)</option>
                        </select>
                        <input
                            type="time"
                            className="input input-bordered flex-1"
                            value={form.adminCutoffTime}
                            onChange={(e) => setForm({ ...form, adminCutoffTime: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="label">Delivery Charge (₹)</label>
                    <input
                        type="number"
                        className="input input-bordered w-full"
                        value={form.deliveryCharge}
                        onChange={(e) => setForm({ ...form, deliveryCharge: parseFloat(e.target.value) })}
                    />
                </div>

                <div>
                    <label className="label">Minimum Order Value (₹)</label>
                    <input
                        type="number"
                        className="input input-bordered w-full"
                        value={form.minOrderValue}
                        onChange={(e) => setForm({ ...form, minOrderValue: parseFloat(e.target.value) })}
                    />
                </div>
            </div>

            {/* ── Delivery Time Slots ── */}
            <div className="divider">⏰ Delivery Time Slots</div>

            <div className="bg-base-200 rounded-xl p-4 space-y-4">
                <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Manage Delivery Windows</h3>
                    <p className="text-xs text-gray-500">Define time slots when deliveries are available. Customers will pick a slot when placing orders. Leave empty to allow any time.</p>
                </div>

                {/* Existing Slots */}
                {form.deliverySlots.length > 0 ? (
                    <div className="space-y-2">
                        {form.deliverySlots.map((slot, idx) => (
                            <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${slot.isActive ? 'bg-white border-green-200' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                                <div className="flex-1">
                                    <span className="font-semibold text-gray-800">{slot.label}</span>
                                    <span className="text-sm text-gray-500 ml-2">
                                        {formatTime12(slot.startTime)} – {formatTime12(slot.endTime)}
                                    </span>
                                </div>
                                <label className="cursor-pointer flex items-center gap-1">
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-success toggle-sm"
                                        checked={slot.isActive}
                                        onChange={() => toggleSlot(idx)}
                                    />
                                    <span className="text-xs text-gray-500">{slot.isActive ? 'Active' : 'Off'}</span>
                                </label>
                                <button
                                    className="btn btn-ghost btn-xs text-red-500"
                                    onClick={() => removeSlot(idx)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 text-gray-400 border-2 border-dashed rounded-lg">
                        No delivery slots configured yet. Orders will not show slot picker.
                    </div>
                )}

                {/* Add New Slot */}
                <div className="flex flex-wrap items-end gap-2 p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex-1 min-w-[140px]">
                        <label className="label text-xs pb-1">Slot Name</label>
                        <input
                            type="text"
                            className="input input-bordered input-sm w-full"
                            placeholder="e.g. Morning"
                            value={newSlot.label}
                            onChange={(e) => setNewSlot({ ...newSlot, label: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label text-xs pb-1">Start Time</label>
                        <input
                            type="time"
                            className="input input-bordered input-sm"
                            value={newSlot.startTime}
                            onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label text-xs pb-1">End Time</label>
                        <input
                            type="time"
                            className="input input-bordered input-sm"
                            value={newSlot.endTime}
                            onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                        />
                    </div>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={addSlot}
                        disabled={!newSlot.label.trim()}
                    >
                        + Add Slot
                    </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-500 self-center">Quick presets:</span>
                    <button
                        className="btn btn-xs btn-outline"
                        onClick={() => setForm({
                            ...form,
                            deliverySlots: [
                                { label: "Morning", startTime: "05:00", endTime: "07:00", isActive: true },
                                { label: "Evening", startTime: "15:00", endTime: "20:00", isActive: true },
                            ]
                        })}
                    >
                        🌅 Morning + Evening
                    </button>
                    <button
                        className="btn btn-xs btn-outline"
                        onClick={() => setForm({
                            ...form,
                            deliverySlots: [
                                { label: "Early Morning", startTime: "05:00", endTime: "07:00", isActive: true },
                                { label: "Morning", startTime: "07:00", endTime: "10:00", isActive: true },
                                { label: "Afternoon", startTime: "12:00", endTime: "15:00", isActive: true },
                                { label: "Evening", startTime: "15:00", endTime: "20:00", isActive: true },
                            ]
                        })}
                    >
                        📅 4 Slots
                    </button>
                    <button
                        className="btn btn-xs btn-ghost text-red-500"
                        onClick={() => setForm({ ...form, deliverySlots: [] })}
                    >
                        Clear All
                    </button>
                </div>
            </div>

            <button className="btn btn-primary" onClick={() => onSave(form)}>💾 Save Changes</button>
        </div>
    );
};

// Referral Settings
const ReferralSettings = ({ settings = {}, onSave }) => {
    const [form, setForm] = useState({
        enabled: settings.enabled !== false,
        referrerReward: settings.referrerReward || 50,
        refereeReward: settings.refereeReward || 50,
        minOrdersForReward: settings.minOrdersForReward || 1,
        maxReferralsPerUser: settings.maxReferralsPerUser || -1,
        rewardType: settings.rewardType || "wallet",
        expiryDays: settings.expiryDays || 30,
        shareMessage: settings.shareMessage || "🥛 Join STOI Milk and get ₹{{REFEREE_REWARD}} on your first order! Use my referral code: {{CODE}}\n\n{{LINK}}",
    });

    const handleSave = () => {
        onSave(form);
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">🎁 Referral Settings</h2>
            <p className="text-sm text-gray-500">Configure the refer and earn program for customers</p>

            {/* Enable/Disable */}
            <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                    <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={form.enabled}
                        onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                    />
                    <span className="label-text font-medium">Enable Referral Program</span>
                </label>
            </div>

            <div className="divider"></div>

            {/* Reward Amounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label">
                        <span className="label-text">Referrer Reward (₹)</span>
                        <span className="label-text-alt text-gray-400">Amount for existing user</span>
                    </label>
                    <input
                        type="number"
                        className="input input-bordered w-full"
                        value={form.referrerReward}
                        onChange={(e) => setForm({ ...form, referrerReward: parseFloat(e.target.value) || 0 })}
                        min="0"
                    />
                </div>

                <div>
                    <label className="label">
                        <span className="label-text">Referee Reward (₹)</span>
                        <span className="label-text-alt text-gray-400">Amount for new user</span>
                    </label>
                    <input
                        type="number"
                        className="input input-bordered w-full"
                        value={form.refereeReward}
                        onChange={(e) => setForm({ ...form, refereeReward: parseFloat(e.target.value) || 0 })}
                        min="0"
                    />
                </div>
            </div>

            {/* Reward Type */}
            <div>
                <label className="label">Reward Type</label>
                <select
                    className="select select-bordered w-full"
                    value={form.rewardType}
                    onChange={(e) => setForm({ ...form, rewardType: e.target.value })}
                >
                    <option value="wallet">Wallet Credit</option>
                    <option value="discount">Discount Coupon</option>
                </select>
            </div>

            {/* Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label">
                        <span className="label-text">Min Orders for Reward</span>
                        <span className="label-text-alt text-gray-400">Orders before reward activates</span>
                    </label>
                    <input
                        type="number"
                        className="input input-bordered w-full"
                        value={form.minOrdersForReward}
                        onChange={(e) => setForm({ ...form, minOrdersForReward: parseInt(e.target.value) || 0 })}
                        min="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Set to 0 for immediate reward on signup</p>
                </div>

                <div>
                    <label className="label">
                        <span className="label-text">Max Referrals per User</span>
                        <span className="label-text-alt text-gray-400">-1 for unlimited</span>
                    </label>
                    <input
                        type="number"
                        className="input input-bordered w-full"
                        value={form.maxReferralsPerUser}
                        onChange={(e) => setForm({ ...form, maxReferralsPerUser: parseInt(e.target.value) })}
                        min="-1"
                    />
                </div>
            </div>

            <div>
                <label className="label">
                    <span className="label-text">Referral Expiry (Days)</span>
                    <span className="label-text-alt text-gray-400">Days before pending referral expires</span>
                </label>
                <input
                    type="number"
                    className="input input-bordered w-full"
                    value={form.expiryDays}
                    onChange={(e) => setForm({ ...form, expiryDays: parseInt(e.target.value) || 30 })}
                    min="1"
                />
            </div>

            {/* Share Message */}
            <div className="divider">Share Message</div>
            <div>
                <label className="label">
                    <span className="label-text">Share Message Template</span>
                </label>
                <textarea
                    className="textarea textarea-bordered w-full h-32"
                    value={form.shareMessage}
                    onChange={(e) => setForm({ ...form, shareMessage: e.target.value })}
                    placeholder="Enter the message customers will share..."
                />
                <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                    <p className="text-xs font-medium text-gray-600 mb-1">Available Placeholders:</p>
                    <div className="flex flex-wrap gap-2">
                        <code className="badge badge-ghost text-xs">{"{{CODE}}"}</code>
                        <code className="badge badge-ghost text-xs">{"{{LINK}}"}</code>
                        <code className="badge badge-ghost text-xs">{"{{REFEREE_REWARD}}"}</code>
                        <code className="badge badge-ghost text-xs">{"{{REFERRER_REWARD}}"}</code>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="alert alert-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                    <h3 className="font-bold">Referral Code Format</h3>
                    <p className="text-sm">Auto-generated: First 4 letters of name + last 2 digits of mobile (e.g., SUPE10)</p>
                </div>
            </div>

            <button className="btn btn-primary" onClick={handleSave}>💾 Save Changes</button>
        </div>
    );
};

const FirebaseSettings = ({ settings = {}, onSave }) => {
    const [form, setForm] = useState({
        projectId: settings.projectId || "",
        clientEmail: settings.clientEmail || "",
        privateKey: "",
        apiKey: settings.apiKey || "",
        authDomain: settings.authDomain || "",
        storageBucket: settings.storageBucket || "",
        messagingSenderId: settings.messagingSenderId || "",
        appId: settings.appId || "",
        vapidKey: settings.vapidKey || "",
        enabled: settings.enabled ?? false,
    });
    
    // Testing state
    const [testMobile, setTestMobile] = useState("");
    const [testing, setTesting] = useState(false);
    const recaptchaRef = useRef(null);
    const recaptchaWidgetRef = useRef(null);

    const handleSave = () => {
        const cleanForm = { ...form };
        if (!cleanForm.privateKey || cleanForm.privateKey === "••••••••") delete cleanForm.privateKey;
        onSave(cleanForm);
    };

    const handleTestFirebaseOTP = async () => {
        if (!testMobile || testMobile.length < 10) {
            return alert("Enter a valid 10-digit mobile number");
        }
        
        try {
            setTesting(true);
            
            // Dynamic import to avoid loading Firebase if not used
            const { initializeFirebase, getFirebaseAuth, RecaptchaVerifier, signInWithPhoneNumber } = await import("../lib/firebase");
            
            // Initialize with the current form data (so we can test before saving)
            const testConfig = {
                apiKey: form.apiKey === "••••••••" ? settings.apiKey : form.apiKey,
                authDomain: form.authDomain,
                projectId: form.projectId,
                storageBucket: form.storageBucket,
                messagingSenderId: form.messagingSenderId,
                appId: form.appId,
            };
            
            initializeFirebase(testConfig);
            const auth = getFirebaseAuth();
            
            if (!auth) {
                throw new Error("Failed to initialize Firebase Auth with provided config");
            }

            // Setup recaptcha if not already setup
            if (!window.testRecaptchaVerifier) {
                const verifier = new RecaptchaVerifier(auth, "test-recaptcha-container", {
                    size: "invisible",
                    callback: () => {},
                });
                window.testRecaptchaVerifier = verifier;
                recaptchaRef.current = verifier;
            } else {
                recaptchaRef.current = window.testRecaptchaVerifier;
            }

            // Send OTP
            const phoneNumber = `+91${testMobile}`;
            console.log("Attempting Firebase test OTP to:", phoneNumber);
            alert(`Sending OTP to ${phoneNumber}... Please wait.`);
            
            const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaRef.current);
            console.log("Firebase SMS Sent Result:", result);
            alert("✅ SUCCESS! Firebase OTP sent successfully to " + testMobile);
            
        } catch (error) {
            console.error("Firebase Test Error:", error);
            alert(`❌ FAILED: ${error.message}\n\nCheck console for details.`);
            
            // Clear recaptcha on error so we can retry cleanly
            if (window.testRecaptchaVerifier) {
                try {
                    window.testRecaptchaVerifier.clear();
                } catch (e) { }
                window.testRecaptchaVerifier = null;
                recaptchaRef.current = null;
                
                const container = document.getElementById("test-recaptcha-container");
                if (container) container.innerHTML = "";
            }
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">🔥 Firebase Cloud Messaging & Auth</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Enable Firebase</span>
                    <input type="checkbox" className="toggle toggle-success" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                </div>
            </div>

            <div className="divider">Admin SDK (Server Side)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                    <label className="label">Project ID</label>
                    <input type="text" className="input input-bordered" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} />
                </div>
                <div className="form-control">
                    <label className="label">Client Email</label>
                    <input type="email" className="input input-bordered" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} />
                </div>
                <div className="form-control md:col-span-2">
                    <label className="label">Private Key</label>
                    <textarea
                        className="textarea textarea-bordered h-24 font-mono text-xs"
                        placeholder={settings.privateKey ? "••••••••" : "-----BEGIN PRIVATE KEY-----..."}
                        value={form.privateKey}
                        onChange={(e) => setForm({ ...form, privateKey: e.target.value })}
                    />
                    <label className="label">
                        <span className="label-text-alt text-gray-500">From your serviceAccountKey.json file</span>
                    </label>
                </div>
            </div>

            <div className="divider">Client SDK (Web/Mobile App)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                    <label className="label">API Key</label>
                    <input type="password"
                        className="input input-bordered"
                        placeholder={settings.apiKey ? "••••••••" : "AIza..."}
                        value={form.apiKey}
                        onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    />
                </div>
                <div className="form-control">
                    <label className="label">Auth Domain</label>
                    <input type="text" className="input input-bordered" value={form.authDomain} onChange={(e) => setForm({ ...form, authDomain: e.target.value })} />
                </div>
                <div className="form-control">
                    <label className="label">Messaging Sender ID</label>
                    <input type="text" className="input input-bordered" value={form.messagingSenderId} onChange={(e) => setForm({ ...form, messagingSenderId: e.target.value })} />
                </div>
                <div className="form-control">
                    <label className="label">App ID</label>
                    <input type="text" className="input input-bordered" value={form.appId} onChange={(e) => setForm({ ...form, appId: e.target.value })} />
                </div>
                <div className="form-control md:col-span-2">
                    <label className="label">VAPID Key (Web Push)</label>
                    <input type="text" className="input input-bordered" value={form.vapidKey} onChange={(e) => setForm({ ...form, vapidKey: e.target.value })} />
                </div>
            </div>
            
            {/* Firebase OTP Diagnostic Tester */}
            <div className="card bg-gray-50 border border-gray-200 mt-6">
                <div className="card-body p-4">
                    <h3 className="font-bold flex items-center gap-2">
                        <span>🧪</span> Diagnostic: Test Firebase OTP Auth
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                        Use this internal tool to test if Firebase SMS is being sent properly with the current configuration. It will show the exact error if it fails.
                    </p>
                    <div className="flex gap-2 items-end">
                        <div className="form-control flex-1">
                            <label className="label"><span className="label-text">Mobile Number (without +91)</span></label>
                            <input 
                                type="text" 
                                className="input input-bordered w-full" 
                                placeholder="Enter 10 digit number" 
                                value={testMobile}
                                onChange={(e) => setTestMobile(e.target.value)}
                            />
                        </div>
                        <button 
                            className="btn btn-secondary" 
                            onClick={handleTestFirebaseOTP}
                            disabled={testing}
                        >
                            {testing ? "Testing..." : "Send Test OTP"}
                        </button>
                    </div>
                    {/* Invisible ReCAPTCHA container for tests */}
                    <div id="test-recaptcha-container"></div>
                </div>
            </div>

            <button className="btn btn-primary w-full" onClick={handleSave}>💾 Save Firebase Settings</button>
        </div>
    );
};

