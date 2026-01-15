/**
 * Employee Service Configuration
 */

export interface EmployeeServiceConfig {
  nodeEnv: 'development' | 'staging' | 'production';
  host: string;
  port: number;
  
  // Feature flags
  features: {
    enableOrgChart: boolean;
    enableEmployeePhotos: boolean;
    enableDocumentGeneration: boolean;
    enableSkillsTracking: boolean;
  };
  
  // Pagination defaults
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
  
  // Employee code generation
  employeeCode: {
    prefix: string;
    length: number;
    autoGenerate: boolean;
  };
}

export const config: EmployeeServiceConfig = {
  nodeEnv: (process.env.NODE_ENV || 'development') as EmployeeServiceConfig['nodeEnv'],
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3002', 10),
  
  features: {
    enableOrgChart: process.env.FEATURE_ORG_CHART !== 'false',
    enableEmployeePhotos: process.env.FEATURE_EMPLOYEE_PHOTOS !== 'false',
    enableDocumentGeneration: process.env.FEATURE_DOC_GENERATION !== 'false',
    enableSkillsTracking: process.env.FEATURE_SKILLS_TRACKING !== 'false',
  },
  
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },
  
  employeeCode: {
    prefix: process.env.EMPLOYEE_CODE_PREFIX || 'EMP',
    length: parseInt(process.env.EMPLOYEE_CODE_LENGTH || '6', 10),
    autoGenerate: process.env.EMPLOYEE_CODE_AUTO_GENERATE !== 'false',
  },
};
