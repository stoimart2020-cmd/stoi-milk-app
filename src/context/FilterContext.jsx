import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    getFactories, getDistricts, getCities, getAreas, getHubs, getStockPoints
} from "../lib/api/logistics";
import { getAllRiders } from "../lib/api/riders";

const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
    const [filters, setFilters] = useState({
        factory: "",
        district: "",
        city: "",
        area: "",
        hub: "",
        stockPoint: "",
        deliveryBoy: ""
    });

    // Fetch all lists (assuming data size is manageable for dropdowns)
    const { data: factoriesData } = useQuery({ queryKey: ["factories"], queryFn: getFactories });
    const { data: districtsData } = useQuery({ queryKey: ["districts"], queryFn: getDistricts });
    const { data: citiesData } = useQuery({ queryKey: ["cities"], queryFn: getCities });
    const { data: areasData } = useQuery({ queryKey: ["areas"], queryFn: getAreas });
    const { data: hubsData } = useQuery({ queryKey: ["hubs"], queryFn: getHubs });
    const { data: stockPointsData } = useQuery({ queryKey: ["stockPoints"], queryFn: getStockPoints });
    const { data: ridersData } = useQuery({ queryKey: ["riders"], queryFn: getAllRiders });

    const factories = factoriesData?.result || [];

    // Filter Logic
    // 1. Districts depend on Factory
    const availableDistricts = (districtsData?.result || []).filter(d =>
        !filters.factory || (d.factory?._id === filters.factory || d.factory === filters.factory)
    );

    // 2. Cities depend on District
    const availableCities = (citiesData?.result || []).filter(c =>
        !filters.district || (c.district?._id === filters.district || c.district === filters.district)
    );

    // 3. Areas depend on City
    const availableAreas = (areasData?.result || []).filter(a =>
        !filters.city || (a.city?._id === filters.city || a.city === filters.city)
    );

    // 4. Hubs depend on Factory (Schema: factory ref)
    const availableHubs = (hubsData?.result || []).filter(h =>
        !filters.factory || (h.factory?._id === filters.factory || h.factory === filters.factory)
    );

    // 5. StockPoints depend on Hub
    const availableStockPoints = (stockPointsData?.result || []).filter(s =>
        !filters.hub || (s.hub?._id === filters.hub || s.hub === filters.hub)
    );

    // 6. Riders depend on Hub (if selected)
    const availableRiders = (ridersData?.result || []).filter(r =>
        !filters.hub || (r.hub?._id === filters.hub || r.hub === filters.hub)
    );


    const updateFilter = (key, value) => {
        setFilters(prev => {
            const next = { ...prev, [key]: value };

            // Reset Logic
            if (key === 'factory') {
                next.district = "";
                next.city = "";
                next.area = "";
                next.hub = "";
                next.stockPoint = "";
                next.deliveryBoy = "";
            }
            if (key === 'district') {
                next.city = "";
                next.area = "";
            }
            if (key === 'city') {
                next.area = "";
            }
            if (key === 'hub') {
                next.stockPoint = "";
                next.deliveryBoy = "";
            }
            return next;
        });
    };

    const clearFilters = () => {
        setFilters({
            factory: "",
            district: "",
            city: "",
            area: "",
            hub: "",
            stockPoint: "",
            deliveryBoy: ""
        });
    };

    return (
        <FilterContext.Provider value={{
            filters,
            updateFilter,
            clearFilters,
            options: {
                factories,
                districts: availableDistricts,
                cities: availableCities,
                areas: availableAreas,
                hubs: availableHubs,
                stockPoints: availableStockPoints,
                deliveryBoys: availableRiders
            }
        }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilters = () => useContext(FilterContext);
