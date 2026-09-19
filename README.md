# Tender Flow UI

Build the initial UI foundation for an internal Tender Management System.

IMPORTANT:

This is Credit 1 of a 5-credit implementation plan.

Focus on UI/UX, layouts, navigation, reusable components, and page structure.

Do NOT try to implement the complete backend/business logic yet.

Do NOT use mock API integrations that will need to be replaced later.

Keep the architecture clean so Supabase functionality can be added in later stages.

Do not introduce unnecessary libraries.

DESIGN DIRECTION:

Use the uploaded reference design as the primary visual inspiration.

The application should have a modern enterprise SaaS appearance:

clean white cards

light gray page background

rounded corners

subtle borders/shadows

spacious layout

modern typography

professional blue primary color

clear status badges

responsive desktop-first design

polished hover/focus states

consistent spacing throughout the application

The application should feel like a real production internal business application, not a generic admin template.

==================================================

APPLICATION STRUCTURE
==================================================

Create a React application with a clean structure suitable for a Tender Management System.

Suggested structure:

src/
components/
pages/
layouts/
services/
lib/
types/
hooks/

Use reusable components wherever appropriate.

Create:

Login page

Main application layout

Sidebar navigation

Top header

Dashboard

Tender List

Add Tender

Tender Details

Profile

Reports placeholder

================================================== 2. LOGIN PAGE

Create a polished login page inspired by the uploaded reference image.

Layout:

full-screen light gray background

centered rounded white authentication container

two-column layout on desktop

Left side:

application logo/name

heading: "Welcome back"

subtitle: "Sign in to manage your tenders"

Email field

Password field

Show/hide password icon

Remember me checkbox

Sign In button

Forgot password link

Right side:
Create a professional blue promotional/dashboard visual.
Use abstract UI/dashboard cards rather than random stock imagery.

Include text such as:
"Tender Management"
"Manage tenders, deadlines and submissions from one place."

Make this side visually attractive but not overcrowded.

On mobile:

hide or move the promotional panel below the login form

keep login usable and responsive

Do not implement real authentication yet.

================================================== 3. MAIN APPLICATION LAYOUT

Create the authenticated application shell.

Sidebar:

Logo:
"Tender Management"

Navigation:

Tender User:

Dashboard

Tenders

Profile

Super Admin:

Dashboard

Tenders

Reports

Profile

Bottom:

user profile section

Logout

For now, use a simple temporary role state only for visual navigation.
Do not implement actual Supabase roles yet.

Sidebar requirements:

collapsible on smaller screens

active navigation state

icons

clean spacing

professional enterprise appearance

Top header:

page title

breadcrumb where appropriate

notification/profile area placeholder

================================================== 4. DASHBOARD PAGE

Create a polished dashboard.

Top:
"Dashboard"
"Overview of your tender activities"

Stat cards:

Total Tenders

Submitted

In Progress

Completed

Upcoming Deadlines

Use visually distinct but professional status indicators.

Main dashboard sections:

A. Tender Status Overview
Create a clean chart/card showing:

Draft

Submitted

In Progress

Completed

Cancelled

B. Upcoming Deadlines
Table/list containing:

Tender Number

Tender Title

Submission Deadline

Status

C. Recent Tenders
Table:

Tender Number

Title

Source

Status

Last Updated

Use temporary placeholder data ONLY for this UI stage.
Clearly structure the components so this data can later be replaced by Supabase queries.

================================================== 5. TENDERS LIST PAGE

Create a production-quality tender listing page.

Header:
"Tenders"

Right side:
"+ Add Tender" button

Toolbar:

Search input

Status filter

Source filter

Category filter

Date filter

Clear filters button

Table columns:

Tender Number

Title

Source

Category

Estimated Value

Submission Deadline

Status

Last Updated

Actions

Actions:

View

Edit

Delete

Create:

pagination UI

empty state

loading state

error state

responsive table behavior

Use professional status badges:

Draft = gray
Submitted = blue
In Progress = amber
Completed = green
Cancelled = red

================================================== 6. ADD TENDER PAGE

Create a multi-section form.

Page title:
"Add Tender"

Sections:

A. Basic Information

Fields:

Tender Number *

Tender Title *

Source *

Category

Organization / Client

Department

Product / Service

Portal URL

Description

Source options:

GeM

UNGM

Other

B. Financial Information

Fields:

Estimated Value

Currency

EMD Amount

Tender Fee

Currency default:
INR

C. Important Dates

Fields:

Published Date

Submission Start Date

Submission Deadline *

Pre-Bid Date

Expected Result Date

Expected Completion Date

D. Documents

Create a professional document upload/dropzone UI.

Show:

upload area

file name

file type

file size

remove button

Do not connect actual Supabase Storage yet.

Bottom buttons:

Cancel

Save as Draft

Create Tender

Add basic frontend validation and clear validation messages.

================================================== 7. TENDER DETAILS PAGE

Create a polished read-only details page.

Header:

Tender number

Tender title

Status badge

Edit button

Delete button

Sections:

Basic Information
Financial Information
Important Dates
Documents
Status History
Activity History

Documents should show:

file name

file type

file size

uploaded date

download button

Status history should visually show:

old status

new status

changed by

date

remarks

Activity history:

action

description

user

timestamp

Use placeholder data for now.

================================================== 8. PROFILE PAGE

Create:

Profile Information:

Name

Email

Role

Account Status

Created Date

Security:

Change Password button/form

Role should be displayed as read-only.

================================================== 9. REPORTS PAGE

Create the Reports page UI.

Include:

Status Summary

Source Summary

Tender Count by Month

Tender Value Summary

Date range filter

Export CSV button

For now this is UI only.

================================================== 10. IMPORTANT UX REQUIREMENTS

Implement:

toast notifications

confirmation dialogs

loading skeletons

empty states

error states

form validation

accessible labels

keyboard-friendly controls

responsive design

Do not over-engineer.

Do not create unnecessary pages.

Do not implement fake authentication or fake Supabase data.

At the end, make sure:

all navigation links work

all pages render

buttons have appropriate UI behavior

no broken routes

no TypeScript errors

no console errors

This stage is ONLY the polished UI foundation.
Do not implement the Supabase database, authentication, RLS, Storage, or production CRUD yet.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ac9d32df-14c2-4c10-93e9-fcc3b9eecb22).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
