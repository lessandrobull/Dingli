# -*- coding: utf-8 -*-
import csv
import sys
import os

CSV_OFICIAL = "supabase_sentences.csv"
CSV_NOVAS_A1_A2 = "Useful Languages - Alemao - Novas.csv"

# Frases aprovadas para o Nível B1
ALTERACOES_B1 = {
    601: "Es ist schön, dich nach so langer Zeit wiederzusehen.",
    602: "Wie läuft deine Arbeit zurzeit?",
    603: "Ich habe mich gefragt, ob du mit uns essen gehen möchtest.",
    604: "Entschuldige die Störung, darf ich kurz etwas fragen?",
    606: "Ich möchte dir meinen Kollegen vorstellen, der in London arbeitet.",
    607: "Vielen Dank für deine Gastfreundschaft während meines Aufenthalts.",
    608: "Ich hoffe, es macht dir nichts aus, wenn ich frage, wo du das gekauft hast.",
    610: "Könntest du ihm bitte sagen, dass ich angerufen habe?",
    611: "Ich würde dir gerne bei deinem Projekt helfen.",
    612: "Es war sehr aufmerksam von dir, an meinen Geburtstag zu denken.",
    613: "Was hast du gemacht, seit ich dich das letzte Mal gesehen habe?",
    614: "Ich fürchte, ich habe nicht ganz verstanden, was du gerade gesagt hast.",
    616: "Ich gebe dir Bescheid, sobald ich eine Antwort habe.",
    617: "Grüß bitte deine Familie ganz herzlich von mir.",
    619: "Tut mir leid, ich habe deinen Namen vergessen – könntest du ihn mir noch einmal sagen?",
    621: "Ich weiß es zu schätzen, dass du dir die Zeit für ein Treffen nimmst.",
    622: "Entschuldige, dass ich dich habe warten lassen.",
    624: "Ich hoffe, mit deinem neuen Job läuft alles gut.",
    627: "Es war toll, sich mal wieder mit dir zu unterhalten.",
    628: "Würde es dir etwas ausmachen, mir kurz zu helfen?",
    636: "Kennst du jemanden, der mehr als vier Sprachen spricht?",
    639: "Ich bin nicht so groß, wie mein Vater früher war.",
    641: "Als was für einen Menschen würdest du dich beschreiben?",
    643: "Er ist der talentierteste Mensch, den ich je kennengelernt habe.",
    646: "Was sind deine Hauptziele für die nächsten fünf Jahre?",
    651: "Bist du der Typ Mensch, der gerne Risiken eingeht?",
    655: "Was ist das Interessanteste an deiner Kultur?",
    659: "Hast du Hobbys, für die du brennst?",
    660: "Ich versuche, in meinem Alltag organisierter zu werden.",
    665: "Findest du es manchmal schwierig, Arbeit und Privatleben unter einen Hut zu bringen?",
    669: "Wie schaffst du es, so produktiv zu bleiben?",
    674: "Kaufst du Lebensmittel lieber online ein?",
    677: "Derzeit versuche ich, jede Woche ein neues Rezept auszuprobieren.",
    678: "Was ist der entspannendste Teil deines Tages?",
    682: "Fällt es dir leicht, morgens aufzustehen?",
    683: "Ich habe mich in letzter Zeit viel energiegeladener gefühlt.",
    686: "Wann kommst du normalerweise von der Arbeit nach Hause?",
    690: "Hast du eine bestimmte Routine für deinen Sonntagmorgen?",
    701: "Hast du jemals einen Anschluss am Flughafen verpasst?",
    703: "Was ist der schönste Ort, den du je besucht hast?",
    704: "Das Hotel, in dem wir übernachtet haben, war viel besser, als ich erwartet hatte.",
    714: "War der Flug so lang, wie du es erwartet hast?",
    722: "Das ist das beste Essen, das ich seit Langem hatte.",
    727: "Hast du schon mal die lokalen Spezialitäten dieser Region probiert?",
    734: "Magst du lieber süße oder herzhafte Snacks?",
    744: "Ich möchte bitte eine Pizza bestellen, zum Liefern.",
    746: "Ich bin mir nicht sicher, ob mir diese Sauce schmeckt.",
    752: "Haben Sie das eine Nummer größer?",
    757: "Der Laden war so voll, dass ich beschlossen habe, zu gehen.",
    770: "Ich suche ein Geschenk, das sowohl nützlich als auch schön ist.",
    783: "Ich habe mich gefragt, ob du mir bei diesem Bericht helfen könntest.",
    787: "Glaubst du, dass es möglich ist, eine Sprache in einem Jahr zu lernen?",
    791: "Sie ist die Erfahrenste in unserem Team.",
    793: "Musst du in deinem Job an vielen Besprechungen teilnehmen?",
    797: "Was ist der schwierigste Teil deines Studiums?",
    801: "Arbeitest du lieber von zu Hause aus oder in einem Büro?",
    804: "Die Abgabefrist ist nächsten Freitag.",
    806: "Was gefällt dir an deinem Beruf am besten?",
    809: "Ich bin nächste Woche zu einem Vorstellungsgespräch eingeladen.",
    812: "Du solltest zum Arzt gehen, wenn die Schmerzen nicht nachlassen.",
    821: "Sie müssen dieses Medikament zweimal täglich nach den Mahlzeiten einnehmen.",
    823: "Kann ich irgendetwas tun, damit du dich besser fühlst?",
    827: "Hast du einen Verbandskasten in deinem Auto?",
    831: "Du solltest mehr Wasser trinken, damit der Körper nicht austrocknet.",
    835: "Wie beugt man einer Erkältung am besten vor?",
    836: "Ich muss meine Krankenversicherung verlängern.",
    838: "Glaubst du, dass es eine gute Idee ist, Vitamine einzunehmen?",
    839: "Ich fühle mich viel besser, seit ich regelmäßig spazieren gehe.",
    840: "Du solltest die Polizei rufen, wenn du etwas Verdächtiges siehst.",
    842: "Ich stimme deinem Standpunkt voll and ganz zu.",
    844: "Was ist deiner Meinung nach der beste Weg, um Englisch zu lernen?",
    852: "Fällt es dir schwer, deine Gefühle auszudrücken?",
    858: "Es macht mir nichts aus, zu warten, solange ich ein Buch zum Lesen habe.",
    860: "Was ist deine Meinung zur aktuellen Situation?",
    864: "Mir war langweilig, weil der Vortrag zu lang war.",
    868: "Was ist deiner Meinung nach die wichtigste Eigenschaft bei einem Freund?",
    876: "Glaubst du, dass Geld Menschen wirklich glücklich machen kann?",
    880: "Was ist deiner Meinung nach die Bedeutung von wahrem Erfolg?",
    889: "Was ist deiner Meinung nach die Rolle der Kunst in unserer Gesellschaft?",
    894: "Was ist deiner Meinung nach das wichtigste Menschenrecht?",
    899: "Glaubst du, dass das Internet unser Leben besser gemacht hat?"
}

