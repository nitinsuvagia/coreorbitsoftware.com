# Employee Import Template

## Sheet 1: Employees

| Column | Required | Type | Description | Valid Values / Format |
|--------|----------|------|-------------|----------------------|
| employee_code | No | Text | Auto-generated if empty | e.g., "EMP001", "SQT-2024-00001" |
| first_name | **Yes** | Text | First name | Max 100 chars |
| last_name | **Yes** | Text | Last name | Max 100 chars |
| middle_name | No | Text | Middle name | Max 100 chars |
| email | **Yes** | Email | Work email (must be unique) | valid@email.com |
| personal_email | No | Email | Personal email | valid@email.com |
| phone | No | Text | Phone number | +1-234-567-8900 |
| mobile | No | Text | Mobile number | +1-234-567-8900 |
| date_of_birth | No | Date | Birth date | YYYY-MM-DD or DD/MM/YYYY |
| gender | No | Text | Gender | MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY |
| marital_status | No | Text | Marital status | SINGLE, MARRIED, DIVORCED, WIDOWED, OTHER |
| nationality | No | Text | Nationality | e.g., "Indian", "American" |
| blood_group | No | Text | Blood group | A+, A-, B+, B-, AB+, AB-, O+, O- |
| address_line_1 | No | Text | Street address | |
| address_line_2 | No | Text | Apartment/Suite | |
| city | No | Text | City | |
| state | No | Text | State/Province | |
| country | No | Text | Country | |
| postal_code | No | Text | ZIP/Postal code | |
| department | **Yes** | Text | Department name | Must exist in system |
| designation | **Yes** | Text | Designation/Job title | Must exist in system |
| reporting_manager_email | No | Email | Manager's email | Must exist in system |
| employment_type | No | Text | Type of employment | FULL_TIME, PART_TIME, CONTRACT, INTERN, CONSULTANT, TEMPORARY |
| status | No | Text | Employee status | ACTIVE, ON_LEAVE, PROBATION, NOTICE_PERIOD, TERMINATED, RESIGNED, RETIRED |
| join_date | **Yes** | Date | Date joined company | YYYY-MM-DD or DD/MM/YYYY |
| confirmation_date | No | Date | Confirmation date | YYYY-MM-DD or DD/MM/YYYY |
| probation_end_date | No | Date | Probation end date | YYYY-MM-DD or DD/MM/YYYY |
| exit_date | No | Date | Last working date | YYYY-MM-DD or DD/MM/YYYY |
| exit_reason | No | Text | Reason for leaving | e.g., "Resigned", "Better opportunity" |
| work_location | No | Text | Office location | |
| base_salary | No | Number | Monthly/Annual salary | 50000 |
| currency | No | Text | Salary currency | USD, INR, EUR, etc. (default: USD) |

---

## Notes for "Left Employee" Import

For past/terminated employees, make sure to include:

1. **status** = `RESIGNED`, `TERMINATED`, or `RETIRED`
2. **exit_date** = Their last working day
3. **exit_reason** = Why they left (optional but recommended)
4. **join_date** = When they originally joined

---

## Sample Data Row

```
employee_code,first_name,last_name,email,department,designation,join_date,status,exit_date,exit_reason
EMP001,John,Doe,john.doe@company.com,Engineering,Software Engineer,2020-01-15,RESIGNED,2023-06-30,Better opportunity
```

---

## Column Mapping Guide

If your sheet has different column names, map them as follows:

| Your Column Name | Maps To |
|-----------------|---------|
| Name | Split into first_name + last_name |
| DOB | date_of_birth |
| Joining Date | join_date |
| Leaving Date | exit_date |
| Department Name | department |
| Position/Title | designation |
| Status | status |
| Contact No | phone or mobile |
| Personal Email | personal_email |
| Official Email | email |
