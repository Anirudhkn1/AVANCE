# SEDULITAS — MASTER PRODUCT REQUIREMENTS + AI BUILD PROMPT

## 1. PRODUCT NAME

SEDULITAS

### Core positioning

**SEDULITAS is a progress-management and accountability platform for institutions, with a game layer that motivates students to keep moving.**

The short pitch:

> **"A game layer for real-world work."**

The important distinction is that SEDULITAS is NOT merely a gamified to-do list. Its institutional value comes from turning otherwise invisible work progress into measurable checkpoints, giving authorised staff visibility into progress and possible risk before deadlines.

---

# 2. THE PROBLEM

Institutions commonly measure academic work primarily at the endpoint: the final submission.

This creates a visibility gap:

Lecturer assigns work
→ student works independently
→ little visibility during the process
→ deadline approaches
→ student rushes / falls behind
→ lecturer discovers the problem late.

SEDULITAS addresses this by converting an assignment/project into a sequence of measurable checkpoints.

Students always know:

1. What am I supposed to do now?
2. How much have I completed?
3. What happens after I finish?
4. How much time remains?
5. Where do I stand within my group?

Lecturers/hosts can see:

1. Overall group progress
2. Students who may need attention
3. Checkpoints where many students are getting stuck
4. Submission/verification status
5. Completion statistics

The system should help institutions identify problems EARLIER, not merely make assignments look more entertaining.

---

# 3. PRODUCT PRINCIPLES

### 3.1 Real work first

The game layer must motivate real work, not become another distraction.

### 3.2 Simple progression

Users should immediately understand:

> What am I doing now?

and

> What happens when I finish?

### 3.3 Human authority

AI can analyse, suggest, summarise and assist.

AI must NOT independently publish academic requirements, punish students, accuse students of cheating, or make consequential academic decisions.

### 3.4 Competition without humiliation

Competition should motivate rather than shame students.

### 3.5 Measurable progress

The platform must convert real work into understandable progress data.

### 3.6 Professional interface, playful system

The UI should look like a modern productivity/analytics product.

Game mechanics, terminology, reactions and restrained humour provide the personality.

---

# 4. TARGET USERS

## 4.1 Students

Students receive assignments/projects, work through checkpoints, submit evidence, track progress, and optionally participate in group competition/social accountability.

## 4.2 Group Hosts

Hosts manage groups and their assigned work.

They can create projects/checkpoints, set deadlines, configure verification and monitor progress.

## 4.3 Organisation Heads

Organisation Heads manage the organisation and control who is authorised to create/manage groups.

## 4.4 Lecturers / Verifiers

Depending on configuration, authorised lecturers/hosts can review and verify student submissions.

## 4.5 Future workplace users

The organisation → group → project → checkpoint structure should be reusable for future office/team workflows.

Do NOT build workplace-specific functionality in the MVP.

---

# 5. CORE HIERARCHY

Use this structure:

Organisation
→ Groups
→ Projects / Assignments
→ Checkpoints

An Organisation is the persistent environment.

A Group contains people receiving the same work.

A Project/Assignment represents one piece of work.

A Checkpoint is one sequential stage of that work.

---

# 6. ORGANISATION SYSTEM

An organisation is a persistent environment such as:

- College department
- Class
- Coding club
- Project team
- Hackathon team

Example:

CSE-A

An organisation contains groups.

The Organisation Head controls who can create/manage groups.

---

# 7. GROUP SYSTEM

A group contains students who receive the same assignment/project.

IMPORTANT:

**Everyone in the same group receives the same checkpoints for the same project.**

This makes group progress comparison meaningful.

Example:

Group: CSE-A / DBMS Project

All students receive:

1. Requirements
2. Design
3. Implementation
4. Testing
5. Final submission

The group leaderboard can therefore compare checkpoint completion directly.

---

# 8. ROLE AND PERMISSION SYSTEM

## Organisation Head

Can:

- Manage organisation
- Authorise people to create groups
- Manage organisation-level access
- View organisation analytics

## Group Host / Lecturer

Can:

- Create/manage authorised groups
- Create projects
- Create/edit checkpoints
- Configure deadlines
- Configure verification mode
- Monitor progress
- Review submissions where applicable
- Take Fair Play/accountability actions where applicable

## Student

Can:

- Join authorised groups
- View assigned projects
- Complete checkpoints
- Submit required evidence
- View progress
- View relevant group leaderboard
- React to teammate activity
- Manage personal habits outside organisations

