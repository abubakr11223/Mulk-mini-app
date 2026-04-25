export default function PropertyCard({ data }) {
    return (
        <div className="bg-card rounded-3xl overflow-hidden shadow-xl border border-slate-800">
            {/* Image Container */}
            <div className="relative">
                <img
                    src={data.image}
                    alt={data.title}
                    className="w-full h-56 object-cover"
                />
                <span className="absolute top-3 left-3 bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded-md">
                    {data.tag}
                </span>
            </div>

            {/* Details */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-1">
                            📍 {data.title}
                        </h3>
                        <p className="text-gray-400 text-xs mt-1">
                            {data.rooms} xona • {data.area} m² • {data.floor} qavat
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-white">${data.price}</p>
                    </div>
                </div>

                <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 py-2 rounded-xl text-sm font-semibold transition-all">
                    Batafsil
                </button>
            </div>
        </div>
    );
}
