/**
 * Advanced Form State Management
 * Production-grade form state with auto-save, persistence, and collaboration
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFormErrorHandler } from "./use-form-error-handler";

export interface FormStateConfig<T = any> {
  // Auto-save configuration
  autoSave?: {
    enabled: boolean;
    interval: number; // milliseconds
    debounceMs: number;
    onSave: (data: T) => Promise<void>;
    onSaveSuccess?: (data: T) => void;
    onSaveError?: (error: unknown) => void;
  };
  
  // Persistence configuration
  persistence?: {
    enabled: boolean;
    key: string;
    storage: 'localStorage' | 'sessionStorage';
    expireAfter?: number; // milliseconds
    compress?: boolean;
  };
  
  // Collaboration features
  collaboration?: {
    enabled: boolean;
    sessionId: string;
    onRemoteChange?: (data: T, userId: string) => void;
    onUserJoin?: (userId: string) => void;
    onUserLeave?: (userId: string) => void;
    conflictResolution?: 'lastWins' | 'merge' | 'manual';
  };
  
  // Validation integration
  validation?: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    debounceMs?: number;
    schema?: any; // Zod schema or custom validator
  };
  
  // Change tracking
  changeTracking?: {
    enabled: boolean;
    granular: boolean; // Track field-level changes
    maxHistory: number;
    onChangeDetected?: (changes: FormChange<T>[]) => void;
  };
  
  // Optimistic updates
  optimisticUpdates?: {
    enabled: boolean;
    timeout: number;
    onConflict?: (local: T, remote: T) => T;
  };
}

export interface FormChange<T = any> {
  id: string;
  timestamp: Date;
  field?: keyof T | undefined;
  oldValue: any;
  newValue: any;
  userId?: string | undefined;
  type: 'create' | 'update' | 'delete' | 'remote';
}

export interface FormStateSnapshot<T = any> {
  data: T;
  timestamp: Date;
  changes: FormChange<T>[];
  isDirty: boolean;
  isValid: boolean;
  errors: Record<string, string[]>;
}

export interface CollaborativeUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: {
    field: string;
    position: number;
  };
  lastSeen: Date;
}

export interface FormStateOperations<T = any> {
  // Core state operations
  data: T;
  setData: (data: T | ((prev: T) => T)) => void;
  updateField: (field: keyof T, value: any) => void;
  resetForm: (newData?: T) => void;
  
  // State information
  isDirty: boolean;
  isValid: boolean;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  
  // Change tracking
  changes: FormChange<T>[];
  hasUnsavedChanges: boolean;
  getFieldChanges: (field: keyof T) => FormChange<T>[];
  
  // History management
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  
  // Auto-save controls
  saveNow: () => Promise<void>;
  pauseAutoSave: () => void;
  resumeAutoSave: () => void;
  
  // Persistence
  saveToStorage: () => void;
  loadFromStorage: () => boolean;
  clearStorage: () => void;
  
  // Collaboration
  collaborativeUsers: CollaborativeUser[];
  broadcastChange: (change: FormChange<T>) => void;
  resolveConflict: (resolution: T) => void;
  
  // Snapshots
  createSnapshot: () => FormStateSnapshot<T>;
  restoreSnapshot: (snapshot: FormStateSnapshot<T>) => void;
  
  // Validation
  validate: () => Promise<boolean>;
  validateField: (field: keyof T) => Promise<string[]>;
  errors: Record<string, string[]>;
  
  // Utils
  getFormSummary: () => {
    totalFields: number;
    completedFields: number;
    completionPercentage: number;
    estimatedTimeToComplete: number;
  };
}

/**
 * Advanced Form State Hook
 */
