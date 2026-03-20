import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup, Polygon } from "react-leaflet";
import L from "leaflet";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "leaflet/dist/leaflet.css";
import {
  Users, UserCheck, UserMinus, UserX, UserPlus, AlertCircle, ShoppingCart,
  Calendar, Clock, Ban, RefreshCw, Map as MapIcon,
  Download, Plus, Filter, RotateCcw, Columns, Maximize2,
  Info, Search, ChevronUp, ChevronDown, Palmtree
} from "lucide-react";
import { getAllCustomers, createCustomer, getCustomerSummary, uploadCustomers } from "../../shared/api/customers";
import { getHubs, getServiceAreas } from "../../shared/api/logistics";
import { queryClient } from "../../shared/utils/queryClient";
import { useFilters } from "../../shared/context/FilterContext";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { ExportFieldsModal, ALL_EXPORT_FIELDS } from "../reports/ExportFieldsModal";

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, info, onClick, active }) => (
  <div
    onClick={onClick}
    className={`bg-white p-4 rounded-xl shadow-sm border ${active ? 'border-teal-400 ring-1 ring-teal-400' : 'border-gray-100'} flex flex-col justify-between h-full group hover:shadow-md transition-all cursor-pointer`}
  >
    <div className="flex justify-between items-start">
      <div className="space-y-1">
        <span className="text-3xl font-bold text-gray-800">{value}</span>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      </div>
      <div className={`p-2 rounded-lg bg-opacity-10 ${color}`}>
        <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <div className="mt-2 flex items-center justify-between">
      <span className="text-[10px] text-teal-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Click to filter →</span>
      {info && (
        <div className="tooltip tooltip-left" data-tip={info}>
          <Info className="w-4 h-4 text-gray-300 cursor-help" />
        </div>
      )}
    </div>
  </div>
);

const MultiSelectDropdown = ({ options, selectedValues, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="input input-xs w-full bg-gray-50 border-none focus:ring-1 focus:ring-teal-500 text-left flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="truncate text-[10px]">
          {selectedValues.length === 0 ? placeholder : `${selectedValues.length} selected`}
        </span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto p-2">
            <div className="flex justify-between items-center mb-2 px-1 pb-1 border-b border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Select items</span>
              <button
                type="button"
                className="text-[10px] text-teal-600 font-bold hover:underline"
                onClick={() => onChange([])}
              >Clear</button>
            </div>
            {options.map(option => (
              <label key={option} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-md cursor-pointer text-xs">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs checkbox-primary"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const nextValue = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option);
                    onChange(nextValue);
                  }}
                />
                <span className="text-gray-700 font-medium">{option}</span>
              </label>
            ))}
            {options.length === 0 && <div className="p-2 text-center text-gray-400 text-[10px]">No options</div>}
          </div>
        </>
      )}
    </div>
  );
};

