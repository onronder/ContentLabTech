/**
 * Competitor Management Component
 * Manage competitors with CRUD operations and analysis triggers
 */

"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetch } from "@/lib/utils/fetch";
import { useCompetitiveIntelligence } from "@/hooks/useCompetitiveIntelligence";
// import type { Competitor } from "@/lib/competitive/types";
import {
  Plus,
  Globe,
  Edit,
  Trash2,
  Play,
  AlertTriangle,
  Users,
  Target,
  Eye,
  Calendar,
} from "lucide-react";

interface CompetitorManagementProps {
  projectId?: string;
}

interface AddCompetitorFormData {
  name: string;
  domain: string;
  category: "direct" | "indirect" | "emerging" | "aspirational";
  priority: "critical" | "high" | "medium" | "low";
  status: "active" | "inactive" | "monitoring" | "archived";
  description?: string;
}

const initialFormData: AddCompetitorFormData = {
  name: "",
  domain: "",
  category: "direct",
  priority: "medium",
  status: "active",
  description: "",
};

export const CompetitorManagement: React.FC<CompetitorManagementProps> = ({
  projectId,
}) => {
  const { data, loading, error, refresh, startAnalysis, isAnalysisRunning } =
    useCompetitiveIntelligence(projectId);
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [formData, setFormData] =
    useState<AddCompetitorFormData>(initialFormData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);

  const handleAddCompetitor = useCallback(async () => {
    try {
      setIsAddingCompetitor(true);

      const response = await fetch("/api/competitive/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          domain: formData.domain,
          category: formData.category,
          priority: formData.priority,
          status: formData.status,
          metadata: {
            description: formData.description,
            tags: [],
            customFields: {},
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add competitor");
      }

      // Reset form and refresh data
      setFormData(initialFormData);
      setIsDialogOpen(false);
      await refresh();
    } catch (err) {
      console.error("Error adding competitor:", err);
      // TODO: Show error toast
    } finally {
      setIsAddingCompetitor(false);
    }
  }, [formData, refresh]);

  const handleStartAnalysis = useCallback(async () => {
    if (!projectId || selectedCompetitors.length === 0) return;

    try {
      await startAnalysis({
        targetDomain: "your-domain.com", // TODO: Get from project settings
        competitorIds: selectedCompetitors,
        analysisTypes: ["comprehensive"],
      });

      setSelectedCompetitors([]);
      // TODO: Show success toast
    } catch (err) {
      console.error("Error starting analysis:", err);
      // TODO: Show error toast
    }
  }, [projectId, selectedCompetitors, startAnalysis]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "direct":
        return "destructive";
      case "indirect":
        return "default";
      case "emerging":
        return "secondary";
      case "aspirational":
        return "outline";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "monitoring":
        return "secondary";
      case "inactive":
        return "outline";
      case "archived":
        return "outline";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Competitor Management</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                  <div className="h-3 w-2/3 rounded bg-gray-200" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const competitors = data?.competitors || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-blue-600" />
            Competitor Management
          </h3>
          <p className="text-muted-foreground text-sm">
            Manage competitors and trigger competitive analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCompetitors.length > 0 && (
            <Button
              onClick={handleStartAnalysis}
              disabled={isAnalysisRunning}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Analyze Selected ({selectedCompetitors.length})
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Competitor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Competitor</DialogTitle>
                <DialogDescription>
                  Add a competitor to monitor and analyze
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Competitor Inc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    value={formData.domain}
                    onChange={e =>
                      setFormData({ ...formData, domain: e.target.value })
                    }
                    placeholder="https://competitor.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={value =>
                        setFormData({
                          ...formData,
                          category: value as
                            | "direct"
                            | "indirect"
                            | "emerging"
                            | "aspirational",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="indirect">Indirect</SelectItem>
                        <SelectItem value="emerging">Emerging</SelectItem>
                        <SelectItem value="aspirational">
                          Aspirational
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={value =>
                        setFormData({
                          ...formData,
                          priority: value as
                            | "critical"
                            | "high"
                            | "medium"
                            | "low",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={e =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of competitor..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCompetitor}
                    disabled={
                      !formData.name || !formData.domain || isAddingCompetitor
                    }
                  >
                    {isAddingCompetitor ? "Adding..." : "Add Competitor"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-xl font-bold">{competitors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Direct</p>
                <p className="text-xl font-bold">
                  {competitors.filter(c => c.category === "direct").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Monitoring</p>
                <p className="text-xl font-bold">
                  {competitors.filter(c => c.status === "monitoring").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Analyzed</p>
                <p className="text-xl font-bold">
                  {competitors.filter(c => c.lastAnalyzed).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competitors List */}
      <div className="space-y-3">
        {competitors.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-muted-foreground text-center">
                <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-lg font-medium">No competitors added yet</p>
                <p className="text-sm">
                  Add competitors to start competitive intelligence analysis
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          competitors.map(competitor => (
            <Card
              key={competitor.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedCompetitors.includes(competitor.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedCompetitors([
                            ...selectedCompetitors,
                            competitor.id,
                          ]);
                        } else {
                          setSelectedCompetitors(
                            selectedCompetitors.filter(
                              id => id !== competitor.id
                            )
                          );
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Globe className="text-muted-foreground h-4 w-4" />
                        <h4 className="font-semibold">{competitor.name}</h4>
                        <Badge variant={getCategoryColor(competitor.category)}>
                          {competitor.category}
                        </Badge>
                        <Badge variant={getPriorityColor(competitor.priority)}>
                          {competitor.priority}
                        </Badge>
                        <Badge variant={getStatusColor(competitor.status)}>
                          {competitor.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {competitor.domain}
                      </p>
                      {competitor.lastAnalyzed && (
                        <p className="text-muted-foreground text-xs">
                          Last analyzed:{" "}
                          {new Date(
                            competitor.lastAnalyzed
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
