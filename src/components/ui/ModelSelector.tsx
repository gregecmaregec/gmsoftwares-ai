import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Brain, Globe } from 'lucide-react';
import { ALL_MODEL_OPTIONS, TOP_TIER_MODEL_IDS } from '../../config/models';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDropdownDirection } from '../../hooks/useDropdownDirection';

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
  isWebSearchEnabled: boolean;
  onWebSearchToggle: () => void;
}

// Utility function to detect mobile devices
const isMobileDevice = (): boolean => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
  );
};

export const ModelSelector = memo(({ 
  selectedModel, 
  onModelSelect, 
  isWebSearchEnabled, 
  onWebSearchToggle 
}: ModelSelectorProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [modelSearchTerm, setModelSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Use the reusable dropdown direction hook
  const shouldOpenUpwards = useDropdownDirection(dropdownRef, {
    isOpen: isDropdownOpen,
    dropdownHeight: 320,
    offset: 50
  });

  // Debounce model search - immediate on desktop, very short delay on mobile
  const debouncedSearchTerm = useDebouncedValue(modelSearchTerm, 100);

  // Memoized filtered model options to prevent recalculation on every render
  const filteredModelOptions = useMemo(() => 
    ALL_MODEL_OPTIONS.filter(model =>
      model.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (model.provider && model.provider.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    ), [debouncedSearchTerm]
  );

  // Auto-focus search input when dropdown opens - only on desktop devices
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current && !isMobileDevice()) {
      // Try immediate focus first
      searchInputRef.current.focus();
      
      // Fallback with small delay to ensure focus works reliably
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isDropdownOpen]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setModelSearchTerm('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectModelOption = useCallback((modelId: string) => {
    onModelSelect(modelId);
    setIsDropdownOpen(false);
    setModelSearchTerm('');
  }, [onModelSelect]);

  const toggleWebSearch = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onWebSearchToggle();
  }, [onWebSearchToggle]);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen(!isDropdownOpen);
  }, [isDropdownOpen]);

  return (
    <div className="model-selector-container" ref={dropdownRef}>
      <div 
        className={`model-selector-header ${isDropdownOpen ? 'active' : ''}`}
        onClick={toggleDropdown}
      >
        {selectedModel !== 'auto' && (
          <div 
            className={`web-search-toggle ${isWebSearchEnabled ? 'active' : ''}`}
            onClick={toggleWebSearch}
            title={isWebSearchEnabled ? 'Disable web search' : 'Enable web search'}
          >
            <Globe size={12} />
            <span>Web Search</span>
          </div>
        )}
        <span className="selected-model">
          {selectedModel === 'auto' && <Brain size={14} className="brain-icon" />}
          {selectedModel === 'auto' ? 'auto' : 'manual'}
        </span>
      </div>
      
      {isDropdownOpen && (
        <>
          {/* Standalone search pill - completely separate from dropdown */}
          <div className="model-search-pill">
            <input
              type="text"
              placeholder="Search"
              className="model-search-input"
              value={modelSearchTerm}
              onChange={(e) => setModelSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              ref={searchInputRef}
            />
          </div>
          
          {/* Separate dropdown container - only contains model options */}
          <div className={`model-dropdown open ${shouldOpenUpwards ? 'opens-up' : ''}`}>
            <div className="model-options-list">
              {filteredModelOptions.map((model, index) => {
                const isLastTopTierBeforeRest =
                  TOP_TIER_MODEL_IDS.has(model.id) &&
                  (() => {
                    const originalIndex = ALL_MODEL_OPTIONS.findIndex(m => m.id === model.id);
                    // Ensure model is found and not the last in the original list
                    if (originalIndex === -1 || originalIndex === ALL_MODEL_OPTIONS.length - 1) {
                      return false;
                    }
                    const nextOriginalModel = ALL_MODEL_OPTIONS[originalIndex + 1];
                    return !TOP_TIER_MODEL_IDS.has(nextOriginalModel.id);
                  })();

                // Check if there's any non-top-tier model *after* this one in the *filtered* list
                const subsequentFilteredNonTopTierExists =
                  filteredModelOptions.slice(index + 1).some(nextFilteredModel => !TOP_TIER_MODEL_IDS.has(nextFilteredModel.id));

                const showDivider = isLastTopTierBeforeRest && subsequentFilteredNonTopTierExists;

                return (
                  <React.Fragment key={model.id}>
                    <div
                      className={`model-option ${selectedModel === model.id ? 'selected' : ''} ${model.id === 'auto' ? 'auto-model' : ''}`}
                      onClick={() => selectModelOption(model.id)}
                    >
                      <div className="model-option-name">{model.name}</div>
                      {model.provider && <div className="model-option-provider">{model.provider}</div>}
                    </div>
                    {showDivider && <div className="model-divider" />}
                  </React.Fragment>
                );
              })}
              {filteredModelOptions.length === 0 && (
                <div className="model-option-empty">No AI found.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

ModelSelector.displayName = 'ModelSelector'; 