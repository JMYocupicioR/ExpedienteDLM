import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  X, FileText, Table2, Braces, CheckCircle2, AlertTriangle, Info, Clock,
  User, ClipboardList, Printer, TrendingUp, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ScaleAssessmentViewModel } from '@/features/medical-records/utils/scaleAssessmentViewModel';
import { formatAssessmentDate } from '@/features/medical-records/utils/scaleAssessmentViewModel';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Props {
  assessment: ScaleAssessmentViewModel;
  onClose: () => void;
}

interface ScoringRange {
  minValue: number; maxValue: number;
  label: string; interpretation: string; color: string; severity: string;
}

interface ScaleDomain {
  id: string; label: string; engine: 'sum' | 'average';
  question_ids: string[];
  ranges: Array<{ min: number; max: number; label: string; interpretation: string; color?: string }>;
}

interface ComputedDomainResult {
  id: string; label: string; score: number;
  matchedRange: { label: string; interpretation: string; color: string } | null;
}

interface ScoringSummary {
  globalRanges: ScoringRange[];
  domains: ScaleDomain[];
  aliasMap: Map<string, string>; // "mfm_01" → real UUID
}

// ─── Severity helpers ──────────────────────────────────────────────────────
const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-950/20',    border: 'border-red-300 dark:border-red-700',     text: 'text-red-700 dark:text-red-300',     dot: '#ef4444' },
  high:     { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-300', dot: '#f97316' },
  medium:   { bg: 'bg-amber-50 dark:bg-amber-950/20',  border: 'border-amber-300 dark:border-amber-700',   text: 'text-amber-700 dark:text-amber-300',   dot: '#f59e0b' },
  low:      { bg: 'bg-blue-50 dark:bg-blue-950/20',   border: 'border-blue-300 dark:border-blue-700',    text: 'text-blue-700 dark:text-blue-400',    dot: '#3b82f6' },
  none:     { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300', dot: '#10b981' },
};
const getSeverityStyle = (s?: string | null) => SEVERITY_STYLES[s?.toLowerCase() || 'none'] ?? SEVERITY_STYLES.none;
const getSeverityIcon  = (s?: string | null) => {
  const k = (s || '').toLowerCase();
  if (k === 'critical' || k === 'high') return <AlertTriangle className="h-4 w-4" />;
  if (k === 'none') return <CheckCircle2 className="h-4 w-4" />;
  return <TrendingUp className="h-4 w-4" />;
};

// ─── Data fetching ─────────────────────────────────────────────────────────
async function fetchScoringSummary(scaleId: string): Promise<ScoringSummary> {
  const empty: ScoringSummary = { globalRanges: [], domains: [], aliasMap: new Map() };
  try {
    const { data: scoring } = await supabase
      .from('scale_scoring')
      .select('id, domains')
      .eq('scale_id', scaleId)
      .maybeSingle();
    if (!scoring) return empty;

    const { data: rangesData } = await supabase
      .from('scoring_ranges')
      .select('min_value,max_value,interpretation_level,interpretation_text,color_code,severity_level')
      .eq('scoring_id', scoring.id)
      .order('min_value', { ascending: true });

    const globalRanges: ScoringRange[] = (rangesData || []).map((r: {
      min_value: number; max_value: number; interpretation_level: string;
      interpretation_text: string; color_code: string; severity_level: string;
    }) => ({
      minValue: r.min_value, maxValue: r.max_value,
      label: r.interpretation_level || '',
      interpretation: r.interpretation_text || '',
      color: r.color_code || '#6b7280',
      severity: r.severity_level || 'none',
    }));

    const rawDomains: ScaleDomain[] = Array.isArray(scoring.domains) ? scoring.domains : [];

    // Build alias→UUID map: domains store question IDs like "mfm_01" where 01 = order_index
    const { data: questions } = await supabase
      .from('scale_questions')
      .select('id,order_index')
      .eq('scale_id', scaleId)
      .order('order_index', { ascending: true });

    const aliasMap = new Map<string, string>();
    (questions || []).forEach((q: { id: string; order_index: number }) => {
      const idx2 = String(q.order_index).padStart(2, '0');
      // Support common naming patterns used by ScaleBuilder
      ['mfm', 'q', 'item', 'p', 'preg'].forEach(prefix => {
        aliasMap.set(`${prefix}_${idx2}`, q.id);
        aliasMap.set(`${prefix}_${q.order_index}`, q.id);
      });
      aliasMap.set(String(q.order_index), q.id);
    });

    return { globalRanges, domains: rawDomains, aliasMap };
  } catch { return empty; }
}

// ─── Domain score calculation ──────────────────────────────────────────────
function calcDomainScores(
  domains: ScaleDomain[],
  aliasMap: Map<string, string>,
  answers: unknown,
): ComputedDomainResult[] {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return [];
  const resp = answers as Record<string, unknown>;

  return domains.map(domain => {
    let sum = 0, count = 0;
    domain.question_ids.forEach(qid => {
      const uuid = aliasMap.get(qid) ?? qid; // fallback: maybe it IS already a UUID
      const val  = resp[uuid];
      if (val !== undefined && val !== null) {
        const n = typeof val === 'number' ? val : Number(val);
        if (!isNaN(n)) { sum += n; count++; }
      }
    });
    const score = domain.engine === 'average' && count > 0 ? sum / count : sum;
    const r = domain.ranges?.find(x => score >= x.min && score <= x.max);
    return {
      id: domain.id,
      label: domain.label,
      score: Math.round(score * 10) / 10,
      matchedRange: r ? { label: r.label, interpretation: r.interpretation, color: r.color || '#6366f1' } : null,
    };
  });
}

function findGlobalRange(score: number | null, ranges: ScoringRange[]): ScoringRange | null {
  if (score === null) return null;
  return ranges.find(r => score >= r.minValue && score <= r.maxValue) ?? null;
}

// ─── Export helpers ────────────────────────────────────────────────────────
function exportJSON(a: ScaleAssessmentViewModel, range: ScoringRange | null) {
  const blob = new Blob([JSON.stringify({
    id: a.id, scale: a.scaleName, patient_id: a.patientId,
    doctor: a.doctorName, date: a.createdAt,
    total_score: a.score, severity: range?.label ?? a.severity,
    clinical_interpretation: range?.interpretation ?? a.clinicalSummary,
    recommendations: a.recommendationList,
    answers: a.answerDetails.map(d => ({ question: d.questionText, value: d.rawValue, label: d.valueLabel })),
  }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url; el.download = `${a.scaleName.replace(/\s+/g,'_')}-${a.id.slice(0,8)}.json`;
  el.click(); URL.revokeObjectURL(url);
}

function exportExcel(a: ScaleAssessmentViewModel, range: ScoringRange | null, domains: ComputedDomainResult[]) {
  const wb = XLSX.utils.book_new();

  const summary = [
    ['EVALUACIÓN MÉDICA — ' + a.scaleName], [],
    ['Campo','Valor'],
    ['Escala', a.scaleName], ['Paciente ID', a.patientId],
    ['Médico', a.doctorName || 'N/A'], ['Fecha', formatAssessmentDate(a.createdAt)],
    ['Puntuación total', a.score ?? 'N/A'],
    ['Nivel', range?.label ?? a.severity ?? 'N/A'],
    ['Interpretación', range?.interpretation ?? a.clinicalSummary ?? 'N/A'],
    ...(domains.length > 0 ? [[], ['DOMINIOS'], ...domains.map(d => [d.label, d.score, d.matchedRange?.interpretation ?? ''])] : []),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1['!cols'] = [{ wch: 28 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  const answers = [['#','Pregunta','Respuesta','Valor'], ...a.answerDetails.map((d,i) => [i+1,d.questionText,d.valueLabel,d.rawValue])];
  const ws2 = XLSX.utils.aoa_to_sheet(answers);
  ws2['!cols'] = [{ wch:4 },{ wch:55 },{ wch:38 },{ wch:8 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Respuestas');

  XLSX.writeFile(wb, `${a.scaleName.replace(/\s+/g,'_')}-${a.id.slice(0,8)}.xlsx`);
}

function exportPDF(a: ScaleAssessmentViewModel, range: ScoringRange | null, domains: ComputedDomainResult[]) {
  const scoreCyan   = '#0891b2';
  const sevColor    = range?.color || '#6b7280';
  const sevLabel    = range?.label || a.severity || 'No disponible';
  const interpText  = range?.interpretation || a.clinicalSummary || '';
  const date        = formatAssessmentDate(a.createdAt);
  const answered    = a.answerDetails.filter(d => d.rawValue !== null && d.rawValue !== undefined).length;
  const total       = a.answerDetails.length;

  const domainRows = domains.map(d => `
    <tr>
      <td>${d.label}</td>
      <td style="font-size:18px;font-weight:800;color:${scoreCyan}">${d.score}</td>
      <td style="color:${d.matchedRange?.color||'#6b7280'};font-weight:700">${d.matchedRange?.label||'—'}</td>
      <td style="color:#78350f;font-style:italic">${d.matchedRange?.interpretation||'—'}</td>
    </tr>`).join('');

  const answerRows = a.answerDetails.map((d,i) => {
    const n   = typeof d.rawValue === 'number' ? d.rawValue : '';
    const emp = d.rawValue === null || d.rawValue === undefined;
    return `<tr style="background:${i%2===0?'#f9fafb':'#fff'}">
      <td style="text-align:center;color:#9ca3af">${i+1}</td>
      <td style="color:${emp?'#9ca3af':'#111827'}">${d.questionText}</td>
      <td style="color:${emp?'#9ca3af':'#374151'};font-style:${emp?'italic':'normal'}">${d.valueLabel}</td>
      <td style="text-align:center">${n!==''?`<span style="background:${scoreCyan};color:#fff;border-radius:5px;padding:1px 7px;font-weight:700">${n}</span>`:''}</td>
    </tr>`;
  }).join('');

  const win = window.open('','_blank','width=920,height=700');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>${a.scaleName} — Evaluación</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,Arial,sans-serif;font-size:11px;line-height:1.5;color:#111827;background:#fff;padding:24px 32px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0891b2;padding-bottom:14px;margin-bottom:18px}
.hdr h1{font-size:19px;font-weight:800;color:#0c4a6e}
.hdr .sub{font-size:10px;color:#6b7280;margin-top:2px}
.hdr-r{text-align:right}.hdr-r .brand{font-size:13px;font-weight:800;color:#0891b2}.hdr-r .dt{font-size:9px;color:#9ca3af;margin-top:2px}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
.mc{border:1px solid #e5e7eb;border-radius:7px;padding:9px 11px;background:#f9fafb}
.mc-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;font-weight:600;margin-bottom:2px}
.mc-val{font-size:12px;font-weight:700;color:#111827}
.score-blk{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#ecfeff,#e0f2fe);border:1px solid #bae6fd;border-radius:10px;padding:14px 22px;margin-bottom:16px}
.score-n{font-size:48px;font-weight:900;color:#0e7490;line-height:1}
.score-lbl{font-size:9px;text-transform:uppercase;font-weight:700;letter-spacing:.08em;color:#0e7490;margin-bottom:3px}
.sev-badge{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;border-radius:18px;font-size:12px;font-weight:700;border:2px solid ${sevColor};color:${sevColor};background:${sevColor}18}
.sev-dot{width:9px;height:9px;border-radius:50%;background:${sevColor}}
.interp{background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 7px 7px 0;padding:12px 16px;margin-bottom:16px}
.interp-ttl{font-size:9.5px;text-transform:uppercase;font-weight:700;color:#92400e;margin-bottom:5px;letter-spacing:.05em}
.interp p{font-size:11px;color:#78350f;line-height:1.55}
.sec{font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin:16px 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:5px}
table.dom{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:16px}
table.dom th{background:#0c4a6e;color:#fff;padding:6px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.04em}
table.dom td{padding:6px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
table.ans{width:100%;border-collapse:collapse;font-size:10.5px}
table.ans th{background:#0c4a6e;color:#fff;padding:6px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.04em}
table.ans th:first-child{width:30px;text-align:center}
table.ans th:last-child{width:55px;text-align:center}
table.ans td{padding:5px 10px;border-bottom:1px solid #f3f4f6;vertical-align:middle}
.footer{margin-top:22px;border-top:1px solid #e5e7eb;padding-top:8px;display:flex;justify-content:space-between}
.footer span{font-size:9px;color:#9ca3af}
.conf{font-size:8.5px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.05em;text-align:center;margin-bottom:3px}
@media print{body{padding:12px 18px}@page{margin:1cm;size:A4 portrait}}
</style></head><body>

<div class="hdr">
  <div><h1>${a.scaleName}</h1><div class="sub">Evaluación Médica — Expediente Clínico Digital</div></div>
  <div class="hdr-r"><div class="brand">DeepLux MED</div><div class="dt">Generado: ${new Date().toLocaleString('es-MX')}</div></div>
</div>

<div class="meta">
  <div class="mc"><div class="mc-lbl">Médico</div><div class="mc-val">${a.doctorName||'N/A'}</div></div>
  <div class="mc"><div class="mc-lbl">Evaluación</div><div class="mc-val">${date}</div></div>
  <div class="mc"><div class="mc-lbl">Escala</div><div class="mc-val">${a.scaleName}</div></div>
  <div class="mc"><div class="mc-lbl">Preguntas</div><div class="mc-val">${answered}/${total}</div></div>
</div>

<div class="score-blk">
  <div>
    <div class="score-lbl">Puntuación Total</div>
    <div class="score-n">${a.score ?? '—'}</div>
  </div>
  <div class="sev-badge"><span class="sev-dot"></span>${sevLabel}</div>
</div>

${interpText ? `<div class="interp"><div class="interp-ttl">Interpretación Clínica</div><p>${interpText}</p>${a.recommendationList.length?`<ul style="margin-top:8px;padding-left:18px">${a.recommendationList.map(r=>`<li style="font-size:10.5px;color:#92400e;margin-bottom:3px">${r}</li>`).join('')}</ul>`:''}</div>` : ''}

${domains.length > 0 ? `<div class="sec">Resultados por Dominio</div>
<table class="dom"><thead><tr><th>Dominio</th><th>Puntuación</th><th>Nivel</th><th>Interpretación</th></tr></thead>
<tbody>${domainRows}</tbody></table>` : ''}

<div class="sec">Respuestas Detalladas (${total} preguntas)</div>
<table class="ans"><thead><tr><th>#</th><th>Pregunta</th><th>Respuesta seleccionada</th><th>Valor</th></tr></thead>
<tbody>${answerRows}</tbody></table>

<div class="conf">Documento Clínico Confidencial — Solo para uso médico profesional</div>
<div class="footer"><span>Paciente ID: ${a.patientId}</span><span>Assessment ID: ${a.id}</span></div>

</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

// ─── Main Component ────────────────────────────────────────────────────────
export const ScaleAssessmentDetailModal: React.FC<Props> = ({ assessment, onClose }) => {
  const [summary, setSummary] = useState<ScoringSummary>({ globalRanges: [], domains: [], aliasMap: new Map() });
  const [loading, setLoading] = useState(true);
  const [computedDomains, setComputedDomains] = useState<ComputedDomainResult[]>([]);

  useEffect(() => {
    fetchScoringSummary(assessment.scaleId).then(s => {
      setSummary(s);
      const domains = calcDomainScores(s.domains, s.aliasMap, assessment.answers);
      setComputedDomains(domains);
      setLoading(false);
    });
  }, [assessment.scaleId, assessment.answers]);

  const matchedRange  = findGlobalRange(assessment.score, summary.globalRanges);
  const severityKey   = matchedRange?.severity || 'none';
  const sevStyle      = getSeverityStyle(severityKey);
  const sevLabel      = matchedRange?.label || assessment.severity || null;
  const interpText    = matchedRange?.interpretation || assessment.clinicalSummary || '';
  const answeredCount = assessment.answerDetails.filter(d => d.rawValue !== null && d.rawValue !== undefined).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
      <div className="w-full max-w-5xl max-h-[95vh] flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 bg-white dark:bg-gray-900">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{assessment.scaleName}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{formatAssessmentDate(assessment.createdAt)} · ID {assessment.id.slice(0,8)}…</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportJSON(assessment, matchedRange)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Braces className="h-3.5 w-3.5" /><span className="hidden sm:inline">JSON</span>
            </button>
            <button onClick={() => exportExcel(assessment, matchedRange, computedDomains)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
              <Table2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Excel</span>
            </button>
            <button onClick={() => exportPDF(assessment, matchedRange, computedDomains)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30">
              <Printer className="h-3.5 w-3.5" /><span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 ml-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Meta cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <User className="h-3.5 w-3.5"/>, label: 'Médico',      value: assessment.doctorName || 'No disponible' },
              { icon: <Clock className="h-3.5 w-3.5"/>, label: 'Evaluación', value: formatAssessmentDate(assessment.createdAt) },
              { icon: <ClipboardList className="h-3.5 w-3.5"/>, label: 'Escala', value: assessment.scaleName },
              { icon: <FileText className="h-3.5 w-3.5"/>, label: 'Respondidas', value: `${answeredCount} / ${assessment.answerDetails.length}` },
            ].map(c => (
              <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">{c.icon}{c.label}</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Score block */}
          <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border border-cyan-200 dark:border-cyan-800 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">Puntuación total</p>
                <div className="text-5xl font-black text-cyan-600 dark:text-cyan-400 tabular-nums leading-none">
                  {assessment.score ?? '—'}
                </div>
                {!loading && summary.globalRanges.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Rangos: {summary.globalRanges.map(r => `${r.minValue}-${r.maxValue} ${r.label}`).join(' · ')}
                  </p>
                )}
              </div>
              {sevLabel && (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold border ${sevStyle.bg} ${sevStyle.border} ${sevStyle.text}`}>
                  {getSeverityIcon(severityKey)}{sevLabel}
                </div>
              )}
            </div>
          </div>

          {/* Domain results — shown when domains exist */}
          {!loading && computedDomains.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                Resultados por Dominio
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {computedDomains.map(d => (
                  <div key={d.id}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">{d.label}</p>
                    <span className="text-3xl font-black text-cyan-600 dark:text-cyan-400">{d.score}</span>
                    {d.matchedRange ? (
                      <>
                        <p className="text-xs font-bold mt-1" style={{ color: d.matchedRange.color }}>
                          {d.matchedRange.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic leading-snug">
                          {d.matchedRange.interpretation}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1 italic">Sin rango definido</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical interpretation */}
          {interpText && (
            <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-4">
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4"/>Interpretación clínica global
              </h4>
              <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{interpText}</p>
              {assessment.recommendationList.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {assessment.recommendationList.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                      <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500"/>{rec}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Answers table */}
          <div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
              Respuestas detalladas ({assessment.answerDetails.length} preguntas)
            </h4>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="grid grid-cols-[32px_1fr_auto_40px] bg-gray-100 dark:bg-gray-800 px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                <span className="text-center">#</span>
                <span className="pl-3">Pregunta</span>
                <span className="text-right pr-4">Respuesta</span>
                <span className="text-center">Val</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {assessment.answerDetails.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">Sin respuestas registradas</div>
                ) : (
                  assessment.answerDetails.map((entry, idx) => {
                    const numVal = typeof entry.rawValue === 'number' ? entry.rawValue : null;
                    const isEmpty = entry.rawValue === null || entry.rawValue === undefined;
                    return (
                      <div key={entry.questionId}
                        className={`grid grid-cols-[32px_1fr_auto_40px] items-center px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isEmpty ? 'opacity-40' : ''}`}>
                        <div className="w-7 h-7 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-xs font-bold text-cyan-600 dark:text-cyan-400 mx-auto">
                          {idx + 1}
                        </div>
                        <div className="pl-3 min-w-0">
                          <p className="text-xs text-gray-800 dark:text-gray-200 leading-snug">{entry.questionText}</p>
                        </div>
                        <div className="text-right pr-4 max-w-[240px]">
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                            {isEmpty ? <span className="italic text-gray-400">Sin respuesta</span> : entry.valueLabel}
                          </span>
                        </div>
                        <div className="flex justify-center">
                          {numVal !== null && (
                            <span className="w-7 h-7 rounded-lg bg-cyan-500 text-white text-xs font-bold flex items-center justify-center">
                              {numVal}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-400 font-mono truncate max-w-[60%]">ID: {assessment.id}</p>
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
