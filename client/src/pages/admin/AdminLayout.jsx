import AdminNavbar from "./AdminNavbar";

export default function AdminLayout({ children }) {
  return (
    <div>
      <AdminNavbar />
      <main>{children}</main>
    </div>
  );
}
