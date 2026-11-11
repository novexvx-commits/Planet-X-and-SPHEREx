import { Arrow } from "../ui";
import { cn } from "../../utils/cn";

interface ProvenanceProps {
  target: any;
  observations: any[];
}

export default function ProvenanceInspector({ target, observations }: ProvenanceProps) {
  const currentObs = observations[0] || {};

  const downloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ target, observations }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${target.id}_spherex_scientific_dossier.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="rounded-xl border border-white/10 bg-ink-2 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ember-soft">
            Scientific Integrity & Archive Provenance
          </span>
          <h3 className="mt-1 font-serif text-2xl text-bone">
            Data Lineage & Provenance Inspector
          </h3>
        </div>

        <button
          onClick={downloadJson}
          className="flex items-center gap-1.5 rounded border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-xs text-bone hover:bg-white/10 transition-colors"
        >
          <span>Export JSON Dossier</span>
          <Arrow className="h-3 w-3" dir="down" />
        </button>
      </div>

      {/* Category Classification Badges */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-ember/30 bg-ember/5 p-3">
          <div className="flex items-center gap-2 text-ember font-semibold">
            <span className="h-2 w-2 rounded-full bg-ember" />
            <span>Direct SPHEREx Data</span>
          </div>
          <p className="mt-1.5 text-[11px] text-mist">
            Authentic Level 2 Calibrated spectral MEFs from NASA/IPAC IRSA archive.
          </p>
        </div>

        <div className="rounded-lg border border-ion/30 bg-ion/5 p-3">
          <div className="flex items-center gap-2 text-ion font-semibold">
            <span className="h-2 w-2 rounded-full bg-ion" />
            <span>External Reference</span>
          </div>
          <p className="mt-1.5 text-[11px] text-mist">
            Gaia DR3 astrometry (ESA) and SIMBAD astronomical database cross-matches.
          </p>
        </div>

        <div className="rounded-lg border border-nebula/30 bg-nebula/5 p-3">
          <div className="flex items-center gap-2 text-nebula font-semibold">
            <span className="h-2 w-2 rounded-full bg-nebula" />
            <span>Derived Analysis</span>
          </div>
          <p className="mt-1.5 text-[11px] text-mist">
            Aperture photometry, residual difference matrices, and centroid displacement vectors.
          </p>
        </div>

        <div className="rounded-lg border border-white/20 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-bone font-semibold">
            <span className="h-2 w-2 rounded-full bg-bone" />
            <span>Open Data S3</span>
          </div>
          <p className="mt-1.5 text-[11px] text-mist">
            Anonymous byte-range access on AWS Open Data Registry (s3://nasa-irsa-spherex).
          </p>
        </div>
      </div>

      {/* Detailed Archival Metadata Grid */}
      <div className="mt-6 rounded-lg border border-white/10 bg-ink p-5">
        <h4 className="font-mono text-xs uppercase tracking-wider text-ember-soft font-semibold mb-4">
          Current Target Archive Parameters
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-xs font-mono">
          <div>
            <span className="block text-[10px] uppercase text-mist">Target Name:</span>
            <span className="text-bone font-semibold">{target.name}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-mist">Official Mission Archive:</span>
            <span className="text-bone">NASA/IPAC Infrared Science Archive (IRSA)</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-mist">Data Release:</span>
            <span className="text-ember font-medium">Quick Release 2 (QR2)</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-mist">Instrument / Facility:</span>
            <span className="text-bone">SPHEREx 0.2m All-Sky Infrared Spectrometer</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-mist">Detector Arrays:</span>
            <span className="text-bone">6 H2RG Arrays (0.75 µm – 5.00 µm)</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-mist">Native Pixel Scale:</span>
            <span className="text-bone">6.2 arcsec / pixel</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-mist">Observational Cadence:</span>
            <span className="text-bone">6-month all-sky survey revisit</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-mist">Total Observations Recorded:</span>
            <span className="text-ion font-bold">{observations.length} visits</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-mist">AWS S3 Bucket:</span>
            <span className="text-bone">nasa-irsa-spherex (us-east-1)</span>
          </div>
        </div>

        {/* Sample Observation Raw FITS Lineage */}
        {currentObs.access_url && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <span className="block text-[10px] uppercase text-mist mb-1">
              Sample FITS Calibrated Science URL (Direct IRSA / S3 Key):
            </span>
            <p className="rounded bg-ink-2 p-2.5 font-mono text-[11px] text-ember-soft break-all select-all border border-white/5">
              {currentObs.access_url}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

