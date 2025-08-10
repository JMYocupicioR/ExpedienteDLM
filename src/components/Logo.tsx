import React from 'react';
import { Stethoscope } from 'lucide-react';

const Logo = () => {
  return (
    <div className="flex items-center">
      <Stethoscope className="h-7 w-7 sm:h-8 sm:w-8 text-cyan-400" />
      <span className="ml-2 text-lg sm:text-xl font-bold text-white">Expediente DLM</span>
    </div>
  );
};

export default Logo;
