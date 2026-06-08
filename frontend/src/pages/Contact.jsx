import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { submitTicket } from '../api/tickets';

const CATEGORIES = [
  { value: 'GENERAL',             label: 'General Enquiry' },
  { value: 'TECHNICAL',           label: 'Technical Issue' },
  { value: 'TRANSLATION_QUALITY', label: 'Translation Quality' },
  { value: 'ACCOUNT',             label: 'Account / Login' },
  { value: 'DATA_REQUEST',        label: 'Data / Export Request' },
  { value: 'FUNDING',             label: 'Funding & Partnerships' },
  { value: 'OTHER',               label: 'Other' },
];

export default function Contact() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name:     user?.name  || '',
    email:    user?.email || '',
    subject:  '',
    category: 'GENERAL',
    message:  '',
  });
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [error, setError]   = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      await submitTicket(form);
      setStatus('success');
      setForm({ name: '', email: '', subject: '', category: 'GENERAL', message: '' });
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-liberia-blue text-white py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-black mb-2">Contact Us</h1>
          <p className="text-gray-300 text-lg">
            Have a question, issue, or partnership enquiry? We'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-10">

          {/* Contact info */}
          <div className="space-y-6 text-sm text-gray-600">
            <div>
              <h3 className="font-black text-gray-800 mb-1">Response Time</h3>
              <p>We aim to respond to all messages within 2–3 business days.</p>
            </div>
            <div>
              <h3 className="font-black text-gray-800 mb-1">Technical Issues</h3>
              <p>For bugs or access problems, select "Technical Issue" and include as much detail as possible.</p>
            </div>
            <div>
              <h3 className="font-black text-gray-800 mb-1">Research Partnerships</h3>
              <p>Universities and NGOs interested in using or contributing to the dataset — use the "Funding & Partnerships" category.</p>
            </div>
            <div>
              <h3 className="font-black text-gray-800 mb-1">Quick Links</h3>
              <ul className="space-y-1">
                <li><Link to="/faq" className="text-liberia-blue hover:underline">View FAQ →</Link></li>
                <li><Link to="/funding" className="text-liberia-blue hover:underline">Support the Project →</Link></li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            {status === 'success' ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                <div className="text-4xl mb-3">✓</div>
                <h2 className="text-xl font-black text-green-800 mb-2">Message Sent</h2>
                <p className="text-green-700 text-sm mb-6">
                  Thank you for reaching out. We'll get back to you within 2–3 business days.
                </p>
                <button
                  onClick={() => setStatus(null)}
                  className="bg-liberia-blue hover:bg-blue-900 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                    <input
                      required
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Your name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="you@example.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={set('category')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-blue bg-white"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Subject *</label>
                  <input
                    required
                    value={form.subject}
                    onChange={set('subject')}
                    placeholder="Brief subject line"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Message *</label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={set('message')}
                    placeholder="Describe your question or issue in detail..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-liberia-blue resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-liberia-red hover:bg-red-800 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  {status === 'loading' ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="bg-liberia-blue text-gray-500 py-6 px-4 text-sm text-center">
        <p>liblingua · <Link to="/faq" className="hover:text-white">FAQ</Link> · <Link to="/contact" className="hover:text-white">Contact</Link> · <Link to="/funding" className="hover:text-white">Support Us</Link></p>
      </footer>
    </div>
  );
}
