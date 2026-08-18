import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { documentIssuanceService } from '../../services/documentIssuanceService';
import { formatDate } from '../../lib/utils';

export default function VerifyDocumentPage() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify-document', code],
    queryFn: () => documentIssuanceService.verify(code!),
    enabled: !!code,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {isLoading && (
          <div className="p-10 text-center text-gray-400 text-sm">Checking document…</div>
        )}

        {!isLoading && (isError || !data) && (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900">Not a Valid Document</h1>
            <p className="text-sm text-gray-500 mt-1">No record was found for this code. It may be mistyped, or the document may not have been issued through EduStack PK.</p>
          </div>
        )}

        {!isLoading && data && (
          <div>
            <div className={`px-6 py-5 flex items-center gap-3 ${data.valid ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {data.orgLogoUrl ? (
                <img src={data.orgLogoUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-white shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center shrink-0 text-lg font-bold text-gray-500">
                  {data.orgName.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{data.orgName}</p>
                <p className={`text-xs font-semibold ${data.valid ? 'text-emerald-700' : 'text-red-700'}`}>
                  {data.valid ? 'Verified — Genuine Document' : `Revoked${data.revokedReason ? ` — ${data.revokedReason}` : ''}`}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{data.kindLabel}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{data.subjectName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
                <div>
                  <p className="text-xs text-gray-400">Serial No.</p>
                  <p className="font-mono text-gray-700">{data.serialNo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Issued On</p>
                  <p className="text-gray-700">{formatDate(data.issuedAt)}</p>
                </div>
                {data.revokedAt && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">Revoked On</p>
                    <p className="text-gray-700">{formatDate(data.revokedAt)}</p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-gray-400 border-t border-gray-100 pt-3">
                This page confirms whether a document was genuinely issued by {data.orgName} through EduStack PK. It does not display the document itself.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
