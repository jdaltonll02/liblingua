import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listCampaigns } from '../api/campaigns';

export default function CampaignBanner({ currentLanguage }) {
  const [campaign, setCampaign] = useState(null);

  useEffect(() => {
    if (!currentLanguage) return;
    listCampaigns({ status: 'ACTIVE', language: currentLanguage })
      .then((r) => {
        const active = r.data.find((c) => c.derived_status === 'ACTIVE');
        setCampaign(active || null);
      })
      .catch(() => {});
  }, [currentLanguage]);

  if (!campaign) return null;

  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / 86400000));

  return (
    <div className="mb-4 rounded-xl border border-liberia-red/30 bg-gradient-to-r from-liberia-red/5 to-orange-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">🎯</span>
          <span className="text-xs font-black uppercase tracking-widest text-liberia-red">Active Campaign</span>
          <span className="text-xs font-semibold text-gray-400">· {daysLeft}d left</span>
        </div>
        <p className="font-black text-gray-900 mt-0.5">{campaign.title}</p>
        {campaign.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{campaign.description}</p>
        )}
      </div>

      {/* Progress */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 w-full sm:w-40">
        <div className="flex justify-between w-full text-xs font-semibold">
          <span className="text-gray-600">{campaign.progress.toLocaleString()} / {campaign.goal.toLocaleString()}</span>
          <span className="text-liberia-red">{campaign.pct}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-liberia-red rounded-full transition-all"
            style={{ width: `${campaign.pct}%` }}
          />
        </div>
        <Link to="/campaigns" className="text-xs text-liberia-blue hover:underline">
          View all campaigns →
        </Link>
      </div>
    </div>
  );
}
