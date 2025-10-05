#  Mini Trello (Kanban) App

A **Mini Trello Clone** built with **React + TypeScript + Vite**, styled using **Tailwind CSS**, and powered by **Supabase** for authentication and backend.  
Users can **sign up, verify their email, log in, and manage their boards, lists, and cards** in a clean Kanban-style interface — just like Trello.

🔗 **GitHub Repository:** [Mini-Trello-Kanban-App](https://github.com/sravyavelampalli/Mini-Trello-Kanban-App)

---

##  Features

 **User Authentication**
- Secure signup and login using Supabase Auth.
- Email verification for new users.
- Forgot password support.

 **Kanban Board**
- Create multiple boards.
- Add, edit, and delete lists (columns).
- Create and move cards between lists (drag-and-drop).
- Realtime updates with Supabase (if configured).

 **Modern UI**
- Responsive design using Tailwind CSS.
- Clean component structure for scalability.

 **Developer Friendly**
- Built with Vite for fast development.
- TypeScript for type safety.
- Environment variables managed through `.env`.

---

##  Tech Stack

| Category | Technology |
|-----------|-------------|
| Frontend | React (TypeScript + Vite) |
| Styling | Tailwind CSS |
| Backend | Supabase (Auth + Database) |
| State Management | React Hooks / Context |

---


##  Environment Setup

Before running the app, create a `.env` file in the root directory and add your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### How to Get These:
1. Go to your [Supabase Dashboard](https://app.supabase.com/).
2. Create a new project.
3. Under **Settings → API**, copy your **Project URL** and **Anon Public Key**.
4. Paste them in your `.env` file.

---

##  How to Run Locally (VS Code)

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/sravyavelampalli/Mini-Trello-Kanban-App.git
cd Mini-Trello-Kanban-App
```

### 2️⃣ Open in VS Code
```bash
code .
```

### 3️⃣ Install Dependencies
```bash
npm install
```

### 4️⃣ Start the Development Server
```bash
npm run dev
```

Now open your browser and go to:
```
http://localhost:5173
```

If you see the Mini Trello login page —  you’re ready to go!

---

##  Authentication Flow (Supabase)

###  1. Sign Up
- Navigate to the **Sign Up** page.
- Enter your **email** and **password**.
- Click **Create Account**.

>  Supabase will send a verification email.  
> Click the verification link in your inbox to activate your account.

###  2. Login
- After verifying your email, go to the **Login** page.
- Enter your credentials.
- Upon success, you’ll be redirected to the Kanban dashboard.

###  3. Forgot Password (optional)
- Click on “Forgot Password?” on the login page.
- Follow the link sent by Supabase to reset your password.

---

##  Kanban Functionality

- **Create Board:** Add a new board from the dashboard.
- **Add List:** Within each board, create lists (e.g., To Do, In Progress, Done).
- **Add Cards:** Add tasks as cards within each list.
- **Drag and Drop:** Move cards between lists interactively.
- **Edit/Delete:** Modify or remove lists and cards as needed.
- **Responsive Design:** Works across all screen sizes.

---

##  Scripts

```bash
npm run dev       # Start local development server
npm run build     # Build the project for production
npm run preview   # Preview the production build
npm run lint      # Lint code with ESLint
```

---

## 💡 Tips & Troubleshooting

- Keep your `.env` file **private** — never commit it to GitHub.
- Make sure **Supabase authentication** is enabled under “Authentication → Providers → Email”.
- If Tailwind styles don’t appear, stop and restart the dev server.

---