All sensitive permissions must be enforced server-side.

---

# 9. CORE STUDENT WORKFLOW

Sign in
↓
Join organisation
↓
Join group
↓
See assigned project
↓
See linear checkpoint path
↓
Complete current checkpoint
↓
Submit evidence if required
↓
Automatic OR manual verification
↓
Checkpoint completed
↓
XP/statistics updated
↓
Leaderboard/progress updated
↓
Next checkpoint unlocked
↓
Continue

---

# 10. CORE HOST WORKFLOW

Organisation Head authorises Host
↓
Host creates group
↓
Students join
↓
Host creates/imports project
↓
AI can propose checkpoint structure
↓
Host reviews and edits
↓
Host approves/publishes
↓
Students work through checkpoints
↓
Host monitors class/group progress
↓
Host intervenes when necessary
↓
Project completes
↓
Organisation-level statistics persist

---

# 11. AI QUEST BUILDER

This is one of the major product features.

A lecturer/host should NOT have to manually convert every assignment into a game-like workflow.

### Input

The host can:

- Upload a PDF/DOCX assignment
- Paste assignment text
- Enter assignment details manually

### AI process

The AI analyses the provided assignment and proposes:

- Project title
- Description
- Requirements
- Sequential checkpoints
- Suggested checkpoint descriptions
- Suggested submission requirements
- Important deadlines if clearly present in the source

### Example

Input:

"Build a C banking management system with account creation, deletion, searching, sorting and testing."

AI proposes:

1. Understand requirements
2. Design data structures
3. Implement core functions
4. Implement searching/sorting
5. Test the system
6. Final submission

### HUMAN APPROVAL IS MANDATORY

The flow must be:

Assignment
→ AI analysis
→ Proposed quest structure
→ Host reviews
→ Host edits if necessary
→ Host approves
→ Publish

AI must NEVER automatically publish generated academic requirements.

### Reliability requirements

The AI must:

- Clearly label generated content as AI-generated
- Never invent requirements as confirmed facts
- Distinguish extracted information from suggested information where possible
- Preserve explicit requirements from the uploaded assignment
- Allow the host to edit every generated field
- Require human approval before publication
- Fail safely when the assignment is unclear
- Ask for clarification through the UI when necessary rather than confidently inventing information

The AI should use structured outputs rather than uncontrolled free-form generation.

---

# 12. ASSIGNMENT IMPORT

Support:

Upload PDF/DOCX
→ Extract readable text
→ AI analyses the content
→ Produce structured assignment information
→ Generate proposed checkpoints
→ Host reviews
→ Publish

The system must not require the lecturer to rewrite an existing assignment manually.

For the MVP, do NOT attempt deep integrations with external LMS platforms.

Future integrations can include Google Classroom, Moodle, Microsoft Teams, Canvas, etc.

---

# 13. LINEAR CHECKPOINT SYSTEM

Progression is linear.

Example:

Checkpoint 1
↓
Checkpoint 2
↓
Checkpoint 3
↓
Checkpoint 4
↓
Checkpoint 5

Students should clearly see:

- Completed checkpoints
- Current checkpoint
- Locked future checkpoints
- Progress percentage
- Deadline
- Submission status

Do NOT build complicated skill trees or branching RPG systems.

The interface should remain simple.

---

# 14. SUBMISSION SYSTEM

PDF is the primary evidence format for the MVP.

Students can:

- Select PDF
- Upload it
- See upload progress
- See submission timestamp
- See verification status
- Resubmit where permitted

Basic validation:

- Correct file type
- Reasonable file size
- Correct association with student/project/checkpoint

---

# 15. VERIFICATION SYSTEM

Two modes:

## Mode A — Automatic

Student completes work
→ Upload PDF
→ Submission received
→ Checkpoint completes
→ Progress advances
→ XP/statistics update

## Mode B — Host/Lecturer Approval

Student completes work
→ Upload PDF
→ Waiting for verification
→ Host/Lecturer reviews
→ Approve
→ Checkpoint completes
→ Progress advances

If rejected:

Rejected
→ Student receives reason/status
→ Resubmit if allowed

AI must NOT automatically punish students or accuse them of dishonest submissions.

---

# 16. INSTITUTION COMMAND CENTER

Create a dedicated dashboard for lecturers/hosts.

This is a major value proposition.

The dashboard should answer:

> "How is my group/class doing right now?"

Example:

CLASS OVERVIEW

60 Students

