PROJECT DOCUMENTATION: QuizMaster Onyx
Table of Contents
Executive Summary

System Architecture

Feature Specification

Technical Stack

Installation and Local Development

API Reference

Deployment Strategy

Troubleshooting and Maintenance

1. Executive Summary
   QuizMaster Onyx is an advanced, adaptive learning assessment platform designed to convert unstructured educational content into structured, active-recall examinations. Leveraging Large Language Model (LLM) inference via the Groq LPU engine, the application ingests multi-modal inputs—specifically Portable Document Formats (PDF) and YouTube video transcripts—to generate context-aware quizzes in real-time.

The platform distinguishes itself through a "Dual-Layer Explanation Engine" (ELI5), which provides users with both academic-standard definitions and simplified conceptual analogies simultaneously. Designed with a mobile-first, monochrome aesthetic, it adheres to high-contrast accessibility standards and utilizes client-side heuristics to minimize server costs while maximizing user interactivity.

2. System Architecture
   The application is built upon a Next.js 14 framework utilizing the App Router architecture. It follows a decoupled client-server model where state management is handled locally for immediate UI responsiveness, while heavy computational tasks (text parsing and AI inference) are offloaded to serverless API routes.

2.1 Data Ingestion Pipeline
Input Vectorization:

PDFs: The system utilizes pdf2json to parse binary PDF buffers into raw text strings. A custom sanitizer algorithm removes whitespace artifacts, headers, and footers to reduce token usage.

YouTube: The system utilizes youtube-transcript to fetch closed captions. It automatically concatenates time-stamped segments into a coherent text block.

The Onyx Brain (AI Logic):

The processed text is sent to the /api/quiz/generate endpoint.

The prompt engineering layer constructs a strict JSON-schema request, injecting parameters for Difficulty (Easy, Normal, Hard) and Format (MCQ, True/False, Fill-in-the-Blank).

Sanitization Layer: Upon receiving the response from the Llama 3 model, a regex-based cleaning function strips Markdown code blocks and conversational filler text to prevent JSON parsing errors (Runtime Syntax Errors).

Frontend State Management:

The application uses React Hooks (useState, useEffect) to manage the quiz lifecycle (Setup -> Quiz -> Results).

Persistence: API keys are stored in the browser's localStorage to ensure a frictionless return user experience without compromising server-side security.

3. Feature Specification
   3.1 Adaptive Difficulty Engine
   The system does not simply randomize questions; it alters the semantic complexity based on user selection:

Easy: Focuses on high-level definitions and direct fact retrieval.

Normal: Tests application of concepts and relationships between ideas.

Hard: Generates edge-case scenarios and complex reasoning problems with ambiguous distractors.

3.2 Dual-Layer Explanation (ELI5)
To support diverse learning speeds, every generated question contains two metadata fields for feedback:

explanation: A formal, academic rationale citing the source text.

simple_explanation: An analogy-based breakdown (Explain Like I'm 5) generated specifically to demystify complex jargon.

3.3 Professional Reporting
The application includes a client-side PDF generation engine using jspdf and jspdf-autotable. It produces an archival-grade report containing:

Session Metadata (Date, Subject, Difficulty).

Quantitative Scoring.

Itemized Question Analysis (Pass/Fail status per item).

3.4 Onyx Design System
The User Interface (UI) follows a strict "Brutalist Monochrome" design language:

Visuals: Pure black-and-white color palette with high-contrast borders.

Physics: Motion-damped animations using Framer Motion for transitions.

Haptics: Integration with the Web Vibration API to provide tactile feedback on mobile devices during interaction.

4. Technical Stack
   Core Framework
   Next.js 14: Server-side rendering and API routes.

TypeScript: Static typing for robustness and error prevention.

React 18: Component-based UI architecture.

Artificial Intelligence
Groq Cloud: Inference engine provider.

Llama 3 (8B): Underlying Large Language Model.

Utilities & Libraries
Tailwind CSS: Utility-first styling.

Shadcn/UI: Accessible component primitives (Radix UI based).

Framer Motion: Animation library for React.

Zod: Schema validation (implicit in API handling).

Canvas Confetti: Particle effects engine.

Lucide React: Iconography.

5. Installation and Local Development
   Prerequisites
   Node.js version 18.17 or higher.

npm (Node Package Manager).

A valid Groq API Key (obtained from the Groq console).

Setup Instructions
Clone the Repository:

Bash
git clone https://github.com/kamleshp214/quizmaster-ai.git
cd quizmaster-ai
Install Dependencies: It is critical to install all dependencies, including type definitions, to prevent build failures.

Bash
npm install
npm install jspdf jspdf-autotable canvas-confetti
npm install --save-dev @types/canvas-confetti
Environment Configuration: While the application accepts API keys via the UI, you may create a .env.local file to define default behavior (optional).

Code snippet

# Optional: Default API Key

NEXT_PUBLIC_GROQ_API_KEY=your_key_here
Run Development Server:

Bash
npm run dev
Access the application at http://localhost:3000.

6. API Reference
   Endpoint: POST /api/quiz/generate
   Description: Parses input media and generates a structured JSON quiz object.

Request Header:Content-Type: multipart/form-data

Request Body Parameters:

file (File, Optional): The PDF document to parse.

youtubeUrl (String, Optional): The URL of the YouTube video.

apiKey (String, Required): The Groq API key for authentication.

amount (Integer, Default: 5): Number of questions to generate.

difficulty (String: "easy" | "normal" | "hard"): Complexity level.

quizType (String: "mcq" | "tf" | "fib" | "mix"): Question format.

Response Schema (JSON):

JSON
{
"subject": "String (Detected Topic)",
"questions": [
{
"question": "String",
"options": ["String", "String", "String", "String"],
"answer": "String",
"explanation": "String",
"simple_explanation": "String",
"type": "String"
}
]
} 7. Deployment Strategy
This application is optimized for Vercel. To ensure a successful deployment, follow the Git workflow below strictly.

7.1 Pre-Deployment Checks
Before pushing, ensure the build passes locally to catch TypeScript errors.

Bash
npm run build
If this command fails locally, it will fail on Vercel. Fix all errors before proceeding.

7.2 Git Commands (Push to Production)
Execute these commands in your terminal:

Initialize and Stage:

Bash
git init
git add .
Commit:

Bash
git commit -m "Release: Onyx V5 Stable - Mobile Optimized"
Branch Configuration:

Bash
git branch -M main
Remote Connection:

Bash
git remote add origin https://github.com/kamleshp214/quizmaster-ai.git
Push:

Bash
git push -u origin main
(If you have pushed before, simply use git push).

7.3 Vercel Configuration
Import the repository from GitHub.

Leave "Build Command" and "Output Directory" as default.

No Environment Variables are required for the build to succeed, as the API key is handled via the UI inputs.

Click Deploy.

8. Troubleshooting
   Issue: PDF Parsing Fails

Cause: The PDF may be a scanned image (raster) rather than a digital document (vector).

Solution: Use an OCR tool to convert the PDF to text before uploading, or ensure the PDF allows text selection.

Issue: "AI Generation Failed"

Cause: The text content exceeds the context window of the Llama 3 model, or the API key is invalid.

Solution: The application automatically truncates text to 25,000 characters. Ensure your API key has available quota.

Issue: TypeScript Build Errors

Cause: Missing type definitions for third-party libraries.

Solution: Ensure @types/canvas-confetti is installed and tsconfig.json is strictly followed.

End of Documentation
