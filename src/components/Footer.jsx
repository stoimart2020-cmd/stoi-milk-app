import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../shared/api/axios';
import { Facebook, Twitter, Instagram, Youtube, MapPin, Phone, Mail } from 'lucide-react';

const getSettings = async () => {
    const response = await axiosInstance.get("/api/settings");
    return response.data;
};

export const Footer = () => {
    const { data } = useQuery({
        queryKey: ["settings"],
        queryFn: getSettings,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const footerSettings = data?.result?.footer || {};
    const {
        copyrightText = `Copyright © ${new Date().getFullYear()} - All right reserved by Stoi Milk`,
        address,
        phone,
        email,
        showSocialLinks = true,
        socialLinks = {}
    } = footerSettings;

    return (
        <footer className="footer p-10 bg-base-200 text-base-content rounded-lg mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-8">
                {/* Contact Info - Left Aligned */}
                <div className="flex flex-col items-center md:items-start gap-2 flex-1">
                    <span className="footer-title opacity-100 text-primary">Contact Us</span>
                    {address && (
                        <div className="flex items-start gap-2 text-sm text-left">
                            <MapPin size={16} className="mt-1 shrink-0" />
                            <span className="whitespace-pre-line">{address}</span>
                        </div>
                    )}
                    {phone && (
                        <div className="flex items-center gap-2 text-sm">
                            <Phone size={16} />
                            <span>{phone}</span>
                        </div>
                    )}
                    {email && (
                        <div className="flex items-center gap-2 text-sm">
                            <Mail size={16} />
                            <span>{email}</span>
                        </div>
                    )}
                </div>

                {/* Social Links - Center Aligned */}
                <div className="flex flex-col items-center gap-4 flex-1">
                    <span className="footer-title opacity-100 text-primary">Follow Us</span>
                    {showSocialLinks && (
                        <div className="grid grid-flow-col gap-4">
                            {socialLinks.facebook && (
                                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-circle">
                                    <Facebook size={24} />
                                </a>
                            )}
                            {socialLinks.twitter && (
                                <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-circle">
                                    <Twitter size={24} />
                                </a>
                            )}
                            {socialLinks.instagram && (
                                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-circle">
                                    <Instagram size={24} />
                                </a>
                            )}
                            {socialLinks.youtube && (
                                <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-circle">
                                    <Youtube size={24} />
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* Copyright - Right Aligned */}
                <div className="flex flex-col items-center md:items-end justify-center flex-1 text-center md:text-right">
                    <p className="text-sm font-medium">{copyrightText}</p>
                </div>
            </div>
        </footer>
    );
};
