/**
 * Enhanced Create Project Modal
 * World-class project creation experience with smart forms and adaptive UX
 */

"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import {
  authenticatedFetch,
  AuthenticationError,
  CSRFError,
} from "@/lib/auth/authenticated-fetch";
import { supabase } from "@/lib/supabase/client";

// Enhanced UI Components
import {
  EnhancedDialog,
  EnhancedDialogContent,
  EnhancedDialogHeader,
  EnhancedDialogTitle,
  EnhancedDialogDescription,
  EnhancedDialogBody,
  EnhancedDialogFooter,
} from "@/components/ui/enhanced-dialog";

import {
  FormLayoutProvider,
  FormSection,
  FormField,
  FormRow,
  SmartFieldGroup,
  PriorityField,
} from "@/components/ui/enhanced-form-layout";

import {
  EnhancedInput,
  EnhancedTextarea,
  SearchInput,
  TagInput,
  EnhancedCombobox,
} from "@/components/ui/enhanced-form-controls";

import {
  SmartFormWizard,
  WizardStep,
  WizardValidationResult,
  useWizard,
} from "@/components/ui/smart-form-wizard";

import { useAdvancedFormState } from "@/hooks/use-advanced-form-state";
import { useFormErrorHandler } from "@/hooks/use-form-error-handler";

