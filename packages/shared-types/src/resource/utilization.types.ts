/**
 * Resource Utilization Types - Reporting and analytics
 */

export interface UtilizationReport {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: UtilizationMetrics;
  dailyBreakdown: DailyUtilization[];
  projectBreakdown: ProjectUtilization[];
}

export interface UtilizationMetrics {
  totalCapacityHours: number;
  billableHours: number;
  nonBillableHours: number;
  leaveHours: number;
  holidayHours: number;
  utilizationPercentage: number;
  billablePercentage: number;
  efficiencyScore?: number;
}

export interface DailyUtilization {
  date: Date;
  capacityHours: number;
  billableHours: number;
  nonBillableHours: number;
  utilizationPercentage: number;
  status: 'under_utilized' | 'optimal' | 'over_utilized';
}

export interface ProjectUtilization {
  projectId: string;
  projectName: string;
  clientName?: string;
  allocatedHours: number;
  loggedHours: number;
  billableHours: number;
  variance: number;
  variancePercentage: number;
}

export interface TeamUtilizationReport {
  teamId?: string;
  departmentId?: string;
  departmentName?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalMembers: number;
  averageUtilization: number;
  averageBillable: number;
  utilizationDistribution: {
    underUtilized: number;
    optimal: number;
    overUtilized: number;
  };
  members: UtilizationReport[];
}

export interface ForecastData {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalCapacity: number;
  plannedAllocation: number;
  confirmedAllocation: number;
  tentativeAllocation: number;
  gapHours: number;
  gapPercentage: number;
  demandForecast: DemandForecast[];
}

export interface DemandForecast {
  skill: string;
  demandHours: number;
  supplyHours: number;
  gap: number;
  gapPercentage: number;
  recommendations: string[];
}
