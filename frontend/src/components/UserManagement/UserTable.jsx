import { useState, useEffect } from 'react';
import { listUsers, deactivateUser, activateUser, deleteUser } from '../../api/admin';

export default function UserTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ role: '', is_active: '', search: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [action, setAction] = useState(null); // 'view', 'edit', 'role', 'deactivate', 'delete'

  useEffect(() => {
    loadUsers();
  }, [page, filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await listUsers(page, limit, {
        role: filters.role || undefined,
        is_active: filters.is_active ? filters.is_active === 'active' : undefined,
        search: filters.search || undefined,
      });
      setUsers(res.data.data);
      setTotal(res.data.meta.total);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (userId, reason) => {
    try {
      await deactivateUser(userId, reason);
      loadUsers();
      setAction(null);
    } catch (err) {
      console.error('Failed to deactivate user:', err);
    }
  };

  const handleActivate = async (userId) => {
    try {
      await activateUser(userId);
      loadUsers();
      setAction(null);
    } catch (err) {
      console.error('Failed to activate user:', err);
    }
  };

  const handleDelete = async (userId, cascade) => {
    try {
      await deleteUser(userId, cascade);
      loadUsers();
      setAction(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={filters.search}
          onChange={(e) => {
            setFilters({ ...filters, search: e.target.value });
            setPage(1);
          }}
          className="px-3 py-2 border rounded flex-1 min-w-[200px]"
        />
        <select
          value={filters.role}
          onChange={(e) => {
            setFilters({ ...filters, role: e.target.value });
            setPage(1);
          }}
          className="px-3 py-2 border rounded"
        >
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="MODERATOR">Moderator</option>
          <option value="ANALYST">Analyst</option>
          <option value="CONTRIBUTOR">Contributor</option>
        </select>
        <select
          value={filters.is_active}
          onChange={(e) => {
            setFilters({ ...filters, is_active: e.target.value });
            setPage(1);
          }}
          className="px-3 py-2 border rounded"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Translations</th>
              <th className="px-4 py-2 text-left">Joined</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-2 text-center">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-2 text-center">No users found</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{user.name}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2">{user._count.translations}</td>
                  <td className="px-4 py-2 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedUser(user); setAction('view'); }} className="text-blue-600 hover:underline text-sm">
                        View
                      </button>
                      <button onClick={() => { setSelectedUser(user); setAction('role'); }} className="text-purple-600 hover:underline text-sm">
                        Role
                      </button>
                      {user.is_active ? (
                        <button onClick={() => { setSelectedUser(user); setAction('deactivate'); }} className="text-yellow-600 hover:underline text-sm">
                          Deactivate
                        </button>
                      ) : (
                        <button onClick={() => handleActivate(user.id)} className="text-green-600 hover:underline text-sm">
                          Activate
                        </button>
                      )}
                      <button onClick={() => { setSelectedUser(user); setAction('delete'); }} className="text-red-600 hover:underline text-sm">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(5, pages) }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 border rounded ${page === i + 1 ? 'bg-blue-500 text-white' : ''}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(Math.min(pages, page + 1))}
            disabled={page === pages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Action Modals */}
      {action === 'deactivate' && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded max-w-md w-full">
            <h2 className="text-lg font-bold mb-4">Deactivate User</h2>
            <p className="mb-4">Deactivate {selectedUser.name}? They won't be able to log in.</p>
            <div className="flex gap-2">
              <button onClick={() => setAction(null)} className="px-4 py-2 border rounded flex-1">
                Cancel
              </button>
              <button
                onClick={() => handleDeactivate(selectedUser.id, 'admin_action')}
                className="px-4 py-2 bg-yellow-600 text-white rounded flex-1"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {action === 'delete' && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded max-w-md w-full">
            <h2 className="text-lg font-bold mb-4">Delete User</h2>
            <p className="mb-4">Delete {selectedUser.name} permanently? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setAction(null)} className="px-4 py-2 border rounded flex-1">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedUser.id, false)}
                className="px-4 py-2 bg-red-600 text-white rounded flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