# 1. Carregar frases novas de A1 e A2
novas_a1_a2 = {}
if os.path.exists(CSV_NOVAS_A1_A2):
    with open(CSV_NOVAS_A1_A2, "r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.DictReader(f)
        for r in reader:
            f_id = r.get("id") or r.get("ID")
            texto_ge = r.get("ge")
            if f_id and f_id.isdigit():
                fid_num = int(f_id)
                if 1 <= fid_num <= 600 and texto_ge:
                    novas_a1_a2[fid_num] = texto_ge.strip()

print(f"Total de frases A1/A2 carregadas do arquivo de novas: {len(novas_a1_a2)}")
print(f"Total de frases B1 aprovadas para substituição: {len(ALTERACOES_B1)}")

# 2. Carregar e inspecionar CSV Oficial
linhas_oficiais = []
with open(CSV_OFICIAL, "r", encoding="utf-8-sig", errors="ignore") as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for r in reader:
        linhas_oficiais.append(r)

diff_a1 = []
diff_a2 = []
diff_b1 = []

for r in linhas_oficiais:
    f_id = int(r["id"])
    antigo = r.get("ge", "")
    
    # Checar A1 e A2
    if f_id in novas_a1_a2:
        novo = novas_a1_a2[f_id]
        if antigo != novo:
            if 1 <= f_id <= 300:
                diff_a1.append((f_id, antigo, novo))
            else:
                diff_a2.append((f_id, antigo, novo))
                
    # Checar B1
    elif f_id in ALTERACOES_B1:
        novo = ALTERACOES_B1[f_id]
        if antigo != novo:
            diff_b1.append((f_id, antigo, novo))

print("\n" + "=" * 65)
print("AUDITORIA DRY-RUN: ALTERAÇÕES DETECTADAS PARA O ALEMÃO")
print("=" * 65)
print(f"Diferenças em A1 (IDs 1-300):    {len(diff_a1)}")
print(f"Diferenças em A2 (IDs 301-600):  {len(diff_a2)}")
print(f"Diferenças em B1 (IDs 601-900):  {len(diff_b1)}")
print(f"Total de frases a serem atualizadas: {len(diff_a1) + len(diff_a2) + len(diff_b1)}")

if diff_a1:
    print("\nAmostra A1 (primeiras 2):")
    for fid, old, new in diff_a1[:2]:
        print(f"  ID {fid}: '{old}' -> '{new}'")

if diff_a2:
    print("\nAmostra A2 (primeiras 2):")
    for fid, old, new in diff_a2[:2]:
        print(f"  ID {fid}: '{old}' -> '{new}'")

if diff_b1:
    print("\nAmostra B1 (primeiras 2):")
    for fid, old, new in diff_b1[:2]:
        print(f"  ID {fid}: '{old}' -> '{new}'")

modo_executar = "--aplicar" in sys.argv

if modo_executar:
    print("\n[MODO REAL] Aplicando alterações no arquivo supabase_sentences.csv...")
    for r in linhas_oficiais:
        f_id = int(r["id"])
        if f_id in novas_a1_a2:
            r["ge"] = novas_a1_a2[f_id]
        elif f_id in ALTERACOES_B1:
            r["ge"] = ALTERACOES_B1[f_id]

    with open(CSV_OFICIAL, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(linhas_oficiais)
    print("✔ Arquivo supabase_sentences.csv atualizado com sucesso em UTF-8 com BOM (utf-8-sig)!")
else:
    print("\n[DRY-RUN ATIVO] Nenhuma alteração foi gravada em disco.")
    print("Para aplicar as alterações, execute: python scripts/aplicar_revisao_ge.py --aplicar")
