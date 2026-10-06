import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  ChevronDown 
} from 'lucide-react';

export function Staffs() {
  const [staffList, setStaffList] = useState([
    { id: 1, initials: 'JD', name: 'Juan Dela Cruz', role: 'Service Advisor', email: 'juan@repairms.ph', phone: '09171234567', status: 'Active', since: 'Jan 2024', color: 'bg-[#C85A17]' },
    { id: 2, initials: 'MS', name: 'Maria Santos', role: 'Service Advisor', email: 'maria@repairms.ph', phone: '09281234567', status: 'Active', since: 'Mar 2024', color: 'bg-[#C85A17]' },
    { id: 3, initials: 'NM', name: 'Noel Mercadal', role: 'Admin', email: 'noel@repairms.ph', phone: '09191234567', status: 'Active', since: 'Jan 2023', color: 'bg-[#C85A17]' },
    { id: 4, initials: 'CR', name: 'Carla Reyes', role: 'Manager', email: 'carla@repairms.ph', phone: '09261234567', status: 'Active', since: 'Jun 2023', color: 'bg-[#C85A17]' },
    { id: 5, initials: 'PB', name: 'Paolo Bautista', role: 'Service Advisor', email: 'paolo@repairms.ph', phone: '09351234567', status: 'On Leave', since: 'Sep 2024', color: 'bg-[#C85A17]' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'Service Advisor',
    status: 'Active'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) return;

    const nameParts = formData.fullName.trim().split(' ');
    const initials = nameParts.length > 1 
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase() 
      : nameParts[0].substring(0, 2).toUpperCase();

    const newMember = {
      id: Date.now(),
      initials,
      name: formData.fullName,
      role: formData.role,
      email: formData.email,
      phone: formData.phone || '09170000000',
      status: formData.status,
      since: 'Oct 2026',
      color: 'bg-[#C85A17]'
    };

    setStaffList([newMember, ...staffList]);
    setFormData({ fullName: '', email: '', phone: '', role: 'Service Advisor', status: 'Active' });
    setIsModalOpen(false);
  };

  const activeCount = staffList.filter(s => s.status === 'Active').length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 font-sans text-slate-800">
      
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-[#FDEFEF] rounded-xl text-[#C85A17] mt-0.5">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff Management</h2>
              <p className="text-sm text-slate-500 mt-0.5">Manage service advisors and administrative access</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-slate-600 bg-white px-3.5 py-2 rounded-full border border-slate-200/80 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium text-slate-700">System operational</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">August 27, 2026</span>
          </div>
        </div>

        {/* Table Container Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Staff Members</h3>
              <p className="text-xs text-slate-500 mt-0.5">{staffList.length} members • {activeCount} active</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#C85A17] hover:bg-[#B34E13] text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Since</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {staffList.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full ${member.color} text-white font-bold flex items-center justify-center text-xs shrink-0`}>
                          {member.initials}
                        </div>
                        <span className="font-bold text-slate-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{member.role}</td>
                    <td className="py-4 px-4 text-slate-600">{member.email}</td>
                    <td className="py-4 px-4 text-slate-600">{member.phone}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        member.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500">{member.since}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2 text-slate-400">
                        <button className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Add Staff Member Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200">
            
            <div className="px-6 pt-6 pb-2 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Staff Member</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="e.g. Juan Dela Cruz" 
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="e.g. juan@repairms.ph" 
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone</label>
                <input 
                  type="text" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g. 09171234567" 
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Role</label>
                  <div className="relative">
                    <select 
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 pr-8 cursor-pointer"
                    >
                      <option value="Service Advisor">Service Advisor</option>
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Status</label>
                  <div className="relative">
                    <select 
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 pr-8 cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-[#C85A17] hover:bg-[#B34E13] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Add Member
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}