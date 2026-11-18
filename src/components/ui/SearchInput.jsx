import React from 'react';

/** Campo de busca com ícone. */
export default function SearchInput({ value, onChange, placeholder, label = 'Buscar', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <i className="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500"></i>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-full rounded-lg border border-white/15 bg-brand-900 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 transition-colors duration-200 hover:border-white/25 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}
