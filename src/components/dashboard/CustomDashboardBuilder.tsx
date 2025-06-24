'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Settings, 
  Save, 
  Share, 
  Copy, 
  Trash2,
  Move,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Users,
  Eye,
  Target,
  Activity,
  Grid,
  Maximize2,
  Minimize2,
  RotateCcw,
  Download
} from 'lucide-react';

interface DashboardWidget {
  id: string;
  type: 'performance_chart' | 'prediction_graph' | 'competitor_comparison' | 
        'keyword_trends' | 'team_metrics' | 'content_pipeline' | 'roi_calculator' | 'custom_metric';
  title: string;
  config: {
    dataSource: string;
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'gauge';
    metrics?: string[];
    timeRange?: string;
    filters?: Record<string, any>;
    refreshInterval?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    colorScheme?: string;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex?: number;
  };
  isVisible: boolean;
}

interface CustomDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: {
    gridSize: number;
    columns: number;
    gap: number;
  };
  settings: {
    isShared: boolean;
    isTemplate: boolean;
    refreshInterval: number;
    theme: 'light' | 'dark' | 'auto';
  };
  permissions: {
    canEdit: boolean;
    canShare: boolean;
    canDelete: boolean;
  };
}

interface CustomDashboardBuilderProps {
  projectId: string;
  dashboardId?: string;
  onSave?: (dashboard: CustomDashboard) => void;
  onCancel?: () => void;
}

const WIDGET_TYPES = [
  {
    type: 'performance_chart',
    name: 'Performance Chart',
    icon: BarChart3,
    description: 'Display content performance metrics over time',
    category: 'Analytics',
  },
  {
    type: 'prediction_graph',
    name: 'Prediction Graph',
    icon: TrendingUp,
    description: 'Show ML-powered performance predictions',
    category: 'Predictions',
  },
  {
    type: 'competitor_comparison',
    name: 'Competitor Comparison',
    icon: Users,
    description: 'Compare performance with competitors',
    category: 'Competition',
  },
  {
    type: 'keyword_trends',
    name: 'Keyword Trends',
    icon: Target,
    description: 'Track keyword ranking trends',
    category: 'SEO',
  },
  {
    type: 'team_metrics',
    name: 'Team Metrics',
    icon: Users,
    description: 'Team performance and collaboration metrics',
    category: 'Team',
  },
  {
    type: 'content_pipeline',
    name: 'Content Pipeline',
    icon: Activity,
    description: 'Content creation and optimization pipeline',
    category: 'Content',
  },
  {
    type: 'roi_calculator',
    name: 'ROI Calculator',
    icon: LineChart,
    description: 'Calculate content marketing ROI',
    category: 'Business',
  },
  {
    type: 'custom_metric',
    name: 'Custom Metric',
    icon: Grid,
    description: 'Create custom metric visualizations',
    category: 'Custom',
  },
];

const CHART_TYPES = [
  { value: 'line', label: 'Line Chart', icon: LineChart },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'pie', label: 'Pie Chart', icon: PieChart },
  { value: 'area', label: 'Area Chart', icon: Activity },
  { value: 'gauge', label: 'Gauge', icon: Target },
];

const COLOR_SCHEMES = [
  { value: 'default', label: 'Default', colors: ['#8884d8', '#82ca9d', '#ffc658'] },
  { value: 'blue', label: 'Blue', colors: ['#1f77b4', '#aec7e8', '#c5dbf2'] },
  { value: 'green', label: 'Green', colors: ['#2ca02c', '#98df8a', '#c4e8c4'] },
  { value: 'orange', label: 'Orange', colors: ['#ff7f0e', '#ffbb78', '#ffd4a3'] },
  { value: 'purple', label: 'Purple', colors: ['#9467bd', '#c5b0d5', '#d6c7dd'] },
];

