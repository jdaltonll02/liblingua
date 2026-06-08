import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import * as authApi from '../api/auth';

const AGE_GROUPS = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_35',    label: '18–35' },
  { value: '36_55',    label: '36–55' },
  { value: '56_plus',  label: '56+' },
];

export default function CompleteProfile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { is_l1_speaker: false } });
  const [serverError, setServerError] = useState('');

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const payload = {
        ...data,
        is_l1_speaker: data.is_l1_speaker === 'true' || data.is_l1_speaker === true,
      };
      const res = await authApi.completeProfile(payload);
      login(res.data.contributor);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.error || 'Could not save profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-liberia-blue text-white px-6 py-4">
        <span className="text-sm text-gray-400">Signed in as {user?.email}</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="h-1 bg-liberia-red rounded-t" />
          <div className="bg-white border border-gray-200 border-t-0 shadow-sm rounded-b p-8">
            <h1 className="text-2xl font-black text-liberia-blue mb-1">Complete Your Profile</h1>
            <p className="text-sm text-gray-500 mb-6">
              We need a few more details before you can start contributing translations.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {serverError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {serverError}
                </div>
              )}
              <Field label="Native Language" error={errors.native_language?.message}>
                <input className="input-field" placeholder="e.g. Kpelle"
                  {...register('native_language', { required: 'Required' })} />
              </Field>

              <Field label="Dialect (optional)">
                <input className="input-field" placeholder="e.g. Central Kpelle"
                  {...register('native_dialect')} />
              </Field>

              <Field label="Region of Origin" error={errors.region_of_origin?.message}>
                <input className="input-field" placeholder="e.g. Bong County"
                  {...register('region_of_origin', { required: 'Required' })} />
              </Field>

              <Field label="Age Group" error={errors.age_group?.message}>
                <select className="input-field"
                  {...register('age_group', { required: 'Required' })}>
                  <option value="">— Select —</option>
                  {AGE_GROUPS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </Field>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" {...register('is_l1_speaker')}
                  className="w-4 h-4 text-liberia-red rounded border-gray-300 focus:ring-liberia-red" />
                <span className="text-sm text-gray-700">
                  I am a native (L1) speaker of my listed language
                </span>
              </label>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
                {isSubmitting ? 'Saving…' : 'Save and Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
