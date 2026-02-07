import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { HomePage } from "./pages/HomePage";
import { InputPage } from "./pages/InputPage";
import { MetaPage } from "./pages/MetaPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TrackerPage } from "./pages/TrackerPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="tracker/:trackerKey" element={<TrackerPage />} />
        <Route path="input/:trackerKey" element={<InputPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/meta" element={<MetaPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
