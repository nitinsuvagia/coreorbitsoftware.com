import { logger } from '../utils/logger';

// Chart configuration types for client-side rendering
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartConfiguration {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea';
  data: ChartData;
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: {
      title?: {
        display?: boolean;
        text?: string;
      };
      legend?: {
        display?: boolean;
        position?: 'top' | 'bottom' | 'left' | 'right';
      };
    };
    scales?: {
      x?: {
        display?: boolean;
        title?: {
          display?: boolean;
          text?: string;
        };
      };
      y?: {
        display?: boolean;
        title?: {
          display?: boolean;
          text?: string;
        };
        beginAtZero?: boolean;
      };
    };
  };
}

export interface ChartResult {
  type: 'configuration';
  config: ChartConfiguration;
}

class ChartService {
  private colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ];

  private getColor(index: number): string {
    return this.colors[index % this.colors.length];
  }

  private getColors(count: number): string[] {
    return Array.from({ length: count }, (_, i) => this.getColor(i));
  }

  /**
   * Generate a chart configuration based on type, data, and title
   * Returns chart configuration for client-side rendering
   */
  async generateChart(
    type: string,
    data: { labels: string[]; values: number[] } | Record<string, number>,
    title: string
  ): Promise<ChartResult> {
    logger.info(`Generating ${type} chart: ${title}`);

    // Normalize data format
    let labels: string[];
    let values: number[];

    if (Array.isArray((data as any).labels)) {
      labels = (data as any).labels;
      values = (data as any).values || [];
    } else {
      labels = Object.keys(data);
      values = Object.values(data) as number[];
    }

    switch (type.toLowerCase()) {
      case 'bar':
        return this.generateBarChart(labels, values, title);
      case 'line':
        return this.generateLineChart(labels, [{ label: title, data: values }], title);
      case 'pie':
        return this.generatePieChart(labels, values, title);
      case 'doughnut':
        return this.generateDoughnutChart(labels, values, title);
      case 'radar':
        return this.generateRadarChart(labels, [{ label: title, data: values }], title);
      default:
        return this.generateBarChart(labels, values, title);
    }
  }

  async generateBarChart(
    labels: string[],
    data: number[],
    title: string,
    xAxisLabel?: string,
    yAxisLabel?: string
  ): Promise<ChartResult> {
    logger.info(`Generating bar chart: ${title}, dataPoints: ${data.length}`);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: title,
            data,
            backgroundColor: this.getColors(data.length),
            borderColor: this.getColors(data.length),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
          },
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            display: true,
            title: {
              display: !!xAxisLabel,
              text: xAxisLabel,
            },
          },
          y: {
            display: true,
            title: {
              display: !!yAxisLabel,
              text: yAxisLabel,
            },
            beginAtZero: true,
          },
        },
      },
    };

    return { type: 'configuration', config };
  }

  async generateLineChart(
    labels: string[],
    datasets: Array<{ label: string; data: number[] }>,
    title: string,
    xAxisLabel?: string,
    yAxisLabel?: string
  ): Promise<ChartResult> {
    logger.info(`Generating line chart: ${title}, datasets: ${datasets.length}`);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, index) => ({
          label: ds.label,
          data: ds.data,
          borderColor: this.getColor(index),
          backgroundColor: this.getColor(index),
          fill: false,
          tension: 0.3,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
          },
          legend: {
            display: true,
            position: 'top',
          },
        },
        scales: {
          x: {
            display: true,
            title: {
              display: !!xAxisLabel,
              text: xAxisLabel,
            },
          },
          y: {
            display: true,
            title: {
              display: !!yAxisLabel,
              text: yAxisLabel,
            },
            beginAtZero: true,
          },
        },
      },
    };

    return { type: 'configuration', config };
  }

  async generatePieChart(
    labels: string[],
    data: number[],
    title: string
  ): Promise<ChartResult> {
    logger.info(`Generating pie chart: ${title}, segments: ${data.length}`);

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            label: title,
            data,
            backgroundColor: this.getColors(data.length),
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
          },
          legend: {
            display: true,
            position: 'right',
          },
        },
      },
    };

    return { type: 'configuration', config };
  }

  async generateDoughnutChart(
    labels: string[],
    data: number[],
    title: string
  ): Promise<ChartResult> {
    logger.info(`Generating doughnut chart: ${title}, segments: ${data.length}`);

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            label: title,
            data,
            backgroundColor: this.getColors(data.length),
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
          },
          legend: {
            display: true,
            position: 'right',
          },
        },
      },
    };

    return { type: 'configuration', config };
  }

  async generateRadarChart(
    labels: string[],
    datasets: Array<{ label: string; data: number[] }>,
    title: string
  ): Promise<ChartResult> {
    logger.info(`Generating radar chart: ${title}, datasets: ${datasets.length}`);

    const config: ChartConfiguration = {
      type: 'radar',
      data: {
        labels,
        datasets: datasets.map((ds, index) => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: `${this.getColor(index)}40`, // with alpha
          borderColor: this.getColor(index),
          borderWidth: 2,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
          },
          legend: {
            display: true,
            position: 'top',
          },
        },
      },
    };

    return { type: 'configuration', config };
  }

  // Generate attendance trend chart
  async generateAttendanceTrend(
    dates: string[],
    presentData: number[],
    absentData: number[],
    lateData: number[]
  ): Promise<ChartResult> {
    return this.generateLineChart(
      dates,
      [
        { label: 'Present', data: presentData },
        { label: 'Absent', data: absentData },
        { label: 'Late', data: lateData },
      ],
      'Attendance Trend',
      'Date',
      'Count'
    );
  }

  // Generate project status distribution
  async generateProjectStatusChart(
    statusCounts: Record<string, number>
  ): Promise<ChartResult> {
    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    return this.generateDoughnutChart(labels, data, 'Project Status Distribution');
  }

  // Generate task completion chart
  async generateTaskCompletionChart(
    dates: string[],
    completedTasks: number[],
    totalTasks: number[]
  ): Promise<ChartResult> {
    return this.generateLineChart(
      dates,
      [
        { label: 'Completed', data: completedTasks },
        { label: 'Total', data: totalTasks },
      ],
      'Task Completion Trend',
      'Date',
      'Tasks'
    );
  }

  // Generate employee distribution by department
  async generateDepartmentDistribution(
    departmentCounts: Record<string, number>
  ): Promise<ChartResult> {
    const labels = Object.keys(departmentCounts);
    const data = Object.values(departmentCounts);
    return this.generatePieChart(labels, data, 'Employees by Department');
  }

  // Generate billing summary chart
  async generateBillingSummary(
    months: string[],
    invoiced: number[],
    collected: number[]
  ): Promise<ChartResult> {
    return this.generateBarChart(
      months,
      invoiced,
      'Billing Summary',
      'Month',
      'Amount'
    );
  }
}

export const chartService = new ChartService();
