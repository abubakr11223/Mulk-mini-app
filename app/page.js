'use client';
import { useEffect, useState } from 'react';

export default function Home() {
    const [tg, setTg] = useState(null);

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            const webapp = window.Telegram.WebApp;
            webapp.ready();
            webapp.expand(); // Appni to'liq ekranga ochadi
            setTg(webapp);
        }
    }, []);

    // "Suyak" ma'lumotlar - buni keyinchalik API-dan oladigan qilasiz
    const properties = [
        {
            id: 1,
            title: "Yunusobod",
            price: "130,000",
            rooms: 4,
            area: 107,
            floor: "1/9",
            image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            tag: "TOP"
        },
        {
            id: 2,
            title: "Chilonzor",
            price: "85,000",
            rooms: 3,
            area: 72,
            floor: "4/5",
            image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            tag: "YANGI"
        }
    ];

    return (
        <main className="min-h-screen bg-[#0f172a] text-white pb-24">
            {/* Header Section */}
            <div className="p-4 flex flex-col gap-4 sticky top-0 bg-[#0f172a]/80 backdrop-blur-md z-10">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-black tracking-tighter text-blue-500">MULK INVEST</h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Ko'chmas mulk</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="bg-[#1e293b] p-2.5 rounded-xl text-xs font-bold border border-slate-700">UZ</button>
                        <button className="bg-[#1e293b] p-2.5 rounded-xl border border-slate-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </button>
                    </div>
                </div>

                {/* Categories Bar */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    <button className="bg-blue-600 px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 whitespace-nowrap">Sotuvda</button>
                    <button className="bg-[#1e293b] px-6 py-2 rounded-xl text-sm font-bold text-gray-400 border border-slate-700 whitespace-nowrap">Ijarada</button>
                    <button className="bg-[#1e293b] px-6 py-2 rounded-xl text-sm font-bold text-gray-400 border border-slate-700 whitespace-nowrap">Filtrlar</button>
                </div>

                {/* Search Input */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Nom yoki manzil bo'yicha qidirish..."
                        className="w-full bg-[#1e293b] border border-slate-700 rounded-2xl py-3.5 px-5 text-sm focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-500"
                    />
                </div>
            </div>

            {/* Property Cards List */}
            <div className="px-4 flex flex-col gap-5 mt-2">
                {properties.map((item) => (
                    <div key={item.id} className="bg-[#1e293b] rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl">
                        {/* Image */}
                        <div className="relative h-60">
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute top-4 left-4 bg-yellow-400 text-black text-[10px] font-black px-2.5 py-1 rounded-lg uppercase">
                                {item.tag}
                            </div>
                            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl">
                                <span className="text-xl font-black text-white">${item.price}</span>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-5">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <span className="text-blue-500 text-xl">📍</span> {item.title}
                                </h3>
                            </div>

                            <div className="flex items-center gap-4 text-gray-400 text-sm mb-5 bg-[#0f172a]/50 p-3 rounded-2xl">
                                <div className="flex items-center gap-1"><span>🛏️</span> {item.rooms} xona</div>
                                <div className="border-l border-slate-700 h-4"></div>
                                <div className="flex items-center gap-1"><span>📐</span> {item.area} m²</div>
                                <div className="border-l border-slate-700 h-4"></div>
                                <div className="flex items-center gap-1"><span>🏢</span> {item.floor} qavat</div>
                            </div>

                            <button className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm active:scale-95 transition-transform">
                                KO'RISH
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/90 backdrop-blur-xl border-t border-slate-800 px-8 py-4 flex justify-between items-center z-20">
                <button className="text-blue-500 flex flex-col items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mb-1"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" /></svg>
                </button>
                <button className="text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                </button>
                <button className="text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </button>
            </div>
        </main>
    );
}