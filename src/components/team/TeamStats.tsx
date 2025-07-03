/**
 * Team Stats Component
 * Statistics overview for team management
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  Shield,
  Crown,
  User,
  Eye,
  Activity,
  Clock,
} from "lucide-react";

interface TeamStatsProps {
  data: {
    totalMembers: number;
    onlineMembers: number;
    roles: Record<string, number>;
  };
  loading: boolean;
}

export const TeamStats: React.FC<TeamStatsProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-600" />;
      case "member":
        return <User className="h-4 w-4 text-green-600" />;
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const stats = [
    {
      title: "Total Members",
      value: data.totalMembers,
      icon: <Users className="h-5 w-5 text-blue-600" />,
      description: "Team size",
      bgColor: "bg-blue-50",
    },
    {
      title: "Online Now",
      value: data.onlineMembers,
      icon: <UserCheck className="h-5 w-5 text-green-600" />,
      description: `${Math.round((data.onlineMembers / data.totalMembers) * 100)}% active`,
      bgColor: "bg-green-50",
    },
    {
      title: "Administrators",
      value: (data.roles["admin"] || 0) + (data.roles["owner"] || 0),
      icon: <Shield className="h-5 w-5 text-purple-600" />,
      description: "Can manage team",
      bgColor: "bg-purple-50",
    },
    {
      title: "Active Members",
      value: data.roles["member"] || 0,
      icon: <Activity className="h-5 w-5 text-orange-600" />,
      description: "Full access",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-600">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-gray-600" />
            <span>Role Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(data.roles).map(([role, count]) => (
              <div key={role} className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {getRoleIcon(role)}
                  <span className="text-sm font-medium capitalize">{role}</span>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {count}
                </Badge>
              </div>
            ))}
          </div>

          {/* Role Distribution Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Role Distribution</span>
              <span>{data.totalMembers} total</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-gray-200">
              {Object.entries(data.roles).map(([role, count]) => {
                const percentage = (count / data.totalMembers) * 100;
                const colors = {
                  owner: "bg-yellow-500",
                  admin: "bg-blue-500",
                  member: "bg-green-500",
                  viewer: "bg-gray-500",
                };
                return (
                  <div
                    key={role}
                    className={
                      colors[role as keyof typeof colors] || "bg-gray-500"
                    }
                    style={{ width: `${percentage}%` }}
                    title={`${role}: ${count} members (${percentage.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
