import React from 'react';
import { Stethoscope } from 'lucide-react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "h-7 w-7 sm:h-8 sm:w-8" }) => {
  return (
    <div className="flex items-center">
      <Stethoscope className={`${className} text-cyan-400`} />
      <span className="ml-2 text-lg sm:text-xl font-bold text-white">Expediente DLM</span>
    </div>
  );
};

export default Logo;
