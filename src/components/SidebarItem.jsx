export const SidebarItem = ({ icon, label }) => {
  return (
    <div className="flex flex-col items-center space-y-1 hover:text-blue-600 transition">
      <img src={icon} alt={label} className="w-10 h-10" />
      <h5 className="text-sm font-medium">{label}</h5>
    </div>
  );
};
