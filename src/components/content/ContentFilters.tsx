/**
 * Content Filters Component
 * Advanced filtering interface for content management
 */

"use client";

import React from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Filter,
  X,
  Calendar as CalendarIcon,
  Tag,
  User,
  BarChart3,
} from "lucide-react";

interface ContentFilters {
  status?: string | undefined;
  contentType?: string | undefined;
  projectId?: string | undefined;
  author?: string | undefined;
  dateRange?: {
    from: Date;
    to: Date;
  };
  minSeoScore?: number | undefined;
  tags?: string[];
}

interface ContentFiltersProps {
  filters: ContentFilters;
  onFiltersChange: (filters: ContentFilters) => void;
  projects?: Array<{ id: string; name: string }>;
  authors?: Array<{ id: string; name: string }>;
}

export const ContentFilters: React.FC<ContentFiltersProps> = ({
  filters,
  onFiltersChange,
  projects = [],
  authors = [],
}) => {
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const removeFilter = (filterKey: string) => {
    const newFilters = { ...filters };
    delete newFilters[filterKey as keyof typeof newFilters];
    onFiltersChange(newFilters);
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount}</Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">Status</Label>
          <Select
            value={filters.status || ""}
            onValueChange={value =>
              onFiltersChange({
                ...filters,
                status: value || undefined,
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Type Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">Type</Label>
          <Select
            value={filters.contentType || ""}
            onValueChange={value =>
              onFiltersChange({
                ...filters,
                contentType: value || undefined,
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any type</SelectItem>
              <SelectItem value="article">Article</SelectItem>
              <SelectItem value="blog_post">Blog Post</SelectItem>
              <SelectItem value="landing_page">Landing Page</SelectItem>
              <SelectItem value="product_page">Product Page</SelectItem>
              <SelectItem value="category_page">Category Page</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Project Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">Project</Label>
          <Select
            value={filters.projectId || ""}
            onValueChange={value =>
              onFiltersChange({
                ...filters,
                projectId: value || undefined,
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Any project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any project</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Author Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">Author</Label>
          <Select
            value={filters.author || ""}
            onValueChange={value =>
              onFiltersChange({
                ...filters,
                author: value || undefined,
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Any author" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any author</SelectItem>
              {authors.map(author => (
                <SelectItem key={author.id} value={author.id}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* SEO Score Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">Min SEO Score</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={filters.minSeoScore || ""}
            onChange={e =>
              onFiltersChange({
                ...filters,
                minSeoScore: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            placeholder="0-100"
            className="h-8"
          />
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {filters.dateRange ? (
                  <>
                    {filters.dateRange.from.toLocaleDateString()} -{" "}
                    {filters.dateRange.to.toLocaleDateString()}
                  </>
                ) : (
                  "Pick dates"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: filters.dateRange?.from,
                  to: filters.dateRange?.to,
                }}
                onSelect={(range: any) =>
                  onFiltersChange({
                    ...filters,
                    dateRange: range?.from && range?.to ? range : undefined,
                  })
                }
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter("status")}
              />
            </Badge>
          )}
          {filters.contentType && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {filters.contentType}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter("contentType")}
              />
            </Badge>
          )}
          {filters.projectId && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Project:{" "}
              {projects.find(p => p.id === filters.projectId)?.name ||
                filters.projectId}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter("projectId")}
              />
            </Badge>
          )}
          {filters.author && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Author:{" "}
              {authors.find(a => a.id === filters.author)?.name ||
                filters.author}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter("author")}
              />
            </Badge>
          )}
          {filters.minSeoScore && (
            <Badge variant="secondary" className="flex items-center gap-1">
              SEO Score ≥ {filters.minSeoScore}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter("minSeoScore")}
              />
            </Badge>
          )}
          {filters.dateRange && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Date: {filters.dateRange.from.toLocaleDateString()} -{" "}
              {filters.dateRange.to.toLocaleDateString()}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => removeFilter("dateRange")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
