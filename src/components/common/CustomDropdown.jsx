import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export default function CustomDropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  searchable = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || { label: value || placeholder };

  const filteredOptions = (searchable && options.length > 6 && searchFilter.trim())
    ? options.filter(opt => opt.label.toLowerCase().includes(searchFilter.toLowerCase()))
    : options;

  return (
    <div className={`relative inline-block w-full text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchFilter('');
        }}
        className={`w-full px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all cursor-pointer ${buttonClassName}`}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 right-0 mt-1.5 min-w-[200px] bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 p-1.5 animate-fadeIn ${menuClassName}`}>
          {/* Optional Search filter if many options */}
          {searchable && options.length > 6 && (
            <div className="p-1 mb-1 border-b border-slate-100 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-medium"
                autoFocus
              />
            </div>
          )}

          {/* Scrollable list bounded by max-h-60 */}
          <div className="max-h-60 overflow-y-auto scrollbar-thin space-y-0.5 pr-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchFilter('');
                    }}
                    className={`w-full text-left px-3.5 py-2 rounded-xl text-xs flex justify-between items-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 text-blue-700 font-extrabold'
                        : 'text-slate-700 font-medium hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400 font-medium">
                No matching options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
