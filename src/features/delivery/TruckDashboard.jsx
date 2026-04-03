import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Truck, 
    Navigation, 
    ClipboardCheck, 
    CheckCircle2, 
    Zap, 
    MapPin, 
    Activity,
    LogOut,
    ArrowRight,
    Loader2,
    Users
} from 'lucide-react';
import { 
    getTruckTrips, 
    startTruckTrip, 
    confirmPickup, 
    endTruckTrip, 
    getTripManifest 
} from '../../shared/api/logistics';
import { 
    startTracking, 
    updateLocation, 
    stopTracking 
} from '../../shared/api/tracking';
import { useCurrentAdmin } from '../../shared/hooks/useCurrentAdmin';

const TruckDashboard = () => {
    const { data: currentAdmin } = useCurrentAdmin();
    const adminUser = currentAdmin?.user;
    const queryClient = useQueryClient();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [startKmInput, setStartKmInput] = useState('');
    const [stopKmInput, setStopKmInput] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 1. Fetch Today's Trip
    const { data: tripsData, isLoading: isLoadingTrip } = useQuery({
        queryKey: ['my-trip', adminUser?._id],
        queryFn: () => getTruckTrips({ driverId: adminUser?._id, date: new Date().toISOString().split('T')[0] }),
        enabled: !!adminUser?._id
    });

    const activeTrip = tripsData?.result?.[0];

    // 2. GPS & Telemetry Loop
    useEffect(() => {
        let locationInterval = null;

        const trackLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    updateLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        speed: pos.coords.speed || 0,
                        heading: pos.coords.heading || 0,
                        battery: null
                    }).catch(err => console.error("GPS Update Failed:", err));
                });
            }
        };

        if (activeTrip?.status === 'IN_TRANSIT') {
            startTracking().catch(err => console.error("Start Tracking Failed:", err));
            trackLocation(); // Initial ping
            locationInterval = setInterval(trackLocation, 30000); // Every 30 seconds
        } else {
            if (locationInterval) clearInterval(locationInterval);
            stopTracking().catch(() => {}); // silently ignore if not tracking
        }

        return () => {
            if (locationInterval) clearInterval(locationInterval);
        };
    }, [activeTrip?.status]);

    // 3. Fetch Manifest for this driver's assigned hubs
    const { data: manifestData } = useQuery({
        queryKey: ['trip-manifest', adminUser?._id],
        queryFn: () => getTripManifest({ driverId: adminUser?._id, date: new Date().toISOString().split('T')[0] }),
        enabled: !!adminUser?._id && (activeTrip?.status === 'LOADING' || activeTrip?.status === 'IN_TRANSIT')
    });

    // Mutations
    const startMutation = useMutation({
        mutationFn: (km) => startTruckTrip(activeTrip._id, Number(km)),
        onSuccess: () => queryClient.invalidateQueries(['my-trip'])
    });

    const confirmMutation = useMutation({
        mutationFn: (manifest) => confirmPickup(activeTrip._id, manifest),
        onSuccess: () => queryClient.invalidateQueries(['my-trip'])
    });

    const endMutation = useMutation({
        mutationFn: (km) => endTruckTrip(activeTrip._id, Number(km)),
        onSuccess: () => queryClient.invalidateQueries(['my-trip'])
    });

    if (isLoadingTrip) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><Loader2 className="animate-spin text-primary" size={48} /></div>;

    if (!activeTrip) return (
        <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col items-center justify-center text-center">
            <Truck size={80} className="text-gray-800 mb-6" />
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">No Trip Assigned</h1>
            <p className="text-gray-500 max-w-xs font-bold text-xs uppercase tracking-widest leading-loose">
                Contact factory dispatch to assign a vehicle and route for today.
            </p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-primary selection:text-black">
            {/* Top Bar */}
            <header className="p-6 flex justify-between items-center bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-black shadow-lg shadow-primary/20">
                        <Truck size={20} />
                    </div>
                    <div>
                        <h1 className="font-black text-sm uppercase tracking-tighter">Fleet Ops</h1>
                        <p className="text-[10px] font-bold text-primary uppercase">{activeTrip.tripId}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-black">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">{currentTime.toLocaleDateString()}</p>
                </div>
            </header>

            <main className="p-6 space-y-6 max-w-lg mx-auto pb-32">
                {/* Vehicle Card */}
                <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[2.5rem] shadow-2xl shadow-indigo-900/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                        <Navigation size={120} />
                    </div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Active Unit</span>
                        <h2 className="text-4xl font-black tracking-tighter mt-1">{activeTrip.vehicle?.plateNumber}</h2>
                        <div className="mt-6 flex gap-8">
                            <div>
                                <p className="text-[10px] font-black uppercase opacity-60 mb-1">Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                    <span className="text-xs font-black uppercase tracking-widest">{activeTrip.status}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase opacity-60 mb-1">Model</p>
                                <span className="text-xs font-black uppercase tracking-widest">{activeTrip.vehicle?.model}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* TRIP FLOW */}
                
                {/* STEP 1: START TRIP */}
                {activeTrip.status === 'PENDING' && (
                    <div className="bg-gray-900 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                        <div className="flex items-center gap-4 text-primary">
                            <Zap size={32} />
                            <h3 className="text-xl font-black uppercase tracking-tight">Begin Journey</h3>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase leading-loose">
                            Enter the current odometer reading from the dashboard to start GPS tracking.
                        </p>
                        <input 
                            type="number" 
                            placeholder="Current KM" 
                            className="w-full bg-black border border-white/10 rounded-2xl p-5 text-2xl font-black focus:border-primary transition-all outline-none"
                            value={startKmInput}
                            onChange={(e) => setStartKmInput(e.target.value)}
                        />
                        <button 
                            className="btn btn-primary w-full h-16 rounded-2xl font-black text-lg uppercase group shadow-xl shadow-primary/10"
                            onClick={() => startMutation.mutate(startKmInput)}
                            disabled={!startKmInput || startMutation.isLoading}
                        >
                            {startMutation.isLoading ? 'Processing...' : 'Start Trip'} <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}

                {/* STEP 2: LOADING / PICKUP MANIFEST */}
                {(activeTrip.status === 'LOADING' || activeTrip.status === 'IN_TRANSIT') && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end px-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Pickup Manifest</h3>
                            {activeTrip.status === 'LOADING' && (
                                <button 
                                    className="text-[10px] font-black text-primary uppercase border-b border-primary pb-0.5"
                                    onClick={() => confirmMutation.mutate([])} // Simple auto-confirm for demo
                                >
                                    Confirm All
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {manifestData?.result?.products && Object.entries(manifestData.result.products).map(([id, p]) => (
                                <div key={id} className="bg-gray-900/50 p-5 rounded-3xl border border-white/5 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                                            <CheckCircle2 className={activeTrip.isConfirmed ? "text-green-500" : "text-gray-700"} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white">{p.name}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">{p.unitsPerCrate} units per crate</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-primary">{p.units}</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">{p.unit}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {activeTrip.status === 'LOADING' && (
                            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex gap-3 text-primary">
                                <Activity size={18} />
                                <p className="text-[10px] font-bold uppercase leading-relaxed">
                                    Verify physical stock against this list before departing from factory.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: END TRIP */}
                {(activeTrip.status === 'IN_TRANSIT' || activeTrip.isConfirmed) && (
                    <div className="bg-gray-900 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                         <div className="flex items-center gap-4 text-red-500">
                            <LogOut size={32} />
                            <h3 className="text-xl font-black uppercase tracking-tight">End Journey</h3>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase leading-loose">
                            Enter the final odometer reading to complete the log and calculate distance.
                        </p>
                        <input 
                            type="number" 
                            placeholder="Final KM" 
                            className="w-full bg-black border border-white/10 rounded-2xl p-5 text-2xl font-black focus:border-red-500 transition-all outline-none text-red-500"
                            value={stopKmInput}
                            onChange={(e) => setStopKmInput(e.target.value)}
                        />
                        <button 
                            className="btn btn-error w-full h-16 rounded-2xl font-black text-lg uppercase bg-red-600 hover:bg-red-700 border-none shadow-xl shadow-red-900/20"
                            onClick={() => endMutation.mutate(stopKmInput)}
                            disabled={!stopKmInput || endMutation.isLoading}
                        >
                            {endMutation.isLoading ? 'Saving...' : 'Complete Trip'}
                        </button>
                    </div>
                )}
            </main>

            {/* Bottom Nav Simulation */}
            <nav className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/80 backdrop-blur-2xl border-t border-white/5 z-50">
                <div className="max-w-lg mx-auto flex justify-around">
                    <button className="flex flex-col items-center gap-1 text-primary">
                        <Truck size={20} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Trip</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-gray-600">
                        <MapPin size={20} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Routes</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-gray-600">
                        <ClipboardCheck size={20} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Manifest</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default TruckDashboard;
