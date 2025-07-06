/**
 * Service Status Banner Component
 * Displays service degradation status to users
 */

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Info,
  X
} from "lucide-react";
import { useServiceDegradation, useMultipleServiceDegradation } from "@/hooks/useServiceDegradation";
import { ServiceStatus } from "@/lib/resilience/service-degradation";

interface ServiceStatusBannerProps {
  serviceName?: string;
  serviceNames?: string[];
  showWhenHealthy?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function ServiceStatusBanner({
  serviceName,
  serviceNames,
  showWhenHealthy = false,
  onDismiss,
  className = ""
}: ServiceStatusBannerProps) {
  if (serviceName) {
    return (
      <SingleServiceBanner
        serviceName={serviceName}
        showWhenHealthy={showWhenHealthy}
        onDismiss={onDismiss}
        className={className}
      />
    );
  }

  if (serviceNames && serviceNames.length > 0) {
    return (
      <MultipleServiceBanner
        serviceNames={serviceNames}
        showWhenHealthy={showWhenHealthy}
        onDismiss={onDismiss}
        className={className}
      />
    );
  }

  return null;
}

function SingleServiceBanner({
  serviceName,
  showWhenHealthy,
  onDismiss,
  className
}: {
  serviceName: string;
  showWhenHealthy: boolean;
  onDismiss?: () => void;
  className: string;
}) {
  const { 
    status, 
    isAvailable, 
    isDegraded, 
    recommendations,
    availableFeatures,
    refresh 
  } = useServiceDegradation({ serviceName });

  // Don't show banner if service is healthy and showWhenHealthy is false
  if (status === ServiceStatus.HEALTHY && !showWhenHealthy) {
    return null;
  }

  const getStatusIcon = () => {
    switch (status) {
      case ServiceStatus.HEALTHY:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ServiceStatus.DEGRADED:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case ServiceStatus.UNAVAILABLE:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = () => {
    switch (status) {
      case ServiceStatus.HEALTHY:
        return "default";
      case ServiceStatus.DEGRADED:
        return "default";
      case ServiceStatus.UNAVAILABLE:
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <Alert variant={getStatusVariant()} className={className}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium capitalize">{serviceName}</span>
              <Badge variant={status === ServiceStatus.HEALTHY ? "default" : "secondary"}>
                {status}
              </Badge>
            </div>
            
            {recommendations && (
              <AlertDescription className="text-sm">
                {recommendations.userMessage}
                {recommendations.estimatedRecovery !== "N/A" && (
                  <span className="ml-2 text-muted-foreground">
                    (Est. recovery: {recommendations.estimatedRecovery})
                  </span>
                )}
              </AlertDescription>
            )}

            {isDegraded && availableFeatures.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Available features:</p>
                <div className="flex flex-wrap gap-1">
                  {availableFeatures.map((feature) => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {recommendations && recommendations.alternativeActions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Suggested actions:</p>
                <ul className="text-xs space-y-1">
                  {recommendations.alternativeActions.map((action, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-current rounded-full" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="h-8"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}

function MultipleServiceBanner({
  serviceNames,
  showWhenHealthy,
  onDismiss,
  className
}: {
  serviceNames: string[];
  showWhenHealthy: boolean;
  onDismiss?: () => void;
  className: string;
}) {
  const { services, allHealthy, anyUnavailable, degradedServices, refresh } = 
    useMultipleServiceDegradation(serviceNames);

  // Don't show banner if all services are healthy and showWhenHealthy is false
  if (allHealthy && !showWhenHealthy) {
    return null;
  }

  const getOverallStatus = () => {
    if (anyUnavailable) return "Some services unavailable";
    if (degradedServices.length > 0) return "Some services degraded";
    return "All services operational";
  };

  const getOverallVariant = () => {
    if (anyUnavailable) return "destructive";
    if (degradedServices.length > 0) return "default";
    return "default";
  };

  return (
    <Alert variant={getOverallVariant()} className={className}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4" />
            <span className="font-medium">System Status</span>
            <Badge variant="outline">{getOverallStatus()}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {serviceNames.map((serviceName) => {
              const service = services[serviceName];
              if (!service) return null;

              return (
                <div key={serviceName} className="flex items-center gap-1">
                  {service.status === ServiceStatus.HEALTHY && (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                  {service.status === ServiceStatus.DEGRADED && (
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  )}
                  {service.status === ServiceStatus.UNAVAILABLE && (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-xs capitalize">{serviceName}</span>
                </div>
              );
            })}
          </div>

          {degradedServices.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Limited functionality: {degradedServices.join(", ")}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="h-8"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}

// Component for displaying service status in a compact format
export function ServiceStatusIndicator({ serviceName }: { serviceName: string }) {
  const { status, isDegraded, isAvailable } = useServiceDegradation({ serviceName });

  if (status === ServiceStatus.HEALTHY) {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3 text-green-500" />
        <span className="text-xs text-green-600">Operational</span>
      </div>
    );
  }

  if (isDegraded) {
    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3 text-yellow-500" />
        <span className="text-xs text-yellow-600">Limited</span>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3 text-red-500" />
        <span className="text-xs text-red-600">Unavailable</span>
      </div>
    );
  }

  return null;
}