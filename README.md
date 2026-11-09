<div align="center">
  <br />
    <a href="your-demo-video-link" target="_blank">
      <img src="./public/report.jpg" alt="Project Banner">
    </a>
  
  <br />

  <div>
    <img src="https://img.shields.io/badge/-TypeScript-black?style=for-the-badge&logoColor=white&logo=typescript&color=3178C6" alt="typescript" />
    <img src="https://img.shields.io/badge/-Next_JS-black?style=for-the-badge&logoColor=white&logo=nextdotjs&color=000000" alt="nextdotjs" />
    <img src="https://img.shields.io/badge/-Tailwind_CSS-black?style=for-the-badge&logoColor=white&logo=tailwindcss&color=06B6D4" alt="tailwindcss" />
    <img src="https://img.shields.io/badge/-Prisma-black?style=for-the-badge&logoColor=white&logo=prisma&color=2D3748" alt="prisma" />
  </div>

  <h3 align="center">Anonymous Reporting App</h3>

   <div align="center">
     A secure platform for anonymous incident reporting
    </div>
</div>

## 📋 <a name="table">Table of Contents</a>

1. 🤖 [Introduction](#introduction)
2. ⚙️ [Tech Stack](#tech-stack)
3. 🔋 [Features](#features)
4. 🤸 [Quick Start](#quick-start)
5. 🕸️ [Environment Setup](#environment)
6. 🚀 [Deployment](#deployment)

## <a name="introduction">🤖 Introduction</a>

This is a state-of-the-art anonymous reporting system built with Next.js 14, designed to provide a secure platform for reporting incidents while maintaining complete anonymity.

## <a name="tech-stack">⚙️ Tech Stack</a>

- Next.js 14
- TypeScript
- Prisma with Neon Database
- NextAuth.js for Authentication
- Tailwind CSS
- React Hook Form
- GeminiAI
- BCrypt for Password Encryption

## <a name="quick-start">🤸 Quick Start</a>

**Prerequisites**

Make sure you have the following installed:

- [Node.js](https://nodejs.org/en)
- [npm](https://www.npmjs.com/)
- [Git](https://git-scm.com/)

**Installation**

```bash
# Clone the repository
git clone <your-repo-url>
cd anonymous-reporting-system

# Install dependencies
npm install

# Set up the database
npx prisma generate
npx prisma db push

# Start the development server
npm run dev
```

## <a name="environment">🕸️ Environment Setup</a>

Create a `.env` file in the root directory with the following variables:

```env

NEXT_PUBLIC_MAPBOX_API_KEY=your-mapbox-key
DATABASE_URL=postgresql:your-database-url
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000/api/auth"
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-access-api-key

# Mobile password reset (optional until the forgot-password flow is used)
RESEND_API_KEY=re_your-resend-key
PASSWORD_RESET_FROM="SafeReport <no-reply@your-domain.com>"
# PASSWORD_RESET_SECRET falls back to NEXTAUTH_SECRET

```

## <a name="deployment">🚀 Deployment</a>

The application can be easily deployed on [Vercel](https://vercel.com):

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Configure the environment variables
4. Deploy!

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
