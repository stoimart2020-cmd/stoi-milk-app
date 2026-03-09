import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getRider, getRiderCustomers, updateRider,
    getRiderAttendance, markRiderAttendance,
    getRiderDocuments, uploadRiderDocument,
    getRiderFinancials, collectCashFromRider,
    submitRiderKmLog, payAdvanceToRider
} from "../../lib/api/riders";
import { AddRiderModal } from "../../components/modals/AddRiderModal";
import {
    ArrowLeft, Save, Loader, GripVertical, Upload, Eye, FileText,
    CalendarCheck, MapPin, Wallet, Briefcase, UserCircle, Camera,
    CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, ImageIcon,
    Banknote, Gauge, TrendingUp, ArrowDownCircle, IndianRupee
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors,
} from "@dnd-kit/core";
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ==================================
// SORTABLE ITEM
// ==================================
const SortableItem = ({ id, customer, index }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
        position: "relative",
    };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white border rounded-lg p-4 mb-2 flex items-center justify-between group ${isDragging ? "shadow-lg border-teal-500" : "border-gray-200"}`}>
            <div className="flex items-center gap-4">
                <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
                    <GripVertical size={20} />
                </div>
                <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                </span>
                <div>
                    <h4 className="font-medium text-gray-900">{customer.name}</h4>
                    <p className="text-sm text-gray-500">{customer.address?.fullAddress}</p>
                </div>
            </div>
            <div className="text-sm text-gray-500">{customer.mobile}</div>
        </div>
    );
};

// ==================================
// DOCUMENT CARD
// ==================================
const DocumentCard = ({ label, docKey, currentUrl, onUpload, baseUrl }) => {
    const [preview, setPreview] = useState(null);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File must be under 5MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setPreview(reader.result);
            onUpload(docKey, reader.result, file.name);
        };
        reader.readAsDataURL(file);
    };

    const displayUrl = preview || (currentUrl ? `${baseUrl}${currentUrl}` : null);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">{label}</span>
                {displayUrl && (
                    <a href={displayUrl} target="_blank" rel="noreferrer" className="text-teal-600 hover:text-teal-700">
                        <Eye size={16} />
                    </a>
                )}
            </div>

            {displayUrl ? (
                <div className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-[4/3]">
                    <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <span className="text-white text-sm font-medium flex items-center gap-2">
                            <Camera size={18} /> Replace
                        </span>
                        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                    </label>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg aspect-[4/3] cursor-pointer hover:border-teal-500 hover:bg-teal-50/30 transition-colors">
                    <Upload size={24} className="text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500">Click to upload</span>
                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
            )}
        </div>
    );
};

// ==================================
// INPUT GROUP (defined outside to prevent re-render focus loss)
// ==================================
const InputGroup = ({ label, name, type = "text", placeholder, options, disabled, formData, handleChange }) => (
    <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
        {options ? (
            <select name={name} value={formData[name]} onChange={handleChange} disabled={disabled}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        ) : (
            <input type={type} name={name} value={formData[name] || ""} onChange={handleChange} placeholder={placeholder} disabled={disabled}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
            />
        )}
    </div>
);

// ==================================
// MAIN COMPONENT
// ==================================
export const RiderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("personal");
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

    // Data Fetching
    const { data: riderData, isLoading } = useQuery({
        queryKey: ["rider", id],
        queryFn: () => getRider(id)
    });

    const { data: customersData } = useQuery({
        queryKey: ["rider-customers", id],
        queryFn: () => getRiderCustomers(id)
    });

    const rider = riderData?.result;
    const customers = customersData?.result || [];

    // ---- Attendance state ----
    const now = new Date();
    const [attMonth, setAttMonth] = useState(now.getMonth() + 1);
    const [attYear, setAttYear] = useState(now.getFullYear());

    const { data: attendanceData, refetch: refetchAttendance } = useQuery({
        queryKey: ["rider-attendance", id, attMonth, attYear],
        queryFn: () => getRiderAttendance(id, attMonth, attYear),
        enabled: activeTab === "attendance"
    });

    // ---- Documents state ----
    const { data: docsData, refetch: refetchDocs } = useQuery({
        queryKey: ["rider-documents", id],
        queryFn: () => getRiderDocuments(id),
        enabled: activeTab === "documents"
    });

    // Form State
    const [formData, setFormData] = useState({});

    // Route Sorting State
    const [routeItems, setRouteItems] = useState([]);

    useEffect(() => {
        if (rider) {
            setFormData({
                name: rider.name || "",
                mobile: rider.mobile || "",
                email: rider.email || "",
                password: "",
                fatherName: rider.fatherName || "",
                aadharNumber: rider.aadharNumber || "",
                joiningDate: rider.joiningDate ? new Date(rider.joiningDate).toISOString().split("T")[0] : "",
                employeeType: rider.employeeType || "Full Time",
                canCollectCash: rider.canCollectCash || false,
                address: rider.address?.fullAddress || "",
                walletBalance: rider.walletBalance || 0,

                bankName: rider.bankDetails?.bankName || "",
                accountName: rider.bankDetails?.accountName || "",
                accountNumber: rider.bankDetails?.accountNumber || "",
                ifsc: rider.bankDetails?.ifsc || "",

                emergencyName: rider.emergencyContact?.name || "",
                emergencyRelation: rider.emergencyContact?.relationship || "",
                emergencyContact: rider.emergencyContact?.contactNumber || "",

                vehicleType: rider.vehicleDetails?.vehicleType || "",
                vehicleNumber: rider.vehicleDetails?.number || "",
                loadCapacity: rider.vehicleDetails?.loadCapacity || "",
                vehicleOwner: rider.vehicleDetails?.owner || "",

                isSalaried: rider.salaryDetails?.isSalaried ?? true,
                salaryType: rider.salaryDetails?.salaryType || "Monthly",
                salary: rider.salaryDetails?.salary || 0,
                perKmCharge: rider.salaryDetails?.perKmCharge || 0,

                status: rider.isActive ? "Active" : "Inactive"
            });
        }
    }, [rider]);

    useEffect(() => {
        if (customers.length > 0) {
            let initialRoute = [];
            if (rider?.route && rider.route.length > 0) {
                const savedOrder = rider.route.map(rId => customers.find(c => c._id === rId || c._id === rId._id)).filter(Boolean);
                const newCustomers = customers.filter(c => !rider.route.includes(c._id) && !rider.route.some(r => r._id === c._id));
                initialRoute = [...savedOrder, ...newCustomers];
            } else {
                initialRoute = [...customers];
            }
            setRouteItems(initialRoute);
        }
    }, [customers, rider]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setRouteItems((items) => {
                const oldIndex = items.findIndex(item => item._id === active.id);
                const newIndex = items.findIndex(item => item._id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // ---- Mutations ----
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                name: data.name,
                mobile: data.mobile,
                email: data.email,
                ...(data.password ? { password: data.password } : {}),
                fatherName: data.fatherName,
                aadharNumber: data.aadharNumber,
                joiningDate: data.joiningDate,
                employeeType: data.employeeType,
                canCollectCash: data.canCollectCash,
                address: { fullAddress: data.address },
                walletBalance: Number(data.walletBalance),
                isActive: data.status === "Active",
                bankDetails: {
                    bankName: data.bankName,
                    accountName: data.accountName,
                    accountNumber: data.accountNumber,
                    ifsc: data.ifsc
                },
                emergencyContact: {
                    name: data.emergencyName,
                    relationship: data.emergencyRelation,
                    contactNumber: data.emergencyContact
                },
                vehicleDetails: {
                    vehicleType: data.vehicleType,
                    number: data.vehicleNumber,
                    loadCapacity: data.loadCapacity,
                    owner: data.vehicleOwner
                },
                salaryDetails: {
                    isSalaried: data.isSalaried === "true" || data.isSalaried === true,
                    salaryType: data.salaryType,
                    salary: Number(data.salary),
                    perKmCharge: Number(data.perKmCharge || 0)
                },
                route: routeItems.map(item => item._id)
            };
            return await updateRider(id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rider", id] });
            toast.success("Rider updated successfully");
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to update rider")
    });

    const attendanceMutation = useMutation({
        mutationFn: (attData) => markRiderAttendance(id, attData),
        onSuccess: () => {
            toast.success("Attendance marked");
            refetchAttendance();
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to mark attendance")
    });

    const documentMutation = useMutation({
        mutationFn: (docData) => uploadRiderDocument(id, docData),
        onSuccess: () => {
            toast.success("Document uploaded");
            refetchDocs();
        },
        onError: (err) => toast.error(err.response?.data?.message || "Upload failed")
    });

    const handleSave = () => updateMutation.mutate(formData);

    const handleDocUpload = (documentType, base64Data, fileName) => {
        documentMutation.mutate({ documentType, base64Data, fileName });
    };

    const handleMarkAttendance = (date, status) => {
        attendanceMutation.mutate({ date, status });
    };

    // ---- Financials state (must be before conditional returns - React rules of hooks) ----
    const [finMonth, setFinMonth] = useState(now.getMonth() + 1);
    const [finYear, setFinYear] = useState(now.getFullYear());
    const [cashCollectAmount, setCashCollectAmount] = useState("");
    const [cashCollectNotes, setCashCollectNotes] = useState("");

    // ---- KM Log state ----
    const [kmDate, setKmDate] = useState(new Date().toISOString().split("T")[0]);
    const [kmStart, setKmStart] = useState("");
    const [kmEnd, setKmEnd] = useState("");
    const [kmNotes, setKmNotes] = useState("");

    // ---- Advance payment state ----
    const [advanceAmount, setAdvanceAmount] = useState("");
    const [advanceNotes, setAdvanceNotes] = useState("");

    // ---- Attendance edit state ----
    const [editingDay, setEditingDay] = useState(null);

    const { data: financialsData, refetch: refetchFinancials } = useQuery({
        queryKey: ["rider-financials", id, finMonth, finYear],
        queryFn: () => getRiderFinancials(id, finMonth, finYear),
        enabled: activeTab === "financials"
    });

    const cashCollectMutation = useMutation({
        mutationFn: () => collectCashFromRider(id, Number(cashCollectAmount), cashCollectNotes),
        onSuccess: (data) => {
            toast.success(data.message || "Cash collected");
            setCashCollectAmount("");
            setCashCollectNotes("");
            refetchFinancials();
            queryClient.invalidateQueries({ queryKey: ["rider", id] });
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to collect cash")
    });

    const kmLogMutation = useMutation({
        mutationFn: (kmData) => submitRiderKmLog(id, kmData),
        onSuccess: (data) => {
            toast.success(data.message || "KM log saved");
            setKmStart("");
            setKmEnd("");
            setKmNotes("");
            refetchFinancials();
            refetchAttendance();
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to save KM log")
    });

    const advanceMutation = useMutation({
        mutationFn: () => payAdvanceToRider(id, Number(advanceAmount), advanceNotes),
        onSuccess: (data) => {
            toast.success(data.message || "Advance paid");
            setAdvanceAmount("");
            setAdvanceNotes("");
            refetchFinancials();
            queryClient.invalidateQueries({ queryKey: ["rider", id] });
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to pay advance")
    });

    // ---- Conditional returns (after all hooks) ----
    if (isLoading) return (
        <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-teal-600" size={32} />
        </div>
    );
    if (!rider) return <div className="p-8 text-center text-gray-500">Rider not found</div>;

    // ---- Helper component ----
    // InputGroup wrapper to pass formData & handleChange to the external component
    const renderInputGroup = (props) => <InputGroup {...props} formData={formData} handleChange={handleChange} />;

    // ---- Attendance helpers ----
    const attData = attendanceData?.result || {};
    const attRecords = attData.attendance || [];
    const attSummary = attData.summary || {};
    const daysInMonth = new Date(attYear, attMonth, 0).getDate();
    const monthName = new Date(attYear, attMonth - 1).toLocaleString("default", { month: "long" });

    const getAttendanceForDay = (day) => {
        const dateStr = `${attYear}-${String(attMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return attRecords.find(a => {
            const d = new Date(a.date);
            return d.getDate() === day && d.getMonth() === attMonth - 1 && d.getFullYear() === attYear;
        });
    };

    const attStatusColors = {
        Present: "bg-emerald-100 text-emerald-700 border-emerald-200",
        Absent: "bg-red-100 text-red-700 border-red-200",
        "Half Day": "bg-amber-100 text-amber-700 border-amber-200",
        Leave: "bg-blue-100 text-blue-700 border-blue-200"
    };

    const docs = docsData?.result || {};
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    // Tab config
    const tabs = [
        { id: "personal", label: "Personal", icon: UserCircle },
        { id: "documents", label: "Documents", icon: FileText },
        { id: "salary", label: "Salary & Work", icon: Briefcase },
        { id: "financials", label: "Financials", icon: IndianRupee },
        { id: "bank", label: "Bank Details", icon: Wallet },
        { id: "attendance", label: "Attendance", icon: CalendarCheck },
        { id: "assignment", label: "Assignment", icon: MapPin },
        { id: "route", label: "Route Sorting", icon: GripVertical },
        { id: "customers", label: "Customers", icon: UserCircle },
    ];

    return (
        <div className="space-y-6 pb-20">
            {/* ===== HEADER ===== */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                            {formData.name?.charAt(0) || "R"}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">{formData.name}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${formData.employeeType === "Full Time"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : formData.employeeType === "Part Time"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-purple-100 text-purple-700"
                                    }`}>
                                    {formData.employeeType}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${formData.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                    {formData.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-70"
                    >
                        {updateMutation.isPending ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* ===== TABS ===== */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
                                ? "border-teal-600 text-teal-600 bg-teal-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-8">
                    {/* ====================== PERSONAL INFO TAB ====================== */}
                    {activeTab === "personal" && (
                        <div className="space-y-8 max-w-5xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputGroup formData={formData} handleChange={handleChange} label="Name" name="name" placeholder="Full Name" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Mobile Number" name="mobile" placeholder="10-digit mobile" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Email" name="email" type="email" placeholder="Email Address" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Password" name="password" type="password" placeholder="Leave blank to keep unchanged" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Father's Name" name="fatherName" placeholder="Father's Name" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Joining Date" name="joiningDate" type="date" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Aadhar Number" name="aadharNumber" placeholder="XXXX XXXX XXXX" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Address" name="address" placeholder="Residential Address" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Employee Type" name="employeeType" options={["Full Time", "Part Time", "Contract"]} />

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                                    <div className="flex gap-4 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="status" value="Active" checked={formData.status === "Active"} onChange={handleChange} className="text-teal-600 focus:ring-teal-500" />
                                            <span className="text-sm">Active</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="status" value="Inactive" checked={formData.status === "Inactive"} onChange={handleChange} className="text-red-600 focus:ring-red-500" />
                                            <span className="text-sm">Inactive</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Can Collect Cash?</label>
                                    <div className="flex gap-4 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" name="canCollectCash" checked={formData.canCollectCash} onChange={handleChange} className="rounded text-teal-600 focus:ring-teal-500" />
                                            <span className="text-sm">Yes</span>
                                        </label>
                                    </div>
                                </div>

                                <InputGroup formData={formData} handleChange={handleChange} label="Outstanding Balance (₹)" name="walletBalance" type="number" placeholder="0" />
                            </div>

                            {/* Emergency Contact */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-6">Emergency Contact</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <InputGroup formData={formData} handleChange={handleChange} label="Contact Name" name="emergencyName" placeholder="Name" />
                                    <InputGroup formData={formData} handleChange={handleChange} label="Relationship" name="emergencyRelation" placeholder="e.g. Father, Spouse" />
                                    <InputGroup formData={formData} handleChange={handleChange} label="Contact Number" name="emergencyContact" placeholder="Mobile Number" />
                                </div>
                            </div>

                            {/* Vehicle Details */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-6">Vehicle Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputGroup formData={formData} handleChange={handleChange} label="Vehicle Type" name="vehicleType" options={["Two Wheeler", "Three Wheeler", "Four Wheeler"]} />
                                    <InputGroup formData={formData} handleChange={handleChange} label="Vehicle Number" name="vehicleNumber" placeholder="TN-XX-XXXX" />
                                    <InputGroup formData={formData} handleChange={handleChange} label="Load Capacity" name="loadCapacity" placeholder="e.g. 100kg" />
                                    <InputGroup formData={formData} handleChange={handleChange} label="Vehicle Owner" name="vehicleOwner" placeholder="Owner Name" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ====================== DOCUMENTS TAB ====================== */}
                    {activeTab === "documents" && (
                        <div className="space-y-6 max-w-5xl">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-1">ID Proof (Aadhaar)</h3>
                                <p className="text-sm text-gray-400 mb-4">Upload front and back of Aadhaar card</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <DocumentCard label="Aadhaar Front" docKey="frontId" currentUrl={docs.frontId} onUpload={handleDocUpload} baseUrl={baseUrl} />
                                    <DocumentCard label="Aadhaar Back" docKey="backId" currentUrl={docs.backId} onUpload={handleDocUpload} baseUrl={baseUrl} />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-1">Driving License</h3>
                                <p className="text-sm text-gray-400 mb-4">Upload front and back of driving license</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <DocumentCard label="License Front" docKey="licenseFront" currentUrl={docs.licenseFront} onUpload={handleDocUpload} baseUrl={baseUrl} />
                                    <DocumentCard label="License Back" docKey="licenseBack" currentUrl={docs.licenseBack} onUpload={handleDocUpload} baseUrl={baseUrl} />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-1">Photo</h3>
                                <p className="text-sm text-gray-400 mb-4">Passport-size photo of the rider</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <DocumentCard label="Profile Photo" docKey="photo" currentUrl={docs.photo} onUpload={handleDocUpload} baseUrl={baseUrl} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ====================== SALARY & WORK TAB ====================== */}
                    {activeTab === "salary" && (
                        <div className="space-y-8 max-w-4xl">
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Salary Configuration</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Is Salaried?</label>
                                    <div className="flex gap-4 pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="isSalaried" checked={formData.isSalaried === true} onChange={() => setFormData(p => ({ ...p, isSalaried: true }))} className="text-teal-600 focus:ring-teal-500" />
                                            <span className="text-sm">Yes</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="isSalaried" checked={formData.isSalaried === false} onChange={() => setFormData(p => ({ ...p, isSalaried: false }))} className="text-teal-600 focus:ring-teal-500" />
                                            <span className="text-sm">No (Commission based)</span>
                                        </label>
                                    </div>
                                </div>

                                <InputGroup formData={formData} handleChange={handleChange} label="Salary Type" name="salaryType" options={["Daily", "Weekly", "Biweekly", "Monthly"]} />
                                <InputGroup formData={formData} handleChange={handleChange} label="Salary Amount (₹)" name="salary" type="number" placeholder="0" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Per KM Charge (₹)" name="perKmCharge" type="number" placeholder="0" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Employee Type" name="employeeType" options={["Full Time", "Part Time", "Contract"]} />
                            </div>

                            {/* Summary card */}
                            {formData.isSalaried && formData.salary > 0 && (
                                <div className="bg-teal-50 border border-teal-100 rounded-xl p-5">
                                    <h4 className="text-sm font-bold text-teal-700 mb-3">Salary Summary</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                        <div>
                                            <p className="text-xl font-bold text-teal-800">₹{Number(formData.salary).toLocaleString()}</p>
                                            <p className="text-[10px] text-teal-600">{formData.salaryType} Rate</p>
                                        </div>
                                        {formData.salaryType === "Daily" && (
                                            <div>
                                                <p className="text-xl font-bold text-teal-800">₹{(Number(formData.salary) * 30).toLocaleString()}</p>
                                                <p className="text-[10px] text-teal-600">Est. Monthly (30 days)</p>
                                            </div>
                                        )}
                                        {formData.salaryType === "Weekly" && (
                                            <div>
                                                <p className="text-xl font-bold text-teal-800">₹{(Number(formData.salary) * 4).toLocaleString()}</p>
                                                <p className="text-[10px] text-teal-600">Est. Monthly (4 weeks)</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xl font-bold text-teal-800">{formData.employeeType}</p>
                                            <p className="text-[10px] text-teal-600">Employment Type</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ====================== FINANCIALS TAB ====================== */}
                    {activeTab === "financials" && (() => {
                        const finData = financialsData?.result || {};
                        const summary = finData.summary || {};
                        const ledger = finData.ledger || [];
                        const kmLogs = finData.kmLogs || [];
                        const collections = finData.cashCollections || [];
                        const advances = finData.advancePayments || [];
                        const finMonthName = new Date(finYear, finMonth - 1).toLocaleString("default", { month: "long" });

                        return (
                            <div className="space-y-6 max-w-5xl">
                                {/* Month Navigator */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { if (finMonth === 1) { setFinMonth(12); setFinYear(y => y - 1); } else { setFinMonth(m => m - 1); } }}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span className="text-lg font-bold text-gray-800 min-w-[180px] text-center">{finMonthName} {finYear}</span>
                                        <button onClick={() => { if (finMonth === 12) { setFinMonth(1); setFinYear(y => y + 1); } else { setFinMonth(m => m + 1); } }}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-emerald-500 uppercase mb-1">Earned Salary</p>
                                        <p className="text-2xl font-bold text-emerald-700">₹{summary.earnedSalary || 0}</p>
                                        <p className="text-xs text-emerald-500 mt-1">{summary.totalWorkingDays || 0} working days</p>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-blue-500 uppercase mb-1">KM Earnings</p>
                                        <p className="text-2xl font-bold text-blue-700">₹{summary.kmEarnings || 0}</p>
                                        <p className="text-xs text-blue-500 mt-1">{summary.totalManualKm || 0} km (GPS: {summary.totalGpsKm || 0} km)</p>
                                    </div>
                                    <div className={`border rounded-xl p-4 ${(summary.cashWithRider || 0) > 0 ? 'bg-orange-50 border-orange-100' : (summary.cashWithRider || 0) < 0 ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200'}`}>
                                        <p className="text-xs font-semibold uppercase mb-1" style={{ color: (summary.cashWithRider || 0) > 0 ? '#c2410c' : (summary.cashWithRider || 0) < 0 ? '#15803d' : '#6b7280' }}>Cash Balance</p>
                                        <p className={`text-2xl font-bold ${(summary.cashWithRider || 0) > 0 ? 'text-orange-700' : (summary.cashWithRider || 0) < 0 ? 'text-green-700' : 'text-gray-700'}`}>
                                            {(summary.cashWithRider || 0) > 0 ? `₹${summary.cashWithRider} with rider` : (summary.cashWithRider || 0) < 0 ? `₹${Math.abs(summary.cashWithRider)} excess` : '₹0'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Orders: ₹{summary.totalCashCollected || 0} | Returned: ₹{summary.totalAdminCollected || 0}</p>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-purple-500 uppercase mb-1">Advance Paid</p>
                                        <p className="text-2xl font-bold text-purple-700">₹{summary.totalAdvancePaid || 0}</p>
                                        <p className="text-xs text-purple-500 mt-1">{advances.length} payment{advances.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Earnings</p>
                                        <p className="text-2xl font-bold text-gray-800">₹{summary.totalEarnings || 0}</p>
                                        <p className="text-xs text-gray-500 mt-1">Salary + KM</p>
                                    </div>
                                    <div className={`border rounded-xl p-4 ${(summary.netPayable || 0) >= 0 ? 'bg-teal-50 border-teal-100' : 'bg-red-50 border-red-100'}`}>
                                        <p className={`text-xs font-semibold uppercase mb-1 ${(summary.netPayable || 0) >= 0 ? 'text-teal-500' : 'text-red-500'}`}>
                                            {(summary.netPayable || 0) >= 0 ? 'Net Payable' : 'Rider Owes'}
                                        </p>
                                        <p className={`text-2xl font-bold ${(summary.netPayable || 0) >= 0 ? 'text-teal-700' : 'text-red-700'}`}>
                                            ₹{Math.abs(summary.netPayable || 0)}
                                        </p>
                                        <p className={`text-xs mt-1 ${(summary.netPayable || 0) >= 0 ? 'text-teal-500' : 'text-red-500'}`}>
                                            Earnings − Cash − Advance
                                        </p>
                                    </div>
                                </div>

                                {/* Settlement Explanation */}
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                    <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><TrendingUp size={16} /> Settlement Breakdown</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Salary ({summary.salaryType || 'Daily'}):</span>
                                            <span className="font-bold text-emerald-600">₹{summary.salaryRate || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Working Days:</span>
                                            <span className="font-bold">{summary.presentDays || 0}P + {summary.halfDays || 0}H</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Cash Returned:</span>
                                            <span className="font-bold text-blue-600">₹{summary.totalAdminCollected || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Advance Paid:</span>
                                            <span className="font-bold text-purple-600">₹{summary.totalAdvancePaid || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">KM (Manual/GPS):</span>
                                            <span className="font-bold text-blue-600">{summary.totalManualKm || 0} / {summary.totalGpsKm || 0} km</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Cash Collection & Advance Payment - Side by Side */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Cash Collection Section */}
                                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                                        <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                            <ArrowDownCircle size={16} className="text-indigo-600" /> Collect Cash from Rider
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount (₹)</label>
                                                <input
                                                    type="number"
                                                    value={cashCollectAmount}
                                                    onChange={(e) => setCashCollectAmount(e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                                    placeholder="Enter amount"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes (optional)</label>
                                                <input
                                                    type="text"
                                                    value={cashCollectNotes}
                                                    onChange={(e) => setCashCollectNotes(e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                                    placeholder="Any notes"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (!cashCollectAmount || Number(cashCollectAmount) <= 0) {
                                                        toast.error("Enter a valid amount");
                                                        return;
                                                    }
                                                    cashCollectMutation.mutate();
                                                }}
                                                disabled={cashCollectMutation.isPending}
                                                className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                                            >
                                                {cashCollectMutation.isPending ? "Collecting..." : "Collect Cash"}
                                            </button>
                                        </div>

                                        {/* Recent Collections */}
                                        {collections.length > 0 && (
                                            <div className="mt-4 border-t border-gray-100 pt-3">
                                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent Collections</p>
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {collections.slice(-5).reverse().map((c, i) => (
                                                        <div key={i} className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded-lg">
                                                            <div>
                                                                <span className="text-gray-700">₹{c.amount}</span>
                                                                {c.notes && <span className="text-gray-400 ml-2">— {c.notes}</span>}
                                                            </div>
                                                            <span className="text-xs text-gray-400">{new Date(c.date).toLocaleDateString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Advance Payment Section */}
                                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                                        <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                            <Banknote size={16} className="text-purple-600" /> Pay Advance to Rider
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount (₹)</label>
                                                <input
                                                    type="number"
                                                    value={advanceAmount}
                                                    onChange={(e) => setAdvanceAmount(e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                                    placeholder="Enter amount"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes (optional)</label>
                                                <input
                                                    type="text"
                                                    value={advanceNotes}
                                                    onChange={(e) => setAdvanceNotes(e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                                    placeholder="e.g. Salary advance for Feb"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (!advanceAmount || Number(advanceAmount) <= 0) {
                                                        toast.error("Enter a valid amount");
                                                        return;
                                                    }
                                                    advanceMutation.mutate();
                                                }}
                                                disabled={advanceMutation.isPending}
                                                className="w-full px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
                                            >
                                                {advanceMutation.isPending ? "Paying..." : "Pay Advance"}
                                            </button>
                                        </div>

                                        {/* Recent Advance Payments */}
                                        {advances.length > 0 && (
                                            <div className="mt-4 border-t border-gray-100 pt-3">
                                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent Advances</p>
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {advances.slice(-5).reverse().map((a, i) => (
                                                        <div key={i} className="flex justify-between items-center text-sm bg-purple-50 px-3 py-2 rounded-lg">
                                                            <div>
                                                                <span className="text-purple-700 font-medium">₹{a.amount}</span>
                                                                {a.notes && <span className="text-gray-400 ml-2">— {a.notes}</span>}
                                                            </div>
                                                            <span className="text-xs text-gray-400">{new Date(a.date).toLocaleDateString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Salary Ledger */}
                                {ledger.length > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                            <Banknote size={16} className="text-emerald-600" /> Salary Ledger
                                        </h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Description</th>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {ledger.map((entry, i) => (
                                                        <tr key={i} className="hover:bg-gray-50/50">
                                                            <td className="px-3 py-2 text-sm text-gray-600">{new Date(entry.date).toLocaleDateString()}</td>
                                                            <td className="px-3 py-2">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${entry.type === 'salary' ? 'bg-emerald-100 text-emerald-700' :
                                                                    entry.type === 'km_charge' ? 'bg-blue-100 text-blue-700' :
                                                                        entry.type === 'cash_collection' ? 'bg-orange-100 text-orange-700' :
                                                                            entry.type === 'advance_payment' ? 'bg-purple-100 text-purple-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                    {entry.type.replace(/_/g, ' ').toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-sm text-gray-600">{entry.description}</td>
                                                            <td className={`px-3 py-2 text-sm font-bold text-right ${entry.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                {entry.amount >= 0 ? '+' : ''}₹{entry.amount}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* KM Logs Table */}
                                {kmLogs.length > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                            <Gauge size={16} className="text-indigo-600" /> KM Logs ({kmLogs.length})
                                            <span className="ml-auto text-xs text-gray-500">Total: <span className="font-bold text-gray-700">{summary.totalManualKm || 0} km</span> | GPS: <span className="font-bold text-blue-600">{summary.totalGpsKm || 0} km</span></span>
                                        </h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Start</th>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">End</th>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Manual KM</th>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">GPS KM</th>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Difference</th>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Charge</th>
                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {kmLogs.map((log, i) => {
                                                        const diff = log.totalKm - (log.gpsDistance || 0);
                                                        return (
                                                            <tr key={i} className="hover:bg-gray-50/50">
                                                                <td className="px-3 py-2 text-sm text-gray-600">{new Date(log.date).toLocaleDateString()}</td>
                                                                <td className="px-3 py-2 text-sm font-mono text-gray-800">{log.startReading}</td>
                                                                <td className="px-3 py-2 text-sm font-mono text-gray-800">{log.endReading ?? '—'}</td>
                                                                <td className="px-3 py-2 text-sm font-bold text-gray-800">{log.totalKm} km</td>
                                                                <td className="px-3 py-2 text-sm font-bold text-blue-600">{(log.gpsDistance || 0).toFixed(1)} km</td>
                                                                <td className="px-3 py-2 text-sm">
                                                                    {log.gpsDistance > 0 ? (
                                                                        <span className={`font-bold ${Math.abs(diff) > 5 ? 'text-red-600' : 'text-gray-500'}`}>
                                                                            {diff > 0 ? '+' : ''}{diff.toFixed(1)} km
                                                                        </span>
                                                                    ) : <span className="text-gray-400">—</span>}
                                                                </td>
                                                                <td className="px-3 py-2 text-sm font-bold text-emerald-600">₹{log.kmCharge || 0}</td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.status === 'active' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                        {log.status === 'active' ? '● Active' : '✓ Done'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* ====================== BANK DETAILS TAB ====================== */}
                    {activeTab === "bank" && (
                        <div className="space-y-8 max-w-4xl">
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Bank Account Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputGroup formData={formData} handleChange={handleChange} label="Bank Name" name="bankName" placeholder="e.g. HDFC Bank" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Account Name" name="accountName" placeholder="Name as per Passbook" />
                                <InputGroup formData={formData} handleChange={handleChange} label="Account Number" name="accountNumber" placeholder="Account Number" />
                                <InputGroup formData={formData} handleChange={handleChange} label="IFSC Code" name="ifsc" placeholder="IFSC Code" />
                            </div>
                        </div>
                    )}

                    {/* ====================== ATTENDANCE TAB ====================== */}
                    {activeTab === "attendance" && (
                        <div className="space-y-6 max-w-5xl">
                            {/* Month Navigator */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { if (attMonth === 1) { setAttMonth(12); setAttYear(y => y - 1); } else { setAttMonth(m => m - 1); } }}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className="text-lg font-bold text-gray-800 min-w-[180px] text-center">{monthName} {attYear}</span>
                                    <button onClick={() => { if (attMonth === 12) { setAttMonth(1); setAttYear(y => y + 1); } else { setAttMonth(m => m + 1); } }}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                        <ChevronRight size={18} />
                                    </button>
                                </div>

                                {/* Summary pills */}
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">{attSummary.present || 0} Present</span>
                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">{attSummary.absent || 0} Absent</span>
                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">{attSummary.halfDay || 0} Half Day</span>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{attSummary.leave || 0} Leave</span>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-2">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                                    <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase py-2">{d}</div>
                                ))}

                                {/* Empty cells for first day offset */}
                                {Array.from({ length: new Date(attYear, attMonth - 1, 1).getDay() }).map((_, i) => (
                                    <div key={`empty-${i}`}></div>
                                ))}

                                {/* Day cells */}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const record = getAttendanceForDay(day);
                                    const isToday = day === now.getDate() && attMonth === now.getMonth() + 1 && attYear === now.getFullYear();
                                    const isFuture = new Date(attYear, attMonth - 1, day) > now;
                                    const isEditing = editingDay === day;
                                    const dateStr = `${attYear}-${String(attMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                                    return (
                                        <div
                                            key={day}
                                            className={`border rounded-lg p-2 min-h-[70px] relative transition-all ${isToday ? "border-teal-500 bg-teal-50/50" : "border-gray-200"
                                                } ${isFuture ? "opacity-40" : "hover:shadow-sm"}`}
                                        >
                                            <span className={`text-xs font-bold ${isToday ? "text-teal-600" : "text-gray-600"}`}>{day}</span>

                                            {record && !isEditing ? (
                                                <div
                                                    onClick={() => !isFuture && setEditingDay(day)}
                                                    className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded border cursor-pointer hover:opacity-80 ${attStatusColors[record.status] || "bg-gray-100"}`}
                                                    title="Click to change"
                                                >
                                                    {record.status}
                                                </div>
                                            ) : !isFuture ? (
                                                <div className="mt-1">
                                                    <div className="flex flex-wrap gap-0.5">
                                                        {["Present", "Absent", "Half Day", "Leave"].map(s => (
                                                            <button key={s}
                                                                onClick={() => {
                                                                    handleMarkAttendance(dateStr, s);
                                                                    setEditingDay(null);
                                                                }}
                                                                className={`text-[8px] px-1 py-0.5 rounded transition-colors ${record?.status === s
                                                                    ? "bg-teal-500 text-white"
                                                                    : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                                                                    }`}
                                                                title={s}
                                                            >
                                                                {s === "Present" ? "P" : s === "Absent" ? "A" : s === "Half Day" ? "H" : "L"}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {record && (
                                                        <button
                                                            onClick={() => setEditingDay(null)}
                                                            className="text-[8px] text-gray-400 hover:text-gray-600 mt-0.5"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ---- KM Log Entry (below attendance calendar) ---- */}
                            <div className="bg-white border border-gray-200 rounded-xl p-5 mt-6">
                                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <Gauge size={16} className="text-indigo-600" /> Add / Edit KM Log
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</label>
                                        <input
                                            type="date"
                                            value={kmDate}
                                            onChange={(e) => setKmDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Reading (km)</label>
                                        <input
                                            type="number"
                                            value={kmStart}
                                            onChange={(e) => setKmStart(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                            placeholder="e.g. 12345"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End Reading (km)</label>
                                        <input
                                            type="number"
                                            value={kmEnd}
                                            onChange={(e) => setKmEnd(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                            placeholder="e.g. 12400"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (!kmStart || Number(kmStart) <= 0) {
                                                toast.error("Enter a valid start reading");
                                                return;
                                            }
                                            if (kmEnd && Number(kmEnd) <= Number(kmStart)) {
                                                toast.error("End reading must be greater than start");
                                                return;
                                            }
                                            kmLogMutation.mutate({
                                                date: kmDate,
                                                startReading: Number(kmStart),
                                                ...(kmEnd ? { endReading: Number(kmEnd) } : {})
                                            });
                                        }}
                                        disabled={kmLogMutation.isPending}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                                    >
                                        {kmLogMutation.isPending ? "Saving..." : kmEnd ? "Save Complete Log" : "Start KM Log"}
                                    </button>
                                </div>
                                {kmStart && kmEnd && Number(kmEnd) > Number(kmStart) && (
                                    <div className="mt-3 text-sm text-gray-500">
                                        Total distance: <span className="font-bold text-gray-800">{Number(kmEnd) - Number(kmStart)} km</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ====================== ASSIGNMENT TAB ====================== */}
                    {activeTab === "assignment" && (
                        <div className="space-y-6 max-w-4xl">
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Assigned Coverage</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Hub */}
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Hub</p>
                                    {rider.hub ? (
                                        <p className="text-lg font-bold text-indigo-800">{rider.hub?.name || rider.hub}</p>
                                    ) : (
                                        <p className="text-sm text-gray-400">Not assigned</p>
                                    )}
                                </div>

                                {/* Areas */}
                                <div className="bg-teal-50 border border-teal-100 rounded-xl p-5">
                                    <p className="text-xs font-semibold text-teal-500 uppercase tracking-wide mb-2">Areas ({rider.areas?.length || 0})</p>
                                    {rider.areas?.length > 0 ? (
                                        <div className="space-y-1">
                                            {rider.areas.map((area, i) => (
                                                <p key={i} className="text-sm font-medium text-teal-800">
                                                    {area?.name || area}
                                                </p>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400">None assigned</p>
                                    )}
                                </div>

                                {/* Delivery Points */}
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">Delivery Points ({rider.deliveryPoints?.length || 0})</p>
                                    {rider.deliveryPoints?.length > 0 ? (
                                        <div className="space-y-1">
                                            {rider.deliveryPoints.map((dp, i) => (
                                                <p key={i} className="text-sm font-medium text-amber-800">
                                                    {dp?.name || dp}
                                                </p>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400">None assigned</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setIsAssignmentModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <MapPin size={16} />
                                    Edit Assignment
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ====================== ROUTE SORTING TAB ====================== */}
                    {activeTab === "route" && (
                        <div className="max-w-3xl">
                            <p className="text-sm text-gray-500 mb-4 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                Drag and drop customers to reorder the delivery route. Click <strong>Save Changes</strong> to apply the new order. This route will also be reflected on the rider's mobile portal.
                            </p>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={routeItems.map(item => item._id)} strategy={verticalListSortingStrategy}>
                                    {routeItems.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">No customers assigned to sort.</div>
                                    ) : (
                                        routeItems.map((customer, idx) => (
                                            <SortableItem key={customer._id} id={customer._id} customer={customer} index={idx} />
                                        ))
                                    )}
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}

                    {/* ====================== CUSTOMERS TAB ====================== */}
                    {activeTab === "customers" && (
                        <div className="overflow-x-auto">
                            {customers.length === 0 ? (
                                <p className="text-gray-500">No customers currently assigned.</p>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mobile</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Area</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Address</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Wallet</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {customers.map(customer => (
                                            <tr key={customer._id} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 text-sm font-mono text-gray-500">#{customer.customerId || '-'}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                                                <td className="px-4 py-3 text-gray-600">{customer.mobile}</td>
                                                <td className="px-4 py-3 text-gray-600 text-sm">{customer.serviceArea?.name || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600 text-sm max-w-md truncate">{customer.address?.fullAddress || "-"}</td>
                                                <td className="px-4 py-3">
                                                    <span className={customer.walletBalance >= 0 ? "text-emerald-600" : "text-red-600"}>
                                                        ₹{customer.walletBalance}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
