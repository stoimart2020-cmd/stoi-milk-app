import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Copy, Share2, Users, Wallet, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { axiosInstance } from "../../shared/api/axios";
import toast from "react-hot-toast";

// API calls
const getMyReferralCode = async () => {
    const response = await axiosInstance.get("/api/referrals/my-code");
    return response.data;
};

const getReferralStats = async () => {
    const response = await axiosInstance.get("/api/referrals/stats");
    return response.data;
};

export const CustomerReferrals = () => {
    const [copied, setCopied] = useState(false);

    const { data: codeData, isLoading: codeLoading } = useQuery({
        queryKey: ["myReferralCode"],
        queryFn: getMyReferralCode,
    });

    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ["referralStats"],
        queryFn: getReferralStats,
    });

    const referralCode = codeData?.result?.referralCode || "";
    const referralLink = codeData?.result?.referralLink || "";
    const referrerReward = codeData?.result?.settings?.referrerReward || 50;
    const refereeReward = codeData?.result?.settings?.refereeReward || 50;
    const shareMessageTemplate = codeData?.result?.settings?.shareMessage ||
        "🥛 Join STOI Milk and get ₹{{REFEREE_REWARD}} on your first order! Use my referral code: {{CODE}}\n\n{{LINK}}";

    const stats = statsData?.result || {
        totalReferrals: 0,
        totalEarnings: 0,
        pendingReferrals: 0,
        completedReferrals: 0,
        referrals: [],
    };

    // Build share message by replacing placeholders
    const buildShareMessage = () => {
        return shareMessageTemplate
            .replace(/\{\{CODE\}\}/g, referralCode)
            .replace(/\{\{LINK\}\}/g, referralLink)
            .replace(/\{\{REFEREE_REWARD\}\}/g, refereeReward)
            .replace(/\{\{REFERRER_REWARD\}\}/g, referrerReward);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralCode);
            setCopied(true);
            toast.success("Referral code copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    const handleShare = async () => {
        const shareText = buildShareMessage();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Join STOI Milk",
                    text: shareText,
                    url: referralLink,
                });
            } catch (err) {
                // User cancelled sharing
            }
        } else {
            // Fallback to WhatsApp
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
            window.open(whatsappUrl, "_blank");
        }
    };

    if (codeLoading || statsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Hero Card */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold mb-1">Refer & Earn</h2>
                        <p className="text-purple-100 text-sm">
                            Invite friends & earn ₹{referrerReward} each!
                        </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Gift size={24} />
                    </div>
                </div>

                {/* Referral Code Box */}
                <div className="bg-white/20 backdrop-blur rounded-xl p-4 mb-4">
                    <p className="text-xs text-purple-100 mb-1">Your Referral Code</p>
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-wider">{referralCode}</span>
                        <button
                            onClick={handleCopy}
                            className={`btn btn-sm ${copied ? "btn-success" : "btn-ghost"} text-white`}
                        >
                            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                            {copied ? "Copied" : "Copy"}
                        </button>
                    </div>
                </div>

                {/* Share Button */}
                <button
                    onClick={handleShare}
                    className="btn btn-white bg-white text-purple-600 w-full gap-2 hover:bg-gray-100"
                >
                    <Share2 size={18} />
                    Share with Friends
                </button>
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-3">How It Works</h3>
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-600 text-sm font-bold">1</span>
                        </div>
                        <div>
                            <p className="font-medium text-sm">Share your code</p>
                            <p className="text-xs text-gray-500">Send your unique referral code to friends</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-600 text-sm font-bold">2</span>
                        </div>
                        <div>
                            <p className="font-medium text-sm">Friend signs up</p>
                            <p className="text-xs text-gray-500">They use your code during registration</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-600 text-sm font-bold">3</span>
                        </div>
                        <div>
                            <p className="font-medium text-sm">Both earn rewards!</p>
                            <p className="text-xs text-gray-500">You get ₹{referrerReward} and they get ₹{refereeReward}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet size={18} className="text-green-500" />
                        <span className="text-xs text-gray-500">Total Earned</span>
                    </div>
                    <p className="text-xl font-bold text-gray-800">₹{stats.totalEarnings}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={18} className="text-purple-500" />
                        <span className="text-xs text-gray-500">Referrals</span>
                    </div>
                    <p className="text-xl font-bold text-gray-800">{stats.totalReferrals}</p>
                </div>
            </div>

            {/* Referral History */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Your Referrals</h3>
                    <span className="text-xs text-gray-400">{stats.referrals.length} total</span>
                </div>

                {stats.referrals.length === 0 ? (
                    <div className="text-center py-8">
                        <Users size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 text-sm">No referrals yet</p>
                        <p className="text-gray-400 text-xs">Share your code to start earning!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {stats.referrals.map((referral) => (
                            <div
                                key={referral.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <span className="text-purple-600 font-bold text-sm">
                                            {referral.refereeName?.charAt(0) || "?"}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{referral.refereeName}</p>
                                        <p className="text-xs text-gray-400">{referral.refereeMobile}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {referral.status === "completed" ? (
                                        <span className="badge badge-success badge-sm gap-1">
                                            <CheckCircle size={10} /> +₹{referral.reward}
                                        </span>
                                    ) : (
                                        <span className="badge badge-warning badge-sm gap-1">
                                            <Clock size={10} /> Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