🟢 41 On Track
🟡 13 At Risk
🔴 6 Critical

Assignment 3

Overall progress: 67%
Completion rate: 81%
Students needing attention: 8

Then show:

## Student progress

Student | Progress | Deadline status

The host should be able to identify students who may need attention without manually opening every student's profile.

---

# 17. PROGRESS RISK INDICATORS

Do NOT implement invasive AI procrastination detection.

Do NOT monitor:

- Screen activity
- Keyboard activity
- Browser history
- Application usage
- Personal device activity

Instead, calculate risk from objective platform data such as:

- Checkpoint completion
- Time remaining
- Missed deadlines
- Submission status
- Progress relative to expected schedule
- Repeated rejection
- Extended inactivity inside the project

Display:

🟢 ON TRACK
🟡 AT RISK
🔴 CRITICAL

Example:

A student has completed 1/5 checkpoints with one day remaining.

The system can flag:

> "Progress may require attention."

It should NOT claim:

> "This student is procrastinating."

The system should describe observable progress, not infer personal motives.

---

# 18. DEADLINE HEALTH

Show students and hosts whether progress is aligned with the remaining time.

Example:

████████░░ 78%

ON TRACK

Or:

████░░░░░░ 42%

AT RISK

The calculation should consider:

- Number of completed checkpoints
- Expected progression
- Time remaining
- Project deadline

The purpose is to answer:

> "Am I on pace?"

and for hosts:

> "Is my group on pace?"

---

# 19. BOTTLENECK ANALYTICS

The institution should be able to see which checkpoint is slowing down the group.

Example:

Checkpoint 1    96%
Checkpoint 2    91%
Checkpoint 3    78%
Checkpoint 4    43%  ⚠
Checkpoint 5    12%

This allows a lecturer to identify:

> "Many students are getting stuck at Checkpoint 4."

This is more useful than only seeing final submission rates.

The MVP can use straightforward aggregate statistics.

Do NOT require complex AI to make this feature work.

---

# 20. INTERVENTION SYSTEM

When a student or checkpoint enters an attention/risk state, the system can recommend actions.

Examples:

- Send reminder
- Send a message
- Provide learning/support material
- Extend deadline
- Contact student

The AI can recommend an action, but the authorised human decides whether to execute it.

Do NOT automatically punish or contact students without appropriate human control.

---

# 21. FUN / PERSONALITY LAYER

The institutional UI remains professional.

The product can use restrained humour in appropriate locations.

Example:

> **"Checkpoint 4 appears to be the final boss. 💀"**

For reminders:

> **"Bro, the deadline is approaching 💀"**

Humour should be configurable and should not appear in serious academic or disciplinary contexts.

---

# 22. GAMIFICATION

Gamification is the motivation layer.

It must never replace actual work.

Core mechanics:

- XP
- Group leaderboard
- Progress
- Streak
- Simple completion feedback
- Optional reactions
- Random object avatars

---

# 23. XP SYSTEM

XP is organisation-specific.

A user belonging to two organisations must have independent statistics.

Example:

Organisation A:
XP = 840

Organisation B:
XP = 320

Do NOT create one universal organisation XP value.

Checkpoint XP should be configurable.

MVP default:

Easy/simple checkpoint = configurable XP, initially possibly 1 XP.

Future:

Easy = 10 XP
Medium = 25 XP
Hard = 50 XP

Do not hard-code the database around one permanent XP formula.

---

# 24. GROUP LEADERBOARD

The primary leaderboard is group-based.

Because everyone in the group has the same checkpoints, completed checkpoints are a meaningful comparison.

Example:

Rank | Student | Completed

1 | Ani | 5/5
2 | Rahul | 4/5
3 | Priya | 4/5
4 | Arjun | 2/5

Leaderboard should not humiliate students at the bottom.

Consider showing positive context such as:

- Current progress
- Top performers
- Most consistent
- Fastest improvement

The leaderboard should remain configurable by the organisation.

---

# 25. ORGANISATION-LEVEL PERFORMANCE

Project progress is temporary.

Organisation performance persists.

Example:

Project 1:
12 checkpoints completed

Project 2:
18 checkpoints completed

Organisation statistics:
30 checkpoints completed

Organisation-level statistics can include:

- XP
- Rank
- Completed checkpoints
- Fair Play/accountability score if retained
- Streak
- Relevant aggregate metrics

The project can eventually expire from active history while aggregate organisation contribution remains.

---

# 26. PERFORMANCE PROFILE

The performance page should communicate:

