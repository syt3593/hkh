
import React from 'react';

interface NutrientBadgeProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  icon: React.ReactNode;
}

const NutrientBadge: React.FC<NutrientBadgeProps> = ({ label, value, unit, color, icon }) => {
  return (
    <div className={`flex flex-col items-center p-3 rounded-2xl bg-white shadow-sm border border-gray-100`}>
      <div className={`p-2 rounded-full mb-2 ${color} text-white`}>
        {icon}
      </div>
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-xl font-bold text-gray-800">{value.toFixed(1)}</span>
        <span className="text-xs text-gray-400 font-medium">{unit}</span>
      </div>
    </div>
  );
};

export default NutrientBadge;