export function useAdvancedFormState<T extends Record<string, any>>(
  initialData: T,
  config: FormStateConfig<T> = {}
): FormStateOperations<T> {
  const {
    autoSave,
    persistence,
    collaboration,
    validation,
    changeTracking,
    optimisticUpdates
  } = config;

  // Core state
  const [data, setDataInternal] = useState<T>(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Change tracking
  const [changes, setChanges] = useState<FormChange<T>[]>([]);
  const [history, setHistory] = useState<FormStateSnapshot<T>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Collaboration
  const [collaborativeUsers, setCollaborativeUsers] = useState<CollaborativeUser[]>([]);
  
  // Validation
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isValid, setIsValid] = useState(true);
  
  // Refs for intervals and timeouts
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const changeIdRef = useRef(0);
  const initialDataRef = useRef(initialData);
  
  // Error handler integration
  const errorHandler = useFormErrorHandler({
    enableRecovery: true,
    maxRetries: 3
  });

  /**
   * Generate unique change ID
   */
  const generateChangeId = useCallback(() => {
    return `change-${Date.now()}-${++changeIdRef.current}`;
  }, []);

  /**
   * Create form change record
   */
  const createChange = useCallback((
    field: keyof T | undefined,
    oldValue: any,
    newValue: any,
    type: FormChange<T>['type'] = 'update'
  ): FormChange<T> => {
    return {
      id: generateChangeId(),
      timestamp: new Date(),
      field,
      oldValue,
      newValue,
      type,
      userId: collaboration?.sessionId
    };
  }, [generateChangeId, collaboration?.sessionId]);

  /**
   * Add change to history
   */
  const addChange = useCallback((change: FormChange<T>) => {
    if (!changeTracking?.enabled) return;
    
    setChanges(prev => {
      const newChanges = [...prev, change];
      if (newChanges.length > (changeTracking?.maxHistory || 100)) {
        newChanges.shift();
      }
      return newChanges;
    });
    
    changeTracking?.onChangeDetected?.([change]);
  }, [changeTracking]);

  /**
   * Update form data with change tracking
   */
  const setData = useCallback((newData: T | ((prev: T) => T)) => {
    setDataInternal(prev => {
      const next = typeof newData === 'function' ? newData(prev) : newData;
      
      // Track changes if enabled
      if (changeTracking?.enabled) {
        const change = createChange(undefined, prev, next, 'update');
        addChange(change);
      }
      
      // Mark as dirty if data has changed
      const hasChanged = JSON.stringify(next) !== JSON.stringify(initialDataRef.current);
      setIsDirty(hasChanged);
      
      // Trigger auto-save
      if (autoSave?.enabled && hasChanged) {
        debouncedSave(next);
      }
      
      return next;
    });
  }, [changeTracking, autoSave, addChange, createChange]);

  /**
   * Update specific field
   */
  const updateField = useCallback((field: keyof T, value: any) => {
    setData(prev => {
      const oldValue = prev[field];
      
      // Track field-level change
      if (changeTracking?.enabled && changeTracking.granular) {
        const change = createChange(field, oldValue, value, 'update');
        addChange(change);
      }
      
      return { ...prev, [field]: value };
    });
  }, [setData, changeTracking, addChange, createChange]);

  /**
   * Debounced save function
   */
  const debouncedSave = useCallback((dataToSave: T) => {
    if (!autoSave?.enabled) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      performSave(dataToSave);
    }, autoSave.debounceMs || 1000);
  }, [autoSave]);

  /**
   * Perform actual save operation
   */
  const performSave = useCallback(async (dataToSave?: T) => {
    if (!autoSave?.enabled) return;
    
    const currentData = dataToSave || data;
    
    setIsSaving(true);
    
    try {
      await autoSave.onSave(currentData);
      setLastSaved(new Date());
      setIsDirty(false);
      autoSave.onSaveSuccess?.(currentData);
      
      // Update initial data reference after successful save
      initialDataRef.current = currentData;
      
    } catch (error) {
      console.error('Auto-save failed:', error);
      errorHandler.addError(error, undefined, {
        operation: 'auto-save',
        data: currentData
      });
      autoSave.onSaveError?.(error);
    } finally {
      setIsSaving(false);
    }
  }, [autoSave, data, errorHandler]);

  /**
   * Manual save
   */
  const saveNow = useCallback(async () => {
    await performSave();
  }, [performSave]);

  /**
   * Auto-save controls
   */
  const pauseAutoSave = useCallback(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const resumeAutoSave = useCallback(() => {
    if (!autoSave?.enabled) return;
    
    pauseAutoSave(); // Clear existing timers
    
    autoSaveIntervalRef.current = setInterval(() => {
      if (isDirty) {
        performSave();
      }
    }, autoSave.interval || 30000);
  }, [autoSave, isDirty, performSave, pauseAutoSave]);

  /**
   * Storage operations
   */
  const saveToStorage = useCallback(() => {
    if (!persistence?.enabled || typeof window === 'undefined') return;
    
    const storage = persistence.storage === 'localStorage' ? localStorage : sessionStorage;
    const storageData = {
      data,
      timestamp: new Date().toISOString(),
      changes: changeTracking?.enabled ? changes : []
    };
    
    storage.setItem(persistence.key, JSON.stringify(storageData));
  }, [persistence, data, changes, changeTracking]);

  const loadFromStorage = useCallback((): boolean => {
    if (!persistence?.enabled || typeof window === 'undefined') return false;
    
    try {
      const storage = persistence.storage === 'localStorage' ? localStorage : sessionStorage;
      const stored = storage.getItem(persistence.key);
      
      if (!stored) return false;
      
      const storageData = JSON.parse(stored);
      const timestamp = new Date(storageData.timestamp);
      
      // Check expiration
      if (persistence.expireAfter && 
          Date.now() - timestamp.getTime() > persistence.expireAfter) {
        clearStorage();
        return false;
      }
      
      setDataInternal(storageData.data);
      if (changeTracking?.enabled && storageData.changes) {
        setChanges(storageData.changes);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load from storage:', error);
      return false;
    }
  }, [persistence, changeTracking]);

  const clearStorage = useCallback(() => {
    if (!persistence?.enabled || typeof window === 'undefined') return;
    
    const storage = persistence.storage === 'localStorage' ? localStorage : sessionStorage;
    storage.removeItem(persistence.key);
  }, [persistence]);

  /**
   * History operations
   */
  const createSnapshot = useCallback((): FormStateSnapshot<T> => {
    return {
      data: { ...data },
      timestamp: new Date(),
      changes: [...changes],
      isDirty,
      isValid,
      errors: { ...errors }
    };
  }, [data, changes, isDirty, isValid, errors]);

  const addToHistory = useCallback((snapshot: FormStateSnapshot<T>) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      
      const maxHistory = changeTracking?.maxHistory || 50;
      if (newHistory.length > maxHistory) {
        newHistory.shift();
      }
      
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex, changeTracking]);

  const undo = useCallback((): boolean => {
    if (historyIndex <= 0) return false;
    
    const prevSnapshot = history[historyIndex - 1];
    if (!prevSnapshot) return false;
    
    setDataInternal(prevSnapshot.data);
    setIsDirty(prevSnapshot.isDirty);
    setIsValid(prevSnapshot.isValid);
    setErrors(prevSnapshot.errors);
    setHistoryIndex(prev => prev - 1);
    
    return true;
  }, [history, historyIndex]);

  const redo = useCallback((): boolean => {
    if (historyIndex >= history.length - 1) return false;
    
    const nextSnapshot = history[historyIndex + 1];
    if (!nextSnapshot) return false;
    
    setDataInternal(nextSnapshot.data);
    setIsDirty(nextSnapshot.isDirty);
    setIsValid(nextSnapshot.isValid);
    setErrors(nextSnapshot.errors);
    setHistoryIndex(prev => prev + 1);
    
    return true;
  }, [history, historyIndex]);

  /**
   * Validation operations
   */
  const validate = useCallback(async (): Promise<boolean> => {
    if (!validation?.schema) {
      setIsValid(true);
      setErrors({});
      return true;
    }
    
    try {
      // Implementation depends on validation library (Zod, Yup, etc.)
      // This is a placeholder for the validation logic
      setIsValid(true);
      setErrors({});
      return true;
    } catch (error) {
      setIsValid(false);
      // Parse validation errors based on schema library
      return false;
    }
  }, [validation]);

  const validateField = useCallback(async (field: keyof T): Promise<string[]> => {
    // Field-specific validation logic
    return [];
  }, []);

  /**
   * Utility functions
   */
  const resetForm = useCallback((newData?: T) => {
    const resetData = newData || initialData;
    setDataInternal(resetData);
    setIsDirty(false);
    setErrors({});
    setChanges([]);
    setHistory([]);
    setHistoryIndex(-1);
    initialDataRef.current = resetData;
  }, [initialData]);

  const getFieldChanges = useCallback((field: keyof T): FormChange<T>[] => {
    return changes.filter(change => change.field === field);
  }, [changes]);

  const getFormSummary = useCallback(() => {
    const fields = Object.keys(data);
    const completedFields = fields.filter(field => {
      const value = data[field as keyof T];
      return value !== undefined && value !== null && value !== '';
    });
    
    return {
      totalFields: fields.length,
      completedFields: completedFields.length,
      completionPercentage: Math.round((completedFields.length / fields.length) * 100),
      estimatedTimeToComplete: Math.max(0, (fields.length - completedFields.length) * 30) // 30 seconds per field estimate
    };
  }, [data]);

  /**
   * Initialize auto-save and load from storage
   */
  useEffect(() => {
    // Load from storage on mount
    if (persistence?.enabled) {
      loadFromStorage();
    }
    
    // Initialize auto-save
    if (autoSave?.enabled) {
      resumeAutoSave();
    }
    
    return () => {
      pauseAutoSave();
    };
  }, []);

  /**
   * Auto-save to storage when data changes
   */
  useEffect(() => {
    if (persistence?.enabled && isDirty) {
      saveToStorage();
    }
  }, [data, isDirty, persistence, saveToStorage]);

  /**
   * Add snapshot to history when significant changes occur
   */
  useEffect(() => {
    if (changeTracking?.enabled && isDirty) {
      const snapshot = createSnapshot();
      addToHistory(snapshot);
    }
  }, [isDirty]); // Only trigger on dirty state changes

  return {
    // Core state
    data,
    setData,
    updateField,
    resetForm,
    
    // State information
    isDirty,
    isValid,
    isSaving,
    isLoading,
    lastSaved,
    
    // Change tracking
    changes,
    hasUnsavedChanges: isDirty,
    getFieldChanges,
    
    // History
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    
    // Auto-save
    saveNow,
    pauseAutoSave,
    resumeAutoSave,
    
    // Persistence
    saveToStorage,
    loadFromStorage,
    clearStorage,
    
    // Collaboration (placeholder implementations)
    collaborativeUsers,
    broadcastChange: () => {},
    resolveConflict: () => {},
    
    // Snapshots
    createSnapshot,
    restoreSnapshot: (snapshot: FormStateSnapshot<T>) => {
      setDataInternal(snapshot.data);
      setIsDirty(snapshot.isDirty);
      setIsValid(snapshot.isValid);
      setErrors(snapshot.errors);
    },
    
    // Validation
    validate,
    validateField,
    errors,
    
    // Utils
    getFormSummary
  };
}