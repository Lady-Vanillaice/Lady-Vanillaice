from pathlib import Path

path = Path('src/components/admin/admin-shared.tsx')
text = path.read_text()
old = '''<div><label className="eyebrow block mb-1">Vor Ort Betrag (€)</label><div className="input-luxe !py-2 opacity-80">{Math.max(0, (Number(totalAmount.replace(",", ".")) || 0) - (depositExemptionReason ? 0 : (Number(depositAmount.replace(",", ".")) || 0))).toLocaleString("de-DE")} €</div></div>'''
new = '''<div><label className="eyebrow block mb-1">Vor Ort Betrag (€)</label><div className="input-luxe !py-2 opacity-80">{Math.max(0, (Number(totalAmount.replace(",", ".")) || 0) + (hasLiegezeit ? (Number(liegezeitSurcharge.replace(",", ".")) || 0) : 0) - (depositExemptionReason ? 0 : (Number(depositAmount.replace(",", ".")) || 0))).toLocaleString("de-DE")} €</div></div>'''
if old not in text:
    raise SystemExit('Liegezeit onsite amount anchor not found')
path.write_text(text.replace(old, new, 1))
