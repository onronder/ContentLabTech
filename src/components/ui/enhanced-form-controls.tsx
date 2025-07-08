/**
 * Enhanced Form Controls
 * Production-grade form inputs with micro-interactions and smart behaviors
 */

"use client";

import React, { useState, useRef, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Eye,
  EyeOff,
  Search,
  X,
  Plus,
  Check,
  ChevronsUpDown,
  Upload,
  Image as ImageIcon,
  File,
  Loader2,
  Copy,
  ExternalLink,
  Zap
} from "lucide-react";

interface EnhancedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'filled';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  clearable?: boolean;
  copyable?: boolean;
  loading?: boolean;
  onClear?: () => void;
  onCopy?: () => void;
  error?: boolean;
  success?: boolean;
  animated?: boolean;
}

interface EnhancedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
  showCounter?: boolean;
  error?: boolean;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

interface PasswordInputProps extends Omit<EnhancedInputProps, 'type'> {
  strengthIndicator?: boolean;
  requirements?: string[];
  onStrengthChange?: (strength: number) => void;
}

interface SearchInputProps extends Omit<EnhancedInputProps, 'type'> {
  suggestions?: string[];
  onSearch?: (query: string) => void;
  onSuggestionSelect?: (suggestion: string) => void;
  loading?: boolean;
  clearOnSelect?: boolean;
}

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  allowDuplicates?: boolean;
  suggestions?: string[];
  className?: string;
  tagClassName?: string;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
}

interface ComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: Array<{ label: string; value: string; description?: string; icon?: React.ReactNode; }>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
  clearable?: boolean;
  creatable?: boolean;
  onCreateOption?: (value: string) => void;
}

interface FileUploadProps {
  onFileSelect: (files: FileList | null) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'dropzone' | 'button';
  preview?: boolean;
  error?: boolean;
  success?: boolean;
}

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  readOnly?: boolean;
  allowHalf?: boolean;
  className?: string;
}

interface SliderInputProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  formatLabel?: (value: number) => string;
  showTooltip?: boolean;
  className?: string;
  disabled?: boolean;
}

const sizeClasses = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm", 
  lg: "h-12 px-5 text-base"
};

const variantClasses = {
  default: "border border-input bg-background",
  ghost: "border-transparent bg-transparent hover:bg-muted/50",
  filled: "border-transparent bg-muted"
};

/**
 * Enhanced Input Component
 */
