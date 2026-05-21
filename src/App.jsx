import { useEffect, useState } from "react";
import AdminApp from "./components/AdminApp.jsx";
import ClientApp from "./components/ClientApp.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import Toast from "./components/Toast.jsx";
import { ToastContext } from "./hooks/useToast.js";
import { getDeviceId } from "./services/storageService.js";

export default function App() {
  const [role, setRole] = useState(null);
  const [deviceId, setDeviceId] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  const notify = (type, message) => setToast({ type, message, id: Date.now() });
  const backHome = () => setRole(null);

  return (
    <ToastContext.Provider value={notify}>
      {!role && <LoginScreen deviceId={deviceId} onSelectRole={setRole} />}
      {role === "client" && <ClientApp deviceId={deviceId} onBack={backHome} />}
      {role === "admin" && <AdminApp onBack={backHome} />}
      {toast && (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </ToastContext.Provider>
  );
}
