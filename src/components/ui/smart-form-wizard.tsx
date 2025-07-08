/**
 * Smart Form Wizard System
 * Intelligent multi-step forms with adaptive navigation and contextual guidance
 */

"use client";

import React, { useState, useEffect, useMemo, createContext, useContext, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  AlertTriangle, 
  Info,
  Lightbulb,
  Clock,
  Target,
  Sparkles,
  SkipForward,
  Bookmark,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  component: React.ComponentType<any>;
  
  // Step behavior
  required: boolean;
  skippable: boolean;
  repeatable: boolean;
  
  // Validation
  validate?: (data: any) => Promise<WizardValidationResult>;
  
  // Dependencies
  dependsOn?: string[]; // Step IDs that must be completed first
  enables?: string[]; // Step IDs that this step unlocks
  
  // Conditional logic
  condition?: (data: any) => boolean; // Show/hide step based on form data
  
  // Completion estimates
  estimatedTime?: number; // minutes
  complexity?: 'easy' | 'medium' | 'hard';
  
  // Help and guidance
  helpContent?: React.ReactNode;
  tips?: string[];
  examples?: Array<{
    title: string;
    description: string;
    data: any;
  }>;
  
  // Progress tracking
  substeps?: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
}

export interface WizardValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  completionScore: number; // 0-100
}

export interface WizardContextValue {
  // Step management
  currentStepIndex: number;
  currentStep: WizardStep;
  steps: WizardStep[];
  completedSteps: Set<string>;
  
  // Navigation
  goToStep: (stepId: string) => void;
  goNext: () => Promise<boolean>;
  goPrevious: () => void;
  skip: () => void;
  
  // Data management
  data: any;
  updateData: (stepId: string, stepData: any) => void;
  
  // Validation
  validateCurrentStep: () => Promise<WizardValidationResult>;
  validationResults: Record<string, WizardValidationResult>;
  
  // Progress
  overallProgress: number;
  estimatedTimeRemaining: number;
  
  // UI state
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
}

export interface SmartFormWizardProps {
  steps: WizardStep[];
  initialData?: any;
  onComplete: (data: any) => void;
  onStepChange?: (stepIndex: number, stepId: string) => void;
  onDataChange?: (data: any) => void;
  allowBackNavigation?: boolean;
  showProgress?: boolean;
  showStepNumbers?: boolean;
  showTimeEstimates?: boolean;
  adaptiveNavigation?: boolean;
  className?: string;
}

export interface StepNavigationProps {
  className?: string;
}

export interface StepContentProps {
  className?: string;
  showHelp?: boolean;
}

export interface StepHelpPanelProps {
  step: WizardStep;
  className?: string;
}

export interface ProgressIndicatorProps {
  variant?: 'linear' | 'circular' | 'steps';
  showLabels?: boolean;
  showTimeEstimate?: boolean;
  className?: string;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a SmartFormWizard");
  }
  return context;
};

/**
 * Smart Form Wizard Component
 */