> **"This person is reliable."**

It should be an analytics dashboard, NOT an RPG character sheet.

Show organisation-specific:

- XP
- Rank
- Completed checkpoints
- Streak
- Fair Play/accountability information if enabled
- Organisation progress metrics

Do not create a public portfolio/CV in the MVP.

---

# 27. FAIR PLAY / ACCOUNTABILITY

Retain a simple accountability mechanism only if it is useful.

Important distinction:

- Incomplete work
- Late work
- Rejected work
- Deliberately false completion claims

must not be treated as the same thing.

If Fair Play is implemented:

- Only authorised hosts can modify it
- Changes must be auditable
- Students cannot edit it
- AI cannot automatically reduce it
- The system must not accuse students based on uncertain AI judgement

The primary MVP focus should remain on objective work status.

---

# 28. STREAKS

Streaks represent consistency.

They should resemble a contribution streak rather than an RPG mechanic.

Do NOT reward meaningless actions just to preserve a streak.

Only meaningful project activity should count.

---

# 29. SOCIAL ACCOUNTABILITY

Allow limited teammate visibility.

Example:

"Ani completed Checkpoint 4"

👍 5
🔥 3

Use simple reactions.

Do NOT turn SEDULITAS into a social media platform.

---

# 30. PERSONAL HABIT TRACKER

IMPORTANT:

The Habit Tracker is a separate personal system.

It is NOT part of institutional performance.

It does NOT contribute to:

- Organisation XP
- Organisation rank
- Organisation leaderboard
- Fair Play
- Institutional statistics

Students can use it for personal growth.

Examples:

- Coding practice
- Reading
- Exercise
- Sleep
- Personal study

Users can optionally share selected habit progress with friends.

Habit sharing is private and user-controlled.

Keep the Habit Tracker outside the organisation hierarchy at the data-model level.

---

# 31. NOTIFICATIONS

Use reminders based on project state.

Examples:

Student hasn't started:

> "You haven't started Checkpoint 1 yet. 3 days remain."

Student is behind:

> "You're behind the recommended pace."

Student is nearly finished:

> "One checkpoint left. You're on track."

Host:

> "6 students may need attention."

Use humour selectively.

Do NOT spam users.

---

# 32. DASHBOARD

## Student Dashboard

Show:

- Current organisation
- Current group
- Current project
- Current checkpoint
- Progress bar
- Deadline health
- XP
- Organisation rank
- Completed checkpoints
- Streak
- Recent activity
- Notifications/reminders

The first screen should make the next action obvious.

## Host Dashboard

Show:

- Organisation/group
- Current project
- Overall progress
- On-track students
- At-risk students
- Critical students
- Checkpoint completion
- Bottleneck checkpoints
- Pending verifications
- Recent activity
- Intervention options

---

# 33. NAVIGATION

Main navigation:

1. Dashboard
2. Organisations
3. Habits
4. Leaderboard
5. Profile

Organisation pages:

Organisation
├── Overview
├── Groups
├── Current Project
├── Progress
├── Leaderboard
└── Organisation Stats

Host users should have additional management controls.

---

# 34. PROJECT HISTORY

Project history should not remain indefinitely in the active system.

Current PRD rule:

After 5 days following the project deadline, remove project history from the active user-facing system.

However, retain aggregate organisation statistics.

Retained aggregate examples:

- Completed checkpoints
- XP
- Rank/statistical contribution
- Fair Play/accountability information where applicable
- Relevant organisation metrics

Implement deletion/retention in a way that is privacy-conscious and auditable.

---

# 35. SECURITY

Because the application stores submissions and performance data:

- Users only access organisations/groups they belong to
- Students cannot modify their own XP
- Students cannot modify their own rank
- Students cannot modify Fair Play
- Students cannot approve their own submissions
- Host permissions are enforced server-side
- PDFs are associated with the correct user/project/checkpoint
- Fair Play changes are auditable
- Organisation statistics do not leak across organisations
- Habit data is private unless explicitly shared
- AI output is never treated as trusted authority
- Sensitive actions require proper authorisation

Never trust client-side values for permissions, XP, rank, verification or accountability records.

---

# 36. MVP — MUST HAVE

Build these first:

### Authentication
- Sign up/login
- Role handling

### Organisation
- Create/manage organisation
- Membership
- Organisation roles

### Groups
- Create group
- Join group
- Host permissions

### Projects
- Create project
- Upload/import assignment
- Deadline