export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    className, 
    size = 'md',
    variant = 'default',
    leftIcon,
    rightIcon,
    leftAddon,
    rightAddon,
    clearable = false,
    copyable = false,
    loading = false,
    onClear,
    onCopy,
    error = false,
    success = false,
    animated = true,
    value,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [copied, setCopied] = useState(false);
    const [announceMessage, setAnnounceMessage] = useState('');

    const handleCopy = async () => {
      if (copyable && value && onCopy) {
        await navigator.clipboard.writeText(String(value));
        setCopied(true);
        setAnnounceMessage('Content copied to clipboard');
        onCopy();
        setTimeout(() => {
          setCopied(false);
          setAnnounceMessage('');
        }, 2000);
      }
    };

    const handleClear = () => {
      if (clearable && onClear) {
        setAnnounceMessage('Input cleared');
        onClear();
        setTimeout(() => setAnnounceMessage(''), 1000);
      }
    };

    return (
      <div className="relative">
        {leftAddon && (
          <div className="absolute left-0 top-0 h-full flex items-center px-3 border-r bg-muted/50 rounded-l-md">
            {leftAddon}
          </div>
        )}
        
        <div className={cn(
          "relative flex items-center",
          animated && "transition-all duration-200",
          isFocused && "ring-2 ring-ring ring-offset-2",
          error && "ring-2 ring-destructive ring-offset-2",
          success && "ring-2 ring-green-500 ring-offset-2"
        )}>
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <Input
            ref={ref}
            className={cn(
              sizeClasses[size],
              variantClasses[variant],
              leftIcon && "pl-10",
              leftAddon && "pl-16",
              (rightIcon || clearable || copyable || loading) && "pr-10",
              rightAddon && "pr-16",
              "transition-all duration-200",
              error && "border-destructive focus-visible:ring-destructive",
              success && "border-green-500 focus-visible:ring-green-500",
              className
            )}
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${props.id || 'input'}-error` : undefined}
            {...props}
          />
          
          <div className="absolute right-3 flex items-center space-x-1">
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            
            {clearable && value && !loading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={handleClear}
                aria-label="Clear input"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            
            {copyable && value && !loading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy to clipboard"}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
            
            {rightIcon && !loading && (
              <div className="text-muted-foreground">
                {rightIcon}
              </div>
            )}
          </div>
        </div>
        
        {rightAddon && (
          <div className="absolute right-0 top-0 h-full flex items-center px-3 border-l bg-muted/50 rounded-r-md">
            {rightAddon}
          </div>
        )}
        
        {/* Screen Reader Announcements */}
        {announceMessage && (
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {announceMessage}
          </div>
        )}
      </div>
    );
  }
);
EnhancedInput.displayName = "EnhancedInput";

/**
 * Enhanced Textarea Component
 */
export const EnhancedTextarea = forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(
  ({ 
    className,
    autoResize = false,
    minRows = 3,
    maxRows = 10,
    showCounter = false,
    error = false,
    success = false,
    leftIcon,
    rightIcon,
    value,
    maxLength,
    ...props 
  }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const lineHeight = 24; // approximate line height
        const minHeight = minRows * lineHeight;
        const maxHeight = maxRows * lineHeight;
        textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
      }
    }, [value, autoResize, minRows, maxRows]);

    return (
      <div className="relative">
        <div className={cn(
          "relative",
          isFocused && "ring-2 ring-ring ring-offset-2",
          error && "ring-2 ring-destructive ring-offset-2",
          success && "ring-2 ring-green-500 ring-offset-2",
          "transition-all duration-200 rounded-md"
        )}>
          {leftIcon && (
            <div className="absolute left-3 top-3 flex items-center pointer-events-none text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <Textarea
            ref={textareaRef}
            className={cn(
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              "transition-all duration-200 resize-none",
              error && "border-destructive focus-visible:ring-destructive",
              success && "border-green-500 focus-visible:ring-green-500",
              className
            )}
            style={{ minHeight: `${minRows * 24}px` }}
            value={value}
            maxLength={maxLength}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${props.id || 'textarea'}-error` : undefined}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-3 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        
        {showCounter && maxLength && (
          <div className="flex justify-end mt-1">
            <span className={cn(
              "text-xs tabular-nums",
              String(value).length > maxLength * 0.8 && "text-amber-600",
              String(value).length > maxLength && "text-destructive"
            )}>
              {String(value).length}/{maxLength}
            </span>
          </div>
        )}
      </div>
    );
  }
);
EnhancedTextarea.displayName = "EnhancedTextarea";

/**
 * Password Input Component
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ 
    strengthIndicator = false,
    requirements = [],
    onStrengthChange,
    className,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [strength, setStrength] = useState(0);

    const calculateStrength = (password: string) => {
      let score = 0;
      if (password.length >= 8) score += 25;
      if (/[a-z]/.test(password)) score += 25;
      if (/[A-Z]/.test(password)) score += 25;
      if (/[0-9]/.test(password)) score += 25;
      return score;
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const password = e.target.value;
      if (strengthIndicator) {
        const newStrength = calculateStrength(password);
        setStrength(newStrength);
        onStrengthChange?.(newStrength);
      }
      props.onChange?.(e);
    };

    const getStrengthColor = () => {
      if (strength < 25) return "bg-red-500";
      if (strength < 50) return "bg-orange-500";
      if (strength < 75) return "bg-yellow-500";
      return "bg-green-500";
    };

    const getStrengthLabel = () => {
      if (strength < 25) return "Weak";
      if (strength < 50) return "Fair";
      if (strength < 75) return "Good";
      return "Strong";
    };

    return (
      <div className="space-y-2">
        <EnhancedInput
          ref={ref}
          type={showPassword ? "text" : "password"}
          rightIcon={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          }
          className={className}
          onChange={handlePasswordChange}
          {...props}
        />
        
        {strengthIndicator && String(props.value).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Password strength:</span>
              <span className={cn(
                "text-sm font-medium",
                strength < 25 && "text-red-600",
                strength >= 25 && strength < 50 && "text-orange-600",
                strength >= 50 && strength < 75 && "text-yellow-600",
                strength >= 75 && "text-green-600"
              )}>
                {getStrengthLabel()}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  getStrengthColor()
                )}
                style={{ width: `${strength}%` }}
              />
            </div>
          </div>
        )}
        
        {requirements.length > 0 && String(props.value).length > 0 && (
          <div className="space-y-1">
            {requirements.map((requirement, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <div className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center",
                  "bg-muted text-muted-foreground"
                )}>
                  <Check className="w-3 h-3" />
                </div>
                <span className="text-muted-foreground">{requirement}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

/**
 * Search Input Component
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ 
    suggestions = [],
    onSearch,
    onSuggestionSelect,
    loading = false,
    clearOnSelect = true,
    className,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      setIsOpen(value.length > 0 && suggestions.length > 0);
      props.onChange?.(e);
    };

    const handleSuggestionSelect = (suggestion: string) => {
      onSuggestionSelect?.(suggestion);
      if (clearOnSelect) {
        setQuery('');
      }
      setIsOpen(false);
    };

    const handleSearch = () => {
      onSearch?.(query);
      setIsOpen(false);
    };

    return (
      <div className="relative">
        <EnhancedInput
          ref={ref}
          leftIcon={<Search className="h-4 w-4" />}
          rightIcon={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleSearch}
              disabled={loading}
              aria-label={loading ? "Searching..." : "Search"}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Search className="h-3 w-3" />
              )}
            </Button>
          }
          className={className}
          value={query}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          {...props}
        />
        
        {isOpen && suggestions.length > 0 && (
          <div 
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md"
            role="listbox"
            aria-label="Search suggestions"
          >
            <div className="max-h-48 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  role="option"
                  aria-selected={false}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";

/**
 * Tag Input Component
 */
