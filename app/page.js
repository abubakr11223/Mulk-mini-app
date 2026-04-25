'use client';
import { useEffect, useState } from 'react';

export default function Home() {
    // Bu sizning "SUYAK" qismingiz - ma'lumotlar
    const [properties, setProperties] = useState([
        {
            id: 1,
            title: "Yunusobod, 4-kvartal",
            price: "130,000",
            rooms: 4,
            area: 107,
            floor: "1/9",
            image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
            tag: "TOP"
        },
        {
            id: 2,
            title: "Chilonzor, 9-kvartal",
            price: "85,000",
            rooms: 3,
            area: 72,
            floor: "4/5",
            image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
            tag: "YANGI"
        },
        {
            id: 3,
            title: "Mirzo Ulug'bek, TTZ",
            price: "115,000",
            rooms: 3,
            area: 90,
            floor: "2/4",
            image: "https://images.unsplash.com/photo-1600607687940-4e524cb35a36?auto=format&fit=crop&w=800&q=80",
            tag: "TAVSIYA"
        }
    ]);

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
        }
    }, []);

    return (
        <main className="min-h-screen bg-[#0f172a] text-white pb-24 font-sans">
            {/* HEADER - TERI QISMI */}
            <header className="p-4 sticky top-0 bg-[#0f172a]/90 backdrop-blur-md z-50">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-black text-blue-500 tracking-tighter">MULK INVEST</h1>
                    <div className="bg-[#1e293b] px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold">UZ</div>
                </div>

                {/* Qidiruv */}
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Qidirish..."
                        className="w-full bg-[#1e293b] border border-slate-800 rounded-2xl py-3 px-5 text-sm outline-none focus:border-blue-500"
                    />
                </div>

                {/* Filtr tugmalari */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button className="bg-blue-600 px-6 py-2 rounded-xl text-xs font-bold whitespace-nowrap">Sotuvda</button>
                    <button className="bg-[#1e293b] px-6 py-2 rounded-xl text-xs font-bold text-gray-400 border border-slate-800 whitespace-nowrap">Ijarada</button>
                    <button className="bg-[#1e293b] px-6 py-2 rounded-xl text-xs font-bold text-gray-400 border border-slate-800 whitespace-nowrap">Filtrlar</button>
                </div>
            </header>

            {/* RO'YXAT - SUYAK VA TERI BIRLASHGAN JOYI */}
            <div className="px-4 flex flex-col gap-6">
                {properties.map((item) => (
                    <div key={item.id} className="bg-[#1e293b] rounded-[30px] overflow-hidden border border-slate-800 shadow-2xl active:scale-[0.98] transition-transform">
                        <div className="relative h-56">
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute top-4 left-4 bg-yellow-400 text-black text-[10px] font-black px-2 py-1 rounded-lg">
                                {item.tag}
                            </div>
                            <div className="absolute bottom-4 right-4 bg-[#0f172a]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700">
                                <span className="text-lg font-black">${item.price}</span>
                            </div>
                        </div>

                        <div className="p-5">
                            <h3 className="text-lg font-bold mb-3 tracking-tight">📍 {item.title}</h3>
                            <div className="flex justify-between items-center text-gray-400 text-xs bg-[#0f172a]/50 p-3 rounded-2xl border border-slate-800/50">
                                <span>🛏️ {item.rooms} xona</span>
                                <span className="w-[1px] h-3 bg-slate-700"></span>
                                <span>📐 {item.area} m²</span>
                                <span className="w-[1px] h-3 bg-slate-700"></span>
                                <span>🏢 {item.floor} qavat</span>
                            </div>
                            <button className="w-full mt-4 bg-white text-black py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider">
                                Ko'rish
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* NAVIGATION */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-800 p-5 flex justify-around items-center z-50">
                <div className="text-blue-500">🏠</div>
                <div className="text-gray-500 opacity-50">🏢</div>
                <div className="text-gray-500 opacity-50">👤</div>
            </nav>
        </main>
    );
}