function LocationPicker({ setLocation }) {
  useMapEvents({
    click(e) {
      setLocation([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
}

export const CustomerBlock = () => {
  const navigate = useNavigate();
  const { filters: globalFilters, options: globalOptions } = useFilters();
  // --- State ---
  const [showSnapshots, setShowSnapshots] = useState(true);
  const [isMapView, setIsMapView] = useState(false);
  const [mapType, setMapType] = useState('map');
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [location, setLocation] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const allColumns = [
    { key: "customerId", label: "ID" },
    { key: "name", label: "Name" },
    { key: "mobile", label: "Mobile" },
    { key: "email", label: "Email" },
    { key: "isActive", label: "Status" },
    { key: "hub", label: "Hub" },
    { key: "route", label: "Route" },
    { key: "city", label: "City" },
    { key: "deliveryBoy", label: "Delivery Boy" },
    { key: "walletBalance", label: "Wallet" },
    { key: "subStatus", label: "Sub. Status" },
    { key: "isBlocked", label: "Is Blocked" },
    { key: "customerType", label: "Customer Type" },
    { key: "subSource", label: "Sub-source" },
    { key: "tempCustomerStatus", label: "Temp Customer Status" },
    { key: "lastDeviceActive", label: "Last Device Active" },
    { key: "lastPaymentBeforeDays", label: "Last Payment Before Days" },
    { key: "totalRevenue", label: "Total Revenue" },
    { key: "createdBy", label: "Created By" },
    { key: "createdDate", label: "Created Date" },
    { key: "followUpDate", label: "Follow Up Date" },
    { key: "alternateMobile", label: "Alternate Mobile" },
    { key: "address", label: "Address" },
    { key: "geoLocation", label: "Geo location" },
    { key: "creditLimit", label: "Credit Limit" },
    { key: "crmAgent", label: "CRM Agent" },
    { key: "campaignName", label: "Campaign Name" },
    { key: "gstNumber", label: "GST Number" },
    { key: "currentConsumption", label: "Current Consumption" },
    { key: "lastDeliveryDate", label: "Last Delivery Date" },
    { key: "createdTime", label: "Created Time" },
    { key: "paymentMode", label: "Payment Mode" },
    { key: "effectiveWalletBalance", label: "Effective Wallet Balance" },
    { key: "paymentType", label: "Payment Type" },
    { key: "source", label: "Source" },
    { key: "note", label: "Note" },
    { key: "lastDeviceType", label: "Last Device Type" },
    { key: "dueSince", label: "Due Since" },
    { key: "deliveryPreference", label: "Delivery Preferance" },
    { key: "dnd", label: "DND" },
    { key: "firstDeliveryDate", label: "First Delivery Date" },
    { key: "timeSlot", label: "Time slot" },
    { key: "totalOrders", label: "Total Orders" },
    { key: "callStatus", label: "Call Status" }
  ];

  const defaultVisibleColumns = ["customerId", "name", "mobile", "email", "isActive", "hub", "route", "city", "deliveryBoy", "walletBalance"];
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const toggleColumn = (key) => {
    setVisibleColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };
  const isColVisible = (key) => visibleColumns.includes(key);

  // Filters
  const [filters, setFilters] = useState({
    id: "",
    name: "",
    mobile: "",
    email: "",
    hub: [],
    route: [],
    city: [],
    deliveryBoy: [],
    status: [],
    geoTagStatus: "All"
  });

  const [newCustomer, setNewCustomer] = useState({
    name: "", mobile: "", email: "", alternateMobile: "",
    houseNo: "", floor: "", area: "", serviceArea: "",
    landmark: "", address: "", dateOfBirth: null,
    deliveryPreference: "Ring Bell",
  });

  // --- Queries ---
  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ["customerSummary"],
    queryFn: getCustomerSummary
  });

  const { data: customerData, isLoading, refetch: refetchCustomers } = useQuery({
    queryKey: ["customers", globalFilters],
    queryFn: () => getAllCustomers("", globalFilters)
  });

  const { data: hubs } = useQuery({ queryKey: ["hubs"], queryFn: getHubs });
  const { data: serviceAreas } = useQuery({ queryKey: ["serviceAreas"], queryFn: getServiceAreas });

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customerSummary"] });
      setIsAddModalOpen(false);
      alert("Customer created successfully!");
    },
    onError: (err) => alert(err.response?.data?.message || "Failed to create customer"),
  });

  // --- Handlers ---
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({
      id: "", name: "", mobile: "", email: "",
      hub: [], route: [], status: [],
      city: [], deliveryBoy: [], geoTagStatus: "All"
    });
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortOrder("asc"); }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...newCustomer, location });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const toastId = toast.loading('Uploading customers...');
    setUploadProgress(1); // Indicate start
    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await uploadCustomers(formData, (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (data.success) {
        toast.success(data.message, { id: toastId });
        refetchCustomers();
        refetchSummary();
      } else {
        toast.error(data.message || 'Upload failed', { id: toastId });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload file', { id: toastId });
    } finally {
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = (format) => {
    if (filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }
    setExportFormat(format);
    setIsExportModalOpen(true);
  };

  const processExport = (selectedFields) => {
    const rows = filteredData.map(c => {
      const row = {};
      selectedFields.forEach(fieldId => {
        switch (fieldId) {
          case "customerId": row["Id"] = c.customerId || ""; break;
          case "name": row["Name"] = c.name || ""; break;
          case "mobile": row["Mobile"] = c.mobile || ""; break;
          case "email": row["Email Id"] = c.email || ""; break;
          case "subStatus": row["Sub. Status"] = c.isActive ? "Active" : "Inactive"; break;
          case "isBlocked": row["Is Blocked"] = !c.isActive ? "Yes" : "No"; break;
          case "hub": row["Hub"] = c.hub?.name || ""; break;
          case "routeName": row["Route Name"] = c.area?.name || c.serviceArea?.name || ""; break;
          case "walletBalance": row["Wallet Balance"] = c.walletBalance?.toFixed(2) || "0.00"; break;
          case "customerType": row["Customer Type"] = c.type || "Consumer"; break;
          case "subSource": row["Sub-source"] = c.subSource || ""; break;
          case "tempCustomerStatus": row["Temp Customer Status"] = c.tempCustomerStatus || ""; break;
          case "lastDeviceActive": row["Last Device Active"] = ""; break;
          case "lastPaymentBeforeDays": row["Last Payment Before Days"] = ""; break;
          case "totalRevenue": row["Total Revenue"] = ""; break;
          case "createdBy": row["Created By"] = c.createdBy || ""; break;
          case "createdDate": row["Created Date"] = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""; break;
          case "followUpDate": row["Follow Up Date"] = c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : ""; break;
          case "alternateMobile": row["Alternate Mobile"] = c.alternateMobile || ""; break;
          case "address": row["Address"] = c.address?.fullAddress || ""; break;
          case "geoLocation": row["Geo location"] = c.address?.location?.coordinates?.join(", ") || ""; break;
          case "creditLimit": row["Credit Limit"] = c.creditLimit || "0"; break;
          case "crmAgent": row["CRM Agent"] = c.crmAgent || ""; break;
          case "campaignName": row["Campaign Name"] = ""; break;
          case "gstNumber": row["GST Number"] = c.gstNumber || ""; break;
          case "currentConsumption": row["Current Consumption"] = c.unbilledConsumption || "0"; break;
          case "deliveryBoy": row["Delivery Boy"] = c.deliveryBoy?.name || "Unassigned"; break;
          case "lastDeliveryDate": row["Last Delivery Date"] = ""; break;
          case "createdTime": row["Created Time"] = c.createdAt ? new Date(c.createdAt).toLocaleTimeString() : ""; break;
          case "paymentMode": row["Payment Mode"] = c.paymentMode || ""; break;
          case "city": row["City"] = c.city?.name || ""; break;
          case "effectiveWalletBalance": row["Effective Wallet Balance"] = ((c.walletBalance || 0) + (c.creditLimit || 0) - (c.unbilledConsumption || 0)).toFixed(2); break;
          case "paymentType": row["Payment Type"] = c.billingType || ""; break;
          case "source": row["Source"] = c.source || ""; break;
          case "note": row["Note"] = c.notes || ""; break;
          case "lastDeviceType": row["Last Device Type"] = c.deviceType || ""; break;
          case "dueSince": row["Due Since"] = ""; break;
          case "deliveryPreference": row["Delivery Preferance"] = c.deliveryPreference || ""; break;
          case "dnd": row["DND"] = c.dnd ? "Yes" : "No"; break;
          case "firstDeliveryDate": row["First Delivery Date"] = ""; break;
          case "timeSlot": row["Time slot"] = c.deliveryShift || ""; break;
          case "totalOrders": row["Total Orders"] = c.totalOrders || "0"; break;
          case "callStatus": row["Call Status"] = ""; break;
        }
      });
      return row;
    });

    const timestamp = new Date().toISOString().split('T')[0];

    if (exportFormat === "excel") {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Customers");
      // Auto-size columns
      const colWidths = Object.keys(rows[0]).map(key => ({
        wch: Math.max(key.length, ...rows.map(r => String(r[key]).length).slice(0, 100)) + 2
      }));
      ws["!cols"] = colWidths;
      XLSX.writeFile(wb, `Customers_${timestamp}.xlsx`);
      toast.success(`Exported ${rows.length} customers to Excel`);
    } else if (exportFormat === "csv") {
      const headers = Object.keys(rows[0]);
      const csvContent = [
        headers.join(","),
        ...rows.map(row => headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(","))
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Customers_${timestamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} customers to CSV`);
    } else if (exportFormat === "pdf") {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(16);
      doc.text("Customer List", 14, 15);
      doc.setFontSize(8);
      doc.text(`Exported: ${new Date().toLocaleString()} | Total: ${rows.length} customers`, 14, 21);

      const headers = Object.keys(rows[0]).slice(0, 10); // limited headers for PDF fit
      const colWidth = 270 / headers.length; // auto divide page width
      const colWidths = headers.map(() => colWidth);
      let y = 28;

      // Header row
      doc.setFillColor(13, 148, 136); // teal
      doc.rect(14, y - 4, colWidths.reduce((a, b) => a + b, 0), 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      let x = 14;
      headers.forEach((h, i) => { doc.text(h, x + 1, y); x += colWidths[i]; });

      // Data rows
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(6.5);
      y += 6;

      rows.forEach((row, idx) => {
        if (y > 190) { doc.addPage(); y = 15; }
        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(14, y - 3.5, colWidths.reduce((a, b) => a + b, 0), 5.5, "F");
        }
        x = 14;
        headers.forEach((h, i) => {
          const val = String(row[h] || "").substring(0, 30);
          doc.text(val, x + 1, y);
          x += colWidths[i];
        });
        y += 5.5;
      });

      doc.save(`Customers_${timestamp}.pdf`);
      toast.success(`Exported ${rows.length} customers to PDF`);
    }
  };

  // --- Data Processing ---
  const filterOptions = useMemo(() => {
    if (!customerData?.result) return { hubs: [], routes: [], cities: [], riders: [] };
    const hubs = new Set();
    const routes = new Set();
    const cities = new Set();
    const riders = new Set();

    customerData.result.forEach(c => {
      if (c.hub?.name) hubs.add(c.hub.name);
      if (c.area?.name) routes.add(c.area.name);
      else if (c.serviceArea?.name) routes.add(c.serviceArea.name);

      if (c.city?.name) cities.add(c.city.name);
      if (c.deliveryBoy?.name) riders.add(c.deliveryBoy.name);
    });

    return {
      hubs: Array.from(hubs).sort(),
      routes: Array.from(routes).sort(),
      cities: Array.from(cities).sort(),
      riders: Array.from(riders).sort()
    };
  }, [customerData]);

  const filteredData = useMemo(() => {
    if (!customerData?.result) return [];
    let data = [...customerData.result];

    // Apply column-level filters
    if (filters.name) data = data.filter(c => c.name?.toLowerCase().includes(filters.name.toLowerCase()));
    if (filters.mobile) data = data.filter(c => c.mobile?.includes(filters.mobile));
    if (filters.email) data = data.filter(c => c.email?.toLowerCase().includes(filters.email.toLowerCase()));
    if (filters.id) data = data.filter(c => c.customerId?.toString().includes(filters.id) || c._id.includes(filters.id));

    if (filters.hub.length > 0) data = data.filter(c => filters.hub.includes(c.hub?.name));
    if (filters.route.length > 0) data = data.filter(c => filters.route.includes(c.area?.name) || filters.route.includes(c.serviceArea?.name));
    if (filters.city.length > 0) data = data.filter(c => filters.city.includes(c.city?.name));
    if (filters.deliveryBoy.length > 0) data = data.filter(c => filters.deliveryBoy.includes(c.deliveryBoy?.name));

    // Apply status multi-filter
    if (filters.status.length > 0) {
      data = data.filter(c => {
        return filters.status.some(status => {
          if (status === "active") return c.hasActiveSub || c.hasActiveTrial;
          if (status === "inactive") return c.hasAnySub && !c.hasActiveSub && !c.hasActiveTrial && !c.vacation?.isActive;
          if (status === "on_vacation") return c.vacation?.isActive;
          if (status === "new_today") {
            const today = new Date().setHours(0, 0, 0, 0);
            return new Date(c.createdAt).setHours(0, 0, 0, 0) === today;
          }
          if (status === "suspended") return c.tempCustomerStatus === "Suspended";
          if (status === "low_balance") return (c.walletBalance || 0) < 100;
          if (status === "sub_running") return c.hasActiveSub;
          if (status === "no_plan") return !c.hasAnySub;
          if (status === "trial_running") return c.hasActiveTrial;
          if (status === "trial_ended" || status === "not_converted") return c.hasEndedTrial;
          if (status === "last_7_days") {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(c.createdAt) >= weekAgo;
          }
          return false;
        });
      });
    }

    if (filters.geoTagStatus === "Geo-tagged Only") {
      data = data.filter(c => {
        const coords = c.address?.location?.coordinates;
        return coords && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1]) && !(coords[1] === 8.1833 && coords[0] === 77.4119);
      });
    } else if (filters.geoTagStatus === "No Geo-tag") {
      data = data.filter(c => {
        const coords = c.address?.location?.coordinates;
        return !coords || coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1]) || (coords[1] === 8.1833 && coords[0] === 77.4119);
      });
    }

    return data.sort((a, b) => {
      if (sortKey === "walletBalance" || sortKey === "effectiveWalletBalance" || sortKey === "creditLimit" || sortKey === "unbilledConsumption" || sortKey === "totalOrders") {
        const getNum = (c) => sortKey === "effectiveWalletBalance" 
          ? ((c.walletBalance || 0) + (c.creditLimit || 0) - (c.unbilledConsumption || 0))
          : (Number(c[sortKey]) || 0);
        
        let numA = getNum(a);
        let numB = getNum(b);
        return sortOrder === "asc" ? numA - numB : numB - numA;
      }

      let valA, valB;
      if (sortKey === "hub") { valA = a.hub?.name || ""; valB = b.hub?.name || ""; }
      else if (sortKey === "route") { valA = a.area?.name || a.serviceArea?.name || ""; valB = b.area?.name || b.serviceArea?.name || ""; }
      else if (sortKey === "city") { valA = a.city?.name || ""; valB = b.city?.name || ""; }
      else if (sortKey === "deliveryBoy") { valA = a.deliveryBoy?.name || ""; valB = b.deliveryBoy?.name || ""; }
      else { valA = a[sortKey] !== undefined && a[sortKey] !== null ? a[sortKey] : ""; valB = b[sortKey] !== undefined && b[sortKey] !== null ? b[sortKey] : ""; }

      if (typeof valA === 'string' || typeof valB === 'string') {
        return sortOrder === "asc" ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      }
      return sortOrder === "asc" ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    });
  }, [customerData, filters, sortKey, sortOrder]);

  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const CustomerCard = ({ customer }) => (
    <div
      onClick={() => navigate(`/administrator/dashboard/customers/${customer.customerId || customer._id}`)}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-teal-200 transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-lg border border-teal-100">
            {customer.name?.charAt(0) || "C"}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 group-hover:text-teal-600 transition-colors line-clamp-1">{customer.name}</h3>
            <p className="text-xs text-gray-400 font-mono">
              {customer.role === 'LEAD' && (
                <span className="text-purple-500 font-bold border border-purple-200 bg-purple-50 px-1 py-0.5 rounded text-[10px] mr-1">LEAD</span>
              )}
              #{customer.customerId || "N/A"}
            </p>
          </div>
        </div>
        <span className={`badge badge-xs p-2 normal-case font-medium ${customer.isActive ? 'badge-success text-white' : 'badge-ghost text-gray-500'}`}>
          {customer.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>{customer.mobile}</span>
        </div>
        {customer.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="w-4 h-4 text-gray-400" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapIcon className="w-4 h-4 text-gray-400" />
          <span className="line-clamp-1">{customer.address?.fullAddress || "-"}</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-50">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Hub / Route</span>
          <span className="text-xs font-semibold text-gray-600">{customer.hub?.name || "-"} / {customer.serviceArea?.name || "-"}</span>
        </div>
        <button className="btn btn-xs btn-ghost text-teal-600 normal-case opacity-0 group-hover:opacity-100 transition-opacity">
          View Details →
        </button>
      </div>
    </div>
  );

  const stats = [
    {
      title: "Total Customers",
      value: summary?.result?.totalCustomers || 0,
      icon: Users,
      color: "bg-teal-500",
      info: "All registered customers",
      onClick: () => setFilters(prev => ({ ...prev, status: [] })),
      active: filters.status.length === 0
    },
    {
      title: "Active",
      value: summary?.result?.active || 0,
      icon: UserCheck,
      color: "bg-emerald-500",
      info: "Customers with active subscription or trial running",
      onClick: () => setFilters(prev => ({ ...prev, status: ["active"] })),
      active: filters.status.length === 1 && filters.status.includes("active")
    },
    {
      title: "Inactive",
      value: summary?.result?.inactive || 0,
      icon: UserMinus,
      color: "bg-gray-500",
      info: "Subscription paused or stopped (not on vacation)",
      onClick: () => setFilters(prev => ({ ...prev, status: ["inactive"] })),
      active: filters.status.length === 1 && filters.status.includes("inactive")
    },
    {
      title: "On Vacation",
      value: summary?.result?.onVacation || 0,
      icon: Palmtree,
      color: "bg-sky-400",
      info: "Customers with vacation mode active",
      onClick: () => setFilters(prev => ({ ...prev, status: ["on_vacation"] })),
      active: filters.status.length === 1 && filters.status.includes("on_vacation")
    },
    {
      title: "New (Today)",
      value: summary?.result?.newCustomers || 0,
      icon: UserPlus,
      color: "bg-blue-500",
      info: "Customers signed up today",
      onClick: () => setFilters(prev => ({ ...prev, status: ["new_today"] })),
      active: filters.status.length === 1 && filters.status.includes("new_today")
    },
    {
      title: "Suspended",
      value: summary?.result?.suspended || 0,
      icon: UserX,
      color: "bg-red-500",
      info: "Account suspended due to low balance or other reasons",
      onClick: () => setFilters(prev => ({ ...prev, status: ["suspended"] })),
      active: filters.status.length === 1 && filters.status.includes("suspended")
    },
    {
      title: "Low Balance",
      value: summary?.result?.suspendedLowBalance || 0,
      icon: AlertCircle,
      color: "bg-orange-500",
      info: "Customers with balance for less than 2 days",
      onClick: () => setFilters(prev => ({ ...prev, status: ["low_balance"] })),
      active: filters.status.length === 1 && filters.status.includes("low_balance")
    },
    {
      title: "Sub. Running",
      value: summary?.result?.subRunning || 0,
      icon: ShoppingCart,
      color: "bg-indigo-500",
      info: "Customers with active non-trial subscription",
      onClick: () => setFilters(prev => ({ ...prev, status: ["sub_running"] })),
      active: filters.status.length === 1 && filters.status.includes("sub_running")
    },
    {
      title: "No Plan",
      value: summary?.result?.noPlan || 0,
      icon: Ban,
      color: "bg-zinc-500",
      info: "Active customers without any subscription",
      onClick: () => setFilters(prev => ({ ...prev, status: ["no_plan"] })),
      active: filters.status.length === 1 && filters.status.includes("no_plan")
    },
    {
      title: "Trial Running",
      value: summary?.result?.trialRunning || 0,
      icon: Calendar,
      color: "bg-teal-400",
      info: "Customers with a running trial",
      onClick: () => setFilters(prev => ({ ...prev, status: ["trial_running"] })),
      active: filters.status.length === 1 && filters.status.includes("trial_running")
    },
    {
      title: "Trial Ended",
      value: summary?.result?.trialEnded || 0,
      icon: Clock,
      color: "bg-amber-400",
      info: "Customers who took trial but ended and didn't subscribe",
      onClick: () => setFilters(prev => ({ ...prev, status: ["trial_ended"] })),
      active: filters.status.length === 1 && filters.status.includes("trial_ended")
    },
    {
      title: "Not Converted",
      value: summary?.result?.notConverted || 0,
      icon: RefreshCw,
      color: "bg-rose-400",
      info: "Same as Trial Ended (No subscription after trial)",
      onClick: () => setFilters(prev => ({ ...prev, status: ["not_converted"] })),
      active: filters.status.length === 1 && filters.status.includes("not_converted")
    },
    {
      title: "Last 7 Days",
      value: summary?.result?.last7Days || 0,
      icon: Calendar,
      color: "bg-sky-400",
      info: "Customers signed up in last 7 days on app/website",
      onClick: () => setFilters(prev => ({ ...prev, status: ["last_7_days"] })),
      active: filters.status.length === 1 && filters.status.includes("last_7_days")
    },
  ];

  return (
    <div className="min-h-screen bg-[#f9fafb] p-6 space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
        <Link to="/administrator/dashboard" className="hover:text-teal-600">Home</Link>
        <span>/</span>
        <span className="text-gray-400">Customers</span>
      </div>

      {/* Summary Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-700">Summary</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { refetchSummary(); refetchCustomers(); }}
              className="btn btn-sm btn-ghost gap-2 normal-case border border-gray-200"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-teal"
                checked={showSnapshots}
                onChange={() => setShowSnapshots(!showSnapshots)}
              />
              <span className="text-sm font-medium text-gray-600">Show Snapshots</span>
            </div>
          </div>
        </div>

        {showSnapshots && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {stats.map((stat, idx) => (
              <StatCard key={idx} {...stat} />
            ))}
          </div>
        )}
      </div>

      {/* Customers Table Section */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${isExpanded ? 'fixed inset-0 z-[100] rounded-none overflow-y-auto' : ''}`}>
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-700 uppercase tracking-wider">Customers</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsMapView(!isMapView)}
              className={`btn btn-sm gap-2 normal-case ${isMapView ? 'btn-teal text-white' : 'btn-outline bg-white'}`}
            >
              <MapIcon className="w-4 h-4" /> {isMapView ? 'List View' : 'Map View'}
            </button>
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-sm btn-info text-white gap-2 normal-case">
                <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3" />
              </label>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                <li><a onClick={() => handleExport('excel')}>Excel</a></li>
                <li><a onClick={() => handleExport('csv')}>CSV</a></li>
                <li><a onClick={() => handleExport('pdf')}>PDF</a></li>
              </ul>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-sm btn-outline btn-teal gap-2 normal-case relative overflow-hidden"
              disabled={uploadProgress > 0}
            >
              {uploadProgress > 0 && (
                <div
                  className="absolute inset-0 bg-teal-100 opacity-50 z-0 transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
              <div className="flex items-center gap-2 relative z-10">
                <RefreshCw className={`w-4 h-4 ${uploadProgress > 0 ? 'animate-spin' : ''}`} />
                {uploadProgress > 0 ? `Uploading (${uploadProgress}%)` : 'Upload'}
              </div>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-sm btn-teal text-white gap-2 normal-case"
            >
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          </div>
        </div>

        {/* Table Controls */}
        <div className="p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-gray-600">
          <div className="flex items-center gap-2">
            Show
            <select
              className="select select-bordered select-xs w-16"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
            </select>
            entries
          </div>
          <div>
            Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetchCustomers()} className="btn btn-xs btn-outline gap-1 normal-case bg-white"><RefreshCw className="w-3 h-3" /> Refresh</button>
            <button onClick={handleReset} className="btn btn-xs btn-outline btn-error gap-1 normal-case bg-white"><RotateCcw className="w-3 h-3" /> Reset</button>
            <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-xs gap-1 normal-case ${showFilters ? 'btn-teal text-white' : 'btn-outline bg-white'}`}><Filter className="w-3 h-3" /> Filters</button>
            <div className="relative">
              <button onClick={() => setShowColumnPicker(!showColumnPicker)} className={`btn btn-xs gap-1 normal-case ${showColumnPicker ? 'btn-teal text-white' : 'btn-outline bg-white'}`}><Columns className="w-3 h-3" /> Columns</button>
              {showColumnPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3 w-48 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Toggle columns</p>
                  {allColumns.map(col => (
                    <label key={col.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs checkbox-success"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                      />
                      <span className="text-xs text-gray-700">{col.label}</span>
                    </label>
                  ))}
                  <div className="border-t border-gray-100 pt-2 mt-2 flex gap-1">
                    <button className="btn btn-xs btn-ghost flex-1 normal-case" onClick={() => setVisibleColumns(allColumns.map(c => c.key))}>All</button>
                    <button className="btn btn-xs btn-ghost flex-1 normal-case" onClick={() => setVisibleColumns(['customerId', 'name', 'mobile'])}>Min</button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setIsExpanded(!isExpanded)} className={`btn btn-xs btn-outline bg-white ${isExpanded ? 'btn-teal text-white' : ''}`} title={isExpanded ? 'Exit fullscreen' : 'Expand table'}><Maximize2 className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Main Content Area */}
        {isMapView ? (
          <div className="flex flex-col border-t border-gray-100 bg-gray-50">
            {/* Map Filter & Status Top Bar */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="form-control">
                <label className="label text-xs font-bold text-gray-500 py-1">Subscription Status</label>
                <select className="select select-sm select-bordered w-full bg-white text-gray-700" value={filters.status[0] || "All"} onChange={e => handleFilterChange("status", e.target.value === "All" ? [] : [e.target.value])}>
                  <option value="All">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_vacation">On Vacation</option>
                  <option value="suspended">Suspended</option>
                  <option value="sub_running">Sub Running</option>
                  <option value="trial_running">Trial Running</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label text-xs font-bold text-gray-500 py-1">Area</label>
                <select className="select select-sm select-bordered w-full bg-white text-gray-700" value={filters.route[0] || "All"} onChange={e => handleFilterChange("route", e.target.value === "All" ? [] : [e.target.value])}>
                  <option value="All">All Areas</option>
                  {filterOptions.routes.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label text-xs font-bold text-gray-500 py-1">Delivery Boy</label>
                <select className="select select-sm select-bordered w-full bg-white text-gray-700" value={filters.deliveryBoy[0] || "All"} onChange={e => handleFilterChange("deliveryBoy", e.target.value === "All" ? [] : [e.target.value])}>
                  <option value="All">All Delivery Boys</option>
                  {globalOptions.deliveryBoys.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label text-xs font-bold text-gray-500 py-1">Geo Tag Status</label>
                <select className="select select-sm select-bordered w-full bg-white text-gray-700" value={filters.geoTagStatus} onChange={e => handleFilterChange("geoTagStatus", e.target.value)}>
                  <option value="All">All</option>
                  <option value="Geo-tagged Only">Geo-tagged Only</option>
                  <option value="No Geo-tag">No Geo-tag</option>
                </select>
              </div>
            </div>

            <div className="px-4 pb-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button className="btn btn-sm bg-teal-700 text-white hover:bg-teal-800 border-none px-4 normal-case">
                  <Filter className="w-3.5 h-3.5" /> Apply Filters
                </button>
                <button className="btn btn-sm bg-[#2e3440] text-white hover:bg-[#3b4252] border-none px-4 normal-case" onClick={handleReset}>
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
                <div className="text-sm font-medium text-gray-600 flex items-center gap-1.5 ml-2">
                  <MapIcon className="w-4 h-4 text-gray-700" />
                  {filteredData.length} / {customerData?.result?.length || 0} markers loaded
                </div>
              </div>
              <div className="flex gap-2 text-[11px] font-bold">
                <div className="bg-emerald-500 text-white rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white"></span> Geo-tagged
                </div>
                <div className="bg-orange-400 text-white rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white"></span> No Geo-tag
                </div>
              </div>
            </div>

            <div className="h-[600px] w-full relative z-10 transition-all rounded-b-2xl overflow-hidden bg-gray-200">
              {/* Internal absolute toggle for Map / Satellite */}
              <div className="absolute top-4 left-4 z-[9999] flex bg-white rounded shadow-md overflow-hidden text-sm font-semibold">
                <button
                  className={`px-4 py-1.5 ${mapType === 'map' ? 'bg-gray-100 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => setMapType('map')}
                >Map</button>
                <button
                  className={`px-4 py-1.5 ${mapType === 'satellite' ? 'bg-gray-100 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => setMapType('satellite')}
                >Satellite</button>
              </div>

              <MapContainer center={[8.175, 77.433]} zoom={11} className="h-full w-full">
                {mapType === 'map' ? (
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                ) : (
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='&copy; Esri' />
                )}

                {/* Render Service Area Polygons */}
                {serviceAreas?.result?.map(sa => {
                  if (!sa.polygon?.coordinates?.[0]) return null;
                  const positions = sa.polygon.coordinates[0].map(c => [c[1], c[0]]);
                  return <Polygon key={sa._id} positions={positions} pathOptions={{ color: '#0ea5e9', fillColor: '#38bdf8', fillOpacity: 0.15, weight: 2 }} />;
                })}

                {(() => {
                  const groupedCustomers = {};
                  filteredData.forEach(customer => {
                    const coords = customer.address?.location?.coordinates;
                    if (coords && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                      const key = `${coords[1]},${coords[0]}`;
                      if (!groupedCustomers[key]) groupedCustomers[key] = [];
                      groupedCustomers[key].push(customer);
                    }
                  });

                  return Object.entries(groupedCustomers).map(([coordKey, group]) => {
                    const [lat, lng] = coordKey.split(',').map(Number);

                    // Helper logic for creating icons matching screenshot
                    const isGeoTagged = !(lat === 8.1833 && lng === 77.4119);
                    let iconHtml, iconSize, iconAnchor;

                    if (group.length > 1) {
                      iconHtml = `<div style="background-color: white; border: 2px solid #3b82f6; border-radius: 50%; color: #3b82f6; font-weight: bold; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">${group.length}</div>`;
                      iconSize = [30, 30];
                      iconAnchor = [15, 15];
                    } else {
                      const bgColor = isGeoTagged ? '#10b981' : '#f97316';
                      iconHtml = `<div style="background-color: ${bgColor}; border: 2.5px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></div>`;
                      iconSize = [16, 16];
                      iconAnchor = [8, 8];
                    }

                    const customIcon = L.divIcon({ html: iconHtml, className: '', iconSize, iconAnchor });

                    return (
                      <Marker key={coordKey} position={[lat, lng]} icon={customIcon}>
                        <Popup>
                          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto w-64 p-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase border-b pb-1 mb-1 tracking-wider sticky top-0 bg-white z-10">
                              {group.length} Customer{group.length > 1 ? 's' : ''} here
                            </span>
                            {group.map(customer => (
                              <div key={customer._id || customer.customerId} className="flex flex-col gap-1 pb-2 border-b border-gray-50 last:border-0 last:pb-0">
                                <Link to={`/administrator/dashboard/customers/${customer.customerId || customer._id}`} className="text-teal-600 hover:underline font-bold text-sm">
                                  {customer.name}
                                </Link>
                                <span className="text-xs text-gray-500">{customer.mobile}</span>
                                <span className="text-xs break-words text-gray-500 line-clamp-1" title={customer.address?.fullAddress}>{customer.address?.fullAddress || "-"}</span>
                                <div>
                                  <span className={`badge badge-xs ${customer.isActive ? 'badge-success text-white' : 'badge-ghost text-gray-500'}`}>
                                    {customer.isActive ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  });
                })()}
              </MapContainer>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-compact w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider border-b border-gray-100">
                  {allColumns.map(col => {
                    if (!isColVisible(col.key)) return null;
                    return (
                      <th key={col.key} className="p-3 border-r border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap" onClick={() => handleSort(col.key)}>
                        {col.label} {sortKey === col.key && (sortOrder === "asc" ? "↑" : "↓")}
                      </th>
                    );
                  })}
                </tr>
                {showFilters && (
                  <tr className="bg-white border-b border-gray-100">
                    {allColumns.map(col => {
                      if (!isColVisible(col.key)) return null;

                      // Special filter renderers
                      if (col.key === 'customerId') {
                        return <td key={col.key} className="p-2 border-r border-gray-100"><div className="relative"><Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Filter ID" className="input input-xs w-full pl-7 bg-gray-50 border-none focus:ring-1 focus:ring-teal-500" value={filters.id} onChange={(e) => handleFilterChange("id", e.target.value)} /></div></td>;
                      }
                      if (col.key === 'name') {
                        return <td key={col.key} className="p-2 border-r border-gray-100"><div className="relative"><Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Filter Name" className="input input-xs w-full pl-7 bg-gray-50 border-none focus:ring-1 focus:ring-teal-500" value={filters.name} onChange={(e) => handleFilterChange("name", e.target.value)} /></div></td>;
                      }
                      if (col.key === 'mobile') {
                        return <td key={col.key} className="p-2 border-r border-gray-100"><input type="text" placeholder="Filter Mobile" className="input input-xs w-full bg-gray-50 border-none focus:ring-1 focus:ring-teal-500" value={filters.mobile} onChange={(e) => handleFilterChange("mobile", e.target.value)} /></td>;
                      }
                      if (col.key === 'email') {
                        return <td key={col.key} className="p-2 border-r border-gray-100"><input type="text" placeholder="Filter Email" className="input input-xs w-full bg-gray-50 border-none focus:ring-1 focus:ring-teal-500" value={filters.email} onChange={(e) => handleFilterChange("email", e.target.value)} /></td>;
                      }
                      if (col.key === 'isActive') {
                        return <td key={col.key} className="p-2 border-r border-gray-100"><MultiSelectDropdown options={["active", "inactive", "on_vacation", "suspended", "no_plan", "trial_running", "trial_ended"]} selectedValues={filters.status} onChange={(val) => handleFilterChange("status", val)} placeholder="All Status" /></td>;
                      }
                      if (col.key === 'hub') {
                        return <td key={col.key} className="p-2 border-r border-gray-100"><MultiSelectDropdown options={filterOptions.hubs} selectedValues={filters.hub} onChange={(val) => handleFilterChange("hub", val)} placeholder="All Hubs" /></td>;
                      }
                      if (col.key === 'route') {
                        return <td key={col.key} className="p-2 border-r border-gray-100"><MultiSelectDropdown options={filterOptions.routes} selectedValues={filters.route} onChange={(val) => handleFilterChange("route", val)} placeholder="All Routes" /></td>;
                      }
                      if (col.key === 'city') {
                        return <td key={col.key} className="p-2 border-r border-gray-100"><MultiSelectDropdown options={filterOptions.cities} selectedValues={filters.city} onChange={(val) => handleFilterChange("city", val)} placeholder="All Cities" /></td>;
                      }
                      if (col.key === 'deliveryBoy') {
                        return <td key={col.key} className="p-2 border-r border-gray-100"><MultiSelectDropdown options={globalOptions.deliveryBoys.map(r => r.name)} selectedValues={filters.deliveryBoy} onChange={(val) => handleFilterChange("deliveryBoy", val)} placeholder="All Riders" /></td>;
                      }

                      return <td key={col.key} className="p-2 bg-gray-50/30 border-r border-gray-100"></td>;
                    })}
                  </tr>
                )}
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={allColumns.length} className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-500" /></td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan={allColumns.length} className="text-center py-10 font-medium italic text-gray-400">No customers found matching your filters.</td></tr>
                ) : paginatedData.map((customer) => {
                  return (
                    <tr
                      key={customer._id}
                      className="hover:bg-teal-50 border-b border-gray-100 group transition-colors cursor-pointer"
                      onClick={() => navigate(`/administrator/dashboard/customers/${customer.customerId || customer._id}`)}
                    >
                      {allColumns.map(col => {
                        if (!isColVisible(col.key)) return null;

                        let content = "-";

                        switch (col.key) {
                          case "customerId":
                            content = (
                              <div className="font-mono text-xs">
                                {customer.role === 'LEAD' && <span className="text-purple-500 font-bold border border-purple-200 bg-purple-50 px-1 py-0.5 rounded text-[10px] mr-1 block w-max mb-1">LEAD</span>}
                                <Link to={`/administrator/dashboard/customers/${customer.customerId || customer._id}`} className="text-teal-600 hover:underline font-bold" onClick={(e) => e.stopPropagation()}>{customer.customerId || "N/A"}</Link>
                              </div>
                            );
                            break;
                          case "name": content = <span className="font-bold text-gray-700 whitespace-nowrap">{customer.name}</span>; break;
                          case "mobile": content = <span className="text-gray-600 whitespace-nowrap">{customer.mobile}</span>; break;
                          case "email": content = <span className="text-gray-500 truncate max-w-[150px] inline-block">{customer.email || "-"}</span>; break;
                          case "isActive":
                            content = customer.role === 'LEAD'
                              ? <span className="badge badge-xs p-2 normal-case font-medium bg-purple-100 text-purple-600 border border-purple-200 whitespace-nowrap">Lead</span>
                              : <span className={`badge badge-xs p-2 normal-case font-medium whitespace-nowrap ${customer.isActive ? 'badge-success text-white' : 'badge-ghost text-gray-500'}`}>{customer.isActive ? "Active" : "Inactive"}</span>;
                            break;
                          case "hub": content = <span className="text-gray-600 font-medium whitespace-nowrap">{customer.hub?.name || "-"}</span>; break;
                          case "route": content = <span className="text-gray-600 font-medium whitespace-nowrap">{customer.area?.name || customer.serviceArea?.name || "-"}</span>; break;
                          case "city": content = <span className="text-gray-600 font-medium whitespace-nowrap">{customer.city?.name || "-"}</span>; break;
                          case "deliveryBoy": content = <span className="text-teal-600 font-semibold whitespace-nowrap">{customer.deliveryBoy?.name || "Unassigned"}</span>; break;
                          case "walletBalance": content = <span className="font-bold text-gray-800 whitespace-nowrap">₹{customer.walletBalance?.toFixed(2) || "0.00"}</span>; break;

                          case "subStatus": content = <span className="whitespace-nowrap">{customer.isActive ? "Active" : "Inactive"}</span>; break;
                          case "isBlocked": content = <span className="whitespace-nowrap">{!customer.isActive ? "Yes" : "No"}</span>; break;
                          case "customerType": content = <span className="whitespace-nowrap">{customer.type || "Consumer"}</span>; break;
                          case "subSource": content = <span className="whitespace-nowrap">{customer.subSource || "-"}</span>; break;
                          case "tempCustomerStatus": content = <span className="whitespace-nowrap">{customer.tempCustomerStatus || "-"}</span>; break;
                          case "lastDeviceActive": content = "-"; break;
                          case "lastPaymentBeforeDays": content = "-"; break;
                          case "totalRevenue": content = "-"; break;
                          case "createdBy": content = <span className="whitespace-nowrap">{customer.createdBy || "-"}</span>; break;
                          case "createdDate": content = <span className="whitespace-nowrap">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "-"}</span>; break;
                          case "followUpDate": content = <span className="whitespace-nowrap">{customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : "-"}</span>; break;
                          case "alternateMobile": content = <span className="whitespace-nowrap">{customer.alternateMobile || "-"}</span>; break;
                          case "address": content = <span className="whitespace-nowrap truncate max-w-[200px] inline-block">{customer.address?.fullAddress || "-"}</span>; break;
                          case "geoLocation": content = <span className="whitespace-nowrap truncate max-w-[150px] inline-block">{customer.address?.location?.coordinates?.join(", ") || "-"}</span>; break;
                          case "creditLimit": content = <span className="whitespace-nowrap">₹{customer.creditLimit || "0"}</span>; break;
                          case "crmAgent": content = <span className="whitespace-nowrap">{customer.crmAgent || "-"}</span>; break;
                          case "campaignName": content = "-"; break;
                          case "gstNumber": content = <span className="whitespace-nowrap">{customer.gstNumber || "-"}</span>; break;
                          case "currentConsumption": content = <span className="whitespace-nowrap">₹{customer.unbilledConsumption || "0"}</span>; break;
                          case "lastDeliveryDate": content = "-"; break;
                          case "createdTime": content = <span className="whitespace-nowrap">{customer.createdAt ? new Date(customer.createdAt).toLocaleTimeString() : "-"}</span>; break;
                          case "paymentMode": content = <span className="whitespace-nowrap">{customer.paymentMode || "-"}</span>; break;
                          case "effectiveWalletBalance": content = <span className="font-bold whitespace-nowrap">₹{((customer.walletBalance || 0) + (customer.creditLimit || 0) - (customer.unbilledConsumption || 0)).toFixed(2)}</span>; break;
                          case "paymentType": content = <span className="whitespace-nowrap">{customer.billingType || "-"}</span>; break;
                          case "source": content = <span className="whitespace-nowrap">{customer.source || "-"}</span>; break;
                          case "note": content = <span className="truncate max-w-[150px] inline-block whitespace-nowrap">{customer.notes || "-"}</span>; break;
                          case "lastDeviceType": content = <span className="whitespace-nowrap">{customer.deviceType || "-"}</span>; break;
                          case "dueSince": content = "-"; break;
                          case "deliveryPreference": content = <span className="whitespace-nowrap">{customer.deliveryPreference || "-"}</span>; break;
                          case "dnd": content = <span className="whitespace-nowrap">{customer.dnd ? "Yes" : "No"}</span>; break;
                          case "firstDeliveryDate": content = "-"; break;
                          case "timeSlot": content = <span className="whitespace-nowrap">{customer.deliveryShift || "-"}</span>; break;
                          case "totalOrders": content = <span className="whitespace-nowrap">{customer.totalOrders || "0"}</span>; break;
                          case "callStatus": content = "-"; break;
                        }

                        return <td key={col.key} className="p-3 border-r border-gray-100 text-sm align-middle">{content}</td>;
                      })}
                    </tr>
                  )
                }
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isMapView && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-xs text-gray-500 font-medium">
              Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-xs btn-outline normal-case bg-white disabled:bg-gray-100"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >First</button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let start = Math.max(1, currentPage - 2);
                  if (start + 4 > totalPages) start = Math.max(1, totalPages - 4);
                  const pg = start + i;
                  if (pg > totalPages) return null;
                  return (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`btn btn-xs normal-case ${currentPage === pg ? 'btn-teal text-white' : 'btn-outline bg-white'}`}
                    >{pg}</button>
                  );
                })}
              </div>
              <button
                className="btn btn-xs btn-outline normal-case bg-white disabled:bg-gray-100"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >Last</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {
        isAddModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border border-white border-opacity-20 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-teal-600" /> Add New Customer
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="btn btn-sm btn-circle btn-ghost">✕</button>
              </div>
              <form onSubmit={handleCreate} className="space-y-6">
                {/* Form fields ... same logic as before but with better styling */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label text-xs font-bold text-gray-500 uppercase">Customer Type</label>
                    <select className="select select-bordered" value={newCustomer.role || "CUSTOMER"} onChange={e => setNewCustomer({ ...newCustomer, role: e.target.value })}>
                      <option value="CUSTOMER">Customer</option>
                      <option value="LEAD">Lead</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold text-gray-500 uppercase">Full Name</label>
                    <input type="text" className="input input-bordered" required value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold text-gray-500 uppercase">Mobile Number</label>
                    <input type="tel" className="input input-bordered" required value={newCustomer.mobile} onChange={e => setNewCustomer({ ...newCustomer, mobile: e.target.value })} />
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold text-gray-500 uppercase">Email Address</label>
                    <input type="email" className="input input-bordered" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold text-gray-500 uppercase">House / Flat No</label>
                    <input type="text" className="input input-bordered" required={newCustomer.role !== 'LEAD'} value={newCustomer.houseNo} onChange={e => setNewCustomer({ ...newCustomer, houseNo: e.target.value })} />
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold text-gray-500 uppercase">Floor</label>
                    <input type="text" className="input input-bordered" required={newCustomer.role !== 'LEAD'} value={newCustomer.floor} onChange={e => setNewCustomer({ ...newCustomer, floor: e.target.value })} />
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold text-gray-500 uppercase">Area / Landmark</label>
                    <input type="text" className="input input-bordered" required={newCustomer.role !== 'LEAD'} value={newCustomer.area} onChange={e => setNewCustomer({ ...newCustomer, area: e.target.value })} />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label text-xs font-bold text-gray-500 uppercase">Full Address</label>
                  <textarea className="textarea textarea-bordered h-20" required={newCustomer.role !== 'LEAD'} value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}></textarea>
                </div>

                {/* Manual Location Entry */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-bold text-blue-700 uppercase">Location Entry</label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCustomer(prev => ({
                          ...prev,
                          houseNo: "",
                          floor: "",
                          area: "",
                          address: "",
                          landmark: ""
                        }));
                        setLocation([8.1833, 77.4119]);
                        toast.success("Address cleared");
                      }}
                      className="btn btn-xs btn-error btn-outline normal-case"
                    >
                      Clear Address
                    </button>
                  </div>
                  <div className="form-control">
                    <label className="label text-[10px] font-medium text-gray-500 uppercase">Paste Google Map Code / Link or "Lat, Lng"</label>
                    <input
                      type="text"
                      placeholder="Paste link or coordinates here..."
                      className="input input-bordered input-sm border-blue-200 focus:border-blue-500 w-full"
                      onPaste={(e) => {
                        const pastedData = e.clipboardData.getData('text');
                        // Handle Lat, Lng format
                        const coordMatch = pastedData.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
                        if (coordMatch) {
                          setLocation([parseFloat(coordMatch[1]), parseFloat(coordMatch[2])]);
                          toast.success("Coordinates extracted");
                          return;
                        }
                        // Handle Google Maps @lat,lng format
                        const urlMatch = pastedData.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                        if (urlMatch) {
                          setLocation([parseFloat(urlMatch[1]), parseFloat(urlMatch[2])]);
                          toast.success("Location extracted from URL");
                          return;
                        }
                        // Handle ?q=lat,lng format
                        const qMatch = pastedData.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                        if (qMatch) {
                          setLocation([parseFloat(qMatch[1]), parseFloat(qMatch[2])]);
                          toast.success("Location extracted from query");
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Map Picker */}
                <div className="h-60 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative">
                  <MapContainer center={[8.1833, 77.4119]} zoom={12} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {location && (
                      <>
                        <Marker
                          position={location}
                          draggable={true}
                          eventHandlers={{
                            dragend: (e) => {
                              const marker = e.target;
                              const position = marker.getLatLng();
                              setLocation([position.lat, position.lng]);
                            },
                          }}
                        />
                        <RecenterMap lat={location[0]} lng={location[1]} />
                      </>
                    )}
                    <LocationPicker setLocation={setLocation} />
                  </MapContainer>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <button type="button" className="btn btn-ghost normal-case" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-teal text-white normal-case px-8" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adding..." : "Save Customer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      <ExportFieldsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onSave={processExport}
      />
    </div >
  );
};
