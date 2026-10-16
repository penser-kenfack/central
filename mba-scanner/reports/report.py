import os
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

from scanner.analyzer import summarize, risk_score

SEV_COLORS = {'Critical': '#7a1022', 'High': '#d92d20', 'Medium': '#e8590c', 'Low': '#b98900', 'Informational': '#2e6fd8'}
GREEN = colors.HexColor('#138a3e'); NAVY = colors.HexColor('#0e1726')


def build_pdf(scan, findings):
    os.makedirs('generated_reports', exist_ok=True)
    path = f"generated_reports/security_report_{scan['id']}.pdf"
    ss = getSampleStyleSheet()
    body = ParagraphStyle('b', parent=ss['BodyText'], fontSize=9, leading=12)
    small = ParagraphStyle('s', parent=body, fontSize=8, leading=10, textColor=colors.HexColor('#475467'))
    h1 = ParagraphStyle('h1', parent=ss['Title'], alignment=0, fontSize=18, textColor=NAVY, spaceAfter=4)
    h2 = ParagraphStyle('h2', parent=ss['Heading2'], textColor=NAVY, spaceBefore=10)
    findings = [dict(f) for f in findings]
    counts = summarize(findings); score, grade = risk_score(findings)

    def on_page(c, d):
        c.saveState(); c.setFillColor(NAVY); c.rect(0, A4[1] - 14 * mm, A4[0], 14 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont('Helvetica-Bold', 10); c.drawString(18 * mm, A4[1] - 9 * mm, 'Web Application Security Assessment')
        c.setFont('Helvetica', 8); c.drawRightString(A4[0] - 18 * mm, A4[1] - 9 * mm, f"Scan #{scan['id']} · page {d.page}")
        c.setFillColor(colors.HexColor('#8a96a6')); c.drawString(18 * mm, 10 * mm, 'Findings are indicators to be confirmed manually. Authorized testing only.')
        c.restoreState()

    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=22 * mm, bottomMargin=18 * mm)
    story = [Paragraph('Security assessment report', h1), Paragraph(f"<b>Target:</b> {escape(scan['target'])}", body),
             Paragraph(f"<b>Started:</b> {scan['created_at']}", body), Spacer(1, 8)]
    grade_tbl = Table([[Paragraph(f'<font size="26" color="white"><b>{grade}</b></font>', body),
                        Paragraph(f'<font size="14"><b>{score}/100</b></font><br/><font size="8" color="#475467">score = 100 − penalties (High 15, Medium 8, Low 3)</font>', body)]
                       + [Paragraph(f'<font color="{SEV_COLORS[k]}"><b>{counts[k]}</b><br/>{k}</font>', small) for k in SEV_COLORS]],
                      colWidths=[18 * mm, 48 * mm] + [21 * mm] * 5)
    grade_tbl.setStyle(TableStyle([('BACKGROUND', (0, 0), (0, 0), GREEN), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                                   ('BOX', (0, 0), (-1, -1), .4, colors.HexColor('#e2e7ec')), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
    story += [grade_tbl, Paragraph('Summary of findings', h2)]
    data = [['Severity', 'Category', 'Finding']] + [[Paragraph(f'<font color="{SEV_COLORS[f["severity"]]}"><b>{f["severity"]}</b></font>', small),
                                                      Paragraph(escape(f.get('category') or ''), small), Paragraph(escape(f['title']), small)] for f in findings]
    t = Table(data, colWidths=[24 * mm, 58 * mm, 92 * mm], repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), NAVY), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white), ('FONTSIZE', (0, 0), (-1, 0), 8),
                           ('GRID', (0, 0), (-1, -1), .25, colors.HexColor('#cfd7df')), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                           ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f6f8fa')])]))
    story += [t, Paragraph('Details and recommendations', h2)]
    for i, f in enumerate(findings, 1):
        story.append(KeepTogether([
            Paragraph(f'<font color="{SEV_COLORS[f["severity"]]}"><b>{i}. [{f["severity"]}]</b></font> <b>{escape(f["title"])}</b>', body),
            Paragraph(f'<b>Source:</b> {escape(f["source"])} · <b>URL:</b> {escape(f["url"] or "")}', small),
            Paragraph(f'<b>Description:</b> {escape(f["description"] or "")}', small),
            Paragraph(f'<b>Evidence:</b> <font face="Courier">{escape((f["evidence"] or "")[:400])}</font>', small),
            Paragraph(f'<b>Recommendation:</b> {escape(f["recommendation"] or "")}', small), Spacer(1, 7)]))
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return path
