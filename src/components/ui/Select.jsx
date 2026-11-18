import React from 'react';
import { inputBase, inputErr, inputOk } from '../../constants/ui';

/**
 * Select estilizado.
 *  - variant 'filter': compacto (barras de filtro)
 *  - variant 'field':  altura de campo de formulário
 */
export default function Select({ id, value, onChange, options, label, variant = 'filter', className = '', disabled, invalid }) {
  const style =
    variant === 'field'
      ? `${inputBase} ${invalid ? inputErr : inputOk} appearance-none pr-9`
      : 'h-10 w-full appearance-none rounded-lg border border-white/15 bg-brand-900 pl-3 pr-9 text-sm text-slate-100 transition-colors duration-200 hover:border-white/25 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

  return (
    <div className={`relative ${className}`}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        disabled={disabled}
        className={style}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-brand-800">
            {o.label}
          </option>
        ))}
      </select>
      <i className="fas fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500"></i>
    </div>
  );
}
