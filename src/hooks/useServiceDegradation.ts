/**
 * React Hook for Service Degradation
 * Provides graceful degradation state management in React components
 */

import { useState, useEffect, useCallback } from "react";
import { ServiceStatus, serviceDegradationManager } from "@/lib/resilience/service-degradation";

export interface ServiceDegradationState {
  status: ServiceStatus;
  isAvailable: boolean;
  isDegraded: boolean;
  lastError?: string;
  availableFeatures: string[];
  recommendations?: {
    userMessage: string;
    alternativeActions: string[];
    estimatedRecovery: string;
  };
}

export interface UseServiceDegradationOptions {
  serviceName: string;
  requiredFeatures?: string[];
  pollInterval?: number;
  onStatusChange?: (status: ServiceStatus) => void;
}

export function useServiceDegradation({
  serviceName,
  requiredFeatures = [],
  pollInterval = 30000, // 30 seconds
  onStatusChange
}: UseServiceDegradationOptions) {
  const [state, setState] = useState<ServiceDegradationState>(() => {
    const status = serviceDegradationManager.getServiceStatus(serviceName);
    const summary = serviceDegradationManager.getHealthSummary();
    const serviceInfo = summary[serviceName];
    
    return {
      status,
      isAvailable: status !== ServiceStatus.UNAVAILABLE,
      isDegraded: status === ServiceStatus.DEGRADED,
      lastError: serviceInfo?.lastError,
      availableFeatures: serviceInfo?.availableFeatures || [],
      recommendations: status !== ServiceStatus.HEALTHY 
        ? serviceDegradationManager.getDegradationRecommendations(serviceName)
        : undefined
    };
  });

  const updateState = useCallback(() => {
    const status = serviceDegradationManager.getServiceStatus(serviceName);
    const summary = serviceDegradationManager.getHealthSummary();
    const serviceInfo = summary[serviceName];
    
    const newState: ServiceDegradationState = {
      status,
      isAvailable: status !== ServiceStatus.UNAVAILABLE,
      isDegraded: status === ServiceStatus.DEGRADED,
      lastError: serviceInfo?.lastError,
      availableFeatures: serviceInfo?.availableFeatures || [],
      recommendations: status !== ServiceStatus.HEALTHY 
        ? serviceDegradationManager.getDegradationRecommendations(serviceName)
        : undefined
    };

    setState(prevState => {
      // Only update if state has changed
      if (prevState.status !== newState.status) {
        onStatusChange?.(newState.status);
      }
      return newState;
    });
  }, [serviceName, onStatusChange]);

  const checkFeatureAvailability = useCallback((featureName: string): boolean => {
    return serviceDegradationManager.isFeatureAvailable(serviceName, featureName);
  }, [serviceName]);

  const getFallbackData = useCallback((dataType: string): unknown => {
    return serviceDegradationManager.getFallbackData(serviceName, dataType);
  }, [serviceName]);

  const areRequiredFeaturesAvailable = useCallback((): boolean => {
    return requiredFeatures.every(feature => 
      serviceDegradationManager.isFeatureAvailable(serviceName, feature)
    );
  }, [serviceName, requiredFeatures]);

  const recordFailure = useCallback((error: string) => {
    serviceDegradationManager.recordFailure(serviceName, error);
    updateState();
  }, [serviceName, updateState]);

  const recordSuccess = useCallback(() => {
    serviceDegradationManager.recordSuccess(serviceName);
    updateState();
  }, [serviceName, updateState]);

  // Poll for status updates
  useEffect(() => {
    const interval = setInterval(updateState, pollInterval);
    return () => clearInterval(interval);
  }, [updateState, pollInterval]);

  return {
    ...state,
    checkFeatureAvailability,
    getFallbackData,
    areRequiredFeaturesAvailable,
    recordFailure,
    recordSuccess,
    refresh: updateState
  };
}

// Utility hook for multiple services
export function useMultipleServiceDegradation(serviceNames: string[]) {
  const [services, setServices] = useState<Record<string, ServiceDegradationState>>({});

  const updateServices = useCallback(() => {
    const summary = serviceDegradationManager.getHealthSummary();
    const newServices: Record<string, ServiceDegradationState> = {};

    serviceNames.forEach(serviceName => {
      const status = serviceDegradationManager.getServiceStatus(serviceName);
      const serviceInfo = summary[serviceName];
      
      newServices[serviceName] = {
        status,
        isAvailable: status !== ServiceStatus.UNAVAILABLE,
        isDegraded: status === ServiceStatus.DEGRADED,
        lastError: serviceInfo?.lastError,
        availableFeatures: serviceInfo?.availableFeatures || [],
        recommendations: status !== ServiceStatus.HEALTHY 
          ? serviceDegradationManager.getDegradationRecommendations(serviceName)
          : undefined
      };
    });

    setServices(newServices);
  }, [serviceNames]);

  useEffect(() => {
    updateServices();
    const interval = setInterval(updateServices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [updateServices]);

  return {
    services,
    refresh: updateServices,
    allHealthy: Object.values(services).every(s => s.status === ServiceStatus.HEALTHY),
    anyUnavailable: Object.values(services).some(s => s.status === ServiceStatus.UNAVAILABLE),
    degradedServices: Object.entries(services)
      .filter(([, state]) => state.isDegraded)
      .map(([name]) => name)
  };
}

// Context for service degradation
import { createContext, useContext, ReactNode } from "react";

interface ServiceDegradationContextType {
  getServiceStatus: (serviceName: string) => ServiceStatus;
  checkFeatureAvailability: (serviceName: string, featureName: string) => boolean;
  getFallbackData: (serviceName: string, dataType: string) => unknown;
  recordFailure: (serviceName: string, error: string) => void;
  recordSuccess: (serviceName: string) => void;
}

const ServiceDegradationContext = createContext<ServiceDegradationContextType | undefined>(undefined);

export function ServiceDegradationProvider({ children }: { children: ReactNode }) {
  const contextValue: ServiceDegradationContextType = {
    getServiceStatus: (serviceName: string) => 
      serviceDegradationManager.getServiceStatus(serviceName),
    checkFeatureAvailability: (serviceName: string, featureName: string) => 
      serviceDegradationManager.isFeatureAvailable(serviceName, featureName),
    getFallbackData: (serviceName: string, dataType: string) => 
      serviceDegradationManager.getFallbackData(serviceName, dataType),
    recordFailure: (serviceName: string, error: string) => 
      serviceDegradationManager.recordFailure(serviceName, error),
    recordSuccess: (serviceName: string) => 
      serviceDegradationManager.recordSuccess(serviceName)
  };

  return (
    <ServiceDegradationContext.Provider value={contextValue}>
      {children}
    </ServiceDegradationContext.Provider>
  );
}

export function useServiceDegradationContext() {
  const context = useContext(ServiceDegradationContext);
  if (!context) {
    throw new Error("useServiceDegradationContext must be used within a ServiceDegradationProvider");
  }
  return context;
}