### AI Quest Builder
- PDF/DOCX/text input
- Assignment extraction
- AI-generated checkpoint proposal
- Editable preview
- Human approval
- Publish

### Checkpoints
- Linear progression
- Current/completed/locked states
- Progress percentage

### Submission
- PDF upload
- Status
- Timestamp
- Resubmission

### Verification
- Automatic mode
- Host approval mode

### Institutional intelligence
- Host command center
- On-track/at-risk/critical indicators
- Deadline health
- Checkpoint bottleneck analytics

### Motivation
- XP
- Group leaderboard
- Streak
- Simple reactions
- Random object avatars
- Restrained humour

### Personal system
- Separate habit tracker
- Private habit sharing

### Notifications
- Deadline reminders
- Progress reminders
- Host alerts

### Security
- Server-side role enforcement
- Secure file ownership
- Audit logs for sensitive actions

---

# 37. MVP — DO NOT BUILD

Do NOT waste development time on:

- AI procrastination detection
- Screen monitoring
- Keyboard monitoring
- Browser monitoring
- Automatic cheating accusations
- Complex skill trees
- Branching RPG systems
- Avatar customisation
- Avatar abilities
- Elaborate animations
- Full social network
- Public CV/portfolio
- Advanced LMS integrations
- Workplace-specific functionality
- Complex AI agents acting autonomously
- Automated academic decisions

---

# 38. TECHNICAL ARCHITECTURE

Build a real full-stack application, not merely a static mockup.

Required components:

- Authentication
- Database
- File storage
- Server-side authorisation
- API/backend logic
- AI API integration
- Structured AI outputs
- Notification system
- Audit logging
- Responsive frontend

Suggested entities:

User
Organisation
OrganisationMembership
Group
GroupMembership
Project
Checkpoint
CheckpointSubmission
Verification
FairPlayRecord
OrganisationStats
Streak
Reaction
Habit
HabitCompletion
HabitShare
Notification
RiskStatus
Intervention

Keep personal habit data separate from organisation data.

---

# 39. AI ARCHITECTURE

Use AI only where it provides clear value.

## AI use cases

1. Assignment/document understanding
2. Checkpoint generation
3. Suggested project structure
4. Optional summarisation of progress patterns
5. Suggested intervention actions

## AI safety rules

AI must never:

- Automatically publish assignments
- Automatically change academic requirements
- Automatically punish a student
- Automatically reduce Fair Play
- Automatically accuse cheating
- Automatically make disciplinary decisions

AI output should be:

AI suggestion
→ validation
→ human review where consequential
→ action

For assignment generation:

AI
→ structured JSON/schema
→ application validation
→ editable UI
→ human approval
→ database

If AI fails, the system should fall back to manual project/checkpoint creation.

---

# 40. RELIABILITY STRATEGY

The system must be useful even when AI is unavailable.

Manual fallback:

Create project
→ Add checkpoint
→ Set deadline
→ Publish

Therefore AI is an accelerator, NOT a dependency.

If AI generates poor checkpoints, the lecturer can edit them before publication.

If document extraction fails, allow the lecturer to paste the assignment text.

If the AI API is unavailable, normal SEDULITAS functionality must continue.

---

# 41. UI DESIGN

Visual identity:

**Minimal futuristic + professional**

The product should feel:

- Modern
- Clean
- Premium
- Slightly futuristic
- Professional
- Gen-Z compatible without becoming childish

Avoid:

- Excessive neon
- Excessive gradients
- Cartoon graphics
- Giant game buttons
- Fantasy RPG aesthetics
- Confetti everywhere
- Excessive animations

The game layer should exist inside a productivity/analytics interface.

---

# 42. KEY STUDENT EXPERIENCE

When the student opens the app, they should immediately see:

CURRENT QUEST

Build the Banking System

Progress:
██████░░░░ 60%

Current checkpoint:
⚔ Testing

Next:
Documentation

Deadline:
3 days 14 hours

Rank:
#12 / 58

The next action should be obvious.

---

# 43. KEY INSTITUTION EXPERIENCE

When a lecturer opens the app:

CLASS COMMAND CENTER

60 Students

🟢 41 On Track
🟡 13 At Risk
🔴 6 Critical

Assignment 3

Overall progress: 67%

Then:

Checkpoint health

Requirements     96%
Design           91%
Implementation   78%
Testing          43% ⚠
Documentation    12%

The lecturer should immediately understand:

- How the class is doing
- Who may need attention
- Where students are getting stuck
- What needs intervention

