## Overview

The Expense Assistant is a full-stack Next.js application that provides comprehensive personal finance management capabilities. The application follows a modern, scalable architecture using TypeScript for type safety, Prisma ORM for database management, and TailwindCSS for responsive styling. The system is designed with security, performance, and user experience as primary considerations.

## Architecture

### Technology Stack

- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Styling**: TailwindCSS with Headless UI components
- **Backend**: Next.js API Routes with TypeScript
- **Database**: MySQL with Prisma ORM
- **Authentication**: NextAuth.js with email/password and Google OAuth
- **Email**: Nodemailer or similar service for notifications
- **State Management**: React Context API with useReducer for complex state
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Chart.js or Recharts for analytics visualization

## Components and Interfaces

### Core Components Structure

src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── income/
│   │   ├── expenses/
│   │   ├── budget/
│   │   ├── simulation/
│   │   └── analytics/
│   ├── api/
│   │   ├── auth/
│   │   ├── income/
│   │   ├── expenses/
│   │   ├── budget/
│   │   ├── notifications/
│   │   └── analytics/
│   └── globals.css
├── components/
│   ├── ui/
│   ├── forms/
│   ├── charts/
│   ├── layout/
│   └── notifications/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── validations/
│   ├── utils/
│   └── services/
├── types/
└── hooks/
