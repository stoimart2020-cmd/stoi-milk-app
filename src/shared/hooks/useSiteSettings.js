import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../api/axios';

const getSettings = async () => {
    const response = await axiosInstance.get("/api/settings");
    return response.data;
};

export const useSiteSettings = () => {
    const { data } = useQuery({
        queryKey: ["settings"],
        queryFn: getSettings,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const settings = data?.result?.site || {};
    const headerSettings = data?.result?.header || {};
    const footerSettings = data?.result?.footer || {};
    const adminFooterSettings = data?.result?.adminFooter || {};
    const orderSettings = data?.result?.order || {};

    const {
        siteName = "Stoi Milk",
        tagline,
        logo,
        favicon,
        primaryColor,
        secondaryColor
    } = settings;

    const {
        phone = "7598232759",
        playStoreLink = "https://play.google.com/store",
        appStoreLink = "https://apps.apple.com",
        showAppLinks = true
    } = headerSettings;

    useEffect(() => {
        // Update Title
        if (siteName) {
            document.title = tagline ? `${siteName} - ${tagline}` : siteName;
        }

        // Update Favicon
        if (favicon) {
            const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = favicon;
            document.getElementsByTagName('head')[0].appendChild(link);
        }

        // Update CSS Variables for Colors
        const root = document.documentElement;
        if (primaryColor) {
            root.style.setProperty('--p', hexToHsl(primaryColor));
            root.style.setProperty('--pf', hexToHsl(primaryColor)); // primary focus
        }
        if (secondaryColor) {
            root.style.setProperty('--s', hexToHsl(secondaryColor));
            root.style.setProperty('--sf', hexToHsl(secondaryColor)); // secondary focus
        }

    }, [siteName, tagline, favicon, primaryColor, secondaryColor]);

    return {
        siteName,
        logo,
        settings,
        // Header settings
        phone,
        playStoreLink,
        appStoreLink,
        showAppLinks,
        footerSettings,
        adminFooterSettings,
        orderSettings
    };
};

// Helper to convert Hex to HSL for DaisyUI/Tailwind
// DaisyUI uses HSL values for variables like --p, --s
function hexToHsl(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);

    r /= 255;
    g /= 255;
    b /= 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
}
