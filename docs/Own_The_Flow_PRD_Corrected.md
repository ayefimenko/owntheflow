
# 🏄 Own The Flow — Product Requirements Document (PRD)

## 🧭 Product Overview

**Own The Flow** is an AI-powered online learning platform designed for business-oriented professionals — including COOs, Project Managers, Product Managers, Delivery Directors, and Founders — who seek to understand technical systems, tools, and workflows in order to collaborate confidently with developers and lead smarter.

---

## 🎨 Brand Identity

- **Name:** Own The Flow  
- **Symbol:** Surfer (represents agility, mastery, and control)  
- **Tone:** Confident, clear, intelligent  
- **Visual Style:** Waves, pipelines, systems diagrams  
- **Tagline:** "Understand systems. Lead smarter."

---

## 🎯 Target Audience

| Persona            | Role               | Needs                                                               |
|--------------------|--------------------|---------------------------------------------------------------------|
| Product Manager     | Non-technical      | Understand APIs, workflows, architecture                            |
| Project Manager     | Delivery-focused   | Learn CI/CD, testing, risks, handovers                              |
| COO                 | Executive operator | Align tech with business ops, automation, reporting                 |
| Delivery Director   | Ops-focused        | Communicate clearly with dev teams and clients                      |
| Founder/CEO         | Business lead      | Understand velocity, quality, architecture for investment decisions |

---

## 🧪 Core Value Proposition

Own The Flow bridges the business–tech gap through plain-language theory, real-world case simulations, and AI-powered mentorship that feels personalized and actionable for professionals with limited technical time.

---

## 🔗 MVP Scope

### ✅ Features to Include

- Supabase authentication  
- Role-based access: admin, content manager, user  
- AI assistant for writing, rewriting, explaining  
- Drag-and-drop curriculum builder  
- Reusable lessons/modules  
- Learning progress system with XP + titles  
- Open-ended quizzes with AI feedback  
- Certificates with LinkedIn support and verification  
- Draft/publish/archive states for lessons

### ❌ Features to Exclude

- Peer collaboration or community  
- Custom path recommendation logic  
- Adaptive or personalized learning plans  
- Gamified leaderboards  
- Certificate expiry

---

## 📚 Learning Structure

```
Path → Course → Module → Lesson → Challenge
```

**Example Path:** *General Technical Skills for Managers*  
- Course: CI/CD Pipeline  
- Module: GitHub Actions  
- Lesson: Writing Your First Workflow  
- Challenge: Fix a broken pipeline in staging

---

## 🎮 Gamification System

- Variable XP per lesson (based on performance)  
- Level system with custom titles (e.g., "API Guru", "CI/CD Hero")  
- Badges for completed paths  
- Visual progress bar on dashboard  
- Milestone animations and modals

---

## 🤖 AI Roles in Platform

- Role-based explanation engine (e.g., simplify for COO, go deeper for PM)  
- Rewrite and simplify lesson content for tone and clarity  
- Suggest and grade quizzes  
- Analyze open-ended answers and provide visual feedback  
- Lesson editor copilot for admins/content managers

---

## 🛠 Admin & Content Tools

- **Roles:**  
  - Admin: Full access to publish, issue certificates, override content  
  - Content Manager: Can draft and edit but cannot publish  
  - User: Learner with track access

- **Permissions & States:**  
  - Lessons and modules can be in draft, published, or archived states  
  - Only Admins can publish or archive  
  - Single-editor model per item  
  - Drag-and-drop curriculum builder with reusable elements  
  - Built-in AI copilot for lesson editing and generation

---

## 📄 Certificate Logic

- Issued upon course or path completion  
- Includes learner name, track, title, date, unique ID  
- Public validation URL: `/cert/:uuid`  
- Shareable “Add to LinkedIn” button  
- Manual issue/revoke via admin interface

---

## 🏗 Tech Stack (Planned)

- **Frontend:** Next.js (App Router), Tailwind CSS  
- **Backend:** Supabase (Postgres, Auth)  
- **AI:** OpenAI GPT-4o  
- **Content Editor:** TipTap / Markdown Editor  
- **Drag & Drop:** dnd-kit or React Beautiful DnD  
- **Hosting:** Vercel  
- **Certificate Format:** PDF or styled HTML with unique slug

---

## 🚦 MVP Sprint Roadmap (8 Sprints)

1. **Core Setup & Auth**  
   - Next.js + Tailwind + Supabase auth + role logic  
   - Protected dashboard shell + dummy test users

2. **Content Models & Editor**  
   - Create/edit lessons & modules + draft/publish/archive  
   - Markdown editor with preview

3. **AI Editor Assistant**  
   - Summarize, rewrite, role-based tone assistant in editor

4. **Curriculum Builder**  
   - Drag-and-drop UI + relationship persistence + reuse logic

5. **Learner Experience**  
   - Track browser, lesson player, markdown rendering, save progress

6. **Quiz Engine & XP System**  
   - MCQs, drag-drop, open-text (AI scored)  
   - XP tracking, level-up logic, learner titles

7. **Certificate Engine**  
   - Triggered upon completion  
   - Admin manual controls, LinkedIn sharing

8. **Final QA & Demo Content**  
   - Sample paths (e.g. API, CI/CD), bugfixes, polish  
   - README + deployment prep + internal demo on Mac

---

## ✅ Local Dev Notes

- All development and testing will be done **locally on your Mac**  
- Supabase will remain in cloud (no local DB required)  
- MVP will be published **after internal testing is complete**
