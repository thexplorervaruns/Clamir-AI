import { jsPDF } from 'jspdf';
import { Simulation } from '../types/clamir.ts';

export function exportSimulationReport(
  simulation: Simulation,
  format: 'PDF' | 'JSON' | 'TXT' | 'CSV'
) {
  const safeName = simulation.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'clamir-simulation';

  if (format === 'JSON') {
    const payload = {
      platform: 'Clamir AI — Audience Simulation & Consumer Intelligence',
      disclaimer:
        'SIMULATED FEEDBACK NOTICE: All responses, scores, and statements in this report are AI-generated audience simulations and do not represent actual human customer research.',
      exportedAt: new Date().toISOString(),
      simulation,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `${safeName}-report.json`);
    return;
  }

  if (format === 'TXT') {
    const res = simulation.results;
    const lines: string[] = [
      '========================================================================',
      'CLAMIR AI — AUDIENCE SIMULATION RESEARCH REPORT',
      'NOTE: Findings are AI-generated simulations, not actual human survey data.',
      '========================================================================',
      '',
      `Simulation Name: ${simulation.name}`,
      `Type: ${simulation.type}`,
      `Created: ${new Date(simulation.startedAt).toLocaleString()}`,
      `Status: ${simulation.status}`,
      `Target Audience: ${simulation.targetAudience}`,
      `Hypothesis: ${simulation.hypothesis}`,
      ...(simulation.researchObjectives ? [simulation.researchObjectives] : []),
      '',
      '--- SELECTED PERSONAS ---',
      ...simulation.selectedPersonas.map(
        (p) => `- ${p.personaName} (${p.agentCount} simulated agents)`
      ),
      '',
      '--- QUESTION BATTERY ---',
      ...simulation.questions.map((q, idx) => `${idx + 1}. [${q.type}] ${q.text}`),
      '',
    ];

    if (res) {
      lines.push(
        '--- EXECUTIVE SUMMARY ---',
        `Main Finding: ${res.executiveSummary.mainFinding}`,
        `Overall Reaction: ${res.executiveSummary.overallReaction}`,
        '',
        `Sentiment Breakdown: Positive ${res.sentimentOverview.positive}% | Neutral ${res.sentimentOverview.neutral}% | Negative ${res.sentimentOverview.negative}%`,
        '',
        '--- PERSONA BREAKDOWN ---'
      );
      for (const pb of res.personaBreakdown) {
        lines.push(
          `* ${pb.personaName} (Acceptance Score: ${pb.acceptanceScore}/100 | Reaction: ${pb.overallReaction} | Confidence: ${pb.confidenceScore}%)`,
          `  Main Takeaway: ${pb.mainTakeaway}`,
          `  Simulated Example Statement: ${pb.simulatedStatement}`,
          `  Reasoning: ${pb.reasoning}`,
          ''
        );
      }
      lines.push('--- RECOMMENDATIONS ---');
      for (const rec of res.recommendations) {
        lines.push(
          `[${rec.priority.toUpperCase()}] ${rec.title}`,
          `  Explanation: ${rec.explanation}`,
          `  Expected Impact: ${rec.expectedImpact}`,
          ''
        );
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `${safeName}-report.txt`);
    return;
  }

  if (format === 'CSV') {
    const res = simulation.results;
    const rows: string[][] = [
      [
        'Simulation Name',
        'Persona Name',
        'Agent Count',
        'Overall Reaction',
        'Acceptance Score (0-100)',
        'Confidence Score (0-100)',
        'Main Takeaway',
        'Simulated Statement (AI-Generated)',
        'Reasoning',
      ],
    ];
    if (res) {
      for (const pb of res.personaBreakdown) {
        rows.push([
          simulation.name,
          pb.personaName,
          String(pb.agentCount),
          pb.overallReaction,
          String(pb.acceptanceScore),
          String(pb.confidenceScore),
          pb.mainTakeaway,
          pb.simulatedStatement,
          pb.reasoning,
        ]);
      }
    }
    const csvContent = rows
      .map((r) => r.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, `${safeName}-personas.csv`);
    return;
  }

  // PDF Export via jsPDF
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 44;
  const maxWidth = pageWidth - margin * 2;
  let y = 48;

  const ensureSpace = (needed: number) => {
    if (y + needed > 780) {
      doc.addPage();
      y = 48;
    }
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Clamir AI — Audience Simulation Report', margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'SIMULATED FEEDBACK NOTICE: Findings in this report are AI-generated simulations, not actual human customer research.',
    margin,
    y
  );
  y += 22;

  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Title & Metadata
  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(simulation.name, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 16 + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Type: ${simulation.type}   |   Status: ${simulation.status}   |   Date: ${new Date(simulation.startedAt).toLocaleDateString()}`, margin, y);
  y += 18;

  const hypLines = doc.splitTextToSize(`Hypothesis: ${simulation.hypothesis}`, maxWidth);
  doc.text(hypLines, margin, y);
  y += hypLines.length * 14 + 12;

  const res = simulation.results;
  if (res) {
    ensureSpace(100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('1. Executive Summary', margin, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const findingLines = doc.splitTextToSize(`Main Finding: ${res.executiveSummary.mainFinding}`, maxWidth);
    doc.text(findingLines, margin, y);
    y += findingLines.length * 14 + 8;

    const reactionLines = doc.splitTextToSize(`Overall Reaction: ${res.executiveSummary.overallReaction}`, maxWidth);
    doc.text(reactionLines, margin, y);
    y += reactionLines.length * 14 + 14;

    // Sentiment Bar Chart visual in PDF
    ensureSpace(65);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(
      `2. Sentiment Overview (Positive: ${res.sentimentOverview.positive}% · Neutral: ${res.sentimentOverview.neutral}% · Negative: ${res.sentimentOverview.negative}%)`,
      margin,
      y
    );
    y += 12;
    const barWidth = maxWidth;
    const posW = (res.sentimentOverview.positive / 100) * barWidth;
    const neuW = (res.sentimentOverview.neutral / 100) * barWidth;
    const negW = (res.sentimentOverview.negative / 100) * barWidth;
    doc.setFillColor(17, 24, 39);
    doc.rect(margin, y, posW, 10, 'F');
    doc.setFillColor(156, 163, 175);
    doc.rect(margin + posW, y, neuW, 10, 'F');
    doc.setFillColor(229, 231, 235);
    doc.rect(margin + posW + neuW, y, negW, 10, 'F');
    y += 28;

    // Persona Breakdown
    ensureSpace(80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. Simulated Persona Breakdown', margin, y);
    y += 16;

    for (const pb of res.personaBreakdown) {
      ensureSpace(90);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(
        `${pb.personaName} (${pb.agentCount} Agents) — Score: ${pb.acceptanceScore}/100 · Reaction: ${pb.overallReaction}`,
        margin,
        y
      );
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const takeawayLines = doc.splitTextToSize(`Takeaway: ${pb.mainTakeaway}`, maxWidth);
      doc.text(takeawayLines, margin, y);
      y += takeawayLines.length * 13 + 4;

      const quoteLines = doc.splitTextToSize(`${pb.simulatedStatement}`, maxWidth);
      doc.setTextColor(75, 85, 99);
      doc.text(quoteLines, margin, y);
      doc.setTextColor(17, 24, 39);
      y += quoteLines.length * 13 + 10;
    }

    // Recommendations
    ensureSpace(80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('4. Prioritized Recommendations', margin, y);
    y += 16;

    for (const rec of res.recommendations) {
      ensureSpace(55);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`[${rec.priority.toUpperCase()}] ${rec.title}`, margin, y);
      y += 13;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const expLines = doc.splitTextToSize(`${rec.explanation} (Impact: ${rec.expectedImpact})`, maxWidth);
      doc.text(expLines, margin, y);
      y += expLines.length * 13 + 8;
    }
  }

  doc.save(`${safeName}-report.pdf`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
