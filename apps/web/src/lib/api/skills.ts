/**
 * Employee Skills API Client
 */

import { apiClient } from './client';

// ============================================================================
// TYPES
// ============================================================================

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface EmployeeSkill {
  id: string;
  employeeId: string;
  name: string;
  category: string;
  level: SkillLevel;
  yearsExperience: number | null;
  isPrimary: boolean;
  endorsedBy: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillInput {
  name: string;
  category?: string;
  level?: SkillLevel;
  yearsExperience?: number | null;
  isPrimary?: boolean;
  notes?: string | null;
}

export interface UpdateSkillInput extends Partial<CreateSkillInput> {}

// ============================================================================
// SKILL CATEGORIES (predefined list for UI)
// ============================================================================

export const SKILL_CATEGORIES = [
  'Frontend',
  'Backend',
  'Database',
  'DevOps',
  'Mobile',
  'Design',
  'Testing',
  'Management',
  'Communication',
  'Domain',
  'General',
] as const;

// Common skills suggestions per category
export const SKILL_SUGGESTIONS: Record<string, string[]> = {
  Frontend: ['React', 'Vue.js', 'Angular', 'Next.js', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Tailwind CSS', 'SASS', 'Redux', 'Svelte'],
  Backend: ['Node.js', 'Express', 'NestJS', 'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'Go', 'Rust', 'PHP', 'Laravel', 'Ruby on Rails', '.NET', 'C#'],
  Database: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB', 'Prisma', 'TypeORM', 'Elasticsearch'],
  DevOps: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Terraform', 'Jenkins', 'GitHub Actions', 'Nginx', 'Linux'],
  Mobile: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android', 'Expo'],
  Design: ['Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'UI/UX', 'Wireframing', 'Prototyping'],
  Testing: ['Jest', 'Cypress', 'Playwright', 'Selenium', 'Unit Testing', 'E2E Testing', 'TDD'],
  Management: ['Agile', 'Scrum', 'Kanban', 'JIRA', 'Project Planning', 'Team Leadership', 'Stakeholder Management'],
  Communication: ['Technical Writing', 'Presentation', 'Client Communication', 'Documentation', 'Mentoring'],
  Domain: ['FinTech', 'HealthTech', 'E-Commerce', 'SaaS', 'EdTech', 'AI/ML', 'Blockchain'],
  General: ['Git', 'REST API', 'GraphQL', 'Microservices', 'System Design', 'Data Structures', 'Algorithms', 'Problem Solving'],
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

export async function getEmployeeSkills(employeeId: string): Promise<EmployeeSkill[]> {
  const { data } = await apiClient.get(`/api/v1/employees/${employeeId}/skills`);
  return (data as EmployeeSkill[]) || [];
}

export async function addEmployeeSkill(employeeId: string, input: CreateSkillInput): Promise<EmployeeSkill> {
  const { data } = await apiClient.post(`/api/v1/employees/${employeeId}/skills`, input);
  return data as EmployeeSkill;
}

export async function addEmployeeSkillsBulk(employeeId: string, skills: CreateSkillInput[]): Promise<EmployeeSkill[]> {
  const { data } = await apiClient.post(`/api/v1/employees/${employeeId}/skills/bulk`, { skills });
  return (data as EmployeeSkill[]) || [];
}

export async function updateEmployeeSkill(employeeId: string, skillId: string, input: UpdateSkillInput): Promise<EmployeeSkill> {
  const { data } = await apiClient.put(`/api/v1/employees/${employeeId}/skills/${skillId}`, input);
  return data as EmployeeSkill;
}

export async function deleteEmployeeSkill(employeeId: string, skillId: string): Promise<void> {
  await apiClient.delete(`/api/v1/employees/${employeeId}/skills/${skillId}`);
}
