export const MilkLoader = () => {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-2xl font-bold mb-4 text-blue-600">APP IS LOADING...</div>
      <div className="w-32 h-64 relative">
        {/* Bottle SVG with animated white milk fill */}
        <svg
          viewBox="0 0 100 250"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Black bottle background */}
          <path
            d="M30 10 C30 5, 70 5, 70 10 L70 40 C70 50, 80 60, 80 90 L80 220 C80 230, 20 230, 20 220 L20 90 C20 60, 30 50, 30 40 Z"
            fill="green"
            stroke="#16a34a" /* light green border */
            strokeWidth="4"
          />

          {/* Milk Fill */}
          <clipPath id="bottle-clip">
            <path d="M30 10 C30 5, 70 5, 70 10 L70 40 C70 50, 80 60, 80 90 L80 220 C80 230, 20 230, 20 220 L20 90 C20 60, 30 50, 30 40 Z" />
          </clipPath>

          <rect
            x="20"
            y="220"
            width="60"
            height="0"
            fill="white"
            clipPath="url(#bottle-clip)"
            className="animate-fill-milk"
          />
        </svg>

        <style>{`
          @keyframes fillUp {
            0% {
              height: 0;
              y: 220;
            }
            100% {
              height: 210px;
              y: 100;
            }
          }
          .animate-fill-milk {
            animation: fillUp 2s ease-in-out infinite alternate;
          }
        `}</style>
      </div>
    </div>
  );
};

export default MilkLoader;
