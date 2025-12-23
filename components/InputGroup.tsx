
import React from 'react';

interface InputGroupProps {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  placeholder?: string;
  isTextArea?: boolean;
}

export const InputGroup: React.FC<InputGroupProps> = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder,
  isTextArea = false 
}) => {
  // Ajustado padding de px-5 para px-4 para melhor legibilidade em campos pequenos
  const classes = "w-full px-4 py-4 md:py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all active:bg-white/10";
  
  return (
    <div className="flex flex-col gap-2 md:gap-2.5">
      <label className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      {isTextArea ? (
        <textarea 
          rows={3}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={classes}
        />
      ) : (
        <input 
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={classes}
        />
      )}
    </div>
  );
};