export const SmartFormWizard: React.FC<SmartFormWizardProps> = ({
  steps,
  initialData = {},
  onComplete,
  onStepChange,
  onDataChange,
  allowBackNavigation = true,
  showProgress = true,
  showStepNumbers = true,
  showTimeEstimates = true,
  adaptiveNavigation = true,
  className
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [data, setData] = useState(initialData);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [validationResults, setValidationResults] = useState<Record<string, WizardValidationResult>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Filter steps based on conditions
  const visibleSteps = useMemo(() => {
    return steps.filter(step => {
      if (!step.condition) return true;
      return step.condition(data);
    });
  }, [steps, data]);

  // Current step
  const currentStep = visibleSteps[currentStepIndex];

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (visibleSteps.length === 0) return 0;
    
    const requiredSteps = visibleSteps.filter(step => step.required);
    const completedRequiredSteps = requiredSteps.filter(step => 
      completedSteps.has(step.id)
    );
    
    return Math.round((completedRequiredSteps.length / requiredSteps.length) * 100);
  }, [visibleSteps, completedSteps]);

  // Calculate estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    const remainingSteps = visibleSteps.slice(currentStepIndex);
    return remainingSteps.reduce((total, step) => {
      return total + (step.estimatedTime || 5); // Default 5 minutes per step
    }, 0);
  }, [visibleSteps, currentStepIndex]);

  // Check if step dependencies are met
  const canAccessStep = useCallback((stepId: string): boolean => {
    const step = steps.find(s => s.id === stepId);
    if (!step || !step.dependsOn) return true;
    
    return step.dependsOn.every(depId => completedSteps.has(depId));
  }, [steps, completedSteps]);

  // Update form data
  const updateData = useCallback((stepId: string, stepData: any) => {
    setData((prev: any) => {
      const newData = { ...prev, [stepId]: stepData };
      onDataChange?.(newData);
      return newData;
    });
  }, [onDataChange]);

  // Validate current step
  const validateCurrentStep = useCallback(async (): Promise<WizardValidationResult> => {
    if (!currentStep || !currentStep.validate) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        completionScore: 100
      };
    }
    
    const result = await currentStep.validate(data);
    setValidationResults(prev => ({
      ...prev,
      [currentStep.id]: result
    }));
    
    return result;
  }, [currentStep, data]);

  // Navigation functions
  const goToStep = useCallback((stepId: string) => {
    const stepIndex = visibleSteps.findIndex(step => step.id === stepId);
    if (stepIndex === -1) return;
    
    if (!canAccessStep(stepId)) {
      console.warn(`Cannot access step ${stepId} - dependencies not met`);
      return;
    }
    
    setCurrentStepIndex(stepIndex);
    onStepChange?.(stepIndex, stepId);
  }, [visibleSteps, canAccessStep, onStepChange]);

  const goNext = useCallback(async (): Promise<boolean> => {
    if (!currentStep) return false;
    
    // Validate current step
    const validation = await validateCurrentStep();
    
    if (!validation.isValid && currentStep.required) {
      return false;
    }
    
    // Mark step as completed if valid
    if (validation.isValid) {
      setCompletedSteps(prev => new Set([...prev, currentStep.id]));
    }
    
    // Check if this is the last step
    if (currentStepIndex >= visibleSteps.length - 1) {
      // Complete the wizard
      onComplete(data);
      return true;
    }
    
    // Move to next step
    const nextStep = visibleSteps[currentStepIndex + 1];
    if (nextStep) {
      setCurrentStepIndex(prev => prev + 1);
      onStepChange?.(currentStepIndex + 1, nextStep.id);
    }
    
    return true;
  }, [currentStep, currentStepIndex, visibleSteps, validateCurrentStep, data, onComplete, onStepChange]);

  const goPrevious = useCallback(() => {
    if (!allowBackNavigation || currentStepIndex <= 0) return;
    
    const prevStep = visibleSteps[currentStepIndex - 1];
    if (prevStep) {
      setCurrentStepIndex(prev => prev - 1);
      onStepChange?.(currentStepIndex - 1, prevStep.id);
    }
  }, [allowBackNavigation, currentStepIndex, visibleSteps, onStepChange]);

  const skip = useCallback(() => {
    if (!currentStep || !currentStep.skippable) return;
    
    const nextStep = visibleSteps[currentStepIndex + 1];
    if (nextStep) {
      setCurrentStepIndex(prev => prev + 1);
      onStepChange?.(currentStepIndex + 1, nextStep.id);
    }
  }, [currentStep, currentStepIndex, visibleSteps, onStepChange]);

  // Context value
  const contextValue: WizardContextValue = {
    currentStepIndex,
    currentStep: currentStep || { id: '', title: '', component: () => null, required: false, skippable: false, repeatable: false },
    steps: visibleSteps,
    completedSteps,
    goToStep,
    goNext,
    goPrevious,
    skip,
    data,
    updateData,
    validateCurrentStep,
    validationResults,
    overallProgress,
    estimatedTimeRemaining,
    showHelp,
    setShowHelp,
    showPreview,
    setShowPreview
  };

  // Auto-validate when data changes
  useEffect(() => {
    if (currentStep?.validate) {
      const timeoutId = setTimeout(() => {
        validateCurrentStep();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [data, currentStep, validateCurrentStep]);

  return (
    <WizardContext.Provider value={contextValue}>
      <div className={cn("space-y-6", className)}>
        {/* Progress Indicator */}
        {showProgress && (
          <ProgressIndicator 
            variant="steps"
            showLabels={showStepNumbers}
            showTimeEstimate={showTimeEstimates}
          />
        )}
        
        {/* Step Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <StepContent />
          </div>
          
          {/* Help Panel */}
          {showHelp && currentStep && (
            <div className="lg:col-span-1">
              <StepHelpPanel step={currentStep} />
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <StepNavigation />
      </div>
    </WizardContext.Provider>
  );
};

/**
 * Progress Indicator Component
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  variant = 'steps',
  showLabels = true,
  showTimeEstimate = true,
  className
}) => {
  const { 
    steps, 
    currentStepIndex, 
    completedSteps, 
    overallProgress, 
    estimatedTimeRemaining 
  } = useWizard();

  if (variant === 'linear') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{overallProgress}% complete</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
        {showTimeEstimate && (
          <div className="text-sm text-muted-foreground text-right">
            <Clock className="inline w-4 h-4 mr-1" />
            {estimatedTimeRemaining} min remaining
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Step Indicators */}
      <div className="relative">
        <div className="absolute top-4 left-0 w-full h-0.5 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>
        
        <div className="relative flex justify-between" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={1} aria-valuemax={steps.length}>
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = completedSteps.has(step.id);
            const isAccessible = index <= currentStepIndex;
            
            return (
              <div
                key={step.id}
                className="flex flex-col items-center group"
              >
                {/* Step Circle */}
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
                  "relative z-10 bg-background",
                  isActive && "border-primary bg-primary text-primary-foreground scale-110 shadow-lg",
                  isCompleted && !isActive && "border-green-500 bg-green-500 text-white",
                  !isActive && !isCompleted && isAccessible && "border-muted-foreground/50 hover:border-primary",
                  !isAccessible && "border-muted-foreground/30 opacity-50"
                )}>
                  {step.icon ? (
                    <div className="w-4 h-4" aria-hidden="true">
                      {step.icon}
                    </div>
                  ) : isCompleted ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <span className="text-xs font-medium" aria-hidden="true">
                      {index + 1}
                    </span>
                  )}
                </div>
                
                {/* Step Label */}
                {showLabels && (
                  <div className="mt-2 text-center max-w-24">
                    <div className={cn(
                      "text-xs font-medium transition-colors duration-200",
                      isActive && "text-primary",
                      isCompleted && !isActive && "text-green-600",
                      !isActive && !isCompleted && isAccessible && "text-muted-foreground",
                      !isAccessible && "text-muted-foreground/50"
                    )}>
                      {step.title}
                    </div>
                    
                    {/* Step Status */}
                    <div className="flex items-center justify-center mt-1 space-x-1">
                      {step.required && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          Required
                        </Badge>
                      )}
                      {step.estimatedTime && showTimeEstimate && (
                        <span className="text-xs text-muted-foreground">
                          {step.estimatedTime}m
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Overall Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center space-x-2">
          <Target className="w-4 h-4" />
          <span>{overallProgress}% Complete</span>
        </span>
        
        {showTimeEstimate && (
          <span className="flex items-center space-x-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{estimatedTimeRemaining} min remaining</span>
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Step Content Component
 */
export const StepContent: React.FC<StepContentProps> = ({
  className,
  showHelp = false
}) => {
  const { currentStep, validationResults } = useWizard();
  
  if (!currentStep) {
    return (
      <Card className={cn("", className)}>
        <div className="p-4 text-center text-muted-foreground">
          No step available
        </div>
      </Card>
    );
  }
  
  const validation = validationResults[currentStep.id];
  const StepComponent = currentStep.component;

  return (
    <Card className={cn("", className)} role="main" aria-labelledby="step-title">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle id="step-title" className="flex items-center space-x-3">
              {currentStep.icon && (
                <div className="p-2 rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                  {currentStep.icon}
                </div>
              )}
              <span>{currentStep.title}</span>
              {currentStep.required && (
                <Badge variant="destructive" className="text-xs" aria-label="Required step">
                  Required
                </Badge>
              )}
            </CardTitle>
            {currentStep.description && (
              <CardDescription>{currentStep.description}</CardDescription>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {currentStep.estimatedTime && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{currentStep.estimatedTime}m</span>
              </Badge>
            )}
            
            {currentStep.complexity && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span className="capitalize">{currentStep.complexity}</span>
              </Badge>
            )}
          </div>
        </div>
        
        {/* Validation Feedback */}
        {validation && (
          <div className="space-y-2">
            {validation.errors.length > 0 && (
              <div className="flex items-start space-x-2 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  {validation.errors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              </div>
            )}
            
            {validation.warnings.length > 0 && (
              <div className="flex items-start space-x-2 text-sm text-amber-600">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  {validation.warnings.map((warning, index) => (
                    <div key={index}>{warning}</div>
                  ))}
                </div>
              </div>
            )}
            
            {validation.suggestions.length > 0 && (
              <div className="flex items-start space-x-2 text-sm text-blue-600">
                <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  {validation.suggestions.map((suggestion, index) => (
                    <div key={index}>{suggestion}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <StepComponent />
      </CardContent>
    </Card>
  );
};

/**
 * Step Help Panel Component
 */
export const StepHelpPanel: React.FC<StepHelpPanelProps> = ({
  step,
  className
}) => {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base">
          <Info className="w-4 h-4" />
          <span>Help & Tips</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {step.helpContent && (
          <div className="prose prose-sm">
            {step.helpContent}
          </div>
        )}
        
        {step.tips && step.tips.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center space-x-2">
              <Lightbulb className="w-4 h-4" />
              <span>Tips</span>
            </h4>
            <ul className="space-y-1 text-sm">
              {step.tips.map((tip, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {step.examples && step.examples.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Examples</h4>
            <div className="space-y-2">
              {step.examples.map((example, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="font-medium text-sm">{example.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {example.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Step Navigation Component
 */
export const StepNavigation: React.FC<StepNavigationProps> = ({
  className
}) => {
  const {
    currentStepIndex,
    currentStep,
    steps,
    goNext,
    goPrevious,
    skip,
    showHelp,
    setShowHelp,
    showPreview,
    setShowPreview,
    validationResults
  } = useWizard();

  const [isNavigating, setIsNavigating] = useState(false);
  
  const validation = validationResults[currentStep.id];
  const canProceed = !validation || validation.isValid || !currentStep.required;
  
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = async () => {
    setIsNavigating(true);
    await goNext();
    setIsNavigating(false);
  };

  return (
    <div className={cn("flex items-center justify-between border-t pt-4", className)}>
      {/* Left Side - Previous + Help */}
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          onClick={goPrevious}
          disabled={isFirstStep || isNavigating}
          className="flex items-center space-x-2"
          aria-label={isFirstStep ? "Previous (disabled - first step)" : "Previous step"}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>
        
        <Button
          variant="ghost"
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center space-x-2"
          aria-label={showHelp ? "Hide help panel" : "Show help panel"}
          aria-pressed={showHelp}
        >
          {showHelp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>Help</span>
        </Button>
      </div>

      {/* Center - Step Info */}
      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
        <span>
          Step {currentStepIndex + 1} of {steps.length}
        </span>
        
        {validation && (
          <Badge variant={validation.isValid ? "default" : "destructive"}>
            {Math.round(validation.completionScore)}% complete
          </Badge>
        )}
      </div>

      {/* Right Side - Skip + Next */}
      <div className="flex items-center space-x-3">
        {currentStep.skippable && (
          <Button
            variant="ghost"
            onClick={skip}
            disabled={isNavigating}
            className="flex items-center space-x-2"
            aria-label="Skip this optional step"
          >
            <SkipForward className="w-4 h-4" />
            <span>Skip</span>
          </Button>
        )}
        
        <Button
          onClick={handleNext}
          disabled={!canProceed || isNavigating}
          className="flex items-center space-x-2"
          aria-label={isLastStep ? "Complete wizard" : "Next step"}
        >
          <span>{isLastStep ? 'Complete' : 'Next'}</span>
          {isNavigating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