export function CustomDashboardBuilder({ 
  projectId, 
  dashboardId, 
  onSave, 
  onCancel 
}: CustomDashboardBuilderProps) {
  const [dashboard, setDashboard] = useState<CustomDashboard>({
    id: dashboardId || '',
    name: '',
    description: '',
    widgets: [],
    layout: {
      gridSize: 8,
      columns: 12,
      gap: 16,
    },
    settings: {
      isShared: false,
      isTemplate: false,
      refreshInterval: 300,
      theme: 'auto',
    },
    permissions: {
      canEdit: true,
      canShare: true,
      canDelete: true,
    },
  });

  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null);
  const [isEditingWidget, setIsEditingWidget] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    if (dashboardId) {
      loadDashboard();
    }
  }, [dashboardId]);

  const loadDashboard = async () => {
    try {
      const response = await fetch(`/api/dashboard/${dashboardId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const saveDashboard = async () => {
    try {
      const response = await fetch('/api/dashboard', {
        method: dashboardId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...dashboard,
          projectId,
        }),
      });

      if (response.ok) {
        const savedDashboard = await response.json();
        setDashboard(savedDashboard);
        if (onSave) {
          onSave(savedDashboard);
        }
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    }
  };

  const addWidget = useCallback((type: DashboardWidget['type']) => {
    const newWidget: DashboardWidget = {
      id: `widget_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
      type,
      title: WIDGET_TYPES.find(w => w.type === type)?.name || 'New Widget',
      config: {
        dataSource: 'content_analytics',
        chartType: 'line',
        metrics: ['pageviews'],
        timeRange: '30d',
        refreshInterval: 300,
        showLegend: true,
        showGrid: true,
        colorScheme: 'default',
      },
      position: {
        x: 0,
        y: 0,
        width: 4,
        height: 3,
        zIndex: dashboard.widgets.length + 1,
      },
      isVisible: true,
    };

    // Find empty position
    const position = findEmptyPosition(newWidget.position.width, newWidget.position.height);
    newWidget.position = { ...newWidget.position, ...position };

    setDashboard(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));
  }, [dashboard.widgets]);

  const updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, ...updates } : widget
      ),
    }));
  }, []);

  const deleteWidget = useCallback((widgetId: string) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.filter(widget => widget.id !== widgetId),
    }));
    setSelectedWidget(null);
  }, []);

  const duplicateWidget = useCallback((widget: DashboardWidget) => {
    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
      title: `${widget.title} (Copy)`,
      position: {
        ...widget.position,
        x: widget.position.x + 1,
        y: widget.position.y + 1,
        zIndex: dashboard.widgets.length + 1,
      },
    };

    setDashboard(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));
  }, [dashboard.widgets]);

  const findEmptyPosition = (width: number, height: number) => {
    const { columns } = dashboard.layout;
    
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x <= columns - width; x++) {
        const isOccupied = dashboard.widgets.some(widget => {
          const wx = widget.position.x;
          const wy = widget.position.y;
          const ww = widget.position.width;
          const wh = widget.position.height;
          
          return !(x + width <= wx || x >= wx + ww || y + height <= wy || y >= wy + wh);
        });
        
        if (!isOccupied) {
          return { x, y };
        }
      }
    }
    
    return { x: 0, y: 0 };
  };

  const handleWidgetClick = (widget: DashboardWidget, event: React.MouseEvent) => {
    if (isPreviewMode) return;
    
    event.stopPropagation();
    setSelectedWidget(widget);
  };

  const handleWidgetDoubleClick = (widget: DashboardWidget) => {
    if (isPreviewMode) return;
    
    setSelectedWidget(widget);
    setIsEditingWidget(true);
  };

  const renderWidgetPreview = (widget: DashboardWidget) => {
    const widgetType = WIDGET_TYPES.find(w => w.type === widget.type);
    const Icon = widgetType?.icon || Grid;

    return (
      <div
        key={widget.id}
        className={`
          absolute border rounded-lg bg-white shadow-sm transition-all duration-200
          ${selectedWidget?.id === widget.id ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md'}
          ${isDragging && selectedWidget?.id === widget.id ? 'opacity-50' : ''}
          ${!widget.isVisible ? 'opacity-30' : ''}
        `}
        style={{
          left: `${(widget.position.x / dashboard.layout.columns) * 100}%`,
          top: `${widget.position.y * 60}px`,
          width: `${(widget.position.width / dashboard.layout.columns) * 100}%`,
          height: `${widget.position.height * 60}px`,
          zIndex: widget.position.zIndex || 1,
        }}
        onClick={(e) => handleWidgetClick(widget, e)}
        onDoubleClick={() => handleWidgetDoubleClick(widget)}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm">{widget.title}</span>
            </div>
            {!isPreviewMode && selectedWidget?.id === widget.id && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingWidget(true);
                  }}
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateWidget(widget);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteWidget(widget.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-200">
            <div className="text-center">
              <Icon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">{widgetType?.description}</p>
              <Badge variant="outline" className="mt-2 text-xs">
                {widget.config.chartType || 'Chart'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">Dashboard Builder</h2>
              <p className="text-sm text-gray-600">
                {dashboard.name || 'Untitled Dashboard'}
              </p>
            </div>
            <Switch
              checked={isPreviewMode}
              onCheckedChange={setIsPreviewMode}
            />
            <Label className="text-sm">Preview Mode</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Dashboard Settings</SheetTitle>
                  <SheetDescription>
                    Configure your dashboard properties and preferences
                  </SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="dashboard-name">Dashboard Name</Label>
                    <Input
                      id="dashboard-name"
                      value={dashboard.name}
                      onChange={(e) => setDashboard(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter dashboard name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dashboard-description">Description</Label>
                    <Textarea
                      id="dashboard-description"
                      value={dashboard.description}
                      onChange={(e) => setDashboard(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your dashboard"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is-shared">Share with team</Label>
                      <Switch
                        id="is-shared"
                        checked={dashboard.settings.isShared}
                        onCheckedChange={(checked) => 
                          setDashboard(prev => ({
                            ...prev,
                            settings: { ...prev.settings, isShared: checked }
                          }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is-template">Save as template</Label>
                      <Switch
                        id="is-template"
                        checked={dashboard.settings.isTemplate}
                        onCheckedChange={(checked) => 
                          setDashboard(prev => ({
                            ...prev,
                            settings: { ...prev.settings, isTemplate: checked }
                          }))
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                    <Select
                      value={dashboard.settings.refreshInterval.toString()}
                      onValueChange={(value) => 
                        setDashboard(prev => ({
                          ...prev,
                          settings: { ...prev.settings, refreshInterval: parseInt(value) }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="900">15 minutes</SelectItem>
                        <SelectItem value="1800">30 minutes</SelectItem>
                        <SelectItem value="3600">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Widget
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Add Widget</DialogTitle>
                  <DialogDescription>
                    Choose a widget type to add to your dashboard
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="analytics" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="predictions">Predictions</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                    <TabsTrigger value="custom">Custom</TabsTrigger>
                  </TabsList>
                  
                  {['analytics', 'predictions', 'team', 'custom'].map(category => (
                    <TabsContent key={category} value={category} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {WIDGET_TYPES
                          .filter(widget => widget.category.toLowerCase() === category)
                          .map(widget => {
                            const Icon = widget.icon;
                            return (
                              <Card
                                key={widget.type}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => addWidget(widget.type)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <Icon className="h-8 w-8 text-blue-600 flex-shrink-0" />
                                    <div>
                                      <h3 className="font-medium">{widget.name}</h3>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {widget.description}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </DialogContent>
            </Dialog>
            
            <Button onClick={saveDashboard} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            
            {onCancel && (
              <Button variant="outline" onClick={onCancel} size="sm">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Canvas */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="p-4">
          <div
            className="relative bg-white rounded-lg border min-h-[600px]"
            style={{
              backgroundImage: isPreviewMode ? 'none' : `
                linear-gradient(to right, #f3f4f6 1px, transparent 1px),
                linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)
              `,
              backgroundSize: `${100 / dashboard.layout.columns}% 60px`,
            }}
            onClick={() => setSelectedWidget(null)}
          >
            {dashboard.widgets.map(renderWidgetPreview)}
            
            {dashboard.widgets.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Grid className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Your dashboard is empty
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Add widgets to start building your custom dashboard
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Widget
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Add Widget</DialogTitle>
                        <DialogDescription>
                          Choose a widget type to add to your dashboard
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {WIDGET_TYPES.map(widget => {
                          const Icon = widget.icon;
                          return (
                            <Card
                              key={widget.type}
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => addWidget(widget.type)}
                            >
                              <CardContent className="p-4">
                                <div className="text-center">
                                  <Icon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                  <h3 className="font-medium">{widget.name}</h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {widget.description}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget Configuration Dialog */}
      {selectedWidget && isEditingWidget && (
        <Dialog open={isEditingWidget} onOpenChange={setIsEditingWidget}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configure Widget</DialogTitle>
              <DialogDescription>
                Customize the settings for your {selectedWidget.title}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="widget-title">Widget Title</Label>
                <Input
                  id="widget-title"
                  value={selectedWidget.title}
                  onChange={(e) => updateWidget(selectedWidget.id, { title: e.target.value })}
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chart-type">Chart Type</Label>
                  <Select
                    value={selectedWidget.config.chartType}
                    onValueChange={(value) => 
                      updateWidget(selectedWidget.id, {
                        config: { ...selectedWidget.config, chartType: value as any }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPES.map(chart => (
                        <SelectItem key={chart.value} value={chart.value}>
                          {chart.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="color-scheme">Color Scheme</Label>
                  <Select
                    value={selectedWidget.config.colorScheme}
                    onValueChange={(value) => 
                      updateWidget(selectedWidget.id, {
                        config: { ...selectedWidget.config, colorScheme: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_SCHEMES.map(scheme => (
                        <SelectItem key={scheme.value} value={scheme.value}>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {scheme.colors.map((color, i) => (
                                <div
                                  key={i}
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                            {scheme.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="time-range">Time Range</Label>
                  <Select
                    value={selectedWidget.config.timeRange}
                    onValueChange={(value) => 
                      updateWidget(selectedWidget.id, {
                        config: { ...selectedWidget.config, timeRange: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="refresh-interval">Refresh Interval</Label>
                  <Select
                    value={selectedWidget.config.refreshInterval?.toString()}
                    onValueChange={(value) => 
                      updateWidget(selectedWidget.id, {
                        config: { ...selectedWidget.config, refreshInterval: parseInt(value) }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="900">15 minutes</SelectItem>
                      <SelectItem value="1800">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-legend">Show Legend</Label>
                  <Switch
                    id="show-legend"
                    checked={selectedWidget.config.showLegend}
                    onCheckedChange={(checked) =>
                      updateWidget(selectedWidget.id, {
                        config: { ...selectedWidget.config, showLegend: checked }
                      })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-grid">Show Grid</Label>
                  <Switch
                    id="show-grid"
                    checked={selectedWidget.config.showGrid}
                    onCheckedChange={(checked) =>
                      updateWidget(selectedWidget.id, {
                        config: { ...selectedWidget.config, showGrid: checked }
                      })
                    }
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditingWidget(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsEditingWidget(false)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}