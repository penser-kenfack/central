import os
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
def build_pdf(scan,findings):
    os.makedirs("generated_reports",exist_ok=True); path=f"generated_reports/security_report_{scan['id']}.pdf"
    s=getSampleStyleSheet(); d=SimpleDocTemplate(path,pagesize=A4); story=[Paragraph("Web Application Security Assessment Report",s["Title"]),Spacer(1,12),
    Paragraph(f"<b>Target:</b> {scan['target']}",s["BodyText"]),Paragraph(f"<b>Scan ID:</b> {scan['id']}",s["BodyText"]),Spacer(1,15)]
    data=[["Severity","Source","Finding","URL"]]+[[f["severity"],f["source"],f["title"],f["url"]] for f in findings]
    t=Table(data,colWidths=[65,65,180,190],repeatRows=1);t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.black),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),.25,colors.grey),("FONTSIZE",(0,0),(-1,-1),7)]));story += [Paragraph("Findings",s["Heading2"]),t,Spacer(1,15)]
    for f in findings: story += [Paragraph(f"{f['severity']}: {f['title']}",s["Heading3"]),Paragraph(f"<b>Source:</b> {f['source']}<br/><b>Description:</b> {f['description']}<br/><b>Evidence:</b> {f['evidence']}<br/><b>Recommendation:</b> {f['recommendation']}",s["BodyText"]),Spacer(1,10)]
    d.build(story);return path
