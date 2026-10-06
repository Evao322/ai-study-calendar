import { useState } from "react";
import { clearSession, getSession, type AuthUser } from "./api";
import { AuthScreen } from "./pages/AuthScreen";
import { StudentDashboard } from "./pages/StudentDashboard";
import { TeacherDashboard } from "./pages/TeacherDashboard";

function App() {
  const [user, setUser] = useState<AuthUser | null>(getSession());

  function handleLogout() {
    clearSession();
    setUser(null);
  }

  if (!user) {
    return <AuthScreen onAuthed={setUser} />;
  }

  if (user.role === "teacher") {
    return <TeacherDashboard user={user} onLogout={handleLogout} />;
  }

  return <StudentDashboard user={user} onLogout={handleLogout} />;
}

export default App;