import {
  Globe,
  Target,
  Users,
  Sparkles,
  Zap,
  Lightbulb,
  TrendingUp,
  FileText,
  Search,
  Plus,
  Building,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string;
  website_url?: string;
  target_keywords?: string[];
  target_audience?: string;
  content_goals?: string[];
  competitors?: string[];
  industry?: string;
  business_model?: string;
  launch_timeline?: string;
  budget_range?: string;
  team_size?: string;
  status: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface EnhancedCreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

interface ProjectFormData {
  // Basic Information
  basic: {
    name: string;
    description: string;
    website_url: string;
    industry: string;
    business_model: string;
  };

  // Target & Strategy
  strategy: {
    target_audience: string;
    target_keywords: string[];
    content_goals: string[];
    primary_objective: string;
  };

  // Competitive Analysis
  competitive: {
    competitors: string[];
    competitive_advantages: string[];
    market_position: string;
  };

  // Project Setup
  setup: {
    launch_timeline: string;
    budget_range: string;
    team_size: string;
    success_metrics: string[];
    priority_level: string;
  };
}

const initialFormData: ProjectFormData = {
  basic: {
    name: "",
    description: "",
    website_url: "",
    industry: "",
    business_model: "",
  },
  strategy: {
    target_audience: "",
    target_keywords: [],
    content_goals: [],
    primary_objective: "",
  },
  competitive: {
    competitors: [],
    competitive_advantages: [],
    market_position: "",
  },
  setup: {
    launch_timeline: "",
    budget_range: "",
    team_size: "",
    success_metrics: [],
    priority_level: "medium",
  },
};

// Step Components
const BasicInformationStep: React.FC = () => {
  const { data, updateData } = useWizard();
  const basicData = data["basic"] || {};

  const updateBasicField = (field: string, value: any) => {
    updateData("basic", { ...basicData, [field]: value });
  };

  const industryOptions = [
    {
      label: "Technology",
      value: "technology",
      description: "Software, SaaS, Hardware",
    },
    {
      label: "E-commerce",
      value: "ecommerce",
      description: "Online retail, Marketplaces",
    },
    {
      label: "Healthcare",
      value: "healthcare",
      description: "Medical, Wellness, Pharma",
    },
    {
      label: "Finance",
      value: "finance",
      description: "Fintech, Banking, Insurance",
    },
    {
      label: "Education",
      value: "education",
      description: "EdTech, Training, Courses",
    },
    {
      label: "Media",
      value: "media",
      description: "Publishing, Entertainment, News",
    },
    {
      label: "Real Estate",
      value: "realestate",
      description: "Property, Construction",
    },
    {
      label: "Food & Beverage",
      value: "food",
      description: "Restaurants, CPG, Agriculture",
    },
    {
      label: "Travel",
      value: "travel",
      description: "Tourism, Hospitality, Transport",
    },
    { label: "Other", value: "other", description: "Custom industry" },
  ];

  const businessModelOptions = [
    {
      label: "B2B SaaS",
      value: "b2b_saas",
      description: "Business software solutions",
    },
    {
      label: "B2C E-commerce",
      value: "b2c_ecommerce",
      description: "Direct consumer sales",
    },
    {
      label: "Marketplace",
      value: "marketplace",
      description: "Multi-sided platform",
    },
    {
      label: "Subscription",
      value: "subscription",
      description: "Recurring revenue model",
    },
    {
      label: "Freemium",
      value: "freemium",
      description: "Free tier with premium features",
    },
    {
      label: "Service Business",
      value: "service",
      description: "Professional services",
    },
    {
      label: "Content/Media",
      value: "content",
      description: "Information and entertainment",
    },
    { label: "Other", value: "other", description: "Custom business model" },
  ];

  return (
    <FormLayoutProvider layout="single" spacing="comfortable">
      <div className="space-y-6">
        <FormSection
          title="Tell us about your project"
          description="Start with the basics - we'll help you build a comprehensive content strategy"
          icon={<Building className="h-5 w-5" />}
        >
          <FormRow columns={1} spacing="relaxed">
            <PriorityField
              priority="high"
              label="Project Name"
              description="A clear, memorable name for your content project"
              required
              helpText="Choose a name that reflects your brand or campaign focus"
            >
              <EnhancedInput
                size="lg"
                placeholder="Enter your project name..."
                value={basicData.name || ""}
                onChange={e => updateBasicField("name", e.target.value)}
                animated
                clearable
                onClear={() => updateBasicField("name", "")}
              />
            </PriorityField>

            <FormField
              label="Project Description"
              description="Describe your project goals, target audience, and key objectives"
              helpText="A good description helps our AI provide better recommendations"
              showCharacterCount
              maxLength={500}
              currentLength={basicData.description?.length || 0}
            >
              <EnhancedTextarea
                placeholder="Describe your project goals, target market, and what success looks like..."
                value={basicData.description || ""}
                onChange={e => updateBasicField("description", e.target.value)}
                autoResize
                minRows={3}
                maxRows={6}
                showCounter
                maxLength={500}
              />
            </FormField>
          </FormRow>
        </FormSection>

        <FormSection
          title="Business Context"
          description="Help us understand your business for better recommendations"
          icon={<TrendingUp className="h-5 w-5" />}
        >
          <FormRow columns={2} spacing="comfortable">
            <FormField
              label="Website URL"
              description="Your main website or landing page"
              optional
              icon={<Globe className="h-4 w-4" />}
            >
              <EnhancedInput
                type="url"
                placeholder="https://your-website.com"
                value={basicData.website_url || ""}
                onChange={e => updateBasicField("website_url", e.target.value)}
                leftIcon={<Globe className="h-4 w-4" />}
                clearable
                onClear={() => updateBasicField("website_url", "")}
              />
            </FormField>

            <FormField
              label="Industry"
              description="Your primary business sector"
              required
              icon={<Building className="h-4 w-4" />}
            >
              <EnhancedCombobox
                value={basicData.industry || ""}
                onValueChange={value => updateBasicField("industry", value)}
                options={industryOptions}
                placeholder="Select your industry..."
                searchPlaceholder="Search industries..."
                clearable
                creatable
                onCreateOption={value => {
                  // Handle custom industry creation
                  updateBasicField("industry", value);
                }}
              />
            </FormField>

            <FormField
              label="Business Model"
              description="How your business generates revenue"
              required
              span="full"
            >
              <EnhancedCombobox
                value={basicData.business_model || ""}
                onValueChange={value =>
                  updateBasicField("business_model", value)
                }
                options={businessModelOptions}
                placeholder="Select your business model..."
                searchPlaceholder="Search business models..."
                clearable
                creatable
                onCreateOption={value => {
                  updateBasicField("business_model", value);
                }}
              />
            </FormField>
          </FormRow>
        </FormSection>
      </div>
    </FormLayoutProvider>
  );
};

const StrategyDefinitionStep: React.FC = () => {
  const { data, updateData } = useWizard();
  const strategyData = data["strategy"] || {};

  const updateStrategyField = (field: string, value: any) => {
    updateData("strategy", { ...strategyData, [field]: value });
  };

  const contentGoalSuggestions = [
    "Increase brand awareness",
    "Generate qualified leads",
    "Drive website traffic",
    "Improve SEO rankings",
    "Build thought leadership",
    "Engage social media audience",
    "Convert prospects to customers",
    "Retain existing customers",
    "Launch new product/service",
    "Enter new market",
  ];

  const keywordSuggestions = [
    "digital marketing",
    "content strategy",
    "SEO optimization",
    "brand building",
    "lead generation",
    "customer acquisition",
    "growth hacking",
    "conversion optimization",
  ];

  const objectiveOptions = [
    {
      label: "Brand Awareness",
      value: "awareness",
      description: "Increase visibility and recognition",
    },
    {
      label: "Lead Generation",
      value: "leads",
      description: "Capture qualified prospects",
    },
    {
      label: "Customer Acquisition",
      value: "acquisition",
      description: "Convert leads to customers",
    },
    {
      label: "Customer Retention",
      value: "retention",
      description: "Keep existing customers engaged",
    },
    {
      label: "Thought Leadership",
      value: "leadership",
      description: "Establish industry authority",
    },
    {
      label: "Product Launch",
      value: "launch",
      description: "Introduce new offerings",
    },
    {
      label: "Market Expansion",
      value: "expansion",
      description: "Enter new markets or segments",
    },
  ];

  return (
    <FormLayoutProvider layout="single" spacing="comfortable">
      <div className="space-y-6">
        <FormSection
          title="Define Your Strategy"
          description="Set clear objectives and identify your target audience"
          icon={<Target className="h-5 w-5" />}
        >
          <FormRow columns={1} spacing="relaxed">
            <PriorityField
              priority="high"
              label="Primary Objective"
              description="What's the main goal for this content project?"
              required
              helpText="Choose the primary outcome you want to achieve"
            >
              <EnhancedCombobox
                value={strategyData.primary_objective || ""}
                onValueChange={value =>
                  updateStrategyField("primary_objective", value)
                }
                options={objectiveOptions}
                placeholder="Select your primary objective..."
                searchPlaceholder="Search objectives..."
                clearable
              />
            </PriorityField>

            <FormField
              label="Target Audience"
              description="Describe your ideal customer or audience segment"
              required
              helpText="Be specific about demographics, psychographics, and pain points"
              showCharacterCount
              maxLength={300}
              currentLength={strategyData.target_audience?.length || 0}
            >
              <EnhancedTextarea
                placeholder="Small business owners aged 25-45 who struggle with digital marketing and need simple, effective solutions..."
                value={strategyData.target_audience || ""}
                onChange={e =>
                  updateStrategyField("target_audience", e.target.value)
                }
                autoResize
                minRows={2}
                maxRows={4}
                showCounter
                maxLength={300}
              />
            </FormField>
          </FormRow>
        </FormSection>

        <FormSection
          title="Content Focus"
          description="Define your keywords and content goals"
          icon={<FileText className="h-5 w-5" />}
        >
          <FormRow columns={1} spacing="comfortable">
            <FormField
              label="Target Keywords"
              description="Keywords you want to rank for or target in your content"
              helpText="Add 5-15 relevant keywords for optimal focus"
              badge={
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="mr-1 h-3 w-3" />
                  AI Powered
                </Badge>
              }
            >
              <TagInput
                value={strategyData.target_keywords || []}
                onChange={keywords =>
                  updateStrategyField("target_keywords", keywords)
                }
                suggestions={keywordSuggestions}
                placeholder="Add target keywords..."
                maxTags={15}
                allowDuplicates={false}
              />
            </FormField>

            <FormField
              label="Content Goals"
              description="Specific objectives your content should achieve"
              helpText="Select 3-6 primary goals to maintain focus"
            >
              <TagInput
                value={strategyData.content_goals || []}
                onChange={goals => updateStrategyField("content_goals", goals)}
                suggestions={contentGoalSuggestions}
                placeholder="Add content goals..."
                maxTags={8}
                allowDuplicates={false}
              />
            </FormField>
          </FormRow>
        </FormSection>
      </div>
    </FormLayoutProvider>
  );
};

const CompetitiveAnalysisStep: React.FC = () => {
  const { data, updateData } = useWizard();
  const competitiveData = data["competitive"] || {};

  const updateCompetitiveField = (field: string, value: any) => {
    updateData("competitive", { ...competitiveData, [field]: value });
  };

  const positionOptions = [
    {
      label: "Market Leader",
      value: "leader",
      description: "Dominant position in the market",
    },
    {
      label: "Challenger",
      value: "challenger",
      description: "Competing with market leaders",
    },
    {
      label: "Follower",
      value: "follower",
      description: "Following market trends",
    },
    {
      label: "Niche Player",
      value: "niche",
      description: "Specialized market segment",
    },
    {
      label: "Disruptor",
      value: "disruptor",
      description: "Changing the market dynamics",
    },
    {
      label: "New Entrant",
      value: "new",
      description: "Recently entered the market",
    },
  ];

  const advantageSuggestions = [
    "Superior product quality",
    "Lower pricing",
    "Better customer service",
    "Faster delivery",
    "More features",
    "Better user experience",
    "Strong brand reputation",
    "Wider distribution",
    "Industry expertise",
    "Innovation capability",
  ];

  return (
    <FormLayoutProvider layout="single" spacing="comfortable">
      <div className="space-y-6">
        <FormSection
          title="Competitive Landscape"
          description="Understand your competitive position and advantages"
          icon={<Users className="h-5 w-5" />}
        >
          <FormRow columns={1} spacing="comfortable">
            <FormField
              label="Market Position"
              description="How do you position yourself in the market?"
              required
            >
              <EnhancedCombobox
                value={competitiveData.market_position || ""}
                onValueChange={value =>
                  updateCompetitiveField("market_position", value)
                }
                options={positionOptions}
                placeholder="Select your market position..."
                searchPlaceholder="Search positions..."
                clearable
              />
            </FormField>

            <FormField
              label="Key Competitors"
              description="Add competitor websites for analysis"
              helpText="We'll analyze their content strategy to provide insights"
              optional
              badge={
                <Badge variant="outline" className="text-xs">
                  <Search className="mr-1 h-3 w-3" />
                  Auto Analysis
                </Badge>
              }
            >
              <TagInput
                value={competitiveData.competitors || []}
                onChange={competitors =>
                  updateCompetitiveField("competitors", competitors)
                }
                placeholder="Add competitor websites..."
                maxTags={10}
                allowDuplicates={false}
              />
            </FormField>

            <FormField
              label="Competitive Advantages"
              description="What makes you better than competitors?"
              helpText="Highlight your unique value propositions"
            >
              <TagInput
                value={competitiveData.competitive_advantages || []}
                onChange={advantages =>
                  updateCompetitiveField("competitive_advantages", advantages)
                }
                suggestions={advantageSuggestions}
                placeholder="Add your competitive advantages..."
                maxTags={8}
                allowDuplicates={false}
              />
            </FormField>
          </FormRow>
        </FormSection>
      </div>
    </FormLayoutProvider>
  );
};

const ProjectSetupStep: React.FC = () => {
  const { data, updateData } = useWizard();
  const setupData = data["setup"] || {};

  const updateSetupField = (field: string, value: any) => {
    updateData("setup", { ...setupData, [field]: value });
  };

  const timelineOptions = [
    {
      label: "Immediate (0-1 month)",
      value: "immediate",
      description: "Quick launch needed",
    },
    {
      label: "Short-term (1-3 months)",
      value: "short",
      description: "Near-term objectives",
    },
    {
      label: "Medium-term (3-6 months)",
      value: "medium",
      description: "Standard timeline",
    },
    {
      label: "Long-term (6-12 months)",
      value: "long",
      description: "Strategic initiative",
    },
    { label: "Ongoing", value: "ongoing", description: "Continuous program" },
  ];

  const budgetOptions = [
    {
      label: "Startup ($0-5K)",
      value: "startup",
      description: "Limited budget, DIY approach",
    },
    {
      label: "Small Business ($5-25K)",
      value: "small",
      description: "Basic content program",
    },
    {
      label: "Growth Stage ($25-100K)",
      value: "growth",
      description: "Scaling content efforts",
    },
    {
      label: "Enterprise ($100K+)",
      value: "enterprise",
      description: "Comprehensive strategy",
    },
    {
      label: "Custom Budget",
      value: "custom",
      description: "Specific requirements",
    },
  ];

  const teamSizeOptions = [
    {
      label: "Solo (1 person)",
      value: "solo",
      description: "Individual contributor",
    },
    {
      label: "Small Team (2-5)",
      value: "small",
      description: "Core team members",
    },
    {
      label: "Medium Team (6-15)",
      value: "medium",
      description: "Dedicated content team",
    },
    {
      label: "Large Team (15+)",
      value: "large",
      description: "Multiple content teams",
    },
  ];

  const priorityOptions = [
    {
      label: "Low Priority",
      value: "low",
      description: "Nice to have, flexible timeline",
    },
    {
      label: "Medium Priority",
      value: "medium",
      description: "Important but not urgent",
    },
    {
      label: "High Priority",
      value: "high",
      description: "Critical business objective",
    },
    {
      label: "Urgent",
      value: "urgent",
      description: "Top priority, immediate attention",
    },
  ];

  const metricsSuggestions = [
    "Website traffic increase",
    "Lead generation volume",
    "Conversion rate improvement",
    "Social media engagement",
    "Search engine rankings",
    "Brand awareness metrics",
    "Customer acquisition cost",
    "Return on investment",
    "Email list growth",
    "Content engagement rate",
  ];

  return (
    <FormLayoutProvider layout="two-column" spacing="comfortable">
      <div className="space-y-6">
        <FormSection
          title="Project Timeline & Resources"
          description="Set expectations for timeline, budget, and success metrics"
          icon={<Calendar className="h-5 w-5" />}
        >
          <FormRow columns={2} spacing="comfortable">
            <FormField
              label="Launch Timeline"
              description="When do you want to launch?"
              required
              icon={<Clock className="h-4 w-4" />}
            >
              <EnhancedCombobox
                value={setupData.launch_timeline || ""}
                onValueChange={value =>
                  updateSetupField("launch_timeline", value)
                }
                options={timelineOptions}
                placeholder="Select timeline..."
                clearable
              />
            </FormField>

            <FormField
              label="Budget Range"
              description="Estimated budget for content"
              required
              icon={<Target className="h-4 w-4" />}
            >
              <EnhancedCombobox
                value={setupData.budget_range || ""}
                onValueChange={value => updateSetupField("budget_range", value)}
                options={budgetOptions}
                placeholder="Select budget range..."
                clearable
              />
            </FormField>

            <FormField
              label="Team Size"
              description="Content team members"
              required
              icon={<Users className="h-4 w-4" />}
            >
              <EnhancedCombobox
                value={setupData.team_size || ""}
                onValueChange={value => updateSetupField("team_size", value)}
                options={teamSizeOptions}
                placeholder="Select team size..."
                clearable
              />
            </FormField>

            <FormField
              label="Priority Level"
              description="Project importance"
              required
              icon={<Zap className="h-4 w-4" />}
            >
              <EnhancedCombobox
                value={setupData.priority_level || "medium"}
                onValueChange={value =>
                  updateSetupField("priority_level", value)
                }
                options={priorityOptions}
                placeholder="Select priority..."
                clearable
              />
            </FormField>
          </FormRow>

          <FormRow columns={1} spacing="comfortable">
            <FormField
              label="Success Metrics"
              description="How will you measure the success of this project?"
              helpText="Define 3-5 key metrics to track progress"
              span="full"
            >
              <TagInput
                value={setupData.success_metrics || []}
                onChange={metrics =>
                  updateSetupField("success_metrics", metrics)
                }
                suggestions={metricsSuggestions}
                placeholder="Add success metrics..."
                maxTags={8}
                allowDuplicates={false}
              />
            </FormField>
          </FormRow>
        </FormSection>

        <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
          <div className="flex items-start space-x-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-blue-900">
                🎉 You&apos;re all set to create an amazing project!
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-blue-700">
                Based on your inputs, we&apos;ll create a comprehensive content
                strategy with:
              </p>
              <ul className="space-y-1 text-sm text-blue-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>AI-powered competitor analysis</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Personalized content recommendations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>SEO optimization suggestions</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Performance tracking dashboard</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </FormLayoutProvider>
  );
};

// Main Modal Component
export const EnhancedCreateProjectModal: React.FC<
  EnhancedCreateProjectModalProps
> = ({ open, onClose, onProjectCreated }) => {
  const { currentTeam, session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advanced form state with auto-save and persistence
  const formState = useAdvancedFormState(initialFormData, {
    autoSave: {
      enabled: true,
      interval: 30000, // 30 seconds
      debounceMs: 2000,
      onSave: async data => {
        // Auto-save to localStorage or API
        localStorage.setItem("draft-project", JSON.stringify(data));
      },
    },
    persistence: {
      enabled: true,
      key: "project-creation-draft",
      storage: "localStorage",
      expireAfter: 24 * 60 * 60 * 1000, // 24 hours
    },
    changeTracking: {
      enabled: true,
      granular: true,
      maxHistory: 50,
    },
  });

  // Error handling
  const errorHandler = useFormErrorHandler({
    enableRecovery: true,
    maxRetries: 3,
    autoHideDelay: 10000,
  });

  // Wizard steps configuration
  const wizardSteps: WizardStep[] = useMemo(
    () => [
      {
        id: "basic",
        title: "Basic Info",
        description: "Project fundamentals",
        icon: <Building className="h-4 w-4" />,
        component: BasicInformationStep,
        required: true,
        skippable: false,
        repeatable: true,
        estimatedTime: 3,
        complexity: "easy",
        helpContent: (
          <div className="space-y-3">
            <p className="text-sm">
              Start with the essential information about your project. A clear
              name and description help our AI provide better recommendations.
            </p>
          </div>
        ),
        tips: [
          "Choose a memorable project name that reflects your brand",
          "Be specific about your target audience",
          "Include your website for automated analysis",
        ],
        validate: async data => {
          const basic = data.basic || {};
          const errors: string[] = [];
          const warnings: string[] = [];
          const suggestions: string[] = [];

          if (!basic.name?.trim()) {
            errors.push("Project name is required");
          } else if (basic.name.length < 3) {
            warnings.push("Project name seems too short");
          }

          if (!basic.description?.trim()) {
            warnings.push(
              "Adding a description will improve AI recommendations"
            );
          }

          if (!basic.industry) {
            errors.push("Industry selection is required");
          }

          if (!basic.business_model) {
            errors.push("Business model selection is required");
          }

          if (basic.website_url && !/^https?:\/\/.+/.test(basic.website_url)) {
            errors.push("Website URL must include http:// or https://");
          }

          if (basic.description && basic.description.length < 50) {
            suggestions.push(
              "Consider adding more detail to your description for better recommendations"
            );
          }

          const completionScore =
            [
              basic.name?.trim(),
              basic.description?.trim(),
              basic.industry,
              basic.business_model,
              basic.website_url?.trim(),
            ].filter(Boolean).length * 20;

          return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions,
            completionScore,
          };
        },
      },
      {
        id: "strategy",
        title: "Strategy",
        description: "Goals & targeting",
        icon: <Target className="h-4 w-4" />,
        component: StrategyDefinitionStep,
        required: true,
        skippable: false,
        repeatable: true,
        estimatedTime: 5,
        complexity: "medium",
        dependsOn: ["basic"],
        helpContent: (
          <div className="space-y-3">
            <p className="text-sm">
              Define your content strategy and objectives. Clear goals help
              create focused, effective content that drives results.
            </p>
          </div>
        ),
        tips: [
          "Be specific about your target audience demographics",
          "Focus on 5-15 primary keywords for best results",
          "Align content goals with business objectives",
        ],
        validate: async data => {
          const strategy = data.strategy || {};
          const errors: string[] = [];
          const warnings: string[] = [];
          const suggestions: string[] = [];

          if (!strategy.primary_objective) {
            errors.push("Primary objective is required");
          }

          if (!strategy.target_audience?.trim()) {
            errors.push("Target audience description is required");
          } else if (strategy.target_audience.length < 30) {
            warnings.push("Target audience description could be more detailed");
          }

          if (!strategy.target_keywords?.length) {
            warnings.push(
              "Adding target keywords will improve SEO recommendations"
            );
          } else if (strategy.target_keywords.length > 15) {
            suggestions.push(
              "Consider focusing on fewer, more specific keywords"
            );
          }

          if (!strategy.content_goals?.length) {
            warnings.push("Content goals help focus your strategy");
          }

          const completionScore =
            [
              strategy.primary_objective,
              strategy.target_audience?.trim(),
              strategy.target_keywords?.length > 0,
              strategy.content_goals?.length > 0,
            ].filter(Boolean).length * 25;

          return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions,
            completionScore,
          };
        },
      },
      {
        id: "competitive",
        title: "Competition",
        description: "Market analysis",
        icon: <Users className="h-4 w-4" />,
        component: CompetitiveAnalysisStep,
        required: false,
        skippable: true,
        repeatable: true,
        estimatedTime: 4,
        complexity: "medium",
        dependsOn: ["strategy"],
        helpContent: (
          <div className="space-y-3">
            <p className="text-sm">
              Understanding your competitive landscape helps position your
              content effectively and identify opportunities.
            </p>
          </div>
        ),
        tips: [
          "Add 3-5 key competitors for comprehensive analysis",
          "Focus on direct competitors in your space",
          "Identify what makes you unique",
        ],
        validate: async data => {
          const competitive = data.competitive || {};
          const errors: string[] = [];
          const warnings: string[] = [];
          const suggestions: string[] = [];

          if (!competitive.market_position) {
            errors.push("Market position is required");
          }

          if (!competitive.competitors?.length) {
            warnings.push(
              "Adding competitors enables powerful analysis features"
            );
          } else if (competitive.competitors.length < 3) {
            suggestions.push("Adding 3-5 competitors provides better insights");
          }

          if (!competitive.competitive_advantages?.length) {
            warnings.push("Defining competitive advantages helps positioning");
          }

          const completionScore =
            [
              competitive.market_position,
              competitive.competitors?.length > 0,
              competitive.competitive_advantages?.length > 0,
            ].filter(Boolean).length * 33;

          return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions,
            completionScore,
          };
        },
      },
      {
        id: "setup",
        title: "Setup",
        description: "Timeline & resources",
        icon: <Calendar className="h-4 w-4" />,
        component: ProjectSetupStep,
        required: true,
        skippable: false,
        repeatable: true,
        estimatedTime: 3,
        complexity: "easy",
        dependsOn: ["strategy"],
        helpContent: (
          <div className="space-y-3">
            <p className="text-sm">
              Set realistic timelines and define success metrics to track your
              project&apos;s progress and ROI.
            </p>
          </div>
        ),
        tips: [
          "Be realistic about timelines and resources",
          "Define measurable success metrics",
          "Consider your team's capacity",
        ],
        validate: async data => {
          const setup = data.setup || {};
          const errors: string[] = [];
          const warnings: string[] = [];
          const suggestions: string[] = [];

          if (!setup.launch_timeline) {
            errors.push("Launch timeline is required");
          }

          if (!setup.budget_range) {
            errors.push("Budget range is required");
          }

          if (!setup.team_size) {
            errors.push("Team size is required");
          }

          if (!setup.priority_level) {
            errors.push("Priority level is required");
          }

          if (!setup.success_metrics?.length) {
            warnings.push("Success metrics help track progress");
          } else if (setup.success_metrics.length < 3) {
            suggestions.push(
              "Consider adding 3-5 key metrics for comprehensive tracking"
            );
          }

          const completionScore =
            [
              setup.launch_timeline,
              setup.budget_range,
              setup.team_size,
              setup.priority_level,
              setup.success_metrics?.length > 0,
            ].filter(Boolean).length * 20;

          return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions,
            completionScore,
          };
        },
      },
    ],
    []
  );

  // Handle wizard completion
  const handleWizardComplete = async (data: ProjectFormData) => {
    if (!currentTeam?.id) {
      errorHandler.addError(new Error("No team selected"), undefined, {
        operation: "project_creation",
        step: "validation",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Transform form data to API format
      const payload = {
        teamId: currentTeam.id,
        name: data.basic.name,
        description: data.basic.description || undefined,
        website_url: data.basic.website_url || undefined,
        industry: data.basic.industry,
        business_model: data.basic.business_model,
        target_keywords: data.strategy.target_keywords || [],
        target_audience: data.strategy.target_audience || undefined,
        content_goals: data.strategy.content_goals || [],
        primary_objective: data.strategy.primary_objective,
        competitors: data.competitive.competitors || [],
        competitive_advantages: data.competitive.competitive_advantages || [],
        market_position: data.competitive.market_position,
        launch_timeline: data.setup.launch_timeline,
        budget_range: data.setup.budget_range,
        team_size: data.setup.team_size,
        priority_level: data.setup.priority_level,
        success_metrics: data.setup.success_metrics || [],
        settings: {
          wizard_version: "2.0",
          created_with_enhanced_modal: true,
          auto_save_enabled: true,
        },
      };

      // Use production-grade authenticated fetch
      const authContext = {
        session,
        refreshSession: async () => {
          const {
            data: { session: newSession },
          } = await supabase.auth.getSession();
          if (newSession) {
            console.log("🔄 Session refreshed for project creation");
          }
        },
      };

      const response = await authenticatedFetch(
        "/api/projects",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        authContext
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      const result = await response.json();

      // Clear draft data
      formState.clearStorage();
      localStorage.removeItem("draft-project");

      // Notify parent component
      onProjectCreated(result.project);

      // Reset form and close
      formState.resetForm();
      onClose();
    } catch (err) {
      console.error("Error creating project:", err);

      if (err instanceof AuthenticationError) {
        errorHandler.handleTypedError(err);
      } else if (err instanceof CSRFError) {
        errorHandler.handleTypedError(err);
      } else {
        errorHandler.addError(err, undefined, {
          operation: "project_creation",
          teamId: currentTeam?.id,
          formData: data,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EnhancedDialog
      open={open}
      onOpenChange={onClose}
      size="xl"
      position="center"
      animation="scale"
      closable={!isSubmitting}
      preventClose={isSubmitting}
    >
      <EnhancedDialogContent
        className="max-h-[90vh] overflow-hidden"
        data-content=""
      >
        <EnhancedDialogHeader
          closable={!isSubmitting}
          onClose={onClose}
          showControls
        >
          <EnhancedDialogTitle
            icon={
              <div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-2 text-white">
                <Plus className="h-5 w-5" />
              </div>
            }
            subtitle="Create a comprehensive content strategy with AI-powered insights"
            badge={
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Enhanced
              </Badge>
            }
          >
            Create New Project
          </EnhancedDialogTitle>
        </EnhancedDialogHeader>

        <EnhancedDialogBody padding="none" scrollable data-modal-body="">
          <SmartFormWizard
            steps={wizardSteps}
            initialData={formState.data}
            onComplete={handleWizardComplete}
            onDataChange={formState.setData}
            allowBackNavigation={!isSubmitting}
            showProgress
            showStepNumbers
            showTimeEstimates
            adaptiveNavigation
            className="p-6"
          />
        </EnhancedDialogBody>
      </EnhancedDialogContent>
    </EnhancedDialog>
  );
};
