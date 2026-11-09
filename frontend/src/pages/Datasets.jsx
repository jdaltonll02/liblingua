import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { listReleases } from '../api/dataset';

function ReleaseCard({ release }) {
  const downloadable = release.status === 'PUBLISHED';
  return (
    <article className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between gap-4">
        <div>
          <h2 className="text-xl font-black capitalize">{release.language}</h2>
          <p className="text-sm text-gray-500">Version {release.semantic_version} · schema {release.schema_version}</p>
        </div>
        <span className={`badge ${downloadable ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>{release.status}</span>
      </div>
      <dl className="grid grid-cols-2 gap-3 mt-5 text-sm">
        <div><dt className="text-gray-400">Records</dt><dd className="font-bold">{release.record_count.toLocaleString()}</dd></div>
        <div><dt className="text-gray-400">Licence</dt><dd className="font-bold">{release.license_key}</dd></div>
        <div><dt className="text-gray-400">Split method</dt><dd className="font-medium">{release.split_mode.replaceAll('_', ' ')}</dd></div>
        <div><dt className="text-gray-400">Published</dt><dd className="font-medium">{release.published_at ? new Date(release.published_at).toLocaleDateString() : 'Not published'}</dd></div>
      </dl>
      <div className="mt-5 text-xs text-gray-500 space-y-2">
        <p><span className="font-semibold">Manifest SHA-256:</span> <code className="break-all">{release.manifest_checksum}</code></p>
        <p><span className="font-semibold">Artifact SHA-256:</span> <code className="break-all">{release.artifact_checksum}</code></p>
      </div>
      {downloadable ? (
        <a className="btn-primary inline-block mt-5" href={`/api/releases/${release.id}/artifact`}>Download immutable JSONL</a>
      ) : (
        <p className="mt-5 text-sm text-amber-700">The data are unavailable, but citation and correction metadata remain visible.</p>
      )}
      {release.corrections?.length > 0 && <div className="mt-4 border-t pt-4"><h3 className="text-sm font-bold">Corrections and restrictions</h3>{release.corrections.map((item) => <p key={item.id} className="text-xs text-gray-600 mt-2">{item.description}</p>)}</div>}
    </article>
  );
}

export default function Datasets() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { listReleases().then((response) => setReleases(response.data.releases)).finally(() => setLoading(false)); }, []);
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <section className="bg-liberia-blue text-white py-14 px-4">
        <div className="max-w-5xl mx-auto"><h1 className="text-4xl font-black">Versioned Dataset Releases</h1><p className="text-gray-300 mt-3 max-w-2xl">Frozen, checksummed research artifacts with persistent split manifests, language-variety metadata, consent enforcement, and correction history.</p></div>
      </section>
      <main className="max-w-5xl mx-auto px-4 py-10">
        {loading ? <p>Loading releases…</p> : releases.length ? <div className="grid md:grid-cols-2 gap-6">{releases.map((release) => <ReleaseCard key={release.id} release={release} />)}</div> : <div className="bg-white border rounded-2xl p-12 text-center"><h2 className="font-bold">No approved releases yet</h2><p className="text-sm text-gray-500 mt-2">The closed adult pilot must pass community and research review before its first release.</p><Link className="text-liberia-blue text-sm underline mt-4 inline-block" to="/translate">Contribute to the supervised pilot</Link></div>}
      </main>
    </div>
  );
}
