import { useState } from "react";
import { clearSession, getSession, type AuthUser } from "./api";
import { AuthScreen } from "./pages/AuthScreen";
import { StudentDashboard } from "./pages/StudentDashboard";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import { LanguageProvider } from "./i18n";

function App() {
  const [user, setUser] = useState<AuthUser | null>(getSession());

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  return (
    <LanguageProvider>
      {!user ? (
        <AuthScreen onAuthed={setUser} />
      ) : user.role === "teacher" ? (
        <TeacherDashboard user={user} onLogout={handleLogout} />
      ) : (
        <StudentDashboard user={user} onLogout={handleLogout} />
      )}
    </LanguageProvider>
  );
}

export default App;