export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  placeholder = "Add tags...",
  maxTags,
  allowDuplicates = false,
  suggestions = [],
  className,
  tagClassName,
  disabled = false,
  error = false,
  success = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    
    if (!allowDuplicates && value.includes(trimmedTag)) return;
    if (maxTags && value.length >= maxTags) return;
    
    onChange([...value, trimmedTag]);
    setInputValue('');
    setIsOpen(false);
  };

  const removeTag = (index: number) => {
    const newTags = value.filter((_, i) => i !== index);
    onChange(newTags);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    } else if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const filteredSuggestions = suggestions.filter(
    suggestion => 
      !value.includes(suggestion) &&
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={cn(
      "relative min-h-10 border rounded-md p-2 transition-all duration-200",
      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
      error && "border-destructive focus-within:ring-destructive",
      success && "border-green-500 focus-within:ring-green-500",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}>
      <div className="flex flex-wrap gap-1 mb-1">
        {value.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className={cn(
              "flex items-center space-x-1 pr-1",
              tagClassName
            )}
          >
            <span>{tag}</span>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => removeTag(index)}
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        ))}
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(e.target.value.length > 0 && filteredSuggestions.length > 0);
        }}
        onKeyDown={handleInputKeyDown}
        placeholder={value.length === 0 ? placeholder : ''}
        disabled={disabled || Boolean(maxTags && value.length >= maxTags)}
        className="flex-1 outline-none bg-transparent text-sm placeholder:text-muted-foreground"
        aria-label={placeholder}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        role="combobox"
      />
      
      {isOpen && filteredSuggestions.length > 0 && (
        <div 
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md"
          role="listbox"
          aria-label="Tag suggestions"
        >
          <div className="max-h-32 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => addTag(suggestion)}
                role="option"
                aria-selected={false}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced Combobox Component
 */
export const EnhancedCombobox: React.FC<ComboboxProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found.",
  className,
  disabled = false,
  error = false,
  success = false,
  clearable = false,
  creatable = false,
  onCreateOption
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedOption = options.find(option => option.value === value);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue === value ? "" : selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  const handleCreate = () => {
    if (creatable && onCreateOption && searchValue.trim()) {
      onCreateOption(searchValue.trim());
      setSearchValue("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            error && "border-destructive focus:ring-destructive",
            success && "border-green-500 focus:ring-green-500",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center space-x-2 truncate">
            {selectedOption?.icon}
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            {clearable && value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange("");
                }}
                aria-label="Clear selection"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>
            <div className="py-2 text-center">
              <p className="text-sm text-muted-foreground mb-2">{emptyMessage}</p>
              {creatable && searchValue.trim() && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCreate}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create &quot;{searchValue.trim()}&quot;</span>
                </Button>
              )}
            </div>
          </CommandEmpty>
          <CommandGroup>
            {filteredOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={handleSelect}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  {option.icon}
                  <div>
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-sm text-muted-foreground">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
                <Check
                  className={cn(
                    "h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

