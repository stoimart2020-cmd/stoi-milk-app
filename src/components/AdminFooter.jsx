import React from 'react';
import { useSiteSettings } from '../shared/hooks/useSiteSettings';
import { Facebook, Twitter, Instagram, Youtube, Phone, Mail, MapPin } from 'lucide-react';

export const AdminFooter = () => {
    const { adminFooterSettings } = useSiteSettings();
    const {
        copyrightText,
        showSocialLinks,
        socialLinks,
        address,
        phone,
        email
    } = adminFooterSettings || {};

    const currentYear = new Date().getFullYear();
    const displayCopyright = copyrightText ? copyrightText.replace('{year}', currentYear) : `© ${currentYear} All rights reserved.`;

    return (
        <footer className="bg-white border-t border-gray-200 py-6 px-6 mt-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
                {/* Left Side: Copyright */}
                <div className="text-center md:text-left">
                    <p dangerouslySetInnerHTML={{ __html: displayCopyright }}></p>
                </div>

                {/* Center: Contact Info */}
                {(phone || email) && (
                    <div className="flex flex-wrap justify-center gap-4 text-xs">
                        {phone && <span className="flex items-center gap-1"><Phone size={12} /> {phone}</span>}
                        {email && <span className="flex items-center gap-1"><Mail size={12} /> {email}</span>}
                    </div>
                )}

                {/* Right Side: Social Links */}
                {showSocialLinks && socialLinks && (
                    <div className="flex items-center gap-4">
                        {socialLinks.facebook && (
                            <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                                <Facebook size={18} />
                            </a>
                        )}
                        {socialLinks.twitter && (
                            <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                                <Twitter size={18} />
                            </a>
                        )}
                        {socialLinks.instagram && (
                            <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-pink-600 transition-colors">
                                <Instagram size={18} />
                            </a>
                        )}
                        {socialLinks.youtube && (
                            <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-red-600 transition-colors">
                                <Youtube size={18} />
                            </a>
                        )}
                    </div>
                )}
            </div>
        </footer>
    );
};