---

# 44. PRIMARY DEMO SCENARIO

The application must make this scenario easy to demonstrate.

### Step 1 — Lecturer uploads assignment

Example:

"Build a C Banking Management System."

### Step 2 — AI Quest Builder

SEDULITAS analyses it.

Shows:

01 Requirements
02 Design
03 Implementation
04 Testing
05 Final Submission

Lecturer edits if necessary.

Clicks:

APPROVE & PUBLISH

### Step 3 — Students receive the same quest

Students see their linear progression.

### Step 4 — Students complete checkpoints

Progress updates.

XP updates.

Leaderboard updates.

### Step 5 — Lecturer Command Center

The lecturer sees:

60 students

41 On Track
13 At Risk
6 Critical

### Step 6 — Bottleneck

The dashboard shows:

Testing — 43%

The lecturer immediately knows that this stage is causing difficulty.

### Step 7 — Intervention

The lecturer can inspect affected students and take an appropriate action.

The important demonstration is NOT:

"Look, we have XP."

The important demonstration is:

> **"We converted a large assignment into measurable progress and gave the institution visibility before the deadline."**

Gamification is what keeps students moving through that system.

---

# 45. PRODUCT VALUE

## Student

SEDULITAS answers:

> "What should I do next?"

## Lecturer

SEDULITAS answers:

> "Who needs attention?"

## Institution

SEDULITAS answers:

> "Where is work getting stuck?"

## Product

SEDULITAS combines:

**Structured work + measurable progress + early visibility + human intervention + motivational game mechanics**

---

# 46. CORE PRODUCT LOOP

Assignment
↓
AI-assisted decomposition
↓
Human approval
↓
Student works
↓
Checkpoint progress
↓
Real-time visibility
↓
Risk indication
↓
Human intervention
↓
Completion
↓
Organisation analytics

Gamification surrounds this loop:

XP
Progress
Leaderboard
Streak
Social accountability
Humour

---

# 47. BUILD PRIORITY

If development time is limited, build in this exact order:

## Priority 1
Authentication + roles

## Priority 2
Organisation + group

## Priority 3
Project + checkpoints

## Priority 4
Student progression

## Priority 5
Submission + verification

## Priority 6
Host Command Center

## Priority 7
Risk indicators + deadline health

## Priority 8
AI Quest Builder

## Priority 9
XP + leaderboard

## Priority 10
Notifications + reactions + streak

## Priority 11
Personal Habit Tracker

## Priority 12
Visual polish

Do not sacrifice the core workflow to build decorative game mechanics.

---

# 48. BUILD INSTRUCTIONS FOR THE AI CODING AGENT

You are building a production-quality MVP, not a static landing page.

Before coding:

1. Understand the complete data model.
2. Define user roles and permissions.
3. Define the student and host workflows.
4. Define the database relationships.
5. Define the AI input/output schema.
6. Define validation and fallback behaviour.
7. Define security boundaries.

Then implement incrementally.

Every major feature must work end-to-end.

Do not create fake buttons that do nothing.

Do not use hardcoded leaderboard values once backend functionality is available.

Do not expose privileged operations to the client without server-side authorisation.

Do not store organisation statistics in a global user-only record.

Do not mix personal habits with organisation data.

---

# 49. AI BUILD AGENT BEHAVIOUR

When implementing the application:

- Prefer simple reliable architecture over unnecessary complexity.
- Do not invent requirements that are not specified here.
- If an implementation detail is unspecified, choose the simplest reasonable implementation that preserves the product principles.
- Keep all AI-generated academic content editable.
- Always provide manual fallback functionality.
- Never allow AI to silently make consequential decisions.
- Keep the UI responsive on mobile, tablet and desktop.
- Build accessible components.
- Handle loading, empty, error and success states.
- Validate uploaded files.
- Protect organisation and student data.
- Add clear confirmation states for destructive actions.
- Maintain clean separation between student and host experiences.

---

# 50. FINAL PRODUCT IDENTITY

SEDULITAS should NOT feel like:

"A to-do list with XP."

It should feel like:

> **A professional progress-management platform where real-world work becomes a structured quest, students get a motivating game layer, and institutions gain visibility before work turns into a deadline problem.**

Primary pitch:

> **"SEDULITAS turns real-world work into measurable quests and gives institutions visibility before failure happens."**

Secondary hook:

> **"It's basically a game layer for real-world work."**

Build the MVP so this concept is immediately visible within the first few minutes of use.
